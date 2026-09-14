import React, { useState, useEffect } from "react";
import { JournalEntry, MarketAsset } from "../types";
import { INITIAL_JOURNAL } from "../data";
import { 
  TrendingUp, TrendingDown, BookOpen, AlertCircle, Plus, 
  Trash2, Brain, Activity, CheckCircle, Award
} from "lucide-react";

interface JournalProps {
  entries: JournalEntry[];
  onAddEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (id: string) => void;
  selectedAsset: MarketAsset;
}

export default function Journal({ entries, onAddEntry, onDeleteEntry, selectedAsset }: JournalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterBySelected, setFilterBySelected] = useState(false);
  
  // Form state
  const [market, setMarket] = useState(selectedAsset.symbol);
  const [direction, setDirection] = useState<'BUY' | 'SELL'>("BUY");
  const [entryPrice, setEntryPrice] = useState(String(selectedAsset.price));
  const [exitPrice, setExitPrice] = useState(String(selectedAsset.price * 1.01));
  const [profit, setProfit] = useState("100");
  const [outcome, setOutcome] = useState<'WIN' | 'LOSS' | 'BREAKEVEN'>("WIN");
  const [emotion, setEmotion] = useState<any>("Disciplined");
  const [mistake, setMistake] = useState<any>("None");
  const [notes, setNotes] = useState("");

  // Auto-synchronize form parameters when active instrument changes
  useEffect(() => {
    setMarket(selectedAsset.symbol);
    setEntryPrice(String(selectedAsset.price));
    setExitPrice(String(selectedAsset.price * (direction === "BUY" ? 1.01 : 0.99)));
    setProfit(direction === "BUY" ? "150" : "150");
  }, [selectedAsset]);

  // Recalculate prices based on direction toggle
  const handleDirectionChange = (dir: 'BUY' | 'SELL') => {
    setDirection(dir);
    setExitPrice(String(selectedAsset.price * (dir === "BUY" ? 1.01 : 0.99)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!market || !entryPrice || !exitPrice || !profit) return;

    const newEntry: JournalEntry = {
      id: "journal_" + Date.now(),
      date: new Date().toISOString().split('T')[0],
      market,
      direction,
      entryPrice: Number(entryPrice),
      exitPrice: Number(exitPrice),
      outcome,
      profit: Number(profit),
      emotion,
      mistake,
      notes
    };

    onAddEntry(newEntry);
    setShowAddForm(false);
    
    // Reset form
    setEntryPrice("");
    setExitPrice("");
    setProfit("");
    setNotes("");
  };

  // Filter entries based on the selected asset if toggle is active
  const displayEntries = filterBySelected
    ? entries.filter(e => e.market.toLowerCase() === selectedAsset.symbol.toLowerCase())
    : entries;

  // Calculating overall metrics
  const totalTrades = displayEntries.length;
  const wins = displayEntries.filter(e => e.outcome === 'WIN').length;
  const losses = displayEntries.filter(e => e.outcome === 'LOSS').length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const totalProfit = displayEntries.reduce((sum, e) => sum + e.profit, 0);

  // Emotional tracker tallies
  const emotionStats = displayEntries.reduce((acc: Record<string, number>, curr) => {
    acc[curr.emotion] = (acc[curr.emotion] || 0) + 1;
    return acc;
  }, {});

  // Behavioral warning analysis
  const hasFomoMistakes = displayEntries.filter(e => e.mistake === 'FOMO Entry').length > 0;
  const hasRevengeEmotions = displayEntries.filter(e => e.emotion === 'Revenge').length > 0;

  return (
    <div className="space-y-6">
      
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <span className="text-[10px] text-slate-500 font-mono uppercase">Total Trades</span>
          <span className="text-xl font-bold text-white block mt-1 font-mono">{totalTrades}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <span className="text-[10px] text-slate-500 font-mono uppercase">Win Rate</span>
          <span className="text-xl font-bold text-emerald-400 block mt-1 font-mono">
            {winRate.toFixed(1)}%
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <span className="text-[10px] text-slate-500 font-mono uppercase">Total Profit</span>
          <span className={`text-xl font-bold block mt-1 font-mono ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString()}
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <span className="text-[10px] text-slate-500 font-mono uppercase">Wins / Losses</span>
          <span className="text-xl font-bold text-slate-200 block mt-1 font-mono">
            {wins} W - {losses} L
          </span>
        </div>
      </div>

      {/* Grid: Journal Log & Behavioral Analytics */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Main Log Sheet */}
        <div className="xl:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                <BookOpen className="h-4.5 w-4.5 text-emerald-400" />
                Active Trade Log
              </h2>
              
              <div className="flex bg-slate-950 p-0.5 border border-slate-800 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setFilterBySelected(false)}
                  className={`px-2 py-1 text-[10px] font-mono font-bold rounded ${
                    !filterBySelected 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  All Assets
                </button>
                <button
                  type="button"
                  onClick={() => setFilterBySelected(true)}
                  className={`px-2 py-1 text-[10px] font-mono font-bold rounded ${
                    filterBySelected 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Only {selectedAsset.symbol}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded text-xs transition-all flex items-center gap-1 cursor-pointer font-mono"
            >
              <Plus className="h-4 w-4" />
              Log Trade Execution
            </button>
          </div>

          {/* Add Form Collapse */}
          {showAddForm && (
            <form onSubmit={handleSubmit} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">ASSET</label>
                  <input
                    type="text"
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-white rounded px-3 py-1.5 text-xs font-mono focus:outline-none"
                    placeholder="e.g. BTC/USD"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">DIRECTION</label>
                  <select
                    value={direction}
                    onChange={(e) => handleDirectionChange(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="BUY">BUY (LONG)</option>
                    <option value="SELL">SELL (SHORT)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">OUTCOME</label>
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="WIN">WIN</option>
                    <option value="LOSS">LOSS</option>
                    <option value="BREAKEVEN">BREAKEVEN</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">ENTRY PRICE</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-white rounded px-3 py-1.5 text-xs font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">EXIT PRICE</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={exitPrice}
                    onChange={(e) => setExitPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-white rounded px-3 py-1.5 text-xs font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">NET PROFIT (USD)</label>
                  <input
                    type="number"
                    value={profit}
                    onChange={(e) => setProfit(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-white rounded px-3 py-1.5 text-xs font-mono focus:outline-none"
                    placeholder="e.g. 450 or -120"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">EXECUTION EMOTION</label>
                  <select
                    value={emotion}
                    onChange={(e) => setEmotion(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Disciplined">Disciplined / Objective</option>
                    <option value="Greed">Greed / Fomo FOMO</option>
                    <option value="Fear">Fear / Hesitancy</option>
                    <option value="Revenge">Revenge / Angry trading</option>
                    <option value="Hesitant">Hesitant / Second-guessing</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono block mb-1">IDENTIFIED MISTAKE</label>
                  <select
                    value={mistake}
                    onChange={(e) => setMistake(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="None">None - Perfect Execution</option>
                    <option value="FOMO Entry">FOMO / Chased price</option>
                    <option value="Moved Stop Loss">Moved Stop Loss / Allowed loss expansion</option>
                    <option value="Over-leveraged">Over-leveraged / Oversized position</option>
                    <option value="Early Exit">Early Exit / Cut profits too soon</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1">SESSION NOTES & STRUCTURAL RATIONALE</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-white rounded px-3 py-1.5 text-xs focus:outline-none"
                  placeholder="Describe your reasoning, setup type, and technical confluence..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/50">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded text-xs font-mono"
                >
                  Commit Entry
                </button>
              </div>
            </form>
          )}

          {/* Log List */}
          <div className="space-y-2.5">
            {displayEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No trades logged yet {filterBySelected ? `for ${selectedAsset.symbol}` : ""}. Click "Log Trade Execution" above to begin journaling.
              </div>
            ) : (
              displayEntries.map((entry) => (
                <div key={entry.id} className="p-3.5 bg-slate-950 border border-slate-850 rounded-xl hover:border-slate-800 transition-all">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-900/60">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded ${
                        entry.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {entry.direction}
                      </span>
                      <strong className="text-xs text-white">{entry.market}</strong>
                      <span className="text-[10px] text-slate-500 font-mono">{entry.date}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        entry.outcome === 'WIN' ? 'bg-emerald-500/15 text-emerald-400' : entry.outcome === 'LOSS' ? 'bg-rose-500/15 text-rose-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {entry.outcome} ({entry.profit >= 0 ? '+' : ''}${entry.profit})
                      </span>
                      <button
                        onClick={() => onDeleteEntry(entry.id)}
                        className="p-1 hover:text-rose-400 text-slate-600 transition-colors cursor-pointer"
                        title="Delete Entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500">Entry price:</span>{" "}
                      <span className="text-slate-300">{entry.entryPrice}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Exit price:</span>{" "}
                      <span className="text-slate-300">{entry.exitPrice}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Emotion:</span>{" "}
                      <span className="text-amber-400">{entry.emotion}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Mistake:</span>{" "}
                      <span className={entry.mistake === 'None' ? 'text-emerald-400' : 'text-rose-400'}>{entry.mistake}</span>
                    </div>
                  </div>

                  {entry.notes && (
                    <p className="mt-2.5 text-xs text-slate-400 italic bg-slate-900/40 p-2.5 border border-slate-900 rounded">
                      "{entry.notes}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Behavioral analysis sidecard */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Emotional profile report */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Brain className="h-4.5 w-4.5 text-emerald-400" />
              AI Cognitive Assessment
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed font-serif">
              Our pattern recognition suggests your execution performance spikes heavily when maintaining a <strong className="text-emerald-400">Disciplined</strong> emotional base. 
            </p>

            <div className="space-y-2 border-t border-slate-800/80 pt-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Disciplined Actions:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {displayEntries.filter(e => e.emotion === 'Disciplined').length} trades
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fear-driven exits:</span>
                <span className="font-mono text-amber-400 font-bold">
                  {displayEntries.filter(e => e.emotion === 'Fear').length} trades
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Impulsive / FOMO Mistakes:</span>
                <span className="font-mono text-rose-400 font-bold">
                  {displayEntries.filter(e => e.mistake === 'FOMO Entry').length} trades
                </span>
              </div>
            </div>
          </div>

          {/* Action recommendation */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
              <Award className="h-4.5 w-4.5" /> Mentor Action Plan
            </h4>
            
            {hasFomoMistakes ? (
              <p className="text-xs text-slate-300 leading-relaxed">
                FOMO entries are impacting your average profit factor. We recommend setting a rule: <strong>Never enter at market price when a breakout candle is active.</strong> Always wait for a retest limit order block.
              </p>
            ) : hasRevengeEmotions ? (
              <p className="text-xs text-slate-300 leading-relaxed">
                Revenge trading detected. If you take a loss on EUR/USD, <strong>force-close your workstation for at least 3 hours</strong> to prevent emotional capital dissipation.
              </p>
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed">
                Excellent. Your emotional logs are highly disciplined. Maintain your strict risk boundaries, size positions correctly using the Risk Calculator, and prioritize high-grade trades only.
              </p>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
