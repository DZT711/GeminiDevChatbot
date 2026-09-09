import React, { useEffect, useRef, useMemo } from "react";
import { ChatSession, Message } from "@/services/chatSessionManager";
import { githubService } from "@/services/githubService";
import { geminiService, DEFAULT_SKILLS, PROVIDER_CONFIGS } from "@/services/geminiService";

import { apiClient } from "@/services/apiClient";
import { transparencyLogger } from "@/utils/transparencyLogger";
import { Attachment } from "@/services/chatSessionManager";
import JSZip from "jszip";
import { useDropzone } from "react-dropzone";
import { storageService } from "@/services/storageService";
import { ModelId } from "@/services/types";
import { GoalPlanningService } from "../../server/services/agentIntegration/planning/GoalPlanningService";
import { diagnoseAgentError } from "../utils/agentErrorDiagnostics";



export function useChatSessions({
  sessions,
  setSessions,
  currentSessionId,
  setCurrentSessionId,
  setMessages,
  setView,
  setShowHistory,
}: {
  sessions: ChatSession[];
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  currentSessionId: string | null;
  setCurrentSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setView: any;
  setShowHistory: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const loadSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setView("chat");
    setShowHistory(false);
  };

  const createNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setView("chat");
  };

  const saveCurrentSession = (
    updatedMessages: Message[],
    sessionId?: string,
    forcedTitle?: string,
  ) => {
    if (updatedMessages.length === 0 || !updatedMessages[0]) return;

    // Deduplicate messages within the session by ID to prevent any duplicate key errors
    const seenMsgIds = new Set<string>();
    const dedupedMessages = updatedMessages.filter((m) => {
      if (!m || !m.id) return false;
      if (seenMsgIds.has(m.id)) return false;
      seenMsgIds.add(m.id);
      return true;
    });

    if (dedupedMessages.length === 0 || !dedupedMessages[0]) return;

    const finalId = sessionId || currentSessionId || `session-${Date.now()}`;
    const defaultTitle =
      dedupedMessages[0].content?.slice(0, 30) +
      (dedupedMessages[0].content?.length > 30 ? "..." : "");

    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === finalId);
      const existingSession = idx > -1 ? prev[idx] : null;

      const newTitle =
        forcedTitle || (existingSession ? existingSession.title : defaultTitle);

      const isPinned = existingSession ? existingSession.pinned : false;

      const newSession: ChatSession = {
        id: finalId,
        title: newTitle,
        messages: dedupedMessages,
        updatedAt: Date.now(),
        pinned: isPinned,
      };

      if (idx > -1) {
        const next = [...prev];
        next[idx] = newSession;
        return next.sort((a, b) => b.updatedAt - a.updatedAt);
      }
      return [newSession, ...prev].sort((a, b) => b.updatedAt - a.updatedAt);
    });

    if (!currentSessionId && (!sessionId || sessionId === finalId)) {
      setCurrentSessionId(finalId);
    }
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentSessionId === id) {
      createNewSession();
    }
  };

  const handleTogglePinSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s)),
    );
  };

  return {
    loadSession,
    createNewSession,
    saveCurrentSession,
    deleteSession,
    handleTogglePinSession,
  };
}

export const handleCopyFullChat = async (
  messages: Message[],
  addNotification: (message: string, type?: "info" | "success" | "warning" | "error") => void
) => {
  const text = messages
    .map((m) => `[${m.role.toUpperCase()}]\n${m.content}`)
    .join("\n\n");
  try {
    await navigator.clipboard.writeText(text);
    addNotification("Full chat copied to clipboard", "success");
  } catch (err) {
    addNotification("Failed to copy chat", "error");
  }
};






export function useChatInteractions(options: any) {
  const {
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
    useSearch,
    isRepoModalOpen, setIsRepoModalOpen, repoUrl, setRepoUrl,
    editingSessionId, setEditingSessionId, editingSessionTitle, setEditingSessionTitle,
    setSessions, sessions, isEnhancingPrompt, setIsEnhancingPrompt, thinkingMode, user, setCurrentModel, isAutoCompact,
    setView
} = options;

  // Listen for agent execution events and notify chat thread with specific situational reports
  useEffect(() => {
    const handleAgentExecutionResult = (e: Event) => {
      const customEvent = e as CustomEvent<{
        success: boolean;
        planResult?: any;
        summary?: any;
        diagnosis?: any;
      }>;
      const { success, planResult, summary, diagnosis } = customEvent.detail || {};
      const goalIntent = planResult?.goal?.intent || 'Agent task execution';

      const randomSuffix = Math.random().toString(36).substring(2, 7);

      if (success) {
        const completedCount = summary?.completedTasks?.length ?? 0;
        const totalCount = summary?.totalTasks ?? (planResult?.plan?.steps?.length || 0);
        const durationStr = summary?.durationMs ? ` (${(summary.durationMs / 1000).toFixed(1)}s)` : '';

        const successMsg: Message = {
          id: `exec-success-${Date.now()}-${randomSuffix}`,
          role: 'model',
          content: `✅ **Agent Execution Succeeded**${durationStr}\n\nAll planned tasks completed for: **${goalIntent}**\n- **Tasks Executed:** ${completedCount} / ${totalCount}\n- **Workspace Status:** All file modifications and tools completed with verified outputs.`
        };
        setMessages((prev: Message[]) => [...prev, successMsg]);
        if (saveCurrentSession) {
          setTimeout(() => {
            setMessages((currentMsgs: Message[]) => {
              saveCurrentSession(currentMsgs, currentSessionId || undefined);
              return currentMsgs;
            });
          }, 0);
        }
        if (addNotification) {
          addNotification(`Agent executed successfully: ${goalIntent}`, 'success');
        }
      } else {
        const diag = diagnosis || diagnoseAgentError(summary?.error || 'Execution stopped with failures');
        const failMsg: Message = {
          id: `exec-fail-${Date.now()}-${randomSuffix}`,
          role: 'model',
          content: `⚠️ **Agent Execution Unsuccessful**\n\n**Situation:** ${diag.title} \`[${diag.badge}]\`\n${diag.description}\n\n💡 **Recommended Action:** ${diag.suggestion}\n\n*Target Goal:* ${goalIntent}`
        };
        setMessages((prev: Message[]) => [...prev, failMsg]);
        if (saveCurrentSession) {
          setTimeout(() => {
            setMessages((currentMsgs: Message[]) => {
              saveCurrentSession(currentMsgs, currentSessionId || undefined);
              return currentMsgs;
            });
          }, 0);
        }
        if (addNotification) {
          addNotification(`Agent execution unsuccessful: ${diag.title}`, 'error');
        }
      }
    };

    window.addEventListener('agent:execution-result', handleAgentExecutionResult);
    return () => {
      window.removeEventListener('agent:execution-result', handleAgentExecutionResult);
    };
  }, [setMessages, saveCurrentSession, addNotification, currentSessionId]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleEditMessage = async (index: number, newContent: string) => {
    if (isLoading) return;

    const messageToEdit = messages[index];
    if (!messageToEdit) return;

    const oldContent = messageToEdit.content;
    const history = messageToEdit.editHistory || [];

    // Create new message object with history
    const updatedMessage: Message = {
      ...messageToEdit,
      content: newContent,
      editHistory: [...history, oldContent],
    };

    const updatedMessages = [...messages.slice(0, index), updatedMessage];
    setMessages(updatedMessages);
    handleSubmit(undefined, updatedMessages);
  };

  const handleRevertMessage = (index: number, versionContent: string) => {
    setMessages((prev) => {
      const next = [...prev];
      const msg = next[index];
      if (!msg) return prev;

      const history = msg.editHistory || [];
      const currentContent = msg.content;

      // Move current to history and pick version
      next[index] = {
        ...msg,
        content: versionContent,
        editHistory: history
          .filter((h) => h !== versionContent)
          .concat(currentContent),
      };
      return next;
    });
  };

  const handleRateMessage = async (messageId: string, rating: number) => {
    const updatedMessages = messages.map((m) =>
      m.id === messageId ? { ...m, rating } : m,
    );
    setMessages(updatedMessages);

    if (currentSessionId) {
      saveCurrentSession(updatedMessages, currentSessionId);
    }

    try {
      const token = storageService.getItem("session");
      if (token) {
        await apiClient.put(`/api/messages/${messageId}/rating`, { rating });
      }
    } catch (e) {
      console.error("Failed to post rating change", e);
    }
  };

  const handleToggleRepoModal = () => {
    if (!isRepoModalOpen && input.includes("github.com/")) {
      const match = input.match(/https?:\/\/github\.com\/[^/\s]+\/[^/\s]+/);
      if (match) {
        setRepoUrl(match[0]);
        setValidationStatus({
          type: "success",
          message: "GITHUB URL DETECTED & TRANSFERRED",
        });
        setTimeout(() => setValidationStatus(null), 2000);
      }
    }
    setIsRepoModalOpen(!isRepoModalOpen);
  };

  
  
      
  const handleStartEditingSession = (
    e: React.MouseEvent,
    id: string,
    currentTitle: string,
  ) => {
    e.stopPropagation();
    setEditingSessionId(id);
    setEditingSessionTitle(currentTitle);
  };

  const handleSaveSessionTitle = (
    e: React.FormEvent | React.MouseEvent,
    id: string,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (editingSessionTitle.trim()) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, title: editingSessionTitle.trim() } : s,
        ),
      );
    }
    setEditingSessionId(null);
  };

    const handleImageGen = async (prompt: string, sessionId?: string) => {
    if (isLoading) return;
    setIsLoading(true);

    const tempId = `img-temp-${Date.now()}`;
    const initialMsg: Message = {
      id: tempId,
      role: "model",
      content: `*Generating neural vision for: "${prompt}"...*`,
    };

    setMessages((prev) => [...prev, initialMsg]);

    try {
      transparencyLogger.log(
        "Task Execution",
        `Initializing Image Generation node`,
        { prompt },
      );

      const imageUrl = await geminiService.generateImage(prompt, (activeKey?.key || ''));
      const finalMsg: Message = {
        id: `img-${Date.now()}`,
        role: "model",
        content: `Neural vision integrated. Prompt: "${prompt}"`,
        imageUrl,
      };

      setMessages((prev) => {
        const next = prev.map((m) => (m.id === tempId ? finalMsg : m));
        // Important: save sessions after state is updated to avoid race conditions
        setTimeout(() => {
          try {
            saveCurrentSession(next, sessionId);
          } catch (e) {
            console.error("Session persistence failure", e);
          }
        }, 50);
        return next;
      });
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...m,
                content: `**Neural Link Failure:** ${err.message}`,
              }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoGen = async (prompt: string, sessionId?: string) => {
    if (isLoading) return;
    setIsLoading(true);

    const tempId = `vid-temp-${Date.now()}`;
    const startTime = Date.now();
    const initialMsg: Message = {
      id: tempId,
      role: "model",
      content: `*Initializing temporal motion for: "${prompt}"...*\n[Progress: 0%] (Est: 90s remaining)`,
    };

    setMessages((prev) => [...prev, initialMsg]);

    try {
      transparencyLogger.log(
        "Task Execution",
        `Initializing Video Generation node (Temporal synthesis)`,
        { prompt },
      );

      const videoUrl = await geminiService.generateVideo(
        prompt,
        (activeKey?.key || ''),
        (status, percentage) => {
          const elapsed = Date.now() - startTime;
          let estRemaining = "";
          if (percentage > 0) {
            const totalEst = (elapsed / percentage) * 100;
            const remaining = Math.max(0, totalEst - elapsed);
            estRemaining = ` (Est: ${Math.ceil(remaining / 1000)}s remaining)`;
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? {
                    ...m,
                    content: `*${status} for: "${prompt}"...*\n[Progress: ${percentage}%]${estRemaining}`,
                  }
                : m,
            ),
          );
        },
      );
      const finalMsg: Message = {
        id: `vid-${Date.now()}`,
        role: "model",
        content: `Temporal synthesis complete. Prompt: "${prompt}"`,
        videoUrl,
      };

      setMessages((prev) => {
        const next = prev.map((m) => (m.id === tempId ? finalMsg : m));
        setTimeout(() => {
          try {
            saveCurrentSession(next, sessionId);
          } catch (e) {
            console.error("Session persistence failure", e);
          }
        }, 50);
        return next;
      });
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...m,
                content: `**Temporal De-sync Error:** ${err.message}`,
              }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoalPlanning = async (goalObjective: string, sessionId?: string) => {
    if (isLoading) return;
    setIsLoading(true);

    const targetSessionId = sessionId || currentSessionId || `session-${Date.now()}`;
    if (!currentSessionId) {
      setCurrentSessionId(targetSessionId);
    }

    if (!goalObjective || !goalObjective.trim()) {
      const errorMsg: Message = {
        id: `goal-err-${Date.now()}`,
        role: "model",
        content: `### ⚠️ Goal Objective Required\nPlease specify your engineering objective after \`/goal\`.\n\n**Example:** \`/goal make a 3d site with Three.js and React Three Fiber\`\n\nThis will trigger the **M05 Planning Intelligence pipeline** (Goal Validation → Goal Decomposition → TaskGraph DAG → Rule-Based Strategy → 7-Stage Pre-Flight Validation).`,
        modelName: "M05 Planning Engine"
      };
      setMessages((prev) => {
        const next = [...prev, errorMsg];
        setTimeout(() => {
          try {
            saveCurrentSession(next, targetSessionId);
          } catch (e) {
            console.error("Session persistence failure", e);
          }
        }, 50);
        return next;
      });
      setIsLoading(false);
      return;
    }

    const tempId = `goal-temp-${Date.now()}`;
    const initialMsg: Message = {
      id: tempId,
      role: "model",
      content: `*Initializing M05 Planning Intelligence pipeline for: "${goalObjective}"...*`,
      modelName: "M05 Planning Engine"
    };

    setMessages((prev) => [...prev, initialMsg]);

    try {
      transparencyLogger.log(
        "Analysis",
        `Executing M05 Planning Intelligence Pipeline: Goal → Decomposition → TaskGraph → Plan → 7-Stage Validation`,
        { objective: goalObjective }
      );

      const planningService = new GoalPlanningService();
      const planningResult = await planningService.createPlanFromGoal({
        objective: goalObjective,
        availableTools: [
          'view_file',
          'edit_file',
          'create_file',
          'delete_file',
          'list_dir',
          'lint_applet',
          'compile_applet',
          'run_command'
        ]
      });

      // Cache active planning result for the Planning Lab transition
      (window as any).__ACTIVE_PLANNING_FIXTURE__ = planningResult;

      try {
        const storedFixturesRaw = localStorage.getItem('devgenie_planning_fixtures');
        const storedFixtures = storedFixturesRaw ? JSON.parse(storedFixturesRaw) : [];
        const activeGoal = planningResult.goal;
        const fixtureId = `custom-goal-${activeGoal?.id || Date.now()}`;
        const newFixture = {
          id: fixtureId,
          name: `🎯 Goal: ${activeGoal?.title || activeGoal?.rawPrompt || 'Live Planning Goal'}`,
          description: `Live planning scenario created via /goal: "${activeGoal?.rawPrompt || activeGoal?.title}"`,
          goal: activeGoal,
          initialTasks: planningResult.taskSpecs || [],
          initialTaskGraph: planningResult.taskGraph,
          initialPlan: planningResult.repairedPlan || planningResult.plan,
          metadata: {
            source: 'goal_command',
            createdAt: Date.now(),
            sessionId: targetSessionId
          }
        };

        const updated = [newFixture, ...storedFixtures.filter((f: any) => f.goal?.id !== activeGoal?.id)].slice(0, 25);
        localStorage.setItem('devgenie_planning_fixtures', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('custom:planning-fixture-added', { detail: newFixture }));
      } catch (e) {
        console.warn('Failed to persist planning fixture to local storage', e);
      }

      const formattedMarkdown = GoalPlanningService.formatPlanningMarkdown(planningResult);

      const finalMsg: Message = {
        id: `goal-plan-${Date.now()}`,
        role: "model",
        content: formattedMarkdown,
        modelName: "M05 Planning Engine"
      };

      setMessages((prev) => {
        const next = prev.map((m) => (m.id === tempId ? finalMsg : m));
        setTimeout(() => {
          try {
            saveCurrentSession(next, targetSessionId);
          } catch (e) {
            console.error("Session persistence failure", e);
          }
        }, 50);
        return next;
      });

      transparencyLogger.log(
        "Task Execution",
        `M05 Planning Complete: ${planningResult.status.toUpperCase()} (${planningResult.durationMs}ms)`,
        {
          taskCount: planningResult.taskSpecs?.length || 0,
          stepCount: planningResult.plan?.steps.length || 0,
          validationPassed: planningResult.validation?.isValid ?? false
        }
      );
    } catch (err: any) {
      console.error("M05 Goal Planning Error:", err);
      const errMsg: Message = {
        id: `goal-err-${Date.now()}`,
        role: "model",
        content: `**M05 Planning Pipeline Error:** ${err?.message || String(err)}`,
        modelName: "M05 Planning Engine"
      };
      setMessages((prev) => prev.map((m) => (m.id === tempId ? errMsg : m)));
    } finally {
      setIsLoading(false);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const newAttachments: Attachment[] = [];

    for (const file of acceptedFiles) {
      if (file.name.endsWith(".zip")) {
        const zip = new JSZip();
        try {
          const content = await zip.loadAsync(file);
          for (const [path, zipEntry] of Object.entries(content.files)) {
            if (!zipEntry.dir) {
              const fileContent = await zipEntry.async("string");
              newAttachments.push({
                name: path,
                content: fileContent,
                type: "file",
              });
            }
          }
        } catch (e) {
          console.error("Error reading zip:", e);
        }
      } else if (
        file.type.startsWith("image/") ||
        file.type.startsWith("video/") ||
        file.type === "application/pdf" ||
        file.name.endsWith(".pdf")
      ) {
        // Handle media and PDFs as data URLs for multi-modal context
        try {
          const reader = new FileReader();
          const content = await new Promise<string>((resolve, reject) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
          });
          newAttachments.push({
            name: file.name,
            content: content,
            type:
              file.type ||
              (file.name.endsWith(".pdf")
                ? "application/pdf"
                : "application/octet-stream"),
          });
        } catch (e) {
          console.error("Binary read failure:", e);
        }
      } else {
        const content = await file.text();
        newAttachments.push({
          name: file.name,
          content: content,
          type: file.type || "text/plain",
        });
      }
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      onDrop(files);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddRepo = async () => {
    if (!repoUrl.trim()) return;
    setIsLoading(true);
    try {
      const info = await githubService.getRepoInfo(repoUrl);
      if (info) {
        const repoContent: Attachment = {
          name: `Repo: ${info.owner}/${info.name}`,
          content: githubService.formatRepoSummary(info),
          type: "repo",
        };
        setAttachments((prev) => [...prev, repoContent]);
        setIsRepoModalOpen(false);
        setValidationStatus({
          type: "success",
          message: `Neural map of ${info.name} added.`,
        });

        transparencyLogger.log(
          "Learning",
          `Parsed repository neural map from GitHub: ${info.owner}/${info.name}`,
          { url: `https://github.com/${info.owner}/${info.name}` },
        );

        setTimeout(() => setValidationStatus(null), 3000);
      } else {
        throw new Error("Could not fetch repo info");
      }
      setRepoUrl("");
    } catch (err: any) {
      setValidationStatus({
        type: "error",
        message: err.message || "GitHub link validation failed.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!input.trim() || isEnhancingPrompt) return;
    setIsEnhancingPrompt(true);
    try {
      transparencyLogger.log(
        "Analysis",
        `Enhancing prompt complexity and structure`,
        { originalLength: input.length },
      );
      const enhanced = await geminiService.enhancePrompt(input, (activeKey?.key || ''));
      setInput(enhanced);
    } catch (err) {
      console.error("Failed to enhance prompt:", err);
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  const handleSummarizeChat = async () => {
    if (isLoading || messages.length === 0) return;
    setIsLoading(true);

    const sessionId = currentSessionId || `session-${Date.now()}`;
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content:
        "Summarize the interaction so far and assign a title to the session.",
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    try {
      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: "model",
        content: "",
        modelName: `summarizer`,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const history = newMessages
        .filter((m) => m && m.role && m.content)
        .map((m) => ({
          role: m.role,
          parts: [{ text: m.content }],
        }));

      // A simple specialized summarizing skill/prompt
      const summarizeSkill = {
        name: "Chat Summarizer",
        systemPrompt:
          'You are a session summarizer. Give a very brief 3-sentence summary of the user interaction. Prefix the summary with "Session Summary: ". On a new line at the very end, output "TITLE: <a short 3-5 word title for the session>". Do not output anything else.',
      };

      await geminiService.generateResponse(
        userMessage.content,
        // Active skill ids
        ["sys-summarizer"],
        // Custom skills list (just inject our temporary one)
        [
          ...customSkills,
          {
            id: "sys-summarizer",
            name: summarizeSkill.name,
            description: "Summarizer",
            systemPrompt: summarizeSkill.systemPrompt,
            icon: "FileText",
          },
        ],
        history,
        {
          model: currentModel,
          customKey: activeKey?.key,
          provider: activeKey?.provider,
          customBaseUrl: activeKey?.baseUrl,
          thinkingLevel:
            currentModel === ModelId.PRO
              ? undefined
              : thinkingMode !== "none"
                ? (thinkingMode as any)
                : undefined,
        },
        (content) => {
          setMessages((prev) => {
            const next = [...prev];
            const msgIdx = next.findIndex((m) => m.id === assistantMessage.id);
            if (msgIdx > -1) {
              next[msgIdx] = { ...next[msgIdx], content };
            }
            return next;
          });
        },
      );

      // Now extract the title and save the session
      setMessages((prev) => {
        const nextMessages = [...prev];
        const lastMsg = { ...nextMessages[nextMessages.length - 1] };

        let finalTitle = undefined;
        if (
          lastMsg &&
          lastMsg.role === "model" &&
          lastMsg.content.includes("TITLE:")
        ) {
          const parts = lastMsg.content.split("TITLE:");
          finalTitle = parts[1].trim();
          lastMsg.content = parts[0].trim();
          nextMessages[nextMessages.length - 1] = lastMsg;
        }

        setTimeout(
          () => saveCurrentSession(nextMessages, sessionId, finalTitle),
          50,
        );
        return nextMessages;
      });
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 2}`,
          role: "model",
          content: `**Summarizer Skill Failure:** ${err.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (
    e?: React.FormEvent,
    overrideMessages?: Message[],
  ) => {
    e?.preventDefault();
    const targetInput = overrideMessages
      ? overrideMessages[overrideMessages.length - 1]?.content || ""
      : input;
    if (!targetInput.trim() || isLoading) return;

    // Immediately update UI to prevent "holding" old content
    setIsLoading(true);
    if (!overrideMessages) {
      setInput("");
      const currentAttachments = [...attachments];
      // Keep repo attachments in the UI for persistence
      setAttachments(currentAttachments.filter((a) => a.type === "repo"));

      const processedInput = targetInput;

      abortControllerRef.current = new AbortController();

      // Auto-detect GitHub URL and suggest attachment if repo is mentioned
      let finalAttachments = currentAttachments;
      if (
        targetInput.includes("github.com/") &&
        !currentAttachments.some((a) => a.type === "repo")
      ) {
        try {
          const info = await githubService.getRepoInfo(targetInput);
          if (info) {
            const repoContent: Attachment = {
              name: `Context: ${info.owner}/${info.name}`,
              content: githubService.formatRepoSummary(info),
              type: "repo",
            };
            finalAttachments = [...currentAttachments, repoContent];
            // Also append this auto-detected repo to persistent state
            setAttachments((prev) => [
              ...prev.filter((a) => a.type === "repo"),
              repoContent,
            ]);
            setValidationStatus({
              type: "success",
              message: `Neural Link established with ${info.name}`,
            });

            transparencyLogger.log(
              "Research/Retrieval",
              `Retrieved repository context from GitHub: ${info.owner}/${info.name}`,
              { url: `https://github.com/${info.owner}/${info.name}` },
            );

            setTimeout(() => setValidationStatus(null), 3000);
          }
        } catch (e: any) {
          console.warn("Auto-repo detection failed", e);
          if (e.message) {
            setValidationStatus({ type: "error", message: e.message });
            setTimeout(() => setValidationStatus(null), 3000);
          }
        }
      }

      let sessionId = currentSessionId;
      if (!sessionId) {
        sessionId = `session-${Date.now()}`;
        setCurrentSessionId(sessionId);
      }

      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: processedInput,
        attachments:
          finalAttachments.length > 0 ? finalAttachments : undefined,
        editHistory: [],
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      saveCurrentSession(newMessages, sessionId);

      // Simple Intent Detection for Image/Video Gen / Goal planning
      let effectivePrompt = processedInput;
      if (processedInput.toLowerCase().startsWith("/plan")) {
        const planQuery = processedInput.replace(/^\/plan\s*/i, "").trim();
        effectivePrompt = planQuery 
          ? `[ENGINEERING PLAN REQUEST]\nPlease produce a comprehensive, structured technical implementation plan for: "${planQuery}".\n\nInclude:\n1. Architectural Decisions & Scope Boundaries\n2. Phased File-by-File Implementation Steps\n3. Edge Cases & Safety Invariants\n4. Verification & Automated Testing Strategy`
          : `[ENGINEERING PLAN REQUEST]\nPlease analyze our ongoing project context and outline a prioritized technical implementation roadmap with concrete execution milestones and verification steps.`;
      }

      if (processedInput.toLowerCase().startsWith("/goal")) {
        const goalQuery = processedInput.replace(/^\/goal\s*/i, "").trim();
        await handleGoalPlanning(goalQuery, sessionId);
        return;
      }

      if (
        isImageMode ||
        processedInput.toLowerCase().startsWith("generate image")
      ) {
        await handleImageGen(
          processedInput.replace(/generate image/i, "").trim() ||
            processedInput,
          sessionId,
        );
        return;
      }

      if (
        isVideoMode ||
        processedInput.toLowerCase().startsWith("generate video")
      ) {
        await handleVideoGen(
          processedInput.replace(/generate video/i, "").trim() ||
            processedInput,
          sessionId,
        );
        return;
      }

      let mainActionId: string | undefined;
      try {
        transparencyLogger.clear();
        mainActionId = transparencyLogger.log(
          "Analysis",
          `Initializing neural generation process for model: ${currentModel}`,
          {
            model: currentModel,
            provider: activeKey?.provider,
            useSearch,
            thinkingLevel:
              currentModel === ModelId.PRO
                ? undefined
                : thinkingMode !== "none"
                  ? (thinkingMode as any)
                  : undefined,
          },
          "active",
        );

        if (useSearch) {
          transparencyLogger.log(
            "Research/Retrieval",
            "Authorized external Google Search access requested",
            { domains: ["*.google.com"] },
          );
        }

        const effectiveModel =
          currentModel === ModelId.HYBRID
            ? modelQueueManager.getCurrentModel()
            : currentModel;
        const assistantMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          role: "model",
          content: "",
          modelName: `${effectiveModel}${activeKey ? ` (${activeKey.name})` : ""}`,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        const history = newMessages
          .filter((m) => m && m.role && m.content)
          .map((m, index) => {
            const parts: any[] = [{ text: m.content }];
            const existingAttachmentNames = new Set<string>();
            if (m.attachments) {
              for (const a of m.attachments) {
                existingAttachmentNames.add(a.name);
                parts.push(geminiService.attachmentToPart(a));
              }
            }
            // Inject persistent repo sync into the current API interaction if not already attached
            if (index === newMessages.length - 1 && m.role === "user") {
              const repoAttachments = finalAttachments.filter(
                (a) => a.type === "repo" && !existingAttachmentNames.has(a.name),
              );
              parts.push(
                ...repoAttachments.map((a) =>
                  geminiService.attachmentToPart(a),
                ),
              );
            }
            return {
              role: m.role,
              parts: parts,
            };
          });

        await geminiService.generateResponse(
          effectivePrompt,
          activeSkillIds,
          customSkills,
          history,
          {
            model: currentModel,
            useSearch,
            session: sessions.find(s => s.id === currentSessionId),
            isAutoCompact,
            thinkingLevel:
              currentModel === ModelId.PRO
                ? undefined
                : thinkingMode !== "none"
                  ? (thinkingMode as any)
                  : undefined,
            signal: abortControllerRef.current.signal,
            attachments: userMessage.attachments,
            customKey: activeKey?.key,
            provider: activeKey?.provider,
            customBaseUrl: activeKey?.baseUrl,
            customInstructions: (user || {}).customInstructions,
            githubToken: (user || {}).githubToken,
            onModelSwitch: (newModel, isFallback) => {
              try {
                console.log('[useChatSessions] onModelSwitch to:', newModel, 'isFallback:', isFallback);
                if (!isFallback) {
                  setCurrentModel(newModel);
                }
                setMessages((prev) => {
                  const last = [...prev];
                  const msg = { ...last[last.length - 1] };
                  if (msg && msg.role === "model") {
                    msg.modelName = `${newModel}${activeKey ? ` (${activeKey.name})` : ""}`;
                    msg.isFallback = isFallback !== false;
                    last[last.length - 1] = msg;
                  }
                  return last;
                });
              } catch (e) {
                console.error("Model switch handling failed", e);
              }
            },
          },
          (fullContent) => {
            setMessages((prev) => {
              const last = [...prev];
              const msg = { ...last[last.length - 1] };
              if (msg && msg.role === "model") {
                msg.content = fullContent;
                if (!msg.isFallback) {
                  const currentEffective =
                    currentModel === ModelId.HYBRID
                      ? modelQueueManager.getCurrentModel()
                      : currentModel;
                  msg.modelName = `${currentEffective}${activeKey ? ` (${activeKey.name})` : ""}`;
                }
                last[last.length - 1] = msg;
              }
              return last;
            });
          },
        );

        setMessages((prev) => {
          setTimeout(() => saveCurrentSession(prev, sessionId), 0);
          return prev;
        });
        //
      } catch (error: any) {
        if (mainActionId)
          transparencyLogger.updateAction(mainActionId, { status: "failed" });
        if (error.message === "Operation aborted") {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            {
              id: `err-${Date.now()}`,
              role: "model",
              content: `*Generation cancelled by (user || {}).*`,
            },
          ]);
        } else {
          const diag = diagnoseAgentError(error);
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              role: "model",
              content: `⚠️ **AI Service Notice: ${diag.title}** \`[${diag.badge}]\`\n\n${diag.description}\n\n💡 **Action:** ${diag.suggestion}`,
            },
          ]);
          if (addNotification) {
            addNotification(`[${diag.badge}] ${diag.title}`, "error");
          }
        }
      } finally {
        if (mainActionId)
          transparencyLogger.updateAction(mainActionId, {
            status: "completed",
          });
        setIsLoading(false);
      }
    } else {
      // Handle overrideMessages (edit case)
      // Similar logic but don't clear input
      let mainRetryActionId: string | undefined;
      try {
        mainRetryActionId = transparencyLogger.log(
          "Analysis",
          `Retrying neural generation sequence`,
          { model: currentModel },
          "active",
        );
        abortControllerRef.current = new AbortController();
        const processedInput = targetInput;

        let sessionId = currentSessionId;
        if (!sessionId) {
          sessionId = `session-${Date.now()}`;
          setCurrentSessionId(sessionId);
        }

        const effectiveModel =
          currentModel === ModelId.HYBRID
            ? modelQueueManager.getCurrentModel()
            : currentModel;
        const assistantMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          role: "model",
          content: "",
          modelName: `${effectiveModel}${activeKey ? ` (${activeKey.name})` : ""}`,
        };

        setMessages((prev) => [
          ...prev.slice(0, overrideMessages.length),
          assistantMessage,
        ]);

        const history = overrideMessages
          .filter((m) => m && m.role && m.content)
          .map((m, index) => {
            const parts: any[] = [{ text: m.content }];
            if (m.attachments) {
              parts.push(
                ...m.attachments.map((a) => geminiService.attachmentToPart(a)),
              );
            }
            // Inject persistent repo sync into the current API interaction
            if (index === overrideMessages.length - 1 && m.role === "user") {
              const repoAttachments = attachments.filter(
                (a) => a.type === "repo",
              );
              parts.push(
                ...repoAttachments.map((a) =>
                  geminiService.attachmentToPart(a),
                ),
              );
            }
            return { role: m.role, parts: parts };
          });

        await geminiService.generateResponse(
          processedInput,
          activeSkillIds,
          customSkills,
          history,
          {
            model: currentModel,
            useSearch,
            session: sessions.find(s => s.id === currentSessionId),
            isAutoCompact,
            thinkingLevel:
              currentModel === ModelId.PRO
                ? undefined
                : thinkingMode !== "none"
                  ? (thinkingMode as any)
                  : undefined,
            signal: abortControllerRef.current.signal,
            customKey: activeKey?.key,
            provider: activeKey?.provider,
            customBaseUrl: activeKey?.baseUrl,
            customInstructions: (user || {}).customInstructions,
            githubToken: (user || {}).githubToken,
            onModelSwitch: (newModel, isFallback) => {
              try {
                console.log('[useChatSessions] retry onModelSwitch to:', newModel, 'isFallback:', isFallback);
                if (!isFallback) {
                  setCurrentModel(newModel);
                }
                setMessages((prev) => {
                  const last = [...prev];
                  const msg = { ...last[last.length - 1] };
                  if (msg && msg.role === "model") {
                    msg.modelName = `${newModel}${activeKey ? ` (${activeKey.name})` : ""}`;
                    msg.isFallback = isFallback !== false;
                    last[last.length - 1] = msg;
                  }
                  return last;
                });
              } catch (e) {
                console.error("Model switch handling failed", e);
              }
            },
          },
          (fullContent) => {
            setMessages((prev) => {
              const last = [...prev];
              const msg = { ...last[last.length - 1] };
              if (msg && msg.role === "model") {
                msg.content = fullContent;
                if (!msg.isFallback) {
                  const currentEffective =
                    currentModel === ModelId.HYBRID
                      ? modelQueueManager.getCurrentModel()
                      : currentModel;
                  msg.modelName = `${currentEffective}${activeKey ? ` (${activeKey.name})` : ""}`;
                }
                last[last.length - 1] = msg;
              }
              return last;
            });
          },
        );

        setMessages((prev) => {
          setTimeout(() => saveCurrentSession(prev, sessionId), 0);
          return prev;
        });
      } catch (error: any) {
        if (mainRetryActionId)
          transparencyLogger.updateAction(mainRetryActionId, {
            status: "failed",
          });
        const diag = diagnoseAgentError(error);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "model",
            content: `⚠️ **AI Service Notice: ${diag.title}** \`[${diag.badge}]\`\n\n${diag.description}\n\n💡 **Action:** ${diag.suggestion}`,
          },
        ]);
        if (addNotification) {
          addNotification(`[${diag.badge}] ${diag.title}`, "error");
        }
      } finally {
        if (mainRetryActionId)
          transparencyLogger.updateAction(mainRetryActionId, {
            status: "completed",
          });
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };


  return {
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
  };
}

export function useDevEngineEffects(options: any) {
  const {
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
  } = options;

  const findSkillSuggestions = (text: string, skills: any[]) => {
    if (!text.trim() || text.length < 3) return [];
    const textLower = text.toLowerCase();
    return skills.filter(s =>
      s.trigger.toLowerCase().includes(textLower) ||
      s.name.toLowerCase().includes(textLower) ||
      s.description.toLowerCase().includes(textLower)
    );
  };

  const currentSession = sessions.find((s: any) => s.id === currentSessionId);
  const lastStatesRef = React.useRef<Record<string, { status?: string; description?: string }>>({});

  useEffect(() => {
    if (!input.startsWith("/")) {
      setIsCommandListDismissed(false);
      setSelectedCommandIndex(0);
    }
  }, [input]);

useEffect(() => {
    if (showSettings && settingsTab === "knowledge") {
      fetchKnowledgeData();
    }
  }, [showSettings, settingsTab]);

useEffect(() => {
    const handleInteraction = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.message) {
        addNotification(
          detail.message,
          detail.action === "query" ? "info" : "success",
        );
        // Automatically sync knowledge details when any new proposal or query interaction occurs
        fetchKnowledgeData();
      }
    };
    const handleKnowledgeUpdate = () => fetchKnowledgeData();

    window.addEventListener("knowledge-interaction", handleInteraction);
    window.addEventListener("knowledge_update_needed", handleKnowledgeUpdate);
    return () => {
      window.removeEventListener("knowledge-interaction", handleInteraction);
      window.removeEventListener(
        "knowledge_update_needed",
        handleKnowledgeUpdate,
      );
    };
  }, []);

useEffect(() => {
    if (currentSessionId && sessions.length > 0) {
      if (currentSession && currentSession.title) {
        document.title = `${currentSession.title} | DevEngine`;
        return;
      }
    }
    document.title = "Dashboard | DevEngine";
  }, [currentSessionId, sessions]);

useEffect(() => {
    document.title = "Dashboard | DevEngine";
    const fetchUserAndState = async () => {
      try {
        const token = storageService.getItem("session");
        if (!token) return;
        const data = await apiClient.get<any>("/api/auth/me");
        setUser(data);

        // Now fetch state
        const stateData = await apiClient.get<any>("/api/user/state");
            if (stateData.preferences) {
              setTheme(stateData.preferences.theme || "midnight");
              const savedModel = stateData.preferences.currentModel || storageService.getItem("devengine_last_model") || modelQueueManager.getCurrentModel();
              if (savedModel) {
                setCurrentModel(savedModel);
                modelQueueManager.promoteToCurrent(savedModel);
                storageService.setItem("devengine_last_model", savedModel);
              }
              setActiveKeyId(stateData.preferences.activeKeyId || "");
              setShowSkillSuggestions(
                stateData.preferences.showSkillSuggestions ?? true,
              );
              if (stateData.preferences.enabledModels) {
                setGlobalEnabledModels(stateData.preferences.enabledModels);
              }
            } else {
              setActiveKeyId("");
            }
            setApiKeys(Array.isArray(stateData.apiKeys) ? stateData.apiKeys : []);
            if (stateData.customSkills) {
              setCustomSkills(Array.isArray(stateData.customSkills) ? stateData.customSkills : []);
            }
            if (stateData.sessions) {
              const userSessions = Array.isArray(stateData.sessions) ? stateData.sessions : [];
              setSessions(userSessions.sort((a: any, b: any) => {
                const tB = new Date(b.updatedAt || 0).getTime();
                const tA = new Date(a.updatedAt || 0).getTime();
                return tB - tA;
              }));
            }

          // Fetch model catalog
          try {
            const modelsData = await apiClient.get<any[]>("/api/models/info");
            if (Array.isArray(modelsData) && modelsData.length > 0) {
              setModelCatalog(modelsData);
              setGlobalModelCatalog(modelsData);
            }
          } catch (e) {
            console.warn("Failed to fetch model catalog", e);
          }
      } catch (e) {
        console.error("Failed to fetch user context", e);
        setUser(null);
      } finally {
        setIsStateLoaded(true);
      }
    };
    fetchUserAndState();
  }, []);

useEffect(() => {
    if (user?.role !== "ADMIN") return;

    const handleGlobalError = (event: ErrorEvent) => {
      setAdminLogs((prev) => [
        ...prev,
        `[RUNTIME_ERROR] ${event.message} (Position: ${event.filename?.split("/").pop() || "unknown"}:${event.lineno}:${event.colno})`,
      ]);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setAdminLogs((prev) => [
        ...prev,
        `[REJECTION] Unresolved promise: ${event.reason?.message || event.reason}`,
      ]);
    };
    
    // Connect to Backend System Logs
    const token = storageService.getItem('session');
    let evtSource: EventSource | null = null;
    if (token) {
      evtSource = new EventSource(`/api/admin/logs?token=${token}`);
      evtSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'history') {
            setAdminLogs(prev => [...prev, ...data.logs]);
          } else if (data.type === 'log') {
            setAdminLogs(prev => [...prev, data.log]);
          }
        } catch(e) {}
      };
      evtSource.onerror = () => {
         // silently close/reconnect
      };
    }

    // Intercept console logs to pipe to System CLI Console
    const origLog = console.log;
    const origInfo = console.info;
    const origWarn = console.warn;
    const origError = console.error;
    
    const stringifyArgs = (args: any[]) => args.map(a => {
      if (a instanceof Error) {
        return `${a.name}: ${a.message}`;
      }
      if (typeof a === 'object' && a !== null) {
        try {
          // If object has no keys (like some custom error instances Event etc), try to read its properties
          const str = JSON.stringify(a);
          if (str === '{}' && a.message) return a.message;
          return str;
        } catch (e) {
          return String(a);
        }
      }
      return String(a);
    }).join(' ');

    console.log = (...args) => {
      origLog(...args);
      setAdminLogs(prev => [...prev, `[LOG] ${stringifyArgs(args)}`]);
    };
    console.info = (...args) => {
      origInfo(...args);
      setAdminLogs(prev => [...prev, `[INFO] ${stringifyArgs(args)}`]);
    };
    console.warn = (...args) => {
      origWarn(...args);
      setAdminLogs(prev => [...prev, `[WARN] ${stringifyArgs(args)}`]);
    };
    console.error = (...args) => {
      origError(...args);
      setAdminLogs(prev => [...prev, `[ERROR] ${stringifyArgs(args)}`]);
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      console.log = origLog;
      console.info = origInfo;
      console.warn = origWarn;
      console.error = origError;
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, [user]);

useEffect(() => {
    if (user?.role !== "ADMIN") return;

    const unsubscribe = transparencyLogger.subscribe((actions) => {
      // Process from oldest to newest (chronological order)
      const reversed = [...actions].reverse();
      const newLogs: string[] = [];
      const updatedStates = { ...lastStatesRef.current };

      for (const action of reversed) {
        const lastState = lastStatesRef.current[action.id];
        const currentStatus = action.status || "pending";

        if (!lastState) {
          // Entirely new action
          newLogs.push(
            `[SYSTEM] RUNNING: ${action.category} - ${action.description}`,
          );
          updatedStates[action.id] = {
            status: currentStatus,
            description: action.description,
          };
        } else if (lastState.status !== currentStatus) {
          // Transitioned state
          if (currentStatus === "completed") {
            newLogs.push(
              `[SUCCESS] Task "${action.description}" completed successfully.`,
            );
          } else if (currentStatus === "failed") {
            let errorMsg = "";
            const payload = action.outputPayload;
            if (payload) {
              if (payload.error) {
                errorMsg =
                  typeof payload.error === "object"
                    ? JSON.stringify(payload.error)
                    : String(payload.error);
              } else {
                errorMsg = JSON.stringify(payload);
              }
            }
            newLogs.push(
              `[API_FAILURE] Task "${action.description}" failed: ${errorMsg || "Unknown integration error arose."}`,
            );
          }
          updatedStates[action.id] = {
            status: currentStatus,
            description: action.description,
          };
        }
      }

      if (newLogs.length > 0) {
        setAdminLogs((prev) => [...prev, ...newLogs]);
      }
      lastStatesRef.current = updatedStates;
    });

    return unsubscribe;
  }, [user]);

useEffect(() => {
    if (!isStateLoaded) return;
    const token = storageService.getItem("session");
    if (!token) return;

    const timer = setTimeout(async () => {
      try {
        await apiClient.put("/api/user/state", {
            preferences: {
              theme,
              currentModel,
              activeKeyId,
              showSkillSuggestions,
              enabledModels: globalEnabledModels,
            },
            apiKeys,
            customSkills,
            sessions,
          });
      } catch (e) {
        console.warn("Failed to sync state, will retry on next update", e);
      }
    }, 300); // Debounce
    return () => clearTimeout(timer);
  }, [
    sessions,
    customSkills,
    apiKeys,
    activeKeyId,
    theme,
    currentModel,
    showSkillSuggestions,
    globalEnabledModels,
    isStateLoaded,
  ]);

  useEffect(() => {
    // Legacy reset handler removed
  }, []);

useEffect(() => {
    if (view === "knowledge") {
      fetchKnowledgeData();
    }
  }, [view]);

useEffect(() => {
    if (autoScroll && scrollRef.current) {
      // Use 'auto' behavior to avoid jitter when messages are rapidly streaming
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: isLoading ? "auto" : "smooth",
      });
    }
  }, [messages, autoScroll, isLoading]);

useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(geminiService.getAllMetrics());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const allAvailableSkills = [...DEFAULT_SKILLS, ...customSkills];
        const matches = findSkillSuggestions(input, allAvailableSkills);
        setSuggestedSkills(
          matches.filter((s) => !activeSkillIds.includes(s.id)),
        );
      } catch (e) {
        setSuggestedSkills([]);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [input, customSkills, activeSkillIds]);

useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const activeKey = apiKeys.find((k) => k.id === activeKeyId);
        const suggestion = await geminiService.generateAutocomplete(
          input,
          activeKey?.key,
        );
        if (isMounted) {
          setAutocompleteSuggestion(suggestion);
        }
      } catch (e) {
        if (isMounted) setAutocompleteSuggestion("");
      }
    }, 800);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [input, activeKeyId, apiKeys]);

useEffect(() => {
    if (showCommands) {
      setSelectedCommandIndex((prev) => {
        if (prev >= filteredCommands.length) return 0;
        return prev;
      });
    }
  }, [showCommands, filteredCommands.length]);

}
