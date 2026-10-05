import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Bot,
  Send,
  Square,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Wrench,
  Terminal,
  AlertCircle,
  Clock,
  Trash2,
  Maximize2,
  Minimize2,
  Sparkles,
  Wifi,
  WifiOff,
  MessageSquare,
  Check,
  X,
  Play,
  CheckCircle2,
  ListOrdered,
  ChevronUp,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Pencil,
  Paperclip,
  Brain,
  Database,
  Image as ImageIcon,
  FileCode,
  FileText,
  Plus,
  ExternalLink,
  History,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { AiSparkIcon } from '../AiSparkIcon';
import ReactMarkdown from 'react-markdown';
import type { PluggableList } from 'unified';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { preprocessMath, katexOptions, useMathRendering } from '@/lib/mathUtils';
import { cn } from '@/lib/utils';
import { agentSessionService } from '../../services/agentSessionService.js';
import { geminiService, DEFAULT_SKILLS, type Skill } from '../../services/geminiService.js';
import { workspaceService } from '../../services/workspaceService.js';
import type { ChangeSet } from '../../../agent/changes/ChangeSetTypes.js';
import { ChangeSetReview } from './ChangeSetReview.js';
import { SimplifiedChangeRecord } from './SimplifiedChangeRecord.js';
import { SimplifiedPlanRecord } from './SimplifiedPlanRecord.js';
import { AgentActivityCard, type AgentActivityItem } from './AgentActivityCard.js';
import { TerminalCommandRecord, type TerminalCommandData } from './TerminalCommandRecord.js';
import { AgentChatSkeleton } from '../AgentChatSkeleton.js';
import {
  DEFAULT_CHAT_MODEL,
  isGeminiThinkingConfigSupported,
  getSupportedThinkingLevelsForModel
} from '../../../agent/agent.config.js';
import type { GoalPlanningResult } from '../../../server/services/agentIntegration/planning/GoalPlanningTypes.js';
import type {
  AgentSessionContext,
  AgentSessionStatus,
  AgentSessionEvent,
  AgentContextHandoff
} from '../../../agent/session/index.js';
import { useChatContext } from '../../contexts/ChatProvider.js';
import type { ChatSession, Message, Attachment } from '../../services/chatSessionManager.js';
import { useThinkingStore, thinkingStore } from '../../utils/transparencyLogger.js';
import { ThinkingProcessDrawer } from '../ThinkingProcessDrawer.js';

export interface AgentPanelMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  editHistory?: string[];
  isStreaming?: boolean;
  error?: string;
  rating?: number; // 1 = up, -1 = down, 0 = none
  attachments?: Attachment[];
  changeSet?: ChangeSet;
  terminalCommand?: TerminalCommandData;
  activity?: AgentActivityItem;
  planRecord?: {
    planResult: GoalPlanningResult;
    status: 'APPROVED' | 'EXECUTED' | 'COMPLETED' | 'REJECTED';
    summary?: string;
  };
  thinkingContent?: string;
  thoughtDurationSeconds?: number;
  interactionType?: 'CHAT' | 'AGENT' | 'UNKNOWN';
  messageRole?: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL' | 'UNKNOWN';
  messageKind?: string;
  responseCode?: string;
  surface?: string;
  executionId?: string;
  planId?: string;
  toolCallId?: string;
  parentMessageId?: string;
  modelName?: string;
}

export interface AgentPanelActivity {
  id: string;
  type: 'tool' | 'terminal' | 'lifecycle';
  title: string;
  details?: string;
  status: 'pending' | 'success' | 'error';
  timestamp: number;
}

export interface AgentPanelProps {
  workspaceId?: string;
  workspaceName?: string;
  theme?: 'light' | 'dark';
  initialSessionId?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenFile?: (filePath: string) => void;
  currentFile?: string;
  selectedCode?: string;
  openFiles?: string[];
  allWorkspaceFiles?: string[];
  onSessionResolved?: (session: AgentSessionContext) => void;
  initialHandoff?: AgentContextHandoff;
  onContinueInChat?: (handoff: AgentContextHandoff) => void;
  activePlanContext?: {
    goalId: string;
    planId: string;
    taskId?: string;
    goalSummary?: string;
    taskSummary?: string;
    dependencies?: string[];
    completedTasks?: string[];
    relevantTaskOutputs?: unknown[];
    workspaceId?: string;
    sessionId?: string;
  };
  currentPlanResult?: GoalPlanningResult | null;
  isExecutingPlan?: boolean;
  onExecutePlan?: (plan: GoalPlanningResult) => void;
  onRejectPlan?: () => void;
  onRefreshWorkspace?: () => void;
  onViewInTerminal?: (executionId?: string) => void;
  onClearHandoff?: () => void;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({
  workspaceId,
  workspaceName,
  theme = 'dark',
  initialSessionId,
  isCollapsed = false,
  onToggleCollapse,
  onOpenFile,
  currentFile,
  selectedCode,
  openFiles,
  allWorkspaceFiles = [],
  onSessionResolved,
  initialHandoff,
  onClearHandoff,
  onContinueInChat,
  activePlanContext,
  currentPlanResult,
  isExecutingPlan = false,
  onExecutePlan,
  onRejectPlan,
  onRefreshWorkspace,
  onViewInTerminal
}) => {
  const [sessionContext, setSessionContext] = useState<AgentSessionContext | null>(null);
  const [sessionStatus, setSessionStatus] = useState<AgentSessionStatus>('IDLE');
  const [activeModel, setActiveModel] = useState<string>(DEFAULT_CHAT_MODEL);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [messages, setMessages] = useState<AgentPanelMessage[]>([]);
  const [activities, setActivities] = useState<AgentActivityItem[]>([]);
  const [changeSets, setChangeSets] = useState<ChangeSet[]>([]);
  const [applyingChangeSetId, setApplyingChangeSetId] = useState<string | null>(null);
  const [rejectingChangeSetId, setRejectingChangeSetId] = useState<string | null>(null);
  const [inputText, setInputText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExpandedActivities, setIsExpandedActivities] = useState<boolean>(false);
  const [isPlanCardExpanded, setIsPlanCardExpanded] = useState<boolean>(true);
  const [completedPlanIds, setCompletedPlanIds] = useState<Set<string>>(new Set());
  const [attachedPlan, setAttachedPlan] = useState<{
    goalId?: string;
    planId?: string;
    taskId?: string;
    status?: string;
    totalTasks?: number;
    completedTasks?: number;
  } | null>(null);

  // Feature parity states from ChatWindow
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>([]);
  const [thinkingMode, setThinkingMode] = useState<string>('medium');
  const [isAutoCompact, setIsAutoCompact] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [historyModalMsgId, setHistoryModalMsgId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showSkillsMenu, setShowSkillsMenu] = useState<boolean>(false);
  const [showThinkingMenu, setShowThinkingMenu] = useState<boolean>(false);
  const [showFileMenu, setShowFileMenu] = useState<boolean>(false);
  const [isMathEnabled] = useMathRendering();

  const activeRemarkPlugins = useMemo<PluggableList>(() => isMathEnabled ? [remarkGfm, remarkMath] : [remarkGfm], [isMathEnabled]);
  const activeRehypePlugins = useMemo<PluggableList>(() => isMathEnabled ? [[rehypeKatex, katexOptions]] : [], [isMathEnabled]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const thinkingStartRef = useRef<number | null>(null);

  const {
    sessions,
    setSessions,
    currentSessionId,
    setCurrentSessionId,
    messages: globalChatMessages,
    setMessages: setGlobalChatMessages,
    customSkills
  } = useChatContext();

  // Real-time Thinking Store hook
  const { text: thinkingText, isThinking } = useThinkingStore();

  useEffect(() => {
    if (isThinking && !thinkingStartRef.current) {
      thinkingStartRef.current = Date.now();
    } else if (!isThinking && thinkingStartRef.current && thinkingText.length > 0) {
      const durationSeconds = Math.max(1, Math.round((Date.now() - thinkingStartRef.current) / 1000));
      const thoughtAct: AgentActivityItem = {
        id: `thought-${Date.now()}`,
        type: 'thinking',
        title: `Thought for ${durationSeconds}s`,
        thinkingContent: thinkingText,
        thoughtDurationSeconds: durationSeconds,
        status: 'success',
        timestamp: Date.now()
      };
      setActivities((prev) => [thoughtAct, ...prev]);
      setMessages((prev) => {
        const lastIdx = prev.length - 1;
        if (lastIdx >= 0 && prev[lastIdx].role === 'assistant') {
          const next = [...prev];
          next[lastIdx] = {
            ...next[lastIdx],
            thinkingContent: thinkingText,
            thoughtDurationSeconds: durationSeconds
          };
          return next;
        }
        return prev;
      });
      thinkingStartRef.current = null;
    }
  }, [isThinking, thinkingText]);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sseUnsubscribeRef = useRef<(() => void) | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isDark = theme === 'dark';

  const syncToChatSession = useCallback((updatedAgentMessages: AgentPanelMessage[], customSessionId?: string): void => {
    // Schedule asynchronously to prevent updating ChatProvider while AgentPanel is rendering
    setTimeout(() => {
      const targetId = customSessionId || sessionContext?.sessionId || currentSessionId;
      if (!targetId) return;

      const validTurns: Message[] = updatedAgentMessages
        .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0 && (m.role === 'user' || m.role === 'assistant' || (m.role as string) === 'model'))
        .map((m) => ({
          id: m.id,
          role: (m.role === 'assistant' || (m.role as string) === 'model') ? ('model' as const) : ('user' as const),
          content: m.content,
          attachments: m.attachments,
          rating: m.rating,
          interactionType: m.interactionType || 'AGENT',
          messageRole: m.messageRole || (m.role === 'assistant' ? 'ASSISTANT' : 'USER'),
          messageKind: m.messageKind || (m.role === 'assistant' ? 'AGENT_RESPONSE' : 'USER_INPUT'),
          responseCode: m.responseCode || (m.role === 'assistant' ? 'AGENT_FINAL' : 'USER_INPUT'),
          surface: m.surface || 'AGENT',
          executionId: m.executionId,
          planId: m.planId,
          toolCallId: m.toolCallId,
          parentMessageId: m.parentMessageId,
          modelName: m.modelName
        }));

      if (validTurns.length === 0) return;

      setGlobalChatMessages(validTurns);
      setCurrentSessionId(targetId);

      setSessions((prev: ChatSession[]) => {
        const idx = prev.findIndex((s) => s.id === targetId);
        const existing = idx > -1 ? prev[idx] : null;
        const firstUserMsg = validTurns.find((m) => m.role === 'user');
        const title = existing?.title && existing.title !== 'New Session'
          ? existing.title
          : firstUserMsg
            ? firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '')
            : 'Agent Session';

        const updatedChatSession: ChatSession = {
          id: targetId,
          title,
          messages: validTurns,
          updatedAt: Date.now(),
          pinned: existing?.pinned || false
        };

        if (idx > -1) {
          const next = [...prev];
          next[idx] = updatedChatSession;
          return next;
        } else {
          return [updatedChatSession, ...prev];
        }
      });
    }, 0);
  }, [sessionContext?.sessionId, currentSessionId, setGlobalChatMessages, setCurrentSessionId, setSessions]);

  // Only proposed or conflict changesets requiring user review are kept in the pending action area
  const pendingChangeSets = useMemo(() => {
    return changeSets.filter(
      (cs) => cs.status !== 'APPLIED' && cs.status !== 'REJECTED'
    );
  }, [changeSets]);

  // Output simplified record of applied or rejected change sets in the chat session
  const addChangeSetRecordToChat = useCallback((cs: ChangeSet) => {
    setMessages((prev) => {
      const existingIdx = prev.findIndex(
        (m) => m.changeSet?.changeSetId === cs.changeSetId
      );
      const recordMessage: AgentPanelMessage = {
        id: `cs-record-${cs.changeSetId}`,
        role: 'assistant',
        content: '',
        timestamp: cs.updatedAt || cs.createdAt || Date.now(),
        changeSet: cs
      };
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = recordMessage;
        return next;
      }
      return [...prev, recordMessage];
    });
  }, []);

  // Output simplified record of approved, executed, completed, or rejected plans in the chat session
  const addPlanRecordToChat = useCallback(
    (
      plan: GoalPlanningResult,
      status: 'APPROVED' | 'EXECUTED' | 'COMPLETED' | 'REJECTED',
      summaryText?: string
    ) => {
      const activePlanId =
        (plan.repairedPlan || plan.plan)?.id || plan.goal?.id || `plan-${Date.now()}`;
      setCompletedPlanIds((prev) => new Set(prev).add(activePlanId));
      setMessages((prev) => {
        const existingIdx = prev.findIndex(
          (m) => m.id === `plan-record-${activePlanId}` || m.planRecord?.planResult === plan
        );
        const recordMessage: AgentPanelMessage = {
          id: `plan-record-${activePlanId}`,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          planRecord: {
            planResult: plan,
            status,
            summary: summaryText
          }
        };
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = recordMessage;
          return next;
        }
        return [...prev, recordMessage];
      });
    },
    []
  );

  const handleApproveAndExecutePlan = useCallback(
    (plan: GoalPlanningResult) => {
      const stepsCount =
        (plan.repairedPlan || plan.plan)?.steps?.length || plan.taskSpecs?.length || 0;
      addPlanRecordToChat(
        plan,
        'EXECUTED',
        `Plan approved and executed (${stepsCount} steps)`
      );
      if (onExecutePlan) {
        onExecutePlan(plan);
      }
    },
    [addPlanRecordToChat, onExecutePlan]
  );

  const handleRejectPlanAction = useCallback(
    (plan: GoalPlanningResult) => {
      addPlanRecordToChat(plan, 'REJECTED', 'Plan rejected by user');
      if (onRejectPlan) {
        onRejectPlan();
      }
    },
    [addPlanRecordToChat, onRejectPlan]
  );

  const handleApplyChangeSet = async (changeSetId: string) => {
    setApplyingChangeSetId(changeSetId);
    try {
      const updated = await workspaceService.applyChangeSet(
        changeSetId,
        sessionContext?.sessionId,
        workspaceId
      );
      setChangeSets((prev) => prev.map((c) => (c.changeSetId === changeSetId ? updated : c)));
      addChangeSetRecordToChat(updated);
      onRefreshWorkspace?.();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('workspace:refresh', { detail: { reason: 'changeset_applied', changeSetId, workspaceId } }));
      }
    } finally {
      setApplyingChangeSetId(null);
    }
  };

  const handleRejectChangeSet = async (changeSetId: string) => {
    setRejectingChangeSetId(changeSetId);
    try {
      const updated = await workspaceService.rejectChangeSet(
        changeSetId,
        sessionContext?.sessionId,
        workspaceId
      );
      setChangeSets((prev) => prev.map((c) => (c.changeSetId === changeSetId ? updated : c)));
      addChangeSetRecordToChat(updated);
      onRefreshWorkspace?.();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('workspace:refresh', { detail: { reason: 'changeset_rejected', changeSetId, workspaceId } }));
      }
    } finally {
      setRejectingChangeSetId(null);
    }
  };

  const handleUndoChangeSet = useCallback(
    async (cs: ChangeSet) => {
      try {
        await handleRejectChangeSet(cs.changeSetId);
      } catch (err) {
        console.error('Failed to undo changeSet', err);
      }
    },
    [handleRejectChangeSet]
  );

  // Auto-scroll messages internally without scrolling the browser window
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, activities]);

  // Track plan execution completion events to immediately dismiss the plan card once implemented
  useEffect(() => {
    const handleExecutionResult = (e: any) => {
      const detail = e?.detail;
      if (detail?.planResult) {
        const plan = detail.planResult as GoalPlanningResult;
        const pId =
          plan.plan?.id || plan.repairedPlan?.id || plan.goal?.id;
        if (pId) {
          setCompletedPlanIds((prev) => new Set(prev).add(pId));
        }
        const stepsCount =
          (plan.repairedPlan || plan.plan)?.steps?.length || plan.taskSpecs?.length || 0;
        addPlanRecordToChat(
          plan,
          detail.success ? 'COMPLETED' : 'REJECTED',
          detail.success
            ? `Plan executed successfully (${stepsCount} steps)`
            : `Plan execution halted`
        );
        if (onRejectPlan) {
          onRejectPlan();
        }
      }
    };
    window.addEventListener('agent:execution-result', handleExecutionResult);
    return () => {
      window.removeEventListener('agent:execution-result', handleExecutionResult);
    };
  }, [addPlanRecordToChat, onRejectPlan]);

  // When attached plan completes via session events, automatically dismiss and record in chat
  useEffect(() => {
    if (attachedPlan?.status === 'COMPLETED' && currentPlanResult) {
      addPlanRecordToChat(currentPlanResult, 'COMPLETED', 'Plan completed successfully');
      if (onRejectPlan) {
        onRejectPlan();
      }
    }
  }, [attachedPlan?.status, currentPlanResult, addPlanRecordToChat, onRejectPlan]);

  // Session resolution & SSE connection lifecycle
  const currentSessionIdRef = useRef(currentSessionId);
  useEffect(() => { currentSessionIdRef.current = currentSessionId; }, [currentSessionId]);
  const globalChatMessagesRef = useRef(globalChatMessages);
  useEffect(() => { globalChatMessagesRef.current = globalChatMessages; }, [globalChatMessages]);
  const sessionsRef = useRef(sessions);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);

  const onSessionResolvedRef = useRef(onSessionResolved);
  useEffect(() => { onSessionResolvedRef.current = onSessionResolved; }, [onSessionResolved]);
  const onClearHandoffRef = useRef(onClearHandoff);
  useEffect(() => { onClearHandoffRef.current = onClearHandoff; }, [onClearHandoff]);
  const initialHandoffRef = useRef(initialHandoff);
  useEffect(() => { initialHandoffRef.current = initialHandoff; }, [initialHandoff]);
  const initialSessionIdRef = useRef(initialSessionId);
  useEffect(() => { initialSessionIdRef.current = initialSessionId; }, [initialSessionId]);
  const lastResolvedSessionIdRef = useRef<string | null>(null);

  const [isCreatingNewSession, setIsCreatingNewSession] = useState<boolean>(false);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);

  const resolveAndConnectSession = useCallback(async () => {
    // Clean up previous event stream
    if (sseUnsubscribeRef.current) {
      sseUnsubscribeRef.current();
      sseUnsubscribeRef.current = null;
    }

    setConnectionState('connecting');
    setIsLoadingSession(true);
    setErrorMessage(null);

    try {
      let resolvedSession: AgentSessionContext | null = null;
      const currentSessId = currentSessionIdRef.current;
      const sessList = sessionsRef.current;
      const activeHandoff = initialHandoffRef.current;
      const explicitInitSessId = initialSessionIdRef.current;

      // 1. Explicit handoff from Chat, or explicit initialSessionId takes precedence
      const targetSessionId = activeHandoff?.sessionId || explicitInitSessId;

      if (targetSessionId) {
        resolvedSession = await agentSessionService.getSession(targetSessionId);
      }

      // If initialHandoff was consumed, clear it so subsequent navigations don't get locked to it
      if (activeHandoff && onClearHandoffRef.current) {
        setTimeout(() => {
          onClearHandoffRef.current?.();
        }, 150);
      }

      // 2. Otherwise find the MOST RECENT (nearest time) session for this workspace to continue work
      if (!resolvedSession && workspaceId) {
        const latestWsSession = await agentSessionService.findSessionForWorkspace(workspaceId);
        if (latestWsSession) {
          resolvedSession = latestWsSession;
        }
      }

      // 3. Otherwise create a fresh, clean blank dedicated Workspace Agent session
      if (!resolvedSession) {
        const title = `Workspace Agent - ${workspaceName || workspaceId || 'Default'}`;
        const newSessionId = `session_agent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        resolvedSession = await agentSessionService.getOrCreateSession(newSessionId, {
          workspaceId,
          metadata: { title }
        });
      }

      // If workspaceId was provided but session had a different or empty workspace, attach it
      if (workspaceId && resolvedSession.workspaceId !== workspaceId) {
        resolvedSession = await agentSessionService.attachWorkspace(resolvedSession.sessionId, workspaceId);
      }

      if (workspaceId && resolvedSession?.sessionId) {
        try {
          sessionStorage.setItem(`devgenie_agent_sess_${workspaceId}`, resolvedSession.sessionId);
        } catch {}
      }

      setSessionContext(resolvedSession);
      setSessionStatus(resolvedSession.status || 'IDLE');
      if (onSessionResolvedRef.current && resolvedSession.sessionId !== lastResolvedSessionIdRef.current) {
        lastResolvedSessionIdRef.current = resolvedSession.sessionId;
        setTimeout(() => {
          onSessionResolvedRef.current?.(resolvedSession);
        }, 0);
      }
      if (resolvedSession.sessionId && currentSessId !== resolvedSession.sessionId) {
        setTimeout(() => {
          setCurrentSessionId(resolvedSession.sessionId);
        }, 0);
      }
      if (resolvedSession.activeModel?.modelId) {
        setActiveModel(resolvedSession.activeModel.modelId);
      }

      // Hydrate messages into transcript if local transcript is empty
      setMessages((prev) => {
        if (prev.length > 0) return prev;

        // Priority 1: initialHandoff recent messages
        if (initialHandoff?.recentMessages && initialHandoff.recentMessages.length > 0) {
          return initialHandoff.recentMessages.map((m) => ({
            id: m.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: (m.role === 'model' || (m.role as string) === 'assistant') ? ('assistant' as const) : m.role === 'system' ? ('system' as const) : ('user' as const),
            content: m.content || '',
            timestamp: m.timestamp || Date.now(),
            interactionType: 'AGENT' as const,
            messageRole: (m.role === 'model' || (m.role as string) === 'assistant') ? ('ASSISTANT' as const) : ('USER' as const),
            messageKind: (m.role === 'model' || (m.role as string) === 'assistant') ? 'AGENT_RESPONSE' : 'USER_INPUT',
            responseCode: (m.role === 'model' || (m.role as string) === 'assistant') ? 'AGENT_FINAL' : 'USER_INPUT',
            surface: 'AGENT'
          }));
        }

        // Priority 2: Check matching ChatSession in shared state only if ID matches this resolved session
        const matchedChatSession = sessList.find((s) => s.id === resolvedSession!.sessionId);
        if (matchedChatSession && matchedChatSession.messages && matchedChatSession.messages.length > 0) {
          return matchedChatSession.messages.map((m) => ({
            id: m.id,
            role: (m.role === 'model' || (m.role as string) === 'assistant') ? ('assistant' as const) : ('user' as const),
            content: m.content || '',
            timestamp: Date.now(),
            interactionType: m.interactionType || 'AGENT',
            messageRole: m.messageRole || (m.role === 'model' ? 'ASSISTANT' : 'USER'),
            messageKind: m.messageKind || (m.role === 'model' ? 'AGENT_RESPONSE' : 'USER_INPUT'),
            responseCode: m.responseCode || (m.role === 'model' ? 'AGENT_FINAL' : 'USER_INPUT'),
            surface: m.surface || 'AGENT',
            executionId: m.executionId,
            planId: m.planId,
            toolCallId: m.toolCallId,
            parentMessageId: m.parentMessageId,
            modelName: m.modelName
          }));
        }

        return [];
      });

      // Canonical Database Persistence: hydrate persisted messages from DB for this session
      if (resolvedSession.sessionId) {
        try {
          const persistedMessages = await agentSessionService.getSessionMessages(resolvedSession.sessionId);
          if (Array.isArray(persistedMessages) && persistedMessages.length > 0) {
            const loadedAgentMessages: AgentPanelMessage[] = persistedMessages.map((m: any) => ({
              id: m.id,
              role: (m.messageRole === 'ASSISTANT' || m.role === 'model' || m.role === 'assistant') ? ('assistant' as const) : m.messageRole === 'SYSTEM' || m.role === 'system' ? ('system' as const) : ('user' as const),
              content: m.content || '',
              timestamp: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
              rating: typeof m.rating === 'number' ? m.rating : undefined,
              attachments: Array.isArray(m.attachments) ? m.attachments : undefined,
              interactionType: m.interactionType || 'AGENT',
              messageRole: m.messageRole || (m.role === 'model' ? 'ASSISTANT' : 'USER'),
              messageKind: m.messageKind || (m.role === 'model' ? 'AGENT_RESPONSE' : 'USER_INPUT'),
              responseCode: m.responseCode || (m.role === 'model' ? 'AGENT_FINAL' : 'USER_INPUT'),
              surface: m.surface || 'AGENT',
              executionId: m.executionId,
              planId: m.planId,
              toolCallId: m.toolCallId,
              parentMessageId: m.parentMessageId,
              modelName: m.modelUsed
            }));

            setMessages((prev) => {
              const existingMap = new Map(prev.map((msg) => [msg.id, msg]));
              for (const lm of loadedAgentMessages) {
                if (!existingMap.has(lm.id)) {
                  existingMap.set(lm.id, lm);
                } else {
                  const existing = existingMap.get(lm.id)!;
                  existingMap.set(lm.id, {
                    ...existing,
                    ...lm,
                    content: existing.isStreaming ? (existing.content || lm.content) : lm.content,
                    isStreaming: existing.isStreaming
                  });
                }
              }
              const merged = Array.from(existingMap.values()).sort((a, b) => a.timestamp - b.timestamp);
              syncToChatSession(merged, resolvedSession.sessionId);
              return merged;
            });
          }
        } catch (err) {
          console.warn('[AgentPanel] Could not load persisted canonical messages:', err);
        }
      }

      // Fetch existing change sets for this session & workspace
      try {
        const existingChangeSets = await workspaceService.getChangeSets(resolvedSession.sessionId, workspaceId);
        setChangeSets(existingChangeSets);
        if (existingChangeSets.length > 0) {
          existingChangeSets.forEach((cs) => addChangeSetRecordToChat(cs));
        }
      } catch (err) {
        console.warn('[AgentPanel] Could not load initial changesets:', err);
      }

      // Connect SSE
      const unsubscribe = agentSessionService.subscribeSessionEvents(
        resolvedSession.sessionId,
        (event: AgentSessionEvent) => {
          handleSessionEvent(event);
        },
        () => {
          setConnectionState('disconnected');
        },
        () => {
          setConnectionState('connected');
        }
      );

      sseUnsubscribeRef.current = unsubscribe;
      setConnectionState('connected');
      setIsLoadingSession(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[AgentPanel] Failed to resolve session:', msg);
      setErrorMessage(`Failed to connect to agent session: ${msg}`);
      setConnectionState('error');
      setIsLoadingSession(false);
    }
  }, [workspaceId, workspaceName]);

  const handleNewSession = async () => {
    setIsCreatingNewSession(true);
    setConnectionState('connecting');
    try {
      if (sseUnsubscribeRef.current) {
        sseUnsubscribeRef.current();
        sseUnsubscribeRef.current = null;
      }
      const newSessionId = `session_agent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const title = `Workspace Agent - ${workspaceName || workspaceId || 'Default'}`;
      const newSession = await agentSessionService.getOrCreateSession(newSessionId, {
        workspaceId,
        metadata: { title }
      });
      if (workspaceId && newSession?.sessionId) {
        try {
          sessionStorage.setItem(`devgenie_agent_sess_${workspaceId}`, newSession.sessionId);
        } catch {}
      }
      setSessionContext(newSession);
      setSessionStatus(newSession.status || 'IDLE');
      setMessages([]);
      setActivities([]);
      setChangeSets([]);
      setGlobalChatMessages([]);
      setCurrentSessionId(newSession.sessionId);
      if (onRejectPlan) {
        onRejectPlan();
      }
      if (onSessionResolved) {
        onSessionResolved(newSession);
      }
      const unsub = agentSessionService.subscribeSessionEvents(newSession.sessionId, handleSessionEvent);
      sseUnsubscribeRef.current = unsub;
      setConnectionState('connected');
      window.dispatchEvent(
        new CustomEvent('app:notify', {
          detail: {
            message: 'Started a fresh, clean Agent session.',
            type: 'success',
            title: 'NEW SESSION',
            duration: 2500,
          },
        })
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[AgentPanel] Failed to create new session:', msg);
      setErrorMessage(`Failed to create new session: ${msg}`);
      setConnectionState('error');
    } finally {
      setIsCreatingNewSession(false);
    }
  };

  // Handle incoming session events from SSE
  const handleSessionEvent = useCallback((event: AgentSessionEvent) => {
    switch (event.type) {
      case 'session_status_changed': {
        const data = event.data as { status?: AgentSessionStatus; newStatus?: AgentSessionStatus } | undefined;
        const targetStatus = data?.newStatus || data?.status;
        if (targetStatus) {
          setSessionStatus(targetStatus);
        }
        break;
      }
      case 'model_changed': {
        const data = event.data as { modelId?: string } | undefined;
        if (data?.modelId) {
          setActiveModel(data.modelId);
        }
        break;
      }
      case 'tool_activity': {
        const data = event.data as {
          phase?: 'call' | 'result';
          tool?: string;
          args?: Record<string, unknown>;
          success?: boolean;
          error?: string;
          result?: unknown;
        } | undefined;

        if (data?.tool) {
          const isResult = data.phase === 'result';
          const toolName = data.tool;
          let detailStr: string | undefined = undefined;
          let actType: 'tool' | 'file' | 'search' | 'terminal' = 'tool';
          let filePath: string | undefined = (data.args?.TargetFile as string) || (data.args?.targetFile as string) || (data.args?.AbsolutePath as string);
          let command: string | undefined = (data.args?.CommandLine as string) || (data.args?.command as string);
          let query: string | undefined = (data.args?.query as string);
          let additions = 0;
          let deletions = 0;
          let diffStr: string | undefined = undefined;

          if (toolName === 'create_file') {
            actType = 'file';
            const content = (data.args?.Content as string) || '';
            additions = content ? content.split('\n').length : 1;
          } else if (toolName === 'edit_file' || toolName === 'multi_edit_file') {
            actType = 'file';
            const target = (data.args?.TargetContent as string) || '';
            const repl = (data.args?.ReplacementContent as string) || '';
            deletions = target ? target.split('\n').length : 1;
            additions = repl ? repl.split('\n').length : 1;
            diffStr = `--- ${filePath || 'file'}\n+++ ${filePath || 'file'}\n- ${target.slice(0, 300)}\n+ ${repl.slice(0, 300)}`;
          } else if (toolName === 'delete_file') {
            actType = 'file';
            deletions = 5;
          } else if (toolName === 'search_web') {
            actType = 'search';
          } else if (toolName === 'run_command') {
            actType = 'terminal';
          } else if (toolName === 'view_file' || toolName === 'read_file') {
            actType = 'file';
          }

          if (isResult) {
            if (data.error) {
              detailStr = data.error;
            } else if (typeof data.result === 'string') {
              detailStr = data.result.length > 200 ? `${data.result.substring(0, 200)}...` : data.result;
            } else if (data.result) {
              const resJson = JSON.stringify(data.result);
              detailStr = resJson.length > 200 ? `${resJson.substring(0, 200)}...` : resJson;
            }
          }

          const fileBaseName = filePath ? filePath.split('/').pop() || filePath : '';
          const customTitle = toolName === 'create_file'
            ? `Created ${fileBaseName}`
            : toolName === 'edit_file' || toolName === 'multi_edit_file'
            ? `Edited ${fileBaseName}`
            : toolName === 'delete_file'
            ? `Deleted ${fileBaseName}`
            : toolName === 'search_web'
            ? `Searched "${query || 'web'}"`
            : toolName === 'view_file' || toolName === 'read_file'
            ? `Read ${fileBaseName}`
            : toolName === 'run_command'
            ? `Terminal: ${command || 'command'}`
            : isResult
            ? `Tool '${toolName}' ${data.success ? 'completed' : 'failed'}`
            : `Invoking tool '${toolName}'`;

          setActivities((prev) => [
            {
              id: `tool-${Date.now()}-${Math.random()}`,
              type: actType,
              title: customTitle,
              details: detailStr,
              toolData: {
                tool: toolName,
                filePath,
                command,
                query,
                additions,
                deletions,
                diff: diffStr,
                stdout: typeof data.result === 'string' ? data.result : undefined,
                success: data.success,
                args: data.args
              },
              status: isResult ? (data.success ? 'success' : 'error') : 'pending',
              timestamp: Date.now()
            },
            ...prev.slice(0, 49) // Keep last 50 activities
          ]);

          if (isResult && data.success) {
            onRefreshWorkspace?.();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('workspace:refresh', { detail: { tool: data.tool, workspaceId } }));
            }
          }
        }
        break;
      }
      case 'terminal_event': {
        const data = event.data as {
          type?: string;
          line?: string;
          command?: string;
          exitCode?: number;
          durationMs?: number;
          error?: string;
          isAborted?: boolean;
          action?: string;
        } | undefined;

        if (!data) break;

        const eventType = data.type || (data.action === 'stop' ? 'terminal_exit' : undefined);
        const execId = event.executionId || (data as any)?.executionId || `cmd_${Date.now()}`;
        const cmd = data.command || 'command';

        if (eventType === 'terminal_started' || (!eventType && (data.command || data.line))) {
          const title = data.command ? `Terminal: ${data.command}` : `Output: ${data.line?.substring(0, 60)}`;
          setActivities((prev) => [
            {
              id: `term-${execId}`,
              type: 'terminal',
              title,
              toolData: {
                tool: 'run_command',
                command: data.command,
                executionId: execId,
                stdout: data.line
              },
              status: 'pending',
              timestamp: Date.now()
            },
            ...prev.slice(0, 49)
          ]);

          // Push into chat messages stream
          setMessages((prev) => {
            const existingIdx = prev.findIndex(
              (m) => m.terminalCommand?.executionId === execId || m.id === `term-msg-${execId}`
            );
            const cmdMsg: AgentPanelMessage = {
              id: `term-msg-${execId}`,
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
              terminalCommand: {
                id: execId,
                command: cmd,
                stdout: data.line || '',
                stderr: '',
                isRunning: true,
                executionId: execId,
                timestamp: Date.now()
              }
            };
            if (existingIdx >= 0) {
              const next = [...prev];
              next[existingIdx] = {
                ...next[existingIdx],
                terminalCommand: {
                  ...next[existingIdx].terminalCommand!,
                  command: cmd,
                  isRunning: true
                }
              };
              return next;
            }
            const lastIdx = prev.length - 1;
            if (lastIdx >= 0 && prev[lastIdx].role === 'assistant' && prev[lastIdx].isStreaming && !prev[lastIdx].content) {
              const next = [...prev];
              next.splice(lastIdx, 0, cmdMsg);
              return next;
            }
            return [...prev, cmdMsg];
          });
        } else if (eventType === 'terminal_output') {
          const chunk = (data as any).chunk || data.line || '';
          const isStderr = (data as any).stream === 'stderr';
          setMessages((prev) => {
            const idx = prev.findIndex(
              (m) => m.terminalCommand?.executionId === execId || m.id === `term-msg-${execId}`
            );
            if (idx >= 0 && prev[idx].terminalCommand) {
              const next = [...prev];
              const tc = next[idx].terminalCommand!;
              next[idx] = {
                ...next[idx],
                terminalCommand: {
                  ...tc,
                  stdout: !isStderr ? (tc.stdout || '') + chunk : tc.stdout,
                  stderr: isStderr ? (tc.stderr || '') + chunk : tc.stderr
                }
              };
              return next;
            }
            return prev;
          });
        } else if (eventType === 'terminal_exit' || eventType === 'terminal_error') {
          const isTimeout = Boolean((data as any)?.isTimeout || data.exitCode === 124);
          const isAborted = Boolean(data.isAborted || data.exitCode === 130);
          const isSuccess = data.exitCode === 0 && !data.error && !isAborted && !isTimeout;
          const status: 'success' | 'error' = isSuccess ? 'success' : 'error';
          const title = data.command
            ? `Terminal: ${data.command} (${isSuccess ? 'exited 0' : isTimeout ? 'timeout' : isAborted ? 'aborted' : `exited ${data.exitCode ?? 1}`})`
            : `Terminal ${isSuccess ? 'completed' : 'failed'}`;

          onRefreshWorkspace?.();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('workspace:refresh', { detail: { reason: 'terminal_exit', workspaceId } }));
          }

          setActivities((prev) => {
            const termExecId = `term-${execId || ''}`;
            const existingIndex = prev.findIndex((a) => (execId && a.id.startsWith(termExecId)) || (data.command && a.title.includes(data.command)));
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                status,
                title,
                toolData: {
                  ...updated[existingIndex].toolData,
                  tool: 'run_command',
                  command: data.command || updated[existingIndex].toolData?.command,
                  executionId: execId || updated[existingIndex].toolData?.executionId,
                  exitCode: data.exitCode,
                  isAborted,
                  isTimeout,
                  stdout: data.line || (data as any)?.stdout || updated[existingIndex].toolData?.stdout,
                  stderr: data.error || (data as any)?.stderr
                },
                timestamp: Date.now()
              };
              return updated;
            }
            return [
              {
                id: `term-${execId || Date.now()}`,
                type: 'terminal',
                title,
                toolData: {
                  tool: 'run_command',
                  command: data.command,
                  executionId: execId,
                  exitCode: data.exitCode,
                  isAborted,
                  isTimeout,
                  stdout: data.line,
                  stderr: data.error
                },
                status,
                timestamp: Date.now()
              },
              ...prev.slice(0, 49)
            ];
          });

          // Finalize terminal command message in chat
          setMessages((prev) => {
            const idx = prev.findIndex(
              (m) => m.terminalCommand?.executionId === execId || m.id === `term-msg-${execId}`
            );
            const finalExitCode = data.exitCode ?? (eventType === 'terminal_error' ? 1 : 0);
            if (idx >= 0 && prev[idx].terminalCommand) {
              const next = [...prev];
              const tc = next[idx].terminalCommand!;
              next[idx] = {
                ...next[idx],
                terminalCommand: {
                  ...tc,
                  isRunning: false,
                  exitCode: finalExitCode,
                  durationMs: data.durationMs || tc.durationMs,
                  isTimeout,
                  isAborted,
                  stdout: (data as any)?.stdout !== undefined ? (data as any).stdout : (data.line || tc.stdout),
                  stderr: (data as any)?.stderr !== undefined ? (data as any).stderr : (data.error || tc.stderr)
                }
              };
              return next;
            }
            return [
              ...prev,
              {
                id: `term-msg-${execId}`,
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
                terminalCommand: {
                  id: execId,
                  command: data.command || 'command',
                  stdout: (data as any)?.stdout || data.line || '',
                  stderr: (data as any)?.stderr || data.error || '',
                  exitCode: finalExitCode,
                  durationMs: data.durationMs,
                  isRunning: false,
                  isTimeout,
                  isAborted,
                  executionId: execId,
                  timestamp: Date.now()
                }
              }
            ];
          });
        }
        break;
      }
      case 'change_set_created':
      case 'change_set_updated': {
        const data = event.data as { changeSet?: ChangeSet } | undefined;
        if (data?.changeSet) {
          const cs = data.changeSet;
          setChangeSets((prev) => {
            const idx = prev.findIndex((c) => c.changeSetId === cs.changeSetId);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = cs;
              return next;
            }
            return [cs, ...prev];
          });
          // Immediately add to chat messages stream so it flows naturally!
          addChangeSetRecordToChat(cs);
          setActivities((prev) => [
            {
              id: `cs-${cs.changeSetId}-${Date.now()}`,
              type: 'lifecycle',
              title: `Proposed changes in ${cs.files.length} file(s)`,
              details: cs.files.map((f) => f.path).join(', '),
              status: 'pending',
              timestamp: Date.now()
            },
            ...prev.slice(0, 49)
          ]);
        }
        break;
      }
      case 'change_set_applied': {
        const data = event.data as { changeSetId: string; changeSet?: ChangeSet } | undefined;
        if (data?.changeSetId) {
          const appliedCs = data.changeSet;
          setChangeSets((prev) => {
            const next = prev.map((c) => (c.changeSetId === data.changeSetId ? (appliedCs || { ...c, status: 'APPLIED' as const }) : c));
            const target = appliedCs || next.find((c) => c.changeSetId === data.changeSetId);
            if (target) {
              addChangeSetRecordToChat(target);
            }
            return next;
          });
          setActivities((prev) => [
            {
              id: `cs-applied-${Date.now()}`,
              type: 'lifecycle',
              title: `Applied change set: ${data.changeSetId}`,
              status: 'success',
              timestamp: Date.now()
            },
            ...prev.slice(0, 49)
          ]);
          onRefreshWorkspace?.();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('workspace:refresh', { detail: { type: 'change_set_applied', changeSetId: data.changeSetId, workspaceId } }));
          }
        }
        break;
      }
      case 'change_set_rejected': {
        const data = event.data as { changeSetId: string; changeSet?: ChangeSet } | undefined;
        if (data?.changeSetId) {
          const rejectedCs = data.changeSet;
          setChangeSets((prev) => {
            const next = prev.map((c) => (c.changeSetId === data.changeSetId ? (rejectedCs || { ...c, status: 'REJECTED' as const }) : c));
            const target = rejectedCs || next.find((c) => c.changeSetId === data.changeSetId);
            if (target) {
              addChangeSetRecordToChat(target);
            }
            return next;
          });
          setActivities((prev) => [
            {
              id: `cs-rejected-${Date.now()}`,
              type: 'lifecycle',
              title: `Rejected change set: ${data.changeSetId} (Rolled back)`,
              status: 'error',
              timestamp: Date.now()
            },
            ...prev.slice(0, 49)
          ]);
          onRefreshWorkspace?.();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('workspace:refresh', { detail: { type: 'change_set_rejected', changeSetId: data.changeSetId, workspaceId } }));
          }
        }
        break;
      }
      case 'change_set_conflict': {
        const data = event.data as { changeSetId: string; conflictReason?: string; changeSet?: ChangeSet } | undefined;
        if (data?.changeSetId) {
          setChangeSets((prev) =>
            prev.map((c) =>
              c.changeSetId === data.changeSetId
                ? (data.changeSet || { ...c, status: 'CONFLICT' as const, conflictReason: data.conflictReason })
                : c
            )
          );
          setActivities((prev) => [
            {
              id: `cs-conflict-${Date.now()}`,
              type: 'lifecycle',
              title: `Conflict detected in change set: ${data.changeSetId}`,
              details: data.conflictReason,
              status: 'error',
              timestamp: Date.now()
            },
            ...prev.slice(0, 49)
          ]);
        }
        break;
      }
      case 'session_closed': {
        setSessionStatus('TERMINATED');
        setConnectionState('disconnected');
        break;
      }
      case 'plan_attached': {
        const data = event.data as { goalId?: string; planId?: string } | undefined;
        const pId = data?.planId || (event as any).planId;
        const gId = data?.goalId || (event as any).goalId;
        if (pId) {
          setAttachedPlan((prev) => ({
            ...prev,
            goalId: gId,
            planId: pId
          }));
          setActivities((prev) => [
            {
              id: `plan-att-${Date.now()}`,
              type: 'lifecycle',
              title: `Plan ${pId.slice(0, 8)} attached to session`,
              status: 'success',
              timestamp: Date.now()
            },
            ...prev.slice(0, 49)
          ]);
        }
        break;
      }
      case 'plan_execution_started': {
        const data = event.data as { goalId?: string; planId?: string; totalTasks?: number } | undefined;
        const pId = data?.planId || (event as any).planId;
        const gId = data?.goalId || (event as any).goalId;
        setAttachedPlan((prev) => ({
          ...prev,
          goalId: gId,
          planId: pId,
          status: 'RUNNING',
          totalTasks: data?.totalTasks,
          completedTasks: 0
        }));
        setActivities((prev) => [
          {
            id: `plan-exec-${Date.now()}`,
            type: 'lifecycle',
            title: `Plan execution started (${data?.totalTasks || 0} tasks)`,
            status: 'pending',
            timestamp: Date.now()
          },
          ...prev.slice(0, 49)
        ]);
        break;
      }
      case 'task_started': {
        const data = event.data as { taskId?: string; stepId?: string; totalTasks?: number; completedTasks?: number } | undefined;
        const tId = data?.taskId || data?.stepId || (event as any).taskId;
        setAttachedPlan((prev) => ({
          ...prev,
          taskId: tId,
          status: 'RUNNING',
          totalTasks: data?.totalTasks ?? prev?.totalTasks,
          completedTasks: data?.completedTasks ?? prev?.completedTasks
        }));
        setActivities((prev) => [
          {
            id: `task-start-${tId || Date.now()}`,
            type: 'tool',
            title: `Task started: ${tId || 'step'}`,
            status: 'pending',
            timestamp: Date.now()
          },
          ...prev.slice(0, 49)
        ]);
        break;
      }
      case 'task_completed': {
        const data = event.data as { taskId?: string; stepId?: string; totalTasks?: number; completedTasks?: number } | undefined;
        const tId = data?.taskId || data?.stepId || (event as any).taskId;
        setAttachedPlan((prev) => ({
          ...prev,
          completedTasks: data?.completedTasks ?? (prev?.completedTasks ? prev.completedTasks + 1 : 1)
        }));
        setActivities((prev) => [
          {
            id: `task-done-${tId || Date.now()}`,
            type: 'tool',
            title: `Task completed: ${tId || 'step'}`,
            status: 'success',
            timestamp: Date.now()
          },
          ...prev.slice(0, 49)
        ]);
        break;
      }
      case 'task_failed': {
        const data = event.data as { taskId?: string; error?: string } | undefined;
        const tId = data?.taskId || (event as any).taskId;
        setActivities((prev) => [
          {
            id: `task-err-${tId || Date.now()}`,
            type: 'tool',
            title: `Task failed: ${tId || 'step'}`,
            details: data?.error,
            status: 'error',
            timestamp: Date.now()
          },
          ...prev.slice(0, 49)
        ]);
        break;
      }
      case 'plan_completed': {
        setAttachedPlan((prev) => (prev ? { ...prev, status: 'COMPLETED' } : null));
        setActivities((prev) => [
          {
            id: `plan-done-${Date.now()}`,
            type: 'lifecycle',
            title: 'Plan completed successfully!',
            status: 'success',
            timestamp: Date.now()
          },
          ...prev.slice(0, 49)
        ]);
        onRefreshWorkspace?.();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('workspace:refresh', { detail: { type: 'plan_completed', workspaceId } }));
        }
        break;
      }
      case 'plan_failed': {
        const data = event.data as { error?: string } | undefined;
        setAttachedPlan((prev) => (prev ? { ...prev, status: 'FAILED' } : null));
        setActivities((prev) => [
          {
            id: `plan-failed-${Date.now()}`,
            type: 'lifecycle',
            title: 'Plan execution failed',
            details: data?.error,
            status: 'error',
            timestamp: Date.now()
          },
          ...prev.slice(0, 49)
        ]);
        break;
      }
      case 'plan_replanned': {
        setActivities((prev) => [
          {
            id: `plan-replanned-${Date.now()}`,
            type: 'lifecycle',
            title: 'Plan dynamically updated / replanned',
            status: 'pending',
            timestamp: Date.now()
          },
          ...prev.slice(0, 49)
        ]);
        break;
      }
      default:
        break;
    }
  }, []);

  // Workspace lifecycle trigger
  const resolveAndConnectSessionRef = useRef(resolveAndConnectSession);
  useEffect(() => {
    resolveAndConnectSessionRef.current = resolveAndConnectSession;
  }, [resolveAndConnectSession]);

  useEffect(() => {
    resolveAndConnectSessionRef.current();

    return () => {
      if (sseUnsubscribeRef.current) {
        sseUnsubscribeRef.current();
        sseUnsubscribeRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [workspaceId, initialHandoff?.sessionId]);

  // Send message with optional overrides (for edit & resend)
  const handleSendMessage = async (overridePrompt?: string, overrideAttachments?: Attachment[]) => {
    const promptToSend = typeof overridePrompt === 'string' ? overridePrompt : inputText;
    const trimmed = promptToSend.trim();
    if (!trimmed || isStreaming || sessionStatus === 'TERMINATED') {
      return;
    }

    const currentAttachments = overrideAttachments || [...attachments];
    if (!overridePrompt) {
      setInputText('');
      setAttachments([]);
    }
    setErrorMessage(null);

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `asst-${Date.now()}`;

    const userMessage: AgentPanelMessage = {
      id: userMessageId,
      role: 'user',
      content: trimmed,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
      timestamp: Date.now(),
      interactionType: 'AGENT',
      messageRole: 'USER',
      messageKind: 'USER_INPUT',
      responseCode: 'USER_INPUT',
      surface: 'AGENT'
    };

    const newMessages: AgentPanelMessage[] = [
      ...messages,
      userMessage,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        timestamp: Date.now(),
        interactionType: 'AGENT',
        messageRole: 'ASSISTANT',
        messageKind: 'AGENT_RESPONSE',
        responseCode: 'AGENT_FINAL',
        surface: 'AGENT'
      }
    ];

    setMessages(newMessages);
    syncToChatSession(newMessages);
    setIsStreaming(true);
    thinkingStartRef.current = Date.now();

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      // Build history - filter out empty content messages (such as changeSet records) and include current user message
      const history = [...messages, userMessage]
        .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
        .map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('model' as const),
          parts: [{ text: m.content.trim() }]
        }));

      await geminiService.generateResponse(
        trimmed,
        activeSkillIds,
        [...DEFAULT_SKILLS, ...customSkills],
        history,
        {
          sessionId: sessionContext?.sessionId,
          workspaceId: workspaceId || sessionContext?.workspaceId,
          model: activeModel,
          signal: abortCtrl.signal,
          thinkingLevel: thinkingMode !== 'none' ? (thinkingMode as any) : undefined,
          attachments: currentAttachments,
          userMessageId,
          assistantMessageId,
          interactionType: 'AGENT',
          surface: 'AGENT',
          onMessageSaved: (savedMsg: any) => {
            if (savedMsg && savedMsg.id) {
              setMessages((prev) => prev.map((msg) => {
                if (msg.id === assistantMessageId || msg.id === savedMsg.id) {
                  return {
                    ...msg,
                    id: savedMsg.id,
                    executionId: savedMsg.executionId || msg.executionId,
                    planId: savedMsg.planId || msg.planId,
                    toolCallId: savedMsg.toolCallId || msg.toolCallId,
                    responseCode: savedMsg.responseCode || msg.responseCode,
                    messageKind: savedMsg.messageKind || msg.messageKind,
                    interactionType: savedMsg.interactionType || msg.interactionType,
                    messageRole: savedMsg.messageRole || msg.messageRole,
                    surface: savedMsg.surface || msg.surface
                  };
                }
                return msg;
              }));
            }
          },
          codingContext: {
            currentFile,
            selectedCode,
            openFiles,
            planContext: activePlanContext || (attachedPlan?.planId ? {
              goalId: attachedPlan.goalId || '',
              planId: attachedPlan.planId,
              taskId: attachedPlan.taskId,
              workspaceId: workspaceId || sessionContext?.workspaceId,
              sessionId: sessionContext?.sessionId || ''
            } : undefined)
          }
        },
        (chunk: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: chunk }
                : msg
            )
          );
        }
      );

      // Finalize streaming
      const finalThoughtText = thinkingStore.get().text;
      const durationSeconds = thinkingStartRef.current
        ? Math.max(1, Math.round((Date.now() - thinkingStartRef.current) / 1000))
        : undefined;

      let finalizedMessages: AgentPanelMessage[] = [];
      setMessages((prev) => {
        finalizedMessages = prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                isStreaming: false,
                thinkingContent: finalThoughtText || msg.thinkingContent,
                thoughtDurationSeconds: durationSeconds || msg.thoughtDurationSeconds,
                interactionType: 'AGENT',
                messageRole: 'ASSISTANT',
                messageKind: 'AGENT_RESPONSE',
                responseCode: 'AGENT_FINAL',
                surface: 'AGENT'
              }
            : msg
        );
        return finalizedMessages;
      });
      syncToChatSession(finalizedMessages);
    } catch (err: unknown) {
      if (abortCtrl.signal.aborted) {
        let abortedMessages: AgentPanelMessage[] = [];
        setMessages((prev) => {
          abortedMessages = prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  isStreaming: false,
                  content: msg.content ? `${msg.content}\n\n*[Execution stopped by user]*` : '*[Execution stopped by user]*',
                  interactionType: 'AGENT',
                  messageRole: 'ASSISTANT',
                  messageKind: 'AGENT_RESPONSE',
                  responseCode: 'AGENT_FINAL',
                  surface: 'AGENT'
                }
              : msg
          );
          return abortedMessages;
        });
        syncToChatSession(abortedMessages);
      } else {
        const errorText = err instanceof Error ? err.message : String(err);
        setErrorMessage(errorText);
        let errorMessages: AgentPanelMessage[] = [];
        setMessages((prev) => {
          errorMessages = prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  isStreaming: false,
                  error: errorText,
                  content: msg.content || `⚠️ Error: ${errorText}`,
                  interactionType: 'AGENT',
                  messageRole: 'ASSISTANT',
                  messageKind: 'ERROR',
                  responseCode: 'AGENT_ERROR',
                  surface: 'AGENT'
                }
              : msg
          );
          return errorMessages;
        });
        syncToChatSession(errorMessages);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      onRefreshWorkspace?.();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('workspace:refresh', { detail: { reason: 'send_message_completed', workspaceId } }));
      }
    }
  };

  // Feedback rating toggle (thumbs up / thumbs down)
  const handleToggleRating = (msgId: string, rating: number) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const newRating = m.rating === rating ? 0 : rating;
        return { ...m, rating: newRating };
      })
    );
  };

  // Copy message to clipboard
  const handleCopyMessage = async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard', err);
    }
  };

  // Message editing handlers
  const handleStartEditMessage = (msg: AgentPanelMessage) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.content);
  };

  const handleCancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleSaveAndResendMessage = (originalMsgId: string) => {
    const trimmed = editingText.trim();
    if (!trimmed) return;

    const msgIdx = messages.findIndex((m) => m.id === originalMsgId);
    if (msgIdx === -1) return;

    const msgToEdit = messages[msgIdx];
    const oldContent = msgToEdit.content;
    const history = msgToEdit.editHistory || [];

    const updatedUserMsg: AgentPanelMessage = {
      ...msgToEdit,
      content: trimmed,
      editHistory: [...history, oldContent],
      timestamp: Date.now()
    };

    // Truncate messages after this point and replace with updated message
    const truncated = [...messages.slice(0, msgIdx), updatedUserMsg];
    setMessages(truncated);
    setEditingMessageId(null);
    setEditingText('');

    handleSendMessage(trimmed);
  };

  const handleRestoreAgentMessage = (originalMsgId: string, versionContent: string) => {
    const msgIdx = messages.findIndex((m) => m.id === originalMsgId);
    if (msgIdx === -1) return;

    const msgToRevert = messages[msgIdx];
    const oldContent = msgToRevert.content;
    const history = msgToRevert.editHistory || [];

    const restoredMsg: AgentPanelMessage = {
      ...msgToRevert,
      content: versionContent,
      editHistory: history.filter((h) => h !== versionContent).concat(oldContent),
      timestamp: Date.now()
    };

    // Truncate messages after this point and replace with restored message
    const truncated = [...messages.slice(0, msgIdx), restoredMsg];
    setMessages(truncated);
    setHistoryModalMsgId(null);

    // Resend restored prompt
    handleSendMessage(versionContent);
  };

  // Clipboard image paste handler
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (loadEvent) => {
            const base64 = loadEvent.target?.result as string;
            if (base64) {
              setAttachments((prev) => [
                ...prev,
                {
                  name: file.name || `pasted_image_${Date.now()}.png`,
                  content: base64,
                  type: file.type
                }
              ]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // File upload input handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      const isImg = file.type.startsWith('image/');
      reader.onload = (loadEvent) => {
        const content = loadEvent.target?.result as string;
        if (content) {
          setAttachments((prev) => [
            ...prev,
            {
              name: file.name,
              content,
              type: file.type || 'text/plain'
            }
          ]);
        }
      };
      if (isImg) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });

    e.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAttachCurrentFile = (pathToAdd?: string) => {
    const target = pathToAdd || currentFile;
    if (!target) return;
    setInputText((prev) => {
      const prefix = prev.trim() ? `${prev.trim()} ` : '';
      return `${prefix}@${target} `;
    });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    setShowFileMenu(false);
  };

  const handleToggleSkill = (skillId: string) => {
    setActiveSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  };

  // Stop current execution
  const handleStopExecution = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);

    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || localStorage.getItem('session');
      await fetch('/api/workspace/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          sessionId: sessionContext?.sessionId,
          workspaceId: workspaceId || sessionContext?.workspaceId,
          executionId: sessionContext?.executionId
        })
      });
    } catch (err) {
      console.warn('[AgentPanel] Failed to stop backend execution:', err);
    }

    setSessionStatus('PAUSED');
  };

  // Keyboard handler for prompt input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleContinueInChat = async () => {
    if (!sessionContext) return;
    syncToChatSession(messages, sessionContext.sessionId);
    try {
      const handoff = await agentSessionService.createContextHandoff({
        sessionId: sessionContext.sessionId,
        sourceSurface: 'agent',
        targetSurface: 'chat',
        includeConversation: true,
        includeWorkspace: true,
        includeCurrentFile: true,
        includeSelection: true,
        includePlan: !!activePlanContext,
        workspaceId,
        currentFile,
        selection: selectedCode,
        planContext: activePlanContext ? {
          goalId: activePlanContext.goalId,
          planId: activePlanContext.planId,
          taskId: activePlanContext.taskId,
          goalSummary: activePlanContext.goalSummary,
          taskSummary: activePlanContext.taskSummary
        } : undefined,
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp
        }))
      });

      onContinueInChat?.(handoff);
      window.dispatchEvent(new CustomEvent('continue-in-chat', { detail: { handoff } }));
    } catch (err) {
      console.warn('[AgentPanel] Error creating handoff to chat:', err);
      const fallbackHandoff = {
        sessionId: sessionContext.sessionId,
        sourceSurface: 'agent' as const,
        targetSurface: 'chat' as const,
        workspaceId,
        currentFile,
        timestamp: Date.now(),
        recentMessages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp
        }))
      };
      onContinueInChat?.(fallbackHandoff);
      window.dispatchEvent(new CustomEvent('continue-in-chat', { detail: { handoff: fallbackHandoff } }));
    }
  };

  const getStatusBadge = () => {
    switch (sessionStatus) {
      case 'BUSY':
        return {
          bg: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
          dot: 'bg-amber-400 animate-pulse',
          label: 'Working'
        };
      case 'PAUSED':
        return {
          bg: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
          dot: 'bg-purple-400',
          label: 'Waiting'
        };
      case 'ERROR':
        return {
          bg: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
          dot: 'bg-rose-400',
          label: 'Error'
        };
      case 'TERMINATED':
        return {
          bg: 'bg-zinc-800 text-zinc-400 border-zinc-700',
          dot: 'bg-zinc-500',
          label: 'Terminated'
        };
      case 'IDLE':
      default:
        return {
          bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
          dot: 'bg-emerald-400',
          label: 'Idle'
        };
    }
  };

  const statusBadge = getStatusBadge();

  if (isCollapsed) {
    return (
      <div
        className={`w-10 h-full flex flex-col items-center py-3 border-l shrink-0 transition-all ${
          isDark ? 'bg-zinc-900/90 border-zinc-800 text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded hover:bg-zinc-800 transition-colors text-zinc-300"
          title="Expand Workspace Agent Panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="mt-4 flex flex-col items-center gap-4">
          <Bot className="w-5 h-5 text-indigo-400" />
          <span
            className="text-[11px] font-bold uppercase tracking-wider -rotate-90 select-none whitespace-nowrap mt-8"
            style={{ transformOrigin: 'center center' }}
          >
            Agent Chat
          </span>
          <span className={`w-2 h-2 rounded-full mt-6 ${statusBadge.dot}`} title={`Status: ${statusBadge.label}`} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-80 md:w-96 h-full flex flex-col border-l shrink-0 overflow-hidden ${
        isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Header */}
      <div
        className={`px-3 py-2.5 border-b flex flex-col gap-1.5 shrink-0 select-none ${
          isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs tracking-tight truncate">
                {sessionContext?.metadata?.title || 'Workspace Agent'}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono truncate">
                {sessionContext?.sessionId ? `ID: ${sessionContext.sessionId}` : 'Connecting session...'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleNewSession}
              disabled={isCreatingNewSession}
              title="Start a fresh, clean Agent Session"
              className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 hover:text-zinc-100 text-[11px] font-medium transition-all border border-zinc-700/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingNewSession ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{isCreatingNewSession ? 'Creating...' : 'New'}</span>
            </button>
            <button
              type="button"
              onClick={handleContinueInChat}
              title="Continue this session in Normal Chat"
              className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-[11px] font-medium transition-colors border border-indigo-500/20"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Continue in Chat</span>
            </button>
            <button
              type="button"
              onClick={resolveAndConnectSession}
              title="Reconnect / Refresh session"
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Collapse Agent Panel"
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Metadata badges row */}
        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
          {/* Status badge */}
          <span
            className={`px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border flex items-center gap-1 ${statusBadge.bg}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
            {statusBadge.label}
          </span>

          {/* Connection state */}
          <span
            className={`px-1.5 py-0.5 rounded font-mono flex items-center gap-1 ${
              connectionState === 'connected'
                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                : connectionState === 'connecting'
                ? 'bg-amber-950/40 text-amber-400 border border-amber-800/40'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            {connectionState === 'connected' ? (
              <Wifi className="w-2.5 h-2.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-2.5 h-2.5 text-zinc-400" />
            )}
            {connectionState}
          </span>

          {/* Workspace Pill */}
          <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 font-mono truncate max-w-[110px]" title={workspaceId || 'None'}>
            WS: {workspaceName || workspaceId || 'none'}
          </span>

          {/* Model Pill */}
          {activeModel && (
            <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 font-mono truncate max-w-[100px]" title={activeModel}>
              {activeModel}
            </span>
          )}

          {/* Active Plan Pill */}
          {(attachedPlan?.planId || activePlanContext?.planId) && (
            <span
              className={`px-1.5 py-0.5 rounded font-mono truncate max-w-[130px] border flex items-center gap-1 ${
                attachedPlan?.status === 'RUNNING'
                  ? 'bg-amber-950/40 text-amber-300 border-amber-800/50'
                  : attachedPlan?.status === 'COMPLETED'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                  : 'bg-indigo-950/40 text-indigo-300 border-indigo-800/50'
              }`}
              title={`Active Plan: ${attachedPlan?.planId || activePlanContext?.planId}`}
            >
              <AiSparkIcon size={10} variant="idle" className="shrink-0" />
              Plan: {(attachedPlan?.planId || activePlanContext?.planId)?.slice(0, 8)}
              {attachedPlan?.totalTasks !== undefined && (
                <span className="text-[9px] opacity-80">
                  ({attachedPlan.completedTasks || 0}/{attachedPlan.totalTasks})
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Context handoff notification banner */}
      {initialHandoff && (
        <div
          className={`px-3 py-1.5 border-b text-[11px] flex items-center justify-between shrink-0 ${
            isDark ? 'bg-indigo-950/30 border-indigo-900/40 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
            <span className="truncate">Context linked from Chat</span>
          </div>
          <span className="font-mono text-[9px] opacity-75 shrink-0">
            ID: {initialHandoff.sessionId.slice(-8)}
          </span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoadingSession && messages.length === 0 ? (
          <div className="p-4 space-y-4">
            <AgentChatSkeleton theme={theme} showCodeBlock={true} />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-500 select-none">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <AiSparkIcon size={24} variant="pulse" />
            </div>
            <h4 className="font-bold text-sm text-zinc-300 mb-1">Workspace Agent Panel</h4>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-[240px]">
              Directly connected to the shared Agent Session. Ask questions, inspect files, or command code edits.
            </p>
          </div>
        ) : (
          messages.map((msg, msgIdx) => {
            const isLatest = msgIdx === messages.length - 1;
            return (
            <div
              key={msg.id}
              className={`flex flex-col group/msg ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {msg.changeSet ? (
                <div className="w-full">
                  {msg.content && (
                    <div
                      className={`mb-1.5 max-w-[92%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        isDark
                          ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none'
                          : 'bg-slate-100 border border-slate-200 text-slate-800 rounded-bl-none'
                      }`}
                    >
                      <div className="markdown-body">
                        <ReactMarkdown
                          remarkPlugins={activeRemarkPlugins}
                          rehypePlugins={activeRehypePlugins}
                        >
                          {preprocessMath(msg.content)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                  <SimplifiedChangeRecord
                    changeSet={msg.changeSet}
                    onOpenFile={onOpenFile}
                    onUndo={handleUndoChangeSet}
                    onApply={handleApplyChangeSet}
                    onReject={handleRejectChangeSet}
                    theme={theme}
                  />
                </div>
              ) : msg.terminalCommand ? (
                <div className="w-full">
                  {msg.content && (
                    <div
                      className={`mb-1.5 max-w-[92%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        isDark
                          ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none'
                          : 'bg-slate-100 border border-slate-200 text-slate-800 rounded-bl-none'
                      }`}
                    >
                      <div className="markdown-body">
                        <ReactMarkdown
                          remarkPlugins={activeRemarkPlugins}
                          rehypePlugins={activeRehypePlugins}
                        >
                          {preprocessMath(msg.content)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                  <TerminalCommandRecord
                    commandData={msg.terminalCommand}
                    onViewInTerminal={onViewInTerminal}
                    theme={theme}
                  />
                </div>
              ) : msg.activity ? (
                <div className="w-full">
                  <AgentActivityCard
                    activity={msg.activity}
                    theme={theme}
                    onOpenFile={onOpenFile}
                    onViewInTerminal={onViewInTerminal}
                  />
                </div>
              ) : msg.planRecord ? (
                <div className="w-full">
                  {msg.content && (
                    <div
                      className={`mb-1.5 max-w-[92%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        isDark
                          ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none'
                          : 'bg-slate-100 border border-slate-200 text-slate-800 rounded-bl-none'
                      }`}
                    >
                      <div className="markdown-body">
                        <ReactMarkdown
                          remarkPlugins={activeRemarkPlugins}
                          rehypePlugins={activeRehypePlugins}
                        >
                          {preprocessMath(msg.content)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                  <SimplifiedPlanRecord
                    planResult={msg.planRecord.planResult}
                    status={msg.planRecord.status}
                    summary={msg.planRecord.summary}
                    theme={theme}
                  />
                </div>
              ) : (
                <div
                  className={`max-w-[92%] rounded-xl px-3 py-2 text-xs leading-relaxed relative ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : isDark
                      ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none'
                      : 'bg-slate-100 border border-slate-200 text-slate-800 rounded-bl-none'
                  }`}
                >
                  {/* Attachments inside user message */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2 pb-1.5 border-b border-white/10">
                      {msg.attachments.map((att, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/30 text-[10px] font-mono"
                        >
                          {att.type?.startsWith('image/') ? (
                            <img src={att.content} alt={att.name} className="w-4 h-4 rounded object-cover" />
                          ) : (
                            <FileText className="w-3 h-3 text-indigo-300" />
                          )}
                          <span className="truncate max-w-[120px]">{att.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Message Edit (User messages) */}
                  {editingMessageId === msg.id ? (
                    <div className="space-y-2 min-w-[240px]">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className={`w-full p-2 rounded-lg text-xs font-sans outline-none resize-none border ${
                          isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-black'
                        }`}
                        rows={3}
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={handleCancelEditMessage}
                          className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-[10px] font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveAndResendMessage(msg.id)}
                          className="px-2.5 py-1 rounded bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-bold transition-colors"
                        >
                          Save & Resend
                        </button>
                      </div>
                    </div>
                  ) : msg.role === 'assistant' ? (
                    <div className="w-full">
                      {/* Thinking section in Agent Mode (Codex / Antigravity style) */}
                      {((msg.isStreaming && isStreaming) || msg.thinkingContent || (isLatest && (thinkingText.length > 0 || isThinking))) && (
                        <div className="mb-2 -mx-1">
                          <ThinkingProcessDrawer
                            theme={theme}
                            thinkingContent={msg.thinkingContent || (isLatest && thinkingText ? thinkingText : undefined)}
                            thoughtDurationSeconds={msg.thoughtDurationSeconds}
                            isStreaming={msg.isStreaming && isStreaming}
                          />
                        </div>
                      )}
                      {msg.isStreaming && (!msg.content || msg.content.trim() === '') ? (
                        <div className="py-2">
                          <AgentChatSkeleton theme={theme} showCodeBlock={true} />
                        </div>
                      ) : (
                        <div className="markdown-body">
                          <ReactMarkdown
                            remarkPlugins={activeRemarkPlugins}
                            rehypePlugins={activeRehypePlugins}
                          >
                            {preprocessMath(msg.content || '')}
                          </ReactMarkdown>
                          {msg.isStreaming && (
                            <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 animate-pulse align-middle" />
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {/* Edit Archive Modal inside User message */}
                      {historyModalMsgId === msg.id && msg.editHistory && msg.editHistory.length > 0 && (
                        <div className="mb-2 p-2 bg-zinc-950/90 border border-zinc-800 rounded-lg text-left shadow-lg">
                          <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-zinc-800/80">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Edit Archive</span>
                            <span className="text-[8px] font-mono text-zinc-500">{msg.editHistory.length} Previous States</span>
                          </div>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                            {msg.editHistory.map((ver, vIdx) => (
                              <div key={vIdx} className="p-1.5 bg-zinc-900/80 rounded border border-zinc-800/60 hover:border-zinc-700 transition-colors">
                                <div className="text-[10px] text-zinc-300 line-clamp-2 italic mb-1.5 font-sans">"{ver}"</div>
                                <button
                                  type="button"
                                  disabled={isStreaming}
                                  onClick={() => handleRestoreAgentMessage(msg.id, ver)}
                                  className="text-[9px] font-bold uppercase text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-all cursor-pointer px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                                  title="Restore message to this state and rerun"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" /> Restore This State
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="markdown-body font-sans text-xs leading-relaxed select-text">
                        <ReactMarkdown
                          remarkPlugins={activeRemarkPlugins}
                          rehypePlugins={activeRehypePlugins}
                        >
                          {preprocessMath(msg.content)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {msg.error && (
                    <div className="mt-1.5 pt-1.5 border-t border-rose-800/40 text-[11px] text-rose-400 flex items-center gap-1 font-mono">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span className="truncate">{msg.error}</span>
                    </div>
                  )}

                  {/* Assistant Feedback & Copy Action Bar */}
                  {msg.role === 'assistant' && !msg.isStreaming && msg.content && (
                    <div className="mt-2 pt-1.5 border-t border-zinc-800/40 flex items-center justify-between text-[11px] select-none">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleRating(msg.id, 1)}
                          title="Thumbs up"
                          className={`p-1 rounded hover:bg-zinc-800 transition-colors ${
                            msg.rating === 1 ? 'text-emerald-400 bg-emerald-950/40' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleRating(msg.id, -1)}
                          title="Thumbs down"
                          className={`p-1 rounded hover:bg-zinc-800 transition-colors ${
                            msg.rating === -1 ? 'text-rose-400 bg-rose-950/40' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        title="Copy message"
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors text-[10px]"
                      >
                        {copiedMessageId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Timestamp & User Edit trigger row */}
              <div className="flex items-center gap-2 px-1 mt-0.5">
                <span className="text-[9px] text-zinc-600 font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.role === 'user' && editingMessageId !== msg.id && (
                  <div className="flex items-center gap-1">
                    {msg.editHistory && msg.editHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setHistoryModalMsgId(historyModalMsgId === msg.id ? null : msg.id)}
                        className={`p-0.5 rounded transition-all cursor-pointer relative ${
                          historyModalMsgId === msg.id ? 'text-amber-400 bg-amber-950/40' : 'text-zinc-500 hover:text-amber-400'
                        }`}
                        title="View previous states"
                      >
                        <History className="w-2.5 h-2.5" />
                        <span className="absolute -top-1 -right-1 bg-amber-500/30 text-amber-300 text-[7px] font-mono px-0.5 rounded-full border border-amber-500/40">
                          {msg.editHistory.length}
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartEditMessage(msg)}
                      className="opacity-0 group-hover/msg:opacity-100 p-0.5 text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer"
                      title="Edit prompt"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

        {errorMessage && (
          <div className="p-2.5 rounded border border-rose-800/60 bg-rose-950/40 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Session Error</span>
              <span className="text-[11px] text-rose-300/80">{errorMessage}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Plan Execution Approval Box (Codex Style Checklist) */}
      {(() => {
        if (!currentPlanResult) return null;
        const activePlanId = (currentPlanResult.repairedPlan || currentPlanResult.plan)?.id || currentPlanResult.goal?.id;
        const isPlanCompleted = Boolean(
          (activePlanId && completedPlanIds.has(activePlanId)) ||
          (attachedPlan?.status === 'COMPLETED' && (!attachedPlan.planId || attachedPlan.planId === activePlanId))
        );
        if (isPlanCompleted) return null;

        const steps = (currentPlanResult.repairedPlan || currentPlanResult.plan)?.steps || [];
        const completedCount = attachedPlan?.completedTasks || 0;
        const totalCount = steps.length || attachedPlan?.totalTasks || 0;

        return (
          <div
            className={`border-t px-3 py-2.5 shrink-0 transition-all ${
              isDark ? 'bg-zinc-900/95 border-zinc-800 text-zinc-200' : 'bg-slate-100/95 border-slate-200 text-slate-800'
            }`}
          >
            {/* Header Row with Codex Checklist Header */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="flex items-center justify-center w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                  <ListOrdered className="w-3 h-3" />
                </span>
                <span className="text-xs font-bold truncate">
                  # {completedCount} out of {totalCount} tasks completed
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {totalCount} steps
                </span>
                <button
                  type="button"
                  onClick={() => setIsPlanCardExpanded(!isPlanCardExpanded)}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                  title={isPlanCardExpanded ? 'Collapse task steps' : 'Expand task steps'}
                >
                  {isPlanCardExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
                {onRejectPlan && (
                  <button
                    type="button"
                    onClick={() => handleRejectPlanAction(currentPlanResult)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors"
                    title="Dismiss plan"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Expandable Step Summary */}
            {isPlanCardExpanded && (
              <div className="mb-2.5 max-h-36 overflow-y-auto space-y-1 text-[11px] font-mono pr-1">
                {steps.map((step, idx) => (
                  <div
                    key={step.id || idx}
                    className={`flex items-start gap-2 p-1.5 rounded border ${
                      idx < completedCount
                        ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                        : isDark
                        ? 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 ${
                        idx < completedCount
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {idx < completedCount ? <Check className="w-2.5 h-2.5" /> : idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{step.title || step.description || `Task ${idx + 1}`}</div>
                      {step.requiredTools && step.requiredTools.length > 0 && (
                        <div className="text-[10px] text-zinc-500 truncate">
                          tools: {step.requiredTools.map((t: any) => typeof t === 'string' ? t : t.name).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Row: Approve to Execute & Reject */}
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800/50">
              {onRejectPlan && (
                <button
                  type="button"
                  onClick={() => handleRejectPlanAction(currentPlanResult)}
                  disabled={isExecutingPlan}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark
                      ? 'bg-zinc-800 hover:bg-rose-950/60 text-zinc-300 hover:text-rose-400 border border-zinc-700 hover:border-rose-800/50'
                      : 'bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-300 hover:border-rose-300'
                  }`}
                  title="Reject and dismiss this plan"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              )}

              {onExecutePlan && (
                <button
                  type="button"
                  onClick={() => handleApproveAndExecutePlan(currentPlanResult)}
                  disabled={isExecutingPlan}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/50 transition-all cursor-pointer disabled:cursor-not-allowed"
                  title="Approve and execute this plan in the workspace"
                >
                  {isExecutingPlan ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing Plan...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Approve to Execute</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Input Area */}
      <div
        className={`p-2.5 border-t flex flex-col gap-1.5 shrink-0 ${
          isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        {/* Attachment preview strip */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap px-1 pb-1">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-mono"
              >
                {att.type?.startsWith('image/') ? (
                  <img src={att.content} alt={att.name} className="w-4 h-4 rounded object-cover" />
                ) : (
                  <FileText className="w-3 h-3 text-indigo-400" />
                )}
                <span className="truncate max-w-[120px]">{att.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  className="text-zinc-500 hover:text-rose-400 transition-colors ml-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Quick Context Chips */}
        {currentFile && (
          <div className="flex items-center gap-1.5 overflow-x-auto px-1 text-[10px] text-zinc-400 no-scrollbar">
            <button
              type="button"
              onClick={() => handleAttachCurrentFile(currentFile)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors shrink-0 font-mono"
              title={`Attach active file @${currentFile}`}
            >
              <FileCode className="w-3 h-3 text-indigo-400" />
              <span>@{currentFile.split('/').pop()}</span>
            </button>
          </div>
        )}

        {/* Textarea & Send button */}
        <div className="relative flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              sessionStatus === 'TERMINATED'
                ? 'Session terminated'
                : 'Message the agent... (Paste images, attach files, Enter to send)'
            }
            disabled={sessionStatus === 'TERMINATED' || isStreaming}
            rows={2}
            className={`flex-1 text-xs rounded-lg px-2.5 py-2 border outline-hidden resize-none transition-colors ${
              isDark
                ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/70'
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={handleStopExecution}
              title="Stop agent execution"
              className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors shrink-0 flex items-center justify-center cursor-pointer shadow-xs"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={(!inputText.trim() && attachments.length === 0) || sessionStatus === 'TERMINATED'}
              title="Send message to agent"
              className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold transition-colors shrink-0 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Rich Toolbar: Skills, Thinking Mode, Auto Compact, File Upload */}
        <div className="flex items-center justify-between gap-1 text-[10px] text-zinc-500 pt-1 select-none flex-wrap">
          <div className="flex items-center gap-1.5">
            {/* Hidden file input for file/image upload */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.ts,.tsx,.js,.jsx,.json,.md,.txt,.css,.py"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Attach images or files"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>

            {/* Context Files Popover Trigger */}
            {allWorkspaceFiles && allWorkspaceFiles.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFileMenu(!showFileMenu)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-mono transition-colors ${
                    showFileMenu
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Attach workspace file to context"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>Context</span>
                </button>

                {showFileMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-56 max-h-48 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1 z-50 text-[11px] font-mono">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                      Attach Workspace File
                    </div>
                    {allWorkspaceFiles.map((file) => (
                      <button
                        key={file}
                        type="button"
                        onClick={() => {
                          handleAttachCurrentFile(file);
                          setShowFileMenu(false);
                        }}
                        className="w-full px-2 py-1 text-left hover:bg-zinc-800 rounded text-zinc-300 hover:text-white truncate block cursor-pointer"
                      >
                        {file}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Neural Skills Popover Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSkillsMenu(!showSkillsMenu)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-mono transition-colors ${
                  activeSkillIds.length > 0
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
                title="Toggle Neural Skills"
              >
                <AiSparkIcon size={12} variant="idle" className="text-indigo-400" />
                <span>Skills ({activeSkillIds.length})</span>
              </button>

              {showSkillsMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-64 max-h-56 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-2 z-50 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1 pb-1 border-b border-zinc-800 flex justify-between">
                    <span>Neural Skills</span>
                    <span className="text-zinc-500">{activeSkillIds.length} active</span>
                  </div>
                  {[...DEFAULT_SKILLS, ...customSkills].map((skill) => {
                    const isSelected = activeSkillIds.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => handleToggleSkill(skill.id)}
                        className={`w-full text-left p-1.5 rounded-lg flex items-start justify-between gap-1.5 transition-colors ${
                          isSelected ? 'bg-indigo-500/20 text-indigo-200' : 'hover:bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div className="flex-1 truncate">
                          <div className="font-semibold text-[11px] truncate">{skill.name}</div>
                          <div className="text-[9px] text-zinc-500 truncate">{skill.description}</div>
                        </div>
                        {isSelected && <Check className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Deep Thinking Mode Popover */}
            {isGeminiThinkingConfigSupported(activeModel) && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowThinkingMenu(!showThinkingMenu)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-mono transition-colors ${
                    thinkingMode !== 'none'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Toggle Thinking Mode"
                >
                  <Brain className="w-3 h-3 text-amber-400" />
                  <span className="capitalize">
                    {getSupportedThinkingLevelsForModel(activeModel).find((l) => l.id === thinkingMode)?.label || thinkingMode}
                  </span>
                </button>

                {showThinkingMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-52 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1.5 z-50 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1 pb-1 border-b border-zinc-800">
                      Thinking Level
                    </div>
                    {getSupportedThinkingLevelsForModel(activeModel).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setThinkingMode(opt.id);
                          setShowThinkingMenu(false);
                        }}
                        className={`w-full text-left p-1.5 rounded-lg flex items-center justify-between text-xs transition-colors ${
                          thinkingMode === opt.id ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'hover:bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div>
                          <div className="text-[11px]">{opt.label}</div>
                          <div className="text-[9px] text-zinc-500">{opt.hint}</div>
                        </div>
                        {thinkingMode === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Auto Compact Toggle */}
            <button
              type="button"
              onClick={() => setIsAutoCompact(!isAutoCompact)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-mono transition-colors ${
                isAutoCompact
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Auto Compact Context"
            >
              <Database className="w-3 h-3" />
              <span>Compact</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
