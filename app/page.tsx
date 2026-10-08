"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import VerificationModal from "@/components/VerificationModal";
import ProductChatWorkspace from "@/components/ProductChatWorkspace";
import AiRecommendationsModal from "@/components/AiRecommendationsModal";
import { playNotificationChime } from "@/lib/notification";

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
  returnedByEmail?: string;
  returnedTo?: string;
  returnedToEmail?: string;
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
  closedReason?: string;
  isHandoverWinner?: boolean;
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

// ─── Confirmation Delete Chat Dialog ──────────────────────────────────────────
function ConfirmDeleteChatModal({
  chat,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  chat: Chat;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
        <div className="text-3xl mb-3 text-center">🗑️</div>
        <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
          Delete Conversation?
        </h3>
        <p className="text-sm text-slate-600 text-center mb-1">
          This will permanently delete the chat history for:
        </p>
        <p className="text-sm font-semibold text-slate-900 text-center mb-5 px-2 line-clamp-2">
          &quot;{chat.reportTitle}&quot;
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
              "Yes, Delete Chat"
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
  onViewAiMatches,
}: {
  report: Report;
  isOwner: boolean;
  onDelete?: (report: Report) => void;
  onVerify?: (report: Report) => void;
  onOpenChat?: (report: Report) => void;
  onViewAiMatches?: (report: Report) => void;
}) {
  const isLockedFound = report.type === "FOUND" && !isOwner && report.isLocked !== false;

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 card-hover-effect hover:shadow-lg transition flex flex-col justify-between">
      <div>
        {/* Image Display */}
        {report.imageUrl && !isLockedFound ? (
          <img
            src={report.imageUrl}
            alt={report.title}
            className="w-full h-36 object-cover rounded-xl mb-3 border border-slate-200 dark:border-slate-700"
          />
        ) : isLockedFound ? (
          <div className="w-full h-36 rounded-xl mb-3 bg-slate-100 dark:bg-slate-800/80 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 p-3 text-center">
            <span className="text-2xl mb-1">🔒</span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Details Locked
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
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
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              📦 HANDOVER PENDING
            </span>
          ) : (
            <span
              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                report.type === "LOST"
                  ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                  : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {report.type}
            </span>
          )}
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {report.category}
          </span>
          {isOwner && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 ml-auto">
              Mine
            </span>
          )}
          {!isOwner && report.type === "FOUND" && !isLockedFound && report.status !== "RETURNED" && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 ml-auto">
              🔓 Unlocked
            </span>
          )}
        </div>

        {/* Title & Info */}
        <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 mb-1">
          {report.title}
        </h4>

        {report.location && (
          <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 mb-1">
            <span>📍</span>
            <span className="line-clamp-1">{report.location}</span>
          </p>
        )}

        {report.color && !isLockedFound && (
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
            <span>🎨</span>
            <span className="line-clamp-1">{report.color}</span>
          </p>
        )}

        {/* Secret Question Teaser */}
        {isLockedFound && report.hiddenQuestion && (
          <div className="mt-2.5 p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-900/60 text-[11px] text-amber-900 dark:text-amber-200">
            <span className="font-bold">Secret Question:</span> &quot;{report.hiddenQuestion}&quot;
          </div>
        )}

        {/* Returned Confirmation Notice */}
        {report.status === "RETURNED" && (
          <div className="mt-2.5 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 font-medium flex items-center gap-1.5">
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
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
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
        <div className="flex gap-2 pt-1 flex-wrap">
          {/* AI Matches button for LOST report owner (only if case is active/unreturned) */}
          {isOwner && report.type === "LOST" && report.status !== "RETURNED" && onViewAiMatches && (
            <button
              onClick={() => onViewAiMatches(report)}
              className="text-xs font-bold px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-lg transition shadow-xs flex items-center gap-1.5"
            >
              <span>✨</span>
              <span>AI Matches</span>
            </button>
          )}

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

// ─── Interactive & Animative Login Screen ──────────────────────────────────────
function InteractiveLoginScreen({
  onSignIn,
  isDarkMode = false,
  onToggleTheme,
}: {
  onSignIn: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}) {
  const [activeFeature, setActiveFeature] = useState<number>(0);

  const features = [
    {
      icon: "🔍",
      title: "Smart AI Visual Match",
      tag: "Vision & CLIP AI",
      tagColor: isDarkMode ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700",
      description:
        "Upload a photo of your lost belonging. Multi-modal AI instantly compares visual features with founder submissions across campus.",
    },
    {
      icon: "🔐",
      title: "Secret Question Shield",
      tag: "Zero False Claims",
      tagColor: isDarkMode ? "bg-emerald-900/50 text-emerald-300" : "bg-emerald-100 text-emerald-800",
      description:
        "Finders lock sensitive identifying marks behind confidential security questions. Only the genuine owner can answer and unlock details.",
    },
    {
      icon: "🤝",
      title: "Direct Chat & 24h OTP",
      tag: "Secure Handover",
      tagColor: isDarkMode ? "bg-violet-900/50 text-violet-300" : "bg-violet-100 text-violet-800",
      description:
        "Chat in real time directly with the finder, coordinate a safe campus meeting spot, and verify in-person handoff with a single-use 24-hour OTP code.",
    },
  ];

  return (
    <div
      className={`min-h-screen relative overflow-hidden flex flex-col justify-center items-center px-4 py-10 transition-colors duration-200 selection:bg-blue-500 selection:text-white ${
        isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* ── Theme Toggle Button on Login Screen (Top Right) ── */}
      {onToggleTheme && (
        <div className="absolute top-5 right-5 z-20">
          <button
            type="button"
            onClick={onToggleTheme}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 border backdrop-blur-md cursor-pointer ${
              isDarkMode
                ? "bg-slate-900/90 text-amber-300 border-slate-700 hover:bg-slate-800 shadow-md"
                : "bg-white/90 text-slate-700 border-slate-200 hover:bg-slate-100 shadow-xs"
            }`}
            title="Toggle Dark / Light Mode"
          >
            <span>{isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}</span>
          </button>
        </div>
      )}

      {/* ── Background Decorative Dot Grid ── */}
      <div
        className={`absolute inset-0 [background-size:24px_24px] pointer-events-none ${
          isDarkMode
            ? "bg-[radial-gradient(#334155_1px,transparent_1px)] opacity-40"
            : "bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] opacity-70"
        }`}
      />

      {/* ── Ambient Glowing Colored Orbs ── */}
      <div className="absolute -top-36 -left-36 w-96 h-96 bg-blue-400/25 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div
        className="absolute -bottom-36 -right-36 w-96 h-96 bg-violet-400/25 rounded-full blur-3xl pointer-events-none animate-pulse-glow"
        style={{ animationDelay: "2.5s" }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── CAMPUS MOTTO (Replaces the purple box) ── */}
      <div className="relative z-10 mb-6 text-center animate-in fade-in slide-in-from-top-3 duration-500">
        <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md shadow-slate-200/60 hover:shadow-lg hover:border-blue-300 hover:scale-105 transition-all duration-300 group cursor-default">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
          </span>
          <span className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 bg-clip-text text-transparent font-black tracking-wider text-[11px] uppercase">
            CAMPUS MOTTO
          </span>
          <span className="text-slate-300">|</span>
          <span className={`font-extrabold tracking-tight text-xs sm:text-sm ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
            &ldquo;Every Lost Item Has a Way Back Home.&rdquo;
          </span>
          <span className="text-amber-500 animate-pulse text-sm">✨</span>
        </div>
        <p className={`text-[11px] mt-1.5 font-medium tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          Reconnecting Belongings • Rebuilding Trust Across Campus
        </p>
      </div>

      {/* ── MAIN INTERACTIVE HERO CARD ── */}
      <div className={`relative z-10 max-w-lg w-full backdrop-blur-xl rounded-[32px] border p-7 sm:p-9 text-center overflow-hidden transition-all duration-300 shadow-2xl ${
        isDarkMode
          ? "bg-slate-900/90 border-slate-800 text-white shadow-black/80"
          : "bg-white/90 border-white/80 text-slate-900 shadow-slate-300/60"
      }`}>
        {/* Subtle Top Gradient Accent Rim */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

        {/* ── Brand Logo with Pulsing Aura Ring ── */}
        <div className="relative inline-flex items-center justify-center mb-4 group cursor-pointer">
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-violet-600 rounded-3xl blur-md opacity-30 group-hover:opacity-70 transition duration-500 animate-pulse-glow" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white flex items-center justify-center text-3xl font-black shadow-lg shadow-blue-500/30 transform group-hover:scale-105 group-hover:rotate-3 transition duration-300">
            F!
          </div>
        </div>

        <h1 className={`text-3xl sm:text-4xl font-black tracking-tight mb-1.5 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          Found!t
        </h1>
        <p className={`text-xs sm:text-sm mb-6 font-medium leading-relaxed max-w-sm mx-auto ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          College Campus Lost &amp; Found Platform
          <br />
          <span className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-400"}`}>
            Where lost student belongings find their way back home.
          </span>
        </p>

        {/* ── INTERACTIVE 3-FEATURE SELECTOR ── */}
        <div className="space-y-2.5 mb-7 text-left">
          {features.map((feat, idx) => {
            const isSelected = activeFeature === idx;
            return (
              <div
                key={feat.title}
                onClick={() => setActiveFeature(idx)}
                onMouseEnter={() => setActiveFeature(idx)}
                className={`group p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? isDarkMode
                      ? "bg-slate-800/90 border-blue-500 shadow-xs ring-1 ring-blue-500/30 text-white"
                      : "bg-slate-50 border-blue-400 shadow-xs ring-1 ring-blue-400/30 text-slate-900"
                    : isDarkMode
                    ? "bg-slate-950/40 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700 text-slate-300"
                    : "bg-white/60 border-slate-200/80 hover:bg-slate-50/70 hover:border-slate-300 text-slate-900"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg group-hover:scale-110 transition-transform duration-200">
                      {feat.icon}
                    </span>
                    <span className="font-bold text-xs sm:text-sm text-slate-900">
                      {feat.title}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 transition-colors ${feat.tagColor}`}
                  >
                    {feat.tag}
                  </span>
                </div>
                <p
                  className={`text-xs leading-relaxed transition-all duration-200 pl-7 ${
                    isSelected ? "text-slate-600" : "text-slate-400 line-clamp-1"
                  }`}
                >
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── GOOGLE SIGN-IN BUTTON ── */}
        <button
          onClick={onSignIn}
          className="group relative w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold active:scale-[0.98] transition-all duration-200 shadow-xl shadow-slate-900/25 hover:shadow-indigo-500/25 overflow-hidden cursor-pointer"
        >
          {/* Shimmer reflection highlight */}
          <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

          {/* Google G SVG */}
          <div className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform duration-200">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </div>
          <span className="text-sm font-extrabold tracking-tight">
            Sign in with Campus Google
          </span>
          <span className="text-xs text-slate-400 group-hover:translate-x-1 transition-transform">
            →
          </span>
        </button>

        {/* ── Trust Pillars & Security Footer ── */}
        <div className="mt-5 pt-4 border-t border-slate-100/80 flex items-center justify-center gap-3 text-[11px] text-slate-400 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="text-emerald-500">✓</span> Verified Campus Accounts
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className="text-blue-500">🔒</span> Zero False Claims
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className="text-violet-500">⚡</span> Live Alerts
          </span>
        </div>
      </div>

      <p className="relative z-10 mt-6 text-[11px] text-slate-400 text-center font-medium">
        Secured with College Google Workspace Authentication
      </p>
    </div>
  );
}

// ─── Main Home Page ────────────────────────────────────────────────────────────
export default function HomePage() {
  const { data: session, status } = useSession();

  // Dark / Light Theme Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        localStorage.setItem("theme", "dark");
        document.documentElement.classList.add("dark");
      } else {
        localStorage.setItem("theme", "light");
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  // Data state
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [foundInventory, setFoundInventory] = useState<Report[]>([]);
  const [hasLostReport, setHasLostReport] = useState<boolean>(false);
  const [activeLostCount, setActiveLostCount] = useState<number>(0);
  const [userChats, setUserChats] = useState<Chat[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<"my" | "inventory" | "chats">("my");
  const [loadingMy, setLoadingMy] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [chatDeleteTarget, setChatDeleteTarget] = useState<Chat | null>(null);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Active Modals & Workspaces
  const [verifyingReport, setVerifyingReport] = useState<Report | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [aiTargetLostReport, setAiTargetLostReport] = useState<Report | null>(null);

  // Chat Notification Bar & Dropdown State
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [notificationsClearedAt, setNotificationsClearedAt] = useState<number>(0);
  const [liveChatAlert, setLiveChatAlert] = useState<{
    chat: Chat;
    senderName: string;
    content: string;
  } | null>(null);

  const lastKnownChatMessages = useRef<Record<string, string>>({});
  const isInitialChatsLoad = useRef(true);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Auto-dismiss live chat notification after 6.5s
  useEffect(() => {
    if (liveChatAlert) {
      const timer = setTimeout(() => {
        setLiveChatAlert(null);
      }, 6500);
      return () => clearTimeout(timer);
    }
  }, [liveChatAlert]);

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
        // Only active (non-returned, non-resolved) lost reports grant inventory access
        const activeLost = data.reports.filter(
          (r: Report) =>
            r.type === "LOST" &&
            r.status !== "RETURNED" &&
            r.status !== "RESOLVED"
        );
        const count = activeLost.length;
        setActiveLostCount(count);
        setHasLostReport(count >= 1);
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

  // ── Fetch User's Active Chats with Live Notification Detection ──────────────
  const fetchUserChats = useCallback(
    async (isPolling = false) => {
      if (!session?.user?.email) return;
      if (!isPolling) setLoadingChats(true);
      try {
        const res = await fetch(
          `/api/chats?userEmail=${encodeURIComponent(session.user.email)}`
        );
        const data = await res.json();
        if (data.success && data.chats) {
          const chats: Chat[] = data.chats;
          setUserChats(chats);

          // Detect new incoming messages across any active chat
          if (!isInitialChatsLoad.current) {
            for (const c of chats) {
              const previousMsg = lastKnownChatMessages.current[c._id];
              const currentMsg = c.lastMessage;

              if (previousMsg !== undefined && previousMsg !== currentMsg && currentMsg) {
                const isClaimant = session.user.email === c.claimantEmail;
                const senderName = isClaimant ? c.founderName : c.claimantName;

                // Don't alert if the chat workspace is already actively open for this exact chat
                if (activeChat?._id !== c._id) {
                  setLiveChatAlert({
                    chat: c,
                    senderName,
                    content: currentMsg,
                  });
                  playNotificationChime();
                }
              }
            }
          } else {
            isInitialChatsLoad.current = false;
          }

          // Record latest known message strings
          chats.forEach((c) => {
            if (c._id && c.lastMessage) {
              lastKnownChatMessages.current[c._id] = c.lastMessage;
            }
          });
        }
      } catch (err) {
        console.error("Error fetching chats:", err);
      } finally {
        if (!isPolling) setLoadingChats(false);
      }
    },
    [session?.user?.email, activeChat?._id]
  );

  useEffect(() => {
    if (session) {
      fetchMyReports();
      fetchUserChats();
    }
  }, [session, fetchMyReports, fetchUserChats]);

  // Background polling for new chat messages every 4 seconds
  useEffect(() => {
    if (!session?.user?.email) return;
    const interval = setInterval(() => {
      fetchUserChats(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [session?.user?.email, fetchUserChats]);

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

  // ── Handle Delete Chat ──────────────────────────────────────────────────────
  const handleDeleteChatConfirm = async () => {
    if (!chatDeleteTarget || !session?.user?.email) return;
    setIsDeletingChat(true);
    try {
      const res = await fetch(
        `/api/chats?id=${chatDeleteTarget._id}&userEmail=${encodeURIComponent(
          session.user.email
        )}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        showToast("Conversation deleted successfully.");
        if (activeChat?._id === chatDeleteTarget._id) {
          setActiveChat(null);
        }
        setChatDeleteTarget(null);
        await fetchUserChats();
      } else {
        showToast(data.error || "Failed to delete conversation.", "error");
      }
    } catch {
      showToast("Network error. Could not delete conversation.", "error");
    } finally {
      setIsDeletingChat(false);
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
      <div
        className={`min-h-screen flex items-center justify-center transition-colors duration-200 ${
          isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p
            className={`text-sm font-medium ${
              isDarkMode ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Loading Found!t...
          </p>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // NOT LOGGED IN → Login Screen
  // ────────────────────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <InteractiveLoginScreen
        onSignIn={() => signIn("google")}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // LOGGED IN → Home Dashboard
  // ────────────────────────────────────────────────────────────────────────────
  const myLostReports = myReports.filter((r) => r.type === "LOST");
  const myFoundReports = myReports.filter((r) => r.type === "FOUND");

  // Filter active chat notifications that haven't been cleared
  const unreadChats = userChats.filter((c) => {
    if (c.status === "RETURNED") return false;
    if (notificationsClearedAt && c.lastMessageAt) {
      return new Date(c.lastMessageAt).getTime() > notificationsClearedAt;
    }
    return true;
  });

  const handleClearNotifications = () => {
    setNotificationsClearedAt(Date.now());
    setLiveChatAlert(null);
    showToast("Chat notifications cleared.");
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
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
          onChatDeleted={(_deletedId) => {
            setActiveChat(null);
            fetchUserChats();
            showToast("Conversation deleted.");
          }}
          onHandoverCompleted={() => {
            fetchMyReports();
            fetchUserChats();
            fetchFoundInventory();
          }}
        />
      )}

      {/* Delete Report confirmation modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          report={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}

      {/* Delete Chat confirmation modal */}
      {chatDeleteTarget && (
        <ConfirmDeleteChatModal
          chat={chatDeleteTarget}
          onConfirm={handleDeleteChatConfirm}
          onCancel={() => setChatDeleteTarget(null)}
          isDeleting={isDeletingChat}
        />
      )}

      {/* AI Recommendations Modal for Lost Reports */}
      {aiTargetLostReport && session.user?.email && (
        <AiRecommendationsModal
          lostReport={aiTargetLostReport}
          userEmail={session.user.email}
          userName={session.user.name || "Student"}
          onClose={() => setAiTargetLostReport(null)}
          onVerify={(rep) => {
            setAiTargetLostReport(null);
            setVerifyingReport(rep);
          }}
          onOpenChat={(rep) => {
            setAiTargetLostReport(null);
            handleStartChatWithFounder(rep);
          }}
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
      <header
        className={`border-b sticky top-0 z-30 backdrop-blur-md transition-colors duration-200 ${
          isDarkMode
            ? "bg-slate-900/90 border-slate-800 text-slate-100 shadow-sm"
            : "bg-white/95 border-slate-200 text-slate-900 shadow-xs"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
              F!
            </div>
            <span
              className={`font-extrabold text-xl tracking-tight ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Found!t
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* ☀️ / 🌙 Dark Mode to Light Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isDarkMode
                  ? "bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700 shadow-xs"
                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 shadow-2xs"
              }`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <span>{isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}</span>
            </button>

            {/* ── Chat Notification Bar / Bell ── */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotificationsDropdown((prev) => !prev)}
                className={`relative p-2 rounded-xl transition flex items-center justify-center cursor-pointer ${
                  isDarkMode
                    ? "text-slate-300 hover:text-white hover:bg-slate-800"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
                title="Chat Notifications"
              >
                <span className="text-xl">🔔</span>
                {unreadChats.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-violet-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs">
                    {unreadChats.length}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Panel */}
              {showNotificationsDropdown && (
                <div
                  className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 ${
                    isDarkMode
                      ? "bg-slate-900 border-slate-800"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div
                    className={`p-3.5 border-b flex items-center justify-between ${
                      isDarkMode
                        ? "bg-slate-800/80 border-slate-700"
                        : "bg-gradient-to-r from-violet-50 to-indigo-50 border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">💬</span>
                      <h4
                        className={`font-bold text-xs uppercase tracking-wide ${
                          isDarkMode ? "text-slate-200" : "text-slate-900"
                        }`}
                      >
                        Chat Notifications
                      </h4>
                      {unreadChats.length > 0 && (
                        <span className="text-[10px] font-black text-white bg-violet-600 px-2 py-0.5 rounded-full shadow-xs">
                          {unreadChats.length} new
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleClearNotifications}
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl transition shadow-2xs flex items-center gap-1 cursor-pointer border ${
                        isDarkMode
                          ? "bg-slate-700 text-slate-200 hover:text-rose-400 border-slate-600 hover:bg-slate-600"
                          : "text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border-slate-200 hover:border-rose-200"
                      }`}
                      title="Clear notifications and reset badge"
                    >
                      <span>🧹</span>
                      <span>Clear Notifications</span>
                    </button>
                  </div>

                  <div
                    className={`max-h-80 overflow-y-auto divide-y ${
                      isDarkMode ? "divide-slate-800" : "divide-slate-100"
                    }`}
                  >
                    {userChats.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No chat notifications yet.
                      </div>
                    ) : (
                      userChats.map((c) => {
                        const isClaimant = session.user?.email === c.claimantEmail;
                        const otherName = isClaimant ? c.founderName : c.claimantName;
                        const otherRole = isClaimant ? "Founder" : "Claimant";

                        return (
                          <div
                            key={c._id}
                            onClick={() => {
                              setShowNotificationsDropdown(false);
                              setActiveChat(c);
                            }}
                            className={`p-3 cursor-pointer transition flex items-start gap-3 ${
                              isDarkMode
                                ? "hover:bg-slate-800/60"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 flex items-center justify-center text-base shrink-0 font-bold">
                              💬
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <p
                                  className={`font-bold text-xs truncate ${
                                    isDarkMode ? "text-slate-100" : "text-slate-900"
                                  }`}
                                >
                                  {c.reportTitle}
                                </p>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                                    c.status === "RETURNED"
                                      ? "bg-slate-100 text-slate-500"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {c.status === "RETURNED" ? "Closed" : "Active"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">
                                With {otherRole}:{" "}
                                <strong
                                  className={
                                    isDarkMode ? "text-slate-300" : "text-slate-700"
                                  }
                                >
                                  {otherName}
                                </strong>
                              </p>
                              <p
                                className={`text-[11px] truncate mt-0.5 italic ${
                                  isDarkMode ? "text-slate-400" : "text-slate-600"
                                }`}
                              >
                                &quot;{c.lastMessage || "Click to open conversation"}&quot;
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div
                    className={`p-2.5 border-t text-center ${
                      isDarkMode
                        ? "bg-slate-800/60 border-slate-800"
                        : "bg-slate-50 border-slate-100"
                    }`}
                  >
                    <button
                      onClick={() => {
                        setShowNotificationsDropdown(false);
                        setActiveTab("chats");
                      }}
                      className="text-xs font-bold text-violet-500 hover:text-violet-400 cursor-pointer"
                    >
                      View All Campus Chats →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden sm:flex flex-col text-right">
              <span
                className={`text-sm font-semibold ${
                  isDarkMode ? "text-slate-200" : "text-slate-800"
                }`}
              >
                {session.user?.name || "Student"}
              </span>
              <span
                className={`text-xs ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {session.user?.email}
              </span>
            </div>
            {session.user?.image && (
              <img
                src={session.user.image}
                alt="Profile"
                className="w-9 h-9 rounded-full border border-slate-300 dark:border-slate-700"
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

      {/* ── Global Live Chat Notification Bar (Pops up when message received) ── */}
      {liveChatAlert && (
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2 duration-200 sticky top-16 z-25">
          <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base animate-pulse">💬</span>
              <span className="truncate">
                <strong>New Message from {liveChatAlert.senderName}</strong> regarding &quot;
                {liveChatAlert.chat.reportTitle}&quot;: &quot;{liveChatAlert.content}&quot;
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setActiveChat(liveChatAlert.chat);
                  setLiveChatAlert(null);
                }}
                className="px-3 py-1 bg-white text-violet-700 hover:bg-violet-50 font-bold rounded-lg transition shadow-2xs cursor-pointer"
              >
                Open Chat →
              </button>
              <button
                onClick={handleClearNotifications}
                className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
                title="Clear notification and reset badges"
              >
                Clear Notifications
              </button>
              <button
                onClick={() => setLiveChatAlert(null)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Welcome Banner */}
        <div className="mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold mb-2 border border-blue-200 dark:border-blue-800">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>Campus Item Recovery Live</span>
          </div>
          <h1
            className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${
              isDarkMode ? "text-white" : "text-slate-900"
            }`}
          >
            Welcome back, {session.user?.name?.split(" ")[0]}!
          </h1>
          <p
            className={`text-sm sm:text-base mt-1.5 ${
              isDarkMode ? "text-slate-400" : "text-slate-600"
            }`}
          >
            What would you like to do today?
          </p>
        </div>

        {/* ── 2 Action Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 animate-slide-up">
          {/* REPORT LOST */}
          <Link
            href="/report-lost"
            className={`group rounded-3xl p-7 shadow-md border-2 hover:border-blue-500 hover:shadow-xl transition-all duration-300 flex flex-col justify-between card-hover-effect ${
              isDarkMode
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-slate-200"
            }`}
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform animate-float">
                🔍
              </div>
              <div className="inline-block px-3 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full mb-2">
                Lost an Item?
              </div>
              <h2
                className={`text-xl font-bold mb-2 group-hover:text-blue-500 transition ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                Report Lost Product
              </h2>
              <p
                className={`text-sm leading-relaxed ${
                  isDarkMode ? "text-slate-400" : "text-slate-600"
                }`}
              >
                File a lost item complaint with details, campus location, contact info, and a photo.
              </p>
            </div>
            <div className="flex items-center gap-2 font-bold text-blue-500 text-sm mt-5 group-hover:translate-x-1.5 transition-transform">
              <span>File Lost Report</span>
              <span>→</span>
            </div>
          </Link>

          {/* REPORT FOUND */}
          <Link
            href="/report-found"
            className={`group rounded-3xl p-7 shadow-md border-2 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 flex flex-col justify-between card-hover-effect ${
              isDarkMode
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-slate-200"
            }`}
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform animate-float-delayed">
                🎁
              </div>
              <div className="inline-block px-3 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full mb-2">
                Found an Item?
              </div>
              <h2
                className={`text-xl font-bold mb-2 group-hover:text-emerald-500 transition ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                Report Found Product
              </h2>
              <p
                className={`text-sm leading-relaxed ${
                  isDarkMode ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Found something on campus? Post a photo, location, and a confidential security question.
              </p>
            </div>
            <div className="flex items-center gap-2 font-bold text-emerald-500 text-sm mt-5 group-hover:translate-x-1.5 transition-transform">
              <span>Submit Found Report</span>
              <span>→</span>
            </div>
          </Link>
        </div>

        {/* ── Tabbed Section ─────────────────────────────────────────────── */}
        <section
          className={`rounded-3xl shadow-md border overflow-hidden transition-colors ${
            isDarkMode
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-slate-200"
          }`}
        >
          {/* Tab Header */}
          <div
            className={`flex border-b ${
              isDarkMode ? "border-slate-800" : "border-slate-200"
            }`}
          >
            <button
              onClick={() => setActiveTab("my")}
              className={`flex-1 py-4 text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "my"
                  ? isDarkMode
                    ? "bg-slate-900 text-white border-b-2 border-blue-500"
                    : "bg-white text-slate-900 border-b-2 border-blue-600"
                  : isDarkMode
                  ? "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <span>📋</span>
              <span>My Reports</span>
              {myReports.length > 0 && (
                <span
                  className={`ml-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isDarkMode
                      ? "bg-slate-800 text-slate-300"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {myReports.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex-1 py-4 text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "inventory"
                  ? isDarkMode
                    ? "bg-slate-900 text-white border-b-2 border-emerald-500"
                    : "bg-white text-slate-900 border-b-2 border-emerald-600"
                  : isDarkMode
                  ? "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <span>{hasLostReport ? "🎁" : "🔒"}</span>
              <span>Found Inventory</span>
              {hasLostReport && foundInventory.length > 0 ? (
                <span
                  className={`ml-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isDarkMode
                      ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {foundInventory.length}
                </span>
              ) : !hasLostReport ? (
                <span
                  className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isDarkMode
                      ? "bg-amber-950/60 text-amber-300 border border-amber-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  Restricted
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setActiveTab("chats")}
              className={`flex-1 py-4 text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "chats"
                  ? isDarkMode
                    ? "bg-slate-900 text-white border-b-2 border-violet-500"
                    : "bg-white text-slate-900 border-b-2 border-violet-600"
                  : isDarkMode
                  ? "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <span>💬</span>
              <span>Campus Chats</span>
              {userChats.length > 0 && (
                <span
                  className={`ml-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isDarkMode
                      ? "bg-violet-950/60 text-violet-300 border border-violet-800"
                      : "bg-violet-100 text-violet-700"
                  }`}
                >
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
                              onViewAiMatches={(rep) => setAiTargetLostReport(rep)}
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
                {/* ACCESS GATE: user must have at least 1 ACTIVE (unresolved) Lost complaint */}
                {!hasLostReport ? (
                  <div className="py-12 text-center max-w-lg mx-auto px-4">
                    {myLostReports.some((r) => r.status === "RETURNED") ? (
                      /* User previously had a lost complaint, but it was resolved & returned */
                      <>
                        <div className="w-16 h-16 bg-slate-100 text-slate-700 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4 border border-slate-200 shadow-xs">
                          🔒
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold mb-3 border border-emerald-200">
                          <span>✓</span>
                          <span>Previous Case Successfully Returned</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                          All Cases Closed — Inventory Restricted
                        </h3>
                        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                          Your lost item complaint has been officially resolved and marked as <strong>RETURNED</strong>.
                        </p>
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 mb-6 text-left space-y-1.5">
                          <p className="font-bold flex items-center gap-1.5 text-amber-950">
                            <span>🛡️</span>
                            <span>Campus Privacy Rule: Active Cases ≥ 1 Required</span>
                          </p>
                          <p className="text-amber-800 leading-relaxed">
                            You currently have <strong>0 active lost complaints</strong>. To protect fellow students&apos; property and avoid unauthorized browsing, access to the campus Found Inventory is restricted until you file a new lost item complaint.
                          </p>
                        </div>
                        <Link
                          href="/report-lost"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 transition shadow-md shadow-blue-500/20"
                        >
                          <span>🔍</span>
                          <span>File a New Lost Complaint</span>
                          <span>→</span>
                        </Link>
                      </>
                    ) : (
                      /* User has never filed any lost complaint */
                      <>
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-xs">
                          🔒
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                          Found Inventory Restricted
                        </h3>
                        <p className="text-sm text-slate-600 mb-2 leading-relaxed">
                          To protect student privacy and prevent false claims, browsing the Found Items Inventory is strictly restricted.
                        </p>
                        <p className="text-xs text-slate-500 mb-6">
                          You must have <strong>at least 1 active Lost item complaint</strong> (active cases ≥ 1) to view the Found Inventory.
                        </p>
                        <Link
                          href="/report-lost"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 transition shadow-md shadow-blue-500/20"
                        >
                          <span>🔍</span>
                          <span>File a Lost Report First</span>
                          <span>→</span>
                        </Link>
                      </>
                    )}
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
                          className={`border rounded-2xl p-4 transition flex flex-col justify-between group ${
                            isDarkMode
                              ? "bg-slate-900 border-slate-800 hover:border-violet-500 hover:shadow-md"
                              : "bg-white border-slate-200 hover:border-violet-400 hover:shadow-md"
                          }`}
                        >
                          <div
                            onClick={() => setActiveChat(chat)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              {chat.reportImageUrl ? (
                                <img
                                  src={chat.reportImageUrl}
                                  alt={chat.reportTitle}
                                  className={`w-12 h-12 rounded-xl object-cover border ${
                                    isDarkMode ? "border-slate-700" : "border-slate-200"
                                  }`}
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 flex items-center justify-center text-xl font-bold">
                                  💬
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <h4
                                  className={`font-bold text-sm line-clamp-1 ${
                                    isDarkMode ? "text-white" : "text-slate-900"
                                  }`}
                                >
                                  {chat.reportTitle}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  With {otherRole}:{" "}
                                  <strong
                                    className={
                                      isDarkMode ? "text-slate-200" : "text-slate-800"
                                    }
                                  >
                                    {otherName}
                                  </strong>
                                </p>
                              </div>
                            </div>

                            <p
                              className={`text-xs p-2.5 rounded-xl border line-clamp-2 italic ${
                                isDarkMode
                                  ? "bg-slate-800/80 text-slate-300 border-slate-700"
                                  : "bg-slate-50 text-slate-600 border-slate-100"
                              }`}
                            >
                              &quot;{chat.lastMessage || "Click to open conversation"}&quot;
                            </p>
                          </div>

                          <div
                            className={`mt-4 pt-2 border-t flex items-center justify-between text-[11px] ${
                              isDarkMode ? "border-slate-800 text-slate-500" : "border-slate-100 text-slate-400"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                title="Delete conversation"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setChatDeleteTarget(chat);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                              >
                                🗑️
                              </button>
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
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveChat(chat)}
                              className="font-bold text-violet-600 hover:underline cursor-pointer"
                            >
                              {chat.status === "RETURNED"
                                ? "View Handover Receipt →"
                                : "Open Details & Chat →"}
                            </button>
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