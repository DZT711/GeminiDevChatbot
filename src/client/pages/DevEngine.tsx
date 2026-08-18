
import { SkillsView } from "../components/views/SkillsView";
import { ModelsView } from "../components/views/ModelsView";
import { PerformanceView } from "../components/views/PerformanceView";
import { KnowledgeView } from "../components/views/KnowledgeView";
import { KeysView } from "../components/views/KeysView";
import { AdminDebugView } from "../components/views/AdminDebugView";

import { ChatWindow } from "../components/ChatWindow";
import { Sidebar } from "../components/Sidebar";
import { SettingsModal } from "../components/SettingsModal";
import { apiClient } from '../services/apiClient.js';
import { storageService } from '../services/storageService.js';
import React, { useState, useRef, useEffect, useMemo } from "react";
import { TransparencyDashboard } from "../components/TransparencyDashboard";
import { transparencyLogger } from "../utils/transparencyLogger";
import { findSkillSuggestions } from "../utils/skillMatcher";
import {
  Send,
  RotateCcw,
  Settings as SettingsIcon,
  Terminal,
  Cpu,
  Code2,
  Palette,
  Server,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  Bot,
  Search,
  Copy,
  Brain,
  Image as ImageIcon,
  Video as VideoIcon,
  Plus,
  Trash2,
  MessageSquare,
  Sparkles,
  Database,
  Cloud,
  Shield,
  X,
  History,
  Paperclip,
  FileText,
  FolderOpen,
  Github,
  ChevronLeft,
  Settings,
  Sun,
  Zap,
  Globe,
  Activity,
  Network,
  ArrowDown,
  Wind,
  Layers,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Coffee,
  Braces,
  Binary,
  Pin,
  Edit2,
  Check,
  Key,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { geminiService, DEFAULT_SKILLS, Skill, PROVIDER_CONFIGS, ModelMetrics } from "@/services/geminiService";
import { ModelId, Provider } from "@/services/types";

import { ChatSession, Message, Attachment } from "@/services/chatSessionManager";
import { modelQueueManager } from "@/services/modelQueueManager";
import { githubService } from "../services/githubService";
import { useKnowledgeBase } from "../hooks/useKnowledgeBase";
import { useModelSettings } from "../hooks/useModelSettings";
import { useSkills } from "../hooks/useSkills";
import { useUIState } from "../hooks/useUIState";
import { useChatInput } from "../hooks/useChatInput";
import { useAdmin } from "../hooks/useAdmin";
import { useValidation, validateKeyPrefix } from "../hooks/useValidation";
import { useChatSessions, useChatInteractions, handleCopyFullChat, useDevEngineEffects } from "../hooks/useChatSessions";
import { useAuth } from "../contexts/AuthProvider";
import { useSettings } from "../contexts/SettingsProvider";
import { useChatContext } from "../contexts/ChatProvider";
import { ChatMessage } from "@/components/ChatMessage";
import { cn } from "@/lib/utils";
import { ThinkingLevel } from "@google/genai";
import { useDropzone } from "react-dropzone";
import JSZip from "jszip";

const ICON_MAP: Record<string, any> = {
  Code2,
  Palette,
  Server,
  Cpu,
  Database,
  Cloud,
  Shield,
  Terminal,
  Zap,
  Globe,
  Coffee,
  Braces,
  Binary,
  Layers,
};

const PROVIDER_ICONS: Record<string, any> = {
  [Provider.GOOGLE]: Bot,
  [Provider.OPENAI]: Zap,
  [Provider.ANTHROPIC]: Layers,
  [Provider.XAI]: Shield,
  [Provider.GROQ]: Activity,
  [Provider.NVIDIA]: Cpu,
  [Provider.OPENROUTER]: Globe,
  [Provider.TOGETHER]: Network,
  [Provider.CEREBRAS]: Server,
  [Provider.DEEPSEEK]: Search,
  [Provider.MISTRAL]: Wind,
  [Provider.OLLAMA]: Terminal,
};

interface ApiKey {
  name: string;
  key: string;
  id: string;
  provider: Provider;
  models?: string[];
  baseUrl?: string;
  expectedPrefix?: string;
}

interface ModelInformation {
  id: string;
  name: string;
  provider: string;
  contextLength?: string;
  description?: string;
  pricing?: any;
  architecture?: string;
}

interface UserContext {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role?: string;
  customInstructions?: string | null;
  isGuest?: boolean;
  githubToken?: string;
}

export default function DevEngine() {
  const { user, setUser } = useAuth();
  const { apiKeys, setApiKeys, activeKeyId, setActiveKeyId, globalEnabledModels, setGlobalEnabledModels, theme, setTheme } = useSettings();
  const { sessions, setSessions, customSkills, setCustomSkills, currentSessionId, setCurrentSessionId, messages, setMessages } = useChatContext();
      
  // Persistence States
        
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
  } = useModelSettings(apiKeys, activeKeyId, globalEnabledModels);
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
  } = useSkills();
  const {
    isSidebarCollapsed, setIsSidebarCollapsed,
    isModelSelectorOpen, setIsModelSelectorOpen,
    isRepoModalOpen, setIsRepoModalOpen,
    isImageMode, setIsImageMode,
    isVideoMode, setIsVideoMode,
    autoScroll, setAutoScroll, isAutoCompact, setIsAutoCompact,
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
  } = useUIState();
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
  } = useChatInput();
  const {
    
    adminLogs, setAdminLogs,
    adminCliInput, setAdminCliInput,
    isStateLoaded, setIsStateLoaded,
  } = useAdmin();
  const { loadSession, createNewSession, saveCurrentSession, deleteSession, handleTogglePinSession } = useChatSessions({ sessions, setSessions, currentSessionId, setCurrentSessionId, setMessages, setView, setShowHistory });
  const { apiKeyWarning, setApiKeyWarning } = useValidation(apiKeys);

        
  // Session Edit States
    
  // Model Queue Sync
  
  // Active Session State
  // UI & Input States              


  const currentContextTokens = useMemo(() => {
    // Rough estimate: ~4 chars per token for messages + explicit input
    const historyText = messages.map(m => m.content).join(' ');
    const allText = historyText + ' ' + input;
    return Math.ceil(allText.length / 4);
  }, [messages, input]);

  const currentModelMaxContext = useMemo(() => {
    if (currentModel === ModelId.HYBRID) return 1000000;
    const baseModelId = currentModel.split('/').pop() || "";
    const catalogInfo = modelCatalog.find(
      (mc) =>
        mc.id === currentModel ||
        (baseModelId && mc.id.endsWith("/" + baseModelId)),
    );
    return catalogInfo?.contextLength ? Number(catalogInfo.contextLength) : 128000;
  }, [currentModel, modelCatalog]);

              
  // Slash Commands Keyboard & Overlay States
    
  
  const toggleSkillSuggestions = () => {
    setShowSkillSuggestions((prev) => !prev);
  };

  // Knowledge Base States
    const {
    knowledgeNodes,
    knowledgeProposals,
    isKnowledgeLoading,
    isKnowledgeActionLoading,
    setIsKnowledgeActionLoading,
    setIsSubmittingProposal,
    setKSearchResults,
    setIsKSearching,
    setKSearchError,
    editingNodeId,
    setEditingNodeId,
    editingNodeContent,
    setEditingNodeContent,
    editingProposalId,
    setEditingProposalId,
    editingProposalContent,
    setEditingProposalContent,
    newProposalContent,
    setNewProposalContent,
    newProposalReason,
    setNewProposalReason,
    isSubmittingProposal,
    kSearchQuery,
    setKSearchQuery,
    kSearchResults,
    isKSearching,
    kSearchError,
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
  } = useKnowledgeBase();

  
  
  
  
  
  const handleSaveProposalEdit = async (proposalId: string) => {
    const token = storageService.getItem("session");
    if (!token) return;
    setIsKnowledgeActionLoading(prev => ({...prev, [proposalId]: true}));
    try {
      const res = await fetch(`/api/knowledge/proposals/${proposalId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ proposedContent: editingProposalContent }),
      });
      if (!res.ok) {
        const errData = await res.json();
        addNotification(errData.error || "Failed to update proposal", "error");
      } else {
        addNotification("Proposed content updated successfully.", "success");
        setEditingProposalId(null);
        fetchKnowledgeData();
      }
    } catch (err: any) {
      addNotification("Error updating proposal: " + err.message, "error");
    } finally { setIsKnowledgeActionLoading(prev => ({...prev, [proposalId]: false})); }
  };

  
  const handleSaveNodeEdit = async (nodeId: string) => {
    const token = storageService.getItem("session");
    if (!token) return;
    setIsKnowledgeActionLoading(prev => ({...prev, [nodeId]: true}));
    try {
      const isAdmin = user?.role === "ADMIN";
      if (isAdmin) {
        const res = await fetch(`/api/knowledge/${nodeId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: editingNodeContent }),
        });
        if (!res.ok) {
          const errData = await res.json();
          addNotification(errData.error || "Failed to update node", "error");
        } else {
          addNotification(
            "Knowledge record updated successfully in vector space.",
            "success",
          );
          setEditingNodeId(null);
          fetchKnowledgeData();
        }
      } else {
        const res = await fetch("/api/knowledge/proposals", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            actionType: "UPDATE",
            targetNodeId: nodeId,
            proposedContent: editingNodeContent,
            reason: "User edit proposal requested from UI dashboard.",
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          addNotification(
            errData.error || "Failed to submit update proposal",
            "error",
          );
        } else {
          addNotification(
            "Update proposal submitted successfully! Pending administrator approval.",
            "success",
          );
          setEditingNodeId(null);
          fetchKnowledgeData();
        }
      }
    } catch (err: any) {
      addNotification("Error: " + err.message, "error");
    } finally { setIsKnowledgeActionLoading(prev => ({...prev, [nodeId]: false})); }
  };

  const handleDeleteNodeAction = async (nodeId: string) => {
    const token = storageService.getItem("session");
    if (!token) return;
    setIsKnowledgeActionLoading(prev => ({ ...prev, [nodeId]: true }));
    try {
      const isAdmin = user?.role === "ADMIN";
      if (isAdmin) {
        const res = await fetch(`/api/knowledge/${nodeId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          addNotification(errData.error || "Failed to delete knowledge node", "error");
        } else {
          addNotification("Knowledge record deleted successfully from vector index.", "success");
          fetchKnowledgeData();
        }
      } else {
        const res = await fetch("/api/knowledge/proposals", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            actionType: "DELETE",
            targetNodeId: nodeId,
            reason: "User requested deletion from UI dashboard.",
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          addNotification(errData.error || "Failed to submit deletion proposal", "error");
        } else {
          addNotification("Deletion proposal submitted successfully! Pending administrator approval.", "success");
          fetchKnowledgeData();
        }
      }
    } catch (err: any) {
      addNotification("Error deleting knowledge node: " + err.message, "error");
    } finally {
      setIsKnowledgeActionLoading(prev => ({ ...prev, [nodeId]: false }));
    }
  };

  const handleKSearch = async () => {
    if (!kSearchQuery.trim()) return;
    const token = storageService.getItem("session");
    if (!token) return;
    setIsKSearching(true);
    setKSearchError("");
    try {
      const res = await fetch("/api/knowledge/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: kSearchQuery, limit: 3 }),
      });
      if (!res.ok) {
        const errData = await res.json();
        setKSearchError(errData.error || "Failed to execute query search");
      } else {
        const data = await res.json();
        setKSearchResults(data.results || []);
      }
    } catch (err: any) {
      setKSearchError(err.message);
    } finally {
      setIsKSearching(false);
    }
  };

  const handleCreateNewProposal = async () => {
    if (!newProposalContent.trim()) {
      addNotification(
        "Please enter the content for your new knowledge record",
        "warning",
      );
      return;
    }
    const token = storageService.getItem("session");
    if (!token) {
      addNotification("Authentication session expired", "error");
      return;
    }
    setIsSubmittingProposal(true);
    try {
      const res = await fetch("/api/knowledge/proposals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          actionType: "INSERT",
          proposedContent: newProposalContent,
          reason:
            newProposalReason.trim() ||
            "Custom knowledge memory added from dashboard.",
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        addNotification(errData.error || "Failed to submit proposal", "error");
      } else {
        addNotification(
          "Proposed new model memory node successfully! Please find it in the list below to approve and commit it to index.",
          "success",
        );
        setNewProposalContent("");
        setNewProposalReason("");
        fetchKnowledgeData();
      }
    } catch (err: any) {
      addNotification("Error submitting proposal: " + err.message, "error");
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const activeKey = apiKeys.find((k) => k.id === activeKeyId);
  const activeApiKey = activeKey?.key || "";
  const currentSession = sessions.find((s) => s.id === currentSessionId);

  // Update Page Title based on current session
  
  
  // Initial Data Fetch
  
  // Automatic Key Usability watch & diagnostic telemetry
  // Hook unhandled runtime errors into admin telemetry buffer
  
  const lastStatesRef = useRef<
    Record<string, { status?: string; description?: string }>
  >({});

  // Synchronize transparency actions and output failures with administrative CLI console logs
  
  // Persistence Sync
        
  // Abort Control
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modals / Views
  
  
        
  // File Upload Custom Skill Creation States
  const handleUploadSkillFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);

    if (!newSkillName) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      const cleanName = nameWithoutExt
        .split(/[-_]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      setNewSkillName(cleanName);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setNewSkillPromptText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleCreateCustomSkillManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newSkillName.trim() ||
      !newSkillDescription.trim() ||
      !newSkillPromptText.trim()
    ) {
      setValidationStatus({
        type: "error",
        message: "NAME, DESCRIPTION, AND PROMPT MATRIX REQUIRED",
      });
      setTimeout(() => setValidationStatus(null), 3000);
      return;
    }

    const newSkill: Skill = {
      id: `skill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newSkillName.trim(),
      description: newSkillDescription.trim(),
      systemPrompt: newSkillPromptText.trim(),
      icon: "Code2",
      isCustom: true,
      model: newSkillModel || undefined,
    };

    setCustomSkills((prev) => [...prev, newSkill]);

    setNewSkillName("");
    setNewSkillDescription("");
    setNewSkillModel("");
    setNewSkillPromptText("");
    setUploadedFileName("");
    setValidationStatus({
      type: "success",
      message: "Neural Skill injected successfully!",
    });
    setTimeout(() => setValidationStatus(null), 3000);
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto Scroll
  
  // Usage & Metrics Polling
  
  // Skill Suggestions Hook
  
  // Autocomplete Hook
  
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
    handlePaste, removeAttachment,
    handleAddRepo,
    handleEnhancePrompt,
    handleSummarizeChat,
    handleSubmit,
    getRootProps, getInputProps, isDragActive
  } = useChatInteractions({
    messages, setMessages,
    input, setInput,
    isLoading, setIsLoading,
    attachments, setAttachments,
    currentSessionId, setCurrentSessionId,
    saveCurrentSession,
    isImageMode, isVideoMode,
    activeKey, currentModel, modelQueueManager,
    addNotification, setValidationStatus,
    abortControllerRef,
    activeSkillIds, customSkills,
    autoScroll, scrollRef,
    useSearch, repoUrl, setIsRepoModalOpen, setRepoUrl, isEnhancingPrompt, setIsEnhancingPrompt,
    editingSessionId, setEditingSessionId, editingSessionTitle, setEditingSessionTitle,
    user, setSessions, sessions, setCurrentModel, isRepoModalOpen, isAutoCompact
  });

  const handleEditSkill = (skill: Skill) => {
    setIsEditingSkill(skill);
  };

  const saveSkillEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingSkill) return;

    if (isEditingSkill.isCustom) {
      setCustomSkills((prev) =>
        prev.map((s) => (s.id === isEditingSkill.id ? isEditingSkill : s)),
      );
    } else {
      setCustomSkills((prev) => {
        const exists = prev.find((s) => s.id === isEditingSkill.id);
        if (exists)
          return prev.map((s) =>
            s.id === isEditingSkill.id ? isEditingSkill : s,
          );
        return [...prev, { ...isEditingSkill, isCustom: true }];
      });
    }
    setIsEditingSkill(null);
    setValidationStatus({
      type: "success",
      message: "Neural path reconfigured successfully",
    });
    setTimeout(() => setValidationStatus(null), 2000);
  };

  const handleGithubImport = async () => {
    if (!githubUrl) return;
    setIsImportingGithub(true);
    try {
      const info = await githubService.getRepoInfo(githubUrl);
      if (info) {
        setValidationStatus({
          type: "success",
          message: `Importing ${info.name} neural structure...`,
        });
        const newSkill: Skill = {
          id: `gh-${Date.now()}`,
          name: `GH: ${info.name}`,
          description: info.description,
          systemPrompt: `Act as a specialized AI imported from GitHub repository: ${info.owner}/${info.name}. 
          Repository Summary:
          ${githubService.formatRepoSummary(info)}
          `,
          icon: "Cloud",
          isCustom: true,
        };
        setCustomSkills((prev) => [...prev, newSkill]);
        setGithubUrl("");
        setValidationStatus({
          type: "success",
          message: `GitHub Neural Pattern Integrated: ${info.name}`,
        });
      } else {
        throw new Error("Invalid repository path");
      }
    } catch (err: any) {
      setValidationStatus({
        type: "error",
        message: err.message || "GitHub integration failed: Unreachable path",
      });
    } finally {
      setIsImportingGithub(false);
      setTimeout(() => setValidationStatus(null), 3000);
    }
  };

  const handleCreateSkill = async () => {
    if (!newSkillPrompt.trim() || isCreatingSkill) return;
    setIsCreatingSkill(true);
    try {
      const newSkill = await geminiService.createSkillFromPrompt(
        newSkillPrompt,
        activeApiKey,
      );
      setCustomSkills((prev) => [...prev, newSkill]);
      setNewSkillPrompt("");
    } catch (err: any) {
      alert("Failed to create skill: " + err.message);
    } finally {
      setIsCreatingSkill(false);
    }
  };

  
  const removeCustomSkill = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCustomSkills((prev) => prev.filter((s) => s.id !== id));
    setActiveSkillIds((prev) => prev.filter((s) => s !== id));
  };

  interface CommandItem {
    cmd: string;
    syntax: string;
    description: string;
    icon: React.ReactNode;
  }

  const commandListItems: CommandItem[] = useMemo(
    () => [
      {
        cmd: "/rag",
        syntax: "/rag <query>",
        description: "Trigger semantic vector retrieval of codebase memories.",
        icon: <Database size={14} className="text-cyan-400" />,
      },
      {
        cmd: "/image",
        syntax: "/image <prompt>",
        description:
          "Generate high-fidelity UI visual mockups or custom graphics.",
        icon: <ImageIcon size={14} className="text-purple-400" />,
      },
      {
        cmd: "/video",
        syntax: "/video <prompt>",
        description:
          "Generate standard high-performance video motion simulations.",
        icon: <VideoIcon size={14} className="text-indigo-400" />,
      },
      {
        cmd: "/refine",
        syntax: "/refine",
        description: "Polishes and optimizes current prompt using LLM logic.",
        icon: <Sparkles size={14} className="text-amber-400" />,
      },
      {
        cmd: "/clear",
        syntax: "/clear",
        description:
          "Clear active model state and start a fresh session context.",
        icon: <RotateCcw size={14} className="text-rose-400" />,
      },
      {
        cmd: "/help",
        syntax: "/help",
        description:
          "Display quick reference specifications and command listings.",
        icon: <Info size={14} className="text-emerald-400" />,
      },
    ],
    [],
  );

  const executeCommand = (cmd: string): void => {
    if (cmd === "/rag") {
      setInput("/rag ");
    } else if (cmd === "/image") {
      setInput("/image ");
    } else if (cmd === "/video") {
      setInput("/video ");
    } else if (cmd === "/refine") {
      handleEnhancePrompt();
    } else if (cmd === "/clear") {
      createNewSession();
      setInput("");
    } else if (cmd === "/help") {
      setMessages((prev) => [
        ...prev,
        {
          id: `help-${Date.now()}`,
          role: "model",
          content: `### 🤖 DevGenie AI Command Console Guide\n\nWelcome to your specialized AI developer terminal. We support the following native command integrations:\n\n- \`/rag <query>\` — Performs deep semantic similarity searches on local vector indexes.\n- \`/sandbox <query>\` — Forces the model to execute any requested code securely inside the remote E2B Node.js Sandbox Sandbox environment and return the output.\n- \`/image <prompt>\` — Invokes stable generation of developer-focused vector images.\n- \`/video <prompt>\` — Creates high-fidelity motion graphics to visualize dynamic elements.\n- \`/refine\` — Polishes simple text inputs into highly contextual developer-oriented prompts.\n- \`/clear\` — Resets the current thread's states, memory context, and active files.\n\n*Press Tab or Enter to auto-complete commands while typing.*`,
        },
      ]);
      setInput("");
    }
  };

  const filteredCommands: CommandItem[] = useMemo(() => {
    if (!input.startsWith("/")) return [];
    const filterText = input.slice(1).trim().toLowerCase();
    return commandListItems.filter(
      (c) =>
        c.cmd.toLowerCase().includes("/" + filterText) ||
        c.cmd.toLowerCase().includes(filterText) ||
        c.description.toLowerCase().includes(filterText),
    );
  }, [input, commandListItems]);

  const showCommands: boolean = useMemo(() => {


    return (
      input.startsWith("/") &&
      !input.includes(" ") &&
      filteredCommands.length > 0 &&
      !isCommandListDismissed
    );
  }, [input, filteredCommands, isCommandListDismissed]);

  
  const renderSessionItem = (s: ChatSession) => {
    const isEditing = editingSessionId === s.id;
    return (
      <div
        key={s.id}
        onClick={() => {
          if (!isEditing) loadSession(s);
        }}
        className={cn(
          "group flex items-center justify-between p-2 rounded text-[10px] font-mono cursor-pointer transition-all border",
          currentSessionId === s.id
            ? theme === "light"
              ? "bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm"
              : "bg-[#121216] border-[#222] text-zinc-200"
            : theme === "light"
              ? "text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-100"
              : "text-zinc-500 border-transparent hover:bg-zinc-900/50",
        )}
      >
        {isEditing ? (
          <form
            onSubmit={(e) => handleSaveSessionTitle(e, s.id)}
            className="flex-1 flex items-center pr-2"
          >
            <input
              type="text"
              autoFocus
              value={editingSessionTitle}
              onChange={(e) => setEditingSessionTitle(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => handleSaveSessionTitle(e, s.id)}
              className="flex-1 bg-transparent border-b border-cyan-500/50 outline-none text-zinc-200 px-1 placeholder-zinc-600"
              placeholder="Title..."
            />
            <button
              type="submit"
              className="text-emerald-500 hover:text-emerald-400 p-1"
            >
              <Check size={10} />
            </button>
          </form>
        ) : (
          <span
            className="truncate flex-1"
            onDoubleClick={(e) => handleStartEditingSession(e, s.id, s.title)}
          >
            {s.title}
          </span>
        )}

        {!isEditing && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
            <button
              onClick={(e) => handleTogglePinSession(e, s.id)}
              className={cn(
                "hover:text-emerald-500 transition-all p-1",
                s.pinned ? "text-emerald-500 opacity-100" : "text-zinc-700",
              )}
            >
              <Pin size={10} />
            </button>
            <button
              onClick={(e) => handleStartEditingSession(e, s.id, s.title)}
              className="text-zinc-700 hover:text-cyan-500 transition-all p-1"
            >
              <Edit2 size={10} />
            </button>
            <button
              onClick={(e) => deleteSession(e, s.id)}
              className="text-zinc-700 hover:text-red-500 transition-all p-1"
            >
              <Trash2 size={10} />
            </button>
          </div>
        )}
      </div>
    );
  };

  const handleSaveKey = async () => rawHandleSaveKey(setApiKeys, setValidationStatus, setActiveKeyId);
  const handleDeleteKey = (id: string) => rawHandleDeleteKey(id, setApiKeys, activeKeyId, setActiveKeyId);

  const sidebarProps = {
    theme, isSidebarCollapsed, createNewSession, setView, view, user,
    apiKeys, activeKeyId, modelQueueManager, currentModel, modelCatalog,
    sessions, renderSessionItem, showHistory, setShowHistory
  };

  const settingsModalProps = {
    showSettings, setShowSettings, theme, setTheme, settingsTab, setSettingsTab,
    apiKeys, setApiKeys, activeKeyId, setActiveKeyId, globalEnabledModels, setGlobalEnabledModels,
    managingKeyId, setManagingKeyId, isAddingKey, setIsAddingKey, newKeyName, setNewKeyName,
    newKeyVal, setNewKeyVal, newKeyBaseUrl, setNewKeyBaseUrl, newKeyExpectedPrefix, setNewKeyExpectedPrefix,
    newKeyProvider, setNewKeyProvider, showInputBox, setShowInputBox, addNotification, messages,
    handleSaveKey, handleDeleteKey, modelCatalog, user, setUser,
    customSkills, setCustomSkills,
    editingNodeId: (window as any).editingNodeId || null,
    editingNodeContent: (window as any).editingNodeContent || '',
    setEditingNodeId: (id: any) => {},
    setEditingNodeContent: (content: any) => {},
    handleSaveNodeEdit: () => {},
    handleDeleteNode: () => {},
    isEditingSkill: (window as any).isEditingSkill || null,
    setIsEditingSkill: (v: any) => {},
    saveSkillEdit: () => {},
    validationStatus, setValidationStatus,
    apiKeyWarning, setApiKeyWarning,
    repoUrl, setRepoUrl, handleAddRepo,
    knowledgeNodes, setKnowledgeNodes: () => {},
    kSearchQuery, setKSearchQuery, handleKSearch: executeKSearch, isKSearching, kSearchError, kSearchResults,
    newProposalContent, setNewProposalContent, newProposalReason, setNewProposalReason, handleCreateNewProposal: handleCreateProposal, isSubmittingProposal,
    knowledgeProposals, editingProposalId, editingProposalContent, setEditingProposalContent, handleSaveProposalEdit: handleUpdateProposal, setEditingProposalId,
    isKnowledgeActionLoading, handleRejectProposal, handleApproveProposal,
    toggleSkillSuggestions, showSkillSuggestions, autoScroll, setAutoScroll, handleSummarizeChat, isLoading, setShowTransparency
  };

  const chatProps = {
    theme, currentSessionId, editingSessionId, setEditingSessionId,
    editingSessionTitle, setEditingSessionTitle, saveCurrentSession,
    sessions, messages, setMessages, isLoading, user, handleEditMessage,
    handleRevertMessage, messagesEndRef: null, useSearch, setUseSearch,
    thinkingMode, setThinkingMode, isEnhancingPrompt, isInputMaximized,
    setIsInputMaximized, onDrop: () => {}, getRootProps, getInputProps, isDragActive,
    attachments, setAttachments, input, setInput, handleKeyDown: () => {},
    handleSend: handleSubmit, isCommandListDismissed, setIsCommandListDismissed,
    autocompleteSuggestion, showSkillSuggestions, suggestedSkills, setSuggestedSkills,
    selectedCommandIndex, setSelectedCommandIndex, uploadedFileName,
    handleStopGeneration: handleStop, autoScroll, setAutoScroll, isAutoCompact, setIsAutoCompact,
    isSidebarCollapsed, createNewSession, activeKey, activeApiKey: null,
    isModelSelectorOpen, setIsModelSelectorOpen, currentModel, setCurrentModel, ModelId: (window as any).ModelId || {},
    modelSearch, setModelSearch, activeKeyId, apiKeys, globalEnabledModels, modelQueueManager, modelCatalog,
    setSettingsTab, setShowSettings, removeAttachment, handlePaste, showCommands: false,
    filteredCommands, executeCommand, handleEnhancePrompt,
    isImageMode, setIsImageMode, isVideoMode, setIsVideoMode,
    activeSkillIds, setActiveSkillIds, DEFAULT_SKILLS, customSkills,
    handleToggleRepoModal, isRepoModalOpen, setIsRepoModalOpen, setValidationStatus,
    setIsSkillsExpanded, isSkillsExpanded, toggleSkill, toggleSkillSuggestions,
    currentContextTokens, currentModelMaxContext,
    repoUrl, setRepoUrl, handleAddRepo, handleStop, apiKeyWarning, setApiKeyWarning, handleRateMessage,
    setView, ICON_MAP, scrollRef, showInputBox, handleSubmit, setAutocompleteSuggestion
  };

  const propsToPass = {
    user, setUser, apiKeys, setApiKeys, activeKeyId, setActiveKeyId, globalEnabledModels, setGlobalEnabledModels, theme, setTheme,
    sessions, setSessions, customSkills, setCustomSkills, currentSessionId, setCurrentSessionId, messages, setMessages,
    globalModelCatalog, setGlobalModelCatalog, modelCatalog, setModelCatalog, newModelName, setNewModelName,
    newModelId, setNewModelId, newModelContext, setNewModelContext, newModelTools, setNewModelTools,
    modelSearch, setModelSearch, catalogSearch, setCatalogSearch, catalogFilter, setCatalogFilter,
    catalogPage, setCatalogPage, currentModel, setCurrentModel, metrics, setMetrics, managingKeyId, setManagingKeyId,
    newKeyName, setNewKeyName, newKeyVal, setNewKeyVal, newKeyBaseUrl, setNewKeyBaseUrl, newKeyExpectedPrefix, setNewKeyExpectedPrefix,
    newKeyProvider, setNewKeyProvider, isAddingKey, setIsAddingKey, visibleKeyIds, setVisibleKeyIds, handleSaveKey: rawHandleSaveKey, handleDeleteKey: rawHandleDeleteKey,
    activeSkillIds, setActiveSkillIds, isEditingSkill, setIsEditingSkill, isCreatingSkill, setIsCreatingSkill, newSkillName, setNewSkillName,
    newSkillDescription, setNewSkillDescription, newSkillModel, setNewSkillModel, newSkillPromptText, setNewSkillPromptText,
    newSkillPrompt, setNewSkillPrompt, suggestedSkills, setSuggestedSkills, autocompleteSuggestion, setAutocompleteSuggestion,
    showSkillSuggestions, setShowSkillSuggestions, isSkillsExpanded, setIsSkillsExpanded, toggleSkill, handleSaveSkill, handleDeleteSkill,
    isSidebarCollapsed, setIsSidebarCollapsed, isModelSelectorOpen, setIsModelSelectorOpen, isRepoModalOpen, setIsRepoModalOpen,
    isImageMode, setIsImageMode, isVideoMode, setIsVideoMode, autoScroll, setAutoScroll, isCommandListDismissed, setIsCommandListDismissed,
    selectedCommandIndex, setSelectedCommandIndex, isImportingGithub, setIsImportingGithub, githubUrl, setGithubUrl, repoUrl, setRepoUrl,
    addNotification, notifications, setNotifications, validationStatus, setValidationStatus, showSettings, setShowSettings,
    settingsTab, setSettingsTab, showInputBox, setShowInputBox, showTransparency, setShowTransparency, view, setView, showHistory, setShowHistory,
    input, setInput, isInputMaximized, setIsInputMaximized, isLoading, setIsLoading, attachments, setAttachments, thinkingMode, setThinkingMode,
    useSearch, setUseSearch, isEnhancingPrompt, setIsEnhancingPrompt, uploadedFileName, setUploadedFileName, editingSessionId, setEditingSessionId,
    editingSessionTitle, setEditingSessionTitle, adminLogs, setAdminLogs, adminCliInput, setAdminCliInput, isStateLoaded, setIsStateLoaded,
    loadSession, createNewSession, saveCurrentSession, deleteSession, handleTogglePinSession, apiKeyWarning, setApiKeyWarning,
    knowledgeNodes, kSearchQuery, setKSearchQuery, newProposalContent, setNewProposalContent,
    newProposalReason, setNewProposalReason, fetchKnowledgeData, handleApproveProposal, handleRejectProposal, handleUpdateProposal,
    handleDeleteNode: handleDeleteNodeAction, handleProposeDeleteNode, handleUpdateNode, handleProposeUpdateNode, executeKSearch, handleCreateProposal,
    handleStop, handleEditMessage, handleRevertMessage, handleRateMessage, handleToggleRepoModal, handleStartEditingSession, handleSaveSessionTitle,
    handleImageGen, handleVideoGen, handlePaste, handleAddRepo, handleEnhancePrompt, handleSummarizeChat, handleSubmit,
    DEFAULT_SKILLS, PROVIDER_CONFIGS, ModelId, handleUploadSkillFile: () => {}, handleCreateCustomSkillManual: () => {}, handleEditSkill, handleGithubImport: () => {},
    Provider, handleCreateSkill, handleKSearch, handleCreateNewProposal, handleSaveProposalEdit, handleSaveNodeEdit,
    knowledgeProposals, isSubmittingProposal, editingProposalId, editingProposalContent, setEditingProposalContent,
    setEditingProposalId, isKnowledgeActionLoading, editingNodeId, editingNodeContent, setEditingNodeContent, setEditingNodeId,
    kSearchResults, kSearchError, isKSearching, removeCustomSkill: () => {}, ICON_MAP,
  };

  useDevEngineEffects({
    input, setIsCommandListDismissed, setSelectedCommandIndex,
    showSettings, settingsTab, fetchKnowledgeData,
    addNotification, currentSessionId, sessions, user,
    setAdminLogs, isStateLoaded, apiKeys, customSkills,
    activeKeyId, currentModel, showSkillSuggestions,
    globalEnabledModels, view, autoScroll, scrollRef,
    isLoading, messages, setMetrics, activeSkillIds, setSuggestedSkills,
    setAutocompleteSuggestion, setApiKeys, setCustomSkills, setUser, setIsStateLoaded, setGlobalModelCatalog,

    setTheme, setCurrentModel, modelQueueManager, setActiveKeyId,
    setShowSkillSuggestions, setGlobalEnabledModels, setSessions,
    setModelCatalog, theme, showCommands, filteredCommands,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex h-screen text-[#e0e0e0] font-sans overflow-hidden transition-all duration-500",
        theme === "midnight" && "bg-surface-dark",
        theme === "cyberpunk" &&
          "bg-[#050505] text-[#00ffcc] selection:bg-[#00ffcc] selection:text-black",
        theme === "monochrome" &&
          "bg-[#111] text-zinc-400 selection:bg-zinc-700 selection:text-white",
        theme === "light" &&
          "bg-[#f8fafc] text-slate-900 selection:bg-cyan-100 selection:text-slate-900",
      )}
    >
      <input {...getInputProps()} />
      <Sidebar {...sidebarProps} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative">
        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 z-50 w-6 h-12 rounded-full flex items-center justify-center transition-all shadow-2xl border",
            theme === "light"
              ? "bg-white border-slate-200 text-slate-400 hover:text-cyan-600"
              : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-cyan-400",
            isSidebarCollapsed ? "left-4 rotate-180" : "-left-3",
          )}
        >
          <ChevronLeft size={14} />
        </button>

        {view === "chat" ? (
          <ChatWindow {...chatProps} />
        ) : view === "skills" ? (
          <SkillsView {...propsToPass} />
        ) : view === "models" ? (
          <ModelsView {...propsToPass} />
        ) : view === "performance" ? (
          <PerformanceView {...propsToPass} />
        ) : view === "knowledge" ? (
          <KnowledgeView {...propsToPass} />
        ) : view === "keys" ? (
          <KeysView {...propsToPass} />
        ) : view === "admin-debug" && user?.role === "ADMIN" ? (
          <AdminDebugView {...propsToPass} />
        ) : null}
      </main>

      {/* Transparency Dashboard Modal */}
      <TransparencyDashboard
        isOpen={showTransparency}
        onClose={() => setShowTransparency(false)}
        theme={theme}
      />

      <SettingsModal {...settingsModalProps} />

      {/* Floating System & Neural Activity Notifications */}
      <div className="fixed top-6 right-6 z-[210] flex flex-col gap-3 max-w-sm pointer-events-none">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={cn(
              "p-4 rounded-xl shadow-lg border flex gap-3 items-start pointer-events-auto transition-all duration-300",
              notif.type === "success" &&
                "bg-emerald-950/90 border-emerald-500/20 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.1)]",
              notif.type === "error" &&
                "bg-red-955/90 border-red-500/20 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.1)]",
              notif.type === "warning" &&
                "bg-amber-955/90 border-amber-500/20 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.1)]",
              notif.type === "info" &&
                "bg-zinc-950/95 border-cyan-500/35 text-zinc-100 shadow-[0_0_20px_rgba(6,182,212,0.15)]",
            )}
          >
            <div className="flex-1 text-xs font-sans">
              <div className="font-semibold text-[9px] uppercase tracking-widest mb-1.5 opacity-80 flex justify-between items-center gap-4">
                <span
                  className={cn(
                    notif.type === "info" && "text-cyan-400 font-mono",
                    notif.type === "success" && "text-emerald-400 font-mono",
                    notif.type === "error" && "text-red-400 font-mono",
                    notif.type === "warning" && "text-amber-400 font-mono",
                  )}
                >
                  {notif.type === "info"
                    ? "✦ NEURAL SYNC MEMORY"
                    : "■ SYSTEM MEMORY UPDATE"}
                </span>
                <span className="text-[8px] font-mono text-zinc-500">
                  {notif.timestamp?.toLocaleTimeString()}
                </span>
              </div>
              <p className="font-mono text-[10px] leading-relaxed break-words">
                {notif.message}
              </p>
            </div>
            <button
              onClick={() =>
                setNotifications((prev) =>
                  prev.filter((n) => n.id !== notif.id),
                )
              }
              className="text-zinc-500 hover:text-zinc-300 transition-colors pointer-events-auto text-xs ml-1"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Global Validation Toast */}
      <AnimatePresence>
        {validationStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: 20 }}
            className={cn(
              "fixed bottom-6 right-6 z-[200] max-w-xs p-4 rounded-xl border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 pointer-events-none",
              validationStatus.type === "error"
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  validationStatus.type === "error"
                    ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                    : "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]",
                )}
              />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                {validationStatus.message}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
