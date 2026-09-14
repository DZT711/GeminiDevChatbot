import React from "react";
import { cn } from "@/lib/utils";

interface KnowledgeSkeletonProps {
  theme?: string;
}

export function KnowledgeSkeleton({ theme = "midnight" }: KnowledgeSkeletonProps): React.JSX.Element {
  const isLight = theme === "light";

  return (
    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-300">
        {/* Header Skeleton */}
        <header className="flex justify-between items-end border-b border-border-dim pb-8">
          <div className="space-y-3">
            <div
              className={cn(
                "h-9 w-64 rounded-lg skeleton-shimmer",
                isLight ? "bg-slate-200" : "bg-zinc-800/80"
              )}
            />
            <div
              className={cn(
                "h-4 w-80 rounded skeleton-shimmer",
                isLight ? "bg-slate-100" : "bg-zinc-900"
              )}
            />
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-4 w-28 rounded skeleton-shimmer",
                isLight ? "bg-slate-100" : "bg-zinc-900"
              )}
            />
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500/40 animate-ping" />
          </div>
        </header>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-24">
          {/* Left Column: Vector Tester & Proposals Skeleton */}
          <div className="lg:col-span-7 space-y-8">
            {/* Search Vector Tester Skeleton */}
            <div
              className={cn(
                "p-6 rounded-2xl border space-y-4 shadow-sm",
                isLight ? "bg-slate-50 border-slate-200" : "bg-zinc-950/40 border-zinc-900"
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-4 h-4 rounded skeleton-shimmer",
                    isLight ? "bg-slate-200" : "bg-zinc-800"
                  )}
                />
                <div
                  className={cn(
                    "h-4 w-48 rounded skeleton-shimmer",
                    isLight ? "bg-slate-200" : "bg-zinc-800"
                  )}
                />
              </div>
              <div className="flex gap-2">
                <div
                  className={cn(
                    "flex-1 h-11 rounded-xl skeleton-shimmer",
                    isLight ? "bg-white border border-slate-200" : "bg-zinc-900/60 border border-zinc-800"
                  )}
                />
                <div
                  className={cn(
                    "w-28 h-11 rounded-xl skeleton-shimmer",
                    isLight ? "bg-blue-100" : "bg-blue-900/30"
                  )}
                />
              </div>
            </div>

            {/* Model Proposals Section Skeleton */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-border-dim pb-3">
                <div className="space-y-1.5">
                  <div
                    className={cn(
                      "h-4 w-44 rounded skeleton-shimmer",
                      isLight ? "bg-slate-200" : "bg-zinc-800"
                    )}
                  />
                  <div
                    className={cn(
                      "h-3 w-56 rounded skeleton-shimmer",
                      isLight ? "bg-slate-100" : "bg-zinc-900"
                    )}
                  />
                </div>
                {/* Filter Pills Skeleton */}
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-6 w-14 rounded-full skeleton-shimmer",
                        isLight ? "bg-slate-200" : "bg-zinc-800/80"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* 3 Proposal Card Skeletons */}
              <div className="space-y-4">
                {[1, 2, 3].map((cardId) => (
                  <div
                    key={cardId}
                    className={cn(
                      "p-5 rounded-2xl border flex flex-col gap-4 shadow-sm",
                      isLight ? "bg-white border-slate-200" : "bg-[#0c0c0e] border-zinc-900"
                    )}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "h-5 w-16 rounded-full skeleton-shimmer",
                            isLight ? "bg-slate-200" : "bg-zinc-800"
                          )}
                        />
                        <div
                          className={cn(
                            "h-4 w-24 rounded skeleton-shimmer",
                            isLight ? "bg-slate-100" : "bg-zinc-900"
                          )}
                        />
                      </div>
                      <div
                        className={cn(
                          "h-5 w-20 rounded-full skeleton-shimmer",
                          isLight ? "bg-slate-200" : "bg-zinc-800"
                        )}
                      />
                    </div>

                    {/* Content preview shimmer */}
                    <div className="space-y-2">
                      <div
                        className={cn(
                          "h-3.5 w-full rounded skeleton-shimmer",
                          isLight ? "bg-slate-100" : "bg-zinc-900/90"
                        )}
                      />
                      <div
                        className={cn(
                          "h-3.5 w-4/5 rounded skeleton-shimmer",
                          isLight ? "bg-slate-100" : "bg-zinc-900/90"
                        )}
                      />
                      <div
                        className={cn(
                          "h-3.5 w-2/3 rounded skeleton-shimmer",
                          isLight ? "bg-slate-100" : "bg-zinc-900/90"
                        )}
                      />
                    </div>

                    {/* Action buttons placeholder */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-border-dim/50">
                      <div
                        className={cn(
                          "h-8 w-16 rounded-lg skeleton-shimmer",
                          isLight ? "bg-slate-100" : "bg-zinc-900"
                        )}
                      />
                      <div
                        className={cn(
                          "h-8 w-28 rounded-lg skeleton-shimmer",
                          isLight ? "bg-blue-100" : "bg-blue-900/20"
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Indexed Nodes Skeleton */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex justify-between items-center border-b border-border-dim pb-2">
              <div
                className={cn(
                  "h-4 w-40 rounded skeleton-shimmer",
                  isLight ? "bg-slate-200" : "bg-zinc-800"
                )}
              />
              <div
                className={cn(
                  "h-5 w-16 rounded-full skeleton-shimmer",
                  isLight ? "bg-cyan-100" : "bg-cyan-950/40"
                )}
              />
            </div>

            {/* 4 Node Card Skeletons */}
            <div className="space-y-4">
              {[1, 2, 3, 4].map((nodeId) => (
                <div
                  key={nodeId}
                  className={cn(
                    "p-5 rounded-2xl border flex flex-col gap-3 shadow-sm",
                    isLight ? "bg-white border-slate-200" : "bg-[#0c0c0e] border-zinc-900"
                  )}
                >
                  <div className="flex justify-between items-center gap-2">
                    <div
                      className={cn(
                        "h-4 w-20 rounded-md skeleton-shimmer",
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
                  <div className="space-y-2">
                    <div
                      className={cn(
                        "h-3.5 w-full rounded skeleton-shimmer",
                        isLight ? "bg-slate-100" : "bg-zinc-900/80"
                      )}
                    />
                    <div
                      className={cn(
                        "h-3.5 w-5/6 rounded skeleton-shimmer",
                        isLight ? "bg-slate-100" : "bg-zinc-900/80"
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
