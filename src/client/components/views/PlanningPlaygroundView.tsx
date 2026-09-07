import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Compass, Play, Pause, StepForward, RotateCcw, AlertTriangle, CheckCircle2, XCircle, ArrowRight,
  Shield, Layers, Wrench, FileCode, CheckSquare, Sparkles, Terminal, Copy, Download,
  Eye, RefreshCw, ChevronRight, HelpCircle, Activity, Split, CircleDot, Gauge, FastForward, Trash2, PlusCircle, FolderCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { PlanningSimulator } from '../../../agent/playground/PlanningSimulator.js';
import { PlanningPlaygroundSerializer } from '../../../agent/playground/PlanningPlaygroundSerializer.js';
import type { PlanningScenarioFixture, PlanningSimulationState, PlanningSimulationStepLog } from '../../../agent/playground/PlanningPlaygroundTypes.js';

type PlaybackSpeed = 'slow' | 'normal' | 'instant' | 'step';

export function PlanningPlaygroundView(props: { theme?: string }) {
  const { theme = 'midnight' } = props;

  const simulator = useMemo(() => new PlanningSimulator(), []);
  const [fixtures, setFixtures] = useState<PlanningScenarioFixture[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>('simple-linear');

  const refreshFixtures = useCallback((preferredId?: string) => {
    // 1. Load saved user goals from localStorage
    try {
      const storedRaw = localStorage.getItem('devgenie_planning_fixtures');
      if (storedRaw) {
        const storedList = JSON.parse(storedRaw);
        if (Array.isArray(storedList)) {
          for (const item of storedList) {
            if (item && item.id && (item.goal || item.initialTasks || item.initialPlan)) {
              simulator.registerFixture(item);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load devgenie_planning_fixtures from storage', e);
    }

    // 2. Check active in-memory fixture
    const active = (window as any).__ACTIVE_PLANNING_FIXTURE__;
    let registeredActiveId: string | undefined;
    if (active && (active.goal || active.id)) {
      const activeGoal = active.goal;
      const customFixture: PlanningScenarioFixture = {
        id: active.id && active.id.startsWith('custom-goal-') ? active.id : `custom-goal-${activeGoal?.id || Date.now()}`,
        name: active.name || `🎯 Goal: ${activeGoal?.title || activeGoal?.rawPrompt || 'Live Planning Goal'}`,
        description: active.description || `Live planning scenario created via /goal: "${activeGoal?.rawPrompt || activeGoal?.title}"`,
        goal: activeGoal,
        initialTasks: active.taskSpecs || active.initialTasks || [],
        initialTaskGraph: active.taskGraph || active.initialTaskGraph,
        initialPlan: active.repairedPlan || active.plan || active.initialPlan,
        metadata: {
          source: 'goal_command',
          createdAt: Date.now(),
          ...active.metadata
        }
      };
      simulator.registerFixture(customFixture);
      registeredActiveId = customFixture.id;
      (window as any).__ACTIVE_PLANNING_FIXTURE__ = null;

      // Also persist to localStorage
      try {
        const storedRaw = localStorage.getItem('devgenie_planning_fixtures');
        const storedList = storedRaw ? JSON.parse(storedRaw) : [];
        const updated = [customFixture, ...storedList.filter((f: any) => f.id !== customFixture.id)].slice(0, 25);
        localStorage.setItem('devgenie_planning_fixtures', JSON.stringify(updated));
      } catch (e) {
        console.warn('Storage sync error', e);
      }
    }

    const all = simulator.getAvailableFixtures();
    setFixtures(all);

    if (preferredId) {
      setSelectedFixtureId(preferredId);
    } else if (registeredActiveId) {
      setSelectedFixtureId(registeredActiveId);
    } else {
      // If there are user goals, prefer selecting the latest user goal by default
      const userGoals = all.filter(f => f.id.startsWith('custom-goal-') || f.metadata?.source === 'goal_command');
      if (userGoals.length > 0) {
        setSelectedFixtureId((prev) => {
          if (prev && all.some(f => f.id === prev)) return prev;
          return userGoals[0].id;
        });
      } else if (all.length > 0) {
        setSelectedFixtureId((prev) => (all.some(f => f.id === prev) ? prev : all[0].id));
      }
    }
  }, [simulator]);

  useEffect(() => {
    refreshFixtures();

    const handleFixtureAdded = (e: any) => {
      if (e.detail?.id) {
        refreshFixtures(e.detail.id);
      } else {
        refreshFixtures();
      }
    };

    const handleNav = (e: any) => {
      if (e.detail?.goal?.id) {
        refreshFixtures(`custom-goal-${e.detail.goal.id}`);
      } else {
        refreshFixtures();
      }
    };

    window.addEventListener('custom:planning-fixture-added', handleFixtureAdded);
    window.addEventListener('nav:planning-playground', handleNav);

    return () => {
      window.removeEventListener('custom:planning-fixture-added', handleFixtureAdded);
      window.removeEventListener('nav:planning-playground', handleNav);
    };
  }, [refreshFixtures]);

  const handleDeleteUserGoal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const storedRaw = localStorage.getItem('devgenie_planning_fixtures');
      if (storedRaw) {
        const storedList = JSON.parse(storedRaw);
        const filtered = storedList.filter((f: any) => f.id !== id);
        localStorage.setItem('devgenie_planning_fixtures', JSON.stringify(filtered));
      }
    } catch (err) {
      console.warn('Failed to remove fixture', err);
    }

    // Re-initialize fixtures
    const remaining = fixtures.filter(f => f.id !== id);
    setFixtures(remaining);
    if (selectedFixtureId === id) {
      setSelectedFixtureId(remaining[0]?.id || 'simple-linear');
    }
  };

  const userGoalFixtures = useMemo(() => {
    return fixtures.filter(f => f.id.startsWith('custom-goal-') || f.metadata?.source === 'goal_command');
  }, [fixtures]);

  const benchmarkFixtures = useMemo(() => {
    return fixtures.filter(f => !f.id.startsWith('custom-goal-') && f.metadata?.source !== 'goal_command');
  }, [fixtures]);
  const [fullSimulationState, setFullSimulationState] = useState<PlanningSimulationState | null>(null);
  const [visibleStepCount, setVisibleStepCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'timeline' | 'graph' | 'plan' | 'validation' | 'replanning' | 'json'>('timeline');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>('normal');
  const [rerunFeedback, setRerunFeedback] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [currentPhaseLabel, setCurrentPhaseLabel] = useState<string>('Ready');

  const abortControllerRef = useRef<{ isAborted: boolean }>({ isAborted: false });
  const isPausedRef = useRef<boolean>(false);
  isPausedRef.current = isPaused;

  const activeFixture: PlanningScenarioFixture | undefined = useMemo(() => {
    return simulator.getFixture(selectedFixtureId);
  }, [selectedFixtureId, simulator]);

  const getSpeedDelay = (speed: PlaybackSpeed): number => {
    switch (speed) {
      case 'slow':
        return 480;
      case 'normal':
        return 240;
      case 'instant':
        return 0;
      case 'step':
        return 0;
      default:
        return 240;
    }
  };

  const runSimulation = async (id: string, overrideSpeed?: PlaybackSpeed) => {
    const speed = overrideSpeed || playbackSpeed;
    abortControllerRef.current.isAborted = true;
    abortControllerRef.current = { isAborted: false };
    const currentAbort = abortControllerRef.current;

    setIsRunning(true);
    setIsPaused(false);
    setVisibleStepCount(0);
    setCurrentPhaseLabel('Initializing Simulation...');

    try {
      const fullResult = await simulator.runSimulation(id);
      if (currentAbort.isAborted) return;
      setFullSimulationState(fullResult);

      const totalSteps = fullResult.timeline.length;

      if (speed === 'instant') {
        setVisibleStepCount(totalSteps);
        setCurrentPhaseLabel('Complete');
        setIsRunning(false);
        setRerunFeedback(true);
        setTimeout(() => setRerunFeedback(false), 1800);
        return;
      }

      if (speed === 'step') {
        setVisibleStepCount(1);
        setCurrentPhaseLabel(fullResult.timeline[0]?.phase || 'Step 1');
        setIsRunning(false);
        setIsPaused(true);
        return;
      }

      const delayMs = getSpeedDelay(speed);
      for (let i = 1; i <= totalSteps; i++) {
        if (currentAbort.isAborted) return;

        // Pause loop check
        while (isPausedRef.current && !currentAbort.isAborted) {
          await new Promise((resolve) => setTimeout(resolve, 80));
        }

        setVisibleStepCount(i);
        const currentStep = fullResult.timeline[i - 1];
        if (currentStep) {
          setCurrentPhaseLabel(`Phase ${i}/${totalSteps}: ${currentStep.phase} — ${currentStep.title}`);
        }

        if (i < totalSteps && delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      if (!currentAbort.isAborted) {
        setCurrentPhaseLabel('Simulation Complete');
        setRerunFeedback(true);
        setTimeout(() => setRerunFeedback(false), 1800);
      }
    } catch (err) {
      console.error('Simulation failed:', err);
      setCurrentPhaseLabel('Simulation Encountered Error');
    } finally {
      if (!currentAbort.isAborted) {
        setIsRunning(false);
      }
    }
  };

  const handleStepForward = () => {
    if (!fullSimulationState) return;
    const totalSteps = fullSimulationState.timeline.length;
    if (visibleStepCount < totalSteps) {
      const nextCount = visibleStepCount + 1;
      setVisibleStepCount(nextCount);
      const nextStep = fullSimulationState.timeline[nextCount - 1];
      if (nextStep) {
        setCurrentPhaseLabel(`Step ${nextCount}/${totalSteps}: ${nextStep.phase} — ${nextStep.title}`);
      }
    }
  };

  const handleTogglePause = () => {
    if (!isRunning) {
      if (visibleStepCount >= (fullSimulationState?.timeline.length || 0)) {
        runSimulation(selectedFixtureId);
      } else {
        setIsRunning(true);
        setIsPaused(false);
      }
    } else {
      setIsPaused((prev) => !prev);
    }
  };

  useEffect(() => {
    runSimulation(selectedFixtureId);
    return () => {
      abortControllerRef.current.isAborted = true;
    };
  }, [selectedFixtureId]);

  const handleCopyJson = async () => {
    let stateToExport = fullSimulationState;
    if (!stateToExport) {
      try {
        stateToExport = await simulator.runSimulation(selectedFixtureId);
        setFullSimulationState(stateToExport);
      } catch (err) {
        console.error('Failed to generate simulation state for export:', err);
      }
    }
    if (!stateToExport) return;

    const json = PlanningPlaygroundSerializer.exportSimulationJson(stateToExport);

    // 1. Trigger JSON file download
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `planning-simulation-${selectedFixtureId || 'state'}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (downloadErr) {
      console.warn('File download failed, attempting clipboard fallback:', downloadErr);
    }

    // 2. Copy to clipboard with iframe-safe fallback
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(json);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = json;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (fallbackErr) {
        console.warn('Clipboard fallback copy failed:', fallbackErr);
      }
    }

    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2400);
  };

  const visibleTimeline: PlanningSimulationStepLog[] = useMemo(() => {
    if (!fullSimulationState) return [];
    return fullSimulationState.timeline.slice(0, visibleStepCount);
  }, [fullSimulationState, visibleStepCount]);

  const totalStepCount = fullSimulationState?.timeline.length || 1;
  const progressPercent = Math.min(100, Math.round((visibleStepCount / totalStepCount) * 100));

  return (
    <div id="planning-playground-view" className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      {/* Top Header */}
      <header className={cn(
        "px-6 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0",
        theme === "light" ? "bg-white border-slate-200" : "bg-[#08080a] border-white/5"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Compass size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={cn(
                "text-base font-semibold",
                theme === "light" ? "text-slate-900" : "text-white"
              )}>
                Planning Playground
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Simulation Lab
              </span>
            </div>
            <p className={cn(
              "text-xs line-clamp-1",
              theme === "light" ? "text-slate-500" : "text-zinc-400"
            )}>
              Progressive execution visualizer for Goal Decomposition, TaskGraph DAG, 7-Stage Validation & Replanning
            </p>
          </div>
        </div>

        {/* Playback Controls & Speed Toggle */}
        <div className="flex items-center gap-2.5">
          {/* Speed Selector */}
          <div className={cn(
            "flex items-center p-0.5 rounded-lg border text-xs font-mono select-none",
            theme === "light" ? "bg-slate-100 border-slate-200" : "bg-zinc-900 border-zinc-800"
          )}>
            <span className="px-2 py-1 text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
              <Gauge size={11} /> Speed:
            </span>
            {(['slow', 'normal', 'instant', 'step'] as PlaybackSpeed[]).map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => {
                  setPlaybackSpeed(spd);
                  runSimulation(selectedFixtureId, spd);
                }}
                className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer",
                  playbackSpeed === spd
                    ? "bg-indigo-600 text-white shadow-xs"
                    : theme === "light"
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                )}
              >
                {spd === 'slow' ? '0.5x Slow' : spd === 'normal' ? '1x Normal' : spd === 'instant' ? 'Instant' : 'Step'}
              </button>
            ))}
          </div>

          {/* Step By Step Controls */}
          {playbackSpeed === 'step' && (
            <button
              type="button"
              onClick={handleStepForward}
              disabled={visibleStepCount >= totalStepCount}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer",
                visibleStepCount >= totalStepCount
                  ? "opacity-50 cursor-not-allowed bg-zinc-800 text-zinc-500"
                  : "bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 active:scale-95"
              )}
            >
              <StepForward size={13} />
              <span>Next Stage</span>
            </button>
          )}

          {/* Pause / Resume button if running progressive */}
          {isRunning && playbackSpeed !== 'instant' && (
            <button
              type="button"
              onClick={handleTogglePause}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border cursor-pointer active:scale-95",
                isPaused
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/40"
              )}
            >
              {isPaused ? <Play size={13} /> : <Pause size={13} />}
              <span>{isPaused ? "Resume" : "Pause"}</span>
            </button>
          )}

          {/* Re-run Button */}
          <button
            id="playground-rerun-btn"
            onClick={() => runSimulation(selectedFixtureId)}
            disabled={isRunning && !isPaused}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer",
              isRunning && !isPaused
                ? "opacity-90 bg-indigo-600 text-white shadow-indigo-500/25 cursor-wait"
                : rerunFeedback
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : theme === "light"
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
            )}
          >
            {rerunFeedback ? (
              <CheckCircle2 size={13} className="text-emerald-400" />
            ) : (
              <RotateCcw size={13} className={isRunning && !isPaused ? "animate-spin text-white" : ""} />
            )}
            <span>
              {isRunning && !isPaused
                ? "Simulating..."
                : rerunFeedback
                  ? "Simulation Re-run!"
                  : "Re-run Simulation"}
            </span>
          </button>

          {/* Export JSON */}
          <button
            id="playground-export-json-btn"
            onClick={handleCopyJson}
            disabled={!fullSimulationState && isRunning}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all shadow-sm cursor-pointer select-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
              copyFeedback
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/10"
                : theme === "light"
                  ? "bg-indigo-50 hover:bg-indigo-100/90 text-indigo-700 border border-indigo-200/90 hover:border-indigo-300"
                  : "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 hover:border-indigo-400/40"
            )}
            title="Export and download simulation state as JSON, and copy to clipboard"
          >
            {copyFeedback ? (
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
            ) : (
              <Download size={13} className="shrink-0 text-indigo-400" />
            )}
            <span>{copyFeedback ? "Exported & Copied!" : "Export State JSON"}</span>
          </button>
        </div>
      </header>

      {/* Progressive Progress Bar */}
      <div className="w-full bg-zinc-900/60 h-1 relative overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400"
          initial={{ width: '0%' }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
      </div>

      {/* Main Body: 2-Column Split View */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Sidebar: Fixture Selector */}
        <aside className={cn(
          "w-80 border-r flex flex-col shrink-0 overflow-y-auto",
          theme === "light" ? "bg-slate-50/50 border-slate-200" : "bg-[#09090c] border-white/5"
        )}>
          <div className="p-4 border-b border-inherit">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Planning Scenarios
              </h2>
              <span className="text-[10px] font-mono text-zinc-500">
                {fixtures.length} Total
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Select an isolated scenario or custom user goal to inspect complete DAG planning & execution.
            </p>
          </div>

          <div className="p-2 space-y-4">
            {/* Live User Goals Section */}
            <div>
              <div className="px-2 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={11} />
                  Live User Goals ({userGoalFixtures.length})
                </span>
                {userGoalFixtures.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('devgenie_planning_fixtures');
                      refreshFixtures('simple-linear');
                    }}
                    className="text-[9px] text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {userGoalFixtures.length === 0 ? (
                <div className="px-3 py-3 rounded-xl border border-dashed border-zinc-800/80 bg-zinc-950/20 text-center my-1">
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    No custom goals yet.
                  </p>
                  <p className="text-[10px] text-indigo-400/80 font-mono mt-1">
                    Run <code>/goal &lt;task&gt;</code> in chat to plan any objective here.
                  </p>
                </div>
              ) : (
                <div className="space-y-1 mt-1">
                  {userGoalFixtures.map((fixture) => {
                    const isSelected = fixture.id === selectedFixtureId;
                    return (
                      <button
                        key={fixture.id}
                        id={`fixture-select-${fixture.id}`}
                        onClick={() => setSelectedFixtureId(fixture.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-xl transition-all border group relative cursor-pointer",
                          isSelected
                            ? theme === "light"
                              ? "bg-indigo-50/70 text-slate-900 border-indigo-300 shadow-sm"
                              : "bg-indigo-500/15 text-white border-indigo-500/40 shadow-sm shadow-indigo-500/5"
                            : theme === "light"
                              ? "text-slate-600 hover:bg-white/80 border-transparent hover:border-slate-200"
                              : "text-zinc-400 hover:bg-zinc-800/40 border-transparent hover:border-zinc-800"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-xs font-semibold leading-snug line-clamp-1">
                            {fixture.goal?.title || fixture.name}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Live
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => handleDeleteUserGoal(fixture.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-zinc-500 transition-all rounded"
                              title="Delete Goal"
                            >
                              <Trash2 size={11} />
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] line-clamp-2 text-zinc-400 leading-relaxed font-mono">
                          {fixture.goal?.rawPrompt || fixture.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Benchmark Test Scenarios Section */}
            <div>
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Benchmark Scenarios ({benchmarkFixtures.length})
              </div>
              <div className="space-y-1 mt-1">
                {benchmarkFixtures.map((fixture) => {
                  const isSelected = fixture.id === selectedFixtureId;
                  const hasDefect = !!fixture.initialPlan;
                  const hasFailure = !!fixture.simulatedError;

                  return (
                    <button
                      key={fixture.id}
                      id={`fixture-select-${fixture.id}`}
                      onClick={() => setSelectedFixtureId(fixture.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl transition-all border group relative cursor-pointer",
                        isSelected
                          ? theme === "light"
                            ? "bg-white text-slate-900 border-indigo-300 shadow-sm"
                            : "bg-indigo-500/10 text-white border-indigo-500/30 shadow-sm shadow-indigo-500/5"
                          : theme === "light"
                            ? "text-slate-600 hover:bg-white/80 border-transparent hover:border-slate-200"
                            : "text-zinc-400 hover:bg-zinc-800/40 border-transparent hover:border-zinc-800"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold leading-snug">
                          {fixture.name}
                        </span>
                        {hasDefect ? (
                          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Defect
                          </span>
                        ) : hasFailure ? (
                          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            Failure
                          </span>
                        ) : (
                          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Happy
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] line-clamp-2 text-zinc-500 leading-relaxed">
                        {fixture.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Right Area: Simulation Stage & Tabs */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Scenario Overview Banner */}
          {activeFixture && (
            <div className={cn(
              "px-6 py-3 border-b shrink-0 flex items-center justify-between gap-4",
              theme === "light" ? "bg-white border-slate-200" : "bg-[#0b0b0f] border-white/5"
            )}>
              <div className="flex items-center gap-3">
                <div className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono">
                  {activeFixture.goal?.intent || 'CUSTOM'}
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-zinc-200">
                    {activeFixture.goal?.title || activeFixture.name}
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    {activeFixture.goal?.desiredOutcome || activeFixture.description}
                  </p>
                </div>
              </div>

              {/* Status Summary Chips */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border font-mono text-[11px]",
                  isRunning
                    ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                    : fullSimulationState?.validationResult?.isValid
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : fullSimulationState?.repairedPlan
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                )}>
                  {isRunning ? (
                    <RefreshCw size={12} className="animate-spin text-cyan-400" />
                  ) : fullSimulationState?.validationResult?.isValid ? (
                    <CheckCircle2 size={12} />
                  ) : fullSimulationState?.repairedPlan ? (
                    <Sparkles size={12} />
                  ) : (
                    <AlertTriangle size={12} />
                  )}
                  <span>
                    {isRunning
                      ? `Stage ${visibleStepCount}/${totalStepCount}`
                      : fullSimulationState?.validationResult?.isValid
                        ? "Validation: Valid"
                        : fullSimulationState?.repairedPlan
                          ? "Validation: Auto-Repaired"
                          : "Validation: Invalid"}
                  </span>
                </div>

                {fullSimulationState?.replanningDecision && !isRunning && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border font-mono text-[11px]",
                    fullSimulationState.replanningDecision.action === "RETRY" && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                    fullSimulationState.replanningDecision.action === "REPAIR" && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                    fullSimulationState.replanningDecision.action === "REPLAN" && "bg-purple-500/10 text-purple-400 border-purple-500/20",
                    fullSimulationState.replanningDecision.action === "ABORT" && "bg-red-500/10 text-red-400 border-red-500/20",
                  )}>
                    <Activity size={12} />
                    <span>Action: {fullSimulationState.replanningDecision.action}</span>
                  </div>
                )}

                {activeFixture?.goal && (
                  <button
                    type="button"
                    onClick={() => {
                      const planResult = {
                        goal: activeFixture.goal,
                        taskSpecs: activeFixture.initialTasks || [],
                        taskGraph: activeFixture.initialTaskGraph || { nodes: [], edges: [] },
                        plan: activeFixture.initialPlan || { id: `plan_${Date.now()}`, goalId: activeFixture.goal?.id || 'goal', steps: [], createdAt: Date.now() },
                        repairedPlan: fullSimulationState?.repairedPlan || activeFixture.initialPlan,
                        validationResult: fullSimulationState?.validationResult || { isValid: true, diagnostics: [] },
                        metadata: {
                          totalTasks: (activeFixture.initialPlan?.steps?.length) || 0,
                          totalDurationMs: 0,
                          modelCallsCount: 1,
                          repairedCount: fullSimulationState?.repairedPlan ? 1 : 0
                        }
                      };
                      window.dispatchEvent(new CustomEvent('open-workspace', { detail: { planResult } }));
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border font-mono text-[11px] transition-all cursor-pointer",
                      theme === "light"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                        : "bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/60"
                    )}
                    title="Transfer and Execute Plan in Workspace"
                  >
                    <FolderCode size={12} />
                    <span>Open in Workspace</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Active Live Phase Ticker */}
          <div className={cn(
            "px-6 py-2 border-b flex items-center justify-between text-xs font-mono shrink-0",
            theme === "light" ? "bg-slate-100/70 border-slate-200 text-slate-700" : "bg-zinc-950/80 border-white/5 text-zinc-400"
          )}>
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-2 h-2 rounded-full",
                isRunning ? "bg-cyan-400 animate-ping" : "bg-emerald-400"
              )} />
              <span className="font-semibold text-zinc-300">Active State:</span>
              <span className="text-cyan-400 truncate max-w-xl">{currentPhaseLabel}</span>
            </div>
            <div className="text-[11px] text-zinc-500">
              Resolved Stages: {visibleStepCount} / {totalStepCount} ({progressPercent}%)
            </div>
          </div>

          {/* Tab Navigation */}
          <div className={cn(
            "px-6 pt-2 border-b shrink-0 flex items-center gap-2",
            theme === "light" ? "bg-slate-50 border-slate-200" : "bg-[#08080a] border-white/5"
          )}>
            {[
              { id: 'timeline', label: 'Simulation Timeline', icon: Activity },
              { id: 'graph', label: 'TaskGraph DAG', icon: Split },
              { id: 'plan', label: 'Plan Steps', icon: Layers },
              { id: 'validation', label: '7-Stage Validation', icon: Shield },
              { id: 'replanning', label: 'Replanning Policy', icon: Sparkles },
              { id: 'json', label: 'Raw State JSON', icon: FileCode },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "px-3 py-2 text-xs font-medium rounded-t-lg flex items-center gap-2 border-b-2 transition-all cursor-pointer",
                    isActive
                      ? "border-indigo-500 text-indigo-400 bg-indigo-500/5 font-semibold"
                      : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/20"
                  )}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Container */}
          <div className="flex-1 overflow-y-auto p-6">
            {!fullSimulationState ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <RefreshCw size={24} className="animate-spin mb-2 text-indigo-400" />
                <p className="text-xs font-mono">Initializing simulation pipeline...</p>
              </div>
            ) : (
              <>
                {/* 1. TIMELINE TAB */}
                {activeTab === 'timeline' && (
                  <div className="space-y-4 max-w-4xl mx-auto">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Simulation Event Trace
                      </h3>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {visibleTimeline.length} of {fullSimulationState.timeline.length} stages revealed
                      </span>
                    </div>

                    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
                      {visibleTimeline.map((step, idx) => {
                        const isSuccess = step.status === 'SUCCESS';
                        const isWarning = step.status === 'WARNING';
                        const isError = step.status === 'ERROR';
                        const isLatest = idx === visibleTimeline.length - 1 && isRunning;

                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -12, y: 4 }}
                            animate={{ opacity: 1, x: 0, y: 0 }}
                            transition={{ duration: 0.22 }}
                            className="relative group"
                          >
                            {/* Dot marker */}
                            <div className={cn(
                              "absolute -left-6 top-1 w-3 h-3 rounded-full border-2 bg-zinc-950 transition-all group-hover:scale-125",
                              isSuccess && "border-emerald-400 bg-emerald-400/20",
                              isWarning && "border-amber-400 bg-amber-400/20",
                              isError && "border-red-400 bg-red-400/20",
                              step.status === 'INFO' && "border-indigo-400 bg-indigo-400/20",
                              isLatest && "ring-4 ring-cyan-400/30 animate-pulse"
                            )} />

                            <div className={cn(
                              "p-4 rounded-xl border transition-all",
                              isLatest
                                ? "bg-indigo-500/10 border-indigo-500/40 shadow-md shadow-indigo-500/10"
                                : theme === "light"
                                  ? "bg-white border-slate-200 shadow-sm"
                                  : "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700"
                            )}>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                    {step.phase}
                                  </span>
                                  <h4 className="text-xs font-semibold text-zinc-200">
                                    {step.title}
                                  </h4>
                                </div>
                                <span className={cn(
                                  "text-[10px] font-mono uppercase font-bold",
                                  isSuccess && "text-emerald-400",
                                  isWarning && "text-amber-400",
                                  isError && "text-red-400",
                                  step.status === 'INFO' && "text-indigo-400"
                                )}>
                                  {step.status}
                                </span>
                              </div>

                              {step.details && (
                                <p className="text-xs text-zinc-400 leading-relaxed mt-1 font-mono text-[11px]">
                                  {step.details}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. TASKGRAPH TAB */}
                {activeTab === 'graph' && (
                  <div className="space-y-6 max-w-4xl mx-auto">
                    <div className="p-4 rounded-xl border bg-zinc-900/50 border-zinc-800">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        TaskGraph DAG Topology
                      </h3>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                          <div className="text-lg font-bold text-indigo-400">
                            {fullSimulationState.taskGraph?.nodes?.size || fullSimulationState.taskSpecs?.length || 0}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Nodes</div>
                        </div>
                        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                          <div className="text-lg font-bold text-indigo-400">
                            {fullSimulationState.taskGraph?.edges?.size || 0}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Directed Edges</div>
                        </div>
                        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                          <div className="text-lg font-bold text-emerald-400">
                            {fullSimulationState.taskGraph?.getTopologicalOrder ? "Acyclic (DAG)" : "Linear"}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Cycle Status</div>
                        </div>
                      </div>
                    </div>

                    {/* Nodes Visualizer */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-zinc-400">Task Graph Nodes</h4>
                      <div className="space-y-2">
                        {(fullSimulationState.taskSpecs || []).map((task, idx) => (
                          <div key={task.id} className="p-3 rounded-xl border bg-zinc-900/40 border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-mono font-bold">
                                {idx + 1}
                              </div>
                              <div>
                                <div className="text-xs font-medium text-zinc-200">{task.title}</div>
                                <div className="text-[10px] font-mono text-zinc-500">ID: {task.id} | Type: {task.taskType}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {task.expectedOutputs && task.expectedOutputs.length > 0 ? (
                                <div className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                                  Outputs: {task.expectedOutputs.join(', ')}
                                </div>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                                  Action Task
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. PLAN STEPS TAB */}
                {activeTab === 'plan' && (
                  <div className="space-y-6 max-w-4xl mx-auto">
                    <div className="p-4 rounded-xl border bg-zinc-900/50 border-zinc-800">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Active Plan Specification
                        </h3>
                        <span className="text-xs font-mono text-indigo-400">
                          {fullSimulationState.repairedPlan?.id || fullSimulationState.plan?.id || 'No Plan'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Ordered execution steps with tool bindings and dependencies.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {(fullSimulationState.repairedPlan?.steps || fullSimulationState.plan?.steps || []).map((step, idx) => {
                        const isRepaired = fullSimulationState.repairedPlan && !fullSimulationState.plan?.steps?.some(s => s.id === step.id);
                        const isCompleted = (fullSimulationState.completedTaskIds || []).includes(step.id);
                        const toolName = typeof step.requiredTools?.[0] === 'string'
                          ? step.requiredTools[0]
                          : (step.requiredTools?.[0] as any)?.name || 'read_file';

                        return (
                          <div key={step.id} className={cn(
                            "p-4 rounded-xl border transition-all",
                            isRepaired
                              ? "bg-amber-500/5 border-amber-500/30"
                              : "bg-zinc-900/40 border-zinc-800"
                          )}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">
                                  #{idx + 1}
                                </span>
                                <h4 className="text-xs font-semibold text-zinc-200">
                                  {step.title}
                                </h4>
                                {isRepaired && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Synthesized Repair
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    Preserved Completed Work
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                Tool: {toolName}
                              </span>
                            </div>

                            <p className="text-xs text-zinc-400 mb-2">{step.description}</p>

                            {step.dependencies && step.dependencies.length > 0 && (
                              <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                                <span>Prerequisites:</span>
                                {step.dependencies.map(d => (
                                  <span key={d} className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                                    {d}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. VALIDATION TAB */}
                {activeTab === 'validation' && (
                  <div className="space-y-6 max-w-4xl mx-auto">
                    <div className="p-4 rounded-xl border bg-zinc-900/50 border-zinc-800">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        7-Stage Pre-Flight Validation Matrix
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Rigorous deterministic verification across structural, tool, risk, binding, and semantic constraints.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {[
                        { stage: 1, name: "Graph & Structural Integrity", desc: "Acyclic verification, reachable terminal nodes, connected components" },
                        { stage: 2, name: "Prerequisites & Dependencies", desc: "All step dependency references resolve cleanly within the plan" },
                        { stage: 3, name: "Tool Availability & Match", desc: "All referenced tools exist in workspace tool registry" },
                        { stage: 4, name: "Permissions & Risk Envelope", desc: "No forbidden tools, risk within max allowed thresholds" },
                        { stage: 5, name: "Input & Variable Binding", desc: "Producer steps execute before consumer variable references" },
                        { stage: 6, name: "Resource Limits & Deadlines", desc: "Total step count and estimated duration within goal bounds" },
                        { stage: 7, name: "Semantic Preservation & Contradictions", desc: "Plan fulfills goal outcome and contains no conflicting operations" },
                      ].map(stg => {
                        const hasErrors = fullSimulationState.validationResult?.errors?.some(e =>
                          e.message.toLowerCase().includes(stg.name.toLowerCase().split(' ')[0])
                        );
                        const isAutoRepaired = !hasErrors && fullSimulationState.repairedPlan;

                        return (
                          <div key={stg.stage} className="p-3.5 rounded-xl border bg-zinc-900/40 border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs font-mono font-bold">
                                {stg.stage}
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-zinc-200">{stg.name}</div>
                                <div className="text-[11px] text-zinc-500">{stg.desc}</div>
                              </div>
                            </div>

                            <div>
                              {hasErrors ? (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                  <XCircle size={12} /> Stage Failed
                                </span>
                              ) : isAutoRepaired ? (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                  <Sparkles size={12} /> Auto-Repaired
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  <CheckCircle2 size={12} /> Passed
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. REPLANNING TAB */}
                {activeTab === 'replanning' && (
                  <div className="space-y-6 max-w-4xl mx-auto">
                    <div className="p-4 rounded-xl border bg-zinc-900/50 border-zinc-800">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Replanning Policy & Failure Analysis
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Deterministic failure classification, retry/repair/replan/abort decision, and work preservation.
                      </p>
                    </div>

                    {fullSimulationState.simulatedFailure ? (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl border bg-zinc-900/40 border-zinc-800 space-y-3">
                          <h4 className="text-xs font-bold text-zinc-300">Failure Classification</h4>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                              <span className="text-zinc-500 block text-[10px] uppercase">Category</span>
                              <span className="font-mono font-bold text-indigo-400">{fullSimulationState.simulatedFailure.category}</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                              <span className="text-zinc-500 block text-[10px] uppercase">Severity</span>
                              <span className="font-mono font-bold text-amber-400">{fullSimulationState.simulatedFailure.severity}</span>
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-400">
                            <span className="text-zinc-500 block text-[10px] uppercase mb-1">Original Error Message</span>
                            {fullSimulationState.simulatedFailure.originalError}
                          </div>
                        </div>

                        {fullSimulationState.replanningDecision && (
                          <div className={cn(
                            "p-4 rounded-xl border space-y-2",
                            fullSimulationState.replanningDecision.action === 'ABORT' ? "bg-red-500/10 border-red-500/30" : "bg-indigo-500/10 border-indigo-500/30"
                          )}>
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                                Policy Decision
                              </h4>
                              <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-zinc-900 text-white">
                                {fullSimulationState.replanningDecision.action}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-300">{fullSimulationState.replanningDecision.reason}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-zinc-500 text-xs">
                        No failure simulated in this scenario. Plan executed smoothly to completion.
                      </div>
                    )}
                  </div>
                )}

                {/* 6. RAW JSON TAB */}
                {activeTab === 'json' && (
                  <div className="space-y-4 max-w-4xl mx-auto">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Serialized Simulation State
                      </h3>
                      <button
                        onClick={handleCopyJson}
                        className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <Copy size={12} /> Copy JSON
                      </button>
                    </div>
                    <pre className="p-4 rounded-xl border bg-[#050508] border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-[500px]">
                      {PlanningPlaygroundSerializer.exportSimulationJson(fullSimulationState)}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
