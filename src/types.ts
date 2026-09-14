export type SectionType =
  | 'dashboard'
  | 'chartai'
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
}

export interface TradeSetupPlan {
  market?: string;
  timeframe?: string;
  direction: 'BUY' | 'SELL' | 'WAIT' | 'NO TRADE';
  entryZone: string;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskRewardRatio: number;
  confidenceScore: number;
  tradeGrade: string;
  reasoning: string;
  expectedMarketOpen: string; // Exactly the time the instrument is open or expected to open in user local time
  expectedEntryTime: string; // Estimated local time the market price is expected to reach the entry/open price
  expectedTradeEnd: string; // Estimated local time when current trend direction will end/reverse
  holdingTime: string; // Estimated how many hours/time the market will continue moving in the buy or sell direction (Trend Duration)
  currentTimeSpent: string; // Estimated time spent/elapsed since current trend direction/movement started
  isMock?: boolean;
  error?: string;
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
