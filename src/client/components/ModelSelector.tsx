import React from "react";
import { Cpu, Search, Check, Sparkles, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export function ModelSelector({
  isModelSelectorOpen,
  setIsModelSelectorOpen,
  currentModel,
  setCurrentModel,
  ModelId,
  modelSearch,
  setModelSearch,
  modelCatalog,
  apiKeys,
  activeKeyId,
  globalEnabledModels,
  modelQueueManager,
  theme
}: any) {
  return (
    <div className="relative">
      <button
        id="model-selector-container"
        onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
        className={cn(
          "flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-[#0a0a0c] border rounded-xl text-[10px] font-mono transition-all active:scale-95 shadow-inner",
          isModelSelectorOpen
            ? "border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
            : "border-zinc-800 hover:border-zinc-700",
        )}
      >
        <Cpu
          size={12}
          className={cn(
            "shrink-0 transition-colors",
            isModelSelectorOpen ? "text-cyan-400" : "text-cyan-600",
          )}
        />
        <span className="text-zinc-300 font-bold uppercase tracking-tight hidden xs:inline">
          {currentModel === ModelId.HYBRID
            ? "HYBRID AUTO"
            : [ModelId.PRO, ModelId.FLASH, ModelId.FLASH_3_5, ModelId.LITE].includes(
                  currentModel as any,
                )
              ? currentModel === ModelId.PRO
                ? "PRO"
                : currentModel === ModelId.FLASH_3_5
                  ? "FLASH 3.5"
                  : currentModel === ModelId.FLASH
                    ? "FLASH"
                    : "LITE"
              : (currentModel || "")
                  .split("/")
                  .pop()
                  ?.replace("gemini-", "")
                  .toUpperCase() || "UNKNOWN"}
        </span>
        <ChevronDown
          size={10}
          className={cn(
            "text-zinc-600 transition-transform duration-300",
            isModelSelectorOpen && "rotate-180 text-cyan-400",
          )}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isModelSelectorOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setIsModelSelectorOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full right-0 mt-3 w-48 sm:w-64 bg-[#0d0d0f] border border-zinc-800 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] z-50 overflow-hidden"
            >
              <div className="p-3 border-b border-zinc-800 bg-zinc-900/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                    Neural Compute Unit
                  </span>
                  <button
                    onClick={() => setIsModelSelectorOpen(false)}
                    className="text-zinc-700 hover:text-zinc-400"
                  >
                    <X size={10} />
                  </button>
                </div>
                <div className="relative">
                  <Search
                    size={10}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600"
                  />
                  <input
                    type="text"
                    placeholder="Filter neural nodes..."
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="w-full bg-black/40 border border-zinc-800 rounded-lg pl-7 pr-3 py-1.5 text-[9px] font-mono outline-none focus:border-cyan-500/30 transition-all text-zinc-300"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {[
                  ...modelCatalog.filter(
                    (m: any) =>
                      modelSearch === "" ||
                      m.name
                        .toLowerCase()
                        .includes(modelSearch.toLowerCase()) ||
                      m.id
                        .toLowerCase()
                        .includes(modelSearch.toLowerCase()),
                  ),
                ].map((modelInfo: any) => {
                  const activeKey = apiKeys.find(
                    (k: any) => k.id === activeKeyId,
                  );
                  const isAvailable = activeKey
                    ? activeKey.models?.includes(modelInfo.id) ||
                      globalEnabledModels.includes(modelInfo.id) ||
                      modelInfo.provider === activeKey.provider ||
                      activeKey.provider === 'openrouter' ||
                      activeKey.provider === 'custom'
                    : globalEnabledModels.includes(modelInfo.id);

                  if (!isAvailable) return null;

                  return (
                    <button
                      key={modelInfo.id}
                      onClick={() => {
                        setCurrentModel(modelInfo.id);
                        modelQueueManager.promoteToCurrent(
                          modelInfo.id,
                        );
                        setIsModelSelectorOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-xl text-[11px] font-mono transition-all flex items-center justify-between group",
                        currentModel === modelInfo.id
                          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent",
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold flex items-center gap-1.5">
                          {modelInfo.name}
                          {currentModel === modelInfo.id && (
                            <Sparkles
                              size={10}
                              className="text-cyan-500 animate-pulse"
                            />
                          )}
                        </span>
                        <span className="text-[9px] text-zinc-600 truncate max-w-[150px]">
                          {modelInfo.id}
                        </span>
                      </div>
                      {currentModel === modelInfo.id && (
                        <Check size={14} className="text-cyan-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
