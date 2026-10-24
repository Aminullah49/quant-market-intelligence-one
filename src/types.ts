export type SectionType =
  | 'dashboard'
  | 'chartai'
  | 'news'
  | 'shield'
  | 'checklist'
  | 'analysis'
  | 'setup'
  | 'risk'
  | 'time'
  | 'journal'
  | 'profile'
  | 'marketmap'
  | 'strategylab'
  | 'alerts'
  | 'settings'
  | 'brokers'
  | 'subscription'
  | 'aggregate'
  | 'papertrading'
  | 'admin-ads'
  | 'recommendations';

export interface MarketAsset {
  symbol: string;
  name: string;
  category: 'Forex' | 'Crypto' | 'Stocks' | 'Commodities' | 'Indices' | 'Bonds' | 'ETFs' | 'Indices Futures';
  price: number;
  changePercent: number;
  bullishProb: number;
  bearishProb: number;
  neutralProb: number;
  confidence: number;
  volume24h: string;
  low24h: number;
  high24h: number;
  country?: string; // Optional: "United States", "United Kingdom", "Nigeria", "Japan", "Germany", "Canada", etc.
  subclass?: string; // Optional: e.g., "Indices Future", "US Stocks", "US Bonds", etc.
}

export interface TechnicalState {
  ema20: boolean;
  sma50: boolean;
  rsi: boolean;
  macd: boolean;
  atr: boolean;
  bollinger: boolean;
  vwap: boolean;
  obv: boolean;
  adx: boolean;
  fibonacci: boolean;
}

export interface MarketStructureData {
  trend: string;
  structure: string;
  support: number[];
  resistance: number[];
  liquidityZones: string;
}

export interface DetectedPattern {
  name: string;
  type: string;
  strength: 'Low' | 'Medium' | 'High';
  confidence: number;
  explanation: string;
}

export interface MarketAnalysisResponse {
  symbol?: string;
  timeframe?: string;
  bullishProb: number;
  bearishProb: number;
  neutralProb: number;
  confidence: number;
  marketStructure: MarketStructureData;
  detectedPatterns: DetectedPattern[];
  technicalSummary: string;
  fundamentalSummary: string;
  sentimentSummary: string;
  explanation: string;
  isMock?: boolean;
  smc?: SmartMoneyConcepts;
}

// Fair Value Gap (FVG) / Price Value Gap (PVG) - Institutional 3-candle price imbalance
export interface FairValueGap {
  id: string;
  type: 'BULLISH_FVG' | 'BEARISH_FVG';
  top: number;
  bottom: number;
  midCe: number; // 50% Consequent Encroachment (CE)
  candleIndex?: number;
  mitigated: boolean;
  label: string; // Dual-labeled as FVG / PVG (Price Value Gap)
  pipsSize: number;
  timeframe?: string;
  isPvg?: boolean; // PVG alias indicator
}

export type PriceValueGap = FairValueGap; // Community & institutional alias for FVG

export interface LiquidityPool {
  id: string;
  type: 'BSL' | 'SSL'; // Buy-Side Liquidity vs Sell-Side Liquidity
  level: number;
  label: string;
  pipsAway: number;
  swept: boolean;
  poolType: 'EQUAL_HIGHS' | 'EQUAL_LOWS' | 'SESSION_HIGH' | 'SESSION_LOW' | 'SWING_HIGH' | 'SWING_LOW';
  description: string;
}

export interface OrderBlock {
  id: string;
  type: 'BULLISH_OB' | 'BEARISH_OB';
  top: number;
  bottom: number;
  meanThreshold: number; // 50% midpoint of the institutional candle
  candleIndex?: number;
  mitigated: boolean;
  strength: 'Strong' | 'Prime' | 'Extreme';
  label: string;
  pipsSize: number;
}

export interface PremiumDiscountZone {
  rangeHigh: number;
  rangeLow: number;
  equilibrium: number; // 50% Equilibrium price
  currentZone: 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM';
  premiumDiscountRatio: number; // 0 to 100% of dealing range
  smartMoneyVerdict: string;
}

export interface ICCAnalysis {
  currentPhase: 'INDICATION' | 'CORRECTION' | 'CONTINUATION';
  phaseStage: 'Phase 1: Indication (Impulse)' | 'Phase 2: Correction (Retracement to FVG/OB)' | 'Phase 3: Continuation (Entry Trigger)';
  indicationLevel: number; // Level where institutional displacement was indicated
  correctionZone: { top: number; bottom: number }; // Zone where price is pulling back
  continuationTrigger: number; // Breakout trigger to enter continuation
  iccCandleDetected: boolean; // Institutional Confirmation Candle confirmed
  iccCandleDetails: string;
  ruleCompliance: string;
}

export interface SmartMoneyConcepts {
  fvgs: FairValueGap[];
  liquidityPools: LiquidityPool[];
  orderBlocks: OrderBlock[];
  premiumDiscount: PremiumDiscountZone;
  choch: {
    level: number;
    direction: 'BULLISH_CHOCH' | 'BEARISH_CHOCH';
    triggered: boolean;
    explanation: string;
  };
  bos: {
    level: number;
    direction: 'BULLISH_BOS' | 'BEARISH_BOS';
    triggered: boolean;
    explanation: string;
  };
  icc?: ICCAnalysis;
  institutionalBias: 'DISCOUNT_ACCUMULATION' | 'PREMIUM_DISTRIBUTION' | 'LIQUIDITY_RUN' | 'ORDER_FLOW_REVERSAL';
  summary: string;
}

export interface MarketStructureLevels {
  support: {
    s1: number;
    s2: number;
    s3: number;
    s1Label?: string;
    s2Label?: string;
    s3Label?: string;
    s1Pips?: number;
    s2Pips?: number;
    s3Pips?: number;
  };
  resistance: {
    r1: number;
    r2: number;
    r3: number;
    r1Label?: string;
    r2Label?: string;
    r3Label?: string;
    r1Pips?: number;
    r2Pips?: number;
    r3Pips?: number;
  };
  highLow: {
    higherHigh: number;
    higherLow: number;
    lowerHigh: number;
    lowerLow: number;
    structureState: 'BULLISH (HH & HL)' | 'BEARISH (LH & LL)' | 'RANGE / EQUAL HIGHS-LOWS';
    lastSwingHighTime?: string;
    lastSwingLowTime?: string;
  };
  reversal: {
    chochLevel: number; // Change of Character level (trend flip trigger)
    bosLevel: number;   // Break of Structure level (trend continuation trigger)
    reversalPivot: number; // Key Liquidity Invalidation Reversal Level
    reversalType: 'Bullish Reversal' | 'Bearish Reversal' | 'Trend Continuation';
    invalidationThreshold: number;
    explanation: string;
  };
  smc?: SmartMoneyConcepts;
}

export interface TradeSetupPlan {
  market?: string;
  timeframe?: string;
  smc?: SmartMoneyConcepts;
  direction: 'BUY' | 'SELL' | 'WAIT' | 'NO TRADE';
  entryZone: string;
  
  // Tiered Stop Losses (1st SL, 2nd SL, 3rd SL)
  stopLoss: number; // Primary/Active SL
  stopLoss1?: number; // 1st SL (Tight micro invalidation)
  stopLoss2?: number; // 2nd SL (Standard structural invalidation)
  stopLoss3?: number; // 3rd SL (Wide safety/spread cushion invalidation)
  slPips?: number;
  sl1Pips?: number;
  sl2Pips?: number;
  sl3Pips?: number;
  slDistance?: number;
  sl2Distance?: number;
  sl3Distance?: number;

  // Tiered Take Profits (1st TP, 2nd TP, 3rd TP, and 3 Additional TPs: 4th TP, 5th TP, 6th TP based on 1st TP +10, +20, +40)
  takeProfit1: number; // 1st TP
  takeProfit2: number; // 2nd TP
  takeProfit3?: number; // 3rd TP
  takeProfit4?: number; // 4th TP (Additional target: 1st TP + 10)
  takeProfit5?: number; // 5th TP (Additional target: 1st TP + 20)
  takeProfit6?: number; // 6th TP (Additional target: 1st TP + 40)
  tp1Pips?: number;
  tp2Pips?: number;
  tp3Pips?: number;
  tp4Pips?: number;
  tp5Pips?: number;
  tp6Pips?: number;
  tp1Distance?: number;
  tp2Distance?: number;
  tp3Distance?: number;
  tp4Distance?: number;
  tp5Distance?: number;
  tp6Distance?: number;

  riskRewardRatio: number;
  confidenceScore: number;
  tradeGrade: string;
  reasoning: string;
  expectedMarketOpen: string; // Exactly the time the instrument is open or expected to open in user local time
  expectedEntryTime: string; // Estimated local time the market price is expected to reach the entry/open price
  expectedTradeEnd: string; // Estimated local time when current trend direction will end/reverse
  holdingTime: string; // Estimated how many hours/time the market will continue moving in the buy or sell direction (Trend Duration)
  currentTimeSpent: string; // Estimated time spent/elapsed since current trend direction/movement started
  tradingStyle?: 'Scalper' | 'Intraday Trader' | 'Day Trader' | 'Swing Trader' | 'Position Trader';
  pipUnit?: string;
  isMock?: boolean;
  error?: string;

  // Key Support, Resistance, HH/LL levels, and Reversal points
  structure?: MarketStructureLevels;

  // Professional Money Management & Scaling Protocol
  moneyManagement?: {
    riskPerTradePct: number;
    breakevenTrigger: string;
    scaleOutRules: {
      tp1Pct: number;
      tp2Pct: number;
      tp3Pct: number;
      tp4Pct: number;
      tp5Pct: number;
      tp6Pct: number;
    };
    trailingRules: string;
  };
}

export interface JournalEntry {
  id: string;
  date: string;
  market: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
  profit: number;
  emotion: 'Disciplined' | 'Greed' | 'Fear' | 'Revenge' | 'Hesitant';
  mistake: 'None' | 'FOMO Entry' | 'Moved Stop Loss' | 'Over-leveraged' | 'Early Exit';
  notes: string;
}

export interface TraderDNA {
  style: 'Scalper' | 'Day Trader' | 'Swing Trader' | 'Position Trader';
  timeframe: 'M1' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1' | 'W1' | 'MN';
  market: 'Forex' | 'Crypto' | 'Stocks' | 'Commodities' | 'Indices';
  riskTolerance: 'Conservative' | 'Balanced' | 'Aggressive';
  weakness: string;
  leverage: number;
  displayName?: string;
  experienceYears?: number;
  tradingCapital?: number;
  dailyGoalPercent?: number;
  timezone?: string;
}

export interface AlertItem {
  id: string;
  type: 'Pattern' | 'Level' | 'News' | 'Risk';
  asset: string;
  message: string;
  timestamp: string;
  severity: 'Info' | 'Warning' | 'High';
  isRead: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface BacktestMetrics {
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  drawdown: number;
  totalTrades: number;
  equityCurve: { name: string; equity: number }[];
}

export interface Recommendation {
  id: string;
  title: string;
  category: string;
  impact: 'Low' | 'Medium' | 'High' | 'Critical';
  effort: 'Low' | 'Medium' | 'High';
  status: 'Proposed' | 'In Progress' | 'Completed' | 'Deferred';
  description: string;
  assignedTo: string;
  createdAt: string;
}
