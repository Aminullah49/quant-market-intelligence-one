import React, { useState } from "react";
import { MarketAsset } from "../types";
import { ECONOMIC_EVENTS } from "../data";
import { calculateUnifiedScore } from "../utils";
import { TrendingUp, TrendingDown, Clock, ShieldAlert, Zap, AlertCircle, ArrowUpRight, CheckCircle2, Activity, Check, Compass, HelpCircle, Radio, Play, Square } from "lucide-react";
import { motion } from "motion/react";
import AdBanner from "./AdBanner";

interface DashboardProps {
  assets: MarketAsset[];
  onSelectAsset: (asset: MarketAsset) => void;
  onNavigate: (section: any) => void;
  hasApiKey: boolean;
}

export function getAssetMeta(asset: MarketAsset): { country: string; subclass: string } {
  if (!asset) {
    return { country: "United States", subclass: "Unknown" };
  }
  if (asset.country && asset.subclass) {
    return { country: asset.country, subclass: asset.subclass };
  }

  let country = "United States";
  let subclass: string = asset.category;

  if (asset.category === "Forex") {
    subclass = "Currencies";
    if (asset.symbol.includes("NGN")) {
      country = "Nigeria";
    } else if (asset.symbol.includes("EUR")) {
      country = "Eurozone";
    } else if (asset.symbol.includes("GBP")) {
      country = "United Kingdom";
    } else if (asset.symbol.includes("JPY")) {
      country = "Japan";
    } else if (asset.symbol.includes("AUD")) {
      country = "Australia";
    } else if (asset.symbol.includes("CAD")) {
      country = "Canada";
    } else if (asset.symbol.includes("NZD")) {
      country = "New Zealand";
    } else if (asset.symbol.includes("MXN")) {
      country = "Mexico";
    } else if (asset.symbol.includes("ZAR")) {
      country = "South Africa";
    } else if (asset.symbol.includes("TRY")) {
      country = "Turkey";
    } else if (asset.symbol.includes("SGD")) {
      country = "Singapore";
    } else {
      country = "Global";
    }
  } else if (asset.category === "Crypto") {
    subclass = "Cryptocurrencies";
    country = "Decentralized";
  } else if (asset.category === "Commodities") {
    subclass = "Commodities";
    country = "Global";
  } else if (asset.category === "Indices") {
    subclass = "Stock Indices";
    if (asset.symbol === "FTSE100") {
      country = "United Kingdom";
    } else if (asset.symbol === "DAX40") {
      country = "Germany";
    } else if (asset.symbol === "CAC40") {
      country = "France";
    } else if (asset.symbol === "NIKKEI225") {
      country = "Japan";
    } else if (asset.symbol === "ASX200") {
      country = "Australia";
    } else if (asset.symbol === "IBEX35") {
      country = "Spain";
    } else if (asset.symbol === "FTMIB") {
      country = "Italy";
    } else if (asset.symbol === "SMI") {
      country = "Switzerland";
    } else if (asset.symbol === "NIFTY50") {
      country = "India";
    } else if (asset.symbol === "NGX-ASI") {
      country = "Nigeria";
    } else {
      country = "United States";
    }
  } else if (asset.category === "Stocks") {
    subclass = "Stocks";
    const symbol = asset.symbol;
    if (["DANGCEM", "MTNN", "GTCO", "ZENITHBANK", "ACCESSCORP", "FBNH", "TRANSCORP"].includes(symbol)) {
      country = "Nigeria";
    } else if (["BP.", "HSBA", "VOD", "GSK", "AZN", "SHEL", "RIO", "BARC"].includes(symbol)) {
      country = "United Kingdom";
    } else if (["SAP", "BMW", "ALV", "DB1", "DTE"].includes(symbol)) {
      country = "Germany";
    } else if (symbol === "ASML") {
      country = "Netherlands";
    } else if (symbol === "TSM") {
      country = "Taiwan";
    } else if (symbol === "NVO") {
      country = "Denmark";
    } else {
      country = "United States";
    }
  } else if (asset.category === "Bonds") {
    subclass = "Sovereign Bonds";
    if (asset.symbol === "US10Y" || asset.symbol === "US30Y") {
      country = "United States";
    } else if (asset.symbol === "UK10Y") {
      country = "United Kingdom";
    } else if (asset.symbol === "DE10Y") {
      country = "Germany";
    } else if (asset.symbol === "JP10Y") {
      country = "Japan";
    } else if (asset.symbol === "NG10Y") {
      country = "Nigeria";
    }
  } else if (asset.category === "ETFs") {
    subclass = "ETFs";
    if (["SPY", "QQQ", "IWM"].includes(asset.symbol)) {
      country = "United States";
    } else if (asset.symbol === "EWJ") {
      country = "Japan";
    } else if (asset.symbol === "EWG") {
      country = "Germany";
    } else if (asset.symbol === "EWU") {
      country = "United Kingdom";
    } else if (asset.symbol === "EWC") {
      country = "Canada";
    } else if (asset.symbol === "EEM") {
      country = "Global";
    }
  } else if (asset.category === "Indices Futures") {
    subclass = "Indices Futures";
    country = "United States";
  }

  return { country, subclass };
}

export default function Dashboard({ assets, onSelectAsset, onNavigate, hasApiKey }: DashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedCountry, setSelectedCountry] = useState<string>("All Countries");

  // Multi-Timeframe Confluence Scanner state
  const [confluenceAsset, setConfluenceAsset] = useState<MarketAsset>(assets[0]);
  const [isLiveScanning, setIsLiveScanning] = useState<boolean>(true);

  const liveConfluenceAsset = assets.find(a => a && a.symbol === confluenceAsset?.symbol) || confluenceAsset || assets[0];

  const getConfluenceData = (asset: MarketAsset) => {
    if (!asset) return null;
    const isBullish = asset.bullishProb > asset.bearishProb;
    const strength = asset.confidence;
    
    // Deterministic alignment indicators
    const m1Bias = isBullish ? (strength > 85 ? "BULLISH" : "MIXED BULLISH") : (strength > 85 ? "BEARISH" : "MIXED BEARISH");
    const m5Bias = isBullish ? (strength > 80 ? "BULLISH" : "MIXED BULLISH") : (strength > 80 ? "BEARISH" : "MIXED BEARISH");
    const m15Bias = isBullish ? (strength > 75 ? "BULLISH" : "MIXED BULLISH") : (strength > 75 ? "BEARISH" : "MIXED BEARISH");
    const h1Bias = isBullish ? "BULLISH" : "BEARISH";
    const h4Bias = isBullish ? "BULLISH" : "BEARISH";
    const d1Bias = isBullish ? (strength > 65 ? "BULLISH" : "MIXED") : (strength > 65 ? "BEARISH" : "MIXED");

    let matchCount = 0;
    if (m1Bias.includes(isBullish ? "BULLISH" : "BEARISH")) matchCount++;
    if (m5Bias.includes(isBullish ? "BULLISH" : "BEARISH")) matchCount++;
    if (m15Bias.includes(isBullish ? "BULLISH" : "BEARISH")) matchCount++;
    if (h1Bias === (isBullish ? "BULLISH" : "BEARISH")) matchCount++;
    if (h4Bias === (isBullish ? "BULLISH" : "BEARISH")) matchCount++;
    if (d1Bias.includes(isBullish ? "BULLISH" : "BEARISH")) matchCount++;

    let statusLabel = "MIXED BIAS";
    let statusColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
    if (matchCount >= 5) {
      statusLabel = "STRONG CONFLUENCE";
      statusColor = isBullish ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20";
    } else if (matchCount === 4) {
      statusLabel = "MODERATE CONFLUENCE";
      statusColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
    }

    // Dynamic indicators helper to make the "live market" scan values tick
    const getDynamicIndicator = (tf: string, offsetPct: number, basePeriod: number) => {
      const score = calculateUnifiedScore(asset, tf);
      const calculatedRsi = Math.min(95, Math.max(10, 35 + Math.floor(score * 0.4)));
      
      if (!isLiveScanning) {
        return {
          ema: isBullish ? `Above EMA ${basePeriod}` : `Below EMA ${basePeriod}`,
          rsi: `${calculatedRsi.toFixed(1)} (${calculatedRsi > 58 ? "Bullish" : calculatedRsi < 42 ? "Bearish" : "Neutral"})`
        };
      }
      
      const price = asset.price;
      const directionFactor = isBullish ? 1 : -1;
      const emaVal = price * (1 - (offsetPct / 100) * directionFactor);
      
      const wave = Math.sin(Date.now() / 8000 + basePeriod) * 1.5;
      const finalRsi = Math.min(94, Math.max(6, Number((calculatedRsi + wave).toFixed(1))));
      
      let rsiLabel = "Neutral";
      if (finalRsi > 70) rsiLabel = "Overbought (Bullish)";
      else if (finalRsi > 58) rsiLabel = "Bullish";
      else if (finalRsi < 30) rsiLabel = "Oversold (Bearish)";
      else if (finalRsi < 42) rsiLabel = "Bearish";

      const diffPct = ((price - emaVal) / emaVal) * 100;
      const isAbove = price > emaVal;

      return {
        ema: `${isAbove ? "Above" : "Below"} ${basePeriod === 100 ? "SMA" : "EMA"} ${basePeriod} (${isAbove ? "+" : ""}${diffPct.toFixed(3)}%)`,
        rsi: `${finalRsi} (${rsiLabel})`
      };
    };

    const m1Ind = getDynamicIndicator("M1", 0.012, 9);
    const m5Ind = getDynamicIndicator("M5", 0.035, 15);
    const m15Ind = getDynamicIndicator("M15", 0.078, 20);
    const h1Ind = getDynamicIndicator("H1", 0.21, 50);
    const h4Ind = getDynamicIndicator("H4", 0.62, 200);
    const d1Ind = getDynamicIndicator("D1", 1.74, 100);

    return {
      statusLabel,
      statusColor,
      matchCount,
      biases: [
        { tf: "M1", label: "1-Min (Scalping Bias)", bias: m1Bias, rsi: m1Ind.rsi, ema: m1Ind.ema },
        { tf: "M5", label: "5-Min (High-Frequency)", bias: m5Bias, rsi: m5Ind.rsi, ema: m5Ind.ema },
        { tf: "M15", label: "15-Min (Intraday)", bias: m15Bias, rsi: m15Ind.rsi, ema: m15Ind.ema },
        { tf: "H1", label: "1-Hour (Session)", bias: h1Bias, rsi: h1Ind.rsi, ema: h1Ind.ema },
        { tf: "H4", label: "4-Hour (Structure)", bias: h4Bias, rsi: h4Ind.rsi, ema: h4Ind.ema },
        { tf: "D1", label: "Daily (Macro Trend)", bias: d1Bias, rsi: d1Ind.rsi, ema: d1Ind.ema }
      ]
    };
  };

  const confData = getConfluenceData(liveConfluenceAsset);

  // Determine countries lists dynamically based on category
  const getCountryListForCategory = (category: string) => {
    if (category === "Stocks") {
      return ["All Countries", "United States", "United Kingdom", "Nigeria", "Germany", "Netherlands", "Taiwan", "Denmark"];
    } else if (category === "Bonds") {
      return ["All Countries", "United States", "United Kingdom", "Germany", "Japan", "Nigeria"];
    } else if (category === "ETFs") {
      return ["All Countries", "United States", "Canada", "United Kingdom", "Germany", "Japan", "Global"];
    } else if (category === "Indices") {
      return ["All Countries", "United States", "United Kingdom", "Germany", "France", "Japan", "Australia", "Spain", "Italy", "Switzerland", "India", "Nigeria"];
    }
    return [];
  };

  // Check and reset country filter if not applicable to the newly selected category
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedCountry("All Countries");
  };

  const filteredAssets = assets.filter(asset => {
    if (!asset) return false;
    const meta = getAssetMeta(asset);

    // Primary Category Filtering
    let categoryMatch = false;
    if (selectedCategory === "All") {
      categoryMatch = true;
    } else if (selectedCategory === "Currencies (Forex)") {
      categoryMatch = asset.category === "Forex";
    } else if (selectedCategory === "Cryptocurrencies") {
      categoryMatch = asset.category === "Crypto";
    } else if (selectedCategory === "Stocks") {
      categoryMatch = asset.category === "Stocks";
    } else if (selectedCategory === "Commodities") {
      categoryMatch = asset.category === "Commodities";
    } else if (selectedCategory === "Indices") {
      categoryMatch = asset.category === "Indices";
    } else if (selectedCategory === "Indices Futures") {
      categoryMatch = asset.category === "Indices Futures";
    } else if (selectedCategory === "Bonds") {
      categoryMatch = asset.category === "Bonds";
    } else if (selectedCategory === "ETFs") {
      categoryMatch = asset.category === "ETFs";
    }

    if (!categoryMatch) return false;

    // Subclass/Country Filtering
    if (selectedCountry !== "All Countries") {
      return meta.country === selectedCountry;
    }

    return true;
  });

  // Sort assets by confidence to show "best opportunities"
  const bestOpportunities = [...assets]
    .filter(Boolean)
    .sort((a, b) => (b?.confidence || 0) - (a?.confidence || 0))
    .slice(0, 3);

  const countriesForSubFilter = getCountryListForCategory(selectedCategory);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
                QUANT ENGINE CONNECTED
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Institutional Market Intelligence
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Real-time multi-timeframe pattern recognition, probability modeling, and risk optimization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate("chartai")}
              className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              <Zap className="h-4.5 w-4.5" />
              Launch Chart AI
            </button>
          </div>
        </div>


      </div>

      {/* Grid: Live Markets & Sentiment Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Market Watchlist Column */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono">
                  Live Market Dashboard
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">Auto-refresh active via global exchange feeds</p>
              </div>
              
              {/* Category Selectors */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none max-w-full">
                {["All", "Currencies (Forex)", "Cryptocurrencies", "Stocks", "Commodities", "Indices", "Indices Futures", "Bonds", "ETFs"].map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold whitespace-nowrap transition-all border cursor-pointer ${
                      selectedCategory === category
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-800"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-filtering: Countries selector for Stocks, Bonds, ETFs, Indices */}
            {countriesForSubFilter.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-850 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
                  Country Region:
                </span>
                <div className="flex items-center gap-1.5">
                  {countriesForSubFilter.map((country) => (
                    <button
                      key={country}
                      onClick={() => setSelectedCountry(country)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border cursor-pointer ${
                        selectedCountry === country
                          ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                          : "bg-slate-900/40 border-slate-850 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {country}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto max-h-[580px] overflow-y-auto pr-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono sticky top-0 bg-slate-900 z-10">
                  <th className="pb-3 font-medium">Asset</th>
                  <th className="pb-3 text-right font-medium">Last Price</th>
                  <th className="pb-3 text-right font-medium">24h Chg</th>
                  <th className="pb-3 text-center font-medium">Direction Bias</th>
                  <th className="pb-3 text-right font-medium">Confidence</th>
                  <th className="pb-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredAssets.map((asset) => {
                  const isBullish = asset.bullishProb > asset.bearishProb;
                  const meta = getAssetMeta(asset);
                  return (
                    <tr key={asset.symbol} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5 flex-wrap">
                              <span>{asset.symbol}</span>
                              <span className="text-[9px] px-1 py-0.2 bg-slate-950 border border-slate-800 text-slate-400 rounded font-mono uppercase font-black tracking-tight">
                                {meta.country}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono">
                                {meta.subclass}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{asset.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right font-mono text-slate-200">
                        {asset.price.toLocaleString(undefined, {
                          minimumFractionDigits: asset.price < 50 ? 4 : 2,
                        })}
                      </td>
                      <td className={`py-3 text-right font-mono ${asset.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent}%
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-0.5 ${
                            isBullish ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {isBullish ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {isBullish ? 'Bullish' : 'Bearish'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 font-mono text-slate-300">
                          <span>{asset.confidence}%</span>
                          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isBullish ? 'bg-emerald-500' : 'bg-blue-500'}`}
                              style={{ width: `${asset.confidence}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            onSelectAsset(asset);
                            onNavigate("chartai");
                          }}
                          className="px-2 py-1 bg-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-400 rounded text-[10px] transition-colors cursor-pointer"
                        >
                          Analyze
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Intelligence Radar Summary */}
        <div className="space-y-6">
          
          {/* Multi-Timeframe Bias Confluence Scanner Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                <Compass className="h-4.5 w-4.5 text-blue-400" />
                MTF Bias Confluence
              </h2>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  {isLiveScanning && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isLiveScanning ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                </span>
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest text-right">
                  {isLiveScanning ? 'LIVE SCANNING' : 'SCAN PAUSED'}
                </span>
              </div>
            </div>

            {/* Asset Selector & Controls Row */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  value={confluenceAsset?.symbol || ""}
                  onChange={(e) => {
                    const matched = assets.find(a => a && a.symbol === e.target.value);
                    if (matched) setConfluenceAsset(matched);
                  }}
                  className="flex-1 bg-slate-950 border border-slate-850 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 transition-all font-semibold cursor-pointer font-mono"
                >
                  {assets.filter(Boolean).map(a => (
                    <option key={a.symbol} value={a.symbol}>
                      {a.symbol} - {a.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setIsLiveScanning(!isLiveScanning)}
                  title={isLiveScanning ? "Pause live scanning" : "Resume live scanning"}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-mono text-xs font-bold transition-all cursor-pointer border ${
                    isLiveScanning 
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                  }`}
                >
                  {isLiveScanning ? (
                    <>
                      <Square className="h-3 w-3 fill-rose-400" />
                      PAUSE
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 fill-emerald-400" />
                      RUN LIVE
                    </>
                  )}
                </button>
              </div>

              {/* Dynamic Live Asset Quote Bar */}
              <div className="p-2 bg-slate-950/80 border border-slate-850/40 rounded-lg flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400">Live Quote:</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-100 font-bold">
                    ${liveConfluenceAsset.price.toLocaleString(undefined, {
                      minimumFractionDigits: liveConfluenceAsset.price < 50 ? 4 : 2,
                      maximumFractionDigits: liveConfluenceAsset.price < 50 ? 4 : 2,
                    })}
                  </span>
                  <span className={`text-[10px] font-semibold ${liveConfluenceAsset.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {liveConfluenceAsset.changePercent >= 0 ? '+' : ''}{liveConfluenceAsset.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>



            {/* Confluence Rating Status */}
            {confData && (
              <div className="space-y-3">
                <div className={`p-2.5 border rounded-lg flex items-center justify-between text-xs font-bold ${confData.statusColor}`}>
                  <span className="font-mono flex items-center gap-1.5">
                    {isLiveScanning ? <Radio className="h-3.5 w-3.5 animate-pulse text-current" /> : null}
                    {confData.statusLabel}
                  </span>
                  <span className="px-1.5 py-0.2 bg-slate-950/40 rounded text-[10px] font-mono">
                    {confData.matchCount}/6 Aligned
                  </span>
                </div>

                {/* Grid of Timeframe Blocks */}
                <div className="space-y-2">
                  {confData.biases.map((b) => {
                    const isBullish = b.bias.includes("BULLISH");
                    return (
                      <div key={b.tf} className="p-2.5 bg-slate-950 border border-slate-850/80 rounded-lg flex items-center justify-between text-xs hover:border-slate-800 transition-all">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-slate-300 flex items-center gap-1.5">
                            <span className="text-blue-400 font-extrabold">{b.tf}</span>
                            <span className="text-[9.5px] text-slate-500 font-medium">({b.label})</span>
                          </span>
                          <span className="text-[10px] text-slate-500 block leading-tight font-mono">
                            {b.ema} • RSI: {b.rsi}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide font-mono ${
                          isBullish ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                        }`}>
                          {b.bias}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Best Opportunities Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono mb-3 flex items-center gap-1.5">
              <Zap className="h-4.5 w-4.5 text-emerald-400" />
              AI Best Opportunities
            </h2>
            <div className="space-y-3">
              {bestOpportunities.map((opportunity) => {
                const isBullish = opportunity.bullishProb > opportunity.bearishProb;
                return (
                  <div
                    key={opportunity.symbol}
                    onClick={() => {
                      onSelectAsset(opportunity);
                      onNavigate("chartai");
                    }}
                    className="p-3 bg-slate-950 border border-slate-800 hover:border-emerald-500/30 rounded-lg cursor-pointer transition-all hover:translate-x-1 group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                          {opportunity.symbol}
                        </div>
                        <div className="text-[10px] text-slate-500">{opportunity.category}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono text-emerald-400 font-semibold">
                          Confidence {opportunity.confidence}%
                        </span>
                        <div className="text-[10px] text-slate-500">Strength: High</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] border-t border-slate-800/60 pt-2 text-slate-400">
                      <span>Probability:</span>
                      <span className={isBullish ? 'text-emerald-400' : 'text-rose-400'}>
                        {isBullish ? 'Bullish' : 'Bearish'} ({isBullish ? opportunity.bullishProb : opportunity.bearishProb}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono mb-3 flex items-center gap-1.5">
              <ShieldAlert className="h-4.5 w-4.5 text-rose-400" />
              Risk Radar
            </h2>
            <div className="space-y-2">
              <div className="p-2.5 bg-slate-950 border border-rose-500/10 rounded text-xs flex gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <div>
                  <div className="text-slate-200 font-semibold">High Volatility Alert</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">DXY testing critical weekly support pivot. Expected spikes across crypto & majors.</div>
                </div>
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-xs flex gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <div className="text-slate-200 font-semibold">Regime Confirmed</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">S&P 500 confirms daily bullish structure (HH) validation. Swing buying is favored.</div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Sponsored Ad Unit for monetization */}
      <AdBanner type="banner" />

      {/* Bottom Row: Economic Events & Market Map Teaser */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Economic Calendar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
              <Clock className="h-4.5 w-4.5 text-slate-400" />
              High Impact Events
            </h2>
            <button onClick={() => onNavigate("time")} className="text-xs text-emerald-400 hover:underline">
              Time Intelligence
            </button>
          </div>

          <div className="space-y-2.5">
            {ECONOMIC_EVENTS.map((event) => (
              <div key={event.id} className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg flex justify-between items-center text-xs">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 font-mono text-[10px] bg-slate-800 text-slate-300 rounded font-bold">
                    {event.time}
                  </span>
                  <div>
                    <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                      <span className="text-[10px] text-amber-400 font-mono">[{event.asset}]</span> {event.name}
                    </div>
                    <div className="text-[10px] text-slate-500">Prev: {event.previous} | Forecast: {event.forecast}</div>
                  </div>
                </div>
                <div className="text-right">
                  {event.actual ? (
                    <div>
                      <span className="font-mono font-bold text-emerald-400">{event.actual}</span>
                      <div className="text-[9px] text-emerald-400/80">{event.state}</div>
                    </div>
                  ) : (
                    <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/10 text-amber-400 rounded-full animate-pulse">
                      Upcoming
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quant Performance Coach Tips */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
              Mentor Coaching Insight
            </h2>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs italic text-slate-300">
              "A trading plan is only as good as your risk execution. Our analysis highlights that executing EUR/USD trades during the New York session holds our highest average profit factor. Avoid chasing Asian session breakout flags."
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
            <span className="text-slate-400">Ready to journal?</span>
            <button
              onClick={() => onNavigate("journal")}
              className="px-3 py-1.5 bg-slate-800 text-emerald-400 border border-slate-700 rounded hover:bg-emerald-500 hover:text-slate-950 transition-all font-mono text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              Update Journal <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Sponsor Column Sidebar Unit */}
        <AdBanner type="sidebar" />

      </div>
    </div>
  );
}
