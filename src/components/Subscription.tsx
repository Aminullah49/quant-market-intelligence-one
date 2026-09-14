import React, { useState } from "react";
import { Check, Flame, Cpu, ShieldCheck, Sparkles, Zap, DollarSign, Gift, Star, Award, Crown } from "lucide-react";

interface Plan {
  id: "explorer" | "pro" | "analyst" | "quantum" | "forever";
  name: string;
  price: string;
  billing: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
}

interface SubscriptionViewProps {
  currentPlan: string;
  onUpgrade: (planId: string) => void;
}

export default function SubscriptionView({ currentPlan, onUpgrade }: SubscriptionViewProps) {
  const [activePlan, setActivePlan] = useState<string>(currentPlan || "explorer");
  const [promoCode, setPromoCode] = useState("");
  const [promoSuccess, setPromoSuccess] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [billingCycle, setBillingCycle] = useState<"weekly" | "biweekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [upgradeNotification, setUpgradeNotification] = useState<string | null>(null);

  const DEFAULT_PRICES = {
    explorer: { weekly: 0, biweekly: 0, monthly: 0, quarterly: 0, yearly: 0 },
    pro: { weekly: 12, biweekly: 22, monthly: 39, quarterly: 99, yearly: 299 },
    analyst: { weekly: 25, biweekly: 45, monthly: 79, quarterly: 199, yearly: 599 },
    quantum: { weekly: 49, biweekly: 89, monthly: 149, quarterly: 379, yearly: 1199 },
    forever: { weekly: 99, biweekly: 189, monthly: 349, quarterly: 899, yearly: 2499 }
  };

  const [prices, setPrices] = useState<any>(() => {
    const saved = localStorage.getItem("subscription_prices");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_PRICES;
      }
    }
    return DEFAULT_PRICES;
  });

  React.useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem("subscription_prices");
      if (saved) {
        try {
          setPrices(JSON.parse(saved));
        } catch (e) {
          // ignore
        }
      }
    };
    window.addEventListener("storage_prices_changed", handleUpdate);
    return () => window.removeEventListener("storage_prices_changed", handleUpdate);
  }, []);

  const getPeriodText = (cycle: string) => {
    switch (cycle) {
      case "weekly": return "per week";
      case "biweekly": return "per bi-week";
      case "monthly": return "per month";
      case "quarterly": return "per quarter";
      case "yearly": return "per year";
      default: return "per month";
    }
  };

  const plans: Plan[] = [
    {
      id: "explorer",
      name: "Standard Explorer",
      price: "$0",
      billing: "Forever Free",
      description: "Essential tools for retail traders starting out with AI-assisted chart reading and risk estimation.",
      icon: <Sparkles className="h-5 w-5 text-slate-400" />,
      color: "border-slate-800 text-slate-400",
      bgGradient: "from-slate-900 to-slate-950",
      features: [
        "Interactive Candlestick Chart AI overlays",
        "Standard Forex, Stocks & Crypto Market assets",
        "Basic Risk Calculator and position size advice",
        "Time Intelligence active session clock",
        "Standard Trader DNA profile analyzer",
        "Local Journal & historical trade notebook",
      ],
    },
    {
      id: "pro",
      name: "Pioneer Pro Suite",
      price: `$${prices.pro?.[billingCycle] ?? DEFAULT_PRICES.pro[billingCycle]}`,
      billing: getPeriodText(billingCycle),
      description: "Advanced cognitive trading, unlimited pattern recognitions, real-time strategy labs, and custom alerts.",
      icon: <Zap className="h-5 w-5 text-emerald-400 animate-pulse" />,
      color: "border-emerald-500/30 text-emerald-400",
      bgGradient: "from-slate-900 via-emerald-950/10 to-slate-950",
      features: [
        "Everything in Explorer tier plus:",
        "Unlimited Real-time AI Candlestick Insight generation",
        "Backtesting Strategy Lab simulator with historical data",
        "Live pattern matching scanner & visual notifications",
        "High-density Global Market Heat Map",
        "Advanced Risk Multi-Tier Calculator",
        "Interactive Coaching Mentor Chat",
      ],
    },
    {
      id: "analyst",
      name: "Strategic Analyst",
      price: `$${prices.analyst?.[billingCycle] ?? DEFAULT_PRICES.analyst[billingCycle]}`,
      billing: getPeriodText(billingCycle),
      description: "Advanced macro yield metrics, fundamental sentiment tags, and automatic trend drawing engines.",
      isPopular: true,
      icon: <Award className="h-5 w-5 text-blue-400 animate-pulse" />,
      color: "border-blue-500/30 text-blue-400",
      bgGradient: "from-slate-900 via-blue-950/10 to-slate-950",
      features: [
        "Everything in Pioneer Pro tier plus:",
        "Dynamic AI trend line & auto support/resistance drawings",
        "Advanced macro yield metrics and central bank analysis",
        "Fundamental sentiment tags with multi-source tracking",
        "Predictive trade probability simulations",
        "Tailored risk recommendations for custom portfolios",
      ],
    },
    {
      id: "quantum",
      name: "Quantum Sovereign",
      price: `$${prices.quantum?.[billingCycle] ?? DEFAULT_PRICES.quantum[billingCycle]}`,
      billing: getPeriodText(billingCycle),
      description: "Priority API keys, proprietary quantum mathematical signals, and raw model logs.",
      icon: <Crown className="h-5 w-5 text-amber-400 animate-pulse" />,
      color: "border-amber-500/30 text-amber-400",
      bgGradient: "from-slate-900 via-amber-950/10 to-slate-950",
      features: [
        "Everything in Strategic Analyst plus:",
        "Priority bypass on heavy model latency periods",
        "Proprietary automated order block & liquidity level detection",
        "Exclusive multi-session institutional volume profile data",
        "Direct API webhook export for custom backtesting servers",
        "1-on-1 personal coaching customization",
        "Beta access to experimental machine learning indicators",
      ],
    },
    {
      id: "forever",
      name: "Subscribe Forever",
      price: `$${prices.forever?.[billingCycle] ?? DEFAULT_PRICES.forever[billingCycle]}`,
      billing: getPeriodText(billingCycle),
      description: "Infinite multi-broker institutional allocation, priority server node endpoints, and permanent AI mentorship.",
      icon: <Star className="h-5 w-5 text-rose-400 animate-pulse" />,
      color: "border-rose-500/30 text-rose-400",
      bgGradient: "from-slate-900 via-rose-950/10 to-slate-950",
      features: [
        "Everything in Quantum Sovereign plus:",
        "Permanent lifetime subscription access",
        "Dedicated super-node allocation for near-zero delay",
        "Corporate multi-broker API institutional bridge",
        "Full access to all future neural indicators & signal updates",
        "24/7 dedicated account manager and engineering support",
      ],
    },
  ];

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError("");
    setPromoSuccess(false);

    const cleanCode = promoCode.trim().toUpperCase();
    if (cleanCode === "QUANTUM" || cleanCode === "PRO30" || cleanCode === "ALPHA20") {
      setPromoSuccess(true);
      setPromoError("");
    } else {
      setPromoError("Invalid promo code. Please check spelling or verify availability.");
    }
  };

  const handleSelectPlan = (planId: string) => {
    onUpgrade(planId);
    setActivePlan(planId);
    setUpgradeNotification(`Plan upgraded successfully to ${planId.toUpperCase()}! Your premium limits have been unlocked.`);
    setTimeout(() => {
      setUpgradeNotification(null);
    }, 5000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Upper banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1">
          <div className="text-xs font-mono text-emerald-400 tracking-widest uppercase font-extrabold flex items-center gap-1">
            <Award className="h-4 w-4" />
            MEMBERSHIP ACCOUNT PANEL
          </div>
          <h2 className="text-2xl font-black text-white">
            Manage Plan Subscriptions
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
            Upgrade your trading system with unlimited AI analysis pools, live multi-market pattern scanning matrices, and dedicated computing cores.
          </p>
        </div>

         {/* Current Membership state card */}
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center gap-3 shrink-0">
          <div className="h-10 w-10 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center">
            {activePlan === "explorer" && <Sparkles className="h-5 w-5 text-slate-400" />}
            {activePlan === "pro" && <Zap className="h-5 w-5 text-emerald-400 animate-pulse" />}
            {activePlan === "analyst" && <Award className="h-5 w-5 text-blue-400" />}
            {activePlan === "quantum" && <Crown className="h-5 w-5 text-amber-400" />}
            {activePlan === "forever" && <Star className="h-5 w-5 text-rose-400 animate-pulse" />}
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-mono uppercase">CURRENT ACTIVE PLAN</div>
            <div className="text-sm font-black text-white flex items-center gap-1.5 capitalize">
              {activePlan}
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {upgradeNotification && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2 animate-pulse">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <span>{upgradeNotification}</span>
        </div>
      )}

      {/* 5-Interval Billing Cycle Selector */}
      <div className="flex justify-center">
        <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex flex-wrap justify-center items-center gap-1 font-mono text-xs">
          {[
            { id: "weekly", label: "Weekly" },
            { id: "biweekly", label: "Bi-Weekly" },
            { id: "monthly", label: "Monthly" },
            { id: "quarterly", label: "Quarterly" },
            { id: "yearly", label: "Yearly" },
          ].map((cycle) => (
            <button
              key={cycle.id}
              onClick={() => setBillingCycle(cycle.id as any)}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                billingCycle === cycle.id 
                  ? "bg-slate-950 text-white border border-slate-850 shadow-md font-black" 
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {cycle.label}
            </button>
          ))}
        </div>
      </div>

      {/* Plan Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {plans.map((plan) => {
          const isActive = activePlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`border rounded-2xl bg-gradient-to-b ${plan.bgGradient} p-5 relative flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-950/50 ${
                isActive 
                  ? "border-emerald-500 shadow-xl shadow-emerald-950/15" 
                  : plan.isPopular 
                  ? "border-emerald-500/40" 
                  : "border-slate-800"
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-mono text-[9px] font-black tracking-wider uppercase px-3.5 py-1 rounded-full shadow-md flex items-center gap-1 shrink-0 z-10 whitespace-nowrap">
                  <Flame className="h-3 w-3 fill-white" />
                  Most Popular
                </div>
              )}

              {isActive && (
                <div className="absolute -top-3 right-4 bg-slate-900 border border-emerald-500 text-emerald-400 font-mono text-[9px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full z-10">
                  Active
                </div>
              )}

              <div className="space-y-4">
                {/* Icon & Title */}
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                    {plan.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-black text-white leading-tight truncate">{plan.name}</h3>
                    <p className="text-[9px] text-slate-500 font-mono capitalize truncate">{plan.id} Tier</p>
                  </div>
                </div>

                {/* Price block */}
                <div className="flex items-baseline gap-1 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-2xl font-black text-white tracking-tight">{plan.price}</span>
                  <span className="text-[10px] text-slate-400 font-mono truncate">/ {plan.billing}</span>
                </div>

                <p className="text-[11px] text-slate-400 leading-normal min-h-[48px]">
                  {plan.description}
                </p>

                {/* Feature checklist */}
                <div className="space-y-2.5 pt-3 border-t border-slate-850">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Features:</span>
                  {plan.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2 text-[11px] text-slate-300 leading-tight">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-3 border-t border-slate-850">
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isActive}
                  className={`w-full py-2 rounded-xl font-mono text-[10px] font-extrabold uppercase transition-all tracking-wider cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-slate-400 border border-slate-800 cursor-default"
                      : plan.isPopular
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/20"
                      : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                  }`}
                >
                  {isActive ? "Currently Active" : plan.price === "$0" ? "Select Free tier" : "Upgrade System"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Promo Code Drawer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Gift className="h-4.5 w-4.5 text-rose-400" />
          Apply Corporate Promo / Referral Code
        </h3>
        
        <form onSubmit={handleApplyPromo} className="flex gap-2 max-w-md">
          <input
            type="text"
            placeholder="e.g. QUANTUM"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-mono text-white placeholder-slate-600 uppercase"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer"
          >
            Apply Code
          </button>
        </form>

        {promoSuccess && (
          <p className="text-xs text-emerald-400 mt-2.5 font-mono">
            ✔ Promo code applied! <strong>20% extra discount</strong> will be automatically credited to active subscription cycles.
          </p>
        )}
        {promoError && (
          <p className="text-xs text-rose-400 mt-2.5 font-mono">
            ✖ {promoError}
          </p>
        )}
      </div>

      {/* FAQ comparison block */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
          Security and Integration Policies
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Upgrade transitions occur instantly inside client-side containers. Subscriptions are billed through secured payment proxies. You can switch plans or downgrade to Standard Explorer at any point with zero penalties.
        </p>
      </div>

    </div>
  );
}
