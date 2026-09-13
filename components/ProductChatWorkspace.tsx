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

  const isClaimant = currentUserEmail === chat.claimantEmail;
  const otherPartyName = isClaimant ? chat.founderName : chat.claimantName;
  const otherPartyRole = isClaimant ? "Founder" : "Claimant";
  const otherPartyEmail = isClaimant ? chat.founderEmail : chat.claimantEmail;

  // Auto scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // If report wasn't provided, fetch it
  useEffect(() => {
    if (!report && chat.reportId) {
      fetch(`/api/reports?id=${chat.reportId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.reports) {
            const found = data.reports.find(
              (r: Report) => r._id === chat.reportId
            );
            if (found) setReport(found);
          }
        })
        .catch((err) => console.error("Error fetching report details:", err));
    }
  }, [chat.reportId, report]);

  // Fetch messages with polling
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

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2500);
    return () => clearInterval(interval);
  }, [fetchMessages]);

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

  const quickChips = [
    "📍 Where can we meet on campus?",
    "🕒 When are you free today?",
    "🏛️ Meet at Library entrance",
    "👍 On my way!",
  ];

  const displayImage = report?.imageUrl || chat.reportImageUrl;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl max-w-6xl w-full h-[95vh] sm:h-[720px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* ── Top Workspace Bar ─────────────────────────────────────────────── */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              F!
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                Found Item Verification &amp; Communication
              </h2>
              <p className="text-[11px] text-slate-400">
                Direct Handover Channel for {report?.title || chat.reportTitle}
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
              LEFT SIDE: Product Found Details (5 columns on large screens)
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 bg-slate-50 border-r border-slate-200 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* Image Preview */}
            {displayImage ? (
              <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs">
                <img
                  src={displayImage}
                  alt={report?.title || chat.reportTitle}
                  className="w-full h-48 sm:h-52 object-contain rounded-xl bg-slate-50"
                />
              </div>
            ) : (
              <div className="w-full h-44 rounded-2xl bg-slate-200/70 border border-slate-300 flex flex-col items-center justify-center text-slate-400">
                <span className="text-3xl mb-1">📷</span>
                <span className="text-xs font-semibold">No Image Uploaded</span>
              </div>
            )}

            {/* Title & Badges */}
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {report?.type || "FOUND"}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {report?.category || chat.reportCategory || "General"}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 ml-auto">
                  Status: {report?.status || chat.status || "OPEN"}
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 leading-snug">
                {report?.title || chat.reportTitle}
              </h3>
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

            {/* Founder's Description / Custody Notes */}
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

            {/* Founder Profile Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Founder Contact
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

            {/* Verified Ownership Badge */}
            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900">
              <span className="text-base">✓</span>
              <span>
                <strong>Ownership Verified:</strong> Claimant correctly matched the founder&apos;s secret detail.
              </span>
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

              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                Live Channel
              </span>
            </div>

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
          </div>
        </div>
      </div>
    </div>
  );
}
