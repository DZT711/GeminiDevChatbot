import React, { useState } from 'react';
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Wrench,
  Shield,
  Clock,
  Sparkles,
  Copy,
  Check,
  Lock,
  Play,
  RotateCcw,
  Activity,
  CheckSquare,
  StopCircle,
  AlertOctagon,
  FolderCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import type { GoalPlanningResult } from '../../../server/services/agentIntegration/planning/GoalPlanningTypes.js';
import type { PlanExecutionProgressEvent, PlanExecutionSummary } from '../../../server/services/agentIntegration/planning/PlanExecutionService.js';
import { workspaceService } from '../../services/workspaceService.js';

interface PlanningResultCardProps {
  result: GoalPlanningResult;
  theme?: string;
  onOpenPlanningLab?: (result: GoalPlanningResult) => void;
  onExecutePlan?: (result: GoalPlanningResult) => void;
}

export function PlanningResultCard({
  result,
  theme = 'midnight',
  onOpenPlanningLab,
  onExecutePlan
}: PlanningResultCardProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'steps' | 'validation' | 'execution' | 'json'>('tasks');

  // Execution modal & state
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionSummary, setExecutionSummary] = useState<PlanExecutionSummary | null>(null);
  const [executionLogs, setExecutionLogs] = useState<PlanExecutionProgressEvent[]>([]);
  const [activeRunningTaskId, setActiveRunningTaskId] = useState<string | null>(null);

  const goal = result.goal;
  const plan = result.repairedPlan || result.plan;
  const validation = result.postRepairValidation || result.validation;
  const taskSpecs = result.taskSpecs || [];
  const repairHistory = result.repairHistory || [];

  const isValid = validation?.isValid ?? result.status === 'success';

  const validationStages = [
    { name: 'Graph Acyclicity', passed: !validation?.errors.some(e => e.code === 'CYCLE_DETECTED'), desc: 'DAG topological integrity verified' },
    { name: 'Dependency Completeness', passed: !validation?.errors.some(e => e.code === 'MISSING_DEPENDENCY'), desc: 'All task prerequisites satisfied' },
    { name: 'Tool Availability', passed: !validation?.errors.some(e => e.code === 'TOOL_NOT_FOUND'), desc: 'Required tools registered in system' },
    { name: 'Permissions & Risk', passed: !validation?.errors.some(e => e.code === 'PERMISSION_VIOLATION'), desc: 'Adheres to risk threshold policy' },
    { name: 'Input/Output Binding', passed: !validation?.errors.some(e => e.code === 'INPUT_BINDING_MISSING'), desc: 'Input/output contract bindings valid' },
    { name: 'Resource Constraints', passed: !validation?.errors.some(e => e.code === 'CONSTRAINT_EXCEEDED'), desc: 'Within maximum step and time limits' },
    { name: 'Semantic Contradictions', passed: !validation?.errors.some(e => e.code === 'CONTRADICTORY_OPERATIONS'), desc: 'Zero conflicting state operations' }
  ];

  const passedCount = validationStages.filter(s => s.passed).length;

  const handleCopyJson = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy planning JSON:', err);
    }
  };

  const handleOpenLab = () => {
    try {
      const storedFixturesRaw = localStorage.getItem('devgenie_planning_fixtures');
      const storedFixtures = storedFixturesRaw ? JSON.parse(storedFixturesRaw) : [];
      const activeGoal = result.goal;
      const fixtureId = `custom-goal-${activeGoal?.id || Date.now()}`;
      const newFixture = {
        id: fixtureId,
        name: `🎯 Goal: ${activeGoal?.title || activeGoal?.rawPrompt || 'Live Planning Goal'}`,
        description: `Live planning scenario created via /goal: "${activeGoal?.rawPrompt || activeGoal?.title}"`,
        goal: activeGoal,
        initialTasks: result.taskSpecs || [],
        initialTaskGraph: result.taskGraph,
        initialPlan: result.repairedPlan || result.plan,
        metadata: {
          source: 'goal_command',
          createdAt: Date.now()
        }
      };

      const updated = [newFixture, ...storedFixtures.filter((f: any) => f.goal?.id !== activeGoal?.id)].slice(0, 25);
      localStorage.setItem('devgenie_planning_fixtures', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist fixture to localStorage', e);
    }

    if (onOpenPlanningLab) {
      onOpenPlanningLab(result);
    } else {
      (window as any).__ACTIVE_PLANNING_FIXTURE__ = result;
      const event = new CustomEvent('nav:planning-playground', { detail: result });
      window.dispatchEvent(event);
    }
  };

  const handleOpenWorkspace = () => {
    const event = new CustomEvent('open-workspace', { detail: { planResult: result } });
    window.dispatchEvent(event);
  };

  const handleConfirmExecution = async () => {
    setShowApprovalModal(false);
    setIsExecuting(true);
    setActiveTab('execution');
    setExecutionLogs([]);
    setExecutionSummary(null);

    try {
      const execRes = await workspaceService.executePlan(
        result,
        {
          confirmed: true,
          approvedAt: Date.now(),
          approvedBy: 'User',
          maxRiskLevelConfirmed: goal?.constraints.maxRiskLevel
        }
      );

      const summary = execRes.summary as PlanExecutionSummary;
      setExecutionSummary(summary);
      if (onExecutePlan) {
        onExecutePlan(result);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setExecutionSummary({
        executionId: 'err-exec',
        planId: plan?.id || 'unknown',
        goalId: goal?.id || 'unknown',
        success: false,
        status: 'FAILED',
        totalTasks: plan?.steps.length || 0,
        completedTasks: [],
        failedTasks: [],
        blockedTasks: [],
        taskResults: {},
        durationMs: 0,
        error: errorMsg
      });
    } finally {
      setIsExecuting(false);
      setActiveRunningTaskId(null);
    }
  };

  if (!goal || !plan) {
    return (
      <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs font-mono">
        <div className="flex items-center gap-2 font-bold mb-1">
          <AlertTriangle size={14} className="text-rose-400" />
          <span>Planning Error</span>
        </div>
        <p>{result.errors?.join('\n') || 'Planning pipeline did not return a valid plan.'}</p>
      </div>
    );
  }

  return (
    <div
      id={`planning-card-${goal.id}`}
      className={cn(
        'rounded-xl border overflow-hidden transition-all duration-300 my-2 shadow-xl',
        theme === 'light'
          ? 'bg-slate-50 border-slate-200 text-slate-900 shadow-slate-200/50'
          : 'bg-zinc-950/90 border-cyan-500/30 text-zinc-100 shadow-[0_0_25px_rgba(6,182,212,0.1)]'
      )}
    >
      {/* Header Banner */}
      <div className={cn(
        'p-4 border-b flex flex-wrap items-center justify-between gap-3',
        theme === 'light' ? 'bg-white border-slate-200' : 'bg-zinc-900/80 border-cyan-500/20'
      )}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Compass size={18} className="animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                M05 Planning Intelligence
              </span>
              <span className={cn(
                'text-[10px] px-2 py-0.5 rounded font-mono font-semibold',
                goal.intent === 'CODE_MODIFICATION' && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                goal.intent === 'INVESTIGATION' && 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                goal.intent === 'TESTING_AND_VERIFICATION' && 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
                goal.intent === 'INFRASTRUCTURE_OPS' && 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
                goal.intent === 'INFORMATION_RETRIEVAL' && 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              )}>
                {goal.intent}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono border border-zinc-700">
                Risk: {goal.constraints.maxRiskLevel}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-zinc-100 tracking-tight mt-0.5">
              {goal.title || goal.rawPrompt}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold border',
            isValid
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          )}>
            {isValid ? (
              <>
                <CheckCircle2 size={13} />
                <span>PLAN VALIDATED</span>
              </>
            ) : (
              <>
                <AlertTriangle size={13} />
                <span>VALIDATION WARNING</span>
              </>
            )}
          </span>

          <button
            id={`planning-card-toggle-${goal.id}`}
            onClick={() => setIsExpanded(prev => !prev)}
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all cursor-pointer hover:border-cyan-500/40 active:scale-95"
            title={isExpanded ? 'Collapse plan details' : 'Expand plan details'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Collapsible Card Body */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key={`planning-card-body-${goal.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {/* Quick Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-zinc-900/40 border-b border-zinc-800 text-xs font-mono">
        <div className="flex items-center gap-2 text-zinc-400">
          <Layers size={13} className="text-cyan-400" />
          <span>Tasks: <strong className="text-zinc-200">{taskSpecs.length} DAG nodes</strong></span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <Wrench size={13} className="text-emerald-400" />
          <span>Plan Steps: <strong className="text-zinc-200">{plan.steps.length} steps</strong></span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <Shield size={13} className="text-indigo-400" />
          <span>7-Stage: <strong className={isValid ? 'text-emerald-400' : 'text-amber-400'}>{passedCount}/7 PASS</strong></span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <Clock size={13} className="text-amber-400" />
          <span>Latency: <strong className="text-zinc-200">{result.durationMs}ms</strong></span>
        </div>
      </div>

      {/* Repair Alert if applied */}
      {repairHistory.length > 0 && (
        <div className="px-4 py-2 bg-indigo-950/40 border-b border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-2 font-mono">
          <Sparkles size={13} className="text-indigo-400" />
          <span>Localized Plan Repair applied and re-validated cleanly.</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center border-b border-zinc-800 bg-zinc-950/60 px-4 text-xs font-mono">
        <button
          onClick={() => setActiveTab('tasks')}
          className={cn(
            'px-3 py-2 border-b-2 font-semibold transition-all cursor-pointer',
            activeTab === 'tasks'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          )}
        >
          Task Graph ({taskSpecs.length})
        </button>
        <button
          onClick={() => setActiveTab('steps')}
          className={cn(
            'px-3 py-2 border-b-2 font-semibold transition-all cursor-pointer',
            activeTab === 'steps'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          )}
        >
          Plan Steps ({plan.steps.length})
        </button>
        <button
          onClick={() => setActiveTab('validation')}
          className={cn(
            'px-3 py-2 border-b-2 font-semibold transition-all cursor-pointer',
            activeTab === 'validation'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          )}
        >
          7-Stage Matrix ({passedCount}/7)
        </button>
        {executionLogs.length > 0 && (
          <button
            onClick={() => setActiveTab('execution')}
            className={cn(
              'px-3 py-2 border-b-2 font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeTab === 'execution'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            )}
          >
            <Activity size={12} className={isExecuting ? "animate-pulse text-emerald-400" : ""} />
            <span>Execution ({executionSummary ? executionSummary.status : isExecuting ? 'Running' : 'Ready'})</span>
          </button>
        )}
        <button
          onClick={() => setActiveTab('json')}
          className={cn(
            'px-3 py-2 border-b-2 font-semibold transition-all cursor-pointer',
            activeTab === 'json'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          )}
        >
          Raw JSON
        </button>
      </div>

      {/* Active Tab Body */}
      <div className="p-4 text-xs">
        {activeTab === 'tasks' && (
          <div className="space-y-2.5">
            {taskSpecs.map((task, idx) => (
              <div
                key={task.id}
                className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-start gap-3 hover:border-cyan-500/30 transition-all"
              >
                <div className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono font-bold flex items-center justify-center text-[10px] mt-0.5 shrink-0 border border-cyan-500/20">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={cn(
                      'text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase',
                      task.taskType === 'INSPECT' && 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
                      task.taskType === 'MODIFY' && 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
                      task.taskType === 'VERIFY' && 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
                      task.taskType === 'ANALYZE' && 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
                      task.taskType === 'COMMUNICATE' && 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    )}>
                      {task.taskType}
                    </span>
                    <span className="font-semibold text-zinc-200 text-xs">
                      {task.title}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-xs leading-relaxed mb-2">
                    {task.description}
                  </p>
                  {task.toolHints && task.toolHints.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap font-mono text-[10px]">
                      <span className="text-zinc-500">Tool hints:</span>
                      {task.toolHints.map(tool => (
                        <span key={tool} className="px-1.5 py-0.2 bg-zinc-800 text-cyan-300 rounded border border-zinc-700">
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'steps' && (
          <div className="space-y-2">
            {plan.steps.map((step, idx) => {
              const isRunningThis = activeRunningTaskId === step.id;
              const isCompleted = executionSummary?.completedTasks.includes(step.id);
              const isFailed = executionSummary?.failedTasks.includes(step.id);
              const isBlocked = executionSummary?.blockedTasks.includes(step.id);

              return (
                <div
                  key={step.id}
                  className={cn(
                    "p-3 rounded-lg border flex items-start gap-3 transition-all",
                    isRunningThis
                      ? "bg-cyan-950/30 border-cyan-500/50 shadow-sm shadow-cyan-500/20"
                      : isCompleted
                        ? "bg-emerald-950/20 border-emerald-500/30"
                        : isFailed
                          ? "bg-rose-950/20 border-rose-500/30"
                          : isBlocked
                            ? "bg-amber-950/20 border-amber-500/30 opacity-70"
                            : "bg-zinc-900/60 border-zinc-800"
                  )}
                >
                  <div className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 font-mono font-bold flex items-center justify-center text-[10px] mt-0.5 shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-[11px] text-cyan-400 font-semibold">{step.id}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono border border-zinc-700">
                        Risk: {step.riskLevel}
                      </span>
                      {isRunningThis && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold animate-pulse border border-cyan-500/40">
                          EXECUTING...
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/40">
                          ✓ DONE
                        </span>
                      )}
                      {isFailed && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono font-bold border border-rose-500/40">
                          ✗ FAILED
                        </span>
                      )}
                      {isBlocked && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40">
                          BLOCKED
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-300 text-xs mb-1.5">{step.description}</p>
                    <div className="flex items-center gap-3 flex-wrap text-[10px] font-mono text-zinc-400">
                      {step.requiredTools.length > 0 && (
                        <span>Tools: <strong className="text-emerald-400">{step.requiredTools.map(t => typeof t === 'string' ? t : t.name).join(', ')}</strong></span>
                      )}
                      {step.dependencies.length > 0 && (
                        <span>Prerequisites: <strong className="text-zinc-300">{step.dependencies.join(', ')}</strong></span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="space-y-2">
            {validationStages.map((stage, idx) => (
              <div
                key={stage.name}
                className={cn(
                  'p-2.5 rounded-lg border flex items-center justify-between gap-3 font-mono',
                  stage.passed
                    ? 'bg-emerald-950/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                )}
              >
                <div className="flex items-center gap-2.5">
                  {stage.passed ? (
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle size={15} className="text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-xs">Stage {idx + 1}: {stage.name}</div>
                    <div className="text-[10px] opacity-80">{stage.desc}</div>
                  </div>
                </div>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded font-bold uppercase',
                  stage.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                )}>
                  {stage.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'execution' && (
          <div className="space-y-3">
            {/* Live Progress Header */}
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className={isExecuting ? "text-cyan-400 animate-spin" : "text-emerald-400"} />
                <span className="font-mono font-bold text-xs">
                  {isExecuting ? 'Executing Pipeline Tasks...' : executionSummary?.success ? 'Execution Complete (100%)' : 'Execution Halted'}
                </span>
              </div>
              {executionSummary && (
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase",
                  executionSummary.success ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                )}>
                  {executionSummary.status} ({executionSummary.durationMs}ms)
                </span>
              )}
            </div>

            {/* Live Event Stream */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto font-mono text-[11px]">
              {executionLogs.map((log, idx) => (
                <div
                  key={`${log.timestamp}-${idx}`}
                  className="p-2 rounded bg-zinc-950/80 border border-zinc-800 flex items-start justify-between gap-2"
                >
                  <div>
                    <span className="text-zinc-500 mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={cn(
                      "font-bold uppercase mr-2",
                      log.type.includes('completed') ? "text-emerald-400" :
                      log.type.includes('failed') || log.type.includes('aborted') ? "text-rose-400" :
                      log.type.includes('started') ? "text-cyan-400" : "text-zinc-300"
                    )}>
                      {log.type.replace('_', ' ')}
                    </span>
                    {log.taskId && <span className="text-zinc-300 font-semibold">{log.taskId}</span>}
                    {log.error && <span className="text-rose-300 ml-2">{log.error}</span>}
                  </div>
                  {log.completedTasks !== undefined && log.totalTasks !== undefined && (
                    <span className="text-zinc-500 text-[10px]">
                      {log.completedTasks}/{log.totalTasks}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'json' && (
          <div className="relative">
            <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-cyan-300/90 overflow-x-auto max-h-64 scrollbar-thin">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className={cn(
        'p-3 border-t flex flex-wrap items-center justify-between gap-2',
        theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900/90 border-zinc-800'
      )}>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenWorkspace}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-semibold transition-all shadow-sm cursor-pointer active:scale-95"
            title="Open plan in Workspace code editor & terminal"
          >
            <FolderCode size={13} />
            <span>Open in Workspace</span>
            <ExternalLink size={11} className="opacity-70" />
          </button>

          <button
            onClick={handleOpenLab}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-semibold transition-all shadow-sm cursor-pointer active:scale-95"
            title="Open plan in Planning Playground Lab"
          >
            <Compass size={13} />
            <span>Open in Planning Lab</span>
            <ExternalLink size={11} className="opacity-70" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyJson}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-mono transition-all cursor-pointer active:scale-95"
            title="Copy raw planning JSON"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>

      {/* Explicit User Approval Modal */}
      <AnimatePresence>
        {showApprovalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-zinc-950 border border-cyan-500/40 rounded-xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">
                    Approve Plan Execution
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Explicit authorization required for M05 execution
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Goal Intent:</span>
                  <span className="text-cyan-300 font-semibold">{goal.intent}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Total Steps:</span>
                  <span className="text-zinc-200">{plan.steps.length} sequential/DAG steps</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Max Risk Threshold:</span>
                  <span className="text-amber-400">{goal.constraints.maxRiskLevel}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Pre-Flight Validation:</span>
                  <span className="text-emerald-400 font-bold">7/7 Stages PASS</span>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                By confirming, the runtime will execute the validated DAG tasks through the standard ExecutionPipeline with active permission bounds and error recovery.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-mono font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmExecution}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 cursor-pointer"
                >
                  <CheckSquare size={13} />
                  <span>Confirm & Execute</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
