import React from 'react';
import { Cpu, Search, Check, Sparkles, X, ChevronDown, Activity, Globe, Database, Settings2, Lock, Plus, Save, Clock, Bot, Terminal, BookOpen, Key, Link as LinkIcon, Trash2, Edit2, Download, LogOut, CheckCircle, XCircle, AlertTriangle, Shield, CheckSquare, Settings, RefreshCw, Eye, EyeOff, Zap, ShieldAlert, GitBranch, Github, Code, Play } from 'lucide-react';

import { modelQueueManager } from '@/services/modelQueueManager';

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

export function ModelsView(props: any) {


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
              <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-border-dim pb-8">
                <div>
                  <h1 className="text-4xl font-mono font-bold tracking-tighter text-white mb-2 uppercase">
                    Model Catalog
                  </h1>
                  <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest tracking-tighter opacity-60">
                    Neural Engine Configurations
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 min-w-[300px]">
                  <div className="relative flex-1">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                    />
                    <input
                      type="text"
                      placeholder="Search models..."
                      value={catalogSearch}
                      onChange={(e) => {
                        setCatalogSearch(e.target.value);
                        setCatalogPage(1);
                      }}
                      className="w-full bg-black/40 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 font-mono transition-all"
                    />
                  </div>
                  <select
                    value={catalogFilter}
                    onChange={(e) => {
                      setCatalogFilter(e.target.value);
                      setCatalogPage(1);
                    }}
                    className="bg-black/40 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500/50 font-mono appearance-none min-w-[120px] transition-all"
                    style={{
                      backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" viewBox="0 0 24 24" stroke="gray"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')`,
                      backgroundRepeat: "no-repeat",
                      backgroundPositionX: "calc(100% - 12px)",
                      backgroundPositionY: "center",
                      backgroundSize: "12px",
                    }}
                  >
                    <option value="">All Providers</option>
                    {[...new Set(modelCatalog.map((m) => m.provider))]
                      .sort()
                      .map((p: any) => (
                        <option key={p} value={p as string}>
                          {p}
                        </option>
                      ))}
                  </select>
                </div>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                {modelCatalog.length === 0 ? (
                  <div className="col-span-full text-zinc-500 text-xs text-center py-6 font-mono border border-dashed border-zinc-800 rounded-xl">
                    Fetching latest models mapping... Please wait or refresh
                    later.
                  </div>
                ) : (
                  (() => {
                    const filteredAndSorted = [...modelCatalog]
                      .filter((m) => {
                        if (catalogFilter && m.provider !== catalogFilter)
                          return false;
                        if (
                          catalogSearch &&
                          !m.name
                            .toLowerCase()
                            .includes(catalogSearch.toLowerCase()) &&
                          !m.id
                            .toLowerCase()
                            .includes(catalogSearch.toLowerCase())
                        )
                          return false;
                        return true;
                      })
                      .sort((a, b) => {
                        const activeModels = activeKeyId
                          ? apiKeys.find((k) => k.id === activeKeyId)?.models || []
                          : (globalEnabledModels.length > 0 ? globalEnabledModels : modelQueueManager.getQueue());
                        const aActive = activeModels.includes(a.id);
                        const bActive = activeModels.includes(b.id);
                        if (aActive && !bActive) return -1;
                        if (!aActive && bActive) return 1;
                        if (aActive && bActive)
                          return (
                            activeModels.indexOf(a.id) -
                            activeModels.indexOf(b.id)
                          );
                        return 0;
                      });

                    const MODELS_PER_PAGE = 30;
                    const totalPages =
                      Math.ceil(filteredAndSorted.length / MODELS_PER_PAGE) ||
                      1;
                    const paginatedModels = filteredAndSorted.slice(
                      (catalogPage - 1) * MODELS_PER_PAGE,
                      catalogPage * MODELS_PER_PAGE,
                    );

                    return (
                      <>
                        {paginatedModels.map((model) => {
                          const activeModels = activeKeyId
                            ? apiKeys.find((k) => k.id === activeKeyId)?.models || []
                            : (globalEnabledModels.length > 0 ? globalEnabledModels : modelQueueManager.getQueue());
                          const isActiveModel = activeModels.includes(model.id);
                          return (
                            <div
                              key={`${model.provider}-${model.id}`}
                              className={cn(
                                "p-5 bg-black/40 border rounded-2xl relative overflow-hidden flex flex-col gap-3 group transition-colors",
                                isActiveModel
                                  ? "border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                                  : "border-zinc-900 hover:border-cyan-500/30",
                              )}
                            >
                              <div
                                className={cn(
                                  "absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] pointer-events-none transition-colors",
                                  isActiveModel
                                    ? "bg-cyan-500/10"
                                    : "bg-cyan-500/5 group-hover:bg-cyan-500/10",
                                )}
                              />
                              <div className="flex items-start justify-between relative z-10">
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    {isActiveModel && (
                                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
                                    )}
                                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                                      {model.name}
                                    </h3>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest hover:text-cyan-400 cursor-default">
                                      {model.provider}
                                    </span>
                                    {model.architecture && (
                                      <span className="text-[10px] text-zinc-500 font-mono tracking-tighter truncate max-w-[150px]">
                                        {model.architecture}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 relative z-10">
                                  {model.contextLength && (
                                    <div className="flex flex-col flex-end items-end text-right">
                                      <span className="text-[14px] font-mono font-bold text-emerald-500">
                                        {Number(
                                          model.contextLength,
                                        ).toLocaleString()}
                                      </span>
                                      <span className="text-[8px] text-zinc-600 font-mono tracking-tighter uppercase font-bold">
                                        Max Context
                                      </span>
                                    </div>
                                  )}
                                  <button
                                    onClick={() => {
                                      if (activeKeyId) {
                                        setApiKeys(prev => prev.map(k => {
                                          if (k.id === activeKeyId) {
                                            const hasOn = k.models?.includes(model.id);
                                            const hasOff = k.models?.includes(`OFF:${model.id}`);
                                            
                                            if (hasOn && k.models?.filter(m => !m.startsWith("OFF:")).length === 1) return k; // prevent turning off only core node
                                            
                                            let updated = [...(k.models || [])];
                                            if (hasOn) {
                                              updated = updated.filter(m => m !== model.id);
                                              updated.push(`OFF:${model.id}`);
                                            } else {
                                              if (hasOff) updated = updated.filter(m => m !== `OFF:${model.id}`);
                                              updated.push(model.id); // Or insert before the first OFF: item to be safe, but push is fine
                                            }
                                            return { ...k, models: updated };
                                          }
                                          return k;
                                        }));
                                      } else {
                                        const currentDefaults = modelQueueManager.getQueue(); // defaults from system
                                        const activeList = globalEnabledModels.length > 0 ? globalEnabledModels : currentDefaults;
                                        const hasOn = activeList.includes(model.id);
                                        const hasOff = activeList.includes(`OFF:${model.id}`);
                                        if (hasOn && activeList.filter(m => !m.startsWith("OFF:")).length === 1) return;
                                        
                                        let updated = [...activeList];
                                        if (hasOn) {
                                          updated = updated.filter(m => m !== model.id);
                                          updated.push(`OFF:${model.id}`);
                                        } else {
                                          if (hasOff) updated = updated.filter(m => m !== `OFF:${model.id}`);
                                          updated.push(model.id);
                                        }
                                        setGlobalEnabledModels(updated);
                                      }
                                    }}
                                    className={cn(
                                      "w-8 h-4 rounded-full transition-colors relative flex items-center shadow-inner shrink-0 cursor-pointer",
                                      isActiveModel ? "bg-cyan-500/20 border border-cyan-500/50" : "bg-black border border-zinc-800 hover:border-zinc-700"
                                    )}
                                  >
                                    <div className={cn(
                                      "w-3 h-3 rounded-full transition-all absolute",
                                      isActiveModel ? "bg-cyan-400 right-0.5 shadow-[0_0_5px_rgba(34,211,238,0.8)]" : "bg-zinc-600 left-0.5"
                                    )} />
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-zinc-400 relative z-10 leading-relaxed font-light line-clamp-3">
                                {model.description}
                              </p>
                              {model.pricing && (
                                <div className="flex gap-6 mt-2 pt-4 border-t border-white/5 relative z-10">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] uppercase tracking-widest font-mono text-zinc-600 text-left">
                                      Prompt Cost
                                    </span>
                                    <span className="text-[11px] font-mono font-bold text-amber-500/90 text-left">
                                      $
                                      {Number(model.pricing.prompt || 0) *
                                        1000000}{" "}
                                      <span className="text-zinc-600 font-normal">
                                        / 1M
                                      </span>
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[8px] uppercase tracking-widest font-mono text-zinc-600 text-left">
                                      Completion Cost
                                    </span>
                                    <span className="text-[11px] font-mono font-bold text-amber-500/90 text-left">
                                      $
                                      {Number(model.pricing.completion || 0) *
                                        1000000}{" "}
                                      <span className="text-zinc-600 font-normal">
                                        / 1M
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {totalPages > 1 && (
                          <div className="col-span-full flex items-center justify-center gap-4 mt-8 pt-6 border-t border-zinc-900/50">
                            <button
                              onClick={() =>
                                setCatalogPage(Math.max(1, catalogPage - 1))
                              }
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
                              onClick={() =>
                                setCatalogPage(
                                  Math.min(totalPages, catalogPage + 1),
                                )
                              }
                              disabled={catalogPage === totalPages}
                              className="px-4 py-2 border border-zinc-800 rounded-xl text-zinc-400 text-xs font-mono disabled:opacity-30 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
  );
}
