"use client";

import { useState, useEffect, useCallback } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import VerificationModal from "@/components/VerificationModal";
import ProductChatWorkspace from "@/components/ProductChatWorkspace";

interface Report {
  _id: string;
  title: string;
  category: string;
  type: "LOST" | "FOUND";
  location: string;
  brand?: string;
  model?: string;
  color?: string;
  imageUrl?: string | null;
  status: string;
  userEmail: string;
  userName?: string;
  hiddenQuestion?: string;
  description?: string;
  foundDate?: string;
  createdAt: string;
  isLocked?: boolean;
  isUnlocked?: boolean;
  returnedAt?: string;
  returnedBy?: string;
  returnedTo?: string;
  handoverLogMessage?: string;
}

interface Chat {
  _id: string;
  reportId: string;
  reportTitle: string;
  reportCategory?: string;
  reportImageUrl?: string | null;
  founderEmail: string;
  founderName: string;
  claimantEmail: string;
  claimantName: string;
  status: string;
  lastMessage?: string;
  lastMessageAt?: string;
  report?: Report;
}

// ─── Confirmation Delete Dialog ────────────────────────────────────────────────
function ConfirmDeleteModal({
  report,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  report: Report;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
        <div className="text-3xl mb-3 text-center">🗑️</div>
        <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
          Delete Report?
        </h3>
        <p className="text-sm text-slate-600 text-center mb-1">
          This will permanently remove:
        </p>
        <p className="text-sm font-semibold text-slate-900 text-center mb-5 px-2 line-clamp-2">
          &quot;{report.title}&quot;
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              "Yes, Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Report Card ───────────────────────────────────────────────────────────────
function ReportCard({
  report,
  isOwner,
  onDelete,
  onVerify,
  onOpenChat,
}: {
  report: Report;
  isOwner: boolean;
  onDelete?: (report: Report) => void;
  onVerify?: (report: Report) => void;
  onOpenChat?: (report: Report) => void;
}) {
  const isLockedFound = report.type === "FOUND" && !isOwner && report.isLocked !== false;

  return (
    <div className="border border-slate-200 rounded-2xl p-4 bg-white hover:shadow-md transition flex flex-col justify-between">
      <div>
        {/* Image Display */}
        {report.imageUrl && !isLockedFound ? (
          <img
            src={report.imageUrl}
            alt={report.title}
            className="w-full h-36 object-cover rounded-xl mb-3 border border-slate-200"
          />
        ) : isLockedFound ? (
          <div className="w-full h-36 rounded-xl mb-3 bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 p-3 text-center">
            <span className="text-2xl mb-1">🔒</span>
            <span className="text-xs font-semibold text-slate-600">
              Details Locked
            </span>
            <span className="text-[10px] text-slate-400">
              Answer secret question to unlock
            </span>
          </div>
        ) : null}

        {/* Tags */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {report.status === "RETURNED" ? (
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
              {report.type === "LOST" ? "✓ RECEIVED BACK" : "✓ RETURNED TO OWNER"}
            </span>
          ) : report.status === "HANDOVER_PENDING" ? (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              📦 HANDOVER PENDING
            </span>
          ) : (
            <span
              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                report.type === "LOST"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {report.type}
            </span>
          )}
          <span className="text-xs text-slate-500 font-medium">
            {report.category}
          </span>
          {isOwner && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 ml-auto">
              Mine
            </span>
          )}
          {!isOwner && report.type === "FOUND" && !isLockedFound && report.status !== "RETURNED" && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 ml-auto">
              🔓 Unlocked
            </span>
          )}
        </div>

        {/* Title & Info */}
        <h4 className="font-bold text-slate-900 text-sm line-clamp-2 mb-1">
          {report.title}
        </h4>

        {report.location && (
          <p className="text-xs text-slate-600 flex items-center gap-1 mb-1">
            <span>📍</span>
            <span className="line-clamp-1">{report.location}</span>
          </p>
        )}

        {report.color && !isLockedFound && (
          <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
            <span>🎨</span>
            <span className="line-clamp-1">{report.color}</span>
          </p>
        )}

        {/* Secret Question Teaser */}
        {isLockedFound && report.hiddenQuestion && (
          <div className="mt-2.5 p-2.5 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900">
            <span className="font-bold">Secret Question:</span> &quot;{report.hiddenQuestion}&quot;
          </div>
        )}

        {/* Returned Confirmation Notice */}
        {report.status === "RETURNED" && (
          <div className="mt-2.5 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-medium flex items-center gap-1.5">
            <span>✓</span>
            <span className="truncate">
              {report.type === "LOST"
                ? `Received back from ${report.returnedBy || "Founder"}`
                : `Returned to ${report.returnedTo || "Owner"}`}
            </span>
          </div>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
        <div className="text-[11px] text-slate-400 flex items-center justify-between">
          <span>Status: {report.status}</span>
          <span>
            {report.createdAt
              ? new Date(report.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })
              : "Recent"}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          {/* Delete for owner */}
          {isOwner && onDelete && (
            <button
              onClick={() => onDelete(report)}
              className="text-xs font-semibold px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition border border-red-200"
            >
              🗑️ Delete
            </button>
          )}

          {/* Verify / Unlock for claimant */}
          {isLockedFound && onVerify && (
            <button
              onClick={() => onVerify(report)}
              className="w-full text-xs font-bold px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>🔑</span>
              <span>Answer Question &amp; Unlock</span>
            </button>
          )}

          {/* Unlocked -> Open Side-by-Side Product Details & Chat */}
          {!isOwner && report.type === "FOUND" && !isLockedFound && onOpenChat && (
            <button
              onClick={() => onOpenChat(report)}
              className="w-full text-xs font-bold px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>💬</span>
              <span>View Details &amp; Chat</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Home Page ────────────────────────────────────────────────────────────
export default function HomePage() {
  const { data: session, status } = useSession();

  // Data state
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [foundInventory, setFoundInventory] = useState<Report[]>([]);
  const [hasLostReport, setHasLostReport] = useState<boolean>(false);
  const [userChats, setUserChats] = useState<Chat[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<"my" | "inventory" | "chats">("my");
  const [loadingMy, setLoadingMy] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Active Modals & Workspaces
  const [verifyingReport, setVerifyingReport] = useState<Report | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch user's own reports ────────────────────────────────────────────────
  const fetchMyReports = useCallback(async () => {
    if (!session?.user?.email) return;
    setLoadingMy(true);
    try {
      const res = await fetch(
        `/api/reports?userEmail=${encodeURIComponent(session.user.email)}`
      );
      const data = await res.json();
      if (data.success) {
        setMyReports(data.reports);
        setHasLostReport(data.reports.some((r: Report) => r.type === "LOST"));
      }
    } catch (err) {
      console.error("Error fetching my reports:", err);
    } finally {
      setLoadingMy(false);
    }
  }, [session?.user?.email]);

  // ── Fetch the FOUND inventory ───────────────────────────────────────────────
  const fetchFoundInventory = useCallback(async () => {
    if (!session?.user?.email) return;
    setLoadingInventory(true);
    try {
      const res = await fetch(
        `/api/reports?type=FOUND&viewerEmail=${encodeURIComponent(session.user.email)}`
      );
      const data = await res.json();
      if (data.success) {
        setFoundInventory(data.reports);
      }
    } catch (err) {
      console.error("Error fetching found inventory:", err);
    } finally {
      setLoadingInventory(false);
    }
  }, [session?.user?.email]);

  // ── Fetch User's Active Chats ───────────────────────────────────────────────
  const fetchUserChats = useCallback(async () => {
    if (!session?.user?.email) return;
    setLoadingChats(true);
    try {
      const res = await fetch(
        `/api/chats?userEmail=${encodeURIComponent(session.user.email)}`
      );
      const data = await res.json();
      if (data.success && data.chats) {
        setUserChats(data.chats);
      }
    } catch (err) {
      console.error("Error fetching chats:", err);
    } finally {
      setLoadingChats(false);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (session) {
      fetchMyReports();
      fetchUserChats();
    }
  }, [session, fetchMyReports, fetchUserChats]);

  // Fetch inventory when opened and qualified
  useEffect(() => {
    if (activeTab === "inventory" && hasLostReport) {
      fetchFoundInventory();
    } else if (activeTab === "chats") {
      fetchUserChats();
    }
  }, [activeTab, hasLostReport, fetchFoundInventory, fetchUserChats]);

  // ── Handle Delete ───────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !session?.user?.email) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/reports?id=${deleteTarget._id}&userEmail=${encodeURIComponent(
          session.user.email
        )}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        showToast("Report deleted successfully.");
        setDeleteTarget(null);
        await fetchMyReports();
        if (deleteTarget.type === "FOUND" && hasLostReport) {
          await fetchFoundInventory();
        }
      } else {
        showToast(data.error || "Failed to delete report.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Handle Starting / Opening Side-by-Side Product Chat Workspace ────────────
  const handleStartChatWithFounder = async (
    report: Report,
    founderEmailOverride?: string,
    founderNameOverride?: string
  ) => {
    if (!session?.user?.email) return;

    const fEmail = founderEmailOverride || report.userEmail;
    const fName = founderNameOverride || report.userName || "Founder";

    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report._id,
          reportTitle: report.title,
          reportCategory: report.category,
          reportImageUrl: report.imageUrl || null,
          founderEmail: fEmail,
          founderName: fName,
          claimantEmail: session.user.email,
          claimantName: session.user.name || "Claimant",
        }),
      });

      const data = await res.json();
      if (data.success && data.chat) {
        setVerifyingReport(null); // Close verification modal
        setActiveChat({ ...data.chat, report }); // Open attached side-by-side workspace
        fetchUserChats(); // Refresh chat list
      } else {
        showToast(data.error || "Failed to initialize chat.", "error");
      }
    } catch (err) {
      console.error("Error creating chat:", err);
      showToast("Network error opening chat.", "error");
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ────────────────────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 text-sm font-medium">Loading Found!t...</p>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // NOT LOGGED IN → Login Screen
  // ────────────────────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white text-3xl font-black mb-5 shadow-lg shadow-blue-500/30">
            F!
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Found!t
          </h1>
          <p className="text-slate-600 text-sm mb-8 leading-relaxed">
            College Campus Lost &amp; Found Platform
            <br />
            <span className="text-xs text-slate-400">
              Locate lost belongings or report found items safely.
            </span>
          </p>

          <div className="space-y-3 mb-8 text-left text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
            <div className="flex items-center gap-2.5">
              <span className="text-blue-600 font-bold text-base">🔍</span>
              <span>
                <strong>Report Lost Items</strong> with photos &amp; location
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-emerald-600 font-bold text-base">🎁</span>
              <span>
                <strong>Report Found Items</strong> with secret verification
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-violet-600 font-bold text-base">💬</span>
              <span>
                <strong>Direct Handover Chat</strong> with attached product details
              </span>
            </div>
          </div>

          <button
            onClick={() => signIn("google")}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 active:scale-[0.99] transition shadow-md shadow-slate-900/20"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Sign in with Google</span>
          </button>

          <p className="mt-5 text-[11px] text-slate-400">
            Sign in with your campus Google account to access your reports
          </p>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // LOGGED IN → Home Dashboard
  // ────────────────────────────────────────────────────────────────────────────
  const myLostReports = myReports.filter((r) => r.type === "LOST");
  const myFoundReports = myReports.filter((r) => r.type === "FOUND");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Verification Modal */}
      {verifyingReport && session.user?.email && (
        <VerificationModal
          report={verifyingReport}
          userEmail={session.user.email}
          userName={session.user.name || "Student"}
          onClose={() => setVerifyingReport(null)}
          onStartChat={(rep, fEmail, fName) =>
            handleStartChatWithFounder(rep, fEmail, fName)
          }
          onUnlocked={(updated) => {
            setFoundInventory((prev) =>
              prev.map((r) => (r._id === updated._id ? updated : r))
            );
          }}
        />
      )}

      {/* Side-by-Side Product Details & Live Chat Workspace */}
      {activeChat && session.user?.email && (
        <ProductChatWorkspace
          chat={activeChat}
          currentUserEmail={session.user.email}
          currentUserName={session.user.name || "Student"}
          initialReport={activeChat.report}
          onClose={() => setActiveChat(null)}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          report={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold flex items-center gap-2 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : "✕"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg">
              F!
            </div>
            <span className="font-extrabold text-xl text-slate-900 tracking-tight">
              Found!t
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-800">
                {session.user?.name || "Student"}
              </span>
              <span className="text-xs text-slate-500">{session.user?.email}</span>
            </div>
            {session.user?.image && (
              <img
                src={session.user.image}
                alt="Profile"
                className="w-9 h-9 rounded-full border border-slate-300"
              />
            )}
            <button
              onClick={() => signOut()}
              className="text-xs font-semibold px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition border border-rose-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Welcome Banner */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {session.user?.name?.split(" ")[0]}!
          </h1>
          <p className="text-slate-600 text-sm sm:text-base mt-1.5">
            What would you like to do today?
          </p>
        </div>

        {/* ── 2 Action Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* REPORT LOST */}
          <Link
            href="/report-lost"
            className="group bg-white rounded-3xl p-7 shadow-md border-2 border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
                🔍
              </div>
              <div className="inline-block px-3 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full mb-2">
                Lost an Item?
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition">
                Report Lost Product
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                File a lost item complaint with details, campus location, contact info, and a photo.
              </p>
            </div>
            <div className="flex items-center gap-2 font-bold text-blue-600 text-sm mt-5 group-hover:translate-x-1 transition-transform">
              <span>File Lost Report</span>
              <span>→</span>
            </div>
          </Link>

          {/* REPORT FOUND */}
          <Link
            href="/report-found"
            className="group bg-white rounded-3xl p-7 shadow-md border-2 border-slate-200 hover:border-emerald-500 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
                🎁
              </div>
              <div className="inline-block px-3 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full mb-2">
                Found an Item?
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition">
                Report Found Product
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Found something on campus? Post a photo, location, and a confidential security question.
              </p>
            </div>
            <div className="flex items-center gap-2 font-bold text-emerald-600 text-sm mt-5 group-hover:translate-x-1 transition-transform">
              <span>Submit Found Report</span>
              <span>→</span>
            </div>
          </Link>
        </div>

        {/* ── Tabbed Section ─────────────────────────────────────────────── */}
        <section className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">
          {/* Tab Header */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("my")}
              className={`flex-1 py-4 text-sm font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === "my"
                  ? "bg-white text-slate-900 border-b-2 border-blue-600"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span>📋</span>
              <span>My Reports</span>
              {myReports.length > 0 && (
                <span className="ml-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                  {myReports.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex-1 py-4 text-sm font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === "inventory"
                  ? "bg-white text-slate-900 border-b-2 border-emerald-600"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span>🎁</span>
              <span>Found Inventory</span>
              {hasLostReport && foundInventory.length > 0 && (
                <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                  {foundInventory.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("chats")}
              className={`flex-1 py-4 text-sm font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === "chats"
                  ? "bg-white text-slate-900 border-b-2 border-violet-600"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span>💬</span>
              <span>Campus Chats</span>
              {userChats.length > 0 && (
                <span className="ml-1 text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold">
                  {userChats.length}
                </span>
              )}
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {/* ── TAB 1: MY REPORTS ──────────────────────────────────────── */}
            {activeTab === "my" && (
              <>
                {loadingMy ? (
                  <div className="py-12 text-center text-slate-500 text-sm animate-pulse">
                    Loading your reports...
                  </div>
                ) : myReports.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-3xl mb-3">📭</p>
                    <p className="font-bold text-slate-800 mb-1">No reports yet</p>
                    <p className="text-sm text-slate-500 mb-5">
                      Use the buttons above to file your first Lost or Found report.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Lost sub-section */}
                    {myLostReports.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-sm font-bold text-blue-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span>🔍</span>
                          <span>My Lost Complaints ({myLostReports.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {myLostReports.map((report) => (
                            <ReportCard
                              key={report._id}
                              report={report}
                              isOwner={true}
                              onDelete={setDeleteTarget}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Found sub-section */}
                    {myFoundReports.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span>🎁</span>
                          <span>My Found Submissions ({myFoundReports.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {myFoundReports.map((report) => (
                            <ReportCard
                              key={report._id}
                              report={report}
                              isOwner={true}
                              onDelete={setDeleteTarget}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── TAB 2: FOUND ITEMS INVENTORY ───────────────────────────── */}
            {activeTab === "inventory" && (
              <>
                {/* ACCESS GATE: must have filed a Lost report first */}
                {!hasLostReport ? (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                      🔒
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                      Access Restricted
                    </h3>
                    <p className="text-sm text-slate-600 max-w-sm mx-auto mb-2 leading-relaxed">
                      To protect privacy and prevent false claims, you can only browse the Found Items Inventory after filing{" "}
                      <strong>at least one Lost item complaint</strong>.
                    </p>
                    <p className="text-xs text-slate-400 mb-6">
                      This ensures only students with genuine lost reports can participate.
                    </p>
                    <Link
                      href="/report-lost"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition"
                    >
                      <span>🔍</span>
                      <span>File a Lost Report First</span>
                    </Link>
                  </div>
                ) : loadingInventory ? (
                  <div className="py-12 text-center text-slate-500 text-sm animate-pulse">
                    Loading found items from database...
                  </div>
                ) : foundInventory.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-3xl mb-3">📭</p>
                    <p className="font-bold text-slate-800 mb-1">
                      No found items reported yet
                    </p>
                    <p className="text-sm text-slate-500">
                      Check back later — your item may be reported soon!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {foundInventory.map((report) => (
                      <ReportCard
                        key={report._id}
                        report={report}
                        isOwner={report.userEmail === session.user?.email}
                        onDelete={
                          report.userEmail === session.user?.email
                            ? setDeleteTarget
                            : undefined
                        }
                        onVerify={(rep) => setVerifyingReport(rep)}
                        onOpenChat={(rep) => handleStartChatWithFounder(rep)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── TAB 3: CAMPUS CHATS ────────────────────────────────────── */}
            {activeTab === "chats" && (
              <>
                {loadingChats ? (
                  <div className="py-12 text-center text-slate-500 text-sm animate-pulse">
                    Loading conversations...
                  </div>
                ) : userChats.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-3xl mb-3">💬</p>
                    <p className="font-bold text-slate-800 mb-1">
                      No active conversations yet
                    </p>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
                      When item ownership is confirmed, your direct communication and handover workspace opens here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userChats.map((chat) => {
                      const isClaimant = session.user?.email === chat.claimantEmail;
                      const otherName = isClaimant ? chat.founderName : chat.claimantName;
                      const otherRole = isClaimant ? "Founder" : "Claimant";

                      return (
                        <div
                          key={chat._id}
                          onClick={() => setActiveChat(chat)}
                          className="border border-slate-200 hover:border-violet-400 rounded-2xl p-4 bg-white hover:shadow-md cursor-pointer transition flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-3 mb-3">
                              {chat.reportImageUrl ? (
                                <img
                                  src={chat.reportImageUrl}
                                  alt={chat.reportTitle}
                                  className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center text-xl font-bold">
                                  💬
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                                  {chat.reportTitle}
                                </h4>
                                <p className="text-xs text-slate-500 truncate">
                                  With {otherRole}:{" "}
                                  <strong className="text-slate-800">{otherName}</strong>
                                </p>
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2 italic">
                              &quot;{chat.lastMessage || "Click to open conversation"}&quot;
                            </p>
                          </div>

                          <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                            <span>
                              {chat.status === "RETURNED" ? (
                                <span className="font-bold text-emerald-700 flex items-center gap-1">
                                  <span>✓</span>
                                  <span>
                                    {isClaimant
                                      ? `Received from ${chat.founderName}`
                                      : `Returned to ${chat.claimantName}`}
                                  </span>
                                </span>
                              ) : (
                                `Status: ${chat.status}`
                              )}
                            </span>
                            <span className="font-bold text-violet-600 hover:underline">
                              {chat.status === "RETURNED"
                                ? "View Handover Receipt →"
                                : "Open Details & Chat →"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}