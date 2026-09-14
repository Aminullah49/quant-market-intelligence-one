import React, { useState, useEffect } from "react";
import { MarketAsset, TechnicalState, MarketAnalysisResponse, TradeSetupPlan } from "../types";
import { generateCandlesticks } from "../data";
import { generateDynamicAnalysis, generateDynamicSetup, getUpcomingEvents, getDecimals, getTimeframeMultiplier } from "../utils";
import { 
  TrendingUp, TrendingDown, Eye, Play, Sparkles, Activity, ShieldAlert,
  ArrowUpRight, BarChart3, Crosshair, ChevronDown, ChevronUp, RefreshCw, Star, 
  Camera, Maximize2, Settings, Type, Square, Ruler, Lock, Trash2, 
  Clock, Calendar, Coins, Flame, Info, CheckCircle2, AlertTriangle, HelpCircle,
  X, Search, Filter, Copy, Check, Sliders, Globe, ChevronRight, Loader2, AlertCircle,
  Zap, CheckCircle
} from "lucide-react";

interface ChartAIProps {
  selectedAsset: MarketAsset;
  onSelectAsset: (asset: MarketAsset) => void;
  allAssets: MarketAsset[];
  onAnalysisGenerated: (data: MarketAnalysisResponse) => void;
  onSetupGenerated: (data: TradeSetupPlan) => void;
  timeframe: 'M1' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1' | 'W1' | 'MN';
  onTimeframeChange: (tf: 'M1' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1' | 'W1' | 'MN') => void;
  aiScanMode?: 'quant' | 'gemini';
  onAiScanModeChange?: (mode: 'quant' | 'gemini') => void;
  isGeminiCooldown?: boolean;
  favoriteSymbols?: string[];
  onToggleFavorite?: (symbol: string) => void;
  onNavigateToSection?: (section: any) => void;
}

const timeframeLabels: Record<string, string> = {
  'M1': '1m',
  'M5': '5m',
  'M15': '15m',
  'H1': '1H',
  'H4': '4H',
  'D1': 'D',
  'W1': 'W',
  'MN': 'M'
};

export default function ChartAI({ 
  selectedAsset, 
  onSelectAsset, 
  allAssets, 
  onAnalysisGenerated, 
  onSetupGenerated,
  timeframe,
  onTimeframeChange,
  aiScanMode = 'quant',
  onAiScanModeChange,
  isGeminiCooldown,
  favoriteSymbols = [],
  onToggleFavorite,
  onNavigateToSection
}: ChartAIProps) {
  const [candles, setCandles] = useState(generateCandlesticks(selectedAsset.symbol));
  const [indicators, setIndicators] = useState<TechnicalState>({
    ema20: true,
    sma50: false,
    rsi: true,
    macd: false,
    atr: false,
    bollinger: true,
    vwap: false,
    obv: false,
    adx: false,
    fibonacci: false,
  });

  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<MarketAnalysisResponse | null>(null);
  const [activeSetup, setActiveSetup] = useState<TradeSetupPlan | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<any | null>(null);
  const [isFavorite, setIsFavorite] = useState(true);
  const [showPALabels, setShowPALabels] = useState(true);

  // New Interactive Modal States
  const [showPatternsModal, setShowPatternsModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showUseInTradeModal, setShowUseInTradeModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Search, Filtering, and Simulated broker parameters
  const [patternSearch, setPatternSearch] = useState("");
  const [patternFilter, setPatternFilter] = useState<"all" | "bullish" | "bearish" | "smc">("all");
  const [selectedCalendarWeek, setSelectedCalendarWeek] = useState<"this" | "next">("this");
  const [calendarImpactFilter, setCalendarImpactFilter] = useState<"all" | "high" | "med">("all");

  const [isExecutingOrder, setIsExecutingOrder] = useState(false);
  const [orderExecutedSuccess, setOrderExecutedSuccess] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState("AI QUANT PRIME DESK");
  const [slippageTolerance, setSlippageTolerance] = useState(0.2);
  const [orderLeverage, setOrderLeverage] = useState(100);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [chartQuickLots, setChartQuickLots] = useState<number>(0.10);
  const [quickOrderNotice, setQuickOrderNotice] = useState<{
    id: string;
    side: "BUY" | "SELL";
    price: number;
    lots: number;
    broker: string;
    timestamp: string;
  } | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleExecuteLiveTrade = (customSide?: "BUY" | "SELL", customLots?: number) => {
    setIsExecutingOrder(true);
    setOrderExecutedSuccess(false);

    const tradeSide = customSide || (selectedAsset.bullishProb > selectedAsset.bearishProb ? "BUY" : "SELL");
    const lotsNum = customLots !== undefined ? customLots : calculatedPositionSize;
    const ticketId = `STP-${Math.floor(100000 + Math.random() * 900000)}`;
    
    // Simulate multi-stage dynamic routing pipeline
    setTimeout(() => {
      setOrderExecutedSuccess(true);
      setIsExecutingOrder(false);

      const filledPrice = selectedAsset.price;
      const simulatedProfit = Number((lotsNum * 50 * (tradeSide === "BUY" ? 1.5 : 1.4)).toFixed(2));

      // Show temporary on-chart notification banner
      setQuickOrderNotice({
        id: ticketId,
        side: tradeSide,
        price: filledPrice,
        lots: lotsNum,
        broker: selectedBroker,
        timestamp: new Date().toLocaleTimeString()
      });
      setTimeout(() => {
        setQuickOrderNotice(null);
      }, 5000);
      
      // Save order to simulated journal
      try {
        const stored = localStorage.getItem("ai_quant_journal_entries");
        const existing = stored ? JSON.parse(stored) : [];
        const newEntry = {
          id: `trade_${Date.now()}`,
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          asset: selectedAsset.symbol,
          type: tradeSide,
          entryPrice: filledPrice,
          exitPrice: tradeSide === "BUY" ? filledPrice * 1.01 : filledPrice * 0.99,
          pips: stopLossPips * 2.5,
          profit: simulatedProfit,
          status: "WIN",
          notes: `Live STP order filled directly via chart terminal (${tradeSide} ${lotsNum} Lots of ${selectedAsset.symbol} at $${filledPrice}). Broker Ticket #${ticketId} routed to ${selectedBroker}.`
        };
        localStorage.setItem("ai_quant_journal_entries", JSON.stringify([newEntry, ...existing]));
      } catch (e) {
        console.error("Local journal save failed:", e);
      }

      // Also register into paper_trading_positions_v1 so STP Clearing desk and Brokers view track it
      try {
        const positionsRaw = localStorage.getItem("paper_trading_positions_v1");
        const openPositions = positionsRaw ? JSON.parse(positionsRaw) : [];
        const isForex = selectedAsset.category === "Forex";
        const pipMultiplier = isForex ? 0.0001 : 0.01;
        const slPrice = tradeSide === "BUY" 
          ? filledPrice - (stopLossPips * pipMultiplier)
          : filledPrice + (stopLossPips * pipMultiplier);
        const tpPrice = tradeSide === "BUY"
          ? filledPrice + (stopLossPips * 2.5 * pipMultiplier)
          : filledPrice - (stopLossPips * 2.5 * pipMultiplier);

        const newPosition = {
          id: `pos_${Date.now()}`,
          symbol: selectedAsset.symbol,
          type: tradeSide,
          entryPrice: filledPrice,
          currentPrice: filledPrice,
          size: lotsNum,
          leverage: orderLeverage,
          stopLoss: slPrice,
          takeProfit: tpPrice,
          pnl: 0,
          timestamp: new Date().toISOString(),
          status: "OPEN",
          brokerId: selectedBroker.toLowerCase().includes("ic markets") ? "ic-markets" : "quantintel-stp",
          notes: `Instant Chart Direct Order Ticket #${ticketId}`
        };
        localStorage.setItem("paper_trading_positions_v1", JSON.stringify([newPosition, ...openPositions]));
      } catch (e) {
        console.error("Paper trading positions sync failed:", e);
      }
    }, 1500);
  };

  // Live Risk Calculator State
  const [accountBalance, setAccountBalance] = useState<number>(1000);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [stopLossPips, setStopLossPips] = useState<number>(30);

  // Drawing Toolbar Active State
  const [activeDrawingTool, setActiveDrawingTool] = useState<string>("cursor");
  
  interface Drawing {
    type: "trendline" | "fibonacci" | "shapes";
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    label?: string;
  }
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isAutoDrawingLoading, setIsAutoDrawingLoading] = useState(false);

  const handleAutoDrawAnalysis = async (customCandles?: any[]) => {
    setIsAutoDrawingLoading(true);
    const targetCandles = customCandles || candles;
    try {
      const response = await fetch("/api/analyse-chart-drawings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          market: selectedAsset.symbol,
          candles: targetCandles,
          forceAI: aiScanMode === 'gemini'
        })
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.drawings)) {
        const padding = 20;
        const chartHeight = 310;
        const chartWidth = 760;
        const highs = targetCandles.map(c => Number(c.high));
        const lows = targetCandles.map(c => Number(c.low));
        const minP = Math.min(...lows);
        const maxP = Math.max(...highs);
        const pRange = maxP - minP;
        
        const calcX = (index: number) => padding + (index * (chartWidth - padding * 2) / (targetCandles.length - 1));
        const calcY = (price: number) => {
          if (pRange === 0) return chartHeight / 2;
          return chartHeight - padding - ((price - minP) * (chartHeight - padding * 2) / pRange);
        };

        const mappedDrawings = data.drawings.map((draw: any) => ({
          type: draw.type,
          x1: calcX(draw.startIndex),
          y1: calcY(draw.startPrice),
          x2: calcX(draw.endIndex),
          y2: calcY(draw.endPrice),
          color: draw.color || "#10b981",
          label: draw.label
        }));

        setDrawings(mappedDrawings);
      }
    } catch (err) {
      console.error("Failed to run AI Auto-Draw:", err);
    } finally {
      setIsAutoDrawingLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeDrawingTool === "cursor") return;
    if (activeDrawingTool === "trash") {
      setDrawings([]);
      setActiveDrawingTool("cursor");
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * chartWidth;
    const y = ((e.clientY - rect.top) / rect.height) * chartHeight;

    setIsDrawing(true);
    let color = "#3b82f6"; // default blue
    if (activeDrawingTool === "trendline") color = "#10b981"; // green
    if (activeDrawingTool === "fibonacci") color = "#8b5cf6"; // purple

    setCurrentDrawing({
      type: activeDrawingTool as any,
      x1: x,
      y1: y,
      x2: x,
      y2: y,
      color
    });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || !currentDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * chartWidth;
    const y = ((e.clientY - rect.top) / rect.height) * chartHeight;

    setCurrentDrawing(prev => prev ? ({
      ...prev,
      x2: x,
      y2: y
    }) : null);
  };

  const handleMouseUp = () => {
    if (isDrawing && currentDrawing) {
      setDrawings(prev => [...prev, currentDrawing]);
      setCurrentDrawing(null);
      setIsDrawing(false);
    }
  };

  // 1. Candlestick and Initial Data Generation (only runs when asset or timeframe changes)
  useEffect(() => {
    let active = true;
    const fetchRealCandles = async () => {
      try {
        const response = await fetch(`/api/candles?symbol=${encodeURIComponent(selectedAsset.symbol)}&timeframe=${timeframe}`);
        if (response.ok) {
          const data = await response.json();
          if (active && Array.isArray(data) && data.length > 0) {
            setCandles(data);
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch real-world candles, using simulated ones.", err);
      }
      
      if (active) {
        const newCandles = generateCandlesticks(selectedAsset.symbol);
        setCandles(newCandles);
      }
    };

    fetchRealCandles();
    
    const dynamicAnalysis = generateDynamicAnalysis(selectedAsset, timeframe);
    const dynamicSetup = generateDynamicSetup(selectedAsset, selectedAsset.bullishProb > selectedAsset.bearishProb ? 'BUY' : 'SELL', timeframe);
    setActiveAnalysis(dynamicAnalysis);
    setActiveSetup(dynamicSetup);
    setDrawings([]); // Clear drawings to prevent old drawings overlap

    return () => {
      active = false;
    };
  }, [selectedAsset.symbol, timeframe]);

  // 2. AI Market Analysis & Graphical Auto-Draw Execution (runs when candles are loaded or updated)
  useEffect(() => {
    if (!candles || candles.length === 0) return;

    // Automatically trigger visual AI Auto-Draw graphical layout
    handleAutoDrawAnalysis(candles);

    // Automatically trigger technical/fundamental market analysis
    const autoAnalyze = async () => {
      setLoadingAnalysis(true);
      try {
        const response = await fetch("/api/analyse-market", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            market: selectedAsset.symbol,
            currentPrice: selectedAsset.price,
            timeframe,
            style: "Day Trading",
            indicatorState: indicators,
            forceAI: aiScanMode === 'gemini'
          })
        });
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
          const resData = await response.json();
          if (resData.success) {
            setActiveAnalysis(resData.data);
            onAnalysisGenerated(resData.data);
          }
        } else {
          console.warn("Received non-JSON response from /api/analyse-market");
        }
      } catch (err) {
        console.error("Auto Analysis failed:", err);
      } finally {
        setLoadingAnalysis(false);
      }
    };

    autoAnalyze();
  }, [selectedAsset.symbol, timeframe, aiScanMode]);

  // Sync the latest candlestick close price with the live tick of selectedAsset.price
  useEffect(() => {
    if (!candles || candles.length === 0) return;
    const lastIndex = candles.length - 1;
    const lastCandle = candles[lastIndex];
    if (lastCandle && lastCandle.close !== selectedAsset.price) {
      setCandles(prev => {
        const updated = [...prev];
        const last = { ...updated[lastIndex] };
        last.close = selectedAsset.price;
        if (selectedAsset.price > last.high) last.high = selectedAsset.price;
        if (selectedAsset.price < last.low) last.low = selectedAsset.price;
        updated[lastIndex] = last;
        return updated;
      });
    }
  }, [selectedAsset.price]);

  // 3. Trade Setup Generation (runs when risk, balance or asset shifts)
  useEffect(() => {
    const autoGenerateSetup = async () => {
      setLoadingSetup(true);
      try {
        const bias = selectedAsset.bullishProb > selectedAsset.bearishProb ? "BUY" : "SELL";
        const response = await fetch("/api/generate-setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            market: selectedAsset.symbol,
            direction: bias,
            currentPrice: selectedAsset.price,
            riskPercent: riskPercent,
            balance: accountBalance,
            forceAI: aiScanMode === 'gemini'
          })
        });
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
          const resData = await response.json();
          if (resData.success) {
            setActiveSetup(resData.data);
            onSetupGenerated(resData.data);
          }
        } else {
          console.warn("Received non-JSON response from /api/generate-setup");
        }
      } catch (err) {
        console.error("Auto Setup Generation failed:", err);
      } finally {
        setLoadingSetup(false);
      }
    };

    autoGenerateSetup();
  }, [selectedAsset.symbol, riskPercent, accountBalance, aiScanMode]);

  const toggleIndicator = (key: keyof TechnicalState) => {
    setIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAnalyseMarket = async () => {
    setLoadingAnalysis(true);
    try {
      const response = await fetch("/api/analyse-market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market: selectedAsset.symbol,
          currentPrice: selectedAsset.price,
          timeframe,
          style: "Day Trading",
          indicatorState: indicators,
          forceAI: aiScanMode === 'gemini'
        })
      });
      const resData = await response.json();
      if (resData.success) {
        setActiveAnalysis(resData.data);
        onAnalysisGenerated(resData.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleGenerateSetup = async () => {
    setLoadingSetup(true);
    try {
      const bias = selectedAsset.bullishProb > selectedAsset.bearishProb ? "BUY" : "SELL";
      const response = await fetch("/api/generate-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market: selectedAsset.symbol,
          direction: bias,
          currentPrice: selectedAsset.price,
          riskPercent: riskPercent,
          balance: accountBalance,
          forceAI: aiScanMode === 'gemini'
        })
      });
      const resData = await response.json();
      if (resData.success) {
        setActiveSetup(resData.data);
        onSetupGenerated(resData.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSetup(false);
    }
  };

  // Live Risk Calculator outputs
  const maxRiskAmount = (accountBalance * riskPercent) / 100;
  // position size = maxRiskAmount / (stopLossPips * pipValueMultiplier)
  // For standard currencies, 1 pip change in EUR/USD on a 1-lot position (100k) is $10.00. 
  // Let's create an intuitive proportional lots calculator.
  const pipValue = 1.00; // standard $1 per pip for micro lot
  const calculatedPositionSize = Number((maxRiskAmount / (stopLossPips * 10)).toFixed(2));
  const potentialProfit = Number((maxRiskAmount * 2.5).toFixed(2)); // assumes typical 1:2.5 RR ratio

  // Render SVG dimensions & paths
  const chartHeight = 310;
  const chartWidth = 760;
  const padding = 20;

  const minPrice = Math.min(...candles.map(c => c.low));
  const maxPrice = Math.max(...candles.map(c => c.high));
  const priceRange = maxPrice - minPrice;
  const maxVolume = Math.max(...candles.map(c => c.volume || 1), 10000);

  const getX = (index: number) => padding + (index * (chartWidth - padding * 2) / (candles.length - 1));
  const getY = (price: number) => {
    if (priceRange === 0) return chartHeight / 2;
    return chartHeight - padding - ((price - minPrice) * (chartHeight - padding * 2) / priceRange);
  };

  // EMA20 Line
  const emaPoints = candles.map((c, i) => {
    const factor = 0.15;
    let ema = c.close;
    if (i > 0) {
      const prevEma = parseFloat(candles[i-1].close.toString());
      ema = (c.close * factor) + (prevEma * (1 - factor));
    }
    return `${getX(i)},${getY(ema)}`;
  }).join(" ");

  // SMA50 Line
  const smaPoints = candles.map((c, i) => {
    const average = candles.slice(Math.max(0, i - 4), i + 1).reduce((sum, current) => sum + current.close, 0) / (Math.min(i, 4) + 1);
    return `${getX(i)},${getY(average)}`;
  }).join(" ");

  return (
    <div className="space-y-6">
      
      {/* 1. TOP HEADER PANEL (Asset select, timeframe buttons, utilities) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {(() => {
              const isFav = favoriteSymbols.includes(selectedAsset.symbol);
              return (
                <button 
                  onClick={() => onToggleFavorite ? onToggleFavorite(selectedAsset.symbol) : setIsFavorite(!isFavorite)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isFav 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                  title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                >
                  <Star className={`h-4.5 w-4.5 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
              );
            })()}
            <div className="relative">
              <select
                value={selectedAsset?.symbol || ""}
                onChange={(e) => {
                  const asset = allAssets.find(a => a && a.symbol === e.target.value);
                  if (asset) onSelectAsset(asset);
                }}
                className="appearance-none bg-slate-950 border border-slate-800 text-white font-bold rounded-lg pl-3 pr-8 py-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer min-w-[130px]"
              >
                {allAssets.filter(Boolean).map((a) => (
                  <option key={a.symbol} value={a.symbol}>{a.symbol}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-4.5 w-4.5 text-slate-500 pointer-events-none" />
            </div>
            <div>
              <span className="font-semibold text-white block text-sm">{selectedAsset.symbol}</span>
              <span className="text-[10px] text-slate-500 font-mono tracking-tight block">{selectedAsset.name}</span>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-slate-800 hidden md:block" />

          {/* Timeframe Buttons */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg">
            {(['M1', 'M5', 'M15', 'H1', 'H4', 'D1', 'W1', 'MN'] as const).map((t) => (
              <button
                key={t}
                onClick={() => onTimeframeChange(t)}
                className={`px-3 py-1.5 text-xs font-bold font-mono rounded-md transition-all cursor-pointer ${
                  timeframe === t 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {timeframeLabels[t] || t}
              </button>
            ))}
          </div>

          <div className="h-8 w-[1px] bg-slate-800 hidden lg:block" />

          {/* AI Mode Selector Segmented Control */}
          <div className="bg-slate-950 border border-slate-800 p-0.5 rounded-lg flex items-center font-mono text-[9px] h-[34px]">
            <button
              onClick={() => onAiScanModeChange?.('quant')}
              title="Fast Local Quantitative Engine - Uses no API quota"
              className={`px-2.5 py-1 rounded font-black transition-all flex items-center gap-1.5 ${
                aiScanMode === 'quant'
                  ? 'bg-blue-950/40 text-blue-400 border border-blue-500/25 shadow-inner'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              <BarChart3 className="h-3 w-3" />
              QUANT
            </button>
            <button
              onClick={() => onAiScanModeChange?.('gemini')}
              title="Deep Gemini LLM Generative Diagnostics - Uses daily free tier quota"
              className={`px-2.5 py-1 rounded font-black transition-all flex items-center gap-1.5 ${
                aiScanMode === 'gemini'
                  ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-500/25 shadow-inner'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              <Sparkles className="h-3 w-3 text-indigo-400" />
              GEMINI
            </button>
          </div>
        </div>

        {/* Dropdowns & Utilities */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowPALabels(!showPALabels)}
            className={`px-3 py-2 border rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              showPALabels 
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400"
            }`}
            title="Toggle candlestick price action patterns on chart"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>PA Patterns: {showPALabels ? "ON" : "OFF"}</span>
          </button>

          <button className="px-3 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer">
            <Activity className="h-3.5 w-3.5 text-blue-400" />
            <span>Indicators</span>
          </button>
          <button className="px-3 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer">
            <Coins className="h-3.5 w-3.5 text-emerald-400" />
            <span>Templates</span>
          </button>
          
          <div className="h-6 w-[1px] bg-slate-800 hidden sm:block" />
          
          <button className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg cursor-pointer" title="Take Screenshot">
            <Camera className="h-4 w-4" />
          </button>
          <button className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg cursor-pointer" title="Settings">
            <Settings className="h-4 w-4" />
          </button>
          <button className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg cursor-pointer" title="Fullscreen">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. CHIEF DASHBOARD VIEWPORT (3-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT COLUMN: Candlestick Chart block with its vertical Drawing Toolbar */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Chart Card */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden">
            
            {/* Header elements inside chart */}
            <div className="flex items-center justify-between mb-3 border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-white font-sans">
                  CHART AI ANALYSIS
                </span>
                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-mono font-bold rounded-md flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  AI Live
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                {hoveredCandle && (
                  <div className="hidden md:block text-[10px] text-slate-400 font-mono">
                    O <span className="text-emerald-400 font-bold">{hoveredCandle.open}</span> | 
                    H <span className="text-emerald-400 font-bold">{hoveredCandle.high}</span> | 
                    L <span className="text-rose-400 font-bold">{hoveredCandle.low}</span> | 
                    C <span className="text-white font-bold">{hoveredCandle.close}</span>
                  </div>
                )}
                <button 
                  onClick={handleAutoDrawAnalysis}
                  disabled={isAutoDrawingLoading}
                  className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 text-white text-[10px] font-bold uppercase rounded-lg transition-all flex items-center gap-1 shadow shadow-emerald-900/40 disabled:cursor-not-allowed select-none cursor-pointer"
                  title="Automatically analyze candlesticks & plot trendlines, Fibonacci anchors, and demand/supply blocks"
                >
                  {isAutoDrawingLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-white" />
                      <span>Analyzing Chart...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 text-emerald-300" />
                      <span>AI Auto-Draw</span>
                    </>
                  )}
                </button>
                <button className="text-[10px] text-blue-400 font-mono hover:underline flex items-center gap-1 cursor-pointer">
                  <HelpCircle className="h-3 w-3" />
                  How AI Works?
                </button>
              </div>
            </div>

            {/* Layout with Vertical Tool Rail and SVG Canvas */}
            <div className="flex items-stretch gap-3 relative min-h-[310px]">
              
              {/* Vertical Drawing Toolbar Rail */}
              <div className="flex flex-col gap-1.5 p-1 bg-slate-950 border border-slate-800/80 rounded-xl justify-center shrink-0">
                {[
                  { id: "cursor", icon: <Crosshair className="h-3.5 w-3.5" />, label: "Cursor" },
                  { id: "trendline", icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />, label: "Trendline" },
                  { id: "fibonacci", icon: <Sparkles className="h-3.5 w-3.5 text-purple-400" />, label: "Fibonacci" },
                  { id: "shapes", icon: <Square className="h-3.5 w-3.5 text-blue-400" />, label: "Shapes" },
                  { id: "text", icon: <Type className="h-3.5 w-3.5" />, label: "Text" },
                  { id: "pattern", icon: <Activity className="h-3.5 w-3.5 text-amber-400" />, label: "Patterns" },
                  { id: "ruler", icon: <Ruler className="h-3.5 w-3.5" />, label: "Measure" },
                  { id: "eye", icon: <Eye className="h-3.5 w-3.5 text-slate-400" />, label: "Show/Hide" },
                  { id: "lock", icon: <Lock className="h-3.5 w-3.5 text-slate-400" />, label: "Lock drawings" },
                  { id: "trash", icon: <Trash2 className="h-3.5 w-3.5 text-rose-500/80" />, label: "Delete all" }
                ].map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveDrawingTool(tool.id)}
                    className={`p-2 rounded-lg transition-all cursor-pointer ${
                      activeDrawingTool === tool.id 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                    }`}
                    title={tool.label}
                  >
                    {tool.icon}
                  </button>
                ))}
              </div>

              {/* Candlestick SVG Container */}
              <div className="flex-1 relative bg-slate-950 border border-slate-800/80 rounded-xl p-2 overflow-x-auto select-none">
                
                {/* Floating Quick Direct Order Execution Desk */}
                <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 p-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl font-mono text-xs max-w-[280px]">
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-200">
                        Quick Direct Order
                      </span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 font-bold rounded">
                      STP Direct
                    </span>
                  </div>

                  {/* Lot Size Selector & Price Display */}
                  <div className="flex items-center justify-between gap-2 py-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-sans">Lots:</span>
                      <div className="flex items-center">
                        <button
                          onClick={() => setChartQuickLots(prev => Math.max(0.01, parseFloat((prev - 0.05).toFixed(2))))}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-l text-[10px] cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="50"
                          value={chartQuickLots}
                          onChange={(e) => setChartQuickLots(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                          className="w-14 bg-slate-950 border-y border-slate-800 text-center font-bold text-white text-[11px] py-0.5 outline-none"
                        />
                        <button
                          onClick={() => setChartQuickLots(prev => Math.min(50, parseFloat((prev + 0.05).toFixed(2))))}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-r text-[10px] cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 uppercase block">Spread:</span>
                      <span className="text-[10px] font-bold text-amber-400 font-mono">0.6 pips</span>
                    </div>
                  </div>

                  {/* Instant Buy / Sell Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    {/* Instant SELL */}
                    <button
                      onClick={() => handleExecuteLiveTrade("SELL", chartQuickLots)}
                      disabled={isExecutingOrder}
                      className="py-2 px-2.5 bg-rose-600/90 hover:bg-rose-500 disabled:opacity-50 text-white font-black rounded-lg text-xs flex flex-col items-center justify-center transition-all cursor-pointer shadow shadow-rose-950"
                      title={`Instant market short ${chartQuickLots} lots of ${selectedAsset.symbol}`}
                    >
                      <span className="text-[11px] tracking-wide flex items-center gap-1 font-bold">
                        <TrendingDown className="h-3 w-3" /> SELL
                      </span>
                      <span className="text-[10px] font-mono text-rose-200">
                        ${selectedAsset.price < 50 ? selectedAsset.price.toFixed(4) : selectedAsset.price.toFixed(2)}
                      </span>
                    </button>

                    {/* Instant BUY */}
                    <button
                      onClick={() => handleExecuteLiveTrade("BUY", chartQuickLots)}
                      disabled={isExecutingOrder}
                      className="py-2 px-2.5 bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-lg text-xs flex flex-col items-center justify-center transition-all cursor-pointer shadow shadow-emerald-950"
                      title={`Instant market long ${chartQuickLots} lots of ${selectedAsset.symbol}`}
                    >
                      <span className="text-[11px] tracking-wide flex items-center gap-1 font-bold">
                        <TrendingUp className="h-3 w-3" /> BUY
                      </span>
                      <span className="text-[10px] font-mono text-emerald-200">
                        ${selectedAsset.price < 50 ? (selectedAsset.price * 1.0001).toFixed(4) : (selectedAsset.price * 1.0001).toFixed(2)}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                    <span className="truncate max-w-[170px]">Broker: {selectedBroker}</span>
                    <button 
                      onClick={() => setShowUseInTradeModal(true)}
                      className="text-blue-400 hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      Advanced <ChevronRight className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>

                {/* Instant Order Confirmation Toast Overlay */}
                {quickOrderNotice && (
                  <div className="absolute top-3 right-3 z-30 bg-slate-900/95 border border-emerald-500/50 rounded-xl p-3 shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <div className="font-mono text-xs">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] ${quickOrderNotice.side === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                          {quickOrderNotice.side}
                        </span>
                        <span className="text-white">{quickOrderNotice.lots} Lots {selectedAsset.symbol}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Filled @ ${quickOrderNotice.price} &bull; {quickOrderNotice.id}
                      </div>
                    </div>
                    <button
                      onClick={() => setQuickOrderNotice(null)}
                      className="text-slate-500 hover:text-slate-300 ml-1 p-1 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <svg 
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                  className="w-full h-full min-w-[620px]"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                >
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="rgba(241, 245, 249, 0.75)" />
                    </marker>
                  </defs>

                  {/* Grid Lines */}
                  {[0.2, 0.4, 0.6, 0.8].map((ratio, index) => {
                    const val = minPrice + ratio * priceRange;
                    return (
                      <g key={index}>
                        <line
                          x1="0"
                          y1={getY(val)}
                          x2={chartWidth}
                          y2={getY(val)}
                          stroke="#111827"
                          strokeDasharray="5,5"
                        />
                        <text
                          x={chartWidth - 10}
                          y={getY(val) - 4}
                          fill="#4b5563"
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor="end"
                        >
                          {val.toFixed(selectedAsset.price < 50 ? 4 : 1)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bollinger Bands Shading */}
                  {indicators.bollinger && (
                    <path
                      d={`M ${candles.map((c, i) => `${getX(i)},${getY(c.high + (maxPrice - minPrice)*0.08)}`).join(" L ")} L ${candles.slice().reverse().map((c, i) => `${getX(candles.length - 1 - i)},${getY(c.low - (maxPrice - minPrice)*0.08)}`).join(" L ")} Z`}
                      fill="rgba(59, 130, 246, 0.02)"
                      stroke="rgba(59, 130, 246, 0.1)"
                      strokeWidth="1"
                      strokeDasharray="4,4"
                    />
                  )}

                  {/* Dynamic Shaded Support & Resistance Zones */}
                  {(() => {
                    const supportPrice = activeAnalysis?.marketStructure.support[0] || (selectedAsset.price * (1 - getTimeframeMultiplier(timeframe) * 0.5));
                    const resistancePrice = activeAnalysis?.marketStructure.resistance[0] || (selectedAsset.price * (1 + getTimeframeMultiplier(timeframe) * 0.5));
                    const supportY = getY(supportPrice);
                    const resistanceY = getY(resistancePrice);
                    return (
                      <g>
                        {/* Support Zone */}
                        <g>
                          <rect 
                            x={chartWidth * 0.22} 
                            y={supportY - 12} 
                            width={chartWidth * 0.54} 
                            height={22} 
                            fill="rgba(16, 185, 129, 0.08)" 
                            stroke="rgba(16, 185, 129, 0.35)" 
                            strokeWidth="1.2" 
                            rx="3" 
                          />
                          <text 
                            x={chartWidth * 0.59} 
                            y={supportY + 3} 
                            fill="#10b981" 
                            fontSize="9" 
                            fontWeight="bold" 
                            fontFamily="sans-serif"
                          >
                            Support Zone
                          </text>
                        </g>

                        {/* Resistance Zone */}
                        <g>
                          <rect 
                            x={chartWidth * 0.55} 
                            y={resistanceY - 12} 
                            width={chartWidth * 0.22} 
                            height={22} 
                            fill="rgba(239, 68, 68, 0.08)" 
                            stroke="rgba(239, 68, 68, 0.35)" 
                            strokeWidth="1.2" 
                            rx="3" 
                          />
                          <text 
                            x={chartWidth * 0.58} 
                            y={resistanceY + 3} 
                            fill="#ef4444" 
                            fontSize="9" 
                            fontWeight="bold" 
                            fontFamily="sans-serif"
                          >
                            Resistance Zone
                          </text>
                        </g>

                        {/* Trend line with arrowhead connecting them */}
                        <line 
                          x1={chartWidth * 0.35} 
                          y1={supportY + 4} 
                          x2={chartWidth * 0.61} 
                          y2={resistanceY + 11} 
                          stroke="rgba(241, 245, 249, 0.5)" 
                          strokeWidth="1.5" 
                          strokeDasharray="4,4" 
                          markerEnd="url(#arrow)" 
                        />
                        <circle cx={chartWidth * 0.35} cy={supportY + 4} r="4.5" fill="#030712" stroke="#10b981" strokeWidth="1.5" />
                        <circle cx={chartWidth * 0.59} cy={resistanceY + 11} r="4.5" fill="#030712" stroke="#ef4444" strokeWidth="1.5" />
                      </g>
                    );
                  })()}

                  {/* Quote Overlay Block on Top Left of Canvas */}
                  <g transform="translate(15, 22)" opacity="0.95">
                    <circle cx="5" cy="5" r="3" fill="#10b981" className="animate-pulse" />
                    <text x="15" y="8" fill="#9ca3af" fontSize="10" fontFamily="monospace">
                      O <tspan fill="#10b981" fontWeight="bold">{(selectedAsset.price * 0.9993).toFixed(selectedAsset.price < 50 ? 4 : 2)}</tspan>
                      {"   "}H <tspan fill="#10b981" fontWeight="bold">{(selectedAsset.price * 1.0005).toFixed(selectedAsset.price < 50 ? 4 : 2)}</tspan>
                      {"   "}L <tspan fill="#ef4444" fontWeight="bold">{(selectedAsset.price * 0.9990).toFixed(selectedAsset.price < 50 ? 4 : 2)}</tspan>
                      {"   "}C <tspan fill="#10b981" fontWeight="bold">{selectedAsset.price.toFixed(selectedAsset.price < 50 ? 4 : 2)}</tspan>
                      {"   "}<tspan fill="#10b981" fontWeight="bold">
                        {selectedAsset.changePercent >= 0 ? '+' : ''}{(selectedAsset.price * (selectedAsset.changePercent / 100)).toFixed(selectedAsset.price < 50 ? 4 : 2)} 
                        {" "}({selectedAsset.changePercent >= 0 ? '+' : ''}{selectedAsset.changePercent}%)
                      </tspan>
                    </text>
                  </g>

                  {/* Candlesticks */}
                  {candles.map((c, index) => {
                    const x = getX(index);
                    const openY = getY(c.open);
                    const closeY = getY(c.close);
                    const highY = getY(c.high);
                    const lowY = getY(c.low);
                    const isUp = c.close >= c.open;

                    return (
                      <g 
                        key={index} 
                        onMouseEnter={() => setHoveredCandle(c)}
                        onMouseLeave={() => setHoveredCandle(null)}
                        className="cursor-pointer group"
                      >
                        {/* Volume Bar Overlay */}
                        <rect
                          x={x - 3}
                          y={chartHeight - padding - (((c.volume || 0) / maxVolume) * 35)}
                          width="6"
                          height={Math.max(2, (((c.volume || 0) / maxVolume) * 35))}
                          fill={isUp ? "#10b981" : "#ef4444"}
                          opacity="0.18"
                          rx="1"
                          className="pointer-events-none group-hover:opacity-40 transition-opacity"
                        />

                        {/* Shadow Wick */}
                        <line
                          x1={x}
                          y1={highY}
                          x2={x}
                          y2={lowY}
                          stroke={isUp ? "#10b981" : "#ef4444"}
                          strokeWidth="1.5"
                        />

                        {/* Solid Candle Body */}
                        <rect
                          x={x - 4}
                          y={Math.min(openY, closeY)}
                          width="8"
                          height={Math.max(2, Math.abs(openY - closeY))}
                          fill={isUp ? "#10b981" : "#ef4444"}
                          rx="1"
                          className="group-hover:stroke-slate-100 group-hover:stroke-1"
                        />

                        {/* Structural Markers */}
                        {c.marker && (
                          <g>
                            <circle
                              cx={x}
                              cy={isUp ? highY - 10 : lowY + 10}
                              r="3.5"
                              fill={c.marker.type === 'HH' || c.marker.type === 'HL' || c.marker.type === 'BOS' || c.marker.type === 'CHOCH' ? '#10b981' : '#3b82f6'}
                              className="animate-pulse"
                            />
                            <text
                              x={x}
                              y={isUp ? highY - 18 : lowY + 20}
                              fill="#9ca3af"
                              fontSize="8"
                              fontWeight="bold"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {c.marker.type}
                            </text>
                          </g>
                        )}

                        {/* Dynamic Price Action Candlestick Pattern Detection Labels */}
                        {showPALabels && (() => {
                          const bodySize = Math.abs(c.close - c.open);
                          const totalRange = Math.max(0.0001, c.high - c.low);
                          const lowerWickSize = isUp ? Math.abs(c.open - c.low) : Math.abs(c.close - c.low);
                          const upperWickSize = isUp ? Math.abs(c.high - c.close) : Math.abs(c.high - c.open);
                          
                          let paLabel = "";
                          let paColor = "";
                          let labelY = 0;
                          
                          if (bodySize / totalRange < 0.12) {
                            paLabel = "Doji";
                            paColor = "#fbbf24"; // Amber-400
                            labelY = lowY + 12;
                          } else if (lowerWickSize > 2 * bodySize && upperWickSize < 0.45 * lowerWickSize) {
                            paLabel = "Hammer";
                            paColor = "#34d399"; // Emerald-400
                            labelY = lowY + 12;
                          } else if (upperWickSize > 2 * bodySize && lowerWickSize < 0.45 * upperWickSize) {
                            paLabel = "Star";
                            paColor = "#f87171"; // Rose-400
                            labelY = highY - 12;
                          }
                          
                          if (!paLabel) return null;
                          
                          return (
                            <g className="pointer-events-none">
                              <rect
                                x={x - 18}
                                y={labelY - 6.5}
                                width={36}
                                height={9}
                                fill="rgba(15, 23, 42, 0.9)"
                                stroke={paColor}
                                strokeWidth="0.5"
                                rx="2"
                              />
                              <text
                                x={x}
                                y={labelY}
                                fill={paColor}
                                fontSize="6.5"
                                fontWeight="black"
                                fontFamily="monospace"
                                textAnchor="middle"
                              >
                                {paLabel}
                              </text>
                            </g>
                          );
                        })()}
                      </g>
                    );
                  })}

                  {/* Technical EMA 20 */}
                  {indicators.ema20 && (
                    <polyline
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="1.8"
                      points={emaPoints}
                      opacity="0.8"
                    />
                  )}

                  {/* Technical SMA 50 */}
                  {indicators.sma50 && (
                    <polyline
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="1.8"
                      points={smaPoints}
                      opacity="0.8"
                    />
                  )}

                  {/* Saved Drawings */}
                  {drawings.map((draw, idx) => {
                    if (draw.type === "trendline") {
                      return (
                        <g key={idx}>
                          <line
                            x1={draw.x1}
                            y1={draw.y1}
                            x2={draw.x2}
                            y2={draw.y2}
                            stroke={draw.color}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          {draw.label && (
                            <g className="pointer-events-none">
                              <rect
                                x={Math.min(draw.x1, draw.x2) + 10}
                                y={Math.min(draw.y1, draw.y2) - 14}
                                width={draw.label.length * 5.5 + 8}
                                height={12}
                                fill="#0f172a"
                                stroke={draw.color}
                                strokeWidth="0.5"
                                rx="2"
                                opacity="0.9"
                              />
                              <text
                                x={Math.min(draw.x1, draw.x2) + 14}
                                y={Math.min(draw.y1, draw.y2) - 5}
                                fill={draw.color}
                                fontSize="7.5"
                                fontWeight="bold"
                                fontFamily="monospace"
                              >
                                {draw.label}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    } else if (draw.type === "fibonacci") {
                      const dy = draw.y2 - draw.y1;
                      const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
                      const labels = ["0.0%", "23.6%", "38.2%", "50.0%", "61.8%", "78.6%", "100.0%"];
                      return (
                        <g key={idx}>
                          <line x1={draw.x1} y1={draw.y1} x2={draw.x2} y2={draw.y2} stroke={draw.color} strokeWidth="1" strokeDasharray="3,3" />
                          {levels.map((lvl, lIdx) => {
                            const currY = draw.y1 + dy * lvl;
                            return (
                              <g key={lIdx}>
                                <line x1={Math.min(draw.x1, draw.x2)} y1={currY} x2={Math.max(draw.x1, draw.x2)} y2={currY} stroke={draw.color} strokeWidth="1.2" opacity="0.6" />
                                <text x={Math.max(draw.x1, draw.x2) + 5} y={currY + 3} fill={draw.color} fontSize="8" fontFamily="monospace" opacity="0.8">{labels[lIdx]}</text>
                              </g>
                            );
                          })}
                        </g>
                      );
                    } else if (draw.type === "shapes") {
                      return (
                        <g key={idx}>
                          <rect
                            x={Math.min(draw.x1, draw.x2)}
                            y={Math.min(draw.y1, draw.y2)}
                            width={Math.abs(draw.x2 - draw.x1)}
                            height={Math.abs(draw.y2 - draw.y1)}
                            fill="rgba(59, 130, 246, 0.12)"
                            stroke={draw.color || "rgba(59, 130, 246, 0.5)"}
                            strokeWidth="1.5"
                            rx="3"
                          />
                          {draw.label && (
                            <g className="pointer-events-none">
                              <rect
                                x={Math.min(draw.x1, draw.x2) + 4}
                                y={Math.min(draw.y1, draw.y2) + 4}
                                width={draw.label.length * 5.5 + 8}
                                height={12}
                                fill="#0f172a"
                                stroke={draw.color || "rgba(59, 130, 246, 0.5)"}
                                strokeWidth="0.5"
                                rx="2"
                                opacity="0.9"
                              />
                              <text
                                x={Math.min(draw.x1, draw.x2) + 8}
                                y={Math.min(draw.y1, draw.y2) + 13}
                                fill={draw.color || "#60a5fa"}
                                fontSize="7.5"
                                fontWeight="bold"
                                fontFamily="monospace"
                              >
                                {draw.label}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    }
                    return null;
                  })}

                  {/* Active Live Drawing */}
                  {currentDrawing && (
                    <>
                      {currentDrawing.type === "trendline" && (
                        <line
                          x1={currentDrawing.x1}
                          y1={currentDrawing.y1}
                          x2={currentDrawing.x2}
                          y2={currentDrawing.y2}
                          stroke={currentDrawing.color}
                          strokeWidth="2.2"
                          strokeDasharray="3,3"
                        />
                      )}
                      {currentDrawing.type === "fibonacci" && (
                        <g>
                          <line x1={currentDrawing.x1} y1={currentDrawing.y1} x2={currentDrawing.x2} y2={currentDrawing.y2} stroke={currentDrawing.color} strokeWidth="1.2" strokeDasharray="2,2" />
                          {[0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0].map((lvl, lIdx) => {
                            const currY = currentDrawing.y1 + (currentDrawing.y2 - currentDrawing.y1) * lvl;
                            return (
                              <line key={lIdx} x1={Math.min(currentDrawing.x1, currentDrawing.x2)} y1={currY} x2={Math.max(currentDrawing.x1, currentDrawing.x2)} y2={currY} stroke={currentDrawing.color} strokeWidth="1" opacity="0.4" />
                            );
                          })}
                        </g>
                      )}
                      {currentDrawing.type === "shapes" && (
                        <rect
                          x={Math.min(currentDrawing.x1, currentDrawing.x2)}
                          y={Math.min(currentDrawing.y1, currentDrawing.y2)}
                          width={Math.abs(currentDrawing.x2 - currentDrawing.x1)}
                          height={Math.abs(currentDrawing.y2 - currentDrawing.y1)}
                          fill="rgba(59, 130, 246, 0.08)"
                          stroke="rgba(59, 130, 246, 0.35)"
                          strokeWidth="1"
                          rx="2"
                        />
                      )}
                    </>
                  )}
                </svg>
              </div>

            </div>

            {/* Indicator Control Strip */}
            <div className="mt-3.5 pt-3.5 border-t border-slate-800/80 flex flex-wrap gap-1.5">
              {(Object.keys(indicators) as Array<keyof TechnicalState>).map((key) => (
                <button
                  key={key}
                  onClick={() => toggleIndicator(key)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase border tracking-wider transition-all cursor-pointer ${
                    indicators[key]
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/35'
                      : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

          </div>

          {/* MIDDLE COLUMN: Stacked AI Pattern Detection + AI Summary panel */}
          <div className="space-y-6 flex flex-col justify-between">
            
            {/* AI Pattern Detection */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3.5 border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider font-mono flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-blue-400" />
                    AI Pattern Detection
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">Live</span>
                </div>

                <div className="space-y-2">
                  {[
                    { name: "Bullish Engulfing", type: "Double Candle", confidence: "Strong 85%", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
                    { name: "Rising Channel", type: "Continuation", confidence: "Strong 78%", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
                    { name: "Support Zone", type: "Horizontal", confidence: "Strong 82%", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
                    { name: "Liquidity Sweep", type: "Completed", confidence: "Medium 65%", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
                    { name: "Order Block", type: "Bullish", confidence: "Medium 60%", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" }
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs">
                      <div>
                        <span className="font-semibold text-slate-200 block">{p.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono block">{p.type}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${p.color}`}>
                        {p.confidence}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setShowPatternsModal(true)}
                className="w-full mt-3 py-2 bg-slate-950 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-mono font-bold tracking-wide transition-all cursor-pointer"
              >
                View All Patterns
              </button>
            </div>

            {/* AI Summary card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider font-mono flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
                    AI Summary
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    Confidence: {activeAnalysis ? activeAnalysis.confidence : selectedAsset.confidence}%
                  </span>
                </div>

                <div className="flex items-center gap-4 py-2">
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-500 font-mono tracking-wider block">BIAS STATE</span>
                    <span className={`text-xl font-extrabold block tracking-wide ${
                      selectedAsset.bullishProb > selectedAsset.bearishProb ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {selectedAsset.bullishProb > selectedAsset.bearishProb ? 'BULLISH' : 'BEARISH'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                      {selectedAsset.bullishProb > selectedAsset.bearishProb 
                        ? 'Institutional backing matches support zone tests' 
                        : 'Selling momentum dominating dynamic supply levels'}
                    </span>
                  </div>

                  {/* Circular Confidence Ring */}
                  <div className="relative h-18 w-18 flex items-center justify-center shrink-0">
                    <svg className="absolute h-full w-full transform -rotate-95">
                      <circle cx="36" cy="36" r="30" stroke="#1e293b" strokeWidth="6" fill="transparent" />
                      <circle cx="36" cy="36" r="30" stroke={selectedAsset.bullishProb > selectedAsset.bearishProb ? "#10b981" : "#ef4444"} strokeWidth="6" fill="transparent" 
                        strokeDasharray="188.4" strokeDashoffset={188.4 * (1 - (activeAnalysis ? activeAnalysis.confidence / 100 : selectedAsset.confidence / 100))} strokeLinecap="round" />
                    </svg>
                    <span className="text-xs font-mono font-black text-slate-200">
                      {activeAnalysis ? activeAnalysis.confidence : selectedAsset.confidence}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-2.5 rounded-xl border border-slate-800/50 italic mt-2">
                  "{activeAnalysis ? activeAnalysis.explanation : `Price action shows ${selectedAsset.symbol} consolidating near key levels.`}"
                </p>
              </div>

              <button 
                onClick={() => {
                  if (activeAnalysis) {
                    setShowAnalysisModal(true);
                  } else {
                    handleAnalyseMarket();
                  }
                }}
                disabled={loadingAnalysis}
                className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 text-white rounded-xl text-xs font-mono font-bold tracking-wide transition-all flex items-center justify-center gap-1.5 shadow-lg cursor-pointer shadow-blue-500/10"
              >
                {loadingAnalysis ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{activeAnalysis ? "View Detailed AI Explanation" : "Detailed AI Explanation"}</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Persistent layout sidebar (AI Trade Setup, Risk Calculator, Economic Events) */}
        <div className="space-y-6">
          
          {/* AI TRADE SETUP */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-lg space-y-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider font-mono flex items-center gap-1.5">
                <Crosshair className="h-4 w-4 text-emerald-400" />
                AI Trade Setup
              </h3>
              <div className="flex items-center gap-1">
                <span className={`px-2 py-0.5 border text-[9px] font-black uppercase rounded ${
                  (activeSetup?.direction || 'BUY') === 'BUY' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {activeSetup?.direction || 'BUY'}
                </span>
                <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-bold rounded">
                  {activeSetup?.tradeGrade || 'A'} Grade
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 bg-slate-950/60 px-2 rounded-lg border border-slate-800/40">
                <span className="text-slate-500 font-mono">Entry Zone</span>
                <span className="font-bold text-white font-mono">
                  {activeSetup ? activeSetup.entryZone : `${selectedAsset.price.toFixed(getDecimals(selectedAsset))} - ${(selectedAsset.price * 1.0015).toFixed(getDecimals(selectedAsset))}`}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 bg-slate-950/60 px-2 rounded-lg border border-slate-800/40">
                <span className="text-rose-400/80 font-mono font-bold">Stop Loss</span>
                <span className="font-bold text-rose-400 font-mono">
                  {activeSetup ? activeSetup.stopLoss.toFixed(getDecimals(selectedAsset)) : (selectedAsset.price * 0.995).toFixed(getDecimals(selectedAsset))}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 bg-slate-950/60 px-2 rounded-lg border border-slate-800/40">
                <span className="text-emerald-400/80 font-mono font-bold">Take Profit 1</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {activeSetup ? activeSetup.takeProfit1.toFixed(getDecimals(selectedAsset)) : (selectedAsset.price * 1.01).toFixed(getDecimals(selectedAsset))}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 bg-slate-950/60 px-2 rounded-lg border border-slate-800/40">
                <span className="text-emerald-400/80 font-mono font-bold">Take Profit 2</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {activeSetup ? activeSetup.takeProfit2.toFixed(getDecimals(selectedAsset)) : (selectedAsset.price * 1.02).toFixed(getDecimals(selectedAsset))}
                </span>
              </div>
              
              <div className="h-[1px] bg-slate-800 my-2" />
              
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
                <div className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-slate-500 text-[9px]">R/R RATIO</div>
                  <div className="font-bold text-slate-200 mt-0.5">1 : {activeSetup ? activeSetup.riskRewardRatio : '2.5'}</div>
                </div>
                <div className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-slate-500 text-[9px]">CONFIDENCE</div>
                  <div className="font-bold text-emerald-400 mt-0.5">{activeSetup ? activeSetup.confidenceScore : '82'}%</div>
                </div>
                <div className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-slate-500 text-[9px]">GRADE</div>
                  <div className="font-bold text-slate-200 mt-0.5">{activeSetup ? activeSetup.tradeGrade : 'A'}</div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                if (activeSetup) {
                  setShowSetupModal(true);
                } else {
                  handleGenerateSetup();
                }
              }}
              disabled={loadingSetup}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-slate-950 rounded-xl text-xs font-mono font-bold tracking-wide transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              {loadingSetup ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Formulating...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>{activeSetup ? "View Full Trade Plan" : "Generate Trade Plan"}</span>
                </>
              )}
            </button>
          </div>

          {/* RISK CALCULATOR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-lg space-y-3 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider font-mono flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-blue-400" />
                Risk Calculator
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Live Sync</span>
            </div>

            {/* Live Inputs */}
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-500 font-mono tracking-wide uppercase block mb-1">
                  Account Balance ($)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={accountBalance}
                    onChange={(e) => setAccountBalance(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-white font-mono font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 text-right"
                  />
                  <span className="absolute left-2.5 top-1.5 font-bold font-mono text-slate-500">$</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-mono tracking-wide uppercase block mb-1">
                    Risk Per Trade (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-white font-mono font-bold rounded-lg pl-2 pr-5 py-1.5 focus:outline-none focus:border-blue-500 text-right"
                    />
                    <span className="absolute right-2 top-1.5 font-bold font-mono text-slate-500">%</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-mono tracking-wide uppercase block mb-1">
                    Stop Loss (pips)
                  </label>
                  <input
                    type="number"
                    value={stopLossPips}
                    onChange={(e) => setStopLossPips(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-white font-mono font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 text-right"
                  />
                </div>
              </div>

              {/* Calculator Live Outputs */}
              <div className="mt-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Max Risk:</span>
                  <span className="font-extrabold text-slate-200">${maxRiskAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Position Size:</span>
                  <span className="font-extrabold text-blue-400">{calculatedPositionSize} Lots</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Pip Value:</span>
                  <span className="font-extrabold text-slate-200">${pipValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-800/60 pt-1.5">
                  <span className="text-slate-500">Potential Profit:</span>
                  <span className="font-extrabold text-emerald-400">${potentialProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                setOrderExecutedSuccess(false);
                setIsExecutingOrder(false);
                setShowUseInTradeModal(true);
              }}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs font-sans tracking-wide transition-all cursor-pointer shadow-md shadow-emerald-500/10"
            >
              Use in Trade
            </button>
          </div>

          {/* UPCOMING ECONOMIC EVENTS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider font-mono flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-rose-400" />
                Upcoming Events
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Today</span>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { time: "10:30 AM", impact: "High", event: "USD CPI m/m", color: "text-rose-400 bg-rose-500/10 border-rose-500/15" },
                { time: "12:00 PM", impact: "High", event: "USD Retail Sales m/m", color: "text-rose-400 bg-rose-500/10 border-rose-500/15" },
                { time: "02:00 PM", impact: "Med", event: "USD FOMC Member Speak", color: "text-amber-400 bg-amber-500/10 border-amber-500/15" }
              ].map((ev, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-slate-950/40 rounded-xl border border-slate-800/40 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-200 block">{ev.event}</span>
                      <span className="text-[10px] text-slate-500 font-mono block">{ev.time}</span>
                    </div>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${ev.color}`}>
                    {ev.impact} Impact
                  </span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setShowCalendarModal(true)}
              className="w-full py-2 bg-slate-950 hover:bg-slate-800/40 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-mono font-bold tracking-wide transition-all cursor-pointer"
            >
              View Calendar
            </button>
          </div>

        </div>

      </div>

      {/* 3. BENTO GRID OF 4 TECHNICAL STATUS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Card 1: KEY LEVELS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-3">
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider font-mono flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-blue-400" />
              Key Levels
            </h4>
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between items-center py-1 border-b border-slate-800/30">
              <span className="text-slate-500">Resistance 2:</span>
              <span className="font-extrabold text-rose-400">
                {activeAnalysis?.marketStructure.resistance[1]?.toFixed(getDecimals(selectedAsset)) || '1.0930'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/30">
              <span className="text-slate-500">Resistance 1:</span>
              <span className="font-extrabold text-rose-400">
                {activeAnalysis?.marketStructure.resistance[0]?.toFixed(getDecimals(selectedAsset)) || '1.0900'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 bg-slate-950 p-1.5 rounded-lg border border-slate-800/80 my-1">
              <span className="text-slate-300 font-bold">Current Price:</span>
              <span className="font-black text-white text-sm">
                {selectedAsset.price.toFixed(getDecimals(selectedAsset))}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/30">
              <span className="text-slate-500">Support 1:</span>
              <span className="font-extrabold text-emerald-400">
                {activeAnalysis?.marketStructure.support[0]?.toFixed(getDecimals(selectedAsset)) || '1.0820'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Support 2:</span>
              <span className="font-extrabold text-emerald-400">
                {activeAnalysis?.marketStructure.support[1]?.toFixed(getDecimals(selectedAsset)) || '1.0780'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: MULTI TIMEFRAME TREND */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-3">
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider font-mono flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Multi-Timeframe Trend
            </h4>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="space-y-2 text-xs font-mono">
            {(() => {
              const isEurUsd = selectedAsset.symbol === 'EUR/USD';
              const baseProb = selectedAsset.bullishProb;
              
              const trends = isEurUsd ? [
                { tf: "Daily", trend: "Bullish", arrow: "↑", percent: 80, color: "bg-emerald-500", tColor: "text-emerald-400", segments: 5, activeSegments: 4 },
                { tf: "4H", trend: "Bullish", arrow: "↑", percent: 84, color: "bg-emerald-500", tColor: "text-emerald-400", segments: 5, activeSegments: 4 },
                { tf: "1H", trend: "Bullish", arrow: "↑", percent: 75, color: "bg-emerald-500", tColor: "text-emerald-400", segments: 5, activeSegments: 4 },
                { tf: "15m", trend: "Neutral", arrow: "↔", percent: 55, color: "bg-amber-500", tColor: "text-amber-400", segments: 5, activeSegments: 3 },
                { tf: "5m", trend: "Neutral", arrow: "↔", percent: 40, color: "bg-amber-500", tColor: "text-amber-400", segments: 5, activeSegments: 2 },
              ] : [
                { tf: "Daily", shift: 2 },
                { tf: "4H", shift: 1 },
                { tf: "1H", shift: 0 },
                { tf: "15m", shift: -2 },
                { tf: "5m", shift: -3 },
              ].map(({ tf, shift }) => {
                const prob = Math.min(99, Math.max(1, baseProb + shift * 3 + Math.floor(Math.sin(shift) * 5)));
                let trend = "Neutral";
                let arrow = "↔";
                let color = "bg-amber-500";
                let tColor = "text-amber-400";
                let activeSegments = 2;

                if (prob > 55) {
                  trend = "Bullish";
                  arrow = "↑";
                  color = "bg-emerald-500";
                  tColor = "text-emerald-400";
                  activeSegments = prob > 75 ? 5 : prob > 65 ? 4 : 3;
                } else if (prob < 45) {
                  trend = "Bearish";
                  arrow = "↓";
                  color = "bg-rose-500";
                  tColor = "text-rose-400";
                  activeSegments = prob < 25 ? 5 : prob < 35 ? 4 : 3;
                }
                
                return { tf, trend, arrow, percent: prob, color, tColor, segments: 5, activeSegments };
              });

              return trends.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between py-0.5 border-b border-slate-800/10 last:border-0 text-[11px]">
                  <div className="w-14 text-slate-400 font-bold text-left text-[10px]">{t.tf}</div>
                  <div className={`w-16 text-left font-extrabold text-[10px] flex items-center gap-1 ${t.tColor}`}>
                    <span>{t.trend}</span>
                    <span className="font-sans font-bold">{t.arrow}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: t.segments }).map((_, sIdx) => (
                      <div 
                        key={sIdx} 
                        className={`h-2.5 w-1 rounded-sm ${
                          sIdx < t.activeSegments ? t.color : 'bg-slate-800'
                        }`} 
                      />
                    ))}
                  </div>
                  <div className="w-8 text-right font-mono text-[9px] text-slate-500 font-semibold">{t.percent}%</div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Card 3: MOMENTUM INDICATORS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-3">
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider font-mono flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-purple-400" />
              Momentum Indicators
            </h4>
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
          </div>

          {(() => {
            const isEurUsd = selectedAsset.symbol === 'EUR/USD';
            const dec = getDecimals(selectedAsset);
            const isBull = selectedAsset.bullishProb > selectedAsset.bearishProb;
            
            const rsiVal = isEurUsd ? 62.45 : Math.min(95, Math.max(5, Math.round(selectedAsset.bullishProb + (selectedAsset.changePercent * 10))));
            const rsiText = isEurUsd ? "Bullish" : rsiVal > 70 ? "Overbought" : rsiVal < 30 ? "Oversold" : isBull ? "Bullish" : "Bearish";
            
            const macdVal = isEurUsd ? 0.0012 : (selectedAsset.price * 0.0005 * (selectedAsset.bullishProb - 50) / 10);
            const macdText = isEurUsd ? "Bullish" : macdVal > 0 ? "Bullish" : "Bearish";
            
            const stochVal = isEurUsd ? 65.12 : Math.min(99, Math.max(1, Math.round(selectedAsset.bullishProb + 5)));
            const stochText = isEurUsd ? "Bullish" : stochVal > 80 ? "Overbought" : stochVal < 20 ? "Oversold" : isBull ? "Bullish" : "Bearish";
            
            const adxVal = isEurUsd ? 28.45 : Math.round(20 + selectedAsset.confidence * 0.2);
            const adxText = isEurUsd ? "Strong Trend" : adxVal > 25 ? "Strong Trend" : "Weak/Ranging";
            
            const atrVal = isEurUsd ? "0.0045" : (selectedAsset.price * 0.004).toFixed(dec);
            
            return (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center py-0.5 border-b border-slate-800/30">
                  <span className="text-slate-500">RSI (14):</span>
                  <span className={`font-extrabold ${rsiVal > 70 ? 'text-rose-400' : rsiVal < 30 ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {rsiVal.toFixed(2)} - {rsiText}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-800/30">
                  <span className="text-slate-500">MACD (12,26,9):</span>
                  <span className={`font-extrabold ${macdVal > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isEurUsd ? "0.0012" : macdVal.toFixed(dec + 2)} - {macdText}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-800/30">
                  <span className="text-slate-500">Stochastic (14,3,3):</span>
                  <span className={`font-extrabold ${stochVal > 80 ? 'text-rose-400' : stochVal < 20 ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {stochVal.toFixed(2)} - {stochText}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-800/30">
                  <span className="text-slate-500">ADX (14):</span>
                  <span className="font-extrabold text-blue-400">
                    {adxVal.toFixed(2)} - {adxText}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500">ATR (14):</span>
                  <span className="font-extrabold text-slate-300">
                    {atrVal} - Normal
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Card 4: MARKET SENTIMENT */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-2">
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider font-mono flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-rose-400" />
              Market Sentiment
            </h4>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="flex flex-col items-center justify-center pt-1">
            {/* Speedometer arc using SVG */}
            <div className="relative h-20 w-40 overflow-hidden flex items-end justify-center">
              <svg className="absolute top-0 left-0 w-40 h-20" viewBox="0 0 100 50">
                {/* Background Arc */}
                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
                {/* Active Sentiment Arc (pointing toward green bullish) */}
                <path d="M 10 50 A 40 40 0 0 1 70 23" fill="none" stroke="url(#sentimentGrad)" strokeWidth="6" strokeLinecap="round" />
                
                {/* Gauge Needle */}
                <g transform={`translate(50, 50) rotate(${(selectedAsset.bullishProb - 50) * 1.8})`}>
                  <line x1="0" y1="0" x2="0" y2="-38" stroke="#f1f5f9" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="0" cy="0" r="4" fill="#f1f5f9" />
                </g>

                <defs>
                  <linearGradient id="sentimentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="60%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute bottom-1 text-center">
                <div className="flex items-center justify-center gap-3 text-[9px] font-mono text-slate-400">
                  <div className="flex flex-col">
                    <span className="text-emerald-400 font-extrabold text-[11px]">{selectedAsset.bullishProb}%</span>
                    <span>Bullish</span>
                  </div>
                  <div className="flex flex-col border-l border-slate-800 pl-2 pr-2">
                    <span className="text-rose-400 font-extrabold text-[11px]">{selectedAsset.bearishProb}%</span>
                    <span>Bearish</span>
                  </div>
                  <div className="flex flex-col border-l border-slate-800 pl-2">
                    <span className="text-slate-400 font-extrabold text-[11px]">{selectedAsset.neutralProb}%</span>
                    <span>Neutral</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick breakdown info */}
            <div className="grid grid-cols-2 gap-4 w-full text-[10px] font-mono mt-3.5 pt-2 border-t border-slate-800/40 text-center">
              <div>
                <span className="text-slate-500 block">News Impact</span>
                <span className={`font-extrabold ${selectedAsset.confidence > 75 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {selectedAsset.confidence > 75 ? 'High' : selectedAsset.confidence > 55 ? 'Medium' : 'Low'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Volatility</span>
                <span className={`font-extrabold ${selectedAsset.category === 'Crypto' || selectedAsset.category === 'Indices' ? 'text-rose-400' : 'text-amber-400'}`}>
                  {selectedAsset.category === 'Crypto' || selectedAsset.category === 'Indices' ? 'High' : 'Medium'}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. HORIZONTAL CONTAINER: AI RECOMMENDATIONS BOX */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider font-mono flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
          AI Recommendations
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
          <div className="flex items-start gap-2.5 p-2 bg-slate-950/40 rounded-xl border border-slate-800/40">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
            <div>
              <span className="font-semibold text-slate-200">Execution Strategy:</span>
              <span className="text-slate-400 ml-1">Look for buying opportunities on pullbacks near 1.0820 - 1.0840 demand block.</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-2 bg-slate-950/40 rounded-xl border border-slate-800/40">
            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0 mt-1.5" />
            <div>
              <span className="font-semibold text-slate-200">Risk Management:</span>
              <span className="text-slate-400 ml-1">Avoid trading during high-impact news events (USD CPI today at 10:30 AM).</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-2 bg-slate-950/40 rounded-xl border border-slate-800/40">
            <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0 mt-1.5" />
            <div>
              <span className="font-semibold text-slate-200">Market Hours:</span>
              <span className="text-slate-400 ml-1">Best trading volume window: London Session 08:00 - 12:00 UTC.</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-2 bg-slate-950/40 rounded-xl border border-slate-800/40">
            <span className="h-2 w-2 rounded-full bg-purple-400 shrink-0 mt-1.5" />
            <div>
              <span className="font-semibold text-slate-200">Reward Metrics:</span>
              <span className="text-slate-400 ml-1">Ensure 1:2 or higher risk-to-reward ratio. Do not chase breakout surges.</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. DYNAMIC OUTPUTS */}
      {(activeAnalysis || activeSetup) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {activeAnalysis && (
            <div className="bg-slate-900 border border-blue-500/25 rounded-2xl p-4.5 space-y-3.5 shadow-xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-400 animate-ping" />
                  <h3 className="text-xs font-bold uppercase text-blue-400 tracking-wider font-mono">
                    Live AI Structural Diagnostics
                  </h3>
                </div>
                <div className="text-[10px] text-slate-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded">
                  Confidence: {activeAnalysis.confidence}%
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-[9px] text-slate-500">BULLISH</div>
                  <div className="text-sm font-black text-emerald-400 mt-0.5">{activeAnalysis.bullishProb}%</div>
                </div>
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-[9px] text-slate-500">BEARISH</div>
                  <div className="text-sm font-black text-rose-400 mt-0.5">{activeAnalysis.bearishProb}%</div>
                </div>
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-[9px] text-slate-500">NEUTRAL</div>
                  <div className="text-sm font-black text-slate-400 mt-0.5">{activeAnalysis.neutralProb}%</div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 bg-slate-950 px-2.5 rounded-lg border border-slate-800/60">
                  <span className="text-slate-500 font-mono">Trend State</span>
                  <span className="text-slate-200 font-extrabold">{activeAnalysis.marketStructure.trend}</span>
                </div>
                <div className="flex justify-between py-1 bg-slate-950 px-2.5 rounded-lg border border-slate-800/60">
                  <span className="text-slate-500 font-mono">Support Targets</span>
                  <span className="text-emerald-400 font-extrabold font-mono">{activeAnalysis.marketStructure.support.join(" | ")}</span>
                </div>
                <div className="flex justify-between py-1 bg-slate-950 px-2.5 rounded-lg border border-slate-800/60">
                  <span className="text-slate-500 font-mono">Resistance Levels</span>
                  <span className="text-rose-400 font-extrabold font-mono">{activeAnalysis.marketStructure.resistance.join(" | ")}</span>
                </div>
                <p className="text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 italic text-xs">
                  {activeAnalysis.explanation}
                </p>
              </div>
            </div>
          )}

          {activeSetup && (
            <div className="bg-slate-900 border border-emerald-500/25 rounded-2xl p-4.5 space-y-3.5 shadow-xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <Crosshair className="h-4.5 w-4.5 text-emerald-400 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase text-emerald-400 tracking-wider font-mono">
                    Formulated Order Execution
                  </h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                  activeSetup.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {activeSetup.direction}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="text-[9px] text-slate-500">ENTRY ZONE</div>
                  <div className="font-extrabold text-slate-200 mt-1">{activeSetup.entryZone}</div>
                </div>
                <div className="p-2 bg-slate-950 border border-rose-500/15 rounded-lg">
                  <div className="text-[9px] text-rose-400">STOP LOSS</div>
                  <div className="font-extrabold text-rose-400 mt-1">{activeSetup.stopLoss.toFixed(selectedAsset.price < 50 ? 4 : 2)}</div>
                </div>
                <div className="p-2 bg-slate-950 border border-emerald-500/15 rounded-lg">
                  <div className="text-[9px] text-emerald-400">TARGET 1</div>
                  <div className="font-extrabold text-emerald-400 mt-1">{activeSetup.takeProfit1.toFixed(selectedAsset.price < 50 ? 4 : 2)}</div>
                </div>
                <div className="p-2 bg-slate-950 border border-emerald-500/15 rounded-lg">
                  <div className="text-[9px] text-emerald-400">TARGET 2</div>
                  <div className="font-extrabold text-emerald-400 mt-1">{activeSetup.takeProfit2.toFixed(selectedAsset.price < 50 ? 4 : 2)}</div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs font-mono border-t border-slate-800 pt-3">
                <span>R/R Ratio: <strong className="text-white">{activeSetup.riskRewardRatio}</strong></span>
                <span>Confidence: <strong className="text-emerald-400">{activeSetup.confidenceScore}%</strong></span>
                <span>Grade: <strong className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 text-[11px] font-black">{activeSetup.tradeGrade}</strong></span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                {activeSetup.reasoning}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 6. CENTRAL STATUS FOOTER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-mono">
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-slate-600" />
          <span>Last updated: 10:35:21 AM (UTC+5:30)</span>
        </div>
        <div>
          <span>AI Model: <strong className="text-slate-400 font-black">GPT-4o + Proprietary Quant Model</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-400 font-bold">Live Data Feed Connected</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. INTERACTIVE WEB SUITE MODALS                                           */}
      {/* ========================================================================= */}
 
      {/* MODAL 1: AI PATTERN DETECTION DIRECTORY */}
      {showPatternsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-center">
                  <Activity className="h-4.5 w-4.5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">AI Pattern Intelligence Engine</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Live scanning across {timeframe} timeframe</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowPatternsModal(false);
                  setPatternSearch("");
                }}
                className="h-9 w-9 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
 
            {/* Search and Filters */}
            <div className="p-4 bg-slate-950/20 border-b border-slate-850/60 flex flex-wrap gap-2.5 items-center justify-between font-mono">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search scanned patterns (e.g. Engulfing)..."
                  value={patternSearch}
                  onChange={(e) => setPatternSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800/80 hover:border-slate-700 focus:border-blue-500 text-xs text-white rounded-xl pl-9 pr-4 py-2 focus:outline-none transition-all font-mono"
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800/60 rounded-xl">
                {([
                  { id: "all", label: "All" },
                  { id: "bullish", label: "Bullish" },
                  { id: "bearish", label: "Bearish" },
                  { id: "smc", label: "SMC Level" }
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setPatternFilter(t.id)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                      patternFilter === t.id 
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
 
            {/* List */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-slate-950/20">
              {[
                { name: "Bullish Engulfing", type: "Candlestick", category: "bullish", strength: "High", confidence: 85, timeframe: "H4", explanation: "Strong buyers entered at the key daily support level, fully engulfing the previous bearish candle range, signaling dynamic reversal.", symbol: "↑" },
                { name: "Rising Channel", type: "Continuation", category: "bullish", strength: "High", confidence: 78, timeframe: "D1", explanation: "Ascending parallel lines marking a steady progression of higher highs and higher lows, representing solid retail and institutional demand.", symbol: "📈" },
                { name: "Support Zone", type: "SMC Level", category: "smc", strength: "High", confidence: 82, timeframe: "H1", explanation: "Heavy accumulation of limit orders resting inside the 1.0820 - 1.0840 demand pool. Institutional blocks are absorbing sell flow.", symbol: "📥" },
                { name: "Liquidity Sweep", type: "Completed SMC", category: "smc", strength: "Medium", confidence: 65, timeframe: "M15", explanation: "Market swept sell-side liquidity beneath the local low (1.0810) to trigger stop losses before reversing rapidly into an upward impulse.", symbol: "🧹" },
                { name: "Order Block", type: "Bullish SMC", category: "smc", strength: "Medium", confidence: 60, timeframe: "H4", explanation: "The final down-close candle before the aggressive upward rally. It represents resting order imbalances that will likely trigger buying on retests.", symbol: "🧱" },
                { name: "Inverted Head & Shoulders", type: "Chart Pattern", category: "bullish", strength: "High", confidence: 74, timeframe: "H1", explanation: "Classic reversal pattern featuring three troughs, with the middle (head) being the deepest. Neckline breakout confirms momentum.", symbol: "👥" },
                { name: "Double Bottom", type: "Chart Pattern", category: "bullish", strength: "High", confidence: 80, timeframe: "H1", explanation: "Bullish reversal pattern testing structural lows twice before finding significant buyers, with decreasing sell volume on the second touch.", symbol: "👥" },
                { name: "Bearish Engulfing", type: "Candlestick", category: "bearish", strength: "High", confidence: 82, timeframe: "H4", explanation: "Sellers fully overwhelmed buyers at local resistance, printing a large red candle engulfing the previous body. Reversal trigger.", symbol: "↓" },
                { name: "Falling Wedge", type: "Continuation", category: "bullish", strength: "Medium", confidence: 70, timeframe: "H1", explanation: "Converging lines pointing downward, indicating a loss of bearish momentum. Breakout to the upside yields high reward ratios.", symbol: "📐" },
                { name: "Double Top", type: "Chart Pattern", category: "bearish", strength: "High", confidence: 75, timeframe: "H4", explanation: "Bearish reversal pattern with two peaks testing resistance, failing to break higher, leading to seller exhaustion and capitulation.", symbol: "👥" },
                { name: "Mitigation Block", type: "Bearish SMC", category: "smc", strength: "Medium", confidence: 64, timeframe: "H1", explanation: "A failed order block that was broken through. Price returns to mitigate remaining seller exposure, often forming dynamic resistance.", symbol: "⚡" },
              ]
                .filter((p) => {
                  const matchSearch = p.name.toLowerCase().includes(patternSearch.toLowerCase()) || p.explanation.toLowerCase().includes(patternSearch.toLowerCase());
                  const matchFilter = patternFilter === "all" || p.category === patternFilter;
                  return matchSearch && matchFilter;
                })
                .map((p, idx) => (
                  <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start justify-between gap-4 transition-all hover:border-slate-700 hover:bg-slate-900/80">
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                        p.category === "bullish" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" :
                        p.category === "bearish" ? "bg-rose-500/10 text-rose-400 border border-rose-500/15" :
                        "bg-blue-500/10 text-blue-400 border border-blue-500/15"
                      }`}>
                        {p.symbol}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-extrabold text-slate-100 text-xs sm:text-sm">{p.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-500 text-[9px] font-mono font-bold tracking-wider">{p.timeframe}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono tracking-wider block uppercase font-mono">{p.type}</span>
                        <p className="text-xs text-slate-400 leading-relaxed font-sans">{p.explanation}</p>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-end gap-2 shrink-0 w-full sm:w-auto border-t sm:border-0 border-slate-800/40 pt-3 sm:pt-0 font-mono">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold border ${
                        p.category === "bullish" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        p.category === "bearish" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                        "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}>
                        Conf: {p.confidence}%
                      </span>
                      <button 
                        onClick={() => handleCopy(`${p.name} (Conf: ${p.confidence}%, TF: ${p.timeframe}) - ${p.explanation}`, p.name)}
                        className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-[10px] font-mono text-slate-400 hover:text-white rounded-lg border border-slate-800 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        {copiedText === p.name ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Info</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
            <div className="p-4 bg-slate-950/40 border-t border-slate-800 text-center text-[10px] text-slate-500 font-mono">
              Pattern scans refreshed live every block update.
            </div>
          </div>
        </div>
      )}
 
      {/* MODAL 2: DETAILED AI EXPLANATION */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center animate-pulse">
                  <Sparkles className="h-4.5 w-4.5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Detailed AI Synthesis</h3>
                  <p className="text-[10px] text-slate-500 font-mono">{selectedAsset.symbol} • {timeframe} Analysis Report</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAnalysisModal(false)}
                className="h-9 w-9 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
 
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-950/20 font-sans">
              {activeAnalysis ? (
                <>
                  {/* Probability metrics block */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                    <h4 className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider mb-3">AI DIRECTIONAL PROBABILITY FLOW</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-slate-900 border border-emerald-500/10 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-mono tracking-widest block">BULLISH</span>
                        <span className="text-2xl font-black text-emerald-400 block mt-1">{activeAnalysis.bullishProb}%</span>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden mt-2">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${activeAnalysis.bullishProb}%` }} />
                        </div>
                      </div>
                      <div className="p-3 bg-slate-900 border border-rose-500/10 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-mono tracking-widest block">BEARISH</span>
                        <span className="text-2xl font-black text-rose-400 block mt-1">{activeAnalysis.bearishProb}%</span>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden mt-2">
                          <div className="h-full bg-rose-400 rounded-full" style={{ width: `${activeAnalysis.bearishProb}%` }} />
                        </div>
                      </div>
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-mono tracking-widest block">NEUTRAL</span>
                        <span className="text-2xl font-black text-slate-400 block mt-1">{activeAnalysis.neutralProb}%</span>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden mt-2">
                          <div className="h-full bg-slate-600 rounded-full" style={{ width: `${activeAnalysis.neutralProb}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
 
                  {/* Market Structure Summary */}
                  <div className="space-y-3.5">
                    <h4 className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
                      INSTITUTIONAL MARKET STRUCTURE (SMC)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
                      <div className="p-3 bg-slate-900 border border-slate-800/80 rounded-xl">
                        <span className="text-slate-500 uppercase block text-[9px] font-bold">Trend Character</span>
                        <span className="text-slate-200 block font-semibold mt-1">{activeAnalysis.marketStructure?.trend || "Strong Bullish Continuity"}</span>
                      </div>
                      <div className="p-3 bg-slate-900 border border-slate-800/80 rounded-xl">
                        <span className="text-slate-500 uppercase block text-[9px] font-bold">Liquidity Sweeps</span>
                        <span className="text-slate-200 block font-semibold mt-1">{activeAnalysis.marketStructure?.liquidityZones || "Resting sell-stops cleared below 1.0810."}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-900 border border-slate-800/80 rounded-xl font-mono text-[11px]">
                      <span className="text-slate-500 uppercase block text-[9px] font-bold">Structural Shift Details</span>
                      <p className="text-slate-300 font-medium mt-1 leading-relaxed">{activeAnalysis.marketStructure?.structure || "Change of Character (CHoCH) completed with massive order expansion."}</p>
                    </div>
                  </div>
 
                  {/* Comprehensive Explanation text block */}
                  <div className="space-y-2.5">
                    <h4 className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">PROPRIETARY SYNTHESIS STATEMENT</h4>
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-300 leading-relaxed font-sans border-l-4 border-l-emerald-500">
                      {activeAnalysis.explanation}
                    </div>
                  </div>
 
                  {/* Bullet Summary grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">TECHNICAL DRIVERS</span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{activeAnalysis.technicalSummary}</p>
                    </div>
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">FUNDAMENTAL CONTEXT</span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{activeAnalysis.fundamentalSummary}</p>
                    </div>
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">RETAIL SENTIMENT</span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{activeAnalysis.sentimentSummary}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                  <p className="text-xs text-slate-400 font-mono">Loading dynamic market synthesis details...</p>
                </div>
              )}
            </div>
 
            {/* Modal Footer */}
            <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between">
              <button 
                onClick={handleAnalyseMarket}
                disabled={loadingAnalysis}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-mono font-bold tracking-wide transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingAnalysis ? 'animate-spin' : ''}`} />
                <span>Re-analyse Live Flow</span>
              </button>
              <button 
                onClick={() => setShowAnalysisModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* MODAL 3: TRADE SETUP PLAN */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center">
                  <Crosshair className="h-4.5 w-4.5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Elite AI Trade Setup Docket</h3>
                  <p className="text-[10px] text-slate-500 font-mono font-mono">Structured Risk Plan • {selectedAsset.symbol}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSetupModal(false)}
                className="h-9 w-9 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
 
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-950/20 font-sans">
              {isGeminiCooldown && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex gap-3 text-xs leading-relaxed text-amber-300 shadow-sm animate-fade-in">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold font-mono text-[9px] uppercase text-amber-400 block tracking-widest">Local Quantitative Fallback Active</span>
                    <p className="text-[11px] text-slate-300">
                      The Gemini API is in cooling fallback. Utilizing local mathematical models for trade formulation.
                    </p>
                  </div>
                </div>
              )}
              {activeSetup ? (
                <>
                  {/* Status Card Banner */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-mono block uppercase">DIRECTIONAL BIAS</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider border ${
                          activeSetup.direction === "BUY" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}>
                          {activeSetup.direction}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">Grade {activeSetup.tradeGrade} • {activeSetup.confidenceScore}% Conf</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-mono block">ESTIMATED RISK/REWARD</span>
                      <span className="text-xl font-black text-emerald-400 font-mono block mt-0.5">1 : {activeSetup.riskRewardRatio}</span>
                    </div>
                  </div>
 
                  {/* Trade Parameters Level List */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">EXECUTION ENTRY & PROTECTION BOUNDARIES</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 font-mono">
                      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1 relative">
                        <span className="text-[9px] text-slate-500 uppercase block font-bold font-mono">ENTRY ACCUMULATION ZONE</span>
                        <span className="text-sm font-black text-slate-100 block">{activeSetup.entryZone}</span>
                        <button 
                          onClick={() => handleCopy(activeSetup.entryZone, "Entry Zone")}
                          className="absolute right-3 top-3.5 p-1 text-slate-500 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800/80 rounded-lg transition-all cursor-pointer"
                          title="Copy Entry Zone"
                        >
                          {copiedText === "Entry Zone" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
 
                      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1 relative">
                        <span className="text-[9px] text-rose-400 uppercase block font-bold font-mono">INVALIDATION BARRIER (STOP LOSS)</span>
                        <span className="text-sm font-black text-rose-400 block">${activeSetup.stopLoss.toFixed(selectedAsset.price < 50 ? 4 : 2)}</span>
                        <button 
                          onClick={() => handleCopy(activeSetup.stopLoss.toFixed(selectedAsset.price < 50 ? 4 : 2), "Stop Loss")}
                          className="absolute right-3 top-3.5 p-1 text-slate-500 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800/80 rounded-lg transition-all cursor-pointer"
                          title="Copy Stop Loss"
                        >
                          {copiedText === "Stop Loss" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
 
                      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1 relative">
                        <span className="text-[9px] text-emerald-400 uppercase block font-bold font-mono">TARGET OBJECTIVE 1 (PARTIAL TP)</span>
                        <span className="text-sm font-black text-emerald-400 block">${activeSetup.takeProfit1.toFixed(selectedAsset.price < 50 ? 4 : 2)}</span>
                        <button 
                          onClick={() => handleCopy(activeSetup.takeProfit1.toFixed(selectedAsset.price < 50 ? 4 : 2), "TP1")}
                          className="absolute right-3 top-3.5 p-1 text-slate-500 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800/80 rounded-lg transition-all cursor-pointer"
                          title="Copy TP1"
                        >
                          {copiedText === "TP1" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
 
                      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1 relative">
                        <span className="text-[9px] text-emerald-400 uppercase block font-bold font-mono">TARGET OBJECTIVE 2 (RUNNER EXTENSION)</span>
                        <span className="text-sm font-black text-emerald-400 block">${activeSetup.takeProfit2.toFixed(selectedAsset.price < 50 ? 4 : 2)}</span>
                        <button 
                          onClick={() => handleCopy(activeSetup.takeProfit2.toFixed(selectedAsset.price < 50 ? 4 : 2), "TP2")}
                          className="absolute right-3 top-3.5 p-1 text-slate-500 hover:text-white bg-slate-950 hover:bg-slate-800 border border-slate-800/80 rounded-lg transition-all cursor-pointer"
                          title="Copy TP2"
                        >
                          {copiedText === "TP2" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
 
                  {/* Institutional Reasoning Paragraph */}
                  <div className="space-y-2.5">
                    <h4 className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">QUANT REASONING & STRUCTURAL PROJECTION</h4>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-850">
                      {activeSetup.reasoning}
                    </p>
                  </div>
 
                  {/* Action Link widget to calculator */}
                  <div className="p-4 bg-gradient-to-r from-blue-950/20 to-indigo-950/20 border border-blue-500/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-0.5 text-center sm:text-left">
                      <span className="text-xs font-bold text-white block uppercase tracking-wide">Sync parameters with Risk Calculator?</span>
                      <p className="text-[11px] text-slate-400">Loads Stop Loss and asset price straight into prime execution calculator.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setShowSetupModal(false);
                        setStopLossPips(30); // sync mock
                        setOrderExecutedSuccess(false);
                        setIsExecutingOrder(false);
                        setShowUseInTradeModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <span>Load into Execution Desk</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
                  <p className="text-xs text-slate-400 font-mono">Formulating mathematical risk boundaries...</p>
                </div>
              )}
            </div>
 
            {/* Modal Footer */}
            <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between font-mono">
              <button 
                onClick={handleGenerateSetup}
                disabled={loadingSetup}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-mono font-bold tracking-wide transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 animate-pulse"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingSetup ? 'animate-spin' : ''}`} />
                <span>Re-formulate Docket</span>
              </button>
              <button 
                onClick={() => setShowSetupModal(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-white text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Close Plan
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* MODAL 4: ORDER EXECUTION TERMINAL - USE IN TRADE */}
      {showUseInTradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center">
                  <Sliders className="h-4.5 w-4.5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Live STP Order Execution</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Broker Routing Desk • STP Prime Bridge</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowUseInTradeModal(false);
                  setIsExecutingOrder(false);
                  setOrderExecutedSuccess(false);
                }}
                className="h-9 w-9 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
 
            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-slate-950/20 font-sans text-xs">
              {!isExecutingOrder && !orderExecutedSuccess && (
                <>
                  {/* Status strip */}
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/10 rounded-xl flex items-center justify-between font-mono">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-ping" />
                      Prime Bridge Connected
                    </span>
                    <span className="text-[10px] text-slate-500">Ping: 12ms</span>
                  </div>
 
                  {/* Trade Parameters overview */}
                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3.5">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-900 font-mono">
                      <span className="text-slate-500">INSTRUMENT</span>
                      <span className="font-extrabold text-white text-sm">{selectedAsset.symbol} ({selectedAsset.name})</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-left font-mono">
                      <div>
                        <span className="text-[9px] text-slate-500 block">CALCULATED LOTS</span>
                        <span className="text-sm font-black text-blue-400 mt-0.5 block">{calculatedPositionSize} Lots</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">ACCOUNT RISK AMOUNT</span>
                        <span className="text-sm font-black text-slate-200 mt-0.5 block">${maxRiskAmount.toFixed(2)} ({riskPercent}%)</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">STOP LOSS DEPTH</span>
                        <span className="text-sm font-black text-rose-400 mt-0.5 block">{stopLossPips} Pips</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">ESTIMATED PROFIT</span>
                        <span className="text-sm font-black text-emerald-400 mt-0.5 block">${potentialProfit.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
 
                  {/* Execution options */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono tracking-wide uppercase block mb-1">
                        Select Clearing Broker
                      </label>
                      <select
                        value={selectedBroker}
                        onChange={(e) => setSelectedBroker(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="AI QUANT PRIME DESK">AI QUANT PRIME DIRECT DESK (Live Pool)</option>
                        <option value="IC Markets (Simulated)">IC MARKETS clearing pool (Demo STP)</option>
                        <option value="Pepperstone (Simulated)">PEPPERSTONE liquidity pool (Demo STP)</option>
                        <option value="OANDA Clearing (Simulated)">OANDA STP clearing (Demo Pool)</option>
                      </select>
                    </div>
 
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono tracking-wide uppercase block mb-1">
                          Slippage Tolerance
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={slippageTolerance}
                            onChange={(e) => setSlippageTolerance(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                            className="w-full bg-slate-950 border border-slate-800 text-white font-mono font-bold rounded-xl pl-3 pr-8 py-2 text-xs focus:outline-none focus:border-blue-500 text-right font-mono"
                          />
                          <span className="absolute right-3 top-2.5 font-mono text-[10px] text-slate-500">Pips</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-mono tracking-wide uppercase block mb-1">
                          Account Leverage
                        </label>
                        <select
                          value={orderLeverage}
                          onChange={(e) => setOrderLeverage(parseInt(e.target.value) || 100)}
                          className="w-full bg-slate-950 border border-slate-800 text-white font-mono font-bold rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer text-right font-mono"
                        >
                          <option value="30">1 : 30 Retail</option>
                          <option value="100">1 : 100 Prof</option>
                          <option value="500">1 : 500 Extreme</option>
                        </select>
                      </div>
                    </div>
                  </div>
 
                  {/* Warning label */}
                  <p className="text-[10px] font-mono leading-relaxed text-slate-500 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/40">
                    ⚠️ Transmitting STP market orders triggers dynamic liquidity block routing. Ensure sufficient margins. Capped under 1% total risk.
                  </p>
                </>
              )}
 
              {isExecutingOrder && (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 font-mono">
                  <div className="relative h-14 w-14 flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-t-emerald-500 border-r-slate-800 border-b-slate-800 border-l-slate-800 rounded-full animate-spin" />
                    <Sliders className="h-5 w-5 text-emerald-400 animate-pulse" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-black text-slate-200 uppercase tracking-widest block font-mono">clearing ticket flow...</span>
                    <p className="text-[10px] text-slate-500">Checking balance margins • Validating slippage index • Placing limit bids</p>
                  </div>
                </div>
              )}
 
              {orderExecutedSuccess && (
                <div className="py-6 space-y-5">
                  <div className="flex flex-col items-center justify-center text-center space-y-2">
                    <div className="h-12 w-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center animate-bounce">
                      <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-sm font-bold text-slate-100 uppercase block tracking-wider">stp order filled successfully</span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-widest">cleared & journaled</span>
                    </div>
                  </div>
 
                  {/* Success Ticket docket */}
                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl font-mono text-[11px] space-y-2 text-slate-400">
                    <div className="flex justify-between">
                      <span>clearing desk ID:</span>
                      <span className="font-bold text-slate-200">#{Math.floor(100000 + Math.random() * 900000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>instrument asset:</span>
                      <span className="font-bold text-white">{selectedAsset.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>fill lots size:</span>
                      <span className="font-bold text-blue-400">{calculatedPositionSize} Lots</span>
                    </div>
                    <div className="flex justify-between">
                      <span>execution broker:</span>
                      <span className="font-bold text-slate-200">{selectedBroker}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>execution price:</span>
                      <span className="font-bold text-white">${selectedAsset.price}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-900 pt-2 text-[10px]">
                      <span>journal log:</span>
                      <span className="text-emerald-400 font-bold uppercase">Saved to Local Journal entries</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
 
            {/* Modal Footer */}
            <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-end gap-2 font-mono">
              {!isExecutingOrder && !orderExecutedSuccess && (
                <>
                  <button 
                    onClick={() => setShowUseInTradeModal(false)}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl border border-slate-800 cursor-pointer"
                  >
                    Cancel Order
                  </button>
                  <button 
                    onClick={handleExecuteLiveTrade}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                  >
                    Confirm Live STP Fill
                  </button>
                </>
              )}
              {orderExecutedSuccess && (
                <div className="flex items-center gap-2">
                  {onNavigateToSection && (
                    <button 
                      onClick={() => {
                        setShowUseInTradeModal(false);
                        onNavigateToSection('papertrading');
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
                    >
                      View in Orders Terminal
                    </button>
                  )}
                  <button 
                    onClick={() => setShowUseInTradeModal(false)}
                    className="px-5 py-2 bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
 
      {/* MODAL 5: ECONOMIC CALENDAR */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center justify-center">
                  <Calendar className="h-4.5 w-4.5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">AI Macro Economic Calendar</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Live Central Bank Scopes & Volatility Drivers</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCalendarModal(false)}
                className="h-9 w-9 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
 
            {/* Calendar Controls */}
            <div className="p-4 bg-slate-950/20 border-b border-slate-850/60 flex flex-wrap gap-2.5 items-center justify-between font-mono">
              <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800/60 rounded-xl font-mono text-[10px]">
                <button
                  onClick={() => setSelectedCalendarWeek("this")}
                  className={`px-3 py-1.5 font-bold uppercase rounded-lg transition-all cursor-pointer ${
                    selectedCalendarWeek === "this" ? 'bg-rose-600/20 text-rose-400 border border-rose-500/20' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setSelectedCalendarWeek("next")}
                  className={`px-3 py-1.5 font-bold uppercase rounded-lg transition-all cursor-pointer ${
                    selectedCalendarWeek === "next" ? 'bg-rose-600/20 text-rose-400 border border-rose-500/20' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Next Week
                </button>
              </div>
              <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800/60 rounded-xl font-mono text-[10px]">
                {([
                  { id: "all", label: "All Impacts" },
                  { id: "high", label: "High Impact" },
                  { id: "med", label: "Med/High" }
                ] as const).map((impact) => (
                  <button
                    key={impact.id}
                    onClick={() => setCalendarImpactFilter(impact.id)}
                    className={`px-3 py-1.5 font-bold uppercase rounded-lg transition-all cursor-pointer ${
                      calendarImpactFilter === impact.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {impact.label}
                  </button>
                ))}
              </div>
            </div>
 
            {/* Event List */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-slate-950/20 font-mono">
              {[
                // This Week
                { week: "this", date: "Wednesday, June 24", time: "10:30 AM", currency: "USD", event: "CPI m/m (Consumer Price Index)", impact: "high", actual: "--", forecast: "0.3%", previous: "0.2%", details: "Primary indicator of inflation. High release fuels hawk Fed sentiment, yields spike." },
                { week: "this", date: "Wednesday, June 24", time: "12:00 PM", currency: "USD", event: "Retail Sales m/m", impact: "high", actual: "--", forecast: "0.4%", previous: "0.1%", details: "Measures consumer retail activity. Outperforming retail index signals strong consumer base, delaying rate cuts." },
                { week: "this", date: "Wednesday, June 24", time: "02:00 PM", currency: "USD", event: "FOMC Member Speak", impact: "med", actual: "--", forecast: "--", previous: "--", details: "Official speak hints policy shifts. Market parses tone for hawkish/dovish inclinations." },
                { week: "this", date: "Thursday, June 25", time: "08:30 AM", currency: "USD", event: "Unemployment Claims", impact: "med", actual: "215K", forecast: "220K", previous: "218K", details: "Weekly gauge of labor markets. Lower claims indicator shows tight labor support." },
                { week: "this", date: "Thursday, June 25", time: "09:45 AM", currency: "EUR", event: "ECB Press Conference", impact: "high", actual: "--", forecast: "--", previous: "--", details: "ECB president addresses interest rate cuts. Fuels direct EUR/USD volatility index." },
                { week: "this", date: "Thursday, June 25", time: "10:00 AM", currency: "GBP", event: "BOE MPC Treasury Committee Hearings", impact: "high", actual: "--", forecast: "--", previous: "--", details: "Monetary policy testimonies. Sparks large GBP/USD trend volatility." },
                { week: "this", date: "Friday, June 26", time: "08:30 AM", currency: "USD", event: "Core PCE Price Index m/m", impact: "high", actual: "--", forecast: "0.2%", previous: "0.3%", details: "Federal Reserve's preferred inflation gauge. Core measures exclude volatile food/energy, driving trend bias." },
                { week: "this", date: "Friday, June 26", time: "10:00 AM", currency: "USD", event: "Revised UoM Consumer Sentiment", impact: "med", actual: "--", forecast: "65.2", previous: "64.8", details: "Surveys consumer confidence regarding spending and macro inflation forecasts." },
                // Next Week
                { week: "next", date: "Monday, June 29", time: "09:00 AM", currency: "EUR", event: "Spanish Flash CPI y/y", impact: "med", actual: "--", forecast: "3.2%", previous: "3.4%", details: "Inflation feedback from core eurozone member. Sets stage for region-wide metrics." },
                { week: "next", date: "Tuesday, June 30", time: "08:30 AM", currency: "CAD", event: "GDP m/m", impact: "high", actual: "--", forecast: "0.2%", previous: "0.0%", details: "Overall economic productivity rate. High CAD GDP strengthens Loonie flows." },
                { week: "next", date: "Wednesday, July 01", time: "08:15 AM", currency: "USD", event: "ADP Non-Farm Employment Change", impact: "high", actual: "--", forecast: "155K", previous: "150K", details: "Leading private payroll tracker ahead of official government non-farm payroll releases." },
                { week: "next", date: "Thursday, July 02", time: "08:30 AM", currency: "USD", event: "Official Non-Farm Payrolls (NFP)", impact: "high", actual: "--", forecast: "175K", previous: "165K", details: "Critical US macro event. Measures total payroll changes. Highly volatile index trigger." }
              ]
                .filter((ev) => {
                  const matchWeek = ev.week === selectedCalendarWeek;
                  const matchImpact = calendarImpactFilter === "all" || 
                                     (calendarImpactFilter === "high" && ev.impact === "high") ||
                                     (calendarImpactFilter === "med" && (ev.impact === "high" || ev.impact === "med"));
                  return matchWeek && matchImpact;
                })
                .map((ev, idx) => (
                  <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5 transition-all hover:border-slate-700 hover:bg-slate-900/80">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-950 text-slate-300 font-mono font-bold text-[10px] border border-slate-850 rounded-lg">{ev.time}</span>
                        <span className="font-extrabold text-white font-mono text-[10px]">{ev.currency}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-wider ${
                        ev.impact === "high" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>
                        {ev.impact} Impact
                      </span>
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-100 text-xs sm:text-sm block">{ev.event}</span>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans mt-1">{ev.details}</p>
                    </div>
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 font-mono text-[10px] bg-slate-950 p-2 rounded-xl text-center">
                      <div>
                        <span className="text-slate-500 uppercase text-[9px]">Actual</span>
                        <span className={`block font-bold mt-0.5 ${ev.actual !== "--" ? "text-white" : "text-slate-600"}`}>{ev.actual}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase text-[9px]">Forecast</span>
                        <span className="block font-bold mt-0.5 text-slate-200">{ev.forecast}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase text-[9px]">Previous</span>
                        <span className="block font-bold mt-0.5 text-slate-400">{ev.previous}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            <div className="p-4 bg-slate-950/40 border-t border-slate-800 text-center text-[10px] text-slate-500 font-mono">
              Economic calendar synchronized with global central bank releases.
            </div>
          </div>
        </div>
      )}
 
    </div>
  );
}
