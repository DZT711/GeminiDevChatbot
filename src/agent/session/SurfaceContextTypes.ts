/**
 * Types and interfaces for Chat <-> Agent surface context synchronization (M06-07).
 * Strictly provider-agnostic, vendor-neutral, and UI-independent.
 * 
 * Core rule: "One Agent Session, multiple UI representations."
 */

export type SurfaceType = 'chat' | 'agent';

export interface SurfaceContextMessage {
  id: string;
  role: 'user' | 'assistant' | 'model' | 'system';
  content: string;
  timestamp?: number;
}

export interface SurfacePlanContext {
  goalId: string;
  planId: string;
  taskId?: string;
  goalSummary?: string;
  taskSummary?: string;
  isCompleted?: boolean;
}

export interface SurfaceContextRequest {
  sessionId: string;
  sourceSurface: SurfaceType;
  targetSurface: SurfaceType;

  // Selective context inclusions (no blind full-history dumping)
  includeConversation?: boolean;
  includeWorkspace?: boolean;
  includeCurrentFile?: boolean;
  includeSelection?: boolean;
  includePlan?: boolean;
  includeExecution?: boolean;
  includeRelevantMemory?: boolean;

  // Caller-provided state to select from
  messages?: SurfaceContextMessage[];
  workspaceId?: string;
  currentFile?: string;
  selection?: string;
  planContext?: SurfacePlanContext;
  executionId?: string;
  summary?: string;
  maxRecentMessages?: number;
}

export interface AgentContextHandoff {
  sessionId: string;
  sourceSurface: SurfaceType;
  targetSurface: SurfaceType;

  // Selected conversation references & bounded recent items
  conversationMessageIds?: string[];
  recentMessages?: SurfaceContextMessage[];

  // Workspace and editor context
  workspaceId?: string;
  currentFile?: string;
  selection?: string;

  // Plan and goal context (included ONLY when strictly relevant)
  goalId?: string;
  planId?: string;
  taskId?: string;
  planSummary?: string;

  // Execution tracking
  executionId?: string;

  // Compact handoff summary for human or LLM awareness
  summary?: string;
  timestamp: number;
}
