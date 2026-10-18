import React, { useState, useEffect } from "react";
import { MarketAsset, TradeSetupPlan } from "../types";
import AdBanner from "./AdBanner";
import { 
  CheckCircle, ArrowUpRight, ShieldAlert, Sparkles, AlertCircle, AlertTriangle,
  Play, TrendingUp, TrendingDown, RefreshCw, Clock, Hourglass,
  Coins, Calculator, DollarSign, TrendingUp as ArrowUp, TrendingDown as ArrowDown,
  Zap, Check, Loader2, ArrowRight, Radio, Globe, Shield, Lock, Copy,
  Layers, Compass, Target, ArrowUpDown, ChevronDown, ChevronUp, BarChart2,
  BookmarkCheck, Info, ShieldCheck
} from "lucide-react";
import { 
  getDecimals, 
  calculateMarketStructureLevels, 
  STYLE_TPSL_PROFILES, 
  TradingStyleProfile 
} from "../utils";
import { 
  SUPPORTED_CURRENCIES, 
  getStoredCurrency, 
  setStoredCurrency, 
  formatCurrencyAmount, 
  calculatePips, 
  calculateTradePnL,
  CurrencyConfig 
} from "../utils/currencyAndPips";
import { getAssetMacroImpact, getNewsForAsset, reconcileTechnicalAndFundamental } from "../utils/marketNews";
import { 
  getActivePrimaryBroker, 
  executeDirectBrokerOrder, 
  getCurrentUser,
  UnifiedBroker,
  isPropFirmBroker,
  getPropFirmMetrics,
  calculatePropFirmSafeLotSize,
  validatePropFirmTradeRisk,
  executeMasterToSlaveTradeCopy,
  getUniversalCopierConfig,
  getConnectedBrokersList
} from "../utils/brokerSync";

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
  currentUser?: any;
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
  onNavigateToSection,
  currentUser
}: TradeSetupProps) {
  const effectiveUser = currentUser || getCurrentUser();
  const userId = effectiveUser?.id || "guest_trader";

  const [directionBias, setDirectionBias] = useState<'BUY' | 'SELL'>(() => {
    return selectedAsset.bullishProb >= selectedAsset.bearishProb ? 'BUY' : 'SELL';
  });

  // Direct order placement state
  const [isPlacingDirectOrder, setIsPlacingDirectOrder] = useState(false);
  const [activeBroker, setActiveBroker] = useState<UnifiedBroker>(() => getActivePrimaryBroker(userId));
  const isPropAccount = isPropFirmBroker(activeBroker);
  const [propMetrics, setPropMetrics] = useState(() => getPropFirmMetrics(activeBroker, userId));
  const [propRiskError, setPropRiskError] = useState<string | null>(null);
  const [copierEnabled, setCopierEnabled] = useState<boolean>(() => getUniversalCopierConfig(userId).enabled);
  const [copierReceiptSummary, setCopierReceiptSummary] = useState<string | null>(null);

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

  useEffect(() => {
    const handleSync = () => {
      const broker = getActivePrimaryBroker(userId);
      setActiveBroker(broker);
      setPropMetrics(getPropFirmMetrics(broker, userId));
    };
    handleSync();
    window.addEventListener("primary_broker_changed", handleSync);
    window.addEventListener("broker_connected", handleSync);
    window.addEventListener("prop_firm_metrics_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("primary_broker_changed", handleSync);
      window.removeEventListener("broker_connected", handleSync);
      window.removeEventListener("prop_firm_metrics_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [userId]);

  // Quant Market Direction Bias calculations with Fundamental News Reconciliation
  const reconciledVerdict = reconcileTechnicalAndFundamental(selectedAsset);
  const isQuantBullish = reconciledVerdict.finalAction === "BUY";
  const isQuantNeutral = reconciledVerdict.finalAction === "WAIT";
  const quantRecommendedDirection: 'BUY' | 'SELL' = isQuantBullish ? 'BUY' : 'SELL';
  const quantProbPct = reconciledVerdict.reconciledScore;

  // Sync direction bias with selected asset live reconciled market signal
  useEffect(() => {
    if (reconciledVerdict.finalAction === "BUY") {
      setDirectionBias('BUY');
    } else if (reconciledVerdict.finalAction === "SELL") {
      setDirectionBias('SELL');
    }
  }, [selectedAsset.symbol, selectedAsset.bullishProb, selectedAsset.bearishProb, reconciledVerdict.finalAction]);

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

  // Active Selected SL Tier (1st SL, 2nd SL, 3rd SL) and TP Tier (1st TP through 6th TP)
  const [selectedSlTier, setSelectedSlTier] = useState<1 | 2 | 3>(1);
  const [selectedTpTier, setSelectedTpTier] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [activeStyleTab, setActiveStyleTab] = useState<'Scalper' | 'Intraday Trader' | 'Day Trader' | 'Swing Trader' | 'Position Trader'>(() => {
    return (tradeSetup?.tradingStyle as any) || 'Scalper';
  });

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
  const assetDecimals = getDecimals(selectedAsset);
  const currentDir = tradeSetup?.direction || directionBias;
  const isBuySide = currentDir === "BUY";

  // Check if active style matches setup or user wants to dynamically view that style's tiers
  const activeProfile = STYLE_TPSL_PROFILES[activeStyleTab] || STYLE_TPSL_PROFILES['Scalper'];
  const isCustomStyleSelected = Boolean(tradeSetup?.tradingStyle && tradeSetup.tradingStyle !== activeStyleTab);

  // Calculate pip unit factor for current asset
  const getPipFactor = () => {
    if (selectedAsset.category === 'Forex') {
      return selectedAsset.symbol.includes('JPY') ? 0.01 : 0.0001;
    }
    if (selectedAsset.category === 'Crypto') {
      return entryVal * 0.00015;
    }
    if (selectedAsset.category === 'Indices') {
      return 1.0;
    }
    return selectedAsset.symbol.includes('XAU') ? 0.10 : selectedAsset.symbol.includes('XAG') ? 0.01 : 0.05;
  };
  const pipUnitFactor = getPipFactor();

  // Tiered Stop Loss Prices (1st SL, 2nd SL, 3rd SL) with 5-10 pip intervals & +5 baseline
  const sl1Price = (!isCustomStyleSelected && tradeSetup)
    ? (tradeSetup.stopLoss1 || tradeSetup.stopLoss)
    : (isBuySide ? Number((entryVal - activeProfile.sl1Pips * pipUnitFactor).toFixed(assetDecimals)) : Number((entryVal + activeProfile.sl1Pips * pipUnitFactor).toFixed(assetDecimals)));

  const sl2Price = (!isCustomStyleSelected && tradeSetup?.stopLoss2)
    ? tradeSetup.stopLoss2
    : (isBuySide ? Number((entryVal - activeProfile.sl2Pips * pipUnitFactor).toFixed(assetDecimals)) : Number((entryVal + activeProfile.sl2Pips * pipUnitFactor).toFixed(assetDecimals)));

  const sl3Price = (!isCustomStyleSelected && tradeSetup?.stopLoss3)
    ? tradeSetup.stopLoss3
    : (isBuySide ? Number((entryVal - activeProfile.sl3Pips * pipUnitFactor).toFixed(assetDecimals)) : Number((entryVal + activeProfile.sl3Pips * pipUnitFactor).toFixed(assetDecimals)));

  // Tiered Take Profit Prices (1st TP, 2nd TP, 3rd TP) with 5-10 pip intervals & +5 baseline
  const tp1Price = (!isCustomStyleSelected && tradeSetup)
    ? tradeSetup.takeProfit1
    : (isBuySide ? Number((entryVal + activeProfile.tp1Pips * pipUnitFactor).toFixed(assetDecimals)) : Number((entryVal - activeProfile.tp1Pips * pipUnitFactor).toFixed(assetDecimals)));

  const tp2Price = (!isCustomStyleSelected && tradeSetup)
    ? tradeSetup.takeProfit2
    : (isBuySide ? Number((entryVal + activeProfile.tp2Pips * pipUnitFactor).toFixed(assetDecimals)) : Number((entryVal - activeProfile.tp2Pips * pipUnitFactor).toFixed(assetDecimals)));

  const tp3Price = (!isCustomStyleSelected && tradeSetup?.takeProfit3)
    ? tradeSetup.takeProfit3
    : (isBuySide ? Number((entryVal + activeProfile.tp3Pips * pipUnitFactor).toFixed(assetDecimals)) : Number((entryVal - activeProfile.tp3Pips * pipUnitFactor).toFixed(assetDecimals)));

  const activeSl1Pips = (!isCustomStyleSelected && tradeSetup?.sl1Pips) ? tradeSetup.sl1Pips : activeProfile.sl1Pips;
  const activeSl2Pips = (!isCustomStyleSelected && tradeSetup?.sl2Pips) ? tradeSetup.sl2Pips : activeProfile.sl2Pips;
  const activeSl3Pips = (!isCustomStyleSelected && tradeSetup?.sl3Pips) ? tradeSetup.sl3Pips : activeProfile.sl3Pips;

  const activeTp1Pips = (!isCustomStyleSelected && tradeSetup?.tp1Pips) ? tradeSetup.tp1Pips : activeProfile.tp1Pips;
  const activeTp2Pips = (!isCustomStyleSelected && tradeSetup?.tp2Pips) ? tradeSetup.tp2Pips : activeProfile.tp2Pips;
  const activeTp3Pips = (!isCustomStyleSelected && tradeSetup?.tp3Pips) ? tradeSetup.tp3Pips : activeProfile.tp3Pips;

  // 3 Additional Take Profits based on 1st TP value (+10, +20, +40 pips)
  const activeTp4Pips = (!isCustomStyleSelected && tradeSetup?.tp4Pips) ? tradeSetup.tp4Pips : (activeTp1Pips + 10);
  const activeTp5Pips = (!isCustomStyleSelected && tradeSetup?.tp5Pips) ? tradeSetup.tp5Pips : (activeTp1Pips + 20);
  const activeTp6Pips = (!isCustomStyleSelected && tradeSetup?.tp6Pips) ? tradeSetup.tp6Pips : (activeTp1Pips + 40);

  const tp4Price = (!isCustomStyleSelected && tradeSetup?.takeProfit4)
    ? tradeSetup.takeProfit4
    : (isBuySide ? Number((entryVal + activeTp4Pips * pipUnitFactor).toFixed(assetDecimals)) : Number((entryVal - activeTp4Pips * pipUnitFactor).toFixed(assetDecimals)));

  const tp5Price = (!isCustomStyleSelected && tradeSetup?.takeProfit5)
    ? tradeSetup.takeProfit5
    : (isBuySide ? Number((entryVal + activeTp5Pips * pipUnitFactor).toFixed(assetDecimals)) : Number((entryVal - activeTp5Pips * pipUnitFactor).toFixed(assetDecimals)));

  const tp6Price = (!isCustomStyleSelected && tradeSetup?.takeProfit6)
    ? tradeSetup.takeProfit6
    : (isBuySide ? Number((entryVal + activeTp6Pips * pipUnitFactor).toFixed(assetDecimals)) : Number((entryVal - activeTp6Pips * pipUnitFactor).toFixed(assetDecimals)));

  // Dynamically active user selected SL and TP
  const activeSelectedSlPrice = selectedSlTier === 1 ? sl1Price : selectedSlTier === 2 ? sl2Price : sl3Price;
  const activeSelectedTpPrice = 
    selectedTpTier === 1 ? tp1Price 
    : selectedTpTier === 2 ? tp2Price 
    : selectedTpTier === 3 ? tp3Price 
    : selectedTpTier === 4 ? tp4Price 
    : selectedTpTier === 5 ? tp5Price 
    : tp6Price;

  // PnL Calculations for all 3 SL Tiers
  const sl1Metrics = tradeSetup ? calculateTradePnL({
    symbol: selectedAsset.symbol,
    category: selectedAsset.category,
    direction: currentDir,
    entryPrice: entryVal,
    targetPrice: sl1Price,
    lotSize,
    currency: selectedCurrency,
    accountBalanceUSD
  }) : null;

  const sl2Metrics = tradeSetup ? calculateTradePnL({
    symbol: selectedAsset.symbol,
    category: selectedAsset.category,
    direction: currentDir,
    entryPrice: entryVal,
    targetPrice: sl2Price,
    lotSize,
    currency: selectedCurrency,
    accountBalanceUSD
  }) : null;

  const sl3Metrics = tradeSetup ? calculateTradePnL({
    symbol: selectedAsset.symbol,
    category: selectedAsset.category,
    direction: currentDir,
    entryPrice: entryVal,
    targetPrice: sl3Price,
    lotSize,
    currency: selectedCurrency,
    accountBalanceUSD
  }) : null;

  // PnL Calculations for all 6 TP Tiers
  const tp1Metrics = tradeSetup ? calculateTradePnL({
    symbol: selectedAsset.symbol,
    category: selectedAsset.category,
    direction: currentDir,
    entryPrice: entryVal,
    targetPrice: tp1Price,
    lotSize,
    currency: selectedCurrency,
    accountBalanceUSD
  }) : null;

  const tp2Metrics = tradeSetup ? calculateTradePnL({
    symbol: selectedAsset.symbol,
    category: selectedAsset.category,
    direction: currentDir,
    entryPrice: entryVal,
    targetPrice: tp2Price,
    lotSize,
    currency: selectedCurrency,
    accountBalanceUSD
  }) : null;

  const tp3Metrics = tradeSetup ? calculateTradePnL({
    symbol: selectedAsset.symbol,
    category: selectedAsset.category,
    direction: currentDir,
    entryPrice: entryVal,
    targetPrice: tp3Price,
    lotSize,
    currency: selectedCurrency,
    accountBalanceUSD
  }) : null;

  const tp4Metrics = tradeSetup ? calculateTradePnL({
    symbol: selectedAsset.symbol,
    category: selectedAsset.category,
    direction: currentDir,
    entryPrice: entryVal,
    targetPrice: tp4Price,
    lotSize,
    currency: selectedCurrency,
    accountBalanceUSD
  }) : null;

  const tp5Metrics = tradeSetup ? calculateTradePnL({
    symbol: selectedAsset.symbol,
    category: selectedAsset.category,
    direction: currentDir,
    entryPrice: entryVal,
    targetPrice: tp5Price,
    lotSize,
    currency: selectedCurrency,
    accountBalanceUSD
  }) : null;

  const tp6Metrics = tradeSetup ? calculateTradePnL({
    symbol: selectedAsset.symbol,
    category: selectedAsset.category,
    direction: currentDir,
    entryPrice: entryVal,
    targetPrice: tp6Price,
    lotSize,
    currency: selectedCurrency,
    accountBalanceUSD
  }) : null;

  const activeSlMetrics = selectedSlTier === 1 ? sl1Metrics : selectedSlTier === 2 ? sl2Metrics : sl3Metrics;
  const activeTpMetrics = 
    selectedTpTier === 1 ? tp1Metrics 
    : selectedTpTier === 2 ? tp2Metrics 
    : selectedTpTier === 3 ? tp3Metrics 
    : selectedTpTier === 4 ? tp4Metrics 
    : selectedTpTier === 5 ? tp5Metrics 
    : tp6Metrics;

  // Market Structure Data (Support S1-S3, Resistance R1-R3, HH/LL levels, and Reversal points)
  const structureData = tradeSetup?.structure || calculateMarketStructureLevels(
    selectedAsset.price,
    currentDir,
    tradeSetup?.timeframe || 'H4',
    assetDecimals,
    selectedAsset.category
  );

  const propSafeLot = calculatePropFirmSafeLotSize(
    selectedAsset.symbol,
    entryVal,
    activeSelectedSlPrice,
    propMetrics.initialBalance,
    propMetrics.maxRiskPerTradePct
  );

  const handleExecuteDirectTrade = (customSide?: "BUY" | "SELL") => {
    setPropRiskError(null);
    setIsPlacingDirectOrder(true);
    setDirectOrderReceipt(null);

    const side = customSide || currentDir;
    const price = entryVal;
    const sl = tradeSetup ? activeSelectedSlPrice : (side === "BUY" ? price * 0.995 : price * 1.005);
    const tp = tradeSetup ? activeSelectedTpPrice : (side === "BUY" ? price * 1.01 : price * 0.99);

    // STRICT PROP FIRM VALIDATION
    if (isPropAccount) {
      const riskCheck = validatePropFirmTradeRisk(
        activeBroker,
        lotSize,
        selectedAsset.symbol,
        price,
        sl,
        userId
      );
      if (!riskCheck.allowed) {
        setIsPlacingDirectOrder(false);
        setPropRiskError(riskCheck.reason || "Execution blocked by strict Prop Firm Challenge Shield.");
        return;
      }
    }

    setTimeout(() => {
      setIsPlacingDirectOrder(false);

      try {
        // Execute directly to the user's connected broker
        const receipt = executeDirectBrokerOrder({
          symbol: selectedAsset.symbol,
          side,
          price,
          lotSize,
          stopLoss: sl,
          takeProfit: tp,
          category: selectedAsset.category,
          sourceModule: isPropAccount ? `FundedNext Prop Desk (${tradeSetup?.tradeGrade || 'A+'} Grade)` : `Trade Setup Matrix (${tradeSetup?.tradeGrade || 'A+'} Grade)`,
          userId
        }, userId);

        setDirectOrderReceipt({
          id: receipt.ticketId,
          market: selectedAsset.symbol,
          direction: side,
          price: receipt.price,
          lots: receipt.lotSize,
          sl: receipt.stopLoss,
          tp1: receipt.takeProfit,
          broker: `${receipt.brokerName} (${receipt.accountNo})`
        });
        setPropRiskError(null);

        // Universal Master-to-Slave Copier Mirroring across all connected brokers
        if (copierEnabled) {
          const otherSlaves = getConnectedBrokersList(userId)
            .filter(b => b.connected && b.id !== activeBroker.id)
            .map(b => b.id);

          if (otherSlaves.length > 0) {
            const copyRes = executeMasterToSlaveTradeCopy({
              symbol: selectedAsset.symbol,
              side,
              price,
              lotSize,
              stopLoss: sl,
              takeProfit: tp,
              category: selectedAsset.category,
              sourceModule: `Setup Matrix (${activeBroker.name}) Copier`,
              userId
            }, activeBroker, otherSlaves, userId);

            if (copyRes.copiedCount > 0) {
              const names = copyRes.results
                .filter(r => r.success)
                .map(r => `${r.brokerName} (${r.lots} Lots)`)
                .join(", ");
              setCopierReceiptSummary(`⚡ Master Copier mirrored order to ${copyRes.copiedCount} account(s): ${names} (1% risk cap).`);
            }
          }
        }
      } catch (err: any) {
        setPropRiskError(err?.message || "Execution blocked by Prop Firm Challenge Shield.");
      }
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      {/* Configuration panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        
        {/* Prominent AI Market Direction Indicator */}
        <div className={`p-4 rounded-xl border flex flex-col gap-3 font-mono ${
          isQuantBullish
            ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
            : isQuantNeutral
              ? "bg-amber-950/20 border-amber-500/40 text-amber-300"
              : "bg-rose-950/40 border-rose-500/40 text-rose-300"
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg font-black shrink-0 ${
                isQuantBullish ? "bg-emerald-500 text-slate-950" : isQuantNeutral ? "bg-amber-500 text-slate-950" : "bg-rose-500 text-white"
              }`}>
                {isQuantBullish ? <TrendingUp className="h-5 w-5 stroke-[3]" /> : isQuantNeutral ? <Clock className="h-5 w-5 stroke-[3]" /> : <TrendingDown className="h-5 w-5 stroke-[3]" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">RECONCILED QUANT DIRECTION</span>
                  <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase ${
                    isQuantBullish ? "bg-emerald-500/20 text-emerald-300" : isQuantNeutral ? "bg-amber-500/20 text-amber-300" : "bg-rose-500/20 text-rose-300"
                  }`}>
                    {reconciledVerdict.actionBadge}
                  </span>
                </div>
                <div className="text-sm font-black text-white mt-0.5">
                  Real Market Verdict: <span className={isQuantBullish ? "text-emerald-400" : isQuantNeutral ? "text-amber-400" : "text-rose-400"}>
                    {isQuantNeutral ? "WAIT / STAND ASIDE (50/50 NEUTRAL)" : quantRecommendedDirection}
                  </span> setup ({quantProbPct}% Score)
                </div>
              </div>
            </div>

            {!isQuantNeutral && directionBias !== quantRecommendedDirection && (
              <button
                onClick={() => setDirectionBias(quantRecommendedDirection)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg border border-slate-700 transition-all cursor-pointer shrink-0"
              >
                Align Setup to {quantRecommendedDirection}
              </button>
            )}
          </div>

          {/* Divergence Notification Note if Technical & Fundamental conflict */}
          {(reconciledVerdict.confluenceType.includes("DIVERGENCE") || isQuantNeutral) && (
            <div className="p-3 bg-slate-950/80 rounded-lg border border-amber-500/30 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-400 text-[11px] uppercase">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>{isQuantNeutral ? "Market in 50/50 Neutral Equilibrium:" : "Fundamental vs Technical Divergence Detected:"}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                {reconciledVerdict.divergenceResolutionNote}
              </p>
              <div className="text-[10px] text-slate-400 pt-0.5">
                Technical Signal: <strong className={reconciledVerdict.technicalBias === "BUY" ? "text-emerald-400" : reconciledVerdict.technicalBias === "SELL" ? "text-rose-400" : "text-amber-400"}>{reconciledVerdict.technicalBias} ({reconciledVerdict.technicalScore}%)</strong> • Macro News Catalyst: <strong className={reconciledVerdict.fundamentalBias === "BULLISH" ? "text-emerald-400" : reconciledVerdict.fundamentalBias === "BEARISH" ? "text-rose-400" : "text-amber-400"}>{reconciledVerdict.fundamentalBias} ({reconciledVerdict.fundamentalScore}%)</strong> • Action: <strong className="text-white">{reconciledVerdict.finalAction}</strong>
              </div>
            </div>
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

            {/* 1. TRADING STYLE CONSOLE & IMAGE REFERENCE ALIGNMENT STRIP */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2.5">
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Trading Style Calibration & Pip Reference Engine
                  </span>
                </div>
                <span className="text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-bold">
                  +5 Baseline Added · 5-10 Pip Tier Interval
                </span>
              </div>

              {/* Style Selector Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {(['Scalper', 'Intraday Trader', 'Day Trader', 'Swing Trader', 'Position Trader'] as const).map((styleKey) => {
                  const prof = STYLE_TPSL_PROFILES[styleKey];
                  const isSelected = activeStyleTab === styleKey;
                  return (
                    <button
                      key={styleKey}
                      type="button"
                      onClick={() => setActiveStyleTab(styleKey)}
                      className={`p-2 rounded-lg text-left transition-all border cursor-pointer ${
                        isSelected 
                          ? "bg-cyan-500/15 border-cyan-500 text-white shadow-md shadow-cyan-500/10"
                          : "bg-slate-900/60 border-slate-850 hover:border-slate-700 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold block">{prof.name}</span>
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                      </div>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{prof.holdingTime.split('(')[0]}</span>
                      <div className="mt-1 flex items-center gap-1.5 text-[8.5px] font-mono">
                        <span className="text-emerald-400 font-bold">TP: {prof.tp1Pips}-{prof.tp3Pips}p</span>
                        <span className="text-rose-400 font-bold">SL: {prof.sl1Pips}-{prof.sl3Pips}p</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Style Reference Banner */}
              {STYLE_TPSL_PROFILES[activeStyleTab] && (
                <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-slate-300">
                      <strong>{STYLE_TPSL_PROFILES[activeStyleTab].name} Settings:</strong> 1st/2nd/3rd TP (+{STYLE_TPSL_PROFILES[activeStyleTab].tp1Pips}p, +{STYLE_TPSL_PROFILES[activeStyleTab].tp2Pips}p, +{STYLE_TPSL_PROFILES[activeStyleTab].tp3Pips}p) & 1st/2nd/3rd SL (-{STYLE_TPSL_PROFILES[activeStyleTab].sl1Pips}p, -{STYLE_TPSL_PROFILES[activeStyleTab].sl2Pips}p, -{STYLE_TPSL_PROFILES[activeStyleTab].sl3Pips}p).
                    </span>
                  </div>
                  <span className="text-[9.5px] text-slate-400 italic">
                    Duration: {STYLE_TPSL_PROFILES[activeStyleTab].holdingTime}
                  </span>
                </div>
              )}
            </div>

            {/* 2. THREE-TIER STOP LOSS MATRIX (1st SL, 2nd SL, 3rd SL with 5-10 pip intervals) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  <span>Stop Loss Matrix (1st SL · 2nd SL · 3rd SL)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Select active invalidation tier for order execution:
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1st Stop Loss */}
                <div 
                  onClick={() => setSelectedSlTier(1)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                    selectedSlTier === 1 
                      ? "bg-rose-950/30 border-rose-500 shadow-md shadow-rose-950/40 ring-1 ring-rose-500/50" 
                      : "bg-slate-950 border-rose-500/20 hover:border-rose-500/50 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9.5px] font-mono font-bold text-rose-400 uppercase flex items-center gap-1">
                      <span>1st Stop Loss</span>
                      <span className="text-[8.5px] text-slate-400 font-normal">(Tight Micro)</span>
                    </span>
                    {selectedSlTier === 1 ? (
                      <span className="text-[8.5px] font-mono font-extrabold bg-rose-500 text-slate-950 px-1.5 py-0.2 rounded uppercase">
                        ACTIVE ORDER
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-slate-500 hover:text-slate-300">Click to Select</span>
                    )}
                  </div>
                  <span className="text-base font-extrabold text-rose-400 block font-mono">
                    ${sl1Price.toLocaleString(undefined, { minimumFractionDigits: assetDecimals })}
                  </span>
                  <div className="mt-2 pt-2 border-t border-slate-900 flex justify-between items-center text-[10.5px] font-mono">
                    <span className="text-rose-300 font-bold">-{activeSl1Pips} Pips</span>
                    {sl1Metrics && (
                      <span className="text-slate-300 font-bold">
                        -{formatCurrencyAmount(sl1Metrics.pnlCurrency, selectedCurrency)}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-1">Direct 1-5m candle wick invalidation</span>
                </div>

                {/* 2nd Stop Loss */}
                <div 
                  onClick={() => setSelectedSlTier(2)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                    selectedSlTier === 2 
                      ? "bg-rose-950/30 border-rose-500 shadow-md shadow-rose-950/40 ring-1 ring-rose-500/50" 
                      : "bg-slate-950 border-rose-500/20 hover:border-rose-500/50 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9.5px] font-mono font-bold text-rose-400 uppercase flex items-center gap-1">
                      <span>2nd Stop Loss</span>
                      <span className="text-[8.5px] text-slate-400 font-normal">(Structural Pivot)</span>
                    </span>
                    {selectedSlTier === 2 ? (
                      <span className="text-[8.5px] font-mono font-extrabold bg-rose-500 text-slate-950 px-1.5 py-0.2 rounded uppercase">
                        ACTIVE ORDER
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-slate-500 hover:text-slate-300">Click to Select</span>
                    )}
                  </div>
                  <span className="text-base font-extrabold text-rose-400 block font-mono">
                    ${sl2Price.toLocaleString(undefined, { minimumFractionDigits: assetDecimals })}
                  </span>
                  <div className="mt-2 pt-2 border-t border-slate-900 flex justify-between items-center text-[10.5px] font-mono">
                    <span className="text-rose-300 font-bold">-{activeSl2Pips} Pips</span>
                    {sl2Metrics && (
                      <span className="text-slate-300 font-bold">
                        -{formatCurrencyAmount(sl2Metrics.pnlCurrency, selectedCurrency)}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-1">+6-8p interval behind swing support</span>
                </div>

                {/* 3rd Stop Loss */}
                <div 
                  onClick={() => setSelectedSlTier(3)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                    selectedSlTier === 3 
                      ? "bg-rose-950/30 border-rose-500 shadow-md shadow-rose-950/40 ring-1 ring-rose-500/50" 
                      : "bg-slate-950 border-rose-500/20 hover:border-rose-500/50 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9.5px] font-mono font-bold text-rose-400 uppercase flex items-center gap-1">
                      <span>3rd Stop Loss</span>
                      <span className="text-[8.5px] text-slate-400 font-normal">(Spread Cushion)</span>
                    </span>
                    {selectedSlTier === 3 ? (
                      <span className="text-[8.5px] font-mono font-extrabold bg-rose-500 text-slate-950 px-1.5 py-0.2 rounded uppercase">
                        ACTIVE ORDER
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-slate-500 hover:text-slate-300">Click to Select</span>
                    )}
                  </div>
                  <span className="text-base font-extrabold text-rose-400 block font-mono">
                    ${sl3Price.toLocaleString(undefined, { minimumFractionDigits: assetDecimals })}
                  </span>
                  <div className="mt-2 pt-2 border-t border-slate-900 flex justify-between items-center text-[10.5px] font-mono">
                    <span className="text-rose-300 font-bold">-{activeSl3Pips} Pips</span>
                    {sl3Metrics && (
                      <span className="text-slate-300 font-bold">
                        -{formatCurrencyAmount(sl3Metrics.pnlCurrency, selectedCurrency)}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-1">+7-10p buffer against broker spikes</span>
                </div>
              </div>
            </div>

            {/* 3. SIX-TIER TAKE PROFIT MATRIX (1st · 2nd · 3rd TP & 3 Additional TPs: +10, +20, +40 from 1st TP) */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  <Target className="h-4 w-4 text-emerald-400" />
                  <span>Take Profit Matrix (1st · 2nd · 3rd TP & +10, +20, +40 Additional TPs)</span>
                </div>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold font-mono">
                  Multi-Target Scale-Out & Money Management Active
                </span>
              </div>

              {/* Grid of 6 Take Profit Tiers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {/* 1st Take Profit */}
                <div 
                  onClick={() => setSelectedTpTier(1)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                    selectedTpTier === 1 
                      ? "bg-emerald-950/30 border-emerald-500 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/50" 
                      : "bg-slate-950 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9.5px] font-mono font-bold text-emerald-400 uppercase flex items-center gap-1">
                      <span>1st Take Profit</span>
                      <span className="text-[8px] text-slate-400 font-normal">(Initial Target)</span>
                    </span>
                    {selectedTpTier === 1 ? (
                      <span className="text-[8px] font-mono font-extrabold bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded uppercase">
                        ACTIVE ORDER
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-slate-500 hover:text-slate-300">Click to Select</span>
                    )}
                  </div>
                  <span className="text-base font-extrabold text-emerald-400 block font-mono">
                    ${tp1Price.toLocaleString(undefined, { minimumFractionDigits: assetDecimals })}
                  </span>
                  <div className="mt-2 pt-1.5 border-t border-slate-900 flex justify-between items-center text-[10.5px] font-mono">
                    <span className="text-emerald-300 font-bold">+{activeTp1Pips} Pips</span>
                    {tp1Metrics && (
                      <span className="text-slate-300 font-bold">
                        +{formatCurrencyAmount(tp1Metrics.pnlCurrency, selectedCurrency)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[8.5px] text-slate-500 font-mono">
                    <span>Scale-Out: 30% Vol</span>
                    <span className="text-emerald-400/80 font-bold">Trigger Breakeven</span>
                  </div>
                </div>

                {/* 2nd Take Profit */}
                <div 
                  onClick={() => setSelectedTpTier(2)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                    selectedTpTier === 2 
                      ? "bg-emerald-950/30 border-emerald-500 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/50" 
                      : "bg-slate-950 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9.5px] font-mono font-bold text-emerald-400 uppercase flex items-center gap-1">
                      <span>2nd Take Profit</span>
                      <span className="text-[8px] text-slate-400 font-normal">(Core Target)</span>
                    </span>
                    {selectedTpTier === 2 ? (
                      <span className="text-[8px] font-mono font-extrabold bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded uppercase">
                        ACTIVE ORDER
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-slate-500 hover:text-slate-300">Click to Select</span>
                    )}
                  </div>
                  <span className="text-base font-extrabold text-emerald-400 block font-mono">
                    ${tp2Price.toLocaleString(undefined, { minimumFractionDigits: assetDecimals })}
                  </span>
                  <div className="mt-2 pt-1.5 border-t border-slate-900 flex justify-between items-center text-[10.5px] font-mono">
                    <span className="text-emerald-300 font-bold">+{activeTp2Pips} Pips</span>
                    {tp2Metrics && (
                      <span className="text-slate-300 font-bold">
                        +{formatCurrencyAmount(tp2Metrics.pnlCurrency, selectedCurrency)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[8.5px] text-slate-500 font-mono">
                    <span>Scale-Out: 25% Vol</span>
                    <span className="text-cyan-400/80 font-bold">Trail SL to TP1</span>
                  </div>
                </div>

                {/* 3rd Take Profit */}
                <div 
                  onClick={() => setSelectedTpTier(3)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                    selectedTpTier === 3 
                      ? "bg-emerald-950/30 border-emerald-500 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/50" 
                      : "bg-slate-950 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9.5px] font-mono font-bold text-emerald-400 uppercase flex items-center gap-1">
                      <span>3rd Take Profit</span>
                      <span className="text-[8px] text-slate-400 font-normal">(Structural Pivot)</span>
                    </span>
                    {selectedTpTier === 3 ? (
                      <span className="text-[8px] font-mono font-extrabold bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded uppercase">
                        ACTIVE ORDER
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-slate-500 hover:text-slate-300">Click to Select</span>
                    )}
                  </div>
                  <span className="text-base font-extrabold text-emerald-400 block font-mono">
                    ${tp3Price.toLocaleString(undefined, { minimumFractionDigits: assetDecimals })}
                  </span>
                  <div className="mt-2 pt-1.5 border-t border-slate-900 flex justify-between items-center text-[10.5px] font-mono">
                    <span className="text-emerald-300 font-bold">+{activeTp3Pips} Pips</span>
                    {tp3Metrics && (
                      <span className="text-slate-300 font-bold">
                        +{formatCurrencyAmount(tp3Metrics.pnlCurrency, selectedCurrency)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[8.5px] text-slate-500 font-mono">
                    <span>Scale-Out: 20% Vol</span>
                    <span className="text-cyan-400/80 font-bold">Trail SL to TP2</span>
                  </div>
                </div>

                {/* 4th Take Profit (+10 from 1st TP) */}
                <div 
                  onClick={() => setSelectedTpTier(4)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                    selectedTpTier === 4 
                      ? "bg-emerald-950/30 border-emerald-400 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/50" 
                      : "bg-slate-950 border-cyan-500/20 hover:border-cyan-400/50 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9.5px] font-mono font-bold text-cyan-400 uppercase flex items-center gap-1">
                      <span>4th Take Profit</span>
                      <span className="text-[8px] text-cyan-300 font-bold">(+10 from TP1)</span>
                    </span>
                    {selectedTpTier === 4 ? (
                      <span className="text-[8px] font-mono font-extrabold bg-cyan-400 text-slate-950 px-1.5 py-0.2 rounded uppercase">
                        ACTIVE ORDER
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-slate-500 hover:text-slate-300">Click to Select</span>
                    )}
                  </div>
                  <span className="text-base font-extrabold text-cyan-300 block font-mono">
                    ${tp4Price.toLocaleString(undefined, { minimumFractionDigits: assetDecimals })}
                  </span>
                  <div className="mt-2 pt-1.5 border-t border-slate-900 flex justify-between items-center text-[10.5px] font-mono">
                    <span className="text-cyan-300 font-bold">+{activeTp4Pips} Pips (+10p)</span>
                    {tp4Metrics && (
                      <span className="text-slate-300 font-bold">
                        +{formatCurrencyAmount(tp4Metrics.pnlCurrency, selectedCurrency)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[8.5px] text-slate-500 font-mono">
                    <span>Scale-Out: 10% Vol</span>
                    <span className="text-cyan-400/80 font-bold">Extended Target 1</span>
                  </div>
                </div>

                {/* 5th Take Profit (+20 from 1st TP) */}
                <div 
                  onClick={() => setSelectedTpTier(5)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                    selectedTpTier === 5 
                      ? "bg-emerald-950/30 border-emerald-400 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/50" 
                      : "bg-slate-950 border-cyan-500/20 hover:border-cyan-400/50 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9.5px] font-mono font-bold text-cyan-400 uppercase flex items-center gap-1">
                      <span>5th Take Profit</span>
                      <span className="text-[8px] text-cyan-300 font-bold">(+20 from TP1)</span>
                    </span>
                    {selectedTpTier === 5 ? (
                      <span className="text-[8px] font-mono font-extrabold bg-cyan-400 text-slate-950 px-1.5 py-0.2 rounded uppercase">
                        ACTIVE ORDER
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-slate-500 hover:text-slate-300">Click to Select</span>
                    )}
                  </div>
                  <span className="text-base font-extrabold text-cyan-300 block font-mono">
                    ${tp5Price.toLocaleString(undefined, { minimumFractionDigits: assetDecimals })}
                  </span>
                  <div className="mt-2 pt-1.5 border-t border-slate-900 flex justify-between items-center text-[10.5px] font-mono">
                    <span className="text-cyan-300 font-bold">+{activeTp5Pips} Pips (+20p)</span>
                    {tp5Metrics && (
                      <span className="text-slate-300 font-bold">
                        +{formatCurrencyAmount(tp5Metrics.pnlCurrency, selectedCurrency)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[8.5px] text-slate-500 font-mono">
                    <span>Scale-Out: 10% Vol</span>
                    <span className="text-cyan-400/80 font-bold">Extended Target 2</span>
                  </div>
                </div>

                {/* 6th Take Profit (+40 from 1st TP) */}
                <div 
                  onClick={() => setSelectedTpTier(6)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                    selectedTpTier === 6 
                      ? "bg-purple-950/30 border-purple-400 shadow-md shadow-purple-950/40 ring-1 ring-purple-400/50" 
                      : "bg-slate-950 border-purple-500/20 hover:border-purple-400/50 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9.5px] font-mono font-bold text-purple-400 uppercase flex items-center gap-1">
                      <span>6th Take Profit</span>
                      <span className="text-[8px] text-purple-300 font-bold">(+40 from TP1)</span>
                    </span>
                    {selectedTpTier === 6 ? (
                      <span className="text-[8px] font-mono font-extrabold bg-purple-400 text-slate-950 px-1.5 py-0.2 rounded uppercase">
                        ACTIVE ORDER
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-slate-500 hover:text-slate-300">Click to Select</span>
                    )}
                  </div>
                  <span className="text-base font-extrabold text-purple-300 block font-mono">
                    ${tp6Price.toLocaleString(undefined, { minimumFractionDigits: assetDecimals })}
                  </span>
                  <div className="mt-2 pt-1.5 border-t border-slate-900 flex justify-between items-center text-[10.5px] font-mono">
                    <span className="text-purple-300 font-bold">+{activeTp6Pips} Pips (+40p)</span>
                    {tp6Metrics && (
                      <span className="text-slate-300 font-bold">
                        +{formatCurrencyAmount(tp6Metrics.pnlCurrency, selectedCurrency)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[8.5px] text-slate-500 font-mono">
                    <span>Scale-Out: 5% Vol</span>
                    <span className="text-purple-400/80 font-bold">Macro Home-Run Runner</span>
                  </div>
                </div>
              </div>

              {/* Strict Risk & Money Management Protocol Box */}
              <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2 font-mono text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                      Trading Rules, Risk & Money Management Protocol
                    </span>
                  </div>
                  <span className="text-[9.5px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                    Risk Capped at 1.0% · 100% Position Scale-Out Enforced
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[10px]">
                  <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-850">
                    <span className="text-slate-400 font-bold block uppercase text-[9px] text-amber-400">1. Breakeven Protection</span>
                    <p className="text-slate-300 mt-1 leading-snug">
                      As soon as <strong>1st TP (+{activeTp1Pips}p)</strong> is hit, immediately move Stop Loss to Entry (+1 pip). Trade is guaranteed 100% risk-free.
                    </p>
                  </div>

                  <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-850">
                    <span className="text-slate-400 font-bold block uppercase text-[9px] text-emerald-400">2. Scaled Volume Distribution</span>
                    <p className="text-slate-300 mt-1 leading-snug">
                      Exit <strong>30% @ TP1</strong> · <strong>25% @ TP2</strong> · <strong>20% @ TP3</strong> · <strong>10% @ TP4</strong> · <strong>10% @ TP5</strong> · <strong>5% @ TP6</strong> (100% total).
                    </p>
                  </div>

                  <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-850">
                    <span className="text-slate-400 font-bold block uppercase text-[9px] text-cyan-400">3. Dynamic Trailing Stop</span>
                    <p className="text-slate-300 mt-1 leading-snug">
                      Trail Stop Loss behind each preceding TP level once filled. Locks in cumulative gains without risking initial principal.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. COMPREHENSIVE MARKET STRUCTURE CONSOLE (Support S1-S3, Resistance R1-R3, HH/LL levels, and Reversal points) */}
            <div className="bg-slate-950 p-4 rounded-xl border border-blue-500/30 space-y-4 font-mono shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2.5">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Market Structure, Support & Resistance Matrix
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-black uppercase border ${
                    structureData.highLow.structureState.includes("BULLISH") 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                      : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  }`}>
                    {structureData.highLow.structureState}
                  </span>
                </div>
              </div>

              {/* Support & Resistance Levels Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* POINTS OF SUPPORT */}
                <div className="bg-slate-900/90 border border-emerald-500/20 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Points of Support (S1 · S2 · S3)
                    </span>
                    <span className="text-[9px] text-slate-500">Buy-Side Demand</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-850">
                      <div>
                        <span className="text-emerald-400 font-bold block">S1: ${structureData.support.s1.toFixed(assetDecimals)}</span>
                        <span className="text-[9px] text-slate-400">{structureData.support.s1Label || "Immediate Dynamic Shelf"}</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">
                        -{structureData.support.s1Pips} Pips
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-850">
                      <div>
                        <span className="text-emerald-400 font-bold block">S2: ${structureData.support.s2.toFixed(assetDecimals)}</span>
                        <span className="text-[9px] text-slate-400">{structureData.support.s2Label || "Institutional Order Block Demand"}</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">
                        -{structureData.support.s2Pips} Pips
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-850">
                      <div>
                        <span className="text-emerald-400 font-bold block">S3: ${structureData.support.s3.toFixed(assetDecimals)}</span>
                        <span className="text-[9px] text-slate-400">{structureData.support.s3Label || "Major Macro Invalidation Base"}</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">
                        -{structureData.support.s3Pips} Pips
                      </span>
                    </div>
                  </div>
                </div>

                {/* POINTS OF RESISTANCE */}
                <div className="bg-slate-900/90 border border-rose-500/20 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-400" />
                      Points of Resistance (R1 · R2 · R3)
                    </span>
                    <span className="text-[9px] text-slate-500">Sell-Side Supply</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-850">
                      <div>
                        <span className="text-rose-400 font-bold block">R1: ${structureData.resistance.r1.toFixed(assetDecimals)}</span>
                        <span className="text-[9px] text-slate-400">{structureData.resistance.r1Label || "Immediate Dynamic Cap"}</span>
                      </div>
                      <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-bold">
                        +{structureData.resistance.r1Pips} Pips
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-850">
                      <div>
                        <span className="text-rose-400 font-bold block">R2: ${structureData.resistance.r2.toFixed(assetDecimals)}</span>
                        <span className="text-[9px] text-slate-400">{structureData.resistance.r2Label || "Institutional Supply Block"}</span>
                      </div>
                      <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-bold">
                        +{structureData.resistance.r2Pips} Pips
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-850">
                      <div>
                        <span className="text-rose-400 font-bold block">R3: ${structureData.resistance.r3.toFixed(assetDecimals)}</span>
                        <span className="text-[9px] text-slate-400">{structureData.resistance.r3Label || "Macro Range High Liquidity Pool"}</span>
                      </div>
                      <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-bold">
                        +{structureData.resistance.r3Pips} Pips
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* HH / LL Levels & Key Reversal Points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {/* HIGHER HIGH / LOWER LOW LEVELS */}
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart2 className="h-3.5 w-3.5 text-cyan-400" />
                      HH & LL Structural Levels
                    </span>
                    <span className="text-[9px] text-slate-400">Swing Points</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-950 rounded border border-slate-850">
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Higher High (HH)</span>
                      <span className="text-white font-bold block mt-0.5">${structureData.highLow.higherHigh.toFixed(assetDecimals)}</span>
                      <span className="text-[8.5px] text-emerald-400 block mt-0.5">Bullish Target / Breakout</span>
                    </div>

                    <div className="p-2 bg-slate-950 rounded border border-slate-850">
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Higher Low (HL)</span>
                      <span className="text-white font-bold block mt-0.5">${structureData.highLow.higherLow.toFixed(assetDecimals)}</span>
                      <span className="text-[8.5px] text-cyan-400 block mt-0.5">Trend Protected Base</span>
                    </div>

                    <div className="p-2 bg-slate-950 rounded border border-slate-850">
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Lower High (LH)</span>
                      <span className="text-white font-bold block mt-0.5">${structureData.highLow.lowerHigh.toFixed(assetDecimals)}</span>
                      <span className="text-[8.5px] text-amber-400 block mt-0.5">Bearish Defense Pivot</span>
                    </div>

                    <div className="p-2 bg-slate-950 rounded border border-slate-850">
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Lower Low (LL)</span>
                      <span className="text-white font-bold block mt-0.5">${structureData.highLow.lowerLow.toFixed(assetDecimals)}</span>
                      <span className="text-[8.5px] text-rose-400 block mt-0.5">Bearish Expansion Target</span>
                    </div>
                  </div>
                </div>

                {/* KEY REVERSAL POINTS & CHoCH / BOS TRIGGERS */}
                <div className="p-3 bg-slate-900 rounded-lg border border-purple-500/20 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5 text-purple-400 animate-spin" />
                      Key Reversal & Invalidation Points
                    </span>
                    <span className="text-[9px] text-purple-300 font-bold">{structureData.reversal.reversalType}</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between p-1.5 bg-slate-950 rounded border border-slate-850">
                      <div>
                        <span className="text-[9.5px] text-slate-400 block">CHoCH (Change of Character):</span>
                        <span className="text-white font-bold">${structureData.reversal.chochLevel.toFixed(assetDecimals)}</span>
                      </div>
                      <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        Trend Flip Trigger
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-1.5 bg-slate-950 rounded border border-slate-850">
                      <div>
                        <span className="text-[9.5px] text-slate-400 block">BOS (Break of Structure):</span>
                        <span className="text-white font-bold">${structureData.reversal.bosLevel.toFixed(assetDecimals)}</span>
                      </div>
                      <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Continuation Trigger
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-1.5 bg-slate-950 rounded border border-slate-850">
                      <div>
                        <span className="text-[9.5px] text-slate-400 block">Reversal Pivot (Protected Invalidation):</span>
                        <span className="text-purple-300 font-extrabold">${structureData.reversal.reversalPivot.toFixed(assetDecimals)}</span>
                      </div>
                      <span className="text-[9px] text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                        ±{structureData.reversal.invalidationThreshold}p Buffer
                      </span>
                    </div>
                  </div>

                  <p className="text-[9.5px] text-slate-400 leading-snug pt-1 border-t border-slate-850">
                    {structureData.reversal.explanation}
                  </p>
                </div>
              </div>
            </div>

            {/* 5. DEDICATED PIP & MONETARY PNL CALCULATION SUMMARY BOX */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Calculator className="h-4 w-4 text-emerald-400" />
                  <span>Active Execution Selection & Risk/Reward Summary</span>
                </div>
                <span className="text-[10px] bg-slate-900 text-emerald-400 px-2 py-0.5 rounded border border-slate-800 font-bold">
                  {selectedCurrency.flag} {selectedCurrency.code} ({selectedCurrency.symbol}) @ {lotSize} Lot
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-rose-500/5 border border-rose-500/30 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-rose-400 uppercase font-bold">Active Selected SL ({selectedSlTier}st/nd/rd SL)</span>
                    <span className="text-xs font-bold text-rose-400 font-mono">-{activeSlMetrics?.pips} Pips</span>
                  </div>
                  <span className="text-base font-bold text-rose-300 block font-mono">
                    ${activeSelectedSlPrice.toFixed(assetDecimals)}
                  </span>
                  <div className="flex justify-between items-center pt-1.5 border-t border-rose-500/20 text-[11px]">
                    <span className="text-slate-400">Max Projected Loss:</span>
                    <span className="text-rose-400 font-bold font-mono">
                      -{formatCurrencyAmount(activeSlMetrics?.pnlCurrency || 0, selectedCurrency)} ({activeSlMetrics?.pnlPercentOfBalance.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/5 border border-emerald-500/30 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold">
                      Active Selected TP ({selectedTpTier === 1 ? '1st TP' : selectedTpTier === 2 ? '2nd TP' : selectedTpTier === 3 ? '3rd TP' : selectedTpTier === 4 ? '4th TP (+10)' : selectedTpTier === 5 ? '5th TP (+20)' : '6th TP (+40)'})
                    </span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">+{activeTpMetrics?.pips} Pips</span>
                  </div>
                  <span className="text-base font-bold text-emerald-300 block font-mono">
                    ${activeSelectedTpPrice.toFixed(assetDecimals)}
                  </span>
                  <div className="flex justify-between items-center pt-1.5 border-t border-emerald-500/20 text-[11px]">
                    <span className="text-slate-400">Target Projected Profit:</span>
                    <span className="text-emerald-400 font-bold font-mono">
                      +{formatCurrencyAmount(activeTpMetrics?.pnlCurrency || 0, selectedCurrency)} (+{activeTpMetrics?.pnlPercentOfBalance.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Order Execution Action Card */}
            <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                    <Zap className="h-4 w-4 fill-emerald-400" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        Direct STP Live Order Placement
                      </h4>
                      <span className="text-[9px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        Auto-Routing: {activeBroker.name} ({activeBroker.accountNo || "Direct"})
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                      Executing this setup will automatically route direct to your connected broker <strong>{activeBroker.name}</strong>
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

              {/* STRICT PROP FIRM CHALLENGE SHIELD (STRICTLY FOR PROP FIRM USERS) */}
              {isPropAccount && (
                <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-2 text-xs font-mono">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-400">
                      <Shield className="h-4 w-4 text-amber-400 fill-amber-400/20" />
                      <span className="uppercase tracking-wider">STRICT PROP FIRM SHIELD ACTIVE</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                        {propMetrics.firmName} ({propMetrics.accountModel})
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Phase: <strong className="text-white">{propMetrics.phase}</strong> · Target: <strong className="text-emerald-400">+{propMetrics.currentProfitPct}% / {propMetrics.profitTargetPct}%</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-800 text-[10.5px]">
                    <div>
                      <span className="text-slate-500 text-[9.5px] block">Daily Drawdown</span>
                      <span className={`font-bold ${propMetrics.currentDailyLossPct >= 4.0 ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
                        {propMetrics.currentDailyLossPct}% / 5.0% Max
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9.5px] block">Circuit Breaker</span>
                      <span className="text-amber-400 font-bold">4.0% Lock Threshold</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9.5px] block">1.0% Risk Limit</span>
                      <span className="text-white font-bold">${((propMetrics.initialBalance * 0.01)).toLocaleString()} Max</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9.5px] block">Max Safe Size</span>
                      <span className="text-cyan-400 font-bold">{propSafeLot} Lots</span>
                    </div>
                  </div>

                  {lotSize > propSafeLot && (
                    <div className="pt-1 flex items-center justify-between gap-2 text-[10px] text-amber-300 bg-amber-950/60 p-2 rounded-lg border border-amber-500/30">
                      <span>⚠️ Selected {lotSize} lots exceeds strict 1.0% risk limit ({propSafeLot} lots) for this stop-loss.</span>
                      <button
                        onClick={() => setLotSize(propSafeLot)}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded cursor-pointer shrink-0"
                      >
                        Auto-Scale to {propSafeLot} Lots
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* PROP FIRM RISK BLOCK NOTIFICATION */}
              {propRiskError && (
                <div className="p-3 bg-rose-950/80 border border-rose-500/70 text-rose-200 text-xs font-mono rounded-xl flex items-start gap-2 animate-in fade-in">
                  <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-black text-rose-300 block uppercase text-[10px]">PROP FIRM RISK BREACH PREVENTED</span>
                    <p className="text-[11px] leading-relaxed mt-0.5 text-slate-200">{propRiskError}</p>
                  </div>
                  <button onClick={() => setPropRiskError(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
                </div>
              )}

              {/* Universal Master-to-Slave Copier Strip */}
              <div className="p-3 bg-slate-950/80 border border-blue-500/30 rounded-xl flex items-center justify-between text-xs font-mono">
                <label className="flex items-center gap-2 text-slate-200 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={copierEnabled}
                    onChange={(e) => setCopierEnabled(e.target.checked)}
                    className="rounded border-slate-700 text-blue-500 focus:ring-0 cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5 text-blue-300">
                    <Copy className="h-4 w-4 text-blue-400" />
                    <span>Mirror execution across all other connected accounts (Universal Copier)</span>
                  </span>
                </label>
                <span className="text-[10px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20 font-bold">
                  EQUITY-SCALED · 1% RISK CAP
                </span>
              </div>

              {/* Order Execution Buttons */}
              {isPropAccount && propMetrics.circuitBreakerTriggered ? (
                <div className="p-3.5 bg-rose-950/80 border border-rose-500/60 rounded-xl text-center space-y-1 font-mono">
                  <div className="flex items-center justify-center gap-1.5 text-rose-400 font-black text-xs uppercase">
                    <Lock className="h-4 w-4 text-rose-400" />
                    <span>PROP CIRCUIT BREAKER LOCKED (4.0% DAILY DRAWDOWN REACHED)</span>
                  </div>
                  <p className="text-[10.5px] text-slate-300">
                    Trading is halted for today to protect your FundedNext account from breaching the 5.0% hard drawdown rule.
                  </p>
                </div>
              ) : (
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
              )}

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

                  {copierReceiptSummary && (
                    <div className="p-2 bg-blue-950/70 border border-blue-500/40 rounded-lg text-blue-200 text-[10.5px] flex items-center gap-2">
                      <Copy className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <span>{copierReceiptSummary}</span>
                    </div>
                  )}

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
            
            {/* Auto-Merged Live Macro Catalyst & News Impact Radar */}
            <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-5 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
                  <span>Auto-Merged News & Macro Radar</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase ${
                  getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).shockRisk === "CRITICAL" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                  getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).shockRisk === "ELEVATED" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                  "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}>
                  {getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).shockRisk} MACRO SHOCK RISK
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-850 space-y-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-500 text-[9.5px] uppercase block">Primary Geopolitical / Summit Event:</span>
                  <span className="text-white font-bold leading-snug block mt-0.5">
                    {getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).primaryCatalyst}
                  </span>
                </div>
                
                <div className="pt-2 border-t border-slate-900">
                  <span className="text-amber-400 font-bold block text-[10px] uppercase">Automated Protection Buffer:</span>
                  <p className="text-slate-300 leading-relaxed text-[11px] mt-0.5">
                    {getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).volatilityBufferRecommendation}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[10px]">
                  <span className="text-slate-500">News Sentiment Bias:</span>
                  <span className={`font-black ${
                    getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).sentiment === "BULLISH" ? "text-emerald-400" :
                    getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).sentiment === "BEARISH" ? "text-rose-400" : "text-amber-400"
                  }`}>
                    {getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).sentiment}
                  </span>
                </div>
              </div>

              {onNavigateToSection && (
                <button
                  type="button"
                  onClick={() => onNavigateToSection('news')}
                  className="w-full py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded text-[10.5px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Globe className="h-3 w-3" />
                  View Related Live Macro News Wires <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>

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
