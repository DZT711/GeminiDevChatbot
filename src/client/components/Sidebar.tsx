import { MessageSquare, Sparkles, Database, ChevronDown, Key, Activity, Terminal, Pin, History } from "lucide-react";
import React from 'react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

export function Sidebar(props: any) {
  const {
    theme, isSidebarCollapsed, createNewSession, setView, view, user,
    apiKeys, activeKeyId, modelQueueManager, currentModel, modelCatalog,
    sessions, renderSessionItem, showHistory, setShowHistory
  } = props;

  return (
    <>
      {/* Sidebar - Context & Skills Navigation */}
      <aside
        className={cn(
          "border-r flex flex-col shrink-0 transition-all duration-300 relative",
          theme === "midnight" && "bg-[#08080a] border-white/5",
          theme === "cyberpunk" && "bg-[#050505] border-[#00ffcc]/20",
          theme === "monochrome" && "bg-white border-black/10",
          theme === "light" && "bg-white border-slate-200",
          isSidebarCollapsed
            ? "w-0 opacity-0 pointer-events-none"
            : "w-64 opacity-100",
        )}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8 group">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={createNewSession}
            >
              <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:scale-110 transition-transform">
                GG
              </div>
              <h1
                className={cn(
                  "text-sm font-semibold uppercase tracking-widest transition-colors",
                  theme === "light"
                    ? "text-slate-400 group-hover:text-slate-900"
                    : "text-zinc-500 group-hover:text-white",
                )}
              >
                DevGenie AI
              </h1>
            </div>
          </div>

          <div className="space-y-8">
            <nav className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 px-2">Core Tools</div>
              <button
                onClick={() => setView("chat")}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-xl text-xs transition-all font-medium border border-transparent group",
                  view === "chat"
                    ? theme === "light"
                      ? "bg-white text-cyan-600 shadow-sm border-cyan-100"
                      : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                    : theme === "light"
                      ? "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 hover:border-zinc-700/50",
                )}
              >
                <MessageSquare size={16} className={cn("transition-transform group-hover:scale-110", view === "chat" ? "opacity-100 scale-110" : "opacity-60")} />
                <span className="flex-1 text-left tracking-wide">Terminals</span>
                {view === "chat" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                )}
              </button>
              
              <button
                onClick={() => setView("skills")}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-xl text-xs transition-all font-medium border border-transparent group",
                  view === "skills"
                    ? theme === "light"
                      ? "bg-white text-purple-600 shadow-sm border-purple-100"
                      : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    : theme === "light"
                      ? "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 hover:border-zinc-700/50",
                )}
              >
                <Sparkles size={16} className={cn("transition-transform group-hover:scale-110", view === "skills" ? "opacity-100 scale-110" : "opacity-60")} />
                <span className="flex-1 text-left tracking-wide">Skills Lab</span>
                {view === "skills" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                )}
              </button>

              <button
                onClick={() => setView("knowledge")}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-xl text-xs transition-all font-medium border border-transparent group",
                  view === "knowledge"
                    ? theme === "light"
                      ? "bg-white text-blue-600 shadow-sm border-blue-100"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    : theme === "light"
                      ? "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 hover:border-zinc-700/50",
                )}
              >
                <Database size={16} className={cn("transition-transform group-hover:scale-110", view === "knowledge" ? "opacity-100 scale-110" : "opacity-60")} />
                <span className="flex-1 text-left tracking-wide">Knowledge Index</span>
                {view === "knowledge" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                )}
              </button>
              
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-xl text-xs transition-all font-medium border border-transparent group",
                  showHistory
                    ? theme === "light"
                      ? "bg-slate-100 text-slate-900 border-slate-200"
                      : "bg-zinc-800 text-white border-zinc-700"
                    : theme === "light"
                      ? "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 hover:border-zinc-700/50",
                )}
              >
                <History size={16} className={cn("transition-transform group-hover:scale-110", showHistory ? "opacity-100 scale-110" : "opacity-60")} />
                <span className="flex-1 text-left tracking-wide">History Archive</span>
                <ChevronDown size={14} className={cn("transition-transform", showHistory ? "rotate-180 opacity-100" : "opacity-40")} />
              </button>
            </nav>

            <nav className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 px-2">System</div>
              <button
                onClick={() => setView("keys")}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-xl text-xs transition-all font-medium border border-transparent group",
                  view === "keys"
                    ? theme === "light"
                      ? "bg-white text-emerald-600 shadow-sm border-emerald-100"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : theme === "light"
                      ? "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 hover:border-zinc-700/50",
                )}
              >
                <Key size={16} className={cn("transition-transform group-hover:scale-110", view === "keys" ? "opacity-100 scale-110" : "opacity-60")} />
                <span className="flex-1 text-left tracking-wide">Manage API Keys</span>
                {view === "keys" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                )}
              </button>

              <button
                onClick={() => setView("models")}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-xl text-xs transition-all font-medium border border-transparent group",
                  view === "models"
                    ? theme === "light"
                      ? "bg-white text-amber-600 shadow-sm border-amber-100"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : theme === "light"
                      ? "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 hover:border-zinc-700/50",
                )}
              >
                <Database size={16} className={cn("transition-transform group-hover:scale-110", view === "models" ? "opacity-100 scale-110" : "opacity-60")} />
                <span className="flex-1 text-left tracking-wide">Model Catalog</span>
                {view === "models" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                )}
              </button>

              <button
                onClick={() => setView("performance")}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-xl text-xs transition-all font-medium border border-transparent group",
                  view === "performance"
                    ? theme === "light"
                      ? "bg-white text-green-600 shadow-sm border-green-100"
                      : "bg-green-500/10 text-green-400 border-green-500/20"
                    : theme === "light"
                      ? "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 hover:border-zinc-700/50",
                )}
              >
                <Activity size={16} className={cn("transition-transform group-hover:scale-110", view === "performance" ? "opacity-100 scale-110" : "opacity-60")} />
                <span className="flex-1 text-left tracking-wide">Performance</span>
                {view === "performance" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                )}
              </button>
            </nav>

            {user?.role === "ADMIN" && (
              <nav className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-red-500/60 mb-2 px-2">Access Control</div>
                <button
                  onClick={() => setView("admin-debug")}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-xl text-xs transition-all font-medium border group",
                    view === "admin-debug"
                      ? "bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                      : theme === "light"
                        ? "text-red-500 hover:text-red-600 hover:bg-red-50 border-transparent"
                        : "text-red-500/80 hover:text-red-400 hover:bg-red-500/10 border-transparent hover:border-red-500/20",
                  )}
                >
                  <Terminal size={16} className={cn("transition-transform group-hover:scale-110", view === "admin-debug" ? "animate-pulse opacity-100 scale-110" : "opacity-80")} />
                  <span className="flex-1 text-left tracking-wide">Admin Console</span>
                  {view === "admin-debug" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  )}
                </button>
              </nav>
            )}
          </div>

          {/* History Bubble (Inline or Overlay) */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-1 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3 px-2">
                  <h2 className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold">
                    Recent Pulses
                  </h2>
                </div>
                <div className="space-y-1 max-h-[30vh] overflow-y-auto custom-scrollbar pr-2">
                  {(() => {
                    const pinnedSessions = sessions.filter((s) => s.pinned);
                    const unpinnedSessions = sessions.filter((s) => !s.pinned);

                    return (
                      <>
                        {sessions.length === 0 && (
                          <div className="text-[10px] text-zinc-700 italic px-2">
                            No archived streams...
                          </div>
                        )}

                        {pinnedSessions.length > 0 && (
                          <div className="mb-4">
                            <h3 className="text-[9px] uppercase tracking-wider text-emerald-600/70 font-bold px-2 flex items-center gap-1 mb-1">
                              <Pin size={8} /> Pinned
                            </h3>
                            <div className="space-y-1">
                              {pinnedSessions.map((s) => renderSessionItem(s))}
                            </div>
                          </div>
                        )}

                        {unpinnedSessions.length > 0 && (
                          <div>
                            {pinnedSessions.length > 0 && (
                              <h3 className="text-[9px] uppercase tracking-wider text-zinc-600 font-bold px-2 mb-1">
                                Recent
                              </h3>
                            )}
                            <div className="space-y-1">
                              {unpinnedSessions.map((s) =>
                                renderSessionItem(s),
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-auto p-4 border-t border-border-dim bg-[#0a0a0c] space-y-4">
          <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2 mb-4">
            <div className="flex items-center justify-between mb-2 sticky top-0 bg-[#0a0a0c] z-10 py-1">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Neural Sync [{modelCatalog.length}]
                </span>
              </div>
              <span className="text-[9px] font-mono text-zinc-700 uppercase">
                {activeKeyId ? "Custom_Link" : "System_Node"}
              </span>
            </div>

            {(() => {
              const activeModelsForSidebar = activeKeyId
                ? apiKeys.find((k) => k.id === activeKeyId)?.models || []
                : modelQueueManager.getQueue();
              return activeModelsForSidebar.map((model) => {
                const baseModelId = model.split("/").pop() || "";
                const catalogInfo = modelCatalog.find(
                  (mc) =>
                    mc.id === model ||
                    (baseModelId && mc.id.endsWith("/" + baseModelId)),
                );
                return (
                  <div key={model} className="space-y-1.5 group">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-mono text-zinc-500 group-hover:text-cyan-400/80 transition-colors uppercase tracking-tighter truncate max-w-[140px]">
                          {baseModelId
                            .replace("gemini-1.5-", "")
                            .replace("gemini-3.1-", "")}
                        </span>
                      </div>
                      {catalogInfo?.contextLength && (
                        <span className="text-[8px] font-mono font-bold text-emerald-500/80 uppercase">
                          {(Number(catalogInfo.contextLength) / 1000).toFixed(
                            0,
                          )}
                          k
                        </span>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          <div className="pt-2 border-t border-border-dim/30">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] font-mono text-zinc-600 tracking-tighter uppercase font-bold">
                Node Integrity
              </span>
              <span className="text-[8px] font-mono text-green-500 uppercase tracking-widest">
                Optimized
              </span>
            </div>
            <div className="w-full bg-zinc-950 h-0.5 rounded-full overflow-hidden">
              <div className="bg-green-500/40 h-full w-[85%] animate-pulse" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
