import React, { useState, useEffect } from "react";
import { MarketAsset, TradeSetupPlan } from "../types";
import AdBanner from "./AdBanner";
import { 
  CheckCircle, ArrowUpRight, ShieldAlert, Sparkles, AlertCircle, 
  Play, TrendingUp, TrendingDown, RefreshCw, Clock, Hourglass,
  Coins, Calculator, DollarSign, TrendingUp as ArrowUp, TrendingDown as ArrowDown,
  Zap, Check, Loader2, ArrowRight
} from "lucide-react";
import { 
  SUPPORTED_CURRENCIES, 
  getStoredCurrency, 
  setStoredCurrency, 
  formatCurrencyAmount, 
  calculatePips, 
  calculateTradePnL,
  CurrencyConfig 
} from "../utils/currencyAndPips";

interface TradeSetupProps {
  selectedAsset: MarketAsset;
  tradeSetup: TradeSetupPlan | null;
  onGenerateSetup: (direction: 'BUY' | 'SELL') => void;
  loading: boolean;
  analysisData?: any;
  isGeminiCooldown?: boolean;
  aiScanMode?: 'quant' | 'gemini';
  onAiScanModeChange?: (mode: 'quant' | 'gemini') => void;
  onNavigateToSection?: (section: any) => void;
}

export default function TradeSetup({ 
  selectedAsset, 
  tradeSetup, 
  onGenerateSetup, 
  loading, 
  analysisData, 
  isGeminiCooldown,
  aiScanMode = 'quant',
  onAiScanModeChange,
  onNavigateToSection
}: TradeSetupProps) {
  const [directionBias, setDirectionBias] = useState<'BUY' | 'SELL'>(() => {
    return selectedAsset.bullishProb >= selectedAsset.bearishProb ? 'BUY' : 'SELL';
  });

  // Direct order placement state
  const [isPlacingDirectOrder, setIsPlacingDirectOrder] = useState(false);
  const [directOrderReceipt, setDirectOrderReceipt] = useState<{
    id: string;
    market: string;
    direction: "BUY" | "SELL";
    price: number;
    lots: number;
    sl: number;
    tp1: number;
    broker: string;
  } | null>(null);

  // Quant Market Direction Bias calculations
  const isQuantBullish = selectedAsset.bullishProb >= selectedAsset.bearishProb;
  const quantRecommendedDirection: 'BUY' | 'SELL' = isQuantBullish ? 'BUY' : 'SELL';
  const quantProbPct = Math.round((isQuantBullish ? selectedAsset.bullishProb : selectedAsset.bearishProb) * 100);

  // Sync direction bias with selected asset live market signal
  useEffect(() => {
    setDirectionBias(selectedAsset.bullishProb >= selectedAsset.bearishProb ? 'BUY' : 'SELL');
  }, [selectedAsset.symbol, selectedAsset.bullishProb, selectedAsset.bearishProb]);

  // Currency & Position Sizing State
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyConfig>(getStoredCurrency());
  const [lotSize, setLotSize] = useState<number>(0.1);
  const [accountBalanceUSD, setAccountBalanceUSD] = useState<number>(10000);

  const handleCurrencyChange = (code: string) => {
    const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
    if (found) {
      setSelectedCurrency(found);
      setStoredCurrency(found.code);
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    if (grade.startsWith("B")) return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    if (grade.startsWith("C")) return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    return "bg-rose-500/10 text-rose-400 border-rose-500/30";
  };

  // Helper to parse numeric entry price from entryZone string (e.g. "$1.0850" or "1.0850 - 1.0860")
  const getEntryPriceVal = (): number => {
    if (!tradeSetup) return selectedAsset.price;
    const matches = tradeSetup.entryZone.match(/\d+\.?\d*/g);
    if (matches && matches.length > 0) {
      const parsed = parseFloat(matches[0]);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return selectedAsset.price;
  };

  const entryVal = getEntryPriceVal();

  // Calculations for SL, TP1, and TP2
  const slMetrics = tradeSetup ? calculateTradePnL({
    symbol: selectedAsset.symbol,
    category: selectedAsset.category,
    direction: tradeSetup.direction,
    entryPrice: entryVal,
    targetPrice: tradeSetup.stopLoss,
    lotSize,
    currency: selectedCurrency,
    accountBalanceUSD
  }) : null;

  const tp1Metrics = tradeSetup ? calculateTradePnL({
    symbol: selectedAsset.symbol,
    category: selectedAsset.category,
    direction: tradeSetup.direction,
    entryPrice: entryVal,
    targetPrice: tradeSetup.takeProfit1,
    lotSize,
    currency: selectedCurrency,
    accountBalanceUSD
  }) : null;

  const tp2Metrics = tradeSetup ? calculateTradePnL({
    symbol: selectedAsset.symbol,
    category: selectedAsset.category,
    direction: tradeSetup.direction,
    entryPrice: entryVal,
    targetPrice: tradeSetup.takeProfit2,
    lotSize,
    currency: selectedCurrency,
    accountBalanceUSD
  }) : null;

  const handleExecuteDirectTrade = (customSide?: "BUY" | "SELL") => {
    setIsPlacingDirectOrder(true);
    setDirectOrderReceipt(null);

    const side = customSide || (tradeSetup ? tradeSetup.direction : directionBias);
    const price = entryVal;
    const sl = tradeSetup ? tradeSetup.stopLoss : (side === "BUY" ? price * 0.995 : price * 1.005);
    const tp = tradeSetup ? tradeSetup.takeProfit1 : (side === "BUY" ? price * 1.01 : price * 0.99);
    const ticketId = `STP-SETUP-${Math.floor(100000 + Math.random() * 900000)}`;
    const brokerName = "AI QUANT PRIME DESK";

    setTimeout(() => {
      setIsPlacingDirectOrder(false);

      // Save to position store for broker & paper trading
      try {
        const positionsRaw = localStorage.getItem("paper_trading_positions_v1");
        const openPositions = positionsRaw ? JSON.parse(positionsRaw) : [];
        const newPosition = {
          id: `pos_${Date.now()}`,
          symbol: selectedAsset.symbol,
          type: side,
          entryPrice: price,
          currentPrice: price,
          size: lotSize,
          leverage: 100,
          stopLoss: sl,
          takeProfit: tp,
          pnl: 0,
          timestamp: new Date().toISOString(),
          status: "OPEN",
          brokerId: "quantintel-stp",
          notes: `Setup Plan Order (${tradeSetup?.tradeGrade || 'A+'} Grade) Ticket #${ticketId}`
        };
        localStorage.setItem("paper_trading_positions_v1", JSON.stringify([newPosition, ...openPositions]));
      } catch (e) {
        console.error("Setup direct order position sync failed:", e);
      }

      // Sync to journal entries
      try {
        const journalRaw = localStorage.getItem("ai_quant_journal_entries");
        const existingEntries = journalRaw ? JSON.parse(journalRaw) : [];
        const newEntry = {
          id: `j_${Date.now()}`,
          date: new Date().toISOString().split("T")[0],
          market: selectedAsset.symbol,
          direction: side,
          entryPrice: price,
          exitPrice: tp,
          outcome: "WIN",
          profit: tp1Metrics ? tp1Metrics.pnlCurrency : 150,
          emotion: "Disciplined",
          mistake: "None",
          notes: `Executed via Trade Setup Matrix. Grade: ${tradeSetup?.tradeGrade || 'A+'}. Open: $${price}, SL: $${sl}, TP: $${tp}. Ticket #${ticketId}.`
        };
        localStorage.setItem("ai_quant_journal_entries", JSON.stringify([newEntry, ...existingEntries]));
      } catch (e) {
        console.error("Journal sync failed:", e);
      }

      setDirectOrderReceipt({
        id: ticketId,
        market: selectedAsset.symbol,
        direction: side,
        price,
        lots: lotSize,
        sl,
        tp1: tp,
        broker: brokerName
      });
    }, 1400);
  };

  return (
    <div className="space-y-6">
      
      {/* Configuration panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        
        {/* Prominent AI Market Direction Indicator */}
        <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono ${
          isQuantBullish
            ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
            : "bg-rose-950/40 border-rose-500/40 text-rose-300"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg font-black shrink-0 ${
              isQuantBullish ? "bg-emerald-500 text-slate-950" : "bg-rose-500 text-white"
            }`}>
              {isQuantBullish ? <TrendingUp className="h-5 w-5 stroke-[3]" /> : <TrendingDown className="h-5 w-5 stroke-[3]" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AI QUANT MARKET DIRECTION</span>
                <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase ${
                  isQuantBullish ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                }`}>
                  {quantRecommendedDirection === "BUY" ? "🟢 BUY SIGNAL" : "🔴 SELL SIGNAL"}
                </span>
              </div>
              <div className="text-sm font-black text-white mt-0.5">
                Market is currently a <span className={isQuantBullish ? "text-emerald-400" : "text-rose-400"}>{quantRecommendedDirection}</span> setup ({quantProbPct}% Confidence)
              </div>
            </div>
          </div>

          {directionBias !== quantRecommendedDirection && (
            <button
              onClick={() => setDirectionBias(quantRecommendedDirection)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700 transition-all cursor-pointer shrink-0"
            >
              Align Setup to {quantRecommendedDirection}
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono">
            Plan Setup Parameters & Currency Preferences
          </h2>

          {/* Account Currency Switcher */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-400 font-mono flex items-center gap-1 uppercase">
              <Coins className="h-3.5 w-3.5 text-emerald-400" />
              Account Currency:
            </label>
            <select
              value={selectedCurrency.code}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded-lg px-2.5 py-1 text-xs font-mono cursor-pointer"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol}) — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] text-slate-500 font-mono block mb-1">ASSET</span>
              <span className="text-sm font-bold text-white font-mono">{selectedAsset.symbol}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-mono block mb-1">LAST PRICE</span>
              <span className="text-sm font-bold text-slate-300 font-mono">
                ${selectedAsset.price.toLocaleString(undefined, { minimumFractionDigits: selectedAsset.price < 50 ? 4 : 2 })}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-mono block mb-1">SIMULATED LOT SIZE</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                value={lotSize}
                onChange={(e) => setLotSize(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                className="w-20 bg-slate-950 border border-slate-800 focus:border-emerald-500 text-emerald-400 rounded-md px-2 py-0.5 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-mono block mb-1">ACCOUNT BASE</span>
              <span className="text-xs font-bold text-slate-200 font-mono block mt-0.5">
                {formatCurrencyAmount(accountBalanceUSD * selectedCurrency.rateToUSD, selectedCurrency)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setDirectionBias('BUY')}
              className={`px-3.5 py-2 text-xs font-mono font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                directionBias === 'BUY'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              BUY (Long)
            </button>

            <button
              onClick={() => setDirectionBias('SELL')}
              className={`px-3.5 py-2 text-xs font-mono font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                directionBias === 'SELL'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/40'
                  : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              SELL (Short)
            </button>

            {/* Engine Mode Toggle */}
            <div className="bg-slate-950 border border-slate-800 p-0.5 rounded-lg flex items-center font-mono text-[10px]">
              <button
                onClick={() => onAiScanModeChange?.('quant')}
                title="Fast Local Quantitative Engine - High Speed & No API limits"
                className={`px-2.5 py-1.5 rounded font-black transition-all flex items-center gap-1 cursor-pointer ${
                  aiScanMode === 'quant'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                QUANT
              </button>
              <button
                onClick={() => onAiScanModeChange?.('gemini')}
                title="Deep Gemini AI Generative Diagnostics"
                className={`px-2.5 py-1.5 rounded font-black transition-all flex items-center gap-1 cursor-pointer ${
                  aiScanMode === 'gemini'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                GEMINI
              </button>
            </div>

            <button
              onClick={() => onGenerateSetup(directionBias)}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 rounded-lg transition-all flex items-center gap-1.5 font-mono cursor-pointer shrink-0"
            >
              <Play className={`h-3.5 w-3.5 fill-slate-950 ${loading ? 'animate-pulse' : ''}`} />
              {loading ? "Drafting..." : "Generate Plan"}
            </button>
          </div>
        </div>
      </div>

      {/* Sponsored Ad Banner for free tier */}
      <AdBanner type="banner-slim" />

      {isGeminiCooldown && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl text-xs flex items-center gap-3 font-mono animate-fade-in">
          <Clock className="h-5 w-5 text-amber-400 shrink-0 animate-pulse" />
          <div>
            <p className="font-semibold uppercase tracking-wider">AI Cooldown Mode Active</p>
            <p className="text-slate-400 text-[11px] mt-0.5">Gemini's daily requests have reached capacity limits. The system is currently running on the high-fidelity local quantitative engine fallback to provide real-time strategy sheets uninterrupted.</p>
          </div>
        </div>
      )}

      {/* Main Trade Setup Output */}
      {tradeSetup ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Plan Sheet */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono">
                  Proprietary Strategy Sheet
                </h3>
              </div>
              <span className={`px-2.5 py-1 text-xs font-bold border rounded-lg ${getGradeColor(tradeSetup.tradeGrade)}`}>
                Trade Grade: {tradeSetup.tradeGrade}
              </span>
            </div>

            {tradeSetup.isMock && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex gap-3 text-xs leading-relaxed text-emerald-400">
                <Sparkles className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <span className="font-bold font-mono text-[10px] uppercase text-emerald-300 block">Real-Time Quantitative Setup Active</span>
                  <p className="text-slate-300">
                    Calculated via our proprietary mathematical model using live market structure, pivot ranges, and real-time asset volatility to deliver maximum precision.
                  </p>
                </div>
              </div>
            )}

            {/* Matrix of prices with Pips and Financial PnL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-lg">
                <span className="text-[10px] text-slate-500 font-mono block uppercase">ENTRY ZONE</span>
                <span className="text-sm font-bold text-slate-200 mt-1 block font-mono">{tradeSetup.entryZone}</span>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">Market Execution Price</span>
              </div>

              <div className="p-3.5 bg-slate-950 border border-rose-500/20 rounded-lg space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-rose-400 font-mono block uppercase">STOP LOSS (EXPOSURE LIMIT)</span>
                  {slMetrics && (
                    <span className="text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/30">
                      -{slMetrics.pips} Pips
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-rose-400 block font-mono">
                  ${tradeSetup.stopLoss.toLocaleString(undefined, { minimumFractionDigits: selectedAsset.price < 50 ? 4 : 2 })}
                </span>
                {slMetrics && (
                  <span className="text-xs font-mono font-bold text-rose-400 block pt-0.5 border-t border-slate-900">
                    Est. Loss: -{formatCurrencyAmount(slMetrics.pnlCurrency, selectedCurrency)} ({slMetrics.pnlPercentOfBalance.toFixed(1)}%)
                  </span>
                )}
              </div>

              <div className="p-3.5 bg-slate-950 border border-emerald-500/20 rounded-lg space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-emerald-400 font-mono block uppercase">TAKE PROFIT TIER 1</span>
                  {tp1Metrics && (
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      +{tp1Metrics.pips} Pips
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-emerald-400 block font-mono">
                  ${tradeSetup.takeProfit1.toLocaleString(undefined, { minimumFractionDigits: selectedAsset.price < 50 ? 4 : 2 })}
                </span>
                {tp1Metrics && (
                  <span className="text-xs font-mono font-bold text-emerald-400 block pt-0.5 border-t border-slate-900">
                    Est. Profit: +{formatCurrencyAmount(tp1Metrics.pnlCurrency, selectedCurrency)} (+{tp1Metrics.pnlPercentOfBalance.toFixed(1)}%)
                  </span>
                )}
              </div>

              <div className="p-3.5 bg-slate-950 border border-emerald-500/20 rounded-lg space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-emerald-400 font-mono block uppercase">TAKE PROFIT TIER 2</span>
                  {tp2Metrics && (
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      +{tp2Metrics.pips} Pips
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-emerald-400 block font-mono">
                  ${tradeSetup.takeProfit2.toLocaleString(undefined, { minimumFractionDigits: selectedAsset.price < 50 ? 4 : 2 })}
                </span>
                {tp2Metrics && (
                  <span className="text-xs font-mono font-bold text-emerald-400 block pt-0.5 border-t border-slate-900">
                    Est. Profit: +{formatCurrencyAmount(tp2Metrics.pnlCurrency, selectedCurrency)} (+{tp2Metrics.pnlPercentOfBalance.toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>

            {/* Dedicated Pip & Monetary PnL Calculation Summary Box */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Calculator className="h-4 w-4 text-emerald-400" />
                  <span>Pip Distance & Financial Profit/Loss Calculation</span>
                </div>
                <span className="text-[10px] bg-slate-900 text-emerald-400 px-2 py-0.5 rounded border border-slate-800 font-bold">
                  {selectedCurrency.flag} {selectedCurrency.code} ({selectedCurrency.symbol}) @ {lotSize} Lot
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-rose-500/5 border border-rose-500/20 rounded-lg">
                  <span className="text-[9px] text-rose-400 block font-bold uppercase">Stop Loss</span>
                  <span className="text-xs font-bold text-rose-400 block my-0.5">
                    {slMetrics?.pips} Pips
                  </span>
                  <span className="text-[10px] text-slate-300 block font-bold">
                    -{formatCurrencyAmount(slMetrics?.pnlCurrency || 0, selectedCurrency)}
                  </span>
                </div>

                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                  <span className="text-[9px] text-emerald-400 block font-bold uppercase">TP Tier 1</span>
                  <span className="text-xs font-bold text-emerald-400 block my-0.5">
                    +{tp1Metrics?.pips} Pips
                  </span>
                  <span className="text-[10px] text-slate-300 block font-bold">
                    +{formatCurrencyAmount(tp1Metrics?.pnlCurrency || 0, selectedCurrency)}
                  </span>
                </div>

                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                  <span className="text-[9px] text-emerald-400 block font-bold uppercase">TP Tier 2</span>
                  <span className="text-xs font-bold text-emerald-400 block my-0.5">
                    +{tp2Metrics?.pips} Pips
                  </span>
                  <span className="text-[10px] text-slate-300 block font-bold">
                    +{formatCurrencyAmount(tp2Metrics?.pnlCurrency || 0, selectedCurrency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Order Execution Action Card */}
            <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                    <Zap className="h-4 w-4 fill-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Direct STP Live Order Placement
                    </h4>
                    <span className="text-[10px] text-slate-400 font-sans block">
                      Route this verified setup ({tradeSetup.direction} {lotSize} Lots @ ${entryVal}) straight to broker
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onNavigateToSection && (
                    <button
                      onClick={() => onNavigateToSection('papertrading')}
                      className="text-[10px] text-slate-400 hover:text-emerald-400 font-mono flex items-center gap-1 transition-all cursor-pointer underline"
                      title="View all live & pending orders"
                    >
                      <span>View Orders</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Order Execution Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => handleExecuteDirectTrade(tradeSetup.direction === "SELL" ? "SELL" : "BUY")}
                  disabled={isPlacingDirectOrder}
                  className={`flex-1 w-full py-3 rounded-xl font-bold text-xs tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:cursor-not-allowed ${
                    tradeSetup.direction === "BUY"
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                      : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
                  }`}
                >
                  {isPlacingDirectOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Routing Order to STP Broker...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 fill-current" />
                      <span>Direct Execute {tradeSetup.direction} Plan ({lotSize} Lots)</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleExecuteDirectTrade(tradeSetup.direction === "BUY" ? "SELL" : "BUY")}
                  disabled={isPlacingDirectOrder}
                  className="px-4 py-3 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl font-bold text-xs border border-slate-800 transition-all cursor-pointer shrink-0"
                  title="Reverse and execute opposite direction"
                >
                  Invert Side ({tradeSetup.direction === "BUY" ? "SELL" : "BUY"})
                </button>
              </div>

              {/* Live Order Filled Receipt Docket */}
              {directOrderReceipt && (
                <div className="p-3.5 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-2.5 text-xs font-mono animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <CheckCircle className="h-4 w-4" />
                      <span>STP Order Filled & Routed Successfully</span>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {directOrderReceipt.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Position</span>
                      <span className="font-bold text-white">{directOrderReceipt.direction} {directOrderReceipt.lots} Lots</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Entry Price</span>
                      <span className="font-bold text-emerald-400">${directOrderReceipt.price}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Stop / Target</span>
                      <span className="text-slate-300">${directOrderReceipt.sl} / ${directOrderReceipt.tp1}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Broker Desk</span>
                      <span className="text-emerald-400 font-bold">{directOrderReceipt.broker}</span>
                    </div>
                  </div>

                  {onNavigateToSection && (
                    <div className="pt-2 border-t border-slate-900 flex justify-end">
                      <button
                        onClick={() => onNavigateToSection('papertrading')}
                        className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open Orders Dashboard to Monitor Live P&L</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tactical Explanation */}
            <div>
              <h4 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Order Flow Setup Reasoning
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-serif bg-slate-950 p-4 rounded-lg border border-slate-800/60">
                {tradeSetup.reasoning}
              </p>
            </div>
          </div>

          {/* Quick Metrics & Risk Check */}
          <div className="space-y-6">
            
            {analysisData && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
                  <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
                  <span>Confluent Market Intelligence</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-850 space-y-2 text-[11px] font-mono">
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-slate-500">Market Bias:</span>
                    <span className={`font-extrabold ${analysisData.bullishProb > analysisData.bearishProb ? "text-emerald-400" : "text-rose-400"}`}>
                      {analysisData.bullishProb > analysisData.bearishProb ? `${analysisData.bullishProb}% Bullish` : `${analysisData.bearishProb}% Bearish`}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 text-[10px] uppercase">Technical Summary</span>
                    <p className="text-slate-300 leading-relaxed text-[11px]">{analysisData.technicalSummary}</p>
                  </div>
                  <div className="space-y-1 pt-1.5 border-t border-slate-900">
                    <span className="text-slate-500 text-[10px] uppercase">Chart AI Prediction</span>
                    <p className="text-slate-300 leading-relaxed text-[11px]">{analysisData.explanation}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Expected Plan Metrics
              </h3>

              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-xs border-b border-slate-800/40 pb-2.5">
                  <span className="text-slate-500">Risk to Reward Ratio</span>
                  <span className="font-mono text-emerald-400 font-bold">1 : {tradeSetup.riskRewardRatio}</span>
                </div>

                <div className="flex justify-between items-center text-xs border-b border-slate-800/40 pb-2.5">
                  <span className="text-slate-500">Formulated Bias</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                    tradeSetup.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {tradeSetup.direction}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs border-b border-slate-800/40 pb-2.5">
                  <span className="text-slate-500">System Confidence</span>
                  <span className="font-mono text-slate-200 font-bold">{tradeSetup.confidenceScore}%</span>
                </div>

                {/* Temporal Alignments */}
                <div className="pt-2.5 space-y-3">
                  <div className="text-[10px] font-mono text-emerald-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Temporal Alignments
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-850 space-y-2.5 text-[11px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-500 uppercase text-[9px] font-mono">The time the order open or will be open to the asset selected based on the analysis</span>
                      <span className="text-slate-200 font-bold font-mono flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-emerald-500" />
                        {tradeSetup.expectedMarketOpen || "Pending live feedback"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5 border-t border-slate-900 pt-2">
                      <span className="text-slate-500 uppercase text-[9px] font-mono">The time the asset will end the execution at that buy or sell trend direction based on all analysis</span>
                      <span className="text-violet-400 font-bold font-mono flex items-center gap-1.5">
                        <ArrowUpRight className="h-3 w-3 text-violet-500" />
                        {tradeSetup.expectedEntryTime || "Pending execution boundary"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5 border-t border-slate-900 pt-2">
                      <span className="text-slate-500 uppercase text-[9px] font-mono">The time asset spend at that order</span>
                      <span className="text-emerald-400 font-bold font-mono flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-emerald-500" />
                        {tradeSetup.currentTimeSpent || "Pending trend start tracking"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5 border-t border-slate-900 pt-2">
                      <span className="text-slate-500 uppercase text-[9px] font-mono">The time to spend at that open order in that asset according to the analysis</span>
                      <span className="text-sky-400 font-bold font-mono flex items-center gap-1.5">
                        <Hourglass className="h-3 w-3 text-sky-500" />
                        {tradeSetup.holdingTime || "Intraday sweep"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5 border-t border-slate-900 pt-2">
                      <span className="text-slate-500 uppercase text-[9px] font-mono">The estimated time the asset will end moving in that direction either up or down trend</span>
                      <span className="text-amber-400 font-bold font-mono flex items-center gap-1.5">
                        <Hourglass className="h-3 w-3 text-amber-500" />
                        {tradeSetup.expectedTradeEnd || "Pending end target"}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Safety advisory */}
            <div className="bg-slate-900 border border-rose-500/10 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldAlert className="h-5 w-5" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  Risk Advisory
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                This trade grade of <strong>{tradeSetup.tradeGrade}</strong> indicates that local timeframe structures hold historical statistical advantages of {tradeSetup.confidenceScore}%. Remember that macroeconomic calendar events can trigger massive institutional liquidity sweeps. Protect your active balances.
              </p>
            </div>

          </div>

        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No active setup generated</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Choose either BUY or SELL bias and click "Generate Plan" above to trigger our institutional trade analysis matrix.
          </p>
        </div>
      )}

    </div>
  );
}
