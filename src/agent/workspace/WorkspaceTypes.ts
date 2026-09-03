/**
 * Purpose: Provider-agnostic workspace types for Agent Core.
 * STRICT ARCHITECTURAL RULE: No third-party sandbox SDK imports or vendor types allowed here.
 */

export interface WorkspaceRef {
  id: string;
  name?: string;
  workingDirectory?: string;
  createdAt?: number;
  metadata?: Record<string, unknown>;
}

export interface WorkspaceFile {
  path: string;
  content: string;
  size?: number;
  modifiedAt?: number;
  isBinary?: boolean;
}

export interface WorkspaceDirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: number;
}

export interface WorkspaceDirectoryListing {
  path: string;
  entries: WorkspaceDirectoryEntry[];
  total: number;
}

export interface WorkspaceEdit {
  targetContent?: string;
  replacementContent?: string;
  range?: {
    startLine: number;
    endLine: number;
  };
  instruction?: string;
}

export interface RunCommandOptions {
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  input?: string;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs?: number;
}

export interface WorkspaceCreateRequest {
  id?: string;
  name?: string;
  workingDirectory?: string;
  initialFiles?: WorkspaceFile[];
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

export class WorkspacePathError extends Error {
  constructor(message: string, public readonly attemptedPath: string) {
    super(message);
    this.name = 'WorkspacePathError';
  }
}
