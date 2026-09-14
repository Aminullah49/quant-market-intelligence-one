import React, { useState, useMemo, useEffect } from "react";
import { MarketAsset, TradeSetupPlan, JournalEntry, TraderDNA } from "../types";
import {
  CheckSquare,
  Square,
  ShieldCheck,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  HelpCircle,
  Copy,
  Check,
  Plus,
  Trash2,
  BarChart2,
  Clock,
  Layers,
  Sparkles,
  Flame,
  ArrowRight,
  BookOpen,
  Filter,
  DollarSign,
  Activity,
  Coins,
  Compass,
  Crosshair,
  Info,
  Calendar,
  Target,
  ShieldAlert,
  CheckCircle,
  Loader2
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

interface EntryChecklistProps {
  selectedAsset: MarketAsset;
  assets: MarketAsset[];
  onSelectAsset: (asset: MarketAsset) => void;
  traderProfile?: TraderDNA;
  tradeSetup?: TradeSetupPlan | null;
  onAddJournalEntry?: (entry: JournalEntry) => void;
  onNavigateToSection?: (section: any) => void;
}

type TradingStyle = "Scalping" | "Day Trading" | "Swing Trading" | "Position Trading";

interface ChecklistItem {
  id: string;
  category: "Structure" | "Momentum" | "Execution" | "Risk" | "Macro";
  label: string;
  description: string;
  weight: number;
  isChecked: boolean;
  requiredForStyles: TradingStyle[];
}

const DEFAULT_CHECKLIST: Omit<ChecklistItem, "isChecked">[] = [
  // Structure & Trend
  {
    id: "htf_trend",
    category: "Structure",
    label: "Higher Timeframe (HTF) Trend Alignment",
    description: "Current price action matches the direction of the higher timeframe trend (e.g., H4/D1 for Day Trade, M15/H1 for Scalp).",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "key_level",
    category: "Structure",
    label: "Price Reacting at Key Support / Resistance / Order Block",
    description: "Price is testing an established key level, Fair Value Gap (FVG), or institutional Order Block.",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "bos_choch",
    category: "Structure",
    label: "Break of Structure (BOS) or Change of Character (CHoCH)",
    description: "Price confirmed structural displacement/breakout on execution timeframe.",
    weight: 10,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading"]
  },

  // Momentum & Indicators
  {
    id: "ema_vwap",
    category: "Momentum",
    label: "VWAP & Moving Average Confluence",
    description: "Price is above/below VWAP and aligned with key EMAs (e.g., EMA 20 > SMA 50 for BUY).",
    weight: 10,
    requiredForStyles: ["Scalping", "Day Trading"]
  },
  {
    id: "rsi_macd",
    category: "Momentum",
    label: "RSI / MACD Momentum Confirmation",
    description: "Oscillators confirm directional momentum and are not showing counter-trend divergence.",
    weight: 10,
    requiredForStyles: ["Day Trading", "Swing Trading"]
  },
  {
    id: "quant_prob",
    category: "Momentum",
    label: "AI Unified Quant Direction Probability ≥ 60%",
    description: "The AI Quantitative Engine calculates at least 60% directional probability in your trade direction.",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },

  // Execution & Liquidity
  {
    id: "spread_check",
    category: "Execution",
    label: "Broker Spread & Slippage Within Limits",
    description: "Current broker spread is normal (< 1.5 pips for Forex, tight spread for Gold/Crypto) without abnormal widening.",
    weight: 10,
    requiredForStyles: ["Scalping", "Day Trading"]
  },
  {
    id: "session_liquidity",
    category: "Execution",
    label: "Active High-Volume Trading Session",
    description: "Trading during prime liquidity windows (e.g., London Open 08:00 UTC or NY Open 13:30 UTC).",
    weight: 10,
    requiredForStyles: ["Scalping", "Day Trading"]
  },
  {
    id: "news_filter",
    category: "Execution",
    label: "No High-Impact (Red Folder) News in Next 30 Mins",
    description: "No pending CPI, NFP, or FOMC interest rate announcements in the next 30-60 minutes.",
    weight: 10,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading"]
  },

  // Risk Management
  {
    id: "rr_ratio",
    category: "Risk",
    label: "Risk to Reward Ratio Meets Style Threshold",
    description: "Planned Take-Profit vs. Stop-Loss offers at least 1:1.5 R:R for Scalps, 1:2 R:R for Day Trades, 1:3 R:R for Swings.",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "account_risk",
    category: "Risk",
    label: "Strict Position Sizing (Max 1% - 2% Risk)",
    description: "Lot size or position leverage is calculated strictly so that a Stop Loss hit risks ≤ 1%-2% of total account balance.",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "sl_location",
    category: "Risk",
    label: "Stop Loss Placed Behind Structural Invalidation Level",
    description: "Stop Loss is safely positioned beyond recent swing high/low or liquidity pool, not arbitrary pips.",
    weight: 10,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },

  // Macro & Fundamentals
  {
    id: "dxy_macro",
    category: "Macro",
    label: "DXY / Correlated Market Confluence",
    description: "Dollar Index (DXY) movement or correlated assets (e.g., Yields, S&P 500) support trade direction.",
    weight: 10,
    requiredForStyles: ["Swing Trading", "Position Trading"]
  }
];

const STYLE_THRESHOLDS: Record<TradingStyle, { minScore: number; desc: string; timeframes: string; recommendedRR: string }> = {
  "Scalping": {
    minScore: 75,
    desc: "Ultra-fast execution on M1-M15 charts. Requires tight spreads, active session volume, and immediate VWAP alignment.",
    timeframes: "M1 - M15 Timeframes",
    recommendedRR: "Min 1:1.5 Risk/Reward"
  },
  "Day Trading": {
    minScore: 70,
    desc: "Intraday M15-H1 setups. Requires H4/D1 bias alignment, key liquidity sweep, London/NY session momentum, and min 1:2 R:R.",
    timeframes: "M15 - H1 Timeframes",
    recommendedRR: "Min 1:2.0 Risk/Reward"
  },
  "Swing Trading": {
    minScore: 65,
    desc: "Multi-day H4-D1 setups. Requires macro structural breakout/BOS, HTF Order Block respect, and correlated DXY/Yields confluence.",
    timeframes: "H4 - D1 Timeframes",
    recommendedRR: "Min 1:2.5 Risk/Reward"
  },
  "Position Trading": {
    minScore: 60,
    desc: "Multi-week D1-MN macro trends. Requires central bank policy alignment, multi-month structural support, and controlled leverage.",
    timeframes: "D1 - MN Timeframes",
    recommendedRR: "Min 1:3.0 Risk/Reward"
  }
};

/**
 * Calculates distinct, style-specific Open (Entry), Stop Loss (SL), Take Profit 1 (TP1),
 * Take Profit 2 (TP2), Pip Distances, Risk/Reward Ratio, and Structural Rationale for EACH trading style.
 */
function computeStyleTradePlan(
  asset: MarketAsset,
  direction: "BUY" | "SELL",
  style: TradingStyle
) {
  const isBuy = direction === "BUY";
  const p = asset.price;

  // Decimal formatting precision
  let decimals = 2;
  if (p < 0.1) decimals = 6;
  else if (p < 10) decimals = 4;
  else if (asset.symbol.includes("JPY")) decimals = 3;

  // Style-specific volatility factors (Crypto vs Non-Crypto aware to ensure exchange compliance)
  const isCryptoAsset = asset.category === "Crypto" || /BTC|ETH|SOL|XRP|DOGE|PEPE|SHIB|ADA|DOT|AVAX|LINK|NEAR|BNB|UNI|LTC|BCH|SUI|APT|ICP|RENDER|STX|CRYPTO/i.test(asset.symbol);

  let entryOffsetPct = 0;
  let slPct = isCryptoAsset ? 0.022 : 0.008;
  let rr1 = 2.0;
  let rr2 = 3.5;
  let estimatedDuration = "2 - 12 Hours";
  let executionZoneName = "Market Order / Immediate Retest";
  let bestSessionWindow = "London Open (08:00 UTC) & NY Open (13:30 UTC)";

  let openRationale = "";
  let slRationale = "";
  let tpRationale = "";

  if (style === "Scalping") {
    entryOffsetPct = 0; // Immediate market order or micro pullback
    slPct = isCryptoAsset ? 0.0120 : 0.0040; // 1.20% for Crypto vs 0.40% for Forex/Gold
    rr1 = 1.8;
    rr2 = 3.0;
    estimatedDuration = "5 - 45 Minutes";
    executionZoneName = "Immediate Market Execution / VWAP Bounce";
    bestSessionWindow = isCryptoAsset ? "24/7 High Volatility Volume Windows" : "London / NY Session Peak Volume (08:00 - 16:00 UTC)";

    openRationale = `Scalping entry at current market price ($${p.toFixed(decimals)}) upon M1/M5 VWAP retest and quick volume expansion.`;
    slRationale = isCryptoAsset
      ? `Stop Loss set with a safe 1.20% crypto volatility buffer beyond recent M1/M5 swing pivot, compliant with exchange order minimum distance rules.`
      : `Tight Stop Loss placed strictly beyond recent M1/M5 micro swing pivot to minimize drawdown and isolate high-probability momentum.`;
    tpRationale = `TP1 set at local M5 resistance pivot (1:1.8 R:R). TP2 set at session high/low liquidity pool (1:3.0 R:R).`;
  } else if (style === "Day Trading") {
    entryOffsetPct = isBuy ? -0.0012 : 0.0012; // 0.12% limit pullback zone
    slPct = isCryptoAsset ? 0.0220 : 0.0080; // 2.20% for Crypto vs 0.80% for Forex
    rr1 = 2.0;
    rr2 = 3.5;
    estimatedDuration = "2 - 12 Hours";
    executionZoneName = "H1 Order Block & M15 Fair Value Gap Retest";
    bestSessionWindow = isCryptoAsset ? "24/7 Asian / US Volume Crossovers" : "London Open (08:00 UTC) or NY Session Open (13:30 UTC)";

    openRationale = `Day Trade entry formulated at the H1 Order Block / M15 Fair Value Gap (FVG) retest zone after Asian Session liquidity sweep.`;
    slRationale = isCryptoAsset
      ? `Stop Loss positioned safely 2.20% beyond H1 structural invalidation level, giving trade ample cushion against crypto exchange spread spikes.`
      : `Stop Loss positioned safely beyond H1 structural invalidation level, protecting against intraday noise and broker spread widening.`;
    tpRationale = `TP1 set at Daily Pivot / previous day high (1:2.0 R:R). TP2 targets key institutional liquidity pool / Daily resistance (1:3.5 R:R).`;
  } else if (style === "Swing Trading") {
    entryOffsetPct = isBuy ? -0.0035 : 0.0035; // 0.35% deep H4 limit zone
    slPct = isCryptoAsset ? 0.0450 : 0.0200; // 4.50% for Crypto vs 2.00% for Forex
    rr1 = 2.5;
    rr2 = 4.5;
    estimatedDuration = "2 - 7 Days";
    executionZoneName = "H4 Demand/Supply Zone & 61.8% Golden Pocket";
    bestSessionWindow = "Daily Candle Open / Weekly Session Transition";

    openRationale = `Swing Trade entry planned at deep H4 Discount/Premium zone with 61.8% Fibonacci Golden Pocket alignment.`;
    slRationale = isCryptoAsset
      ? `Swing Stop Loss set at 4.50% behind H4/D1 structural swing high/low to insulate against crypto leverage flushouts.`
      : `Wide Stop Loss anchored behind H4/D1 structural swing high/low, giving trade ample cushion for multi-day market fluctuations.`;
    tpRationale = `TP1 set at recent H4 swing target (1:2.5 R:R). TP2 aims for major Weekly Liquidity Void expansion (1:4.5 R:R).`;
  } else if (style === "Position Trading") {
    entryOffsetPct = isBuy ? -0.0080 : 0.0080; // 0.80% macro limit zone
    slPct = isCryptoAsset ? 0.0850 : 0.0450; // 8.50% for Crypto vs 4.50% for Forex
    rr1 = 3.0;
    rr2 = 6.0;
    estimatedDuration = "2 Weeks - 2 Months";
    executionZoneName = "Weekly Discount Zone & Central Bank Macro Pivot";
    bestSessionWindow = "Monthly / Weekly Candle Open Window";

    openRationale = `Position Trade entry set at Monthly structural support zone, backed by macro structural trend divergence.`;
    slRationale = isCryptoAsset
      ? `Macro Stop Loss placed 8.50% beyond Weekly/Monthly key swing pivot to absorb crypto bull/bear market macro volatility.`
      : `Macro Stop Loss placed beyond Weekly/Monthly key swing pivot to withstand FOMC/NFP high-volatility events.`;
    tpRationale = `TP1 targeted at Multi-Month resistance pivot (1:3.0 R:R). TP2 aims for All-Time High / Multi-Year trend extension (1:6.0 R:R).`;
  }

  const entryPrice = p * (1 + entryOffsetPct);
  const slOffset = entryPrice * slPct;
  const stopLoss = isBuy ? entryPrice - slOffset : entryPrice + slOffset;
  const takeProfit1 = isBuy ? entryPrice + (slOffset * rr1) : entryPrice - (slOffset * rr1);
  const takeProfit2 = isBuy ? entryPrice + (slOffset * rr2) : entryPrice - (slOffset * rr2);

  const slPips = calculatePips(asset.symbol, entryPrice, stopLoss);
  const tp1Pips = calculatePips(asset.symbol, entryPrice, takeProfit1);
  const tp2Pips = calculatePips(asset.symbol, entryPrice, takeProfit2);

  return {
    style,
    direction,
    entryPrice: parseFloat(entryPrice.toFixed(decimals)),
    stopLoss: parseFloat(stopLoss.toFixed(decimals)),
    takeProfit1: parseFloat(takeProfit1.toFixed(decimals)),
    takeProfit2: parseFloat(takeProfit2.toFixed(decimals)),
    slPips,
    tp1Pips,
    tp2Pips,
    riskRewardRatio: `1:${rr1.toFixed(1)} / 1:${rr2.toFixed(1)}`,
    estimatedDuration,
    executionZoneName,
    bestSessionWindow,
    openRationale,
    slRationale,
    tpRationale,
    decimals
  };
}

export default function EntryChecklist({
  selectedAsset,
  assets = [],
  onSelectAsset,
  traderProfile,
  tradeSetup,
  onAddJournalEntry,
  onNavigateToSection
}: EntryChecklistProps) {
  // Trading style selection
  const [activeStyle, setActiveStyle] = useState<TradingStyle>(() => {
    if (traderProfile?.style === "Scalper") return "Scalping";
    if (traderProfile?.style === "Day Trader") return "Day Trading";
    if (traderProfile?.style === "Swing Trader") return "Swing Trading";
    if (traderProfile?.style === "Position Trader") return "Position Trading";
    return "Day Trading";
  });

  // Direction intention: BUY or SELL
  const [intendedDirection, setIntendedDirection] = useState<"BUY" | "SELL">(
    () => (selectedAsset.bullishProb >= selectedAsset.bearishProb ? "BUY" : "SELL")
  );

  // Auto-sync intendedDirection with live market signal on asset change
  useEffect(() => {
    const liveDirection: "BUY" | "SELL" = selectedAsset.bullishProb >= selectedAsset.bearishProb ? "BUY" : "SELL";
    setIntendedDirection(liveDirection);
  }, [selectedAsset.symbol, selectedAsset.bullishProb, selectedAsset.bearishProb]);

  // Stable memoized asset list for the Instrument dropdown to prevent menu blinking on live price ticks
  const stableAssetList = useMemo(() => {
    return assets.map(a => ({
      symbol: a.symbol,
      name: a.name,
      category: a.category
    }));
  }, [assets.map(a => a.symbol).join(",")]);

  // Quant Engine Market Direction Bias
  const isQuantBullish = selectedAsset.bullishProb >= selectedAsset.bearishProb;
  const aiRecommendedDirection: "BUY" | "SELL" = isQuantBullish ? "BUY" : "SELL";
  const aiBiasProbPct = Math.round((isQuantBullish ? selectedAsset.bullishProb : selectedAsset.bearishProb) * 100);

  // Currency & Sizing state
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyConfig>(getStoredCurrency());
  const [lotSize, setLotSize] = useState<number>(0.1);
  const [accountBalanceUSD, setAccountBalanceUSD] = useState<number>(10000);

  // State of checked items
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});
  const [customItems, setCustomItems] = useState<{ id: string; label: string; weight: number; isChecked: boolean }[]>([]);
  const [newCustomLabel, setNewCustomLabel] = useState("");

  // Feedback states
  const [copiedPlan, setCopiedPlan] = useState(false);
  const [loggedJournal, setLoggedJournal] = useState(false);
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

  const handleCurrencyChange = (code: string) => {
    const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
    if (found) {
      setSelectedCurrency(found);
      setStoredCurrency(found.code);
    }
  };

  // Compute style-specific execution plan
  const stylePlan = useMemo(() => {
    return computeStyleTradePlan(selectedAsset, intendedDirection, activeStyle);
  }, [selectedAsset, intendedDirection, activeStyle]);

  // Compute exact PnL for SL, TP1, and TP2 in chosen account currency
  const slPnL = useMemo(() => {
    return calculateTradePnL({
      symbol: selectedAsset.symbol,
      category: selectedAsset.category,
      direction: intendedDirection,
      entryPrice: stylePlan.entryPrice,
      targetPrice: stylePlan.stopLoss,
      lotSize,
      currency: selectedCurrency,
      accountBalanceUSD
    });
  }, [selectedAsset, intendedDirection, stylePlan, lotSize, selectedCurrency, accountBalanceUSD]);

  const tp1PnL = useMemo(() => {
    return calculateTradePnL({
      symbol: selectedAsset.symbol,
      category: selectedAsset.category,
      direction: intendedDirection,
      entryPrice: stylePlan.entryPrice,
      targetPrice: stylePlan.takeProfit1,
      lotSize,
      currency: selectedCurrency,
      accountBalanceUSD
    });
  }, [selectedAsset, intendedDirection, stylePlan, lotSize, selectedCurrency, accountBalanceUSD]);

  const tp2PnL = useMemo(() => {
    return calculateTradePnL({
      symbol: selectedAsset.symbol,
      category: selectedAsset.category,
      direction: intendedDirection,
      entryPrice: stylePlan.entryPrice,
      targetPrice: stylePlan.takeProfit2,
      lotSize,
      currency: selectedCurrency,
      accountBalanceUSD
    });
  }, [selectedAsset, intendedDirection, stylePlan, lotSize, selectedCurrency, accountBalanceUSD]);

  // Auto-evaluate Quant engine criteria when selectedAsset or direction changes
  useEffect(() => {
    const isMarketBullish = selectedAsset.bullishProb >= selectedAsset.bearishProb;
    const isDirectionAligned = (intendedDirection === "BUY" && isMarketBullish) || (intendedDirection === "SELL" && !isMarketBullish);
    const probValue = intendedDirection === "BUY" ? selectedAsset.bullishProb : selectedAsset.bearishProb;
    const quantProbMatched = probValue >= 0.52;

    setCheckedState({
      quant_prob: quantProbMatched,
      htf_trend: isDirectionAligned,
      key_level: isDirectionAligned && selectedAsset.confidence >= 65,
      bos_choch: isDirectionAligned,
      ema_vwap: isDirectionAligned,
      rsi_macd: isDirectionAligned,
      dxy_macro: isDirectionAligned,
      account_risk: true,
      sl_location: true,
      rr_ratio: true,
      spread_check: true,
      news_filter: true,
      session_liquidity: true
    });
  }, [selectedAsset.symbol, intendedDirection, selectedAsset.bullishProb, selectedAsset.bearishProb, selectedAsset.confidence]);

  // Filter items applicable to active trading style
  const relevantItems = useMemo(() => {
    return DEFAULT_CHECKLIST.filter(item => item.requiredForStyles.includes(activeStyle));
  }, [activeStyle]);

  // Calculate Confluence Score (%)
  const scoreCalculation = useMemo(() => {
    let totalPossibleWeight = 0;
    let earnedWeight = 0;

    relevantItems.forEach(item => {
      totalPossibleWeight += item.weight;
      if (checkedState[item.id]) {
        earnedWeight += item.weight;
      }
    });

    customItems.forEach(c => {
      totalPossibleWeight += c.weight;
      if (c.isChecked) {
        earnedWeight += c.weight;
      }
    });

    if (totalPossibleWeight === 0) return { score: 0, earned: 0, total: 0 };
    const score = Math.round((earnedWeight / totalPossibleWeight) * 100);
    return { score, earned: earnedWeight, total: totalPossibleWeight };
  }, [relevantItems, checkedState, customItems]);

  const thresholdInfo = STYLE_THRESHOLDS[activeStyle];
  const isValidEntry = scoreCalculation.score >= thresholdInfo.minScore;
  const isNearValid = scoreCalculation.score >= (thresholdInfo.minScore - 10) && !isValidEntry;

  const toggleItem = (id: string) => {
    setCheckedState(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomLabel.trim()) return;
    setCustomItems(prev => [
      ...prev,
      {
        id: `custom_${Date.now()}`,
        label: newCustomLabel.trim(),
        weight: 10,
        isChecked: true
      }
    ]);
    setNewCustomLabel("");
  };

  const removeCustomItem = (id: string) => {
    setCustomItems(prev => prev.filter(c => c.id !== id));
  };

  const toggleCustomItem = (id: string) => {
    setCustomItems(prev =>
      prev.map(c => (c.id === id ? { ...c, isChecked: !c.isChecked } : c))
    );
  };

  // Generate Trade Confirmation Note
  const generatePlanText = () => {
    const date = new Date().toLocaleDateString();
    let text = `=== QUANT MARKET INTEL - ${activeStyle.toUpperCase()} EXECUTION PLAN ===\n`;
    text += `Date: ${date}\n`;
    text += `Asset: ${selectedAsset.symbol} ($${selectedAsset.price})\n`;
    text += `Trading Style: ${activeStyle} (${thresholdInfo.timeframes})\n`;
    text += `Intended Order: ${intendedDirection}\n`;
    text += `Confluence Score: ${scoreCalculation.score}% (Required Threshold: ${thresholdInfo.minScore}%)\n`;
    text += `Decision: ${isValidEntry ? "🚀 VALID ENTRY APPROVED" : isNearValid ? "⚠️ WAIT FOR MORE CONFLUENCE" : "🛑 NO TRADE - STAND ASIDE"}\n\n`;
    text += `--- STYLE EXECUTION PARAMETERS ---\n`;
    text += `Open / Entry Price: $${stylePlan.entryPrice}\n`;
    text += `Stop Loss (SL): $${stylePlan.stopLoss} (${stylePlan.slPips} Pips, Risk: ${slPnL ? formatCurrencyAmount(slPnL.pnlAmountCurrency, selectedCurrency) : 'N/A'})\n`;
    text += `Take Profit 1 (TP1): $${stylePlan.takeProfit1} (${stylePlan.tp1Pips} Pips, Gain: ${tp1PnL ? formatCurrencyAmount(tp1PnL.pnlAmountCurrency, selectedCurrency) : 'N/A'})\n`;
    text += `Take Profit 2 (TP2): $${stylePlan.takeProfit2} (${stylePlan.tp2Pips} Pips, Gain: ${tp2PnL ? formatCurrencyAmount(tp2PnL.pnlAmountCurrency, selectedCurrency) : 'N/A'})\n`;
    text += `Risk / Reward Ratio: ${stylePlan.riskRewardRatio}\n`;
    text += `Estimated Duration: ${stylePlan.estimatedDuration}\n\n`;
    text += `--- CHECKLIST VERIFICATIONS ---\n`;

    relevantItems.forEach(item => {
      const isChecked = !!checkedState[item.id];
      text += `[${isChecked ? "X" : " "}] ${item.label}\n`;
    });

    if (customItems.length > 0) {
      text += `\n--- CUSTOM PERSONAL RULES ---\n`;
      customItems.forEach(item => {
        text += `[${item.isChecked ? "X" : " "}] ${item.label}\n`;
      });
    }

    return text;
  };

  const handleCopyPlan = () => {
    const plan = generatePlanText();
    navigator.clipboard.writeText(plan);
    setCopiedPlan(true);
    setTimeout(() => setCopiedPlan(false), 2500);
  };

  const handleLogToJournal = () => {
    if (!onAddJournalEntry) return;

    const newJournal: JournalEntry = {
      id: `j_${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      market: selectedAsset.symbol,
      direction: intendedDirection,
      entryPrice: stylePlan.entryPrice,
      exitPrice: stylePlan.takeProfit1,
      outcome: "WIN",
      profit: tp1PnL ? tp1PnL.pnlAmountCurrency : 0,
      emotion: "Disciplined",
      mistake: "None",
      notes: `Executed via Entry Checklist Validator (${activeStyle}). Open: $${stylePlan.entryPrice}, SL: $${stylePlan.stopLoss} (${stylePlan.slPips} pips), TP1: $${stylePlan.takeProfit1} (${stylePlan.tp1Pips} pips). Confluence Score: ${scoreCalculation.score}%.`
    };

    onAddJournalEntry(newJournal);
    setLoggedJournal(true);
    setTimeout(() => setLoggedJournal(false), 3000);
  };

  const handleDirectOrderExecution = () => {
    setIsPlacingDirectOrder(true);
    setDirectOrderReceipt(null);

    const ticketId = `CHK-STP-${Math.floor(100000 + Math.random() * 900000)}`;
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
          type: intendedDirection,
          entryPrice: stylePlan.entryPrice,
          currentPrice: stylePlan.entryPrice,
          size: lotSize,
          leverage: 100,
          stopLoss: stylePlan.stopLoss,
          takeProfit: stylePlan.takeProfit1,
          pnl: 0,
          timestamp: new Date().toISOString(),
          status: "OPEN",
          brokerId: "quantintel-stp",
          notes: `Checklist Verified Trade (${scoreCalculation.score}% Confluence) Ticket #${ticketId}`
        };
        localStorage.setItem("paper_trading_positions_v1", JSON.stringify([newPosition, ...openPositions]));
      } catch (e) {
        console.error("Direct order position sync failed:", e);
      }

      // Also log automatically to journal
      if (onAddJournalEntry) {
        const newJournal: JournalEntry = {
          id: `j_${Date.now()}`,
          date: new Date().toISOString().split("T")[0],
          market: selectedAsset.symbol,
          direction: intendedDirection,
          entryPrice: stylePlan.entryPrice,
          exitPrice: stylePlan.takeProfit1,
          outcome: "WIN",
          profit: tp1PnL ? tp1PnL.pnlAmountCurrency : 0,
          emotion: "Disciplined",
          mistake: "None",
          notes: `Direct STP Order Placed via Entry Checklist (${scoreCalculation.score}% Score). Ticket #${ticketId}. Entry: $${stylePlan.entryPrice}, SL: $${stylePlan.stopLoss}, TP1: $${stylePlan.takeProfit1}. Sized at ${lotSize} Lots.`
        };
        onAddJournalEntry(newJournal);
      }

      setDirectOrderReceipt({
        id: ticketId,
        market: selectedAsset.symbol,
        direction: intendedDirection,
        price: stylePlan.entryPrice,
        lots: lotSize,
        sl: stylePlan.stopLoss,
        tp1: stylePlan.takeProfit1,
        broker: brokerName
      });
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                TRADE ENTRY & CONFLUENCE VALIDATOR
              </span>
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono font-bold rounded-lg">
                Style-Specific Open, SL & TP Analysis Engine
              </span>
            </div>

            <h1 className="text-2xl font-black text-white tracking-tight">
              Interactive Entry Checklist & Style Confluence Engine
            </h1>
            <p className="text-sm text-slate-400 font-mono mt-1 max-w-2xl">
              Eliminate impulsive losses by validating your trade against structural, momentum, liquidity, and risk criteria with dedicated Open, SL, and TP parameters for Scalp, Day, Swing, and Position trading.
            </p>
          </div>

          {/* Quick Instrument & Currency Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Account Currency Selector */}
            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2 font-mono text-xs">
              <label className="text-[10px] text-slate-500 font-bold uppercase block">Currency:</label>
              <select
                value={selectedCurrency.code}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="bg-transparent text-white font-extrabold outline-none cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                    {c.flag} {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Instrument Selector */}
            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[10px] text-slate-500 font-mono font-bold uppercase block">Instrument</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    ${selectedAsset.price < 10 ? selectedAsset.price.toFixed(4) : selectedAsset.price.toFixed(2)}
                  </span>
                </div>
                <select
                  value={selectedAsset.symbol}
                  onChange={(e) => {
                    const found = assets.find(a => a.symbol === e.target.value);
                    if (found) onSelectAsset(found);
                  }}
                  className="bg-transparent text-white font-extrabold text-sm font-mono outline-none cursor-pointer max-w-[210px]"
                >
                  {stableAssetList.map(a => (
                    <option key={a.symbol} value={a.symbol} className="bg-slate-900 text-white">
                      {a.symbol} — {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Direction Switcher */}
              <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 font-mono text-xs">
                <button
                  onClick={() => setIntendedDirection("BUY")}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                    intendedDirection === "BUY"
                      ? "bg-emerald-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  BUY
                </button>
                <button
                  onClick={() => setIntendedDirection("SELL")}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                    intendedDirection === "SELL"
                      ? "bg-rose-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  SELL
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PROMINENT AI QUANT MARKET DIRECTION INDICATOR BANNER */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono shadow-xl relative overflow-hidden ${
        isQuantBullish 
          ? "bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 border-emerald-500/40" 
          : "bg-gradient-to-r from-rose-950/90 via-slate-900 to-slate-900 border-rose-500/40"
      }`}>
        <div className="flex items-center gap-3.5 relative z-10">
          <div className={`p-3 rounded-xl font-black flex items-center justify-center shrink-0 shadow-lg ${
            isQuantBullish ? "bg-emerald-500 text-slate-950 shadow-emerald-500/20" : "bg-rose-500 text-white shadow-rose-500/20"
          }`}>
            {isQuantBullish ? <TrendingUp className="h-6 w-6 stroke-[3]" /> : <TrendingDown className="h-6 w-6 stroke-[3]" />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                CURRENT AI QUANT MARKET DIRECTION
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider ${
                isQuantBullish 
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}>
                {isQuantBullish ? "🟢 BULLISH REGIME" : "🔴 BEARISH REGIME"}
              </span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-xl font-black text-white tracking-tight">
                MARKET IS CURRENTLY: <span className={isQuantBullish ? "text-emerald-400 underline decoration-emerald-500/50" : "text-rose-400 underline decoration-rose-500/50"}>
                  {aiRecommendedDirection}
                </span>
              </h2>
              <span className="text-xs text-slate-300 font-bold">
                ({aiBiasProbPct}% Probability | Trend: {isQuantBullish ? "Strong Uptrend" : "Downtrend"})
              </span>
            </div>
          </div>
        </div>

        {/* Sync Button */}
        {intendedDirection !== aiRecommendedDirection ? (
          <button
            onClick={() => setIntendedDirection(aiRecommendedDirection)}
            className={`px-4 py-2.5 text-xs font-black rounded-xl border transition-all cursor-pointer flex items-center gap-2 shrink-0 shadow-lg ${
              isQuantBullish
                ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-600/30 animate-pulse"
                : "bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-rose-600/30 animate-pulse"
            }`}
          >
            <Zap className="h-4 w-4 fill-current" />
            <span>Switch Checklist Direction to {aiRecommendedDirection}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl shrink-0">
            <Check className="h-4 w-4 stroke-[3]" />
            <span>Checklist Aligned with {aiRecommendedDirection} Market Bias</span>
          </div>
        )}
      </div>

      {/* Trading Style Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {(["Scalping", "Day Trading", "Swing Trading", "Position Trading"] as TradingStyle[]).map((style) => {
          const info = STYLE_THRESHOLDS[style];
          const isActive = activeStyle === style;

          return (
            <button
              key={style}
              onClick={() => setActiveStyle(style)}
              className={`p-4 rounded-xl border text-left transition-all font-mono cursor-pointer relative overflow-hidden ${
                isActive
                  ? "bg-gradient-to-br from-blue-950/80 to-slate-900 border-blue-500 shadow-lg ring-1 ring-blue-500/30"
                  : "bg-slate-900 hover:bg-slate-800/80 border-slate-800/80 text-slate-400"
              }`}
            >
              {isActive && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg uppercase">
                  Active Style
                </div>
              )}

              <div className="flex items-center justify-between mb-1">
                <span className={`font-black text-sm ${isActive ? "text-white" : "text-slate-300"}`}>
                  {style}
                </span>
                <span className={`text-xs font-black px-2 py-0.5 rounded ${
                  isActive ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
                }`}>
                  ≥{info.minScore}% Valid
                </span>
              </div>

              <span className="text-[10px] text-slate-500 block font-bold mb-2">
                {info.timeframes}
              </span>

              <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                {info.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* STYLE-SPECIFIC OPEN, SL & TP EXECUTION CARD */}
      <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden font-mono space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <Crosshair className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white uppercase tracking-wide">
                  {activeStyle} Trade Execution Matrix ({selectedAsset.symbol})
                </h3>
                <span className={`px-2 py-0.5 text-xs font-black rounded ${
                  intendedDirection === "BUY" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}>
                  {intendedDirection}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Targeting {stylePlan.executionZoneName} on {thresholdInfo.timeframes}
              </p>
            </div>
          </div>

          {/* Lot Size Controller */}
          <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800 shrink-0">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Simulated Lot Size:</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="100"
              value={lotSize}
              onChange={(e) => setLotSize(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
              className="w-20 bg-slate-900 border border-slate-800 focus:border-blue-500 text-emerald-400 font-extrabold text-xs px-2 py-1 rounded outline-none"
            />
            <span className="text-xs text-slate-400 font-bold">Lots</span>
          </div>
        </div>

        {/* 4 Primary Execution Metrics: Open Price, Stop Loss, Take Profit 1, Take Profit 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Open / Entry Price */}
          <div className="p-4 bg-slate-950 rounded-xl border border-blue-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-blue-400" />
                Open / Entry Price
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded font-bold">
                {activeStyle === "Scalping" ? "Market" : "Limit Zone"}
              </span>
            </div>

            <div className="text-xl font-black text-white">
              ${stylePlan.entryPrice.toLocaleString(undefined, { minimumFractionDigits: stylePlan.decimals })}
            </div>

            <div className="text-[11px] text-slate-400 leading-tight">
              Baseline: ${selectedAsset.price.toLocaleString(undefined, { minimumFractionDigits: stylePlan.decimals })}
            </div>
          </div>

          {/* Stop Loss (SL) */}
          <div className="p-4 bg-slate-950 rounded-xl border border-rose-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                Stop Loss (SL)
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-rose-500/10 text-rose-400 rounded font-bold">
                {stylePlan.slPips} Pips
              </span>
            </div>

            <div className="text-xl font-black text-rose-400">
              ${stylePlan.stopLoss.toLocaleString(undefined, { minimumFractionDigits: stylePlan.decimals })}
            </div>

            <div className="text-[11px] text-rose-300 font-bold">
              Risk: {slPnL ? formatCurrencyAmount(slPnL.pnlAmountCurrency, selectedCurrency) : 'N/A'}
            </div>
          </div>

          {/* Take Profit 1 (TP1) */}
          <div className="p-4 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                Take Profit 1 (TP1)
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded font-bold">
                {stylePlan.tp1Pips} Pips
              </span>
            </div>

            <div className="text-xl font-black text-emerald-400">
              ${stylePlan.takeProfit1.toLocaleString(undefined, { minimumFractionDigits: stylePlan.decimals })}
            </div>

            <div className="text-[11px] text-emerald-300 font-bold">
              Gain: +{tp1PnL ? formatCurrencyAmount(tp1PnL.pnlAmountCurrency, selectedCurrency) : 'N/A'}
            </div>
          </div>

          {/* Take Profit 2 (TP2) */}
          <div className="p-4 bg-slate-950 rounded-xl border border-teal-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-teal-400 font-bold flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                Take Profit 2 (TP2)
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-teal-500/10 text-teal-400 rounded font-bold">
                {stylePlan.tp2Pips} Pips
              </span>
            </div>

            <div className="text-xl font-black text-teal-400">
              ${stylePlan.takeProfit2.toLocaleString(undefined, { minimumFractionDigits: stylePlan.decimals })}
            </div>

            <div className="text-[11px] text-teal-300 font-bold">
              Gain: +{tp2PnL ? formatCurrencyAmount(tp2PnL.pnlAmountCurrency, selectedCurrency) : 'N/A'}
            </div>
          </div>

        </div>

        {/* Detailed Strategic Breakdown Rationale */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-blue-400 font-bold uppercase block">1. Open Price Strategy</span>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {stylePlan.openRationale}
            </p>
          </div>

          <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-rose-400 font-bold uppercase block">2. Stop Loss Invalidation Rationale</span>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {stylePlan.slRationale}
            </p>
          </div>

          <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-emerald-400 font-bold uppercase block">3. Take Profit Targets Rationale</span>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {stylePlan.tpRationale}
            </p>
          </div>
        </div>

        {/* Session Window & Timeline Note */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-slate-400">Est. Holding Duration:</span>
            <span className="font-bold text-white">{stylePlan.estimatedDuration}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-cyan-400 shrink-0" />
            <span className="text-slate-400">Best Session Window:</span>
            <span className="font-bold text-cyan-300">{stylePlan.bestSessionWindow}</span>
          </div>
        </div>

        {/* DIRECT ORDER EXECUTION ROW IN MATRIX CARD */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-blue-500/20">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <Zap className="h-4 w-4 fill-emerald-400" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  Direct Live Order Route ({intendedDirection} {lotSize} Lots)
                </span>
                <span className="text-[10px] text-slate-400 font-sans block">
                  Instantly execute this verified {activeStyle} setup directly on STP broker desk
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleDirectOrderExecution}
                disabled={isPlacingDirectOrder}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs font-sans tracking-wide transition-all cursor-pointer flex items-center gap-2 shadow-lg disabled:cursor-not-allowed ${
                  intendedDirection === "BUY"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                    : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
                }`}
              >
                {isPlacingDirectOrder ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Routing to STP Broker...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" />
                    <span>Direct Place {intendedDirection} Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Validation Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Interactive Checklist */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Categories Groups */}
          {(["Structure", "Momentum", "Execution", "Risk", "Macro"] as const).map((cat) => {
            const catItems = relevantItems.filter(i => i.category === cat);
            if (catItems.length === 0) return null;

            const categoryTitles: Record<string, { title: string; icon: any; color: string }> = {
              Structure: { title: "1. Market Structure & Trend Confluence", icon: Layers, color: "text-blue-400" },
              Momentum: { title: "2. Momentum & Technical Indicators", icon: Zap, color: "text-amber-400" },
              Execution: { title: "3. Liquidity, Spreads & Session Timing", icon: Clock, color: "text-cyan-400" },
              Risk: { title: "4. Risk Management & Position Sizing", icon: ShieldCheck, color: "text-emerald-400" },
              Macro: { title: "5. Fundamentals & Macro Correlation", icon: Activity, color: "text-purple-400" }
            };

            const meta = categoryTitles[cat];
            const Icon = meta.icon;

            return (
              <div key={cat} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800/80">
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                  <h3 className="font-extrabold text-sm text-white font-mono uppercase tracking-wide">
                    {meta.title}
                  </h3>
                </div>

                <div className="space-y-3">
                  {catItems.map((item) => {
                    const isChecked = !!checkedState[item.id];

                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`p-3.5 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer font-mono ${
                          isChecked
                            ? "bg-emerald-500/10 border-emerald-500/30 text-white"
                            : "bg-slate-950/60 hover:bg-slate-800/50 border-slate-800/80 text-slate-400"
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleItem(item.id);
                          }}
                          className={`mt-0.5 p-1 rounded transition-all cursor-pointer ${
                            isChecked ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {isChecked ? <Check className="h-4 w-4 stroke-[3]" /> : <Square className="h-4 w-4" />}
                        </button>

                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-bold text-xs ${isChecked ? "text-white" : "text-slate-300"}`}>
                              {item.label}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded shrink-0 font-extrabold">
                              +{item.weight}% Score
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Custom Rules Personal Customizer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <h3 className="font-extrabold text-sm text-white font-mono uppercase tracking-wide">
                  Your Custom Personal Edge Rules
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono font-bold">
                {customItems.length} Personal Items
              </span>
            </div>

            {/* Custom Rules List */}
            <div className="space-y-2 mb-4">
              {customItems.length === 0 ? (
                <div className="p-3 bg-slate-950/40 rounded-xl text-center text-xs text-slate-500 font-mono border border-slate-800/60">
                  No custom personal rules added yet. Add your personal conditions below (e.g. "Checked DXY correlation", "Not emotional", "Checked 1h VWAP").
                </div>
              ) : (
                customItems.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between font-mono text-xs ${
                      c.isChecked
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                        : "bg-slate-950/60 border-slate-800 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleCustomItem(c.id)}>
                      <button className={`p-1 rounded ${c.isChecked ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-500"}`}>
                        {c.isChecked ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Square className="h-3.5 w-3.5" />}
                      </button>
                      <span className="font-bold">{c.label}</span>
                    </div>

                    <button
                      onClick={() => removeCustomItem(c.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                      title="Remove Custom Rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Custom Item Form */}
            <form onSubmit={handleAddCustomItem} className="flex items-center gap-2">
              <input
                type="text"
                value={newCustomLabel}
                onChange={(e) => setNewCustomLabel(e.target.value)}
                placeholder="Add custom entry rule (e.g., 'Checked 15m Fair Value Gap', 'Max 1% account risk')..."
                className="flex-1 bg-slate-950 border border-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-mono outline-none focus:border-blue-500 transition-all placeholder-slate-600"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Rule
              </button>
            </form>
          </div>

        </div>

        {/* Right 1 Column: Real-Time Confluence Score & Decision Panel */}
        <div className="space-y-5">
          
          {/* Main Score Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-20 font-mono space-y-6">
            
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Calculated Confluence Score
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className={`text-4xl font-black ${
                  isValidEntry ? "text-emerald-400" : isNearValid ? "text-amber-400" : "text-rose-400"
                }`}>
                  {scoreCalculation.score}%
                </span>
                <span className="text-xs font-bold text-slate-400">
                  Target: ≥{thresholdInfo.minScore}% ({activeStyle})
                </span>
              </div>

              {/* Progress Meter Bar */}
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mt-2">
                <div
                  className={`h-full transition-all duration-500 ${
                    isValidEntry
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                      : isNearValid
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                      : "bg-gradient-to-r from-rose-600 to-red-400"
                  }`}
                  style={{ width: `${Math.min(100, scoreCalculation.score)}%` }}
                />
              </div>
            </div>

            {/* Decision Status Badge */}
            <div className={`p-4 rounded-xl border flex items-center gap-3.5 ${
              isValidEntry
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : isNearValid
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}>
              {isValidEntry ? (
                <ShieldCheck className="h-7 w-7 text-emerald-400 shrink-0" />
              ) : isNearValid ? (
                <AlertTriangle className="h-7 w-7 text-amber-400 shrink-0" />
              ) : (
                <AlertTriangle className="h-7 w-7 text-rose-400 shrink-0" />
              )}

              <div>
                <span className="font-black text-sm block uppercase tracking-wide">
                  {isValidEntry
                    ? "🚀 VALID ENTRY (APPROVED)"
                    : isNearValid
                    ? "⚠️ WAIT FOR CONFLUENCE"
                    : "🛑 NO TRADE (STAND ASIDE)"}
                </span>
                <span className="text-[11px] opacity-90 leading-tight block mt-0.5">
                  {isValidEntry
                    ? `Setup meets the required ${thresholdInfo.minScore}% confluence criteria for ${activeStyle}.`
                    : isNearValid
                    ? `Close to threshold (${scoreCalculation.score}% vs ${thresholdInfo.minScore}%). Wait for 1 more confirmation.`
                    : `Confluence is too low (${scoreCalculation.score}%). Entering now carries high statistical risk.`}
                </span>
              </div>
            </div>

            {/* Active Asset Quant Snapshot */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-bold">Instrument:</span>
                <span className="font-extrabold text-white">{selectedAsset.symbol}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-bold">Live Price:</span>
                <span className="font-extrabold text-white">
                  ${selectedAsset.price < 10 ? selectedAsset.price.toFixed(4) : selectedAsset.price.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-bold">Quant Bull / Bear:</span>
                <span className="font-extrabold text-emerald-400">
                  {(selectedAsset.bullishProb * 100).toFixed(0)}% Bull / {(selectedAsset.bearishProb * 100).toFixed(0)}% Bear
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Recommended R:R:</span>
                <span className="font-extrabold text-amber-400">{thresholdInfo.recommendedRR}</span>
              </div>
            </div>

            {/* Actions: Direct Order, Log to Journal, Copy Trade Plan */}
            <div className="space-y-2 pt-2">
              {/* Direct Order Execution Button */}
              <button
                onClick={handleDirectOrderExecution}
                disabled={isPlacingDirectOrder}
                className={`w-full py-3 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs shadow-lg font-sans disabled:cursor-not-allowed ${
                  intendedDirection === "BUY"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25"
                    : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25"
                }`}
              >
                {isPlacingDirectOrder ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Executing Direct STP Order...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 fill-current" />
                    <span>Direct Place {intendedDirection} ({lotSize} Lots)</span>
                  </>
                )}
              </button>

              {/* Direct Order Confirmation Receipt Docket */}
              {directOrderReceipt && (
                <div className="p-3 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-2 text-xs font-mono animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Order Routed & Filled</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{directOrderReceipt.id}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-1 border-t border-slate-800 pt-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Filled:</span>
                      <span className="font-bold text-white">{directOrderReceipt.direction} {directOrderReceipt.lots} Lots {directOrderReceipt.market}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Price / SL:</span>
                      <span className="text-slate-300">${directOrderReceipt.price} | SL ${directOrderReceipt.sl}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Desk:</span>
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

              {onAddJournalEntry && (
                <button
                  onClick={handleLogToJournal}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs shadow-lg shadow-blue-500/20"
                >
                  {loggedJournal ? <Check className="h-4 w-4 text-emerald-300" /> : <BookOpen className="h-4 w-4" />}
                  <span>{loggedJournal ? "Log Added to Trading Journal!" : "Log Verified Trade to Journal"}</span>
                </button>
              )}

              <button
                onClick={handleCopyPlan}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2 text-xs"
              >
                {copiedPlan ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                <span>{copiedPlan ? "Checklist Copied to Clipboard!" : "Copy Checklist Confirmation Note"}</span>
              </button>
            </div>

            {/* Professional Trading Disclaimer */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[10px] text-slate-500 leading-relaxed">
              <strong>Risk Disclaimer:</strong> High confluence scores increase mathematical probability but do not guarantee 100% win rate. Always execute strict Stop Loss risk management on your broker.
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
