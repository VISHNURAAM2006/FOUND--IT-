"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AdminStats {
  totalStudents: number;
  totalLost: number;
  totalFound: number;
  totalReports: number;
  activeReports: number;
  resolvedReports: number;
  completedHandovers: number;
  activeChats: number;
  totalClaims: number;
}

interface StudentUser {
  _id: string;
  name: string;
  email: string;
  image?: string | null;
  createdAt?: string | null;
  lostCount: number;
  foundCount: number;
  chatsCount: number;
}

interface ReportItem {
  _id: string;
  title: string;
  category: string;
  type: "LOST" | "FOUND";
  brand?: string;
  model?: string;
  color?: string;
  location?: string;
  lostDate?: string;
  foundDate?: string;
  description?: string;
  contactPhone?: string;
  hiddenQuestion?: string;
  hiddenAnswer?: string;
  imageUrl?: string | null;
  userEmail: string;
  userName: string;
  status: string;
  receivedBy?: string | null;
  handoverStatus?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface HandoverRecord {
  _id: string;
  reportId: string;
  reportTitle: string;
  founderEmail: string;
  claimantEmail: string;
  otp?: string;
  status: "PENDING" | "COMPLETED" | "EXPIRED" | "CANCELLED";
  initiatedAt: string;
  completedAt?: string;
}

interface ChatRecord {
  _id: string;
  reportId: string;
  reportTitle: string;
  reportCategory: string;
  founderName: string;
  founderEmail: string;
  claimantName: string;
  claimantEmail: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  // Theme State: Light mode (default) vs Dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin_theme");
    if (saved === "dark") {
      setIsDarkMode(true);
    } else {
      setIsDarkMode(false);
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem("admin_theme", next ? "dark" : "light");
  };

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<StudentUser[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [handovers, setHandovers] = useState<HandoverRecord[]>([]);
  const [chats, setChats] = useState<ChatRecord[]>([]);

  // Navigation tab: "complaints" | "students" | "handovers" | "chats"
  const [activeTab, setActiveTab] = useState<"complaints" | "students" | "handovers" | "chats">(
    "complaints"
  );

  // Complaints filter & search
  const [reportTypeFilter, setReportTypeFilter] = useState<"ALL" | "LOST" | "FOUND" | "RESOLVED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected report for inspection modal
  const [inspectingReport, setInspectingReport] = useState<ReportItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/data");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setUsers(data.users || []);
        setReports(data.reports || []);
        setHandovers(data.handovers || []);
        setChats(data.chats || []);
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
      router.push("/admin/login");
    } catch {
      router.push("/admin/login");
    }
  };

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_report_status", reportId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage(`Report status updated to ${newStatus}.`);
        setReports((prev) =>
          prev.map((r) => (r._id === reportId ? { ...r, status: newStatus } : r))
        );
        if (inspectingReport && inspectingReport._id === reportId) {
          setInspectingReport({ ...inspectingReport, status: newStatus });
        }
      } else {
        alert(data.error || "Failed to update status.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating status.");
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedbackMessage(""), 3500);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to permanently delete this complaint? This cannot be undone.")) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_report", reportId }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage("Report removed permanently.");
        setReports((prev) => prev.filter((r) => r._id !== reportId));
        setInspectingReport(null);
      } else {
        alert(data.error || "Failed to delete report.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting report.");
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedbackMessage(""), 3500);
    }
  };

  const handleCloseChat = async (chatId: string) => {
    if (!confirm("Are you sure you want to close this arbitration chat?")) return;
    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close_chat", chatId }),
      });
      const data = await res.json();
      if (data.success) {
        setChats((prev) =>
          prev.map((c) => (c._id === chatId ? { ...c, status: "CLOSED" } : c))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered reports calculation
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // Type filter
      if (reportTypeFilter === "LOST" && r.type !== "LOST") return false;
      if (reportTypeFilter === "FOUND" && r.type !== "FOUND") return false;
      if (
        reportTypeFilter === "RESOLVED" &&
        r.status !== "RESOLVED" &&
        r.status !== "RETURNED" &&
        r.status !== "CLOSED"
      ) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesCategory = r.category.toLowerCase().includes(q);
        const matchesLocation = (r.location || "").toLowerCase().includes(q);
        const matchesEmail = r.userEmail.toLowerCase().includes(q);
        const matchesName = r.userName.toLowerCase().includes(q);
        const matchesBrand = (r.brand || "").toLowerCase().includes(q);
        const matchesReceiver = (r.receivedBy || "").toLowerCase().includes(q);
        return (
          matchesTitle ||
          matchesCategory ||
          matchesLocation ||
          matchesEmail ||
          matchesName ||
          matchesBrand ||
          matchesReceiver
        );
      }

      return true;
    });
  }, [reports, reportTypeFilter, searchQuery]);

  if (isLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-3 ${
        isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}>
        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold opacity-70">Loading Found!t Administration Console...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col ${
      isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"
    }`}>
      {/* Top Navigation */}
      <header className={`border-b sticky top-0 z-30 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 transition-colors ${
        isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white/95 border-slate-200 shadow-xs"
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black text-lg shadow-sm">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`font-extrabold text-sm sm:text-base tracking-wide ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Found!t Administration
              </h1>
              <span className="text-[10px] bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Cloud DB
              </span>
            </div>
            <p className={`text-[11px] hidden sm:block ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              Campus Lost &amp; Found Oversight, Dispute Arbitration &amp; Verification History
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* ☀️ / 🌙 Dark Mode to Light Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              isDarkMode
                ? "bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700"
                : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100 shadow-2xs"
            }`}
            title="Toggle Dark / Light Mode"
          >
            <span>{isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}</span>
          </button>

          <button
            type="button"
            onClick={loadAdminData}
            title="Refresh database records"
            className={`p-2 rounded-xl transition text-xs flex items-center gap-1.5 cursor-pointer ${
              isDarkMode
                ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                : "bg-slate-200/80 hover:bg-slate-300 text-slate-700"
            }`}
          >
            <span>🔄</span>
            <span className="hidden sm:inline font-semibold">Refresh</span>
          </button>

          <Link
            href="/"
            target="_blank"
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition hidden md:flex items-center gap-1 ${
              isDarkMode
                ? "bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/80"
                : "bg-slate-200/80 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-300"
            }`}
          >
            <span>🌐 View Public Site</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-500 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Feedback Banner */}
        {feedbackMessage && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 rounded-2xl text-xs font-bold animate-in fade-in flex items-center gap-2">
            <span>✓</span>
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* KPI Metric Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 animate-slide-up">
            <div className={`p-4 rounded-2xl border flex flex-col justify-between card-hover-effect ${
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300"
            }`}>
              <div className="flex items-center justify-between text-xs font-bold opacity-70">
                <span>Students</span>
                <span className="animate-bounce-subtle">👥</span>
              </div>
              <div className="mt-2">
                <span className={`text-2xl sm:text-3xl font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  {stats.totalStudents}
                </span>
                <span className="text-[11px] opacity-60 block">Registered Users</span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border flex flex-col justify-between card-hover-effect ${
              isDarkMode ? "bg-slate-900 border-blue-900/40" : "bg-white border-blue-200 shadow-xs hover:shadow-md hover:border-blue-300"
            }`}>
              <div className="flex items-center justify-between text-blue-500 text-xs font-bold">
                <span>Lost Reports</span>
                <span className="animate-bounce-subtle">🔍</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl sm:text-3xl font-black text-blue-600">{stats.totalLost}</span>
                <span className="text-[11px] opacity-60 block">Reported by Losers</span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border flex flex-col justify-between card-hover-effect ${
              isDarkMode ? "bg-slate-900 border-emerald-900/40" : "bg-white border-emerald-200 shadow-xs hover:shadow-md hover:border-emerald-300"
            }`}>
              <div className="flex items-center justify-between text-emerald-600 text-xs font-bold">
                <span>Found Reports</span>
                <span className="animate-bounce-subtle">🎁</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.totalFound}</span>
                <span className="text-[11px] opacity-60 block">Handed Over Items</span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border flex flex-col justify-between card-hover-effect ${
              isDarkMode ? "bg-slate-900 border-purple-900/40" : "bg-white border-purple-200 shadow-xs hover:shadow-md hover:border-purple-300"
            }`}>
              <div className="flex items-center justify-between text-purple-600 text-xs font-bold">
                <span>Resolved</span>
                <span className="animate-bounce-subtle">🤝</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl sm:text-3xl font-black text-purple-600">
                  {stats.completedHandovers || stats.resolvedReports}
                </span>
                <span className="text-[11px] opacity-60 block">Verified Handover History</span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border col-span-2 sm:col-span-1 flex flex-col justify-between card-hover-effect ${
              isDarkMode ? "bg-slate-900 border-amber-900/40" : "bg-white border-amber-200 shadow-xs hover:shadow-md hover:border-amber-300"
            }`}>
              <div className="flex items-center justify-between text-amber-600 text-xs font-bold">
                <span>Active Chats</span>
                <span className="animate-bounce-subtle">💬</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl sm:text-3xl font-black text-amber-600">{stats.activeChats}</span>
                <span className="text-[11px] opacity-60 block">In Dispute / Arbitration</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className={`border-b flex items-center gap-2 overflow-x-auto pb-0.5 ${
          isDarkMode ? "border-slate-800" : "border-slate-200"
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab("complaints")}
            className={`px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "complaints"
                ? isDarkMode
                  ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400 border-x border-slate-800"
                  : "bg-white text-amber-600 border-t-2 border-amber-500 border-x border-slate-200 shadow-xs"
                : isDarkMode
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>📋 All Complaints</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
              isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
            }`}>
              {reports.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("students")}
            className={`px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "students"
                ? isDarkMode
                  ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400 border-x border-slate-800"
                  : "bg-white text-amber-600 border-t-2 border-amber-500 border-x border-slate-200 shadow-xs"
                : isDarkMode
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>👥 Registered Students</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
              isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
            }`}>
              {users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("handovers")}
            className={`px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "handovers"
                ? isDarkMode
                  ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400 border-x border-slate-800"
                  : "bg-white text-amber-600 border-t-2 border-amber-500 border-x border-slate-200 shadow-xs"
                : isDarkMode
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>📜 Handover Audit Trail</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
              isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
            }`}>
              {handovers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("chats")}
            className={`px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "chats"
                ? isDarkMode
                  ? "bg-slate-900 text-amber-400 border-t-2 border-amber-400 border-x border-slate-800"
                  : "bg-white text-amber-600 border-t-2 border-amber-500 border-x border-slate-200 shadow-xs"
                : isDarkMode
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>💬 Live Chat Arbitrations</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${
              isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
            }`}>
              {chats.length}
            </span>
          </button>
        </div>

        {/* ── TAB 1: ALL COMPLAINTS (LOST & FOUND) ── */}
        {activeTab === "complaints" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className={`p-3.5 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
            }`}>
              {/* Type Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {(["ALL", "LOST", "FOUND", "RESOLVED"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setReportTypeFilter(filter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      reportTypeFilter === filter
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : isDarkMode
                        ? "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                        : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                    }`}
                  >
                    {filter === "ALL" && "All Reports"}
                    {filter === "LOST" && "🔍 Lost Items"}
                    {filter === "FOUND" && "🎁 Found Items"}
                    {filter === "RESOLVED" && "✓ Resolved / Closed"}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[280px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Search item, email, location, recipient..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:border-amber-500 border ${
                    isDarkMode
                      ? "bg-slate-950 border-slate-800 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                  }`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Complaints Table */}
            <div className={`rounded-2xl border overflow-hidden ${
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`uppercase tracking-wider font-bold border-b ${
                    isDarkMode ? "bg-slate-950 text-slate-400 border-slate-800" : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}>
                    <tr>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Item Title / Details</th>
                      <th className="py-3.5 px-4">Campus Location</th>
                      <th className="py-3.5 px-4">Student Submitter</th>
                      {/* 🤝 NEW COLUMN: Student who received the product */}
                      <th className="py-3.5 px-4">Received By (Recipient)</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? "divide-slate-800/60" : "divide-slate-100"}`}>
                    {filteredReports.length > 0 ? (
                      filteredReports.map((r) => {
                        const isLost = r.type === "LOST";
                        const isClosed =
                          r.status === "RESOLVED" || r.status === "RETURNED" || r.status === "CLOSED";

                        return (
                          <tr
                            key={r._id}
                            className={`transition group cursor-pointer ${
                              isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50"
                            }`}
                            onClick={() => setInspectingReport(r)}
                          >
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                  isLost
                                    ? "bg-blue-500/15 text-blue-500 border-blue-500/30"
                                    : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                                }`}
                              >
                                {isLost ? "LOST" : "FOUND"}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className={`font-bold transition ${
                                isDarkMode ? "text-white group-hover:text-amber-400" : "text-slate-900 group-hover:text-amber-600"
                              }`}>
                                {r.title}
                              </div>
                              <div className="text-[11px] opacity-70 flex items-center gap-2 mt-0.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  isDarkMode ? "bg-slate-800" : "bg-slate-100"
                                }`}>
                                  {r.category}
                                </span>
                                {r.color && <span>Color: {r.color}</span>}
                                {r.imageUrl && <span title="Photo attached">📷 Attached</span>}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 opacity-80">
                              📍 {r.location || "Not specified"}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className={`font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                                {r.userName}
                              </div>
                              <div className="text-[11px] opacity-60 font-mono">{r.userEmail}</div>
                            </td>

                            {/* 🤝 RECIPIENT COLUMN VALUE */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {r.receivedBy ? (
                                <div className="flex flex-col">
                                  <div className={`flex items-center gap-1.5 font-bold text-xs ${
                                    isDarkMode ? "text-emerald-400" : "text-emerald-700"
                                  }`}>
                                    <span>🤝</span>
                                    <span className="font-mono text-[11px] truncate max-w-[170px]">{r.receivedBy}</span>
                                  </div>
                                  <span className={`text-[10px] font-black uppercase tracking-wider ${
                                    isDarkMode ? "text-emerald-500" : "text-emerald-600"
                                  }`}>
                                    Verified Received
                                  </span>
                                </div>
                              ) : (
                                <span className={`text-xs italic ${
                                  isDarkMode ? "text-slate-500" : "text-slate-400"
                                }`}>
                                  — Pending / Unclaimed
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                                  isClosed
                                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                                    : r.status === "MATCHED"
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                                    : isDarkMode
                                    ? "bg-slate-800 text-slate-300 border border-slate-700"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                }`}
                              >
                                {r.status || "OPEN"}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-[11px] opacity-70 whitespace-nowrap">
                              {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => setInspectingReport(r)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition mr-1.5 cursor-pointer ${
                                  isDarkMode
                                    ? "bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white"
                                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200"
                                }`}
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-12 text-center opacity-60">
                          <span className="text-3xl block mb-2">🔍</span>
                          No complaints matching the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: REGISTERED STUDENTS ── */}
        {activeTab === "students" && (
          <div className={`rounded-2xl border overflow-hidden ${
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isDarkMode ? "border-slate-800" : "border-slate-200"
            }`}>
              <div>
                <h3 className={`font-extrabold text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  Registered Campus Students
                </h3>
                <p className="text-xs opacity-70">
                  Student profiles authenticated through Google OAuth &amp; MongoDB Atlas
                </p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
              }`}>
                {users.length} Total Users
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase tracking-wider font-bold border-b ${
                  isDarkMode ? "bg-slate-950 text-slate-400 border-slate-800" : "bg-slate-50 text-slate-600 border-slate-200"
                }`}>
                  <tr>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">College Email</th>
                    <th className="py-3.5 px-4 text-center">Lost Filed</th>
                    <th className="py-3.5 px-4 text-center">Items Found</th>
                    <th className="py-3.5 px-4 text-center">Active Chats</th>
                    <th className="py-3.5 px-4">Registered Date</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? "divide-slate-800/60" : "divide-slate-100"}`}>
                  {users.length > 0 ? (
                    users.map((u) => (
                      <tr key={u._id} className={`transition ${isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}>
                        <td className="py-3.5 px-4 flex items-center gap-3">
                          {u.image ? (
                            <img
                              src={u.image}
                              alt={u.name}
                              className="w-8 h-8 rounded-full border border-slate-400 object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs border border-slate-500">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{u.name}</span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] opacity-80">{u.email}</td>

                        <td className="py-3.5 px-4 text-center font-bold text-blue-500">
                          {u.lostCount}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-emerald-500">
                          {u.foundCount}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-amber-500">
                          {u.chatsCount}
                        </td>

                        <td className="py-3.5 px-4 opacity-70 text-[11px]">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Active"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center opacity-60">
                        No registered students found in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: HANDOVER & OTP AUDIT TRAIL ── */}
        {activeTab === "handovers" && (
          <div className={`rounded-2xl border overflow-hidden ${
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isDarkMode ? "border-slate-800" : "border-slate-200"
            }`}>
              <div>
                <h3 className={`font-extrabold text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  Item Handover &amp; Resolution History
                </h3>
                <p className="text-xs opacity-70">
                  Audit logs of physical item returns, OTP exchanges, and case closures
                </p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                isDarkMode ? "bg-slate-800 text-purple-300" : "bg-purple-100 text-purple-700"
              }`}>
                {handovers.length} Total Handover Records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase tracking-wider font-bold border-b ${
                  isDarkMode ? "bg-slate-950 text-slate-400 border-slate-800" : "bg-slate-50 text-slate-600 border-slate-200"
                }`}>
                  <tr>
                    <th className="py-3.5 px-4">Item</th>
                    <th className="py-3.5 px-4">Founder (Returned By)</th>
                    <th className="py-3.5 px-4">Claimant (Received By)</th>
                    <th className="py-3.5 px-4 text-center">Handover Status</th>
                    <th className="py-3.5 px-4">Initiated</th>
                    <th className="py-3.5 px-4">Completed</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? "divide-slate-800/60" : "divide-slate-100"}`}>
                  {handovers.length > 0 ? (
                    handovers.map((h) => (
                      <tr key={h._id} className={`transition ${isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}>
                        <td className={`py-3.5 px-4 font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                          {h.reportTitle || "Report #" + h.reportId.slice(-6)}
                        </td>

                        <td className="py-3.5 px-4 text-emerald-500 font-mono text-[11px]">
                          {h.founderEmail}
                        </td>

                        <td className="py-3.5 px-4 text-blue-500 font-mono text-[11px]">
                          {h.claimantEmail}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              h.status === "COMPLETED"
                                ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                                : h.status === "PENDING"
                                ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                                : "bg-red-500/20 text-red-500 border border-red-500/30"
                            }`}
                          >
                            {h.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 opacity-70 text-[11px]">
                          {h.initiatedAt ? new Date(h.initiatedAt).toLocaleString() : "—"}
                        </td>

                        <td className="py-3.5 px-4 opacity-70 text-[11px]">
                          {h.completedAt ? new Date(h.completedAt).toLocaleString() : "Pending"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center opacity-60">
                        No handover history recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: LIVE CHAT ARBITRATIONS ── */}
        {activeTab === "chats" && (
          <div className={`rounded-2xl border overflow-hidden ${
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isDarkMode ? "border-slate-800" : "border-slate-200"
            }`}>
              <div>
                <h3 className={`font-extrabold text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  Founder &amp; Claimant Chat Mediations
                </h3>
                <p className="text-xs opacity-70">
                  Active negotiations between founders and claimants over disputed found items
                </p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                isDarkMode ? "bg-slate-800 text-amber-300" : "bg-amber-100 text-amber-800"
              }`}>
                {chats.length} Total Conversations
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase tracking-wider font-bold border-b ${
                  isDarkMode ? "bg-slate-950 text-slate-400 border-slate-800" : "bg-slate-50 text-slate-600 border-slate-200"
                }`}>
                  <tr>
                    <th className="py-3.5 px-4">Item Discussed</th>
                    <th className="py-3.5 px-4">Founder</th>
                    <th className="py-3.5 px-4">Claimant</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Last Activity</th>
                    <th className="py-3.5 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? "divide-slate-800/60" : "divide-slate-100"}`}>
                  {chats.length > 0 ? (
                    chats.map((c) => (
                      <tr key={c._id} className={`transition ${isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}>
                        <td className="py-3.5 px-4">
                          <div className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>{c.reportTitle}</div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            isDarkMode ? "bg-slate-950 text-slate-400" : "bg-slate-100 text-slate-600"
                          }`}>
                            {c.reportCategory}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className={`font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{c.founderName}</div>
                          <div className="text-[11px] font-mono opacity-70">{c.founderEmail}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className={`font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{c.claimantName}</div>
                          <div className="text-[11px] font-mono opacity-70">{c.claimantEmail}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              c.status === "CLOSED"
                                ? isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                                : "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                            }`}
                          >
                            {c.status || "ACTIVE"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 opacity-70 text-[11px]">
                          {c.updatedAt ? new Date(c.updatedAt).toLocaleString() : "—"}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {c.status !== "CLOSED" && (
                            <button
                              type="button"
                              onClick={() => handleCloseChat(c._id)}
                              className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Close Chat
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center opacity-60">
                        No active arbitration chats.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ── FULL COMPLAINT INSPECTOR MODAL ── */}
      {inspectingReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className={`rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border ${
            isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between shrink-0 ${
              isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                    inspectingReport.type === "LOST"
                      ? "bg-blue-500/20 text-blue-500 border-blue-500/30"
                      : "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
                  }`}
                >
                  {inspectingReport.type} REPORT
                </span>
                <span className="text-xs opacity-60 font-mono">
                  ID: #{inspectingReport._id.slice(-6)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectingReport(null)}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition cursor-pointer ${
                  isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                }`}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              <div>
                <h2 className="text-xl font-black">{inspectingReport.title}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap text-xs opacity-80">
                  <span className={`px-2 py-0.5 rounded font-semibold ${
                    isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                  }`}>
                    {inspectingReport.category}
                  </span>
                  <span>•</span>
                  <span>📍 {inspectingReport.location || "Campus"}</span>
                  <span>•</span>
                  <span>
                    Status: <strong className="text-amber-500">{inspectingReport.status}</strong>
                  </span>
                </div>
              </div>

              {/* 🤝 RECIPIENT CARD IN INSPECTOR MODAL */}
              <div className={`p-4 rounded-2xl border space-y-1 ${
                inspectingReport.receivedBy
                  ? isDarkMode ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : isDarkMode ? "bg-slate-950/60 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <span>🤝</span>
                    <span>Student Who Received / Claimed Product</span>
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                    inspectingReport.receivedBy
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}>
                    {inspectingReport.receivedBy ? "Verified Handed Over" : "Pending Claim"}
                  </span>
                </div>
                <p className="text-sm font-mono font-bold pt-1">
                  {inspectingReport.receivedBy ? (
                    inspectingReport.receivedBy
                  ) : (
                    <span className="font-sans font-normal text-xs opacity-80">
                      This item has not yet been handed over or claimed by a student.
                    </span>
                  )}
                </p>
              </div>

              {/* Photo Display if Available */}
              {inspectingReport.imageUrl && (
                <div className={`rounded-2xl overflow-hidden border max-h-64 flex items-center justify-center ${
                  isDarkMode ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-50"
                }`}>
                  <img
                    src={inspectingReport.imageUrl}
                    alt={inspectingReport.title}
                    className="max-h-64 object-contain w-full"
                  />
                </div>
              )}

              {/* Detailed Specs Grid */}
              <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl border text-xs ${
                isDarkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}>
                <div>
                  <span className="opacity-60 block">Brand / Maker</span>
                  <span className="font-bold">{inspectingReport.brand || "—"}</span>
                </div>
                <div>
                  <span className="opacity-60 block">Model / Version</span>
                  <span className="font-bold">{inspectingReport.model || "—"}</span>
                </div>
                <div>
                  <span className="opacity-60 block">Color / Appearance</span>
                  <span className="font-bold">{inspectingReport.color || "—"}</span>
                </div>
                <div>
                  <span className="opacity-60 block">Date Reported</span>
                  <span className="font-bold">
                    {inspectingReport.lostDate || inspectingReport.foundDate || "—"}
                  </span>
                </div>
                <div>
                  <span className="opacity-60 block">Contact Phone</span>
                  <span className="font-bold">{inspectingReport.contactPhone || "—"}</span>
                </div>
                <div>
                  <span className="opacity-60 block">Submitter Email</span>
                  <span className="font-bold truncate block font-mono">
                    {inspectingReport.userEmail}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Item Description &amp; Notes
                </h4>
                <p className={`text-xs p-3 rounded-xl border leading-relaxed whitespace-pre-wrap ${
                  isDarkMode ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                }`}>
                  {inspectingReport.description || "No additional description provided."}
                </p>
              </div>

              {/* Secret Verification Detail (Only for Found items) */}
              {inspectingReport.hiddenQuestion && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
                    <span>🛡️</span>
                    <span>Founder&apos;s Confidential Verification Security</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="opacity-80">
                      <strong>Secret Question:</strong> {inspectingReport.hiddenQuestion}
                    </p>
                    <p className={`font-mono p-2 rounded-lg border border-amber-500/20 font-bold ${
                      isDarkMode ? "bg-slate-950/80 text-amber-300" : "bg-white text-amber-800"
                    }`}>
                      <strong>Correct Answer:</strong> {inspectingReport.hiddenAnswer || "(Not specified)"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className={`p-4 border-t flex flex-wrap items-center justify-between gap-2 shrink-0 ${
              isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus(inspectingReport._id, "RESOLVED")}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  ✓ Mark Resolved
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus(inspectingReport._id, "CLOSED")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer ${
                    isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-200 hover:bg-slate-300 text-slate-800"
                  }`}
                >
                  Close Case
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus(inspectingReport._id, "OPEN")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer ${
                    isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-200 hover:bg-slate-300 text-slate-800"
                  }`}
                >
                  Reopen
                </button>
              </div>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleDeleteReport(inspectingReport._id)}
                className="px-3.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-600/40 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                🗑️ Delete Complaint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
