import React from 'react';
import { Cpu, Search, Check, Sparkles, X, ChevronDown, Activity, Globe, Database, Settings2, Lock, Plus, Save, Clock, Bot, Terminal, BookOpen, Key, Link as LinkIcon, Trash2, Edit2, Download, LogOut, CheckCircle, XCircle, AlertTriangle, Shield, CheckSquare, Settings, RefreshCw, Eye, EyeOff, Zap, ShieldAlert, GitBranch, Github, Code, Play } from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

export function KnowledgeView(props: any) {


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
            <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4">
              <header className="flex justify-between items-end border-b border-border-dim pb-8">
                <div>
                  <h1 className="text-4xl font-mono font-bold tracking-tighter text-white mb-2 uppercase">
                    Knowledge Engine
                  </h1>
                  <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest opacity-60">
                    Manage Model RAG Semantic Memories
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                    Active Index Status
                  </span>
                  <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-24">
                {/* Left Column: tester & proposals */}
                <div className="lg:col-span-7 space-y-8">
                  {/* Similarity tester block */}
                  <div
                    className={cn(
                      "p-6 rounded-2xl border space-y-4 shadow-sm",
                      theme === "light"
                        ? "bg-slate-50 border-slate-200"
                        : "bg-zinc-950/40 border-zinc-900",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Database className="text-cyan-500" size={18} />
                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                        Search Similarity Vector Tester
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={kSearchQuery}
                        onChange={(e) => setKSearchQuery(e.target.value)}
                        placeholder="Type model memories query to test..."
                        className="flex-1 bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-white outline-none focus:border-cyan-500 transition-colors"
                      />
                      <button
                        onClick={handleKSearch}
                        disabled={isKSearching}
                        className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                      >
                        {isKSearching ? "Searching..." : "Test Index"}
                      </button>
                    </div>

                    {kSearchError && (
                      <div className="text-xs text-red-500 mt-1 font-mono">
                        {kSearchError}
                      </div>
                    )}

                    {kSearchResults.length > 0 && (
                      <div className="pt-2 space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar">
                        {kSearchResults.map((node) => (
                          <div
                            key={node.id}
                            className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-900 space-y-2"
                          >
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-cyan-400 font-bold uppercase">
                                {node.nodeType.toUpperCase()}
                              </span>
                              <span className="text-emerald-400 font-bold">
                                Cosine Dist: {node.similarity.toFixed(4)}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-300 font-mono leading-relaxed">
                              {node.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Propose New Memory Node block */}
                  <div
                    className={cn(
                      "p-6 rounded-2xl border space-y-4 shadow-sm",
                      theme === "light"
                        ? "bg-slate-50 border-slate-200"
                        : "bg-zinc-950/40 border-zinc-900",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles
                        className="text-emerald-500 animate-pulse"
                        size={18}
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Add / Propose New Memory Record
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase block mb-1 font-semibold">
                          Knowledge Content
                        </label>
                        <textarea
                          rows={4}
                          value={newProposalContent}
                          onChange={(e) =>
                            setNewProposalContent(e.target.value)
                          }
                          placeholder="Paste or type knowledge definition here. E.g., 'Free Model Provider Hugging Face Hub: Has a generous free tier for low-volume inference API. Run locally with transformers.js...'"
                          className="w-full bg-black/40 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-white outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase block mb-1 font-semibold">
                          Proposal Reason / Justification (optional)
                        </label>
                        <input
                          type="text"
                          value={newProposalReason}
                          onChange={(e) => setNewProposalReason(e.target.value)}
                          placeholder="Why are you adding this? (e.g. Reference on free models)"
                          className="w-full bg-black/40 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>

                      <button
                        onClick={handleCreateNewProposal}
                        disabled={isSubmittingProposal}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md uppercase tracking-wider"
                      >
                        {isSubmittingProposal
                          ? "Proposing..."
                          : "Submit New Memory Proposal"}
                      </button>
                    </div>
                  </div>

                  {/* Proposals Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-border-dim pb-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                        Pending & History Proposals
                      </label>
                      <span className="text-[10px] font-mono bg-zinc-900 text-zinc-500 px-2 py-0.5 rounded-full">
                        {knowledgeProposals.length} total
                      </span>
                    </div>

                    {knowledgeProposals.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl text-xs text-zinc-500">
                        No model-proposed index modifications found.
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {knowledgeProposals.map((prop) => (
                          <div
                            key={prop.id}
                            className={cn(
                              "p-5 rounded-2xl border flex flex-col gap-4 shadow-sm transition-all",
                              theme === "light"
                                ? "bg-white border-slate-200"
                                : "bg-[#0c0c0e] border-zinc-900",
                            )}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider",
                                    prop.actionType === "INSERT" &&
                                      "bg-green-500/10 text-green-400 border border-green-500/20",
                                    prop.actionType === "UPDATE" &&
                                      "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                                    prop.actionType === "DELETE" &&
                                      "bg-red-500/10 text-red-400 border border-red-500/20",
                                  )}
                                >
                                  {prop.actionType}
                                </span>
                                {prop.targetNodeId && (
                                  <span className="text-[9px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded">
                                    Node Ref: {prop.targetNodeId.slice(0, 8)}...
                                  </span>
                                )}
                              </div>
                              <span
                                className={cn(
                                  "text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider",
                                  prop.status === "PENDING" &&
                                    "bg-amber-500/10 text-amber-500",
                                  prop.status === "APPROVED" &&
                                    "bg-emerald-500/10 text-emerald-500",
                                  prop.status === "REJECTED" &&
                                    "bg-zinc-500/10 text-zinc-400",
                                )}
                              >
                                {prop.status}
                              </span>
                            </div>

                            <div className="text-xs space-y-1">
                              <span className="text-[9px] text-zinc-500 font-mono uppercase block">
                                Proposed Content:
                              </span>
                              {editingProposalId === prop.id ? (
                                <div className="space-y-3">
                                  <textarea
                                    value={editingProposalContent}
                                    onChange={(e) =>
                                      setEditingProposalContent(e.target.value)
                                    }
                                    className="w-full h-28 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-350 outline-none focus:border-cyan-500"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() =>
                                        handleSaveProposalEdit(prop.id)
                                      }
                                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs uppercase font-bold transition-colors"
                                    >
                                      Save Content
                                    </button>
                                    <button
                                      onClick={() => setEditingProposalId(null)}
                                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs uppercase font-bold transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {prop.actionType === "UPDATE" &&
                                    prop.targetNodeId && (
                                      <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-900 font-mono text-xs text-zinc-400">
                                        <span className="text-[9px] text-zinc-500 font-mono uppercase block mb-1">
                                          Original Active Memory:
                                        </span>
                                        {(() => {
                                          const targetNode =
                                            knowledgeNodes.find(
                                              (node) =>
                                                node.id === prop.targetNodeId,
                                            );
                                          return targetNode
                                            ? targetNode.content
                                            : "(Memory not found)";
                                        })()}
                                      </div>
                                    )}
                                  <div
                                    className={cn(
                                      "p-3 rounded-xl border font-mono text-xs text-zinc-300 break-words whitespace-pre-wrap max-h-[160px] overflow-y-auto custom-scrollbar",
                                      prop.actionType === "DELETE"
                                        ? "bg-red-950/15 border-red-900/25 text-red-200"
                                        : "bg-black/40 border-zinc-900",
                                    )}
                                  >
                                    {prop.actionType === "DELETE" ? (
                                      <>
                                        <span className="text-[9px] text-red-400 font-mono uppercase block mb-1">
                                          Target Active Memory to Delete:
                                        </span>
                                        {(() => {
                                          const targetNode =
                                            knowledgeNodes.find(
                                              (node) =>
                                                node.id === prop.targetNodeId,
                                            );
                                          return targetNode
                                            ? targetNode.content
                                            : "(Memory content not active/already deleted)";
                                        })()}
                                      </>
                                    ) : (
                                      prop.proposedContent ||
                                      "(No content proposed)"
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {prop.reason && (
                              <p className="text-xs italic text-zinc-400 font-mono bg-zinc-950/20 p-3 rounded-lg border border-zinc-900/50">
                                &ldquo;{prop.reason}&rdquo;
                              </p>
                            )}

                            {prop.status === "PENDING" && (
                              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-900/50">
                                {editingProposalId !== prop.id && (
                                  <button
                                    disabled={Object.keys(isKnowledgeActionLoading).length > 0}
                                    onClick={() => {
                                      setEditingProposalId(prop.id);
                                      setEditingProposalContent(
                                        prop.proposedContent || "",
                                      );
                                    }}
                                    className="px-4 py-2 border border-zinc-805 hover:border-zinc-700 text-zinc-400 text-xs font-bold uppercase rounded-lg transition-all mr-auto"
                                  >
                                    Edit Details
                                  </button>
                                )}
                                <button
                                  disabled={Object.keys(isKnowledgeActionLoading).length > 0}
                                  onClick={() => handleRejectProposal(prop.id)}
                                  className="px-4 py-2 border border-red-900/40 bg-red-950/10 hover:bg-red-950/20 text-red-400 text-xs font-bold uppercase rounded-lg transition-all"
                                >
                                  Reject
                                </button>
                                <button
                                  disabled={Object.keys(isKnowledgeActionLoading).length > 0}
                                  onClick={() => handleApproveProposal(prop.id)}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-lg transition-all shadow"
                                >
                                  {isKnowledgeActionLoading[prop.id]
                                    ? "Approving..."
                                    : "Approve & Index"}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: active index list */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-border-dim pb-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                      Indexed Knowledge Records
                    </label>
                    <span className="text-[10px] font-mono bg-cyan-950/30 border border-cyan-900/20 text-cyan-400 px-2 py-0.5 rounded-full">
                      {knowledgeNodes.length} active
                    </span>
                  </div>

                  {knowledgeNodes.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl text-xs text-zinc-400">
                      No active knowledge records found.
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[750px] overflow-y-auto pr-2 custom-scrollbar">
                      {knowledgeNodes.map((node) => (
                        <div
                          key={node.id}
                          className={cn(
                            "p-5 rounded-2xl border flex flex-col gap-3 shadow-xs transition-all",
                            theme === "light"
                              ? "bg-white border-slate-200"
                              : "bg-[#0c0c0e] border-zinc-900",
                          )}
                        >
                          <div className="flex justify-between items-center gap-2 font-sans">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/20 px-2.5 py-0.5 rounded-full border border-cyan-900/30">
                                {node.nodeType || "MEM_RECORD"}
                              </span>
                              {(() => {
                                const pendingProp = knowledgeProposals.find(
                                  (p) =>
                                    p.targetNodeId === node.id &&
                                    p.status === "PENDING",
                                );
                                if (pendingProp?.actionType === "UPDATE") {
                                  return (
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/20 px-2.5 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                                      ● PENDING UPDATE
                                    </span>
                                  );
                                } else if (
                                  pendingProp?.actionType === "DELETE"
                                ) {
                                  return (
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-950/20 px-2.5 py-0.5 rounded-full border border-red-500/30 animate-pulse">
                                      ● PENDING DELETE
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                                      ● ACTIVE
                                    </span>
                                  );
                                }
                              })()}
                            </div>
                            <span className="text-[9px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded">
                              ID: {node.id.slice(0, 8)}...
                            </span>
                          </div>

                          <div className="text-xs space-y-1">
                            {editingNodeId === node.id ? (
                              <div className="space-y-3 animate-in fade-in">
                                <textarea
                                  value={editingNodeContent}
                                  onChange={(e) =>
                                    setEditingNodeContent(e.target.value)
                                  }
                                  className="w-full h-28 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-300 outline-none focus:border-cyan-500"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSaveNodeEdit(node.id)}
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs uppercase font-bold transition-colors"
                                  >
                                    Update Node
                                  </button>
                                  <button
                                    onClick={() => setEditingNodeId(null)}
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs uppercase font-bold transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs font-mono text-zinc-300 leading-relaxed font-sans mt-1 bg-black/20 p-3 rounded-xl border border-zinc-900/50 break-words whitespace-pre-wrap max-h-[160px] overflow-y-auto custom-scrollbar">
                                {node.content}
                              </p>
                            )}
                          </div>

                          {editingNodeId !== node.id && (
                            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900/40">
                              <button
                                onClick={() => {
                                  setEditingNodeId(node.id);
                                  setEditingNodeContent(node.content);
                                }}
                                className="px-3 py-1.5 border border-zinc-800 hover:border-zinc-705 text-zinc-400 text-[10px] font-bold uppercase rounded-lg transition-colors"
                              >
                                Edit Node
                              </button>
                              <button
                                onClick={() => handleDeleteNode(node.id)}
                                className="px-3 py-1.5 border border-red-900/30 hover:bg-red-950/10 text-red-400 text-[10px] font-bold uppercase rounded-lg transition-colors"
                              >
                                Delete Node
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
  );
}
