import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, TraderDNA, MarketAsset, AlertItem } from "../types";
import { MessageSquare, Send, X, Bot, ShieldCheck, RefreshCw } from "lucide-react";

interface MentorCoachProps {
  userProfile: TraderDNA;
  selectedAsset?: MarketAsset;
  alerts?: AlertItem[];
  isGeminiCooldown?: boolean;
  geminiCooldownRemainingMs?: number;
}

export default function MentorCoach({ userProfile, selectedAsset, alerts, isGeminiCooldown, geminiCooldownRemainingMs }: MentorCoachProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      sender: "ai",
      text: `Hello! I am your AI Quantitative Trading Mentor. I've calibrated my feedback model to your ${userProfile.style} style and typical ${userProfile.weakness} weaknesses. What chart setup, execution plan, or risk structure shall we review today?`,
      timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: "u_" + Date.now(),
      sender: "user",
      text: inputText,
      timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const response = await fetch("/api/mentor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          userProfile,
          selectedAsset,
          activeAlerts: alerts?.filter(a => !a.isRead) || [],
          connectedBrokers: JSON.parse(localStorage.getItem("connected_brokers_list") || "[]")
        })
      });
      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, {
          id: "ai_" + Date.now(),
          sender: "ai",
          text: data.text,
          timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      
      {/* Small Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 p-4 rounded-full shadow-2xl flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
        >
          <Bot className="h-5 w-5" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider hidden md:inline">
            AI Trading Coach
          </span>
        </button>
      )}

      {/* Main Drawer Interface */}
      {isOpen && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-80 md:w-96 shadow-2xl overflow-hidden flex flex-col h-[460px]">
          
          {/* Drawer Header */}
          <div className="bg-slate-950 border-b border-slate-800 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isGeminiCooldown ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
              <div>
                <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1">
                  AI Trading Mentor
                </h3>
                <span className="text-[10px] text-emerald-400 font-mono">Calibrated to {userProfile.style}</span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Cooldown alerts banner */}
          {isGeminiCooldown && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-3.5 py-2 text-[10px] font-mono text-amber-400 flex items-center justify-between animate-fade-in">
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Offline Fallback (Cooldown)</span>
              </span>
              <span>
                {geminiCooldownRemainingMs && geminiCooldownRemainingMs > 0 ? (
                  `${Math.floor(geminiCooldownRemainingMs / 60000)}m ${Math.floor((geminiCooldownRemainingMs % 60000) / 1000)}s`
                ) : (
                  "Ready soon"
                )}
              </span>
            </div>
          )}

          {/* Message List area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/40">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col max-w-[85%] ${m.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-emerald-500 text-slate-950 rounded-tr-none font-medium'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none font-serif'
                }`}>
                  {m.text}
                </div>
                <span className="text-[9px] text-slate-500 font-mono mt-1">{m.timestamp}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-mono">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Coach formulating feedback...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Form input */}
          <form onSubmit={handleSendMessage} className="bg-slate-950 border-t border-slate-800 p-2.5 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-850 focus:border-emerald-500 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none"
              placeholder="Ask about strategy, risk, or typical mistakes..."
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="p-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 rounded-lg cursor-pointer transition-colors"
            >
              <Send className="h-3.5 w-3.5 fill-slate-950" />
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
