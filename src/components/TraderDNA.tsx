import React, { useState, useEffect } from "react";
import { TraderDNA } from "../types";
import { Dna, ShieldAlert, Award, Brain, CheckCircle, Flame, Save, User, Wallet, Percent, Calendar, RefreshCw } from "lucide-react";

interface TraderDNAProps {
  profile: TraderDNA;
  onChangeProfile: (profile: TraderDNA) => void;
}

export default function TraderDNAs({ profile, onChangeProfile }: TraderDNAProps) {
  const [localProfile, setLocalProfile] = useState<TraderDNA>(profile);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Keep local state in sync when profile prop changes (e.g. if we switch accounts)
  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  const handleStyleChange = (style: any) => {
    setLocalProfile(prev => ({ ...prev, style }));
  };

  const handleTimeframeChange = (timeframe: any) => {
    setLocalProfile(prev => ({ ...prev, timeframe }));
  };

  const handleMarketChange = (market: any) => {
    setLocalProfile(prev => ({ ...prev, market }));
  };

  const handleRiskChange = (riskTolerance: any) => {
    setLocalProfile(prev => ({ ...prev, riskTolerance }));
  };

  const handleWeaknessChange = (weakness: string) => {
    setLocalProfile(prev => ({ ...prev, weakness }));
  };

  const handleLeverageChange = (leverage: number) => {
    setLocalProfile(prev => ({ ...prev, leverage }));
  };

  const handleFieldChange = (field: keyof TraderDNA, value: any) => {
    setLocalProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setSaveStatus('saving');
    // Simulate server/db roundtrip
    setTimeout(() => {
      onChangeProfile(localProfile);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3500);
    }, 700);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <div>
          <div className="text-xs font-mono text-emerald-400 tracking-wider uppercase mb-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>PERSONALIZATION DESK</span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Trader DNA Profile Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Customize and save your core trading attributes. Our AI Trading Coach and technical setups calibrate instantly to these exact parameters.
          </p>
        </div>
        <Dna className="h-10 w-10 text-emerald-400 opacity-60 hidden sm:block animate-pulse" />
      </div>

      {saveStatus === 'saved' && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-3 text-xs font-semibold animate-fadeIn shadow-lg">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <div>
            <span className="font-bold uppercase tracking-wider block text-[10px]">SUCCESSFULLY PERSISTED</span>
            <span>Your trader profile matrix has been saved and synchronized across all AI diagnostics.</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Core Config Profile Forms */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6 relative">
          
          {/* Section 1: Identity & Capital Slabs */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-3 flex items-center gap-2">
              <User className="h-4.5 w-4.5 text-emerald-400" />
              Trader Identity & Account Metrics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1.5 uppercase tracking-wide">Trader Display Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={localProfile.displayName || ""}
                    onChange={(e) => handleFieldChange('displayName', e.target.value)}
                    placeholder="Enter trading display name (e.g. Ahmad)"
                    className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500/50 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1.5 uppercase tracking-wide">Trading Capital ($ USD)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-500 text-xs font-mono">$</span>
                  <input
                    type="number"
                    value={localProfile.tradingCapital || 10000}
                    onChange={(e) => handleFieldChange('tradingCapital', Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500/50 text-slate-200 rounded-lg pl-6 pr-3 py-2 text-xs focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1.5 uppercase tracking-wide">Target Daily Profit (%)</label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    value={localProfile.dailyGoalPercent || 1.5}
                    onChange={(e) => handleFieldChange('dailyGoalPercent', Math.max(0.1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500/50 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none transition-all font-mono"
                  />
                  <span className="absolute right-3 text-slate-500 text-xs font-mono">%</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1.5 uppercase tracking-wide">Years of Experience</label>
                <input
                  type="number"
                  value={localProfile.experienceYears || 3}
                  onChange={(e) => handleFieldChange('experienceYears', Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500/50 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Adaptive DNA Profile Metrics */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-slate-850 pb-3 flex items-center gap-2">
              <Brain className="h-4.5 w-4.5 text-emerald-400 animate-pulse" />
              Adaptive DNA Profile Metrics
            </h3>

            <div className="space-y-4">
              
              {/* Trading Style selector */}
              <div>
                <span className="text-[10px] text-slate-400 font-mono block mb-2 uppercase tracking-wide">Trading Style Archetype</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Scalper', 'Day Trader', 'Swing Trader', 'Position Trader'] as const).map((style) => (
                    <button
                      type="button"
                      key={style}
                      onClick={() => handleStyleChange(style)}
                      className={`p-3 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                        localProfile.style === style
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 font-bold shadow-md shadow-emerald-500/5'
                          : 'bg-slate-950 text-slate-500 border-slate-850 hover:text-slate-300 hover:border-slate-800'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Core timeframe focus */}
              <div>
                <span className="text-[10px] text-slate-400 font-mono block mb-2 uppercase tracking-wide">Execution Timeframe Focus</span>
                <div className="grid grid-cols-5 gap-2">
                  {(['M5', 'M15', 'H1', 'H4', 'D1'] as const).map((tf) => (
                    <button
                      type="button"
                      key={tf}
                      onClick={() => handleTimeframeChange(tf)}
                      className={`p-2 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                        localProfile.timeframe === tf
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 font-bold shadow-md shadow-emerald-500/5'
                          : 'bg-slate-950 text-slate-500 border-slate-850 hover:text-slate-300 hover:border-slate-800'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Core Focus Markets */}
              <div>
                <span className="text-[10px] text-slate-400 font-mono block mb-2 uppercase tracking-wide">Primary Market Focus</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(['Forex', 'Crypto', 'Stocks', 'Commodities', 'Indices'] as const).map((mkt) => (
                    <button
                      type="button"
                      key={mkt}
                      onClick={() => handleMarketChange(mkt)}
                      className={`p-2.5 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                        localProfile.market === mkt
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 font-bold shadow-md shadow-emerald-500/5'
                          : 'bg-slate-950 text-slate-500 border-slate-850 hover:text-slate-300 hover:border-slate-800'
                      }`}
                    >
                      {mkt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk profile and weaknesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1.5 uppercase tracking-wide">Risk Tolerance Pool</label>
                  <select
                    value={localProfile.riskTolerance}
                    onChange={(e) => handleRiskChange(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-855 text-slate-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-emerald-500/50 transition-all font-sans"
                  >
                    <option value="Conservative">Conservative (Capped max 0.5% trade risk)</option>
                    <option value="Balanced">Balanced (Standard 1% trade risk limits)</option>
                    <option value="Aggressive">Aggressive (2% trade risk limits)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1.5 uppercase tracking-wide">Primary Psychological Block</label>
                  <select
                    value={localProfile.weakness}
                    onChange={(e) => handleWeaknessChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 text-slate-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-emerald-500/50 transition-all font-sans"
                  >
                    <option value="Revenge trading/FOMO">Revenge trading / FOMO chasing</option>
                    <option value="Hesitancy/Fear of Loss">Hesitancy / Fear of pulling trigger</option>
                    <option value="Over-leveraging">Over-leveraging / Excessive lots</option>
                    <option value="Early Take-Profits">Early Take-Profits / Cutting winners too early</option>
                  </select>
                </div>
              </div>

              {/* Custom leverage limit inputs */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1.5 uppercase tracking-wide">
                  <span>Maximum Leverage Limit</span>
                  <span className="text-emerald-400 font-bold">1 : {localProfile.leverage}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={localProfile.leverage}
                  onChange={(e) => handleLeverageChange(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[9px] text-slate-600 font-mono mt-1">
                  <span>1:1 (No leverage)</span>
                  <span>1:100 (High Volatility)</span>
                </div>
              </div>

            </div>
          </div>

          {/* Explicit Save Action */}
          <div className="pt-4 border-t border-slate-850 flex items-center justify-end gap-3">
            <span className="text-[10px] text-slate-500 font-mono">
              *Changes take effect across the workspace instantly upon saving.
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold text-xs uppercase rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/20 cursor-pointer"
            >
              {saveStatus === 'saving' ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-emerald-200" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 text-emerald-100" />
                  <span>Save Profile Matrix</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* DNA Advisory Reports side panel */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-md">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="h-4.5 w-4.5 text-emerald-400" />
              Mentor Calibration Report
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Our core coach is now actively adjusted to your <strong className="text-emerald-400">{localProfile.style}</strong> archetype. 
            </p>

            <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-xs space-y-2 text-slate-400 italic font-mono leading-relaxed">
              <div>
                "As a <strong>{localProfile.style}</strong>, your focus must be on executing high-density setups during core sessions. Your timeframe focus of <strong>{localProfile.timeframe}</strong> limits exposure duration to reduce systemic risk."
              </div>
              <div className="border-t border-slate-900 pt-2 text-[11px] text-rose-400 flex gap-1.5 items-start">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <span>Watch out! Your core psychological weakness is: <strong>{localProfile.weakness}</strong>. Ensure you crosscheck the Risk Calculator before order commitments.</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3.5 shadow-md">
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Flame className="h-4.5 w-4.5 text-amber-500 animate-pulse" /> Volatility Guidelines
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              With your leverage capped at <strong>1:{localProfile.leverage}</strong>, a standard 1% risk allocation handles moderate crypto and forex price movements cleanly. Keep stop-losses tighter than your usual range.
            </p>
          </div>

          {/* Quick Account Diagnostic Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2 text-xs">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Account Diagnostics</div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-500">Capital Slab:</span>
              <span className="text-slate-300 font-bold">${(localProfile.tradingCapital || 10000).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-500">Daily Target:</span>
              <span className="text-emerald-400 font-bold">${((localProfile.tradingCapital || 10000) * (localProfile.dailyGoalPercent || 1.5) / 100).toLocaleString()} ({localProfile.dailyGoalPercent || 1.5}%)</span>
            </div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-500">Exp Level:</span>
              <span className="text-blue-400 font-bold">{localProfile.experienceYears || 3} Years Active</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
