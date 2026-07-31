import React from 'react';
import { Cpu, Search, Check, Sparkles, X, ChevronDown, Activity, Globe, Database, Settings2, Lock, Plus, Save, Clock, Bot, Terminal, BookOpen, Key, Link as LinkIcon, Trash2, Edit2, Download, LogOut, CheckCircle, XCircle, AlertTriangle, Shield, CheckSquare, Settings, RefreshCw, Eye, EyeOff, Zap, ShieldAlert, GitBranch, Github, Code, Play } from 'lucide-react';

import { Paperclip, Code2 } from 'lucide-react';
const ICON_MAP: Record<string, any> = {};

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

export function SkillsView(props: any) {


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
                    Skills Lab
                  </h1>
                  <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest tracking-tighter opacity-60">
                    Design and Inject Neural Capabilities
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[9px] font-mono text-cyan-500/80 px-2 py-0.5 bg-cyan-950/20 border border-cyan-900/30 rounded uppercase">
                    Core Sync: Active
                  </span>
                  <div className="h-1 w-32 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 w-2/3" />
                  </div>
                </div>
              </header>

              {/* Generator Module */}
              <section
                className={cn(
                  "p-8 rounded-2xl shadow-xl relative overflow-hidden group border",
                  theme === "light"
                    ? "bg-white border-slate-200"
                    : "bg-surface-card border-border-dim",
                )}
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                  <Sparkles
                    size={120}
                    className={theme === "light" ? "text-slate-200" : ""}
                  />
                </div>
                <div className="relative z-10">
                  <h2
                    className={cn(
                      "text-sm font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2",
                      theme === "light" ? "text-slate-500" : "text-zinc-300",
                    )}
                  >
                    <Plus size={16} className="text-cyan-500" />
                    Automated Neural Structuring
                  </h2>
                  <div className="flex gap-4">
                    <input
                      value={newSkillPrompt}
                      onChange={(e) => setNewSkillPrompt(e.target.value)}
                      placeholder="Describe a specialized role (e.g. Kubernetes Cluster Architect)..."
                      className={cn(
                        "flex-1 border rounded-lg px-4 py-3 text-sm font-mono outline-none focus:border-cyan-500 transition-colors shadow-inner",
                        theme === "light"
                          ? "bg-slate-50 border-slate-200 text-slate-800"
                          : "bg-surface-dark border-zinc-800 text-zinc-100",
                      )}
                    />
                    <button
                      onClick={handleCreateSkill}
                      disabled={isCreatingSkill || !newSkillPrompt}
                      className={cn(
                        "px-8 rounded-lg font-mono text-xs font-bold uppercase transition-all bg-cyan-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]",
                        (isCreatingSkill || !newSkillPrompt) &&
                          "opacity-30 grayscale cursor-not-allowed",
                      )}
                    >
                      {isCreatingSkill ? "Infecting Path..." : "Initialize"}
                    </button>
                  </div>

                  <div className="mt-8 pt-8 border-t border-white/5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                      <Github size={14} />
                      External Intelligence Bridge
                    </h3>
                    <div className="flex gap-3">
                      <div className="flex-1 bg-black/40 rounded-xl border border-white/5 p-1 focus-within:border-purple-500/30 transition-all">
                        <input
                          type="text"
                          placeholder="GitHub Repository URL (Intelligence Pattern)"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                          className="w-full bg-transparent px-4 py-3 text-xs font-mono outline-none text-purple-300 placeholder:text-zinc-700"
                        />
                      </div>
                      <button
                        onClick={props.handleGithubImport}
                        disabled={isImportingGithub || !githubUrl}
                        className="px-6 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                      >
                        {isImportingGithub ? "Importing..." : "Bridge Pattern"}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Custom Skill Upload/Form Section */}
              <section
                className={cn(
                  "p-8 rounded-2xl shadow-xl border relative overflow-hidden group",
                  theme === "light"
                    ? "bg-white border-slate-200"
                    : "bg-surface-card border-border-dim",
                )}
              >
                <h2
                  className={cn(
                    "text-sm font-mono font-bold uppercase tracking-widest mb-6 flex items-center gap-2",
                    theme === "light" ? "text-slate-500" : "text-zinc-300",
                  )}
                >
                  <Plus size={16} className="text-purple-500" />
                  Manual Neural Skill Injection
                </h2>
                <form
                  onSubmit={props.handleCreateCustomSkillManual}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold font-mono uppercase text-zinc-500">
                        Skill Name
                      </label>
                      <input
                        type="text"
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                        placeholder="e.g. Kotlin Master"
                        className={cn(
                          "w-full border rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:border-purple-500 transition-colors shadow-inner",
                          theme === "light"
                            ? "bg-slate-50 border-slate-200 text-slate-800"
                            : "bg-surface-dark border-zinc-800 text-zinc-100",
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold font-mono uppercase text-zinc-500">
                        Target Model (Compatibility)
                      </label>
                      <select
                        value={newSkillModel}
                        onChange={(e) => setNewSkillModel(e.target.value)}
                        className={cn(
                          "w-full border rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:border-purple-500 transition-colors shadow-inner cursor-pointer",
                          theme === "light"
                            ? "bg-slate-50 border-slate-200 text-slate-800"
                            : "bg-surface-dark border-zinc-800 text-zinc-100",
                        )}
                      >
                        <option value="">
                          Any Model (General Compatibility)
                        </option>
                        {modelCatalog.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.provider})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold font-mono uppercase text-zinc-500">
                      Node Description
                    </label>
                    <input
                      type="text"
                      value={newSkillDescription}
                      onChange={(e) => setNewSkillDescription(e.target.value)}
                      placeholder="Specify the scope and capabilities of this model skill..."
                      className={cn(
                        "w-full border rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:border-purple-500 transition-colors shadow-inner",
                        theme === "light"
                          ? "bg-slate-50 border-slate-200 text-slate-800"
                          : "bg-surface-dark border-zinc-800 text-zinc-100",
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end pt-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold font-mono uppercase text-zinc-500">
                        Neural Programming File (.md, .txt, .html)
                      </label>
                      <div
                        className={cn(
                          "border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all hover:bg-purple-500/5 relative",
                          theme === "light"
                            ? "border-slate-300 hover:border-purple-500"
                            : "border-zinc-800 hover:border-purple-500/50",
                        )}
                      >
                        <input
                          type="file"
                          accept=".md,.txt,.html"
                          onChange={props.handleUploadSkillFile}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Paperclip size={18} className="text-purple-500" />
                          <span className="text-[10px] font-mono text-zinc-500">
                            {uploadedFileName
                              ? `Loaded: ${uploadedFileName}`
                              : "Drag file here or click to browse"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold font-mono uppercase text-zinc-500">
                        Prompt Matrix Content (Alternative/Preview)
                      </label>
                      <textarea
                        value={newSkillPromptText}
                        onChange={(e) => setNewSkillPromptText(e.target.value)}
                        placeholder="Matrix prompt code will appear here or can be typed/edited directly..."
                        className={cn(
                          "w-full border rounded-xl px-4 py-2 text-[10px] font-mono outline-none focus:border-purple-500 transition-colors h-[54px] resize-none",
                          theme === "light"
                            ? "bg-slate-50 border-slate-200 text-slate-800"
                            : "bg-surface-dark border-zinc-800 text-zinc-100",
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-650 rounded-xl text-white font-mono text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95 cursor-pointer"
                    >
                      Inject Custom Skill
                    </button>
                  </div>
                </form>
              </section>

              {/* Grid of Modules */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-24">
                {[...DEFAULT_SKILLS, ...customSkills].map((skill) => {
                  const Icon = ICON_MAP[skill.icon] || Code2;
                  const isActive = activeSkillIds.includes(skill.id);
                  return (
                    <motion.div
                      layout
                      key={skill.id}
                      onClick={() => toggleSkill(skill.id)}
                      className={cn(
                        "p-6 rounded-2xl border transition-all cursor-pointer relative group",
                        isActive
                          ? theme === "light"
                            ? "bg-cyan-50 border-cyan-200 shadow-[0_10px_30px_rgba(6,182,212,0.1)]"
                            : "bg-cyan-900/10 border-cyan-800/50 shadow-[0_0_30px_rgba(6,182,212,0.05)]"
                          : theme === "light"
                            ? "bg-white border-slate-100 opacity-60 hover:opacity-100 hover:border-slate-200"
                            : "bg-transparent border-zinc-800/30 opacity-40 grayscale hover:opacity-100 hover:border-zinc-700",
                      )}
                    >
                      {skill.isCustom && (
                        <button
                          onClick={(e) => props.removeCustomSkill(e, skill.id)}
                          className={cn(
                            "absolute top-4 right-4 transition-colors p-2",
                            theme === "light"
                              ? "text-slate-300 hover:text-red-500"
                              : "text-zinc-700 hover:text-red-500",
                          )}
                        >
                          <X size={14} />
                        </button>
                      )}
                      <div className="flex items-start gap-5">
                        <div
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                            isActive
                              ? "bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                              : "bg-zinc-800 text-zinc-600",
                          )}
                        >
                          <Icon size={24} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1.5 ">
                            <h3
                              className={cn(
                                "font-bold transition-colors uppercase tracking-tight truncate",
                                theme === "light"
                                  ? "text-slate-700 group-hover:text-cyan-600"
                                  : "text-zinc-200 group-hover:text-white",
                              )}
                            >
                              {skill.name}
                            </h3>
                            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-white/5 text-zinc-500 whitespace-nowrap">
                              {skill.model
                                ? modelCatalog.find((m) => m.id === skill.model)
                                    ?.name || skill.model.split("/").pop()
                                : "All Models"}
                            </span>
                          </div>
                          <p
                            className={cn(
                              "text-[11px] leading-relaxed font-mono line-clamp-2",
                              theme === "light"
                                ? "text-slate-400"
                                : "text-zinc-500",
                            )}
                          >
                            {skill.description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isActive
                                  ? "bg-green-500 animate-pulse"
                                  : "bg-zinc-700",
                              )}
                            />
                            <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                              {isActive ? "Operational" : "Ready"}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              props.handleEditSkill(skill);
                            }}
                            className={cn(
                              "p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-all",
                              theme === "light" &&
                                "bg-slate-100 border-slate-200 text-slate-400",
                            )}
                            title="Refactor Path"
                          >
                            <Settings size={12} />
                          </button>
                        </div>
                        {skill.isCustom && (
                          <span className="text-[8px] font-mono text-purple-500/60 uppercase border border-purple-500/20 px-1.5 py-0.5 rounded">
                            Custom Build
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
  );
}
