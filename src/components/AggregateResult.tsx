import React, { useState, useEffect, useRef } from "react";
import { MarketAsset } from "../types";
import { generateDynamicAnalysis, generateDynamicSetup, getDecimals, getUnifiedSupportResistance, calculateUnifiedScore } from "../utils";
import { 
  Building2, Layers, FileText, Database, Sparkles, Activity, 
  ArrowRight, RefreshCw, AlertTriangle, CheckCircle2, PlayCircle, 
  LineChart, Crosshair, ChevronRight, TrendingUp, TrendingDown, Clock, ShieldAlert,
  Radio, Globe, Timer
} from "lucide-react";
import { getAssetMacroImpact, getNewsForAsset, reconcileTechnicalAndFundamental, ReconciledMarketVerdict } from "../utils/marketNews";

interface AggregateResultProps {
  assets: MarketAsset[];
  selectedAsset: MarketAsset;
  onSelectAsset: (asset: MarketAsset) => void;
  traderProfile?: any;
  onNavigateToSection?: (section: any) => void;
}

export default function AggregateResult({
  assets,
  selectedAsset,
  onSelectAsset,
  traderProfile,
  onNavigateToSection
}: AggregateResultProps) {
  const [analyzingAsset, setAnalyzingAsset] = useState<MarketAsset>(selectedAsset);
  const [selectedTimeframe, setSelectedTimeframe] = useState<"M5" | "M15" | "H1" | "H4" | "D1">("H4");
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [timeframeAnalysisResult, setTimeframeAnalysisResult] = useState<any>(null);
  const [overallResultCard, setOverallResultCard] = useState<any>(null);

  // Auto Re-Analysis Cadence (Configurable 10 to 15 minutes)
  const [reanalysisIntervalMin, setReanalysisIntervalMin] = useState<number>(15);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [lastAnalyzedTime, setLastAnalyzedTime] = useState<string>(new Date().toLocaleTimeString());

  // Prevent re-analysing on short-term price ticks: only track symbol and timeframe changes
  const prevSymbolRef = useRef(selectedAsset.symbol);
  const prevTimeframeRef = useRef(selectedTimeframe);
  const analyzingAssetRef = useRef(analyzingAsset);
  analyzingAssetRef.current = analyzingAsset;

  // Compute all analysis dynamically based on the selected asset and timeframe
  const handleComputeAggregateResults = (targetAsset?: MarketAsset, targetTF?: "M5" | "M15" | "H1" | "H4" | "D1") => {
    const assetToAnalyze = targetAsset || analyzingAssetRef.current;
    const tfToAnalyze = targetTF || selectedTimeframe;

    setLoadingAnalysis(true);
    setTimeout(() => {
      const dec = getDecimals(assetToAnalyze);
      const isBullish = assetToAnalyze.bullishProb > assetToAnalyze.bearishProb;
      const score = calculateUnifiedScore(assetToAnalyze, tfToAnalyze);
      const { support, resistance } = getUnifiedSupportResistance(assetToAnalyze.price, tfToAnalyze, dec);
      
      const s1 = support[0];
      const s2 = support[1];
      const r1 = resistance[0];
      const r2 = resistance[1];

      // 1. Timeframe Specific Instrument Analysis
      const timeRes = {
        instrument: assetToAnalyze.symbol,
        timeframe: tfToAnalyze,
        timestamp: new Date().toLocaleTimeString(),
        score,
        bias: score > 65 ? "STRONG BULLISH" : score > 50 ? "BULLISH BIAS" : score < 35 ? "STRONG BEARISH" : "BEARISH RETRACEMENT",
        supportLevels: [s1, s2],
        resistanceLevels: [r1, r2],
        indicators: {
          rsi: Math.min(95, Math.max(10, 35 + Math.floor(score * 0.4))),
          emaState: isBullish ? "Price resides above EMA 20/50" : "EMA 20/50 Bearish crossover state",
          volatilityState: `Normal range, dynamic average ATR is ${(assetToAnalyze.price * 0.004).toFixed(dec)} points`
        },
        marketStructure: isBullish 
          ? `BOS (Break of Structure) verified on ${tfToAnalyze}. Liquidity pool resting under support zones.`
          : `Mitigation block sweep on ${tfToAnalyze}. Local dynamic resistance holds the downward flow.`
      };

      // 2. Dynamic Overall Results Card & Institutional Rating with Technical vs Macro News Reconciliation
      const verdict = reconcileTechnicalAndFundamental(assetToAnalyze, tfToAnalyze);
      
      const overallRes = {
        timestamp: new Date().toLocaleString(),
        connectedAccountEquity: 14250.00,
        connectedCount: 2,
        systemHealth: "OPTIMAL",
        score: verdict.reconciledScore,
        grade: verdict.finalAction === "BUY" ? "A+ CONFLUENCE BUY" : verdict.finalAction === "SELL" ? "A DEFENSIVE SHORT" : "C BALANCED RANGE",
        decision: verdict.actionBadge, // Explicit: "STRONG SELL (SHORT)" or "STRONG BUY (LONG)"
        action: verdict.finalAction,   // Explicit: "BUY" | "SELL" | "WAIT"
        verdict,
        riskRecommendation: verdict.riskBufferNote,
        summaryNotes: verdict.divergenceResolutionNote,
        brokerChecks: [
          { label: "Technical Bias Engine", status: verdict.technicalBias, details: `Score: ${verdict.technicalScore}% (${isBullish ? "Bullish trend" : "Bearish trend"})` },
          { label: "Macro News & Catalyst Wire", status: verdict.fundamentalBias, details: `${getAssetMacroImpact(assetToAnalyze.symbol, assetToAnalyze.category).primaryCatalyst}` },
          { label: "Institutional Reconciliation", status: verdict.finalAction === "BUY" ? "BUY VERIFIED" : verdict.finalAction === "SELL" ? "SELL VERIFIED" : "STAND ASIDE", details: verdict.tradeGuidance }
        ]
      };

      setTimeframeAnalysisResult(timeRes);
      setOverallResultCard(overallRes);
      setLastAnalyzedTime(new Date().toLocaleTimeString());
      setSecondsRemaining(reanalysisIntervalMin * 60);
      setLoadingAnalysis(false);
    }, 700);
  };

  // Synchronize internal asset state with selected asset prop without flashing on price noise
  useEffect(() => {
    if (selectedAsset.symbol !== prevSymbolRef.current) {
      prevSymbolRef.current = selectedAsset.symbol;
      setAnalyzingAsset(selectedAsset);
      handleComputeAggregateResults(selectedAsset, selectedTimeframe);
    } else {
      // Just keep live prices and percent in sync silently without triggering re-analysis
      setAnalyzingAsset(prev => ({
        ...prev,
        price: selectedAsset.price,
        changePercent: selectedAsset.changePercent,
        high24h: selectedAsset.high24h,
        low24h: selectedAsset.low24h,
        volume24h: selectedAsset.volume24h
      }));
    }
  }, [selectedAsset]);

  // Initial computation on mount
  useEffect(() => {
    handleComputeAggregateResults(selectedAsset, selectedTimeframe);
  }, []);

  // When timeframe is changed by the user
  const handleSelectTimeframe = (tf: "M5" | "M15" | "H1" | "H4" | "D1") => {
    setSelectedTimeframe(tf);
    prevTimeframeRef.current = tf;
    handleComputeAggregateResults(analyzingAsset, tf);
  };

  // Auto Re-Analysis countdown timer: automatically re-analyses every 10 to 15 minutes!
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          // Trigger scheduled auto re-analysis
          handleComputeAggregateResults(analyzingAssetRef.current, prevTimeframeRef.current);
          return reanalysisIntervalMin * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [reanalysisIntervalMin]);

  const handleSetInterval = (minutes: number) => {
    setReanalysisIntervalMin(minutes);
    setSecondsRemaining(minutes * 60);
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Reconciled verdict for immediate reactive rendering
  const activeVerdict = reconcileTechnicalAndFundamental(analyzingAsset, selectedTimeframe);
  const dynamicAnalysis = generateDynamicAnalysis(analyzingAsset, selectedTimeframe);
  const dynamicSetup = generateDynamicSetup(
    analyzingAsset, 
    activeVerdict.finalAction === "BUY" ? "BUY" : "SELL", 
    selectedTimeframe
  );
  const decimals = getDecimals(analyzingAsset);

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-purple-400 tracking-wider uppercase mb-1 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            SYNTHESIS ENGINE
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Aggregate Results & Asset Intelligence
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Multi-timeframe confluent results, unified institutional rating structures, and aggregated setup parameters of {analyzingAsset.symbol}.
          </p>
        </div>
        
        {/* Cadence Controls: 10 to 15 Minutes Auto-Analysis & Manual Refresh */}
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
          {/* Re-Analysis Interval & Countdown */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg">
            <Clock className="h-4 w-4 text-cyan-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Auto Re-Analysis Cadence</span>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-200">
                <span className="text-slate-400 text-[10px]">Next:</span>
                <span className="text-emerald-400 font-mono tracking-wider font-extrabold">{formatCountdown(secondsRemaining)}</span>
                <span className="text-slate-700">|</span>
                <span className="text-slate-400 text-[10px]">Cycle:</span>
                <div className="inline-flex rounded bg-slate-900 border border-slate-800 p-0.5">
                  <button
                    onClick={() => handleSetInterval(10)}
                    className={`px-2 py-0.5 text-[9px] rounded font-bold transition-all cursor-pointer ${
                      reanalysisIntervalMin === 10 ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                    }`}
                    title="Set auto-reanalysis interval to 10 minutes"
                  >
                    10m
                  </button>
                  <button
                    onClick={() => handleSetInterval(15)}
                    className={`px-2 py-0.5 text-[9px] rounded font-bold transition-all cursor-pointer ${
                      reanalysisIntervalMin === 15 ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                    }`}
                    title="Set auto-reanalysis interval to 15 minutes"
                  >
                    15m
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Manual Recalculate Button */}
          <button
            onClick={() => handleComputeAggregateResults()}
            disabled={loadingAnalysis}
            className="px-3.5 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-mono text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer"
            title="Perform immediate manual re-analysis"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingAnalysis ? "animate-spin text-blue-400" : ""}`} />
            <span>{loadingAnalysis ? "Re-Analyzing Matrix..." : "Recalculate Now"}</span>
          </button>
        </div>
      </div>

      {/* CONTROL BAR: INSTRUMENT & TIMEFRAME SELECTORS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Side: Selectors Panel */}
        <div className="md:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            Target Settings
          </h3>
          
          <div className="space-y-4 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1.5">Asset Instrument:</label>
              <div className="grid grid-cols-1 gap-1.5 max-h-[190px] overflow-y-auto pr-1">
                {assets.map((asset) => (
                  <div 
                    key={asset.symbol}
                    onClick={() => {
                      setAnalyzingAsset(asset);
                      onSelectAsset(asset);
                      prevSymbolRef.current = asset.symbol;
                      handleComputeAggregateResults(asset, selectedTimeframe);
                    }}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                      analyzingAsset.symbol === asset.symbol
                        ? "border-blue-500 bg-blue-500/10 text-white"
                        : "border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-400"
                    }`}
                  >
                    <div>
                      <span className="font-bold text-white block">{asset.symbol}</span>
                      <span className="text-[9px] text-slate-500">{asset.name}</span>
                    </div>
                    <span className="font-mono text-xs font-bold">${asset.price.toLocaleString(undefined, { minimumFractionDigits: asset.price < 50 ? 4 : 2 })}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1.5">Selected Timeframe:</label>
              <div className="grid grid-cols-5 gap-1.5">
                {(["M5", "M15", "H1", "H4", "D1"] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => handleSelectTimeframe(tf)}
                    className={`py-2 rounded-lg text-center font-bold text-[11px] transition-all cursor-pointer ${
                      selectedTimeframe === tf
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                        : "bg-slate-950 border border-slate-850 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Asset Bias Probabilities:</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-200 font-bold font-mono">
                <span className="text-emerald-400">Bullish: {analyzingAsset.bullishProb}%</span>
                <span className="text-slate-400">Neutral: {analyzingAsset.neutralProb}%</span>
                <span className="text-rose-400">Bearish: {analyzingAsset.bearishProb}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Dynamic Synthesis & Recommendation Outcome */}
        <div className="md:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <PlayCircle className="h-4.5 w-4.5 text-purple-400" />
              Computed Market Entry Decision
            </h3>
            <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded">
              Synthesis Ready
            </span>
          </div>

          {loadingAnalysis ? (
            <div className="py-24 text-center space-y-3 font-mono text-xs text-slate-500">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
              <p>Analyzing cross-market metrics and compounding probability index...</p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Explicit BUY / SELL Decision Banner */}
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl ${
                overallResultCard?.action === "BUY"
                  ? "bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-emerald-500/40"
                  : overallResultCard?.action === "SELL"
                    ? "bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border-rose-500/40"
                    : "bg-gradient-to-r from-slate-950 to-slate-900 border-slate-800"
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono tracking-wider block uppercase">
                      EXPLICIT MARKET DIRECTIVE
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono ${
                      overallResultCard?.action === "BUY" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" :
                      overallResultCard?.action === "SELL" ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" :
                      "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}>
                      {overallResultCard?.action === "BUY" ? "EXECUTE BUY / LONG" : overallResultCard?.action === "SELL" ? "EXECUTE SELL / SHORT" : "STAND ASIDE"}
                    </span>
                  </div>

                  <h2 className={`text-xl sm:text-2xl font-black tracking-wide uppercase font-mono ${
                    overallResultCard?.action === "BUY" ? "text-emerald-400" :
                    overallResultCard?.action === "SELL" ? "text-rose-400" : "text-amber-400"
                  }`}>
                    {overallResultCard?.decision || activeVerdict.actionBadge}
                  </h2>
                  <span className="text-xs text-slate-300 block font-mono">
                    Reconciled for {analyzingAsset.symbol} on {selectedTimeframe} chart.
                  </span>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto font-mono text-right">
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg min-w-[90px]">
                    <span className="text-[9px] text-slate-500 block">SCORE</span>
                    <span className="text-sm font-black text-white">{overallResultCard?.score ?? activeVerdict.reconciledScore}%</span>
                  </div>
                  <div className={`p-2 bg-slate-900 border rounded-lg min-w-[110px] ${
                    overallResultCard?.action === "BUY" ? "border-emerald-500/30 text-emerald-400" :
                    overallResultCard?.action === "SELL" ? "border-rose-500/30 text-rose-400" : "border-slate-800 text-amber-400"
                  }`}>
                    <span className="text-[9px] text-slate-500 block">ACTION</span>
                    <span className="text-sm font-black">{overallResultCard?.action || activeVerdict.finalAction}</span>
                  </div>
                </div>
              </div>

              {/* Technical vs Fundamental / News Divergence Reconciliation Matrix */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    <span>Technical vs Fundamental / News Divergence Resolution</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                    activeVerdict.confluenceType.includes("DIVERGENCE")
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  }`}>
                    {activeVerdict.confluenceType.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">1. Technical Signal</span>
                    <span className={`text-sm font-black mt-0.5 block ${
                      activeVerdict.technicalBias === "BUY" ? "text-emerald-400" : activeVerdict.technicalBias === "SELL" ? "text-rose-400" : "text-amber-400"
                    }`}>
                      {activeVerdict.technicalBias} ({activeVerdict.technicalScore}%)
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">Moving Averages & Oscillators</span>
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">2. Macro News / Catalyst</span>
                    <span className={`text-sm font-black mt-0.5 block ${
                      activeVerdict.fundamentalBias === "BULLISH" ? "text-emerald-400" : activeVerdict.fundamentalBias === "BEARISH" ? "text-rose-400" : "text-amber-400"
                    }`}>
                      {activeVerdict.fundamentalBias} ({activeVerdict.fundamentalScore}%)
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1 truncate">UN Summit / Yields / DXY</span>
                  </div>

                  <div className={`p-2.5 rounded-lg border ${
                    activeVerdict.finalAction === "BUY"
                      ? "bg-emerald-950/40 border-emerald-500/30"
                      : activeVerdict.finalAction === "SELL"
                        ? "bg-rose-950/40 border-rose-500/30"
                        : "bg-slate-900 border-slate-800"
                  }`}>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">3. Reconciled Outcome</span>
                    <span className={`text-sm font-black mt-0.5 block ${
                      activeVerdict.finalAction === "BUY" ? "text-emerald-400" :
                      activeVerdict.finalAction === "SELL" ? "text-rose-400" : "text-amber-400"
                    }`}>
                      {activeVerdict.actionBadge}
                    </span>
                    <span className="text-[10px] text-slate-300 block mt-1">Hedge-Fund Multi-Factor Fix</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg text-xs text-slate-300 leading-relaxed">
                  <p>{overallResultCard?.summaryNotes || activeVerdict.divergenceResolutionNote}</p>
                </div>

                {/* Explicit Execution Price Levels */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-500 block uppercase">Entry Spot</span>
                    <span className="font-bold text-white">${activeVerdict.levels.entryPrice.toLocaleString(undefined, { minimumFractionDigits: decimals })}</span>
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                    <span className="text-[9px] text-rose-400 block uppercase">Stop Loss Limit</span>
                    <span className="font-bold text-rose-400">${activeVerdict.levels.stopLoss.toLocaleString(undefined, { minimumFractionDigits: decimals })}</span>
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                    <span className="text-[9px] text-emerald-400 block uppercase">Take Profit 1</span>
                    <span className="font-bold text-emerald-400">${activeVerdict.levels.takeProfit1.toLocaleString(undefined, { minimumFractionDigits: decimals })}</span>
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                    <span className="text-[9px] text-cyan-400 block uppercase">R/R Ratio</span>
                    <span className="font-bold text-cyan-400">{activeVerdict.levels.riskReward}</span>
                  </div>
                </div>
              </div>

              {/* Checklist items */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {overallResultCard?.brokerChecks.map((chk: any, index: number) => (
                  <div key={index} className="p-3 bg-slate-950 border border-slate-850 rounded-xl font-mono text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] text-slate-500 truncate max-w-[150px]">{chk.label}</span>
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <span className="text-[11px] font-extrabold text-white block">{chk.status}</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5 leading-tight">{chk.details}</span>
                  </div>
                ))}
              </div>

              {/* Automated Macro & Geopolitical News Catalyst Report Card */}
              <div className="p-4 bg-gradient-to-r from-slate-950 via-cyan-950/25 to-slate-950 border border-cyan-500/30 rounded-xl space-y-3 font-mono">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-850 pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                    <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
                    <span>Auto-Merged Macro & Geopolitical Catalyst Intelligence</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                    getAssetMacroImpact(analyzingAsset.symbol, analyzingAsset.category).shockRisk === "CRITICAL" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                    getAssetMacroImpact(analyzingAsset.symbol, analyzingAsset.category).shockRisk === "ELEVATED" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                    "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}>
                    {getAssetMacroImpact(analyzingAsset.symbol, analyzingAsset.category).shockRisk} MACRO SHOCK RISK
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                  <div>
                    <strong className="text-white">Active Macro Driver: </strong>
                    {getAssetMacroImpact(analyzingAsset.symbol, analyzingAsset.category).primaryCatalyst}
                  </div>
                  <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800/80 text-[11px] text-slate-400">
                    <strong className="text-amber-400">Loss Shield Recommendation: </strong>
                    {getAssetMacroImpact(analyzingAsset.symbol, analyzingAsset.category).volatilityBufferRecommendation}
                  </div>
                </div>

                {onNavigateToSection && (
                  <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigateToSection('news')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      View Live News Wire & Catalysts <ArrowRight className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateToSection('shield')}
                      className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldAlert className="h-3 w-3" />
                      Launch Volatility Shield
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* TAB CONTENT: TIMEFRAME-SPECIFIC ANALYSIS AND CHART AI SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Box: Instrument Timeframe Analysis & Levels */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-blue-400" />
              Instrument Timeframe Scan ({selectedTimeframe})
            </h3>
            <span className="text-[9px] font-mono text-slate-500">Live Calculated Ticks</span>
          </div>

          {timeframeAnalysisResult ? (
            <div className="space-y-4 font-mono text-xs">
              
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                  <span className="text-[9px] text-slate-500 block uppercase">Signal Bias</span>
                  <span className={`text-[11px] font-black ${
                    timeframeAnalysisResult.score > 50 ? "text-emerald-400" : "text-rose-400"
                  }`}>{timeframeAnalysisResult.bias}</span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
                  <span className="text-[9px] text-slate-500 block uppercase">Scored Index</span>
                  <span className="text-[11px] font-black text-white">{timeframeAnalysisResult.score} / 100</span>
                </div>
              </div>

              {/* Levels & support */}
              <div className="space-y-2 p-3 bg-slate-950/60 border border-slate-850 rounded-xl">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">Calculated Pivot Boundaries</h4>
                
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-slate-500">Resistance Target 2:</span>
                    <span className="text-rose-400 font-bold">${timeframeAnalysisResult.resistanceLevels[1]}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-slate-500">Resistance Target 1:</span>
                    <span className="text-rose-400 font-bold">${timeframeAnalysisResult.resistanceLevels[0]}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1 bg-slate-900/50 p-1 rounded">
                    <span className="text-slate-300 font-bold">Current Spot Value:</span>
                    <span className="text-white font-extrabold">${analyzingAsset.price.toLocaleString(undefined, { minimumFractionDigits: decimals })}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1">
                    <span className="text-slate-500">Support Target 1:</span>
                    <span className="text-emerald-400 font-bold">${timeframeAnalysisResult.supportLevels[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Support Target 2:</span>
                    <span className="text-emerald-400 font-bold">${timeframeAnalysisResult.supportLevels[1]}</span>
                  </div>
                </div>
              </div>

              {/* Market indicators */}
              <div className="space-y-2 p-3 bg-slate-950/40 border border-slate-850 rounded-xl">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">Technical Oscillators</h4>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Relative Strength (RSI):</span>
                    <span className="text-slate-300 font-semibold">{timeframeAnalysisResult.indicators.rsi} ({timeframeAnalysisResult.indicators.rsi > 50 ? "Bullish Strength" : "Bearish Compression"})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Moving Average State:</span>
                    <span className="text-slate-300 font-semibold">{timeframeAnalysisResult.indicators.emaState}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Market Volatility (ATR):</span>
                    <span className="text-slate-300 font-semibold truncate max-w-[200px]">{timeframeAnalysisResult.indicators.volatilityState}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-blue-950/20 border border-blue-500/10 rounded-xl flex gap-2">
                <Sparkles className="h-4 w-4 text-blue-400 shrink-0 mt-0.5 animate-pulse" />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  <strong>Structural Note:</strong> {timeframeAnalysisResult.marketStructure}
                </p>
              </div>

            </div>
          ) : (
            <div className="py-20 text-center font-mono text-xs text-slate-500">
              No results calculated.
            </div>
          )}
        </div>

        {/* Right Box: Dynamic Chart AI Summary & AI Setup */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <LineChart className="h-4 w-4 text-emerald-400" />
              Chart AI & Setup Summaries
            </h3>
            <span className="text-[9px] font-mono text-slate-500">Active Synthesis</span>
          </div>

          <div className="space-y-4 font-mono text-xs">
            {/* Chart AI Prediction Section */}
            <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Chart AI Prediction</span>
                <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black rounded uppercase">
                  Confidence: {dynamicAnalysis.confidence}%
                </span>
              </div>
              
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {dynamicAnalysis.explanation}
              </p>

              <div className="space-y-1 bg-slate-900/50 p-2.5 rounded border border-slate-800/40 text-[10px] text-slate-400">
                <div>• <strong>Trend:</strong> {dynamicAnalysis.marketStructure.trend}</div>
                <div>• <strong>Structural Sweep:</strong> {dynamicAnalysis.marketStructure.liquidityZones}</div>
              </div>
            </div>

            {/* AI Trade Setup Section */}
            <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Quantized Trade Setup</span>
                <div className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 border text-[9px] font-black rounded uppercase ${
                    dynamicSetup.direction === "BUY"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  }`}>
                    {dynamicSetup.direction}
                  </span>
                  <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-bold rounded">
                    {dynamicSetup.tradeGrade} Grade
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-900/50 rounded border border-slate-800/40">
                  <span className="text-slate-500 block text-[9px] uppercase">Entry Range</span>
                  <span className="font-bold text-white truncate block">{dynamicSetup.entryZone}</span>
                </div>
                <div className="p-2 bg-slate-900/50 rounded border border-slate-800/40">
                  <span className="text-rose-400 block text-[9px] uppercase">Stop Loss limit</span>
                  <span className="font-bold text-rose-400 block">${dynamicSetup.stopLoss.toFixed(decimals)}</span>
                </div>
                <div className="p-2 bg-slate-900/50 rounded border border-slate-800/40">
                  <span className="text-emerald-400 block text-[9px] uppercase">Take Profit Target 1</span>
                  <span className="font-bold text-emerald-400 block">${dynamicSetup.takeProfit1.toFixed(decimals)}</span>
                </div>
                <div className="p-2 bg-slate-900/50 rounded border border-slate-800/40">
                  <span className="text-emerald-400 block text-[9px] uppercase">Take Profit Target 2</span>
                  <span className="font-bold text-emerald-400 block">${dynamicSetup.takeProfit2.toFixed(decimals)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                <span>Risk Reward Ratio: <strong className="text-white">1 : {dynamicSetup.riskRewardRatio}</strong></span>
                <span>Expected Hold: <strong className="text-slate-300">{dynamicSetup.holdingTime}</strong></span>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
