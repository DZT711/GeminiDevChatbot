import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Wrench,
  Layers,
  Sparkles,
  Target,
  Copy,
  Check,
  Zap,
  Globe,
  DollarSign,
  Maximize2,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Cpu,
  ArrowRight,
  ExternalLink,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { extractModelSpecs } from "./modelUtils";

interface ModelDetailModalProps {
  model: any | null;
  isOpen: boolean;
  onClose: () => void;
  isActiveModel: boolean;
  onToggleActive: () => void;
  isPrimaryModel?: boolean;
  onSetPrimary?: () => void;
  theme?: string;
}

export function ModelDetailModal({
  model,
  isOpen,
  onClose,
  isActiveModel,
  onToggleActive,
  isPrimaryModel = false,
  onSetPrimary,
  theme = "midnight",
}: ModelDetailModalProps): React.JSX.Element | null {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!isOpen || !model) return null;

  const isLight = theme === "light";
  const specs = extractModelSpecs(model);

  const [releaseNotice, setReleaseNotice] = useState<string | null>(
    specs.releaseNoticeUrl !== "null" ? specs.releaseNoticeUrl : null
  );
  const [isEditingNotice, setIsEditingNotice] = useState(false);
  const [customNoticeInput, setCustomNoticeInput] = useState(
    specs.releaseNoticeUrl !== "null" ? specs.releaseNoticeUrl : ""
  );
  const [isSavingNotice, setIsSavingNotice] = useState(false);
  const [noticeSaveSuccess, setNoticeSaveSuccess] = useState(false);

  const [currentDesc, setCurrentDesc] = useState<string>(model.description || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState<string>(model.description || "");
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const [descSaveSuccess, setDescSaveSuccess] = useState(false);

  // Sync state if model changes
  React.useEffect(() => {
    const noticeUrl = specs.releaseNoticeUrl !== "null" ? specs.releaseNoticeUrl : null;
    setReleaseNotice(noticeUrl);
    setCustomNoticeInput(noticeUrl || "");
    setIsEditingNotice(false);

    setCurrentDesc(model.description || "");
    setDescInput(model.description || "");
    setIsEditingDesc(false);
  }, [model?.id, model?.description, specs.releaseNoticeUrl]);

  const handleSaveDescription = async () => {
    setIsSavingDesc(true);
    try {
      const trimmed = descInput.trim();
      const res = await fetch('/api/models/description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: model.id,
          description: trimmed,
        }),
      });
      if (res.ok) {
        setCurrentDesc(trimmed);
        model.description = trimmed;
        setIsEditingDesc(false);
        setDescSaveSuccess(true);
        setTimeout(() => setDescSaveSuccess(false), 2500);
      }
    } catch (e) {
      console.error('Failed to save description to DB:', e);
    } finally {
      setIsSavingDesc(false);
    }
  };

  const handleSaveReleaseNotice = async () => {
    setIsSavingNotice(true);
    try {
      const trimmed = customNoticeInput.trim();
      const res = await fetch('/api/models/release-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: model.id,
          releaseNoticeUrl: trimmed || null,
        }),
      });
      if (res.ok) {
        setReleaseNotice(trimmed || null);
        setIsEditingNotice(false);
        setNoticeSaveSuccess(true);
        setTimeout(() => setNoticeSaveSuccess(false), 2500);
      }
    } catch (e) {
      console.error('Failed to save release notice to DB:', e);
    } finally {
      setIsSavingNotice(false);
    }
  };

  const handleCopyId = () => {
    if (!model.id) return;
    navigator.clipboard.writeText(model.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  };

  const handleCopyFullSpec = () => {
    const specSummary = {
      name: model.name || null,
      id: model.id || null,
      provider: model.provider || null,
      toolCalling: specs.toolCall,
      parameters: specs.parameters,
      bestFor: specs.bestFor,
      releaseNoticeUrl: releaseNotice,
      contextLength: specs.contextLengthFormatted,
      promptCost: specs.promptCostFormatted,
      completionCost: specs.completionCostFormatted,
      architecture: model.architecture || null,
      description: model.description || null,
    };
    navigator.clipboard.writeText(JSON.stringify(specSummary, null, 2));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1800);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden z-10 my-auto",
            isLight
              ? "bg-white border-slate-200 text-slate-900"
              : "bg-[#0c0d12] border-zinc-800/80 text-white"
          )}
        >
          {/* Subtle Ambient Glow */}
          <div
            className={cn(
              "absolute -top-24 -right-24 w-72 h-72 rounded-full blur-[90px] pointer-events-none",
              isActiveModel ? "bg-cyan-500/15" : "bg-zinc-600/10"
            )}
          />

          {/* Top Bar Header */}
          <div
            className={cn(
              "px-6 sm:px-8 py-6 border-b flex items-start justify-between gap-4 relative z-10",
              isLight ? "border-slate-100 bg-slate-50/50" : "border-white/5 bg-zinc-950/40"
            )}
          >
            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border",
                    isLight
                      ? "bg-slate-100 border-slate-300 text-slate-700"
                      : "bg-zinc-900 border-zinc-800 text-cyan-400"
                  )}
                >
                  {model.provider || "null"}
                </span>

                {model.architecture ? (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-mono border",
                      isLight
                        ? "bg-slate-50 border-slate-200 text-slate-500"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-400"
                    )}
                  >
                    {model.architecture}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono border border-zinc-800/50 text-zinc-600 italic">
                    arch: null
                  </span>
                )}

                {isActiveModel && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    Active in Chat Pool
                  </span>
                )}
                {isPrimaryModel && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                    <Zap size={10} />
                    Current Primary
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-white flex items-center gap-2 truncate">
                {model.name || "Unnamed Model"}
              </h2>

              {/* Model ID with Quick Copy */}
              <div className="flex items-center gap-2 pt-0.5">
                <code
                  className={cn(
                    "text-xs font-mono px-2 py-1 rounded-md border flex items-center gap-2 truncate max-w-md",
                    isLight
                      ? "bg-slate-100 border-slate-200 text-slate-600"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400"
                  )}
                >
                  <Terminal size={11} className="text-zinc-500 shrink-0" />
                  <span className="truncate">{model.id || "null"}</span>
                </code>
                <button
                  onClick={handleCopyId}
                  title="Copy Model ID"
                  className={cn(
                    "p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[10px] font-mono",
                    copiedId
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : isLight
                      ? "border-slate-200 hover:bg-slate-100 text-slate-600"
                      : "border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                  )}
                >
                  {copiedId ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-xl border transition-all shrink-0",
                isLight
                  ? "border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                  : "border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white"
              )}
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar relative z-10 flex-1">
            {/* Core Specifications Grid (6 Key Tiles) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                  <Cpu size={13} className="text-cyan-500" />
                  Engine Specifications & Capabilities
                </h3>
                <span className="text-[10px] font-mono text-zinc-600">
                  Labels show <span className="italic text-zinc-400">null</span> if unfetched
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* 1. Tool Call */}
                <div
                  className={cn(
                    "p-4 rounded-2xl border flex flex-col justify-between gap-2 transition-colors",
                    isLight
                      ? "bg-slate-50 border-slate-200"
                      : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench size={12} className="text-cyan-400" />
                      Tool Call
                    </span>
                  </div>
                  <div>
                    {specs.toolCall === "Yes" ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-mono font-bold text-emerald-400">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        Yes
                      </span>
                    ) : specs.toolCall === "No" ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-mono font-bold text-rose-400">
                        <XCircle size={14} className="text-rose-400" />
                        No
                      </span>
                    ) : (
                      <span className="text-xs font-mono italic text-zinc-500">
                        null
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-zinc-600">
                    {specs.toolCall === "Yes"
                      ? "Function & Agent calling ready"
                      : specs.toolCall === "No"
                      ? "Standard generation only"
                      : "Capability unverified"}
                  </span>
                </div>

                {/* 2. Parameters */}
                <div
                  className={cn(
                    "p-4 rounded-2xl border flex flex-col justify-between gap-2 transition-colors",
                    isLight
                      ? "bg-slate-50 border-slate-200"
                      : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Layers size={12} className="text-blue-400" />
                      Parameters
                    </span>
                  </div>
                  <div>
                    {specs.parameters !== "null" ? (
                      <span className="text-base font-mono font-bold text-blue-400">
                        {specs.parameters}
                      </span>
                    ) : (
                      <span className="text-xs font-mono italic text-zinc-500">
                        null
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-zinc-600">
                    {specs.parameters !== "null"
                      ? "Active weights scale"
                      : "Parameter count not reported"}
                  </span>
                </div>

                {/* 3. Max Context */}
                <div
                  className={cn(
                    "p-4 rounded-2xl border flex flex-col justify-between gap-2 transition-colors",
                    isLight
                      ? "bg-slate-50 border-slate-200"
                      : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Maximize2 size={12} className="text-emerald-400" />
                      Max Context
                    </span>
                  </div>
                  <div>
                    {specs.contextLengthFormatted !== "null" ? (
                      <span className="text-base font-mono font-bold text-emerald-400">
                        {specs.contextLengthFormatted}{" "}
                        <span className="text-[10px] font-normal text-zinc-500">tokens</span>
                      </span>
                    ) : (
                      <span className="text-xs font-mono italic text-zinc-500">
                        null
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-zinc-600">
                    Maximum input + output window
                  </span>
                </div>

                {/* 4. Prompt Cost */}
                <div
                  className={cn(
                    "p-4 rounded-2xl border flex flex-col justify-between gap-2 transition-colors",
                    isLight
                      ? "bg-slate-50 border-slate-200"
                      : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign size={12} className="text-amber-400" />
                      Prompt Cost
                    </span>
                  </div>
                  <div>
                    {specs.promptCostFormatted !== "null" ? (
                      <span className="text-sm font-mono font-bold text-amber-400">
                        {specs.promptCostFormatted}
                      </span>
                    ) : (
                      <span className="text-xs font-mono italic text-zinc-500">
                        null
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-zinc-600">
                    Inference input pricing
                  </span>
                </div>

                {/* 5. Completion Cost */}
                <div
                  className={cn(
                    "p-4 rounded-2xl border flex flex-col justify-between gap-2 transition-colors",
                    isLight
                      ? "bg-slate-50 border-slate-200"
                      : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign size={12} className="text-amber-400" />
                      Completion Cost
                    </span>
                  </div>
                  <div>
                    {specs.completionCostFormatted !== "null" ? (
                      <span className="text-sm font-mono font-bold text-amber-400">
                        {specs.completionCostFormatted}
                      </span>
                    ) : (
                      <span className="text-xs font-mono italic text-zinc-500">
                        null
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-zinc-600">
                    Token generation pricing
                  </span>
                </div>

                {/* 6. Architecture / Modality */}
                <div
                  className={cn(
                    "p-4 rounded-2xl border flex flex-col justify-between gap-2 transition-colors",
                    isLight
                      ? "bg-slate-50 border-slate-200"
                      : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Globe size={12} className="text-purple-400" />
                      Modality
                    </span>
                  </div>
                  <div>
                    {model.architecture ? (
                      <span className="text-xs font-mono font-bold text-purple-300 truncate block">
                        {model.architecture}
                      </span>
                    ) : (
                      <span className="text-xs font-mono italic text-zinc-500">
                        null
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-zinc-600">
                    Interface & input/output type
                  </span>
                </div>
              </div>
            </div>

            {/* Recommended Use Case ("Best For") */}
            <div
              className={cn(
                "p-5 rounded-2xl border relative overflow-hidden",
                isLight
                  ? "bg-cyan-50/60 border-cyan-200"
                  : "bg-cyan-950/20 border-cyan-500/30"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0 mt-0.5">
                  <Target size={16} />
                </div>
                <div className="space-y-1 flex-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-500">
                    Recommended Optimal Application ("Best For")
                  </span>
                  <div className="text-sm font-mono font-bold text-white flex items-center gap-2">
                    {specs.bestFor !== "null" ? (
                      <span className="text-cyan-200">{specs.bestFor}</span>
                    ) : (
                      <span className="text-xs font-mono italic text-zinc-500">
                        null
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-light">
                    {specs.bestFor !== "null"
                      ? `This model's architecture, parameter distribution, and throughput profile are specifically tailored for ${specs.bestFor.toLowerCase()}.`
                      : "Specific domain specialization is not explicitly reported by the upstream provider."}
                  </p>
                </div>
              </div>
            </div>

            {/* Provider Release Notice & Documentation Section */}
            <div
              className={cn(
                "p-5 rounded-2xl border relative overflow-hidden transition-colors",
                isLight
                  ? "bg-slate-50 border-slate-200"
                  : "bg-zinc-950/70 border-zinc-800"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0 mt-0.5">
                    <ExternalLink size={16} />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-purple-400">
                        Provider Release Notice & Documentation
                      </span>
                      {noticeSaveSuccess && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          <Check size={10} /> Saved to Database
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono">
                      {releaseNotice ? (
                        <a
                          href={releaseNotice}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1.5 break-all max-w-full"
                        >
                          <span className="truncate max-w-md">{releaseNotice}</span>
                          <ExternalLink size={11} className="shrink-0" />
                        </a>
                      ) : (
                        <span className="italic text-zinc-500">
                          null (No provider release notice recorded in database)
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500">
                      Direct link to official announcement, technical report, or provider news hub.
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {releaseNotice && (
                    <a
                      href={releaseNotice}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all inline-flex items-center gap-1.5 shadow-sm",
                        isLight
                          ? "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                          : "bg-purple-950/40 border-purple-500/40 text-purple-300 hover:bg-purple-500/20"
                      )}
                    >
                      <ExternalLink size={12} />
                      <span>Open Notice</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomNoticeInput(releaseNotice || "");
                      setIsEditingNotice(!isEditingNotice);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl border text-xs font-mono font-medium transition-all inline-flex items-center gap-1.5",
                      isLight
                        ? "border-slate-200 hover:bg-slate-100 text-slate-700"
                        : "border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                    )}
                  >
                    <Edit3 size={12} />
                    <span>{releaseNotice ? "Edit URL" : "Add to Database"}</span>
                  </button>
                </div>
              </div>

              {/* Inline Manual URL Input Form */}
              {isEditingNotice && (
                <div className="mt-3 pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="url"
                    value={customNoticeInput}
                    onChange={(e) => setCustomNoticeInput(e.target.value)}
                    placeholder="https://provider.com/news/model-release-announcement"
                    className={cn(
                      "flex-1 px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-cyan-500 border",
                      isLight
                        ? "bg-white border-slate-300 text-slate-800"
                        : "bg-black/60 border-zinc-800 text-zinc-200"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveReleaseNotice}
                      disabled={isSavingNotice}
                      className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-mono font-bold hover:bg-cyan-500/30 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                    >
                      {isSavingNotice ? "Saving..." : "Save to DB"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingNotice(false)}
                      className="px-3 py-2 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-500 hover:text-zinc-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Full Current Description Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-400" />
                  Full Model Description
                </h3>

                <div className="flex items-center gap-2">
                  {descSaveSuccess && (
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <Check size={12} />
                      Saved to DB!
                    </span>
                  )}
                  {!isEditingDesc && (
                    <button
                      type="button"
                      onClick={() => {
                        setDescInput(currentDesc || model.description || "");
                        setIsEditingDesc(true);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all flex items-center gap-1",
                        isLight
                          ? "border-slate-200 hover:bg-slate-100 text-slate-600"
                          : "border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                      )}
                    >
                      <Edit3 size={11} />
                      <span>Edit Description</span>
                    </button>
                  )}
                </div>
              </div>

              {isEditingDesc ? (
                <div className="space-y-3">
                  <textarea
                    value={descInput}
                    onChange={(e) => setDescInput(e.target.value)}
                    rows={5}
                    placeholder="Enter full comprehensive description for this model..."
                    className={cn(
                      "w-full px-4 py-3 rounded-2xl border text-xs font-mono leading-relaxed outline-none transition-all resize-y",
                      isLight
                        ? "bg-white border-slate-300 text-slate-800 focus:border-cyan-500"
                        : "bg-zinc-950 border-zinc-700 text-zinc-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                    )}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-zinc-500">
                      {descInput.length} characters
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveDescription}
                        disabled={isSavingDesc}
                        className="px-3.5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-mono font-bold hover:bg-cyan-500/30 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                      >
                        {isSavingDesc ? "Saving..." : "Save Description"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingDesc(false)}
                        className="px-3 py-2 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-500 hover:text-zinc-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "p-5 rounded-2xl border text-xs leading-relaxed font-mono whitespace-pre-wrap select-text",
                    isLight
                      ? "bg-slate-50 border-slate-200 text-slate-700"
                      : "bg-zinc-950 border-zinc-800 text-zinc-300"
                  )}
                >
                  {(currentDesc || model.description) ? (
                    currentDesc || model.description
                  ) : (
                    <span className="italic text-zinc-500">
                      null (No description provided by upstream API)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Fallback & Pool Status */}
            <div
              className={cn(
                "p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4",
                isLight ? "bg-slate-100 border-slate-200" : "bg-zinc-900/40 border-zinc-800"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <Zap size={14} />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-white">
                    {isActiveModel
                      ? "Active in Auto-Failover & Chat Pool"
                      : "Currently Deactivated in Pool"}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500">
                    {isActiveModel
                      ? "Available in chat model selector dropdown and automated fallback routes."
                      : "Hidden from quick selector. Turn ON switch below to enable."}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onToggleActive}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 border shadow-sm",
                    isActiveModel
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30"
                      : "bg-zinc-800 border-zinc-750 text-zinc-400 hover:text-white hover:border-zinc-600"
                  )}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      isActiveModel ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "bg-zinc-600"
                    )}
                  />
                  <span>{isActiveModel ? "Disable Model" : "Enable Model"}</span>
                </button>

                {isActiveModel && onSetPrimary && !isPrimaryModel && (
                  <button
                    onClick={onSetPrimary}
                    className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition-all shadow-md shadow-cyan-950 flex items-center gap-1.5"
                  >
                    <span>Set as Primary</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div
            className={cn(
              "px-6 sm:px-8 py-4 border-t flex flex-wrap items-center justify-between gap-3 relative z-10",
              isLight ? "border-slate-100 bg-slate-50" : "border-white/5 bg-zinc-950/80"
            )}
          >
            <button
              onClick={handleCopyFullSpec}
              className={cn(
                "px-3.5 py-2 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5",
                copiedAll
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  : isLight
                  ? "border-slate-200 hover:bg-slate-100 text-slate-600"
                  : "border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white"
              )}
            >
              {copiedAll ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedAll ? "JSON Specs Copied!" : "Copy Full JSON Specs"}</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono font-bold transition-all"
            >
              Close Details
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
