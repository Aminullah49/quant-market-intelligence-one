import React, { useState, useEffect } from "react";
import { 
  Globe, AlertTriangle, TrendingUp, TrendingDown, RefreshCw, Sparkles, 
  Search, Play, CheckCircle2, Flame, Clock, Award, ShieldAlert,
  ArrowRight, Cpu, Crosshair, Zap, ExternalLink, Activity
} from "lucide-react";
import { MarketAsset } from "../types";
import { 
  NewsStory, 
  LIVE_MARKET_NEWS, 
  getNewsForAsset, 
  getAssetMacroImpact, 
  getBreakingNewsTicker 
} from "../utils/marketNews";

interface NewsFeedProps {
  selectedAsset: MarketAsset;
  onSelectAsset: (asset: MarketAsset) => void;
  allAssets: MarketAsset[];
  onNavigateToSection?: (section: any) => void;
}

export default function NewsFeed({ 
  selectedAsset, 
  onSelectAsset, 
  allAssets, 
  onNavigateToSection 
}: NewsFeedProps) {
  const [news, setNews] = useState<NewsStory[]>(LIVE_MARKET_NEWS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [impactFilter, setImpactFilter] = useState<string>("All");
  const [analyzedStory, setAnalyzedStory] = useState<string | null>("un-geo-01");
  const [analysisText, setAnalysisText] = useState<string>(
    "UN General Assembly diplomatic debates and energy sanction talks generated cross-asset risk-off reallocation. Institutional capital liquidated overextended Gold (XAU/USD) and high-beta Nasdaq tech to rotate into safe-haven cash & US Dollar index (DXY). Yield spikes to 4.38% compounded downward pressure on zero-yielding commodities."
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTickerIdx, setActiveTickerIdx] = useState(0);

  const tickers = getBreakingNewsTicker();
  const assetMacro = getAssetMacroImpact(selectedAsset.symbol, selectedAsset.category);

  // Rotate news ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTickerIdx(prev => (prev + 1) % tickers.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [tickers.length]);

  const fetchLiveNews = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/market-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset: selectedAsset.symbol })
      });
      const data = await response.json();
      if (data.success && data.news && data.news.length > 0) {
        // Merge API news with our curated macro live stories
        setNews([...data.news, ...LIVE_MARKET_NEWS]);
      } else {
        setNews(LIVE_MARKET_NEWS);
      }
    } catch (e) {
      console.error("Using deterministic live news engine:", e);
      setNews(LIVE_MARKET_NEWS);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeStory = async (story: NewsStory) => {
    setAnalyzing(true);
    setAnalyzedStory(story.id);
    setAnalysisText("");
    try {
      const response = await fetch("/api/analyse-news-impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: story.headline,
          summary: story.summary,
          asset: selectedAsset.symbol,
          price: selectedAsset.price
        })
      });
      const data = await response.json();
      if (data.success && data.analysis) {
        setAnalysisText(data.analysis);
      } else {
        setAnalysisText(
          `Automated Macro Confluence: "${story.headline}" exerts a ${story.sentiment.toLowerCase()} shockwave on ${selectedAsset.symbol}. Risk rating is ${story.impact}. Defensive 1.5x ATR volatility buffer recommended.`
        );
      }
    } catch (err) {
      setAnalysisText(
        `Automated Macro Confluence: "${story.headline}" exerts a ${story.sentiment.toLowerCase()} shockwave on ${selectedAsset.symbol}. Risk rating is ${story.impact}. Defensive 1.5x ATR volatility buffer recommended.`
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredNews = news.filter((story) => {
    const matchesSearch = 
      story.headline.toLowerCase().includes(searchQuery.toLowerCase()) || 
      story.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || story.category === selectedCategory;
    const matchesImpact = impactFilter === "All" || story.impact === impactFilter;
    return matchesSearch && matchesCategory && matchesImpact;
  });

  return (
    <div className="space-y-6" id="view-market-news">
      
      {/* 1. LIVE BREAKING NEWS TICKER */}
      <div className="bg-slate-900/95 border border-cyan-500/30 rounded-xl p-3 shadow-lg flex items-center gap-3 overflow-hidden">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-[10px] font-mono font-black text-cyan-400 uppercase tracking-widest shrink-0">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping inline-block" />
          WIRE TICKER
        </div>
        <div className="text-xs font-mono text-slate-200 truncate flex-1 font-medium transition-all duration-300">
          {tickers[activeTickerIdx]}
        </div>
        <div className="text-[10px] font-mono text-slate-500 hidden sm:block shrink-0">
          {activeTickerIdx + 1} / {tickers.length}
        </div>
      </div>

      {/* 2. HEADER PANEL WITH AUTO-MERGE STATUS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <Globe className="h-5 w-5 text-cyan-400 animate-pulse" />
              Macro Volatility & Institutional News Wire
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              AUTO-MERGED
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Real-time geopolitical shockwaves (UN General Assembly, G7 Summits), central bank policy shifts, and quantitative liquidity feeds automatically piped into your technical analysis, trade setups, and loss shield.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchLiveNews}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-mono font-bold text-slate-200 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-cyan-400" : "text-slate-400"}`} />
            <span>{loading ? "Syncing Wire..." : "Sync Live Wire"}</span>
          </button>

          {onNavigateToSection && (
            <button
              onClick={() => onNavigateToSection('shield')}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-lg shadow-rose-950/40"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Loss Shield</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. AUTO-MERGED ASSET CONTEXT BANNER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">Active Focus Instrument</span>
              <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-950 border border-slate-800 text-white">
                {selectedAsset.symbol} ({selectedAsset.name})
              </span>
              <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-black uppercase ${
                assetMacro.shockRisk === "CRITICAL" ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" :
                assetMacro.shockRisk === "ELEVATED" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" :
                "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}>
                {assetMacro.shockRisk} MACRO SHOCK RISK
              </span>
            </div>
            <div className="text-xs text-slate-300 font-mono">
              <strong className="text-cyan-400">Dominant Catalyst:</strong> {assetMacro.primaryCatalyst}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              <strong className="text-amber-400">Institutional Buffer:</strong> {assetMacro.volatilityBufferRecommendation}
            </div>
          </div>

          {/* Direct Auto-Merge Shortcuts */}
          {onNavigateToSection && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onNavigateToSection('analysis')}
                className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Cpu className="h-3.5 w-3.5" />
                <span>Merge with Analysis</span>
              </button>
              <button
                onClick={() => onNavigateToSection('setup')}
                className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Crosshair className="h-3.5 w-3.5" />
                <span>Merge with Trade Setup</span>
              </button>
              <button
                onClick={() => onNavigateToSection('aggregate')}
                className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Activity className="h-3.5 w-3.5" />
                <span>View Full Report</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. SEARCH AND FILTER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-4 shadow-md">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search UN meetings, Fed rates, Gold, Nasdaq, yields, geopolitics..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg">
          {["All", "Macro & Geopolitics", "Indices", "Commodities", "Forex", "Stocks", "Crypto"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs font-bold font-mono rounded transition-all cursor-pointer ${
                selectedCategory === cat 
                  ? "bg-cyan-600 text-white shadow-sm" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Impact filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Impact:</span>
          <select
            value={impactFilter}
            onChange={(e) => setImpactFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 font-bold font-mono rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="All">All Impact</option>
            <option value="HIGH">High Impact Only</option>
            <option value="MEDIUM">Medium Impact</option>
            <option value="LOW">Low Impact</option>
          </select>
        </div>
      </div>

      {/* 5. CORE SPLIT VIEW: STORIES & AI MACRO COPILOT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* NEWS LIST LEDGER */}
        <div className="lg:col-span-2 space-y-4">
          {filteredNews.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl py-16 text-center text-slate-500 text-xs font-mono space-y-2">
              <Globe className="h-8 w-8 mx-auto opacity-40 text-cyan-400 stroke-1" />
              <p>No recent financial headlines match your active search filter parameters.</p>
            </div>
          ) : (
            filteredNews.map((story) => (
              <div 
                key={story.id} 
                className={`bg-slate-900 border ${analyzedStory === story.id ? "border-cyan-500/60 shadow-lg shadow-cyan-950/30" : "border-slate-800/80 hover:border-slate-700"} rounded-xl p-5 shadow-sm transition-all space-y-3 relative overflow-hidden group`}
              >
                {/* Visual Indicator strip */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${
                  story.impact === "HIGH" ? "bg-rose-500" : story.impact === "MEDIUM" ? "bg-amber-500" : "bg-cyan-500"
                }`} />

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                      <span className="font-extrabold text-cyan-400">{story.source}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400">{story.timeAgo}</span>
                      <span className="text-slate-600">•</span>
                      
                      {/* Category Badge */}
                      <span className="px-1.5 py-0.5 bg-slate-950 text-slate-300 rounded border border-slate-850">
                        {story.category}
                      </span>

                      {/* Catalyst tag */}
                      <span className="px-1.5 py-0.5 bg-blue-950/40 text-blue-300 rounded border border-blue-900/30 font-bold">
                        {story.catalystType}
                      </span>
                    </div>

                    <h3 className="text-sm font-extrabold text-white leading-snug group-hover:text-cyan-300 transition-colors">
                      {story.headline}
                    </h3>
                  </div>

                  {/* Impact & Sentiment Badges */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${
                      story.impact === "HIGH" 
                        ? "bg-rose-500/15 text-rose-400 border border-rose-500/30" 
                        : story.impact === "MEDIUM"
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "bg-slate-950 text-slate-400"
                    }`}>
                      {story.impact} IMPACT
                    </span>

                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                      story.sentiment === "BULLISH"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : story.sentiment === "BEARISH"
                          ? "bg-rose-500/15 text-rose-400"
                          : "bg-slate-850 text-slate-400"
                    }`}>
                      {story.sentiment} Bias
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {story.summary}
                </p>

                {/* Risk Impact Note */}
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-850/80 flex items-center gap-2 text-[11px] text-amber-300/90 font-mono">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>{story.riskImpactNote}</span>
                </div>

                {/* Footer Controls */}
                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-850/60 gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-[10px] text-slate-500 font-mono">Related:</span>
                    {story.relatedAssetSymbols.map(sym => (
                      <button 
                        key={sym}
                        onClick={() => {
                          const asset = allAssets.find(a => a.symbol === sym);
                          if (asset) onSelectAsset(asset);
                        }}
                        className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border cursor-pointer ${
                          selectedAsset.symbol === sym
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                            : "bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-850"
                        }`}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => handleAnalyzeStory(story)}
                    className="text-xs font-mono font-black text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Semantic Macro AI
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* AI MACRO SENTIMENT & LOSS PROTECTION COPILOT */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-xs font-black uppercase text-slate-200 tracking-wider font-mono flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5 text-cyan-400 animate-pulse" />
                Macro Catalyst Copilot
              </h3>
              <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                LIVE RADAR
              </span>
            </div>

            {/* Active Asset Macro Card */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 space-y-2.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Target Asset:</span>
                <span className="text-white font-bold">{selectedAsset.symbol}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">News Sentiment:</span>
                <span className={`font-black ${
                  assetMacro.sentiment === "BULLISH" ? "text-emerald-400" :
                  assetMacro.sentiment === "BEARISH" ? "text-rose-400" : "text-amber-400"
                }`}>
                  {assetMacro.sentiment} ({assetMacro.sentimentScore}%)
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Macro Shock Risk:</span>
                <span className={`font-black ${
                  assetMacro.shockRisk === "CRITICAL" ? "text-rose-400" :
                  assetMacro.shockRisk === "ELEVATED" ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {assetMacro.shockRisk}
                </span>
              </div>
            </div>

            {/* AI Deep Analysis Breakdown */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                Geopolitical & Catalyst Diagnostics
              </div>

              {analyzing ? (
                <div className="py-10 text-center space-y-3">
                  <RefreshCw className="h-6 w-6 text-cyan-400 animate-spin mx-auto" />
                  <p className="text-xs font-mono text-slate-400">Parsing intermarket liquidity impact...</p>
                </div>
              ) : (
                <div className="p-4 bg-slate-950/80 border border-slate-850 rounded-xl space-y-3">
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {analysisText}
                  </p>

                  <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-lg text-[11px] text-cyan-300 font-mono space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <Award className="h-3.5 w-3.5 text-cyan-400" />
                      Automatic Protection Directive:
                    </div>
                    <div>{assetMacro.lossShieldAction}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-850">
            {onNavigateToSection && (
              <>
                <button
                  onClick={() => onNavigateToSection('shield')}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-rose-950/40 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Apply Loss Protection Shield
                </button>
                <button
                  onClick={() => onNavigateToSection('analysis')}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Cpu className="h-4 w-4 text-cyan-400" />
                  Inject into Market Analysis
                </button>
              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
