import React from "react";
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
  Settings2,
  Lock,
  Plus,
  Save,
  Clock,
  Bot,
  Terminal,
  BookOpen,
  Key,
  Link as LinkIcon,
  Trash2,
  Edit2,
  Download,
  LogOut,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  CheckSquare,
  Settings,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  ShieldAlert,
  GitBranch,
  Github,
  Code,
  Play,
} from "lucide-react";

import { RotateCcw, ChevronLeft, ChevronUp, ChevronRight } from "lucide-react";
import { Provider, ApiKey } from "@/services/types";
import { validateKeyPrefix } from "@/hooks/useValidation";
import { geminiService, PROVIDER_CONFIGS } from "@/services/geminiService";
import { apiClient } from "@/services/apiClient";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

export function KeysView(props: any) {
  const { user, setUser } = props;
  const {
    apiKeys,
    setApiKeys,
    activeKeyId,
    setActiveKeyId,
    globalEnabledModels,
    setGlobalEnabledModels,
    theme,
    setTheme,
  } = props;
  const {
    sessions,
    setSessions,
    customSkills,
    setCustomSkills,
    currentSessionId,
    setCurrentSessionId,
    messages,
    setMessages,
  } = props;

  const {
    globalModelCatalog,
    setGlobalModelCatalog,
    modelCatalog,
    setModelCatalog,
    newModelName,
    setNewModelName,
    newModelId,
    setNewModelId,
    newModelContext,
    setNewModelContext,
    newModelTools,
    setNewModelTools,
    modelSearch,
    setModelSearch,
    catalogSearch,
    setCatalogSearch,
    catalogFilter,
    setCatalogFilter,
    catalogPage,
    setCatalogPage,
    currentModel,
    setCurrentModel,
    metrics,
    setMetrics,

    managingKeyId,
    setManagingKeyId,
    newKeyName,
    setNewKeyName,
    newKeyVal,
    setNewKeyVal,
    newKeyBaseUrl,
    setNewKeyBaseUrl,
    newKeyExpectedPrefix,
    setNewKeyExpectedPrefix,
    newKeyProvider,
    setNewKeyProvider,
    isAddingKey,
    setIsAddingKey,
    visibleKeyIds,
    setVisibleKeyIds,
    handleSaveKey: rawHandleSaveKey,
    handleDeleteKey: rawHandleDeleteKey,
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
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isModelSelectorOpen,
    setIsModelSelectorOpen,
    isRepoModalOpen,
    setIsRepoModalOpen,
    isImageMode,
    setIsImageMode,
    isVideoMode,
    setIsVideoMode,
    autoScroll,
    setAutoScroll,
    isCommandListDismissed,
    setIsCommandListDismissed,
    selectedCommandIndex,
    setSelectedCommandIndex,
    isImportingGithub,
    setIsImportingGithub,
    githubUrl,
    setGithubUrl,
    repoUrl,
    setRepoUrl,
    addNotification,
    notifications,
    setNotifications,
    validationStatus,
    setValidationStatus,
    showSettings,
    setShowSettings,
    settingsTab,
    setSettingsTab,
    showInputBox,
    setShowInputBox,
    showTransparency,
    setShowTransparency,
    view,
    setView,
    showHistory,
    setShowHistory,
  } = props;
  const {
    input,
    setInput,
    isInputMaximized,
    setIsInputMaximized,
    isLoading,
    setIsLoading,
    attachments,
    setAttachments,
    thinkingMode,
    setThinkingMode,
    useSearch,
    setUseSearch,
    isEnhancingPrompt,
    setIsEnhancingPrompt,
    uploadedFileName,
    setUploadedFileName,
    editingSessionId,
    setEditingSessionId,
    editingSessionTitle,
    setEditingSessionTitle,
  } = props;
  const {
    adminLogs,
    setAdminLogs,
    adminCliInput,
    setAdminCliInput,
    isStateLoaded,
    setIsStateLoaded,
  } = props;
  const {
    loadSession,
    createNewSession,
    saveCurrentSession,
    deleteSession,
    handleTogglePinSession,
  } = props;
  const { apiKeyWarning, setApiKeyWarning } = props;

  const {
    knowledgeNodes,
    proposals,
    kSearchQuery,
    setKSearchQuery,
    isKSearchActive,
    setIsKSearchActive,
    newProposalContent,
    setNewProposalContent,
    newProposalReason,
    setNewProposalReason,
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
    handleStop,
    handleEditMessage,
    handleRevertMessage,
    handleRateMessage,
    handleToggleRepoModal,
    handleStartEditingSession,
    handleSaveSessionTitle,
    handleImageGen,
    handleVideoGen,
    handlePaste,
    handleAddRepo,
    handleEnhancePrompt,
    handleSummarizeChat,
    handleSubmit,
  } = props;

  const { DEFAULT_SKILLS, PROVIDER_CONFIGS, ModelId } = props;

  const {
    handleCreateSkill,
    handleKSearch,
    handleCreateNewProposal,
    handleSaveProposalEdit,
    handleSaveNodeEdit,
    knowledgeProposals,
    isSubmittingProposal,
    editingProposalId,
    editingProposalContent,
    setEditingProposalContent,
    setEditingProposalId,
    isKnowledgeActionLoading,
    editingNodeId,
    editingNodeContent,
    setEditingNodeContent,
    setEditingNodeId,
    kSearchResults,
    kSearchError,
    isKSearching,
  } = props;

  return (
    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4">
        <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-border-dim pb-8">
          <div>
            <h1 className="text-4xl font-mono font-bold tracking-tighter text-white mb-2 uppercase">
              Key Infrastructure
            </h1>
            <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest tracking-tighter opacity-60">
              Manage Neural Keys and Model Proxies
            </p>
          </div>
        </header>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Manage API Keys
                </label>
                {activeKeyId && (
                  <button
                    onClick={() => setActiveKeyId("")}
                    className="text-[8px] bg-zinc-900 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full hover:text-cyan-400 hover:border-cyan-900/50 transition-all flex items-center gap-1 uppercase font-bold tracking-tighter"
                  >
                    <RotateCcw size={8} /> Use System Default
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsAddingKey(true)}
                className="text-[9px] font-mono text-cyan-500 hover:text-cyan-400 uppercase flex items-center gap-1"
              >
                <Plus size={10} /> Add New
              </button>
            </div>

            {isAddingKey && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
                <div className="flex items-center justify-between relative z-10">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                    Register Neural Key
                  </h3>
                  <button
                    onClick={() => {
                      setIsAddingKey(false);
                      setValidationStatus(null);
                    }}
                    className="text-zinc-600 hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-4 relative z-10 bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-2xl shadow-xl backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-zinc-800/50 pb-2.5 mb-1">
                    <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
                      Secure Credential Enrollment
                    </span>
                    <span className="text-[8px] font-mono bg-cyan-950/40 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/15">
                      Active Session
                    </span>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[9px] font-mono font-bold tracking-wider text-zinc-400 uppercase flex items-center justify-between">
                      <span>AI Provider Platform</span>
                      <span className="text-[7px] text-zinc-600 lowercase font-normal">
                        Select engine gateway
                      </span>
                    </label>
                    <div className="relative">
                      <select
                        value={newKeyProvider}
                        onChange={(e) => {
                          const provider = e.target.value as Provider;
                          setNewKeyProvider(provider);
                          const defaultPrefixes: Record<string, string> = {
                            google: "AIza", // Using AIza as default for Google, but AQ. is also valid
                            anthropic: "sk-ant-",
                            openai: "sk-",
                            xai: "xai-"
                          };
                          
                          if (provider !== 'custom' && defaultPrefixes[provider]) {
                            setNewKeyExpectedPrefix(defaultPrefixes[provider]);
                            
                            // Auto-input prefix into the secret key field if it's empty or contains another default prefix
                            const currentVal = newKeyVal.trim();
                            const isOldPrefix = Object.values(defaultPrefixes).includes(currentVal) || currentVal === "AQ.";
                            if (!currentVal || isOldPrefix) {
                                setNewKeyVal(defaultPrefixes[provider]);
                            }
                          } else {
                            setNewKeyExpectedPrefix("");
                            const currentVal = newKeyVal.trim();
                            const isOldPrefix = Object.values(defaultPrefixes).includes(currentVal) || currentVal === "AQ.";
                            if (isOldPrefix) {
                                setNewKeyVal("");
                            }
                          }
                        }}
                        className="w-full bg-[#09090c] border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 text-cyan-100 font-mono transition-all cursor-pointer"
                      >
                        {Object.entries(PROVIDER_CONFIGS).map((entry: any) => {
                          const id = entry[0];
                          const config = entry[1];
                          return (
                            <option key={id} value={id} className="bg-zinc-950">
                              {config.name}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                    <div className="space-y-1.5 md:col-span-1">
                      <label className="text-[9px] font-mono font-bold tracking-wider text-zinc-400 uppercase">
                        Provider Alias
                      </label>
                      <input
                        type="text"
                        placeholder="Work Key"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        className="w-full bg-[#09090c] border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 text-cyan-100 placeholder:text-zinc-700 font-mono transition-all"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[9px] font-mono font-bold tracking-wider text-zinc-400 uppercase">
                        {newKeyProvider === Provider.OLLAMA
                          ? "Ollama Service URL"
                          : "Input Secret Key"}
                      </label>
                      <input
                        type={
                          newKeyProvider === Provider.OLLAMA
                            ? "text"
                            : "password"
                        }
                        placeholder={
                          newKeyProvider === Provider.OLLAMA
                            ? "http://localhost:11434"
                            : newKeyProvider === Provider.GOOGLE
                              ? "AIza... or AQ..."
                              : "sk-..."
                        }
                        value={newKeyVal}
                        onChange={(e) => setNewKeyVal(e.target.value)}
                        className="w-full bg-[#09090c] border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 text-cyan-100 placeholder:text-zinc-700 font-mono transition-all"
                      />
                    </div>
                    {newKeyProvider === Provider.CUSTOM && (
                      <>
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[9px] font-mono font-bold tracking-wider text-zinc-400 uppercase">
                            Base Endpoint URL
                          </label>
                          <input
                            type="text"
                            placeholder="https://api.custom-provider.com/v1"
                            value={newKeyBaseUrl}
                            onChange={(e) => setNewKeyBaseUrl(e.target.value)}
                            className="w-full bg-[#09090c] border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 text-cyan-100 placeholder:text-zinc-700 font-mono transition-all"
                          />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[9px] font-mono font-bold tracking-wider text-zinc-400 uppercase">
                            Expected Key Prefix (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. sk-custom-"
                            value={newKeyExpectedPrefix}
                            onChange={(e) =>
                              setNewKeyExpectedPrefix(e.target.value)
                            }
                            className="w-full bg-[#09090c] border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 text-cyan-100 placeholder:text-zinc-700 font-mono transition-all"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {validationStatus && (
                    <div
                      className={cn(
                        "p-3 rounded-xl border text-[9px] font-mono animate-in slide-in-from-top-1 text-left",
                        validationStatus.type === "error"
                          ? "bg-red-500/10 border-red-500/20 text-red-400"
                          : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.05)]",
                      )}
                    >
                      <span className="font-bold mr-1">
                        {validationStatus.type === "error"
                          ? "▶ ERROR:"
                          : "▶ STATUS:"}
                      </span>
                      {validationStatus.message}
                    </div>
                  )}

                  <div className="flex gap-2.5 pt-1">
                    <button
                      onClick={async () => {
                        if (!newKeyVal.trim()) {
                          setValidationStatus({
                            type: "error",
                            message: "Key cannot be empty",
                          });
                          return;
                        }

                        const prefixCheck = validateKeyPrefix(
                          newKeyProvider,
                          newKeyVal,
                          newKeyExpectedPrefix,
                        );
                        if (!prefixCheck.valid) {
                          setValidationStatus({
                            type: "error",
                            message: `VALIDATION FAILED: ${prefixCheck.message}`,
                          });
                          return;
                        }

                        setValidationStatus({
                          type: "success",
                          message: `TESTING CONNECTION TO ${newKeyProvider.toUpperCase()} GATEWAY WORKSPACE...`,
                        });
                        const result = await geminiService.checkKey(
                          newKeyVal,
                          newKeyProvider,
                          newKeyProvider === Provider.CUSTOM
                            ? newKeyBaseUrl
                            : undefined,
                        );
                        if (result.valid) {
                          const discovered = result.models || [];
                          setValidationStatus({
                            type: "success",
                            message: `CONNECTION SUCCESSFUL: ${discovered.length} NODES DISCOVERED`,
                          });
                        } else {
                          setValidationStatus({
                            type: "error",
                            message: `REJECTED: ${result.error}`,
                          });
                        }
                      }}
                      className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(0,0,0,0.15)] active:scale-[0.98] cursor-pointer"
                    >
                      Test Connection
                    </button>
                    <button
                      onClick={async () => {
                        if (!newKeyVal.trim()) {
                          setValidationStatus({
                            type: "error",
                            message: "Key cannot be empty",
                          });
                          return;
                        }

                        const prefixCheck = validateKeyPrefix(
                          newKeyProvider,
                          newKeyVal,
                          newKeyExpectedPrefix,
                        );
                        if (!prefixCheck.valid) {
                          setValidationStatus({
                            type: "error",
                            message: `VALIDATION FAILED: ${prefixCheck.message}`,
                          });
                          return;
                        }

                        setValidationStatus({
                          type: "success",
                          message: `CONNECTING TO ${newKeyProvider.toUpperCase()} GATEWAY WORKSPACE...`,
                        });
                        const result = await geminiService.checkKey(
                          newKeyVal,
                          newKeyProvider,
                          newKeyProvider === Provider.CUSTOM
                            ? newKeyBaseUrl
                            : undefined,
                        );
                        if (result.valid) {
                          const discovered = result.models || [];
                          setValidationStatus({
                            type: "success",
                            message: `ESTABLISHED COGNITIVE LINK: ${discovered.length} NODES DISCOVERED`,
                          });

                          const keyObj: ApiKey = {
                            id: `key-${Date.now()}`,
                            name:
                              newKeyName ||
                              PROVIDER_CONFIGS[newKeyProvider].name,
                            key: newKeyVal,
                            provider: newKeyProvider,
                            baseUrl:
                              newKeyProvider === Provider.CUSTOM
                                ? newKeyBaseUrl
                                : undefined,
                            models: discovered.map((m) => m.id),
                          };
                          setApiKeys((prev) => [...prev, keyObj]);
                          setActiveKeyId(keyObj.id);
                          setIsAddingKey(false);
                          setNewKeyName("");
                          setNewKeyVal("");
                          setValidationStatus(null);
                        } else {
                          setValidationStatus({
                            type: "error",
                            message: `REJECTED: ${result.error}`,
                          });
                        }
                      }}
                      className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_25px_rgba(6,182,212,0.3)] active:scale-[0.98] cursor-pointer"
                    >
                      Save Credentials
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {managingKeyId ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-4 border-b border-zinc-900/50 pb-4">
                  <button
                    onClick={() => setManagingKeyId(null)}
                    className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-300">
                      Node Configuration
                    </h2>
                    <p className="text-[10px] font-mono text-zinc-600 uppercase">
                      {apiKeys.find((k) => k.id === managingKeyId)?.name} [
                      {apiKeys.find((k) => k.id === managingKeyId)?.provider}]
                    </p>
                  </div>
                </div>

                {(() => {
                  const k = apiKeys.find((key) => key.id === managingKeyId);
                  if (!k) return null;
                  return (
                    <div className="space-y-6">
                      <div className="p-5 border border-zinc-800 rounded-2xl bg-[#09090c] space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-4">
                            <div
                              className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner",
                                activeKeyId === k.id
                                  ? "bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                                  : "bg-zinc-900 text-zinc-600",
                              )}
                            >
                              {(() => {
                                const Icon = Shield;
                                return <Icon size={20} />;
                              })()}
                            </div>
                            <div>
                              <div
                                className={cn(
                                  "text-sm font-bold uppercase tracking-tight",
                                  activeKeyId === k.id
                                    ? "text-cyan-400"
                                    : "text-zinc-300",
                                )}
                              >
                                {(k as any).name}
                              </div>
                              <div className="flex flex-col gap-1 mt-1">
                                {k.baseUrl && (
                                  <div className="text-[10px] font-mono text-zinc-500 bg-zinc-900/50 px-2 py-0.5 rounded flex items-center gap-1">
                                    <span className="text-zinc-600">
                                      Endpoint:
                                    </span>{" "}
                                    {k.baseUrl}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <div className="text-[10px] font-mono text-zinc-600 tracking-widest bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                                    {visibleKeyIds.includes(k.id)
                                      ? k.key
                                      : `••••••••${k.key.slice(-4)}`}
                                  </div>
                                  <button
                                    onClick={() =>
                                      setVisibleKeyIds((prev) =>
                                        prev.includes(k.id)
                                          ? prev.filter((id) => id !== k.id)
                                          : [...prev, k.id],
                                      )
                                    }
                                    className="text-[10px] text-zinc-500 hover:text-cyan-400 uppercase tracking-wider font-bold"
                                  >
                                    {visibleKeyIds.includes(k.id)
                                      ? "Hide"
                                      : "Show"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {activeKeyId !== k.id ? (
                              <button
                                onClick={() => setActiveKeyId(k.id)}
                                className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg hover:bg-cyan-500/20 transition-all uppercase font-bold tracking-tighter"
                              >
                                Make Active
                              </button>
                            ) : (
                              <span className="text-[10px] bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-lg uppercase font-bold tracking-tighter flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                                Active Identity
                              </span>
                            )}
                            <button
                              onClick={async () => {
                                setValidationStatus({
                                  type: "success",
                                  message: `INITIATING NEURAL PROBE: CRAWLING ${k.provider.toUpperCase()} QUOTA...`,
                                });
                                const result = await geminiService.checkKey(
                                  k.key,
                                  k.provider,
                                );
                                if (result.valid) {
                                  const discovered = result.models || [];
                                  setApiKeys((prev) =>
                                    prev.map((prevK) =>
                                      prevK.id === k.id
                                        ? {
                                            ...prevK,
                                            models: discovered.map((m) => m.id),
                                          }
                                        : prevK,
                                    ),
                                  );
                                  setValidationStatus({
                                    type: "success",
                                    message: `SUCCESS: NODE_MAP & QUOTA_CRAWL COMPLETE`,
                                  });
                                  setTimeout(
                                    () => setValidationStatus(null),
                                    2000,
                                  );
                                } else {
                                  setValidationStatus({
                                    type: "error",
                                    message: `CRAWL FAILED: ${result.error}`,
                                  });
                                }
                              }}
                              className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-4 py-2 rounded-lg hover:text-white transition-all uppercase font-bold tracking-tighter flex items-center gap-1.5"
                            >
                              <RefreshCw
                                size={12}
                                className={isLoading ? "animate-spin" : ""}
                              />{" "}
                              Refresh
                            </button>
                            <button
                              onClick={() => {
                                setApiKeys((prev) =>
                                  prev.filter((ik) => ik.id !== k.id),
                                );
                                if (activeKeyId === k.id) setActiveKeyId("");
                                setManagingKeyId(null);
                              }}
                              className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-all uppercase font-bold tracking-tighter flex items-center gap-1.5"
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          </div>
                        </div>
                        {validationStatus && (
                          <div
                            className={cn(
                              "p-3 rounded-xl border text-[9px] font-mono animate-in slide-in-from-top-1 text-left mt-2",
                              validationStatus.type === "error"
                                ? "bg-red-500/10 border-red-500/20 text-red-400"
                                : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.05)]",
                            )}
                          >
                            <span className="font-bold mr-1">
                              {validationStatus.type === "error"
                                ? "▶ ERROR:"
                                : "▶ STATUS:"}
                            </span>
                            {validationStatus.message}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                            Node Queue Management
                          </label>
                          <div className="flex items-center gap-4">
                            <button
                              onClick={async () => {
                                try {
                                  const updated = await apiClient.post<any[]>(
                                    "/api/models/refresh",
                                  );
                                  setGlobalModelCatalog(updated);
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                              className="text-[10px] text-zinc-500 hover:text-cyan-400 uppercase tracking-widest font-mono flex items-center gap-1"
                            >
                              <RefreshCw size={10} />
                              Refresh Global Catalog
                            </button>
                            <span className="text-[10px] font-mono text-zinc-600">
                              Active Priority
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                          {(() => {
                            const queueModels = k.models || [];
                            return queueModels.map((rawModelId, idx) => {
                              const isOff = rawModelId.startsWith("OFF:");
                              const modelId = isOff
                                ? rawModelId.substring(4)
                                : rawModelId;
                              return (
                                <div
                                  key={`${rawModelId}-${idx}`}
                                  className="flex flex-col gap-2 p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl group/node"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <div className="w-6 h-6 rounded-lg bg-zinc-950 flex items-center justify-center text-[10px] font-mono text-zinc-600 font-bold shrink-0">
                                        {idx + 1}
                                      </div>
                                      <div className="flex flex-col">
                                        {(() => {
                                          const info = globalModelCatalog.find(
                                            (m) => m.id === modelId,
                                          );
                                          const displayName =
                                            info?.name ||
                                            modelId.split("/").pop();
                                          return (
                                            <>
                                              <span
                                                className={cn(
                                                  "text-[10px] font-mono truncate uppercase tracking-tight",
                                                  isOff
                                                    ? "text-zinc-600 line-through"
                                                    : "text-zinc-300",
                                                )}
                                              >
                                                {displayName}
                                              </span>
                                              {info && (
                                                <div className="flex items-center gap-2 mt-1">
                                                  <span className="text-[8px] font-mono text-zinc-500 bg-zinc-950 px-1 py-0.5 rounded border border-zinc-800">
                                                    CTX:{" "}
                                                    {info.contextLength || "?"}
                                                  </span>
                                                  <span
                                                    className={cn(
                                                      "text-[8px] font-mono px-1 py-0.5 rounded border",
                                                      info.canUseTool
                                                        ? "text-green-500/80 bg-green-500/10 border-green-500/20"
                                                        : "text-red-500/80 bg-red-500/10 border-red-500/20",
                                                    )}
                                                  >
                                                    TOOLS:{" "}
                                                    {info.canUseTool
                                                      ? "YES"
                                                      : "NO"}
                                                  </span>
                                                </div>
                                              )}
                                            </>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover/node:opacity-100 transition-opacity">
                                      <button
                                        disabled={idx === 0}
                                        onClick={() => {
                                          setApiKeys((prev) =>
                                            prev.map((ik) => {
                                              if (ik.id === k.id && ik.models) {
                                                const next = [...ik.models];
                                                [next[idx], next[idx - 1]] = [
                                                  next[idx - 1],
                                                  next[idx],
                                                ];
                                                return { ...ik, models: next };
                                              }
                                              return ik;
                                            }),
                                          );
                                        }}
                                        className="p-1 text-zinc-600 hover:text-cyan-400 disabled:opacity-30"
                                      >
                                        <ChevronUp size={14} />
                                      </button>
                                      <button
                                        disabled={
                                          idx === queueModels.length - 1
                                        }
                                        onClick={() => {
                                          setApiKeys((prev) =>
                                            prev.map((ik) => {
                                              if (ik.id === k.id && ik.models) {
                                                const next = [...ik.models];
                                                [next[idx], next[idx + 1]] = [
                                                  next[idx + 1],
                                                  next[idx],
                                                ];
                                                return { ...ik, models: next };
                                              }
                                              return ik;
                                            }),
                                          );
                                        }}
                                        className="p-1 text-zinc-600 hover:text-cyan-400 disabled:opacity-30"
                                      >
                                        <ChevronDown size={14} />
                                      </button>
                                      <button
                                        disabled={
                                          idx === 0 &&
                                          !isOff &&
                                          queueModels.filter(
                                            (m) => !m.startsWith("OFF:"),
                                          ).length === 1
                                        }
                                        onClick={() => {
                                          setApiKeys((prev) =>
                                            prev.map((ik) => {
                                              if (ik.id === k.id && ik.models) {
                                                const next = ik.models.filter(
                                                  (_, i) => i !== idx,
                                                );
                                                const newVal = isOff
                                                  ? modelId
                                                  : `OFF:${modelId}`;
                                                next.push(newVal);
                                                return { ...ik, models: next };
                                              }
                                              return ik;
                                            }),
                                          );
                                        }}
                                        className={cn(
                                          "w-7 h-3.5 rounded-full transition-colors relative flex items-center shadow-inner shrink-0",
                                          idx === 0 &&
                                            queueModels.filter(
                                              (m) => !m.startsWith("OFF:"),
                                            ).length === 1 &&
                                            !isOff
                                            ? "opacity-50 cursor-not-allowed"
                                            : "cursor-pointer",
                                          isOff
                                            ? "bg-black border border-zinc-800"
                                            : "bg-cyan-500/20 border border-cyan-500/50",
                                        )}
                                        title={
                                          isOff
                                            ? "Enable model"
                                            : "Disable model"
                                        }
                                      >
                                        <div
                                          className={cn(
                                            "w-2.5 h-2.5 rounded-full transition-all absolute",
                                            isOff
                                              ? "bg-zinc-600 left-0.5"
                                              : "bg-cyan-400 right-0.5 shadow-[0_0_5px_rgba(34,211,238,0.8)]",
                                          )}
                                        />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                        <div className="pt-2 border-t border-zinc-900 flex flex-col gap-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                            Add Custom Model to Provider
                          </label>
                          <div className="flex gap-2 items-center flex-wrap">
                            <input
                              type="text"
                              placeholder="Model ID (e.g. gpt-4)"
                              value={newModelId}
                              onChange={(e) => setNewModelId(e.target.value)}
                              className="flex-1 min-w-[120px] bg-black border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                            />
                            <input
                              type="text"
                              placeholder="Name (e.g. GPT-4)"
                              value={newModelName}
                              onChange={(e) => setNewModelName(e.target.value)}
                              className="flex-1 min-w-[120px] bg-black border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                            />
                            <input
                              type="text"
                              placeholder="Max Context"
                              value={newModelContext}
                              onChange={(e) =>
                                setNewModelContext(e.target.value)
                              }
                              className="w-24 bg-black border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                            />
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newModelTools}
                                onChange={(e) =>
                                  setNewModelTools(e.target.checked)
                                }
                                className="w-3 h-3 bg-black border-zinc-800 rounded"
                              />
                              <span className="text-[10px] text-zinc-500">
                                Tools
                              </span>
                            </label>
                            <button
                              onClick={async () => {
                                if (!newModelId.trim()) return;
                                const newM = {
                                  id: newModelId.trim(),
                                  name:
                                    newModelName.trim() || newModelId.trim(),
                                  provider: k.provider,
                                  contextLength: newModelContext.trim(),
                                  canUseTool: newModelTools,
                                };

                                // Update global catalog in state
                                setGlobalModelCatalog((prev) => {
                                  if (prev.find((m) => m.id === newM.id))
                                    return prev;
                                  return [...prev, newM];
                                });

                                // Post to backend to save in Supabase
                                await apiClient
                                  .post("/api/models/custom", newM)
                                  .catch(console.error);

                                // Add to provider's queue
                                setApiKeys((prev) =>
                                  prev.map((ik) => {
                                    if (ik.id === k.id) {
                                      return {
                                        ...ik,
                                        models: [...(ik.models || []), newM.id],
                                      };
                                    }
                                    return ik;
                                  }),
                                );

                                setNewModelId("");
                                setNewModelName("");
                                setNewModelContext("");
                                setNewModelTools(false);
                              }}
                              className="bg-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded text-[10px] uppercase font-bold hover:bg-cyan-500/30 transition-colors"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in">
                <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                  {apiKeys.length === 0 && (
                    <div className="text-[10px] text-zinc-600 italic p-8 bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-800 text-center">
                      No security tokens mapped to this terminal.
                    </div>
                  )}
                  {apiKeys.map((k) => (
                    <div
                      key={k.id}
                      onClick={() => setManagingKeyId(k.id)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all group/key relative overflow-hidden cursor-pointer",
                        activeKeyId === k.id
                          ? "bg-cyan-900/10 border-cyan-500/30 ring-1 ring-cyan-500/20"
                          : "bg-black/40 border-zinc-900 hover:border-zinc-800",
                      )}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-inner",
                            activeKeyId === k.id
                              ? "bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                              : "bg-zinc-900 text-zinc-600 group-hover/key:bg-zinc-800",
                          )}
                        >
                          {(() => {
                            const Icon = Shield;
                            return <Icon size={18} />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={cn(
                              "text-xs font-bold uppercase tracking-tight",
                              activeKeyId === k.id
                                ? "text-cyan-400"
                                : "text-zinc-400 transition-colors group-hover/key:text-zinc-200",
                            )}
                          >
                            {(k as any).name}{" "}
                            <span className="text-[8px] opacity-40 ml-2 font-mono">
                              [
                              {PROVIDER_CONFIGS[k.provider]?.name || k.provider}
                              ]
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-zinc-600 mt-0.5 tracking-widest truncate">
                            ••••••••{k.key.slice(-4)}
                          </div>
                          {k.models && (
                            <div className="text-[8px] font-mono text-cyan-500/50 mt-1 uppercase">
                              {k.models.length} Nodes Mapped
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeKeyId === k.id && (
                          <motion.div
                            initial={{ opacity: 0, x: 5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 mr-2"
                          >
                            Active
                          </motion.div>
                        )}
                        <ChevronRight
                          size={14}
                          className="text-zinc-600 group-hover/key:text-cyan-400 transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
