"use client";

import { useState } from "react";

interface LossScenario {
  hotspot: string;
  probability: number;
  mechanism: string;
  recommendedAction: string;
}

interface TrajectoryAnalysis {
  scenarios: LossScenario[];
  summary: string;
  itemRiskFactor: string;
  immediateActionPlan: string[];
}

interface AiLossTrajectoryModalProps {
  itemTitle: string;
  location: string;
  analysis: TrajectoryAnalysis;
  onClose: () => void;
}

export default function AiLossTrajectoryModal({
  itemTitle,
  location,
  analysis,
  onClose,
}: AiLossTrajectoryModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl font-black">
              🧠
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">
                  AI Loss Trajectory Analysis
                </h3>
                <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  Prediction
                </span>
              </div>
              <p className="text-xs text-blue-100">
                Predictive model for: <strong>{itemTitle}</strong> near <strong>{location}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Summary Banner */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 text-xs sm:text-sm text-slate-700 leading-relaxed space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-blue-900 uppercase text-[11px] tracking-wider">
                Behavioral &amp; Physical Risk Assessment
              </span>
              <span className="text-[10px] font-bold bg-white text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                {analysis.itemRiskFactor}
              </span>
            </div>
            <p className="text-slate-600">{analysis.summary}</p>
          </div>

          {/* Probable Loss Scenarios */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <span>🎯</span>
              <span>Predicted Loss Scenarios &amp; Hotspots</span>
            </h4>

            <div className="space-y-3">
              {analysis.scenarios.map((sc, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:border-blue-400 transition"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h5 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                      <span className="text-blue-600 font-extrabold">#{idx + 1}</span>
                      <span>{sc.hotspot}</span>
                    </h5>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${sc.probability}%` }}
                        />
                      </div>
                      <span className="text-xs font-extrabold text-blue-700">
                        {sc.probability}%
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-2.5 leading-relaxed">
                    <strong>How it was lost:</strong> {sc.mechanism}
                  </p>

                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
                    <span className="text-sm shrink-0">📍</span>
                    <span>
                      <strong>Where to look:</strong> {sc.recommendedAction}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Checklist */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <span>📋</span>
              <span>Immediate Search Action Plan</span>
            </h4>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2">
              {analysis.immediateActionPlan.map((action, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Keep checking Found!t as finders post updates.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}
