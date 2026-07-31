import React from 'react';
import { Cpu, Search, Check, Sparkles, X, ChevronDown, Activity, Globe, Database, Settings2, Lock, Plus, Save, Clock, Bot, Terminal, BookOpen, Key, Link as LinkIcon, Trash2, Edit2, Download, LogOut, CheckCircle, XCircle, AlertTriangle, Shield, CheckSquare, Settings, RefreshCw, Eye, EyeOff, Zap, ShieldAlert, GitBranch, Github, Code, Play } from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

export function PerformanceView(props: any) {


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

  return (
          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4">
              <header className="flex justify-between items-end border-b border-border-dim pb-8">
                <div>
                  <h1 className="text-4xl font-mono font-bold tracking-tighter text-white mb-2 uppercase">
                    Performance Metrics
                  </h1>
                  <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest tracking-tighter opacity-60">
                    Neural Telemetry & Usage Analytics
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                    Live Updates
                  </span>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <Database size={20} className="text-zinc-500" />
                    <div className="space-y-1">
                      <span className="text-[12px] font-bold uppercase tracking-tight text-white block">
                        Local Storage
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">
                        Synchronized State
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-zinc-300">
                      Synced{" "}
                      <span className="text-xs text-zinc-600 font-mono">
                        LIVE / FAST ACCES
                      </span>
                    </span>
                  </div>
                </div>
                <div className="p-6 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <Activity size={20} className="text-amber-500" />
                    <div className="space-y-1">
                      <span className="text-[12px] font-bold uppercase tracking-tight text-white block">
                        Engine Health
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">
                        Model Dispatcher
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-emerald-400">
                      Optimal{" "}
                      <span className="text-xs text-zinc-600 font-mono">
                        / NO BOTTLENECKS
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-6 pb-24">
                <h2 className="text-sm font-mono font-bold text-white uppercase tracking-widest border-b border-border-dim pb-4">
                  Node Telemetry
                </h2>
                <div className="grid grid-cols-1 gap-6">
                  {Object.entries(metrics).length === 0 ? (
                    <div className="p-8 text-center bg-zinc-950/20 rounded-2xl border border-dashed border-zinc-900">
                      <Activity
                        size={24}
                        className="mx-auto mb-3 text-zinc-800"
                      />
                      <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                        No metrics recorded yet. Engage models to initiate
                        telemetry.
                      </p>
                    </div>
                  ) : (
                    Object.entries(metrics).map(([modelId, data]: [string, any]) => {
                      const isHealthy = data.errorRate < 10;
                      return (
                        <motion.div
                          key={modelId}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-6 bg-black/40 border border-zinc-900/50 rounded-2xl group hover:border-cyan-500/20 transition-all bg-gradient-to-b from-transparent to-zinc-950/30 shadow-lg"
                        >
                          <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "w-2.5 h-2.5 rounded-full",
                                  isHealthy
                                    ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]"
                                    : "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]",
                                )}
                              />
                              <span className="text-sm font-bold uppercase tracking-tight text-white">
                                {modelId.split("/").pop()}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">
                              Last used:{" "}
                              {new Date(data.lastUsed).toLocaleTimeString()}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-8">
                            <div className="space-y-2 p-4 bg-zinc-900/30 rounded-xl border border-white/5">
                              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none block font-bold">
                                Latency
                              </span>
                              <div className="flex items-baseline gap-1">
                                <span
                                  className={cn(
                                    "text-2xl font-bold font-mono",
                                    data.avgResponseTime < 2000
                                      ? "text-cyan-400"
                                      : data.avgResponseTime < 5000
                                        ? "text-amber-400"
                                        : "text-red-400",
                                  )}
                                >
                                  {(data.avgResponseTime / 1000).toFixed(2)}
                                </span>
                                <span className="text-[10px] text-zinc-600 font-mono">
                                  s avg
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2 p-4 bg-zinc-900/30 rounded-xl border border-white/5">
                              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none block font-bold">
                                Throughput
                              </span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-amber-500 font-mono">
                                  {Math.round(data.tokenRate)}
                                </span>
                                <span className="text-[10px] text-zinc-600 font-mono">
                                  t/s
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2 p-4 bg-zinc-900/30 rounded-xl border border-white/5">
                              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none block font-bold">
                                Reliability
                              </span>
                              <div className="flex items-baseline gap-1">
                                <span
                                  className={cn(
                                    "text-2xl font-bold font-mono",
                                    isHealthy
                                      ? "text-green-400"
                                      : "text-red-400",
                                  )}
                                >
                                  {(100 - data.errorRate).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap justify-between items-center text-xs font-mono uppercase font-bold text-zinc-500">
                            <div className="flex items-center gap-6">
                              <span className="flex items-center gap-2">
                                Success:{" "}
                                <span className="text-emerald-500/80 bg-emerald-500/10 px-2 py-0.5 rounded">
                                  {data.successCount}
                                </span>
                              </span>
                              <span className="flex items-center gap-2">
                                Failures:{" "}
                                <span className="text-red-500/80 bg-red-500/10 px-2 py-0.5 rounded">
                                  {data.failureCount}
                                </span>
                              </span>
                            </div>
                            <span className="flex items-center gap-2">
                              Efficiency Index{" "}
                              <span className="text-cyan-400 bg-cyan-900/40 px-2 py-0.5 rounded">
                                {(
                                  data.tokenRate /
                                  (data.avgResponseTime / 1000 + 1)
                                ).toFixed(2)}
                              </span>
                            </span>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
  );
}
