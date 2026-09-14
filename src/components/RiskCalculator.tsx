import React, { useState, useEffect, useMemo } from "react";
import { ShieldCheck, Percent, HelpCircle, RefreshCw, Calculator, Info, Coins, Zap, Loader2, ArrowRight, CheckCircle } from "lucide-react";
import { MarketAsset } from "../types";
import { 
  SUPPORTED_CURRENCIES, 
  getStoredCurrency, 
  setStoredCurrency, 
  formatCurrencyAmount, 
  calculatePips, 
  CurrencyConfig 
} from "../utils/currencyAndPips";

interface RiskCalculatorProps {
  initialBalance?: number;
  initialEntry?: number;
  initialStop?: number;
  category?: 'Forex' | 'Crypto' | 'Stocks' | 'Commodities' | 'Indices';
  assets?: MarketAsset[];
  selectedAsset?: MarketAsset;
  onSelectAsset?: (asset: MarketAsset) => void;
  onNavigateToSection?: (section: any) => void;
}

export default function RiskCalculator({ 
  initialBalance = 10000, 
  initialEntry = 1.0850, 
  initialStop = 1.0800,
  category = "Forex",
  assets = [],
  selectedAsset,
  onSelectAsset,
  onNavigateToSection
}: RiskCalculatorProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyConfig>(getStoredCurrency());
  
  // Direct order state
  const [isPlacingDirectOrder, setIsPlacingDirectOrder] = useState(false);
  const [directOrderReceipt, setDirectOrderReceipt] = useState<{
    id: string;
    market: string;
    direction: "BUY" | "SELL";
    price: number;
    lots: number;
    sl: number;
    tp: number;
    broker: string;
  } | null>(null);

  // Balance is entered in the active account currency (e.g. ₦16,000,000 or $10,000)
  const [balanceInCurrency, setBalanceInCurrency] = useState<number>(() => {
    const cur = getStoredCurrency();
    return initialBalance * cur.rateToUSD;
  });

  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [entryPrice, setEntryPrice] = useState<number>(initialEntry);
  const [stopLoss, setStopLoss] = useState<number>(initialStop);
  const [targetPrice, setTargetPrice] = useState<number>(initialEntry + (initialEntry - initialStop) * 2);
  const [activeCategory, setActiveCategory] = useState<'Forex' | 'Crypto' | 'Stocks' | 'Commodities' | 'Indices'>(category);

  const handleCurrencyChange = (code: string) => {
    const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
    if (found) {
      // Scale current balance to new currency rate
      const oldRate = selectedCurrency.rateToUSD;
      const usdEquiv = balanceInCurrency / (oldRate > 0 ? oldRate : 1);
      const newBal = usdEquiv * found.rateToUSD;
      setSelectedCurrency(found);
      setBalanceInCurrency(Math.round(newBal));
      setStoredCurrency(found.code);
    }
  };

  // Synchronize state when initial props change due to asset switching
  useEffect(() => {
    if (selectedAsset) {
      const isCrypto = selectedAsset.category === "Crypto" || /BTC|ETH|SOL|XRP|DOGE|PEPE|SHIB|ADA|DOT|AVAX|LINK|NEAR|BNB|UNI|LTC|BCH|SUI|APT|ICP|RENDER|STX|CRYPTO/i.test(selectedAsset.symbol);
      const slDist = isCrypto ? 0.025 : 0.008; // 2.5% for Crypto vs 0.8% for Forex/Gold
      const tpDist = isCrypto ? 0.055 : 0.018; // 5.5% for Crypto vs 1.8% for Forex/Gold
      
      setEntryPrice(selectedAsset.price);
      setStopLoss(Number((selectedAsset.price * (1 - slDist)).toFixed(selectedAsset.price < 0.1 ? 6 : selectedAsset.price < 2 ? 4 : 2)));
      setTargetPrice(Number((selectedAsset.price * (1 + tpDist)).toFixed(selectedAsset.price < 0.1 ? 6 : selectedAsset.price < 2 ? 4 : 2)));
      setActiveCategory(selectedAsset.category);
    } else {
      setEntryPrice(initialEntry);
      setStopLoss(initialStop);
      setTargetPrice(initialEntry + (initialEntry - initialStop) * 2);
      setActiveCategory(category);
    }
  }, [initialEntry, initialStop, selectedAsset, category]);

  // Stable memoized asset list to prevent dropdown blinking on real-time price updates
  const stableAssets = useMemo(() => {
    return assets.map(a => ({
      symbol: a.symbol,
      name: a.name,
      category: a.category
    }));
  }, [assets.map(a => a.symbol).join(",")]);

  // Math variables
  const currentSymbol = selectedAsset?.symbol || (assets && assets.length > 0 ? assets[0].symbol : "EUR/USD");
  
  // Calculate Pips using our unified calculator
  const slPips = calculatePips(currentSymbol, entryPrice, stopLoss);
  const tpPips = calculatePips(currentSymbol, entryPrice, targetPrice);

  // Convert account balance to USD for position sizing logic
  const balanceUSD = balanceInCurrency / (selectedCurrency.rateToUSD > 0 ? selectedCurrency.rateToUSD : 1);
  const riskAmountCurrency = balanceInCurrency * (riskPercent / 100);
  const riskAmountUSD = balanceUSD * (riskPercent / 100);

  const diff = Math.abs(entryPrice - stopLoss);
  
  // Sizing formula: Position Size = Risk Amount in USD / Stop distance in USD
  let positionUnits = diff > 0 ? riskAmountUSD / diff : 0;
  
  // Specific Lot sizing rules:
  // Forex: 1 Standard Lot = 100,000 units. 1 Mini Lot = 10,000 units. 1 Micro Lot = 1,000 units.
  // Crypto/Stocks: 1 Unit = 1 share/coin
  let standardLots = 0;
  let label = "Units / Shares";
  if (activeCategory === "Forex" || entryPrice < 2) {
    standardLots = positionUnits / 100000;
    label = "Standard Lots";
  } else if (activeCategory === "Crypto") {
    standardLots = positionUnits;
    label = "Crypto Coins";
  } else {
    standardLots = positionUnits;
    label = "Equity Shares";
  }

  const expectedProfitUSD = Math.abs(targetPrice - entryPrice) * positionUnits;
  const expectedProfitCurrency = expectedProfitUSD * selectedCurrency.rateToUSD;
  const rrRatio = diff > 0 ? Math.abs(targetPrice - entryPrice) / diff : 0;

  // Stress test scenarios
  const portfolioDrawdown5Losses = riskAmountCurrency * 5;
  const portfolioDrawdown10Losses = riskAmountCurrency * 10;
  const portfolioGrowth5Wins = expectedProfitCurrency * 5;

  // Direct order routing handler
  const handleExecuteDirectOrder = (side: "BUY" | "SELL") => {
    setIsPlacingDirectOrder(true);
    setDirectOrderReceipt(null);

    const ticketId = `STP-RISK-${Math.floor(100000 + Math.random() * 900000)}`;
    const brokerName = "AI QUANT PRIME DESK";
    const executedLots = parseFloat(standardLots.toFixed(2)) || 0.1;

    setTimeout(() => {
      setIsPlacingDirectOrder(false);

      // Save to position store for broker & paper trading
      try {
        const positionsRaw = localStorage.getItem("paper_trading_positions_v1");
        const openPositions = positionsRaw ? JSON.parse(positionsRaw) : [];
        const newPosition = {
          id: `pos_${Date.now()}`,
          symbol: currentSymbol,
          type: side,
          entryPrice: entryPrice,
          currentPrice: entryPrice,
          size: executedLots,
          leverage: 100,
          stopLoss: stopLoss,
          takeProfit: targetPrice,
          pnl: 0,
          timestamp: new Date().toISOString(),
          status: "OPEN",
          brokerId: "quantintel-stp",
          notes: `Calculated Risk Order (Risk: ${riskPercent}%, RR 1:${rrRatio.toFixed(2)}) Ticket #${ticketId}`
        };
        localStorage.setItem("paper_trading_positions_v1", JSON.stringify([newPosition, ...openPositions]));
      } catch (e) {
        console.error("Risk direct order position sync failed:", e);
      }

      // Sync to journal entries
      try {
        const journalRaw = localStorage.getItem("ai_quant_journal_entries");
        const existingEntries = journalRaw ? JSON.parse(journalRaw) : [];
        const newEntry = {
          id: `j_${Date.now()}`,
          date: new Date().toISOString().split("T")[0],
          market: currentSymbol,
          direction: side,
          entryPrice: entryPrice,
          exitPrice: targetPrice,
          outcome: "WIN",
          profit: expectedProfitCurrency,
          emotion: "Calculated",
          mistake: "None",
          notes: `Executed via Risk Calculator. Sizing: ${executedLots} Lots. SL Pips: ${slPips.toFixed(1)}, TP Pips: ${tpPips.toFixed(1)}, RR: 1:${rrRatio.toFixed(2)}. Ticket #${ticketId}.`
        };
        localStorage.setItem("ai_quant_journal_entries", JSON.stringify([newEntry, ...existingEntries]));
      } catch (e) {
        console.error("Journal sync failed:", e);
      }

      setDirectOrderReceipt({
        id: ticketId,
        market: currentSymbol,
        direction: side,
        price: entryPrice,
        lots: executedLots,
        sl: stopLoss,
        tp: targetPrice,
        broker: brokerName
      });
    }, 1400);
  };

  return (
    <div className="space-y-6">
      
      {/* Header banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-emerald-400 tracking-wider uppercase mb-1">
            RISK DESK CO-PILOT
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Institutional Risk & Sizing Calculator
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Accurately size positions to protect equity pools. Supports multi-currency accounts including Nigerian Naira (NGN ₦), USD, EUR, GBP, JPY & more.
          </p>
        </div>

        {/* Currency Switcher Header Widget */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1 font-mono text-xs shrink-0">
          <label className="text-[10px] text-slate-400 font-bold block uppercase flex items-center gap-1">
            <Coins className="h-3.5 w-3.5 text-emerald-400" />
            Account Currency
          </label>
          <select
            value={selectedCurrency.code}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-750 focus:border-emerald-500 text-white rounded px-2.5 py-1 text-xs font-mono cursor-pointer"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} ({c.symbol}) — {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Input parameters */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            Sizing Inputs ({selectedCurrency.symbol})
          </h3>

          <div className="space-y-4">
            {assets.length > 0 && (
              <div>
                <label className="text-[11px] text-slate-400 font-mono block mb-1.5 uppercase flex items-center gap-1">
                  <Coins className="h-3 w-3 text-emerald-400" />
                  Target Instrument
                </label>
                <select
                  value={selectedAsset?.symbol || ""}
                  onChange={(e) => {
                    const found = assets.find(a => a.symbol === e.target.value);
                    if (found && onSelectAsset) {
                      onSelectAsset(found);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none cursor-pointer"
                >
                  {stableAssets.map((asset) => (
                    <option key={asset.symbol} value={asset.symbol}>
                      {asset.symbol} — {asset.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] text-slate-400 font-mono uppercase">
                  Account Balance ({selectedCurrency.code})
                </label>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  {selectedCurrency.flag} {selectedCurrency.symbol}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 font-mono text-xs">
                  {selectedCurrency.symbol}
                </span>
                <input
                  type="number"
                  value={balanceInCurrency}
                  onChange={(e) => setBalanceInCurrency(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded-lg pl-8 pr-4 py-2 text-xs font-mono focus:outline-none font-bold text-emerald-400"
                />
              </div>
              {selectedCurrency.code !== "USD" && (
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                  ≈ ${balanceUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD equivalent (@ {selectedCurrency.rateToUSD} {selectedCurrency.code}/USD)
                </span>
              )}
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-mono block mb-1.5 uppercase">
                Desired Risk Percentage (%)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 font-mono text-xs">%</span>
                <input
                  type="number"
                  step="0.1"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded-lg pl-8 pr-4 py-2 text-xs font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1 uppercase">
                  Entry Price
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] text-slate-400 font-mono block uppercase">
                    Stop Loss
                  </label>
                  <span className="text-[10px] text-rose-400 font-mono font-bold">
                    {slPips.toFixed(1)} pips
                  </span>
                </div>
                <input
                  type="number"
                  step="0.0001"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] text-slate-400 font-mono block uppercase">
                    Take Profit
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    {tpPips.toFixed(1)} pips
                  </span>
                </div>
                <input
                  type="number"
                  step="0.0001"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Output parameters */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Optimized Sizing outputs</span>
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
                {selectedCurrency.flag} {selectedCurrency.code} ({selectedCurrency.symbol})
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Position Units</span>
                <span className="text-lg font-bold text-white block mt-1.5 font-mono">
                  {positionUnits.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] text-slate-500 font-mono block mt-1">Contracts Size</span>
              </div>

              <div className="p-4 bg-slate-950 border border-emerald-500/10 rounded-xl text-center">
                <span className="text-[10px] text-emerald-400 font-mono uppercase">{label}</span>
                <span className="text-lg font-bold text-emerald-400 block mt-1.5 font-mono">
                  {standardLots.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </span>
                <span className="text-[9px] text-emerald-500/80 font-mono block mt-1">Optimal allocation</span>
              </div>

              <div className="p-4 bg-slate-950 border border-rose-500/10 rounded-xl text-center">
                <span className="text-[10px] text-rose-400 font-mono uppercase">Max Currency Risk</span>
                <span className="text-lg font-bold text-rose-400 block mt-1.5 font-mono">
                  {formatCurrencyAmount(riskAmountCurrency, selectedCurrency)}
                </span>
                <span className="text-[9px] text-rose-500/80 font-mono block mt-1">exactly {riskPercent}% of bal</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono border-t border-slate-800/80 pt-4">
              <div>
                <span className="text-slate-500 block">Stop Distance:</span>{" "}
                <span className="text-rose-400 font-semibold">{slPips.toFixed(1)} pips</span>
                <span className="text-[10px] text-rose-400/80 block font-bold">
                  -{formatCurrencyAmount(riskAmountCurrency, selectedCurrency)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Target Distance:</span>{" "}
                <span className="text-emerald-400 font-semibold">{tpPips.toFixed(1)} pips</span>
                <span className="text-[10px] text-emerald-400/80 block font-bold">
                  +{formatCurrencyAmount(expectedProfitCurrency, selectedCurrency)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Expected Profit:</span>{" "}
                <span className="text-emerald-400 font-semibold">
                  {formatCurrencyAmount(expectedProfitCurrency, selectedCurrency)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Risk-Reward:</span>{" "}
                <span className="text-slate-300 font-semibold">1 : {rrRatio.toFixed(2)}</span>
              </div>
            </div>

            {/* Direct STP Order Placement Section */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                    <Zap className="h-4 w-4 fill-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Direct Place Order from Sizing Math
                    </h4>
                    <span className="text-[10px] text-slate-400 font-sans block">
                      Route this calculated sizing ({standardLots.toFixed(2)} Lots @ ${entryPrice}) straight to prime broker
                    </span>
                  </div>
                </div>

                {onNavigateToSection && (
                  <button
                    onClick={() => onNavigateToSection('papertrading')}
                    className="text-[10px] text-slate-400 hover:text-emerald-400 font-mono flex items-center gap-1 transition-all cursor-pointer underline"
                    title="Open orders terminal"
                  >
                    <span>View Orders</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Order Placement Execution Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleExecuteDirectOrder("BUY")}
                  disabled={isPlacingDirectOrder}
                  className="py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 font-bold text-xs tracking-wide rounded-xl shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isPlacingDirectOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Routing BUY Order...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 fill-slate-950" />
                      <span>Direct BUY Order ({standardLots.toFixed(2)} Lots)</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleExecuteDirectOrder("SELL")}
                  disabled={isPlacingDirectOrder}
                  className="py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white font-bold text-xs tracking-wide rounded-xl shadow-lg shadow-rose-600/15 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isPlacingDirectOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Routing SELL Order...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 fill-white" />
                      <span>Direct SELL Order ({standardLots.toFixed(2)} Lots)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Direct Order Confirmation Receipt */}
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
                      <span className="text-slate-300">${directOrderReceipt.sl} / ${directOrderReceipt.tp}</span>
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
          </div>

          {/* Stress testing parameters */}
          <div className="mt-6 border-t border-slate-800/80 pt-4">
            <h4 className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-3">
              Portfolio Drawdown Stress Simulator ({selectedCurrency.code})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs">
              <div className="p-2.5 bg-slate-950 border border-slate-800/60 rounded">
                <div className="text-[9px] text-slate-500 font-mono uppercase">5-Loss Streak</div>
                <div className="font-bold text-rose-400 mt-1 font-mono">
                  -{formatCurrencyAmount(portfolioDrawdown5Losses, selectedCurrency)}
                </div>
                <span className="text-[8px] text-slate-500 font-mono">{(riskPercent * 5).toFixed(1)}% draw</span>
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-800/60 rounded">
                <div className="text-[9px] text-slate-500 font-mono uppercase">10-Loss Streak</div>
                <div className="font-bold text-rose-500 mt-1 font-mono">
                  -{formatCurrencyAmount(portfolioDrawdown10Losses, selectedCurrency)}
                </div>
                <span className="text-[8px] text-slate-500 font-mono">{(riskPercent * 10).toFixed(1)}% draw</span>
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-800/60 rounded">
                <div className="text-[9px] text-slate-500 font-mono uppercase">5-Win Streak</div>
                <div className="font-bold text-emerald-400 mt-1 font-mono">
                  +{formatCurrencyAmount(portfolioGrowth5Wins, selectedCurrency)}
                </div>
                <span className="text-[8px] text-emerald-400/80 font-mono">+{((expectedProfitCurrency * 5 / balanceInCurrency) * 100).toFixed(1)}% growth</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

