"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Message {
  _id?: string;
  chatId: string;
  senderEmail: string;
  senderName: string;
  content: string;
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
}

interface ChatWindowProps {
  chat: Chat;
  currentUserEmail: string;
  currentUserName: string;
  onClose: () => void;
}

export default function ChatWindow({
  chat,
  currentUserEmail,
  currentUserName,
  onClose,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isClaimant = currentUserEmail === chat.claimantEmail;
  const otherPartyName = isClaimant ? chat.founderName : chat.claimantName;
  const otherPartyRole = isClaimant ? "Founder" : "Claimant / Owner";
  const otherPartyEmail = isClaimant ? chat.founderEmail : chat.claimantEmail;

  // Auto scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chats/${chat._id}/messages`);
      const data = await res.json();
      if (data.success && data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Error polling messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, [chat._id]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2500); // Poll every 2.5 seconds
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

    // Optimistic message
    const tempMsg: Message = {
      chatId: chat._id,
      senderEmail: currentUserEmail,
      senderName: currentUserName,
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

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
    "🏛️ Let's meet near the Central Library entrance.",
    "👍 Got it, see you there!",
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full h-[90vh] sm:h-[650px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* ── Top Bar ────────────────────────────────────────────────────────── */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            {chat.reportImageUrl ? (
              <img
                src={chat.reportImageUrl}
                alt={chat.reportTitle}
                className="w-11 h-11 rounded-2xl object-cover border border-slate-700 shadow-xs"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                🎁
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white tracking-tight line-clamp-1">
                  {chat.reportTitle}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Verified Match
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                <span>With {otherPartyRole}:</span>
                <span className="font-semibold text-white">{otherPartyName}</span>
                <span className="text-slate-400">({otherPartyEmail})</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition text-sm"
          >
            ✕
          </button>
        </div>

        {/* ── Safety Tip Banner ────────────────────────────────────────────── */}
        <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span>🛡️</span>
            <span>
              <strong>Campus Safety:</strong> Meet in public campus locations (Library, Student Center, or Dean&apos;s Office).
            </span>
          </div>
        </div>

        {/* ── Messages Feed ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50">
          {loadingMessages ? (
            <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
              Connecting to secure campus chat...
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <p className="text-2xl mb-2">💬</p>
              <p className="font-semibold text-slate-600">Start the conversation!</p>
              <p className="text-xs text-slate-400 mt-1">
                Say hello to coordinate item handover.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.senderEmail === currentUserEmail;
              const isSystem = msg.senderEmail.includes("system");

              if (isSystem) {
                return (
                  <div key={msg._id || idx} className="flex justify-center my-2">
                    <div className="bg-amber-100/80 text-amber-900 text-[11px] font-medium px-4 py-2 rounded-2xl border border-amber-200/80 max-w-md text-center shadow-xs">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg._id || idx}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div className="text-[10px] text-slate-400 mb-1 px-1">
                    {isMe ? "You" : msg.senderName}
                  </div>
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs ${
                      isMe
                        ? "bg-blue-600 text-white rounded-tr-xs"
                        : "bg-white text-slate-900 border border-slate-200/80 rounded-tl-xs"
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

        {/* ── Quick Action Chips ────────────────────────────────────────────── */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {quickChips.map((chip, i) => (
            <button
              key={i}
              onClick={() => handleSend(chip)}
              className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition border border-slate-200"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* ── Composer Input ─────────────────────────────────────────────────── */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Press Enter to send)"
            className="flex-1 px-4 py-3 bg-slate-100 text-slate-900 placeholder-slate-400 rounded-2xl text-sm border border-transparent focus:border-blue-500 focus:bg-white focus:outline-hidden transition"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isSending}
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm shadow-md transition disabled:opacity-40 flex items-center gap-2"
          >
            <span>Send</span>
            <span>➤</span>
          </button>
        </div>
      </div>
    </div>
  );
}
