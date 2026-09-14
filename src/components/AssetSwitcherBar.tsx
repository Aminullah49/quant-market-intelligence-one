import React, { useState, useMemo } from "react";
import { MarketAsset } from "../types";
import { Star, ChevronRight, Search, Check, Plus, SlidersHorizontal, Sparkles, X, Filter, Grid, Globe, Zap, CheckCircle2 } from "lucide-react";

interface AssetSwitcherBarProps {
  assets: MarketAsset[];
  selectedAsset: MarketAsset;
  onSelectAsset: (asset: MarketAsset) => void;
  favoriteSymbols: string[];
  onToggleFavorite: (symbol: string) => void;
  onOpenSearchModal?: () => void;
}

const CATEGORIES = ["Favorites", "All", "Forex", "Crypto", "Commodities", "Indices", "Stocks", "Bonds", "ETFs", "Futures"] as const;

export default function AssetSwitcherBar({
  assets = [],
  selectedAsset,
  onSelectAsset,
  favoriteSymbols = [],
  onToggleFavorite,
  onOpenSearchModal
}: AssetSwitcherBarProps) {
  const [activeCategory, setActiveCategory] = useState<string>("Favorites");
  const [showManagerModal, setShowManagerModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [modalCategoryFilter, setModalCategoryFilter] = useState<string>("All");

  const favoriteSet = useMemo(() => new Set(favoriteSymbols), [favoriteSymbols]);

  // Favorite assets list
  const favoriteAssets = useMemo(() => {
    const list = assets.filter(a => a && a.symbol && favoriteSet.has(a.symbol));
    // If no favorites selected yet, fallback to top default symbols so the bar is never empty
    if (list.length === 0) {
      return assets.slice(0, 8);
    }
    return list;
  }, [assets, favoriteSet]);

  // Assets to display in the horizontal scrollable bar
  const visibleBarAssets = useMemo(() => {
    if (activeCategory === "Favorites") {
      return favoriteAssets;
    }
    if (activeCategory === "All") {
      return assets;
    }
    if (activeCategory === "Futures") {
      return assets.filter(a => a && (a.category === "Indices Futures" || a.subclass?.includes("Future")));
    }
    return assets.filter(a => a && a.category === activeCategory);
  }, [activeCategory, assets, favoriteAssets]);

  // Modal filtered assets
  const modalFilteredAssets = useMemo(() => {
    return assets.filter(a => {
      if (!a) return false;
      if (modalCategoryFilter !== "All" && a.category !== modalCategoryFilter) {
        if (modalCategoryFilter === "Futures" && (a.category === "Indices Futures" || a.subclass?.includes("Future"))) {
          // keep
        } else {
          return false;
        }
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.symbol.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.country && a.country.toLowerCase().includes(q))
      );
    });
  }, [assets, modalCategoryFilter, searchQuery]);

  return (
    <div className="bg-slate-900 border-b border-slate-800/80 sticky top-0 z-20 shadow-md">
      {/* Top Strip: Category Tabs & Manager Trigger */}
      <div className="px-3 py-1.5 bg-slate-950/70 border-b border-slate-800/50 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none text-xs">
        
        {/* Category Pill Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          {CATEGORIES.map((cat) => {
            const isFavTab = cat === "Favorites";
            const isActive = activeCategory === cat;
            const count = isFavTab 
              ? favoriteSymbols.length 
              : cat === "All" 
              ? assets.length 
              : cat === "Futures"
              ? assets.filter(a => a && (a.category === "Indices Futures" || a.subclass?.includes("Future"))).length
              : assets.filter(a => a && a.category === cat).length;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? isFavTab
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                      : "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80"
                }`}
              >
                {isFavTab && <Star className={`h-3 w-3 ${isActive ? "fill-amber-400 text-amber-400" : "text-amber-400/80"}`} />}
                <span>{cat}</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                  isActive 
                    ? "bg-white/20 text-white" 
                    : "bg-slate-800 text-slate-500"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons: Choose More / Quick Search */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-slate-800/80">
          <button
            onClick={() => setShowManagerModal(true)}
            className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 hover:text-white rounded-lg text-[11px] font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Open Asset Selector & Favorites Manager"
          >
            <Plus className="h-3.5 w-3.5 text-blue-400" />
            <span className="hidden sm:inline">Choose More Assets</span>
            <span className="sm:hidden">More</span>
            <span className="bg-blue-500/30 text-blue-200 px-1.5 py-0.2 rounded text-[9px]">
              {assets.length}
            </span>
          </button>

          {onOpenSearchModal && (
            <button
              onClick={onOpenSearchModal}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-all cursor-pointer"
              title="Global Asset & Tool Search Point"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Scrollable Strip of Active Instrument Pills */}
      <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {visibleBarAssets.length === 0 ? (
          <div className="py-1 px-3 text-xs text-slate-500 font-mono flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-amber-400/60" />
            <span>No favorites added yet. Click <button onClick={() => setShowManagerModal(true)} className="text-blue-400 underline hover:text-blue-300">Choose More Assets</button> to add your instruments to favorites!</span>
          </div>
        ) : (
          visibleBarAssets.map((asset) => {
            const isSelected = selectedAsset?.symbol === asset.symbol;
            const isFav = favoriteSet.has(asset.symbol);
            const isPositive = asset.changePercent >= 0;

            return (
              <div
                key={asset.symbol}
                onClick={() => onSelectAsset(asset)}
                className={`group px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer shrink-0 font-mono ${
                  isSelected
                    ? "bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500/40"
                    : "bg-slate-950/80 hover:bg-slate-800/80 border-slate-800/90 text-slate-300 hover:border-slate-700"
                }`}
              >
                {/* Favorite Star Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(asset.symbol);
                  }}
                  className={`p-0.5 rounded hover:scale-110 transition-all cursor-pointer ${
                    isFav ? "text-amber-400" : "text-slate-600 hover:text-amber-400"
                  }`}
                  title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                >
                  <Star className={`h-3.5 w-3.5 ${isFav ? "fill-amber-400 text-amber-400" : ""}`} />
                </button>

                {/* Symbol & Price Info */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-white tracking-tight">{asset.symbol}</span>
                    {isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-slate-300 font-bold">
                      ${asset.price < 10 ? asset.price.toFixed(4) : asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={`font-black ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                      {isPositive ? "+" : ""}{asset.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CHOOSE MORE ASSETS & FAVORITES MANAGER MODAL */}
      {showManagerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-blue-500/20">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 shadow-inner">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                    Market Asset Selector & Favorites Manager
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono rounded font-black">
                      {favoriteSymbols.length} Favorited
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Choose instruments to favorite or switch active view across all charts and AI engines.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowManagerModal(false)}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Currently Favorited Bar */}
            {favoriteAssets.length > 0 && (
              <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto text-xs font-mono">
                <span className="text-amber-400 font-bold shrink-0 flex items-center gap-1 text-[11px]">
                  <Star className="h-3.5 w-3.5 fill-amber-400" /> Active Favorites:
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  {favoriteAssets.map(fav => (
                    <div
                      key={`modal-fav-${fav.symbol}`}
                      className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-lg flex items-center gap-1.5 text-[11px] shrink-0"
                    >
                      <button
                        onClick={() => {
                          onSelectAsset(fav);
                          setShowManagerModal(false);
                        }}
                        className="hover:underline font-bold text-white cursor-pointer"
                      >
                        {fav.symbol}
                      </button>
                      <button
                        onClick={() => onToggleFavorite(fav.symbol)}
                        className="text-amber-400/70 hover:text-rose-400 cursor-pointer ml-1"
                        title="Remove Favorite"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search & Category Filter Controls */}
            <div className="p-4 bg-slate-900 border-b border-slate-800/80 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by symbol (e.g. XAU/USD, BTC, NVDA), market category or country..."
                    className="w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono placeholder-slate-500 outline-none focus:border-blue-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto scrollbar-none">
                  {["All", "Forex", "Crypto", "Commodities", "Indices", "Stocks", "Futures", "Bonds", "ETFs"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setModalCategoryFilter(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                        modalCategoryFilter === c
                          ? "bg-blue-600 text-white shadow"
                          : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Instruments Grid List */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {modalFilteredAssets.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 font-mono space-y-2">
                  <Globe className="h-8 w-8 mx-auto text-slate-600 animate-pulse" />
                  <p>No instruments match "{searchQuery}" in category {modalCategoryFilter}</p>
                </div>
              ) : (
                modalFilteredAssets.map((asset) => {
                  const isFav = favoriteSet.has(asset.symbol);
                  const isSelected = selectedAsset?.symbol === asset.symbol;
                  const isPositive = asset.changePercent >= 0;

                  return (
                    <div
                      key={`modal-grid-${asset.symbol}`}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between font-mono ${
                        isSelected
                          ? "bg-blue-600/10 border-blue-500/40 ring-1 ring-blue-500/20"
                          : "bg-slate-950/60 hover:bg-slate-800/50 border-slate-800/80"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onToggleFavorite(asset.symbol)}
                          className={`p-2 rounded-lg border transition-all cursor-pointer shrink-0 ${
                            isFav
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                              : "bg-slate-900 border-slate-800 text-slate-600 hover:text-amber-400 hover:border-amber-500/30"
                          }`}
                          title={isFav ? "Unfavorite instrument" : "Favorite instrument"}
                        >
                          <Star className={`h-4 w-4 ${isFav ? "fill-amber-400" : ""}`} />
                        </button>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs text-white">{asset.symbol}</span>
                            <span className="text-[9px] bg-slate-900 text-slate-400 px-1.5 py-0.2 rounded border border-slate-800">
                              {asset.category}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
                            {asset.name}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1">
                        <div>
                          <span className="font-extrabold text-xs text-white block">
                            ${asset.price < 10 ? asset.price.toFixed(4) : asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className={`text-[10px] font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                            {isPositive ? "+" : ""}{asset.changePercent.toFixed(2)}%
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            onSelectAsset(asset);
                            setShowManagerModal(false);
                          }}
                          className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-blue-600 hover:bg-blue-500 text-white"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              Active
                            </>
                          ) : (
                            "Select"
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono shrink-0">
              <div className="flex items-center gap-2">
                <span>Showing <strong className="text-white">{modalFilteredAssets.length}</strong> available instruments</span>
              </div>
              <button
                onClick={() => setShowManagerModal(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
