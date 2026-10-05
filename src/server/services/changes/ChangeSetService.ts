import fs from 'fs';
import path from 'path';
import {
  ChangeSet,
  ChangeSetStatus,
  FileChange,
  FileChangeOperation,
  ChangeSetValidationResult
} from '../../../agent/changes/ChangeSetTypes.js';
import {
  computeContentHash,
  generateUnifiedDiff
} from '../../../agent/changes/DiffGenerator.js';
import { AgentSessionService } from '../session/AgentSessionService.js';
import { WorkspaceService, globalWorkspaceService } from '../workspace/WorkspaceService.js';

export interface RecordMutationParams {
  sessionId: string;
  workspaceId: string;
  executionId?: string;
  path: string;
  operation: FileChangeOperation;
  beforeContent?: string;
  afterContent?: string;
  metadata?: Record<string, unknown>;
}

export interface ChangeSetActionOptions {
  userId: string;
  sessionId?: string;
  workspaceId?: string;
  workspaceService?: WorkspaceService;
}

export class ChangeSetService {
  private changeSets: Map<string, ChangeSet> = new Map();
  private sessionIndex: Map<string, Set<string>> = new Map();
  private workspaceIndex: Map<string, Set<string>> = new Map();
  private executionIndex: Map<string, string> = new Map(); // executionId -> changeSetId
  private sessionService?: AgentSessionService;
  private locks: Map<string, Promise<void>> = new Map();

  constructor(sessionService?: AgentSessionService) {
    this.sessionService = sessionService;
  }

  private async acquireLock(changeSetId: string): Promise<() => void> {
    while (this.locks.has(changeSetId)) {
      await this.locks.get(changeSetId);
    }
    let release!: () => void;
    const p = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(changeSetId, p);
    return () => {
      this.locks.delete(changeSetId);
      release();
    };
  }

  private recordAuditEntry(
    changeSet: ChangeSet,
    options: ChangeSetActionOptions,
    action: 'apply' | 'reject' | 'conflict',
    result: 'success' | 'conflict' | 'rejected' | 'applied',
    details?: string
  ): void {
    const wsService = options.workspaceService || (globalWorkspaceService as unknown as WorkspaceService);
    if (wsService && typeof wsService.recordChangeSetAudit === 'function') {
      try {
        wsService.recordChangeSetAudit({
          changeSetId: changeSet.changeSetId,
          sessionId: options.sessionId || changeSet.sessionId,
          executionId: changeSet.executionId,
          workspaceId: changeSet.workspaceId,
          action,
          timestamp: Date.now(),
          result,
          details
        });
      } catch (err) {
        console.warn('[ChangeSetService] Failed to record audit log entry:', err);
      }
    }
  }

  public setSessionService(service: AgentSessionService): void {
    this.sessionService = service;
  }

  /**
   * Safe path validation preventing directory traversal attacks.
   */
  public static validatePath(filePath: string, workspaceRoot?: string): void {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('File path must be a non-empty string');
    }
    const normalized = path.normalize(filePath);
    if (normalized.startsWith('..') || normalized.includes('/../') || normalized.includes('\\..\\')) {
      throw new Error(`Path traversal rejected: ${filePath}`);
    }
    if (workspaceRoot) {
      const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(workspaceRoot, filePath);
      const relative = path.relative(workspaceRoot, resolved);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`File path escapes workspace root: ${filePath}`);
      }
    }
  }

  /**
   * Records a file mutation performed during an agent execution, aggregating
   * it into the active ChangeSet for the session/execution.
   */
  public async recordFileMutation(params: RecordMutationParams): Promise<ChangeSet> {
    const { sessionId, workspaceId, executionId, path: filePath, operation, beforeContent = '', afterContent = '', metadata } = params;

    ChangeSetService.validatePath(filePath);

    // Look for an existing pending ChangeSet for this execution or session
    let changeSetId = executionId ? this.executionIndex.get(executionId) : undefined;
    let changeSet = changeSetId ? this.changeSets.get(changeSetId) : undefined;

    // If no existing changeSet or existing changeSet is already terminal (APPLIED/REJECTED), create new
    if (!changeSet || changeSet.status === 'APPLIED' || changeSet.status === 'REJECTED') {
      changeSetId = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      changeSet = {
        changeSetId,
        sessionId,
        executionId,
        workspaceId,
        status: 'PROPOSED',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        files: [],
        summary: `Proposed changes for session ${sessionId}`
      };
      this.changeSets.set(changeSetId, changeSet);

      if (!this.sessionIndex.has(sessionId)) {
        this.sessionIndex.set(sessionId, new Set());
      }
      this.sessionIndex.get(sessionId)!.add(changeSetId);

      if (!this.workspaceIndex.has(workspaceId)) {
        this.workspaceIndex.set(workspaceId, new Set());
      }
      this.workspaceIndex.get(workspaceId)!.add(changeSetId);

      if (executionId) {
        this.executionIndex.set(executionId, changeSetId);
      }
    }

    const existingFileIndex = changeSet.files.findIndex((f) => f.path === filePath);

    if (existingFileIndex >= 0) {
      // Aggregate with earlier mutation on the same file: preserve original baseline beforeContent!
      const existingFile = changeSet.files[existingFileIndex];
      const effectiveBefore = existingFile.operation === 'CREATE' ? '' : (existingFile.before ?? beforeContent);
      const effectiveOp: FileChangeOperation =
        existingFile.operation === 'CREATE'
          ? operation === 'DELETE'
            ? 'DELETE'
            : 'CREATE'
          : operation;

      const diffResult = generateUnifiedDiff(filePath, effectiveBefore, afterContent, effectiveOp);
      const updatedFileChange: FileChange = {
        path: filePath,
        operation: effectiveOp,
        before: effectiveBefore,
        after: afterContent,
        diff: diffResult.diff,
        beforeHash: computeContentHash(effectiveBefore),
        afterHash: computeContentHash(afterContent),
        additions: diffResult.additions,
        deletions: diffResult.deletions,
        metadata: {
          ...existingFile.metadata,
          ...metadata,
          additions: diffResult.additions,
          deletions: diffResult.deletions
        }
      };

      changeSet.files[existingFileIndex] = updatedFileChange;
    } else {
      // First mutation of this file in this ChangeSet
      const diffResult = generateUnifiedDiff(filePath, beforeContent, afterContent, operation);
      const fileChange: FileChange = {
        path: filePath,
        operation,
        before: beforeContent,
        after: afterContent,
        diff: diffResult.diff,
        beforeHash: computeContentHash(beforeContent),
        afterHash: computeContentHash(afterContent),
        additions: diffResult.additions,
        deletions: diffResult.deletions,
        metadata: {
          ...metadata,
          additions: diffResult.additions,
          deletions: diffResult.deletions
        }
      };

      changeSet.files.push(fileChange);
    }

    if (metadata) {
      changeSet.metadata = {
        ...changeSet.metadata,
        ...metadata
      };
    }

    changeSet.updatedAt = Date.now();

    // Emit event on shared session event stream
    this.sessionService?.emitSessionEvent({
      type: 'change_set_updated',
      sessionId,
      workspaceId,
      executionId,
      goalId: (metadata?.goalId as string) || (changeSet.metadata?.goalId as string),
      planId: (metadata?.planId as string) || (changeSet.metadata?.planId as string),
      taskId: (metadata?.taskId as string) || (changeSet.metadata?.taskId as string),
      timestamp: Date.now(),
      data: {
        changeSetId: changeSet.changeSetId,
        status: changeSet.status,
        filesCount: changeSet.files.length,
        files: changeSet.files.map((f) => ({
          path: f.path,
          operation: f.operation,
          additions: f.additions,
          deletions: f.deletions
        })),
        changeSet
      }
    });

    return changeSet;
  }

  /**
   * Retrieves a ChangeSet by its ID.
   */
  public getChangeSet(changeSetId: string): ChangeSet | undefined {
    return this.changeSets.get(changeSetId);
  }

  /**
   * Retrieves all ChangeSets for a specific session.
   */
  public getChangeSetsBySession(sessionId: string): ChangeSet[] {
    const ids = this.sessionIndex.get(sessionId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.changeSets.get(id))
      .filter((cs): cs is ChangeSet => cs !== undefined);
  }

  /**
   * Retrieves all ChangeSets for a specific workspace.
   */
  public getChangeSetsByWorkspace(workspaceId: string): ChangeSet[] {
    const ids = this.workspaceIndex.get(workspaceId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.changeSets.get(id))
      .filter((cs): cs is ChangeSet => cs !== undefined);
  }

  /**
   * Validates whether files in workspace match expected base/after content.
   */
  public async validateChangeSetState(
    changeSet: ChangeSet,
    options: ChangeSetActionOptions
  ): Promise<ChangeSetValidationResult> {
    const conflicts: Array<{ path: string; reason: string; expectedHash?: string; currentHash?: string }> = [];

    const isLocal = fs.existsSync(changeSet.workspaceId);

    for (const file of changeSet.files) {
      ChangeSetService.validatePath(file.path, isLocal ? changeSet.workspaceId : undefined);

      let currentContent: string | null = null;

      if (isLocal) {
        const resolved = path.isAbsolute(file.path) ? file.path : path.resolve(changeSet.workspaceId, file.path);
        if (fs.existsSync(resolved)) {
          try {
            currentContent = fs.readFileSync(resolved, 'utf-8');
          } catch {
            currentContent = null;
          }
        }
      } else if (options.workspaceService) {
        try {
          const res = await options.workspaceService.readFile(options.userId, changeSet.workspaceId, file.path);
          currentContent = res.content;
        } catch {
          currentContent = null;
        }
      }

      const currentHash = currentContent !== null ? computeContentHash(currentContent) : undefined;

      // In Pattern B: the agent wrote `file.after`. If current file differs from `file.after`,
      // someone concurrently modified it!
      if (file.operation === 'MODIFY') {
        if (currentContent === null) {
          conflicts.push({
            path: file.path,
            reason: 'File was deleted or missing in workspace',
            expectedHash: file.afterHash
          });
        } else if (currentHash !== file.afterHash && currentHash !== file.beforeHash) {
          conflicts.push({
            path: file.path,
            reason: 'File content was modified concurrently in workspace',
            expectedHash: file.afterHash,
            currentHash
          });
        }
      } else if (file.operation === 'CREATE') {
        if (currentContent !== null && currentHash !== file.afterHash) {
          conflicts.push({
            path: file.path,
            reason: 'A conflicting file was created concurrently in workspace',
            expectedHash: file.afterHash,
            currentHash
          });
        }
      } else if (file.operation === 'DELETE') {
        if (currentContent !== null && currentHash !== file.beforeHash) {
          conflicts.push({
            path: file.path,
            reason: 'File exists with conflicting content in workspace',
            expectedHash: undefined,
            currentHash
          });
        }
      }
    }

    return {
      valid: conflicts.length === 0,
      conflicts
    };
  }

  /**
   * Applies the ChangeSet, authoritatively confirming the proposed mutations.
   * Performs conflict detection, isolation checks, and status transition.
   */
  public async applyChangeSet(changeSetId: string, options: ChangeSetActionOptions): Promise<ChangeSet> {
    const release = await this.acquireLock(changeSetId);
    try {
      const changeSet = this.changeSets.get(changeSetId);
      if (!changeSet) {
        throw new Error(`ChangeSet not found: ${changeSetId}`);
      }

      // Session and Workspace Isolation
      if (options.sessionId && options.sessionId !== changeSet.sessionId) {
        throw new Error(`Session mismatch: ChangeSet belongs to session ${changeSet.sessionId}, not ${options.sessionId}`);
      }
      if (options.workspaceId && options.workspaceId !== changeSet.workspaceId) {
        throw new Error(`Workspace mismatch: ChangeSet belongs to workspace ${changeSet.workspaceId}, not ${options.workspaceId}`);
      }

      // Idempotent retry check
      if (changeSet.status === 'APPLIED') {
        return changeSet;
      }

      // Explicit lifecycle transition validation
      if (changeSet.status === 'REJECTED') {
        throw new Error(`Cannot apply rejected ChangeSet: ${changeSetId}`);
      }
      if (changeSet.status === 'CONFLICT') {
        throw new Error(`Cannot apply conflicting ChangeSet: ${changeSetId}`);
      }
      if (changeSet.status !== 'PROPOSED') {
        throw new Error(`Invalid state transition: Cannot apply ChangeSet in status ${changeSet.status}`);
      }

      // Conflict detection: verify workspace state matches expected baseline/staged content
      const validation = await this.validateChangeSetState(changeSet, options);
      if (!validation.valid) {
        changeSet.status = 'CONFLICT';
        changeSet.conflictReason = validation.conflicts.map((c) => `${c.path}: ${c.reason}`).join('; ');
        changeSet.updatedAt = Date.now();

        this.recordAuditEntry(changeSet, options, 'conflict', 'conflict', changeSet.conflictReason);

        this.sessionService?.emitSessionEvent({
          type: 'change_set_conflict',
          sessionId: changeSet.sessionId,
          workspaceId: changeSet.workspaceId,
          executionId: changeSet.executionId,
          timestamp: Date.now(),
          data: {
            changeSetId,
            status: 'CONFLICT',
            conflictReason: changeSet.conflictReason,
            changeSet
          }
        });

        throw new Error(`Conflict detected while applying change set: ${changeSet.conflictReason}`);
      }

      const isLocal = fs.existsSync(changeSet.workspaceId);

      // Apply mutations authoritatively to guarantee final target state
      try {
        for (const file of changeSet.files) {
          ChangeSetService.validatePath(file.path, isLocal ? changeSet.workspaceId : undefined);

          if (isLocal) {
            const resolved = path.isAbsolute(file.path) ? file.path : path.resolve(changeSet.workspaceId, file.path);
            if (file.operation === 'DELETE') {
              if (fs.existsSync(resolved)) {
                fs.unlinkSync(resolved);
              }
            } else {
              fs.mkdirSync(path.dirname(resolved), { recursive: true });
              fs.writeFileSync(resolved, file.after ?? '', 'utf-8');
            }
          } else if (options.workspaceService) {
            if (file.operation === 'DELETE') {
              await options.workspaceService.deleteFile(options.userId, changeSet.workspaceId, file.path, 'USER');
            } else {
              await options.workspaceService.writeFile(
                options.userId,
                changeSet.workspaceId,
                file.path,
                file.after ?? '',
                'USER',
                { executionId: changeSet.executionId }
              );
            }
          }
        }
      } catch (mutationErr: any) {
        this.sessionService?.emitSessionEvent({
          type: 'change_set_failed',
          sessionId: changeSet.sessionId,
          workspaceId: changeSet.workspaceId,
          executionId: changeSet.executionId,
          timestamp: Date.now(),
          data: {
            changeSetId,
            error: mutationErr.message || 'Failed to apply mutations to workspace'
          }
        });
        throw mutationErr;
      }

      changeSet.status = 'APPLIED';
      changeSet.conflictReason = undefined;
      changeSet.updatedAt = Date.now();

      this.recordAuditEntry(changeSet, options, 'apply', 'applied');

      this.sessionService?.emitSessionEvent({
        type: 'change_set_applied',
        sessionId: changeSet.sessionId,
        workspaceId: changeSet.workspaceId,
        executionId: changeSet.executionId,
        timestamp: Date.now(),
        data: {
          changeSetId,
          status: 'APPLIED',
          filesCount: changeSet.files.length,
          changeSet
        }
      });

      return changeSet;
    } finally {
      release();
    }
  }

  /**
   * Rejects the ChangeSet, restoring previous baseline state for every file in the set.
   * Authoritatively validates that workspace has not been modified since the ChangeSet
   * state before rolling back, preventing any accidental loss of newer user changes.
   */
  public async rejectChangeSet(changeSetId: string, options: ChangeSetActionOptions): Promise<ChangeSet> {
    const release = await this.acquireLock(changeSetId);
    try {
      const changeSet = this.changeSets.get(changeSetId);
      if (!changeSet) {
        throw new Error(`ChangeSet not found: ${changeSetId}`);
      }

      // Session and Workspace Isolation
      if (options.sessionId && options.sessionId !== changeSet.sessionId) {
        throw new Error(`Session mismatch: ChangeSet belongs to session ${changeSet.sessionId}, not ${options.sessionId}`);
      }
      if (options.workspaceId && options.workspaceId !== changeSet.workspaceId) {
        throw new Error(`Workspace mismatch: ChangeSet belongs to workspace ${changeSet.workspaceId}, not ${options.workspaceId}`);
      }

      // Idempotent retry check
      if (changeSet.status === 'REJECTED') {
        return changeSet;
      }

      // Explicit lifecycle transition validation
      if (changeSet.status === 'APPLIED') {
        throw new Error(`Cannot reject already applied ChangeSet: ${changeSetId}`);
      }
      if (changeSet.status === 'CONFLICT') {
        throw new Error(`Cannot reject conflicting ChangeSet: ${changeSetId}`);
      }
      if (changeSet.status !== 'PROPOSED') {
        throw new Error(`Invalid state transition: Cannot reject ChangeSet in status ${changeSet.status}`);
      }

      // Authoritative state validation prior to rollback: verify workspace state matches expected ChangeSet state.
      // If the user modified any file in the ChangeSet (e.g. B -> C), Reject MUST NOT blindly overwrite with A!
      const validation = await this.validateChangeSetState(changeSet, options);
      if (!validation.valid) {
        changeSet.status = 'CONFLICT';
        changeSet.conflictReason = `Reject blocked due to concurrent modifications: ` + validation.conflicts.map((c) => `${c.path}: ${c.reason}`).join('; ');
        changeSet.updatedAt = Date.now();

        this.recordAuditEntry(changeSet, options, 'conflict', 'conflict', changeSet.conflictReason);

        this.sessionService?.emitSessionEvent({
          type: 'change_set_conflict',
          sessionId: changeSet.sessionId,
          workspaceId: changeSet.workspaceId,
          executionId: changeSet.executionId,
          timestamp: Date.now(),
          data: {
            changeSetId,
            status: 'CONFLICT',
            conflictReason: changeSet.conflictReason,
            changeSet
          }
        });

        throw new Error(`Conflict detected while rejecting change set: ${changeSet.conflictReason}`);
      }

      const isLocal = fs.existsSync(changeSet.workspaceId);

      // Rollback changes safely
      try {
        for (const file of changeSet.files) {
          ChangeSetService.validatePath(file.path, isLocal ? changeSet.workspaceId : undefined);

          if (isLocal) {
            const resolved = path.isAbsolute(file.path) ? file.path : path.resolve(changeSet.workspaceId, file.path);
            if (file.operation === 'CREATE') {
              // Created file: delete it
              if (fs.existsSync(resolved)) {
                fs.unlinkSync(resolved);
              }
            } else if (file.operation === 'MODIFY') {
              // Modified file: restore original beforeContent
              fs.writeFileSync(resolved, file.before ?? '', 'utf-8');
            } else if (file.operation === 'DELETE') {
              // Deleted file: recreate with original beforeContent
              fs.mkdirSync(path.dirname(resolved), { recursive: true });
              fs.writeFileSync(resolved, file.before ?? '', 'utf-8');
            }
          } else if (options.workspaceService) {
            if (file.operation === 'CREATE') {
              try {
                await options.workspaceService.deleteFile(options.userId, changeSet.workspaceId, file.path, 'USER');
              } catch {
                // Ignore if already gone
              }
            } else if (file.operation === 'MODIFY' || file.operation === 'DELETE') {
              await options.workspaceService.writeFile(
                options.userId,
                changeSet.workspaceId,
                file.path,
                file.before ?? '',
                'USER',
                { executionId: changeSet.executionId }
              );
            }
          }
        }
      } catch (rollbackErr: any) {
        this.sessionService?.emitSessionEvent({
          type: 'change_set_failed',
          sessionId: changeSet.sessionId,
          workspaceId: changeSet.workspaceId,
          executionId: changeSet.executionId,
          timestamp: Date.now(),
          data: {
            changeSetId,
            error: rollbackErr.message || 'Failed to roll back workspace mutations'
          }
        });
        throw rollbackErr;
      }

      changeSet.status = 'REJECTED';
      changeSet.updatedAt = Date.now();

      this.recordAuditEntry(changeSet, options, 'reject', 'rejected');

      this.sessionService?.emitSessionEvent({
        type: 'change_set_rejected',
        sessionId: changeSet.sessionId,
        workspaceId: changeSet.workspaceId,
        executionId: changeSet.executionId,
        timestamp: Date.now(),
        data: {
          changeSetId,
          status: 'REJECTED',
          filesCount: changeSet.files.length,
          changeSet
        }
      });

      return changeSet;
    } finally {
      release();
    }
  }
}

export const globalChangeSetService = new ChangeSetService();
