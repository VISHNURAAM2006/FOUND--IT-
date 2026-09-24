"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
  report?: Report;
}

interface Message {
  _id?: string;
  chatId: string;
  senderEmail: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface HandoverState {
  handoverStatus: "NONE" | "PENDING" | "COMPLETED" | "EXPIRED";
  otp?: string;
  expiresAt?: string;
  initiatedAt?: string;
  completedAt?: string;
  logMessage?: string;
  handoverLog?: {
    logMessage: string;
    returnedBy: string;
    returnedTo: string;
    productTitle: string;
    returnedAt: string;
  };
}

interface ProductChatWorkspaceProps {
  chat: Chat;
  currentUserEmail: string;
  currentUserName: string;
  initialReport?: Report | null;
  onClose: () => void;
}

export default function ProductChatWorkspace({
  chat,
  currentUserEmail,
  currentUserName,
  initialReport,
  onClose,
}: ProductChatWorkspaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [report, setReport] = useState<Report | null>(
    initialReport || chat.report || null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handover state
  const [handover, setHandover] = useState<HandoverState>({
    handoverStatus: "NONE",
  });
  const [enteredOtp, setEnteredOtp] = useState("");
  const [isInitiating, setIsInitiating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [handoverError, setHandoverError] = useState("");
  const [handoverSuccessMsg, setHandoverSuccessMsg] = useState("");
  const [copiedOtp, setCopiedOtp] = useState(false);

  const isClaimant = currentUserEmail === chat.claimantEmail;
  const isFounder = currentUserEmail === chat.founderEmail;
  const otherPartyName = isClaimant ? chat.founderName : chat.claimantName;
  const otherPartyRole = isClaimant ? "Founder" : "Claimant";
  const otherPartyEmail = isClaimant ? chat.founderEmail : chat.claimantEmail;

  // Auto scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch report details if missing
  const fetchReport = useCallback(async () => {
    if (chat.reportId) {
      try {
        const res = await fetch(`/api/reports?id=${chat.reportId}`);
        const data = await res.json();
        if (data.success && data.reports) {
          const found = data.reports.find(
            (r: Report) => r._id === chat.reportId
          );
          if (found) setReport(found);
        }
      } catch (err) {
        console.error("Error fetching report details:", err);
      }
    }
  }, [chat.reportId]);

  useEffect(() => {
    if (!report) {
      fetchReport();
    }
  }, [report, fetchReport]);

  // Fetch Handover Status
  const fetchHandoverStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/handover?chatId=${chat._id}&reportId=${chat.reportId}&userEmail=${encodeURIComponent(
          currentUserEmail
        )}`
      );
      const data = await res.json();
      if (data.success) {
        setHandover(data);
        if (data.handoverStatus === "COMPLETED") {
          fetchReport();
        }
      }
    } catch (err) {
      console.error("Error fetching handover status:", err);
    }
  }, [chat._id, chat.reportId, currentUserEmail, fetchReport]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chats/${chat._id}/messages`);
      const data = await res.json();
      if (data.success && data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Error fetching chat messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, [chat._id]);

  // Combined Polling (Messages + Handover)
  useEffect(() => {
    fetchMessages();
    fetchHandoverStatus();
    const interval = setInterval(() => {
      fetchMessages();
      fetchHandoverStatus();
    }, 2500);
    return () => clearInterval(interval);
  }, [fetchMessages, fetchHandoverStatus]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message
  const handleSend = async (contentToSend?: string) => {
    const text = (contentToSend || inputText).trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText("");

    const optimistic: Message = {
      chatId: chat._id,
      senderEmail: currentUserEmail,
      senderName: currentUserName,
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch(`/api/chats/${chat._id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          senderEmail: currentUserEmail,
          senderName: currentUserName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchMessages();
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Founder Initiates Handover ───────────────────────────────────────────────
  const handleInitiateHandover = async () => {
    if (!isFounder || isInitiating) return;
    setIsInitiating(true);
    setHandoverError("");
    setHandoverSuccessMsg("");

    try {
      const res = await fetch("/api/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "INITIATE",
          chatId: chat._id,
          reportId: chat.reportId,
          founderEmail: currentUserEmail,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setHandoverSuccessMsg("Handover initiated! A 24-hour OTP has been sent to the claimant.");
        fetchHandoverStatus();
        fetchMessages();
        fetchReport();
      } else {
        setHandoverError(data.error || "Failed to initiate handover.");
      }
    } catch (err) {
      console.error("Error initiating handover:", err);
      setHandoverError("Network error. Please try again.");
    } finally {
      setIsInitiating(false);
    }
  };

  // ── Founder Validates Claimant's OTP ─────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFounder || !enteredOtp.trim() || isValidating) return;

    setIsValidating(true);
    setHandoverError("");
    setHandoverSuccessMsg("");

    try {
      const res = await fetch("/api/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY",
          chatId: chat._id,
          reportId: chat.reportId,
          founderEmail: currentUserEmail,
          enteredOtp: enteredOtp.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setHandoverSuccessMsg(data.message || "Product marked as RETURNED successfully!");
        setEnteredOtp("");
        fetchHandoverStatus();
        fetchMessages();
        fetchReport();
      } else {
        setHandoverError(data.error || "Invalid OTP. Please check the code with the claimant.");
      }
    } catch (err) {
      console.error("Error validating OTP:", err);
      setHandoverError("Network error validating OTP.");
    } finally {
      setIsValidating(false);
    }
  };

  const copyOtpToClipboard = () => {
    if (handover.otp) {
      navigator.clipboard.writeText(handover.otp);
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2500);
    }
  };

  const quickChips = [
    "📍 Where can we meet on campus?",
    "🕒 When are you free today?",
    "🏛️ Meet at Library entrance",
    "👍 On my way!",
  ];

  const displayImage = report?.imageUrl || chat.reportImageUrl;
  const isReturned =
    report?.status === "RETURNED" || handover.handoverStatus === "COMPLETED";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl max-w-6xl w-full h-[96vh] sm:h-[760px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* ── Top Workspace Bar ─────────────────────────────────────────────── */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              F!
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  Handover &amp; Communication Workspace
                </h2>
                {isReturned && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs">
                    ✓ RETURNED
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Item: {report?.title || chat.reportTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* ── Side-by-Side Body ──────────────────────────────────────────────── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* ══════════════════════════════════════════════════════════════════
              LEFT SIDE: Product Found Details & Handover Interface (5 cols)
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 bg-slate-50 border-r border-slate-200 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* Image Preview */}
            {displayImage ? (
              <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs">
                <img
                  src={displayImage}
                  alt={report?.title || chat.reportTitle}
                  className="w-full h-44 sm:h-48 object-contain rounded-xl bg-slate-50"
                />
              </div>
            ) : (
              <div className="w-full h-40 rounded-2xl bg-slate-200/70 border border-slate-300 flex flex-col items-center justify-center text-slate-400">
                <span className="text-3xl mb-1">📷</span>
                <span className="text-xs font-semibold">No Image Uploaded</span>
              </div>
            )}

            {/* Title & Badges */}
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                    isReturned
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {isReturned ? "✓ RETURNED" : report?.type || "FOUND"}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {report?.category || chat.reportCategory || "General"}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 ml-auto">
                  Status: {isReturned ? "RETURNED" : report?.status || "OPEN"}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                {report?.title || chat.reportTitle}
              </h3>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                DEDICATED "HANDOVER" SECTION (MAIN FEATURE)
               ══════════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-blue-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📦</span>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    Product Handover
                  </h4>
                </div>
                {handover.handoverStatus === "PENDING" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    OTP Active (24h)
                  </span>
                )}
                {isReturned && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Completed
                  </span>
                )}
              </div>

              {/* Status & Error Alerts */}
              {handoverError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-medium">
                  {handoverError}
                </div>
              )}
              {handoverSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                  {handoverSuccessMsg}
                </div>
              )}

              {/* ── STATE 1: COMPLETED / RETURNED ── */}
              {isReturned ? (
                <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-4 text-center space-y-2.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-black mx-auto">
                    ✓
                  </div>
                  <h5 className="font-extrabold text-sm text-emerald-950">
                    Handover Complete &amp; Verified
                  </h5>
                  <div className="bg-white p-3 rounded-xl border border-emerald-200 text-xs text-left space-y-1 shadow-xs">
                    {isFounder ? (
                      <>
                        <p className="text-slate-500 font-medium text-[11px]">
                          You returned this item to:
                        </p>
                        <p className="text-slate-900 font-bold text-sm">
                          {chat.claimantName}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {chat.claimantEmail}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-slate-500 font-medium text-[11px]">
                          You received this item from:
                        </p>
                        <p className="text-slate-900 font-bold text-sm">
                          {chat.founderName}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {chat.founderEmail}
                        </p>
                      </>
                    )}
                    <p className="text-[11px] text-slate-400 pt-1.5 border-t border-slate-100">
                      Handover Timestamp:{" "}
                      {report?.returnedAt
                        ? new Date(report.returnedAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : new Date().toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* ── STATE 2: PENDING (24h OTP ACTIVE) ── */}
                  {handover.handoverStatus === "PENDING" ? (
                    <>
                      {/* VIEW FOR CLAIMANT (LOSER) -> Displays 6-Digit OTP */}
                      {isClaimant && (
                        <div className="space-y-3">
                          <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-2xl text-center space-y-2">
                            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                              🔑 Your 24-Hour Handover OTP
                            </span>
                            <span className="text-[11px] text-amber-800 font-medium block">
                              📧 Sent to your logged-in email: <strong>{chat.claimantEmail}</strong>
                            </span>
                            <div className="flex items-center justify-center gap-1.5 py-1">
                              {handover.otp ? (
                                handover.otp.split("").map((digit, idx) => (
                                  <span
                                    key={idx}
                                    className="w-9 h-11 flex items-center justify-center bg-white border-2 border-amber-400 text-slate-900 font-black text-xl rounded-xl shadow-xs"
                                  >
                                    {digit}
                                  </span>
                                ))
                              ) : (
                                <span className="font-mono text-xl font-black text-slate-900">
                                  Loading OTP...
                                </span>
                              )}
                            </div>
                            <button
                              onClick={copyOtpToClipboard}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 py-1 inline-flex items-center gap-1"
                            >
                              {copiedOtp ? "✓ Copied to clipboard" : "📋 Copy OTP"}
                            </button>
                          </div>

                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                            <strong>In-Person Handover:</strong> Show or read this 6-digit OTP to{" "}
                            <strong>{chat.founderName}</strong> when they hand over your item. The founder will validate it on their device to complete the return.
                          </div>

                          <p className="text-[11px] text-slate-400 text-center">
                            Valid for 24 hours (Expires:{" "}
                            {handover.expiresAt
                              ? new Date(handover.expiresAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "in 24 hours"}
                            )
                          </p>
                        </div>
                      )}

                      {/* VIEW FOR FOUNDER -> Enters Loser's OTP to Validate */}
                      {isFounder && (
                        <form onSubmit={handleVerifyOtp} className="space-y-3">
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                            <strong>Ask {chat.claimantName} for their 6-digit OTP</strong> sent to their email (<strong>{chat.claimantEmail}</strong>) or shown on their screen, then enter it below to confirm that you have physically returned the item.
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                              Enter Loser&apos;s 6-Digit OTP
                            </label>
                            <input
                              type="text"
                              maxLength={6}
                              required
                              value={enteredOtp}
                              onChange={(e) =>
                                setEnteredOtp(e.target.value.replace(/\D/g, ""))
                              }
                              placeholder="e.g. 749201"
                              className="w-full text-center tracking-[0.4em] font-mono text-lg font-black px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={enteredOtp.length !== 6 || isValidating}
                            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isValidating ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Validating OTP...</span>
                              </>
                            ) : (
                              <span>Validate OTP &amp; Complete Return</span>
                            )}
                          </button>
                        </form>
                      )}
                    </>
                  ) : (
                    /* ── STATE 3: NOT YET INITIATED / EXPIRED ── */
                    <div className="space-y-3">
                      {isFounder ? (
                        <>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Once you have confirmed the user in the chat and are ready to meet on campus, click below to initiate the handover. This generates a secure 24-hour OTP for the claimant.
                          </p>
                          <button
                            type="button"
                            onClick={handleInitiateHandover}
                            disabled={isInitiating}
                            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isInitiating ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Generating 24h OTP...</span>
                              </>
                            ) : (
                              <span>📦 Initiate Handover (Generate OTP)</span>
                            )}
                          </button>
                        </>
                      ) : (
                        <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                          Discuss meeting place and time with <strong>{chat.founderName}</strong> in the chat. When meeting on campus, the founder will initiate handover and your 6-digit verification code will appear here.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Specifications Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Location Found:</span>
                <span className="font-bold text-slate-900 text-right">
                  {report?.location || "Campus Area"}
                </span>
              </div>

              {report?.brand && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Brand:</span>
                  <span className="font-bold text-slate-900">{report.brand}</span>
                </div>
              )}

              {report?.model && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Model:</span>
                  <span className="font-bold text-slate-900">{report.model}</span>
                </div>
              )}

              {report?.color && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Color:</span>
                  <span className="font-bold text-slate-900">{report.color}</span>
                </div>
              )}

              {report?.foundDate && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Date Found:</span>
                  <span className="font-bold text-slate-900">
                    {new Date(report.foundDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Founder's Description */}
            {report?.description && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Founder&apos;s Description
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {report.description}
                </p>
              </div>
            )}

            {/* Founder Contact Profile Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Founder Information
              </h4>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  {chat.founderName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {chat.founderName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {chat.founderEmail}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT SIDE: Live Chat Box (7 columns on large screens)
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 flex flex-col h-full bg-white">
            {/* Chat Top Subheader */}
            <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  {otherPartyName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {otherPartyName}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Role: {otherPartyRole}
                  </p>
                </div>
              </div>

              {/* Handover action in chatbox header for founder */}
              {isFounder && !isReturned && (
                <button
                  onClick={handleInitiateHandover}
                  disabled={isInitiating || handover.handoverStatus === "PENDING"}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition flex items-center gap-1 ${
                    handover.handoverStatus === "PENDING"
                      ? "bg-amber-50 text-amber-800 border-amber-300 cursor-default"
                      : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 active:scale-98"
                  }`}
                >
                  <span>📦</span>
                  <span>
                    {handover.handoverStatus === "PENDING"
                      ? "OTP Active (See Left Pane)"
                      : "Return Product (Handover)"}
                  </span>
                </button>
              )}
            </div>

            {/* Pinned Handover OTP Banner for Loser in Chat */}
            {isClaimant && handover.handoverStatus === "PENDING" && handover.otp && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <span>🔑</span>
                  <span>
                    Your Handover OTP:{" "}
                    <strong className="font-mono text-sm bg-white px-2 py-0.5 rounded-md border border-amber-300">
                      {handover.otp}
                    </strong>
                  </span>
                </div>
                <button
                  onClick={copyOtpToClipboard}
                  className="font-bold text-blue-600 hover:underline text-[11px]"
                >
                  {copiedOtp ? "Copied!" : "Copy"}
                </button>
              </div>
            )}

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-slate-50/50">
              {loadingMessages ? (
                <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
                  Loading conversation...
                </div>
              ) : messages.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">
                  <p className="text-3xl mb-2">💬</p>
                  <p className="font-bold text-slate-700">No messages yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Send a message below to arrange item handover.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.senderEmail === currentUserEmail;

                  return (
                    <div
                      key={msg._id || idx}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div className="text-[10px] text-slate-400 mb-1 px-1">
                        {isMe ? "You" : msg.senderName}
                      </div>
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs ${
                          isMe
                            ? "bg-blue-600 text-white rounded-tr-xs"
                            : "bg-white text-slate-900 border border-slate-200/90 rounded-tl-xs"
                        }`}
                      >
                        {msg.content}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1 px-1">
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Chips & Message Composer (Disabled after Handover) */}
            {isReturned ? (
              <div className="p-4 sm:p-5 bg-slate-100 border-t border-slate-200 text-center">
                <div className="max-w-md mx-auto space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
                    <span>🔒</span>
                    <span>Chat Closed for Privacy</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    This item has been officially handed over to its owner. Messaging has been disabled to protect user privacy.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Quick Action Chips */}
                <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
                  {quickChips.map((chip, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(chip)}
                      className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition border border-slate-200/80"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Message Composer */}
                <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message to coordinate handover..."
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-900 placeholder-slate-400 rounded-2xl text-sm border border-transparent focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputText.trim() || isSending}
                    className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm shadow-md transition disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <span>Send</span>
                    <span>➤</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
