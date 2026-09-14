import React, { useState, useEffect } from "react";
import { MarketAsset } from "../types";
import { 
  Building2, Layers, FileText, Database, Sparkles, Activity, 
  ArrowRight, RefreshCw, AlertTriangle, CheckCircle2, PlayCircle, 
  LineChart, Crosshair, ChevronRight, TrendingUp, TrendingDown, Clock, 
  ShieldAlert, Plus, Edit2, Trash2, Globe, ToggleLeft, ToggleRight, 
  Eye, MousePointer, Settings, Percent, Info, ExternalLink,
  DollarSign, Star, Crown, Zap, Award, Users, Check, Wallet, CreditCard, ArrowDownToLine,
  Code, Terminal, Cpu
} from "lucide-react";

export interface ApiConfig {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  apiKey: string;
  description: string;
  isActive: boolean;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  event: "trade_opened" | "payment_completed" | "user_registered" | "all";
  secret: string;
  isActive: boolean;
}

export interface CustomScript {
  id: string;
  name: string;
  placement: "header" | "footer" | "above_ads";
  code: string;
  isActive: boolean;
}

export interface AdCampaign {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  type: "banner" | "sidebar" | "banner-slim";
  provider: "custom" | "adsense";
  adSenseSlot?: string;
  isActive: boolean;
  targetPlan: "explorer" | "all";
  impressions: number;
  clicks: number;
}

const PRESET_APIS: ApiConfig[] = [
  {
    id: "api-gemini",
    name: "Gemini AI Inference Engine",
    provider: "Google GenAI SDK",
    endpoint: "https://generativelanguage.googleapis.com",
    apiKey: "AIzaSyD-812H_x9xxxxxxxxxxxxxx",
    description: "Powers cognitive market sweeps, trading sentiment classifiers, and automatic chart summaries.",
    isActive: true
  },
  {
    id: "api-stripe",
    name: "Stripe Live Gateway",
    provider: "Stripe SDK / REST",
    endpoint: "https://api.stripe.com/v1",
    apiKey: "sk_live_51O-p82n9xxxxxxxxxxxxx",
    description: "Processes subscription purchases and verifies billing checkout events.",
    isActive: true
  },
  {
    id: "api-coinbase",
    name: "Coinbase Commerce Pay",
    provider: "Coinbase API",
    endpoint: "https://api.commerce.coinbase.com",
    apiKey: "cc_api_3b8-9e10xxxxxxxxxxxxxx",
    description: "Enables cryptocurrency payment checkout options for Pro and Quantum subscriptions.",
    isActive: false
  }
];

const PRESET_WEBHOOKS: WebhookConfig[] = [
  {
    id: "wh-slack",
    name: "Slack Trade Notifications Bot",
    url: "https://hooks.slack.com/services/T00000/B00000/XXXXXXXXXXXXXXXXXXXXXXXX",
    event: "trade_opened",
    secret: "wh_sec_a8b9c1d2e3",
    isActive: true
  },
  {
    id: "wh-accounting",
    name: "Corporate Ledger Revenue Sync",
    url: "https://api.corp.aiquant.com/webhooks/revenue",
    event: "payment_completed",
    secret: "wh_sec_f5g6h7i8j9",
    isActive: true
  }
];

const PRESET_SCRIPTS: CustomScript[] = [
  {
    id: "sc-adsense",
    name: "Google AdSense Dynamic Auto Ads Code",
    placement: "above_ads",
    code: `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-430250614477814" crossorigin="anonymous"></script>`,
    isActive: true
  },
  {
    id: "sc-ga4",
    name: "Google Analytics 4 Global Header Tag",
    placement: "header",
    code: `<!-- Global GA4 Tracking script -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-9817263544"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', 'G-9817263544');\n</script>`,
    isActive: true
  }
];

const PRESET_ADS: AdCampaign[] = [
  {
    id: "apex-funding",
    title: "APEX TRADER FUNDING: 90% OFF SALE!",
    description: "Get funded up to $300,000. Low evaluation targets, direct payouts, and compatible with our broker connectors.",
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80",
    linkUrl: "https://apextraderfunding.com",
    type: "banner",
    provider: "custom",
    isActive: true,
    targetPlan: "explorer",
    impressions: 1245,
    clicks: 182
  },
  {
    id: "nord-vpn-trade",
    title: "Secure Your Trading Terminal with NordVPN",
    description: "Prevent malicious slip-streams, secure your API keys from DNS snooping, and reduce latency with trading-optimized VPN servers.",
    imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
    linkUrl: "https://nordvpn.com",
    type: "banner-slim",
    provider: "custom",
    isActive: true,
    targetPlan: "explorer",
    impressions: 890,
    clicks: 53
  },
  {
    id: "quantum-algo-bot",
    title: "Automate with Quantum Webhooks",
    description: "Connect our Quantum signals directly to Metatrader 5 or custom Python scripts with ultra-low latency.",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    linkUrl: "#upgrade",
    type: "sidebar",
    provider: "custom",
    isActive: true,
    targetPlan: "explorer",
    impressions: 512,
    clicks: 44
  }
];

export interface AdminAdsManagerProps {
  assets?: MarketAsset[];
  onUpdateAssets?: (newAssets: MarketAsset[]) => void;
}

export default function AdminAdsManager({ assets = [], onUpdateAssets }: AdminAdsManagerProps) {
  const [activeTab, setActiveTab] = useState<string>("ads");

  // --- MARKET ASSET MANAGEMENT STATES ---
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<string>("All");
  
  // Form states for adding/editing assets
  const [asSymbol, setAsSymbol] = useState("");
  const [asName, setAsName] = useState("");
  const [asCategory, setAsCategory] = useState<'Forex' | 'Crypto' | 'Stocks' | 'Commodities' | 'Indices'>('Crypto');
  const [asPrice, setAsPrice] = useState(0);
  const [asChangePercent, setAsChangePercent] = useState(0);
  const [asBullishProb, setAsBullishProb] = useState(50);
  const [asBearishProb, setAsBearishProb] = useState(30);
  const [asNeutralProb, setAsNeutralProb] = useState(20);
  const [asConfidence, setAsConfidence] = useState(75);
  const [asVolume24h, setAsVolume24h] = useState("");
  const [asLow24h, setAsLow24h] = useState(0);
  const [asHigh24h, setAsHigh24h] = useState(0);
  
  const [editingAssetSymbol, setEditingAssetSymbol] = useState<string | null>(null);
  const [assetSuccess, setAssetSuccess] = useState("");

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!asSymbol || !asName || !asVolume24h) {
      setAssetSuccess("Error: Symbol, Name, and Volume are required.");
      setTimeout(() => setAssetSuccess(""), 4000);
      return;
    }

    const totalProb = Number(asBullishProb) + Number(asBearishProb) + Number(asNeutralProb);
    if (totalProb !== 100) {
      setAssetSuccess("Error: Sentiments must sum exactly to 100%. Currently: " + totalProb + "%");
      setTimeout(() => setAssetSuccess(""), 5000);
      return;
    }

    const newAsset: MarketAsset = {
      symbol: asSymbol.trim(),
      name: asName.trim(),
      category: asCategory,
      price: Number(asPrice),
      changePercent: Number(asChangePercent),
      bullishProb: Number(asBullishProb),
      bearishProb: Number(asBearishProb),
      neutralProb: Number(asNeutralProb),
      confidence: Number(asConfidence),
      volume24h: asVolume24h.trim(),
      low24h: Number(asLow24h),
      high24h: Number(asHigh24h)
    };

    let updatedList: MarketAsset[];
    if (editingAssetSymbol) {
      updatedList = assets.map(a => a.symbol === editingAssetSymbol ? newAsset : a);
      setAssetSuccess("Asset updated successfully.");
    } else {
      if (assets.some(a => a.symbol.toLowerCase() === asSymbol.trim().toLowerCase())) {
        setAssetSuccess(`Error: Asset with symbol "${asSymbol}" already exists.`);
        setTimeout(() => setAssetSuccess(""), 4000);
        return;
      }
      updatedList = [...assets, newAsset];
      setAssetSuccess("New Asset added successfully.");
    }

    if (onUpdateAssets) {
      onUpdateAssets(updatedList);
    } else {
      localStorage.setItem("trader_market_assets", JSON.stringify(updatedList));
    }

    resetAssetForm();
    setTimeout(() => setAssetSuccess(""), 5000);
  };

  const handleEditAsset = (asset: MarketAsset) => {
    setEditingAssetSymbol(asset.symbol);
    setAsSymbol(asset.symbol);
    setAsName(asset.name);
    setAsCategory(asset.category);
    setAsPrice(asset.price);
    setAsChangePercent(asset.changePercent);
    setAsBullishProb(asset.bullishProb);
    setAsBearishProb(asset.bearishProb);
    setAsNeutralProb(asset.neutralProb);
    setAsConfidence(asset.confidence);
    setAsVolume24h(asset.volume24h);
    setAsLow24h(asset.low24h);
    setAsHigh24h(asset.high24h);
  };

  const handleDeleteAsset = (symbol: string) => {
    if (window.confirm(`Are you sure you want to delete asset "${symbol}"? This cannot be undone.`)) {
      const updatedList = assets.filter(a => a.symbol !== symbol);
      if (onUpdateAssets) {
        onUpdateAssets(updatedList);
      } else {
        localStorage.setItem("trader_market_assets", JSON.stringify(updatedList));
      }
      setAssetSuccess(`Asset "${symbol}" deleted.`);
      setTimeout(() => setAssetSuccess(""), 3000);
    }
  };

  const resetAssetForm = () => {
    setEditingAssetSymbol(null);
    setAsSymbol("");
    setAsName("");
    setAsCategory('Crypto');
    setAsPrice(0);
    setAsChangePercent(0);
    setAsBullishProb(50);
    setAsBearishProb(30);
    setAsNeutralProb(20);
    setAsConfidence(75);
    setAsVolume24h("");
    setAsLow24h(0);
    setAsHigh24h(0);
  };

  // --- USER MANAGEMENT STATES ---
  const [users, setUsers] = useState<any[]>([]);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userUsername, setUserUsername] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userPlan, setUserPlan] = useState("explorer");
  const [userTradingCapital, setUserTradingCapital] = useState(25000);
  const [userTradingStyle, setUserTradingStyle] = useState("Day Trader");
  const [userTimeframe, setUserTimeframe] = useState("H4");
  const [userSuccessMessage, setUserSuccessMessage] = useState("");

  // --- FINANCIALS & WITHDRAWAL STATES ---
  const [billingLedger, setBillingLedger] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("USDT-TRC20");
  const [withdrawDestination, setWithdrawDestination] = useState("");
  const [withdrawAccountType, setWithdrawAccountType] = useState<"Personal" | "Corporate">("Personal");
  const [withdrawSecretCode, setWithdrawSecretCode] = useState("");
  const [adminSecretCode, setAdminSecretCode] = useState(() => {
    return localStorage.getItem("admin_secret_code") || "123456";
  });
  const [withdrawSuccess, setWithdrawSuccess] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [isEditingWithdrawal, setIsEditingWithdrawal] = useState(false);
  const [editingWithdrawalId, setEditingWithdrawalId] = useState<string | null>(null);
  const [editingWithdrawalStatus, setEditingWithdrawalStatus] = useState("Completed");

  // --- TERMINAL SANDBOX STATES ---
  const [sandboxAsset, setSandboxAsset] = useState("EUR/USD");
  
  // --- DEVELOPER API, WEBHOOK & SCRIPT STATES ---
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [customScripts, setCustomScripts] = useState<CustomScript[]>([]);

  // API Form States
  const [apiName, setApiName] = useState("");
  const [apiProvider, setApiProvider] = useState("Google GenAI SDK");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [apiDescription, setApiDescription] = useState("");
  const [apiIsActive, setApiIsActive] = useState(true);
  const [editingApiId, setEditingApiId] = useState<string | null>(null);

  // Webhook Form States
  const [whName, setWhName] = useState("");
  const [whUrl, setWhUrl] = useState("");
  const [whEvent, setWhEvent] = useState<"trade_opened" | "payment_completed" | "user_registered" | "all">("all");
  const [whSecret, setWhSecret] = useState("");
  const [whIsActive, setWhIsActive] = useState(true);
  const [editingWhId, setEditingWhId] = useState<string | null>(null);

  // Script Form States
  const [scName, setScName] = useState("");
  const [scPlacement, setScPlacement] = useState<"header" | "footer" | "above_ads">("above_ads");
  const [scCode, setScCode] = useState("");
  const [scIsActive, setScIsActive] = useState(true);
  const [editingScId, setEditingScId] = useState<string | null>(null);

  // Webhook Tester Console States
  const [testWhId, setTestWhId] = useState("");
  const [testWhPayloadType, setTestWhPayloadType] = useState<"trade_opened" | "payment_completed" | "user_registered">("trade_opened");
  const [testConsoleLogs, setTestConsoleLogs] = useState<string[]>([]);
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);

  // Success/Error Feedback Messages
  const [apiSuccess, setApiSuccess] = useState("");
  const [whSuccess, setWhSuccess] = useState("");
  const [scSuccess, setScSuccess] = useState("");
  const [sandboxTimeframe, setSandboxTimeframe] = useState("H4");
  const [sandboxDirection, setSandboxDirection] = useState<"BUY" | "SELL">("BUY");
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<any>(null);

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

  const handlePriceChange = (planId: string, interval: string, value: number) => {
    setPrices((prev: any) => {
      const updated = {
        ...prev,
        [planId]: {
          ...prev[planId],
          [interval]: value
        }
      };
      localStorage.setItem("subscription_prices", JSON.stringify(updated));
      window.dispatchEvent(new Event("storage_prices_changed"));
      return updated;
    });
  };

  const handleResetPrices = () => {
    if (window.confirm("Are you sure you want to reset all subscription prices to factory defaults?")) {
      setPrices(DEFAULT_PRICES);
      localStorage.setItem("subscription_prices", JSON.stringify(DEFAULT_PRICES));
      window.dispatchEvent(new Event("storage_prices_changed"));
    }
  };

  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [monetizeFreeUsersOnly, setMonetizeFreeUsersOnly] = useState(true);
  const [adsenseEnabled, setAdsenseEnabled] = useState(false);
  const [adsensePublisherId, setAdsensePublisherId] = useState("pub-430250614477814");
  const [adsenseSlotId, setAdsenseSlotId] = useState("9817263544");
  
  // Create / Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [placementType, setPlacementType] = useState<"banner" | "sidebar" | "banner-slim">("banner");
  const [campaignProvider, setCampaignProvider] = useState<"custom" | "adsense">("custom");
  const [targetPlan, setTargetPlan] = useState<"explorer" | "all">("explorer");

  // Load configuration from local storage
  useEffect(() => {
    const savedCampaigns = localStorage.getItem("admin_ad_campaigns");
    if (savedCampaigns) {
      try {
        setCampaigns(JSON.parse(savedCampaigns));
      } catch (e) {
        setCampaigns(PRESET_ADS);
      }
    } else {
      setCampaigns(PRESET_ADS);
      localStorage.setItem("admin_ad_campaigns", JSON.stringify(PRESET_ADS));
    }

    const savedAdsenseEnabled = localStorage.getItem("adsense_enabled") === "true";
    setAdsenseEnabled(savedAdsenseEnabled);

    const savedFreeOnly = localStorage.getItem("monetize_free_only") !== "false";
    setMonetizeFreeUsersOnly(savedFreeOnly);

    const savedPubId = localStorage.getItem("adsense_pub_id");
    if (savedPubId) setAdsensePublisherId(savedPubId);

    const savedSlotId = localStorage.getItem("adsense_slot_id");
    if (savedSlotId) setAdsenseSlotId(savedSlotId);

    // Load registered user accounts
    const savedAccounts = localStorage.getItem("trader_registered_accounts");
    if (savedAccounts) {
      try {
        setUsers(JSON.parse(savedAccounts));
      } catch (e) {
        setUsers([]);
      }
    } else {
      const DEFAULT_ACCOUNTS = [
        {
          id: "u_ahmad",
          username: "ahmad",
          displayName: "Ahmad",
          email: "ahmad@aiquant.com",
          password: "password123",
          plan: "quantum",
          profile: {
            style: "Day Trader",
            timeframe: "H4",
            market: "Forex",
            riskTolerance: "Balanced",
            weakness: "Revenge trading/FOMO",
            leverage: 10,
            displayName: "Ahmad",
            tradingCapital: 25000,
            dailyGoalPercent: 2.5,
            experienceYears: 5,
            timezone: "GMT+3"
          }
        },
        {
          id: "u_sarah",
          username: "sarah",
          displayName: "Sarah",
          email: "sarah@aiquant.com",
          password: "password123",
          plan: "pro",
          profile: {
            style: "Scalper",
            timeframe: "M5",
            market: "Crypto",
            riskTolerance: "Aggressive",
            weakness: "Over-leveraging",
            leverage: 50,
            displayName: "Sarah",
            tradingCapital: 50000,
            dailyGoalPercent: 4.0,
            experienceYears: 3,
            timezone: "GMT-5"
          }
        },
        {
          id: "u_marcus",
          username: "marcus",
          displayName: "Marcus",
          email: "marcus@aiquant.com",
          password: "password123",
          plan: "analyst",
          profile: {
            style: "Position Trader",
            timeframe: "D1",
            market: "Stocks",
            riskTolerance: "Conservative",
            weakness: "Hesitancy/Fear of Loss",
            leverage: 2,
            displayName: "Marcus",
            tradingCapital: 150000,
            dailyGoalPercent: 0.5,
            experienceYears: 12,
            timezone: "GMT+1"
          }
        }
      ];
      setUsers(DEFAULT_ACCOUNTS);
      localStorage.setItem("trader_registered_accounts", JSON.stringify(DEFAULT_ACCOUNTS));
    }

    // Load Billing Ledger
    const savedBilling = localStorage.getItem("admin_billing_ledger");
    if (savedBilling) {
      try {
        setBillingLedger(JSON.parse(savedBilling));
      } catch (e) {
        setBillingLedger([]);
      }
    } else {
      const PRESET_BILLING = [
        {
          id: "bill-101",
          username: "ahmad",
          plan: "quantum",
          interval: "monthly",
          amount: 149,
          date: "2026-06-15",
          paymentMethod: "Stripe Checkout (Visa)",
          status: "Paid"
        },
        {
          id: "bill-102",
          username: "sarah",
          plan: "pro",
          interval: "quarterly",
          amount: 99,
          date: "2026-06-20",
          paymentMethod: "Coinbase Commerce (USDT)",
          status: "Paid"
        },
        {
          id: "bill-103",
          username: "marcus",
          plan: "analyst",
          interval: "yearly",
          amount: 599,
          date: "2026-06-24",
          paymentMethod: "Stripe Checkout (Mastercard)",
          status: "Paid"
        }
      ];
      setBillingLedger(PRESET_BILLING);
      localStorage.setItem("admin_billing_ledger", JSON.stringify(PRESET_BILLING));
    }

    // Load Withdrawals Ledger
    const savedWithdrawals = localStorage.getItem("admin_withdrawals_ledger");
    if (savedWithdrawals) {
      try {
        setWithdrawals(JSON.parse(savedWithdrawals));
      } catch (e) {
        setWithdrawals([]);
      }
    } else {
      const PRESET_WITHDRAWALS = [
        {
          id: "wd-201",
          amount: 150,
          method: "USDT-TRC20",
          destination: "T9zXv4p...h2G9d1e",
          accountType: "Corporate",
          date: "2026-06-25",
          status: "Completed",
          transactionHash: "0x82f9c1d63e90890a8a7dfdf430c9a721dfbc832"
        }
      ];
      setWithdrawals(PRESET_WITHDRAWALS);
      localStorage.setItem("admin_withdrawals_ledger", JSON.stringify(PRESET_WITHDRAWALS));
    }

    // Load API configurations
    const savedApis = localStorage.getItem("admin_api_configs");
    if (savedApis) {
      try {
        setApiConfigs(JSON.parse(savedApis));
      } catch (e) {
        setApiConfigs(PRESET_APIS);
      }
    } else {
      setApiConfigs(PRESET_APIS);
      localStorage.setItem("admin_api_configs", JSON.stringify(PRESET_APIS));
    }

    // Load Webhooks
    const savedWhs = localStorage.getItem("admin_webhook_configs");
    if (savedWhs) {
      try {
        setWebhooks(JSON.parse(savedWhs));
      } catch (e) {
        setWebhooks(PRESET_WEBHOOKS);
      }
    } else {
      setWebhooks(PRESET_WEBHOOKS);
      localStorage.setItem("admin_webhook_configs", JSON.stringify(PRESET_WEBHOOKS));
    }

    // Load Custom Scripts
    const savedScripts = localStorage.getItem("admin_custom_scripts");
    if (savedScripts) {
      try {
        setCustomScripts(JSON.parse(savedScripts));
      } catch (e) {
        setCustomScripts(PRESET_SCRIPTS);
      }
    } else {
      setCustomScripts(PRESET_SCRIPTS);
      localStorage.setItem("admin_custom_scripts", JSON.stringify(PRESET_SCRIPTS));
    }
  }, []);

  // Save changes helper
  const saveToLocalStorage = (updatedCampaigns: AdCampaign[]) => {
    setCampaigns(updatedCampaigns);
    localStorage.setItem("admin_ad_campaigns", JSON.stringify(updatedCampaigns));
    // Trigger storage event for reactive components
    window.dispatchEvent(new Event("storage_ads_changed"));
  };

  const handleToggleCampaign = (id: string) => {
    const updated = campaigns.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c);
    saveToLocalStorage(updated);
  };

  const handleSaveCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    let updated: AdCampaign[];
    if (editingId) {
      // Edit mode
      updated = campaigns.map(c => {
        if (c.id === editingId) {
          return {
            ...c,
            title,
            description,
            imageUrl: imageUrl || "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80",
            linkUrl,
            type: placementType,
            provider: campaignProvider,
            targetPlan,
          };
        }
        return c;
      });
    } else {
      // Add mode
      const newCampaign: AdCampaign = {
        id: "ad-" + Date.now(),
        title,
        description,
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80",
        linkUrl: linkUrl || "#",
        type: placementType,
        provider: campaignProvider,
        isActive: true,
        targetPlan,
        impressions: 0,
        clicks: 0
      };
      updated = [...campaigns, newCampaign];
    }

    saveToLocalStorage(updated);
    resetForm();
  };

  const handleDeleteCampaign = (id: string) => {
    const updated = campaigns.filter(c => c.id !== id);
    saveToLocalStorage(updated);
  };

  const handleStartEdit = (campaign: AdCampaign) => {
    setEditingId(campaign.id);
    setTitle(campaign.title);
    setDescription(campaign.description);
    setImageUrl(campaign.imageUrl);
    setLinkUrl(campaign.linkUrl);
    setPlacementType(campaign.type);
    setCampaignProvider(campaign.provider);
    setTargetPlan(campaign.targetPlan);
    setIsEditing(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setImageUrl("");
    setLinkUrl("");
    setPlacementType("banner");
    setCampaignProvider("custom");
    setTargetPlan("explorer");
    setIsEditing(false);
  };

  const handleToggleAdsense = () => {
    const newVal = !adsenseEnabled;
    setAdsenseEnabled(newVal);
    localStorage.setItem("adsense_enabled", String(newVal));
    window.dispatchEvent(new Event("storage_ads_changed"));
  };

  const handleToggleFreeOnly = () => {
    const newVal = !monetizeFreeUsersOnly;
    setMonetizeFreeUsersOnly(newVal);
    localStorage.setItem("monetize_free_only", String(newVal));
    window.dispatchEvent(new Event("storage_ads_changed"));
  };

  const handleSaveAdsenseSettings = () => {
    localStorage.setItem("adsense_pub_id", adsensePublisherId);
    localStorage.setItem("adsense_slot_id", adsenseSlotId);
    window.dispatchEvent(new Event("storage_ads_changed"));
    alert("AdSense configurations successfully synchronized with production slots!");
  };

  const handleResetMetrics = (id: string) => {
    const updated = campaigns.map(c => c.id === id ? { ...c, impressions: 0, clicks: 0 } : c);
    saveToLocalStorage(updated);
  };

  const handleLoadPresets = () => {
    saveToLocalStorage(PRESET_ADS);
  };

  // ==========================================
  // 1. USER ACCOUNTS CRUD CONTROLLERS
  // ==========================================
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUsername || !userDisplayName || !userEmail) {
      setUserSuccessMessage("Error: Missing required fields");
      return;
    }

    const savedAccounts = localStorage.getItem("trader_registered_accounts");
    let currentAccounts: any[] = [];
    try {
      currentAccounts = savedAccounts ? JSON.parse(savedAccounts) : [];
    } catch (err) {
      currentAccounts = [];
    }

    let updatedAccounts: any[];
    if (editingUserId) {
      // Edit User Mode
      updatedAccounts = currentAccounts.map(acc => {
        if (acc.id === editingUserId) {
          const updatedUser = {
            ...acc,
            username: userUsername.toLowerCase().trim(),
            displayName: userDisplayName.trim(),
            email: userEmail.trim(),
            password: userPassword || acc.password, // Keep password if empty
            plan: userPlan,
            profile: {
              ...(acc.profile || {}),
              displayName: userDisplayName.trim(),
              tradingCapital: Number(userTradingCapital),
              style: userTradingStyle,
              timeframe: userTimeframe,
            }
          };

          // If editing the currently logged in user, synchronize state instantly
          const activeUserStr = localStorage.getItem("current_trader_user");
          if (activeUserStr) {
            try {
              const activeUser = JSON.parse(activeUserStr);
              if (activeUser.id === editingUserId) {
                localStorage.setItem("current_trader_user", JSON.stringify(updatedUser));
                localStorage.setItem("trader_plan", userPlan);
                window.dispatchEvent(new Event("storage")); // Notify app to reload active session
              }
            } catch (err) {
              // ignore
            }
          }

          return updatedUser;
        }
        return acc;
      });
      setUserSuccessMessage("User account updated successfully!");
    } else {
      // Add User Mode
      // Check for duplicate username
      if (currentAccounts.some(acc => acc.username.toLowerCase() === userUsername.toLowerCase().trim())) {
        setUserSuccessMessage("Error: Username already exists.");
        return;
      }

      const newUserId = "u_" + Date.now();
      const newUser = {
        id: newUserId,
        username: userUsername.toLowerCase().trim(),
        displayName: userDisplayName.trim(),
        email: userEmail.trim(),
        password: userPassword || "password123",
        plan: userPlan,
        profile: {
          style: userTradingStyle,
          timeframe: userTimeframe,
          market: "Crypto",
          riskTolerance: "Balanced",
          weakness: "None",
          leverage: 10,
          displayName: userDisplayName.trim(),
          tradingCapital: Number(userTradingCapital),
          dailyGoalPercent: 1.5,
          experienceYears: 2,
          timezone: "GMT+3"
        }
      };
      updatedAccounts = [...currentAccounts, newUser];
      setUserSuccessMessage("New user account registered successfully!");
    }

    setUsers(updatedAccounts);
    localStorage.setItem("trader_registered_accounts", JSON.stringify(updatedAccounts));
    window.dispatchEvent(new Event("storage_users_changed")); // Reactive trigger
    resetUserForm();
    setTimeout(() => setUserSuccessMessage(""), 4000);
  };

  const handleStartEditUser = (user: any) => {
    setEditingUserId(user.id);
    setUserUsername(user.username);
    setUserDisplayName(user.displayName);
    setUserEmail(user.email);
    setUserPassword(user.password || "");
    setUserPlan(user.plan || "explorer");
    setUserTradingCapital(user.profile?.tradingCapital || 25000);
    setUserTradingStyle(user.profile?.style || "Day Trader");
    setUserTimeframe(user.profile?.timeframe || "H4");
    setIsEditingUser(true);
  };

  const handleDeleteUser = (id: string) => {
    if (id === "u_ahmad") {
      alert("System safeguard: Cannot delete Ahmad (primary workspace account).");
      return;
    }
    if (window.confirm("Are you sure you want to delete this user permanently?")) {
      const savedAccounts = localStorage.getItem("trader_registered_accounts");
      let currentAccounts: any[] = [];
      try {
        currentAccounts = savedAccounts ? JSON.parse(savedAccounts) : [];
      } catch (err) {
        // ignore
      }
      const updated = currentAccounts.filter(acc => acc.id !== id);
      setUsers(updated);
      localStorage.setItem("trader_registered_accounts", JSON.stringify(updated));
      window.dispatchEvent(new Event("storage_users_changed"));
      setUserSuccessMessage("User deleted successfully!");
      setTimeout(() => setUserSuccessMessage(""), 4000);
    }
  };

  const resetUserForm = () => {
    setEditingUserId(null);
    setUserUsername("");
    setUserDisplayName("");
    setUserEmail("");
    setUserPassword("");
    setUserPlan("explorer");
    setUserTradingCapital(25000);
    setUserTradingStyle("Day Trader");
    setUserTimeframe("H4");
    setIsEditingUser(false);
  };


  // ==========================================
  // 2. FINANCIAL WITHDRAWAL CONTROLLERS
  // ==========================================
  const calculateFinancialMetrics = () => {
    const totalCollected = billingLedger.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalWithdrawn = withdrawals
      .filter(wd => wd.status === "Completed")
      .reduce((sum, item) => sum + (item.amount || 0), 0);
    const availableBalance = totalCollected - totalWithdrawn;
    return { totalCollected, totalWithdrawn, availableBalance };
  };

  const handleCreateWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError("");
    setWithdrawSuccess("");

    if (withdrawSecretCode !== adminSecretCode) {
      setWithdrawError("Security validation failed. The entered Secret Verification Code is incorrect.");
      return;
    }

    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      setWithdrawError("Please enter a valid positive withdrawal amount.");
      return;
    }

    if (!withdrawDestination.trim()) {
      setWithdrawError("Please provide a valid destination address, PayPal email, or bank wire details.");
      return;
    }

    const { availableBalance } = calculateFinancialMetrics();
    if (amount > availableBalance) {
      setWithdrawError(`Insufficient balance. You only have $${availableBalance.toFixed(2)} available for withdrawal.`);
      return;
    }

    // Process Mock Gateway Settlement
    const newWd = {
      id: "wd-" + Date.now(),
      amount: amount,
      method: withdrawMethod,
      destination: withdrawDestination.trim(),
      accountType: withdrawAccountType,
      date: new Date().toISOString().split("T")[0],
      status: "Completed",
      transactionHash: "0x" + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join("")
    };

    const updated = [newWd, ...withdrawals];
    setWithdrawals(updated);
    localStorage.setItem("admin_withdrawals_ledger", JSON.stringify(updated));

    setWithdrawAmount("");
    setWithdrawDestination("");
    setWithdrawSecretCode("");
    setWithdrawSuccess(`Settlement successful! Transferred $${amount.toFixed(2)} via ${withdrawMethod} (${withdrawAccountType} Account). TXID registered.`);
    setTimeout(() => setWithdrawSuccess(""), 5000);
  };

  const handleStartEditWithdrawal = (wd: any) => {
    setEditingWithdrawalId(wd.id);
    setEditingWithdrawalStatus(wd.status);
    setIsEditingWithdrawal(true);
  };

  const handleSaveWithdrawalStatus = () => {
    if (!editingWithdrawalId) return;
    const updated = withdrawals.map(w => 
      w.id === editingWithdrawalId ? { ...w, status: editingWithdrawalStatus } : w
    );
    setWithdrawals(updated);
    localStorage.setItem("admin_withdrawals_ledger", JSON.stringify(updated));
    setIsEditingWithdrawal(false);
    setEditingWithdrawalId(null);
    setWithdrawSuccess("Withdrawal record status updated successfully.");
    setTimeout(() => setWithdrawSuccess(""), 4000);
  };

  const handleDeleteWithdrawal = (id: string) => {
    if (window.confirm("Are you sure you want to remove this transaction record from diagnostic logs?")) {
      const updated = withdrawals.filter(w => w.id !== id);
      setWithdrawals(updated);
      localStorage.setItem("admin_withdrawals_ledger", JSON.stringify(updated));
      setWithdrawSuccess("Transaction record removed successfully.");
      setTimeout(() => setWithdrawSuccess(""), 4000);
    }
  };


  // ==========================================
  // 3. API & WEBHOOK MATRIX ACTIONS
  // ==========================================
  
  // API Config Actions
  const handleSaveApi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiName || !apiEndpoint || !apiKeyValue) {
      setApiSuccess("Error: Please fill in all required fields.");
      setTimeout(() => setApiSuccess(""), 4000);
      return;
    }

    let updated: ApiConfig[];
    if (editingApiId) {
      updated = apiConfigs.map(api => 
        api.id === editingApiId 
          ? { ...api, name: apiName, provider: apiProvider, endpoint: apiEndpoint, apiKey: apiKeyValue, description: apiDescription, isActive: apiIsActive }
          : api
      );
      setApiSuccess("API Configuration updated successfully.");
    } else {
      const newApi: ApiConfig = {
        id: "api-" + Math.random().toString(36).substring(2, 9),
        name: apiName,
        provider: apiProvider,
        endpoint: apiEndpoint,
        apiKey: apiKeyValue,
        description: apiDescription || "Custom integrated API channel connector.",
        isActive: apiIsActive
      };
      updated = [newApi, ...apiConfigs];
      setApiSuccess("New API Configuration registered successfully.");
    }

    setApiConfigs(updated);
    localStorage.setItem("admin_api_configs", JSON.stringify(updated));
    resetApiForm();
    setTimeout(() => setApiSuccess(""), 5000);
  };

  const handleEditApi = (api: ApiConfig) => {
    setEditingApiId(api.id);
    setApiName(api.name);
    setApiProvider(api.provider);
    setApiEndpoint(api.endpoint);
    setApiKeyValue(api.apiKey);
    setApiDescription(api.description);
    setApiIsActive(api.isActive);
  };

  const handleDeleteApi = (id: string) => {
    if (window.confirm("Are you sure you want to delete this API Configuration?")) {
      const updated = apiConfigs.filter(api => api.id !== id);
      setApiConfigs(updated);
      localStorage.setItem("admin_api_configs", JSON.stringify(updated));
      setApiSuccess("API configuration removed.");
      setTimeout(() => setApiSuccess(""), 3000);
    }
  };

  const toggleApiActive = (id: string) => {
    const updated = apiConfigs.map(api => api.id === id ? { ...api, isActive: !api.isActive } : api);
    setApiConfigs(updated);
    localStorage.setItem("admin_api_configs", JSON.stringify(updated));
  };

  const resetApiForm = () => {
    setEditingApiId(null);
    setApiName("");
    setApiProvider("Google GenAI SDK");
    setApiEndpoint("");
    setApiKeyValue("");
    setApiDescription("");
    setApiIsActive(true);
  };

  // Webhook Actions
  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName || !whUrl) {
      setWhSuccess("Error: Name and Target Endpoint URL are required.");
      setTimeout(() => setWhSuccess(""), 4000);
      return;
    }

    let updated: WebhookConfig[];
    if (editingWhId) {
      updated = webhooks.map(wh => 
        wh.id === editingWhId 
          ? { ...wh, name: whName, url: whUrl, event: whEvent, secret: whSecret, isActive: whIsActive }
          : wh
      );
      setWhSuccess("Webhook Configuration updated successfully.");
    } else {
      const newWh: WebhookConfig = {
        id: "wh-" + Math.random().toString(36).substring(2, 9),
        name: whName,
        url: whUrl,
        event: whEvent,
        secret: whSecret || "wh_sec_" + Math.random().toString(36).substring(2, 8),
        isActive: whIsActive
      };
      updated = [newWh, ...webhooks];
      setWhSuccess("New webhook handler successfully deployed.");
    }

    setWebhooks(updated);
    localStorage.setItem("admin_webhook_configs", JSON.stringify(updated));
    resetWebhookForm();
    setTimeout(() => setWhSuccess(""), 5000);
  };

  const handleEditWebhook = (wh: WebhookConfig) => {
    setEditingWhId(wh.id);
    setWhName(wh.name);
    setWhUrl(wh.url);
    setWhEvent(wh.event);
    setWhSecret(wh.secret);
    setWhIsActive(wh.isActive);
  };

  const handleDeleteWebhook = (id: string) => {
    if (window.confirm("Are you sure you want to delete this webhook connector?")) {
      const updated = webhooks.filter(wh => wh.id !== id);
      setWebhooks(updated);
      localStorage.setItem("admin_webhook_configs", JSON.stringify(updated));
      setWhSuccess("Webhook connector removed.");
      setTimeout(() => setWhSuccess(""), 3000);
    }
  };

  const toggleWebhookActive = (id: string) => {
    const updated = webhooks.map(wh => wh.id === id ? { ...wh, isActive: !wh.isActive } : wh);
    setWebhooks(updated);
    localStorage.setItem("admin_webhook_configs", JSON.stringify(updated));
  };

  const resetWebhookForm = () => {
    setEditingWhId(null);
    setWhName("");
    setWhUrl("");
    setWhEvent("all");
    setWhSecret("");
    setWhIsActive(true);
  };

  // Script Actions
  const handleSaveScript = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scName || !scCode) {
      setScSuccess("Error: Script Label and Raw Script Code block are required.");
      setTimeout(() => setScSuccess(""), 4000);
      return;
    }

    let updated: CustomScript[];
    if (editingScId) {
      updated = customScripts.map(sc => 
        sc.id === editingScId 
          ? { ...sc, name: scName, placement: scPlacement, code: scCode, isActive: scIsActive }
          : sc
      );
      setScSuccess("Custom Script Code updated successfully.");
    } else {
      const newSc: CustomScript = {
        id: "sc-" + Math.random().toString(36).substring(2, 9),
        name: scName,
        placement: scPlacement,
        code: scCode,
        isActive: scIsActive
      };
      updated = [newSc, ...customScripts];
      setScSuccess("New custom code/adsense snippet injected.");
    }

    setCustomScripts(updated);
    localStorage.setItem("admin_custom_scripts", JSON.stringify(updated));
    
    // Dispatch event to allow index/html pages to reactive-mount if required
    window.dispatchEvent(new CustomEvent("custom_script_injected", { detail: updated }));
    resetScriptForm();
    setTimeout(() => setScSuccess(""), 5000);
  };

  const handleEditScript = (sc: CustomScript) => {
    setEditingScId(sc.id);
    setScName(sc.name);
    setScPlacement(sc.placement);
    setScCode(sc.code);
    setScIsActive(sc.isActive);
  };

  const handleDeleteScript = (id: string) => {
    if (window.confirm("Are you sure you want to delete this code segment? It will be purged from index buffers.")) {
      const updated = customScripts.filter(sc => sc.id !== id);
      setCustomScripts(updated);
      localStorage.setItem("admin_custom_scripts", JSON.stringify(updated));
      setScSuccess("Script code segment removed.");
      setTimeout(() => setScSuccess(""), 3000);
    }
  };

  const toggleScriptActive = (id: string) => {
    const updated = customScripts.map(sc => sc.id === id ? { ...sc, isActive: !sc.isActive } : sc);
    setCustomScripts(updated);
    localStorage.setItem("admin_custom_scripts", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("custom_script_injected", { detail: updated }));
  };

  const resetScriptForm = () => {
    setEditingScId(null);
    setScName("");
    setScPlacement("above_ads");
    setScCode("");
    setScIsActive(true);
  };

  // Webhook Tester Actions
  const handleRunWebhookSimulation = () => {
    if (!testWhId) {
      alert("Please select a target webhook endpoint to test.");
      return;
    }
    const wh = webhooks.find(w => w.id === testWhId);
    if (!wh) return;

    setIsSimulatingWebhook(true);
    setTestConsoleLogs([]);

    const timestamp = new Date().toISOString();
    const mockId = "evt_" + Math.random().toString(36).substring(2, 10);
    let mockBody = {};

    if (testWhPayloadType === "trade_opened") {
      mockBody = {
        id: mockId,
        event: "trade.opened",
        timestamp,
        data: {
          asset: "BTC/USD",
          direction: "BUY",
          entry: 67250.45,
          leverage: "50x",
          stopLoss: 66800.0,
          takeProfit: 68500.0,
          trader: "ahmad"
        }
      };
    } else if (testWhPayloadType === "payment_completed") {
      mockBody = {
        id: mockId,
        event: "payment.completed",
        timestamp,
        data: {
          invoice: "bill-982173",
          username: "jane_smith",
          plan: "quantum",
          interval: "monthly",
          amount: 149.0,
          method: "Stripe Checkout",
          status: "Paid"
        }
      };
    } else {
      mockBody = {
        id: mockId,
        event: "user.registered",
        timestamp,
        data: {
          userId: "u_trader_48912",
          username: "scalpmaster_x",
          email: "master@scalpers.net",
          style: "Scalper",
          capital: 10000.0,
          timestamp
        }
      };
    }

    const addLog = (msg: string, delay: number) => {
      setTimeout(() => {
        setTestConsoleLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
      }, delay);
    };

    addLog(`Initiating HTTP POST transaction vector to Webhook Endpoint: "${wh.name}"...`, 100);
    addLog(`Target Endpoint URL: ${wh.url}`, 400);
    addLog(`Calculating dynamic cryptographic signature (HMAC-SHA256) using Secret Key...`, 800);
    
    // Generate simulated HMAC signature
    const signature = "sha256=" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("");
    addLog(`Signed Payload. X-Aiquant-Signature: ${signature.substring(0, 24)}...`, 1200);
    addLog(`Formulating standard JSON request headers:`, 1500);
    addLog(`> Host: ${new URL(wh.url || "https://api.remote.com").host}`, 1600);
    addLog(`> Content-Type: application/json`, 1700);
    addLog(`> X-Aiquant-Event: ${testWhPayloadType}`, 1800);
    addLog(`Dispatching raw JSON body payload stream (${JSON.stringify(mockBody).length} bytes)...`, 2100);
    addLog(`JSON Payload:\n${JSON.stringify(mockBody, null, 2)}`, 2400);
    addLog(`Waiting for response callback from target gateway listener...`, 2900);
    
    setTimeout(() => {
      addLog(`[SUCCESS] HTTP status 200 OK received from server.`, 3500);
      addLog(`Response body size: 12 bytes | Server-parsed status: true`, 3700);
      addLog(`Process completed. Sync stream closed.`, 4000);
      setTimeout(() => {
        setIsSimulatingWebhook(false);
      }, 4100);
    }, 500);
  };


  // ==========================================
  // 4. TERMINAL SANDBOX CONTROLLER
  // ==========================================
  const handleRunSandboxAnalysis = () => {
    setSandboxLoading(true);
    setSandboxResult(null);

    setTimeout(() => {
      const basePrice = sandboxAsset.includes("BTC") ? 64230 : sandboxAsset.includes("ETH") ? 3420 : sandboxAsset.includes("EUR") ? 1.0854 : sandboxAsset.includes("Gold") ? 4084.50 : 155.80;
      const isBuy = sandboxDirection === "BUY";
      
      const tpOffset = basePrice * (isBuy ? 0.024 : -0.024);
      const slOffset = basePrice * (isBuy ? -0.012 : 0.012);
      
      const decimals = basePrice < 10 ? 4 : 2;

      setSandboxResult({
        asset: sandboxAsset,
        timeframe: sandboxTimeframe,
        direction: sandboxDirection,
        confidence: Math.floor(Math.random() * 15) + 75, // 75-90%
        entryZone: `${basePrice.toFixed(decimals)} - ${(basePrice * (isBuy ? 1.002 : 0.998)).toFixed(decimals)}`,
        takeProfit: (basePrice + tpOffset).toFixed(decimals),
        stopLoss: (basePrice + slOffset).toFixed(decimals),
        rrRatio: "1:2.0",
        sentiment: isBuy ? "EXTREMELY BULLISH" : "EXTREMELY BEARISH",
        patterns: [
          { name: "Order Block Mitigation", type: "Structure Change", strength: "High" },
          { name: "Fair Value Gap (FVG)", type: "Inefficiency", strength: "Medium" }
        ],
        supportLevels: [(basePrice * 0.99).toFixed(decimals), (basePrice * 0.985).toFixed(decimals)],
        resistanceLevels: [(basePrice * 1.01).toFixed(decimals), (basePrice * 1.015).toFixed(decimals)],
        aiReasoning: `Identified significant institutional liquidity sweep at lower boundaries. The ${sandboxTimeframe} market structure shifted to a short-term ${sandboxDirection === "BUY" ? "Expansion" : "Distribution"} leg. Technical indicators like RSI are currently signaling dynamic consolidation with bullish divergence.`
      });
      setSandboxLoading(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER HERO */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-emerald-400 tracking-wider uppercase mb-1 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            MONETIZATION PANEL & ADS MANAGEMENT
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Publisher Control Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Place native corporate banner campaigns, integrate third-party Google AdSense tags, track active impressions/clicks, and restrict ads display to Free users.
          </p>
        </div>

        <button
          onClick={handleLoadPresets}
          className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reload Preset Ads</span>
        </button>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex flex-wrap bg-slate-950 border border-slate-800 p-1 rounded-xl gap-1">
        <button
          onClick={() => setActiveTab("ads")}
          className={`flex-1 min-w-[130px] py-2 text-xs font-mono font-black uppercase rounded-lg tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
            activeTab === "ads"
              ? "bg-emerald-600 text-white shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Globe className="h-4 w-4" />
          Monetization & Ads
        </button>
        <button
          onClick={() => setActiveTab("pricing")}
          className={`flex-1 min-w-[130px] py-2 text-xs font-mono font-black uppercase rounded-lg tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
            activeTab === "pricing"
              ? "bg-emerald-600 text-white shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="h-4 w-4" />
          Plans & Pricing
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex-1 min-w-[130px] py-2 text-xs font-mono font-black uppercase rounded-lg tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
            activeTab === "users"
              ? "bg-emerald-600 text-white shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="h-4 w-4" />
          Users Control
        </button>
        <button
          onClick={() => setActiveTab("withdrawals")}
          className={`flex-1 min-w-[130px] py-2 text-xs font-mono font-black uppercase rounded-lg tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
            activeTab === "withdrawals"
              ? "bg-emerald-600 text-white shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Wallet className="h-4 w-4" />
          Financials & Withdraw
        </button>
        <button
          onClick={() => setActiveTab("sandbox")}
          className={`flex-1 min-w-[130px] py-2 text-xs font-mono font-black uppercase rounded-lg tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
            activeTab === "sandbox"
              ? "bg-emerald-600 text-white shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <PlayCircle className="h-4 w-4" />
          Terminal Sandbox
        </button>
        <button
          onClick={() => setActiveTab("apis")}
          className={`flex-1 min-w-[130px] py-2 text-xs font-mono font-black uppercase rounded-lg tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
            activeTab === "apis"
              ? "bg-emerald-600 text-white shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Code className="h-4 w-4" />
          APIs & Webhooks
        </button>
        <button
          onClick={() => setActiveTab("assets")}
          className={`flex-1 min-w-[130px] py-2 text-xs font-mono font-black uppercase rounded-lg tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
            activeTab === "assets"
              ? "bg-emerald-600 text-white shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Database className="h-4 w-4" />
          Assets Manager
        </button>
      </div>

      {activeTab === "ads" && (
        /* CORE MONETIZATION CONTROLS */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left column: Ads parameters and settings */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* General Targeting Rules */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
                <Settings className="h-4 w-4 text-emerald-400" />
                Targeting Parameters
              </h3>

              <div className="space-y-4 text-xs font-mono">
                {/* Toggle 1: Free Users Only */}
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-850">
                  <div>
                    <span className="text-white font-bold block">Free Users Only</span>
                    <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">Show ads only on Explorer tier (Pro & Quantum are ad-free).</span>
                  </div>
                  <button 
                    onClick={handleToggleFreeOnly}
                    className="text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer"
                  >
                    {monetizeFreeUsersOnly ? (
                      <ToggleRight className="h-8 w-8 text-emerald-500 fill-emerald-500/10" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-slate-600" />
                    )}
                  </button>
                </div>

                {/* Toggle 2: Google AdSense Sync */}
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-850">
                  <div>
                    <span className="text-white font-bold block">Google AdSense</span>
                    <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">Activate third-party Google AdSense placeholders on ad containers.</span>
                  </div>
                  <button 
                    onClick={handleToggleAdsense}
                    className="text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer"
                  >
                    {adsenseEnabled ? (
                      <ToggleRight className="h-8 w-8 text-emerald-500 fill-emerald-500/10" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-slate-600" />
                    )}
                  </button>
                </div>

                {/* AdSense configuration variables */}
                {adsenseEnabled && (
                  <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-lg space-y-3">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">AdSense Tags Config</span>
                    
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Publisher ID (ca-pub-):</label>
                        <input 
                          type="text" 
                          value={adsensePublisherId}
                          onChange={(e) => setAdsensePublisherId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 focus:border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                          placeholder="pub-xxxxxxxxxxxxxxxx"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Default Banner Ad Slot:</label>
                        <input 
                          type="text" 
                          value={adsenseSlotId}
                          onChange={(e) => setAdsenseSlotId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 focus:border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                          placeholder="xxxxxxxxxx"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveAdsenseSettings}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] transition-all cursor-pointer"
                    >
                      Synchronize Script Parameters
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats overview */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 font-mono text-xs">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-emerald-400" />
                Campaign Performance Tally
              </h3>
              
              <div className="grid grid-cols-2 gap-2 text-center pt-1">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                  <span className="text-[9px] text-slate-500 block uppercase">Total Impressions</span>
                  <span className="text-base font-black text-white">
                    {campaigns.reduce((sum, c) => sum + c.impressions, 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                  <span className="text-[9px] text-slate-500 block uppercase">Total Clicks</span>
                  <span className="text-base font-black text-emerald-400">
                    {campaigns.reduce((sum, c) => sum + c.clicks, 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg text-[10px] text-slate-400 leading-normal flex items-start gap-1.5">
                <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Free tier users see active banners on the Chart AI, Dashboard sidebar and Trade Setup screens. Higher plans automatically suppress these.</span>
              </div>
            </div>

          </div>

          {/* Right column: Form and Custom campaigns builder */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Create or Edit Banner Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="h-4.5 w-4.5 text-emerald-400" />
                  {isEditing ? "Modify Ad Campaign Settings" : "Deploy New Custom Banner Ad"}
                </h3>
                {isEditing && (
                  <button 
                    onClick={resetForm}
                    className="text-[10px] font-mono text-slate-500 hover:text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-850"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveCampaign} className="space-y-4 font-mono text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 block mb-1">Ad Title / Sponsor Heading:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Trader Funding - 90% Off Sale"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 text-white rounded-lg px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="text-slate-400 block mb-1">Placement Screen Target:</label>
                    <select
                      value={placementType}
                      onChange={(e: any) => setPlacementType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 text-white rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="banner">Standard Banner (Main panel headers)</option>
                      <option value="banner-slim">Slim Banner (Footer / Content partitions)</option>
                      <option value="sidebar">Square Card Ad (Dashboard & Sidebar)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Ad Content description:</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Describe the promotion clearly. Traders will click this description to buy or claim benefits."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 text-white rounded-lg px-3 py-2 text-xs focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 block mb-1">Banner Image URL (Unsplash or direct asset):</label>
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 text-white rounded-lg px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Destination Target Link URL:</label>
                    <input
                      type="text"
                      placeholder="https://yourpartner.com/track?id=..."
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 text-white rounded-lg px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Show on user plans:</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                        <input 
                          type="radio" 
                          name="plan"
                          checked={targetPlan === 'explorer'}
                          onChange={() => setTargetPlan('explorer')}
                          className="accent-emerald-500"
                        />
                        <span>Explorer (Free Only)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                        <input 
                          type="radio" 
                          name="plan"
                          checked={targetPlan === 'all'}
                          onChange={() => setTargetPlan('all')}
                          className="accent-emerald-500"
                        />
                        <span>All Plans (Forced Monetize)</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-end justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg text-xs uppercase tracking-wide shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{isEditing ? "Apply Ad Changes" : "Create & Place Ad Campaign"}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Active Campaigns Management List */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                Active Campaigns Directory
              </h3>

              {campaigns.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-mono text-xs space-y-2">
                  <ShieldAlert className="h-8 w-8 text-slate-600 mx-auto" />
                  <p>No active ad campaigns currently placed.</p>
                  <button 
                    onClick={handleLoadPresets}
                    className="px-3 py-1 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-300 rounded text-[11px]"
                  >
                    Load Pre-configured Campaigns
                  </button>
                </div>
              ) : (
                <div className="space-y-3 font-mono text-xs">
                  {campaigns.map((ad) => (
                    <div key={ad.id} className="p-4 bg-slate-950 border border-slate-850 rounded-xl flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex gap-3">
                        {/* Miniature thumbnail preview */}
                        <img 
                          src={ad.imageUrl} 
                          alt="" 
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded object-cover border border-slate-800 shrink-0" 
                        />
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white leading-snug">{ad.title}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                              ad.type === 'banner' 
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                : ad.type === 'banner-slim' 
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {ad.type.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-normal line-clamp-2 max-w-xl">{ad.description}</p>
                          <div className="text-[10px] text-slate-500 flex items-center gap-3.5 pt-1 flex-wrap">
                            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Impressions: {ad.impressions}</span>
                            <span className="flex items-center gap-1"><MousePointer className="h-3.5 w-3.5" /> Clicks: {ad.clicks}</span>
                            <span>Plan: <strong className="text-slate-300 capitalize">{ad.targetPlan}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Actions and toggle */}
                      <div className="flex md:flex-col items-end justify-between md:justify-center gap-2 shrink-0 border-t md:border-t-0 border-slate-850 pt-2.5 md:pt-0">
                        {/* Active status */}
                        <button 
                          onClick={() => handleToggleCampaign(ad.id)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                            ad.isActive 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-slate-900 text-slate-500 border-slate-800'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${ad.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                          <span>{ad.isActive ? "ACTIVE" : "PAUSED"}</span>
                        </button>

                        {/* Modify/Delete actions */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleStartEdit(ad)}
                            title="Edit Campaign Details"
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800 transition-all cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleResetMetrics(ad.id)}
                            title="Reset click stats"
                            className="p-1.5 bg-slate-900 hover:bg-emerald-950/40 text-slate-400 hover:text-emerald-400 rounded border border-slate-800 transition-all cursor-pointer font-bold text-[9px]"
                          >
                            0%
                          </button>
                          <button
                            onClick={() => handleDeleteCampaign(ad.id)}
                            title="Delete Campaign"
                            className="p-1.5 bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded border border-slate-800 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {activeTab === "pricing" && (
        /* SUBSCRIPTION PLAN MATRIX EDITOR (5 LEVELS, 5 INTERVALS) */
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-emerald-400" />
                  Global Subscription Pricing Matrix (5x5)
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Configure live client-facing price metrics. Updates made below save instantly and synchronize with the 5-Level Subscription Hub in real-time.
                </p>
              </div>
              <button
                onClick={handleResetPrices}
                className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300 text-xs font-mono rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset to Default Prices</span>
              </button>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2.5 text-xs text-emerald-400 font-mono">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Real-time Sync Active:</span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Changing any price automatically triggers an event propagating updates to the trading dashboard's upgrade system. Zero-priced intervals denote a free option.
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Row Tiers */}
          <div className="space-y-4">
            {[
              {
                id: "explorer",
                name: "Standard Explorer (Level 1)",
                description: "Forever-free retail plan covering standard technical overlays, risk calculators, and standard charts.",
                icon: <Sparkles className="h-5 w-5 text-slate-400" />,
                locked: true,
              },
              {
                id: "pro",
                name: "Pioneer Pro (Level 2)",
                description: "Cognitive AI modules, pattern scanners, and full local trade notebook persistence.",
                icon: <Zap className="h-5 w-5 text-emerald-400 animate-pulse" />,
                locked: false,
              },
              {
                id: "analyst",
                name: "Strategic Analyst (Level 3)",
                description: "Advanced macro yield metrics, fundamental sentiment tags, and automatic trend drawing engines.",
                icon: <Award className="h-5 w-5 text-blue-400" />,
                locked: false,
              },
              {
                id: "quantum",
                name: "Sovereign Quantum (Level 4)",
                description: "Institutional bypass routes, proprietary order flow block indicators, and live direct webhooks.",
                icon: <Crown className="h-5 w-5 text-amber-400" />,
                locked: false,
              },
              {
                id: "forever",
                name: "Subscribe Forever (Level 5)",
                description: "Infinite institutional allocation, priority nodes, and permanent lifetime AI mentorship.",
                icon: <Star className="h-5 w-5 text-rose-400 animate-pulse" />,
                locked: false,
              },
            ].map((pDef) => (
              <div 
                key={pDef.id} 
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg transition-all hover:border-slate-700/80"
              >
                <div className="flex items-start gap-3.5 border-b border-slate-850 pb-3">
                  <div className="h-10 w-10 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center shrink-0">
                    {pDef.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      {pDef.name}
                      {pDef.locked && (
                        <span className="bg-slate-950 border border-slate-800 text-slate-500 font-mono text-[9px] px-2 py-0.5 rounded-full font-black uppercase">
                          Free Baseline Tier
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-400 leading-normal mt-0.5">{pDef.description}</p>
                  </div>
                </div>

                {/* Grid of 5 Interval Prices */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 pt-1">
                  {[
                    { label: "Weekly Price", key: "weekly" },
                    { label: "Bi-Weekly Price", key: "biweekly" },
                    { label: "Monthly Price", key: "monthly" },
                    { label: "Quarterly Price", key: "quarterly" },
                    { label: "Yearly Price", key: "yearly" },
                  ].map((interval) => {
                    const priceVal = prices[pDef.id]?.[interval.key] ?? 0;
                    return (
                      <div key={interval.key} className="space-y-1.5 font-mono text-xs">
                        <label className="text-slate-500 text-[10px] block font-bold uppercase tracking-wider">
                          {interval.label}
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 font-bold">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            disabled={pDef.locked}
                            value={priceVal}
                            onChange={(e) => {
                              const v = Math.max(0, parseFloat(e.target.value) || 0);
                              handlePriceChange(pDef.id, interval.key, v);
                            }}
                            className={`w-full bg-slate-950 border text-white font-bold rounded-lg pl-6 pr-3.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 transition-all ${
                              pDef.locked 
                                ? "opacity-50 border-slate-850 cursor-not-allowed" 
                                : "border-slate-800"
                            }`}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* 3. USERS MANAGEMENT TAB                 */}
      {/* ======================================= */}
      {activeTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* User Registration Form: Left 5 columns */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 self-start">
            <div className="border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                {isEditingUser ? "Edit User Credentials" : "Register New Trader Account"}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                {isEditingUser 
                  ? "Update passwords, active plan levels, style and capital structures for this existing profile." 
                  : "Introduce customized trading profiles immediately into the platform's user directory."}
              </p>
            </div>

            {userSuccessMessage && (
              <div className={`p-3 rounded-lg text-xs font-mono font-bold border ${
                userSuccessMessage.includes("Error") 
                  ? "bg-rose-950/40 border-rose-900/40 text-rose-400" 
                  : "bg-emerald-950/40 border-emerald-900/40 text-emerald-400"
              }`}>
                {userSuccessMessage}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5 text-xs">
                  <label className="text-slate-400 block font-mono font-bold uppercase tracking-wider text-[10px]">Username</label>
                  <input
                    type="text"
                    required
                    disabled={isEditingUser}
                    value={userUsername}
                    onChange={(e) => setUserUsername(e.target.value)}
                    placeholder="e.g. janesmith"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none placeholder:text-slate-600 disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5 text-xs">
                  <label className="text-slate-400 block font-mono font-bold uppercase tracking-wider text-[10px]">Display Name</label>
                  <input
                    type="text"
                    required
                    value={userDisplayName}
                    onChange={(e) => setUserDisplayName(e.target.value)}
                    placeholder="e.g. Jane S."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-slate-400 block font-mono font-bold uppercase tracking-wider text-[10px]">Email Address</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="e.g. jane@aiquant.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-slate-400 block font-mono font-bold uppercase tracking-wider text-[10px]">
                  Password {isEditingUser && <span className="text-slate-500">(Leave blank to keep unchanged)</span>}
                </label>
                <input
                  type="password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none placeholder:text-slate-600"
                />
              </div>

              <div className="border-t border-slate-800/60 pt-3.5 space-y-4">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Trading & Subscription Parameters</span>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5 text-xs">
                    <label className="text-slate-400 block font-mono font-bold uppercase tracking-wider text-[10px]">Active Plan</label>
                    <select
                      value={userPlan}
                      onChange={(e) => setUserPlan(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none transition-all"
                    >
                      <option value="explorer">Standard Explorer (L1)</option>
                      <option value="pro">Pioneer Pro (L2)</option>
                      <option value="analyst">Strategic Analyst (L3)</option>
                      <option value="quantum">Sovereign Quantum (L4)</option>
                      <option value="forever">Lifetime Subscribe (L5)</option>
                      <option value="admin">System Administrator</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <label className="text-slate-400 block font-mono font-bold uppercase tracking-wider text-[10px]">Trading Capital ($)</label>
                    <input
                      type="number"
                      value={userTradingCapital}
                      onChange={(e) => setUserTradingCapital(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5 text-xs">
                    <label className="text-slate-400 block font-mono font-bold uppercase tracking-wider text-[10px]">Trading Style</label>
                    <select
                      value={userTradingStyle}
                      onChange={(e) => setUserTradingStyle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none transition-all"
                    >
                      <option value="Day Trader">Day Trader</option>
                      <option value="Scalper">Scalper</option>
                      <option value="Swing Trader">Swing Trader</option>
                      <option value="Position Trader">Position Trader</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <label className="text-slate-400 block font-mono font-bold uppercase tracking-wider text-[10px]">Primary Timeframe</label>
                    <select
                      value={userTimeframe}
                      onChange={(e) => setUserTimeframe(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none transition-all"
                    >
                      <option value="M5">M5 (5 min)</option>
                      <option value="M15">M15 (15 min)</option>
                      <option value="H1">H1 (1 hour)</option>
                      <option value="H4">H4 (4 hours)</option>
                      <option value="D1">D1 (Daily)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                {isEditingUser && (
                  <button
                    type="button"
                    onClick={resetUserForm}
                    className="flex-1 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-300 text-xs font-mono rounded-lg uppercase font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono rounded-lg uppercase font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isEditingUser ? "Update Profile" : "Register Account"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Users Database List: Right 7 columns */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Platform User Ledger ({users.length})</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Edit credentials, elevate subscription plan tiers, or terminate user registrations in real-time.</p>
                </div>
                <div className="bg-slate-950 px-2.5 py-1 border border-slate-850 rounded text-[10px] font-mono text-emerald-400 font-bold">
                  DATABASE: ACTIVE
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {users.length === 0 ? (
                  <div className="p-6 bg-slate-950 border border-slate-850 rounded-xl text-center text-slate-500 text-xs font-mono">
                    ⚠️ No user records located in local storage index.
                  </div>
                ) : (
                  users.map((u) => {
                    const isActiveSession = localStorage.getItem("current_trader_user") && 
                      JSON.parse(localStorage.getItem("current_trader_user")!).id === u.id;
                    
                    return (
                      <div 
                        key={u.id}
                        className={`p-4 bg-slate-950 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-800 ${
                          isActiveSession ? "border-emerald-500/40 shadow-md shadow-emerald-950/20" : "border-slate-850"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white font-mono">{u.displayName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">(@{u.username})</span>
                            {isActiveSession && (
                              <span className="bg-emerald-950/60 border border-emerald-900/50 text-emerald-400 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded">
                                ACTIVE SESSION
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono leading-relaxed">
                            <p>Email: <span className="text-slate-300">{u.email}</span></p>
                            <p>Capital: <span className="text-emerald-400">${Number(u.profile?.tradingCapital || 0).toLocaleString()}</span> | Style: <span className="text-slate-300">{u.profile?.style || "Unset"} ({u.profile?.timeframe || "Unset"})</span></p>
                          </div>
                          <div className="pt-1.5 flex items-center gap-1.5">
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                              u.plan === "quantum" 
                                ? "bg-amber-950/40 border-amber-900/40 text-amber-400" 
                                : u.plan === "pro" 
                                ? "bg-emerald-950/40 border-emerald-900/40 text-emerald-400" 
                                : u.plan === "analyst" 
                                ? "bg-blue-950/40 border-blue-900/40 text-blue-400" 
                                : u.plan === "forever" 
                                ? "bg-rose-950/40 border-rose-900/40 text-rose-400" 
                                : u.plan === "admin" 
                                ? "bg-purple-950/40 border-purple-900/40 text-purple-400" 
                                : "bg-slate-900 border-slate-800 text-slate-400"
                            }`}>
                              {(u.plan || "Explorer").toUpperCase()}
                            </span>
                            <span className="text-[9.5px] font-mono text-slate-500">
                              Pass: <code className="text-slate-400 font-bold">{u.password || "password123"}</code>
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleStartEditUser(u)}
                            className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-lg hover:text-emerald-400 transition-all cursor-pointer"
                            title="Edit Account Details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={isActiveSession || u.id === "u_ahmad"}
                            className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-500 hover:text-rose-400 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isActiveSession ? "Cannot delete currently active account" : "Delete Account"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ======================================= */}
      {/* 4. FINANCIALS & WITHDRAWAL MATRIX TAB   */}
      {/* ======================================= */}
      {activeTab === "withdrawals" && (
        <div className="space-y-6">
          
          {/* Top Row Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Total Collected Revenue</span>
                <span className="text-xl font-bold font-mono text-white">${calculateFinancialMetrics().totalCollected.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <ArrowDownToLine className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Total Settled (Withdrawn)</span>
                <span className="text-xl font-bold font-mono text-white">${calculateFinancialMetrics().totalWithdrawn.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Available Vault Balance</span>
                <span className="text-xl font-bold font-mono text-emerald-400">${calculateFinancialMetrics().availableBalance.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Stepper Explanation: How Subscription Payments are Collected */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800 flex items-center gap-2">
                <CreditCard className="h-4.5 w-4.5 text-emerald-400" />
                How Subscription Payments Are Collected
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                The platform is pre-engineered to safely process user credit card and cryptocurrency transactions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg space-y-1">
                <span className="font-mono text-emerald-400 font-bold uppercase tracking-wider text-[10px]">Step 1: Plan Selection</span>
                <p className="text-slate-400 leading-normal text-[11px]">
                  User chooses Pro, Analyst, or Quantum tier inside the **Subscription Hub**, selecting a billing timeframe (Weekly, Monthly, Quarterly, Yearly).
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg space-y-1">
                <span className="font-mono text-emerald-400 font-bold uppercase tracking-wider text-[10px]">Step 2: Payment Processing</span>
                <p className="text-slate-400 leading-normal text-[11px]">
                  Vite/React triggers a secure checkout sequence connecting to **Stripe Checkout API** (fiat cards, Apple Pay) or **Coinbase Commerce** / **Crypto Pay** wallets.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg space-y-1">
                <span className="font-mono text-emerald-400 font-bold uppercase tracking-wider text-[10px]">Step 3: Webhook Verification</span>
                <p className="text-slate-400 leading-normal text-[11px]">
                  Upon settlement, secure background server webhooks verify the transaction hash or card receipt, instantly elevating the user's account permissions.
                </p>
              </div>
            </div>
          </div>

          {/* Grid: Withdraw Funds Form & Logs Ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Withdraw form */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 self-start">
              <div className="border-b border-slate-800 pb-2.5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <ArrowDownToLine className="h-4.5 w-4.5 text-emerald-400" />
                  Request Fund Withdrawal
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Transfer accumulated vault subscription revenues directly to your personal corporate account or web3 wallet.</p>
              </div>

              {withdrawSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 text-xs font-mono rounded-lg leading-relaxed">
                  {withdrawSuccess}
                </div>
              )}

              {withdrawError && (
                <div className="p-3 bg-rose-950/40 border border-rose-900/40 text-rose-400 text-xs font-mono rounded-lg leading-relaxed">
                  {withdrawError}
                </div>
              )}

              <form onSubmit={handleCreateWithdrawal} className="space-y-4 font-mono text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Withdrawal Network / Gateway</label>
                  <select
                    value={withdrawMethod}
                    onChange={(e) => setWithdrawMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none transition-all text-xs"
                  >
                    <option value="USDT-TRC20">USDT (Tron Network - Fast Settlement)</option>
                    <option value="BTC Network">BTC (Native Blockchain Network)</option>
                    <option value="PayPal Gateway">PayPal Business (Email Transfer)</option>
                    <option value="Wire Settlement">Corporate Bank Wire (SWIFT Transfer)</option>
                  </select>
                </div>

                {/* Account Type Selector for Bank/Corporate Payouts */}
                <div className="space-y-1.5 bg-slate-950/40 p-2.5 border border-slate-850 rounded-lg">
                  <label className="text-slate-400 block font-bold uppercase tracking-wider text-[10px] mb-1">Destination Account Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 font-mono text-xs select-none">
                      <input
                        type="radio"
                        name="withdrawAccountType"
                        value="Personal"
                        checked={withdrawAccountType === "Personal"}
                        onChange={() => setWithdrawAccountType("Personal")}
                        className="accent-emerald-500 cursor-pointer h-3.5 w-3.5"
                      />
                      Personal Account
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 font-mono text-xs select-none">
                      <input
                        type="radio"
                        name="withdrawAccountType"
                        value="Corporate"
                        checked={withdrawAccountType === "Corporate"}
                        onChange={() => setWithdrawAccountType("Corporate")}
                        className="accent-emerald-500 cursor-pointer h-3.5 w-3.5"
                      />
                      Corporate Account
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Destination Address / Email / IBAN</label>
                  <input
                    type="text"
                    required
                    value={withdrawDestination}
                    onChange={(e) => setWithdrawDestination(e.target.value)}
                    placeholder="e.g. TRb9zXv4p...h2G9d1e or accounts@corp.com"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none placeholder:text-slate-600 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Withdrawal Amount ($)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="e.g. 250.00"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white font-bold rounded-lg pl-6 pr-3.5 py-1.5 text-xs focus:outline-none placeholder:text-slate-600"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 leading-normal block">
                    Available limit: <span className="text-emerald-400 font-bold">${calculateFinancialMetrics().availableBalance.toFixed(2)}</span>. Min payout is $1.00. Zero administrative fees apply.
                  </span>
                </div>

                {/* Secret Verification Code Input */}
                <div className="space-y-1.5 border-t border-slate-850 pt-3">
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Secret Verification Code</label>
                    <span className="text-[9.5px] text-slate-500">
                      Current Code: <code className="text-emerald-400 font-bold font-mono">{adminSecretCode}</code>
                    </span>
                  </div>
                  <input
                    type="password"
                    required
                    value={withdrawSecretCode}
                    onChange={(e) => setWithdrawSecretCode(e.target.value)}
                    placeholder="Enter 6-digit Secret Security Code to authorize"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none placeholder:text-slate-600 font-mono"
                  />
                  <p className="text-[10.5px] text-slate-500 leading-normal">
                    This extra cryptographic validation prevents accidental or unapproved corporate capital drain.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
                >
                  <Wallet className="h-4 w-4" />
                  <span>Execute Settlement Transfer</span>
                </button>
              </form>

              {/* Secret Code Configuration Settings inside the Admin Box */}
              <div className="mt-4 p-3 bg-slate-950 border border-slate-850 rounded-lg space-y-2 text-xs font-mono">
                <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider block">🔒 SECURITY GATEWAY CREDENTIALS</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={adminSecretCode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdminSecretCode(val);
                      localStorage.setItem("admin_secret_code", val);
                    }}
                    placeholder="e.g. 123456"
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 text-white rounded px-2.5 py-1 text-xs focus:outline-none"
                  />
                </div>
                <p className="text-[9.5px] text-slate-500 leading-tight">
                  Modify the field above to instantly customize the active authorization code for all sandbox payout transfers.
                </p>
              </div>

              {/* Status Update Modal/Block if currently editing a transaction */}
              {isEditingWithdrawal && (
                <div className="mt-4 p-4 bg-slate-950 border border-amber-900/40 rounded-xl space-y-3 font-mono text-xs">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                    <AlertTriangle className="h-4 w-4 animate-bounce" />
                    Modify Transaction Record Status
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-400 block font-bold uppercase text-[9px]">Record Status</label>
                    <select
                      value={editingWithdrawalStatus}
                      onChange={(e) => setEditingWithdrawalStatus(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none"
                    >
                      <option value="Completed">Completed</option>
                      <option value="Processing">Processing</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingWithdrawal(false)}
                      className="flex-1 py-1 bg-slate-900 border border-slate-800 text-slate-400 rounded text-[11px] font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveWithdrawalStatus}
                      className="flex-1 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold"
                    >
                      Save Status
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Financial Ledger Lists */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Collected Subscriptions Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="pb-3 border-b border-slate-800 mb-3">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">SUBSCRIBER INVOICE AUDIT LOGS</span>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono mt-0.5">Paid Subscriptions</h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider text-[9px]">
                        <th className="py-2">Date</th>
                        <th className="py-2">User</th>
                        <th className="py-2">Plan Details</th>
                        <th className="py-2 text-right">Amount</th>
                        <th className="py-2 text-right">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {billingLedger.map((b) => (
                        <tr key={b.id} className="text-[11px] text-slate-300 hover:bg-slate-950/20">
                          <td className="py-2.5 text-slate-500">{b.date}</td>
                          <td className="py-2.5 font-bold text-white">@{b.username}</td>
                          <td className="py-2.5">
                            <span className="text-emerald-400 capitalize">{b.plan}</span>
                            <span className="text-slate-500 text-[10px] block font-mono">({b.interval})</span>
                          </td>
                          <td className="py-2.5 text-right font-bold text-white">${Number(b.amount).toFixed(2)}</td>
                          <td className="py-2.5 text-right text-slate-400 text-[10px]">{b.paymentMethod || "Stripe"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Withdrawals Logs */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="pb-3 border-b border-slate-800 mb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">SETTLED OUTFLOW ARCHIVES</span>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono mt-0.5">Withdrawal Ledger</h4>
                  </div>
                  <span className="text-[8px] font-mono font-bold bg-slate-950 text-slate-500 px-1.5 py-0.5 rounded border border-slate-850 uppercase">
                    Blockchain sync
                  </span>
                </div>

                <div className="space-y-2.5">
                  {withdrawals.length === 0 ? (
                    <div className="p-4 text-center bg-slate-950 border border-slate-850 rounded-xl text-slate-500 text-xs font-mono">
                      No withdrawal requests logged yet.
                    </div>
                  ) : (
                    withdrawals.map((w) => (
                      <div key={w.id} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between gap-4 font-mono text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">${Number(w.amount).toFixed(2)}</span>
                            <span className="text-slate-500 text-[10px]">({w.date})</span>
                            <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                              w.status === "Completed" 
                                ? "bg-emerald-950/40 border-emerald-900/40 text-emerald-400" 
                                : w.status === "Processing" 
                                ? "bg-blue-950/40 border-blue-900/40 text-blue-400" 
                                : "bg-rose-950/40 border-rose-900/40 text-rose-400"
                            }`}>
                              {w.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 leading-normal">
                            <p>Method: <span className="text-white">{w.method}</span> {w.accountType && <span className="text-emerald-400 text-[9px] bg-slate-900 border border-emerald-950 px-1.5 py-0.2 rounded ml-1 font-bold uppercase">{w.accountType}</span>}</p>
                            <p>Dest: <span className="text-slate-400 break-all select-all">{w.destination}</span></p>
                            {w.transactionHash && <p className="text-[9px] text-slate-500 font-mono">TXID: <code className="text-emerald-500/80">{w.transactionHash}</code></p>}
                          </div>
                        </div>

                        {/* Record operations */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleStartEditWithdrawal(w)}
                            className="p-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white rounded"
                            title="Update record status"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteWithdrawal(w.id)}
                            className="p-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-rose-400 rounded"
                            title="Delete record log"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ======================================= */}
      {/* 5. TERMINAL SANDBOX TAB                 */}
      {/* ======================================= */}
      {activeTab === "sandbox" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Sandbox Controls: Left 4 columns */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 self-start font-mono">
            <div className="border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-emerald-400" />
                Live Tool Analyzer Sandbox
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Simulate cognitive market sweeps, trade setups, and pattern scanner outputs directly inside your administrator control dashboard.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Select Instrument</label>
                <select
                  value={sandboxAsset}
                  onChange={(e) => setSandboxAsset(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none transition-all text-xs"
                >
                  <option value="EUR/USD">EUR/USD (Forex Major)</option>
                  <option value="BTC/USD">BTC/USD (Bitcoin Spot)</option>
                  <option value="ETH/USD">ETH/USD (Ethereum Spot)</option>
                  <option value="XAU/USD">XAU/USD (Gold Spot)</option>
                  <option value="AAPL">AAPL (Apple Inc. Stock)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Target Analysis Timeframe</label>
                <select
                  value={sandboxTimeframe}
                  onChange={(e) => setSandboxTimeframe(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none transition-all text-xs"
                >
                  <option value="M5">M5 (5 Minutes)</option>
                  <option value="M15">M15 (15 Minutes)</option>
                  <option value="H1">H1 (1 Hour)</option>
                  <option value="H4">H4 (4 Hours - Default)</option>
                  <option value="D1">D1 (Daily Trend)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Simulated Market Bias</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSandboxDirection("BUY")}
                    className={`py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      sandboxDirection === "BUY" 
                        ? "bg-emerald-950/40 border-emerald-500 text-emerald-400 shadow-md" 
                        : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    BULLISH BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setSandboxDirection("SELL")}
                    className={`py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      sandboxDirection === "SELL" 
                        ? "bg-rose-950/40 border-rose-500 text-rose-400 shadow-md" 
                        : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    BEARISH SELL
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunSandboxAnalysis}
                disabled={sandboxLoading}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                {sandboxLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Sweeping Order Flow...</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    <span>Generate Sandbox Analysis</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sandbox Results display: Right 8 columns */}
          <div className="lg:col-span-8">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 min-h-[380px] flex flex-col justify-between">
              
              {!sandboxResult && !sandboxLoading && (
                <div className="my-auto flex flex-col items-center justify-center text-center space-y-3 font-mono">
                  <PlayCircle className="h-10 w-10 text-slate-700 animate-pulse" />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Terminal Analysis Console Standby</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 max-w-md">Configure instruments on the left panel, then trigger an analysis sweep to populate institutional block metrics, pattern overlays, and targets.</p>
                  </div>
                </div>
              )}

              {sandboxLoading && (
                <div className="my-auto flex flex-col items-center justify-center text-center space-y-4 font-mono">
                  <RefreshCw className="h-10 w-10 text-emerald-400 animate-spin" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-emerald-400 animate-pulse uppercase tracking-wider">Compiling AI Analytical Vector</h4>
                    <div className="text-[10px] text-slate-500 leading-normal space-y-0.5 max-w-sm">
                      <p className="text-emerald-500/70 animate-pulse">● Connecting to deep liquidity mapping modules...</p>
                      <p className="delay-100">● Mitigating imbalance zones and drawing Fibonacci levels...</p>
                      <p className="delay-200">● Formulating risk parameters and Take Profit markers...</p>
                    </div>
                  </div>
                </div>
              )}

              {sandboxResult && !sandboxLoading && (
                <div className="space-y-4 font-mono text-xs">
                  
                  {/* Result Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <LineChart className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-white">{sandboxResult.asset}</span>
                          <span className="bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded text-[9px] text-slate-400">{sandboxResult.timeframe}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">Cognitive Scanning Sandbox Output</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        sandboxResult.direction === "BUY" 
                          ? "bg-emerald-950/40 border-emerald-900/40 text-emerald-400" 
                          : "bg-rose-950/40 border-rose-900/40 text-rose-400"
                      }`}>
                        {sandboxResult.direction} SIGNAL
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-1">Confidence: <code className="text-white font-bold">{sandboxResult.confidence}%</code></span>
                    </div>
                  </div>

                  {/* Pricing Targets Bento Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1">
                    <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg">
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Optimal Entry</span>
                      <p className="text-xs font-black text-white mt-0.5">{sandboxResult.entryZone}</p>
                    </div>
                    <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg">
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Take Profit</span>
                      <p className="text-xs font-black text-emerald-400 mt-0.5">${sandboxResult.takeProfit}</p>
                    </div>
                    <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg">
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Stop Loss</span>
                      <p className="text-xs font-black text-rose-500 mt-0.5">${sandboxResult.stopLoss}</p>
                    </div>
                    <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg">
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Risk Reward</span>
                      <p className="text-xs font-black text-white mt-0.5">{sandboxResult.rrRatio}</p>
                    </div>
                  </div>

                  {/* Liquidity Levels / Patterns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg space-y-1.5">
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">Identified Technical Patterns</span>
                      <div className="space-y-1">
                        {sandboxResult.patterns.map((p: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-[11px]">
                            <span className="text-white">● {p.name}</span>
                            <span className="text-emerald-400 font-bold bg-emerald-950/20 px-1 py-0.2 rounded border border-emerald-900/20 text-[9px] uppercase">{p.strength}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg space-y-1.5">
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">Key Structural Levels</span>
                      <div className="text-[11px] space-y-0.5">
                        <p className="text-slate-400">Support: <span className="text-white">{sandboxResult.supportLevels.join(" | ")}</span></p>
                        <p className="text-slate-400">Resistance: <span className="text-white">{sandboxResult.resistanceLevels.join(" | ")}</span></p>
                      </div>
                    </div>
                  </div>

                  {/* AI Reasoning Narrative */}
                  <div className="p-3.5 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] uppercase">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                      Cognitive AI Strategy Analysis
                    </div>
                    <p className="text-[11.5px] text-slate-300 leading-relaxed font-sans">{sandboxResult.aiReasoning}</p>
                  </div>

                </div>
              )}

              {/* Console Sync status */}
              <div className="pt-3 border-t border-slate-850/60 flex items-center justify-between text-[9px] text-slate-500 font-mono mt-4">
                <span>TERMINAL REPLICATION MATRIX V2.5</span>
                <span>STATUS: STABLE</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ======================================= */}
      {/* 6. APIs, WEBHOOKS & CODE INJECTIONS TAB  */}
      {/* ======================================= */}
      {activeTab === "apis" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          
          {/* Main List Management Panel: Left 8 columns */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* THIRD-PARTY API CHANNELS */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="h-4 w-4 text-emerald-400" />
                    Secure API Credential Vault
                  </h3>
                  <p className="text-[10.5px] text-slate-500 leading-normal">
                    Third-party API key configurations governing Gemini AI reasoning, payment gateways, and backend connectors.
                  </p>
                </div>
                {apiSuccess && (
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 px-2.5 py-1 rounded-md animate-pulse">
                    {apiSuccess}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {apiConfigs.length === 0 ? (
                  <div className="p-5 text-center bg-slate-950 border border-slate-850 rounded-xl text-slate-500 text-xs font-mono">
                    No API Configurations found. Add one on the right side.
                  </div>
                ) : (
                  apiConfigs.map((api) => (
                    <div 
                      key={api.id} 
                      className={`p-4 rounded-xl border transition-all ${
                        api.isActive 
                          ? "bg-slate-950/60 border-slate-800/80 hover:border-emerald-900/40" 
                          : "bg-slate-950/20 border-slate-900/60 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-mono text-xs font-bold">{api.name}</span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border bg-slate-900 border-slate-800 text-slate-400 uppercase">
                              {api.provider}
                            </span>
                            {api.isActive ? (
                              <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded border bg-emerald-950/40 border-emerald-900/40 text-emerald-400 uppercase">
                                Active Syncing
                              </span>
                            ) : (
                              <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded border bg-slate-900/40 border-slate-800/40 text-slate-500 uppercase">
                                Suspended
                              </span>
                            )}
                          </div>
                          
                          <p className="text-[11px] text-slate-400 font-sans leading-normal mt-1">{api.description}</p>
                          
                          <div className="pt-2 flex items-center gap-4 text-[10px] text-slate-500 font-mono">
                            <div>
                              <span className="text-slate-600">Endpoint:</span> <code className="text-slate-300 select-all">{api.endpoint}</code>
                            </div>
                            <div>
                              <span className="text-slate-600">API Key:</span> <code className="text-emerald-500/80 tracking-widest">{api.apiKey.substring(0, 8)}••••••••</code>
                            </div>
                          </div>
                        </div>

                        {/* Row Actions */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleApiActive(api.id)}
                            title={api.isActive ? "Deactivate API Connection" : "Activate API Connection"}
                            className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
                          >
                            {api.isActive ? (
                              <ToggleRight className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-slate-500" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEditApi(api)}
                            title="Edit Configuration"
                            className="p-1.5 bg-slate-900 hover:bg-slate-855 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteApi(api.id)}
                            title="Delete Configuration"
                            className="p-1.5 bg-slate-900 hover:bg-slate-855 border border-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* DYNAMIC OUTFLOW WEBHOOKS */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-emerald-400" />
                    Real-time Event Webhook Targets
                  </h3>
                  <p className="text-[10.5px] text-slate-500 leading-normal">
                    Subscribe remote servers and custom bots to transaction events, registration spikes, and trade triggers.
                  </p>
                </div>
                {whSuccess && (
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 px-2.5 py-1 rounded-md animate-pulse">
                    {whSuccess}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {webhooks.length === 0 ? (
                  <div className="p-5 text-center bg-slate-950 border border-slate-850 rounded-xl text-slate-500 text-xs font-mono">
                    No webhooks registered. Defer updates or create one on the right.
                  </div>
                ) : (
                  webhooks.map((wh) => (
                    <div 
                      key={wh.id} 
                      className={`p-4 rounded-xl border transition-all ${
                        wh.isActive 
                          ? "bg-slate-950/60 border-slate-800/80 hover:border-emerald-900/40" 
                          : "bg-slate-950/20 border-slate-900/60 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-mono text-xs font-bold">{wh.name}</span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border bg-emerald-950/10 border-emerald-900/30 text-emerald-400 uppercase flex items-center gap-1">
                              <Zap className="h-2.5 w-2.5" />
                              Trigger: {wh.event === "all" ? "All Events" : wh.event}
                            </span>
                            {wh.isActive ? (
                              <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded border bg-emerald-950/40 border-emerald-900/40 text-emerald-400 uppercase">
                                active routing
                              </span>
                            ) : (
                              <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded border bg-slate-900/40 border-slate-800/40 text-slate-500 uppercase">
                                paused
                              </span>
                            )}
                          </div>
                          
                          <div className="pt-2 space-y-1 text-[10.5px] font-mono text-slate-400">
                            <p className="break-all select-all text-slate-300">
                              <span className="text-slate-600 uppercase text-[9px] font-bold mr-1.5">POST Endpoint:</span>
                              {wh.url}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              <span className="text-slate-600 uppercase text-[9px] font-bold mr-1.5">HMAC Secret:</span>
                              <code className="text-slate-400 bg-slate-950 px-1 py-0.5 rounded border border-slate-850">{wh.secret}</code>
                            </p>
                          </div>
                        </div>

                        {/* Row Actions */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleWebhookActive(wh.id)}
                            title={wh.isActive ? "Deactivate Webhook" : "Activate Webhook"}
                            className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
                          >
                            {wh.isActive ? (
                              <ToggleRight className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-slate-500" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEditWebhook(wh)}
                            title="Edit Webhook"
                            className="p-1.5 bg-slate-900 hover:bg-slate-855 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteWebhook(wh.id)}
                            title="Delete Webhook"
                            className="p-1.5 bg-slate-900 hover:bg-slate-855 border border-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* CUSTOM ADSENSE & SCRIPTS INJECTION */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Code className="h-4 w-4 text-emerald-400" />
                    Dynamic Script Injections & Adsense Codes
                  </h3>
                  <p className="text-[10.5px] text-slate-500 leading-normal">
                    Insert Google AdSense scripts, GA4 tracking snippets, or Custom styles that append dynamically into the document.
                  </p>
                </div>
                {scSuccess && (
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 px-2.5 py-1 rounded-md animate-pulse">
                    {scSuccess}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {customScripts.length === 0 ? (
                  <div className="p-5 text-center bg-slate-950 border border-slate-850 rounded-xl text-slate-500 text-xs font-mono">
                    No custom scripts registered. Create your Google AdSense block code on the right.
                  </div>
                ) : (
                  customScripts.map((sc) => (
                    <div 
                      key={sc.id} 
                      className={`p-4 rounded-xl border transition-all ${
                        sc.isActive 
                          ? "bg-slate-950/60 border-slate-800/80 hover:border-emerald-900/40" 
                          : "bg-slate-950/20 border-slate-900/60 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-mono text-xs font-bold">{sc.name}</span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border bg-slate-900 border-slate-800 text-slate-400 uppercase">
                              Placement: {sc.placement.replace("_", " ")}
                            </span>
                            {sc.isActive ? (
                              <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded border bg-emerald-950/40 border-emerald-900/40 text-emerald-400 uppercase">
                                dynamically injected
                              </span>
                            ) : (
                              <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded border bg-slate-900/40 border-slate-800/40 text-slate-500 uppercase">
                                disabled
                              </span>
                            )}
                          </div>

                          <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-[10.5px] font-mono text-slate-300 max-h-32 overflow-y-auto whitespace-pre leading-normal scrollbar-thin">
                            <code>{sc.code}</code>
                          </div>
                        </div>

                        {/* Row Actions */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleScriptActive(sc.id)}
                            title={sc.isActive ? "Deactivate Script" : "Activate Script"}
                            className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
                          >
                            {sc.isActive ? (
                              <ToggleRight className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-slate-500" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEditScript(sc)}
                            title="Edit Script Code"
                            className="p-1.5 bg-slate-900 hover:bg-slate-855 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteScript(sc.id)}
                            title="Delete Script"
                            className="p-1.5 bg-slate-900 hover:bg-slate-855 border border-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Interactive Form Editor & Simulation Console: Right 4 columns */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* INTERACTIVE WEBHOOK SIMULATOR CONSOLE */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  Live Webhook Vector Simulator
                </h3>
                <p className="text-[10.5px] text-slate-500 leading-normal mt-1">
                  Trigger mock server payloads to your registered endpoints to verify payload signatures and payload handling.
                </p>
              </div>

              <div className="space-y-3.5 text-xs font-mono">
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Select Active Target Endpoint</label>
                  <select
                    value={testWhId}
                    onChange={(e) => setTestWhId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer font-mono"
                  >
                    <option value="">-- Choose active webhook --</option>
                    {webhooks.filter(w => w.isActive).map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Select Transaction Event Payload</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTestWhPayloadType("trade_opened")}
                      className={`py-1 rounded border text-[9.5px] font-bold font-mono text-center transition-all cursor-pointer ${
                        testWhPayloadType === "trade_opened"
                          ? "bg-emerald-600 border-emerald-500 text-white"
                          : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Trade Alert
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestWhPayloadType("payment_completed")}
                      className={`py-1 rounded border text-[9.5px] font-bold font-mono text-center transition-all cursor-pointer ${
                        testWhPayloadType === "payment_completed"
                          ? "bg-emerald-600 border-emerald-500 text-white"
                          : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Purchase Pay
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestWhPayloadType("user_registered")}
                      className={`py-1 rounded border text-[9.5px] font-bold font-mono text-center transition-all cursor-pointer ${
                        testWhPayloadType === "user_registered"
                          ? "bg-emerald-600 border-emerald-500 text-white"
                          : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      New User
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunWebhookSimulation}
                  disabled={isSimulatingWebhook || !testWhId}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:border-slate-850 disabled:text-slate-600 disabled:cursor-not-allowed text-white text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSimulatingWebhook ? "animate-spin" : ""}`} />
                  <span>{isSimulatingWebhook ? "Posting Payload..." : "Simulate Payload POST"}</span>
                </button>

                {/* Console Output Terminal */}
                {testConsoleLogs.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Real-time HTTP Transaction Terminal</label>
                    <div className="w-full bg-black border border-slate-850 rounded-xl p-3 h-64 overflow-y-auto text-[10px] leading-relaxed font-mono text-slate-300 scrollbar-thin space-y-1">
                      {testConsoleLogs.map((log, idx) => (
                        <div 
                          key={idx} 
                          className={`whitespace-pre-wrap select-text ${
                            log.includes("[SUCCESS]") 
                              ? "text-emerald-400 font-bold" 
                              : log.includes("Error") 
                              ? "text-rose-500 font-bold" 
                              : log.includes("JSON Payload:") || log.startsWith("  ") || log.startsWith("{") || log.startsWith("}") || log.startsWith(" ")
                              ? "text-blue-400/90 text-[9.5px]"
                              : "text-slate-300"
                          }`}
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* INTEGRATIONS CONFIGURATION FORMS */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="border-b border-slate-800 pb-2.5">
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="h-4 w-4 text-emerald-400" />
                  {editingApiId ? "Edit API Configuration" : editingWhId ? "Edit Webhook Connector" : editingScId ? "Edit Script Injection" : "Integrations Register Portal"}
                </h3>
              </div>

              {/* QUICK CHOOSE FORM TARGET */}
              {!editingApiId && !editingWhId && !editingScId && (
                <div className="p-1 bg-slate-950 border border-slate-850 rounded-lg flex gap-1 text-[10px] font-mono">
                  <button 
                    type="button"
                    onClick={() => { resetApiForm(); resetWebhookForm(); resetScriptForm(); }}
                    className="flex-1 py-1 px-1.5 bg-slate-900 text-white rounded font-bold text-center border border-slate-800 hover:bg-slate-850 cursor-pointer"
                  >
                    Clear Form
                  </button>
                </div>
              )}

              {/* TABS OF FORMS */}
              <div className="space-y-4 font-mono text-xs">
                
                {/* 1. API FORM */}
                {(!editingWhId && !editingScId) && (
                  <form onSubmit={handleSaveApi} className="space-y-3 pt-1 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      {editingApiId ? "📝 MODIFY API CONNECTION" : "🔌 REGISTER NEW API CONNECTION"}
                    </span>
                    
                    <div className="space-y-1">
                      <label className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">API Service Label</label>
                      <input
                        type="text"
                        required
                        value={apiName}
                        onChange={(e) => setApiName(e.target.value)}
                        placeholder="e.g. Gemini AI Sentinel"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded px-2.5 py-1 text-xs focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Provider / SDK</label>
                        <select
                          value={apiProvider}
                          onChange={(e) => setApiProvider(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-white rounded px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
                        >
                          <option value="Google GenAI SDK">Google GenAI</option>
                          <option value="Stripe Gateway">Stripe Payments</option>
                          <option value="Coinbase Pay">Coinbase Wallet</option>
                          <option value="Telegram Bot">Telegram REST</option>
                          <option value="Custom REST API">Custom REST</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Connection Status</label>
                        <select
                          value={apiIsActive ? "true" : "false"}
                          onChange={(e) => setApiIsActive(e.target.value === "true")}
                          className="w-full bg-slate-950 border border-slate-800 text-white rounded px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
                        >
                          <option value="true">Enabled</option>
                          <option value="false">Disabled / Suspend</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Target Endpoint URL</label>
                      <input
                        type="url"
                        required
                        value={apiEndpoint}
                        onChange={(e) => setApiEndpoint(e.target.value)}
                        placeholder="https://generativelanguage.googleapis.com"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded px-2.5 py-1 text-xs focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">API Secret Token Key</label>
                      <input
                        type="password"
                        required
                        value={apiKeyValue}
                        onChange={(e) => setApiKeyValue(e.target.value)}
                        placeholder="sk_live_..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded px-2.5 py-1 text-xs focus:outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Description / Scope note</label>
                      <textarea
                        value={apiDescription}
                        onChange={(e) => setApiDescription(e.target.value)}
                        placeholder="Powers automatic calculations..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded px-2.5 py-1 text-xs focus:outline-none h-12 resize-none"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase rounded transition-all cursor-pointer text-center"
                      >
                        {editingApiId ? "Update Key" : "Register Key"}
                      </button>
                      {editingApiId && (
                        <button
                          type="button"
                          onClick={resetApiForm}
                          className="py-1.5 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-bold uppercase rounded transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {/* 2. WEBHOOK FORM */}
                {(!editingApiId && !editingScId) && (
                  <form onSubmit={handleSaveWebhook} className="space-y-3 pt-3 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      {editingWhId ? "📝 MODIFY WEBHOOK CONFIG" : "🔌 DEPLOY NEW EVENT WEBHOOK"}
                    </span>
                    
                    <div className="space-y-1">
                      <label className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Webhook Bot Label</label>
                      <input
                        type="text"
                        required
                        value={whName}
                        onChange={(e) => setWhName(e.target.value)}
                        placeholder="e.g. Telegram Channel Logger"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded px-2.5 py-1 text-xs focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Event Trigger Subscription</label>
                        <select
                          value={whEvent}
                          onChange={(e) => setWhEvent(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 text-white rounded px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
                        >
                          <option value="all">All Events</option>
                          <option value="trade_opened">On Trade Alert</option>
                          <option value="payment_completed">On Plan upgrade</option>
                          <option value="user_registered">On New User Sign</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Dispatch Webhook</label>
                        <select
                          value={whIsActive ? "true" : "false"}
                          onChange={(e) => setWhIsActive(e.target.value === "true")}
                          className="w-full bg-slate-950 border border-slate-800 text-white rounded px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
                        >
                          <option value="true">Active Routing</option>
                          <option value="false">Inactive / Pause</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">POST Target URL</label>
                      <input
                        type="url"
                        required
                        value={whUrl}
                        onChange={(e) => setWhUrl(e.target.value)}
                        placeholder="https://hooks.slack.com/services/..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded px-2.5 py-1 text-xs focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">HMAC Signature Verification Secret</label>
                      <input
                        type="text"
                        value={whSecret}
                        onChange={(e) => setWhSecret(e.target.value)}
                        placeholder="Leave blank to auto-generate"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded px-2.5 py-1 text-xs focus:outline-none font-mono"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase rounded transition-all cursor-pointer text-center"
                      >
                        {editingWhId ? "Update Webhook" : "Deploy Webhook"}
                      </button>
                      {editingWhId && (
                        <button
                          type="button"
                          onClick={resetWebhookForm}
                          className="py-1.5 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-bold uppercase rounded transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {/* 3. ADSENSE & INJECTION SCRIPTS FORM */}
                {(!editingApiId && !editingWhId) && (
                  <form onSubmit={handleSaveScript} className="space-y-3 pt-3 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      {editingScId ? "📝 MODIFY CUSTOM CODE OVERRIDE" : "🔌 INJECT NEW ADSENSE / HTML CODE"}
                    </span>
                    
                    <div className="space-y-1">
                      <label className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Code Section Label</label>
                      <input
                        type="text"
                        required
                        value={scName}
                        onChange={(e) => setScName(e.target.value)}
                        placeholder="e.g. Google Adsense Left Rail Banner"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded px-2.5 py-1 text-xs focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Placement Node</label>
                        <select
                          value={scPlacement}
                          onChange={(e) => setScPlacement(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 text-white rounded px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
                        >
                          <option value="above_ads">Ads Container Section</option>
                          <option value="header">Global Header Injection</option>
                          <option value="footer">Global Footer Injection</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Injection Status</label>
                        <select
                          value={scIsActive ? "true" : "false"}
                          onChange={(e) => setScIsActive(e.target.value === "true")}
                          className="w-full bg-slate-950 border border-slate-800 text-white rounded px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
                        >
                          <option value="true">Injected & Enabled</option>
                          <option value="false">Suspended / De-active</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Raw HTML / JavaScript Code block</label>
                      <textarea
                        required
                        rows={4}
                        value={scCode}
                        onChange={(e) => setScCode(e.target.value)}
                        placeholder={`<script async src="https://pagead2.googlesyndication.com/..."></script>`}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded px-2.5 py-1 text-xs focus:outline-none font-mono h-24"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase rounded transition-all cursor-pointer text-center"
                      >
                        {editingScId ? "Update Script" : "Inject Script"}
                      </button>
                      {editingScId && (
                        <button
                          type="button"
                          onClick={resetScriptForm}
                          className="py-1.5 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-bold uppercase rounded transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                )}

              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================================= */}
      {/* 7. ASSETS MANAGER TAB                   */}
      {/* ======================================= */}
      {activeTab === "assets" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          
          {/* Main List Management Panel: Left 8 columns */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3 gap-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-emerald-400" />
                    Global Asset Registry
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Manage available trading pairs, indices, stocks, and commodities across the platform.
                  </p>
                </div>
                
                {/* Category filters */}
                <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-lg border border-slate-850">
                  {["All", "Crypto", "Forex", "Indices", "Stocks", "Commodities"].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setAssetCategoryFilter(cat)}
                      className={`px-2 py-1 text-[9px] font-mono font-bold rounded-md uppercase transition-all cursor-pointer ${
                        assetCategoryFilter === cat
                          ? "bg-emerald-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {assetSuccess && (
                <div className={`p-3 rounded-lg text-xs font-mono border ${
                  assetSuccess.startsWith("Error")
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}>
                  {assetSuccess}
                </div>
              )}

              {/* Assets list table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                      <th className="py-2 px-3">Asset Symbol</th>
                      <th className="py-2 px-3">Full Name</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3 text-right">24h Change</th>
                      <th className="py-2 px-3 text-right">Volume</th>
                      <th className="py-2 px-3 text-center">Connection</th>
                      <th className="py-2 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {assets
                      .filter(a => assetCategoryFilter === "All" || a.category === assetCategoryFilter)
                      .map((asset) => {
                        const isCrypto = asset.category === "Crypto";
                        return (
                          <tr key={asset.symbol} className="hover:bg-slate-850/30 transition-all">
                            <td className="py-2.5 px-3">
                              <span className="text-white font-bold block">{asset.symbol}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-slate-400 text-[11px] block">{asset.name}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-950 text-slate-400 border border-slate-850">
                                {asset.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-300 font-extrabold">
                              ${asset.price.toLocaleString(undefined, { minimumFractionDigits: asset.price < 5 ? 4 : 2 })}
                            </td>
                            <td className={`py-2.5 px-3 text-right font-bold ${
                              asset.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}>
                              {asset.changePercent >= 0 ? "+" : ""}{asset.changePercent.toFixed(2)}%
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                              {asset.volume24h}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isCrypto ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Live Binance
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-950 text-slate-500 border border-slate-850">
                                  Simulation
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() => handleEditAsset(asset)}
                                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-all cursor-pointer"
                                  title="Edit Asset"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAsset(asset.symbol)}
                                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-all cursor-pointer"
                                  title="Delete Asset"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {assets.filter(a => assetCategoryFilter === "All" || a.category === assetCategoryFilter).length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          No assets registered in this category.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Helper Note */}
            <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-4 flex gap-3 text-[11px] text-slate-400 leading-normal">
              <Info className="h-4.5 w-4.5 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-slate-300 block">Automatic Binance WebSocket Node</span>
                <p>
                  Any assets under the <strong className="text-slate-300">Crypto</strong> category are integrated automatically with Binance live ticker streams. Standard symbols (e.g., <code className="text-emerald-400 select-all">BTC/USD</code>, <code className="text-emerald-400 select-all">ETH/USD</code>, <code className="text-emerald-400 select-all">SOL/USDT</code>) will be parsed and connected immediately to WebSocket price tickers, bypassing any simulation variables.
                </p>
              </div>
            </div>

          </div>

          {/* Asset registration/edit portal card: Right 4 columns */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                {editingAssetSymbol ? "Edit Asset Registry" : "Register New Asset"}
              </h3>

              <form onSubmit={handleSaveAsset} className="space-y-3.5 text-xs font-mono">
                <div>
                  <label className="text-slate-400 block font-bold mb-1">Asset Symbol *</label>
                  <input
                    type="text"
                    required
                    value={asSymbol}
                    onChange={(e) => setAsSymbol(e.target.value)}
                    placeholder="e.g. BTC/USD or SOL/USDT"
                    disabled={!!editingAssetSymbol}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded p-2 text-white font-mono placeholder:text-slate-650"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight">Unique asset ticker symbol used for analytics and tracking.</span>
                </div>

                <div>
                  <label className="text-slate-400 block font-bold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={asName}
                    onChange={(e) => setAsName(e.target.value)}
                    placeholder="e.g. Bitcoin / US Dollar"
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded p-2 text-white font-mono placeholder:text-slate-650"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block font-bold mb-1">Category *</label>
                  <select
                    value={asCategory}
                    onChange={(e) => setAsCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded p-2 text-white font-mono"
                  >
                    <option value="Crypto">Crypto (Binance Live Streaming)</option>
                    <option value="Forex">Forex (Standard Matrix)</option>
                    <option value="Indices">Indices (Stock Indexes)</option>
                    <option value="Stocks">Stocks (Equities)</option>
                    <option value="Commodities">Commodities (Gold, Oil)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block font-bold mb-1">Base Price ($)</label>
                    <input
                      type="number"
                      step="any"
                      value={asPrice}
                      onChange={(e) => setAsPrice(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded p-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block font-bold mb-1">Daily Change (%)</label>
                    <input
                      type="number"
                      step="any"
                      value={asChangePercent}
                      onChange={(e) => setAsChangePercent(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded p-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block font-bold mb-1">24h Low ($)</label>
                    <input
                      type="number"
                      step="any"
                      value={asLow24h}
                      onChange={(e) => setAsLow24h(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded p-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block font-bold mb-1">24h High ($)</label>
                    <input
                      type="number"
                      step="any"
                      value={asHigh24h}
                      onChange={(e) => setAsHigh24h(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded p-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block font-bold mb-1">24h Volume *</label>
                  <input
                    type="text"
                    required
                    value={asVolume24h}
                    onChange={(e) => setAsVolume24h(e.target.value)}
                    placeholder="e.g. $42.8B or $950M"
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded p-2 text-white font-mono placeholder:text-slate-650"
                  />
                </div>

                <div className="border-t border-slate-850/80 pt-3 mt-1 space-y-2.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Sentiments & AI analysis (Sums to 100%)</span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-emerald-400 block text-[10px] font-bold mb-0.5">Bullish %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={asBullishProb}
                        onChange={(e) => setAsBullishProb(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded p-1 text-white font-mono text-center text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-rose-400 block text-[10px] font-bold mb-0.5">Bearish %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={asBearishProb}
                        onChange={(e) => setAsBearishProb(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded p-1 text-white font-mono text-center text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[10px] font-bold mb-0.5">Neutral %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={asNeutralProb}
                        onChange={(e) => setAsNeutralProb(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded p-1 text-white font-mono text-center text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block font-bold mb-1">AI Analyst Confidence ({asConfidence}%)</label>
                    <input
                      type="range"
                      min="50"
                      max="99"
                      value={asConfidence}
                      onChange={(e) => setAsConfidence(Number(e.target.value))}
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 border-t border-slate-850/80 pt-3">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase rounded transition-all cursor-pointer text-center"
                  >
                    {editingAssetSymbol ? "Update Asset" : "Register Asset"}
                  </button>
                  {(editingAssetSymbol || asSymbol) && (
                    <button
                      type="button"
                      onClick={resetAssetForm}
                      className="py-1.5 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-bold uppercase rounded transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
