import { apiClient } from './apiClient.js';
import { storageService } from './storageService.js';
import type { 
  AgentSessionContext, 
  AgentSessionEvent, 
  AgentSessionStatus, 
  AgentSessionInitOptions,
  SurfaceContextRequest,
  AgentContextHandoff
} from '../../agent/session/index.js';

class ClientAgentSessionService {
  /**
   * Retrieves the current context and state of an existing session.
   */
  async getSession(sessionId: string): Promise<AgentSessionContext | null> {
    try {
      const res = await apiClient.request<{ success: boolean; session: AgentSessionContext }>(
        `/api/agent/session/${encodeURIComponent(sessionId)}`,
        { method: 'GET' }
      );
      return res.session || null;
    } catch (err) {
      console.warn(`[agentSessionService] Failed to get session ${sessionId}:`, err);
      return null;
    }
  }

  /**
   * Retrieves canonical persisted conversation messages for a session.
   */
  async getSessionMessages(sessionId: string): Promise<any[]> {
    try {
      const res = await apiClient.request<{ success: boolean; messages: any[] }>(
        `/api/agent/session/${encodeURIComponent(sessionId)}/messages`,
        { method: 'GET' }
      );
      return res.messages || [];
    } catch (err) {
      console.warn(`[agentSessionService] Failed to get session messages for ${sessionId}:`, err);
      return [];
    }
  }

  /**
   * Finds an active or persisted session associated with a workspace ID.
   */
  async findSessionForWorkspace(workspaceId: string): Promise<AgentSessionContext | null> {
    try {
      const res = await apiClient.request<{ success: boolean; session: AgentSessionContext }>(
        `/api/agent/session/workspace/${encodeURIComponent(workspaceId)}`,
        { method: 'GET' }
      );
      return res.session || null;
    } catch (err) {
      // 404 is normal if no session is yet associated
      return null;
    }
  }

  /**
   * Creates or gets a shared agent session.
   */
  async getOrCreateSession(
    sessionId?: string,
    initialConfig: Partial<AgentSessionInitOptions> = {}
  ): Promise<AgentSessionContext> {
    const res = await apiClient.request<{ success: boolean; session: AgentSessionContext }>(
      '/api/agent/session',
      {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          workspaceId: initialConfig.workspaceId,
          executionId: initialConfig.executionId,
          goalId: initialConfig.goalId,
          planId: initialConfig.planId,
          activeModel: initialConfig.activeModel,
          metadata: initialConfig.metadata
        })
      }
    );
    return res.session;
  }

  /**
   * Attaches a workspace to an existing Agent Session.
   */
  async attachWorkspace(sessionId: string, workspaceId: string): Promise<AgentSessionContext> {
    const res = await apiClient.request<{ success: boolean; session: AgentSessionContext }>(
      `/api/agent/session/${encodeURIComponent(sessionId)}/workspace`,
      {
        method: 'POST',
        body: JSON.stringify({ workspaceId, detach: false })
      }
    );
    return res.session;
  }

  /**
   * Detaches workspace from an Agent Session.
   */
  async detachWorkspace(sessionId: string): Promise<AgentSessionContext> {
    const res = await apiClient.request<{ success: boolean; session: AgentSessionContext }>(
      `/api/agent/session/${encodeURIComponent(sessionId)}/workspace`,
      {
        method: 'POST',
        body: JSON.stringify({ detach: true })
      }
    );
    return res.session;
  }

  /**
   * Associates execution ID with the Agent Session.
   */
  async associateExecution(sessionId: string, executionId?: string): Promise<AgentSessionContext> {
    const res = await apiClient.request<{ success: boolean; session: AgentSessionContext }>(
      `/api/agent/session/${encodeURIComponent(sessionId)}/execution`,
      {
        method: 'POST',
        body: JSON.stringify({ executionId })
      }
    );
    return res.session;
  }

  /**
   * Associates goal and plan with the Agent Session.
   */
  async associateGoalPlan(sessionId: string, goalId?: string, planId?: string): Promise<AgentSessionContext> {
    const res = await apiClient.request<{ success: boolean; session: AgentSessionContext }>(
      `/api/agent/session/${encodeURIComponent(sessionId)}/goal-plan`,
      {
        method: 'POST',
        body: JSON.stringify({ goalId, planId })
      }
    );
    return res.session;
  }

  /**
   * Sets the active model for the Agent Session.
   */
  async setModel(
    sessionId: string,
    modelId: string,
    provider?: string,
    displayName?: string
  ): Promise<AgentSessionContext> {
    const res = await apiClient.request<{ success: boolean; session: AgentSessionContext }>(
      `/api/agent/session/${encodeURIComponent(sessionId)}/model`,
      {
        method: 'POST',
        body: JSON.stringify({ modelId, provider, displayName })
      }
    );
    return res.session;
  }

  /**
   * Sets status for the Agent Session.
   */
  async setStatus(sessionId: string, status: AgentSessionStatus): Promise<AgentSessionContext> {
    const res = await apiClient.request<{ success: boolean; session: AgentSessionContext }>(
      `/api/agent/session/${encodeURIComponent(sessionId)}/status`,
      {
        method: 'POST',
        body: JSON.stringify({ status })
      }
    );
    return res.session;
  }

  /**
   * Generates a validated surface context handoff (Chat <-> Agent) (M06-07).
   */
  async createContextHandoff(request: SurfaceContextRequest): Promise<AgentContextHandoff> {
    const res = await apiClient.request<{ success: boolean; handoff: AgentContextHandoff }>(
      `/api/agent/session/${encodeURIComponent(request.sessionId)}/handoff`,
      {
        method: 'POST',
        body: JSON.stringify(request)
      }
    );
    return res.handoff;
  }

  /**
   * Subscribes to real-time events for the session via SSE.
   * Cleans up automatically when the returned unsubscription callback is executed.
   */
  subscribeSessionEvents(
    sessionId: string,
    onEvent: (event: AgentSessionEvent) => void,
    onError?: (err: unknown) => void,
    onOpen?: () => void
  ): () => void {
    if (!sessionId) {
      return () => {};
    }

    let isClosed = false;
    let eventSource: EventSource | null = null;
    let retryCount = 0;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = (): void => {
      if (isClosed) return;

      try {
        const token = storageService.getSessionToken();
        const queryParams = token ? `?token=${encodeURIComponent(token)}` : '';
        const url = `/api/agent/session/${encodeURIComponent(sessionId)}/events${queryParams}`;

        const EventSourceClass = typeof EventSource !== 'undefined' ? EventSource : (globalThis as any).EventSource;
        if (!EventSourceClass) {
          return;
        }

        if (eventSource) {
          try {
            eventSource.close();
          } catch {
            // ignore
          }
        }

        eventSource = new EventSourceClass(url);

        eventSource.onopen = () => {
          retryCount = 0;
          if (onOpen) onOpen();
        };

        eventSource.onmessage = (e: MessageEvent) => {
          try {
            if (!e.data) return;
            const parsed = JSON.parse(e.data);
            onEvent(parsed);
          } catch (err) {
            // ignore malformed data
          }
        };

        eventSource.onerror = (err: unknown) => {
          if (isClosed) return;

          // EventSource automatically retries transient disconnects.
          // Only trigger onError after connection closes or repeated consecutive failures.
          if (eventSource?.readyState === EventSourceClass.CLOSED) {
            retryCount++;
            if (onError && retryCount >= 3) {
              onError(err);
            }
            try {
              eventSource.close();
            } catch {
              // ignore
            }
            const delay = Math.min(1000 * Math.pow(1.5, retryCount), 10000);
            retryTimeout = setTimeout(() => {
              if (!isClosed) connect();
            }, delay);
          }
        };
      } catch (err) {
        retryCount++;
        if (onError && retryCount >= 3) {
          onError(err);
        }
      }
    };

    connect();

    return () => {
      isClosed = true;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }
}

export const agentSessionService = new ClientAgentSessionService();
