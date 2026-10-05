/**
 * Core type definitions for the Shared Agent Session (M06-01).
 * Completely provider-agnostic, vendor-neutral, and UI-independent.
 */

export type AgentSessionStatus = 'IDLE' | 'BUSY' | 'PAUSED' | 'TERMINATED' | 'ERROR';

export interface ModelProviderRef {
  modelId: string;
  provider?: string;
  displayName?: string;
}

export interface AgentSessionMetadata {
  title?: string;
  summary?: string;
  tags?: string[];
  userId?: string;
  customInstructions?: string;
  [key: string]: unknown;
}

export interface AgentSessionContext {
  sessionId: string;
  status: AgentSessionStatus;
  workspaceId?: string;
  executionId?: string;
  goalId?: string;
  planId?: string;
  activeModel?: ModelProviderRef;
  metadata: AgentSessionMetadata;
  createdAt: number;
  updatedAt: number;
  lastActivityAt: number;
}

export interface AgentSessionInitOptions {
  sessionId: string;
  userId?: string;
  workspaceId?: string;
  executionId?: string;
  goalId?: string;
  planId?: string;
  activeModel?: ModelProviderRef;
  metadata?: AgentSessionMetadata;
  initialStatus?: AgentSessionStatus;
}
