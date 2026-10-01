"use client";

import { MatchResult } from "@/lib/ai-matcher";

interface AiMatchCardProps {
  match: MatchResult;
  onVerify?: (report: any) => void;
  onStartChat?: (report: any) => void;
}

export default function AiMatchCard({
  match,
  onVerify,
  onStartChat,
}: AiMatchCardProps) {
  const { report, percentage, visualPercentage, textPercentage, matchLevel, reasons } = match;
  const isLocked = report.isLocked !== false && !!report.hiddenQuestion;

  const badgeColor =
    matchLevel === "HIGH"
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : matchLevel === "MODERATE"
      ? "bg-amber-100 text-amber-800 border-amber-300"
      : "bg-blue-100 text-blue-800 border-blue-300";

  return (
    <div className="border border-slate-200 hover:border-violet-300 rounded-2xl p-4 bg-white shadow-xs hover:shadow-md transition flex flex-col justify-between">
      <div>
        {/* Header: Score & Category */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-black px-2.5 py-1 rounded-full border ${badgeColor} flex items-center gap-1`}
            >
              <span>✨</span>
              <span>{percentage}% AI Match</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {matchLevel} CONFIDENCE
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            {report.category}
          </span>
        </div>

        {/* Image / Locked Preview */}
        {report.imageUrl && !isLocked ? (
          <img
            src={report.imageUrl}
            alt={report.title}
            className="w-full h-36 object-cover rounded-xl mb-3 border border-slate-200"
          />
        ) : isLocked ? (
          <div className="w-full h-32 rounded-xl mb-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 flex flex-col items-center justify-center p-3 text-center">
            <span className="text-2xl mb-1">🔒</span>
            <span className="text-xs font-bold text-amber-900">
              Founder Protected with Secret Question
            </span>
            <span className="text-[11px] text-amber-700/80 mt-0.5">
              Answer the security question to unlock full photo and founder contact
            </span>
          </div>
        ) : null}

        {/* Title & Location */}
        <h4 className="font-bold text-slate-900 text-sm mb-1 line-clamp-1">
          {report.title}
        </h4>

        {report.location && (
          <p className="text-xs text-slate-600 flex items-center gap-1 mb-2">
            <span>📍</span>
            <span className="truncate">{report.location}</span>
          </p>
        )}

        {/* Multi-Modal Score Metrics */}
        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 mb-3 space-y-1.5">
          {visualPercentage !== null && (
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
                <span>📸 Visual Shape & Color</span>
                <span className="text-violet-700 font-bold">{visualPercentage}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-violet-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${visualPercentage}%` }}
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
              <span>📝 Description & Attributes</span>
              <span className="text-blue-700 font-bold">{textPercentage}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${textPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* AI Match Reasons */}
        {reasons && reasons.length > 0 && (
          <div className="mb-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Why this matched:
            </p>
            <div className="flex flex-wrap gap-1">
              {reasons.slice(0, 3).map((reason, rIdx) => (
                <span
                  key={rIdx}
                  className="text-[11px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md border border-slate-200/80 truncate max-w-full"
                >
                  {reason}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Secret Question Teaser */}
        {isLocked && report.hiddenQuestion && (
          <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 mb-3">
            <span className="font-bold">Secret Question:</span> &quot;{report.hiddenQuestion}&quot;
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-100">
        {isLocked && onVerify ? (
          <button
            type="button"
            onClick={() => onVerify(report)}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span>🔑</span>
            <span>Answer Question &amp; Unlock Item</span>
          </button>
        ) : onStartChat ? (
          <button
            type="button"
            onClick={() => onStartChat(report)}
            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span>💬</span>
            <span>View Details &amp; Chat with Founder</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
