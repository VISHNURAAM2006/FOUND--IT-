"use client";

import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: {
    _id: string;
    title: string;
    category: string;
    location: string;
    imageUrl?: string | null;
    isLocked: boolean;
  }[];
}

interface CampusAiChatWidgetProps {
  userEmail?: string;
  userName?: string;
  isDarkMode?: boolean;
  onOpenInventory?: () => void;
}

export default function CampusAiChatWidget({
  userEmail = "",
  userName = "Student",
  isDarkMode = false,
  onOpenInventory,
}: CampusAiChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content: `Hello ${userName?.split(" ")[0] || "there"}! 👋 I'm your **Found!t Campus AI**.

I am grounded in your college's spatial map and live lost & found database.

Ask me anything like:
• *"Are there any phones, laptops, or AirPods found recently?"*
• *"Where is the Deep Learning Lab or Language Lab?"*
• *"How do I unlock and claim an item?"*`,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          userEmail,
          userName,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (data.success && data.reply) {
        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          products: data.suggestedProducts || [],
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: "Sorry, I encountered a temporary network issue. Please ask again in a moment.",
          },
        ]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Network error connecting to Campus AI server. Please check your connection.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    "🔍 What items were found recently?",
    "💻 Any electronics or laptops found?",
    "📍 Where is the Deep Learning Lab?",
    "🔐 How do I claim a found item?",
  ];

  return (
    <div className="fixed bottom-5 right-5 z-40 select-none">
      {/* ── Collapsed Floating Button ── */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-b from-blue-500 via-indigo-600 to-indigo-700 text-white rounded-full shadow-[0_6px_20px_rgba(79,70,229,0.45),_0_2px_4px_rgba(0,0,0,0.2)] border-t-2 border-white/40 border-b-2 border-indigo-900 transition-all duration-200 hover:scale-105 active:scale-95 active:translate-y-0.5 cursor-pointer"
          title="Open Campus AI Assistant"
        >
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </span>
          <span className="text-lg drop-shadow-sm">🤖</span>
          <span className="text-xs font-black tracking-wide drop-shadow-sm">Ask Campus AI</span>
        </button>
      )}

      {/* ── Expanded Chat Panel ── */}
      {isOpen && (
        <div
          className={`w-[92vw] sm:w-[420px] h-[560px] max-h-[85vh] rounded-3xl skeuo-card shadow-2xl flex flex-col overflow-hidden animate-scale-in transition-colors duration-200 ${
            isDarkMode
              ? "text-slate-100 shadow-black/90"
              : "text-slate-900 shadow-slate-400/50"
          }`}
        >
          {/* Header */}
          <div
            className={`p-4 border-b flex items-center justify-between transition-colors shadow-xs ${
              isDarkMode
                ? "bg-gradient-to-b from-slate-800 to-slate-850 border-slate-700"
                : "bg-gradient-to-b from-slate-50 via-indigo-50/50 to-slate-100 border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-blue-500 to-indigo-700 text-white flex items-center justify-center text-lg shadow-[0_2px_4px_rgba(0,0,0,0.2),_inset_0_1px_0_rgba(255,255,255,0.4)] border-t border-white/30">
                🤖
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3
                    className={`font-black text-sm tracking-tight ${
                      isDarkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Found!t Campus AI
                  </h3>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Live RAG
                  </span>
                </div>
                <p
                  className={`text-[10px] ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Grounded in College Map &amp; Live Database
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition cursor-pointer ${
                isDarkMode
                  ? "text-slate-400 hover:text-white hover:bg-slate-700"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white"
              }`}
              title="Close Chat"
            >
              ✕
            </button>
          </div>

          {/* Messages Stream */}
          <div
            className={`flex-1 p-4 overflow-y-auto space-y-3.5 text-xs ${
              isDarkMode ? "bg-slate-950/60" : "bg-slate-50/70"
            }`}
          >
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap break-words ${
                      isUser
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs shadow-xs font-medium"
                        : isDarkMode
                        ? "bg-slate-800/90 text-slate-100 border border-slate-700 rounded-bl-xs shadow-xs"
                        : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs shadow-xs"
                    }`}
                  >
                    {m.content}
                  </div>

                  {/* Attached Live Product Cards if any returned */}
                  {m.products && m.products.length > 0 && (
                    <div className="mt-2.5 space-y-2 w-full max-w-[92%]">
                      <p
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        Matching Database Items:
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {m.products.map((p) => (
                          <div
                            key={p._id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition ${
                              isDarkMode
                                ? "bg-slate-800 border-slate-700 hover:border-blue-500"
                                : "bg-white border-slate-200 hover:border-blue-400 shadow-2xs"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <h5
                                className={`font-bold text-xs truncate ${
                                  isDarkMode ? "text-slate-100" : "text-slate-900"
                                }`}
                              >
                                {p.title}
                              </h5>
                              <p
                                className={`text-[10px] truncate ${
                                  isDarkMode ? "text-slate-400" : "text-slate-500"
                                }`}
                              >
                                📍 {p.location || "Campus"} • {p.category}
                              </p>
                            </div>
                            {onOpenInventory && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsOpen(false);
                                  onOpenInventory();
                                }}
                                className="shrink-0 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition"
                              >
                                View →
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 p-3 max-w-[70%] rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-500 dark:text-slate-400">
                  Consulting campus knowledge graph...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div
            className={`px-3 py-2 border-t overflow-x-auto flex items-center gap-1.5 scrollbar-none ${
              isDarkMode
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-slate-100"
            }`}
          >
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
                className="whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold skeuo-button-metallic transition cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className={`p-3 border-t flex items-center gap-2 ${
              isDarkMode
                ? "bg-slate-900 border-slate-800"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about found items or campus locations..."
              className="flex-1 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none skeuo-input"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="px-3.5 py-2.5 skeuo-button-primary disabled:opacity-40 text-white rounded-xl transition cursor-pointer font-bold text-xs"
              title="Send Message"
            >
              <span>➤</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
