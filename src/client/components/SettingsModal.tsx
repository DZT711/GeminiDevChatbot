import React from 'react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Copy, Plus, Save, Settings2, Trash2, X, Github, Sun, Palette, Terminal, Bot, Database, AlertTriangle, FileText, Shield, Paperclip } from "lucide-react";
import { storageService } from '../services/storageService';
import { handleCopyFullChat } from "../hooks/useChatSessions";

export function SettingsModal(props: any) {
  const {
    showSettings, setShowSettings, theme, setTheme, settingsTab, setSettingsTab,
    apiKeys, setApiKeys, activeKeyId, setActiveKeyId, globalEnabledModels, setGlobalEnabledModels,
    managingKeyId, setManagingKeyId, isAddingKey, setIsAddingKey, newKeyName, setNewKeyName,
    newKeyVal, setNewKeyVal, newKeyBaseUrl, setNewKeyBaseUrl, newKeyExpectedPrefix, setNewKeyExpectedPrefix,
    newKeyProvider, setNewKeyProvider, showInputBox, setShowInputBox, addNotification, messages,
    handleSaveKey, handleDeleteKey, modelCatalog, user, setUser,
    validationStatus, setValidationStatus, repoUrl, setRepoUrl, handleAddRepo,
    kSearchQuery, setKSearchQuery, handleKSearch, isKSearching, kSearchError, kSearchResults,
    newProposalContent, setNewProposalContent, newProposalReason, setNewProposalReason, handleCreateNewProposal, isSubmittingProposal,
    knowledgeProposals, editingProposalId, editingProposalContent, setEditingProposalContent, handleSaveProposalEdit, setEditingProposalId,
    knowledgeNodes, isKnowledgeActionLoading, handleRejectProposal, handleApproveProposal,
    editingNodeId, editingNodeContent, setEditingNodeContent, handleSaveNodeEdit, setEditingNodeId, handleDeleteNode,
    isEditingSkill, setIsEditingSkill, saveSkillEdit,
    toggleSkillSuggestions, showSkillSuggestions, autoScroll, setAutoScroll, handleSummarizeChat, isLoading, setShowTransparency
  } = props;

  return (
    <>
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm bg-black/60">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={cn(
                "w-full max-w-xl rounded-3xl p-8 shadow-2xl border transition-all",
                theme === "light"
                  ? "bg-white border-slate-200"
                  : "bg-surface-card border-border-dim",
              )}
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2
                    className={cn(
                      "text-xl font-bold uppercase tracking-tight",
                      theme === "light" ? "text-slate-900" : "text-white",
                    )}
                  >
                    System Configuration
                  </h2>
                  <p
                    className={cn(
                      "text-xs font-mono mt-1",
                      theme === "light" ? "text-slate-500" : "text-zinc-500",
                    )}
                  >
                    Adjust core neural path parameters
                  </p>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    theme === "light"
                      ? "hover:bg-slate-100 text-slate-400"
                      : "hover:bg-zinc-800 text-zinc-500",
                  )}
                >
                  <X size={20} />
                </button>
              </div>

              <div
                className={cn(
                  "flex gap-8 border-b mb-8 overflow-x-auto",
                  theme === "light" ? "border-slate-100" : "border-border-dim",
                )}
              >
                {["general", "profile", "context", "theme"].map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setSettingsTab(tab as any)}
                      className={cn(
                        "pb-4 text-[10px] whitespace-nowrap font-bold uppercase tracking-widest transition-all",
                        settingsTab === tab
                          ? theme === "light"
                            ? "border-b-2 border-cyan-500 text-slate-900"
                            : "border-b-2 border-cyan-500 text-white"
                          : theme === "light"
                            ? "text-slate-400 hover:text-slate-600"
                            : "text-zinc-500 hover:text-zinc-300",
                      )}
                    >
                      {tab}
                    </button>
                  ),
                )}
              </div>

              <div className="space-y-6">
                {settingsTab === "general" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        General Configuration
                      </label>
                    </div>

                    <div className="space-y-4">
                      {/* Input Box Toggle */}
                      <div className="flex items-center justify-between p-3 border border-zinc-800 rounded-xl bg-black/20">
                        <div>
                          <p className="text-xs font-bold text-white">
                            Show Chat Input Box
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1">
                            Toggle the visibility of the primary chat input area
                            at the bottom.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowInputBox((prev) => !prev)}
                          className={cn(
                            "relative w-10 h-5 rounded-full transition-colors",
                            showInputBox ? "bg-cyan-500" : "bg-zinc-700",
                          )}
                        >
                          <div
                            className={cn(
                              "absolute top-1 bg-white w-3 h-3 rounded-full transition-transform",
                              showInputBox ? "left-6" : "left-1",
                            )}
                          />
                        </button>
                      </div>

                      {/* Skills Suggest Toggle */}
                      <div className="flex items-center justify-between p-3 border border-zinc-800 rounded-xl bg-black/20">
                        <div>
                          <p className="text-xs font-bold text-white">
                            Skill Suggestions
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1">
                            Automatically suggest relevant skills based on your
                            chat context.
                          </p>
                        </div>
                        <button
                          onClick={toggleSkillSuggestions}
                          className={cn(
                            "relative w-10 h-5 rounded-full transition-colors",
                            showSkillSuggestions
                              ? "bg-purple-500"
                              : "bg-zinc-700",
                          )}
                        >
                          <div
                            className={cn(
                              "absolute top-1 bg-white w-3 h-3 rounded-full transition-transform",
                              showSkillSuggestions ? "left-6" : "left-1",
                            )}
                          />
                        </button>
                      </div>

                      {/* Auto Scroll Toggle */}
                      <div className="flex items-center justify-between p-3 border border-zinc-800 rounded-xl bg-black/20">
                        <div>
                          <p className="text-xs font-bold text-white">
                            Auto Scroll
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1">
                            Automatically scroll to the newest messages as they
                            stream in.
                          </p>
                        </div>
                        <button
                          onClick={() => setAutoScroll((prev) => !prev)}
                          className={cn(
                            "relative w-10 h-5 rounded-full transition-colors",
                            autoScroll ? "bg-cyan-500" : "bg-zinc-700",
                          )}
                        >
                          <div
                            className={cn(
                              "absolute top-1 bg-white w-3 h-3 rounded-full transition-transform",
                              autoScroll ? "left-6" : "left-1",
                            )}
                          />
                        </button>
                      </div>

                      {/* Summarize Session */}
                      <div className="flex items-center justify-between p-3 border border-zinc-800 rounded-xl bg-black/20">
                        <div>
                          <p className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                            <FileText size={14} /> Summarize Session
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1">
                            Generate a summary of the current chat and
                            auto-title the session.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setShowSettings(false);
                            handleSummarizeChat();
                          }}
                          disabled={messages.length === 0 || isLoading}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded-lg text-xs font-bold uppercase transition-colors"
                        >
                          Summarize
                        </button>
                      </div>

                      {/* Copy Full Transcript */}
                      <div className="flex items-center justify-between p-3 border border-zinc-800 rounded-xl bg-black/20">
                        <div>
                          <p className="text-xs font-bold text-cyan-400 flex items-center gap-2">
                            <Copy size={14} /> Copy Transcript
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1">
                            Copy the full history of this chat session to your
                            clipboard.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            handleCopyFullChat(messages, addNotification);
                            setShowSettings(false);
                          }}
                          disabled={messages.length === 0}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded-lg text-xs font-bold uppercase transition-colors"
                        >
                          Copy
                        </button>
                      </div>

                      {/* Transparency Dashboard */}
                      <div className="flex items-center justify-between p-3 border border-zinc-800 rounded-xl bg-black/20">
                        <div>
                          <p className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                            <Shield size={14} /> Transparency Dashboard
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-1">
                            View system metrics, knowledge ingestion logs, and
                            privacy boundaries.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setShowSettings(false);
                            setShowTransparency(true);
                          }}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold uppercase transition-colors"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === "profile" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        User Profile Configuration
                      </label>
                    </div>
                    {user?.isGuest && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs rounded-xl flex items-start gap-2">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span>
                          You are using a Guest Session. If you log out or clear
                          your cache, your session data might be lost unless a
                          permanent account is created. To upgrade, please log
                          out and authenticate normally. Your data is still
                          stored in the sandbox safely.
                        </span>
                      </div>
                    )}
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-mono text-zinc-500 uppercase">
                          Registered Email
                        </label>
                        <input
                          type="text"
                          value={user?.email || ""}
                          disabled
                          className="w-full bg-black/40 border border-zinc-800/50 rounded-xl px-4 py-2.5 text-xs text-zinc-500 font-mono cursor-not-allowed"
                          title="Email cannot be changed"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-mono text-zinc-500 uppercase">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={user?.name || ""}
                          onChange={(e) =>
                            setUser((prev) =>
                              prev ? { ...prev, name: e.target.value } : null,
                            )
                          }
                          className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-500/50 text-cyan-100 font-mono transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-mono text-zinc-500 uppercase">
                          System Instructions (Model Personalization)
                        </label>
                        <textarea
                          value={user?.customInstructions || ""}
                          onChange={(e) =>
                            setUser((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    customInstructions: e.target.value,
                                  }
                                : null,
                            )
                          }
                          placeholder="e.g. Always respond in markdown... Act like a senior developer..."
                          className="w-full h-24 bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-cyan-500/50 text-cyan-100 font-mono transition-all resize-none"
                        />
                      </div>
                      <div className="pt-2">
                        <button
                          onClick={async () => {
                            if (!user) return;
                            const token = storageService.getItem("session");
                            try {
                              const res = await fetch("/api/auth/me", {
                                method: "PUT",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                  name: user.name,
                                  avatarUrl: user.avatarUrl,
                                  customInstructions: user.customInstructions,
                                }),
                              });
                              if (res.ok) {
                                const updated = await res.json();
                                setUser(updated);
                                setValidationStatus({
                                  type: "success",
                                  message: "Profile updated successfully.",
                                });
                                setTimeout(
                                  () => setValidationStatus(null),
                                  3000,
                                );
                              }
                            } catch (e: any) {
                              setValidationStatus({
                                type: "error",
                                message: "Failed to update profile.",
                              });
                              setTimeout(() => setValidationStatus(null), 3000);
                            }
                          }}
                          className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-black rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95"
                        >
                          Save Profile
                        </button>
                        {validationStatus && (
                          <span
                            className={cn(
                              "text-xs font-mono ml-4",
                              validationStatus.type === "success"
                                ? "text-green-400"
                                : "text-red-400",
                            )}
                          >
                            {validationStatus.message}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                

                {settingsTab === "context" && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                      <Github size={12} className="text-purple-500" />
                      Repository Context
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="Github/Gitlab URL..."
                        className="flex-1 bg-[#0a0a0c] border border-zinc-800 rounded-xl px-4 py-3 text-sm font-mono focus:border-cyan-500 outline-none transition-all"
                      />
                      <button
                        onClick={handleAddRepo}
                        className="px-6 bg-purple-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-purple-500 transition-colors"
                      >
                        Sync
                      </button>
                    </div>
                  </div>
                )}

                {settingsTab === "theme" && (
                  <div className="grid grid-cols-4 gap-4">
                    {(
                      ["midnight", "cyberpunk", "monochrome", "light"] as const
                    ).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={cn(
                          "aspect-video rounded-xl border flex flex-col items-center justify-center gap-2 transition-all p-2",
                          theme === t
                            ? "border-cyan-500 bg-cyan-700/10"
                            : "border-zinc-800 bg-zinc-950/50 grayscale hover:grayscale-0 hover:border-zinc-700",
                        )}
                      >
                        <div
                          className={cn(
                            "p-2 rounded-lg",
                            t === "midnight" && "bg-zinc-900",
                            t === "cyberpunk" &&
                              "bg-[#00ffcc]/20 text-[#00ffcc]",
                            t === "monochrome" && "bg-white text-black",
                            t === "light" && "bg-cyan-100 text-cyan-600",
                          )}
                        >
                          {t === "light" ? (
                            <Sun size={18} />
                          ) : t === "cyberpunk" ? (
                            <Palette size={18} />
                          ) : t === "monochrome" ? (
                            <Terminal size={18} />
                          ) : (
                            <Bot size={18} />
                          )}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest">
                          {t === "monochrome"
                            ? "Classic"
                            : t === "light"
                              ? "Lab Light"
                              : t}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {settingsTab === "knowledge" && (
                  <div className="space-y-6 max-h-[480px] overflow-y-auto pr-2 font-sans">
                    {/* Header/Intro */}
                    <div>
                      <h3
                        className={cn(
                          "text-sm font-semibold flex items-center gap-2",
                          theme === "light" ? "text-slate-900" : "text-white",
                        )}
                      >
                        <Database size={16} className="text-cyan-500" />
                        Knowledge Engine (RAG Index)
                      </h3>
                      <p
                        className={cn(
                          "text-xs mt-1",
                          theme === "light"
                            ? "text-slate-500"
                            : "text-zinc-500",
                        )}
                      >
                        Configure, approve, and direct what semantic memories
                        the AI model queries during conversations.
                      </p>
                    </div>

                    {/* Similarity tester block */}
                    <div
                      className={cn(
                        "p-4 rounded-xl border space-y-3",
                        theme === "light"
                          ? "bg-slate-50 border-slate-200"
                          : "bg-black/30 border-zinc-800",
                      )}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                        Search Similarity Vector Tester
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={kSearchQuery}
                          onChange={(e) => setKSearchQuery(e.target.value)}
                          placeholder="Type model memories query to test..."
                          className="flex-1 bg-black/40 border border-zinc-850 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-cyan-500"
                        />
                        <button
                          onClick={handleKSearch}
                          disabled={isKSearching}
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all"
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
                        <div className="pt-2 space-y-2 max-h-[150px] overflow-y-auto">
                          {kSearchResults.map((node) => (
                            <div
                              key={node.id}
                              className="p-2.5 bg-zinc-950/80 rounded-lg border border-zinc-800/80 space-y-1"
                            >
                              <div className="flex justify-between items-center text-[10px] font-mono">
                                <span className="text-zinc-400 font-semibold">
                                  {node.nodeType.toUpperCase()}
                                </span>
                                <span className="text-green-400 font-bold">
                                  Cosine Dist: {node.similarity.toFixed(4)}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-300 font-mono line-clamp-2">
                                {node.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Propose New Memory Node block (Settings Drawer version) */}
                    <div
                      className={cn(
                        "p-4 rounded-xl border space-y-3",
                        theme === "light"
                          ? "bg-slate-50 border-slate-200"
                          : "bg-black/30 border-zinc-800",
                      )}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        Add / Propose New Memory Record
                      </span>

                      <div className="space-y-2">
                        <div>
                          <textarea
                            rows={3}
                            value={newProposalContent}
                            onChange={(e) =>
                              setNewProposalContent(e.target.value)
                            }
                            placeholder="Type or paste knowledge description here..."
                            className="w-full bg-black/40 border border-zinc-850 rounded-lg p-2.5 text-xs font-mono text-white outline-none focus:border-emerald-500 placeholder:text-zinc-650"
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            value={newProposalReason}
                            onChange={(e) =>
                              setNewProposalReason(e.target.value)
                            }
                            placeholder="Justification reason (optional)..."
                            className="w-full bg-black/40 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-emerald-500"
                          />
                        </div>

                        <button
                          onClick={handleCreateNewProposal}
                          disabled={isSubmittingProposal}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all uppercase tracking-wide"
                        >
                          {isSubmittingProposal
                            ? "Proposing..."
                            : "Submit Memory Proposal"}
                        </button>
                      </div>
                    </div>

                    {/* Proposals Section */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                          Pending & History Proposals
                        </label>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {knowledgeProposals.length} total
                        </span>
                      </div>

                      {knowledgeProposals.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-500">
                          No model-proposed index modifications found.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {knowledgeProposals.map((prop) => (
                            <div
                              key={prop.id}
                              className={cn(
                                "p-4 rounded-xl border flex flex-col gap-3 transition-colors",
                                theme === "light"
                                  ? "bg-white border-slate-200"
                                  : "bg-[#0b0b0e] border-zinc-800/80",
                              )}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={cn(
                                      "px-2 py-0.5 rounded text-[8px] font-bold tracking-wider",
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
                                    <span className="text-[8px] font-mono text-zinc-500">
                                      Node Ref: {prop.targetNodeId.slice(0, 8)}
                                      ...
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={cn(
                                    "text-[8px] px-1.5 py-0.5 rounded font-bold uppercase",
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
                                <span className="text-[8px] text-zinc-500 font-mono uppercase block">
                                  Proposed content:
                                </span>
                                {editingProposalId === prop.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={editingProposalContent}
                                      onChange={(e) =>
                                        setEditingProposalContent(
                                          e.target.value,
                                        )
                                      }
                                      className="w-full h-24 bg-zinc-950 border border-zinc-805 rounded-lg p-2 text-xs font-mono text-zinc-300 outline-none focus:border-cyan-500"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          handleSaveProposalEdit(prop.id)
                                        }
                                        className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-[10px] uppercase font-bold"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() =>
                                          setEditingProposalId(null)
                                        }
                                        className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] uppercase font-bold"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {prop.actionType === "UPDATE" &&
                                      prop.targetNodeId && (
                                        <div className="p-2 bg-[#0c0c0e] rounded border border-zinc-900 font-mono text-[9px] text-zinc-400">
                                          <span className="text-[8px] text-zinc-500 font-mono uppercase block mb-0.5">
                                            Original Memory:
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
                                        "p-2 rounded border font-mono text-[10px] text-zinc-300 break-words whitespace-pre-wrap max-h-[140px] overflow-y-auto",
                                        prop.actionType === "DELETE"
                                          ? "bg-red-950/10 border-red-900/20 text-red-200"
                                          : "bg-black/30 border-zinc-900",
                                      )}
                                    >
                                      {prop.actionType === "DELETE" ? (
                                        <>
                                          <span className="text-[8px] text-red-400 font-mono uppercase block mb-0.5">
                                            Target Memory to Delete:
                                          </span>
                                          {(() => {
                                            const targetNode =
                                              knowledgeNodes.find(
                                                (node) =>
                                                  node.id === prop.targetNodeId,
                                              );
                                            return targetNode
                                              ? targetNode.content
                                              : "(Memory already deleted)";
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
                                <p className="text-[10px] italic text-zinc-400 font-mono pl-1">
                                  &ldquo;{prop.reason}&rdquo;
                                </p>
                              )}

                              {prop.status === "PENDING" && (
                                <div className="flex justify-end gap-2 pt-1 border-t border-zinc-900">
                                  {editingProposalId !== prop.id && (
                                    <button
                                      disabled={
                                        Object.keys(isKnowledgeActionLoading).length > 0
                                      }
                                      onClick={() => {
                                        setEditingProposalId(prop.id);
                                        setEditingProposalContent(
                                          prop.proposedContent || "",
                                        );
                                      }}
                                      className="px-3 py-1.5 border border-zinc-800 hover:border-zinc-700 text-zinc-400 text-[9px] font-bold uppercase rounded transition-all mr-auto"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  <button
                                    disabled={Object.keys(isKnowledgeActionLoading).length > 0}
                                    onClick={() =>
                                      handleRejectProposal(prop.id)
                                    }
                                    className="px-3 py-1.5 border border-red-900/40 bg-red-950/10 hover:bg-red-950/20 text-red-400 text-[9px] font-bold uppercase rounded transition-all"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    disabled={Object.keys(isKnowledgeActionLoading).length > 0}
                                    onClick={() =>
                                      handleApproveProposal(prop.id)
                                    }
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold uppercase rounded transition-all shadow"
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

                    {/* Active Nodes Section */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                          Indexed Knowledge Nodes
                        </label>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {knowledgeNodes.length} active
                        </span>
                      </div>

                      {knowledgeNodes.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-400">
                          No knowledge records active. Ask DevGenie or provide
                          structural prompts to form semantic storage.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {knowledgeNodes.map((node) => (
                            <div
                              key={node.id}
                              className={cn(
                                "p-4 rounded-xl border flex flex-col gap-2 transition-colors",
                                theme === "light"
                                  ? "bg-white border-slate-200"
                                  : "bg-[#0b0b0e] border-zinc-800/80",
                              )}
                            >
                              <div className="flex justify-between items-center gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400">
                                    {node.nodeType || "CODE_BLOCK"}
                                  </span>
                                  {(() => {
                                    const pendingProp = knowledgeProposals.find(
                                      (p) =>
                                        p.targetNodeId === node.id &&
                                        p.status === "PENDING",
                                    );
                                    if (pendingProp?.actionType === "UPDATE") {
                                      return (
                                        <span className="text-[8px] font-bold uppercase tracking-wider text-amber-500 animate-pulse">
                                          ● PENDING UPDATE
                                        </span>
                                      );
                                    } else if (
                                      pendingProp?.actionType === "DELETE"
                                    ) {
                                      return (
                                        <span className="text-[8px] font-bold uppercase tracking-wider text-red-500 animate-pulse">
                                          ● PENDING DELETE
                                        </span>
                                      );
                                    } else {
                                      return (
                                        <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-500">
                                          ● ACTIVE
                                        </span>
                                      );
                                    }
                                  })()}
                                </div>
                                <span className="text-[8px] font-mono text-zinc-500">
                                  ID: {node.id.slice(0, 8)}...
                                </span>
                              </div>

                              <div className="text-xs space-y-1">
                                {editingNodeId === node.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={editingNodeContent}
                                      onChange={(e) =>
                                        setEditingNodeContent(e.target.value)
                                      }
                                      className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs font-mono text-zinc-300 outline-none focus:border-cyan-500"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          handleSaveNodeEdit(node.id)
                                        }
                                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] uppercase font-bold"
                                      >
                                        Update Node
                                      </button>
                                      <button
                                        onClick={() => setEditingNodeId(null)}
                                        className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] uppercase font-bold"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="p-2.5 bg-zinc-950/40 rounded border border-zinc-900 text-[10.5px] font-mono text-zinc-300 break-words whitespace-pre-wrap max-h-[140px] overflow-y-auto">
                                    {node.content}
                                  </p>
                                )}
                              </div>

                              {editingNodeId !== node.id && (
                                <div className="flex justify-end gap-2 pt-1 border-t border-zinc-900 font-sans">
                                  <button
                                    onClick={() => handleDeleteNode(node.id)}
                                    className="px-2.5 py-1 text-red-500 hover:text-red-400 text-[10px] font-bold uppercase flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <Trash2 size={12} /> Delete Node
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingNodeId(node.id);
                                      setEditingNodeContent(node.content);
                                    }}
                                    className="px-2.5 py-1 text-cyan-500 hover:text-cyan-400 text-[10px] font-bold uppercase flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    Edit Node
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-zinc-800 flex justify-end">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="px-8 py-3 bg-zinc-800 text-zinc-200 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {isEditingSkill && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingSkill(null)}
              className="absolute inset-0 bg-[#050505]/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={cn(
                "w-full max-w-lg relative z-10 border rounded-3xl overflow-hidden shadow-2xl",
                theme === "light"
                  ? "bg-white border-slate-200 text-slate-900"
                  : "bg-[#0f0f12] border-white/10 text-white",
              )}
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-tighter">
                      Refactor Neural Path
                    </h2>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase mt-1">
                      Adjusting Identity & Prompt Matrix
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEditingSkill(null)}
                    className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={saveSkillEdit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold font-mono uppercase text-zinc-500">
                      Identity Identifier
                    </label>
                    <input
                      type="text"
                      value={isEditingSkill.name}
                      onChange={(e) =>
                        setIsEditingSkill({
                          ...isEditingSkill,
                          name: e.target.value,
                        })
                      }
                      className={cn(
                        "w-full border rounded-xl px-4 py-3 text-sm font-mono outline-none transition-all",
                        theme === "light"
                          ? "bg-slate-50 border-slate-200 focus:border-cyan-500"
                          : "bg-black/60 border-zinc-800 focus:border-cyan-500",
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold font-mono uppercase text-zinc-500">
                      Node Description
                    </label>
                    <textarea
                      value={isEditingSkill.description}
                      onChange={(e) =>
                        setIsEditingSkill({
                          ...isEditingSkill,
                          description: e.target.value,
                        })
                      }
                      className={cn(
                        "w-full border rounded-xl px-4 py-3 text-sm font-mono outline-none transition-all h-24 resize-none",
                        theme === "light"
                          ? "bg-slate-50 border-slate-200 focus:border-cyan-500"
                          : "bg-black/60 border-zinc-800 focus:border-cyan-500",
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold font-mono uppercase text-zinc-500">
                      Compatible Neural Model
                    </label>
                    <select
                      value={isEditingSkill.model || ""}
                      onChange={(e) =>
                        setIsEditingSkill({
                          ...isEditingSkill,
                          model: e.target.value || undefined,
                        })
                      }
                      className={cn(
                        "w-full border rounded-xl px-4 py-3 text-sm font-mono outline-none transition-all cursor-pointer",
                        theme === "light"
                          ? "bg-slate-50 border-slate-200 focus:border-cyan-500 text-slate-800"
                          : "bg-black/60 border-zinc-800 focus:border-cyan-500 text-zinc-100",
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

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold font-mono uppercase text-zinc-500">
                      Neural Programming (Prompt)
                    </label>
                    <textarea
                      value={isEditingSkill.systemPrompt}
                      onChange={(e) =>
                        setIsEditingSkill({
                          ...isEditingSkill,
                          systemPrompt: e.target.value,
                        })
                      }
                      className={cn(
                        "w-full border rounded-xl px-4 py-3 text-sm font-mono outline-none transition-all h-40 resize-none",
                        theme === "light"
                          ? "bg-slate-50 border-slate-200 focus:border-cyan-500"
                          : "bg-black/60 border-zinc-800 focus:border-cyan-500",
                      )}
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditingSkill(null)}
                      className="flex-1 py-3 px-6 rounded-xl border border-zinc-800 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-900 transition-all text-zinc-400"
                    >
                      Abort
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 px-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg"
                    >
                      Commit Changes
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </>
  );
}
