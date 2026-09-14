import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Cpu,
  Search,
  Check,
  Sparkles,
  X,
  ChevronDown,
  Activity,
  Globe,
  Database,
  Terminal,
  RefreshCw,
  Zap,
  Layers,
  Wrench,
  Target,
  Info,
  DollarSign,
  Maximize2,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  ArrowRight,
  Filter,
  ExternalLink,
} from 'lucide-react';

import { modelQueueManager } from '@/services/modelQueueManager';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { ModelsSkeleton } from "./ModelsSkeleton";
import { ModelDetailModal } from "./ModelDetailModal";
import { extractModelSpecs, getToolCallingStatus } from "./modelUtils";

export function ModelsView(props: any) {
  const {
    apiKeys,
    setApiKeys,
    activeKeyId,
    globalEnabledModels,
    setGlobalEnabledModels,
    theme,
    modelCatalog = [],
    catalogSearch,
    setCatalogSearch,
    catalogFilter,
    setCatalogFilter,
    catalogPage,
    setCatalogPage,
    currentModel,
    setCurrentModel,
    isLoadingModels = false,
    refreshModels,
  } = props;

  const isLight = theme === "light";
  const [capabilityFilter, setCapabilityFilter] = useState<string>("all");
  const [selectedDetailModel, setSelectedDetailModel] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [providerSearch, setProviderSearch] = useState("");
  const providerDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        providerDropdownRef.current &&
        !providerDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProviderDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProviderDropdownOpen(false);
      }
    };
    if (isProviderDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProviderDropdownOpen]);

  // Compute active model IDs in current session/pool
  const activeModelIds = useMemo(() => {
    if (activeKeyId) {
      const currentKey = apiKeys.find((k: any) => k.id === activeKeyId);
      return currentKey?.models || [];
    }
    return globalEnabledModels.length > 0
      ? globalEnabledModels
      : modelQueueManager.getQueue();
  }, [activeKeyId, apiKeys, globalEnabledModels]);

  // Model catalog statistics
  const catalogStats = useMemo(() => {
    const total = modelCatalog.length;
    const activeCount = modelCatalog.filter((m: any) => activeModelIds.includes(m.id)).length;
    const toolCapableCount = modelCatalog.filter((m: any) => getToolCallingStatus(m) === "Yes").length;
    const uniqueProviders = new Set(modelCatalog.map((m: any) => m.provider)).size;
    return { total, activeCount, toolCapableCount, uniqueProviders };
  }, [modelCatalog, activeModelIds]);

  // Grouped providers and their model counts for the custom dropdown
  const providerListWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    modelCatalog.forEach((m: any) => {
      if (m.provider) {
        counts[m.provider] = (counts[m.provider] || 0) + 1;
      }
    });
    return Object.keys(counts)
      .sort((a, b) => a.localeCompare(b))
      .map((p) => ({ provider: p, count: counts[p] }));
  }, [modelCatalog]);

  const filteredProviders = useMemo(() => {
    if (!providerSearch.trim()) return providerListWithCounts;
    const query = providerSearch.toLowerCase().trim();
    return providerListWithCounts.filter((p) =>
      p.provider.toLowerCase().includes(query)
    );
  }, [providerListWithCounts, providerSearch]);

  // Handle toggling model enabled / disabled state
  const handleToggleModelActive = (modelId: string) => {
    if (activeKeyId) {
      setApiKeys((prev: any[]) =>
        prev.map((k) => {
          if (k.id === activeKeyId) {
            const hasOn = k.models?.includes(modelId);
            const hasOff = k.models?.includes(`OFF:${modelId}`);

            // Prevent turning off the only remaining active node
            if (hasOn && k.models?.filter((m: string) => !m.startsWith("OFF:")).length === 1) {
              return k;
            }

            let updated = [...(k.models || [])];
            if (hasOn) {
              updated = updated.filter((m: string) => m !== modelId);
              updated.push(`OFF:${modelId}`);
            } else {
              if (hasOff) updated = updated.filter((m: string) => m !== `OFF:${modelId}`);
              updated.push(modelId);
            }
            return { ...k, models: updated };
          }
          return k;
        })
      );
    } else {
      const currentDefaults = modelQueueManager.getQueue();
      const activeList = globalEnabledModels.length > 0 ? globalEnabledModels : currentDefaults;
      const hasOn = activeList.includes(modelId);
      const hasOff = activeList.includes(`OFF:${modelId}`);

      if (hasOn && activeList.filter((m: string) => !m.startsWith("OFF:")).length === 1) {
        return;
      }

      let updated = [...activeList];
      if (hasOn) {
        updated = updated.filter((m: string) => m !== modelId);
        updated.push(`OFF:${modelId}`);
      } else {
        if (hasOff) updated = updated.filter((m: string) => m !== `OFF:${modelId}`);
        updated.push(modelId);
      }
      setGlobalEnabledModels(updated);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing || isLoadingModels) return;
    setIsRefreshing(true);
    try {
      if (refreshModels) {
        await refreshModels();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // If server is fetching models or catalog is empty on initial load, show loading skeleton
  if (isLoadingModels || isRefreshing || (modelCatalog.length === 0 && !catalogSearch && !catalogFilter)) {
    return <ModelsSkeleton theme={theme} />;
  }

  // Filter and sort models
  const filteredAndSorted = [...modelCatalog]
    .filter((m) => {
      // Provider filter
      if (catalogFilter && m.provider !== catalogFilter) return false;

      // Text search
      if (catalogSearch) {
        const query = catalogSearch.toLowerCase();
        const matchesName = (m.name || "").toLowerCase().includes(query);
        const matchesId = (m.id || "").toLowerCase().includes(query);
        const matchesDesc = (m.description || "").toLowerCase().includes(query);
        const matchesProvider = (m.provider || "").toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesDesc && !matchesProvider) {
          return false;
        }
      }

      // Quick capability filter tabs
      const isActive = activeModelIds.includes(m.id);
      if (capabilityFilter === "active" && !isActive) return false;
      if (capabilityFilter === "tools" && getToolCallingStatus(m) !== "Yes") return false;
      if (capabilityFilter === "context") {
        const ctx = Number(m.contextLength || m.context_length || 0);
        if (ctx < 128000) return false;
      }
      if (capabilityFilter === "low_cost") {
        const promptCost = Number(m.pricing?.prompt || 0) * 1000000;
        if (promptCost > 1.0) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const aActive = activeModelIds.includes(a.id);
      const bActive = activeModelIds.includes(b.id);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      if (aActive && bActive) {
        return activeModelIds.indexOf(a.id) - activeModelIds.indexOf(b.id);
      }
      return 0;
    });

  const MODELS_PER_PAGE = 24;
  const totalPages = Math.ceil(filteredAndSorted.length / MODELS_PER_PAGE) || 1;
  const paginatedModels = filteredAndSorted.slice(
    (catalogPage - 1) * MODELS_PER_PAGE,
    catalogPage * MODELS_PER_PAGE
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-12 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
        {/* Header with Title and Search & Filter Tools */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-border-dim pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-mono font-bold tracking-tighter text-white uppercase">
                Model Catalog
              </h1>
              <button
                onClick={handleRefresh}
                title="Sync dynamic catalog from OpenRouter / providers"
                className={cn(
                  "p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-mono",
                  isLight
                    ? "border-slate-200 hover:bg-slate-100 text-slate-600"
                    : "border-zinc-800 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-zinc-400 hover:text-cyan-300"
                )}
              >
                <RefreshCw size={13} className={isRefreshing ? "animate-spin text-cyan-400" : ""} />
                <span className="hidden sm:inline">Sync Catalog</span>
              </button>
            </div>
            <p className="text-zinc-500 font-mono text-xs sm:text-sm uppercase tracking-widest opacity-70">
              Neural Engine Configurations & Live Pool Management
            </p>
          </div>

          {/* Search and Provider Dropdown */}
          <div className="flex flex-col sm:flex-row gap-3 min-w-[320px]">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                placeholder="Search models, providers, specs..."
                value={catalogSearch}
                onChange={(e) => {
                  setCatalogSearch(e.target.value);
                  setCatalogPage(1);
                }}
                className={cn(
                  "w-full rounded-xl pl-9 pr-8 py-2.5 text-xs font-mono transition-all border focus:outline-none",
                  isLight
                    ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500"
                    : "bg-black/40 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-cyan-500/60"
                )}
              />
              {catalogSearch && (
                <button
                  onClick={() => {
                    setCatalogSearch("");
                    setCatalogPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Custom Styled Provider Dropdown */}
            <div className="relative" ref={providerDropdownRef}>
              <button
                type="button"
                id="provider-dropdown-trigger"
                onClick={() => {
                  setIsProviderDropdownOpen(!isProviderDropdownOpen);
                  if (!isProviderDropdownOpen) setProviderSearch("");
                }}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-xs font-mono min-w-[170px] sm:min-w-[190px] transition-all border flex items-center justify-between gap-2.5 select-none focus:outline-none",
                  isLight
                    ? "bg-white border-slate-300 text-slate-800 hover:border-slate-400 focus:border-cyan-500 shadow-sm"
                    : "bg-black/40 border-zinc-800 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900/40 focus:border-cyan-500/60 shadow-sm",
                  isProviderDropdownOpen && (isLight ? "border-cyan-500 ring-1 ring-cyan-500/30" : "border-cyan-500/60 bg-zinc-900/50 ring-1 ring-cyan-500/30")
                )}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="truncate">
                    {catalogFilter ? catalogFilter : `All Providers (${catalogStats.uniqueProviders})`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {catalogFilter && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCatalogFilter("");
                        setCatalogPage(1);
                      }}
                      className="p-0.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                      title="Clear provider filter"
                    >
                      <X size={12} />
                    </span>
                  )}
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-zinc-400 transition-transform duration-200",
                      isProviderDropdownOpen && "rotate-180 text-cyan-400"
                    )}
                  />
                </div>
              </button>

              {/* Dropdown Menu Popup */}
              <AnimatePresence>
                {isProviderDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 3, scale: 0.98 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                    className={cn(
                      "absolute right-0 top-full mt-2 w-72 rounded-2xl border shadow-2xl z-50 overflow-hidden flex flex-col backdrop-blur-xl",
                      isLight
                        ? "bg-white border-slate-200 text-slate-800 shadow-slate-300/60"
                        : "bg-[#0c0d12]/95 border-zinc-800 text-zinc-200 shadow-2xl shadow-cyan-950/40"
                    )}
                  >
                    {/* Search inside Dropdown */}
                    <div
                      className={cn(
                        "p-2.5 border-b",
                        isLight ? "border-slate-100 bg-slate-50/70" : "border-zinc-800/80 bg-zinc-950/60"
                      )}
                    >
                      <div className="relative">
                        <Search
                          size={12}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
                        />
                        <input
                          type="text"
                          autoFocus
                          value={providerSearch}
                          onChange={(e) => setProviderSearch(e.target.value)}
                          placeholder={`Filter ${catalogStats.uniqueProviders} providers...`}
                          className={cn(
                            "w-full rounded-lg pl-7 pr-7 py-1.5 text-xs font-mono focus:outline-none border transition-colors",
                            isLight
                              ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500"
                              : "bg-black/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-cyan-500/50"
                          )}
                        />
                        {providerSearch && (
                          <button
                            type="button"
                            onClick={() => setProviderSearch("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Scrollable Provider List */}
                    <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                      {/* All Providers Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setCatalogFilter("");
                          setCatalogPage(1);
                          setIsProviderDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between transition-all group",
                          catalogFilter === ""
                            ? isLight
                              ? "bg-cyan-50 text-cyan-700 font-bold border border-cyan-200"
                              : "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                            : isLight
                            ? "hover:bg-slate-100 text-slate-700"
                            : "hover:bg-zinc-800/60 text-zinc-300 hover:text-white"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles size={12} className={catalogFilter === "" ? "text-cyan-400" : "text-zinc-500"} />
                          <span>All Providers</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-mono",
                              catalogFilter === ""
                                ? isLight ? "bg-cyan-100 text-cyan-800" : "bg-cyan-500/30 text-cyan-200"
                                : isLight ? "bg-slate-100 text-slate-500" : "bg-zinc-800/80 text-zinc-500"
                            )}
                          >
                            {catalogStats.total}
                          </span>
                          {catalogFilter === "" && <Check size={13} className="text-cyan-400" />}
                        </div>
                      </button>

                      {/* Filtered Provider Items */}
                      {filteredProviders.length === 0 ? (
                        <div className="py-6 text-center text-xs font-mono text-zinc-500">
                          No matching providers
                        </div>
                      ) : (
                        filteredProviders.map(({ provider, count }) => {
                          const isSelected = catalogFilter === provider;
                          return (
                            <button
                              key={provider}
                              type="button"
                              onClick={() => {
                                setCatalogFilter(provider);
                                setCatalogPage(1);
                                setIsProviderDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full px-3 py-1.5 rounded-xl text-xs font-mono flex items-center justify-between transition-all group",
                                isSelected
                                  ? isLight
                                    ? "bg-cyan-50 text-cyan-700 font-bold border border-cyan-200"
                                    : "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                                  : isLight
                                  ? "hover:bg-slate-100 text-slate-700"
                                  : "hover:bg-zinc-800/60 text-zinc-300 hover:text-white"
                              )}
                            >
                              <span className="truncate pr-2">{provider}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded font-mono",
                                    isSelected
                                      ? isLight ? "bg-cyan-100 text-cyan-800" : "bg-cyan-500/30 text-cyan-200"
                                      : isLight ? "bg-slate-100 text-slate-500" : "bg-zinc-800/80 text-zinc-500 group-hover:bg-zinc-800 group-hover:text-zinc-300"
                                  )}
                                >
                                  {count}
                                </span>
                                {isSelected && <Check size={13} className="text-cyan-400" />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Live Catalog Metrics Bar & Quick Capability Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: `All (${catalogStats.total})`, icon: Sparkles },
              { id: "active", label: `Active in Pool (${catalogStats.activeCount})`, icon: Zap },
              { id: "tools", label: `Tool Call: Yes (${catalogStats.toolCapableCount})`, icon: Wrench },
              { id: "context", label: "Large Context (≥128K)", icon: Maximize2 },
              { id: "low_cost", label: "Low Cost (<$1/1M)", icon: DollarSign },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = capabilityFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setCapabilityFilter(tab.id);
                    setCatalogPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 border",
                    isSelected
                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm"
                      : isLight
                      ? "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
                  )}
                >
                  <Icon size={12} className={isSelected ? "text-cyan-400" : "text-zinc-500"} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-3">
            <span>
              Showing{" "}
              <strong className="text-white">
                {filteredAndSorted.length}
              </strong>{" "}
              model{filteredAndSorted.length === 1 ? "" : "s"}
            </span>
            <span className="text-zinc-700">•</span>
            <span className="text-zinc-500">
              Click <span className="text-cyan-400">Show More Info</span> for full details
            </span>
          </div>
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
          {filteredAndSorted.length === 0 ? (
            <div className="col-span-full p-12 text-center border rounded-3xl bg-black/20 border-zinc-900 space-y-3">
              <Cpu size={32} className="mx-auto text-zinc-600" />
              <div className="text-sm font-mono font-bold text-white">No models matched your criteria</div>
              <p className="text-xs font-mono text-zinc-500">
                Try clearing search or filter selections to view all neural configurations.
              </p>
              <button
                onClick={() => {
                  setCatalogSearch("");
                  setCatalogFilter("");
                  setCapabilityFilter("all");
                }}
                className="px-4 py-2 mt-2 rounded-xl text-xs font-mono border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            paginatedModels.map((model: any) => {
              const isActiveModel = activeModelIds.includes(model.id);
              const isPrimary = currentModel === model.id;
              const specs = extractModelSpecs(model);

              return (
                <div
                  key={`${model.provider}-${model.id}`}
                  className={cn(
                    "p-6 rounded-2xl border relative overflow-hidden flex flex-col justify-between gap-4 group transition-all shadow-sm",
                    isActiveModel
                      ? "bg-black/50 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.08)]"
                      : isLight
                      ? "bg-white border-slate-200 hover:border-cyan-500/40"
                      : "bg-black/40 border-zinc-800/80 hover:border-zinc-700"
                  )}
                >
                  {/* Subtle Background Radial Glow */}
                  <div
                    className={cn(
                      "absolute top-0 right-0 w-36 h-36 rounded-full blur-[50px] pointer-events-none transition-colors",
                      isActiveModel
                        ? "bg-cyan-500/10"
                        : "bg-cyan-500/5 group-hover:bg-cyan-500/10"
                    )}
                  />

                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Name & Active Beacon */}
                      <div className="flex items-center gap-2">
                        {isActiveModel ? (
                          <span
                            title="Active in Chat Pool"
                            className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse shrink-0"
                          />
                        ) : (
                          <span
                            title="Inactive in Chat Pool"
                            className="w-2 h-2 rounded-full bg-zinc-700 shrink-0"
                          />
                        )}
                        <h3
                          onClick={() => setSelectedDetailModel(model)}
                          title="Click to view full specifications"
                          className="text-sm font-mono font-bold text-white group-hover:text-cyan-300 transition-colors cursor-pointer truncate"
                        >
                          {model.name || model.id}
                        </h3>
                      </div>

                      {/* Badges: Provider, Modality */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                          {model.provider || "null"}
                        </span>
                        {model.architecture ? (
                          <span className="px-1.5 py-0.5 bg-zinc-900/60 border border-zinc-800 rounded text-[9px] font-mono text-zinc-400">
                            {model.architecture}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-zinc-900/40 border border-zinc-800/60 rounded text-[9px] font-mono text-zinc-500 italic">
                            arch: null
                          </span>
                        )}
                        {isPrimary && (
                          <span className="px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 rounded text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                            <Zap size={9} />
                            Primary
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Context & Active Switch Button */}
                    <div className="flex items-center gap-3 relative z-10 shrink-0">
                      <div className="flex flex-col items-end text-right">
                        {specs.contextLengthFormatted !== "null" ? (
                          <span className="text-[13px] font-mono font-bold text-emerald-400">
                            {specs.contextLengthFormatted}
                          </span>
                        ) : (
                          <span className="text-xs font-mono italic text-zinc-500">
                            null
                          </span>
                        )}
                        <span className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest font-bold">
                          Max Context
                        </span>
                      </div>

                      {/* Active Pool Toggle Switch */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleModelActive(model.id);
                        }}
                        title={
                          isActiveModel
                            ? "Active in Chat Pool (Click to disable)"
                            : "Inactive (Click to enable in pool)"
                        }
                        className={cn(
                          "w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none flex items-center border",
                          isActiveModel
                            ? "bg-cyan-500/20 border-cyan-500/60 justify-end"
                            : "bg-zinc-900 border-zinc-800 justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "w-3.5 h-3.5 rounded-full transition-all",
                            isActiveModel
                              ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                              : "bg-zinc-600"
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Sleek Integrated Metrics Bar (Tool Call, Parameters, Prompt Cost) */}
                  <div
                    className={cn(
                      "grid grid-cols-3 rounded-xl py-2 px-3 relative z-10 transition-colors",
                      isLight
                        ? "bg-slate-100/90 border border-slate-200 divide-x divide-slate-200"
                        : "bg-zinc-900/50 border border-zinc-800/80 divide-x divide-zinc-800/80"
                    )}
                  >
                    {/* 1. Tool Call */}
                    <div className="flex flex-col gap-0.5 pr-2">
                      <span className="text-[9px] uppercase tracking-wider font-mono font-medium text-zinc-500 flex items-center gap-1">
                        <Wrench size={10} className="text-cyan-400 shrink-0" />
                        Tool Call
                      </span>
                      <div>
                        {specs.toolCall === "Yes" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-emerald-400">
                            <CheckCircle2 size={11} className="shrink-0" />
                            Yes
                          </span>
                        ) : specs.toolCall === "No" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-rose-400">
                            <XCircle size={11} className="shrink-0" />
                            No
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono italic text-zinc-500">
                            null
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2. Number of Parameters */}
                    <div className="flex flex-col gap-0.5 px-3">
                      <span className="text-[9px] uppercase tracking-wider font-mono font-medium text-zinc-500 flex items-center gap-1">
                        <Layers size={10} className="text-blue-400 shrink-0" />
                        Params
                      </span>
                      <div>
                        {specs.parameters !== "null" ? (
                          <span className="text-xs font-mono font-semibold text-blue-400">
                            {specs.parameters}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono italic text-zinc-500">
                            null
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 3. Pricing Quick Overview */}
                    <div className="flex flex-col gap-0.5 pl-3">
                      <span className="text-[9px] uppercase tracking-wider font-mono font-medium text-zinc-500 flex items-center gap-1">
                        <DollarSign size={10} className="text-amber-400 shrink-0" />
                        Prompt / 1M
                      </span>
                      <div>
                        {specs.promptCostFormatted !== "null" ? (
                          <span className="text-xs font-mono font-semibold text-amber-400">
                            {specs.promptCostFormatted}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono italic text-zinc-500">
                            null
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Best For Tag */}
                  <div
                    className={cn(
                      "px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-mono relative z-10 transition-colors",
                      isLight
                        ? "bg-cyan-50/70 border border-cyan-200/60"
                        : "bg-cyan-950/20 border border-cyan-500/25"
                    )}
                  >
                    <Target size={12} className="text-cyan-400 shrink-0" />
                    <div className="flex-1 truncate">
                      <span className="text-[9px] uppercase font-bold text-cyan-400 mr-1.5 tracking-wider">
                        Best For:
                      </span>
                      {specs.bestFor !== "null" ? (
                        <span className="text-zinc-200 font-medium">{specs.bestFor}</span>
                      ) : (
                        <span className="text-zinc-500 italic">null</span>
                      )}
                    </div>
                  </div>

                  {/* Description Preview (Truncated) */}
                  <p
                    onClick={() => setSelectedDetailModel(model)}
                    title="Click to view full description"
                    className="text-xs text-zinc-400 line-clamp-2 leading-relaxed font-light cursor-pointer hover:text-zinc-300 transition-colors relative z-10"
                  >
                    {model.description || (
                      <span className="italic text-zinc-600">
                        Description not available (click Show More Info for details).
                      </span>
                    )}
                  </p>

                  {/* Card Bottom Footer with Release Notice & Show More Info Action */}
                  <div
                    className={cn(
                      "pt-3 border-t flex items-center justify-between gap-2 relative z-10 mt-auto",
                      isLight ? "border-slate-100" : "border-white/5"
                    )}
                  >
                    {/* Completion Cost Badge */}
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
                      <span className="text-[8px] uppercase tracking-wider text-zinc-600">
                        Comp:
                      </span>
                      {specs.completionCostFormatted !== "null" ? (
                        <span className="text-amber-400/90 font-bold">
                          {specs.completionCostFormatted}
                        </span>
                      ) : (
                        <span className="italic text-zinc-600">null</span>
                      )}
                    </div>

                    {/* Actions: Release Notice & Show More Info */}
                    <div className="flex items-center gap-2">
                      {specs.releaseNoticeUrl !== "null" ? (
                        <a
                          href={specs.releaseNoticeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title={`Open official release notice from ${model.provider || "provider"}`}
                          className={cn(
                            "px-2.5 py-1.5 rounded-xl border text-[11px] font-mono font-medium transition-all inline-flex items-center gap-1.5 shadow-sm group",
                            isLight
                              ? "bg-slate-100 border-slate-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                              : "bg-zinc-900/90 border-zinc-800 text-purple-400 hover:bg-purple-500/15 hover:border-purple-500/40 hover:text-purple-300"
                          )}
                        >
                          <ExternalLink size={11} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 shrink-0" />
                          <span>Notice</span>
                        </a>
                      ) : (
                        <span
                          title="Release notice unfetched or null"
                          className="text-[10px] font-mono text-zinc-600 italic px-1.5"
                        >
                          notice: null
                        </span>
                      )}

                      {/* Show More Information Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedDetailModel(model)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-sm",
                          isLight
                            ? "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                            : "bg-zinc-900 border-zinc-800 text-cyan-400 hover:bg-cyan-500/15 hover:border-cyan-500/40 hover:text-cyan-300"
                        )}
                      >
                        <Info size={12} />
                        <span>More</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-zinc-900/60">
            <button
              onClick={() => setCatalogPage(Math.max(1, catalogPage - 1))}
              disabled={catalogPage === 1}
              className="px-4 py-2 border border-zinc-800 rounded-xl text-zinc-400 text-xs font-mono disabled:opacity-30 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
            >
              Previous
            </button>
            <span className="text-zinc-500 text-[10px] font-mono tracking-widest uppercase flex items-center gap-2">
              Page{" "}
              <span className="text-zinc-300 font-bold">
                {catalogPage}
              </span>{" "}
              of {totalPages}
            </span>
            <button
              onClick={() => setCatalogPage(Math.min(totalPages, catalogPage + 1))}
              disabled={catalogPage === totalPages}
              className="px-4 py-2 border border-zinc-800 rounded-xl text-zinc-400 text-xs font-mono disabled:opacity-30 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Dedicated Show More Information Modal / Inspector */}
      {selectedDetailModel && (
        <ModelDetailModal
          model={selectedDetailModel}
          isOpen={Boolean(selectedDetailModel)}
          onClose={() => setSelectedDetailModel(null)}
          isActiveModel={activeModelIds.includes(selectedDetailModel.id)}
          onToggleActive={() => handleToggleModelActive(selectedDetailModel.id)}
          isPrimaryModel={currentModel === selectedDetailModel.id}
          onSetPrimary={() => {
            setCurrentModel(selectedDetailModel.id);
            try {
              localStorage.setItem("devengine_last_model", selectedDetailModel.id);
            } catch (_) {}
          }}
          theme={theme}
        />
      )}
    </div>
  );
}
