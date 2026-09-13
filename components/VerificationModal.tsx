"use client";

import { useState } from "react";

interface Report {
  _id: string;
  title: string;
  category: string;
  type: "LOST" | "FOUND";
  location: string;
  brand?: string;
  model?: string;
  color?: string;
  imageUrl?: string;
  status: string;
  userEmail: string;
  userName?: string;
  hiddenQuestion?: string;
  description?: string;
  createdAt: string;
}

interface VerificationModalProps {
  report: Report;
  userEmail: string;
  userName: string;
  onClose: () => void;
  onStartChat: (report: Report, founderEmail: string, founderName: string) => void;
  onUnlocked: (updatedReport: Report) => void;
}

export default function VerificationModal({
  report,
  userEmail,
  userName,
  onClose,
  onStartChat,
  onUnlocked,
}: VerificationModalProps) {
  const [answer, setAnswer] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<{
    tested: boolean;
    passed: boolean;
    percentage: number;
    message: string;
    unlockedReport?: Report;
    founderEmail?: string;
    founderName?: string;
  } | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;

    setIsVerifying(true);
    try {
      const res = await fetch("/api/reports/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report._id,
          userAnswer: answer.trim(),
          userEmail,
          userName,
        }),
      });

      const data = await res.json();

      if (res.ok && data.passed) {
        setResult({
          tested: true,
          passed: true,
          percentage: data.percentage,
          message: data.message,
          unlockedReport: data.report,
          founderEmail: data.founderEmail,
          founderName: data.founderName,
        });
        if (data.report) {
          onUnlocked(data.report);
        }
      } else {
        setResult({
          tested: true,
          passed: false,
          percentage: data.percentage || 0,
          message:
            data.message ||
            data.error ||
            "Verification did not meet the 80% threshold. Try adding more specific details.",
        });
      }
    } catch (err) {
      console.error("Verification error:", err);
      setResult({
        tested: true,
        passed: false,
        percentage: 0,
        message: "Connection error. Please check your network and try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl font-bold">
              🛡️
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">
                Security Verification
              </h3>
              <p className="text-xs text-slate-500">
                ML Cosine Similarity Verification (Requires &ge; 80% Accuracy)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition text-lg"
          >
            ✕
          </button>
        </div>

        {/* Item context */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 mb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              {report.type}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {report.category}
            </span>
          </div>
          <h4 className="font-bold text-slate-900 text-base mb-1">
            {report.title}
          </h4>
          <p className="text-xs text-slate-600 flex items-center gap-1">
            <span>📍 Location Found:</span>
            <span className="font-semibold">{report.location || "Campus Area"}</span>
          </p>
        </div>

        {/* Founder's Secret Question */}
        <div className="mb-5 bg-amber-50/80 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider mb-1.5">
            <span>❓ Founder&apos;s Secret Question</span>
          </div>
          <p className="text-sm font-semibold text-slate-900 italic">
            &quot;{report.hiddenQuestion || "What is a unique hidden detail or mark on this item?"}&quot;
          </p>
        </div>

        {/* Verification Form */}
        {!result?.passed ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Your Answer to Prove Ownership
              </label>
              <textarea
                rows={3}
                required
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer accurately (e.g. description of sticker, engraving, lock screen wallpaper, or card inside)..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Our ML Cosine Similarity engine tolerates minor typos and wording variations, but looks for semantic closeness.
              </p>
            </div>

            {/* Previous failed result meter */}
            {result?.tested && !result.passed && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-red-800">
                  <span>Cosine Similarity Match:</span>
                  <span>{result.percentage}% / 80% Needed</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2.5 bg-red-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 transition-all duration-500"
                    style={{ width: `${Math.min(100, result.percentage)}%` }}
                  />
                </div>
                <p className="text-xs text-red-700 leading-relaxed">
                  {result.message}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying || !answer.trim()}
                className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing with ML...</span>
                  </>
                ) : (
                  <span>Verify with AI</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* SUCCESS STATE: >= 80% Match */
          <div className="space-y-5">
            <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-2xl font-bold mx-auto">
                ✓
              </div>
              <div>
                <h4 className="text-lg font-extrabold text-emerald-900">
                  Verification Passed ({result.percentage}% Match)!
                </h4>
                <p className="text-xs text-emerald-700 mt-1">
                  Your answer exceeded the 80% ML cosine similarity threshold. Full product details are unlocked!
                </p>
              </div>
              {/* Progress bar */}
              <div className="w-full h-3 bg-emerald-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-700"
                  style={{ width: `${Math.min(100, result.percentage)}%` }}
                />
              </div>
            </div>

            {/* Unlocked Details preview */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                🔓 Unlocked Founder Info
              </p>
              <p className="text-slate-700">
                <strong>Founder:</strong> {result.founderName || "Campus Student"} ({result.founderEmail})
              </p>
              {result.unlockedReport?.description && (
                <p className="text-slate-600">
                  <strong>Notes:</strong> {result.unlockedReport.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition text-center"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (result.founderEmail) {
                    onStartChat(
                      result.unlockedReport || report,
                      result.founderEmail,
                      result.founderName || "Founder"
                    );
                  }
                }}
                className="flex-1 py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <span>💬</span>
                <span>Confirm &amp; Start Chat with Founder</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
