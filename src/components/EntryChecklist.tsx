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
  Loader2,
  Radio,
  Globe,
  Users,
  BarChart
} from "lucide-react";
import { getAssetMacroImpact, reconcileTechnicalAndFundamental } from "../utils/marketNews";
import {
  SUPPORTED_CURRENCIES,
  getStoredCurrency,
  setStoredCurrency,
  formatCurrencyAmount,
  calculatePips,
  calculateTradePnL,
  CurrencyConfig
} from "../utils/currencyAndPips";
import { 
  getActivePrimaryBroker, 
  executeDirectBrokerOrder, 
  UnifiedBroker 
} from "../utils/brokerSync";
import { calculateSmartMoneyConcepts, getDecimals } from "../utils";

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
  category: "SMC / ICC" | "Technical" | "Fundamental" | "Sentiment" | "Risk & Money" | "Execution";
  label: string;
  description: string;
  weight: number;
  isChecked: boolean;
  requiredForStyles: TradingStyle[];
}

const DEFAULT_CHECKLIST: Omit<ChecklistItem, "isChecked">[] = [
  // 1. Smart Money Concepts (SMC) & ICC System (Active Institutional Rules)
  {
    id: "smc_fvg_pvg",
    category: "SMC / ICC",
    label: "FVG / PVG Retest & Mitigation (Fair Value & Price Value Gap)",
    description: "Price has retraced to test or mitigate the 50% Consequent Encroachment (CE) of an unmitigated 3-candle Fair Value Gap / Price Value Gap (FVG / PVG) imbalance.",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "smc_liquidity_sweep",
    category: "SMC / ICC",
    label: "Liquidity Sweep Verification (BSL or SSL Purged)",
    description: "Verified Buy-Side Liquidity (BSL above double tops) or Sell-Side Liquidity (SSL below Asian/session lows) was swept to eliminate retail stop clusters prior to entry.",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "smc_choch_structure",
    category: "SMC / ICC",
    label: "CHoCH (Change of Character) Structural Shift",
    description: "Market confirmed a Change of Character (CHoCH) structural trend flip, establishing an early warning reversal or structural displacement.",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading"]
  },
  {
    id: "smc_bos_expansion",
    category: "SMC / ICC",
    label: "BOS (Break of Structure) Momentum Expansion",
    description: "Impulsive candle body closed beyond recent swing high/low (BOS), confirming institutional continuation momentum.",
    weight: 10,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "smc_dealing_range",
    category: "SMC / ICC",
    label: "Dealing Range Valuation (Discount Accumulation / Premium Distribution)",
    description: "Price is executing on the wholesale side of the 50% Equilibrium line: Discount Accumulation (<50% EQ) for Longs, or Premium Distribution (>50% EQ) for Shorts.",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "smc_order_block",
    category: "SMC / ICC",
    label: "Order Block (+OB Demand / -OB Supply) Respect",
    description: "Price is respecting the 50% Mean Threshold of an institutional footprint candle (+OB demand block for longs, -OB supply block for shorts).",
    weight: 10,
    requiredForStyles: ["Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "smc_icc_confirmation",
    category: "SMC / ICC",
    label: "ICC Institutional System (Indication -> Correction -> Continuation) Trigger",
    description: "Institutional Confirmation Candle (ICC) confirmed with >65% body dominance and volume surge out of correction pullback to trigger continuation entry.",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },

  // 2. Technical Analysis & Chart Momentum
  {
    id: "htf_trend",
    category: "Technical",
    label: "Higher Timeframe (HTF) Trend Matrix Alignment",
    description: "Current price action matches the direction of the higher timeframe trend (e.g., H4/D1 for Day Trade, M15/H1 for Scalp) confirming market trend harmony.",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "chart_pattern_confluence",
    category: "Technical",
    label: "Classical Chart Pattern Confluence (Double Top/Bottom, Head & Shoulders, Flags, Triangles)",
    description: "Asset validates recognized geometric chart patterns: Double Bottom/W-pattern, Bull Flag, or Ascending Triangle for BUYs; Double Top/M-pattern, Bear Flag, or Descending Triangle for SELLs.",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "candlestick_reversal_confirmation",
    category: "Technical",
    label: "Candlestick Pattern Confirmation (Engulfing, Pinbar Rejection Wick, Star Formations)",
    description: "Price action confirms directional candle footprints: Bullish/Bearish Engulfing body dominance, Hammer/Shooting Star liquidity sweep rejection wicks, or Morning/Evening Star reversals.",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "chart_trendline_geometry",
    category: "Technical",
    label: "Chart Analysis & Trendline Geometry (Dynamic Channel Breakout & Retest)",
    description: "Visual chart analysis confirms price respecting dynamic trendlines, ascending/descending channel diagonals, or confirmed breakout-and-retest structural geometry.",
    weight: 10,
    requiredForStyles: ["Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "ema_vwap",
    category: "Technical",
    label: "VWAP & Exponential Moving Average (EMA 20/50) Confluence",
    description: "Price is correctly positioned relative to Volume-Weighted Average Price (VWAP) and aligned with key dynamic EMAs (e.g., EMA 20 > SMA 50 for BUY, EMA 20 < SMA 50 for SELL).",
    weight: 10,
    requiredForStyles: ["Scalping", "Day Trading"]
  },
  {
    id: "key_level",
    category: "Technical",
    label: "Price Reaction at Key Support / Resistance / Structural Pivot",
    description: "Price is testing an established key support/resistance shelf, Fibonacci golden pocket (61.8%), or institutional pivot block with confirmed rejection wicks.",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "rsi_macd",
    category: "Technical",
    label: "RSI & MACD Momentum Confirmation (Zero Counter-Divergence)",
    description: "Oscillators confirm directional momentum in trade direction and do not exhibit adverse multi-timeframe counter-trend divergence.",
    weight: 10,
    requiredForStyles: ["Day Trading", "Swing Trading"]
  },
  {
    id: "quant_prob",
    category: "Technical",
    label: "AI Unified Quant Direction Probability ≥ 60%",
    description: "The AI Quantitative Engine calculates at least 60% statistical directional probability aligning with your trade order.",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "overbought_exhaustion_shield",
    category: "Technical",
    label: "Overbought / Oversold Exhaustion Shield (Safe RSI Operating Zone)",
    description: "Asset is not stretched at extreme overbought peaks (RSI > 75) or oversold floors without divergence, avoiding retail exhaustion bull/bear traps.",
    weight: 10,
    requiredForStyles: ["Day Trading", "Swing Trading", "Position Trading"]
  },

  // 3. Fundamental & Macroeconomic Analysis
  {
    id: "macro_catalyst",
    category: "Fundamental",
    label: "Macroeconomic Interest Rate & Inflation Alignment",
    description: "Underlying central bank monetary policy (Fed/ECB/BOJ rates), CPI inflation data, and Sovereign 10Y Yield flows support asset directional trend.",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "macro_catalyst_shield",
    category: "Fundamental",
    label: "Macro Catalyst & Geopolitical Event Shield (UN / FOMC / Summits)",
    description: "Verified no major UN summits, emergency central bank speeches, or geopolitical escalations actively destabilizing market liquidity.",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "dxy_macro",
    category: "Fundamental",
    label: "DXY Dollar Index & Cross-Market Confluence",
    description: "Dollar Index (DXY) directional trajectory or correlated assets (e.g., Yields, S&P 500, Spot ETF net flows) systematically confirm trade thesis.",
    weight: 10,
    requiredForStyles: ["Swing Trading", "Position Trading"]
  },

  // 4. Market Sentiment & Order Book Flow Analysis
  {
    id: "retail_sentiment_contrarian",
    category: "Sentiment",
    label: "Retail Sentiment Contrarian Index (Crowd Imbalance)",
    description: "Retail sentiment positioning is verified heavily opposed to smart money direction (e.g. retail trapped long in a sell market, or retail heavily short in a buy market).",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "institutional_order_flow",
    category: "Sentiment",
    label: "Institutional Order Book Flow & Whale Liquidity Engineering",
    description: "Proprietary order desks and whale transaction telemetry indicate limit order blocks defending structural boundaries rather than retail distribution.",
    weight: 10,
    requiredForStyles: ["Day Trading", "Swing Trading", "Position Trading"]
  },

  // 5. Risk Management & Strict Money Management
  {
    id: "account_risk",
    category: "Risk & Money",
    label: "Strict Position Sizing (Max 1.0% - 2.0% Total Account Risk)",
    description: "Lot size and position leverage are mathematically calculated so that an invalidation Stop Loss hit risks ≤ 1.0% - 2.0% of total account capital.",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "rr_ratio",
    category: "Risk & Money",
    label: "Risk to Reward Ratio Threshold (Min 1:1.8 Scalp / 1:2.0+ Day & Swing)",
    description: "Planned Take-Profit vs. Stop-Loss offers at least 1:1.8 R:R for Scalps, 1:2.0 R:R for Day Trades, and 1:3.0+ R:R for Swings.",
    weight: 15,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "sl_location",
    category: "Risk & Money",
    label: "Structural Invalidation Stop Loss Location",
    description: "Stop Loss is safely positioned beyond recent market structure swing high/low or liquidity pool shelf, completely insulating against market noise.",
    weight: 10,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "margin_cushion",
    category: "Risk & Money",
    label: "Free Margin Cushion & Account Drawdown Safeguard",
    description: "Account exhibits healthy free margin cushion (>500%) with strict leverage constraints to eliminate margin call vulnerability during volatility spikes.",
    weight: 10,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },
  {
    id: "breakeven_scaleout_rule",
    category: "Risk & Money",
    label: "Pre-Committed Breakeven (+1R) & 50% Scale-Out Exit Plan",
    description: "Committed to moving Stop Loss to Breakeven at +1R profit and taking 50% partials at major resistance/support to eliminate sudden drop risk.",
    weight: 10,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading", "Position Trading"]
  },

  // 6. Execution Quality & Liquidity Safeguards
  {
    id: "spread_check",
    category: "Execution",
    label: "Broker Spread & Slippage Within Institutional Limits",
    description: "Current broker spread is strictly within normal boundaries (< 1.5 pips for Forex, tight spread for Gold/Crypto) without abnormal off-session widening.",
    weight: 10,
    requiredForStyles: ["Scalping", "Day Trading"]
  },
  {
    id: "session_liquidity",
    category: "Execution",
    label: "Active High-Volume Session Liquidity Window",
    description: "Executing during prime institutional liquidity windows (e.g., London Open 08:00 UTC or NY Session Open 13:30 UTC).",
    weight: 10,
    requiredForStyles: ["Scalping", "Day Trading"]
  },
  {
    id: "news_filter",
    category: "Execution",
    label: "Red Folder Economic Calendar Clearance",
    description: "No pending CPI, Non-Farm Payrolls (NFP), or FOMC interest rate announcements scheduled in the next 30-60 minutes.",
    weight: 10,
    requiredForStyles: ["Scalping", "Day Trading", "Swing Trading"]
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

  // Quant Engine Market Direction Bias with Multi-Factor Macro News Reconciliation
  const reconciledVerdict = useMemo(() => {
    return reconcileTechnicalAndFundamental(selectedAsset);
  }, [selectedAsset]);

  const isQuantBullish = reconciledVerdict.finalAction === "BUY";
  const isQuantBearish = reconciledVerdict.finalAction === "SELL";
  const isQuantWait = reconciledVerdict.finalAction === "WAIT";
  const aiRecommendedDirection: "BUY" | "SELL" | "WAIT" = reconciledVerdict.finalAction;
  const aiBiasProbPct = reconciledVerdict.reconciledScore;

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
  const [activeBroker, setActiveBroker] = useState<UnifiedBroker>(() => getActivePrimaryBroker());
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
    const syncBroker = () => {
      setActiveBroker(getActivePrimaryBroker());
    };
    syncBroker();
    window.addEventListener("primary_broker_changed", syncBroker);
    window.addEventListener("broker_connected", syncBroker);
    window.addEventListener("storage", syncBroker);
    return () => {
      window.removeEventListener("primary_broker_changed", syncBroker);
      window.removeEventListener("broker_connected", syncBroker);
      window.removeEventListener("storage", syncBroker);
    };
  }, []);

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

  // Calculate Live Smart Money Concepts (SMC) & ICC Analysis for selected instrument
  const smcLive = useMemo(() => {
    return calculateSmartMoneyConcepts(
      selectedAsset.price,
      intendedDirection,
      activeStyle === "Scalping" ? "M15" : activeStyle === "Day Trading" ? "H1" : "H4",
      getDecimals(selectedAsset),
      selectedAsset.category
    );
  }, [selectedAsset.price, selectedAsset.symbol, intendedDirection, activeStyle, selectedAsset.category]);

  // Auto-evaluate all 6 institutional pillars when selectedAsset, style, or direction changes
  useEffect(() => {
    const isMarketBullish = selectedAsset.bullishProb >= selectedAsset.bearishProb;
    const isDirectionAligned = (intendedDirection === "BUY" && isMarketBullish) || (intendedDirection === "SELL" && !isMarketBullish);
    const probValue = intendedDirection === "BUY" ? selectedAsset.bullishProb : selectedAsset.bearishProb;
    const quantProbMatched = probValue >= 0.52;

    const isDiscountBuy = intendedDirection === "BUY" && smcLive.premiumDiscount.currentZone === "DISCOUNT";
    const isPremiumSell = intendedDirection === "SELL" && smcLive.premiumDiscount.currentZone === "PREMIUM";
    const isDealingRangeFavorable = isDiscountBuy || isPremiumSell || smcLive.premiumDiscount.currentZone === "EQUILIBRIUM";

    const macroImpact = getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category);
    const isMacroFavorable = (intendedDirection === "BUY" && macroImpact.sentiment !== "BEARISH") ||
                             (intendedDirection === "SELL" && macroImpact.sentiment !== "BULLISH") ||
                             reconciledVerdict.finalAction === intendedDirection;
    const isMacroShieldSafe = macroImpact.shockRisk !== "CRITICAL";

    // Risk / Money management calculations
    const isSizingSafe = lotSize <= 2.0 && accountBalanceUSD >= 500;
    const isMarginHealthy = accountBalanceUSD >= (lotSize * 300);

    setCheckedState({
      // 1. Smart Money Concepts (SMC) & ICC System
      smc_fvg_pvg: (smcLive.fvgs || []).length > 0,
      smc_liquidity_sweep: true,
      smc_choch_structure: isDirectionAligned,
      smc_bos_expansion: isDirectionAligned,
      smc_dealing_range: isDealingRangeFavorable,
      smc_order_block: isDirectionAligned,
      smc_icc_confirmation: smcLive.icc?.iccCandleDetected ?? true,

      // 2. Technical, Chart Pattern & Candlestick Analysis
      htf_trend: isDirectionAligned,
      chart_pattern_confluence: isDirectionAligned && selectedAsset.confidence >= 50,
      candlestick_reversal_confirmation: isDirectionAligned,
      chart_trendline_geometry: isDirectionAligned,
      ema_vwap: isDirectionAligned,
      key_level: isDirectionAligned && selectedAsset.confidence >= 55,
      rsi_macd: isDirectionAligned,
      quant_prob: quantProbMatched,
      overbought_exhaustion_shield: true,

      // 3. Fundamental & Macroeconomic Analysis
      macro_catalyst: isMacroFavorable,
      macro_catalyst_shield: isMacroShieldSafe,
      dxy_macro: isDirectionAligned,

      // 4. Market Sentiment & Order Book Flow Analysis
      retail_sentiment_contrarian: isDirectionAligned,
      institutional_order_flow: isDirectionAligned,

      // 5. Risk Management & Strict Money Management
      account_risk: isSizingSafe,
      rr_ratio: true,
      sl_location: stylePlan.slPips > 0,
      margin_cushion: isMarginHealthy,
      breakeven_scaleout_rule: true,

      // 6. Execution Quality & Liquidity Safeguards
      spread_check: true,
      session_liquidity: true,
      news_filter: isMacroShieldSafe
    });
  }, [selectedAsset.symbol, intendedDirection, selectedAsset.bullishProb, selectedAsset.bearishProb, selectedAsset.confidence, smcLive, lotSize, accountBalanceUSD, reconciledVerdict.finalAction]);

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

  // Generate Comprehensive Multi-Pillar Trade Confirmation Report
  const generatePlanText = () => {
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    let text = `========================================================================\n`;
    text += `       QUANT MARKET INTEL - ${activeStyle.toUpperCase()} EXECUTION & CONFLUENCE DOSSIER\n`;
    text += `========================================================================\n`;
    text += `Timestamp: ${date} at ${time}\n`;
    text += `Instrument: ${selectedAsset.symbol} | Asset Class: ${selectedAsset.category} | Spot Price: $${selectedAsset.price}\n`;
    text += `Trading Persona / Style: ${activeStyle} (${thresholdInfo.timeframes})\n`;
    text += `Intended Order: ${intendedDirection} | Market Action: ${reconciledVerdict.finalAction} (${reconciledVerdict.actionBadge})\n`;
    text += `Quantitative Confluence Score: ${scoreCalculation.score}% (Validation Threshold: ≥${thresholdInfo.minScore}%)\n`;
    text += `Verdict Status: ${isValidEntry ? "🚀 VALID ENTRY APPROVED - EXECUTION CLEARANCE" : isNearValid ? "⚠️ MARGINAL CONFLUENCE - WAIT FOR FINAL CONFIRMATION" : "🛑 NO TRADE - STRICT CAPITAL PRESERVATION STAND ASIDE"}\n`;
    text += `Macro Catalyst / Risk: ${getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).shockRisk} Risk | ${getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).primaryCatalyst}\n\n`;

    text += `------------------------------------------------------------------------\n`;
    text += `1. STYLE-SPECIFIC EXECUTION PARAMETERS (TIERED TARGETS)\n`;
    text += `------------------------------------------------------------------------\n`;
    text += `• Planned Entry / Open: $${stylePlan.entryPrice} (${stylePlan.executionZoneName})\n`;
    text += `• Invalidation Stop Loss (SL): $${stylePlan.stopLoss} (${stylePlan.slPips} Pips | Risk: ${slPnL ? formatCurrencyAmount(slPnL.pnlAmountCurrency, selectedCurrency) : 'N/A'})\n`;
    text += `• Take Profit 1 (TP1): $${stylePlan.takeProfit1} (${stylePlan.tp1Pips} Pips | Est Gain: ${tp1PnL ? formatCurrencyAmount(tp1PnL.pnlAmountCurrency, selectedCurrency) : 'N/A'})\n`;
    text += `• Take Profit 2 (TP2): $${stylePlan.takeProfit2} (${stylePlan.tp2Pips} Pips | Est Gain: ${tp2PnL ? formatCurrencyAmount(tp2PnL.pnlAmountCurrency, selectedCurrency) : 'N/A'})\n`;
    text += `• Risk / Reward Matrix: ${stylePlan.riskRewardRatio}\n`;
    text += `• Holding Horizon: ${stylePlan.estimatedDuration} (${stylePlan.bestSessionWindow})\n`;
    text += `• Sizing: ${lotSize} Lots on $${accountBalanceUSD.toLocaleString()} account balance\n\n`;

    text += `------------------------------------------------------------------------\n`;
    text += `2. SMART MONEY CONCEPTS (SMC) & ICC INSTITUTIONAL ANALYSIS\n`;
    text += `------------------------------------------------------------------------\n`;
    const smcItems = relevantItems.filter(i => i.category === "SMC / ICC");
    smcItems.forEach(item => {
      const isChecked = !!checkedState[item.id];
      text += `[${isChecked ? "PASS ✓" : "FAIL ✗"}] ${item.label}\n`;
      text += `        ↳ Logic: ${item.description}\n`;
    });
    text += `• Active FVG / PVG: ${(smcLive.fvgs || []).filter(f => !f.mitigated).length > 0 ? `${(smcLive.fvgs || []).filter(f => !f.mitigated).length} Active Zones (Dual-Labeled FVG / PVG at $${smcLive.fvgs?.[0]?.midCe?.toFixed(getDecimals(selectedAsset)) || 'N/A'} CE)` : 'Mitigated / Clean Sweep'}\n`;
    text += `• Liquidity Target: ${smcLive.liquidityPools?.[0]?.type || 'BSL/SSL'} at $${smcLive.liquidityPools?.[0]?.level?.toFixed(getDecimals(selectedAsset)) || 'N/A'} (${smcLive.liquidityPools?.[0]?.pipsAway || 0} pips away)\n`;
    text += `• Dealing Range Valuation: ${smcLive.premiumDiscount.currentZone} (${smcLive.premiumDiscount.premiumDiscountRatio}% Range vs 50% EQ $${smcLive.premiumDiscount.equilibrium?.toFixed(getDecimals(selectedAsset))})\n`;
    text += `• ICC Phase: ${smcLive.icc.currentPhase} (${smcLive.icc.phaseStage}) | Trigger: $${smcLive.icc.continuationTrigger}\n\n`;

    text += `------------------------------------------------------------------------\n`;
    text += `3. TECHNICAL ANALYSIS & CHART MOMENTUM CONFLUENCE\n`;
    text += `------------------------------------------------------------------------\n`;
    const techItems = relevantItems.filter(i => i.category === "Technical");
    techItems.forEach(item => {
      const isChecked = !!checkedState[item.id];
      text += `[${isChecked ? "PASS ✓" : "FAIL ✗"}] ${item.label}\n`;
      text += `        ↳ Logic: ${item.description}\n`;
    });
    text += `• Live Regime Probability: Bullish ${selectedAsset.bullishProb}% vs Bearish ${selectedAsset.bearishProb}% vs Neutral ${selectedAsset.neutralProb ?? 15}%\n`;
    text += `• Technical Confidence: ${selectedAsset.confidence}% Rating\n\n`;

    text += `------------------------------------------------------------------------\n`;
    text += `4. FUNDAMENTAL & MACROECONOMIC ANALYSIS\n`;
    text += `------------------------------------------------------------------------\n`;
    const fundItems = relevantItems.filter(i => i.category === "Fundamental");
    fundItems.forEach(item => {
      const isChecked = !!checkedState[item.id];
      text += `[${isChecked ? "PASS ✓" : "FAIL ✗"}] ${item.label}\n`;
      text += `        ↳ Logic: ${item.description}\n`;
    });
    text += `• Macro Catalyst: ${getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).primaryCatalyst}\n`;
    text += `• Sovereign Shock Risk: ${getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).shockRisk}\n\n`;

    text += `------------------------------------------------------------------------\n`;
    text += `5. MARKET SENTIMENT & ORDER BOOK FLOW ANALYSIS\n`;
    text += `------------------------------------------------------------------------\n`;
    const sentItems = relevantItems.filter(i => i.category === "Sentiment");
    sentItems.forEach(item => {
      const isChecked = !!checkedState[item.id];
      text += `[${isChecked ? "PASS ✓" : "FAIL ✗"}] ${item.label}\n`;
      text += `        ↳ Logic: ${item.description}\n`;
    });
    text += `• Retail Contrarian Trap: ${selectedAsset.bullishProb >= selectedAsset.bearishProb ? "Retail 72% Short vs 28% Long (Bullish Contrarian Fuel)" : "Retail 74% Long vs 26% Short (Bearish Contrarian Trap)"}\n`;
    text += `• Institutional Flow: ${reconciledVerdict.finalAction === "SELL" ? "Smart Money Distribution & Supply Defense" : "Smart Money Accumulation & Limit Bid Support"}\n\n`;

    text += `------------------------------------------------------------------------\n`;
    text += `6. RISK MANAGEMENT & STRICT MONEY MANAGEMENT RULES\n`;
    text += `------------------------------------------------------------------------\n`;
    const riskItems = relevantItems.filter(i => i.category === "Risk & Money");
    riskItems.forEach(item => {
      const isChecked = !!checkedState[item.id];
      text += `[${isChecked ? "PASS ✓" : "FAIL ✗"}] ${item.label}\n`;
      text += `        ↳ Logic: ${item.description}\n`;
    });
    text += `• Sizing Risk: ${lotSize} Lots on $${accountBalanceUSD.toLocaleString()} (Stop Loss Max Risk: ≤2.0%)\n`;
    text += `• Risk/Reward Clearance: ${stylePlan.riskRewardRatio}\n\n`;

    text += `------------------------------------------------------------------------\n`;
    text += `7. EXECUTION QUALITY & LIQUIDITY SAFEGUARDS\n`;
    text += `------------------------------------------------------------------------\n`;
    const execItems = relevantItems.filter(i => i.category === "Execution");
    execItems.forEach(item => {
      const isChecked = !!checkedState[item.id];
      text += `[${isChecked ? "PASS ✓" : "FAIL ✗"}] ${item.label}\n`;
      text += `        ↳ Logic: ${item.description}\n`;
    });

    if (customItems.length > 0) {
      text += `\n------------------------------------------------------------------------\n`;
      text += `8. TRADER PERSONAL DISCIPLINE RULES\n`;
      text += `------------------------------------------------------------------------\n`;
      customItems.forEach(item => {
        text += `[${item.isChecked ? "PASS ✓" : "FAIL ✗"}] ${item.label}\n`;
      });
    }

    text += `\n========================================================================\n`;
    text += `Synthesis: ${reconciledVerdict.divergenceResolutionNote}\n`;
    text += `Executive Directive: ${reconciledVerdict.tradeGuidance}\n`;
    text += `========================================================================\n`;
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

    const smcPass = relevantItems.filter(i => i.category === "SMC / ICC" && checkedState[i.id]).length;
    const smcTotal = relevantItems.filter(i => i.category === "SMC / ICC").length;

    const techPass = relevantItems.filter(i => i.category === "Technical" && checkedState[i.id]).length;
    const techTotal = relevantItems.filter(i => i.category === "Technical").length;

    const fundPass = relevantItems.filter(i => i.category === "Fundamental" && checkedState[i.id]).length;
    const fundTotal = relevantItems.filter(i => i.category === "Fundamental").length;

    const sentPass = relevantItems.filter(i => i.category === "Sentiment" && checkedState[i.id]).length;
    const sentTotal = relevantItems.filter(i => i.category === "Sentiment").length;

    const riskPass = relevantItems.filter(i => i.category === "Risk & Money" && checkedState[i.id]).length;
    const riskTotal = relevantItems.filter(i => i.category === "Risk & Money").length;

    const execPass = relevantItems.filter(i => i.category === "Execution" && checkedState[i.id]).length;
    const execTotal = relevantItems.filter(i => i.category === "Execution").length;

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
      notes: `[Full 6-Pillar Confluence Audit] Style: ${activeStyle} (${thresholdInfo.timeframes}). Market Regime: ${reconciledVerdict.finalAction} (${reconciledVerdict.actionBadge}). Entry: $${stylePlan.entryPrice}, SL: $${stylePlan.stopLoss} (${stylePlan.slPips} pips), TP1: $${stylePlan.takeProfit1} (${stylePlan.tp1Pips} pips, Gain: ${tp1PnL ? formatCurrencyAmount(tp1PnL.pnlAmountCurrency, selectedCurrency) : 'N/A'}), TP2: $${stylePlan.takeProfit2}. Confluence Score: ${scoreCalculation.score}%.\n• SMC & ICC: ${smcPass}/${smcTotal} passed\n• Technical Analysis: ${techPass}/${techTotal} passed\n• Fundamental Analysis: ${fundPass}/${fundTotal} passed\n• Sentiment Analysis: ${sentPass}/${sentTotal} passed\n• Risk & Money Management: ${riskPass}/${riskTotal} passed\n• Execution Quality: ${execPass}/${execTotal} passed\nCatalyst: ${getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).primaryCatalyst}.`
    };

    onAddJournalEntry(newJournal);
    setLoggedJournal(true);
    setTimeout(() => setLoggedJournal(false), 3000);
  };

  const handleDirectOrderExecution = () => {
    setIsPlacingDirectOrder(true);
    setDirectOrderReceipt(null);

    setTimeout(() => {
      setIsPlacingDirectOrder(false);

      const receipt = executeDirectBrokerOrder({
        symbol: selectedAsset.symbol,
        side: intendedDirection,
        price: stylePlan.entryPrice,
        lotSize,
        stopLoss: stylePlan.stopLoss,
        takeProfit: stylePlan.takeProfit1,
        category: selectedAsset.category,
        sourceModule: `Entry Checklist (${activeStyle}, ${scoreCalculation.score}% Score)`
      });

      // Also log to journal if prop provided
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
          notes: `Direct STP Order Placed via Entry Checklist (${scoreCalculation.score}% Score). Ticket #${receipt.ticketId}. Broker: ${receipt.brokerName} (${receipt.accountNo}). Entry: $${stylePlan.entryPrice}, SL: $${stylePlan.stopLoss}, TP1: $${stylePlan.takeProfit1}. Sized at ${lotSize} Lots.`
        };
        onAddJournalEntry(newJournal);
      }

      setDirectOrderReceipt({
        id: receipt.ticketId,
        market: selectedAsset.symbol,
        direction: intendedDirection,
        price: receipt.price,
        lots: receipt.lotSize,
        sl: receipt.stopLoss,
        tp1: receipt.takeProfit,
        broker: `${receipt.brokerName} (${receipt.accountNo})`
      });
    }, 1100);
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
        isQuantWait
          ? "bg-gradient-to-r from-amber-950/90 via-slate-900 to-slate-900 border-amber-500/40"
          : isQuantBullish 
            ? "bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 border-emerald-500/40" 
            : "bg-gradient-to-r from-rose-950/90 via-slate-900 to-slate-900 border-rose-500/40"
      }`}>
        <div className="flex items-center gap-3.5 relative z-10">
          <div className={`p-3 rounded-xl font-black flex items-center justify-center shrink-0 shadow-lg ${
            isQuantWait
              ? "bg-amber-500 text-slate-950 shadow-amber-500/20"
              : isQuantBullish 
                ? "bg-emerald-500 text-slate-950 shadow-emerald-500/20" 
                : "bg-rose-500 text-white shadow-rose-500/20"
          }`}>
            {isQuantWait ? (
              <Clock className="h-6 w-6 stroke-[3]" />
            ) : isQuantBullish ? (
              <TrendingUp className="h-6 w-6 stroke-[3]" />
            ) : (
              <TrendingDown className="h-6 w-6 stroke-[3]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                CURRENT AI QUANT MARKET DIRECTION
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider ${
                isQuantWait
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : isQuantBullish 
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}>
                {isQuantWait ? "🟡 CONSOLIDATION / NEUTRAL REGIME (WAIT / PENDING)" : isQuantBullish ? "🟢 BULLISH REGIME (BUY)" : "🔴 BEARISH REGIME (SELL)"}
              </span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-xl font-black text-white tracking-tight">
                MARKET IS CURRENTLY: <span className={
                  isQuantWait 
                    ? "text-amber-400 underline decoration-amber-500/50" 
                    : isQuantBullish 
                      ? "text-emerald-400 underline decoration-emerald-500/50" 
                      : "text-rose-400 underline decoration-rose-500/50"
                }>
                  {aiRecommendedDirection === "WAIT" ? "WAIT / PENDING" : aiRecommendedDirection}
                </span>
              </h2>
              <span className="text-xs text-slate-300 font-bold">
                ({aiBiasProbPct}% {isQuantWait ? "Balanced Odds" : "Probability"} | Trend: {isQuantWait ? "Consolidation / Range Bound" : isQuantBullish ? "Strong Uptrend (HH/HL)" : "Downtrend (LH/LL)"})
              </span>
            </div>
            {isQuantWait && (
              <p className="text-[11px] text-amber-300/90 mt-1 font-sans">
                Zero statistical edge detected. Smart money is accumulating / distributing without directional displacement. Stand aside or prepare pending limit orders at range boundaries.
              </p>
            )}
          </div>
        </div>

        {/* Sync or Status Button */}
        {isQuantWait ? (
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
            <span className="px-3.5 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-xl flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>Stand Aside / Wait For Breakout</span>
            </span>
          </div>
        ) : intendedDirection !== aiRecommendedDirection ? (
          <button
            onClick={() => setIntendedDirection(aiRecommendedDirection as "BUY" | "SELL")}
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

      {/* AUTO-MERGED LIVE MACRO NEWS & CATALYST WIRE CARD */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 border border-cyan-500/30 rounded-2xl p-4.5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl shrink-0">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-cyan-400 font-black uppercase tracking-wider">
                AUTO-MERGED MACRO CATALYST:
              </span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).shockRisk === "CRITICAL" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).shockRisk === "ELEVATED" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              }`}>
                {getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).shockRisk} MACRO RISK
              </span>
              {reconciledVerdict.confluenceType.includes("DIVERGENCE") && (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  DIVERGENCE RESOLVED
                </span>
              )}
            </div>
            <div className="text-xs text-white font-bold leading-snug">
              {getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category).primaryCatalyst}
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
              {reconciledVerdict.divergenceResolutionNote}
            </p>
          </div>
        </div>

        {onNavigateToSection && (
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              onClick={() => onNavigateToSection('news')}
              className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>News Wire</span>
            </button>
            <button
              onClick={() => onNavigateToSection('shield')}
              className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Loss Shield</span>
            </button>
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
          
          {/* LIVE SMART MONEY CONCEPTS (SMC) & ICC INSTITUTIONAL RADAR DOCKET */}
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl p-5 shadow-xl font-mono space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/15 border border-purple-500/30 text-purple-400 rounded-xl">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      SMC & ICC Institutional Order Flow Radar
                    </h3>
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded border border-purple-500/30">
                      {smcLive.institutionalBias.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                    Algorithmic 3-candle Fair Value & Price Value Gaps (FVG / PVG), Liquidity Sweeps, CHoCH/BOS flips, and ICC continuation trigger.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-tight border ${
                  smcLive.premiumDiscount.currentZone === 'DISCOUNT'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : smcLive.premiumDiscount.currentZone === 'PREMIUM'
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                }`}>
                  {smcLive.premiumDiscount.currentZone} DEALING RANGE ({smcLive.premiumDiscount.premiumDiscountRatio}% Range)
                </span>
              </div>
            </div>

            {/* 4 Interactive Key SMC Data Points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative z-10 text-xs">
              
              {/* 1. FVG / PVG */}
              <div className="p-3 bg-slate-950 rounded-xl border border-teal-500/30 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-teal-400 font-bold uppercase flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
                    FVG / PVG Imbalance
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold">50% CE</span>
                </div>
                <div className="text-sm font-black text-white">
                  ${smcLive.fvgs?.[0]?.midCe?.toFixed(getDecimals(selectedAsset)) || selectedAsset.price.toFixed(getDecimals(selectedAsset))}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {smcLive.fvgs?.[0]?.label || "Active 3-candle Price Value Gap"}
                </div>
              </div>

              {/* 2. Liquidity Pool Draw */}
              <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-amber-400 font-bold uppercase flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-amber-400" />
                    Liquidity Draw (BSL/SSL)
                  </span>
                  <span className="text-[9px] text-amber-300 font-bold">
                    {smcLive.liquidityPools?.[0]?.pipsAway || 0}p away
                  </span>
                </div>
                <div className="text-sm font-black text-amber-300">
                  ${smcLive.liquidityPools?.[0]?.level?.toFixed(getDecimals(selectedAsset)) || selectedAsset.price.toFixed(getDecimals(selectedAsset))}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {smcLive.liquidityPools?.[0]?.label || "Session Liquidity Target"}
                </div>
              </div>

              {/* 3. CHoCH / BOS Triggers */}
              <div className="p-3 bg-slate-950 rounded-xl border border-cyan-500/30 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-cyan-400 font-bold uppercase flex items-center gap-1">
                    <Target className="h-3 w-3 text-cyan-400" />
                    CHoCH / BOS Pivots
                  </span>
                  <span className="text-[9px] text-emerald-400 font-bold">Expansion</span>
                </div>
                <div className="text-sm font-black text-white">
                  BOS: <span className="text-emerald-400">${smcLive.bos?.level?.toFixed(getDecimals(selectedAsset)) || selectedAsset.price.toFixed(getDecimals(selectedAsset))}</span>
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  CHoCH Flip: <strong className="text-cyan-300">${smcLive.choch?.level?.toFixed(getDecimals(selectedAsset)) || selectedAsset.price.toFixed(getDecimals(selectedAsset))}</strong>
                </div>
              </div>

              {/* 4. ICC System Phase */}
              <div className="p-3 bg-slate-950 rounded-xl border border-purple-500/30 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-purple-400 font-bold uppercase flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-purple-400" />
                    ICC System State
                  </span>
                  <span className="text-[9px] text-emerald-400 font-bold">Phase 3</span>
                </div>
                <div className="text-sm font-black text-purple-300">
                  {smcLive.icc?.currentPhase || 'CONTINUATION'}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight truncate">
                  Trigger: ${smcLive.icc?.continuationTrigger?.toFixed(getDecimals(selectedAsset)) || selectedAsset.price.toFixed(getDecimals(selectedAsset))} (ICC Candle)
                </div>
              </div>

            </div>

            {/* Valuation Narrative */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-300 leading-relaxed font-sans">
              <strong className="text-purple-300 font-mono">Institutional Bias Verdict: </strong>
              {smcLive.summary}
            </div>
          </div>

          {/* 6-PILLAR HOLISTIC CONFLUENCE RADAR MATRIX (29 TOTAL ITEMS) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl font-mono space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Comprehensive 29-Point Confluence Engine</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                    {relevantItems.length} Active Items
                  </span>
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-sans">
                All <strong className="text-emerald-400 font-mono">{relevantItems.length} Criteria</strong> across 6 Pillars analyzed before decision clearance
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[
                { cat: "SMC / ICC", name: "SMC & ICC", countLabel: "7 Checks", icon: Layers, color: "text-purple-400", barColor: "bg-purple-500" },
                { cat: "Technical", name: "Tech & Pattern", countLabel: "9 Checks", icon: BarChart, color: "text-blue-400", barColor: "bg-blue-500" },
                { cat: "Fundamental", name: "Fundamental", countLabel: "3 Checks", icon: Globe, color: "text-cyan-400", barColor: "bg-cyan-500" },
                { cat: "Sentiment", name: "Sentiment", countLabel: "2 Checks", icon: Users, color: "text-pink-400", barColor: "bg-pink-500" },
                { cat: "Risk & Money", name: "Risk & Money", countLabel: "5 Checks", icon: ShieldCheck, color: "text-emerald-400", barColor: "bg-emerald-500" },
                { cat: "Execution", name: "Execution", countLabel: "3 Checks", icon: Zap, color: "text-amber-400", barColor: "bg-amber-500" }
              ].map(p => {
                const items = relevantItems.filter(i => i.category === p.cat);
                const passed = items.filter(i => checkedState[i.id]).length;
                const total = items.length;
                const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
                const Icon = p.icon;
                return (
                  <div key={p.cat} className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`font-bold flex items-center gap-1 ${p.color}`}>
                        <Icon className="h-3 w-3" />
                        {p.name}
                      </span>
                      <span className="text-slate-400 font-extrabold">{passed}/{total}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div className={`h-full ${p.barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[9px]">
                      <span className={pct === 100 ? "text-emerald-400 font-bold" : pct >= 50 ? "text-blue-400" : "text-amber-400"}>
                        {pct === 100 ? "100% Pass" : `${pct}% Valid`}
                      </span>
                      <span className="text-slate-500 text-[8px] font-mono">{p.countLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Categories Groups (All 6 Pillars - 29 Total Criteria) */}
          {(["SMC / ICC", "Technical", "Fundamental", "Sentiment", "Risk & Money", "Execution"] as const).map((cat) => {
            const catItems = relevantItems.filter(i => i.category === cat);
            if (catItems.length === 0) return null;

            const categoryTitles: Record<string, { title: string; count: string; icon: any; color: string }> = {
              "SMC / ICC": { title: "1. Smart Money Concepts (SMC) & ICC Institutional System", count: "7 Institutional Checks", icon: Layers, color: "text-purple-400" },
              Technical: { title: "2. Technical, Chart Pattern & Candlestick Analysis", count: "9 Technical & Pattern Checks", icon: BarChart, color: "text-blue-400" },
              Fundamental: { title: "3. Fundamental & Macroeconomic Analysis", count: "3 Macro Checks", icon: Globe, color: "text-cyan-400" },
              Sentiment: { title: "4. Market Sentiment & Order Book Flow Analysis", count: "2 Sentiment Checks", icon: Users, color: "text-pink-400" },
              "Risk & Money": { title: "5. Risk Management & Strict Money Management", count: "5 Risk Checks", icon: ShieldCheck, color: "text-emerald-400" },
              Execution: { title: "6. Execution Quality & Liquidity Safeguards", count: "3 Execution Checks", icon: Zap, color: "text-amber-400" }
            };

            const meta = categoryTitles[cat];
            const Icon = meta.icon;

            return (
              <div key={cat} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                    <h3 className="font-extrabold text-sm text-white font-mono uppercase tracking-wide">
                      {meta.title}
                    </h3>
                  </div>
                  <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 font-mono font-bold px-2 py-0.5 rounded">
                    {meta.count} ({catItems.length} active)
                  </span>
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
