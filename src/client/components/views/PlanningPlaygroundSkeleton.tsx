import React from "react";
import { cn } from "@/lib/utils";

interface PlanningPlaygroundSkeletonProps {
  theme?: string;
}

export function PlanningPlaygroundSkeleton({ theme = "midnight" }: PlanningPlaygroundSkeletonProps): React.JSX.Element {
  const isLight = theme === "light";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent animate-in fade-in duration-300">
      {/* Top Header Skeleton */}
      <header
        className={cn(
          "px-6 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0",
          isLight ? "bg-white border-slate-200" : "bg-[#08080a] border-white/5"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-9 h-9 rounded-xl skeleton-shimmer",
              isLight ? "bg-indigo-100" : "bg-indigo-950/50"
            )}
          />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-4 w-36 rounded skeleton-shimmer",
                  isLight ? "bg-slate-200" : "bg-zinc-800"
                )}
              />
              <div
                className={cn(
                  "h-4 w-24 rounded-full skeleton-shimmer",
                  isLight ? "bg-indigo-50" : "bg-indigo-900/30"
                )}
              />
            </div>
            <div
              className={cn(
                "h-3 w-64 rounded skeleton-shimmer",
                isLight ? "bg-slate-100" : "bg-zinc-900"
              )}
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "h-8 w-48 rounded-lg skeleton-shimmer",
              isLight ? "bg-slate-100" : "bg-zinc-900"
            )}
          />
          <div
            className={cn(
              "h-8 w-24 rounded-lg skeleton-shimmer",
              isLight ? "bg-indigo-100" : "bg-indigo-900/30"
            )}
          />
        </div>
      </header>

      {/* Fixtures Toolbar Skeleton */}
      <div
        className={cn(
          "px-6 py-2.5 border-b flex items-center justify-between gap-3 shrink-0",
          isLight ? "bg-slate-50 border-slate-200" : "bg-zinc-950/70 border-white/5"
        )}
      >
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-0.5">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className={cn(
                "h-7 w-28 rounded-lg skeleton-shimmer shrink-0",
                isLight ? "bg-white border border-slate-200" : "bg-zinc-900/80 border border-zinc-800"
              )}
            />
          ))}
        </div>
        <div
          className={cn(
            "h-7 w-24 rounded-lg skeleton-shimmer shrink-0",
            isLight ? "bg-slate-200" : "bg-zinc-800"
          )}
        />
      </div>

      {/* Main Body Skeleton */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* Progress Bar Skeleton */}
        <div
          className={cn(
            "p-4 rounded-xl border space-y-3",
            isLight ? "bg-white border-slate-200" : "bg-zinc-900/40 border-zinc-800/60"
          )}
        >
          <div className="flex justify-between items-center">
            <div
              className={cn(
                "h-3.5 w-32 rounded skeleton-shimmer",
                isLight ? "bg-slate-200" : "bg-zinc-800"
              )}
            />
            <div
              className={cn(
                "h-3.5 w-16 rounded skeleton-shimmer",
                isLight ? "bg-slate-100" : "bg-zinc-900"
              )}
            />
          </div>
          <div
            className={cn(
              "h-2 w-full rounded-full skeleton-shimmer",
              isLight ? "bg-slate-100" : "bg-zinc-800/80"
            )}
          />
        </div>

        {/* Tab Navigation Skeleton */}
        <div className="flex items-center gap-2 border-b border-border-dim pb-3">
          {[1, 2, 3, 4, 5].map((tabIdx) => (
            <div
              key={tabIdx}
              className={cn(
                "h-8 w-24 rounded-lg skeleton-shimmer",
                isLight ? "bg-slate-200" : "bg-zinc-800"
              )}
            />
          ))}
        </div>

        {/* 3 Step Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((stepIdx) => (
            <div
              key={stepIdx}
              className={cn(
                "p-4 rounded-xl border flex flex-col gap-3 shadow-xs",
                isLight ? "bg-white border-slate-200" : "bg-zinc-900/40 border-zinc-800/70"
              )}
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "h-4 w-12 rounded-full skeleton-shimmer",
                    isLight ? "bg-indigo-100" : "bg-indigo-950/50"
                  )}
                />
                <div
                  className={cn(
                    "h-3 w-16 rounded skeleton-shimmer",
                    isLight ? "bg-slate-100" : "bg-zinc-900"
                  )}
                />
              </div>

              <div
                className={cn(
                  "h-4 w-36 rounded skeleton-shimmer",
                  isLight ? "bg-slate-200" : "bg-zinc-800"
                )}
              />

              <div className="space-y-1.5 pt-2">
                <div
                  className={cn(
                    "h-3 w-full rounded skeleton-shimmer",
                    isLight ? "bg-slate-100" : "bg-zinc-900/80"
                  )}
                />
                <div
                  className={cn(
                    "h-3 w-4/5 rounded skeleton-shimmer",
                    isLight ? "bg-slate-100" : "bg-zinc-900/80"
                  )}
                />
              </div>

              <div
                className={cn(
                  "mt-auto h-7 w-full rounded-lg skeleton-shimmer",
                  isLight ? "bg-slate-50 border border-slate-200" : "bg-black/40 border border-zinc-800"
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
