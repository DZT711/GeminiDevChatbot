import { useState, useEffect, useCallback } from "react";

export interface AppNotification {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  timestamp: Date;
  title?: string;
  duration?: number;
}

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
  const [validationStatus, setValidationStatusState] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "profile" | "context" | "theme" | "performance" | "knowledge">("general");
  const [showInputBox, setShowInputBox] = useState(true);
  const [showTransparency, setShowTransparency] = useState(false);
  const [view, setView] = useState<"chat" | "skills" | "knowledge" | "models" | "performance" | "admin-debug" | "keys" | "planning-playground" | "workspace">("chat");
  const [showHistory, setShowHistory] = useState(false);
  
  const [githubUrl, setGithubUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotification = useCallback((
    message: string,
    type: "success" | "error" | "info" | "warning" = "info",
    title?: string,
    duration: number = 4500
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(7);
    const newNotif: AppNotification = {
      id,
      message,
      type,
      timestamp: new Date(),
      title,
      duration,
    };
    setNotifications((prev) => {
      const next = [...prev, newNotif];
      return next.slice(-5);
    });
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, duration);
  }, []);

  const setValidationStatus = useCallback((status: { type: "success" | "error" | "info"; message: string } | null) => {
    setValidationStatusState(status);
    if (status && status.message) {
      addNotification(status.message, status.type);
    }
  }, [addNotification]);

  useEffect(() => {
    const handleGlobalNotify = (e: any) => {
      const detail = e?.detail;
      if (detail && detail.message) {
        addNotification(detail.message, detail.type || "info", detail.title, detail.duration);
      }
    };
    window.addEventListener("app:notify", handleGlobalNotify);
    return () => window.removeEventListener("app:notify", handleGlobalNotify);
  }, [addNotification]);

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
