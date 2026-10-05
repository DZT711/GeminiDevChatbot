import { EventEmitter } from 'events';
import { eq, desc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { sessions } from '../../db/schema.js';
import {
  AgentSession,
  AgentSessionContext,
  AgentSessionInitOptions,
  AgentSessionEvent,
  AgentSessionEventHandler,
  AgentSessionStatus,
  ModelProviderRef,
  SurfaceContextRequest,
  AgentContextHandoff,
  SurfaceContextBridge
} from '../../../agent/session/index.js';
import { globalWorkspaceService } from '../workspace/WorkspaceService.js';

/**
 * Shared Agent Session Service (M06-01).
 * Single authoritative service managing the lifecycle, workspace association,
 * execution linkage, and event streaming for all UI surfaces:
 * - Normal Chat UI
 * - Workspace Agent UI
 * - Workspace Terminal
 * - Goal / Plan interactions
 *
 * Core rule: "One Agent Session, multiple UI representations."
 * Does NOT duplicate agent runtimes, workspaces, or LLM loops.
 */
export class AgentSessionService {
  private activeSessions: Map<string, AgentSession> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();
  private executionSubscriptions: Map<string, () => void> = new Map();
  private dbAvailable: boolean = true;
  private lastDbCheck: number = 0;

  constructor() {
    this.eventEmitter.setMaxListeners(100);
  }

  /**
   * Retrieves an existing session from memory or DB, or creates a new one.
   */
  public async getOrCreateSession(
    sessionId: string,
    userId: string,
    initialConfig?: Partial<AgentSessionInitOptions>
  ): Promise<AgentSession> {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('sessionId must be a non-empty string');
    }

    // 1. Check in-memory active registry
    const cached = this.activeSessions.get(sessionId);
    if (cached) {
      if (initialConfig?.workspaceId && !cached.workspaceId) {
        cached.attachWorkspace(initialConfig.workspaceId);
        await this.persistSession(cached, userId);
      }
      return cached;
    }

    // 2. Query persistence layer
    const persisted = await this.loadFromDb(sessionId);
    if (persisted) {
      this.activeSessions.set(sessionId, persisted);
      if (initialConfig?.workspaceId && !persisted.workspaceId) {
        persisted.attachWorkspace(initialConfig.workspaceId);
        await this.persistSession(persisted, userId);
      }
      return persisted;
    }

    // 3. Create fresh AgentSession
    const session = new AgentSession({
      sessionId,
      userId,
      workspaceId: initialConfig?.workspaceId,
      executionId: initialConfig?.executionId,
      goalId: initialConfig?.goalId,
      planId: initialConfig?.planId,
      activeModel: initialConfig?.activeModel,
      metadata: {
        title: initialConfig?.metadata?.title || 'New Session',
        userId,
        ...(initialConfig?.metadata || {})
      },
      initialStatus: initialConfig?.initialStatus || 'IDLE'
    });

    this.activeSessions.set(sessionId, session);
    await this.persistSession(session, userId);

    this.emitSessionEvent({
      type: 'session_created',
      sessionId: session.sessionId,
      workspaceId: session.workspaceId,
      executionId: session.executionId,
      goalId: session.goalId,
      planId: session.planId,
      timestamp: Date.now(),
      data: session.getContext()
    });

    return session;
  }

  /**
   * Loads a session by ID. Checks memory first, then DB.
   */
  public async loadSession(sessionId: string, userId?: string): Promise<AgentSession | null> {
    if (!sessionId) return null;

    // Check memory
    let session = this.activeSessions.get(sessionId);
    if (!session) {
      session = await this.loadFromDb(sessionId);
      if (session) {
        this.activeSessions.set(sessionId, session);
      }
    }

    if (!session) {
      return null;
    }

    // Optional user isolation check
    if (userId && session.metadata.userId && session.metadata.userId !== userId && userId !== 'default_user') {
      return null;
    }

    return session;
  }

  /**
   * Attaches a workspace to an existing session.
   */
  public async attachWorkspace(
    sessionId: string,
    workspaceId: string,
    userId: string
  ): Promise<AgentSession> {
    const session = await this.getOrCreateSession(sessionId, userId);
    session.attachWorkspace(workspaceId);
    await this.persistSession(session, userId);

    this.emitSessionEvent({
      type: 'workspace_attached',
      sessionId: session.sessionId,
      workspaceId,
      timestamp: Date.now()
    });

    return session;
  }

  /**
   * Detaches workspace from an existing session.
   */
  public async detachWorkspace(
    sessionId: string,
    userId: string
  ): Promise<AgentSession> {
    const session = await this.getOrCreateSession(sessionId, userId);
    session.detachWorkspace();
    await this.persistSession(session, userId);

    this.emitSessionEvent({
      type: 'workspace_detached',
      sessionId: session.sessionId,
      timestamp: Date.now()
    });

    return session;
  }

  /**
   * Associates an execution ID with the session and bridges execution events.
   */
  public async associateExecution(
    sessionId: string,
    executionId: string | undefined,
    userId: string
  ): Promise<AgentSession> {
    const session = await this.getOrCreateSession(sessionId, userId);
    session.setExecution(executionId);

    // Bridge execution events to session subscribers
    if (executionId) {
      this.bridgeExecutionEvents(sessionId, executionId);
    }

    await this.persistSession(session, userId);

    this.emitSessionEvent({
      type: executionId ? 'execution_associated' : 'execution_detached',
      sessionId: session.sessionId,
      executionId,
      workspaceId: session.workspaceId,
      timestamp: Date.now()
    });

    return session;
  }

  /**
   * Associates a goal and plan with the session without owning planning logic.
   */
  public async associateGoalAndPlan(
    sessionId: string,
    goalId: string | undefined,
    planId: string | undefined,
    userId: string
  ): Promise<AgentSession> {
    const session = await this.getOrCreateSession(sessionId, userId);
    session.setGoalAndPlan(goalId, planId);
    await this.persistSession(session, userId);

    this.emitSessionEvent({
      type: 'goal_plan_associated',
      sessionId: session.sessionId,
      goalId,
      planId,
      workspaceId: session.workspaceId,
      timestamp: Date.now()
    });

    if (planId) {
      this.emitSessionEvent({
        type: 'plan_attached',
        sessionId: session.sessionId,
        goalId,
        planId,
        workspaceId: session.workspaceId,
        timestamp: Date.now(),
        data: {
          goalId,
          planId
        }
      });
    }

    return session;
  }

  /**
   * Attaches an approved M05 plan to the session with optional workspace validation.
   */
  public async attachPlanToSession(
    sessionId: string,
    planId: string,
    goalId?: string,
    userId: string = 'default_user',
    workspaceId?: string
  ): Promise<AgentSession> {
    const session = await this.getOrCreateSession(sessionId, userId);
    if (workspaceId && session.workspaceId && session.workspaceId !== workspaceId) {
      throw new Error(`Workspace mismatch: Plan workspace ${workspaceId} cannot attach to session with workspace ${session.workspaceId}`);
    }
    if (workspaceId && !session.workspaceId) {
      session.attachWorkspace(workspaceId);
    }
    session.setGoalAndPlan(goalId, planId);
    await this.persistSession(session, userId);

    this.emitSessionEvent({
      type: 'goal_plan_associated',
      sessionId: session.sessionId,
      goalId,
      planId,
      workspaceId: session.workspaceId,
      timestamp: Date.now()
    });

    this.emitSessionEvent({
      type: 'plan_attached',
      sessionId: session.sessionId,
      goalId,
      planId,
      workspaceId: session.workspaceId,
      timestamp: Date.now(),
      data: {
        goalId,
        planId
      }
    });

    return session;
  }

  /**
   * Sets the active model / provider configuration for the session.
   */
  public async setModel(
    sessionId: string,
    modelId: string,
    provider?: string,
    displayName?: string,
    userId: string = 'default_user'
  ): Promise<AgentSession> {
    const session = await this.getOrCreateSession(sessionId, userId);
    session.setModel(modelId, provider, displayName);
    await this.persistSession(session, userId);

    this.emitSessionEvent({
      type: 'model_changed',
      sessionId: session.sessionId,
      timestamp: Date.now(),
      data: session.activeModel
    });

    return session;
  }

  /**
   * Updates session execution status.
   */
  public async setStatus(
    sessionId: string,
    status: AgentSessionStatus,
    userId: string = 'default_user'
  ): Promise<AgentSession> {
    const session = await this.getOrCreateSession(sessionId, userId);
    session.setStatus(status);
    await this.persistSession(session, userId);

    this.emitSessionEvent({
      type: 'session_status_changed',
      sessionId: session.sessionId,
      timestamp: Date.now(),
      data: { status }
    });

    return session;
  }

  /**
   * Returns current context snapshot for session if loaded.
   */
  public getActiveSessionContext(sessionId: string): AgentSessionContext | null {
    const session = this.activeSessions.get(sessionId);
    return session ? session.getContext() : null;
  }

  /**
   * Finds an active or persisted session associated with a workspace ID.
   * If multiple sessions exist for a workspace, deterministically returns
   * the most recently updated session.
   */
  public async findSessionByWorkspace(
    workspaceId: string,
    userId: string = 'default_user'
  ): Promise<AgentSession | null> {
    // Check in-memory active sessions first (sorted by updatedAt descending)
    const matchingActive: AgentSession[] = [];
    for (const session of this.activeSessions.values()) {
      if (session.workspaceId === workspaceId) {
        matchingActive.push(session);
      }
    }

    if (matchingActive.length > 0) {
      matchingActive.sort((a, b) => b.updatedAt - a.updatedAt);
      return matchingActive[0];
    }

    // Check database with deterministic ordering by updatedAt descending
    try {
      const records = await db
        .select()
        .from(sessions)
        .where(eq(sessions.workspaceId, workspaceId))
        .orderBy(desc(sessions.updatedAt))
        .limit(1);

      if (records && records.length > 0) {
        return await this.loadSession(records[0].id, userId);
      }
    } catch (err) {
      console.warn('[AgentSessionService] Failed to query session by workspace:', err);
    }

    return null;
  }

  /**
   * Deterministically gets the active/persisted session for a workspace,
   * or creates a new one if none exists.
   */
  public async getOrCreateWorkspaceSession(
    workspaceId: string,
    userId: string = 'default_user',
    initialConfig?: Partial<AgentSessionInitOptions>
  ): Promise<AgentSession> {
    const existing = await this.findSessionByWorkspace(workspaceId, userId);
    if (existing) {
      return existing;
    }

    const sessionId = `session_ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return await this.getOrCreateSession(sessionId, userId, {
      workspaceId,
      metadata: {
        title: `Workspace Agent (${workspaceId})`,
        ...initialConfig?.metadata
      },
      ...initialConfig
    });
  }

  /**
   * Authoritatively cancels execution for a session, updating session status
   * to PAUSED, emitting a terminal event, and persisting the state.
   */
  public async cancelSession(
    sessionId: string,
    userId: string = 'default_user',
    reason: string = 'User cancelled execution'
  ): Promise<{ success: boolean; session: AgentSession | null }> {
    const session = await this.loadSession(sessionId, userId);
    if (!session) {
      return { success: false, session: null };
    }

    const previousStatus = session.status;
    session.setStatus('PAUSED');
    session.touch();

    this.emitSessionEvent({
      type: 'session_status_changed',
      sessionId,
      workspaceId: session.workspaceId,
      timestamp: Date.now(),
      data: {
        previousStatus,
        newStatus: 'PAUSED',
        reason
      }
    });

    this.emitSessionEvent({
      type: 'terminal_event',
      sessionId,
      workspaceId: session.workspaceId,
      timestamp: Date.now(),
      data: {
        action: 'cancel',
        reason
      }
    });

    await this.persistSession(session, userId);

    return { success: true, session };
  }

  /**
   * Processes a context handoff request between UI surfaces (Chat <-> Agent) (M06-07).
   * Validates session identity, user ownership, workspace association, and plan boundaries.
   */
  public async createContextHandoff(
    request: SurfaceContextRequest,
    userId: string = 'default_user'
  ): Promise<AgentContextHandoff> {
    const session = await this.loadSession(request.sessionId, userId);
    if (!session) {
      throw new Error(`Session ${request.sessionId} not found or access denied for user`);
    }

    // Strict user ownership check
    if (userId !== 'default_user' && session.metadata?.userId && session.metadata.userId !== userId) {
      throw new Error(`Unauthorized: User ${userId} cannot access session ${request.sessionId}`);
    }

    // Workspace attachment validation
    if (request.workspaceId) {
      if (session.workspaceId && session.workspaceId !== request.workspaceId) {
        throw new Error(
          `Workspace mismatch: Session ${request.sessionId} belongs to workspace ${session.workspaceId}, cannot attach ${request.workspaceId}`
        );
      }
      if (!session.workspaceId) {
        session.attachWorkspace(request.workspaceId);
        await this.persistSession(session, userId);
      }
    }

    // Plan association validation
    let resolvedPlanContext = request.planContext;
    if (request.includePlan && request.planContext) {
      if (session.planId && session.planId !== request.planContext.planId) {
        // If session already has a different active plan, prevent stale contamination
        resolvedPlanContext = undefined;
      }
    }

    const handoff = SurfaceContextBridge.createHandoff({
      ...request,
      workspaceId: session.workspaceId || request.workspaceId,
      executionId: session.executionId || request.executionId,
      planContext: resolvedPlanContext
    });

    // Emit surface_transition event on session
    this.emitSessionEvent({
      type: 'surface_transition',
      sessionId: session.sessionId,
      workspaceId: session.workspaceId,
      executionId: session.executionId,
      timestamp: Date.now(),
      data: {
        sourceSurface: handoff.sourceSurface,
        targetSurface: handoff.targetSurface,
        summary: handoff.summary
      }
    });

    return handoff;
  }

  /**
   * Subscribes to events for a specific session.
   */
  public subscribeSession(
    sessionId: string,
    handler: AgentSessionEventHandler
  ): () => void {
    const eventName = `session:${sessionId}`;
    this.eventEmitter.on(eventName, handler);
    return () => {
      this.eventEmitter.off(eventName, handler);
    };
  }

  /**
   * Emits an event to all subscribers of the session.
   */
  public emitSessionEvent(event: AgentSessionEvent): void {
    this.eventEmitter.emit(`session:${event.sessionId}`, event);
    this.eventEmitter.emit('session_all', event);
  }

  /**
   * Bridges execution events from globalWorkspaceService into session events.
   */
  private bridgeExecutionEvents(sessionId: string, executionId: string): void {
    const subKey = `${sessionId}:${executionId}`;
    if (this.executionSubscriptions.has(subKey)) {
      return;
    }

    const unsubscribe = globalWorkspaceService.subscribeExecutionEvents(executionId, (execEvent) => {
      const session = this.activeSessions.get(sessionId);
      this.emitSessionEvent({
        type: 'terminal_event',
        sessionId,
        executionId,
        workspaceId: session?.workspaceId,
        timestamp: execEvent.timestamp || Date.now(),
        data: execEvent
      });
    });

    this.executionSubscriptions.set(subKey, unsubscribe);
  }

  private isDbUsable(): boolean {
    if (!this.dbAvailable && Date.now() - this.lastDbCheck < 30000) {
      return false;
    }
    return true;
  }

  /**
   * Loads session from database.
   */
  private async loadFromDb(sessionId: string): Promise<AgentSession | null> {
    if (!this.isDbUsable()) {
      return null;
    }

    try {
      const records = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
      this.dbAvailable = true;
      if (!records || records.length === 0) {
        return null;
      }

      const rec = records[0];
      let activeModel: ModelProviderRef | undefined;
      if (rec.activeModel) {
        try {
          activeModel = JSON.parse(rec.activeModel);
        } catch {
          activeModel = { modelId: rec.activeModel };
        }
      }

      return new AgentSession({
        sessionId: rec.id,
        userId: rec.userId,
        workspaceId: rec.workspaceId || undefined,
        executionId: rec.executionId || undefined,
        goalId: rec.goalId || undefined,
        planId: rec.planId || undefined,
        activeModel,
        metadata: {
          title: rec.title || undefined,
          summary: rec.summary || undefined,
          ...(typeof rec.metadata === 'object' && rec.metadata !== null ? (rec.metadata as Record<string, unknown>) : {})
        },
        initialStatus: (rec.status as AgentSessionStatus) || 'IDLE'
      });
    } catch (err: unknown) {
      this.dbAvailable = false;
      this.lastDbCheck = Date.now();
      // Database not configured or unreachable in dev/test: return null to let in-memory work
      console.warn(`[AgentSessionService] DB load fallback for ${sessionId}:`, err instanceof Error ? err.message : err);
      return null;
    }
  }

  /**
   * Persists session to database.
   */
  private async persistSession(session: AgentSession, userId: string): Promise<void> {
    if (!this.isDbUsable()) {
      return;
    }

    try {
      const context = session.getContext();
      const activeModelStr = context.activeModel ? JSON.stringify(context.activeModel) : null;
      const metadataObj = { ...context.metadata };

      // Upsert into sessions table
      const existing = await db.select().from(sessions).where(eq(sessions.id, session.sessionId)).limit(1);
      this.dbAvailable = true;

      if (existing && existing.length > 0) {
        await db.update(sessions).set({
          workspaceId: context.workspaceId || null,
          executionId: context.executionId || null,
          goalId: context.goalId || null,
          planId: context.planId || null,
          activeModel: activeModelStr,
          status: context.status,
          metadata: metadataObj,
          updatedAt: new Date()
        }).where(eq(sessions.id, session.sessionId));
      } else {
        await db.insert(sessions).values({
          id: session.sessionId,
          userId: userId && userId.length === 36 ? userId : '00000000-0000-0000-0000-000000000000',
          title: (metadataObj.title as string) || 'New Session',
          pinned: false,
          summary: (metadataObj.summary as string) || null,
          workspaceId: context.workspaceId || null,
          executionId: context.executionId || null,
          goalId: context.goalId || null,
          planId: context.planId || null,
          activeModel: activeModelStr,
          status: context.status,
          metadata: metadataObj
        });
      }
    } catch (err: unknown) {
      this.dbAvailable = false;
      this.lastDbCheck = Date.now();
      // Graceful degradation: in memory state persists even if remote DB is down or read-only
      console.warn(`[AgentSessionService] DB save fallback for ${session.sessionId}:`, err instanceof Error ? err.message : err);
    }
  }

  /**
   * Cleanup session from memory when closed.
   */
  public closeSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
    for (const [key, unsub] of this.executionSubscriptions.entries()) {
      if (key.startsWith(`${sessionId}:`)) {
        unsub();
        this.executionSubscriptions.delete(key);
      }
    }
    this.emitSessionEvent({
      type: 'session_closed',
      sessionId,
      timestamp: Date.now()
    });
  }
}

// Global Singleton Instance
export const globalAgentSessionService = new AgentSessionService();
