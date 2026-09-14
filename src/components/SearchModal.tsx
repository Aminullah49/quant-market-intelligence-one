import React, { useState, useEffect, useRef } from "react";
import { Search, X, TrendingUp, BarChart2, Zap, ArrowRight, CornerDownLeft, Sparkles, Navigation, Globe, Star } from "lucide-react";
import { MarketAsset, SectionType } from "../types";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: MarketAsset[];
  onSelectAsset: (asset: MarketAsset) => void;
  onNavigate: (section: SectionType) => void;
  favoriteSymbols?: string[];
  onToggleFavorite?: (symbol: string) => void;
}

const TOOL_SHORTCUTS: { id: SectionType; title: string; desc: string; icon: string; category: string }[] = [
  { id: "dashboard", title: "Market Dashboard", desc: "Terminal overview, live heatmaps & opportunity matrix", icon: "LayoutDashboard", category: "Tool" },
  { id: "chartai", title: "Chart AI Intelligence", desc: "Interactive candlestick engine & AI pattern recognition", icon: "BarChart2", category: "Tool" },
  { id: "checklist", title: "Entry Checklist & Confluence Engine", desc: "Interactive trade entry validator & style thresholds (Scalp, Day, Swing)", icon: "CheckSquare", category: "Tool" },
  { id: "analysis", title: "Quant Market Analysis", desc: "Deep multi-timeframe confluent market reports", icon: "TrendingUp", category: "Tool" },
  { id: "setup", title: "AI Trade Setup Plan", desc: "Automated risk-reward calculation & entry zones", icon: "Zap", category: "Tool" },
  { id: "risk", title: "Position Risk Calculator", desc: "Lot sizing, account margin & leverage calculator", icon: "Calculator", category: "Tool" },
  { id: "papertrading", title: "Paper Trading Simulator", desc: "Practice real-time execution with virtual capital", icon: "PlaySquare", category: "Tool" },
  { id: "strategylab", title: "Strategy Lab & Backtest", desc: "Test systematic rules on historical candles", icon: "FlaskConical", category: "Tool" },
  { id: "journal", title: "Trader Journal & Analytics", desc: "Log setups, emotion tags & equity growth curves", icon: "BookOpen", category: "Tool" },
  { id: "profile", title: "Trader DNA & Mentorship", desc: "Behavioral psychology analysis & AI coaching", icon: "Fingerprint", category: "Tool" },
  { id: "marketmap", title: "Global Heatmap & News", desc: "Real-time economic calendar & market heatmap", icon: "Newspaper", category: "Tool" },
  { id: "brokers", title: "Verified Brokers Hub", desc: "Compare execution speeds, spreads & regulatory status", icon: "Building2", category: "Tool" },
  { id: "alerts", title: "Custom Price & Volatility Alerts", desc: "Set threshold alerts for market breakouts", icon: "Bell", category: "Tool" }
];

const POPULAR_SYMBOLS = ["XTZ/USD", "BTC/USD", "EUR/USD", "XAU/USD", "NVDA", "PLTR", "NGX-30", "SUI/USD", "US30", "SPX"];

export default function SearchModal({
  isOpen,
  onClose,
  assets,
  onSelectAsset,
  onNavigate,
  favoriteSymbols = [],
  onToggleFavorite
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = ["All", "Tools", "Crypto", "Forex", "Commodities", "Indices", "Stocks", "Futures", "Bonds", "ETFs"];

  // Filter tools
  const matchingTools = TOOL_SHORTCUTS.filter(t => {
    if (selectedCategory !== "All" && selectedCategory !== "Tools") return false;
    if (!query) return selectedCategory === "Tools";
    const q = query.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q);
  });

  // Filter assets
  const matchingAssets = assets.filter(a => {
    if (!a) return false;
    if (selectedCategory === "Tools") return false;
    if (selectedCategory !== "All" && a.category !== selectedCategory && !(selectedCategory === "Futures" && a.category === "Indices Futures")) {
      return false;
    }
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      a.symbol.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    );
  }).slice(0, query ? 40 : 25);

  const combinedResults = [
    ...matchingTools.map(t => ({ type: "tool" as const, data: t })),
    ...matchingAssets.map(a => ({ type: "asset" as const, data: a }))
  ];

  const handleSelectResult = (item: typeof combinedResults[0], targetSection: SectionType = "chartai") => {
    if (item.type === "tool") {
      onNavigate(item.data.id);
    } else {
      onSelectAsset(item.data);
      onNavigate(targetSection);
    }
    onClose();
  };

  const handleKeyDownInInput = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, combinedResults.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + combinedResults.length) % Math.max(1, combinedResults.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (combinedResults[selectedIndex]) {
        handleSelectResult(combinedResults[selectedIndex]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />

      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh] border-blue-500/20 ring-1 ring-blue-500/10">
        
        {/* Search Point Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800/80 bg-slate-950/60">
          <Search className="h-5 w-5 text-blue-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownInInput}
            placeholder="Search Point: Type any asset (e.g. XTZ/USD, BTC, EUR/USD, NVDA) or terminal tool..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <span className="text-[10px] bg-slate-800/80 text-slate-400 px-2 py-1 rounded-md font-mono border border-slate-700/50 shrink-0">
              ESC to Close
            </span>
          )}
        </div>

        {/* Category Selector Filter Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-900/90 border-b border-slate-800/60 overflow-x-auto scrollbar-none text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedIndex(0);
              }}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Popular / Recommended Quick Tickers */}
        {!query && (
          <div className="px-4 py-2.5 bg-slate-950/40 border-b border-slate-800/40 flex items-center gap-2 overflow-x-auto text-[11px]">
            <span className="text-slate-500 font-mono font-bold shrink-0 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-400" /> Hot Spot:
            </span>
            {POPULAR_SYMBOLS.map((sym) => {
              const asset = assets.find((a) => a && a.symbol === sym);
              return (
                <button
                  key={sym}
                  onClick={() => {
                    if (asset) {
                      onSelectAsset(asset);
                      onNavigate("chartai");
                      onClose();
                    } else {
                      setQuery(sym);
                    }
                  }}
                  className="px-2.5 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-300 font-mono font-bold rounded-md hover:text-white transition-all cursor-pointer shrink-0"
                >
                  {sym}
                </button>
              );
            })}
          </div>
        )}

        {/* Search Results Area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40">
          {combinedResults.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Globe className="h-8 w-8 text-slate-600 mx-auto animate-pulse" />
              <p className="text-sm font-semibold text-slate-300">No assets or tools match "{query}"</p>
              <p className="text-xs text-slate-500 font-mono">Try searching by symbol (e.g. XTZ/USD), market category, or tool keyword.</p>
            </div>
          ) : (
            combinedResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              if (item.type === "tool") {
                const tool = item.data;
                return (
                  <div
                    key={`tool-${tool.id}`}
                    onClick={() => handleSelectResult(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-600/15 border border-blue-500/30 text-white"
                        : "hover:bg-slate-800/50 text-slate-300 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 shrink-0">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{tool.title}</span>
                          <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-mono uppercase font-bold">Terminal Tool</span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{tool.desc}</p>
                      </div>
                    </div>
                    <CornerDownLeft className="h-4 w-4 text-slate-500 shrink-0" />
                  </div>
                );
              } else {
                const asset = item.data;
                const isPositive = asset.changePercent >= 0;
                const isFav = favoriteSymbols.includes(asset.symbol);
                return (
                  <div
                    key={`asset-${asset.symbol}`}
                    onClick={() => handleSelectResult(item, "chartai")}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-600/15 border border-blue-500/30 text-white"
                        : "hover:bg-slate-800/50 text-slate-300 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {onToggleFavorite && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(asset.symbol);
                          }}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isFav
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                              : "bg-slate-900 border-slate-800 text-slate-600 hover:text-amber-400"
                          }`}
                          title={isFav ? "Remove favorite" : "Add favorite"}
                        >
                          <Star className={`h-3.5 w-3.5 ${isFav ? "fill-amber-400" : ""}`} />
                        </button>
                      )}
                      <div className="h-9 w-9 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center font-bold text-xs text-slate-200 font-mono shrink-0">
                        {asset.symbol.substring(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-white font-mono">{asset.symbol}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({asset.name})</span>
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-semibold">
                            {asset.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-slate-400">
                          <span>Vol: {asset.volume24h}</span>
                          <span>•</span>
                          <span>Prob: <strong className={asset.bullishProb > asset.bearishProb ? "text-emerald-400" : "text-rose-400"}>{asset.bullishProb}% Bullish</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <span className="font-extrabold text-sm text-white font-mono block">
                          ${asset.price.toLocaleString(undefined, { minimumFractionDigits: asset.price < 50 ? 4 : 2 })}
                        </span>
                        <span className={`text-[10px] font-bold font-mono ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                          {isPositive ? "+" : ""}{asset.changePercent.toFixed(2)}%
                        </span>
                      </div>

                      <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-slate-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectResult(item, "chartai");
                          }}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded transition-all cursor-pointer"
                          title="Open Chart AI"
                        >
                          Chart
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectResult(item, "analysis");
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded transition-all cursor-pointer"
                          title="View Analysis"
                        >
                          Report
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-3">
            <span>Showing <strong className="text-white">{matchingAssets.length}</strong> assets out of <strong className="text-blue-400">{assets.length}</strong> market symbols</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Press <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-bold">↑↓</kbd> to navigate, <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-bold">↵</kbd> to view</span>
          </div>
        </div>

      </div>
    </div>
  );
}
