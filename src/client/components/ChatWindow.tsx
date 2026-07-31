import React from 'react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { ModelSelector } from "./ModelSelector";
import { 
  AlertCircle, ArrowDown, AtSign, Check, ChevronDown, Circle, Code, Cpu, 
  FileIcon, FileText, Image as ImageIcon, Maximize2, Mic, Minimize2, 
  Paperclip, Play, Plus, Search, Send, Settings, Settings as SettingsIcon, Sparkles, Terminal, 
  Trash2, Video, X, Github, AlertTriangle, Shield, Brain, Video as VideoIcon, Code2, Database
} from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { storageService } from '../services/storageService';

export function ChatWindow(props: any) {
  const {
    theme, currentSessionId, editingSessionId, setEditingSessionId,
    editingSessionTitle, setEditingSessionTitle, saveCurrentSession,
    sessions, messages, setMessages, isLoading, user, handleEditMessage,
    handleRevertMessage, messagesEndRef, useSearch, setUseSearch,
    thinkingMode, setThinkingMode, isEnhancingPrompt, isInputMaximized,
    setIsInputMaximized, onDrop, getRootProps, getInputProps, isDragActive,
    attachments, setAttachments, input, setInput, handleKeyDown,
    handleSend, isCommandListDismissed, setIsCommandListDismissed,
    autocompleteSuggestion, showSkillSuggestions, suggestedSkills, setSuggestedSkills,
    selectedCommandIndex, setSelectedCommandIndex, handleCommandSelect, uploadedFileName,
    handleStopGeneration, autoScroll, setAutoScroll, isAutoCompact, setIsAutoCompact,
    isSidebarCollapsed, createNewSession, activeKey, activeApiKey,
    isModelSelectorOpen, setIsModelSelectorOpen, currentModel, setCurrentModel, ModelId,
    modelSearch, setModelSearch, activeKeyId, apiKeys, globalEnabledModels, modelQueueManager, modelCatalog,
    setSettingsTab, setShowSettings, removeAttachment, handlePaste, showCommands,
    filteredCommands, executeCommand, handleEnhancePrompt,
    isImageMode, setIsImageMode, isVideoMode, setIsVideoMode,
    activeSkillIds, setActiveSkillIds, DEFAULT_SKILLS, customSkills,
    handleToggleRepoModal, isRepoModalOpen, setIsRepoModalOpen, setValidationStatus,
    setIsSkillsExpanded, isSkillsExpanded, toggleSkill, toggleSkillSuggestions,
    currentContextTokens, currentModelMaxContext,
    repoUrl, setRepoUrl, handleAddRepo, handleStop, apiKeyWarning, setApiKeyWarning, handleRateMessage,
    setView, ICON_MAP, scrollRef, showInputBox, handleSubmit, setAutocompleteSuggestion
  } = props;
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);

  return (
    <>
          <>
            <AnimatePresence>
              {previewImage && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8"
                  onClick={() => setPreviewImage(null)}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative max-w-5xl max-h-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setPreviewImage(null)}
                      className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors bg-black/50 rounded-full hover:bg-black/80"
                    >
                      <X size={20} />
                    </button>
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            <header
              className={cn(
                "h-16 border-b flex items-center justify-between px-4 sm:px-8 backdrop-blur-md z-10 shrink-0 transition-all",
                theme === "midnight" && "bg-surface-dark/80 border-white/5",
                theme === "cyberpunk" && "bg-[#050505]/80 border-[#00ffcc]/20",
                theme === "monochrome" && "bg-white/80 border-black/10",
                theme === "light" && "bg-white/80 border-slate-200",
              )}
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <span
                  className={cn(
                    "text-[9px] sm:text-[10px] font-mono tracking-widest uppercase truncate",
                    theme === "light" ? "text-slate-400" : "text-[#555]",
                  )}
                >
                  {currentSessionId
                    ? `ID: ${currentSessionId.slice(-8)}`
                    : "NEW_SESSION"}
                </span>
                {isSidebarCollapsed && (
                  <button
                    onClick={createNewSession}
                    className="text-cyan-500 hover:text-cyan-400 transition-colors p-1 shrink-0"
                    title="New Session"
                  >
                    <Plus size={14} />
                  </button>
                )}
                <div className="h-3 w-px bg-border-dim hidden sm:block" />
                <div className="hidden min-[450px]:flex items-center gap-1.5 whitespace-nowrap">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span
                    className={cn(
                      "text-[9px] sm:text-[10px] font-mono uppercase tracking-tighter transition-all",
                      theme === "light"
                        ? "text-green-600"
                        : "text-green-500/80",
                    )}
                  >
                    NEURAL LINK:{" "}
                    {activeKey ? "ENCRYPTED_CUSTOM" : "SYSTEM_NODE"}
                  </span>
                  {activeApiKey && (
                    <Shield size={10} className="text-cyan-500 animate-pulse" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {/* Custom Styled Model Selector */}
                <ModelSelector
                  isModelSelectorOpen={isModelSelectorOpen}
                  setIsModelSelectorOpen={setIsModelSelectorOpen}
                  currentModel={currentModel}
                  setCurrentModel={setCurrentModel}
                  ModelId={ModelId}
                  modelSearch={modelSearch}
                  setModelSearch={setModelSearch}
                  modelCatalog={modelCatalog}
                  apiKeys={apiKeys}
                  activeKeyId={activeKeyId}
                  globalEnabledModels={globalEnabledModels}
                  modelQueueManager={modelQueueManager}
                  theme={theme}
                />

                <div className="h-4 w-px bg-zinc-800 hidden xs:block" />

                <button
                  onClick={() => {
                    setSettingsTab("general");
                    setShowSettings(true);
                  }}
                  className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all border border-transparent hover:border-zinc-800 active:scale-90"
                  title="System Settings"
                >
                  <SettingsIcon size={16} />
                </button>

                <div className="h-4 w-px bg-zinc-800 hidden xs:block" />

                <div className="flex items-center gap-3">
                  <div
                    className="flex flex-col items-end hidden sm:flex cursor-pointer"
                    onClick={() => {
                      setSettingsTab("profile");
                      setShowSettings(true);
                    }}
                  >
                    <span
                      className={cn(
                        "text-xs font-bold leading-tight",
                        theme === "light" ? "text-slate-900" : "text-white",
                      )}
                    >
                      {user?.name || user?.email?.split("@")[0] || "User"}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-mono",
                        theme === "light" ? "text-slate-500" : "text-zinc-500",
                      )}
                    >
                      {user?.isGuest ? "Guest Session" : "Verified"}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      storageService.removeItem("session");
                      window.location.href = "/";
                    }}
                    className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-xs font-bold uppercase transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-4"
            >
              <div className="max-w-4xl mx-auto pb-[50vh]">
                {messages.length === 0 ? (
                  <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center opacity-40">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
                      <Terminal size={32} className="text-zinc-600" />
                    </div>
                    <h2 className="text-xl font-mono text-zinc-400 uppercase tracking-widest mb-2">
                      Terminal Initialization...
                    </h2>
                    <p className="text-xs font-mono text-zinc-600">
                      Awaiting user input sequence
                    </p>
                  </div>
                ) : (
                  messages
                    .filter((m) => m)
                    .map((m, i) => (
                      <ChatMessage
                        key={i}
                        id={m.id}
                        role={m.role}
                        content={m.content}
                        theme={theme}
                        modelName={m.modelName}
                        isFallback={m.isFallback}
                        imageUrl={m.imageUrl}
                        videoUrl={m.videoUrl}
                        onEdit={(content) => handleEditMessage(i, content)}
                        onRevert={(content) => handleRevertMessage(i, content)}
                        attachments={m.attachments}
                        history={m.editHistory}
                        isLatest={
                          i === messages.filter((msg) => msg).length - 1
                        }
                        isLoading={isLoading}
                        userName={user?.name}
                        userAvatarUrl={user?.avatarUrl}
                        rating={m.rating || 0}
                        onRate={(rating) => handleRateMessage(m.id, rating)}
                      />
                    ))
                )}
              </div>
            </div>

            {/* Float Input Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-8 pt-0 pointer-events-none z-30">
              <div className="max-w-4xl mx-auto pointer-events-auto relative">
                {showSkillSuggestions && suggestedSkills.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className={cn(
                      "absolute bottom-full left-0 mb-3 w-full z-50 rounded-xl border shadow-2xl backdrop-blur-xl overflow-hidden",
                      theme === 'light' ? "bg-white/98 border-slate-200" : "bg-[#0b0b0e]/98 border-zinc-800/80"
                    )}
                  >
                    <div className={cn("flex items-center justify-between px-3 py-2 border-b", theme === 'light' ? "border-slate-100" : "border-white/[0.04]")}>
                      <span className={cn("text-[9px] font-mono font-bold uppercase tracking-[0.15em]", theme === 'light' ? "text-slate-400" : "text-zinc-600")}>
                        Skills for this prompt
                      </span>
                      <button onClick={() => toggleSkillSuggestions()} className={cn("transition-colors", theme === 'light' ? "text-slate-300 hover:text-slate-600" : "text-zinc-700 hover:text-zinc-400")}>
                        <X size={12} />
                      </button>
                    </div>
                    <div className="py-1">
                      {suggestedSkills.map(skill => {
                        const Icon = ICON_MAP[skill.icon] || Code2;
                        return (
                          <button
                            key={skill.id}
                            type="button"
                            onClick={() => { toggleSkill(skill.id); setSuggestedSkills([]); }}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 transition-all group/ss",
                              theme === 'light' ? "hover:bg-slate-50" : "hover:bg-white/[0.03]"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0 transition-colors",
                                theme === 'light' ? "bg-slate-200 group-hover/ss:bg-cyan-500" : "bg-zinc-800 group-hover/ss:bg-cyan-500"
                              )} />
                              <div className="min-w-0 text-left">
                                <div className={cn("text-[11px] font-mono font-bold transition-colors", theme === 'light' ? "text-slate-500 group-hover/ss:text-slate-800" : "text-zinc-600 group-hover/ss:text-zinc-300")}>
                                  {skill.name}
                                </div>
                                <div className={cn("text-[9px] font-mono truncate mt-0.5", theme === 'light' ? "text-slate-300" : "text-zinc-700")}>
                                  {skill.description}
                                </div>
                              </div>
                            </div>
                            <span className={cn(
                              "text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 transition-all",
                              theme === 'light' ? "border-slate-200 text-slate-400 group-hover/ss:border-cyan-300 group-hover/ss:text-cyan-600" : "border-zinc-800 text-zinc-700 group-hover/ss:border-cyan-900/50 group-hover/ss:text-cyan-500"
                            )}>
                              + Add
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
                <AnimatePresence>
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex justify-center mb-4"
                    >
                      <button
                        onClick={handleStop}
                        className="flex items-center gap-2 px-4 py-2 bg-red-950/30 border border-red-900/50 text-red-500 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-red-900/50 transition-all shadow-xl backdrop-blur-sm active:scale-95"
                      >
                        <X size={12} />
                        Stop Generation
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div
                  className={cn(
                    "backdrop-blur-xl border rounded-[28px] p-2 relative transition-all duration-500 group/input shadow-2xl flex flex-col",
                    theme === "light"
                      ? "bg-white/95 border-slate-200 shadow-slate-200/50 hover:shadow-slate-300/50 focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus-within:border-slate-300"
                      : "bg-[#111113]/95 border-white/[0.08] focus-within:border-white/[0.15] shadow-black focus-within:shadow-[0_8px_30px_rgba(0,0,0,0.4)]",
                    theme === "cyberpunk" &&
                      "border-[#00ffcc]/20 focus-within:border-[#00ffcc]/40",
                  )}
                >
                  {/* Elegant Focus Gradient Border for dark mode */}
                  {theme !== 'light' && (
                    <div className="absolute -inset-[1px] rounded-[28px] pointer-events-none opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-700 bg-gradient-to-r from-white/10 via-white/5 to-transparent" style={{ WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", padding: "1px" }} />
                  )}
                  
                  {/* Background containment */}
                  <div className="absolute inset-0 rounded-[28px] overflow-hidden pointer-events-none">
                    {theme !== "light" && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                        <div className="absolute -inset-10 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10 opacity-0 group-focus-within/input:opacity-100 blur-3xl transition-opacity duration-1000 pointer-events-none" />
                      </>
                    )}
                  </div>

                  <div className="relative z-10 w-full flex flex-col">
                    {/* Warnings Header */}
                    {apiKeyWarning && (
                      <div className={cn("mx-3 mt-2 mb-1 p-2.5 rounded-xl border flex items-center gap-3 text-xs font-mono shadow-sm", theme === "light" ? "bg-amber-100 border-amber-300 text-amber-900" : "bg-amber-950/20 border-amber-500/30 text-amber-400")}>
                        <AlertTriangle className={cn("shrink-0", theme === "light" ? "text-amber-600" : "text-amber-500")} size={14} />
                        <div className="flex-1"><span>{apiKeyWarning}</span></div>
                        <button onClick={() => { setView("keys"); setShowSettings(false); }} className={cn("px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border", theme === "light" ? "bg-amber-600 border-amber-700 text-white hover:bg-amber-700" : "bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/25")}>Configure</button>
                        <button onClick={() => setApiKeyWarning(null)} className={cn("p-1 rounded-lg transition-colors cursor-pointer", theme === "light" ? "hover:bg-amber-200 text-amber-700" : "hover:bg-amber-500/20 text-amber-400")}><X size={14} /></button>
                      </div>
                    )}
                    {activeSkillIds.some((id) => {
                      const skill = [...DEFAULT_SKILLS, ...customSkills].find((s) => s.id === id);
                      return !!skill && !!skill.model && skill.model !== currentModel;
                    }) && (
                      <div className={cn("mx-3 mt-2 mb-1 p-2.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono", theme === "light" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-amber-950/20 border-amber-800/30 text-amber-400")}>
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className={cn("shrink-0 mt-0.5", theme === "light" ? "text-amber-600" : "text-amber-500")} size={14} />
                          <div>
                            <span className="font-bold uppercase tracking-wider block mb-0.5">Neural Incompatibility Detected</span>
                            <span>Some active skills are model-specific and not optimized for <b>{modelCatalog.find((m) => m.id === currentModel)?.name || currentModel.split("/").pop()}</b>.</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {activeSkillIds.map((id) => [...DEFAULT_SKILLS, ...customSkills].find((s) => s.id === id)).filter((s: any) => !!s && !!s.model && s.model !== currentModel).map((skill) => {
                            const targetModelName = modelCatalog.find((m) => m.id === skill.model)?.name || skill.model?.split("/").pop();
                            return (
                              <button key={skill.id} type="button" onClick={() => setCurrentModel(skill.model!)} className={cn("px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all cursor-pointer", theme === "light" ? "bg-amber-600 text-white border-amber-500 hover:bg-amber-750" : "bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20")}>Switch to {targetModelName}</button>
                            );
                          })}
                          <button type="button" onClick={() => {
                            const incompatibleIds = activeSkillIds.filter((id) => {
                              const skill = [...DEFAULT_SKILLS, ...customSkills].find((s) => s.id === id);
                              return !!skill && !!skill.model && skill.model !== currentModel;
                            });
                            setActiveSkillIds((prev) => prev.filter((id) => !incompatibleIds.includes(id)));
                          }} className={cn("px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border cursor-pointer", theme === "light" ? "bg-slate-100 text-slate-700 border-slate-250 hover:bg-slate-200" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-850")}>Disable Skills</button>
                        </div>
                      </div>
                    )}

                    <AnimatePresence>
                      {showInputBox && (
                        <motion.form
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          onSubmit={handleSubmit}
                          className="flex flex-col relative w-full"
                        >
                          {/* Attachments Section */}
                          {attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 px-3 pt-2 pb-1">
                              {attachments.map((a, i) => {
                                if (a.type?.startsWith('image/')) {
                                  return (
                                    <div key={i} className={cn("flex items-center gap-2 p-1 rounded-lg border animate-in zoom-in-95 duration-200 group/att", theme === 'light' ? "bg-slate-50 border-slate-200 hover:border-cyan-200" : "bg-white/[0.04] border-white/[0.07] hover:border-cyan-900/40")}>
                                      <img 
                                        src={a.content} 
                                        alt={a.name} 
                                        className="h-8 w-8 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity" 
                                        onClick={() => setPreviewImage(a.content)}
                                      />
                                      <button type="button" onClick={() => removeAttachment(i)} className={cn("transition-colors shrink-0 mr-1", theme === 'light' ? "text-slate-300 hover:text-red-500" : "text-zinc-700 hover:text-red-400")}><X size={11} /></button>
                                    </div>
                                  );
                                }
                                if (a.type === 'repo') {
                                  const repoPath = a.name.replace(/^Repo:s*/, '');
                                  const [owner, repo] = repoPath.split('/');
                                  return (
                                    <div key={i} className={cn("flex items-start gap-2.5 p-2 rounded-xl border animate-in zoom-in-95 duration-200 group/att", theme === 'light' ? "bg-slate-50 border-slate-200 hover:border-purple-200" : "bg-[#0d0d14]/80 border-[#1a1a2e] hover:border-purple-900/50")}>
                                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border", theme === 'light' ? "bg-white border-slate-200" : "bg-[#111120] border-[#1f1f35]")}><Github size={13} className="text-purple-500" /></div>
                                      <div className="min-w-0">
                                        <div className={cn("text-[11px] font-mono font-bold leading-tight", theme === 'light' ? "text-slate-600" : "text-[#6060a0]")}><span className="opacity-60">{owner}</span><span className="opacity-40 mx-0.5">/</span><span>{repo}</span></div>
                                      </div>
                                      <button type="button" onClick={() => removeAttachment(i)} className={cn("ml-auto transition-colors shrink-0 mt-0.5", theme === 'light' ? "text-slate-300 hover:text-red-500" : "text-[#1f1f35] hover:text-red-500/70")}><X size={11} /></button>
                                    </div>
                                  );
                                }
                                return (
                                  <div key={i} className={cn("flex items-center gap-2 px-2 py-1.5 rounded-lg border animate-in zoom-in-95 duration-200 group/att", theme === 'light' ? "bg-slate-50 border-slate-200 hover:border-cyan-200" : "bg-white/[0.04] border-white/[0.07] hover:border-cyan-900/40")}>
                                    <FileText size={11} className="text-cyan-400/70 shrink-0" />
                                    <span className={cn("text-[10px] font-mono truncate max-w-[110px]", theme === 'light' ? "text-slate-600" : "text-zinc-400")}>{a.name}</span>
                                    <button type="button" onClick={() => removeAttachment(i)} className={cn("transition-colors shrink-0", theme === 'light' ? "text-slate-300 hover:text-red-500" : "text-zinc-700 hover:text-red-400")}><X size={11} /></button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Clean Input Area */}
                          <div className={cn(
                            "flex flex-col mx-2 mt-1 rounded-2xl relative transition-all",
                            theme === "light"
                              ? "bg-slate-50/50"
                              : "bg-black/20"
                          )}>
                            <textarea
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              onPaste={handlePaste}
                              placeholder={isImageMode ? "Describe the image you want to generate..." : isVideoMode ? "Describe the video you want to generate..." : "Inject system commands..."}
                              className={cn(
                                "w-full bg-transparent resize-none font-mono text-sm leading-relaxed outline-none custom-scrollbar px-4 py-3 relative z-10 transition-all",
                                theme === "light"
                                  ? "placeholder:text-slate-400 text-slate-800"
                                  : "placeholder:text-zinc-600 text-zinc-200",
                                isInputMaximized
                                  ? "min-h-[50vh] max-h-[80vh]"
                                  : "min-h-[140px] max-h-64"
                              )}
                              onKeyDown={(e) => {
                                if (showCommands) {
                                  if (e.key === "ArrowDown") { e.preventDefault(); setSelectedCommandIndex((prev) => (prev + 1) % filteredCommands.length); return; }
                                  if (e.key === "ArrowUp") { e.preventDefault(); setSelectedCommandIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length); return; }
                                  if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); const cmdItem = filteredCommands[selectedCommandIndex]; if (cmdItem) { executeCommand(cmdItem.cmd); setIsCommandListDismissed(true); } return; }
                                  if (e.key === "Escape") { e.preventDefault(); setIsCommandListDismissed(true); return; }
                                }
                                if (e.key === "Tab" && autocompleteSuggestion) { e.preventDefault(); setInput(input + autocompleteSuggestion); setAutocompleteSuggestion("");
                                } else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                              }}
                            />
                            {/* Autocomplete Ghost */}
                            {autocompleteSuggestion && (
                              <div className="absolute left-4 top-3 flex items-baseline gap-0 pointer-events-none overflow-hidden">
                                <span className="font-mono text-sm leading-relaxed opacity-0 whitespace-pre select-none">{input}</span>
                                <span className={cn("font-mono text-sm leading-relaxed truncate", theme === 'light' ? "text-slate-300" : "text-zinc-700")}>{autocompleteSuggestion}</span>
                                <kbd className={cn("text-[8px] font-mono px-1.5 py-0.5 rounded border ml-1.5 shrink-0 self-center", theme === 'light' ? "bg-slate-100 border-slate-200 text-slate-400" : "bg-zinc-900 border-zinc-800 text-zinc-600")}>Tab</kbd>
                              </div>
                            )}

                            {/* Slash command picker */}
                            {showCommands && (
                              <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                className={cn(
                                  "absolute bottom-full left-0 mb-2 w-full rounded-xl border shadow-2xl z-50 backdrop-blur-xl overflow-hidden",
                                  theme === 'light' ? "bg-white/98 border-slate-200 shadow-slate-200/50" : "bg-[#0b0b0e]/98 border-zinc-800/80 shadow-black"
                                )}
                              >
                                <div className={cn("flex items-center justify-between px-3 py-2 border-b", theme === 'light' ? "border-slate-100" : "border-white/[0.04]")}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-sm text-cyan-500">/</span>
                                    <span className={cn("text-[9px] font-mono font-bold uppercase tracking-[0.15em]", theme === 'light' ? "text-slate-400" : "text-zinc-600")}>Commands</span>
                                  </div>
                                  <span className={cn("text-[9px] font-mono", theme === 'light' ? "text-slate-300" : "text-zinc-800")}>↑↓ · Tab</span>
                                </div>
                                <div className="py-1 max-h-52 overflow-y-auto custom-scrollbar">
                                  {filteredCommands.map((cmdItem, idx) => {
                                    const isSelected = idx === selectedCommandIndex;
                                    return (
                                      <div
                                        key={cmdItem.cmd}
                                        onMouseDown={(e) => { e.preventDefault(); executeCommand(cmdItem.cmd); setIsCommandListDismissed(true); }}
                                        onMouseEnter={() => setSelectedCommandIndex(idx)}
                                        className={cn("flex items-center px-3 py-2 cursor-pointer transition-all duration-100", isSelected ? (theme === 'light' ? "bg-slate-50" : "bg-white/[0.035]") : (theme === 'light' ? "hover:bg-slate-50/60" : "hover:bg-white/[0.02]"))}
                                      >
                                        <span className={cn("w-20 text-[11px] font-mono font-bold shrink-0 transition-colors", isSelected ? (theme === 'light' ? "text-cyan-600" : "text-cyan-400") : (theme === 'light' ? "text-slate-400" : "text-zinc-600"))}>{cmdItem.syntax || cmdItem.cmd}</span>
                                        <span className={cn("flex-1 text-[10px] font-mono truncate transition-colors", isSelected ? (theme === 'light' ? "text-slate-600" : "text-zinc-400") : (theme === 'light' ? "text-slate-300" : "text-zinc-700"))}>{cmdItem.description}</span>
                                        {isSelected && <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ml-2", theme === 'light' ? "bg-white border-slate-200 text-slate-500" : "bg-zinc-900 border-zinc-800 text-zinc-600")}>↵</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}

                            <div className="flex items-center justify-between px-2 pt-1 pb-2">
                               <div className="flex items-center gap-1">
                                  <button type="button" onClick={handleEnhancePrompt} disabled={!input.trim() || isEnhancingPrompt} className={cn("p-1.5 rounded-lg transition-all active:scale-95 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5", isEnhancingPrompt ? "text-amber-400" : theme === 'light' ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5 disabled:opacity-50")} title="Neural Refinement">
                                    <Sparkles size={11} className={isEnhancingPrompt ? "animate-spin" : ""} />
                                    Refine
                                  </button>
                                  <button type="button" onClick={() => setIsInputMaximized(!isInputMaximized)} className={cn("p-1.5 rounded-lg transition-all active:scale-95 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5", theme === 'light' ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5")} title={isInputMaximized ? "Minimize Text Area" : "Maximize Text Area"}>
                                    {isInputMaximized ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                                    {isInputMaximized ? "Min" : "Max"}
                                  </button>
                               </div>
                               <div className="flex gap-2 items-center min-h-[16px] px-2">
                                 {isImageMode ? (
                                   <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-pink-500/70">
                                     <motion.span className="w-1 h-1 rounded-full bg-pink-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} />
                                     Image
                                   </span>
                                 ) : isVideoMode ? (
                                   <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-amber-500/70">
                                     <motion.span className="w-1 h-1 rounded-full bg-amber-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} />
                                     Video
                                   </span>
                                 ) : activeSkillIds.length > 0 ? (
                                   activeSkillIds.slice(0, 3).map(id => {
                                     const skill = [...DEFAULT_SKILLS, ...customSkills].find(s => s.id === id);
                                     return (
                                       <span key={id} className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-cyan-500/60 uppercase tracking-[0.15em] cursor-default" title={skill?.name || id}>
                                         <span className="w-1 h-1 rounded-full bg-cyan-500/40" />
                                         {skill ? skill.name.split(' ')[0] : id.split('-')[0]}
                                       </span>
                                     );
                                   })
                                 ) : null}
                               </div>
                            </div>
                          </div>

                          {/* Toolbar Bottom */}
                          <div className={cn(
                            "flex items-center justify-between px-2 pt-2 mt-2 border-t",
                            theme === 'light' ? "border-slate-100" : "border-white/[0.04]"
                          )}>
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth flex-1 mr-2 pb-1">
                              <button type="button" onClick={() => { const input = document.createElement("input"); input.type = "file"; input.multiple = true; input.onchange = (e) => { const files = (e.target as HTMLInputElement).files; if (files) onDrop(Array.from(files)); }; input.click(); }} className={cn("p-2 rounded-xl transition-colors shrink-0", theme === 'light' ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5")} title="Attach Files">
                                <Paperclip size={16} />
                              </button>
                              <button type="button" onClick={handleToggleRepoModal} className={cn("p-2 transition-all rounded-xl shrink-0", isRepoModalOpen ? (theme === 'light' ? "text-purple-600 bg-purple-50" : "text-purple-400 bg-purple-500/10") : (theme === 'light' ? "text-slate-400 hover:text-purple-600 hover:bg-slate-100" : "text-zinc-500 hover:text-purple-400 hover:bg-white/5"))} title="Link Repository">
                                <Github size={16} />
                              </button>
                              <button type="button" onClick={() => { if (isImageMode) { setIsImageMode(false); } else { setIsImageMode(true); setIsVideoMode(false); setValidationStatus({ type: "success", message: "VISION MODE ACTIVE" }); setTimeout(() => setValidationStatus(null), 2000); } }} className={cn("p-2 transition-all rounded-xl shrink-0", isImageMode ? (theme === 'light' ? "text-pink-600 bg-pink-50" : "text-pink-400 bg-pink-500/10") : (theme === 'light' ? "text-slate-400 hover:text-pink-600 hover:bg-slate-100" : "text-zinc-500 hover:text-pink-400 hover:bg-white/5"))} title={isImageMode ? "Cancel Image" : "Enable Image"}>
                                <ImageIcon size={16} />
                              </button>
                              <button type="button" onClick={() => { if (isVideoMode) { setIsVideoMode(false); } else { setIsVideoMode(true); setIsImageMode(false); setValidationStatus({ type: "success", message: "MOTION MODE ACTIVE" }); setTimeout(() => setValidationStatus(null), 2000); } }} className={cn("p-2 transition-all rounded-xl shrink-0", isVideoMode ? (theme === 'light' ? "text-amber-600 bg-amber-50" : "text-amber-400 bg-amber-500/10") : (theme === 'light' ? "text-slate-400 hover:text-amber-600 hover:bg-slate-100" : "text-zinc-500 hover:text-amber-400 hover:bg-white/5"))} title={isVideoMode ? "Cancel Video" : "Enable Video"}>
                                <VideoIcon size={16} />
                              </button>

                              <div className={cn("w-px h-5 mx-1 shrink-0", theme === "light" ? "bg-slate-200" : "bg-white/[0.08]")} />

                              <button type="button" onClick={() => setIsSkillsExpanded(!isSkillsExpanded)} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest shrink-0", isSkillsExpanded ? (theme === 'light' ? "bg-slate-100 text-slate-800 shadow-sm border border-slate-200/50" : "bg-zinc-800/80 text-white shadow-md border border-white/5") : (theme === 'light' ? "text-slate-500 hover:text-slate-800 hover:bg-slate-50" : "text-zinc-500 hover:text-white hover:bg-white/5"))}>
                                <Sparkles size={12} className={isSkillsExpanded ? (theme === 'light' ? "text-slate-800" : "text-cyan-400") : "opacity-70"} /> Skills
                              </button>
                              
                              {/* Expanded Skills Inline */}
                              <div className={cn("flex items-center gap-1.5 overflow-x-auto custom-scrollbar transition-all duration-500 no-scrollbar", isSkillsExpanded ? "max-w-[300px] opacity-100 px-1" : "max-w-0 opacity-0 px-0")}>
                                {[...DEFAULT_SKILLS, ...customSkills].map((skill) => {
                                  // @ts-ignore
                                  const Icon = ICON_MAP[skill.icon] || Code2;
                                  const isActive = activeSkillIds.includes(skill.id);
                                  return (
                                    <button key={skill.id} type="button" onClick={() => toggleSkill(skill.id)} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-[9.5px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0", isActive ? "bg-cyan-950/30 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]" : theme === 'light' ? "bg-white border-slate-200 text-slate-600 hover:border-cyan-300 hover:text-cyan-700" : "bg-transparent border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300")}>
                                      <Icon size={10} /> {skill.name.split(" ")[0]}
                                    </button>
                                  );
                                })}
                              </div>

                              <button type="button" onClick={() => setUseSearch(!useSearch)} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest shrink-0", useSearch ? (theme === 'light' ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-200/50" : "bg-blue-900/30 text-blue-300 shadow-md border border-blue-500/30") : (theme === 'light' ? "text-slate-500 hover:text-slate-800 hover:bg-slate-50" : "text-zinc-500 hover:text-white hover:bg-white/5"))}>
                                <Search size={12} className={useSearch ? "text-blue-500" : "opacity-70"} /> Search
                              </button>

                              <div className="relative shrink-0">
                                <button type="button" onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest", isModelSelectorOpen ? (theme === 'light' ? "bg-slate-100 text-slate-800 shadow-sm border border-slate-200/50" : "bg-zinc-800/80 text-white shadow-md border border-white/5") : (theme === 'light' ? "text-slate-500 hover:text-slate-800 hover:bg-slate-50" : "text-zinc-500 hover:text-white hover:bg-white/5"))}>
                                  <Cpu size={12} className={isModelSelectorOpen ? (theme === 'light' ? "text-slate-800" : "text-zinc-300") : "opacity-70"} />
                                  {currentModel === ModelId.HYBRID ? "Hybrid" : [ModelId.PRO, ModelId.FLASH_3_5, ModelId.FLASH, ModelId.LITE].includes(currentModel as any) ? currentModel === ModelId.PRO ? "Pro" : currentModel === ModelId.FLASH_3_5 ? "Flash 3.5" : currentModel === ModelId.FLASH ? "Flash" : "Lite" : (currentModel || "").split("/").pop()?.replace("gemini-", "").toUpperCase() || "UNKNOWN"}
                                </button>
                              </div>

                              <div className={cn("flex items-center rounded-xl transition-all border relative group/deep shrink-0", thinkingMode !== "none" ? (theme === "light" ? "bg-amber-50 border-amber-200 shadow-sm" : "bg-[#1f1911] border-amber-900/30 shadow-md") : "bg-transparent border-transparent")}>
                                <button type="button" onClick={() => setThinkingMode(thinkingMode === "none" ? "low" : "none")} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-l-xl rounded-r-none transition-all text-[10px] font-bold uppercase tracking-widest", thinkingMode !== "none" ? (theme === 'light' ? "text-amber-700" : "text-amber-400") : (theme === 'light' ? "text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl" : "text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl"))}>
                                  <Brain size={12} className={thinkingMode !== "none" ? "text-amber-500" : "opacity-70"} /> Deep
                                </button>
                                {thinkingMode !== "none" && (
                                  <div className={cn("flex items-center border-l pr-2 pl-1.5 py-2 cursor-pointer", theme === "light" ? "border-amber-200" : "border-amber-900/50")}>
                                    <span className={cn("bg-transparent text-[9.5px] font-bold uppercase tracking-widest outline-none px-1.5 pointer-events-none", theme === "light" ? "text-amber-700/90" : "text-amber-400/80")}>{thinkingMode.replace("_", " ")}</span>
                                    <ChevronDown size={10} className={theme === "light" ? "text-amber-600/60 -ml-0.5 pointer-events-none" : "text-amber-500/60 -ml-0.5 pointer-events-none"} />
                                    <div className="absolute left-0 bottom-full mb-2 w-32 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl opacity-0 invisible group-hover/deep:opacity-100 group-hover/deep:visible transition-all z-50 overflow-hidden flex flex-col">
                                      {["low", "medium", "high", ...(currentModel !== ModelId.PRO ? ["extra_high"] : [])].map((level) => (
                                        <button key={level} type="button" onClick={() => setThinkingMode(level)} className={cn("px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider transition-colors hover:bg-white/5", thinkingMode === level ? "text-amber-500 bg-black/20" : "text-zinc-400")}>{level.replace("_", " ")}</button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <div className={cn("w-px h-5 mx-1 shrink-0", theme === "light" ? "bg-slate-200" : "bg-white/[0.08]")} />
                              
                              <div className={cn("w-px h-5 mx-1 shrink-0", theme === "light" ? "bg-slate-200" : "bg-white/[0.08]")} />
                              <button
                                type="button"
                                onClick={() => setIsAutoCompact?.(!isAutoCompact)}
                                className={cn(
                                  "flex items-center gap-1.5 px-2 h-7 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-colors shrink-0",
                                  isAutoCompact 
                                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" 
                                    : (theme === "light" ? "bg-slate-100 text-slate-500 hover:bg-slate-200" : "bg-white/5 text-zinc-400 hover:bg-white/10")
                                )}
                                title="Auto Compact Context"
                              >
                                <Database size={12} className={isAutoCompact ? "text-purple-400" : ""} />
                                <span>Auto Compact</span>
                              </button>
                              
                              <div className={cn("w-px h-5 mx-1 shrink-0", theme === "light" ? "bg-slate-200" : "bg-white/[0.08]")} />

                              <div className={cn("flex flex-col justify-center px-1 shrink-0 cursor-help min-w-[70px]", theme === 'light' ? "text-slate-500" : "text-zinc-400")} title="Estimated Context Usage">
                                <div className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider font-bold whitespace-nowrap">
                                  <span>{currentContextTokens > 1000 ? (currentContextTokens/1000).toFixed(1) + 'k' : currentContextTokens}</span>
                                  <span className="opacity-50 text-[8px] mt-px">/</span>
                                  <span>{currentModelMaxContext >= 1000000 ? (currentModelMaxContext/1000000).toFixed(1) + 'M' : currentModelMaxContext >= 1000 ? (currentModelMaxContext/1000).toFixed(0) + 'K' : currentModelMaxContext}</span>
                                  <span className="opacity-50 ml-0.5">Ctx</span>
                                </div>
                                <div className={cn("w-full h-1 rounded-full overflow-hidden mt-1 shadow-inner", theme === 'light' ? "bg-slate-200/80" : "bg-black/40")}>
                                  <div 
                                    className={cn("h-full transition-all duration-500", (currentContextTokens / currentModelMaxContext) > 0.8 ? "bg-red-500/80" : (currentContextTokens / currentModelMaxContext) > 0.5 ? "bg-amber-500/80" : "bg-emerald-500/80")} 
                                    style={{ width: `${Math.min(100, Math.max(0, (currentContextTokens / currentModelMaxContext) * 100))}%` }} 
                                  />
                                </div>
                              </div>
                            </div>

                            <button type="submit" disabled={isLoading || !input.trim()} className={cn("w-[44px] h-[44px] rounded-2xl flex items-center justify-center transition-all duration-300 shrink-0 group/send ml-2", theme === 'light' ? "bg-slate-900 border border-slate-800 text-white enabled:hover:bg-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.1)] disabled:opacity-30 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-transparent" : "bg-white text-black enabled:hover:bg-zinc-200 enabled:hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-10 disabled:bg-white/10 disabled:text-white/40", "enabled:active:scale-95")}>
                              <Terminal size={18} strokeWidth={2.5} className="group-hover/send:-translate-y-0.5 transition-transform" />
                            </button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                    {isRepoModalOpen && (
                      <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute bottom-full right-0 mb-4 w-80 bg-[#0f0f12]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] p-5 z-50 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none" />
                        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                          <div className="flex items-center gap-2"><Github size={16} className="text-purple-400" /><span className="text-xs font-bold uppercase tracking-widest text-zinc-300">Repository Sync</span></div>
                          <button onClick={() => setIsRepoModalOpen(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors"><X size={14} /></button>
                        </div>
                        <div className="space-y-4 relative z-10">
                          <div className="bg-black/60 rounded-xl border border-white/5 p-1 focus-within:border-purple-500/30 transition-all">
                            <input type="text" placeholder="https://github.com/owner/repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} className="w-full bg-transparent px-4 py-3 text-xs font-mono outline-none text-purple-300 placeholder:text-zinc-700" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddRepo(); } }} autoFocus />
                          </div>
                          <button onClick={handleAddRepo} disabled={isLoading || !repoUrl.trim()} className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 disabled:opacity-20 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_10px_20px_rgba(0,0,0,0.3)] shadow-purple-900/10">{isLoading ? "Establishing Link..." : "Link Repository"}</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </>
    </>
  );
}
