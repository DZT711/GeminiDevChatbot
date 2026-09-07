import express from 'express';
import * as jose from 'jose';
import { JWT_SECRET } from './utils.js';
import { globalWorkspaceService, FileProvenanceRecord } from '../services/workspace/WorkspaceService.js';
import { GoalPlanningResult } from '../services/agentIntegration/planning/GoalPlanningTypes.js';
import { PlanExecutionApproval } from '../services/agentIntegration/planning/PlanExecutionService.js';
import { formatAgentError } from '../utils/agentErrorFormatter.js';

export const router = express.Router();

// Helper to extract or fallback user ID
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
      // Invalid/expired token - fallback to guest/header
    }
  }
  const customHeader = req.headers['x-workspace-user-id'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim();
  }
  return 'default_user';
}

/**
 * GET /api/workspace
 * Returns summary of current active workspace
 */
router.get('/workspace', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const workspaceId = req.query.workspaceId as string | undefined;
    const summary = await globalWorkspaceService.getActiveWorkspaceSummary(userId, workspaceId);
    const userWorkspaces = await globalWorkspaceService.listUserWorkspaces(userId);

    res.json({
      workspace: summary,
      workspaces: userWorkspaces
    });
  } catch (err: any) {
    console.error('[WorkspaceController] Error fetching workspace:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch workspace' });
  }
});

/**
 * POST /api/workspace
 * Select or initialize workspace
 */
router.post('/workspace', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const { workspaceId, name } = req.body;
    const targetWsId = workspaceId || `ws_${Date.now()}`;
    const workspace = await globalWorkspaceService.resolveUserWorkspace(userId, targetWsId);
    const summary = await globalWorkspaceService.getActiveWorkspaceSummary(userId, workspace.getId());

    res.json({
      success: true,
      workspace: summary
    });
  } catch (err: any) {
    console.error('[WorkspaceController] Error setting workspace:', err);
    res.status(500).json({ error: err.message || 'Failed to set workspace' });
  }
});

/**
 * GET /api/workspace/files
 * List directory entries
 */
router.get('/workspace/files', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const workspaceId = req.query.workspaceId as string | undefined;
    const dirPath = (req.query.path as string) || '';

    const listing = await globalWorkspaceService.listFiles(userId, workspaceId, dirPath);
    res.json({
      path: listing.path,
      total: listing.total,
      entries: listing.entries
    });
  } catch (err: any) {
    console.error('[WorkspaceController] Error listing files:', err);
    const status = err.name === 'WorkspacePathError' ? 400 : 500;
    res.status(status).json({ error: err.message || 'Failed to list files' });
  }
});

/**
 * GET /api/workspace/file
 * Read file with metadata & provenance
 */
router.get('/workspace/file', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const workspaceId = req.query.workspaceId as string | undefined;
    const filePath = req.query.path as string;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    if (filePath.includes('__pycache__') || filePath.endsWith('.pyc')) {
      return res.json({
        file: {
          path: filePath,
          name: filePath.split('/').pop() || filePath,
          content: '',
          size: 0,
          language: 'plaintext',
          modifiedAt: Date.now(),
          lastActor: 'USER',
          history: []
        }
      });
    }

    const file = await globalWorkspaceService.readFile(userId, workspaceId, filePath);
    res.json({ file });
  } catch (err: any) {
    if (err.message?.includes('not found') || err.message?.includes('Directory')) {
      console.info(`[WorkspaceController] File not found or is directory: ${req.query.path}`);
      return res.status(404).json({ error: err.message || 'File not found' });
    }
    console.error('[WorkspaceController] Error reading file:', err);
    const status = err.name === 'WorkspacePathError' ? 400 : 500;
    res.status(status).json({ error: err.message || 'Failed to read file' });
  }
});

/**
 * PUT /api/workspace/file
 * Create or edit file (Actor = USER)
 */
router.put('/workspace/file', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const { path: filePath, content, workspaceId, actor = 'USER' } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' });
    }
    if (content === undefined || content === null) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const savedFile = await globalWorkspaceService.writeFile(
      userId,
      workspaceId,
      filePath,
      String(content),
      actor as 'USER' | 'AGENT'
    );

    res.json({
      success: true,
      file: savedFile
    });
  } catch (err: any) {
    console.error('[WorkspaceController] Error writing file:', err);
    const status = err.name === 'WorkspacePathError' ? 400 : 500;
    res.status(status).json({ error: err.message || 'Failed to write file' });
  }
});

/**
 * DELETE /api/workspace/file
 * Delete file (Actor = USER)
 */
router.delete('/workspace/file', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const filePath = (req.query.path as string) || req.body?.path;
    const workspaceId = (req.query.workspaceId as string) || req.body?.workspaceId;

    if (!filePath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const result = await globalWorkspaceService.deleteFile(userId, workspaceId, filePath, 'USER');
    res.json(result);
  } catch (err: any) {
    console.error('[WorkspaceController] Error deleting file:', err);
    const status = err.name === 'WorkspacePathError' ? 400 : 500;
    res.status(status).json({ error: err.message || 'Failed to delete file' });
  }
});

/**
 * POST /api/workspace/file/rename
 * Rename file (Actor = USER)
 */
router.post('/workspace/file/rename', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const { oldPath, newPath, workspaceId } = req.body;

    if (!oldPath || !newPath) {
      return res.status(400).json({ error: 'oldPath and newPath are required' });
    }

    const renamed = await globalWorkspaceService.renameFile(userId, workspaceId, oldPath, newPath, 'USER');
    res.json({ success: true, file: renamed });
  } catch (err: any) {
    console.error('[WorkspaceController] Error renaming file:', err);
    const status = err.name === 'WorkspacePathError' ? 400 : 500;
    res.status(status).json({ error: err.message || 'Failed to rename file' });
  }
});

/**
 * POST /api/workspace/directory
 * Create a new directory
 */
router.post('/workspace/directory', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const { path: dirPath, workspaceId } = req.body;

    if (!dirPath) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const result = await globalWorkspaceService.createDirectory(userId, workspaceId, dirPath, 'USER');
    res.json(result);
  } catch (err: any) {
    console.error('[WorkspaceController] Error creating directory:', err);
    const status = err.name === 'WorkspacePathError' ? 400 : 500;
    res.status(status).json({ error: err.message || 'Failed to create directory' });
  }
});

/**
 * DELETE /api/workspace/directory
 * Delete a directory and all its contents
 */
router.delete('/workspace/directory', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const dirPath = (req.query.path as string) || req.body?.path;
    const workspaceId = (req.query.workspaceId as string) || req.body?.workspaceId;

    if (!dirPath) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const result = await globalWorkspaceService.deleteDirectory(userId, workspaceId, dirPath, 'USER');
    res.json(result);
  } catch (err: any) {
    console.error('[WorkspaceController] Error deleting directory:', err);
    const status = err.name === 'WorkspacePathError' ? 400 : 500;
    res.status(status).json({ error: err.message || 'Failed to delete directory' });
  }
});

/**
 * POST /api/workspace/command
 * Run command inside workspace sandbox
 */
router.post('/workspace/command', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const { command, cwd, timeoutMs, workspaceId, input, sessionId } = req.body;

    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'Command string is required' });
    }

    const effectiveSessionId = sessionId || `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Abort if client aborts the HTTP request
    req.on('close', () => {
      if (!res.writableEnded) {
        globalWorkspaceService.abortCommand(effectiveSessionId);
      }
    });

    const startTime = Date.now();
    const result = await globalWorkspaceService.runCommand(userId, workspaceId, command, {
      cwd,
      timeoutMs: timeoutMs || (sessionId ? 180000 : 30000),
      input,
      sessionId: effectiveSessionId
    });

    res.json({
      ...result,
      durationMs: Date.now() - startTime
    });
  } catch (err: any) {
    console.error('[WorkspaceController] Error executing command:', err);
    res.status(500).json({
      exitCode: 1,
      stdout: '',
      stderr: err.message || 'Command execution defect',
      durationMs: 0,
      error: err.message
    });
  }
});

/**
 * POST /api/workspace/command/stream
 * Stream command output in real-time using SSE and keep stdin open for interactive inputs
 */
router.post('/workspace/command/stream', async (req, res) => {
  const { command, cwd, timeoutMs, workspaceId, input, sessionId } = req.body;

  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Command string is required' });
  }

  const effectiveSessionId = sessionId || `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let isCompleted = false;

  req.on('close', () => {
    if (!isCompleted) {
      globalWorkspaceService.abortCommand(effectiveSessionId);
    }
  });

  try {
    const userId = await resolveUserId(req);

    const result = await globalWorkspaceService.runCommand(userId, workspaceId, command, {
      cwd,
      timeoutMs: timeoutMs || 180000,
      input,
      sessionId: effectiveSessionId,
      onStdout: (chunk: string) => {
        if (!res.writableEnded) {
          res.write(`event: stdout\ndata: ${JSON.stringify({ chunk })}\n\n`);
        }
      },
      onStderr: (chunk: string) => {
        if (!res.writableEnded) {
          res.write(`event: stderr\ndata: ${JSON.stringify({ chunk })}\n\n`);
        }
      }
    });

    isCompleted = true;
    if (!res.writableEnded) {
      res.write(`event: exit\ndata: ${JSON.stringify(result)}\n\n`);
      res.end();
    }
  } catch (err: any) {
    isCompleted = true;
    if (!res.writableEnded) {
      res.write(`event: exit\ndata: ${JSON.stringify({
        exitCode: 1,
        stdout: '',
        stderr: err?.message || 'Command failed',
        durationMs: 0
      })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/workspace/command/input
 * Feed user standard input into an actively running command in the sandbox
 */
router.post('/workspace/command/input', async (req, res) => {
  const { sessionId, input } = req.body;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const success = globalWorkspaceService.sendInputToCommand(sessionId, String(input ?? ''));
  res.json({ success });
});

/**
 * POST /api/workspace/command/abort
 * Send SIGINT / abort an actively running command (e.g. user pressed Ctrl+C)
 */
router.post('/workspace/command/abort', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const success = globalWorkspaceService.abortCommand(sessionId);
  res.json({ success });
});

/**
 * POST /api/workspace/execute
 * Execute approved Plan through PlanExecutionService
 */
router.post('/workspace/execute', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const { planningResult, approval, workspaceId, apiKey, model } = req.body as {
      planningResult: GoalPlanningResult;
      approval: PlanExecutionApproval;
      workspaceId?: string;
      apiKey?: string;
      model?: string;
    };

    if (!planningResult || !planningResult.plan) {
      return res.status(400).json({ error: 'Valid planningResult with plan is required.' });
    }

    if (!approval || !approval.confirmed) {
      return res.status(400).json({
        error: 'Execution rejected: Explicit user confirmation and approval is required.'
      });
    }

    const summary = await globalWorkspaceService.executePlan(userId, {
      planningResult,
      approval,
      workspaceId,
      apiKey,
      model
    });

    const diagnosis = !summary.success && summary.error ? formatAgentError(summary.error) : undefined;

    res.json({
      success: summary.success,
      summary,
      diagnosis
    });
  } catch (err: unknown) {
    const diag = formatAgentError(err);
    console.error('[WorkspaceController] Error executing plan:', diag);
    res.status(diag.statusCode || 500).json({
      error: `${diag.title}: ${diag.message}`,
      diagnosis: diag
    });
  }
});

/**
 * POST /api/workspace/stop
 * Stop / abort active execution
 */
router.post('/workspace/stop', async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const { executionId } = req.body;

    if (!executionId) {
      return res.status(400).json({ error: 'executionId is required' });
    }

    const stopped = globalWorkspaceService.stopExecution(userId, executionId);
    res.json({ success: stopped, executionId, message: stopped ? 'Execution aborted' : 'Execution not active' });
  } catch (err: any) {
    console.error('[WorkspaceController] Error stopping execution:', err);
    res.status(500).json({ error: err.message || 'Failed to stop execution' });
  }
});

/**
 * GET /api/workspace/execution/:id
 * Get execution summary and event logs
 */
router.get('/workspace/execution/:id', async (req, res) => {
  try {
    const executionId = req.params.id;
    const summary = globalWorkspaceService.getExecutionSummary(executionId);
    const events = globalWorkspaceService.getExecutionEvents(executionId);

    res.json({
      executionId,
      summary: summary || null,
      events
    });
  } catch (err: any) {
    console.error('[WorkspaceController] Error getting execution:', err);
    res.status(500).json({ error: err.message || 'Failed to retrieve execution' });
  }
});

/**
 * GET /api/workspace/events/:id
 * Server-Sent Events stream for execution progress
 */
router.get('/workspace/events/:id', (req, res) => {
  const executionId = req.params.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send historical events first
  const pastEvents = globalWorkspaceService.getExecutionEvents(executionId);
  for (const event of pastEvents) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  // Subscribe to new real-time events
  const unsubscribe = globalWorkspaceService.subscribeExecutionEvents(executionId, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    if (
      event.type === 'execution_completed' ||
      event.type === 'execution_failed' ||
      event.type === 'execution_aborted'
    ) {
      setTimeout(() => {
        res.end();
      }, 500);
    }
  });

  req.on('close', () => {
    unsubscribe();
  });
});

/**
 * GET /api/workspace/audit
 * Get file mutation provenance logs
 */
router.get('/workspace/audit', async (req, res) => {
  try {
    const workspaceId = (req.query.workspaceId as string) || 'default';
    const filePath = req.query.path as string | undefined;
    const logs = globalWorkspaceService.getFileAuditLog(workspaceId, filePath);

    res.json({ logs });
  } catch (err: any) {
    console.error('[WorkspaceController] Error getting audit logs:', err);
    res.status(500).json({ error: err.message || 'Failed to retrieve audit log' });
  }
});
