import React, { useState, useEffect } from "react";
import { AdCampaign } from "./AdminAdsManager";
import { Sparkles, ExternalLink, Info, ShieldAlert, Award } from "lucide-react";

interface AdBannerProps {
  type: "banner" | "sidebar" | "banner-slim";
  currentPlan?: string;
}

export default function AdBanner({ type, currentPlan = "explorer" }: AdBannerProps) {
  const [activeAd, setActiveAd] = useState<AdCampaign | null>(null);
  const [adsenseEnabled, setAdsenseEnabled] = useState(false);
  const [adsensePubId, setAdsensePubId] = useState("");
  const [adsenseSlot, setAdsenseSlot] = useState("");
  const [showAds, setShowAds] = useState(false);

  const loadAdsConfig = () => {
    const plan = currentPlan || localStorage.getItem("trader_plan") || "explorer";
    const monetizeFreeOnly = localStorage.getItem("monetize_free_only") !== "false";
    const adsense = localStorage.getItem("adsense_enabled") === "true";
    
    setAdsenseEnabled(adsense);
    setAdsensePubId(localStorage.getItem("adsense_pub_id") || "pub-430250614477814");
    setAdsenseSlot(localStorage.getItem("adsense_slot_id") || "9817263544");

    // Determine if we should show ads
    const shouldShow = !monetizeFreeOnly || plan === "explorer";
    setShowAds(shouldShow);

    if (shouldShow) {
      const savedCampaigns = localStorage.getItem("admin_ad_campaigns");
      if (savedCampaigns) {
        try {
          const parsed: AdCampaign[] = JSON.parse(savedCampaigns);
          const matched = parsed.filter(c => c.isActive && c.type === type && (c.targetPlan === "all" || plan === "explorer"));
          
          if (matched.length > 0) {
            // Select a random matching ad
            const randomAd = matched[Math.floor(Math.random() * matched.length)];
            setActiveAd(randomAd);
            
            // Increment Impression count
            const updated = parsed.map(c => {
              if (c.id === randomAd.id) {
                return { ...c, impressions: c.impressions + 1 };
              }
              return c;
            });
            localStorage.setItem("admin_ad_campaigns", JSON.stringify(updated));
          } else {
            setActiveAd(null);
          }
        } catch (e) {
          console.warn("Could not parse ad campaigns.");
        }
      }
    } else {
      setActiveAd(null);
    }
  };

  useEffect(() => {
    loadAdsConfig();

    // Subscribe to admin updates
    window.addEventListener("storage_ads_changed", loadAdsConfig);
    return () => {
      window.removeEventListener("storage_ads_changed", loadAdsConfig);
    };
  }, [type, currentPlan]);

  const handleAdClick = () => {
    if (!activeAd) return;
    
    const savedCampaigns = localStorage.getItem("admin_ad_campaigns");
    if (savedCampaigns) {
      try {
        const parsed: AdCampaign[] = JSON.parse(savedCampaigns);
        const updated = parsed.map(c => {
          if (c.id === activeAd.id) {
            return { ...c, clicks: c.clicks + 1 };
          }
          return c;
        });
        localStorage.setItem("admin_ad_campaigns", JSON.stringify(updated));
        
        // Trigger event to refresh stats in manager if open
        window.dispatchEvent(new Event("storage_ads_changed"));
      } catch (e) {
        console.warn(e);
      }
    }
  };

  if (!showAds) return null;

  // Render Google AdSense Block if enabled & selected
  if (adsenseEnabled) {
    return (
      <div className={`relative bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-center ${
        type === "banner" 
          ? "w-full py-5" 
          : type === "banner-slim" 
          ? "w-full py-2.5" 
          : "w-full min-h-[180px] flex flex-col justify-center"
      }`}>
        <div className="absolute top-1.5 right-2 flex items-center gap-1.5 text-[8.5px] font-mono text-slate-500">
          <span>Ads by Google</span>
          <Info className="h-3 w-3" />
        </div>
        
        <div className="space-y-1.5 py-3 font-mono">
          <div className="text-[10px] text-amber-500 font-extrabold tracking-wider uppercase flex items-center justify-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AdSense Tag Simulated</span>
          </div>
          <div className="text-[11px] text-slate-300">
            ca-pub-{adsensePubId} / slot-{adsenseSlot}
          </div>
          <p className="text-[9.5px] text-slate-500 max-w-lg mx-auto">
            This space triggers Google AdSense responsive auction tags in production. Premium upgrade bypasses all third-party scripts.
          </p>
        </div>
        
        <div className="absolute bottom-1.5 left-2 text-[8px] font-mono text-slate-600">
          Format: {type.toUpperCase()}
        </div>
      </div>
    );
  }

  // Render Custom Ad Campaign
  if (activeAd) {
    if (type === "banner-slim") {
      return (
        <a 
          href={activeAd.linkUrl === "#upgrade" ? "#" : activeAd.linkUrl}
          target={activeAd.linkUrl.startsWith("http") ? "_blank" : undefined}
          rel="noopener noreferrer"
          onClick={handleAdClick}
          className="block bg-gradient-to-r from-blue-950/20 via-slate-900/40 to-slate-950 border border-slate-800/80 rounded-xl p-3 hover:border-slate-700 transition-all cursor-pointer"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2.5">
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] px-1.5 py-0.5 rounded font-black">SPONSORED</span>
              <div>
                <strong className="text-white font-bold">{activeAd.title}</strong>
                <span className="text-[11px] text-slate-400 ml-2 hidden md:inline">— {activeAd.description}</span>
              </div>
            </div>
            <div className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 shrink-0 font-bold self-end sm:self-auto">
              <span>Learn More</span>
              <ExternalLink className="h-3 w-3" />
            </div>
          </div>
        </a>
      );
    }

    if (type === "sidebar") {
      return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col justify-between font-mono">
          <div className="relative">
            <img 
              src={activeAd.imageUrl} 
              alt="Promotion" 
              referrerPolicy="no-referrer"
              className="w-full h-32 object-cover" 
            />
            <span className="absolute top-2 left-2 bg-slate-950/80 text-amber-400 text-[8px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border border-amber-500/20 backdrop-blur-sm">
              Sponsor Ad
            </span>
          </div>

          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-white leading-snug">{activeAd.title}</h4>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">{activeAd.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-850">
              <a
                href={activeAd.linkUrl === "#upgrade" ? "#" : activeAd.linkUrl}
                target={activeAd.linkUrl.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                onClick={handleAdClick}
                className="w-full py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded text-[10px] font-extrabold uppercase text-center block transition-all flex items-center justify-center gap-1.5"
              >
                <span>Check details</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      );
    }

    // Standard Banner Box (type === 'banner')
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg font-mono relative">
        <div className="absolute top-2.5 right-3 z-10">
          <span className="bg-slate-950/80 text-amber-400 text-[8.5px] font-black tracking-wider uppercase px-2 py-0.5 rounded border border-amber-500/20 backdrop-blur-sm">
            SPONSORED CAMPAIGN
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-stretch">
          {/* Banner Left Image */}
          <div className="md:w-1/3 relative min-h-[100px]">
            <img 
              src={activeAd.imageUrl} 
              alt="" 
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover" 
            />
          </div>

          {/* Banner Content Panel */}
          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-white tracking-wide">{activeAd.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{activeAd.description}</p>
            </div>

            <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-850">
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Award className="h-3.5 w-3.5 text-amber-500" />
                <span>Verified Partner Promotion</span>
              </div>
              
              <a
                href={activeAd.linkUrl === "#upgrade" ? "#" : activeAd.linkUrl}
                target={activeAd.linkUrl.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                onClick={handleAdClick}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[11px] uppercase rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/10 cursor-pointer"
              >
                <span>Visit Sponsor</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Absolute fallback: prompt upgrade promo
  return (
    <div className="bg-gradient-to-r from-blue-950/10 to-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
      <div className="space-y-1 text-center md:text-left">
        <span className="text-[9px] text-blue-400 font-black block">PLATFORM VALUE MESSAGE</span>
        <strong className="text-white">Experience AI Quant Trading fully ad-free</strong>
        <p className="text-[10.5px] text-slate-400">Upgrade to Pro or Sovereign plans to suppress sponsor banners and unlock full predictive models.</p>
      </div>
      <a
        href="#upgrade"
        className="px-4 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-850 text-white font-bold rounded-lg transition-all text-[11px]"
      >
        View Plans
      </a>
    </div>
  );
}
