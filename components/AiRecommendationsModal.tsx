"use client";

import { useEffect, useState } from "react";
import { MatchResult } from "@/lib/ai-matcher";
import AiMatchCard from "./AiMatchCard";

interface AiRecommendationsModalProps {
  lostReport: any;
  userEmail: string;
  userName: string;
  onClose: () => void;
  onVerify: (foundReport: any) => void;
  onOpenChat: (foundReport: any) => void;
}

export default function AiRecommendationsModal({
  lostReport,
  userEmail,
  onClose,
  onVerify,
  onOpenChat,
}: AiRecommendationsModalProps) {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMatches() {
      if (!lostReport?._id) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/recommendations?lostReportId=${lostReport._id}&userEmail=${encodeURIComponent(
            userEmail
          )}`
        );
        const data = await res.json();
        if (data.success && data.matches) {
          setMatches(data.matches);
        } else {
          setError(data.error || "Failed to load matches.");
        }
      } catch (err) {
        console.error(err);
        setError("Network error fetching recommendations.");
      } finally {
        setLoading(false);
      }
    }

    loadMatches();
  }, [lostReport?._id, userEmail]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-600 text-white flex items-center justify-center text-2xl font-bold shadow-md shadow-violet-200">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  AI Match Recommendations
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-violet-200/80 text-violet-800">
                  Vision + NLP
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Matches found in campus inventory for: &quot;
                <strong className="text-slate-800">{lostReport?.title}</strong>&quot;
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition flex items-center justify-center font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-9 h-9 border-3 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">
                Scanning found items inventory...
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Comparing visual shape, color histograms, and description semantics
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-center">
              {error}
            </div>
          ) : matches.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 text-slate-400">
                🔍
              </div>
              <h4 className="text-base font-bold text-slate-800 mb-1">
                No Potential Matches Yet
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                None of the currently available found products match the visual features or description of your lost report.
                When someone reports a matching item, it will automatically appear here!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Found <strong>{matches.length}</strong> candidate product{matches.length > 1 ? "s" : ""}
                </span>
                <span>Sorted by AI Confidence</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches.map((match, idx) => (
                  <AiMatchCard
                    key={match.report._id || idx}
                    match={match}
                    onVerify={() => {
                      onClose();
                      onVerify(match.report);
                    }}
                    onStartChat={() => {
                      onClose();
                      onOpenChat(match.report);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span>🛡️</span>
            <span>Security questions protect founders until ownership is verified</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-semibold text-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
