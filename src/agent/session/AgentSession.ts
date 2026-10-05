import {
  AgentSessionStatus,
  AgentSessionContext,
  AgentSessionInitOptions,
  AgentSessionMetadata,
  ModelProviderRef
} from './AgentSessionTypes.js';

/**
 * Shared Agent Session Domain Object (M06-01).
 * Represents a single unified session capable of serving:
 * - Normal Chat UI
 * - Workspace Agent UI
 * - Workspace Terminal
 * - Goal / Plan interactions
 *
 * Adheres to: "One Agent Session, multiple UI representations."
 * Provider-agnostic: No concrete LLM SDKs or DB drivers in this domain entity.
 */
export class AgentSession {
  private readonly _sessionId: string;
  private _status: AgentSessionStatus;
  private _workspaceId?: string;
  private _executionId?: string;
  private _goalId?: string;
  private _planId?: string;
  private _activeModel?: ModelProviderRef;
  private _metadata: AgentSessionMetadata;
  private readonly _createdAt: number;
  private _updatedAt: number;
  private _lastActivityAt: number;

  constructor(options: AgentSessionInitOptions) {
    if (!options.sessionId || typeof options.sessionId !== 'string') {
      throw new Error('AgentSession requires a non-empty sessionId string');
    }

    this._sessionId = options.sessionId;
    this._status = options.initialStatus || 'IDLE';
    this._workspaceId = options.workspaceId;
    this._executionId = options.executionId;
    this._goalId = options.goalId;
    this._planId = options.planId;
    this._activeModel = options.activeModel;
    this._metadata = { ...(options.metadata || {}) };
    if (options.userId && !this._metadata.userId) {
      this._metadata.userId = options.userId;
    }

    const now = Date.now();
    this._createdAt = now;
    this._updatedAt = now;
    this._lastActivityAt = now;
  }

  public get sessionId(): string {
    return this._sessionId;
  }

  public get status(): AgentSessionStatus {
    return this._status;
  }

  public get workspaceId(): string | undefined {
    return this._workspaceId;
  }

  public get executionId(): string | undefined {
    return this._executionId;
  }

  public get goalId(): string | undefined {
    return this._goalId;
  }

  public get planId(): string | undefined {
    return this._planId;
  }

  public get activeModel(): ModelProviderRef | undefined {
    return this._activeModel ? { ...this._activeModel } : undefined;
  }

  public get metadata(): Readonly<AgentSessionMetadata> {
    return { ...this._metadata };
  }

  public get createdAt(): number {
    return this._createdAt;
  }

  public get updatedAt(): number {
    return this._updatedAt;
  }

  public get lastActivityAt(): number {
    return this._lastActivityAt;
  }

  public setStatus(status: AgentSessionStatus): void {
    this._status = status;
    this.touch();
  }

  public attachWorkspace(workspaceId: string): void {
    if (!workspaceId || typeof workspaceId !== 'string') {
      throw new Error('workspaceId must be a non-empty string');
    }
    this._workspaceId = workspaceId;
    this.touch();
  }

  public detachWorkspace(): void {
    this._workspaceId = undefined;
    this.touch();
  }

  public setExecution(executionId: string | undefined): void {
    this._executionId = executionId;
    this.touch();
  }

  public setGoalAndPlan(goalId?: string, planId?: string): void {
    this._goalId = goalId;
    this._planId = planId;
    this.touch();
  }

  public setModel(modelId: string, provider?: string, displayName?: string): void {
    if (!modelId || typeof modelId !== 'string') {
      throw new Error('modelId must be a non-empty string');
    }
    this._activeModel = { modelId, provider, displayName };
    this.touch();
  }

  public updateMetadata(patch: Partial<AgentSessionMetadata>): void {
    this._metadata = { ...this._metadata, ...patch };
    this.touch();
  }

  public touch(): void {
    const now = Date.now();
    this._updatedAt = now;
    this._lastActivityAt = now;
  }

  /**
   * Returns an immutable snapshot of current session context.
   */
  public getContext(): AgentSessionContext {
    return {
      sessionId: this._sessionId,
      status: this._status,
      workspaceId: this._workspaceId,
      executionId: this._executionId,
      goalId: this._goalId,
      planId: this._planId,
      activeModel: this.activeModel,
      metadata: this.metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      lastActivityAt: this._lastActivityAt
    };
  }
}
