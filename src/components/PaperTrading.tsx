import React, { useState, useEffect } from "react";
import { MarketAsset } from "../types";
import { 
  Play, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Clock, Shield,
  Layers, PlusCircle, Trash2, XCircle, CheckCircle, RefreshCw, AlertTriangle, 
  Wallet, Award, BarChart3, HelpCircle, Sliders, Percent, Cpu, Calculator
} from "lucide-react";
import { doc, getDoc, setDoc, onSnapshot, updateDoc, collection, addDoc, query, orderBy, getDocs } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  getStoredCurrency, 
  formatCurrencyAmount, 
  calculatePips, 
  calculateTradePnL, 
  CurrencyConfig 
} from "../utils/currencyAndPips";

interface PaperTradingProps {
  allAssets: MarketAsset[];
  selectedAsset: MarketAsset;
  onSelectAsset: (asset: MarketAsset) => void;
}

export interface PaperAccount {
  balance: number;
  realizedProfit: number;
  equity: number;
  marginUsed: number;
  freeMargin: number;
}

export interface PaperPosition {
  id: string;
  userId?: string;
  symbol: string;
  name: string;
  category: string;
  type: "BUY" | "SELL";
  entryPrice: number;
  currentPrice: number;
  size: number; // in Lots (1 lot = 100,000 units for forex, 1 share for stocks, etc.)
  leverage: number;
  stopLoss: number;
  takeProfit: number;
  unrealizedPnL: number;
  timestamp: string;
  status: "OPEN" | "CLOSED" | "PENDING";
  exitPrice?: number;
  realizedPnL?: number;
  pendingType?: string;
  triggerPrice?: number;
  brokerId?: string;
  brokerTicket?: string;
}

export default function PaperTrading({ allAssets, selectedAsset, onSelectAsset }: PaperTradingProps) {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyConfig>(() => getStoredCurrency());

  useEffect(() => {
    const handleStorage = () => setSelectedCurrency(getStoredCurrency());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);
  const [account, setAccount] = useState<PaperAccount>({
    balance: 100000,
    realizedProfit: 0,
    equity: 100000,
    marginUsed: 0,
    freeMargin: 100000
  });

  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [history, setHistory] = useState<PaperPosition[]>([]);
  
  // Form input states
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [lotSize, setLotSize] = useState<number>(0.1);
  const [selectedLeverage, setSelectedLeverage] = useState<number>(100);
  const [slPrice, setSlPrice] = useState<string>("");
  const [tpPrice, setTpPrice] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"positions" | "pending" | "history">("positions");
  
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [isPersistedCloud, setIsPersistedCloud] = useState(false);
  const [customBalanceStr, setCustomBalanceStr] = useState<string>("");
  const [showAccountSettings, setShowAccountSettings] = useState<boolean>(false);

  // Account Environment Mode: DEMO (for risk-free sandbox practice) or LIVE (for executing real orders on broker account)
  const [accountMode, setAccountMode] = useState<"demo" | "live">(() => {
    const saved = localStorage.getItem("paper_trading_account_mode_v1");
    return (saved as "demo" | "live") || "demo";
  });

  // Advanced Routing and Execution state variables
  const [executionMode, setExecutionMode] = useState<"MARKET" | "PENDING">("MARKET");
  const [pendingOrderType, setPendingOrderType] = useState<"BUY_LIMIT" | "BUY_STOP" | "SELL_LIMIT" | "SELL_STOP">("BUY_LIMIT");
  const [triggerPrice, setTriggerPrice] = useState<string>("");
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>("simulation");
  const [connectedBrokers, setConnectedBrokers] = useState<any[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] ℹ️ Secure Trade Routing Gateway online. Ready for API dispatch.`
  ]);
  const [pendingOrders, setPendingOrders] = useState<PaperPosition[]>([]);

  const addTerminalLog = (message: string, type: "info" | "success" | "error" | "warning" = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    let prefix = "ℹ️";
    if (type === "success") prefix = "🟢";
    if (type === "error") prefix = "🔴";
    if (type === "warning") prefix = "⚠️";
    setTerminalLogs(prev => [`[${timestamp}] ${prefix} ${message}`, ...prev].slice(0, 40));
  };

  // Sync connected brokers on load and on interval to react instantly to user connection on the Brokers tab
  useEffect(() => {
    const loadConnectedBrokers = () => {
      const saved = localStorage.getItem("connected_brokers_list");
      if (saved) {
        try {
          const list = JSON.parse(saved);
          const activeOnes = list.filter((b: any) => b.connected);
          setConnectedBrokers(activeOnes);
        } catch (e) {
          console.error(e);
        }
      }
    };
    loadConnectedBrokers();
    const interval = setInterval(loadConnectedBrokers, 2500);
    return () => clearInterval(interval);
  }, []);

  // Sync auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Sync with Firestore or LocalStorage
  useEffect(() => {
    if (currentUser) {
      // 1. Cloud Sync Setup
      setIsPersistedCloud(true);
      const accountRef = doc(db, "paper_accounts", currentUser.uid);
      const positionsQuery = query(collection(db, "paper_positions"));
      
      // Listen to account changes
      const unsubAccount = onSnapshot(accountRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAccount({
            balance: data.balance ?? 100000,
            realizedProfit: data.realizedProfit ?? 0,
            equity: data.equity ?? 100000,
            marginUsed: data.marginUsed ?? 0,
            freeMargin: data.freeMargin ?? 100000
          });
        } else {
          // Initialize user paper account on Cloud
          const initialAccount = {
            balance: 100000,
            realizedProfit: 0,
            equity: 100000,
            marginUsed: 0,
            freeMargin: 100000,
            updatedAt: new Date().toISOString()
          };
          setDoc(accountRef, initialAccount).catch(err => {
            console.error("Error setting cloud paper account:", err);
          });
        }
      }, (error) => {
        console.error("Firestore Account Subscription failed:", error);
      });

      // Get all positions for this user
      const unsubPositions = onSnapshot(collection(db, "paper_positions"), (snap) => {
        const list: PaperPosition[] = [];
        snap.forEach((docSnap) => {
          const item = docSnap.data() as PaperPosition;
          if (item.userId === currentUser.uid) {
            list.push({ ...item, id: docSnap.id });
          }
        });
        // Merge any local direct orders placed from Checklist, Trade Setup, Risk Calculator or Chart
        let localDirectPositions: PaperPosition[] = [];
        try {
          const raw = localStorage.getItem("paper_trading_positions_v1");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              localDirectPositions = parsed.map((p: any) => ({
                id: p.id || `pos_${Date.now()}`,
                userId: currentUser.uid,
                symbol: p.symbol || "EUR/USD",
                name: p.name || p.symbol || "Market Asset",
                category: p.category || "Forex",
                type: (p.type || "BUY") as "BUY" | "SELL",
                entryPrice: Number(p.entryPrice) || 1,
                currentPrice: Number(p.currentPrice) || Number(p.entryPrice) || 1,
                size: Number(p.size) || 0.1,
                leverage: Number(p.leverage) || 100,
                stopLoss: Number(p.stopLoss) || 0,
                takeProfit: Number(p.takeProfit) || 0,
                unrealizedPnL: Number(p.pnl) || 0,
                timestamp: p.timestamp || new Date().toISOString(),
                status: (p.status || "OPEN") as "OPEN" | "CLOSED" | "PENDING",
                brokerId: p.brokerId || "quantintel-stp",
                brokerTicket: p.id || "STP-AUTO"
              }));
            }
          }
        } catch (e) {
          console.error("Local direct positions parse error:", e);
        }

        // Combine unique positions
        const combinedList = [...list];
        localDirectPositions.forEach(locPos => {
          if (!combinedList.some(c => c.id === locPos.id)) {
            combinedList.push(locPos);
          }
        });

        const openList = combinedList.filter(p => p.status === "OPEN");
        const pendingList = combinedList.filter(p => p.status === "PENDING");
        const closedList = combinedList.filter(p => p.status === "CLOSED").sort((a,b) => b.timestamp.localeCompare(a.timestamp));
        setPositions(openList);
        setPendingOrders(pendingList);
        setHistory(closedList);
      }, (err) => {
        console.error("Firestore positions load failed:", err);
      });

      return () => {
        unsubAccount();
        unsubPositions();
      };
    } else {
      // 2. Local fallback sync
      setIsPersistedCloud(false);
      const localAccount = localStorage.getItem("paper_trading_account_v1");
      const localPositions = localStorage.getItem("paper_trading_positions_v1");
      const localHistory = localStorage.getItem("paper_trading_history_v1");
      const localPending = localStorage.getItem("paper_trading_pending_v1");

      if (localAccount) {
        setAccount(JSON.parse(localAccount));
      } else {
        const initAcc = { balance: 100000, realizedProfit: 0, equity: 100000, marginUsed: 0, freeMargin: 100000 };
        setAccount(initAcc);
        localStorage.setItem("paper_trading_account_v1", JSON.stringify(initAcc));
      }

      if (localPositions) {
        try {
          const parsed = JSON.parse(localPositions);
          if (Array.isArray(parsed)) {
            const normalized = parsed.map((p: any) => ({
              id: p.id || `pos_${Date.now()}`,
              symbol: p.symbol || "EUR/USD",
              name: p.name || p.symbol || "Market Asset",
              category: p.category || "Forex",
              type: (p.type || "BUY") as "BUY" | "SELL",
              entryPrice: Number(p.entryPrice) || 1,
              currentPrice: Number(p.currentPrice) || Number(p.entryPrice) || 1,
              size: Number(p.size) || 0.1,
              leverage: Number(p.leverage) || 100,
              stopLoss: Number(p.stopLoss) || 0,
              takeProfit: Number(p.takeProfit) || 0,
              unrealizedPnL: Number(p.pnl) || 0,
              timestamp: p.timestamp || new Date().toISOString(),
              status: (p.status || "OPEN") as "OPEN" | "CLOSED" | "PENDING",
              brokerId: p.brokerId || "quantintel-stp",
              brokerTicket: p.id || "STP-AUTO"
            }));
            setPositions(normalized);
          } else {
            setPositions([]);
          }
        } catch (e) {
          console.error(e);
          setPositions([]);
        }
      } else {
        setPositions([]);
      }

      if (localPending) {
        setPendingOrders(JSON.parse(localPending));
      } else {
        setPendingOrders([]);
      }

      if (localHistory) {
        setHistory(JSON.parse(localHistory));
      } else {
        setHistory([]);
      }
    }
  }, [currentUser]);

  // Set default SL/TP based on selected asset (Crypto vs Non-Crypto aware to ensure exchange compliance)
  useEffect(() => {
    if (!selectedAsset) return;
    const isCrypto = selectedAsset.category === "Crypto" || /BTC|ETH|SOL|XRP|DOGE|PEPE|SHIB|ADA|DOT|AVAX|LINK|NEAR|BNB|UNI|LTC|BCH|SUI|APT|ICP|RENDER|STX|CRYPTO/i.test(selectedAsset.symbol);
    const decimals = selectedAsset.price < 0.1 ? 6 : selectedAsset.price < 2 ? 4 : 2;
    const slDistPct = isCrypto ? 0.025 : 0.008; // 2.5% for Crypto vs 0.8% for Forex/Gold
    const tpDistPct = isCrypto ? 0.055 : 0.018; // 5.5% for Crypto vs 1.8% for Forex/Gold

    if (orderType === "BUY") {
      setSlPrice((selectedAsset.price * (1 - slDistPct)).toFixed(decimals));
      setTpPrice((selectedAsset.price * (1 + tpDistPct)).toFixed(decimals));
    } else {
      setSlPrice((selectedAsset.price * (1 + slDistPct)).toFixed(decimals));
      setTpPrice((selectedAsset.price * (1 - tpDistPct)).toFixed(decimals));
    }
  }, [selectedAsset, orderType]);

  // Run real-time P&L Tick Fluctuation Simulator
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Process Pending Order Triggers
      if (pendingOrders.length > 0) {
        pendingOrders.forEach(async (order) => {
          const asset = allAssets.find(a => a && a.symbol === order.symbol) || selectedAsset;
          const currentPrice = asset.price;
          let shouldTrigger = false;

          if (order.pendingType === "BUY_LIMIT" && currentPrice <= (order.triggerPrice || 0)) {
            shouldTrigger = true;
          } else if (order.pendingType === "BUY_STOP" && currentPrice >= (order.triggerPrice || 0)) {
            shouldTrigger = true;
          } else if (order.pendingType === "SELL_LIMIT" && currentPrice >= (order.triggerPrice || 0)) {
            shouldTrigger = true;
          } else if (order.pendingType === "SELL_STOP" && currentPrice <= (order.triggerPrice || 0)) {
            shouldTrigger = true;
          }

          if (shouldTrigger) {
            addTerminalLog(`Pending order trigger condition MET for ${order.symbol} (${order.pendingType}) at target $${order.triggerPrice}. Executing...`, "info");
            
            if (currentUser) {
              try {
                const posRef = doc(db, "paper_positions", order.id);
                await updateDoc(posRef, {
                  status: "OPEN",
                  entryPrice: currentPrice,
                  currentPrice: currentPrice,
                  timestamp: new Date().toISOString()
                });
                addTerminalLog(`Cloud pending order #${order.id.slice(0, 6)} successfully triggered and opened!`, "success");
              } catch (e) {
                console.error("Firestore pending order trigger error:", e);
              }
            } else {
              // Local update
              const updatedPending = pendingOrders.filter(o => o.id !== order.id);
              const activatedOrder: PaperPosition = {
                ...order,
                status: "OPEN",
                entryPrice: currentPrice,
                currentPrice: currentPrice,
                timestamp: new Date().toISOString()
              };
              const updatedPositions = [...positions, activatedOrder];

              setPendingOrders(updatedPending);
              setPositions(updatedPositions);
              localStorage.setItem("paper_trading_pending_v1", JSON.stringify(updatedPending));
              localStorage.setItem("paper_trading_positions_v1", JSON.stringify(updatedPositions));
              
              addTerminalLog(`Local pending order #${order.id.slice(0, 6)} successfully filled at market price $${currentPrice}!`, "success");
              triggerNotification(`Pending order for ${order.symbol} filled at $${currentPrice}!`, "success");
            }
          }
        });
      }

      // 2. Process active positions
      if (positions.length === 0) return;

      // Update positions with price variations
      const updatedPositions = positions.map((pos) => {
        // Find latest asset price or simulate tiny change
        const asset = allAssets.find(a => a && a.symbol === pos.symbol) || selectedAsset;
        const currentPrice = asset.price;
        
        // Calculate P&L
        let unrealizedPnL = 0;
        const multiplier = pos.category === "Forex" ? 10000 : 1;

        if (pos.type === "BUY") {
          unrealizedPnL = (currentPrice - pos.entryPrice) * pos.size * multiplier * pos.leverage;
        } else {
          unrealizedPnL = (pos.entryPrice - currentPrice) * pos.size * multiplier * pos.leverage;
        }

        return {
          ...pos,
          currentPrice,
          unrealizedPnL: Number(unrealizedPnL.toFixed(2))
        };
      });

      // Recalculate account equity, margin & free margin
      const totalUnrealized = updatedPositions.reduce((acc, p) => acc + p.unrealizedPnL, 0);
      const newEquity = Number((account.balance + totalUnrealized).toFixed(2));
      const marginNeeded = updatedPositions.reduce((acc, p) => {
        const baseNotional = p.entryPrice * p.size * (p.category === "Forex" ? 100000 : 1);
        return acc + (baseNotional / p.leverage);
      }, 0);

      const marginUsed = Number(marginNeeded.toFixed(2));
      const freeMargin = Number((newEquity - marginUsed).toFixed(2));

      setAccount(prev => {
        const updated = {
          ...prev,
          equity: newEquity,
          marginUsed,
          freeMargin
        };
        if (!currentUser) {
          localStorage.setItem("paper_trading_account_v1", JSON.stringify(updated));
        }
        return updated;
      });

      setPositions(updatedPositions);
      if (!currentUser) {
        localStorage.setItem("paper_trading_positions_v1", JSON.stringify(updatedPositions));
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [positions, pendingOrders, allAssets, account.balance, currentUser]);

  // Handle Notifications
  const triggerNotification = (message: string, type: "success" | "error" | "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. PLACE ORDER
  const handlePlaceOrder = async () => {
    if (lotSize <= 0) {
      triggerNotification("Please specify a valid trade lot size.", "error");
      return;
    }

    const slNum = Number(slPrice);
    const tpNum = Number(tpPrice);

    if (isNaN(slNum) || isNaN(tpNum)) {
      triggerNotification("Stop loss and Take profit prices must be numeric.", "error");
      return;
    }

    let entryPrice = selectedAsset.price;
    if (executionMode === "PENDING") {
      const trigPriceNum = Number(triggerPrice);
      if (isNaN(trigPriceNum) || trigPriceNum <= 0) {
        triggerNotification("Please specify a valid trigger price for the pending order.", "error");
        return;
      }
      entryPrice = trigPriceNum;
    }

    // Minimum stop distance validation to prevent exchange order rejection
    const isCrypto = selectedAsset.category === "Crypto" || /BTC|ETH|SOL|XRP|DOGE|PEPE|SHIB|ADA|DOT|AVAX|LINK|NEAR|BNB|UNI|LTC|BCH|SUI|APT|ICP|RENDER|STX|CRYPTO/i.test(selectedAsset.symbol);
    const distSlPct = Math.abs(entryPrice - slNum) / entryPrice;
    const distTpPct = Math.abs(tpNum - entryPrice) / entryPrice;
    const minDist = isCrypto ? 0.005 : 0.001; // 0.5% for Crypto vs 0.1% for Forex

    if (distSlPct < minDist) {
      triggerNotification(`Stop Loss is too close to open price (${(distSlPct * 100).toFixed(2)}%). ${isCrypto ? "Cryptocurrency exchanges require at least 0.5% Stop Loss distance." : "Minimum Stop Loss distance is 0.1%."}`, "error");
      addTerminalLog(`Order rejected: Stop Loss distance (${(distSlPct * 100).toFixed(2)}%) violates exchange minimum stop distance rule (${(minDist * 100).toFixed(1)}%).`, "error");
      return;
    }

    if (distTpPct < minDist) {
      triggerNotification(`Take Profit is too close to open price (${(distTpPct * 100).toFixed(2)}%). ${isCrypto ? "Cryptocurrency exchanges require at least 0.5% Take Profit distance." : "Minimum Take Profit distance is 0.1%."}`, "error");
      addTerminalLog(`Order rejected: Take Profit distance (${(distTpPct * 100).toFixed(2)}%) violates exchange minimum stop distance rule (${(minDist * 100).toFixed(1)}%).`, "error");
      return;
    }

    // Live vs Demo check
    if (accountMode === "live") {
      if (selectedBrokerId === "simulation") {
        triggerNotification("In Live trading mode, you must execute orders on a connected live broker account. Change target account or switch to Demo Practice.", "error");
        addTerminalLog("Rejected: Simulated sandbox execution restricted in live environment.", "error");
        return;
      }
      if (connectedBrokers.length === 0) {
        triggerNotification("Please connect or register an active live broker under the Brokers dashboard first.", "error");
        addTerminalLog("Rejected: No active real-time broker connections found.", "error");
        return;
      }
    } else {
      // In demo mode, if a real broker was selected, force redirect to simulation
      if (selectedBrokerId !== "simulation") {
        setSelectedBrokerId("simulation");
        triggerNotification("Executing in Sandbox Simulation since Demo Practice Mode is active.", "info");
      }
    }

    // Margin call security check
    const contractMultiplier = selectedAsset.category === "Forex" ? 100000 : 1;
    const notionalValue = entryPrice * lotSize * contractMultiplier;
    const requiredMargin = notionalValue / selectedLeverage;

    // Determine target broker details
    const activeBroker = accountMode === "live" ? connectedBrokers.find(b => b.id === selectedBrokerId) : null;
    const isBrokerRouted = !!activeBroker;
    const brokerName = activeBroker ? activeBroker.name : "QuantIntel Simulation Desk";

    if (isBrokerRouted) {
      const brokerBalance = activeBroker.balance || 0;
      if (requiredMargin > brokerBalance) {
        triggerNotification(`Insufficient funds on ${brokerName} account to complete this trade.`, "error");
        addTerminalLog(`Rejected: Insufficient margin on connected ${brokerName} account.`, "error");
        return;
      }
    } else {
      if (requiredMargin > account.freeMargin) {
        triggerNotification("Insufficient Margin available to initiate this order size.", "error");
        return;
      }
    }

    const ticketId = isBrokerRouted 
      ? `${activeBroker.id.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}` 
      : `SIM-${Math.floor(100000 + Math.random() * 900000)}`;

    const newPos: Omit<PaperPosition, "id"> = {
      userId: currentUser?.uid || "guest",
      symbol: selectedAsset.symbol,
      name: selectedAsset.name,
      category: selectedAsset.category,
      type: executionMode === "PENDING" ? (pendingOrderType.startsWith("BUY") ? "BUY" : "SELL") : orderType,
      entryPrice: entryPrice,
      currentPrice: selectedAsset.price,
      size: lotSize,
      leverage: selectedLeverage,
      stopLoss: slNum,
      takeProfit: tpNum,
      unrealizedPnL: 0,
      timestamp: new Date().toISOString(),
      status: executionMode === "PENDING" ? "PENDING" : "OPEN",
      pendingType: executionMode === "PENDING" ? pendingOrderType : undefined,
      triggerPrice: executionMode === "PENDING" ? entryPrice : undefined,
      brokerId: selectedBrokerId,
      brokerTicket: ticketId
    };

    try {
      if (isBrokerRouted) {
        addTerminalLog(`Establishing SSL session with secure ${brokerName} gateway...`, "info");
        addTerminalLog(`Verifying credential token for account ${activeBroker.accountNo}...`, "info");
        addTerminalLog(`Dispatching API Payload: ${JSON.stringify({
          endpoint: executionMode === "PENDING" ? "POST /v1/pending_orders" : "POST /v1/market_orders",
          ticket: ticketId,
          payload: {
            symbol: newPos.symbol,
            type: executionMode === "PENDING" ? pendingOrderType : newPos.type,
            lots: newPos.size,
            price: newPos.entryPrice,
            leverage: `${newPos.leverage}:1`,
            stopLoss: newPos.stopLoss,
            takeProfit: newPos.takeProfit
          }
        }, null, 2)}`, "info");
      }

      if (currentUser) {
        // Cloud Save
        const docRef = await addDoc(collection(db, "paper_positions"), newPos);
        
        if (!isBrokerRouted) {
          // Deduct margin from simulator visual state instantly if it is a market execution
          if (executionMode !== "PENDING") {
            setAccount(prev => ({
              ...prev,
              freeMargin: prev.freeMargin - requiredMargin,
              marginUsed: prev.marginUsed + requiredMargin
            }));
          }
        }
      } else {
        // Local Save
        const rawNew: PaperPosition = { ...newPos, id: `pos_${Date.now()}` };
        
        if (executionMode === "PENDING") {
          const nextPendingList = [...pendingOrders, rawNew];
          setPendingOrders(nextPendingList);
          localStorage.setItem("paper_trading_pending_v1", JSON.stringify(nextPendingList));
        } else {
          const nextPosList = [...positions, rawNew];
          setPositions(nextPosList);
          localStorage.setItem("paper_trading_positions_v1", JSON.stringify(nextPosList));

          if (!isBrokerRouted) {
            setAccount(prev => {
              const updated = {
                ...prev,
                freeMargin: prev.freeMargin - requiredMargin,
                marginUsed: prev.marginUsed + requiredMargin
              };
              localStorage.setItem("paper_trading_account_v1", JSON.stringify(updated));
              return updated;
            });
          }
        }
      }

      // Update connected broker balance in local storage if a real broker is routed
      if (isBrokerRouted) {
        const saved = localStorage.getItem("connected_brokers_list");
        if (saved) {
          try {
            const list = JSON.parse(saved);
            const updatedList = list.map((b: any) => {
              if (b.id === selectedBrokerId) {
                const currentBal = b.balance || 0;
                // Only deduct margin instantly if it is an immediate market order
                const nextBal = executionMode === "PENDING" ? currentBal : (currentBal - requiredMargin);
                return {
                  ...b,
                  balance: Number(nextBal.toFixed(2)),
                  equity: Number(nextBal.toFixed(2))
                };
              }
              return b;
            });
            localStorage.setItem("connected_brokers_list", JSON.stringify(updatedList));
          } catch (e) {
            console.error(e);
          }
        }
        addTerminalLog(`API Success! Trade successfully synchronized. Broker Ticket: #${ticketId}`, "success");
        triggerNotification(`${executionMode === "PENDING" ? "Pending order set" : "Market order executed"} automatically on your connected account at ${brokerName}!`, "success");
      } else {
        triggerNotification(`${executionMode === "PENDING" ? "Pending order set" : `${orderType} order filled`} successfully for ${lotSize} Lots ${selectedAsset.symbol}!`, "success");
      }

      // Reset Pending Trigger Input
      setTriggerPrice("");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "paper_positions");
    }
  };

  // 2. CLOSE POSITION
  const handleClosePosition = async (pos: PaperPosition) => {
    const decimals = pos.entryPrice < 2 ? 4 : 2;
    const currentPrice = selectedAsset.symbol === pos.symbol ? selectedAsset.price : pos.currentPrice;
    
    // Final realized calculation
    const multiplier = pos.category === "Forex" ? 10000 : 1;
    let profit = 0;
    if (pos.type === "BUY") {
      profit = (currentPrice - pos.entryPrice) * pos.size * multiplier * pos.leverage;
    } else {
      profit = (pos.entryPrice - currentPrice) * pos.size * multiplier * pos.leverage;
    }

    const finalPnL = Number(profit.toFixed(2));
    const finalBalance = Number((account.balance + finalPnL).toFixed(2));
    const finalRealized = Number((account.realizedProfit + finalPnL).toFixed(2));

    const activeBroker = connectedBrokers.find(b => b.id === pos.brokerId);
    const isBrokerRouted = !!activeBroker;
    const brokerName = activeBroker ? activeBroker.name : "QuantIntel Simulation Desk";

    try {
      if (isBrokerRouted) {
        addTerminalLog(`Establishing SSL session with secure ${brokerName} gateway...`, "info");
        addTerminalLog(`Dispatching close position payload for Broker Ticket #${pos.brokerTicket || "unknown"}`, "info");
        addTerminalLog(`API Payload: ${JSON.stringify({
          endpoint: "POST /v1/market_orders/close",
          ticket: pos.brokerTicket,
          closePrice: currentPrice,
          realizedPnL: finalPnL
        }, null, 2)}`, "info");

        // Refund margin and credit P&L to connected broker list inside local storage
        const saved = localStorage.getItem("connected_brokers_list");
        if (saved) {
          try {
            const list = JSON.parse(saved);
            const updatedList = list.map((b: any) => {
              if (b.id === pos.brokerId) {
                const currentBal = b.balance || 0;
                const multiplierUnits = pos.category === "Forex" ? 100000 : 1;
                const positionNotional = pos.entryPrice * pos.size * multiplierUnits;
                const marginRequired = positionNotional / pos.leverage;
                const nextBal = currentBal + marginRequired + finalPnL;
                return {
                  ...b,
                  balance: Number(nextBal.toFixed(2)),
                  equity: Number(nextBal.toFixed(2))
                };
              }
              return b;
            });
            localStorage.setItem("connected_brokers_list", JSON.stringify(updatedList));
          } catch (e) {
            console.error(e);
          }
        }
        addTerminalLog(`API Success! Position successfully closed on ${brokerName}. Realized P&L: $${finalPnL >= 0 ? '+' : ''}${finalPnL}`, "success");
      }

      if (currentUser) {
        // Cloud Position update
        const posRef = doc(db, "paper_positions", pos.id);
        await updateDoc(posRef, {
          status: "CLOSED",
          exitPrice: currentPrice,
          realizedPnL: finalPnL,
          unrealizedPnL: 0,
          timestamp: new Date().toISOString()
        });

        // Cloud Account Update (only for non-broker simulation trades)
        if (!isBrokerRouted) {
          const accRef = doc(db, "paper_accounts", currentUser.uid);
          await updateDoc(accRef, {
            balance: finalBalance,
            realizedProfit: finalRealized,
            equity: finalBalance,
            marginUsed: 0,
            freeMargin: finalBalance
          });
        }
      } else {
        // Local Close
        const updatedOpen = positions.filter(p => p.id !== pos.id);
        setPositions(updatedOpen);
        localStorage.setItem("paper_trading_positions_v1", JSON.stringify(updatedOpen));

        const closedPos: PaperPosition = {
          ...pos,
          status: "CLOSED",
          exitPrice: currentPrice,
          realizedPnL: finalPnL,
          unrealizedPnL: 0,
          timestamp: new Date().toISOString()
        };

        const updatedHist = [closedPos, ...history];
        setHistory(updatedHist);
        localStorage.setItem("paper_trading_history_v1", JSON.stringify(updatedHist));

        if (!isBrokerRouted) {
          const updatedAcc = {
            balance: finalBalance,
            realizedProfit: finalRealized,
            equity: finalBalance,
            marginUsed: 0,
            freeMargin: finalBalance
          };
          setAccount(updatedAcc);
          localStorage.setItem("paper_trading_account_v1", JSON.stringify(updatedAcc));
        }
      }

      triggerNotification(`Closed trade ${pos.symbol} on ${brokerName} at ${currentPrice.toFixed(decimals)}. P&L: $${finalPnL >= 0 ? '+' : ''}${finalPnL}`, "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "paper_positions");
    }
  };

  // 2.5. CANCEL PENDING ORDER
  const handleCancelPendingOrder = async (pos: PaperPosition) => {
    try {
      const activeBroker = connectedBrokers.find(b => b.id === pos.brokerId);
      const isBrokerRouted = !!activeBroker;
      const brokerName = activeBroker ? activeBroker.name : "QuantIntel Simulation Desk";

      if (isBrokerRouted) {
        addTerminalLog(`Establishing SSL session with secure ${brokerName} gateway...`, "info");
        addTerminalLog(`Dispatching CANCEL pending order payload for Ticket #${pos.brokerTicket || "unknown"}`, "info");
        addTerminalLog(`API Payload: ${JSON.stringify({
          endpoint: "POST /v1/pending_orders/cancel",
          ticket: pos.brokerTicket,
          symbol: pos.symbol
        }, null, 2)}`, "info");
        addTerminalLog(`API Success! Pending order successfully deleted on ${brokerName}.`, "success");
      }

      if (currentUser) {
        const posRef = doc(db, "paper_positions", pos.id);
        await updateDoc(posRef, {
          status: "CLOSED",
          timestamp: new Date().toISOString()
        });
      } else {
        const updatedPending = pendingOrders.filter(p => p.id !== pos.id);
        setPendingOrders(updatedPending);
        localStorage.setItem("paper_trading_pending_v1", JSON.stringify(updatedPending));
      }

      triggerNotification(`Pending order for ${pos.symbol} was successfully cancelled.`, "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "paper_positions");
    }
  };

  // 3. ADJUST FUNDS & INITIALIZE STARTING CAPITAL
  const handleAdjustFunds = async (targetBalance: number) => {
    if (isNaN(targetBalance) || targetBalance <= 0) {
      triggerNotification("Please enter a valid positive capital amount.", "error");
      return;
    }

    const resetAcc = { 
      balance: targetBalance, 
      realizedProfit: 0, 
      equity: targetBalance, 
      marginUsed: 0, 
      freeMargin: targetBalance 
    };

    try {
      if (currentUser) {
        // Cloud Reset account
        const accRef = doc(db, "paper_accounts", currentUser.uid);
        await setDoc(accRef, {
          ...resetAcc,
          updatedAt: new Date().toISOString()
        });

        // Close all positions
        const openPositionsToDelete = [...positions];
        for (const pos of openPositionsToDelete) {
          const posRef = doc(db, "paper_positions", pos.id);
          await updateDoc(posRef, { status: "CLOSED", realizedPnL: 0, exitPrice: pos.entryPrice });
        }
      } else {
        setAccount(resetAcc);
        setPositions([]);
        setHistory([]);
        localStorage.setItem("paper_trading_account_v1", JSON.stringify(resetAcc));
        localStorage.setItem("paper_trading_positions_v1", JSON.stringify([]));
        localStorage.setItem("paper_trading_history_v1", JSON.stringify([]));
      }

      triggerNotification(`Paper Trading account successfully initialized to $${targetBalance.toLocaleString()}!`, "success");
      setCustomBalanceStr("");
      setShowAccountSettings(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "paper_accounts");
    }
  };

  const handleResetSimulator = async () => {
    if (!window.confirm("Are you sure you want to completely reset your paper trading simulator? All trades will be cleared.")) return;
    await handleAdjustFunds(100000);
  };

  // Compute stats for detailed Account Details Panel
  const totalTrades = history.length;
  const winTrades = history.filter(h => (h.realizedPnL || 0) > 0).length;
  const winRate = totalTrades > 0 ? Number(((winTrades / totalTrades) * 100).toFixed(1)) : 0;
  const totalUnrealizedPnL = positions.reduce((acc, p) => acc + (p.unrealizedPnL || 0), 0);
  const marginLevel = account.marginUsed > 0 ? (account.equity / account.marginUsed) * 100 : null;

  return (
    <div className="space-y-6" id="view-paper-trading">
      
      {/* REAL-TIME PORTFOLIO & DIAGNOSTICS HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
        
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase tracking-wider inline-flex items-center gap-1 border ${
                accountMode === "live"
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${accountMode === "live" ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
                {accountMode === "live" ? "Live Account Connected" : "Sandbox Demo Practice"}
              </span>
              <h2 className="text-base font-black text-white tracking-tight uppercase font-sans">
                {accountMode === "live" ? "Direct Live Trade Terminal" : "Paper Trading Simulator"}
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              {accountMode === "live"
                ? "Securely executing real orders via direct broker APIs. Performance logged live."
                : "Simulating live market executions. Practice trading strategies with zero risk using virtual capital."}
            </p>
          </div>

          {/* Account Mode Switcher Switch (Demo / Live) */}
          <div className="flex flex-wrap items-center gap-3.5">
            <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl self-stretch sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAccountMode("demo");
                  localStorage.setItem("paper_trading_account_mode_v1", "demo");
                  setSelectedBrokerId("simulation");
                  addTerminalLog("Switched terminal environment to DEMO Sandbox practice mode.", "info");
                }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono tracking-wider transition-all uppercase flex items-center gap-1.5 cursor-pointer ${
                  accountMode === "demo"
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Cpu className="h-3.5 w-3.5" />
                Practice Demo
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountMode("live");
                  localStorage.setItem("paper_trading_account_mode_v1", "live");
                  // Auto select first connected broker if available
                  const saved = localStorage.getItem("connected_brokers_list");
                  if (saved) {
                    try {
                      const list = JSON.parse(saved);
                      const active = list.filter((b: any) => b.connected);
                      if (active.length > 0) {
                        setSelectedBrokerId(active[0].id);
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  }
                  addTerminalLog("Switched terminal environment to LIVE direct-routing trade mode.", "warning");
                }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono tracking-wider transition-all uppercase flex items-center gap-1.5 cursor-pointer ${
                  accountMode === "live"
                    ? "bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Live Account
              </button>
            </div>

            {accountMode === "demo" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAccountSettings(!showAccountSettings)}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Configure Capital</span>
                </button>
                <button
                  onClick={handleResetSimulator}
                  className="px-3 py-1.5 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* COLLAPSIBLE STARTING CAPITAL SETTINGS */}
        {showAccountSettings && (
          <div className="mb-5 p-4 bg-slate-950/80 border border-slate-850 rounded-xl animate-fade-in space-y-3.5">
            <div>
              <span className="text-xs font-black text-slate-200 block uppercase tracking-wider font-mono">Initialize Starting Balance</span>
              <p className="text-[10px] text-slate-400 mt-1">
                Customize your demo account funds. Resetting or adjusting funds will settle and clear any active positions.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2">
              {[1000, 5000, 10000, 50000, 100000, 500000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleAdjustFunds(preset)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-blue-600 border border-slate-800 hover:border-blue-500 text-slate-300 hover:text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  ${preset.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="flex items-center gap-2 max-w-sm">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">$</span>
                <input
                  type="number"
                  placeholder="Enter custom starting capital"
                  value={customBalanceStr}
                  onChange={(e) => setCustomBalanceStr(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-7 pr-3 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => handleAdjustFunds(Number(customBalanceStr))}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black rounded-lg transition-all cursor-pointer shadow-md"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* ACCOUNT STATE METRICS BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* CARD 1: TOTAL ACCOUNT VALUE */}
          <div className="p-4 bg-slate-950/50 border border-slate-850 rounded-xl relative flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Account Equity</span>
              <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-black text-white block tracking-tight font-sans">
                ${account.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500 font-mono">
                <span>Settled Balance:</span>
                <span className="text-slate-300 font-bold">${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* CARD 2: REAL-TIME FLOATING P&L */}
          <div className="p-4 bg-slate-950/50 border border-slate-850 rounded-xl relative flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Floating P&L (Live)</span>
              <div className={`p-1.5 rounded-lg ${totalUnrealizedPnL >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400 animate-pulse"}`}>
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div>
              <span className={`text-2xl font-black block tracking-tight font-sans ${totalUnrealizedPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {totalUnrealizedPnL >= 0 ? "+" : ""}${totalUnrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500 font-mono">
                <span>Active Trades:</span>
                <span className="text-slate-300 font-bold">{positions.length} Positions</span>
              </div>
            </div>
          </div>

          {/* CARD 3: MARGIN RISK MONITOR */}
          <div className="p-4 bg-slate-950/50 border border-slate-850 rounded-xl relative flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Margin Health</span>
              <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-black text-white tracking-tight">
                  {marginLevel !== null ? `${marginLevel.toFixed(1)}%` : "∞"}
                </span>
                {marginLevel !== null && (
                  <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-black font-mono tracking-widest ${
                    marginLevel > 500 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : marginLevel >= 120 
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse"
                  }`}>
                    {marginLevel > 500 ? "SAFE" : marginLevel >= 120 ? "CAUTION" : "MARGIN CALL"}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1.5 mt-3 text-[9px] text-slate-500 font-mono">
                <div>Used: <span className="text-slate-300 font-bold">${account.marginUsed.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span></div>
                <div>Free: <span className="text-slate-300 font-bold">${account.freeMargin.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span></div>
              </div>
            </div>
          </div>

          {/* CARD 4: PERFORMANCE SUITE */}
          <div className="p-4 bg-slate-950/50 border border-slate-850 rounded-xl relative flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Win/Loss Ratio</span>
              <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                <Award className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-200 block tracking-tight font-sans">
                  {winRate}%
                </span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">Win Rate</span>
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500 font-mono">
                <span>Total Trades: <strong className="text-slate-300">{totalTrades}</strong></span>
                <span className={account.realizedProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {account.realizedProfit >= 0 ? "+" : ""}${account.realizedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* SECURITY & DEPLOYMENT SYNC BAR */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-1.5">
            <Shield className={`h-3.5 w-3.5 ${isPersistedCloud ? "text-emerald-400" : "text-amber-400"}`} />
            <span>
              {isPersistedCloud 
                ? `Secured Workspace: Active synchronization with Firestore for account ${currentUser?.email}`
                : "Demo Account Mode: positions are preserved in browser cache. Sign in to synchronize on-chain."
              }
            </span>
          </div>
          <span className="text-slate-600">LEVERAGE MODE: 1:100 max</span>
        </div>

      </div>

      {notification && (
        <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-bold border ${
          notification.type === "success" 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
            : notification.type === "error" 
              ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
        }`}>
          {notification.type === "success" ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: ORDER PANEL */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-blue-400" />
              Institutional Order Desk
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Gateway Active</span>
          </div>

          {/* Broker Auto-Routing Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-500 uppercase block">Execution Target Account</label>
            <select
              value={selectedBrokerId}
              onChange={(e) => setSelectedBrokerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
            >
              {accountMode === "demo" ? (
                <>
                  <option value="simulation">💻 QuantIntel Demo Sandbox (Simulation)</option>
                  <option disabled value="broker-locked">🔒 Live Brokers require Live Mode (Switch Above)</option>
                </>
              ) : (
                <>
                  {connectedBrokers.length === 0 ? (
                    <option value="simulation">⚠️ No Connected Live Broker Accounts Found</option>
                  ) : (
                    connectedBrokers.map((b) => (
                      <option key={b.id} value={b.id}>
                        ⚡ LIVE: {b.name} ({b.accountNo || "Direct API"})
                      </option>
                    ))
                  )}
                </>
              )}
            </select>
            {accountMode === "live" ? (
              connectedBrokers.length > 0 ? (
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-rose-400 mt-1.5 bg-rose-950/20 px-2 py-1 border border-rose-900/30 rounded">
                  <span className="h-1.5 w-1.5 bg-rose-500 rounded-full shrink-0 animate-pulse" />
                  <span>Real-time API Trade Routing is LIVE to {connectedBrokers.find(b => b.id === selectedBrokerId)?.name || connectedBrokers[0].name}. Use Caution!</span>
                </div>
              ) : (
                <div className="text-[9px] text-amber-400 font-mono mt-1.5 bg-amber-950/20 px-2.5 py-1.5 border border-amber-900/30 rounded-lg leading-normal">
                  ⚠️ <strong>Live Order Execution Locked:</strong> You have not connected an active real broker. Please contact support or configure API credentials in Settings.
                </div>
              )
            ) : (
              <p className="text-[9px] text-slate-500 font-mono mt-1">Executing in risk-free native Sandbox practice desk.</p>
            )}
          </div>

          {/* Quick asset display */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between">
            <div className="cursor-pointer" onClick={() => onSelectAsset(selectedAsset)}>
              <span className="text-xs font-black text-slate-200 block">{selectedAsset.symbol}</span>
              <span className="text-[9px] text-slate-500 block">{selectedAsset.name}</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold font-mono text-emerald-400 block">${selectedAsset.price}</span>
              <span className={`text-[9px] font-mono ${selectedAsset.changePercent >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {selectedAsset.changePercent >= 0 ? "+" : ""}{selectedAsset.changePercent}%
              </span>
            </div>
          </div>

          {/* Execution Type Selector */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-850">
            <button
              type="button"
              onClick={() => setExecutionMode("MARKET")}
              className={`py-1.5 text-[10px] font-bold font-mono rounded-lg transition-all cursor-pointer ${
                executionMode === "MARKET"
                  ? "bg-blue-600 text-white shadow-sm font-black"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Market Order
            </button>
            <button
              type="button"
              onClick={() => setExecutionMode("PENDING")}
              className={`py-1.5 text-[10px] font-bold font-mono rounded-lg transition-all cursor-pointer ${
                executionMode === "PENDING"
                  ? "bg-blue-600 text-white shadow-sm font-black"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Pending Order
            </button>
          </div>

          {executionMode === "PENDING" ? (
            /* Pending Order Options */
            <div className="space-y-3 p-3 bg-slate-950/40 border border-slate-850 rounded-xl animate-fade-in">
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-slate-500 uppercase block">Pending Type</label>
                <select
                  value={pendingOrderType}
                  onChange={(e) => setPendingOrderType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-mono font-bold text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="BUY_LIMIT">BUY LIMIT (Buy below market price)</option>
                  <option value="BUY_STOP">BUY STOP (Buy above market price)</option>
                  <option value="SELL_LIMIT">SELL LIMIT (Sell above market price)</option>
                  <option value="SELL_STOP">SELL STOP (Sell below market price)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-slate-500 uppercase block">Trigger Entry Price</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    placeholder={`Current: $${selectedAsset.price}`}
                    value={triggerPrice}
                    onChange={(e) => setTriggerPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Buy or Sell Buttons (Only for Market Execution) */
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrderType("BUY")}
                className={`py-2.5 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  orderType === "BUY"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 border border-emerald-500"
                    : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                BUY
              </button>
              <button
                type="button"
                onClick={() => setOrderType("SELL")}
                className={`py-2.5 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  orderType === "SELL"
                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20 border border-rose-500"
                    : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <TrendingDown className="h-4 w-4" />
                SELL
              </button>
            </div>
          )}

          {/* Volume Form */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-500 uppercase block">Trade Lots Size</label>
            <div className="relative">
              <input
                type="number"
                value={lotSize}
                onChange={(e) => setLotSize(Math.max(0.01, parseFloat(e.target.value) || 0))}
                step="0.01"
                min="0.01"
                max="100"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
              />
              <span className="absolute right-3 top-2.5 text-[9px] font-mono text-slate-500">1 Lot = 100K Units</span>
            </div>
          </div>

          {/* Leverage Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-slate-500 uppercase block">Leverage ratio</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 10, 50, 100].map((lev) => (
                <button
                  key={lev}
                  onClick={() => setSelectedLeverage(lev)}
                  className={`py-1.5 border rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                    selectedLeverage === lev
                      ? "bg-blue-600 text-white border-blue-500"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {lev}x
                </button>
              ))}
            </div>
          </div>

          {/* Stop Loss & Take Profit limits */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-500 uppercase block">Stop Loss</label>
              <input
                type="text"
                value={slPrice}
                onChange={(e) => setSlPrice(e.target.value)}
                placeholder="SL Price"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-rose-400 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-500 uppercase block">Take Profit</label>
              <input
                type="text"
                value={tpPrice}
                onChange={(e) => setTpPrice(e.target.value)}
                placeholder="TP Price"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Risk calculations summary with Pips & Financial PnL */}
          {(() => {
            const entryRef = executionMode === "PENDING" ? Number(triggerPrice) || selectedAsset.price : selectedAsset.price;
            const slNum = parseFloat(slPrice);
            const tpNum = parseFloat(tpPrice);

            const slMetrics = slPrice && !isNaN(slNum) ? calculateTradePnL({
              symbol: selectedAsset.symbol,
              category: selectedAsset.category,
              direction: orderType,
              entryPrice: entryRef,
              targetPrice: slNum,
              lotSize: lotSize,
              currency: selectedCurrency,
              accountBalanceUSD: account.balance / (selectedCurrency.rateToUSD || 1)
            }) : null;

            const tpMetrics = tpPrice && !isNaN(tpNum) ? calculateTradePnL({
              symbol: selectedAsset.symbol,
              category: selectedAsset.category,
              direction: orderType,
              entryPrice: entryRef,
              targetPrice: tpNum,
              lotSize: lotSize,
              currency: selectedCurrency,
              accountBalanceUSD: account.balance / (selectedCurrency.rateToUSD || 1)
            }) : null;

            const notionalUSD = entryRef * lotSize * (selectedAsset.category === "Forex" ? 100000 : 1);
            const marginUSD = notionalUSD / selectedLeverage;

            return (
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                    <Calculator className="h-3 w-3 text-emerald-400" />
                    Pips & PnL Estimate
                  </span>
                  <span className="text-[9px] text-emerald-400 font-bold bg-slate-900 px-1.5 py-0.5 rounded">
                    {selectedCurrency.flag} {selectedCurrency.code} ({selectedCurrency.symbol})
                  </span>
                </div>

                {/* SL / TP Live Metrics */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2 bg-rose-500/5 border border-rose-500/20 rounded-lg">
                    <span className="text-[9px] text-rose-400 font-bold block uppercase">Est. Risk (SL)</span>
                    {slMetrics ? (
                      <>
                        <span className="text-rose-400 font-bold block">{slMetrics.pips} Pips</span>
                        <span className="text-slate-200 font-bold block">
                          -{formatCurrencyAmount(slMetrics.pnlCurrency, selectedCurrency)} ({slMetrics.pnlPercentOfBalance.toFixed(1)}%)
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-600 block">Enter SL Price</span>
                    )}
                  </div>

                  <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                    <span className="text-[9px] text-emerald-400 font-bold block uppercase">Est. Target (TP)</span>
                    {tpMetrics ? (
                      <>
                        <span className="text-emerald-400 font-bold block">+{tpMetrics.pips} Pips</span>
                        <span className="text-slate-200 font-bold block">
                          +{formatCurrencyAmount(tpMetrics.pnlCurrency, selectedCurrency)} (+{tpMetrics.pnlPercentOfBalance.toFixed(1)}%)
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-600 block">Enter TP Price</span>
                    )}
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-900 space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Notional Exposure</span>
                    <span className="text-slate-300 font-bold">
                      {formatCurrencyAmount(notionalUSD * selectedCurrency.rateToUSD, selectedCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Margin Requirement</span>
                    <span className="text-slate-300 font-bold">
                      {formatCurrencyAmount(marginUSD * selectedCurrency.rateToUSD, selectedCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Execution Button */}
          <button
            onClick={handlePlaceOrder}
            className={`w-full py-3 rounded-xl font-black font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              executionMode === "PENDING"
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/10"
                : orderType === "BUY"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/10"
                  : "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/10"
            }`}
          >
            {executionMode === "PENDING" 
              ? `PLACE PENDING ORDER (${pendingOrderType.replace("_", " ")})`
              : `EXECUTE INSTANT ${orderType}`}
          </button>

          {/* Scrolling Terminal Console Logs */}
          <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-b border-slate-800 pb-1.5">
              <span className="flex items-center gap-1">⚡ SECURE GATEWAY CONSOLE</span>
              <span className="text-[8px] px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded">SSL</span>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1 font-mono text-[9px] leading-relaxed scrollbar-thin">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="text-slate-400 break-words font-medium">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: POSITIONS & HISTORY LEDGERS */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-3 mb-4">
              <button
                onClick={() => setActiveTab("positions")}
                className={`px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "positions"
                    ? "bg-blue-600 text-white shadow-md font-black"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Active Positions ({positions.length})
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "pending"
                    ? "bg-blue-600 text-white shadow-md font-black"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Pending Orders ({pendingOrders.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3.5 py-2 rounded-lg text-[11px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "history"
                    ? "bg-blue-600 text-white shadow-md font-black"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Ledger History ({history.length})
              </button>
            </div>

            {/* TAB 1: ACTIVE POSITIONS */}
            {activeTab === "positions" && (
              <div className="space-y-3">
                {positions.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs font-mono space-y-2">
                    <Clock className="h-8 w-8 mx-auto stroke-1.5 opacity-40 text-blue-400" />
                    <p>No active paper positions open at this moment.</p>
                    <p className="text-[10px]">Utilize the order panel on the left to initiate positions.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-800/80 text-slate-500 text-[10px] uppercase">
                          <th className="pb-2">Asset</th>
                          <th className="pb-2">Type</th>
                          <th className="pb-2">Lots</th>
                          <th className="pb-2">Entry Price</th>
                          <th className="pb-2">Current Price</th>
                          <th className="pb-2">P&L ($)</th>
                          <th className="pb-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {positions.map((pos) => {
                          const isProfit = pos.unrealizedPnL >= 0;
                          const activeBroker = connectedBrokers.find(b => b.id === pos.brokerId);
                          return (
                            <tr key={pos.id} className="hover:bg-slate-950/20">
                              <td className="py-3 pr-2">
                                <span className="font-extrabold text-slate-200 block">{pos.symbol}</span>
                                {pos.brokerId && pos.brokerId !== "simulation" ? (
                                  <span className="text-[8px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 rounded px-1 py-0.5 mt-0.5 inline-block max-w-full truncate font-black">
                                    ⚡ {activeBroker ? activeBroker.name : pos.brokerId.toUpperCase()} (#{pos.brokerTicket || "N/A"})
                                  </span>
                                ) : (
                                  <span className="text-[8.5px] text-slate-500 block">SIM Sandbox</span>
                                )}
                              </td>
                              <td className="py-3">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  pos.type === "BUY" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                }`}>
                                  {pos.type}
                                </span>
                              </td>
                              <td className="py-3 font-semibold text-slate-300">{pos.size}</td>
                              <td className="py-3 text-slate-300">${pos.entryPrice}</td>
                              <td className="py-3 text-slate-300">${pos.currentPrice}</td>
                              <td className={`py-3 font-extrabold ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                                {isProfit ? "+" : ""}${pos.unrealizedPnL.toLocaleString()}
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => handleClosePosition(pos)}
                                  className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 rounded text-[10px] font-bold cursor-pointer transition-all"
                                >
                                  Close
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 1.5: PENDING ORDERS */}
            {activeTab === "pending" && (
              <div className="space-y-3">
                {pendingOrders.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs font-mono space-y-2">
                    <Clock className="h-8 w-8 mx-auto stroke-1.5 opacity-40 text-blue-400" />
                    <p>No active pending orders logged at this moment.</p>
                    <p className="text-[10px]">Your limit and stop orders will trigger when the market price meets conditions.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-800/80 text-slate-500 text-[10px] uppercase">
                          <th className="pb-2">Asset</th>
                          <th className="pb-2">Pending Type</th>
                          <th className="pb-2">Lots</th>
                          <th className="pb-2">Trigger Price</th>
                          <th className="pb-2">Market Price</th>
                          <th className="pb-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {pendingOrders.map((pos) => {
                          const activeBroker = connectedBrokers.find(b => b.id === pos.brokerId);
                          return (
                            <tr key={pos.id} className="hover:bg-slate-950/20">
                              <td className="py-3 pr-2">
                                <span className="font-extrabold text-slate-200 block">{pos.symbol}</span>
                                {pos.brokerId && pos.brokerId !== "simulation" ? (
                                  <span className="text-[8px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 rounded px-1 py-0.5 mt-0.5 inline-block max-w-full truncate font-black">
                                    ⚡ {activeBroker ? activeBroker.name : pos.brokerId.toUpperCase()} (#{pos.brokerTicket || "N/A"})
                                  </span>
                                ) : (
                                  <span className="text-[8.5px] text-slate-500 block">SIM Sandbox</span>
                                )}
                              </td>
                              <td className="py-3">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-500/10 text-blue-400">
                                  {(pos.pendingType || pos.type).replace("_", " ")}
                                </span>
                              </td>
                              <td className="py-3 font-semibold text-slate-300">{pos.size}</td>
                              <td className="py-3 text-slate-300 font-extrabold">${pos.triggerPrice || pos.entryPrice}</td>
                              <td className="py-3 text-slate-400">${pos.currentPrice}</td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => handleCancelPendingOrder(pos)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-900/40 rounded text-[10px] font-bold cursor-pointer transition-all"
                                >
                                  Cancel
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: LEDGER HISTORY */}
            {activeTab === "history" && (
              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs font-mono space-y-2">
                    <BarChart3 className="h-8 w-8 mx-auto stroke-1.5 opacity-40 text-blue-400" />
                    <p>No realized trade history logged yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-800/80 text-slate-500 text-[10px] uppercase">
                          <th className="pb-2">Asset</th>
                          <th className="pb-2">Type</th>
                          <th className="pb-2">Lots</th>
                          <th className="pb-2">Entry</th>
                          <th className="pb-2">Exit</th>
                          <th className="pb-2 text-right">Realized P&L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {history.map((pos) => {
                          const isWin = (pos.realizedPnL ?? 0) >= 0;
                          const activeBroker = connectedBrokers.find(b => b.id === pos.brokerId);
                          return (
                            <tr key={pos.id} className="hover:bg-slate-950/20">
                              <td className="py-2.5">
                                <span className="font-extrabold text-slate-300 block">{pos.symbol}</span>
                                {pos.brokerId && pos.brokerId !== "simulation" ? (
                                  <span className="text-[7.5px] font-mono text-slate-500 block truncate">
                                    {activeBroker ? activeBroker.name : pos.brokerId.toUpperCase()}
                                  </span>
                                ) : (
                                  <span className="text-[7.5px] text-slate-500 block">SIM Sandbox</span>
                                )}
                              </td>
                              <td className="py-2.5">
                                <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                  pos.type === "BUY" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                }`}>
                                  {pos.type}
                                </span>
                              </td>
                              <td className="py-2.5 text-slate-400">{pos.size}</td>
                              <td className="py-2.5 text-slate-400">${pos.entryPrice}</td>
                              <td className="py-2.5 text-slate-400">${pos.exitPrice}</td>
                              <td className={`py-2.5 text-right font-extrabold ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                                {isWin ? "+" : ""}${pos.realizedPnL?.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
