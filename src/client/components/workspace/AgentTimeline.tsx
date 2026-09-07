import React, { useState } from 'react';
import {
  Play,
  Square,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Wrench,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Terminal,
  Activity,
  Layers,
  Loader2
} from 'lucide-react';
import type { GoalPlanningResult } from '../../../server/services/agentIntegration/planning/GoalPlanningTypes.js';
import type { PlanExecutionProgressEvent } from '../../services/workspaceService.js';

interface AgentTimelineProps {
  planningResult: GoalPlanningResult | null;
  activeExecutionId?: string;
  isExecuting: boolean;
  events: PlanExecutionProgressEvent[];
  onExecutePlan: (planningResult: GoalPlanningResult) => Promise<void>;
  onStopExecution: (executionId: string) => Promise<void>;
  theme?: 'light' | 'dark';
}

export const AgentTimeline: React.FC<AgentTimelineProps> = ({
  planningResult,
  activeExecutionId,
  isExecuting,
  events,
  onExecutePlan,
  onStopExecution,
  theme = 'dark'
}) => {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  const plan = planningResult?.repairedPlan || planningResult?.plan;
  const goal = planningResult?.goal;

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // Derive task states from events
  const getTaskStatus = (taskId: string): 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' => {
    const taskEvents = events.filter((e) => e.taskId === taskId);
    if (taskEvents.some((e) => e.type === 'task_failed')) return 'FAILED';
    if (taskEvents.some((e) => e.type === 'task_completed')) return 'COMPLETED';
    if (taskEvents.some((e) => e.type === 'task_started')) return 'RUNNING';
    return 'PENDING';
  };

  const getTaskEvents = (taskId: string) => {
    return events.filter((e) => e.taskId === taskId);
  };

  const completedCount = plan ? plan.steps.filter((s) => getTaskStatus(s.id) === 'COMPLETED').length : 0;
  const totalCount = plan?.steps.length || 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const isDark = theme === 'dark';

  if (!planningResult || !plan) {
    return (
      <div className={`h-full flex flex-col items-center justify-center p-6 text-center select-none ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
        <Layers className="w-10 h-10 mb-2 opacity-30 text-purple-400" />
        <h4 className="text-xs font-semibold text-zinc-300 mb-1">No Active Plan in Workspace</h4>
        <p className="text-xs max-w-sm text-zinc-500">
          Generate or select a plan from the Planning Lab, or click [Open in Workspace] on a plan card to inspect and execute tasks here.
        </p>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-zinc-950 text-zinc-200' : 'bg-slate-50 text-slate-800'}`}>
      {/* Header & Controls Bar */}
      <div className={`p-3 border-b flex items-center justify-between gap-4 ${isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-3 truncate">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <span className="font-semibold text-xs text-purple-400 truncate">
              {goal?.title || 'Execution Plan'}
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            {completedCount}/{totalCount} tasks completed ({progressPercent}%)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isExecuting ? (
            activeExecutionId ? (
              <button
                type="button"
                onClick={() => onStopExecution(activeExecutionId)}
                className="px-3 py-1 text-xs font-medium rounded bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                title="Stop agent plan execution"
              >
                <Square className="w-3.5 h-3.5" />
                Stop Execution
              </button>
            ) : (
              <div
                className="px-3 py-1 text-xs font-medium rounded bg-purple-950/80 border border-purple-600/40 text-purple-300 flex items-center gap-1.5 shadow-sm select-none animate-pulse"
                title="Agent is executing plan steps in workspace"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>Agent Coding...</span>
              </div>
            )
          ) : (
            <button
              type="button"
              onClick={() => setShowApprovalModal(true)}
              disabled={!plan || plan.steps.length === 0}
              className="px-3 py-1 text-xs font-medium rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Execute Plan
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-zinc-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Timeline Steps List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
        {plan.steps.map((step, idx) => {
          const status = getTaskStatus(step.id);
          const isExpanded = expandedTasks.has(step.id);
          const taskEvents = getTaskEvents(step.id);

          return (
            <div
              key={step.id}
              className={`rounded border transition-all ${
                status === 'RUNNING'
                  ? isDark
                    ? 'border-purple-500/50 bg-purple-950/20 shadow-sm'
                    : 'border-purple-300 bg-purple-50 shadow-sm'
                  : status === 'COMPLETED'
                  ? isDark
                    ? 'border-emerald-900/40 bg-zinc-900/30'
                    : 'border-emerald-200 bg-white'
                  : status === 'FAILED'
                  ? isDark
                    ? 'border-rose-900/50 bg-rose-950/20'
                    : 'border-rose-200 bg-rose-50'
                  : isDark
                  ? 'border-zinc-800 bg-zinc-900/20'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div
                onClick={() => toggleTaskExpand(step.id)}
                className="p-2.5 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                  <span className="text-zinc-500">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </span>

                  {/* Status Icon */}
                  {status === 'RUNNING' ? (
                    <Activity className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                  ) : status === 'COMPLETED' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : status === 'FAILED' ? (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
                  )}

                  <div className="truncate">
                    <span className="font-medium mr-2 text-zinc-400 font-mono">#{idx + 1}</span>
                    <span className="font-medium text-zinc-200 truncate">{step.description}</span>
                  </div>
                </div>

                {/* Required Tools Chips */}
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {step.requiredTools.map((t, i) => {
                    const toolName = typeof t === 'string' ? t : t.name;
                    return (
                      <span
                        key={i}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 font-mono flex items-center gap-1"
                      >
                        <Wrench className="w-2.5 h-2.5 text-zinc-500" />
                        {toolName}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Expanded Details & Tool Event Stream */}
              {isExpanded && (
                <div className={`p-3 border-t text-[11px] font-mono space-y-2 ${isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="text-zinc-400">
                    <span className="font-semibold text-zinc-300">Step ID:</span> {step.id}
                  </div>
                  {step.dependencies && step.dependencies.length > 0 && (
                    <div className="text-zinc-500">
                      <span className="font-semibold text-zinc-400">Dependencies:</span> {step.dependencies.join(', ')}
                    </div>
                  )}

                  {/* Tool execution logs */}
                  {taskEvents.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="font-semibold text-zinc-400 flex items-center gap-1">
                        <Terminal className="w-3 h-3 text-purple-400" />
                        Execution Events:
                      </div>
                      <div className="p-2 rounded bg-black/40 border border-zinc-800/80 space-y-1">
                        {taskEvents.map((evt, i) => (
                          <div key={i} className="leading-relaxed">
                            <span className="text-zinc-500">[{new Date(evt.timestamp).toLocaleTimeString()}]</span>{' '}
                            <span className="text-purple-400 font-semibold">{evt.type}</span>
                            {evt.toolName && <span className="text-sky-400"> [{evt.toolName}]</span>}
                            {evt.error && <span className="text-rose-400 block mt-0.5">Error: {evt.error}</span>}
                            {evt.result && (
                              <pre className="text-zinc-400 text-[10px] mt-0.5 whitespace-pre-wrap overflow-x-auto">
                                {typeof evt.result === 'object' ? JSON.stringify(evt.result, null, 2) : String(evt.result)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Explicit Approval Confirmation Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className={`max-w-md w-full p-5 rounded-lg border shadow-xl ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center gap-2.5 text-purple-400 font-semibold text-sm mb-3">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              Confirm Agent Plan Execution
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Executing this plan will allow the Agent to run tools (such as creating/editing workspace files and running sandbox terminal commands) inside your active workspace.
            </p>
            <div className="p-3 rounded bg-zinc-950/60 border border-zinc-800 text-xs mb-4">
              <div className="font-medium text-zinc-300 mb-1">{goal?.title || 'Execution Plan'}</div>
              <div className="text-zinc-500 text-[11px]">{plan.steps.length} step(s) will be executed sequentially.</div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                disabled={isSubmittingApproval}
                className="px-3 py-1.5 text-xs rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingApproval || isExecuting}
                onClick={async () => {
                  if (isSubmittingApproval || isExecuting) return;
                  setIsSubmittingApproval(true);
                  try {
                    setShowApprovalModal(false);
                    await onExecutePlan(planningResult);
                  } finally {
                    setIsSubmittingApproval(false);
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmittingApproval ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Approve & Execute</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
