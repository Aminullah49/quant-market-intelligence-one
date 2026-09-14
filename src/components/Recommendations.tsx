import React, { useState, useEffect } from "react";
import { Recommendation } from "../types";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, 
  query, orderBy, serverTimestamp 
} from "firebase/firestore";
import { 
  Plus, Trash2, Edit, CheckCircle, AlertCircle, Clock, 
  Filter, Search, User, ShieldCheck, Database, RefreshCw, 
  ChevronRight, Sparkles, X, Check, Eye, HelpCircle 
} from "lucide-react";

interface RecommendationsProps {
  userRole: 'admin' | 'user';
  onNavigate?: (section: any) => void;
}

const PRESEEDED_RECOMMENDATIONS = [
  {
    title: "Modularize Monolithic App.tsx Dashboard",
    category: "Software Architecture",
    impact: "Critical" as const,
    effort: "Low" as const,
    status: "In Progress" as const,
    description: "Deconstruct the large 1500+ line App.tsx by extracting modular sub-components (like MarketMap, StrategyLab, and Brokers) into isolated files. This improves maintainability, prevents LLM token exhaustion, and boosts HMR reload efficiency.",
    assignedTo: "Lead Architect"
  },
  {
    title: "Harden Cloud Firestore Security Rules",
    category: "Security",
    impact: "Critical" as const,
    effort: "Medium" as const,
    status: "Proposed" as const,
    description: "Transition our Firebase deployment from open-access development permissions to a fully audited Zero-Trust Attribute-Based Access Control (ABAC) architecture. Employs size limits, key validation, and strict identity verification.",
    assignedTo: "Security Specialist"
  },
  {
    title: "Upgrade Quant Trading Historical Engine",
    category: "Trading Engine",
    impact: "High" as const,
    effort: "High" as const,
    status: "In Progress" as const,
    description: "Incorporate dual-channel backfilling for multi-timeframe candle tracking. This enables our local Quant processor to run sophisticated mathematical indicators (such as ADX, OBV, and Fibonacci retracements) with 99.9% analytical accuracy.",
    assignedTo: "Quant Specialist"
  },
  {
    title: "Enforce Server-Side API Proxying for Secrets",
    category: "Security",
    impact: "High" as const,
    effort: "Medium" as const,
    status: "Completed" as const,
    description: "Isolate all proprietary credentials and keys (like Google Gemini API and broker API handshakes) inside server.ts server-side endpoints. Client never sees secret keys, completely preventing browser scraping attacks.",
    assignedTo: "Backend Engineer"
  },
  {
    title: "Optimize Real-Time WebSocket Handshakes",
    category: "Infrastructure",
    impact: "Medium" as const,
    effort: "Medium" as const,
    status: "Completed" as const,
    description: "Implement real-time low-overhead WebSocket subscribers for high-frequency crypto feeds on Binance. Includes an instant, graceful local simulation fallback if connection is throttled or interrupted.",
    assignedTo: "DevOps Engineer"
  },
  {
    title: "Develop Multi-Timeframe Bias Confluence Scanner",
    category: "Trading Engine",
    impact: "High" as const,
    effort: "Medium" as const,
    status: "Proposed" as const,
    description: "Design a background scanning routine that detects when technical biases align perfectly across M1, M5, M15, H1, H4, and D1 charts, signaling high-confluence entry and exit points for active traders.",
    assignedTo: "Quant Specialist"
  }
];

export default function Recommendations({ userRole, onNavigate }: RecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedImpact, setSelectedImpact] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Recommendation | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formImpact, setFormImpact] = useState<'Low' | 'Medium' | 'High' | 'Critical'>("High");
  const [formEffort, setFormEffort] = useState<'Low' | 'Medium' | 'High'>("Medium");
  const [formStatus, setFormStatus] = useState<'Proposed' | 'In Progress' | 'Completed' | 'Deferred'>("Proposed");
  const [formDescription, setFormDescription] = useState("");
  const [formAssignedTo, setFormAssignedTo] = useState("");

  const isAdmin = userRole === 'admin';

  // Fetch recommendations from Firestore
  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    setSyncStatus('syncing');
    try {
      const colRef = collection(db, "recommendations");
      const snapshot = await getDocs(colRef);
      const list: Recommendation[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          title: data.title || "",
          category: data.category || "",
          impact: data.impact || "High",
          effort: data.effort || "Medium",
          status: data.status || "Proposed",
          description: data.description || "",
          assignedTo: data.assignedTo || "Unassigned",
          createdAt: data.createdAt || new Date().toISOString()
        });
      });

      // Sort by creation or impact level
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // If database is empty, seed defaults!
      if (list.length === 0) {
        await seedDefaultRecommendations();
      } else {
        setRecommendations(list);
        setSyncStatus('success');
      }
    } catch (err: any) {
      console.error("Error loading recommendations:", err);
      setError("Failed to fetch recommendations from Firestore database. Running in local fallback state.");
      setSyncStatus('error');
      
      // Fallback to pre-seeded list locally if database fails or is offline
      const savedLocal = localStorage.getItem("local_recommendations");
      if (savedLocal) {
        setRecommendations(JSON.parse(savedLocal));
      } else {
        const preseededWithIds = PRESEEDED_RECOMMENDATIONS.map((r, idx) => ({
          ...r,
          id: `local_rec_${idx}`,
          createdAt: new Date(Date.now() - idx * 3600000).toISOString()
        }));
        setRecommendations(preseededWithIds);
        localStorage.setItem("local_recommendations", JSON.stringify(preseededWithIds));
      }
    } finally {
      setLoading(false);
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  // Seed default recommendations into Firestore
  const seedDefaultRecommendations = async () => {
    setLoading(true);
    try {
      const colRef = collection(db, "recommendations");
      const seeded: Recommendation[] = [];
      
      for (const rec of PRESEEDED_RECOMMENDATIONS) {
        const payload = {
          ...rec,
          createdAt: new Date().toISOString()
        };
        try {
          const docRef = await addDoc(colRef, payload);
          seeded.push({
            id: docRef.id,
            ...payload
          });
        } catch (dbErr) {
          // If Firestore fails due to permission / offline, capture it
          handleFirestoreError(dbErr, OperationType.CREATE, "recommendations");
        }
      }

      setRecommendations(seeded);
      setSyncStatus('success');
    } catch (err) {
      console.warn("Could not seed recommendations into Firestore. Using local storage seed fallback.", err);
      const preseededWithIds = PRESEEDED_RECOMMENDATIONS.map((r, idx) => ({
        ...r,
        id: `local_rec_${idx}`,
        createdAt: new Date(Date.now() - idx * 3600000).toISOString()
      }));
      setRecommendations(preseededWithIds);
      localStorage.setItem("local_recommendations", JSON.stringify(preseededWithIds));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  // Open form for adding new recommendation
  const handleOpenAddForm = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormCategory("Trading Engine");
    setFormImpact("High");
    setFormEffort("Medium");
    setFormStatus("Proposed");
    setFormDescription("");
    setFormAssignedTo("");
    setIsFormOpen(true);
  };

  // Open form for editing existing recommendation
  const handleOpenEditForm = (item: Recommendation) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormImpact(item.impact);
    setFormEffort(item.effort);
    setFormStatus(item.status);
    setFormDescription(item.description);
    setFormAssignedTo(item.assignedTo);
    setIsFormOpen(true);
  };

  // Save Recommendation (Create or Update)
  const handleSaveRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim() || !formCategory.trim() || !formAssignedTo.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    const payload = {
      title: formTitle.trim(),
      category: formCategory.trim(),
      impact: formImpact,
      effort: formEffort,
      status: formStatus,
      description: formDescription.trim(),
      assignedTo: formAssignedTo.trim(),
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString()
    };

    setLoading(true);
    try {
      if (editingItem) {
        // Update document
        const isLocal = editingItem.id.startsWith("local_rec_");
        if (isLocal) {
          const updated = recommendations.map(r => r.id === editingItem.id ? { ...r, ...payload } : r);
          setRecommendations(updated);
          localStorage.setItem("local_recommendations", JSON.stringify(updated));
        } else {
          const docRef = doc(db, "recommendations", editingItem.id);
          await updateDoc(docRef, payload);
          setRecommendations(prev => prev.map(r => r.id === editingItem.id ? { ...r, ...payload } : r));
        }
      } else {
        // Create document
        try {
          const colRef = collection(db, "recommendations");
          const docRef = await addDoc(colRef, payload);
          setRecommendations(prev => [{ id: docRef.id, ...payload }, ...prev]);
        } catch (dbErr) {
          // Local fallback creation
          const newId = `local_rec_${Date.now()}`;
          const newRec = { id: newId, ...payload };
          const updated = [newRec, ...recommendations];
          setRecommendations(updated);
          localStorage.setItem("local_recommendations", JSON.stringify(updated));
        }
      }
      setIsFormOpen(false);
      setSyncStatus('success');
    } catch (err) {
      console.error("Save error:", err);
      alert("An error occurred while saving the recommendation. Check console/logs.");
    } finally {
      setLoading(false);
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  // Delete Recommendation
  const handleDeleteRecommendation = async (id: string) => {
    if (!window.confirm("Are you absolutely sure you want to delete this strategic action recommendation?")) {
      return;
    }

    setLoading(true);
    try {
      const isLocal = id.startsWith("local_rec_");
      if (isLocal) {
        const updated = recommendations.filter(r => r.id !== id);
        setRecommendations(updated);
        localStorage.setItem("local_recommendations", JSON.stringify(updated));
      } else {
        const docRef = doc(db, "recommendations", id);
        await deleteDoc(docRef);
        setRecommendations(prev => prev.filter(r => r.id !== id));
      }
      setSyncStatus('success');
    } catch (err) {
      console.error("Delete error:", err);
      alert("Permission denied or database error during deletion.");
    } finally {
      setLoading(false);
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  // Status badge style helper
  const getStatusBadge = (status: Recommendation['status']) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
      case 'In Progress':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/25';
      case 'Proposed':
        return 'bg-slate-500/15 text-slate-400 border border-slate-700/50';
      case 'Deferred':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/25';
    }
  };

  // Impact badge style helper
  const getImpactBadge = (impact: Recommendation['impact']) => {
    switch (impact) {
      case 'Critical':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/25';
      case 'High':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/25';
      case 'Medium':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/25';
      case 'Low':
        return 'bg-slate-500/10 text-slate-400 border border-slate-800';
    }
  };

  // Effort badge style helper
  const getEffortBadge = (effort: Recommendation['effort']) => {
    switch (effort) {
      case 'High':
        return 'bg-red-500/5 text-red-400 border border-red-500/20';
      case 'Medium':
        return 'bg-amber-500/5 text-amber-400 border border-amber-500/20';
      case 'Low':
        return 'bg-emerald-500/5 text-emerald-400 border border-emerald-500/20';
    }
  };

  // Get categories for filtering
  const categories = ["all", ...Array.from(new Set(recommendations.map(r => r.category)))];

  // Filter list
  const filteredRecommendations = recommendations.filter(rec => {
    const matchesSearch = rec.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          rec.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rec.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rec.assignedTo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || rec.category === selectedCategory;
    const matchesImpact = selectedImpact === "all" || rec.impact === selectedImpact;
    const matchesStatus = selectedStatus === "all" || rec.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesImpact && matchesStatus;
  });

  // Calculate high-level progress stats
  const totalCount = recommendations.length;
  const completedCount = recommendations.filter(r => r.status === 'Completed').length;
  const inProgressCount = recommendations.filter(r => r.status === 'In Progress').length;
  const proposedCount = recommendations.filter(r => r.status === 'Proposed').length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Title Header area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-indigo-500" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-blue-400 animate-pulse" />
            <h1 className="text-lg font-black tracking-widest text-white uppercase font-mono">
              Strategic Recommendations Action Plan
            </h1>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
            A real-time, persistent roadmap generated based on comprehensive platform audit logs. Focuses on performance scaling, software design craftsmanship, database integrity, and robust security rules.
          </p>
        </div>

        {/* Sync & Role indicators */}
        <div className="flex items-center gap-3 self-start md:self-center">
          {syncStatus === 'syncing' && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />
              Syncing Cloud DB...
            </span>
          )}
          {syncStatus === 'success' && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
              <Check className="h-3 w-3" />
              Synced!
            </span>
          )}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1 rounded-xl text-[10px] font-mono font-bold">
            <Database className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-slate-500">DB STATUS:</span>
            <span className="text-blue-400">FIRESTORE ACTIVE</span>
          </div>

          <div className={`flex items-center gap-1.5 border px-3 py-1 rounded-xl text-[10px] font-mono font-bold ${
            isAdmin ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400" : "bg-slate-950 border-slate-800 text-slate-400"
          }`}>
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>ROLE:</span>
            <span>{userRole.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Progress tracker bento widget */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Goal completion percentage */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between h-[105px]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Roadmap Completed</span>
            <span className="text-xs font-black text-blue-400 font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 mt-2">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-[9px] text-slate-500 font-mono mt-1 block">
            {completedCount} of {totalCount} total tasks implemented
          </span>
        </div>

        {/* Categories split counts */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between h-[105px]">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">In Development</span>
          <span className="text-2xl font-black text-blue-400 font-mono mt-1">{inProgressCount}</span>
          <span className="text-[9px] text-slate-400 block font-mono leading-normal">
            Tasks currently being modularized or optimized by our active dev teams.
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between h-[105px]">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Proposed & Under Audit</span>
          <span className="text-2xl font-black text-slate-400 font-mono mt-1">{proposedCount}</span>
          <span className="text-[9px] text-slate-400 block font-mono leading-normal">
            Security audits and system architecture designs proposed for future sprints.
          </span>
        </div>

        {/* Action item card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between h-[105px] relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 h-16 w-16 bg-emerald-500/5 rounded-full group-hover:scale-125 transition-all duration-300" />
          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">Admin Controls</span>
          <div className="mt-1">
            {isAdmin ? (
              <button
                onClick={handleOpenAddForm}
                className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[10px] font-black uppercase rounded-lg tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Strategic Action</span>
              </button>
            ) : (
              <div className="text-[9px] text-slate-400 font-mono leading-tight bg-slate-950 border border-slate-850 p-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Admin token lock active. Unlock admin mode in top header or Settings to create/edit.</span>
              </div>
            )}
          </div>
          <span className="text-[8px] text-slate-500 font-mono text-center">Audit and modify recommendations on demand</span>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-slate-900 border border-slate-800/60 p-4 rounded-xl flex flex-col lg:flex-row gap-4 items-center justify-between font-mono text-[11px]">
        {/* Search Input */}
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search action items, descriptions, assignees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 pl-10 pr-4 py-2 rounded-xl outline-none focus:border-blue-500/50 text-xs transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-slate-500 uppercase text-[9px] font-bold">Filters:</span>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-[10px] rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500/40 transition-all cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.filter(c => c !== "all").map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Impact Filter */}
          <select
            value={selectedImpact}
            onChange={(e) => setSelectedImpact(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-[10px] rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500/40 transition-all cursor-pointer"
          >
            <option value="all">All Impacts</option>
            <option value="Critical">Critical Impact</option>
            <option value="High">High Impact</option>
            <option value="Medium">Medium Impact</option>
            <option value="Low">Low Impact</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-[10px] rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500/40 transition-all cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="Proposed">Proposed</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Deferred">Deferred</option>
          </select>

          {/* Refresh Action */}
          <button
            onClick={fetchRecommendations}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
            title="Reload Action Plan from Firestore"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* RECOMMENDATIONS CONTENT CONTAINER */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-16 flex flex-col items-center justify-center text-center gap-3">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="text-xs font-mono text-slate-400 tracking-wider">Syncing roadmap index from Google Firestore DB...</p>
        </div>
      ) : filteredRecommendations.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4">
          <AlertCircle className="h-10 w-10 text-slate-600" />
          <div>
            <h3 className="text-sm font-bold text-white uppercase font-mono">No Recommendations Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              No matching recommendations fit the selected filter queries. Clear search or filters to see all roadmap actions.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSelectedImpact("all");
              setSelectedStatus("all");
            }}
            className="px-4 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 hover:text-white text-slate-400 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredRecommendations.map((rec) => (
            <div 
              key={rec.id} 
              className="bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all duration-200 relative group"
            >
              <div>
                {/* Header row: category & badges */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/40 pb-3 mb-3.5">
                  <span className="text-[10px] font-mono font-black text-blue-400 uppercase tracking-widest">
                    // {rec.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-[8.5px] font-mono font-black">
                    <span className={`px-2 py-0.5 rounded ${getImpactBadge(rec.impact)}`}>
                      IMPACT: {rec.impact.toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 rounded ${getEffortBadge(rec.effort)}`}>
                      EFFORT: {rec.effort.toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 rounded ${getStatusBadge(rec.status)}`}>
                      {rec.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-sm font-extrabold text-white group-hover:text-blue-400 transition-colors duration-200 leading-tight">
                  {rec.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2.5 font-mono">
                  {rec.description}
                </p>
              </div>

              {/* Footer metadata & operations */}
              <div className="flex items-center justify-between gap-3 border-t border-slate-850 pt-4 mt-5">
                <div className="flex items-center gap-4 text-[9px] font-mono text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-600" />
                    <span>Assigned: <strong className="text-slate-300">{rec.assignedTo}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-600" />
                    <span>Created: <strong>{new Date(rec.createdAt).toLocaleDateString()}</strong></span>
                  </div>
                </div>

                {/* Admin operation utilities */}
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditForm(rec)}
                      className="p-1.5 bg-slate-950 hover:bg-blue-950/40 border border-slate-800 hover:border-blue-900/50 text-slate-400 hover:text-blue-400 rounded-lg transition-all cursor-pointer"
                      title="Edit Recommendation"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRecommendation(rec.id)}
                      className="p-1.5 bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/50 text-slate-400 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                      title="Delete Recommendation"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-[9.5px] font-mono text-slate-500 flex items-center gap-1 border border-slate-800/40 px-2 py-0.5 rounded-lg bg-slate-950">
                    <ShieldCheck className="h-3 w-3 text-slate-600" />
                    <span>ReadOnly</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT SECURITY ACTION MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-blue-500 to-indigo-500" />

            <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-400" />
                <span className="text-xs font-black uppercase tracking-widest text-white font-mono">
                  {editingItem ? "EDIT STRATEGIC ROADMAP ACTION" : "CREATE NEW STRATEGIC ROADMAP ACTION"}
                </span>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecommendation} className="flex flex-col gap-4 text-xs font-mono">
              {/* Title Input */}
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                  Recommendation / Task Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Enforce Server-Side API Proxying"
                  maxLength={150}
                  required
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500/50 transition-all"
                />
              </div>

              {/* Grid selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Selection */}
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                    Strategic Category *
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g., Software Architecture, Security"
                    required
                    maxLength={100}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>

                {/* Assigned To selection */}
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                    Assignee / Team *
                  </label>
                  <input
                    type="text"
                    value={formAssignedTo}
                    onChange={(e) => setFormAssignedTo(e.target.value)}
                    placeholder="e.g., Security Specialist, Lead Architect"
                    required
                    maxLength={100}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Impact Level selector */}
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                    Impact Level *
                  </label>
                  <select
                    value={formImpact}
                    onChange={(e) => setFormImpact(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                  >
                    <option value="Critical">Critical Impact</option>
                    <option value="High">High Impact</option>
                    <option value="Medium">Medium Impact</option>
                    <option value="Low">Low Impact</option>
                  </select>
                </div>

                {/* Effort Selection */}
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                    Implementation Effort *
                  </label>
                  <select
                    value={formEffort}
                    onChange={(e) => setFormEffort(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                  >
                    <option value="High">High Effort</option>
                    <option value="Medium">Medium Effort</option>
                    <option value="Low">Low Effort</option>
                  </select>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                    Execution Status *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                  >
                    <option value="Proposed">Proposed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Deferred">Deferred</option>
                  </select>
                </div>
              </div>

              {/* Description field */}
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">
                  Detailed Roadmap Action & Description *
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe the action plan, technical challenges, and target milestones..."
                  required
                  rows={5}
                  maxLength={2000}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500/50 transition-all resize-none leading-relaxed"
                />
                <div className="text-[8.5px] text-slate-500 text-right mt-1">
                  {formDescription.length} / 2000 characters
                </div>
              </div>

              {/* Save / Cancel buttons */}
              <div className="flex gap-3 border-t border-slate-850 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-300 font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-blue-950/40"
                >
                  {editingItem ? "Update Action" : "Create Action"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
