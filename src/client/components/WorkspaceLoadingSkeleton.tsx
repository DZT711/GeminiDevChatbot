import React, { useEffect, useState } from "react";
import { Cpu, Sparkles, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceLoadingSkeletonProps {
  theme?: "midnight" | "cyberpunk" | "monochrome" | "light";
  onSkip?: () => void;
}

export function WorkspaceLoadingSkeleton({ theme = "midnight", onSkip }: WorkspaceLoadingSkeletonProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [showSkipFallback, setShowSkipFallback] = useState(false);

  const steps = [
    "Authenticating session credentials...",
    "Synchronizing model architectures & capabilities...",
    "Configuring dynamic routing & fallbacks...",
    "Readying workspace environment..."
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => setActiveStep(1), 350);
    const timer2 = setTimeout(() => setActiveStep(2), 750);
    const timer3 = setTimeout(() => setActiveStep(3), 1200);

    // Fallback in case network delays exceed 6 seconds
    const fallbackTimer = setTimeout(() => {
      setShowSkipFallback(true);
    }, 6000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const isLight = theme === "light";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[999] flex flex-col overflow-hidden select-none transition-colors duration-500",
        isLight
          ? "bg-slate-50 text-slate-900"
          : theme === "cyberpunk"
          ? "bg-[#050505] text-[#00ffcc]"
          : theme === "monochrome"
          ? "bg-[#111111] text-zinc-300"
          : "bg-[#090a0f] text-zinc-200"
      )}
    >
      {/* Subtle Shimmer Animation Keyframe Style */}
      <style>{`
        @keyframes shimmerPulse {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-shimmer {
          position: relative;
          overflow: hidden;
        }
        .animate-shimmer::after {
          position: absolute;
          top: 0; right: 0; bottom: 0; left: 0;
          transform: translateX(-100%);
          background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0,
            rgba(255, 255, 255, 0.06) 20%,
            rgba(255, 255, 255, 0.15) 60%,
            rgba(255, 255, 255, 0)
          );
          animation: shimmerPulse 1.8s infinite;
          content: '';
        }
        .animate-shimmer-light::after {
          position: absolute;
          top: 0; right: 0; bottom: 0; left: 0;
          transform: translateX(-100%);
          background-image: linear-gradient(
            90deg,
            rgba(0, 0, 0, 0) 0,
            rgba(0, 0, 0, 0.04) 20%,
            rgba(0, 0, 0, 0.08) 60%,
            rgba(0, 0, 0, 0)
          );
          animation: shimmerPulse 1.8s infinite;
          content: '';
        }
      `}</style>

      {/* Top Banner / Status Indicator */}
      <div
        className={cn(
          "w-full h-14 border-b flex items-center justify-between px-6 shrink-0 backdrop-blur-md",
          isLight
            ? "border-slate-200 bg-white/70"
            : "border-zinc-800/80 bg-zinc-950/60"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-cyan-400 flex items-center gap-1.5">
              DevGenie <span className="text-[10px] text-zinc-500 font-normal">Workspace</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              {steps[activeStep] || "Loading neural configurations..."}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400/80">
              Fetching Models
            </span>
          </div>
          {showSkipFallback && onSkip && (
            <button
              onClick={onSkip}
              className="text-[10px] font-mono px-3 py-1 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 transition-colors"
            >
              Enter Workspace &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Skeleton Simulation */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Skeleton */}
        <div
          className={cn(
            "w-64 border-r hidden md:flex flex-col p-4 gap-4 shrink-0",
            isLight
              ? "border-slate-200 bg-slate-100/50"
              : "border-zinc-800/70 bg-zinc-950/40"
          )}
        >
          {/* New chat button skeleton */}
          <div
            className={cn(
              "h-10 rounded-xl w-full",
              isLight ? "bg-slate-200 animate-shimmer-light" : "bg-zinc-800/60 animate-shimmer"
            )}
          />

          {/* Search bar skeleton */}
          <div
            className={cn(
              "h-8 rounded-lg w-full",
              isLight ? "bg-slate-200/70 animate-shimmer-light" : "bg-zinc-850/40 animate-shimmer"
            )}
          />

          {/* Section title */}
          <div
            className={cn(
              "h-3 w-20 rounded",
              isLight ? "bg-slate-200" : "bg-zinc-800/50"
            )}
          />

          {/* Session history items skeleton */}
          <div className="flex flex-col gap-2.5 flex-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-9 rounded-xl p-2.5 flex items-center gap-2",
                  isLight ? "bg-slate-200/50 animate-shimmer-light" : "bg-zinc-900/60 animate-shimmer"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-md shrink-0",
                    isLight ? "bg-slate-300" : "bg-zinc-800"
                  )}
                />
                <div
                  className={cn(
                    "h-2.5 rounded-full flex-1",
                    isLight ? "bg-slate-300" : "bg-zinc-800"
                  )}
                  style={{ width: `${60 + (i * 7) % 35}%` }}
                />
              </div>
            ))}
          </div>

          {/* User profile / footer skeleton */}
          <div
            className={cn(
              "h-12 rounded-xl p-2 flex items-center gap-3 border",
              isLight
                ? "bg-white border-slate-200/60"
                : "bg-zinc-900/40 border-zinc-800/60"
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full shrink-0",
                isLight ? "bg-slate-200 animate-shimmer-light" : "bg-zinc-800 animate-shimmer"
              )}
            />
            <div className="flex flex-col gap-1.5 flex-1">
              <div
                className={cn(
                  "h-3 w-24 rounded",
                  isLight ? "bg-slate-200" : "bg-zinc-800"
                )}
              />
              <div
                className={cn(
                  "h-2 w-16 rounded",
                  isLight ? "bg-slate-200/60" : "bg-zinc-800/60"
                )}
              />
            </div>
          </div>
        </div>

        {/* Center Workspace Skeleton */}
        <div className="flex-1 flex flex-col justify-between p-6 overflow-hidden relative">
          {/* Header Skeleton Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800/40">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-8 w-28 rounded-xl",
                  isLight ? "bg-slate-200 animate-shimmer-light" : "bg-zinc-800/60 animate-shimmer"
                )}
              />
              <div
                className={cn(
                  "h-8 w-32 rounded-xl border border-cyan-500/20",
                  isLight ? "bg-cyan-50" : "bg-cyan-950/20"
                )}
              />
            </div>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-8 w-8 rounded-xl",
                  isLight ? "bg-slate-200" : "bg-zinc-850"
                )}
              />
              <div
                className={cn(
                  "h-8 w-8 rounded-xl",
                  isLight ? "bg-slate-200" : "bg-zinc-850"
                )}
              />
            </div>
          </div>

          {/* Central Animated Loading Banner */}
          <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto text-center gap-6 py-12">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_35px_rgba(6,182,212,0.2)]">
                <Sparkles className="w-8 h-8 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-cyan-500/20 blur-xl -z-10 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-mono font-bold tracking-tight text-white flex items-center justify-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                Initializing Neural Infrastructure
              </h2>
              <p className="text-xs text-zinc-400 font-mono max-w-md">
                Querying multi-provider model endpoints, pricing schemas, and context token windows. Loading state before entrance...
              </p>
            </div>

            {/* Progress Bar & Indicators */}
            <div className="w-64 space-y-2">
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, (activeStep + 1) * 25)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                <span>STAGE {activeStep + 1}/4</span>
                <span className="text-cyan-400 font-semibold">{Math.min(100, (activeStep + 1) * 25)}%</span>
              </div>
            </div>

            {/* Shimmering Model Cards Preview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full mt-4">
              {[
                { name: "Gemini 3.8 Flash", provider: "Google" },
                { name: "Claude 3.7 Sonnet", provider: "Anthropic" },
                { name: "GPT-4o Omnimodal", provider: "OpenAI" }
              ].map((m, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-3 rounded-xl border text-left flex flex-col gap-1.5 transition-all",
                    isLight
                      ? "bg-white border-slate-200 shadow-sm"
                      : "bg-zinc-900/40 border-zinc-800/80"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-zinc-300 truncate">
                      {m.name}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  </div>
                  <span className="text-[8px] font-mono uppercase tracking-wider text-zinc-500">
                    {m.provider}
                  </span>
                  <div
                    className={cn(
                      "h-1.5 w-full rounded mt-1",
                      isLight ? "bg-slate-200 animate-shimmer-light" : "bg-zinc-800 animate-shimmer"
                    )}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Prompt Input Dock Skeleton */}
          <div className="w-full max-w-3xl mx-auto pt-4">
            <div
              className={cn(
                "h-20 rounded-2xl border p-4 flex flex-col justify-between",
                isLight
                  ? "bg-white border-slate-200 animate-shimmer-light"
                  : "bg-zinc-900/40 border-zinc-850 animate-shimmer"
              )}
            >
              <div
                className={cn(
                  "h-3 w-48 rounded",
                  isLight ? "bg-slate-200" : "bg-zinc-800"
                )}
              />
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <div
                    className={cn(
                      "h-6 w-16 rounded-lg",
                      isLight ? "bg-slate-200" : "bg-zinc-800"
                    )}
                  />
                  <div
                    className={cn(
                      "h-6 w-16 rounded-lg",
                      isLight ? "bg-slate-200" : "bg-zinc-800"
                    )}
                  />
                </div>
                <div
                  className={cn(
                    "h-8 w-8 rounded-xl",
                    isLight ? "bg-slate-300" : "bg-zinc-700"
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
