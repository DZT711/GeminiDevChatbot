import React, { useEffect, useState } from 'react';
import { Terminal, Cpu, HardDrive, ShieldCheck, Sparkles, FolderTree, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils.js';

interface WorkspaceConnectingScreenProps {
  theme?: 'light' | 'dark';
  isLoaded?: boolean;
  onSkip?: () => void;
}

export function WorkspaceConnectingScreen({
  theme = 'dark',
  isLoaded = false,
  onSkip,
}: WorkspaceConnectingScreenProps): React.JSX.Element {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [showSkipFallback, setShowSkipFallback] = useState<boolean>(false);

  const steps: string[] = [
    'Establishing secure connection to sandbox container...',
    'Mounting /workspace virtual filesystem & volumes...',
    'Scanning directory hierarchy & file audit records...',
    'Attaching interactive Bash 5.2 shell & language runtimes...',
    'Workspace initialized and ready.'
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => setActiveStep(1), 300);
    const timer2 = setTimeout(() => setActiveStep(2), 650);
    const timer3 = setTimeout(() => setActiveStep(3), 1000);
    const timer4 = setTimeout(() => {
      if (isLoaded) {
        setActiveStep(4);
      }
    }, 1300);

    const fallbackTimer = setTimeout(() => {
      setShowSkipFallback(true);
    }, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(fallbackTimer);
    };
  }, [isLoaded]);

  const isLight = theme === 'light';
  const progressPercent = Math.min(100, Math.round(((activeStep + 1) / steps.length) * 100));

  return (
    <div
      id="workspace-connecting-loading-screen"
      className={cn(
        'w-full h-full flex flex-col overflow-hidden select-none transition-colors duration-500',
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#090a0f] text-zinc-200'
      )}
    >
      <style>{`
        @keyframes workspaceShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-workspace-shimmer {
          position: relative;
          overflow: hidden;
        }
        .animate-workspace-shimmer::after {
          position: absolute;
          top: 0; right: 0; bottom: 0; left: 0;
          transform: translateX(-100%);
          background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0,
            rgba(255, 255, 255, 0.05) 20%,
            rgba(255, 255, 255, 0.12) 60%,
            rgba(255, 255, 255, 0)
          );
          animation: workspaceShimmer 1.8s infinite;
          content: '';
        }
        .animate-workspace-shimmer-light::after {
          position: absolute;
          top: 0; right: 0; bottom: 0; left: 0;
          transform: translateX(-100%);
          background-image: linear-gradient(
            90deg,
            rgba(0, 0, 0, 0) 0,
            rgba(0, 0, 0, 0.03) 20%,
            rgba(0, 0, 0, 0.07) 60%,
            rgba(0, 0, 0, 0)
          );
          animation: workspaceShimmer 1.8s infinite;
          content: '';
        }
      `}</style>

      {/* Top Header Simulation Bar */}
      <header
        id="workspace-connecting-header"
        className={cn(
          'w-full h-12 border-b flex items-center justify-between px-6 shrink-0 backdrop-blur-md',
          isLight ? 'border-slate-200 bg-white/80' : 'border-zinc-800/80 bg-zinc-950/70'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-cyan-400 flex items-center gap-1.5">
              DevGenie <span className={cn('text-[10px] font-normal', isLight ? 'text-slate-500' : 'text-zinc-500')}>Workspace Sandbox</span>
            </span>
            <span className={cn('text-[9.5px] font-mono', isLight ? 'text-slate-600' : 'text-zinc-400')}>
              {steps[activeStep]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400/90 font-semibold">
              Connecting
            </span>
          </div>
          {showSkipFallback && onSkip && (
            <button
              id="btn-skip-workspace-initialization"
              type="button"
              onClick={onSkip}
              className={cn(
                'text-[10px] font-mono px-3 py-1 rounded-lg border transition-all active:scale-95',
                isLight
                  ? 'border-cyan-600/40 text-cyan-700 bg-cyan-50/50 hover:bg-cyan-100/70'
                  : 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20'
              )}
            >
              Enter Workspace &rarr;
            </button>
          )}
        </div>
      </header>

      {/* Main Skeleton Simulation Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Simulated File Explorer Skeleton */}
        <div
          id="workspace-connecting-sidebar-skeleton"
          className={cn(
            'w-60 border-r hidden md:flex flex-col p-3.5 gap-3 shrink-0',
            isLight ? 'border-slate-200 bg-slate-100/60' : 'border-zinc-800/80 bg-zinc-950/40'
          )}
        >
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/20">
            <div className="flex items-center gap-2">
              <FolderTree className={cn('w-3.5 h-3.5', isLight ? 'text-slate-400' : 'text-zinc-500')} />
              <div className={cn('h-3 w-16 rounded', isLight ? 'bg-slate-300/70' : 'bg-zinc-800/70')} />
            </div>
            <div className={cn('h-3 w-6 rounded', isLight ? 'bg-slate-300/50' : 'bg-zinc-800/50')} />
          </div>

          <div className="flex flex-col gap-2 flex-1">
            {[1, 2, 3, 4, 5, 6].map((i: number) => (
              <div
                key={i}
                className={cn(
                  'h-7 rounded-lg p-2 flex items-center gap-2',
                  isLight ? 'bg-slate-200/60 animate-workspace-shimmer-light' : 'bg-zinc-900/60 animate-workspace-shimmer'
                )}
              >
                <div className={cn('w-3.5 h-3.5 rounded shrink-0', isLight ? 'bg-slate-300' : 'bg-zinc-800')} />
                <div
                  className={cn('h-2 rounded-full', isLight ? 'bg-slate-300' : 'bg-zinc-800')}
                  style={{ width: `${45 + ((i * 13) % 45)}%` }}
                />
              </div>
            ))}
          </div>

          <div
            className={cn(
              'p-2.5 rounded-xl border flex items-center gap-2.5',
              isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400'
            )}
          >
            <HardDrive className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="flex flex-col gap-1 flex-1">
              <div className={cn('h-2.5 w-16 rounded', isLight ? 'bg-slate-200' : 'bg-zinc-800')} />
              <div className={cn('h-2 w-24 rounded', isLight ? 'bg-slate-200/60' : 'bg-zinc-800/60')} />
            </div>
          </div>
        </div>

        {/* Center: Hero Card & Simulated Editor/Terminal Skeletons */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden relative">
          {/* Top Breadcrumbs / Tab Bar Skeleton */}
          <div
            className={cn(
              'h-10 border-b flex items-center px-4 gap-2 shrink-0',
              isLight ? 'border-slate-200 bg-white/50' : 'border-zinc-800/60 bg-zinc-950/20'
            )}
          >
            <div
              className={cn(
                'h-6 w-24 rounded-md',
                isLight ? 'bg-slate-200 animate-workspace-shimmer-light' : 'bg-zinc-800/60 animate-workspace-shimmer'
              )}
            />
            <div
              className={cn(
                'h-6 w-28 rounded-md',
                isLight ? 'bg-slate-200/50' : 'bg-zinc-850/40'
              )}
            />
          </div>

          {/* Central Hero Loading Stage */}
          <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto text-center px-6 py-8 gap-5 z-10">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_35px_rgba(6,182,212,0.25)]">
                <Sparkles className="w-8 h-8 text-cyan-400 animate-spin" style={{ animationDuration: '7s' }} />
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-cyan-500/20 blur-xl -z-10 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h2 className={cn('text-base font-mono font-bold tracking-tight flex items-center justify-center gap-2', isLight ? 'text-slate-900' : 'text-white')}>
                <Terminal className="w-4 h-4 text-cyan-400" />
                Connecting to Workspace Sandbox
              </h2>
              <p className={cn('text-xs font-mono max-w-md', isLight ? 'text-slate-600' : 'text-zinc-400')}>
                Initializing isolated container environment, mounting filesystem volumes, and attaching interactive shell...
              </p>
            </div>

            {/* Progress Bar & Stage Indicator */}
            <div className="w-72 space-y-2">
              <div className={cn('w-full h-2 rounded-full overflow-hidden p-0.5 border', isLight ? 'bg-slate-200 border-slate-300/60' : 'bg-zinc-900 border-zinc-800')}>
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className={cn('flex justify-between text-[10px] font-mono', isLight ? 'text-slate-500' : 'text-zinc-500')}>
                <span className="font-semibold uppercase tracking-wider">
                  Step {activeStep + 1} of {steps.length}
                </span>
                <span className="text-cyan-400 font-bold">{progressPercent}%</span>
              </div>
            </div>

            {/* Step Checkpoints */}
            <div className="w-full max-w-md flex flex-col gap-1.5 text-left text-xs font-mono">
              {steps.slice(0, 4).map((text: string, idx: number) => {
                const isPassed = activeStep > idx;
                const isCurrent = activeStep === idx;
                return (
                  <div
                    key={idx}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all',
                      isPassed
                        ? isLight
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                          : 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                        : isCurrent
                        ? isLight
                          ? 'bg-cyan-50 border-cyan-300 text-cyan-900 shadow-sm'
                          : 'bg-cyan-950/30 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                        : isLight
                        ? 'bg-slate-100/40 border-slate-200/60 text-slate-400'
                        : 'bg-zinc-900/20 border-zinc-850/40 text-zinc-600'
                    )}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shrink-0" />
                    ) : (
                      <div className={cn('w-2 h-2 rounded-full mx-0.5 shrink-0', isLight ? 'bg-slate-300' : 'bg-zinc-700')} />
                    )}
                    <span className="truncate">{text}</span>
                  </div>
                );
              })}
            </div>

            {/* Sandbox Architecture Spec Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full mt-1">
              {[
                { title: 'Container', val: 'Ubuntu 24.04', icon: Cpu },
                { title: 'Shell', val: 'Bash 5.2', icon: Terminal },
                { title: 'Volume', val: '/workspace', icon: HardDrive },
                { title: 'Security', val: 'Isolated Sandboxed', icon: ShieldCheck },
              ].map((spec, sIdx: number) => {
                const IconComponent = spec.icon;
                return (
                  <div
                    key={sIdx}
                    className={cn(
                      'p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all',
                      isLight
                        ? 'bg-white border-slate-200 shadow-xs'
                        : 'bg-zinc-900/50 border-zinc-800/80'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn('text-[9px] font-mono uppercase font-bold tracking-wider', isLight ? 'text-slate-500' : 'text-zinc-500')}>
                        {spec.title}
                      </span>
                      <IconComponent className="w-3 h-3 text-cyan-400/80" />
                    </div>
                    <span className={cn('text-[10px] font-mono font-bold truncate', isLight ? 'text-slate-800' : 'text-zinc-200')}>
                      {spec.val}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom: Simulated Terminal Dock Skeleton */}
          <div
            id="workspace-connecting-terminal-dock-skeleton"
            className={cn(
              'h-28 border-t flex flex-col p-3 gap-2 shrink-0',
              isLight ? 'border-slate-200 bg-slate-100/80' : 'border-zinc-800/80 bg-zinc-950/80'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                <span className={cn('text-[10px] font-mono ml-2', isLight ? 'text-slate-500' : 'text-zinc-500')}>
                  bash — 80x24
                </span>
              </div>
              <div
                className={cn(
                  'h-4 w-16 rounded',
                  isLight ? 'bg-slate-300/60' : 'bg-zinc-800/60'
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5 pt-1">
              <div
                className={cn(
                  'h-3 w-56 rounded',
                  isLight ? 'bg-slate-300/60 animate-workspace-shimmer-light' : 'bg-zinc-800/60 animate-workspace-shimmer'
                )}
              />
              <div
                className={cn(
                  'h-3 w-72 rounded',
                  isLight ? 'bg-slate-300/40 animate-workspace-shimmer-light' : 'bg-zinc-850/40 animate-workspace-shimmer'
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
