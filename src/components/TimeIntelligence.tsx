import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle, Flame, Moon, Sun, Hourglass, HelpCircle, ShieldAlert, ArrowRight } from "lucide-react";
import { MarketAsset } from "../types";
import { getUpcomingEvents } from "../utils";

interface Session {
  name: string;
  startHour: number; // UTC
  endHour: number;   // UTC
  hoursStr: string;
  volatility: string;
  focus: string;
  icon: "sun" | "moon";
}

interface TimeIntelligenceProps {
  selectedAsset: MarketAsset;
}

export default function TimeIntelligence({ selectedAsset }: TimeIntelligenceProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const utcHour = time.getUTCHours();
  const utcMinute = time.getUTCMinutes();
  const utcSecond = time.getUTCSeconds();

  const formattedUTC = `${String(utcHour).padStart(2, "0")}:${String(utcMinute).padStart(2, "0")}:${String(utcSecond).padStart(2, "0")} UTC`;
  const formattedLocal = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const sessions: Session[] = [
    {
      name: "Asian Session (Tokyo/Sydney)",
      startHour: 0,
      endHour: 8,
      hoursStr: "00:00 - 08:00 UTC",
      volatility: "Low (Range Bound)",
      focus: "Avoid breakout entries. Focus on boundary mean-reversion signals and buy-low sell-high channels.",
      icon: "moon"
    },
    {
      name: "London Session (European Core)",
      startHour: 8,
      endHour: 16,
      hoursStr: "08:00 - 16:00 UTC",
      volatility: "High (Trend Expansion)",
      focus: "Highly directional trend creation. Optimal for standard breakout strategies or order block pullbacks.",
      icon: "sun"
    },
    {
      name: "New York Session (Americas Core)",
      startHour: 13,
      endHour: 21,
      hoursStr: "13:00 - 21:00 UTC",
      volatility: "Extreme (High Volume & News Shifts)",
      focus: "Fastest execution speeds. Massive volatility sweeps on USD index & premium tech stock listings.",
      icon: "sun"
    }
  ];

  // Helper to determine if session is currently active
  const isSessionActive = (start: number, end: number) => {
    if (start < end) {
      return utcHour >= start && utcHour < end;
    } else {
      // Over-midnight sessions (if any)
      return utcHour >= start || utcHour < end;
    }
  };

  // Helper to compute session progress percentage
  const getSessionProgress = (start: number, end: number) => {
    if (!isSessionActive(start, end)) return 0;
    const totalDuration = end - start;
    const currentElapsed = utcHour - start + (utcMinute / 60);
    const percentage = (currentElapsed / totalDuration) * 100;
    return Math.min(100, Math.max(0, Math.round(percentage)));
  };

  // Golden Overlap Window logic
  const isLondonNYOverlap = utcHour >= 13 && utcHour < 16;

  return (
    <div className="space-y-6">
      
      {/* Header Clocks */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1">
          <div className="text-xs font-mono text-emerald-400 tracking-wider uppercase font-extrabold">
            MARKET TEMPORAL ENGINE
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Time Intelligence Cockpit
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Temporal liquidity alignment is the single highest-impact statistical filter. Match your order types to active global session profiles to avoid spread traps and false breaks.
          </p>
        </div>

        {/* Live dual clock displays */}
        <div className="flex gap-3 shrink-0 flex-wrap">
          <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center gap-3">
            <Clock className="h-5 w-5 text-emerald-400 animate-pulse" />
            <div>
              <div className="text-[9px] text-slate-500 font-mono uppercase font-black">UTC Clock</div>
              <div className="text-sm font-black text-slate-200 font-mono tracking-wider">{formattedUTC}</div>
            </div>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center gap-3">
            <Sun className="h-5 w-5 text-sky-400" />
            <div>
              <div className="text-[9px] text-slate-500 font-mono uppercase font-black">Local User Time</div>
              <div className="text-sm font-black text-sky-300 font-mono tracking-wider">{formattedLocal}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Clocks visual & timing details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Market Overlap Visualizer Card */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
              <Flame className="h-4.5 w-4.5 text-amber-500" />
              Dynamic Session Blocks
            </h3>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Updates Live Every Second</span>
          </div>

          <div className="space-y-4">
            {sessions.map((session, index) => {
              const active = isSessionActive(session.startHour, session.endHour);
              const progress = getSessionProgress(session.startHour, session.endHour);

              return (
                <div 
                  key={index} 
                  className={`p-4 border rounded-xl transition-all relative overflow-hidden ${
                    active 
                      ? "bg-slate-950 border-emerald-500/40 shadow-md shadow-emerald-950/10" 
                      : "bg-slate-950/40 border-slate-850 opacity-60"
                  }`}
                >
                  {/* Subtle progress background shimmer */}
                  {active && (
                    <div 
                      className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000" 
                      style={{ width: `${progress}%` }}
                    />
                  )}

                  <div className="flex flex-col sm:flex-row justify-between gap-3 relative z-10">
                    <div className="space-y-1.5">
                      <div className="font-bold text-white flex items-center gap-2">
                        {session.icon === "moon" ? (
                          <Moon className="h-4 w-4 text-indigo-400" />
                        ) : (
                          <Sun className="h-4 w-4 text-amber-400" />
                        )}
                        <span>{session.name}</span>
                      </div>
                      
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-slate-600" />
                        <span>{session.hoursStr}</span>
                        {active && (
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[9px] font-mono">
                            {progress}% COMPLETED
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        <strong className="text-slate-400 uppercase font-mono text-[10px] block mb-0.5">Recommended focus:</strong>
                        {session.focus}
                      </p>
                    </div>

                    <div className="sm:text-right shrink-0 flex flex-col justify-between items-start sm:items-end gap-1.5">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-black font-mono tracking-wider uppercase border ${
                        active 
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 animate-pulse" 
                          : "bg-slate-850 text-slate-500 border-slate-800"
                      }`}>
                        {active ? "● ACTIVE NOW" : "CLOSED"}
                      </span>
                      
                      <div className="text-[11px] text-slate-400 font-mono">
                        Volatility: <strong className="text-slate-200">{session.volatility}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* High Risk News & Overlap Analytics */}
        <div className="space-y-6">
          
          {/* Overlap Window advice */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3.5">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
              Golden Liquidity Overlap
            </h3>

            <div className={`p-4 border rounded-xl transition-all ${
              isLondonNYOverlap 
                ? "bg-amber-950/10 border-amber-500/30" 
                : "bg-slate-950 border-slate-850"
            }`}>
              <div className="flex items-center gap-1.5 text-amber-400">
                <Flame className="h-4.5 w-4.5 animate-pulse" />
                <span className="text-[10px] font-black font-mono uppercase tracking-wider">London - NY Overlap</span>
              </div>
              <span className="text-xs text-slate-200 font-bold block mt-1.5 font-mono">13:00 - 16:00 UTC</span>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                The single most liquid 3-hour block on Earth. Spread bid/ask differentials collapse to historic lows. Optimal for high frequency strategies and sweeping premium price order block levels.
              </p>
              
              <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px]">
                <span className="text-slate-500 font-mono">Current Overlap Status:</span>
                <span className={`font-mono font-black ${isLondonNYOverlap ? "text-amber-400 animate-pulse" : "text-slate-500"}`}>
                  {isLondonNYOverlap ? "ACTIVE OVERLAP WINDOW" : "NOT ACTIVE YET"}
                </span>
              </div>
            </div>
          </div>

          {/* Volatility Alerts */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3.5">
            <div className="flex items-center gap-1.5 text-rose-400">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest">
                {selectedAsset.symbol} Upcoming Volatility Shifts
              </h3>
            </div>
            
            <div className="space-y-2.5 text-xs font-mono">
              {getUpcomingEvents(selectedAsset).map((ev, index) => (
                <div key={index} className="p-3 bg-slate-950 border border-slate-850 rounded-lg">
                  <div className="flex justify-between items-center text-rose-400 font-bold">
                    <span>[{ev.timeStr}]</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                      ev.risk === "HIGH VOLATILITY" 
                        ? "bg-rose-500/10 text-rose-400" 
                        : ev.risk === "MEDIUM RISK" 
                          ? "bg-amber-500/10 text-amber-400" 
                          : "bg-sky-500/10 text-sky-400"
                    }`}>
                      {ev.risk}
                    </span>
                  </div>
                  <div className="text-slate-200 font-bold mt-1.5 font-sans">{ev.title}</div>
                  <div className="text-[10px] text-slate-400 mt-1 leading-relaxed font-sans">
                    {ev.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
