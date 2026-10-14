import React, { useState, useEffect } from "react";
import { MarketAsset } from "../types";
import { soundEffects } from "../utils/soundEffects";
import { reconcileTechnicalAndFundamental } from "../utils/marketNews";
import { 
  ArrowUpRight, ArrowDownRight, ChevronUp, ChevronDown, 
  Zap, X, ShieldCheck, CheckCircle2, ShieldAlert,
  Building2, Radio, Sliders, ExternalLink, AlertCircle,
  Lock, Copy, Shield, RefreshCw
} from "lucide-react";
import { 
  getActivePrimaryBroker, 
  setActivePrimaryBroker, 
  getConnectedBrokersList, 
  executeDirectBrokerOrder, 
  getCurrentUser,
  UnifiedBroker,
  isPropFirmBroker,
  getPropFirmMetrics,
  calculatePropFirmSafeLotSize,
  validatePropFirmTradeRisk,
  copyMasterTradeToPropFirm,
  resetDailyPropFirmDrawdown,
  getUniversalCopierConfig,
  updateUniversalCopierConfig,
  executeMasterToSlaveTradeCopy
} from "../utils/brokerSync";

interface QuickOrderDockProps {
  selectedAsset: MarketAsset;
  onNavigateToSection?: (section: any) => void;
  isOpen: boolean;
  onToggle: () => void;
  currentUser?: any;
}

export default function QuickOrderDock({
  selectedAsset,
  onNavigateToSection,
  isOpen,
  onToggle,
  currentUser: propUser
}: QuickOrderDockProps) {
  const effectiveUser = propUser || getCurrentUser();
  const userId = effectiveUser?.id || "guest_trader";

  // Mode: "paper" (Demo Simulation) vs "live" (Real Account Broker Gateway)
  const [accountMode, setAccountMode] = useState<'paper' | 'live'>('live');
  const [lotSize, setLotSize] = useState<number>(0.1);
  const [riskReward, setRiskReward] = useState<number>(2.0); // 1:2 default R:R
  const [connectedBrokers, setConnectedBrokers] = useState<UnifiedBroker[]>([]);
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>("");

  const [lastExecuted, setLastExecuted] = useState<{
    type: 'BUY' | 'SELL';
    price: number;
    sl: number;
    tp: number;
    id: string;
    mode: 'paper' | 'live';
    brokerName?: string;
  } | null>(null);

  const [propRiskError, setPropRiskError] = useState<string | null>(null);
  const [copierEnabled, setCopierEnabled] = useState<boolean>(() => {
    return getUniversalCopierConfig(userId).enabled;
  });
  const [copierTargetBrokerId, setCopierTargetBrokerId] = useState<string>("all");
  const [mirrorResult, setMirrorResult] = useState<string | null>(null);

  // Sync connected brokers and primary routing broker from brokerSync for this user
  const loadBrokers = () => {
    try {
      const active = getConnectedBrokersList(userId);
      setConnectedBrokers(active);
      const primary = getActivePrimaryBroker(userId);
      if (primary) {
        setSelectedBrokerId(primary.id);
        // Automatically default to live broker routing if a real broker is connected!
        if (active.some(b => b.connected)) {
          setAccountMode('live');
        }
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    loadBrokers();
    const handleStorage = () => loadBrokers();
    const handleBrokerEvent = (e: any) => {
      loadBrokers();
      if (e?.detail?.brokerId) {
        setSelectedBrokerId(e.detail.brokerId);
        setAccountMode('live');
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("broker_trade_executed", handleStorage);
    window.addEventListener("primary_broker_changed", handleBrokerEvent);
    window.addEventListener("broker_connected", handleBrokerEvent);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("broker_trade_executed", handleStorage);
      window.removeEventListener("primary_broker_changed", handleBrokerEvent);
      window.removeEventListener("broker_connected", handleBrokerEvent);
    };
  }, [userId]);

  const activeBroker = connectedBrokers.find(b => b.id === selectedBrokerId) || getActivePrimaryBroker(userId);
  const isPropAccount = accountMode === 'live' && isPropFirmBroker(activeBroker);

  // Prop Firm Challenge Metrics State
  const [propMetrics, setPropMetrics] = useState(() => getPropFirmMetrics(activeBroker, userId));

  useEffect(() => {
    setPropMetrics(getPropFirmMetrics(activeBroker, userId));
    const handlePropUpdate = () => {
      setPropMetrics(getPropFirmMetrics(activeBroker, userId));
    };
    window.addEventListener("prop_firm_metrics_updated", handlePropUpdate);
    return () => window.removeEventListener("prop_firm_metrics_updated", handlePropUpdate);
  }, [activeBroker, userId]);

  // Precision helper based on asset
  const isForex = selectedAsset.category === 'Forex' || selectedAsset.symbol.includes('/');
  const isCrypto = selectedAsset.category === 'Crypto' || selectedAsset.symbol.includes('BTC') || selectedAsset.symbol.includes('ETH');
  const decimals = isForex ? 4 : isCrypto ? 2 : 2;

  // Dynamic SL & TP computation
  const slPercent = isForex ? 0.0045 : isCrypto ? 0.015 : 0.008; // dynamic SL distance
  const slDist = selectedAsset.price * slPercent;
  const tpDist = slDist * riskReward;

  const dynamicBuySL = Number((selectedAsset.price - slDist).toFixed(decimals));
  const dynamicBuyTP = Number((selectedAsset.price + tpDist).toFixed(decimals));
  const dynamicSellSL = Number((selectedAsset.price + slDist).toFixed(decimals));
  const dynamicSellTP = Number((selectedAsset.price - tpDist).toFixed(decimals));

  // Calculate safe maximum lot size under strict 1.0% Prop Firm rules
  const safeMaxLots = calculatePropFirmSafeLotSize(
    selectedAsset.symbol,
    selectedAsset.price,
    dynamicBuySL,
    propMetrics.initialBalance,
    propMetrics.maxRiskPerTradePct
  );

  // Compute reconciled bias
  const reconciled = reconcileTechnicalAndFundamental(selectedAsset);
  const isRecommendedBuy = reconciled.finalAction === 'BUY';
  const isRecommendedSell = reconciled.finalAction === 'SELL';

  const handleExecuteQuickTrade = (type: 'BUY' | 'SELL') => {
    setPropRiskError(null);
    const stopLoss = type === 'BUY' ? dynamicBuySL : dynamicSellSL;
    const takeProfit = type === 'BUY' ? dynamicBuyTP : dynamicSellTP;

    if (accountMode === 'paper') {
      // 1. PAPER TRADING REGISTRATION
      const newPosition = {
        id: "pos-" + Date.now(),
        symbol: selectedAsset.symbol,
        name: selectedAsset.name,
        category: selectedAsset.category,
        type: type,
        entryPrice: selectedAsset.price,
        currentPrice: selectedAsset.price,
        size: lotSize,
        leverage: 20,
        stopLoss: stopLoss,
        takeProfit: takeProfit,
        unrealizedPnL: 0,
        timestamp: new Date().toISOString(),
        status: "OPEN"
      };

      try {
        const existing = localStorage.getItem("trader_paper_positions");
        const list = existing ? JSON.parse(existing) : [];
        list.unshift(newPosition);
        localStorage.setItem("trader_paper_positions", JSON.stringify(list));
        window.dispatchEvent(new Event("paper_trades_updated"));
      } catch {
        // Fallback
      }

      // Play paper order sound
      soundEffects.playOrderExecuted(type);

      setLastExecuted({
        type,
        price: selectedAsset.price,
        sl: stopLoss,
        tp: takeProfit,
        id: newPosition.id,
        mode: 'paper'
      });

      // Trade Copier: Mirror to Connected Slave Brokers (Paper Master)
      if (copierEnabled) {
        const slaveCandidates = copierTargetBrokerId === "all"
          ? connectedBrokers.filter(b => b.connected).map(b => b.id)
          : [copierTargetBrokerId];

        if (slaveCandidates.length > 0) {
          const copyResult = executeMasterToSlaveTradeCopy({
            symbol: selectedAsset.symbol,
            side: type,
            price: selectedAsset.price,
            lotSize,
            stopLoss,
            takeProfit,
            category: selectedAsset.category,
            sourceModule: "Paper Trading Master Copier",
            userId
          }, { id: "paper", name: "Paper Trading Master", connected: true } as any, slaveCandidates, userId);

          if (copyResult.copiedCount > 0) {
            const summary = copyResult.results
              .filter(r => r.success)
              .map(r => `${r.brokerName} (${r.lots} Lots)`)
              .join(", ");
            setMirrorResult(`⚡ Copied to ${copyResult.copiedCount} broker(s): ${summary} with strict 1% risk limit.`);
          } else {
            setMirrorResult(`⚠️ Copier: ${copyResult.results[0]?.message || "No orders copied."}`);
          }
          setTimeout(() => setMirrorResult(null), 8000);
        }
      }
    } else {
      // 2. LIVE REAL BROKER EXECUTION GATEWAY - SENDS DIRECTLY TO CONNECTED BROKER
      if (!activeBroker || !activeBroker.connected) {
        onNavigateToSection?.('brokers');
        return;
      }

      // STRICT PROP FIRM VALIDATION BEFORE TRANSMITTING
      if (isPropAccount) {
        const riskCheck = validatePropFirmTradeRisk(
          activeBroker,
          lotSize,
          selectedAsset.symbol,
          selectedAsset.price,
          stopLoss,
          userId
        );

        if (!riskCheck.allowed) {
          soundEffects.playAlert();
          setPropRiskError(riskCheck.reason || "Order blocked by strict Prop Firm risk guardrails.");
          return;
        }
      }

      try {
        const receipt = executeDirectBrokerOrder({
          symbol: selectedAsset.symbol,
          side: type,
          price: selectedAsset.price,
          lotSize,
          stopLoss,
          takeProfit,
          category: selectedAsset.category,
          sourceModule: isPropAccount ? "FundedNext Prop Desk" : "One-Click Quick Order Dock",
          userId
        }, userId);

        // Play affirmative live execution chord
        soundEffects.playLiveOrderExecuted(type);

        setLastExecuted({
          type,
          price: selectedAsset.price,
          sl: stopLoss,
          tp: takeProfit,
          id: receipt.ticketId,
          mode: 'live',
          brokerName: `${receipt.brokerName} (${receipt.accountNo})`
        });
        setPropRiskError(null);

        // Universal Trade Copier: Mirror to other connected slave brokers
        if (copierEnabled) {
          const otherBrokers = connectedBrokers.filter(b => b.connected && b.id !== activeBroker.id);
          const slaveCandidates = copierTargetBrokerId === "all"
            ? otherBrokers.map(b => b.id)
            : (copierTargetBrokerId !== activeBroker.id ? [copierTargetBrokerId] : []);

          if (slaveCandidates.length > 0) {
            const copyResult = executeMasterToSlaveTradeCopy({
              symbol: selectedAsset.symbol,
              side: type,
              price: selectedAsset.price,
              lotSize,
              stopLoss,
              takeProfit,
              category: selectedAsset.category,
              sourceModule: `Live Master (${receipt.brokerName}) Copier`,
              userId
            }, activeBroker, slaveCandidates, userId);

            if (copyResult.copiedCount > 0) {
              const summary = copyResult.results
                .filter(r => r.success)
                .map(r => `${r.brokerName} (${r.lots} Lots)`)
                .join(", ");
              setMirrorResult(`⚡ Copied to ${copyResult.copiedCount} slave account(s): ${summary} (1% risk cap).`);
              setTimeout(() => setMirrorResult(null), 8000);
            }
          }
        }
      } catch (err: any) {
        soundEffects.playAlert();
        setPropRiskError(err?.message || "Execution blocked by Prop Firm Challenge Shield.");
        return;
      }
    }

    setTimeout(() => {
      setLastExecuted(null);
    }, 6000);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-14 lg:bottom-4 right-4 z-40">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900/95 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/50 rounded-xl shadow-2xl backdrop-blur-md text-white transition-all cursor-pointer group"
          title="Open Quick Execution Dock"
        >
          <div className={`h-6 w-6 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 ${
            accountMode === 'live' 
              ? 'bg-rose-600/30 border border-rose-500/50 text-rose-400' 
              : 'bg-blue-600/30 border border-blue-500/50 text-blue-400'
          }`}>
            <Zap className={`h-3.5 w-3.5 ${accountMode === 'live' ? 'fill-rose-400' : 'fill-blue-400'}`} />
          </div>
          <div className="text-left font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black leading-none text-slate-200">QUICK EXECUTION</span>
              <span className={`text-[8px] font-bold px-1 rounded uppercase ${
                accountMode === 'live' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {accountMode === 'live' ? 'LIVE' : 'PAPER'}
              </span>
            </div>
            <div className="text-[8.5px] text-slate-400 leading-tight font-bold">{selectedAsset.symbol} · ${selectedAsset.price}</div>
          </div>
          <ChevronUp className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
        </button>
      </div>
    );
  }

  return (
    <aside aria-label="Quick Execution Dock" className="fixed bottom-14 lg:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl p-3 text-slate-200 font-sans transition-all animate-in slide-in-from-bottom-3 duration-200">
      
      {/* Top Header: Asset Info, Mode Switcher, and Controls */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
            accountMode === 'live' 
              ? 'bg-rose-600/20 border border-rose-500/40 text-rose-400' 
              : 'bg-blue-600/20 border border-blue-500/40 text-blue-400'
          }`}>
            <Zap className={`h-4 w-4 ${accountMode === 'live' ? 'fill-rose-400' : 'fill-blue-400'}`} />
          </div>

          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-white tracking-tight">{selectedAsset.symbol}</span>
              <span className="text-[10px] font-mono text-slate-400">${selectedAsset.price}</span>
              <span className={`text-[10px] font-mono font-bold ${selectedAsset.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {selectedAsset.changePercent >= 0 ? '+' : ''}{selectedAsset.changePercent}%
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-mono uppercase text-slate-500 font-bold">Directive:</span>
              <span className={`text-[8.5px] font-mono font-black px-1.5 py-0.2 rounded border ${
                isRecommendedBuy 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                  : isRecommendedSell 
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                {reconciled.actionBadge}
              </span>
            </div>
          </div>
        </div>

        {/* Account Mode Switcher (Paper vs Live Broker) */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setAccountMode('paper')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
              accountMode === 'paper'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="h-2.5 w-2.5" />
            <span>PAPER (DEMO)</span>
          </button>
          <button
            onClick={() => setAccountMode('live')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
              accountMode === 'live'
                ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="h-2.5 w-2.5" />
            <span>REAL BROKER</span>
          </button>
        </div>

        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
          title="Minimize Dock"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Broker Gateway Bar (when in Live mode) */}
      {accountMode === 'live' && (
        <div className="mb-2 px-2.5 py-1.5 bg-slate-950/90 border border-emerald-500/40 rounded-xl flex items-center justify-between text-[10px] font-mono shadow-inner">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="text-slate-400 shrink-0 font-bold">Direct Route:</span>
            {connectedBrokers.length > 1 ? (
              <select
                value={selectedBrokerId}
                onChange={(e) => {
                  setSelectedBrokerId(e.target.value);
                  setActivePrimaryBroker(e.target.value, undefined, userId);
                }}
                className="bg-slate-900 border border-slate-800 text-emerald-400 font-extrabold rounded px-1.5 py-0.5 text-[9.5px] focus:outline-none focus:border-emerald-500 cursor-pointer truncate max-w-[210px]"
                title="Select destination broker for automated direct execution"
              >
                {connectedBrokers.map(b => (
                  <option key={b.id} value={b.id}>
                    {isPropFirmBroker(b) ? "🛡️" : "⚡"} {b.name} ({b.accountNo || "Direct API"})
                  </option>
                ))}
              </select>
            ) : activeBroker ? (
              <span className="text-white font-bold flex items-center gap-1 truncate">
                <Building2 className="h-3 w-3 text-emerald-400 shrink-0" />
                <span className="truncate">{activeBroker.name}</span>
                <span className="text-slate-400">({activeBroker.accountNo || 'ACTIVE'})</span>
                <span className="text-emerald-400 ml-1 shrink-0 font-extrabold">· ${(activeBroker.equity || activeBroker.balance || 14250).toLocaleString()}</span>
              </span>
            ) : (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                No broker connected
              </span>
            )}
          </div>
          <button
            onClick={() => onNavigateToSection?.('brokers')}
            className="text-[9px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-0.5 hover:underline cursor-pointer shrink-0 ml-2"
          >
            <span>Switch / Add</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </button>
        </div>
      )}

      {/* STRICT PROP FIRM CHALLENGE SHIELD (STRICTLY FOR PROP FIRM USERS / ACCOUNTS) */}
      {isPropAccount && (
        <div className="mb-2 p-2.5 bg-gradient-to-r from-amber-950/40 via-slate-950 to-indigo-950/40 border border-amber-500/50 rounded-xl space-y-1.5 text-[10px] font-mono shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <Shield className="h-3.5 w-3.5 text-amber-400 fill-amber-400/20" />
              <span className="tracking-wider uppercase">STRICT PROP FIRM SHIELD</span>
              <span className="text-[8.5px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                {propMetrics.firmName} · {propMetrics.accountModel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[9px]">{propMetrics.phase}</span>
              <button
                onClick={() => {
                  const reset = resetDailyPropFirmDrawdown(activeBroker.id, userId);
                  setPropMetrics(reset);
                  setPropRiskError(null);
                }}
                title="Simulate daily 00:00 UTC rollover reset"
                className="text-slate-500 hover:text-white flex items-center gap-0.5 text-[8.5px] cursor-pointer"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                <span>Rollover</span>
              </button>
            </div>
          </div>

          {/* Metric meters grid */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80 text-[9.5px]">
            <div>
              <div className="flex justify-between text-slate-400">
                <span>Daily Loss:</span>
                <span className={`font-bold ${propMetrics.currentDailyLossPct >= 4.0 ? "text-rose-400 font-black animate-pulse" : propMetrics.currentDailyLossPct >= 2.5 ? "text-amber-400" : "text-emerald-400"}`}>
                  {propMetrics.currentDailyLossPct}% / 5.0%
                </span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full mt-1 overflow-hidden">
                <div 
                  className={`h-full transition-all ${propMetrics.currentDailyLossPct >= 4.0 ? "bg-rose-500" : propMetrics.currentDailyLossPct >= 2.5 ? "bg-amber-500" : "bg-emerald-500"}`} 
                  style={{ width: `${Math.min(100, (propMetrics.currentDailyLossPct / 5.0) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400">
                <span>Overall DD:</span>
                <span className="text-slate-200 font-bold">{propMetrics.currentMaxDrawdownPct}% / 10.0%</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-blue-500" 
                  style={{ width: `${Math.min(100, (propMetrics.currentMaxDrawdownPct / 10.0) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400">
                <span>Profit Target:</span>
                <span className="text-emerald-400 font-bold">+{propMetrics.currentProfitPct}% / {propMetrics.profitTargetPct}%</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-emerald-400" 
                  style={{ width: `${Math.min(100, (propMetrics.currentProfitPct / propMetrics.profitTargetPct) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Safe Lot cap notice */}
          <div className="flex items-center justify-between text-[9px] pt-1 text-slate-400">
            <div className="flex items-center gap-1">
              <span className="text-amber-400 font-bold">1.0% Risk Rule:</span>
              <span>Max allowed size: <strong>{safeMaxLots} Lots</strong> (${((propMetrics.initialBalance * 0.01)).toLocaleString()})</span>
            </div>
            {lotSize > safeMaxLots && (
              <button
                onClick={() => setLotSize(safeMaxLots)}
                className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded cursor-pointer transition-all"
              >
                Auto-Cap to {safeMaxLots} Lots
              </button>
            )}
          </div>
        </div>
      )}

      {/* UNIVERSAL MASTER-TO-SLAVE TRADE COPIER (ACTIVE FOR ALL BROKERS & PAPER) */}
      <div className="mb-2 px-2.5 py-1.5 bg-gradient-to-r from-blue-950/40 via-slate-950 to-indigo-950/40 border border-blue-500/30 rounded-xl space-y-1.5 text-[9.5px] font-mono shadow-sm">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer font-bold">
            <input 
              type="checkbox"
              checked={copierEnabled}
              onChange={(e) => setCopierEnabled(e.target.checked)}
              className="rounded border-slate-700 text-blue-500 focus:ring-0 cursor-pointer"
            />
            <span className="flex items-center gap-1 text-blue-300">
              <Copy className="h-3 w-3 text-blue-400" />
              <span>Universal Trade Copier:</span>
            </span>
          </label>
          <span className="text-[8.5px] bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20 font-bold">
            EQUITY-SCALED · 1% RISK CAP
          </span>
        </div>

        {copierEnabled && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[9px] text-slate-400">
            <span>Mirror to:</span>
            <select
              value={copierTargetBrokerId}
              onChange={(e) => setCopierTargetBrokerId(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 rounded px-2 py-0.5 text-[9px] font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">🌐 All Connected Slaves ({connectedBrokers.filter(b => b.connected && (accountMode === 'paper' || b.id !== activeBroker.id)).length} Accounts)</option>
              {connectedBrokers
                .filter(b => b.connected && (accountMode === 'paper' || b.id !== activeBroker.id))
                .map(b => (
                  <option key={b.id} value={b.id}>
                    {isPropFirmBroker(b) ? "🛡️" : "⚡"} {b.name} (${(b.balance || 0).toLocaleString()})
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* MIRROR COPIER CONFIRMATION BANNER */}
      {mirrorResult && (
        <div className="mb-2 p-2 bg-blue-950/60 border border-blue-500/40 text-blue-300 text-xs font-mono rounded-xl flex items-center gap-2 animate-in fade-in">
          <Copy className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <span className="text-[10.5px]">{mirrorResult}</span>
        </div>
      )}

      {/* PROP FIRM RISK BLOCK ERROR BANNER */}
      {propRiskError && (
        <div className="mb-2 p-2.5 bg-rose-950/90 border border-rose-500/80 text-rose-200 text-xs font-mono rounded-xl flex items-start gap-2 shadow-lg animate-in fade-in">
          <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-black text-rose-300 block uppercase text-[10px]">EXECUTION BLOCKED BY STRICT PROP FIRM SHIELD</span>
            <p className="text-[10.5px] leading-relaxed mt-0.5 text-slate-200">{propRiskError}</p>
          </div>
          <button onClick={() => setPropRiskError(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* Configuration Strip: Lots, R:R Ratio, Dynamic SL & TP preview */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 mb-2 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-500 uppercase">Lots:</span>
          {[0.01, 0.1, 0.5, 1.0].map((l) => (
            <button
              key={l}
              onClick={() => setLotSize(l)}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                lotSize === l 
                  ? 'bg-blue-600 text-white font-black' 
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-500 uppercase">R:R:</span>
          {[1.5, 2.0, 3.0].map((rr) => (
            <button
              key={rr}
              onClick={() => setRiskReward(rr)}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                riskReward === rr
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              1:{rr}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[9px] text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-lg border border-slate-800/80">
          <span className="text-rose-400 font-semibold">Dyn SL: ±{(slPercent * 100).toFixed(1)}%</span>
          <span>·</span>
          <span className="text-emerald-400 font-semibold">Dyn TP: ±{(slPercent * riskReward * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Execution Feedback Banner */}
      {lastExecuted ? (
        <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <div className="text-xs font-mono">
              <span className="font-bold text-white uppercase">
                {lastExecuted.mode === 'live' ? `[LIVE TICKET #${lastExecuted.id}]` : '[DEMO FILLED]'}
              </span>
              <span className={`ml-1 font-extrabold ${lastExecuted.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {lastExecuted.type} {lotSize} Lots @ ${lastExecuted.price}
              </span>
              <div className="text-[10px] text-slate-300 mt-0.5">
                SL: ${lastExecuted.sl} · TP: ${lastExecuted.tp} 
                {lastExecuted.brokerName && <span className="text-amber-400 ml-1">· Routed via {lastExecuted.brokerName}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateToSection?.(lastExecuted.mode === 'live' ? 'brokers' : 'papertrading')}
            className="text-[10px] font-mono font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer shrink-0 ml-2"
          >
            {lastExecuted.mode === 'live' ? 'Open Brokerage →' : 'View Positions →'}
          </button>
        </div>
      ) : isPropAccount && propMetrics.circuitBreakerTriggered ? (
        /* STRICT CIRCUIT BREAKER LOCKOUT - BUTTONS DISABLED FOR CHALLENGE PROTECTION */
        <div className="p-3 bg-rose-950/80 border border-rose-500/60 rounded-xl text-center space-y-1 font-mono">
          <div className="flex items-center justify-center gap-1.5 text-rose-400 font-black text-xs uppercase">
            <Lock className="h-4 w-4 text-rose-400" />
            <span>CIRCUIT BREAKER ENGAGED: TRADING LOCKED FOR TODAY</span>
          </div>
          <p className="text-[10px] text-slate-300">
            Daily loss reached {propMetrics.currentDailyLossPct}% (4.0% limit). Orders locked to protect your FundedNext evaluation from breaching the 5.0% hard loss rule.
          </p>
        </div>
      ) : (
        /* Action Execution Buttons */
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => handleExecuteQuickTrade('BUY')}
            className={`py-2.5 px-3 rounded-xl font-mono font-extrabold text-xs flex flex-col items-center justify-center gap-0.5 shadow-lg transition-all cursor-pointer ${
              isRecommendedBuy
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white ring-2 ring-emerald-500/40'
                : 'bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="h-4 w-4" />
              <span>INSTANT BUY (LONG)</span>
            </div>
            <span className="text-[9px] font-normal opacity-85">
              TP: ${dynamicBuyTP} · SL: ${dynamicBuySL}
            </span>
          </button>

          <button
            onClick={() => handleExecuteQuickTrade('SELL')}
            className={`py-2.5 px-3 rounded-xl font-mono font-extrabold text-xs flex flex-col items-center justify-center gap-0.5 shadow-lg transition-all cursor-pointer ${
              isRecommendedSell
                ? 'bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white ring-2 ring-rose-500/40'
                : 'bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <ArrowDownRight className="h-4 w-4" />
              <span>INSTANT SELL (SHORT)</span>
            </div>
            <span className="text-[9px] font-normal opacity-85">
              TP: ${dynamicSellTP} · SL: ${dynamicSellSL}
            </span>
          </button>
        </div>
      )}
    </aside>
  );
}
