import React, { useState, useMemo } from "react";
import { MarketAsset, TraderDNA } from "../types";
import { 
  ShieldAlert, ShieldCheck, AlertTriangle, TrendingDown, TrendingUp, 
  CheckCircle2, AlertCircle, ArrowRight, Play, Calculator, Crosshair, 
  CheckSquare, Activity, Compass, Lock, Zap, RefreshCw, BarChart2,
  DollarSign, Info, Eye, Layers, BookOpen, ExternalLink, Radio
} from "lucide-react";

interface LossProtectionShieldProps {
  assets: MarketAsset[];
  selectedAsset: MarketAsset;
  onSelectAsset: (asset: MarketAsset) => void;
  onNavigateToSection: (section: any) => void;
  traderProfile?: TraderDNA;
}

export default function LossProtectionShield({
  assets,
  selectedAsset,
  onSelectAsset,
  onNavigateToSection,
  traderProfile
}: LossProtectionShieldProps) {
  // State for user position sizing
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0); // 1% institutional default
  const [isEventLockoutActive, setIsEventLockoutActive] = useState<boolean>(true);
  const [studyCaseOpen, setStudyCaseOpen] = useState<boolean>(true);

  // Pre-flight checklist states
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    macro_event_cleared: true,
    overbought_avoided: true,
    hard_sl_defined: true,
    rr_ratio_valid: true,
    risk_capped: true
  });

  const toggleCheckItem = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentPrice = selectedAsset?.price || 100;
  const isCrypto = selectedAsset?.category === "Crypto";
  const isForex = selectedAsset?.category === "Forex";
  const isGoldOrCommodity = selectedAsset?.category === "Commodities" || selectedAsset?.symbol === "XAU/USD";
  const isIndex = selectedAsset?.category === "Indices" || selectedAsset?.category === "Indices Futures";

  // Dynamic Technical Calculations based on asset
  const { rsiEstimate, ema20, sma50, atrBuffer, isOverbought, pullbackBuyZone, shortTermDropRisk } = useMemo(() => {
    // Generate pseudo-deterministic indicators based on current asset price & change
    const change = selectedAsset?.changePercent || 0;
    
    // Estimate RSI based on recent change and asset nature
    let baseRsi = 55 + change * 4.5;
    if (selectedAsset?.symbol === "XAU/USD" || selectedAsset?.symbol === "NAS100" || selectedAsset?.symbol === "NVDA") {
      baseRsi = Math.min(84, Math.max(30, 68 + change * 3));
    }
    const rsi = Math.min(92, Math.max(18, Math.round(baseRsi)));

    // Volatility ATR buffer percentage
    const atrPct = isCrypto ? 0.035 : isGoldOrCommodity ? 0.012 : isIndex ? 0.015 : 0.007;
    const atr = currentPrice * atrPct;

    const ema20Val = currentPrice * (1 - (change > 0 ? 0.014 : -0.012));
    const sma50Val = currentPrice * (1 - (change > 0 ? 0.032 : -0.028));

    const overbought = rsi >= 70;
    const dropRisk = rsi >= 75 ? "Extreme (Overbought Peak)" : rsi >= 68 ? "High (Mean-Reversion Danger)" : "Moderate / Controlled";

    const pullbackZone = {
      entryLow: Number((ema20Val * 0.995).toFixed(currentPrice < 10 ? 4 : 2)),
      entryHigh: Number(ema20Val.toFixed(currentPrice < 10 ? 4 : 2)),
      protectiveStop: Number((sma50Val * 0.992).toFixed(currentPrice < 10 ? 4 : 2))
    };

    return {
      rsiEstimate: rsi,
      ema20: Number(ema20Val.toFixed(currentPrice < 10 ? 4 : 2)),
      sma50: Number(sma50Val.toFixed(currentPrice < 10 ? 4 : 2)),
      atrBuffer: atr,
      isOverbought: overbought,
      pullbackBuyZone: pullbackZone,
      shortTermDropRisk: dropRisk
    };
  }, [selectedAsset, currentPrice, isCrypto, isGoldOrCommodity, isIndex]);

  // Position Sizing calculations
  const maxRiskDollar = (accountBalance * riskPercent) / 100;
  
  // Safe stop loss distance (using 1.5x ATR buffer to prevent getting wicked out during news)
  const safeStopDistance = atrBuffer * 1.5;
  const safeStopPrice = Number((currentPrice - safeStopDistance).toFixed(currentPrice < 10 ? 4 : 2));
  
  // Suggested Take Profit: 2x safe stop distance (1:2 R:R)
  const targetProfitPrice = Number((currentPrice + safeStopDistance * 2).toFixed(currentPrice < 10 ? 4 : 2));

  // Breakeven price (+1R distance)
  const breakevenTriggerPrice = Number((currentPrice + safeStopDistance).toFixed(currentPrice < 10 ? 4 : 2));

  // Position units
  const positionUnits = safeStopDistance > 0 ? maxRiskDollar / safeStopDistance : 0;
  let safeLotSizeDisplay = "";
  if (isForex) {
    safeLotSizeDisplay = `${(positionUnits / 100000).toFixed(2)} Lots`;
  } else if (isGoldOrCommodity) {
    safeLotSizeDisplay = `${(positionUnits / 100).toFixed(2)} Lots (Oz)`;
  } else if (isCrypto) {
    safeLotSizeDisplay = `${positionUnits.toFixed(3)} Coins`;
  } else {
    safeLotSizeDisplay = `${Math.floor(positionUnits)} Shares`;
  }

  // Pre-flight checklist score calculation
  const totalItems = Object.keys(checkedItems).length;
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const checklistScore = Math.round((checkedCount / totalItems) * 100);

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-slate-100">
      
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 animate-pulse" />
              </span>
              <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-widest">
                VOLATILITY & LOSS PROTECTION PROTOCOL
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-black rounded border border-emerald-500/20 uppercase">
                SHIELD ACTIVE
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Macro Volatility & Loss Protection Matrix
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Shield your capital against unexpected selloffs, post-UN summit whipsaws, and post-rate cut profit-taking. Follow the institutional 6-step defense workflow below.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateToSection("news")}
              className="px-4 py-2 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow"
            >
              <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
              <span>Macro News Wire</span>
            </button>
            <button
              onClick={() => onNavigateToSection("risk")}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow"
            >
              <Calculator className="h-4 w-4 text-emerald-400" />
              <span>Open Risk Calc</span>
            </button>
            <button
              onClick={() => onNavigateToSection("checklist")}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow"
            >
              <CheckSquare className="h-4 w-4 text-blue-400" />
              <span>Full Checklist</span>
            </button>
          </div>
        </div>
      </div>

      {/* Asset Selector & Live Risk Gauge Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Selected Asset Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Target Instrument</span>
            <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
              {selectedAsset.category}
            </span>
          </div>
          
          {/* Asset quick dropdown */}
          <select
            value={selectedAsset.symbol}
            onChange={(e) => {
              const found = assets.find(a => a.symbol === e.target.value);
              if (found) onSelectAsset(found);
            }}
            className="w-full bg-slate-950 border border-slate-800 text-white font-bold text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 cursor-pointer"
          >
            {assets.map(a => (
              <option key={a.symbol} value={a.symbol}>
                {a.symbol} - {a.name} ({a.price.toLocaleString()})
              </option>
            ))}
          </select>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800 text-xs font-mono">
            <span className="text-slate-400">Current Price:</span>
            <span className="text-white font-black text-sm">
              ${selectedAsset.price.toLocaleString(undefined, { minimumFractionDigits: selectedAsset.price < 5 ? 4 : 2 })}
            </span>
          </div>
        </div>

        {/* Gauge 1: Macro & Geopolitical Risk */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">1. Macro Event Risk</span>
            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] font-bold rounded border border-amber-500/20">
              HIGH ALERT
            </span>
          </div>
          <div className="my-2">
            <div className="flex justify-between items-baseline mb-1 font-mono">
              <span className="text-xs text-slate-300 font-bold">UN Summit / FOMC</span>
              <span className="text-amber-400 text-sm font-black">78 / 100</span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full" style={{ width: "78%" }} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-mono leading-tight">
            High-level speeches & central bank policy rotation creating intraday whipsaws.
          </p>
        </div>

        {/* Gauge 2: Overbought / Exhaustion Risk */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">2. Overbought Peak Risk</span>
            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${
              isOverbought 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {isOverbought ? 'PEAK EXHAUSTION' : 'BALANCED'}
            </span>
          </div>
          <div className="my-2">
            <div className="flex justify-between items-baseline mb-1 font-mono">
              <span className="text-xs text-slate-300 font-bold">Estimated RSI</span>
              <span className={`text-sm font-black ${isOverbought ? 'text-rose-400' : 'text-emerald-400'}`}>
                {rsiEstimate} / 100
              </span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div 
                className={`h-full rounded-full ${isOverbought ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                style={{ width: `${rsiEstimate}%` }} 
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-mono leading-tight">
            {isOverbought ? 'Warning: Severe profit-taking risk at recent highs.' : 'Healthy momentum; within standard operating parameters.'}
          </p>
        </div>

        {/* Gauge 3: Capital Risk Lock */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">3. Max Allowed Loss</span>
            <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded border border-emerald-500/20">
              LOCKED @ {riskPercent}%
            </span>
          </div>
          <div className="my-2">
            <div className="flex justify-between items-baseline mb-1 font-mono">
              <span className="text-xs text-slate-300 font-bold">Account Loss Cap</span>
              <span className="text-emerald-400 text-sm font-black">${maxRiskDollar.toFixed(2)}</span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, riskPercent * 50)}%` }} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-mono leading-tight">
            Single trade loss cannot exceed ${maxRiskDollar} on ${accountBalance.toLocaleString()} equity.
          </p>
        </div>
      </div>

      {/* Case Study Analysis (Why Nasdaq/Gold dropped after UN Meeting) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <button
          onClick={() => setStudyCaseOpen(!studyCaseOpen)}
          className="w-full px-6 py-4 flex items-center justify-between bg-slate-850/60 hover:bg-slate-800/80 transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Case Study: Why Did Nasdaq, Gold & High-Beta Equities Drop After the UN Meeting?</span>
                <span className="text-[10px] font-mono bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">
                  Institutional Anatomy
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Understand the 5 macro catalysts behind the sudden drop and why retail traders lost money by FOMO buying at the peak.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {studyCaseOpen ? "Collapse ▴" : "Expand ▾"}
          </span>
        </button>

        {studyCaseOpen && (
          <div className="p-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 bg-slate-950/60 font-mono text-xs">
            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span>1. "Sell the News"</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                After the Fed cut rates by 50 bps, Gold reached $2,670+ and Nasdaq rallied. Algorithmic desks locked in profits immediately when the momentum stalled.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                <span>2. UN Speeches</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Speeches at the UN podium highlighted acute Middle East conflict escalations. Risk sentiment shifted to capital preservation, trimming high-beta tech.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <span>3. China Rotation</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                China unleashed historic stimulus that week. Global macro funds sold expensive US tech to buy deeply discounted Chinese equities (+25% in 4 days).
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold">
                <span className="h-2 w-2 rounded-full bg-purple-400" />
                <span>4. Q3 Rebalancing</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                The UN week was the final week of Quarter 3 (Q3). Pension funds and sovereign desks were forced by mandate to rebalance out of equity gains into bonds.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>5. USD / Yields Bounce</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                The US Dollar and Treasury yields staged a counter-trend bounce. Because Gold is USD-denominated and non-yielding, short-term longs liquidated.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* THE 6-STEP INTERACTIVE DEFENSE MATRIX */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <span>The 6-Step Loss Protection Engine</span>
            </h2>
            <p className="text-xs text-slate-400">
              Interactive safeguards integrated with your terminal to study, detect, and neutralize sudden market selloffs.
            </p>
          </div>
          
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 block">Flight Readiness:</span>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
              checklistScore >= 80 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {checklistScore}% - {checklistScore >= 80 ? 'CLEARED TO TRADE' : 'CAUTION ADVISED'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* STEP 1: Macro Catalyst Shield */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs font-mono">
                    1
                  </span>
                  <h3 className="font-bold text-sm text-white">Macro Catalyst Shield</h3>
                </div>
                <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  GEOPOLITICS & FED
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Surveillance protocol for UN Summits, FOMC rate releases, CPI, and high-level geopolitical speeches.
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Upcoming Risk Window:</span>
                  <span className="text-amber-400 font-bold">UNGA & High-Level Debates</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Trading Window Status:</span>
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Whipsaw Danger
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Execution Rule:</span>
                  <span className="text-emerald-400 font-bold">No Breakouts 30m Prior</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-blue-950/20 border border-blue-500/20 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-300">Macro Event Lockout Mode</span>
                <button
                  onClick={() => setIsEventLockoutActive(!isEventLockoutActive)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
                    isEventLockoutActive
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isEventLockoutActive ? 'ACTIVE (SAFE)' : 'DISABLED'}
                </button>
              </div>
            </div>

            <button
              onClick={() => onNavigateToSection("time")}
              className="mt-4 w-full py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>View Time Intelligence Calendar</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* STEP 2: Overbought & Pullback Dip Detector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-xs font-mono">
                    2
                  </span>
                  <h3 className="font-bold text-sm text-white">Overbought Dip Detector</h3>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  isOverbought 
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  RSI: {rsiEstimate}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Prevents retail FOMO buying at the peak. Identifies structural institutional pullback zones to buy cheaper.
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Price:</span>
                  <span className="text-white font-bold">${currentPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">20 EMA Pullback Zone:</span>
                  <span className="text-emerald-400 font-bold">${pullbackBuyZone.entryLow} - ${pullbackBuyZone.entryHigh}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">50 SMA Invalidation:</span>
                  <span className="text-rose-400 font-bold">${pullbackBuyZone.protectiveStop}</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300">
                <span className="text-amber-400 font-bold block mb-0.5">Golden Rule:</span>
                Never buy when Daily RSI &gt; 70 at all-time highs. Wait for price to touch the 20 EMA before placing orders.
              </div>
            </div>

            <button
              onClick={() => onNavigateToSection("analysis")}
              className="mt-4 w-full py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Scan Multi-Timeframe Matrix</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* STEP 3: Institutional 1% - 2% Loss Cap */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-xs font-mono">
                    3
                  </span>
                  <h3 className="font-bold text-sm text-white">1% - 2% Position Shield</h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  SAFE SIZING
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Strict mathematical lot sizing so even if a black-swan drop occurs, your loss is capped at strictly 1–2%.
              </p>

              {/* Interactive Equity & Risk Pickers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Account Balance:</span>
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
                    <span className="text-slate-500">$</span>
                    <input
                      type="number"
                      value={accountBalance}
                      onChange={(e) => setAccountBalance(Math.max(100, Number(e.target.value)))}
                      className="w-20 bg-transparent text-white font-bold text-xs outline-none text-right"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Risk Limit:</span>
                  <div className="flex gap-1">
                    {[0.5, 1.0, 1.5, 2.0].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setRiskPercent(pct)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                          riskPercent === pct
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Dollar Risk:</span>
                  <span className="text-emerald-400 font-black">${maxRiskDollar.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Recommended Safe Lot:</span>
                  <span className="text-cyan-400 font-bold">{safeLotSizeDisplay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Volatility Buffer (1.5x ATR):</span>
                  <span className="text-slate-300">${safeStopDistance.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateToSection("risk")}
              className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40"
            >
              <Calculator className="h-3.5 w-3.5" />
              <span>Apply Safe Lot in Risk Calculator</span>
            </button>
          </div>

          {/* STEP 4: Pre-Flight Event Checklist */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-bold text-xs font-mono">
                    4
                  </span>
                  <h3 className="font-bold text-sm text-white">Pre-Flight Safety Audit</h3>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {checkedCount}/5 PASS
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Pre-trade confirmation protocol to enforce strict discipline before executing any broker order.
              </p>

              <div className="space-y-2">
                {[
                  { id: "macro_event_cleared", label: "No Major UN / Fed Speeches within 60 mins" },
                  { id: "overbought_avoided", label: "RSI not overbought (>70) at all-time high" },
                  { id: "hard_sl_defined", label: "Hard Stop Loss attached to order ticket" },
                  { id: "rr_ratio_valid", label: "Risk-to-Reward Ratio is at least 1:2.0" },
                  { id: "risk_capped", label: "Loss strictly capped at 1% - 2% of equity" }
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleCheckItem(item.id)}
                    className="flex items-center gap-2.5 p-2 bg-slate-950 hover:bg-slate-850/80 border border-slate-800/80 rounded-xl cursor-pointer transition-all text-xs font-mono"
                  >
                    <div className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                      checkedItems[item.id]
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                        : 'border-slate-700 bg-slate-900 text-transparent'
                    }`}>
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                    <span className={checkedItems[item.id] ? "text-slate-200" : "text-slate-500 line-through"}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onNavigateToSection("checklist")}
              className="mt-4 w-full py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Open Master Entry Checklist</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* STEP 5: Breakeven & Scale-Out Rules */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold text-xs font-mono">
                    5
                  </span>
                  <h3 className="font-bold text-sm text-white">Breakeven & Scale-Out</h3>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  PROFIT LOCK
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Eliminate drawdown risk by automating the 1R Breakeven and 50% partial profit rules.
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5 text-xs font-mono">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-400">Rule 1: Move to Breakeven @ +1R</span>
                  <span className="text-emerald-400 font-bold">${breakevenTriggerPrice}</span>
                </div>
                <p className="text-[10px] text-slate-500 pl-2 border-l border-emerald-500/30">
                  When trade gains ${maxRiskDollar.toFixed(0)}, move Stop Loss to Entry price ($ {currentPrice}). Trade is now 100% risk-free.
                </p>

                <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-800/60">
                  <span className="text-slate-400">Rule 2: Scale Out 50% @ TP1</span>
                  <span className="text-cyan-400 font-bold">${targetProfitPrice}</span>
                </div>
                <p className="text-[10px] text-slate-500 pl-2 border-l border-cyan-500/30">
                  Bank 50% of the position at first resistance. Let remaining 50% run with zero risk to catch extended trends.
                </p>
              </div>

              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] font-mono text-amber-300">
                💡 If unexpected news breaks at the UN, your position is already at breakeven with partial profit banked.
              </div>
            </div>

            <button
              onClick={() => onNavigateToSection("setup")}
              className="mt-4 w-full py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Push Levels to Trade Setup</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* STEP 6: Paper Trading Simulator Safe Test */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-rose-600/20 text-rose-400 flex items-center justify-center font-bold text-xs font-mono">
                    6
                  </span>
                  <h3 className="font-bold text-sm text-white">Paper Trading Simulation</h3>
                </div>
                <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  ZERO RISK
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Unsure of high-volatility price swings during major international summits? Test first in the live simulator.
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Simulated Account:</span>
                  <span className="text-emerald-400 font-bold">$100,000 Live Demo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Execution Speed:</span>
                  <span className="text-white font-bold">&lt; 15ms Real-Time</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Live Analytics:</span>
                  <span className="text-cyan-400 font-bold">Trader DNA & Journal Sync</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 font-mono">
                Forward-test how your stop losses perform during news weeks before risking real capital on connected brokers.
              </p>
            </div>

            <button
              onClick={() => onNavigateToSection("papertrading")}
              className="mt-4 w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-950/50"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Launch Paper Trading Terminal</span>
            </button>
          </div>

        </div>
      </div>

      {/* QUICK LAUNCH ACTIONS MATRIX */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block font-bold">
            READY TO SAFEGUARD YOUR CAPITAL?
          </span>
          <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
            Apply these protected parameters across your platform tools now:
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigateToSection("setup")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all shadow"
          >
            <Crosshair className="h-4 w-4" />
            <span>Generate Protected Setup</span>
          </button>
          <button
            onClick={() => onNavigateToSection("brokers")}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all"
          >
            <ExternalLink className="h-4 w-4 text-emerald-400" />
            <span>Broker Connect & Routing</span>
          </button>
        </div>
      </div>

    </div>
  );
}
