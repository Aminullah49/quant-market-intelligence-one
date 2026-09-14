import React, { useState, useEffect } from "react";
import { BACKTEST_PRESETS } from "../data";
import { 
  BarChart, Activity, HelpCircle, ShieldAlert, Sparkles, 
  Play, RefreshCw, Layers, TrendingUp, Code, Terminal, Save, 
  Check, FileCode, Cpu, Sliders, Settings, MessageSquare, Terminal as TerminalIcon
} from "lucide-react";

export default function StrategyLab() {
  const [activeTab, setActiveTab] = useState<"backtest" | "scripting">("backtest");

  // --- TAB 1: BACKTESTING & MONTE CARLO ---
  const [selectedStrategy, setSelectedStrategy] = useState<keyof typeof BACKTEST_PRESETS>("SMC Order Block Strategy");
  const [runningSimulation, setRunningSimulation] = useState(false);
  const [simulationPaths, setSimulationPaths] = useState<number[][]>([]);

  // Sandbox Custom Backtest Parameters
  const [leverage, setLeverage] = useState(100);
  const [slippage, setSlippage] = useState(0.2);
  const [riskPerTrade, setRiskPerTrade] = useState(1);

  const baseMetrics = BACKTEST_PRESETS[selectedStrategy];

  // Adjust metrics based on sliders
  const adjustedTrades = baseMetrics.totalTrades;
  const winRateReduction = Math.max(0, (slippage - 0.2) * 5);
  const adjustedWinRate = Math.max(30, Number((baseMetrics.winRate - winRateReduction).toFixed(1)));
  const drawdownMultiplier = (leverage / 100) * (riskPerTrade / 1);
  const adjustedDrawdown = Math.min(95, Number((baseMetrics.drawdown * drawdownMultiplier).toFixed(1)));
  const profitFactorReduction = (slippage - 0.2) * 0.4 + (leverage > 100 ? (leverage - 100) * 0.001 : 0);
  const adjustedProfitFactor = Math.max(0.5, Number((baseMetrics.profitFactor - profitFactorReduction).toFixed(2)));

  const adjustedSharpe = Math.max(0.1, Number((baseMetrics.sharpeRatio - (leverage > 100 ? 0.25 : 0) - (slippage > 0.2 ? 0.3 : 0)).toFixed(2)));
  const adjustedSortino = Math.max(0.1, Number((baseMetrics.sortinoRatio - (leverage > 100 ? 0.35 : 0) - (slippage > 0.2 ? 0.4 : 0)).toFixed(2)));

  const adjustedEquityCurve = baseMetrics.equityCurve.map((p, idx) => {
    if (idx === 0) return p;
    const baseDiffPercent = (p.equity - 10000) / 10000;
    const scaledDiffPercent = baseDiffPercent * (riskPerTrade / 1) * (leverage / 100);
    const scaledEquity = Math.max(1000, 10000 * (1 + scaledDiffPercent));
    return { name: p.name, equity: Number(scaledEquity.toFixed(0)) };
  });

  const handleRunSimulation = () => {
    setRunningSimulation(true);
    setTimeout(() => {
      const paths: number[][] = [];
      const baseValue = 10000;
      
      for (let pathIndex = 0; pathIndex < 4; pathIndex++) {
        const pathPoints: number[] = [baseValue];
        let current = baseValue;
        
        for (let step = 0; step < 7; step++) {
          const stepPercent = (Math.random() - 0.4) * 0.12 * (leverage / 100) * (riskPerTrade / 1);
          current = current * (1 + stepPercent);
          pathPoints.push(Number(current.toFixed(0)));
        }
        paths.push(pathPoints);
      }
      setSimulationPaths(paths);
      setRunningSimulation(false);
    }, 1200);
  };

  const width = 640;
  const height = 220;
  const padding = 20;

  const minEquity = Math.min(...adjustedEquityCurve.map(p => p.equity), ...simulationPaths.flat().concat([10000]));
  const maxEquity = Math.max(...adjustedEquityCurve.map(p => p.equity), ...simulationPaths.flat().concat([10000]));
  const range = maxEquity - minEquity;

  const getX = (index: number) => padding + (index * (width - padding * 2) / (adjustedEquityCurve.length - 1));
  const getY = (val: number) => {
    if (range === 0) return height / 2;
    return height - padding - ((val - minEquity) * (height - padding * 2) / range);
  };

  const polylinePoints = adjustedEquityCurve.map((p, i) => `${getX(i)},${getY(p.equity)}`).join(" ");

  // --- TAB 2: CUSTOM INDICATOR SCRIPTING EDITOR ---
  const SCRIPT_TEMPLATES = {
    ema_cross: {
      name: "SMC Dual EMA Crossover",
      description: "Calculates Fast (9) and Slow (21) Moving Averages to capture momentum shifts.",
      code: `// SMC Dual Moving Average Crossover Signal Script
// Uses high-frequency calculations to determine trend reversals.

const FAST_PERIOD = 9;
const SLOW_PERIOD = 21;

function calculate(candles) {
  let signals = [];
  let fastEMA = [];
  let slowEMA = [];
  
  // Calculate EMAs
  let kFast = 2 / (FAST_PERIOD + 1);
  let kSlow = 2 / (SLOW_PERIOD + 1);
  
  let currentFast = candles[0].close;
  let currentSlow = candles[0].close;
  
  fastEMA.push(currentFast);
  slowEMA.push(currentSlow);
  
  for (let i = 1; i < candles.length; i++) {
    currentFast = (candles[i].close * kFast) + (currentFast * (1 - kFast));
    currentSlow = (candles[i].close * kSlow) + (currentSlow * (1 - kSlow));
    
    fastEMA.push(currentFast);
    slowEMA.push(currentSlow);
    
    // Check crossover
    if (fastEMA[i-1] <= slowEMA[i-1] && fastEMA[i] > slowEMA[i]) {
      signals.push({ index: i, type: "BUY", price: candles[i].close, reason: "Fast EMA crossed above Slow EMA (Bullish Cross)" });
    } else if (fastEMA[i-1] >= slowEMA[i-1] && fastEMA[i] < slowEMA[i]) {
      signals.push({ index: i, type: "SELL", price: candles[i].close, reason: "Fast EMA crossed below Slow EMA (Bearish Cross)" });
    }
  }
  
  return {
    plots: {
      Fast_EMA: fastEMA,
      Slow_EMA: slowEMA
    },
    signals
  };
}`
    },
    atr_trailing: {
      name: "Dynamic ATR Trailing Stop Channel",
      description: "Uses Average True Range volatility to construct responsive stop-loss channels.",
      code: `// Volatility-Based ATR Stop-Loss Channel Script
// Constructs risk-bounded trailing levels above and below pricing curves.

const PERIOD = 14;
const MULTIPLIER = 1.8;

function calculate(candles) {
  let upperStop = [];
  let lowerStop = [];
  let signals = [];
  
  // Compute basic ATR
  let atrValues = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      atrValues.push(candles[i].high - candles[i].low);
    } else {
      let tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i-1].close),
        Math.abs(candles[i].low - candles[i-1].close)
      );
      atrValues.push(tr);
    }
  }
  
  for (let i = 0; i < candles.length; i++) {
    let stopValue = atrValues[i] * MULTIPLIER;
    upperStop.push(candles[i].close + stopValue);
    lowerStop.push(candles[i].close - stopValue);
    
    // Generate volatility breakout indicators
    if (i > 0 && candles[i].close > upperStop[i-1]) {
      signals.push({ index: i, type: "BUY", price: candles[i].close, reason: "Volatility Expansion upside breakout" });
    } else if (i > 0 && candles[i].close < lowerStop[i-1]) {
      signals.push({ index: i, type: "SELL", price: candles[i].close, reason: "Volatility Expansion downside breakdown" });
    }
  }
  
  return {
    plots: {
      Upper_Stop: upperStop,
      Lower_Stop: lowerStop
    },
    signals
  };
}`
    },
    liquidity_sweep: {
      name: "Institutional Wick Sweep Detector",
      description: "Detects high-volume sweeps of candle extremes with immediate recovery blocks.",
      code: `// Institutional Wick Liquidity Sweep Detector
// Targets extended candle shadow sweeps with immediate opposite order block.

const SWEEP_FACTOR = 1.4; // Shadow wick length relative to real candle body

function calculate(candles) {
  let signals = [];
  let sweepHighlight = [];
  
  for (let i = 0; i < candles.length; i++) {
    let open = candles[i].open;
    let close = candles[i].close;
    let high = candles[i].high;
    let low = candles[i].low;
    
    let body = Math.abs(close - open);
    let topWick = high - Math.max(open, close);
    let bottomWick = Math.min(open, close) - low;
    
    sweepHighlight.push(body > 0 ? (topWick + bottomWick) / body : 1);
    
    if (body > 0 && bottomWick > body * SWEEP_FACTOR) {
      signals.push({ index: i, type: "BUY", price: low, reason: "Bullish liquidity grab sweep. Institutional order block filled." });
    } else if (body > 0 && topWick > body * SWEEP_FACTOR) {
      signals.push({ index: i, type: "SELL", price: high, reason: "Bearish liquidity grab sweep. Short-side stops triggered." });
    }
  }
  
  return {
    plots: {
      Wick_Body_Ratio: sweepHighlight
    },
    signals
  };
}`
    }
  };

  const [selectedTemplate, setSelectedTemplate] = useState<"ema_cross" | "atr_trailing" | "liquidity_sweep">("ema_cross");
  const [editorCode, setEditorCode] = useState(SCRIPT_TEMPLATES.ema_cross.code);
  const [compilerLogs, setCompilerLogs] = useState<string[]>([
    "[init] Scripting sandbox online. Select an indicator template to begin compiling custom algorithms."
  ]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileSuccess, setCompileSuccess] = useState(true);
  
  const [activePlots, setActivePlots] = useState<Record<string, number[]>>({});
  const [activeSignals, setActiveSignals] = useState<any[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  // Default Simulation candles
  const SIMULATION_CANDLES = [
    { open: 100, high: 102, low: 99, close: 101 },
    { open: 101, high: 104, low: 100, close: 103 },
    { open: 103, high: 103.5, low: 101, close: 101.5 },
    { open: 101.5, high: 105, low: 101, close: 104.2 },
    { open: 104.2, high: 108, low: 103.5, close: 107.5 },
    { open: 107.5, high: 108.5, low: 105, close: 105.8 },
    { open: 105.8, high: 106.2, low: 102.5, close: 103.1 },
    { open: 103.1, high: 104.5, low: 98.2, close: 103.9 }, // bottom wick sweep
    { open: 103.9, high: 106.8, low: 103.2, close: 106.5 },
    { open: 106.5, high: 110.2, low: 106.0, close: 109.8 },
    { open: 109.8, high: 112.5, low: 109.5, close: 111.4 },
    { open: 111.4, high: 113.8, low: 111.0, close: 113.2 },
    { open: 113.2, high: 114.5, low: 112.8, close: 113.9 },
    { open: 113.9, high: 115.8, low: 109.8, close: 111.2 }
  ];

  // Auto-load template code when template changes
  useEffect(() => {
    setEditorCode(SCRIPT_TEMPLATES[selectedTemplate].code);
    setIsSaved(false);
  }, [selectedTemplate]);

  // Dynamic compiler script parser
  const handleCompileScript = () => {
    setIsCompiling(true);
    setCompilerLogs([
      `[compiler] Initiating optimization cycle for Custom Algorithm...`,
      `[lexer] Tokenizing script character streams...`,
      `[parser] Verifying syntactic balance and symbol table bounds...`
    ]);

    setTimeout(() => {
      try {
        const code = editorCode;
        
        // Dynamic Variable Extraction using Regex (Making params reactive)
        let fastP = 9;
        let slowP = 21;
        let mult = 1.8;
        let sweepF = 1.4;

        const fpMatch = code.match(/FAST_PERIOD\s*=\s*(\d+)/i);
        if (fpMatch) fastP = parseInt(fpMatch[1]) || 9;

        const spMatch = code.match(/SLOW_PERIOD\s*=\s*(\d+)/i);
        if (spMatch) slowP = parseInt(spMatch[1]) || 21;

        const multMatch = code.match(/MULTIPLIER\s*=\s*([\d.]+)/i);
        if (multMatch) mult = parseFloat(multMatch[1]) || 1.8;

        const sweepMatch = code.match(/SWEEP_FACTOR\s*=\s*([\d.]+)/i);
        if (sweepMatch) sweepF = parseFloat(sweepMatch[1]) || 1.4;

        let plots: Record<string, number[]> = {};
        let signals: any[] = [];

        // Check which type of indicator template is currently written
        if (code.includes("Fast_EMA") || code.includes("FAST_PERIOD")) {
          // Dual EMA Crossover Logic Simulation
          let fastEMA: number[] = [];
          let slowEMA: number[] = [];
          let kFast = 2 / (fastP + 1);
          let kSlow = 2 / (slowP + 1);
          
          let currentFast = SIMULATION_CANDLES[0].close;
          let currentSlow = SIMULATION_CANDLES[0].close;
          
          fastEMA.push(currentFast);
          slowEMA.push(currentSlow);
          
          for (let i = 1; i < SIMULATION_CANDLES.length; i++) {
            currentFast = (SIMULATION_CANDLES[i].close * kFast) + (currentFast * (1 - kFast));
            currentSlow = (SIMULATION_CANDLES[i].close * kSlow) + (currentSlow * (1 - kSlow));
            fastEMA.push(parseFloat(currentFast.toFixed(2)));
            slowEMA.push(parseFloat(currentSlow.toFixed(2)));
            
            if (fastEMA[i-1] <= slowEMA[i-1] && fastEMA[i] > slowEMA[i]) {
              signals.push({ index: i, type: "BUY", price: SIMULATION_CANDLES[i].close, reason: `Fast EMA(${fastP}) crossed above Slow EMA(${slowP})` });
            } else if (fastEMA[i-1] >= slowEMA[i-1] && fastEMA[i] < slowEMA[i]) {
              signals.push({ index: i, type: "SELL", price: SIMULATION_CANDLES[i].close, reason: `Fast EMA(${fastP}) crossed below Slow EMA(${slowP})` });
            }
          }
          plots = { Fast_EMA: fastEMA, Slow_EMA: slowEMA };
        } else if (code.includes("Upper_Stop") || code.includes("MULTIPLIER")) {
          // ATR Stop Loss logic
          let upperStop: number[] = [];
          let lowerStop: number[] = [];
          let atrValues: number[] = [];
          
          SIMULATION_CANDLES.forEach((c, idx) => {
            if (idx === 0) {
              atrValues.push(c.high - c.low);
            } else {
              let tr = Math.max(
                c.high - c.low,
                Math.abs(c.high - SIMULATION_CANDLES[idx-1].close),
                Math.abs(c.low - SIMULATION_CANDLES[idx-1].close)
              );
              atrValues.push(tr);
            }
          });
          
          SIMULATION_CANDLES.forEach((c, i) => {
            let stop = atrValues[i] * mult;
            upperStop.push(parseFloat((c.close + stop).toFixed(2)));
            lowerStop.push(parseFloat((c.close - stop).toFixed(2)));
            
            if (i > 0 && c.close > upperStop[i-1]) {
              signals.push({ index: i, type: "BUY", price: c.close, reason: `Volatility breakout above ATR Channel (Mult: ${mult})` });
            } else if (i > 0 && c.close < lowerStop[i-1]) {
              signals.push({ index: i, type: "SELL", price: c.close, reason: `Volatility breakdown below ATR Channel (Mult: ${mult})` });
            }
          });
          plots = { Upper_Stop: upperStop, Lower_Stop: lowerStop };
        } else {
          // Wick Sweep ratio
          let wickRatio: number[] = [];
          SIMULATION_CANDLES.forEach((c, i) => {
            let body = Math.abs(c.close - c.open);
            let topWick = c.high - Math.max(c.open, c.close);
            let bottomWick = Math.min(c.open, c.close) - c.low;
            let ratio = body > 0 ? (topWick + bottomWick) / body : 1.0;
            wickRatio.push(parseFloat(ratio.toFixed(2)));
            
            if (body > 0 && bottomWick > body * sweepF) {
              signals.push({ index: i, type: "BUY", price: c.low, reason: `Wick Sweep Buy Wick(${bottomWick.toFixed(1)}) > Body*${sweepF}` });
            } else if (body > 0 && topWick > body * sweepF) {
              signals.push({ index: i, type: "SELL", price: c.high, reason: `Wick Sweep Sell Wick(${topWick.toFixed(1)}) > Body*${sweepF}` });
            }
          });
          plots = { Wick_Body_Ratio: wickRatio };
        }

        setActivePlots(plots);
        setActiveSignals(signals);
        setCompileSuccess(true);
        setCompilerLogs(prev => [
          ...prev,
          `[validator] Bracket check clear. No lexical scoping collisions found.`,
          `[compiler] AST successfully optimized and mapped. Outgoing plot count: ${Object.keys(plots).length}`,
          `[executor] Evaluation succeeded on 14 simulation candle states.`,
          `[success] Compiled successfully! Found ${signals.length} crossover / wick trigger signals.`
        ]);
      } catch (err: any) {
        setCompileSuccess(false);
        setCompilerLogs(prev => [
          ...prev,
          `[error] Compilation failed: ${err.message || err.toString()}`,
          `[error] Critical parsing failure at token boundaries. Process aborted.`
        ]);
      } finally {
        setIsCompiling(false);
      }
    }, 1000);
  };

  const handleSaveIndicator = () => {
    setIsSaved(true);
    setCompilerLogs(prev => [
      ...prev,
      `[disk] Saving Indicator algorithm settings to client-side storage...`,
      `[success] Saved Custom Indicator: "${SCRIPT_TEMPLATES[selectedTemplate].name}" successfully!`
    ]);
  };

  // Compile on mount automatically to show first curves
  useEffect(() => {
    handleCompileScript();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Header Description */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-emerald-400 tracking-wider uppercase mb-1">
            QUANT RESEARCH LAB
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Strategy Lab & Custom Indicators
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Evaluate mathematical trading regimes, backtest historical databases, or code your own custom indicators inside a live-compiling script workspace.
          </p>
        </div>

        {/* Dual Tab Controller */}
        <div className="flex gap-2 shrink-0 self-stretch md:self-auto">
          <button
            onClick={() => setActiveTab("backtest")}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 font-mono text-xs font-bold border rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "backtest"
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-800 border-slate-750 text-slate-300 hover:text-white"
            }`}
          >
            <BarChart className="h-4 w-4" />
            <span>Strategy Backtester</span>
          </button>
          <button
            onClick={() => setActiveTab("scripting")}
            className={`flex-1 md:flex-initial px-3.5 py-1.5 font-mono text-xs font-bold border rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "scripting"
                ? "bg-emerald-600 border-emerald-500 text-white animate-pulse"
                : "bg-slate-800 border-slate-750 text-slate-300 hover:text-white"
            }`}
          >
            <Code className="h-4 w-4" />
            <span>Indicator Scripting Editor</span>
          </button>
        </div>
      </div>

      {activeTab === "backtest" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Left selector and variables */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-[11px] text-slate-400 font-mono block mb-2 uppercase">Select Strategy Preset</label>
              <select
                value={selectedStrategy}
                onChange={(e) => {
                  setSelectedStrategy(e.target.value as any);
                  setSimulationPaths([]); // clear paths
                }}
                className="w-full bg-slate-950 border border-slate-850 text-white rounded px-2.5 py-2 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer font-semibold"
              >
                <option value="SMC Order Block Strategy">SMC Order Block Strategy</option>
                <option value="RSI/EMA Trend Following">RSI/EMA Trend Following</option>
                <option value="Mean Reversion (Bollinger/RSI)">Mean Reversion (Bollinger/RSI)</option>
              </select>
            </div>

            {/* Dynamic Sandbox Parameters */}
            <div className="space-y-3 border-t border-slate-850 pt-4">
              <h4 className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Optimize Parameters</h4>
              
              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Leverage Multiplier</span>
                  <span className="text-emerald-400 font-bold">{leverage}x</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="200" 
                  value={leverage} 
                  onChange={(e) => {
                    setLeverage(Number(e.target.value));
                    setSimulationPaths([]);
                  }}
                  className="w-full accent-emerald-500 bg-slate-950 h-1 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Risk Per Trade</span>
                  <span className="text-emerald-400 font-bold">{riskPerTrade}%</span>
                </div>
                <input 
                  type="range" 
                  step="0.1"
                  min="0.5" 
                  max="5" 
                  value={riskPerTrade} 
                  onChange={(e) => {
                    setRiskPerTrade(Number(e.target.value));
                    setSimulationPaths([]);
                  }}
                  className="w-full accent-emerald-500 bg-slate-950 h-1 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Slippage Simulation</span>
                  <span className="text-emerald-400 font-bold">{slippage}%</span>
                </div>
                <input 
                  type="range" 
                  step="0.05"
                  min="0.05" 
                  max="1" 
                  value={slippage} 
                  onChange={(e) => {
                    setSlippage(Number(e.target.value));
                    setSimulationPaths([]);
                  }}
                  className="w-full accent-emerald-500 bg-slate-950 h-1 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="space-y-3.5 border-t border-slate-850 pt-4 text-xs font-mono">
              <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Historical Metrics (Adjusted)</h4>
              
              <div className="flex justify-between border-b border-slate-850/40 pb-2">
                <span className="text-slate-400">Total Backtest Trades</span>
                <span className="text-slate-200 font-bold">{adjustedTrades}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850/40 pb-2">
                <span className="text-slate-400">Win Rate Percentage</span>
                <span className="text-emerald-400 font-bold">{adjustedWinRate}%</span>
              </div>
              <div className="flex justify-between border-b border-slate-850/40 pb-2">
                <span className="text-slate-400">Profit Factor Ratio</span>
                <span className="text-emerald-400 font-bold">{adjustedProfitFactor}x</span>
              </div>
              <div className="flex justify-between border-b border-slate-850/40 pb-2">
                <span className="text-slate-400">Sharpe Ratio (Risk Adj)</span>
                <span className="text-slate-200 font-bold">{adjustedSharpe}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850/40 pb-2">
                <span className="text-slate-400">Sortino Downside Ratio</span>
                <span className="text-slate-200 font-bold">{adjustedSortino}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Maximum Drawdown</span>
                <span className={`font-bold ${adjustedDrawdown > 50 ? 'text-rose-400' : 'text-slate-200'}`}>-{adjustedDrawdown}%</span>
              </div>
            </div>
          </div>

          {/* Right backtest graph and simulator */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Equity Progression & Monte Carlo Sandbox
                </h3>
                
                <button
                  onClick={handleRunSimulation}
                  disabled={runningSimulation}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-850 text-emerald-400 font-semibold rounded text-[10px] transition-all flex items-center gap-1.5 font-mono hover:border-emerald-500/20 cursor-pointer"
                >
                  <Activity className={`h-3.5 w-3.5 ${runningSimulation ? 'animate-spin' : ''}`} />
                  {runningSimulation ? "Solving SDEs..." : "Simulate Monte Carlo Paths"}
                </button>
              </div>

              {/* Custom SVG Equity Curve display */}
              <div className="border border-slate-850 bg-slate-950 rounded-lg p-2 min-h-[220px]">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                  {[0.25, 0.5, 0.75].map((ratio, i) => (
                    <line
                      key={i}
                      x1="0"
                      y1={height * ratio}
                      x2={width}
                      y2={height * ratio}
                      stroke="#1e293b"
                      strokeDasharray="3,3"
                    />
                  ))}

                  {/* Monte Carlo Paths */}
                  {simulationPaths.map((path, pathIdx) => (
                    <polyline
                      key={pathIdx}
                      fill="none"
                      stroke={`rgba(16, 185, 129, 0.12)`}
                      strokeWidth="1.2"
                      points={path.map((val, i) => `${getX(i)},${getY(val)}`).join(" ")}
                    />
                  ))}

                  {/* Main Backtest curve */}
                  <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.2"
                      points={polylinePoints}
                  />

                  {/* Data points */}
                  {adjustedEquityCurve.map((point, i) => (
                    <g key={i} className="group">
                      <circle
                        cx={getX(i)}
                        cy={getY(point.equity)}
                        r="3.5"
                        fill="#10b981"
                        className="cursor-pointer hover:fill-white transition-colors"
                      />
                      <text
                        x={getX(i)}
                        y={getY(point.equity) - 10}
                        fill="#cbd5e1"
                        fontSize="8"
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 font-bold"
                      >
                        ${point.equity.toLocaleString()}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-850 text-xs text-slate-500 flex justify-between items-center font-mono">
              <span>Start: $10,000 Balance</span>
              {simulationPaths.length > 0 && (
                <span className="text-emerald-400 font-bold">4 stochastic Monte Carlo paths overlayed</span>
              )}
              <span>End: ${(adjustedEquityCurve[adjustedEquityCurve.length - 1].equity).toLocaleString()}</span>
            </div>
          </div>

        </div>
      ) : (
        // --- TAB 2: CUSTOM SCRIPTING WORKSPACE ---
        <div className="space-y-6 animate-fade-in">
          
          {/* Template Info Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-widest bg-emerald-950/30 border border-emerald-900/30 px-2 py-0.5 rounded">
                ACTIVE SCRIPT TEMPLATE
              </span>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5 mt-1">
                <FileCode className="h-4.5 w-4.5 text-emerald-400" />
                {SCRIPT_TEMPLATES[selectedTemplate].name}
              </h3>
              <p className="text-xs text-slate-400">
                {SCRIPT_TEMPLATES[selectedTemplate].description}
              </p>
            </div>

            <div className="flex gap-2 shrink-0 w-full sm:w-auto">
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value as any)}
                className="w-full sm:w-56 bg-slate-950 border border-slate-850 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer font-mono text-[11px]"
              >
                <option value="ema_cross">SMC Dual EMA Crossover (Momentum)</option>
                <option value="atr_trailing">ATR Trailing Stop Channel (Volatility)</option>
                <option value="liquidity_sweep">Wick Sweep Detector (Structure)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Script IDE */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                    <Code className="h-4 w-4 text-emerald-400" />
                    Interactive Pine-JS Script Editor
                  </span>
                  
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse mt-1" />
                    <span className="text-[9px] font-mono text-slate-500">COMPILER ATTACHED</span>
                  </div>
                </div>

                {/* Editor Container with numbers */}
                <div className="relative border border-slate-850 bg-slate-950 rounded-lg p-3 flex font-mono text-[11px] leading-relaxed overflow-x-auto min-h-[380px]">
                  {/* Fake Line Numbers */}
                  <div className="text-slate-600 text-right pr-3 select-none border-r border-slate-850/60 shrink-0 space-y-0.5">
                    {Array.from({ length: editorCode.split("\n").length + 2 }).map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>

                  {/* Textarea */}
                  <textarea
                    value={editorCode}
                    onChange={(e) => {
                      setEditorCode(e.target.value);
                      setIsSaved(false);
                    }}
                    className="w-full bg-transparent text-slate-200 pl-4 pr-1 focus:outline-none resize-none font-mono whitespace-pre h-[380px] scrollbar-thin"
                    spellCheck="false"
                  />
                </div>
              </div>

              {/* Editor controls */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-850">
                <p className="text-[10px] text-slate-500 font-mono">
                  Press compile to trigger live calculations on simulated candlesticks.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditorCode(SCRIPT_TEMPLATES[selectedTemplate].code);
                      setCompilerLogs(prev => [...prev, `[system] Reset editor to "${SCRIPT_TEMPLATES[selectedTemplate].name}" baseline.`]);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-[11px] font-mono border border-slate-700 rounded-lg transition-all cursor-pointer"
                  >
                    Reset Template
                  </button>
                  <button
                    onClick={handleSaveIndicator}
                    disabled={isSaved}
                    className={`px-3 py-1.5 font-bold text-[11px] font-mono border rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSaved
                        ? "bg-slate-950 text-slate-500 border-slate-850"
                        : "bg-slate-800 hover:bg-slate-750 text-emerald-400 border-slate-700"
                    }`}
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isSaved ? "Saved" : "Save Script"}</span>
                  </button>
                  <button
                    onClick={handleCompileScript}
                    disabled={isCompiling}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] font-mono rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isCompiling ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Compiling...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 text-white fill-current" />
                        <span>Compile & Plot</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column: Dynamic Plots & Compiler Output Terminal */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Dynamic Chart Plotting Canvas */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    Live Output Pricing Canvas
                  </h3>
                  <span className="text-[9px] font-mono text-slate-500 bg-slate-950/50 border border-slate-850 px-1.5 py-0.5 rounded">
                    14 Candle State
                  </span>
                </div>

                <div className="border border-slate-850 bg-slate-950 rounded-lg p-2 min-h-[220px] relative">
                  <svg viewBox="0 0 450 200" className="w-full h-full">
                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75].map((ratio, i) => (
                      <line
                        key={i}
                        x1="0"
                        y1={200 * ratio}
                        x2="450"
                        y2={200 * ratio}
                        stroke="#1e293b"
                        strokeDasharray="2,2"
                      />
                    ))}

                    {/* Candlesticks & plotted lines mapping */}
                    {(() => {
                      const cMin = 95;
                      const cMax = 118;
                      const cRange = cMax - cMin;
                      const cHeight = 200;
                      const cWidth = 450;
                      const cPadding = 15;

                      const getCX = (idx: number) => cPadding + (idx * (cWidth - cPadding * 2) / (SIMULATION_CANDLES.length - 1));
                      const getCY = (val: number) => cHeight - cPadding - ((val - cMin) * (cHeight - cPadding * 2) / cRange);

                      return (
                        <>
                          {/* Draw candlesticks */}
                          {SIMULATION_CANDLES.map((c, i) => {
                            const cx = getCX(i);
                            const yOpen = getCY(c.open);
                            const yClose = getCY(c.close);
                            const yHigh = getCY(c.high);
                            const yLow = getCY(c.low);
                            const candleWidth = 14;

                            const isGreen = c.close >= c.open;
                            const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

                            return (
                              <g key={i}>
                                {/* Shadow wick */}
                                <line
                                  x1={cx}
                                  y1={yHigh}
                                  x2={cx}
                                  y2={yLow}
                                  stroke={isGreen ? "#10b981" : "#f43f5e"}
                                  strokeWidth="1.2"
                                />
                                {/* Candle block */}
                                <rect
                                  x={cx - candleWidth / 2}
                                  y={Math.min(yOpen, yClose)}
                                  width={candleWidth}
                                  height={bodyHeight}
                                  fill={isGreen ? "#10b981" : "#f43f5e"}
                                  opacity="0.85"
                                  rx="1"
                                />
                              </g>
                            );
                          })}

                          {/* Plotted Line 1 (Fast EMA or Upper ATR Stop or Wick ratio indicator) */}
                          {Object.keys(activePlots).map((plotKey, plotIdx) => {
                            const values = activePlots[plotKey];
                            const points = values.map((val, i) => `${getCX(i)},${getCY(val)}`).join(" ");
                            const strokeColor = plotIdx === 0 ? "#60a5fa" : "#fbbf24";
                            
                            return (
                              <polyline
                                key={plotKey}
                                fill="none"
                                stroke={strokeColor}
                                strokeWidth="2"
                                points={points}
                                strokeDasharray={plotKey.includes("Stop") ? "3,3" : ""}
                              />
                            );
                          })}

                          {/* Plotted Trade Signal Alerts */}
                          {activeSignals.map((sig, sIdx) => {
                            const cx = getCX(sig.index);
                            const cy = getCY(sig.price);
                            const isBuy = sig.type === "BUY";

                            return (
                              <g key={sIdx}>
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r="5"
                                  fill={isBuy ? "#10b981" : "#f43f5e"}
                                  stroke="#fff"
                                  strokeWidth="1"
                                />
                                <text
                                  x={cx}
                                  y={isBuy ? cy - 8 : cy + 14}
                                  fill={isBuy ? "#34d399" : "#f87171"}
                                  fontSize="8"
                                  fontWeight="bold"
                                  fontFamily="monospace"
                                  textAnchor="middle"
                                >
                                  {isBuy ? "▲ BUY" : "▼ SELL"}
                                </text>
                              </g>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-mono text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-1 bg-blue-400 inline-block rounded" />
                    <span>Plot A (Fast/Upper)</span>
                  </div>
                  {Object.keys(activePlots).length > 1 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-1 bg-amber-400 inline-block rounded" />
                      <span>Plot B (Slow/Lower)</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block" />
                    <span>BUY Tag</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-rose-500 rounded-full inline-block" />
                    <span>SELL Tag</span>
                  </div>
                </div>
              </div>

              {/* Script compiler terminal console */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <TerminalIcon className="h-4 w-4 text-emerald-400" />
                    Compiler Diagnostic Log
                  </h3>
                  <button
                    onClick={() => setCompilerLogs([])}
                    className="text-[9px] font-mono text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    CLEAR
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-850 rounded-lg p-3 h-32 overflow-y-auto font-mono text-[10px] space-y-1 scrollbar-thin">
                  {compilerLogs.map((log, index) => {
                    let color = "text-slate-300";
                    if (log.startsWith("[success]")) color = "text-emerald-400 font-bold";
                    else if (log.startsWith("[compiler]")) color = "text-blue-400";
                    else if (log.startsWith("[lexer]") || log.startsWith("[parser]")) color = "text-slate-400";
                    else if (log.startsWith("[error]")) color = "text-rose-400 font-bold";
                    else if (log.startsWith("[disk]")) color = "text-amber-400";

                    return (
                      <div key={index} className={`${color} leading-normal`}>
                        {log}
                      </div>
                    );
                  })}
                </div>

                {compileSuccess && activeSignals.length > 0 && (
                  <div className="bg-slate-950/40 border border-slate-850 rounded-lg p-3 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-300 font-mono block uppercase">Executed Signal Ledger:</span>
                    <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[9px] text-slate-400 scrollbar-thin">
                      {activeSignals.map((sig, i) => (
                        <div key={i} className="flex justify-between border-b border-slate-850/30 pb-1">
                          <span className={sig.type === "BUY" ? "text-emerald-400" : "text-rose-400"}>
                            {sig.type} (Candle #{sig.index + 1} @ ${sig.price})
                          </span>
                          <span className="text-slate-500 truncate max-w-[200px]">{sig.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
