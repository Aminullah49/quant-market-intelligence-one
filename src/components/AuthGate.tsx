import React, { useState, useEffect } from "react";
import { KeyRound, Mail, User, ShieldCheck, Cpu, ArrowRight, BookOpen, UserPlus, LogIn, Lock, Globe } from "lucide-react";
import { TraderDNA } from "../types";
import AdBanner from "./AdBanner";

export interface RegisteredUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  password?: string;
  profile: TraderDNA;
  plan: string;
}

interface AuthGateProps {
  onLoginSuccess: (user: RegisteredUser) => void;
  registeredAccounts: RegisteredUser[];
  onRegisterAccount: (user: RegisteredUser) => void;
  initialTab?: 'signin' | 'signup';
}

export default function AuthGate({ onLoginSuccess, registeredAccounts, onRegisterAccount, initialTab = 'signin' }: AuthGateProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  
  // Sign In inputs
  const [signInUsername, setSignInUsername] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState("");

  // Sign Up inputs
  const [signUpDisplayName, setSignUpDisplayName] = useState("");
  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpStyle, setSignUpStyle] = useState<'Scalper' | 'Day Trader' | 'Swing Trader' | 'Position Trader'>('Day Trader');
  const [signUpCapital, setSignUpCapital] = useState<number>(10000);
  const [signUpError, setSignUpError] = useState("");
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const handleGuestLogin = () => {
    const guestUser: RegisteredUser = {
      id: "u_guest",
      username: "guest_trader",
      displayName: "Guest Explorer",
      email: "guest@aiquant.com",
      plan: "explorer",
      profile: {
        style: "Day Trader",
        timeframe: "M15",
        market: "Forex",
        riskTolerance: "Balanced",
        weakness: "Revenge trading/FOMO",
        leverage: 10,
        displayName: "Guest Explorer",
        tradingCapital: 10000,
        dailyGoalPercent: 1.5,
        experienceYears: 1,
        timezone: "GMT+0"
      }
    };
    onLoginSuccess(guestUser);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError("");

    if (!signInUsername.trim() || !signInPassword.trim()) {
      setSignInError("Please enter both username and password.");
      return;
    }

    const foundUser = registeredAccounts.find(
      (acc) => acc.username.toLowerCase() === signInUsername.trim().toLowerCase()
    );

    if (!foundUser) {
      setSignInError("Trader account not found. Click 'Create Account' if you don't have one.");
      return;
    }

    if (foundUser.password && foundUser.password !== signInPassword) {
      setSignInError("Incorrect security passcode/password.");
      return;
    }

    // Success!
    onLoginSuccess(foundUser);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError("");
    setSignUpSuccess(false);

    if (!signUpDisplayName.trim() || !signUpUsername.trim() || !signUpEmail.trim() || !signUpPassword.trim()) {
      setSignUpError("All profile fields are required.");
      return;
    }

    if (signUpUsername.length < 3) {
      setSignUpError("Username must be at least 3 characters.");
      return;
    }

    const usernameExists = registeredAccounts.some(
      (acc) => acc.username.toLowerCase() === signUpUsername.trim().toLowerCase()
    );

    if (usernameExists) {
      setSignUpError("This username is already taken. Please choose another.");
      return;
    }

    // Construct profile and user
    const defaultProfile: TraderDNA = {
      style: signUpStyle,
      timeframe: signUpStyle === 'Scalper' ? 'M5' : signUpStyle === 'Day Trader' ? 'M15' : 'H4',
      market: 'Forex',
      riskTolerance: 'Balanced',
      weakness: 'Revenge trading/FOMO',
      leverage: signUpStyle === 'Scalper' ? 50 : 10,
      displayName: signUpDisplayName.trim(),
      tradingCapital: signUpCapital,
      dailyGoalPercent: signUpStyle === 'Scalper' ? 3.0 : 1.5,
      experienceYears: 1,
      timezone: "GMT+1"
    };

    const newUser: RegisteredUser = {
      id: "u_" + Date.now(),
      username: signUpUsername.trim().toLowerCase(),
      displayName: signUpDisplayName.trim(),
      email: signUpEmail.trim(),
      password: signUpPassword,
      profile: defaultProfile,
      plan: "explorer"
    };

    onRegisterAccount(newUser);
    setSignUpSuccess(true);
    localStorage.setItem("just_registered_subscription_reminder", "true");
    
    // Auto sign-in or transition
    setTimeout(() => {
      onLoginSuccess(newUser);
    }, 1200);
  };

  const handleQuickDemoLogin = (username: string) => {
    const user = registeredAccounts.find(acc => acc.username === username);
    if (user) {
      onLoginSuccess(user);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between relative overflow-hidden font-sans select-none">
      
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-slate-900/40 rounded-full pointer-events-none hidden lg:block" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-slate-900/20 rounded-full pointer-events-none hidden lg:block animate-pulse" />

      {/* Header */}
      <header className="border-b border-slate-900/80 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            <Cpu className="h-4.5 w-4.5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest text-white uppercase font-mono">
              AI QUANTITATIVE
            </h1>
            <span className="text-[9px] text-slate-500 font-mono tracking-wider block">PROBABILITY ENGINE V3.5</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="hidden sm:inline">SECURE CLIENT ENVIRONMENT</span>
        </div>
      </header>

      {/* Core Auth Panel */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 z-10 my-10 gap-6 w-full max-w-4xl mx-auto">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
          
          {/* Selector Tabs */}
          <div className="grid grid-cols-2 border-b border-slate-850 bg-slate-950/40">
            <button
              onClick={() => { setActiveTab('signin'); setSignInError(""); }}
              className={`py-3.5 text-xs font-bold uppercase tracking-wider font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'signin'
                  ? 'text-blue-400 bg-slate-900/60 border-b-2 border-blue-500'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/20'
              }`}
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab('signup'); setSignUpError(""); }}
              className={`py-3.5 text-xs font-bold uppercase tracking-wider font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'signup'
                  ? 'text-emerald-400 bg-slate-900/60 border-b-2 border-emerald-500'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/20'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Create Account
            </button>
          </div>

          <div className="p-6">
            {/* SIGN IN VIEW */}
            {activeTab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="text-center space-y-1 mb-2">
                  <h2 className="text-base font-bold text-white font-mono">Access Terminal</h2>
                  <p className="text-xs text-slate-400">Unlock private algorithmic analysis & AI mentor support</p>
                </div>

                {signInError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs font-medium">
                    {signInError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Username</label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. ahmad"
                      value={signInUsername}
                      onChange={(e) => setSignInUsername(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-blue-500/50 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Security Passcode</label>
                  </div>
                  <div className="relative flex items-center">
                    <KeyRound className="absolute left-3.5 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-blue-500/50 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-950/25 cursor-pointer mt-2"
                >
                  <span>Authorize & Sign In</span>
                  <ArrowRight className="h-4 w-4 text-blue-100" />
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-850"></div>
                  <span className="flex-shrink mx-3 text-[9px] text-slate-500 font-mono uppercase tracking-widest">or</span>
                  <div className="flex-grow border-t border-slate-850"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGuestLogin}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Globe className="h-4 w-4 text-blue-400 animate-pulse" />
                  <span>Explore Terminal as Guest</span>
                </button>

                {/* Preseeded Demo Users */}
                <div className="border-t border-slate-850/60 pt-4 mt-4 space-y-2">
                  <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider text-center">Demo Quick Launch (passcode: password123)</div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin("ahmad")}
                      className="text-[10px] bg-slate-950/80 border border-slate-850 hover:border-blue-500/40 text-blue-400 hover:text-blue-300 font-mono p-1.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer"
                    >
                      <span className="font-bold">Ahmad</span>
                      <span className="text-[8px] text-slate-500">Day Trader</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin("sarah")}
                      className="text-[10px] bg-slate-950/80 border border-slate-850 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 font-mono p-1.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer"
                    >
                      <span className="font-bold">Sarah</span>
                      <span className="text-[8px] text-slate-500">Scalper</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin("marcus")}
                      className="text-[10px] bg-slate-950/80 border border-slate-850 hover:border-indigo-500/40 text-indigo-400 hover:text-indigo-300 font-mono p-1.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer"
                    >
                      <span className="font-bold">Marcus</span>
                      <span className="text-[8px] text-slate-500">Position</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* SIGN UP / CREATE ACCOUNT VIEW */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="text-center space-y-1 mb-2">
                  <h2 className="text-base font-bold text-white font-mono">Create Trader Account</h2>
                  <p className="text-xs text-slate-400">Establish your private cryptographic credentials</p>
                </div>

                {signUpError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs font-medium">
                    {signUpError}
                  </div>
                )}

                {signUpSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 p-3 rounded-lg text-xs font-medium flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400 animate-bounce" />
                    <span>Account established successfully! Authenticating terminal...</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Full Name</label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3 h-4 w-4 text-slate-600" />
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={signUpDisplayName}
                        onChange={(e) => setSignUpDisplayName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500/50 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none transition-all font-sans"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Username</label>
                    <input
                      type="text"
                      required
                      placeholder="johndoe"
                      value={signUpUsername}
                      onChange={(e) => setSignUpUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Email Address</label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 h-4 w-4 text-slate-600" />
                    <input
                      type="email"
                      required
                      placeholder="john@quant.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500/50 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Security Password / Passcode</label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 h-4 w-4 text-slate-600" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500/50 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Additional DNA Matrix Slabs */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-850/40">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Default Trading Style</label>
                    <select
                      value={signUpStyle}
                      onChange={(e) => setSignUpStyle(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="Day Trader">Day Trader</option>
                      <option value="Scalper">Scalper</option>
                      <option value="Swing Trader">Swing Trader</option>
                      <option value="Position Trader">Position Trader</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Trading Capital ($ USD)</label>
                    <input
                      type="number"
                      required
                      value={signUpCapital}
                      onChange={(e) => setSignUpCapital(Math.max(100, Number(e.target.value)))}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={signUpSuccess}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/20 cursor-pointer mt-2"
                >
                  <span>Build DNA & Sign Up</span>
                  <ArrowRight className="h-4 w-4 text-emerald-100" />
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-850"></div>
                  <span className="flex-shrink mx-3 text-[9px] text-slate-500 font-mono uppercase tracking-widest">or</span>
                  <div className="flex-grow border-t border-slate-850"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGuestLogin}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Globe className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <span>Explore Terminal as Guest</span>
                </button>
              </form>
            )}

          </div>
        </div>

        {/* Sponsor/Ad Space for Pre-Registration & Guest Mode */}
        <div className="w-full max-w-md animate-fade-in">
          <AdBanner type="banner" currentPlan="explorer" />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 bg-slate-950/40 px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-600 font-mono z-10 gap-2">
        <div>© 2026 AI QUANTITATIVE LABS. ALL SYSTEMS OPERATIONAL.</div>
        <div className="flex gap-4">
          <span>HOST: SECURE-INGRESS-3000</span>
          <span>LATENCY: 4.2MS</span>
        </div>
      </footer>

    </div>
  );
}
