import { useState } from "react";

export function useUIState() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isAutoCompact, setIsAutoCompact] = useState(false);
  const [isCommandListDismissed, setIsCommandListDismissed] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
    const [isImportingGithub, setIsImportingGithub] = useState(false);
  const [validationStatus, setValidationStatus] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "profile" | "context" | "theme" | "performance" | "knowledge">("general");
  const [showInputBox, setShowInputBox] = useState(true);
  const [showTransparency, setShowTransparency] = useState(false);
  const [view, setView] = useState<"chat" | "skills" | "knowledge" | "models" | "performance" | "admin-debug" | "keys">("chat");
  const [showHistory, setShowHistory] = useState(false);
  
          
  const [githubUrl, setGithubUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
    const [notifications, setNotifications] = useState<any[]>([]);
  const addNotification = (message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    const id = Date.now().toString() + Math.random().toString(36).substring(7);
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };
  return {
    addNotification,
    notifications, setNotifications,
    githubUrl, setGithubUrl,
    repoUrl, setRepoUrl,
    isSidebarCollapsed, setIsSidebarCollapsed,
    isModelSelectorOpen, setIsModelSelectorOpen,
    isRepoModalOpen, setIsRepoModalOpen,
    isImageMode, setIsImageMode,
    isVideoMode, setIsVideoMode,
    autoScroll, setAutoScroll,
    isAutoCompact, setIsAutoCompact,
    isCommandListDismissed, setIsCommandListDismissed,
    selectedCommandIndex, setSelectedCommandIndex,
    isImportingGithub, setIsImportingGithub,
    validationStatus, setValidationStatus,
    showSettings, setShowSettings,
    settingsTab, setSettingsTab,
    showInputBox, setShowInputBox,
    showTransparency, setShowTransparency,
    view, setView,
    showHistory, setShowHistory,
  };
}
