import React from "react";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

interface ModelsSkeletonProps {
  theme?: string;
}

export function ModelsSkeleton({ theme = "midnight" }: ModelsSkeletonProps): React.JSX.Element {
  const isLight = theme === "light";

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-12 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
        {/* Header Skeleton */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-border-dim pb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-10 w-64 rounded-xl skeleton-shimmer",
                  isLight ? "bg-slate-200" : "bg-zinc-800/80"
                )}
              />
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-[10px] font-mono text-cyan-400">
                <RefreshCw size={11} className="animate-spin text-cyan-400" />
                <span>SYNCING NEURAL CATALOG...</span>
              </div>
            </div>
            <div
              className={cn(
                "h-4 w-72 rounded skeleton-shimmer",
                isLight ? "bg-slate-100" : "bg-zinc-900"
              )}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 min-w-[320px]">
            <div
              className={cn(
                "flex-1 h-10 rounded-xl skeleton-shimmer",
                isLight ? "bg-slate-200" : "bg-zinc-900"
              )}
            />
            <div
              className={cn(
                "w-36 h-10 rounded-xl skeleton-shimmer",
                isLight ? "bg-slate-200" : "bg-zinc-900"
              )}
            />
          </div>
        </header>

        {/* Stats Pill Bar Skeleton */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className={cn(
                "h-8 w-28 rounded-full skeleton-shimmer shrink-0",
                isLight ? "bg-slate-200" : "bg-zinc-900/80 border border-zinc-800"
              )}
            />
          ))}
        </div>

        {/* Models Grid Skeleton (6 Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={cn(
                "p-6 rounded-2xl border relative overflow-hidden flex flex-col gap-4 shadow-sm",
                isLight
                  ? "bg-white border-slate-200"
                  : "bg-black/40 border-zinc-800/80"
              )}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500/50 animate-pulse" />
                    <div
                      className={cn(
                        "h-5 w-48 rounded-md skeleton-shimmer",
                        isLight ? "bg-slate-200" : "bg-zinc-800"
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-4 w-20 rounded skeleton-shimmer",
                        isLight ? "bg-slate-100" : "bg-zinc-900"
                      )}
                    />
                    <div
                      className={cn(
                        "h-4 w-16 rounded skeleton-shimmer",
                        isLight ? "bg-slate-100" : "bg-zinc-900/60"
                      )}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-1">
                    <div
                      className={cn(
                        "h-4 w-16 rounded skeleton-shimmer",
                        isLight ? "bg-slate-200" : "bg-zinc-800"
                      )}
                    />
                    <div
                      className={cn(
                        "h-2 w-12 rounded skeleton-shimmer",
                        isLight ? "bg-slate-100" : "bg-zinc-900"
                      )}
                    />
                  </div>
                  <div
                    className={cn(
                      "w-8 h-4 rounded-full skeleton-shimmer",
                      isLight ? "bg-slate-300" : "bg-zinc-800"
                    )}
                  />
                </div>
              </div>

              {/* Integrated Metrics Strip Skeleton */}
              <div
                className={cn(
                  "h-12 rounded-xl skeleton-shimmer",
                  isLight
                    ? "bg-slate-100/90 border border-slate-200"
                    : "bg-zinc-900/50 border border-zinc-800/80"
                )}
              />

              {/* Best For Tag Skeleton */}
              <div
                className={cn(
                  "h-7 w-4/5 rounded-lg skeleton-shimmer",
                  isLight ? "bg-slate-100" : "bg-zinc-900/70"
                )}
              />

              {/* Description Skeleton */}
              <div className="space-y-1.5 pt-1">
                <div
                  className={cn(
                    "h-3 w-full rounded skeleton-shimmer",
                    isLight ? "bg-slate-100" : "bg-zinc-900/80"
                  )}
                />
                <div
                  className={cn(
                    "h-3 w-5/6 rounded skeleton-shimmer",
                    isLight ? "bg-slate-100" : "bg-zinc-900/70"
                  )}
                />
              </div>

              {/* Pricing & Details Action Footer Skeleton */}
              <div
                className={cn(
                  "mt-auto pt-4 border-t flex items-center justify-between",
                  isLight ? "border-slate-100" : "border-white/5"
                )}
              >
                <div className="flex gap-4">
                  <div
                    className={cn(
                      "h-5 w-20 rounded skeleton-shimmer",
                      isLight ? "bg-slate-100" : "bg-zinc-900"
                    )}
                  />
                  <div
                    className={cn(
                      "h-5 w-20 rounded skeleton-shimmer",
                      isLight ? "bg-slate-100" : "bg-zinc-900"
                    )}
                  />
                </div>
                <div
                  className={cn(
                    "h-7 w-24 rounded-lg skeleton-shimmer",
                    isLight ? "bg-slate-200" : "bg-zinc-800"
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
