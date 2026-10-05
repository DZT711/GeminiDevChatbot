/**
 * Provider-agnostic domain models for ChangeSets, FileChanges, and Review lifecycle (M06-05).
 * Strictly isolated: no React, Express, database, or provider SDK imports.
 */

export type ChangeSetStatus =
  | 'PROPOSED'
  | 'REVIEWING'
  | 'APPLIED'
  | 'REJECTED'
  | 'CONFLICT'
  | 'EXPIRED'
  | 'FAILED';

export type FileChangeOperation = 'CREATE' | 'MODIFY' | 'DELETE';

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface FileChangeMetadata {
  beforeHash?: string;
  afterHash?: string;
  instruction?: string;
  toolCallId?: string;
  language?: string;
  additions?: number;
  deletions?: number;
  [key: string]: unknown;
}

export interface FileChange {
  path: string;
  operation: FileChangeOperation;
  before?: string;
  after?: string;
  diff?: string;
  beforeHash?: string;
  afterHash?: string;
  additions?: number;
  deletions?: number;
  metadata?: FileChangeMetadata;
}

export interface ChangeSet {
  changeSetId: string;
  sessionId: string;
  executionId?: string;
  workspaceId: string;
  status: ChangeSetStatus;
  createdAt: number;
  updatedAt: number;
  files: FileChange[];
  summary?: string;
  conflictReason?: string;
  metadata?: Record<string, unknown>;
}

export interface ChangeSetValidationResult {
  valid: boolean;
  conflicts: Array<{
    path: string;
    reason: string;
    expectedHash?: string;
    currentHash?: string;
  }>;
}
