import express from 'express';
import * as jose from 'jose';
import { JWT_SECRET } from './utils.js';
import { di } from '../di.js';
import { AgentSessionEvent } from '../../agent/session/index.js';
import { toCanonicalEnvelope } from '../services/message/ConversationMessageService.js';

export const router = express.Router();

async function resolveUserId(req: express.Request): Promise<string> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      if (payload && payload.id) {
        return payload.id as string;
      }
    } catch {
      // Fallback
    }
  }
  if (req.query && typeof req.query.token === 'string') {
    try {
      const { payload } = await jose.jwtVerify(req.query.token, JWT_SECRET);
      if (payload && payload.id) {
        return payload.id as string;
      }
    } catch {
      // Fallback
    }
  }
  const customHeader = req.headers['x-workspace-user-id'] || req.headers['x-session-user-id'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim();
  }
  return 'default_user';
}

/**
 * GET /api/agent/session/:id
 * Retrieve current context and state of an Agent Session.
 */
router.get('/agent/session/:id', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const sessionId = req.params.id;
    const session = await di.agentSessionService.loadSession(sessionId, userId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      session: session.getContext()
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AgentSessionController] Error fetching session:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/agent/session/:id/messages
 * Retrieve canonical conversation messages for an Agent Session.
 */
router.get('/agent/session/:id/messages', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const sessionId = req.params.id;
    const interactionType = typeof req.query.interactionType === 'string' ? req.query.interactionType as any : undefined;
    const surface = typeof req.query.surface === 'string' ? req.query.surface as any : undefined;

    const messages = await di.conversationMessageService.getSessionMessages(sessionId, userId, {
      interactionType,
      surface
    });

    res.json({
      success: true,
      sessionId,
      messages,
      envelopes: messages.map(toCanonicalEnvelope)
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AgentSessionController] Error fetching session messages:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/agent/session/workspace/:workspaceId
 * Find an active or persisted session associated with a workspace ID.
 */
router.get('/agent/session/workspace/:workspaceId', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const workspaceId = req.params.workspaceId;
    const session = await di.agentSessionService.findSessionByWorkspace(workspaceId, userId);

    if (!session) {
      return res.status(404).json({ error: 'No session found for workspace' });
    }

    res.json({
      success: true,
      session: session.getContext()
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AgentSessionController] Error finding session by workspace:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/agent/session
 * Create or get an existing Agent Session.
 */
router.post('/agent/session', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const { sessionId, workspaceId, executionId, goalId, planId, activeModel, metadata } = req.body;
    const targetSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const session = await di.agentSessionService.getOrCreateSession(targetSessionId, userId, {
      workspaceId,
      executionId,
      goalId,
      planId,
      activeModel,
      metadata
    });

    res.json({
      success: true,
      session: session.getContext()
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AgentSessionController] Error initializing session:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/agent/session/:id/workspace
 * Attach or detach workspace to an existing Agent Session.
 */
router.post('/agent/session/:id/workspace', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const sessionId = req.params.id;
    const { workspaceId, detach } = req.body;

    let session;
    if (detach || !workspaceId) {
      session = await di.agentSessionService.detachWorkspace(sessionId, userId);
    } else {
      session = await di.agentSessionService.attachWorkspace(sessionId, workspaceId, userId);
    }

    res.json({
      success: true,
      session: session.getContext()
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AgentSessionController] Error updating session workspace:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/agent/session/:id/model
 * Update active model/provider info on an existing Agent Session.
 */
router.post('/agent/session/:id/model', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const sessionId = req.params.id;
    const { modelId, provider, displayName } = req.body;

    if (!modelId) {
      return res.status(400).json({ error: 'modelId is required' });
    }

    const session = await di.agentSessionService.setModel(sessionId, modelId, provider, displayName, userId);

    res.json({
      success: true,
      session: session.getContext()
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AgentSessionController] Error updating session model:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/agent/session/:id/execution
 * Associate active execution ID with an existing Agent Session.
 */
router.post('/agent/session/:id/execution', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const sessionId = req.params.id;
    const { executionId } = req.body;

    const session = await di.agentSessionService.associateExecution(sessionId, executionId, userId);

    res.json({
      success: true,
      session: session.getContext()
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AgentSessionController] Error associating execution:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/agent/session/:id/goal-plan
 * Associate goal and plan with an existing Agent Session.
 */
router.post('/agent/session/:id/goal-plan', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const sessionId = req.params.id;
    const { goalId, planId } = req.body;

    const session = await di.agentSessionService.associateGoalAndPlan(sessionId, goalId, planId, userId);

    res.json({
      success: true,
      session: session.getContext()
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AgentSessionController] Error associating goal and plan:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/agent/session/:id/events
 * SSE stream delivering real-time correlated events for the session across all UI representations:
 * - Normal Chat updates
 * - Workspace Agent updates
 * - Workspace Terminal output
 * - Goal/Plan lifecycle
 */
router.get('/agent/session/:id/events', async (req, res) => {
  const sessionId = req.params.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders?.();

  // Send initial handshake comment to establish the connection stream immediately
  res.write(': sse connected\n\n');
  if (typeof (res as any).flush === 'function') {
    (res as any).flush();
  }

  // Send initial connected event with current snapshot
  const initialContext = di.agentSessionService.getActiveSessionContext(sessionId);
  res.write(`data: ${JSON.stringify({
    type: 'session_connected',
    sessionId,
    timestamp: Date.now(),
    data: initialContext
  })}\n\n`);

  const unsubscribe = di.agentSessionService.subscribeSession(sessionId, (event: AgentSessionEvent) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  });

  req.on('close', () => {
    unsubscribe();
  });
});

/**
 * POST /api/agent/session/:id/handoff
 * Process a context handoff between UI surfaces (Chat <-> Agent) (M06-07).
 * Strictly validates user ownership, workspace association, and bounded context.
 */
router.post('/agent/session/:id/handoff', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const sessionId = req.params.id;
    const body = req.body || {};

    const handoff = await di.agentSessionService.createContextHandoff({
      sessionId,
      sourceSurface: body.sourceSurface || 'chat',
      targetSurface: body.targetSurface || 'agent',
      includeConversation: body.includeConversation ?? true,
      includeWorkspace: body.includeWorkspace ?? true,
      includeCurrentFile: body.includeCurrentFile ?? true,
      includeSelection: body.includeSelection ?? true,
      includePlan: body.includePlan ?? false,
      includeExecution: body.includeExecution ?? true,
      messages: body.messages,
      workspaceId: body.workspaceId,
      currentFile: body.currentFile,
      selection: body.selection,
      planContext: body.planContext,
      executionId: body.executionId,
      summary: body.summary,
      maxRecentMessages: body.maxRecentMessages
    }, userId);

    res.json({
      success: true,
      handoff
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes('Unauthorized') ? 403 : message.includes('not found') ? 404 : 400;
    console.error('[AgentSessionController] Error processing surface handoff:', message);
    res.status(status).json({ error: message });
  }
});
