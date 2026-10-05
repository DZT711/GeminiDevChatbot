/**
 * Shared event contracts for the Shared Agent Session (M06-01).
 * Normal Chat, Workspace Agent Panel, and Workspace Terminal consume these events.
 */

import type { ChangeSet, ChangeSetStatus, FileChangeOperation } from '../changes/ChangeSetTypes.js';

export type AgentSessionEventType =
  | 'session_created'
  | 'session_status_changed'
  | 'workspace_attached'
  | 'workspace_detached'
  | 'execution_associated'
  | 'execution_detached'
  | 'goal_plan_associated'
  | 'plan_attached'
  | 'plan_execution_started'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'task_blocked'
  | 'plan_completed'
  | 'plan_failed'
  | 'plan_replanned'
  | 'model_changed'
  | 'terminal_event'
  | 'tool_activity'
  | 'metadata_updated'
  | 'change_set_created'
  | 'change_set_updated'
  | 'change_set_applied'
  | 'change_set_rejected'
  | 'change_set_conflict'
  | 'change_set_failed'
  | 'surface_transition'
  | 'session_closed';

export interface AgentSessionEvent<T = unknown> {
  type: AgentSessionEventType;
  sessionId: string;
  executionId?: string;
  workspaceId?: string;
  goalId?: string;
  planId?: string;
  taskId?: string;
  timestamp: number;
  data?: T;
}

export interface PlanEventData {
  goalId?: string;
  planId: string;
  taskId?: string;
  stepId?: string;
  taskTitle?: string;
  status?: string;
  totalTasks?: number;
  completedTasks?: number | string[];
  failedTasks?: string[];
  blockedTasks?: string[];
  result?: unknown;
  error?: string;
  replanned?: boolean;
}

export interface ChangeSetEventData {
  changeSetId: string;
  status: ChangeSetStatus;
  filesCount?: number;
  files?: Array<{
    path: string;
    operation: FileChangeOperation;
    additions?: number;
    deletions?: number;
  }>;
  changeSet?: ChangeSet;
  conflictReason?: string;
  error?: string;
}

export type TerminalEventType =
  | 'terminal_started'
  | 'terminal_output'
  | 'terminal_exit'
  | 'terminal_error';

export interface TerminalEventData {
  type: TerminalEventType;
  command?: string;
  output?: string;
  stream?: 'stdout' | 'stderr';
  chunk?: string;
  line?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  durationMs?: number;
  cwd?: string;
  error?: string;
  executionId?: string;
  isAborted?: boolean;
  isTimeout?: boolean;
}

export type AgentSessionEventHandler = (event: AgentSessionEvent) => void;
