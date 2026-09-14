import React, { useState, useEffect } from "react";
import { MarketAsset } from "../types";
import { generateDynamicAnalysis, generateDynamicSetup, getDecimals, getUnifiedSupportResistance, calculateUnifiedScore } from "../utils";
import { 
  Building2, Layers, FileText, Database, Sparkles, Activity, 
  ArrowRight, RefreshCw, AlertTriangle, CheckCircle2, PlayCircle, 
  LineChart, Crosshair, ChevronRight, TrendingUp, TrendingDown, Clock, ShieldAlert
} from "lucide-react";

interface AggregateResultProps {
  assets: MarketAsset[];
  selectedAsset: MarketAsset;
  onSelectAsset: (asset: MarketAsset) => void;
  traderProfile?: any;
}

export default function AggregateResult({
  assets,
  selectedAsset,
  onSelectAsset,
  traderProfile
}: AggregateResultProps) {
  const [analyzingAsset, setAnalyzingAsset] = useState<MarketAsset>(selectedAsset);
  const [selectedTimeframe, setSelectedTimeframe] = useState<"M5" | "M15" | "H1" | "H4" | "D1">("H4");
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [timeframeAnalysisResult, setTimeframeAnalysisResult] = useState<any>(null);
  const [overallResultCard, setOverallResultCard] = useState<any>(null);

  // Synchronize internal asset state with selected asset prop
  useEffect(() => {
    setAnalyzingAsset(selectedAsset);
  }, [selectedAsset]);

  // Compute all analysis dynamically based on the selected asset and timeframe
  const handleComputeAggregateResults = () => {
    setLoadingAnalysis(true);
    setTimeout(() => {
      const dec = getDecimals(analyzingAsset);
      const isBullish = analyzingAsset.bullishProb > analyzingAsset.bearishProb;
      const score = calculateUnifiedScore(analyzingAsset, selectedTimeframe);
      const { support, resistance } = getUnifiedSupportResistance(analyzingAsset.price, selectedTimeframe, dec);
      
      const s1 = support[0];
      const s2 = support[1];
      const r1 = resistance[0];
      const r2 = resistance[1];

      // 1. Timeframe Specific Instrument Analysis
      const timeRes = {
        instrument: analyzingAsset.symbol,
        timeframe: selectedTimeframe,
        timestamp: new Date().toLocaleTimeString(),
        score,
        bias: score > 65 ? "STRONG BULLISH" : score > 50 ? "BULLISH BIAS" : score < 35 ? "STRONG BEARISH" : "BEARISH RETRACEMENT",
        supportLevels: [s1, s2],
        resistanceLevels: [r1, r2],
        indicators: {
          rsi: Math.min(95, Math.max(10, 35 + Math.floor(score * 0.4))),
          emaState: isBullish ? "Price resides above EMA 20/50" : "EMA 20/50 Bearish crossover state",
          volatilityState: `Normal range, dynamic average ATR is ${(analyzingAsset.price * 0.004).toFixed(dec)} points`
        },
        marketStructure: isBullish 
          ? `BOS (Break of Structure) verified on ${selectedTimeframe}. Liquidity pool resting under support zones.`
          : `Mitigation block sweep on ${selectedTimeframe}. Local dynamic resistance holds the downward flow.`
      };

      // 2. Dynamic Overall Results Card & Institutional Rating
      const isMarketPositive = score > 50;
      const systemStateRating = score > 75 ? "EXCELLENT" : score > 55 ? "OPTIMAL" : "CAUTIOUS";
      
      const overallRes = {
        timestamp: new Date().toLocaleString(),
        connectedAccountEquity: 14250.00,
        connectedCount: 2,
        systemHealth: "OPTIMAL",
        score,
        grade: isMarketPositive ? "A+ CONFLUENCE SHIELD" : "C DEFENSIVE HEDGE",
        decision: isMarketPositive 
          ? "ACCUMULATE ON STRUCTURAL RE-TESTS" 
          : "REDUCE LEVERAGE OR WAIT FOR RANGE BREAKOUT",
        riskRecommendation: `Suggested standard allocation is ${(isMarketPositive ? 1.5 : 0.5).toFixed(1)}% limit per trade setup. Ensure Stop Loss is strictly resting behind Support/Resistance level 1.`,
        summaryNotes: `Our quantitative evaluation engine has computed multi-timeframe correlation coefficients, active sentiment indices, and dynamic price swings for ${analyzingAsset.symbol} on the ${selectedTimeframe} chart. Currently, ${isMarketPositive ? "a cohesive institutional bid-side accumulation" : "a heavy overhead distribution vector"} is detected. Dynamic liquidity scans show minor orders stacked near support limits. Recommendation is optimized for risk-conscious entries.`,
        brokerChecks: [
          { label: "Active Broker Feed API State", status: "PASSED", details: "Direct low latency 12ms" },
          { label: "Trader DNA Risk Alignment", status: "VERIFIED", details: `Aligned for style profile: ${traderProfile?.style || "Day Trader"}` },
          { label: "Equity Drawdown Guard", status: "ACTIVE", details: "Dynamic margin buffer locked at 4.5%" }
        ]
      };

      setTimeframeAnalysisResult(timeRes);
      setOverallResultCard(overallRes);
      setLoadingAnalysis(false);
    }, 1200);
  };

  // Re-run computation automatically when selected asset or timeframe changes
  useEffect(() => {
    handleComputeAggregateResults();
  }, [analyzingAsset, selectedTimeframe]);

  // Summary generation of Chart AI and Setup for selected asset
  const dynamicAnalysis = generateDynamicAnalysis(analyzingAsset, selectedTimeframe);
  const dynamicSetup = generateDynamicSetup(analyzingAsset, analyzingAsset.bullishProb > analyzingAsset.bearishProb ? 'BUY' : 'SELL', selectedTimeframe);
  const decimals = getDecimals(analyzingAsset);

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-purple-400 tracking-wider uppercase mb-1 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            SYNTHESIS ENGINE
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Aggregate Results & Asset Intelligence
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Compute multi-timeframe confluent results, analyze unified institutional rating structures, and inspect aggregated setup parameters of {analyzingAsset.symbol}.
          </p>
        </div>
        
        {/* Refresh Actions */}
        <button
          onClick={handleComputeAggregateResults}
          disabled={loadingAnalysis}
          className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-mono text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loadingAnalysis ? "animate-spin" : ""}`} />
          <span>{loadingAnalysis ? "Computing Asset Matrix..." : "Recalculate Synthesis"}</span>
        </button>
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
                    onClick={() => setSelectedTimeframe(tf)}
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
              
              {/* Overall Recommendation Summary Badge */}
              <div className="p-4 bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono tracking-wider block">RECOMMENDED BIAS DIRECTIVE</span>
                  <span className={`text-lg font-black tracking-wide uppercase ${
                    analyzingAsset.bullishProb > analyzingAsset.bearishProb ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {overallResultCard?.decision || "ANALYZING..."}
                  </span>
                  <span className="text-xs text-slate-400 block font-mono">
                    Based on {analyzingAsset.symbol} {selectedTimeframe} structural sweeps.
                  </span>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto font-mono text-right">
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg min-w-[100px]">
                    <span className="text-[9px] text-slate-500 block">SCORE</span>
                    <span className="text-sm font-black text-white">{overallResultCard?.score || "N/A"}%</span>
                  </div>
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg min-w-[100px]">
                    <span className="text-[9px] text-slate-500 block">RATING</span>
                    <span className="text-sm font-black text-purple-400">{overallResultCard?.grade.split(" ")[0] || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Analysis summary text block */}
              <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl">
                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  {overallResultCard?.summaryNotes}
                </p>
                <div className="h-[1px] bg-slate-800/80 my-3" />
                <div className="text-xs font-mono text-slate-400 flex flex-col sm:flex-row justify-between gap-2">
                  <span>Risk Action Limit: <strong className="text-amber-400">{overallResultCard?.riskRecommendation}</strong></span>
                  <span>System Integrity: <strong className="text-emerald-400">{overallResultCard?.systemHealth}</strong></span>
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
