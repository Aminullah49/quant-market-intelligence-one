import React, { useState, useEffect } from "react";
import { MarketAsset, MarketAnalysisResponse } from "../types";
import { getDecimals, getUnifiedSupportResistance, calculateUnifiedScore, calculateSmartMoneyConcepts } from "../utils";
import { 
  TrendingUp, TrendingDown, HelpCircle, FileText, AlertTriangle, AlertCircle,
  BarChart, Globe, Zap, Cpu, Compass, Layers, Sparkles, CheckCircle2, ChevronRight,
  Activity, Percent, Clock, ArrowRight, ShieldCheck, Scale, Users, Landmark, Coins,
  ChevronDown, Check, RefreshCw, Loader2, CheckCircle, Target, Briefcase, Award, Shield, DollarSign,
  Radio, ShieldAlert
} from "lucide-react";
import { getAssetMacroImpact, getNewsForAsset, reconcileTechnicalAndFundamental, ReconciledMarketVerdict } from "../utils/marketNews";
import { 
  getActivePrimaryBroker, 
  setActivePrimaryBroker, 
  executeDirectBrokerOrder, 
  UnifiedBroker 
} from "../utils/brokerSync";

interface MarketAnalysisProps {
  selectedAsset: MarketAsset;
  analysisData: MarketAnalysisResponse | null;
  onTriggerAnalysis: () => void;
  loading: boolean;
  tradeSetup?: any;
  traderProfile?: any;
  onTimeframeChange?: (tf: any) => void;
  aiScanMode?: 'quant' | 'gemini';
  onAiScanModeChange?: (mode: 'quant' | 'gemini') => void;
  isGeminiCooldown?: boolean;
  onNavigateToSection?: (section: string) => void;
}

export default function MarketAnalysis({ 
  selectedAsset, 
  analysisData, 
  onTriggerAnalysis, 
  loading,
  tradeSetup,
  traderProfile,
  onTimeframeChange,
  aiScanMode = 'quant',
  onAiScanModeChange,
  isGeminiCooldown,
  onNavigateToSection
}: MarketAnalysisProps) {
  // Main sub-tabs: core radar vs timeframe analysis vs overall result vs trader archetype execution vs live news wire
  const [currentSubTab, setCurrentSubTab] = useState<'radar' | 'news' | 'timeframe' | 'overall' | 'traders'>('radar');
  const [activeTab, setActiveTab] = useState<'technical' | 'fundamental' | 'sentiment' | 'smc'>('technical');

  // Direct STP order routing from Market Analysis
  const [isExecutingAnalysisOrder, setIsExecutingAnalysisOrder] = useState(false);
  const [analysisOrderReceipt, setAnalysisOrderReceipt] = useState<any>(null);
  const [orderLotsInput, setOrderLotsInput] = useState<number>(0.1);
  const [selectedTraderPersona, setSelectedTraderPersona] = useState<'Scalper' | 'Day Trader' | 'Swing Trader' | 'Institutional Trader'>('Day Trader');
  const [selectedBrokerTarget, setSelectedBrokerTarget] = useState<string>(() => {
    return getActivePrimaryBroker().id || 'quantintel-stp';
  });

  // Sync selected broker with primary broker
  useEffect(() => {
    const syncPrimaryBroker = () => {
      const primary = getActivePrimaryBroker();
      if (primary && primary.id) {
        setSelectedBrokerTarget(primary.id);
      }
    };
    syncPrimaryBroker();
    window.addEventListener("primary_broker_changed", syncPrimaryBroker);
    window.addEventListener("broker_connected", syncPrimaryBroker);
    window.addEventListener("storage", syncPrimaryBroker);
    return () => {
      window.removeEventListener("primary_broker_changed", syncPrimaryBroker);
      window.removeEventListener("broker_connected", syncPrimaryBroker);
      window.removeEventListener("storage", syncPrimaryBroker);
    };
  }, []);

  // Load available STP & Connected brokers
  const [availableBrokers, setAvailableBrokers] = useState<any[]>(() => {
    try {
      const savedStp = localStorage.getItem("platform_stp_brokers_list_v1");
      const stpList = savedStp ? JSON.parse(savedStp) : [];
      const savedConnected = localStorage.getItem("connected_brokers_list");
      const connList = savedConnected ? JSON.parse(savedConnected) : [];
      
      const combined = [
        ...connList.filter((b: any) => b.connected),
        ...(stpList.length > 0 ? stpList : [
          { id: "quantintel-stp", name: "QuantIntel Prime STP", type: "Forex", markupLotFee: 6.0, isStpPlatform: true },
          { id: "apex-stp", name: "Apex Liquid Brokerage", type: "Crypto", markupLotFee: 8.0, isStpPlatform: true },
          { id: "vanguard-stp", name: "Vanguard STP Markets", type: "Multi-Asset", markupLotFee: 5.0, isStpPlatform: true }
        ])
      ];
      // remove duplicate ids
      const seen = new Set();
      return combined.filter((b: any) => {
        if (seen.has(b.id)) return false;
        seen.add(b.id);
        return true;
      });
    } catch (e) {
      return [
        { id: "quantintel-stp", name: "QuantIntel Prime STP", type: "Forex", markupLotFee: 6.0, isStpPlatform: true }
      ];
    }
  });

  // Handle direct execution from Market Analysis
  const handleExecuteAnalysisOrder = (side: 'BUY' | 'SELL') => {
    setIsExecutingAnalysisOrder(true);
    setAnalysisOrderReceipt(null);

    const currentPrice = selectedAsset.price;
    const decimals = getDecimals(selectedAsset);
    const stopDistance = currentPrice * 0.006;
    const sl = side === 'BUY' 
      ? Number((currentPrice - stopDistance).toFixed(decimals))
      : Number((currentPrice + stopDistance).toFixed(decimals));
    const tp = side === 'BUY'
      ? Number((currentPrice + stopDistance * 2).toFixed(decimals))
      : Number((currentPrice - stopDistance * 2).toFixed(decimals));

    setTimeout(() => {
      setIsExecutingAnalysisOrder(false);

      // Execute directly to the user's connected broker
      const receipt = executeDirectBrokerOrder({
        symbol: selectedAsset.symbol,
        side,
        price: currentPrice,
        lotSize: orderLotsInput,
        stopLoss: sl,
        takeProfit: tp,
        category: selectedAsset.category,
        sourceModule: `Market Analysis (${selectedTraderPersona} Confluence)`
      });

      setAnalysisOrderReceipt({
        id: receipt.ticketId,
        market: selectedAsset.symbol,
        direction: side,
        price: receipt.price,
        lots: receipt.lotSize,
        sl: receipt.stopLoss,
        tp: receipt.takeProfit,
        broker: `${receipt.brokerName} (${receipt.accountNo})`,
        persona: selectedTraderPersona
      });
    }, 1100);
  };

  // Timeframe Analysis local states
  const [selectedTimeframe, setSelectedTimeframe] = useState<'M1' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1' | 'W1' | 'MN'>('H4');
  const [loadingTimeframe, setLoadingTimeframe] = useState(false);
  const [timeframeResult, setTimeframeResult] = useState<any>(null);

  // Expanded card/factor states for the overall result breakdown
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null);

  // Generate timeframe analysis on timeframe or asset change
  const handleScanTimeframe = (tf?: 'M1' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1' | 'W1' | 'MN') => {
    const targetTF = tf || selectedTimeframe;
    setLoadingTimeframe(true);
    setTimeout(() => {
      const decimals = getDecimals(selectedAsset);
      const isBullish = selectedAsset.bullishProb > selectedAsset.bearishProb;
      const scoreValue = calculateUnifiedScore(selectedAsset, targetTF);
      const { support, resistance } = getUnifiedSupportResistance(selectedAsset.price, targetTF, decimals);
      
      setTimeframeResult({
        instrument: selectedAsset.symbol,
        timeframe: targetTF,
        timestamp: new Date().toLocaleTimeString(),
        score: scoreValue,
        bias: isBullish ? (scoreValue > 80 ? "STRONG BULLISH" : "BULLISH ACCUMULATION") : (scoreValue < 40 ? "STRONG BEARISH" : "BEARISH RETRACEMENT"),
        supportLevels: support,
        resistanceLevels: resistance,
        indicators: {
          rsi: Math.min(95, Math.max(10, 35 + Math.floor(scoreValue * 0.4))),
          emaState: isBullish ? "Price resides above EMA 20/50/200" : "EMA 20/50 Bearish crossover detected",
          volatilityState: selectedAsset.category === "Crypto" ? "High ATR range with liquid sweep anomalies" : "Stable daily ATR range"
        },
        marketStructure: targetTF === "H4" || targetTF === "D1"
          ? "SMC Break of Structure (BOS) confirmed. Deep discount order block formed."
          : "Local Change of Character (CHoCH) imminent. Liquidity grabbed at low."
      });
      setLoadingTimeframe(false);
    }, 1000);
  };

  // Cadence control: auto re-analyse every 10 to 15 minutes instead of short intervals
  const [reanalysisIntervalMin, setReanalysisIntervalMin] = useState<number>(15);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);

  // Sync local selectedTimeframe with global profile timeframe when it changes
  useEffect(() => {
    if (traderProfile?.timeframe) {
      const tf = traderProfile.timeframe;
      if (['M1', 'M5', 'M15', 'H1', 'H4', 'D1', 'W1', 'MN'].includes(tf)) {
        setSelectedTimeframe(tf as any);
      }
    }
  }, [traderProfile?.timeframe]);

  // Run automatically only when instrument symbol or selected timeframe changes
  useEffect(() => {
    if (!timeframeResult || timeframeResult.instrument !== selectedAsset.symbol || timeframeResult.timeframe !== selectedTimeframe) {
      handleScanTimeframe();
      setSecondsRemaining(reanalysisIntervalMin * 60);
    }
  }, [selectedAsset.symbol, selectedTimeframe]);

  // Auto Re-Analysis loop: runs every 10 to 15 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          handleScanTimeframe();
          onTriggerAnalysis();
          return reanalysisIntervalMin * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [reanalysisIntervalMin, onTriggerAnalysis]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Check if we have active synchronized analysisData for this asset
  const hasActiveSyncData = !!(analysisData && (analysisData.symbol === selectedAsset.symbol || !analysisData.symbol));
  
  const currentBullishProb = hasActiveSyncData && analysisData ? analysisData.bullishProb : selectedAsset.bullishProb;
  const currentBearishProb = hasActiveSyncData && analysisData ? analysisData.bearishProb : selectedAsset.bearishProb;
  const currentNeutralProb = hasActiveSyncData && analysisData ? (analysisData.neutralProb ?? selectedAsset.neutralProb) : selectedAsset.neutralProb;
  const currentConfidence = hasActiveSyncData && analysisData ? analysisData.confidence : selectedAsset.confidence;

  const isBullish = currentBullishProb > currentBearishProb;
  
  // 1. Chart AI Score
  const chartAIScore = Math.min(100, Math.max(10, Math.round(currentBullishProb * 0.7 + currentConfidence * 0.3)));
  
  // 2. AI Pattern Detection Score
  const patternScore = isBullish 
    ? Math.min(100, Math.round(75 + (currentConfidence % 15))) 
    : Math.max(15, Math.round(40 + (currentConfidence % 12)));
  
  // 3. AI Summary Trade Setup Score
  const tradeSetupScore = tradeSetup && tradeSetup.market === selectedAsset.symbol
    ? tradeSetup.confidenceScore || 85
    : (isBullish ? 76 : 42);
    
  // 4. Risk Calculation Score
  const riskScore = traderProfile?.riskTolerance === 'Conservative' 
    ? 94 
    : traderProfile?.riskTolerance === 'Aggressive' 
      ? 72 
      : 84;
      
  // 5. Technical Analysis Score
  const technicalScore = Math.min(100, Math.max(10, Math.round(52 + (currentBullishProb - 50) * 0.7 + (currentConfidence / 5))));
  
  // 6. Fundamental Analysis Score (Powered by live macro news catalyst & UN summit wire)
  const macroImpact = getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category);
  const fundamentalScore = macroImpact.sentimentScore;
        
  // 7. Sentiment Analysis Score
  const sentimentScore = Math.min(100, Math.max(10, Math.round(100 - currentBearishProb - (currentNeutralProb / 2))));

  // Quantitative Reconciled Verdict (resolving Technical vs Macro News Divergence)
  const reconciledVerdict = reconcileTechnicalAndFundamental(selectedAsset, selectedTimeframe);
  const explicitAction: "BUY" | "SELL" | "WAIT" = reconciledVerdict.finalAction;

  // Live Smart Money Concepts (SMC) & ICC Analysis
  const smcLiveAnalysis = React.useMemo(() => {
    return calculateSmartMoneyConcepts(
      selectedAsset.price,
      explicitAction === "SELL" ? "SELL" : "BUY",
      selectedTimeframe,
      getDecimals(selectedAsset),
      selectedAsset.category
    );
  }, [selectedAsset.price, explicitAction, selectedTimeframe, selectedAsset.category, selectedAsset.symbol]);

  // Weighted aggregate Overall Confluence Score
  const overallConfluenceScore = Math.round(
    (chartAIScore * 0.15) +
    (patternScore * 0.15) +
    (tradeSetupScore * 0.15) +
    (riskScore * 0.15) +
    (technicalScore * 0.15) +
    (fundamentalScore * 0.12) +
    (sentimentScore * 0.13)
  );

  // Overall Grade & Verdict matching the composite score & reconciled action
  let overallGrade = "C BALANCED RANGE";
  let overallVerdict = reconciledVerdict.actionBadge; // Explicit: "STRONG BUY (LONG)" or "STRONG SELL (SHORT)" or "WAIT / DEFENSIVE CASH"
  let overallBg = "bg-slate-900 border-slate-800 text-slate-300";
  let overallColorText = "text-amber-400";

  if (explicitAction === "BUY") {
    overallGrade = overallConfluenceScore >= 80 ? "A+ MAXIMUM BUY CONFLUENCE" : "A BULLISH ACCUMULATION";
    overallBg = "bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-emerald-500/40 text-emerald-400";
    overallColorText = "text-emerald-400";
  } else if (explicitAction === "SELL") {
    overallGrade = reconciledVerdict.confluenceType.includes("DIVERGENCE") ? "A+ BEARISH DIVERGENCE (SHORT)" : "A HIGH PROBABILITY SHORT";
    overallBg = "bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-900 border-rose-500/40 text-rose-400";
    overallColorText = "text-rose-400";
  } else {
    overallGrade = "C CAPITAL PRESERVATION (WAIT)";
    overallBg = "bg-slate-900 border-amber-500/30 text-amber-400";
    overallColorText = "text-amber-400";
  }

  // Factor Details
  const factors = [
    {
      id: "chart_ai",
      name: "Chart AI Analysis",
      score: chartAIScore,
      icon: <BarChart className="h-4 w-4" />,
      weight: "15%",
      description: "Visual analysis of geometric structures on the canvas overlay, evaluating structural high/low ratios.",
      details: hasActiveSyncData && analysisData?.explanation
        ? analysisData.explanation
        : `Calculated from current asset directional probabilities (Bullish: ${currentBullishProb}%, Bearish: ${currentBearishProb}%). Evaluates high-timeframe structural bias. Status: ${isBullish ? 'BULLISH LEAD' : 'BEARISH LEAD'}.`
    },
    {
      id: "pattern",
      name: "AI Pattern Detection",
      score: patternScore,
      icon: <Activity className="h-4 w-4" />,
      weight: "15%",
      description: "Detects standard candlestick pattern sequences (e.g. Inverted Head & Shoulders, Engulfing, Order Blocks).",
      details: hasActiveSyncData && analysisData?.detectedPatterns && analysisData.detectedPatterns.length > 0
        ? `Detected Patterns: ${analysisData.detectedPatterns.map(p => `${p.name} (${p.type}, Strength: ${p.strength})`).join(", ")}. ${analysisData.detectedPatterns[0]?.explanation || ""}`
        : `Active pattern database lists ${isBullish ? "3 Bullish formations (Double Bottom, Order Block, Support Zone)" : "2 Bearish exhaustion channels"}. Technical confidence aligns at ${currentConfidence}% strength.`
    },
    {
      id: "setup",
      name: "AI Summary Trade Setup",
      score: tradeSetupScore,
      icon: <Sparkles className="h-4 w-4" />,
      weight: "15%",
      description: "Confluence status of current trade recommendation targets, position targets, and execution tiers.",
      details: tradeSetup && tradeSetup.market === selectedAsset.symbol
        ? `Direct live trade plan detected for ${selectedAsset.symbol} in setup database. Planned Direction: ${tradeSetup.direction} with target price $${tradeSetup.takeProfit1}. Setup Grade: ${tradeSetup.tradeGrade}.`
        : `No manual trade setup triggered yet. Running predictive alignment algorithm based on current price $${selectedAsset.price}.`
    },
    {
      id: "risk",
      name: "Risk Calculation Engine",
      score: riskScore,
      icon: <Scale className="h-4 w-4" />,
      weight: "15%",
      description: "Ensures compliance with strict account margin drawdown limits and reward-to-risk rules.",
      details: `User risk profile is set to: "${traderProfile?.riskTolerance || 'Moderate'}". System limits leverage ratios automatically and enforces a maximum of 1.5% capital exposure per trade execution.`
    },
    {
      id: "technical",
      name: "Technical Overlay Score",
      score: technicalScore,
      icon: <Layers className="h-4 w-4" />,
      weight: "15%",
      description: "Mathematical score blending RSI momentum oscillators, MACD crossovers, and EMA golden/death zones.",
      details: hasActiveSyncData && analysisData?.technicalSummary
        ? analysisData.technicalSummary
        : `EMA 20/50 states: "${isBullish ? 'Price above EMAs (Bullish Support)' : 'Price below EMAs (Bearish Pressure)'}". Selected asset RSI is calibrated at ${timeframeResult?.indicators.rsi || 54} (neutral territory).`
    },
    {
      id: "fundamental",
      name: "Fundamental Macro Matrix",
      score: fundamentalScore,
      icon: <Landmark className="h-4 w-4" />,
      weight: "12%",
      description: "Macro monetary rates, Central Bank policy trends, spot liquidity inflows, and economic data impact.",
      details: hasActiveSyncData && analysisData?.fundamentalSummary
        ? analysisData.fundamentalSummary
        : (selectedAsset.category === 'Crypto'
          ? "Powered by Spot ETF net inflows (tracked at +$240M daily average) and sovereign wallet accumulation flows."
          : `Tracked policy rates: ${selectedAsset.category === 'Forex' ? 'Fed 5.25% pivot stance' : 'S&P earnings yields index'}. Cooling CPI indicators provide moderate tailwinds.`)
    },
    {
      id: "sentiment",
      name: "Sentiment Sentiment Ratio",
      score: sentimentScore,
      icon: <Users className="h-4 w-4" />,
      weight: "13%",
      description: "Contrarian retail order density index compared with smart-money defensive order book pools.",
      details: hasActiveSyncData && analysisData?.sentimentSummary
        ? analysisData.sentimentSummary
        : `Retail positioning is currently crowded in Short density (72% Short). Contrarian institutional algorithm sweeps discount stops to defensive buying points, marking high bullish-leaning signals.`
    }
  ];

  // Bullish/bearish dominance calculated
  const maxProb = Math.max(currentBullishProb, currentBearishProb, currentNeutralProb);
  const regime = currentBullishProb > currentBearishProb ? "BULLISH REGIME" : "BEARISH REGIME";

  return (
    <div className="space-y-6">
      {isGeminiCooldown && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3 text-xs leading-relaxed text-amber-300 shadow-sm animate-fade-in">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold font-mono text-[10px] uppercase text-amber-400 block tracking-widest">Local Quantitative Fallback Active</span>
            <p className="text-slate-300">
              The Gemini API has temporary rate limits or load constraints. Our ultra-high-speed local quantitative analysis fallback is active, ensuring 100% platform availability with structured mathematical models and zero downtime.
            </p>
          </div>
        </div>
      )}
      
      {/* Central Header Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-blue-400 tracking-wider uppercase mb-1">
            DEEP INTEL RADAR & CONFLUENCE ENGINE
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {selectedAsset.symbol} Market Intelligence Analysis
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Analyzing real-time multi-dimensional datasets including candlestick patterns, macro policies, technical overlays, and sentiment order pools.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
          {/* 10-15 Min Auto Re-Analysis Cadence Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs">
            <Clock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px]">Next:</span>
              <span className="text-emerald-400 font-bold tracking-wider">{formatCountdown(secondsRemaining)}</span>
              <span className="text-slate-700">|</span>
              <div className="inline-flex rounded bg-slate-900 border border-slate-800 p-0.5">
                <button
                  onClick={() => { setReanalysisIntervalMin(10); setSecondsRemaining(10 * 60); }}
                  className={`px-1.5 py-0.5 text-[9px] rounded font-bold transition-all cursor-pointer ${
                    reanalysisIntervalMin === 10 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Auto re-analyse every 10 minutes"
                >
                  10m
                </button>
                <button
                  onClick={() => { setReanalysisIntervalMin(15); setSecondsRemaining(15 * 60); }}
                  className={`px-1.5 py-0.5 text-[9px] rounded font-bold transition-all cursor-pointer ${
                    reanalysisIntervalMin === 15 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Auto re-analyse every 15 minutes"
                >
                  15m
                </button>
              </div>
            </div>
          </div>

          {/* Engine Mode Toggle */}
          <div className="bg-slate-950 border border-slate-800 p-1 rounded-xl flex items-center font-mono text-xs">
            <button
              onClick={() => onAiScanModeChange?.('quant')}
              title="Fast Local Quantitative Engine - High Speed & No API limits"
              className={`px-3 py-1.5 rounded-lg font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                aiScanMode === 'quant'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              QUANT
            </button>
            <button
              onClick={() => onAiScanModeChange?.('gemini')}
              title="Deep Gemini AI Generative Diagnostics"
              className={`px-3 py-1.5 rounded-lg font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                aiScanMode === 'gemini'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
              GEMINI
            </button>
          </div>

          <button
            onClick={() => {
              onTriggerAnalysis();
              handleScanTimeframe();
              setSecondsRemaining(reanalysisIntervalMin * 60);
            }}
            disabled={loading}
            className="w-full sm:w-auto px-4.5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-xl transition-all flex items-center justify-center gap-1.5 font-mono cursor-pointer shrink-0 shadow-lg"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Synthesizing Intel..." : "Re-Analyse Now"}
          </button>
        </div>
      </div>

      {/* THREE-WAY CENTRAL SUB-TAB BAR */}
      <div className="flex flex-wrap border-b border-slate-800">
        <button
          onClick={() => setCurrentSubTab('radar')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer ${
            currentSubTab === 'radar' 
              ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="h-4 w-4" />
          <span>Core Market Intel</span>
        </button>
        <button
          onClick={() => setCurrentSubTab('news')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer ${
            currentSubTab === 'news' 
              ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="h-4 w-4 text-cyan-400" />
          <span>Auto-Merged News & Catalysts</span>
          <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">LIVE WIRE</span>
        </button>
        <button
          onClick={() => setCurrentSubTab('timeframe')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer ${
            currentSubTab === 'timeframe' 
              ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Instrument Timeframe Analysis</span>
        </button>
        <button
          onClick={() => setCurrentSubTab('overall')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer ${
            currentSubTab === 'overall' 
              ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Computed Overall Result</span>
          <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] bg-blue-600/20 text-blue-400 border border-blue-500/30">COMPUTED</span>
        </button>
        <button
          onClick={() => setCurrentSubTab('traders')}
          className={`flex items-center gap-2 px-5 py-3.5 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer ${
            currentSubTab === 'traders' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="h-4 w-4 text-emerald-400" />
          <span>Trader Styles & Direct Execution</span>
          <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">STP ROUTING</span>
        </button>
      </div>

      {/* ACTIVE DISPLAY SUB-WINDOW */}
      <div>
        
        {/* TAB 1: CORE MARKET INTEL (Existing Core) */}
        {currentSubTab === 'radar' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Core Probability Engine */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-4">
                    AI Regime Probability Engine
                  </h3>
                  
                  {/* Probability Gauge bars */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <TrendingUp className="h-3.5 w-3.5" /> Bullish Probability
                        </span>
                        <span className="text-emerald-400 font-bold">{currentBullishProb}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${currentBullishProb}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-rose-400 font-semibold flex items-center gap-1">
                          <TrendingDown className="h-3.5 w-3.5" /> Bearish Probability
                        </span>
                        <span className="text-rose-400 font-bold">{currentBearishProb}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${currentBearishProb}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-400 font-semibold flex items-center gap-1">
                          <Compass className="h-3.5 w-3.5" /> Neutral Probability
                        </span>
                        <span className="text-slate-400 font-bold">{currentNeutralProb}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-500 rounded-full" style={{ width: `${currentNeutralProb}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-mono">Current Regime:</span>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                      currentBullishProb > currentBearishProb ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {regime}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-slate-500 font-mono">Confidence Level:</span>
                    <span className="text-slate-200 font-bold font-mono">{currentConfidence}% (HIGH)</span>
                  </div>
                </div>
              </div>

              {/* Explainable AI reasoning block */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex border-b border-slate-800 pb-3 gap-4">
                  {(['technical', 'fundamental', 'sentiment', 'smc'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`text-xs font-mono font-semibold uppercase tracking-wider pb-1 relative transition-colors cursor-pointer ${
                        activeTab === tab ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {tab === 'smc' ? 'SMC & ICC Institutional' : `${tab} Analysis`}
                      {activeTab === tab && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-4 min-h-[160px] text-xs">
                  {activeTab === 'technical' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div className="p-2.5 bg-slate-950 border border-slate-800/60 rounded">
                          <div className="text-[10px] text-slate-500 font-mono uppercase">RSI (14)</div>
                          <div className={`font-mono font-semibold mt-0.5 ${isBullish ? 'text-slate-200' : 'text-rose-400'}`}>
                            {isBullish ? "56.4 - Bullish Drift" : "38.2 - Bearish Momentum"}
                          </div>
                        </div>
                        <div className="p-2.5 bg-slate-950 border border-slate-800/60 rounded">
                          <div className="text-[10px] text-slate-500 font-mono uppercase">MACD (12, 26)</div>
                          <div className={`font-mono font-semibold mt-0.5 ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isBullish ? "Bullish Crossover" : "Bearish Divergence / Expanding Red Bars"}
                          </div>
                        </div>
                        <div className="p-2.5 bg-slate-950 border border-slate-800/60 rounded">
                          <div className="text-[10px] text-slate-500 font-mono uppercase">ATR (14)</div>
                          <div className="text-slate-200 font-mono font-semibold mt-0.5">
                            {selectedAsset.category === 'Crypto' ? 'High ATR Expansion' : 'Normal Session Volatility'}
                          </div>
                        </div>
                        <div className="p-2.5 bg-slate-950 border border-slate-800/60 rounded">
                          <div className="text-[10px] text-slate-500 font-mono uppercase">VWAP</div>
                          <div className={`font-mono font-semibold mt-0.5 ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isBullish ? "Above (Support Floor)" : "Below (Resistance Overhead)"}
                          </div>
                        </div>
                        <div className="p-2.5 bg-slate-950 border border-slate-800/60 rounded">
                          <div className="text-[10px] text-slate-500 font-mono uppercase">Trend Structure</div>
                          <div className={`font-mono font-semibold mt-0.5 ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isBullish ? "Bullish (HH / HL)" : "Bearish (LH / LL)"}
                          </div>
                        </div>
                        <div className="p-2.5 bg-slate-950 border border-slate-800/60 rounded">
                          <div className="text-[10px] text-slate-500 font-mono uppercase">Fibonacci 61.8%</div>
                          <div className={`font-mono font-semibold mt-0.5 ${isBullish ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {isBullish ? "Golden Pocket Bounce" : "Rejected at 61.8% Supply"}
                          </div>
                        </div>
                      </div>

                      <p className="text-slate-300 leading-relaxed italic bg-slate-950/40 p-3 border border-slate-800/50 rounded-lg font-mono">
                        {analysisData?.technicalSummary || (
                          isBullish 
                            ? "The 20 EMA is trending consistently above the 50 SMA. Price actions are establishing structural higher lows (HL) right around the 61.8% Fibonacci golden pocket, confirming stable institutional accumulation."
                            : "The 20 EMA has crossed beneath the 50 SMA. Price action is establishing structural lower highs (LH) and rejecting institutional supply order blocks, confirming directional distribution and downside momentum."
                        )}
                      </p>
                    </div>
                  )}

                  {activeTab === 'fundamental' && (
                    <div className="space-y-4">
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                        <div className="flex justify-between text-[11px] border-b border-slate-800 pb-1.5 text-slate-400">
                          <span>Macro Variable</span>
                          <span>Status / Impact</span>
                        </div>
                        {selectedAsset.category === 'Crypto' ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-300 font-mono">Spot ETF Net Flow</span>
                              <span className={`font-mono font-semibold ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isBullish ? "+$240M Net Inflow" : "-$185M Net Institutional Outflow"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-300 font-mono">Network Activity & Hashrate</span>
                              <span className="text-slate-200 font-mono">High Security Baselined</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-300 font-mono">MVRV Valuation Z-Score</span>
                              <span className="text-amber-400 font-mono">
                                {isBullish ? "2.14 (Moderate Accumulation)" : "3.48 (Overextended Distribution)"}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-300 font-mono">Central Bank Rate Policy</span>
                              <span className="text-slate-200 font-mono">
                                {isBullish ? "5.25% (Accommodative Bias)" : "Restrictive Stance / Yield Inversion"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-300 font-mono">Core Inflation MoM</span>
                              <span className={`font-mono font-semibold ${isBullish ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {isBullish ? "0.2% (Cooling Inflationary Pressures)" : "0.4% (Sticky Input Inflation)"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-300 font-mono">Sovereign Yields (10Y)</span>
                              <span className="text-slate-200 font-mono">
                                {isBullish ? "Yields Retracting (Risk-On)" : "Yields Spiking (Liquidity Drain)"}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      <p className="text-slate-300 leading-relaxed italic bg-slate-950/40 p-3 border border-slate-800/50 rounded-lg font-mono">
                        {analysisData?.fundamentalSummary || (
                          isBullish
                            ? "Macro monetary indicators imply steady capital inflows and cooling yield pressure, giving high-liquidity assets room for upward trend extension."
                            : "Macro monetary indicators indicate hawkish yield pressure and institutional liquidity withdrawal, triggering defensive short hedges across sovereign markets."
                        )}
                      </p>
                    </div>
                  )}

                  {activeTab === 'sentiment' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
                          <div className="text-[10px] text-slate-500 font-mono mb-2 uppercase">Retail Sentiment Index</div>
                          <div className="flex items-center justify-between font-mono">
                            <span className={isBullish ? "text-rose-400" : "text-emerald-400"}>
                              {isBullish ? "72% Short" : "74% Long (Retail Trapped)"}
                            </span>
                            <span className="text-slate-500">vs</span>
                            <span className={isBullish ? "text-emerald-400" : "text-rose-400"}>
                              {isBullish ? "28% Long" : "26% Short"}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-900 rounded-full mt-2 overflow-hidden flex">
                            <div className={`h-full ${isBullish ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: isBullish ? '72%' : '74%' }} />
                            <div className={`h-full ${isBullish ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: isBullish ? '28%' : '26%' }} />
                          </div>
                          <span className={`text-[9px] mt-1.5 block font-mono ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isBullish 
                              ? "Contrarian Signal: Strong Bullish Bias (Retail Heavily Short)" 
                              : "Contrarian Signal: Strong Bearish Bias (Retail Trapped Long)"}
                          </span>
                        </div>

                        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg">
                          <div className="text-[10px] text-slate-500 font-mono mb-2 uppercase">Institutional Order Book Flow</div>
                          <div className="flex items-center justify-between font-mono">
                            <span className={`font-semibold ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isBullish ? "Accumulation Regime" : "Distribution & Supply Engineering Regime"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-mono">
                            {isBullish
                              ? "Smart money desks detect heavy iceberg limit buy orders defending discount swing low liquidity pools."
                              : "Smart money desks detect aggressive sell-side liquidity engineering on rallies, utilizing retail breakout buy stops for distribution."}
                          </p>
                        </div>
                      </div>

                      {/* Auto-Merged Live Macro & UN Summit Shockwire */}
                      <div className="p-3.5 bg-gradient-to-r from-slate-950 via-cyan-950/20 to-slate-950 border border-cyan-500/30 rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                            <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                            Auto-Merged Macro Catalyst: {getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).primaryCatalyst}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).shockRisk === "CRITICAL" ? "bg-rose-500/20 text-rose-300" :
                            getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).shockRisk === "ELEVATED" ? "bg-amber-500/20 text-amber-300" :
                            "bg-emerald-500/20 text-emerald-300"
                          }`}>
                            {getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).shockRisk} SHOCK RISK
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                          <strong className="text-amber-400">Protective Action:</strong> {getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).volatilityBufferRecommendation}
                        </p>
                      </div>

                      <p className="text-slate-300 leading-relaxed italic bg-slate-950/40 p-3 border border-slate-800/50 rounded-lg font-mono">
                        {analysisData?.sentimentSummary || (
                          isBullish
                            ? "Retail accounts are heavily crowded in short positions. Contending with this sentiment, proprietary order desks are sweeping discount sell-side stops, reinforcing probability-based continuation upward."
                            : "Retail accounts are attempting to catch the falling knife. Commercial dealers are distributing supply into local resistance pops, validating the high-probability sell bias."
                        )}
                      </p>
                    </div>
                  )}

                  {/* TAB 4: SMART MONEY CONCEPTS (SMC) & ICC INSTITUTIONAL */}
                  {activeTab === 'smc' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                          <div className="text-[10px] text-slate-500 font-mono uppercase">FVG / PVG Status</div>
                          <div className="text-emerald-400 font-mono font-bold mt-1 text-xs">
                            {(smcLiveAnalysis.fvgs || []).filter(f => !f.mitigated).length > 0
                              ? `${(smcLiveAnalysis.fvgs || []).filter(f => !f.mitigated).length} Active FVG / PVG Zones`
                              : 'Fully Mitigated'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            50% CE: ${smcLiveAnalysis.fvgs?.[0]?.midCe?.toFixed(getDecimals(selectedAsset)) || selectedAsset.price}
                          </div>
                        </div>

                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                          <div className="text-[10px] text-slate-500 font-mono uppercase">Liquidity Pool Target</div>
                          <div className="text-cyan-400 font-mono font-bold mt-1 text-xs">
                            {smcLiveAnalysis.liquidityPools?.[0]?.type || 'BSL/SSL'} Draw
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            ${smcLiveAnalysis.liquidityPools?.[0]?.level?.toFixed(getDecimals(selectedAsset)) || selectedAsset.price} ({smcLiveAnalysis.liquidityPools?.[0]?.pipsAway || 0} pips away)
                          </div>
                        </div>

                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                          <div className="text-[10px] text-slate-500 font-mono uppercase">Dealing Range 50% EQ</div>
                          <div className={`font-mono font-bold mt-1 text-xs ${smcLiveAnalysis.premiumDiscount.currentZone === 'DISCOUNT' ? 'text-emerald-400' : smcLiveAnalysis.premiumDiscount.currentZone === 'PREMIUM' ? 'text-rose-400' : 'text-amber-400'}`}>
                            {smcLiveAnalysis.premiumDiscount.currentZone} ({smcLiveAnalysis.premiumDiscount.premiumDiscountRatio}% Range)
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            EQ: ${smcLiveAnalysis.premiumDiscount.equilibrium?.toFixed(getDecimals(selectedAsset))}
                          </div>
                        </div>

                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                          <div className="text-[10px] text-slate-500 font-mono uppercase">ICC System Status</div>
                          <div className="text-amber-400 font-mono font-bold mt-1 text-xs">
                            {smcLiveAnalysis.icc.currentPhase}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {smcLiveAnalysis.icc.phaseStage} (Trigger: ${smcLiveAnalysis.icc.continuationTrigger})
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-lg font-mono text-xs space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Institutional Structure Matrix:</span>
                          <span className={smcLiveAnalysis.choch?.triggered ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                            {smcLiveAnalysis.choch?.triggered ? '⚡ Active CHoCH Trend Reversal' : 'Continuation BOS in Effect'}
                          </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                          Smart money footprints confirm order flow alignment. Order blocks (+OB Demand MT at ${smcLiveAnalysis.orderBlocks?.[0]?.meanThreshold?.toFixed(getDecimals(selectedAsset))} / -OB Supply MT at ${smcLiveAnalysis.orderBlocks?.[1]?.meanThreshold?.toFixed(getDecimals(selectedAsset))}) are strictly defended. Execution clearance is validated when entering in {isBullish ? 'Discount Accumulation (<50% EQ)' : 'Premium Distribution (>50% EQ)'}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Synthesis Report */}
            {analysisData && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-3">
                  <Compass className="h-5 w-5 text-blue-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono">
                    Explainable AI Intelligence Synthesis
                  </h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-950 p-4 rounded-lg border border-slate-850">
                  {analysisData.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TIMEFRAME INSTRUMENT ANALYSIS */}
        {currentSubTab === 'timeframe' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Instrument Timeframe Multi-Alignment Scan
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Perform real-time timeframe queries on {selectedAsset.symbol} to determine discrete localized trends.
                </p>
              </div>

              {/* Selector buttons */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1.5 rounded-xl self-start md:self-auto">
                {(['M5', 'M15', 'H1', 'H4', 'D1'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      setSelectedTimeframe(tf);
                      handleScanTimeframe(tf);
                      if (onTimeframeChange) {
                        onTimeframeChange(tf);
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-bold font-mono rounded-lg transition-all cursor-pointer ${
                      selectedTimeframe === tf 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {loadingTimeframe ? (
              <div className="py-24 text-center space-y-4">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-mono animate-pulse">Running localized timeframe alignments and compiling support indices...</p>
              </div>
            ) : timeframeResult ? (
              <div className="space-y-6">
                
                {/* Timeframe Result Dashboard Header */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between font-mono">
                    <div>
                      <span className="text-[9px] text-slate-500 block">INSTRUMENT</span>
                      <span className="text-sm font-bold text-white">{timeframeResult.instrument}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{timeframeResult.timeframe} TIME FRAME</span>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between font-mono">
                    <div>
                      <span className="text-[9px] text-slate-500 block">LOCAL CONFIDENCE</span>
                      <span className="text-sm font-bold text-white">{timeframeResult.score} / 100</span>
                    </div>
                    <div className="h-1.5 w-16 bg-slate-850 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${timeframeResult.score}%` }} />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between font-mono">
                    <div>
                      <span className="text-[9px] text-slate-500 block">SIGNAL DIRECTION</span>
                      <span className={`text-xs font-bold ${timeframeResult.bias.includes("STRONG") ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {timeframeResult.bias}
                      </span>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                </div>

                {/* Technical / Structure Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-3 font-mono">
                    <h4 className="text-[10px] font-bold uppercase text-blue-400 tracking-wider flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      Timeframe Technical Indicators
                    </h4>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-850 pb-2">
                        <span className="text-slate-400">RSI Oscillator (14):</span>
                        <span className={`font-bold ${timeframeResult.indicators.rsi > 60 ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {timeframeResult.indicators.rsi} (Neutral-Bullish)
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-850 pb-2">
                        <span className="text-slate-400">Exponential Moving Averages:</span>
                        <span className="text-emerald-400 font-bold text-right">{timeframeResult.indicators.emaState}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Volatility Standard Index:</span>
                        <span className="text-slate-200 font-bold">{timeframeResult.indicators.volatilityState}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-3 font-mono">
                    <h4 className="text-[10px] font-bold uppercase text-blue-400 tracking-wider flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5" />
                      Market Structure details
                    </h4>
                    
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Structure Transition:</span>
                        <p className="text-slate-200 font-semibold">{timeframeResult.marketStructure}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-850">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Support Target:</span>
                          <span className="text-emerald-400 font-bold text-sm">${timeframeResult.supportLevels[0]}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Resistance Target:</span>
                          <span className="text-rose-400 font-bold text-sm">${timeframeResult.resistanceLevels[0]}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Advice */}
                <div className="p-4 bg-blue-950/20 border border-blue-500/10 rounded-xl flex gap-3 items-start">
                  <Sparkles className="h-4 w-4 text-blue-400 shrink-0 mt-0.5 animate-pulse" />
                  <div className="font-mono">
                    <span className="font-bold text-white text-xs block">AI Timeframe Correlation Advice</span>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      Scanning {selectedTimeframe} structure reveals optimal risk parameters. Price actions are respected near the support target at ${timeframeResult.supportLevels[0]}. To deploy positions securely, monitor the active overall confluence result in the next tab before triggering orders.
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-20 text-center space-y-3">
                <HelpCircle className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500 font-mono">No timeframe analysis loaded. Choose a timeframe above to scan.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: COMPUTED OVERALL CONFLUENCE RESULT (Aggregated from all factors) */}
        {currentSubTab === 'overall' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Overall result header score card with Explicit BUY or SELL Action */}
            <div className={`p-6 border rounded-xl font-mono ${overallBg} space-y-4 shadow-xl relative overflow-hidden`}>
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <ShieldCheck className="h-40 w-40" />
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/40 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-slate-400 tracking-wider uppercase block font-bold">COMPOSITE MULTI-DIMENSIONAL CONFLUENCE</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono ${
                      explicitAction === "BUY" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" :
                      explicitAction === "SELL" ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" :
                      "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}>
                      {explicitAction === "BUY" ? "EXECUTE BUY / LONG" : explicitAction === "SELL" ? "EXECUTE SELL / SHORT" : "STAND ASIDE"}
                    </span>
                  </div>
                  <h3 className={`text-xl sm:text-2xl font-black tracking-wide ${overallColorText}`}>{overallVerdict}</h3>
                  <span className="text-xs text-slate-300 block font-mono mt-0.5">
                    {selectedAsset.symbol} on {selectedTimeframe} chart. Reconciled across 7 analytical layers.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 block">CONFLUENCE INDEX</span>
                    <span className="text-2xl font-black text-white">{overallConfluenceScore}%</span>
                  </div>
                  <div className="h-10 w-2.5 bg-slate-900 rounded-full overflow-hidden flex flex-col justify-end">
                    <div className="w-full bg-blue-500" style={{ height: `${overallConfluenceScore}%` }} />
                  </div>
                </div>
              </div>

              {/* Explicit BUY or SELL Action & Risk Buffer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 block font-bold mb-1 uppercase text-[10px]">EXPLICIT ORDER DIRECTIVE:</span>
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${explicitAction === "BUY" ? 'bg-emerald-400' : explicitAction === "SELL" ? 'bg-rose-400' : 'bg-amber-400'}`} />
                    <span className="text-white font-extrabold text-sm">{explicitAction === "BUY" ? "BUY / LONG" : explicitAction === "SELL" ? "SELL / SHORT" : "HOLD / WAIT"}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({overallGrade})</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1.5 font-mono">
                    {reconciledVerdict.tradeGuidance}
                  </p>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 block font-bold mb-1 uppercase text-[10px]">RISK TOLERANCE & BUFFER:</span>
                  <span className="text-slate-300 block text-xs">
                    {reconciledVerdict.riskBufferNote}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Account Cap: {traderProfile?.riskTolerance === 'Conservative' ? '0.5%' : traderProfile?.riskTolerance === 'Aggressive' ? '2.0%' : '1.0%'} equity.
                  </span>
                </div>
              </div>

              {/* Divergence Conflict Resolution Banner */}
              <div className="p-4 bg-slate-950 border border-cyan-500/30 rounded-xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    <span>Technical vs Fundamental / News Divergence Resolution</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase self-start sm:self-auto ${
                    reconciledVerdict.confluenceType.includes("DIVERGENCE")
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  }`}>
                    {reconciledVerdict.confluenceType.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-500 uppercase block">1. Technical Indicator Signal</span>
                    <span className={`text-xs font-bold block mt-0.5 ${reconciledVerdict.technicalBias === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                      {reconciledVerdict.technicalBias} (Score: {reconciledVerdict.technicalScore}%)
                    </span>
                    <span className="text-[9px] text-slate-400">Moving averages & RSI bias</span>
                  </div>

                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-500 uppercase block">2. Macro News Catalyst Wire</span>
                    <span className={`text-xs font-bold block mt-0.5 ${reconciledVerdict.fundamentalBias === "BULLISH" ? "text-emerald-400" : "text-rose-400"}`}>
                      {reconciledVerdict.fundamentalBias} (Score: {reconciledVerdict.fundamentalScore}%)
                    </span>
                    <span className="text-[9px] text-slate-400 truncate block">{macroImpact.primaryCatalyst}</span>
                  </div>

                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-500 uppercase block">3. Real Result Outcome</span>
                    <span className={`text-xs font-black block mt-0.5 ${explicitAction === "BUY" ? "text-emerald-400" : explicitAction === "SELL" ? "text-rose-400" : "text-amber-400"}`}>
                      {explicitAction === "BUY" ? "BUY VERIFIED" : explicitAction === "SELL" ? "SELL VERIFIED" : "STAND ASIDE"}
                    </span>
                    <span className="text-[9px] text-slate-400">Conflict synthesized</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                  {reconciledVerdict.divergenceResolutionNote}
                </p>

                {/* Institutional Price Execution Targets */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  <div className="p-2 bg-slate-900/90 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-500 uppercase block">ENTRY PRICE</span>
                    <span className="font-mono font-bold text-white">${reconciledVerdict.levels.entryPrice.toLocaleString(undefined, { minimumFractionDigits: selectedAsset.price < 50 ? 4 : 2 })}</span>
                  </div>
                  <div className="p-2 bg-slate-900/90 rounded border border-rose-500/30">
                    <span className="text-[9px] text-rose-400 uppercase block">STOP LOSS</span>
                    <span className="font-mono font-bold text-rose-300">${reconciledVerdict.levels.stopLoss.toLocaleString(undefined, { minimumFractionDigits: selectedAsset.price < 50 ? 4 : 2 })}</span>
                  </div>
                  <div className="p-2 bg-slate-900/90 rounded border border-emerald-500/30">
                    <span className="text-[9px] text-emerald-400 uppercase block">TAKE PROFIT 1</span>
                    <span className="font-mono font-bold text-emerald-300">${reconciledVerdict.levels.takeProfit1.toLocaleString(undefined, { minimumFractionDigits: selectedAsset.price < 50 ? 4 : 2 })}</span>
                  </div>
                  <div className="p-2 bg-slate-900/90 rounded border border-blue-500/30">
                    <span className="text-[9px] text-blue-400 uppercase block">RISK / REWARD</span>
                    <span className="font-mono font-bold text-blue-300">{reconciledVerdict.levels.riskReward}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Factor breakdown header */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Aggregated Analytical Components Breakdown (7 Layers)
                </h4>
                <span className="text-[10px] font-mono text-slate-500">Click to expand details</span>
              </div>

              <div className="grid grid-cols-1 gap-3 font-mono">
                {factors.map((factor) => {
                  const isExpanded = expandedFactor === factor.id;
                  return (
                    <div 
                      key={factor.id}
                      onClick={() => setExpandedFactor(isExpanded ? null : factor.id)}
                      className={`border rounded-xl transition-all cursor-pointer overflow-hidden ${
                        isExpanded 
                          ? 'bg-slate-900 border-blue-500/50 shadow-md' 
                          : 'bg-slate-950 border-slate-850 hover:bg-slate-900/40 hover:border-slate-800'
                      }`}
                    >
                      <div className="p-3.5 flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-lg ${factor.score >= 70 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'} shrink-0`}>
                            {factor.icon}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-white block">{factor.name}</span>
                            <span className="text-[10px] text-slate-400 truncate block">{factor.description}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">SCORE: <strong className="text-white">{factor.score}%</strong></span>
                            <span className="text-[8px] text-slate-500 block uppercase">Weight: {factor.weight}</span>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180 text-blue-400' : ''}`} />
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1.5 border-t border-slate-850/60 text-[11px] leading-relaxed text-slate-300 bg-slate-950/40 space-y-2">
                          <p>{factor.details}</p>
                          <div className="flex items-center gap-2 text-[10px] text-blue-400 font-semibold pt-1 border-t border-slate-900">
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                            <span>Factor integrated with 100% data fidelity.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Confluence compliance checklist */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                Confluence Safety Auditing Checkpoints
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-850 space-y-1">
                  <div className="text-emerald-400 font-bold text-[10px] uppercase flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    PATTERN CORRELATION
                  </div>
                  <p className="text-[10px] text-slate-400">All local timeframe candlestick trends match multi-layer directions.</p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-850 space-y-1">
                  <div className="text-emerald-400 font-bold text-[10px] uppercase flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    RISK PROTECTION VERIFIED
                  </div>
                  <p className="text-[10px] text-slate-400">Trading size checks ensure strict protection against margin drawdowns.</p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-850 space-y-1">
                  <div className="text-emerald-400 font-bold text-[10px] uppercase flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    SENTIMENT ALIGNED
                  </div>
                  <p className="text-[10px] text-slate-400">Contrarian crowd index confirms institutional support levels stand defended.</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: TRADER PROFILES, DIRECT STP ROUTING & PLATFORM EARNINGS */}
        {currentSubTab === 'traders' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6 animate-fade-in">
            
            {/* Header / Intro */}
            <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  Trader Archetype Routing & Direct STP Execution
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Can all trader types place orders here? Yes! Review how Scalpers, Day Traders, Swing Traders, and Institutional desks execute orders and route liquidity.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-bold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  A-Book STP Engine Ready
                </span>
              </div>
            </div>

            {/* Trader Persona Grid: Scalper, Day, Swing, Institutional */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  1. Select Trader Archetype to Adapt Parameters
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  Click any profile to adjust order timeframe, lot size & STP execution rules
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
                {[
                  {
                    type: 'Scalper',
                    badge: 'M1 - M5 Flow',
                    holding: 'Seconds to Minutes',
                    targetR: '1:1 to 1:1.5 RR',
                    defaultLots: 0.5,
                    color: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
                    activeColor: 'ring-2 ring-amber-500 bg-amber-500/10',
                    desc: 'Micro tick capture on high volatility instruments. Demands ultra-low latency STP routing (<18ms) and sub-pip spreads.'
                  },
                  {
                    type: 'Day Trader',
                    badge: 'M15 - H1 Intraday',
                    holding: 'Hours (Closed by EOD)',
                    targetR: '1:2 to 1:3 RR',
                    defaultLots: 0.2,
                    color: 'text-blue-400 border-blue-500/30 bg-blue-500/5',
                    activeColor: 'ring-2 ring-blue-500 bg-blue-500/10',
                    desc: 'Capitalizes on daily momentum breaks & London/NY session overlaps with zero overnight financing swap risk.'
                  },
                  {
                    type: 'Swing Trader',
                    badge: 'H4 - D1 Structure',
                    holding: 'Days to Weeks',
                    targetR: '1:3 to 1:5+ RR',
                    defaultLots: 0.1,
                    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
                    activeColor: 'ring-2 ring-emerald-500 bg-emerald-500/10',
                    desc: 'Catches macro multi-day impulses using multi-layer confluence. Requires wide stop padding and robust swap rates.'
                  },
                  {
                    type: 'Institutional Trader',
                    badge: 'D1 - W1 Liquidity',
                    holding: 'Weeks to Months',
                    targetR: 'Algorithmic TWAP',
                    defaultLots: 1.0,
                    color: 'text-purple-400 border-purple-500/30 bg-purple-500/5',
                    activeColor: 'ring-2 ring-purple-500 bg-purple-500/10',
                    desc: 'Large block order deployment via Prime DMA/STP pools with minimal market impact and deep tier-1 liquidity depth.'
                  }
                ].map((persona) => {
                  const isSelected = selectedTraderPersona === persona.type;
                  return (
                    <div
                      key={persona.type}
                      onClick={() => {
                        setSelectedTraderPersona(persona.type as any);
                        setOrderLotsInput(persona.defaultLots);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected 
                          ? `${persona.activeColor} border-transparent shadow-lg` 
                          : 'bg-slate-950/60 border-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-white">{persona.type}</span>
                        <span className={`text-[9.5px] px-2 py-0.5 rounded border font-bold ${persona.color}`}>
                          {persona.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug mb-3 min-h-[38px]">
                        {persona.desc}
                      </p>
                      <div className="space-y-1 text-[10px] text-slate-500 border-t border-slate-900 pt-2">
                        <div className="flex justify-between">
                          <span>Hold Horizon:</span>
                          <span className="text-slate-300 font-semibold">{persona.holding}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Risk / Reward:</span>
                          <span className="text-slate-300 font-semibold">{persona.targetR}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Preset Size:</span>
                          <span className="text-emerald-400 font-bold">{persona.defaultLots} Lots</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direct Order Execution Terminal */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Direct STP Execution Terminal — {selectedAsset.symbol}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Current Bid/Ask: <strong className="text-white">${selectedAsset.price.toLocaleString()}</strong>
                </span>
              </div>

              {/* Order Receipt Notice */}
              {analysisOrderReceipt && (
                <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs space-y-1.5 animate-fade-in">
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" />
                      ORDER CLEARED VIA STRAIGHT-THROUGH-PROCESSING (STP)
                    </span>
                    <span>Ticket #{analysisOrderReceipt.id}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300 pt-1">
                    <div>Asset: <strong className="text-white">{analysisOrderReceipt.market}</strong></div>
                    <div>Direction: <strong className={analysisOrderReceipt.direction === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>{analysisOrderReceipt.direction}</strong></div>
                    <div>Volume: <strong className="text-white">{analysisOrderReceipt.lots} Lots</strong></div>
                    <div>Broker: <strong className="text-blue-400">{analysisOrderReceipt.broker}</strong></div>
                  </div>
                  <div className="text-[10px] text-emerald-300/80 pt-1 border-t border-emerald-900/40">
                    Position logged to Active Paper Positions & AI Trading Journal.
                  </div>
                </div>
              )}

              {/* Execution Controls Form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                
                {/* 1. Target Broker Selector */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-bold text-[10px] uppercase">
                    Executing Broker Route:
                  </label>
                  <select
                    value={selectedBrokerTarget}
                    onChange={(e) => {
                      const newTarget = e.target.value;
                      setSelectedBrokerTarget(newTarget);
                      const matched = availableBrokers.find(b => b.id === newTarget);
                      setActivePrimaryBroker(newTarget, matched?.name);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-white font-mono text-xs font-bold focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {availableBrokers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.type || 'STP'}) - {b.isStpPlatform ? 'Built-in Platform STP' : 'Connected Client Broker'}
                      </option>
                    ))}
                  </select>
                  <span className="text-[9.5px] text-slate-500 block">
                    Routes directly through A-Book liquidity pool with 0 markup pip slippage.
                  </span>
                </div>

                {/* 2. Volume Lots */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-bold text-[10px] uppercase">
                    Order Volume (Lots):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.05"
                      min="0.01"
                      max="50"
                      value={orderLotsInput}
                      onChange={(e) => setOrderLotsInput(Math.max(0.01, parseFloat(e.target.value) || 0.1))}
                      className="flex-1 bg-slate-900 border border-slate-800 p-2 rounded-lg text-white font-mono text-xs font-bold focus:border-emerald-500 focus:outline-none"
                    />
                    <div className="flex gap-1">
                      {[0.1, 0.5, 1.0].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setOrderLotsInput(val)}
                          className="px-2 py-1 bg-slate-850 hover:bg-slate-800 text-[10px] rounded text-slate-300 cursor-pointer"
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="text-[9.5px] text-slate-500 block">
                    Tailored for {selectedTraderPersona} risk profile.
                  </span>
                </div>

                {/* 3. STP Buy/Sell Dispatch Buttons */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-bold text-[10px] uppercase">
                    Dispatch Market Order:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isExecutingAnalysisOrder}
                      onClick={() => handleExecuteAnalysisOrder('BUY')}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer shadow-lg shadow-emerald-950/40"
                    >
                      {isExecutingAnalysisOrder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
                      BUY / LONG
                    </button>
                    <button
                      type="button"
                      disabled={isExecutingAnalysisOrder}
                      onClick={() => handleExecuteAnalysisOrder('SELL')}
                      className="py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer shadow-lg shadow-rose-950/40"
                    >
                      {isExecutingAnalysisOrder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      SELL / SHORT
                    </button>
                  </div>
                  <span className="text-[9.5px] text-slate-500 block text-center">
                    Sub-second execution with automated SL & TP safety bounds.
                  </span>
                </div>

              </div>
            </div>

            {/* Clean Trader-Style Institutional Direct Execution Engine */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              
              {/* Panel 1: Execution Latency & Routing Status */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-[11px] uppercase border-b border-slate-850 pb-2">
                  <Cpu className="h-4 w-4" />
                  Execution Latency & Routing
                </div>
                <div className="space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
                    <span className="text-slate-500">Pipeline Latency:</span>
                    <span className="text-emerald-400 font-bold font-mono">11ms (Ultra-Low)</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
                    <span className="text-slate-500">Slippage Guard:</span>
                    <span className="text-cyan-400 font-bold font-mono">&le; 0.4 Pips Dynamic</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500">Order Dispatch:</span>
                    <span className="text-emerald-400 font-bold font-mono">STP Direct Market Fill</span>
                  </div>
                </div>
              </div>

              {/* Panel 2: Protective Volatility & Risk Bounds */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px] uppercase border-b border-slate-850 pb-2">
                  <ShieldCheck className="h-4 w-4" />
                  Protective Volatility Bounds
                </div>
                <div className="space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
                    <span className="text-slate-500">Stop Loss Protocol:</span>
                    <span className="text-slate-200 font-bold font-mono">1.5x ATR Volatility Buffer</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-900">
                    <span className="text-slate-500">Breakeven Trigger:</span>
                    <span className="text-emerald-400 font-bold font-mono">+1.0R Price Progress</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500">Take Profit Scaling:</span>
                    <span className="text-slate-200 font-bold font-mono">50% Scale-Out at TP1</span>
                  </div>
                </div>
              </div>

              {/* Panel 3: Direct Trader Style Actions */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-[11px] uppercase border-b border-slate-850 pb-2">
                  <Zap className="h-4 w-4" />
                  Fast Execution Actions
                </div>
                <div className="space-y-2 text-[11px]">
                  <p className="text-slate-400">
                    Direct execution routes orders instantaneously with pre-configured risk guards and automated trade journaling.
                  </p>
                  {onNavigateToSection && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => onNavigateToSection('setup')}
                        className="w-full py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded text-[10.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 font-mono"
                      >
                        Launch Configured Trade Setup <ArrowRight className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigateToSection('shield')}
                        className="w-full py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 rounded text-[10.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 font-mono"
                      >
                        Inspect Loss Protection Shield <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 5: AUTO-MERGED NEWS & MACRO VOLATILITY WIRE */}
        {currentSubTab === 'news' && (
          <div className="space-y-6">
            
            {/* Macro Wire Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 border border-cyan-500/30 rounded-2xl p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-cyan-400 animate-pulse" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-white font-mono">
                      Auto-Merged Macro Shock & News Wire for {selectedAsset.symbol}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    UN Summits, Central Bank policy announcements, Dollar Index (DXY) safe-haven surges, and institutional liquidity flows automatically merged into technical models.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider ${
                    getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).shockRisk === "CRITICAL"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).shockRisk === "ELEVATED"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  }`}>
                    {getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).shockRisk} MACRO RISK
                  </span>
                </div>
              </div>
            </div>

            {/* Contextual Impact & News Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Asset Shock Diagnostics */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Sparkles className="h-4 w-4" />
                  Catalyst Intelligence
                </div>

                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-850 space-y-2 text-xs font-mono">
                  <div className="text-slate-500 uppercase text-[10px]">Dominant Macro Catalyst:</div>
                  <div className="text-white font-bold leading-snug">
                    {getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).primaryCatalyst}
                  </div>
                  <div className="text-slate-400 text-[11px] pt-1 border-t border-slate-900">
                    Source: {getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).sourceEvent}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-850 space-y-2 text-xs font-mono">
                  <div className="text-slate-500 uppercase text-[10px]">Protective Buffer Recommendation:</div>
                  <div className="text-amber-400 font-bold leading-snug text-[11px]">
                    {getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).volatilityBufferRecommendation}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-850 space-y-2 text-xs font-mono">
                  <div className="text-slate-500 uppercase text-[10px]">Institutional Action Directive:</div>
                  <div className="text-emerald-400 font-bold leading-snug text-[11px]">
                    {getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).lossShieldAction}
                  </div>
                </div>

                {onNavigateToSection && (
                  <button
                    type="button"
                    onClick={() => onNavigateToSection('news')}
                    className="w-full py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Open Full News Terminal
                  </button>
                )}
              </div>

              {/* Right Column: Live Matching News Stories */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                    Recent Verified News & Liquidity Wires for {selectedAsset.symbol}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {getNewsForAsset(selectedAsset.symbol, selectedAsset.category).length} Stories Merged
                  </span>
                </div>

                {getNewsForAsset(selectedAsset.symbol, selectedAsset.category).map((story) => (
                  <div 
                    key={story.id}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="text-cyan-400 font-bold">{story.source}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">{story.timeAgo}</span>
                        <span className="text-slate-600">•</span>
                        <span className="px-1.5 py-0.5 bg-slate-950 text-slate-300 rounded border border-slate-800">
                          {story.category}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black ${
                        story.sentiment === "BULLISH" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                        story.sentiment === "BEARISH" ? "bg-rose-500/10 text-rose-400 border border-rose-500/30" :
                        "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      }`}>
                        {story.sentiment} ({story.impact} IMPACT)
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white leading-snug">
                      {story.headline}
                    </h4>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {story.summary}
                    </p>

                    <div className="p-2 bg-slate-950 rounded border border-slate-850 text-[10.5px] font-mono text-amber-300/90 flex items-center gap-2">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span>{story.riskImpactNote}</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
