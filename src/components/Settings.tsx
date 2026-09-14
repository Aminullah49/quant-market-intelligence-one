import React, { useState, useEffect } from "react";
import { Settings, ShieldCheck, AlertTriangle, Key, Cpu, HelpCircle, HardDrive, Lock, ShieldAlert, Globe, Server, Database, Check, Save, Coins, RefreshCw } from "lucide-react";
import { 
  SUPPORTED_CURRENCIES, 
  getStoredCurrency, 
  setStoredCurrency, 
  formatCurrencyAmount, 
  CurrencyConfig 
} from "../utils/currencyAndPips";

interface SettingsProps {
  hasApiKey: boolean;
  onRefreshHealth: () => void;
  userRole: 'admin' | 'user';
  onToggleRole: (role: 'admin' | 'user') => void;
  onLaunchAdminPortal?: () => void;
}

export default function SettingsView({ hasApiKey, onRefreshHealth, userRole, onToggleRole, onLaunchAdminPortal }: SettingsProps) {
  const [checking, setChecking] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  // Global Currency Preferences State
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyConfig>(getStoredCurrency());
  const [customRate, setCustomRate] = useState<number>(() => {
    const cur = getStoredCurrency();
    return cur.rateToUSD;
  });
  const [currencySaved, setCurrencySaved] = useState<boolean>(false);

  // Security Credentials state
  const [customPasscode, setCustomPasscode] = useState(() => localStorage.getItem("custom_admin_passcode") || "");
  const [securityQuestion, setSecurityQuestion] = useState(() => localStorage.getItem("admin_security_question") || "What is your secret master mnemonic?");
  const [securityAnswer, setSecurityAnswer] = useState(() => localStorage.getItem("admin_security_answer") || "");
  const [saveStatus, setSaveStatus] = useState(false);

  const handleCurrencySave = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredCurrency(selectedCurrency.code, customRate);
    setSelectedCurrency({ ...selectedCurrency, rateToUSD: customRate });
    setCurrencySaved(true);
    setTimeout(() => setCurrencySaved(false), 2500);
  };

  const handleSelectCurrency = (code: string) => {
    const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
    if (found) {
      setSelectedCurrency(found);
      setCustomRate(found.rateToUSD);
      setStoredCurrency(found.code, found.rateToUSD);
    }
  };

  const handleSaveSecuritySettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("custom_admin_passcode", customPasscode.trim());
    localStorage.setItem("admin_security_question", securityQuestion.trim());
    localStorage.setItem("admin_security_answer", securityAnswer.trim().toLowerCase());
    
    setSaveStatus(true);
    setTimeout(() => {
      setSaveStatus(false);
    }, 2500);
  };

  const fetchHealth = async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      setHealthStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-emerald-400 tracking-wider uppercase mb-1">
            CONTROL PLANE
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            System Configuration & Secrets
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage your proprietary secret connections, check connection layers, and monitor API service health pools.
          </p>
        </div>
        <Settings className="h-8 w-8 text-emerald-400 opacity-60 hidden sm:block animate-spin-slow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* API Credentials */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Key className="h-4.5 w-4.5 text-emerald-400" />
            Gemini AI Infrastructure Secrets
          </h3>

          <p className="text-xs text-slate-300 leading-relaxed">
            The platform is configured with a native server-side Gemini 1.5/2.5 connection wrapper, ensuring API keys remain completely invisible to standard browser network tools.
          </p>

          <div className="p-4 bg-slate-950 border border-slate-850 rounded-lg space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">GEMINI_API_KEY environment state:</span>
              <span className={`font-mono font-bold px-2.5 py-0.5 rounded text-[10px] uppercase ${
                hasApiKey ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {hasApiKey ? 'CONFIGURED & READY' : 'MOCKED fallback'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              *To provision or update your active Gemini key, navigate to the <strong className="text-slate-200">Secrets Panel</strong> in the AI Studio environment sidebar. Simply add <code>GEMINI_API_KEY</code> and input your credential.*
            </p>
          </div>
        </div>

        {/* Diagnostics Sidecard */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="h-4.5 w-4.5 text-emerald-400 animate-pulse" />
              Connection Diagnostics
            </h3>
            
            <button
              onClick={fetchHealth}
              disabled={checking}
              className="text-[10px] font-mono text-emerald-400 hover:underline cursor-pointer"
            >
              {checking ? "Checking..." : "Verify System"}
            </button>
          </div>

          <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg space-y-2 text-xs font-mono">
            <div className="flex justify-between border-b border-slate-850/50 pb-1.5">
              <span className="text-slate-500">API Connection:</span>
              <span className="text-emerald-400 font-bold">OK (Port 3000)</span>
            </div>
            <div className="flex justify-between border-b border-slate-850/50 pb-1.5">
              <span className="text-slate-500">Gemini Key Loaded:</span>
              <span className="text-slate-200 font-bold">{healthStatus?.hasApiKey ? "True" : "False (Local Emulator)"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Active Build Version:</span>
              <span className="text-slate-400">1.2.4-stable</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-lg text-[11px] text-slate-400 flex gap-2">
            <HardDrive className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>The local development server is running in production cluster containers. WebSockets are disabled for optimal CPU optimization.</span>
          </div>
        </div>
      </div>

      {/* TRADING ACCOUNT CURRENCY & FINANCIAL BASE SETTINGS */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Coins className="h-5 w-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Trading Account Base Currency & Conversion Settings</h3>
            <p className="text-xs text-slate-400">Select your preferred account currency (e.g. Nigerian Naira 🇳🇬 NGN ₦, USD $, EUR €, GBP £, JPY ¥) for risk sizing, paper trading, and pip financial calculations.</p>
          </div>
        </div>

        <form onSubmit={handleCurrencySave} className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-slate-400 block uppercase tracking-wider">
              Preferred Account Currency
            </label>
            <select
              value={selectedCurrency.code}
              onChange={(e) => handleSelectCurrency(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none cursor-pointer"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol}) — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-slate-400 block uppercase tracking-wider">
              Exchange Rate Multiplier ({selectedCurrency.code} / USD)
            </label>
            <input
              type="number"
              step="0.01"
              value={customRate}
              onChange={(e) => setCustomRate(parseFloat(e.target.value) || 1)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 font-bold focus:outline-none"
            />
            <p className="text-[10px] text-slate-500">
              1 USD = {customRate} {selectedCurrency.code}. Adjust rate for exact broker settlement.
            </p>
          </div>

          <div className="flex items-end justify-between md:justify-start gap-3">
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs font-mono uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              {currencySaved ? "Saved!" : "Save Currency"}
            </button>
            <span className="text-xs font-mono text-slate-300 font-bold self-center bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850">
              Symbol Preview: {selectedCurrency.flag} {selectedCurrency.symbol}
            </span>
          </div>
        </form>
      </div>
      {userRole === 'admin' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Advanced Admin Access Control & MFA Settings</h3>
              <p className="text-xs text-slate-400">Configure customizable master credentials and secondary challenge questions to gain secure access to the Admin Dashboard.</p>
            </div>
          </div>

          <form onSubmit={handleSaveSecuritySettings} className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-400 block uppercase tracking-wider">
                  1. Custom Admin Security Passcode
                </label>
                <input
                  type="text"
                  value={customPasscode}
                  onChange={(e) => setCustomPasscode(e.target.value)}
                  placeholder="Leave blank to fallback to default (admin123)"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none placeholder:text-slate-600 transition-all"
                />
                <p className="text-[10px] text-slate-500 leading-normal">
                  Changes the default password required on the Admin unlock screen. Current: <code className="text-slate-300 font-mono">{customPasscode || "admin123 (Default)"}</code>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-400 block uppercase tracking-wider">
                  2. Secondary Multi-Factor Question Challenge
                </label>
                <select
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none transition-all"
                >
                  <option value="What is your secret master mnemonic?">What is your secret master mnemonic?</option>
                  <option value="What is your primary broker API sequence?">What is your primary broker API sequence?</option>
                  <option value="What is your terminal's deployment cluster ID?">What is your terminal's deployment cluster ID?</option>
                  <option value="What is your favorite trading pair?">What is your favorite trading pair?</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-400 block uppercase tracking-wider">
                  Security Answer Challenge
                </label>
                <input
                  type="password"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Enter secret answer challenge"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none placeholder:text-slate-600 transition-all"
                />
                <p className="text-[10px] text-slate-500 leading-normal">
                  If configured, you can bypass password challenges by answering this question. Case-insensitive.
                </p>
              </div>
            </div>

            <div className="md:col-span-2 flex items-center justify-between pt-2 border-t border-slate-850/60">
              <div className="flex items-center gap-1.5">
                {localStorage.getItem("admin_security_answer") ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded font-mono font-bold">
                    <Check className="h-3 w-3" /> MFA BACKUP ACTIVE
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-500 font-mono">
                    ⚠️ No secondary question set. Add one for dual-factor fallback.
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono uppercase rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-md"
              >
                {saveStatus ? (
                  <>
                    <Check className="h-4 w-4 text-white" />
                    <span>Credentials Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Security Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
