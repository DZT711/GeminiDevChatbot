import React, { useState } from 'react';
import {
  Check,
  X,
  ListOrdered,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import type { GoalPlanningResult } from '../../../server/services/agentIntegration/planning/GoalPlanningTypes.js';

export interface SimplifiedPlanRecordProps {
  planResult: GoalPlanningResult;
  status: 'APPROVED' | 'EXECUTED' | 'COMPLETED' | 'REJECTED';
  summary?: string;
  theme?: 'light' | 'dark';
}

export const SimplifiedPlanRecord: React.FC<SimplifiedPlanRecordProps> = ({
  planResult,
  status,
  summary,
  theme = 'dark'
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const isDark = theme === 'dark';

  const plan = planResult.repairedPlan || planResult.plan;
  const steps = plan?.steps || [];
  const stepCount = steps.length || planResult.taskSpecs?.length || 0;
  const intent = planResult.goal?.intent || (planResult.goal as any)?.objective || 'Execution Plan';

  const isApprovedOrCompleted = status === 'APPROVED' || status === 'EXECUTED' || status === 'COMPLETED';
  const isRejected = status === 'REJECTED';

  return (
    <div
      className={`my-2 rounded-xl border p-2.5 text-xs transition-all shadow-sm ${
        isDark
          ? 'bg-zinc-900/90 border-zinc-800 text-zinc-200'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-2 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] ${
              isApprovedOrCompleted
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {isApprovedOrCompleted ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
          </span>
          <span className="font-semibold text-xs text-zinc-300 truncate">
            {intent}
          </span>
          <span
            className={`px-1.5 py-0.2 text-[10px] font-mono rounded border ${
              isApprovedOrCompleted
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                : 'bg-rose-950/40 text-rose-400 border-rose-800/40'
            }`}
          >
            {isRejected ? 'Plan rejected' : `${stepCount} steps completed`}
          </span>
        </div>

        {steps.length > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-zinc-400 hover:text-indigo-400 transition-colors cursor-pointer text-[11px] shrink-0"
            title={isExpanded ? 'Hide plan steps' : 'View plan steps'}
          >
            <span>{isExpanded ? 'Hide steps' : 'View steps'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {summary && (
        <p className="text-[11px] text-zinc-400 mb-2 leading-relaxed">
          {summary}
        </p>
      )}

      {/* Expanded Steps List */}
      {isExpanded && steps.length > 0 && (
        <div
          className={`rounded-lg border overflow-hidden mt-2 ${
            isDark ? 'bg-zinc-950/70 border-zinc-800/80' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {steps.map((step, idx) => (
            <div
              key={step.id || idx}
              className={`flex items-start gap-2 px-3 py-2 text-xs border-b last:border-b-0 ${
                isDark ? 'border-zinc-800/40' : 'border-slate-200/60'
              }`}
            >
              <span className="text-[10px] font-mono text-zinc-500 mt-0.5 shrink-0">
                {(idx + 1).toString().padStart(2, '0')}.
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-zinc-300 text-[11px]">
                  {step.title || step.description || step.id}
                </div>
                {step.requiredTools && step.requiredTools.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {step.requiredTools.map((t, tIdx) => {
                      const toolName = typeof t === 'string' ? t : t.name;
                      return (
                        <span
                          key={tIdx}
                          className="inline-block text-[9px] font-mono px-1 py-0.5 rounded bg-zinc-800 text-indigo-300 border border-zinc-700"
                        >
                          {toolName}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <span className="text-emerald-400 shrink-0 mt-0.5">
                <Check className="w-3 h-3" />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
