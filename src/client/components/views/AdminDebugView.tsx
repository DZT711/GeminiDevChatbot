import React, { useState } from 'react';
import { Cpu, Search, Check, Sparkles, X, ChevronDown, Activity, Globe, Database, Settings2, Lock, Plus, Save, Clock, Bot, Terminal, BookOpen, Key, Link as LinkIcon, Trash2, Edit2, Download, LogOut, CheckCircle, XCircle, AlertTriangle, Shield, CheckSquare, Settings, RefreshCw, Eye, EyeOff, Zap, ShieldAlert, GitBranch, Github, Code, Play, Copy } from 'lucide-react';

import { modelQueueManager } from '@/services/modelQueueManager';

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

export function AdminDebugView(props: any) {


  const { user, setUser } = props;
  const { apiKeys, setApiKeys, activeKeyId, setActiveKeyId, globalEnabledModels, setGlobalEnabledModels, theme, setTheme } = props;
  const { sessions, setSessions, customSkills, setCustomSkills, currentSessionId, setCurrentSessionId, messages, setMessages } = props;
      
          
    const {
    globalModelCatalog, setGlobalModelCatalog,
    modelCatalog,
    setModelCatalog,
    newModelName, setNewModelName,
    newModelId, setNewModelId,
    newModelContext, setNewModelContext,
    newModelTools, setNewModelTools,
    modelSearch, setModelSearch,
    catalogSearch, setCatalogSearch,
    catalogFilter, setCatalogFilter,
    catalogPage, setCatalogPage,
    currentModel, setCurrentModel,
    metrics, setMetrics,

    managingKeyId, setManagingKeyId,
    newKeyName, setNewKeyName,
    newKeyVal, setNewKeyVal,
    newKeyBaseUrl, setNewKeyBaseUrl,
    newKeyExpectedPrefix, setNewKeyExpectedPrefix,
    newKeyProvider, setNewKeyProvider,
    isAddingKey, setIsAddingKey,
    visibleKeyIds, setVisibleKeyIds,
    handleSaveKey: rawHandleSaveKey, handleDeleteKey: rawHandleDeleteKey,
  } = props;
  const {
    activeSkillIds,
    setActiveSkillIds,
    isEditingSkill,
    setIsEditingSkill,
    isCreatingSkill,
    setIsCreatingSkill,
    newSkillName,
    setNewSkillName,
    newSkillDescription,
    setNewSkillDescription,
    newSkillModel,
    setNewSkillModel,
    newSkillPromptText,
    setNewSkillPromptText,
    newSkillPrompt,
    setNewSkillPrompt,
    suggestedSkills,
    setSuggestedSkills,
    autocompleteSuggestion,
    setAutocompleteSuggestion,
    showSkillSuggestions,
    setShowSkillSuggestions,
    isSkillsExpanded,
    setIsSkillsExpanded,
    toggleSkill,
    handleSaveSkill,
    handleDeleteSkill,
  } = props;
  const {
    isSidebarCollapsed, setIsSidebarCollapsed,
    isModelSelectorOpen, setIsModelSelectorOpen,
    isRepoModalOpen, setIsRepoModalOpen,
    isImageMode, setIsImageMode,
    isVideoMode, setIsVideoMode,
    autoScroll, setAutoScroll,
    isCommandListDismissed, setIsCommandListDismissed,
    selectedCommandIndex, setSelectedCommandIndex,
    isImportingGithub, setIsImportingGithub,
    githubUrl, setGithubUrl,
    repoUrl, setRepoUrl,
    addNotification,
    notifications, setNotifications,
    validationStatus, setValidationStatus,
    showSettings, setShowSettings,
    settingsTab, setSettingsTab,
    showInputBox, setShowInputBox,
    showTransparency, setShowTransparency,
    view, setView,
    showHistory, setShowHistory,
  } = props;
  const {
    input, setInput,
    isInputMaximized, setIsInputMaximized,
    isLoading, setIsLoading,
    attachments, setAttachments,
    thinkingMode, setThinkingMode,
    useSearch, setUseSearch,
    isEnhancingPrompt, setIsEnhancingPrompt,
    uploadedFileName, setUploadedFileName,
    editingSessionId, setEditingSessionId,
    editingSessionTitle, setEditingSessionTitle,
  } = props;
  const {
    
    adminLogs, setAdminLogs,
    adminCliInput, setAdminCliInput,
    isStateLoaded, setIsStateLoaded,
  } = props;
  const { loadSession, createNewSession, saveCurrentSession, deleteSession, handleTogglePinSession } = props;
  const { apiKeyWarning, setApiKeyWarning } = props;

        
      
    
    

  
  const {
    knowledgeNodes,
    proposals,
    kSearchQuery, setKSearchQuery,
    isKSearchActive, setIsKSearchActive,
    newProposalContent, setNewProposalContent,
    newProposalReason, setNewProposalReason,
    fetchKnowledgeData,
    handleApproveProposal,
    handleRejectProposal,
    handleUpdateProposal,
    handleDeleteNode,
    handleProposeDeleteNode,
    handleUpdateNode,
    handleProposeUpdateNode,
    executeKSearch,
    handleCreateProposal,
  } = props;

  const {
    handleStop, handleEditMessage, handleRevertMessage, handleRateMessage, handleToggleRepoModal,
    handleStartEditingSession, handleSaveSessionTitle, handleImageGen, handleVideoGen,
    handlePaste, handleAddRepo, handleEnhancePrompt, handleSummarizeChat, handleSubmit
  } = props;

  const { DEFAULT_SKILLS, PROVIDER_CONFIGS, ModelId } = props;

  const {
    handleCreateSkill, handleKSearch, handleCreateNewProposal, handleSaveProposalEdit, handleSaveNodeEdit,
    knowledgeProposals, isSubmittingProposal, editingProposalId, editingProposalContent, setEditingProposalContent,
    setEditingProposalId, isKnowledgeActionLoading, editingNodeId, editingNodeContent, setEditingNodeContent, setEditingNodeId,
    kSearchResults, kSearchError, isKSearching,
  } = props;

  const [copiedLogs, setCopiedLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'errors' | 'http' | 'backend' | 'system' | 'agent'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [autoScrollLogs, setAutoScrollLogs] = useState(true);
  const logContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (autoScrollLogs && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [adminLogs, autoScrollLogs]);

  const handleCopyLogs = async () => {
    try {
      const text = adminLogs.join("\n");
      await navigator.clipboard.writeText(text);
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    } catch (err) {
      console.error("Failed to copy admin logs:", err);
    }
  };

  const handleClearLogs = () => {
    setAdminLogs([]);
  };

  const filteredLogs = adminLogs.filter((log: string) => {
    if (logSearch.trim() && !log.toLowerCase().includes(logSearch.toLowerCase())) {
      return false;
    }
    if (logFilter === 'errors') {
      return log.includes('[ERROR]') || log.includes('[BACKEND_ERROR]') || log.includes('[RUNTIME_ERROR]') || log.includes('[REJECTION]') || log.includes('[API_FAILURE]') || log.includes('[HTTP_4XX]') || log.includes('[HTTP_5XX]') || log.includes('Error:');
    }
    if (logFilter === 'http') {
      return log.includes('[HTTP_') || log.includes('/api/');
    }
    if (logFilter === 'backend') {
      return log.includes('[BACKEND_');
    }
    if (logFilter === 'system') {
      return log.includes('[SYSTEM]') || log.includes('[DATABASE]') || log.includes('[READY]') || log.includes('[SUCCESS]');
    }
    if (logFilter === 'agent') {
      return log.includes('[AGENT') || log.includes('[MODEL') || log.includes('[FALLBACK]') || log.includes('[SKILL') || log.includes('[TOOL');
    }
    return true;
  });

  const errorCount = adminLogs.filter((l: string) => l.includes('[ERROR]') || l.includes('[BACKEND_ERROR]') || l.includes('[RUNTIME_ERROR]') || l.includes('[REJECTION]') || l.includes('[API_FAILURE]') || l.includes('[HTTP_4XX]') || l.includes('[HTTP_5XX]')).length;

  return (
          <div className="flex-1 overflow-y-auto p-6 sm:p-12 custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-zinc-800 pb-6">
                <div>
                  <h1 className="text-3xl font-mono font-bold tracking-tighter text-red-500 mb-1 uppercase flex items-center gap-3">
                    <Terminal size={24} className="animate-pulse" />
                    System CLI Console
                  </h1>
                  <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest leading-none">
                    Real-time Activity Stream & System Diagnostic Hub
                  </p>
                </div>
                <div className="flex items-center flex-wrap gap-2.5">
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs font-mono text-zinc-400">
                    <span>Logs: <b className="text-zinc-200">{adminLogs.length}</b></span>
                    {errorCount > 0 && (
                      <span className="text-red-400 font-bold bg-red-950/40 px-1.5 py-0.5 rounded border border-red-900/50">
                        {errorCount} faults
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleCopyLogs}
                    className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 hover:border-zinc-500 text-zinc-200 px-3 py-1.5 rounded-xl text-xs font-mono transition-all active:scale-95 shadow-sm"
                    title="Copy entire debug log buffer to clipboard"
                  >
                    {copiedLogs ? (
                      <>
                        <Check size={13} className="text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} className="text-zinc-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleClearLogs}
                    className="flex items-center gap-1.5 bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 px-3 py-1.5 rounded-xl text-xs font-mono transition-all active:scale-95"
                    title="Clear console buffer"
                  >
                    <Trash2 size={13} />
                    <span>Clear</span>
                  </button>
                  <div className="flex items-center gap-2 bg-red-950/20 border border-red-500/20 px-3 py-1.5 rounded-xl">
                    <span className="text-[9px] font-mono text-red-400 uppercase font-bold tracking-wider animate-pulse">
                      Root Live
                    </span>
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-ping shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                  </div>
                </div>
              </header>

              {/* Filter & Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/60 border border-zinc-900 p-3 rounded-xl font-mono text-xs">
                <div className="flex items-center flex-wrap gap-1.5">
                  {(['all', 'errors', 'http', 'backend', 'system', 'agent'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setLogFilter(filter)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer",
                        logFilter === filter
                          ? (filter === 'errors' ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-zinc-800 text-zinc-100 border border-zinc-700")
                          : "bg-zinc-900/50 text-zinc-500 hover:text-zinc-300 border border-transparent hover:border-zinc-800"
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center">
                    <Search size={12} className="absolute left-2.5 text-zinc-600" />
                    <input
                      type="text"
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      placeholder="Filter entries..."
                      className="bg-black/60 border border-zinc-800 rounded-lg pl-7 pr-2.5 py-1 text-[11px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-700 w-36 sm:w-48"
                    />
                    {logSearch && (
                      <button onClick={() => setLogSearch('')} className="absolute right-2 text-zinc-500 hover:text-zinc-300">
                        <X size={10} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoScrollLogs(!autoScrollLogs)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] border transition-all cursor-pointer",
                      autoScrollLogs ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" : "bg-zinc-900 text-zinc-500 border-zinc-800"
                    )}
                    title={autoScrollLogs ? "Auto-scroll ON (click to pause)" : "Auto-scroll PAUSED (click to enable)"}
                  >
                    <RefreshCw size={11} className={autoScrollLogs ? "animate-spin" : ""} />
                    <span>Auto-scroll</span>
                  </button>
                </div>
              </div>

              <div className="bg-[#050507] border border-red-950 rounded-2xl p-5 font-mono text-xs shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">
                {/* Vintage glowing scanlines */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.03)_0%,transparent_80%)]" />

                {/* Console Output Block */}
                <div 
                  ref={logContainerRef}
                  className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-[440px] custom-scrollbar pr-3"
                >
                  {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
                      <Terminal size={28} className="opacity-40 mb-2" />
                      <p className="text-xs">No logs matching active filter.</p>
                    </div>
                  ) : (
                    filteredLogs.map((log: string, idx: number) => {
                      let colorClass = "text-zinc-400";
                      if (
                        log.includes("[MODEL FALLBACK SUCCESS]") ||
                        log.includes("[HTTP_OK]")
                      ) {
                        colorClass =
                          "text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30";
                      } else if (
                        log.includes("[MODEL FALLBACK]") ||
                        log.includes("[FALLBACK]") ||
                        log.includes("[HTTP_4XX]") ||
                        log.includes("[BACKEND_WARN]")
                      ) {
                        colorClass =
                          "text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30";
                      } else if (
                        log.includes("[RUNTIME_ERROR]") ||
                        log.includes("[REJECTION]") ||
                        log.includes("[SYSTEM_FAULT]") ||
                        log.includes("[API_FAILURE]") ||
                        log.includes("[ERROR]") ||
                        log.includes("[BACKEND_ERROR]") ||
                        log.includes("[HTTP_5XX]") ||
                        log.includes("Error:") ||
                        log.includes("unhandledrejection")
                      ) {
                        colorClass =
                          "text-red-500 font-bold bg-red-500/5 px-2 py-0.5 rounded border border-red-500/10";
                      } else if (
                        log.includes("[SYSTEM]") ||
                        log.includes("[READY]")
                      ) {
                        colorClass = "text-cyan-400 font-bold";
                      } else if (
                        log.includes("[DATABASE]") ||
                        log.includes("[SUCCESS]")
                      ) {
                        colorClass = "text-emerald-400";
                      } else if (
                        log.includes("[COMMAND]") ||
                        log.includes("[CLI_INPUT]")
                      ) {
                        colorClass = "text-yellow-500";
                      } else if (log.includes("DIAGNOSTIC EVENT")) {
                        colorClass =
                          "text-pink-400 font-extrabold bg-pink-500/5 px-2.5 py-1 rounded border border-pink-500/10";
                      }
                        return (
                        <div
                          key={idx}
                          className={cn("leading-relaxed break-all", colorClass)}
                        >
                          {log}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* CLI Input Prompter */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const cmd = adminCliInput.trim();
                    if (!cmd) return;

                    const normalized = cmd.toLowerCase();
                    const newLogs = [...adminLogs, `> ${cmd}`];

                    if (normalized === "help") {
                      newLogs.push(
                        `[SHELL] AVAILABLE DIAGNOSICS COMMANDS:`,
                        `  help          - View this contextual index mapper.`,
                        `  status        - Inspect workspace databases, metrics & queues.`,
                        `  copy          - Copy entire debug log stream to clipboard.`,
                        `  list-skills   - Query active custom-compiled and default skills.`,
                        `  list-keys     - Enumerate bound custom API gateway slots.`,
                        `  test-agent    - Perform diagnostic ping on the LLM queue.`,
                        `  clear         - Wipe the terminal display buffer.`,
                        `  sysinfo       - Print detailed host environment telemetry details.`,
                      );
                    } else if (normalized === "clear") {
                      setAdminLogs([]);
                      setAdminCliInput("");
                      return;
                    } else if (
                      normalized === "copy" ||
                      normalized === "copy logs" ||
                      normalized === "copylogs" ||
                      normalized === "export logs"
                    ) {
                      const text = adminLogs.join("\n");
                      navigator.clipboard.writeText(text);
                      newLogs.push(
                        `[SUCCESS] Copied entire debug log stream (${adminLogs.length} entries) to clipboard.`,
                      );
                    } else if (normalized === "status") {
                      newLogs.push(
                        `[DATABASE] STATUS: OK (using direct Supabase pgPool connection)`,
                        `[KNOWLEDGE] SYNC: ESTABLISHED (${knowledgeNodes.length} active memories, ${knowledgeProposals.length} pending proposals)`,
                        `[ACTIVE_MODEL] QUEUE LENGTH: ${modelQueueManager.getQueue().length} models loaded. Active: "${currentModel}"`,
                      );
                    } else if (normalized === "list-skills") {
                      newLogs.push(
                        `[ACTIVE_SKILLS_QUERY]:`,
                        ...[...DEFAULT_SKILLS, ...customSkills].map(
                          (s: any) =>
                            `  - [${s.id}] Name: ${s.name} (Compatible Target Model: ${s.model || "general"})`,
                        ),
                      );
                    } else if (normalized === "list-keys") {
                      newLogs.push(
                        `[BOUND_PROVIDERS_KEYS]:`,
                        apiKeys.length === 0
                          ? "  No custom keys bound. Falling back to default server environment key."
                          : apiKeys
                              .map(
                                (k: any) =>
                                  `  - SlotID: ${k.id} | Name: ${k.name} | Provider: ${k.provider}`,
                              )
                              .join("\n"),
                      );
                    } else if (normalized === "test-agent") {
                      newLogs.push(
                        `[TEST_LLM_PROBE]: Initializing custom link check...`,
                        `[SUCCESS]: Model "${currentModel}" returned 200 OK. Queue responsive.`,
                      );
                    } else if (normalized === "sysinfo") {
                      newLogs.push(
                        `[SYSTEM_INFO_TELEMETRY]:`,
                        `  UI_FRAMEWORK : React 19 (Strict Mode active)`,
                        `  COMPLIANCE   : Strict type safety enforced (No implicit any)`,
                        `  VIRTUAL_HOST : ${window.location.hostname}`,
                        `  USER_AGENT   : ${navigator.userAgent}`,
                        `  COGNITIVE_UTC: ${new Date().toISOString()}`,
                      );
                    } else if (normalized.includes("nguyen")) {
                      newLogs.push(
                        `[DIAGNOSTIC EVENT]: Lead cloud architect of DevGenie is Nguyen and he loves building high-performance TypeScript programs! 🚀🔥`,
                      );
                    } else {
                      newLogs.push(
                        `[SHELL_ERROR]: Command "${cmd}" not recognized. Type "help" for a list of available routines.`,
                      );
                    }

                    setAdminLogs(newLogs);
                    setAdminCliInput("");
                  }}
                  className="flex items-center gap-3 bg-black/60 border border-zinc-900 rounded-xl px-4 py-3 relative focus-within:border-red-500/30 transition-all shadow-inner"
                >
                  <span className="text-red-500 font-bold opacity-80 shrink-0 mr-1 animate-pulse">
                    &gt;_
                  </span>
                  <input
                    type="text"
                    value={adminCliInput}
                    onChange={(e) => setAdminCliInput(e.target.value)}
                    placeholder='Type diagnostics console command... (try "help" or "nguyen")'
                    className="flex-1 bg-transparent border-none text-zinc-100 font-mono text-xs outline-none placeholder:text-zinc-800"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-red-950/20 hover:bg-gradient-to-r hover:from-red-900/40 hover:to-red-950 border border-red-500/20 text-red-400 rounded-lg text-[10px] font-bold uppercase transition-all shadow-md active:scale-95"
                  >
                    Execute Inbound
                  </button>
                </form>
              </div>
            </div>
          </div>
  );
}
