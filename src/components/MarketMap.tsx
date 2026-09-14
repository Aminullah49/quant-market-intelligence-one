import React from "react";
import { CORRELATION_MATRIX, CORRELATION_EXPLANATION } from "../data";
import { Globe, RefreshCw, HelpCircle, ArrowUpRight, ShieldCheck } from "lucide-react";

export default function MarketMap() {
  const { assets, data } = CORRELATION_MATRIX;

  // Function to return color based on correlation strength
  const getCellBg = (value: number) => {
    if (value === 1) return "bg-slate-900 text-slate-400";
    if (value >= 0.5) return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/10 font-bold";
    if (value >= 0.2) return "bg-emerald-500/10 text-emerald-400/80";
    if (value <= -0.5) return "bg-rose-500/20 text-rose-400 border border-rose-500/10 font-bold";
    if (value <= -0.2) return "bg-rose-500/10 text-rose-400/80";
    return "bg-slate-950 text-slate-500";
  };

  return (
    <div className="space-y-6">
      
      {/* Header Description */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-emerald-400 tracking-wider uppercase mb-1">
            INTERMARKET SYSTEM DESK
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Global Intermarket Correlation Heatmap
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Analyze direct and inverse correlations across global liquid markets. Ensure your setups avoid concentration risks during major policy releases.
          </p>
        </div>
        <Globe className="h-8 w-8 text-emerald-400 opacity-60 hidden sm:block animate-spin-slow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Heatmap Layout Panel */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Asset Correlation Matrix (30-Day Rolling)
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Pearson Coefficient (r)</span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-mono text-[10px]">
                    <th className="text-left pb-3 font-semibold">Asset Class</th>
                    {assets.map((a, i) => (
                      <th key={i} className="pb-3 font-semibold">{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {assets.map((rowAsset, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-slate-800/20 transition-all">
                      <td className="text-left py-3 font-semibold text-slate-300 font-mono text-xs">
                        {rowAsset}
                      </td>
                      {data[rowIndex].map((val, colIndex) => (
                        <td key={colIndex} className="py-3">
                          <div className={`mx-auto w-12 py-1.5 rounded-lg text-xs font-mono ${getCellBg(val)}`}>
                            {val >= 0 ? '+' : ''}{val.toFixed(2)}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Narrative side panel */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
              Intermarket Intelligence Narrative
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed font-serif bg-slate-950 p-4 border border-slate-850 rounded-lg">
              {CORRELATION_EXPLANATION}
            </p>
          </div>

          {/* Quick guide details */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
            <h4 className="font-mono font-bold text-slate-400 uppercase tracking-widest">
              Correlation Sizing Guardrails
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Avoid double exposure:</strong> Buying both Gold and Bitcoin at the same time represents a dual +0.52 correlation risk against the USD.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span><strong>Hedging structures:</strong> Holding Gold long while selling the USD Index offers a natural positive confirmation buffer (-0.82 inverse rating).</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
