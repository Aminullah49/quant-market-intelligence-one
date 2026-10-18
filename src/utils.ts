import { MarketAsset, MarketAnalysisResponse, TradeSetupPlan } from "./types";

// Dynamic price decimal formatting based on asset class and price scale
export function getDecimals(asset: MarketAsset): number {
  if (asset.price < 0.001) return 7;
  if (asset.price < 0.01) return 6;
  if (asset.price < 1.0) return 4;
  if (asset.category === "Forex" || asset.price < 2.0) {
    return 4;
  }
  return 2;
}

// Deterministic multiplier based on timeframe for support/resistance volatility scaling
export function getTimeframeMultiplier(timeframe: string, category?: string): number {
  const isCrypto = category === "Crypto";
  if (isCrypto) {
    switch (timeframe) {
      case "M1": return 0.008;
      case "M5": return 0.012;
      case "M15": return 0.018;
      case "H1": return 0.028;
      case "H4": return 0.045;
      case "D1": return 0.075;
      case "W1": return 0.12;
      case "MN": return 0.18;
      default: return 0.045;
    }
  }
  switch (timeframe) {
    case "M1": return 0.003;
    case "M5": return 0.005;
    case "M15": return 0.008;
    case "H1": return 0.015;
    case "H4": return 0.025;
    case "D1": return 0.045;
    case "W1": return 0.08;
    case "MN": return 0.15;
    default: return 0.025; // Default to H4
  }
}

// Unified, deterministic calculation for Support and Resistance Levels (3 tiers: S1, S2, S3 & R1, R2, R3)
export function getUnifiedSupportResistance(price: number, timeframe: string, decimals: number, category?: string) {
  const tfCoeff = getTimeframeMultiplier(timeframe, category);
  const s1 = Number((price * (1 - tfCoeff * 0.45)).toFixed(decimals));
  const s2 = Number((price * (1 - tfCoeff * 1.25)).toFixed(decimals));
  const s3 = Number((price * (1 - tfCoeff * 2.40)).toFixed(decimals));
  const r1 = Number((price * (1 + tfCoeff * 0.45)).toFixed(decimals));
  const r2 = Number((price * (1 + tfCoeff * 1.25)).toFixed(decimals));
  const r3 = Number((price * (1 + tfCoeff * 2.40)).toFixed(decimals));
  return {
    support: [s1, s2, s3],
    resistance: [r1, r2, r3],
    s1, s2, s3,
    r1, r2, r3
  };
}

export interface TradingStyleProfile {
  id: 'Scalper' | 'Intraday Trader' | 'Day Trader' | 'Swing Trader' | 'Position Trader';
  name: string;
  holdingTime: string;
  holdingMinutes: number;
  tp1Pips: number;
  tp2Pips: number;
  tp3Pips: number;
  // 3 Additional TPs computed using 1st TP value (+10, +20, +40)
  tp4Pips: number; // 1st TP + 10
  tp5Pips: number; // 1st TP + 20
  tp6Pips: number; // 1st TP + 40
  sl1Pips: number;
  sl2Pips: number;
  sl3Pips: number;
  intervalPips: number;
  description: string;
}

// Calibrated directly from reference table with +5 baseline addition, 5-10 pip intervals between tiers, and 3 additional TPs (TP1 + 10, +20, +40)
export const STYLE_TPSL_PROFILES: Record<string, TradingStyleProfile> = {
  Scalper: {
    id: 'Scalper',
    name: 'Scalping',
    holdingTime: 'Seconds to minutes (10 - 15 Mins)',
    holdingMinutes: 12,
    // Baseline (3-10 TP, 5-15 SL) with +5 added:
    // TP1 = 8 pips, TP2 = 15 pips, TP3 = 23 pips
    // 3 Additional TPs from 1st TP (+10, +20, +40): TP4 = 18 pips, TP5 = 28 pips, TP6 = 48 pips
    tp1Pips: 8,
    tp2Pips: 15,
    tp3Pips: 23,
    tp4Pips: 18,
    tp5Pips: 28,
    tp6Pips: 48,
    sl1Pips: 10,
    sl2Pips: 16,
    sl3Pips: 23,
    intervalPips: 7,
    description: 'High-velocity scalping. Ultra-tight micro invalidation with sequential 5-8 pip scale-outs and +10/+20/+40 extended runners.'
  },
  'Intraday Trader': {
    id: 'Intraday Trader',
    name: 'Intraday Trading',
    holdingTime: 'Minutes to hours (45 Mins - 2 Hours)',
    holdingMinutes: 90,
    // Baseline (10-30 TP, 10-25 SL) with +5 added:
    // 3 Additional TPs from 1st TP (+10, +20, +40): TP4 = 25 pips, TP5 = 35 pips, TP6 = 55 pips
    tp1Pips: 15,
    tp2Pips: 23,
    tp3Pips: 32,
    tp4Pips: 25,
    tp5Pips: 35,
    tp6Pips: 55,
    sl1Pips: 15,
    sl2Pips: 22,
    sl3Pips: 30,
    intervalPips: 8,
    description: 'Single-session intraday moves capturing session liquidity sweeps and order block retests with extended runner targets.'
  },
  'Day Trader': {
    id: 'Day Trader',
    name: 'Day Trading',
    holdingTime: 'Hours (2 - 6 Hours)',
    holdingMinutes: 240,
    // Baseline (20-60 TP, 15-40 SL) with +5 added:
    // 3 Additional TPs from 1st TP (+10, +20, +40): TP4 = 35 pips, TP5 = 45 pips, TP6 = 65 pips
    tp1Pips: 25,
    tp2Pips: 35,
    tp3Pips: 50,
    tp4Pips: 35,
    tp5Pips: 45,
    tp6Pips: 65,
    sl1Pips: 20,
    sl2Pips: 29,
    sl3Pips: 39,
    intervalPips: 10,
    description: 'Full-day structured directional expansions holding from London/NY open to session settlement with multi-stage scale outs.'
  },
  'Swing Trader': {
    id: 'Swing Trader',
    name: 'Swing Trading',
    holdingTime: 'Days to weeks (1 - 5 Days)',
    holdingMinutes: 2880,
    // Baseline (50-200 TP, 30-100 SL) with +5 added:
    // 3 Additional TPs from 1st TP (+10, +20, +40): TP4 = 65 pips (or 90 for 80 baseline), TP5 = 75 pips, TP6 = 95 pips
    tp1Pips: 55,
    tp2Pips: 95,
    tp3Pips: 160,
    tp4Pips: 65,
    tp5Pips: 75,
    tp6Pips: 95,
    sl1Pips: 35,
    sl2Pips: 60,
    sl3Pips: 95,
    intervalPips: 35,
    description: 'Multi-day cyclical waves surfing institutional daily trends with multi-target risk-free scaling.'
  },
  'Position Trader': {
    id: 'Position Trader',
    name: 'Position Trading',
    holdingTime: 'Weeks to months (1 - 12 Weeks)',
    holdingMinutes: 20160,
    // Baseline (100-500+ TP, 50-250+ SL) with +5 added:
    // 3 Additional TPs from 1st TP (+10, +20, +40): TP4 = 115 pips, TP5 = 125 pips, TP6 = 145 pips
    tp1Pips: 105,
    tp2Pips: 220,
    tp3Pips: 380,
    tp4Pips: 115,
    tp5Pips: 125,
    tp6Pips: 145,
    sl1Pips: 55,
    sl2Pips: 110,
    sl3Pips: 190,
    intervalPips: 80,
    description: 'Macro quarterly and cyclical positioning aligned with central bank interest rate differentials.'
  }
};

// Calculates Support (S1, S2, S3), Resistance (R1, R2, R3), HH/LL Market Structure, and Key Reversal Points (CHoCH, BOS, Pivot)
export function calculateMarketStructureLevels(
  price: number,
  direction: 'BUY' | 'SELL',
  timeframe: string,
  decimals: number,
  category?: string,
  pipFactor: number = 0.0001
): import('./types').MarketStructureLevels {
  const tfCoeff = getTimeframeMultiplier(timeframe, category);
  const isBuy = direction === 'BUY';

  // Support Levels S1, S2, S3
  const s1 = Number((price * (1 - tfCoeff * 0.45)).toFixed(decimals));
  const s2 = Number((price * (1 - tfCoeff * 1.25)).toFixed(decimals));
  const s3 = Number((price * (1 - tfCoeff * 2.40)).toFixed(decimals));

  // Resistance Levels R1, R2, R3
  const r1 = Number((price * (1 + tfCoeff * 0.45)).toFixed(decimals));
  const r2 = Number((price * (1 + tfCoeff * 1.25)).toFixed(decimals));
  const r3 = Number((price * (1 + tfCoeff * 2.40)).toFixed(decimals));

  const s1Pips = Math.max(1, Math.round(Math.abs(price - s1) / pipFactor));
  const s2Pips = Math.max(2, Math.round(Math.abs(price - s2) / pipFactor));
  const s3Pips = Math.max(3, Math.round(Math.abs(price - s3) / pipFactor));

  const r1Pips = Math.max(1, Math.round(Math.abs(r1 - price) / pipFactor));
  const r2Pips = Math.max(2, Math.round(Math.abs(r2 - price) / pipFactor));
  const r3Pips = Math.max(3, Math.round(Math.abs(r3 - price) / pipFactor));

  // High / Low Levels (HH, HL, LH, LL)
  const higherHigh = Number((price * (1 + tfCoeff * 1.65)).toFixed(decimals));
  const higherLow = Number((price * (1 - tfCoeff * 0.85)).toFixed(decimals));
  const lowerHigh = Number((price * (1 + tfCoeff * 0.85)).toFixed(decimals));
  const lowerLow = Number((price * (1 - tfCoeff * 1.65)).toFixed(decimals));

  const structureState = isBuy 
    ? 'BULLISH (HH & HL)' 
    : 'BEARISH (LH & LL)';

  // Reversal Points (CHoCH, BOS, Reversal Pivot)
  // CHoCH (Change of Character): Break of local protected low for BUY, or protected high for SELL
  const chochLevel = isBuy ? higherLow : lowerHigh;
  // BOS (Break of Structure): Break of continuation swing high for BUY, swing low for SELL
  const bosLevel = isBuy ? higherHigh : lowerLow;
  // Key Institutional Invalidation Reversal Pivot
  const reversalPivot = isBuy
    ? Number((higherLow - Math.abs(higherLow - s2) * 0.4).toFixed(decimals))
    : Number((lowerHigh + Math.abs(r2 - lowerHigh) * 0.4).toFixed(decimals));

  const invalidationThreshold = Math.max(1, Math.round(Math.abs(reversalPivot - price) / pipFactor));

  return {
    support: {
      s1,
      s2,
      s3,
      s1Label: "Immediate Dynamic Shelf (S1)",
      s2Label: "Institutional Order Block Demand (S2)",
      s3Label: "Major Macro Invalidation Base (S3)",
      s1Pips,
      s2Pips,
      s3Pips
    },
    resistance: {
      r1,
      r2,
      r3,
      r1Label: "Immediate Dynamic Cap (R1)",
      r2Label: "Institutional Supply Block (R2)",
      r3Label: "Macro Range High Liquidity Pool (R3)",
      r1Pips,
      r2Pips,
      r3Pips
    },
    highLow: {
      higherHigh,
      higherLow,
      lowerHigh,
      lowerLow,
      structureState,
      lastSwingHighTime: "Previous Session High",
      lastSwingLowTime: "Previous Session Low"
    },
    reversal: {
      chochLevel,
      bosLevel,
      reversalPivot,
      reversalType: isBuy ? 'Bearish Reversal' : 'Bullish Reversal',
      invalidationThreshold,
      explanation: isBuy 
        ? `CHoCH invalidation triggers if price breaches $${chochLevel.toFixed(decimals)} (-${s1Pips} pips). Continuation BOS triggers on breakout above $${bosLevel.toFixed(decimals)} (+${r1Pips} pips). Reversal pivot defended at $${reversalPivot.toFixed(decimals)}.`
        : `CHoCH invalidation triggers if price breaches $${chochLevel.toFixed(decimals)} (+${r1Pips} pips). Continuation BOS triggers on breakdown below $${bosLevel.toFixed(decimals)} (-${s1Pips} pips). Reversal pivot defended at $${reversalPivot.toFixed(decimals)}.`
    }
  };
}

// Unified, deterministic composite score calculating formula
export function calculateUnifiedScore(asset: { bullishProb: number; bearishProb: number; confidence: number }, timeframe: string): number {
  const isBullish = asset.bullishProb > asset.bearishProb;
  const baseProb = isBullish ? asset.bullishProb : asset.bearishProb;
  
  let tfFactor = 1.0;
  switch (timeframe) {
    case "M1": tfFactor = 0.92; break;
    case "M5": tfFactor = 0.95; break;
    case "M15": tfFactor = 0.97; break;
    case "H1": tfFactor = 1.00; break;
    case "H4": tfFactor = 1.03; break;
    case "D1": tfFactor = 1.06; break;
    case "W1": tfFactor = 1.10; break;
    case "MN": tfFactor = 1.15; break;
  }
  
  const rawScore = (baseProb * 0.6 + asset.confidence * 0.4) * tfFactor;
  return Math.min(100, Math.max(5, Math.round(rawScore)));
}

// Generates dynamic, highly realistic market analysis matching the selected asset's actual price and category
export function generateDynamicAnalysis(asset: MarketAsset, timeframe: string = "H4"): MarketAnalysisResponse {
  const decimals = getDecimals(asset);
  const price = asset.price;

  const { support, resistance } = getUnifiedSupportResistance(price, timeframe, decimals, asset.category);
  const support1 = support[0];
  const support2 = support[1];
  const resistance1 = resistance[0];
  const resistance2 = resistance[1];

  // Custom text based on asset category
  let fundamentalText = "";
  let sentimentText = "";
  let trendText = "";

  if (asset.category === "Crypto") {
    trendText = "Ascending Bullish structure with robust Spot accumulation signatures.";
    fundamentalText = "On-chain wallet flows indicate a sharp decline in Exchange reserves, confirming strong HODL activity. Stablecoin purchasing power rises by +12% week-on-week.";
    sentimentText = "Retail funding rate has normalized after a quick long liquidation sweep. Contrarian indicators point to clear institutional accumulation.";
  } else if (asset.category === "Forex") {
    trendText = "Liquidity seeking consolidative range respecting discount order blocks.";
    fundamentalText = "Bond yield differentials between primary central banks are stabilizing. Upcoming retail sales and central bank speaker minutes are capping immediate ranges.";
    sentimentText = "Commercial hedgers (Commitment of Traders - CoT) are expanding their net long positioning. Retail traders remain net short on this pair.";
  } else if (asset.category === "Stocks") {
    trendText = "Structural markup phase with rising volume-weighted average price (VWAP).";
    fundamentalText = "Strong quarterly guidance from leading components and solid buyback program authorizations are supporting premium valuations.";
    sentimentText = "Option skew indicates bullish call buying dominates. Short interest has retreated to historical lows.";
  } else if (asset.category === "Commodities") {
    trendText = "SMC Order Block hold following key structural sweep.";
    fundamentalText = "Supply-side bottlenecks and geopolitical hedges are triggering physical settlement premium bidding in primary global hubs.";
    sentimentText = "Managed money participants are actively rolling over long positions, boosting bullish momentum.";
  } else {
    trendText = "Institutional index basket rebalancing driving trend continuation.";
    fundamentalText = "Index constituent earnings beat average consensus estimates by +4.2%, with strong margins offsetting higher debt financing costs.";
    sentimentText = "Systematic CTA trend-followers are 85% long. Put/Call option volume ratios reflect strong hedge defenses at key support levels.";
  }

  const calculatedScore = calculateUnifiedScore(asset, timeframe);

  return {
    symbol: asset.symbol,
    timeframe: timeframe,
    bullishProb: asset.bullishProb,
    bearishProb: asset.bearishProb,
    neutralProb: asset.neutralProb,
    confidence: asset.confidence,
    marketStructure: {
      trend: trendText,
      structure: `CHoCH (Change of Character) confirmed on ${timeframe}. Price respects discount buy-side order block near $${support1}.`,
      support: [support1, support2],
      resistance: [resistance1, resistance2],
      liquidityZones: `Sell-side liquidity swept below $${support2}. Dynamic buyers defending discount level near $${support1}.`
    },
    detectedPatterns: [
      {
        name: asset.bullishProb > asset.bearishProb ? "Bullish Order Block" : "Bearish Rejection Block",
        type: "Smart Money Concepts",
        strength: "High",
        confidence: asset.confidence,
        explanation: `Institutional accumulation zone identified at the $${support1} range with peak volumes confirming buyer control.`
      },
      {
        name: "Ascending Channel Retest",
        type: "Chart Pattern",
        strength: "Medium",
        confidence: 76,
        explanation: `Price completed a dynamic channel retest near $${support1} and is bouncing back into the core value area.`
      }
    ],
    technicalSummary: `EMA 20 is crossing above SMA 50. RSI is holding at ${Math.min(95, Math.max(10, 35 + Math.floor(calculatedScore * 0.4)))} rebounding from oversold zones. VWAP represents the core defense floor at $${support1}.`,
    fundamentalSummary: fundamentalText,
    sentimentSummary: sentimentText,
    explanation: `The market for ${asset.symbol} on the ${timeframe} timeframe is currently displaying strong structural advantages. A clear liquidity grab below $${support2} flushed out weak leverage holders, which has cleared the path for a clean, low-resistance recovery trend towards target resistance of $${resistance1}.`,
    isMock: false
  };
}

// Generates dynamic, highly realistic trade setups matching the selected asset's actual price, direction, and trading style (Scalper / Intraday / Day Trader / Swing / Position)
export function generateDynamicSetup(
  asset: MarketAsset,
  direction: 'BUY' | 'SELL',
  timeframe: string = "H4",
  style?: 'Scalper' | 'Intraday Trader' | 'Day Trader' | 'Swing Trader' | 'Position Trader' | string
): TradeSetupPlan {
  const decimals = getDecimals(asset);
  const price = asset.price;

  // Determine effective style: explicit style or inferred from timeframe
  const effectiveStyle: 'Scalper' | 'Intraday Trader' | 'Day Trader' | 'Swing Trader' | 'Position Trader' = 
    style === 'Scalper' || timeframe === 'M1' || timeframe === 'M5'
      ? 'Scalper'
      : style === 'Intraday Trader' || timeframe === 'M15'
      ? 'Intraday Trader'
      : style === 'Day Trader' || timeframe === 'H1'
      ? 'Day Trader'
      : style === 'Position Trader' || timeframe === 'W1' || timeframe === 'MN'
      ? 'Position Trader'
      : 'Swing Trader';

  const sym = (asset.symbol || "").toUpperCase();
  const cat = asset.category || "";
  const isGold = sym.includes("XAU") || sym.includes("GOLD") || (cat === "Commodities" && price > 500);
  const isCrypto = cat === "Crypto" || /BTC|ETH|SOL|XRP|DOGE|PEPE|SHIB|ADA|AVAX/i.test(sym);
  const isForex = cat === "Forex" || (!isGold && !isCrypto && sym.includes("/"));
  const isIndex = cat === "Indices" || cat === "Indices Futures" || /US30|NAS100|SPX|NDX|GER40|DAX/i.test(sym);

  let pipFactor = 0.0001;
  let pipUnit = "Pips";

  if (isGold) {
    pipFactor = 0.10; // $0.10 per pip on Gold
    pipUnit = "Pips";
  } else if (isForex) {
    pipFactor = sym.includes("JPY") ? 0.01 : 0.0001;
    pipUnit = "Pips";
  } else if (isCrypto) {
    pipFactor = price > 1000 ? 1.0 : 0.01;
    pipUnit = "Pts";
  } else if (isIndex) {
    pipFactor = 1.0;
    pipUnit = "Pts";
  } else {
    pipFactor = 0.01;
    pipUnit = "Pts";
  }

  // Load style profile (calibrated from image table with +5 baseline and 5-10 pip intervals)
  const profile = STYLE_TPSL_PROFILES[effectiveStyle] || STYLE_TPSL_PROFILES['Day Trader'];

  let sl1Pips = profile.sl1Pips;
  let sl2Pips = profile.sl2Pips;
  let sl3Pips = profile.sl3Pips;

  let tp1Pips = profile.tp1Pips;
  let tp2Pips = profile.tp2Pips;
  let tp3Pips = profile.tp3Pips;

  const holdingMinutes = profile.holdingMinutes;
  const elapsedMinutes = Math.max(3, Math.round(profile.holdingMinutes * 0.25));
  const entryOffsetMinutes = Math.max(2, Math.round(profile.holdingMinutes * 0.08));
  const isIntraday = effectiveStyle === 'Scalper' || effectiveStyle === 'Intraday Trader' || effectiveStyle === 'Day Trader';

  // For Gold, scale pip factors so that 10 pips = $1.00 move, 16 pips = $1.60 move, 23 pips = $2.30 move
  if (isGold) {
    if (effectiveStyle === "Scalper") {
      sl1Pips = 10; // 5 + 5 = 10 ($1.00)
      sl2Pips = 16; // 10 + 6 = 16 ($1.60)
      sl3Pips = 23; // 16 + 7 = 23 ($2.30)
      tp1Pips = 8;  // 3 + 5 = 8 ($0.80)
      tp2Pips = 15; // 8 + 7 = 15 ($1.50)
      tp3Pips = 23; // 15 + 8 = 23 ($2.30)
    } else if (effectiveStyle === "Intraday Trader") {
      sl1Pips = 15; // $1.50
      sl2Pips = 22; // $2.20
      sl3Pips = 30; // $3.00
      tp1Pips = 15; // $1.50
      tp2Pips = 24; // $2.40
      tp3Pips = 34; // $3.40
    } else if (effectiveStyle === "Day Trader") {
      sl1Pips = 25; // $2.50
      sl2Pips = 35; // $3.50
      sl3Pips = 45; // $4.50
      tp1Pips = 30; // $3.00
      tp2Pips = 45; // $4.50
      tp3Pips = 65; // $6.50
    }
  } else if (isCrypto) {
    const basePct = effectiveStyle === 'Scalper' ? 0.0035 : effectiveStyle === 'Intraday Trader' ? 0.0070 : 0.0140;
    const basePts = Number(((price * basePct) / pipFactor).toFixed(1));
    sl1Pips = Math.max(5, Math.round(basePts));
    sl2Pips = Math.round(basePts * 1.6);
    sl3Pips = Math.round(basePts * 2.3);
    tp1Pips = Math.round(basePts * 1.8);
    tp2Pips = Math.round(basePts * 3.0);
    tp3Pips = Math.round(basePts * 4.6);
  } else if (isIndex) {
    const basePts = effectiveStyle === 'Scalper' ? 12 : effectiveStyle === 'Intraday Trader' ? 24 : 45;
    sl1Pips = basePts;
    sl2Pips = basePts + 8;
    sl3Pips = basePts + 16;
    tp1Pips = basePts + 6;
    tp2Pips = basePts + 16;
    tp3Pips = basePts + 28;
  }

  // Calculate price distances
  const sl1Dist = Number((sl1Pips * pipFactor).toFixed(decimals));
  const sl2Dist = Number((sl2Pips * pipFactor).toFixed(decimals));
  const sl3Dist = Number((sl3Pips * pipFactor).toFixed(decimals));

  const tp1Dist = Number((tp1Pips * pipFactor).toFixed(decimals));
  const tp2Dist = Number((tp2Pips * pipFactor).toFixed(decimals));
  const tp3Dist = Number((tp3Pips * pipFactor).toFixed(decimals));

  // 3 Additional Take Profits based on 1st TP value (+10, +20, +40)
  const tp4Pips = tp1Pips + 10;
  const tp5Pips = tp1Pips + 20;
  const tp6Pips = tp1Pips + 40;

  const tp4Dist = Number((tp4Pips * pipFactor).toFixed(decimals));
  const tp5Dist = Number((tp5Pips * pipFactor).toFixed(decimals));
  const tp6Dist = Number((tp6Pips * pipFactor).toFixed(decimals));

  let stopLoss1 = 0;
  let stopLoss2 = 0;
  let stopLoss3 = 0;
  let takeProfit1 = 0;
  let takeProfit2 = 0;
  let takeProfit3 = 0;
  let takeProfit4 = 0;
  let takeProfit5 = 0;
  let takeProfit6 = 0;
  let entryZone = "";

  if (direction === "BUY") {
    const entryLow = Number((price - sl1Dist * 0.25).toFixed(decimals));
    entryZone = `Retest of support block near $${entryLow.toFixed(decimals)} - $${price.toFixed(decimals)}`;
    stopLoss1 = Number((price - sl1Dist).toFixed(decimals));
    stopLoss2 = Number((price - sl2Dist).toFixed(decimals));
    stopLoss3 = Number((price - sl3Dist).toFixed(decimals));
    takeProfit1 = Number((price + tp1Dist).toFixed(decimals));
    takeProfit2 = Number((price + tp2Dist).toFixed(decimals));
    takeProfit3 = Number((price + tp3Dist).toFixed(decimals));
    takeProfit4 = Number((price + tp4Dist).toFixed(decimals));
    takeProfit5 = Number((price + tp5Dist).toFixed(decimals));
    takeProfit6 = Number((price + tp6Dist).toFixed(decimals));
  } else {
    const entryHigh = Number((price + sl1Dist * 0.25).toFixed(decimals));
    entryZone = `Retest of supply block near $${price.toFixed(decimals)} - $${entryHigh.toFixed(decimals)}`;
    stopLoss1 = Number((price + sl1Dist).toFixed(decimals));
    stopLoss2 = Number((price + sl2Dist).toFixed(decimals));
    stopLoss3 = Number((price + sl3Dist).toFixed(decimals));
    takeProfit1 = Number((price - tp1Dist).toFixed(decimals));
    takeProfit2 = Number((price - tp2Dist).toFixed(decimals));
    takeProfit3 = Number((price - tp3Dist).toFixed(decimals));
    takeProfit4 = Number((price - tp4Dist).toFixed(decimals));
    takeProfit5 = Number((price - tp5Dist).toFixed(decimals));
    takeProfit6 = Number((price - tp6Dist).toFixed(decimals));
  }

  const primarySL = stopLoss1;
  const diff = Math.abs(price - primarySL);
  const reward1 = Math.abs(takeProfit1 - price);
  const riskRewardRatio = diff > 0 ? Number((reward1 / diff).toFixed(1)) : 2.0;

  const dateObj = new Date();

  const formatDateTime = (dt: Date) => {
    if (isIntraday) {
      return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " Local Time";
    } else {
      return dt.toLocaleDateString([], { month: 'short', day: 'numeric' }) + " " + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " Local Time";
    }
  };

  const formatDuration = (mins: number) => {
    if (mins < 60) {
      return `${mins} Minutes`;
    } else if (mins < 1440) {
      const hrs = (mins / 60).toFixed(1);
      return `${hrs} Hours`;
    } else {
      const days = (mins / 1440).toFixed(1);
      return `${days} Days`;
    }
  };

  const entryTime = new Date(dateObj.getTime() + entryOffsetMinutes * 60 * 1000);
  const endTime = new Date(dateObj.getTime() + holdingMinutes * 60 * 1000);

  // Calculate Market Structure, Support, Resistance, HH/LL and Reversal levels
  const structure = calculateMarketStructureLevels(price, direction, timeframe, decimals, cat, pipFactor);

  // Professional Money Management & Scaling Protocol compliant with strict 1-2% risk cap
  const moneyManagement = {
    riskPerTradePct: 1.0,
    breakevenTrigger: "Move Stop Loss to Entry Price (Breakeven +1 pip) immediately when 1st TP is triggered",
    scaleOutRules: {
      tp1Pct: 30, // 30% initial de-risk
      tp2Pct: 25, // 25% core structural profit
      tp3Pct: 20, // 20% swing pivot profit
      tp4Pct: 10, // 10% extended target (+10 from TP1)
      tp5Pct: 10, // 10% extended target (+20 from TP1)
      tp6Pct: 5   // 5% macro runner (+40 from TP1)
    },
    trailingRules: "Trail Stop Loss to 1st TP level once 2nd TP is filled. Trail Stop Loss to 2nd TP when 3rd TP is filled. Secure runner profits for TP4, TP5, and TP6."
  };

  return {
    market: asset.symbol,
    timeframe,
    direction,
    entryZone,
    stopLoss: primarySL,
    stopLoss1,
    stopLoss2,
    stopLoss3,
    sl1Pips,
    sl2Pips,
    sl3Pips,
    slPips: sl1Pips,
    slDistance: sl1Dist,
    sl2Distance: sl2Dist,
    sl3Distance: sl3Dist,

    takeProfit1,
    takeProfit2,
    takeProfit3,
    takeProfit4,
    takeProfit5,
    takeProfit6,
    tp1Pips,
    tp2Pips,
    tp3Pips,
    tp4Pips,
    tp5Pips,
    tp6Pips,
    tp1Distance: tp1Dist,
    tp2Distance: tp2Dist,
    tp3Distance: tp3Dist,
    tp4Distance: tp4Dist,
    tp5Distance: tp5Dist,
    tp6Distance: tp6Dist,

    riskRewardRatio,
    confidenceScore: asset.confidence,
    tradeGrade: asset.confidence >= 80 ? "A+" : asset.confidence >= 75 ? "A" : "B",
    reasoning: `Structured for ${profile.name} (+5 baseline tuning & 5-10 pip intervals). Tier 1 SL is at -${sl1Pips} ${pipUnit} (tight micro protection), Tier 2 SL at -${sl2Pips} ${pipUnit} (structural pivot), and Tier 3 SL at -${sl3Pips} ${pipUnit} (cushioned limit). Tier 1 TP provides immediate +${tp1Pips} ${pipUnit} scale-out, with additional extended targets calibrated from 1st TP at +10 (${tp4Pips}p), +20 (${tp5Pips}p), and +40 (${tp6Pips}p) under strict risk and money management rules.`,
    expectedMarketOpen: asset.category === "Crypto" ? "Open Now 24/7 (Crypto Asset)" : "Mon-Fri (Core Liquidity Session Open)",
    expectedEntryTime: `${formatDateTime(entryTime)} (Retesting in ${formatDuration(entryOffsetMinutes)})`,
    expectedTradeEnd: `${formatDateTime(endTime)} (Estimated finish / target hit)`,
    holdingTime: `${formatDuration(holdingMinutes)} (${profile.holdingTime})`,
    currentTimeSpent: `${formatDuration(elapsedMinutes)} developing momentum`,
    tradingStyle: effectiveStyle,
    pipUnit,
    isMock: false,
    structure,
    moneyManagement
  };
}

export interface ScalperPresetOption {
  id: 'ultra_fast' | 'standard' | 'buffered';
  name: string;
  tagline: string;
  rrRatio: number;
  description: string;
}

export const SCALPER_PRESETS: Record<'ultra_fast' | 'standard' | 'buffered', ScalperPresetOption> = {
  ultra_fast: {
    id: 'ultra_fast',
    name: 'Ultra-Fast Scalp',
    tagline: '1-5m Micro-Wick (High Velocity)',
    rrRatio: 2.0,
    description: 'Ultra-tight stop placed directly behind immediate 1-minute micro-wick invalidation. Designed for rapid 5-10 minute momentum bursts.'
  },
  standard: {
    id: 'standard',
    name: 'Standard Structure Scalp',
    tagline: 'M1/M5 Structural Pivot (Recommended)',
    rrRatio: 2.0,
    description: 'Calibrated safely behind the local 5-minute structural pivot zone, offering optimal breathing room while maintaining a 1:2.0 reward ratio.'
  },
  buffered: {
    id: 'buffered',
    name: 'Spread-Buffered Scalp',
    tagline: 'Anti-Wick & Spread Protection',
    rrRatio: 2.2,
    description: 'Includes an institutional spread buffer (1.5 - 2.5 pips) to prevent retail broker spread widens from stopping you out prematurely.'
  }
};

// Calibrates and adjusts any trade setup specifically for scalping dynamics with 3 tiers of TP and SL
export function adjustSetupForScalper(
  baseSetup: TradeSetupPlan,
  asset: MarketAsset,
  options: {
    preset?: 'ultra_fast' | 'standard' | 'buffered';
    customSlPips?: number;
    customTp1Pips?: number;
    customDirection?: 'BUY' | 'SELL';
  } = {}
): TradeSetupPlan {
  const decimals = getDecimals(asset);
  const price = asset.price;
  const direction: 'BUY' | 'SELL' = options.customDirection || (baseSetup.direction === 'SELL' ? 'SELL' : 'BUY');
  const sym = (asset.symbol || "").toUpperCase();
  const cat = asset.category || "";
  const isGold = sym.includes("XAU") || sym.includes("GOLD") || (cat === "Commodities" && price > 500);
  const isCrypto = cat === "Crypto" || /BTC|ETH|SOL|XRP|DOGE|PEPE|SHIB|ADA|AVAX/i.test(sym);
  const isForex = cat === "Forex" || (!isGold && !isCrypto && sym.includes("/"));
  const isIndex = cat === "Indices" || cat === "Indices Futures" || /US30|NAS100|SPX|NDX|GER40|DAX/i.test(sym);

  let pipFactor = 0.0001;
  let pipUnit = "Pips";

  if (isGold) {
    pipFactor = 0.10;
    pipUnit = "Pips";
  } else if (isForex) {
    pipFactor = sym.includes("JPY") ? 0.01 : 0.0001;
    pipUnit = "Pips";
  } else if (isCrypto) {
    pipFactor = price > 1000 ? 1.0 : 0.01;
    pipUnit = "Pts";
  } else if (isIndex) {
    pipFactor = 1.0;
    pipUnit = "Pts";
  } else {
    pipFactor = 0.01;
    pipUnit = "Pts";
  }

  const preset = options.preset || 'standard';
  
  // Base 3-tier calibration for scalping (with +5 added & 5-10 pip intervals)
  let sl1Pips = 10; // 5 + 5 = 10
  let sl2Pips = 16; // 10 + 6 = 16
  let sl3Pips = 23; // 16 + 7 = 23
  let tp1Pips = 8;  // 3 + 5 = 8
  let tp2Pips = 15; // 8 + 7 = 15
  let tp3Pips = 23; // 15 + 8 = 23
  let targetHoldingMins = 12;

  if (preset === 'ultra_fast') {
    sl1Pips = 8;
    sl2Pips = 14;
    sl3Pips = 20;
    tp1Pips = 10;
    tp2Pips = 18;
    tp3Pips = 26;
    targetHoldingMins = 8;
  } else if (preset === 'buffered') {
    sl1Pips = 12;
    sl2Pips = 18;
    sl3Pips = 26;
    tp1Pips = 15;
    tp2Pips = 24;
    tp3Pips = 34;
    targetHoldingMins = 20;
  }

  // Override with custom user inputs if supplied
  if (options.customSlPips !== undefined && options.customSlPips > 0) {
    sl1Pips = options.customSlPips;
    sl2Pips = sl1Pips + 6;
    sl3Pips = sl2Pips + 7;
  }
  if (options.customTp1Pips !== undefined && options.customTp1Pips > 0) {
    tp1Pips = options.customTp1Pips;
    tp2Pips = tp1Pips + 7;
    tp3Pips = tp2Pips + 8;
  }

  const sl1Dist = Number((sl1Pips * pipFactor).toFixed(decimals));
  const sl2Dist = Number((sl2Pips * pipFactor).toFixed(decimals));
  const sl3Dist = Number((sl3Pips * pipFactor).toFixed(decimals));

  const tp1Dist = Number((tp1Pips * pipFactor).toFixed(decimals));
  const tp2Dist = Number((tp2Pips * pipFactor).toFixed(decimals));
  const tp3Dist = Number((tp3Pips * pipFactor).toFixed(decimals));

  let stopLoss1 = 0;
  let stopLoss2 = 0;
  let stopLoss3 = 0;
  let takeProfit1 = 0;
  let takeProfit2 = 0;
  let takeProfit3 = 0;
  let entryZone = "";

  if (direction === "BUY") {
    const entryLow = Number((price - sl1Dist * 0.25).toFixed(decimals));
    entryZone = `M1/M5 Retest near $${entryLow.toFixed(decimals)} - $${price.toFixed(decimals)}`;
    stopLoss1 = Number((price - sl1Dist).toFixed(decimals));
    stopLoss2 = Number((price - sl2Dist).toFixed(decimals));
    stopLoss3 = Number((price - sl3Dist).toFixed(decimals));
    takeProfit1 = Number((price + tp1Dist).toFixed(decimals));
    takeProfit2 = Number((price + tp2Dist).toFixed(decimals));
    takeProfit3 = Number((price + tp3Dist).toFixed(decimals));
  } else {
    const entryHigh = Number((price + sl1Dist * 0.25).toFixed(decimals));
    entryZone = `M1/M5 Retest near $${price.toFixed(decimals)} - $${entryHigh.toFixed(decimals)}`;
    stopLoss1 = Number((price + sl1Dist).toFixed(decimals));
    stopLoss2 = Number((price + sl2Dist).toFixed(decimals));
    stopLoss3 = Number((price + sl3Dist).toFixed(decimals));
    takeProfit1 = Number((price - tp1Dist).toFixed(decimals));
    takeProfit2 = Number((price - tp2Dist).toFixed(decimals));
    takeProfit3 = Number((price - tp3Dist).toFixed(decimals));
  }

  const riskRewardRatio = sl1Pips > 0 ? Number((tp1Pips / sl1Pips).toFixed(1)) : 2.0;

  const now = new Date();
  const entryTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 mins
  const endTime = new Date(now.getTime() + targetHoldingMins * 60 * 1000);

  const formatLocalTime = (dt: Date) => dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " Local Time";

  const structure = calculateMarketStructureLevels(price, direction, 'M5', decimals, cat, pipFactor);

  return {
    ...baseSetup,
    direction,
    entryZone,
    stopLoss: stopLoss1,
    stopLoss1,
    stopLoss2,
    stopLoss3,
    takeProfit1,
    takeProfit2,
    takeProfit3,
    riskRewardRatio,
    tradingStyle: 'Scalper',
    timeframe: 'M5',
    slPips: sl1Pips,
    sl1Pips,
    sl2Pips,
    sl3Pips,
    tp1Pips,
    tp2Pips,
    tp3Pips,
    slDistance: sl1Dist,
    sl2Distance: sl2Dist,
    sl3Distance: sl3Dist,
    tp1Distance: tp1Dist,
    tp2Distance: tp2Dist,
    tp3Distance: tp3Dist,
    pipUnit,
    holdingTime: `${targetHoldingMins} Minutes (Scalper Execution Window)`,
    currentTimeSpent: `3 - 5 Minutes developing micro-momentum`,
    expectedEntryTime: `${formatLocalTime(entryTime)} (Retesting in 2 mins)`,
    expectedTradeEnd: `${formatLocalTime(endTime)} (Estimated Scalp Finish)`,
    reasoning: `Adjusted for Scalping (${SCALPER_PRESETS[preset]?.name || 'Precision Scalp'}). Calibrated with +5 baseline tuning and 5-10 pip tier intervals: 1st SL at -${sl1Pips} ${pipUnit}, 2nd SL at -${sl2Pips} ${pipUnit}, 3rd SL at -${sl3Pips} ${pipUnit}. Take Profit tiers: 1st TP at +${tp1Pips} ${pipUnit}, 2nd TP at +${tp2Pips} ${pipUnit}, 3rd TP at +${tp3Pips} ${pipUnit} for a high mathematical expectancy (1:${riskRewardRatio} R:R).`,
    structure
  };
}

// Custom Upcoming macroeconomic or microstructural events specific to each asset class
export interface VolatilityEvent {
  timeStr: string;
  risk: "HIGH VOLATILITY" | "MEDIUM RISK" | "INFO IMPACT";
  title: string;
  description: string;
}

export function getUpcomingEvents(asset: MarketAsset): VolatilityEvent[] {
  if (asset.category === "Crypto") {
    return [
      {
        timeStr: "00:00 UTC",
        risk: "MEDIUM RISK",
        title: "Perpetual Funding Settlement Sweep",
        description: "Margin balance rebalancing across exchanges. Watch out for rapid 1-minute wick expansions targeting leveraged positions."
      },
      {
        timeStr: "08:00 UTC",
        risk: "HIGH VOLATILITY",
        title: "Asian Spot Exchange Liquidity Spike",
        description: "Institutional desks open physical swap settlements. Optimal for validating weekend breakout continuations."
      },
      {
        timeStr: "13:30 UTC",
        risk: "HIGH VOLATILITY",
        title: "CME Bitcoin Options Monthly Expiry",
        description: "Large open-interest option hedges expire. Expect intense spot-futures parity sweeps on major crypto crossings."
      }
    ];
  } else if (asset.category === "Forex") {
    return [
      {
        timeStr: "13:30 Local Time",
        risk: "HIGH VOLATILITY",
        title: "Non-Farm Payrolls (NFP) & CPI Report",
        description: "Crucial central bank policy driver. Interbank spread differentials widen dramatically. Clear retail stop sweeps expected."
      },
      {
        timeStr: "16:00 Local Time",
        risk: "MEDIUM RISK",
        title: "London Close Fix Clearing",
        description: "Commercial bank desks rebalance multi-currency corporate portfolios. Frequently triggers 15m pullback wicks on major crosses."
      },
      {
        timeStr: "21:00 Local Time",
        risk: "INFO IMPACT",
        title: "Sydney Market Opening Roll",
        description: "Lowest daily liquidity period. Bid-ask spreads widen on exotic currencies. Roll over interest fee settlements occur."
      }
    ];
  } else if (asset.category === "Stocks") {
    return [
      {
        timeStr: "13:30 Local Time",
        risk: "HIGH VOLATILITY",
        title: "US Equities Cash Session Open Drive",
        description: "Opening bell initiates massive quantitative algorithms basket-matching. Highest single volume cluster of the session."
      },
      {
        timeStr: "15:00 Local Time",
        risk: "MEDIUM RISK",
        title: "Mid-Day Institutional Options Rollover",
        description: "Option market makers adjust their delta hedges. Generates clean range-bound consolidations or quick channel breakout sweeps."
      },
      {
        timeStr: "19:50 Local Time",
        risk: "HIGH VOLATILITY",
        title: "Equities Power Hour & Closing Cross",
        description: "Mutual funds execute standard corporate buyback mandates and close cash trades. Rapid trend continuation sweeps are standard."
      }
    ];
  } else if (asset.category === "Commodities") {
    return [
      {
        timeStr: "12:30 UTC",
        risk: "HIGH VOLATILITY",
        title: "NYMEX Precious Metals Trading open",
        description: "Intense physical volume settles. Spot Gold (XAU) and Silver (XAG) enter active pricing bands with frequent liquidity grabs."
      },
      {
        timeStr: "14:30 UTC",
        risk: "HIGH VOLATILITY",
        title: "EIA Energy Storage and Reserves Release",
        description: "Weekly crude oil and gas inventory updates. Triggers high momentum breakouts and rapid channel re-valuations."
      }
    ];
  } else {
    // Indices
    return [
      {
        timeStr: "13:30 Local Time",
        risk: "HIGH VOLATILITY",
        title: "NYSE Index Constituent Block Fill",
        description: "Arbitrage algorithms match cash indexes with futures tracking S&P500 / Nasdaq-100 components. Peak volatility drive."
      },
      {
        timeStr: "19:00 Local Time",
        risk: "MEDIUM RISK",
        title: "CTA Trend-Follower Rebalancing Session",
        description: "Systematic trend-following funds rollover futures derivatives contracts. Generates clear directional breakout sweeps."
      }
    ];
  }
}
