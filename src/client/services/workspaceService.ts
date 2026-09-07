import { apiClient } from './apiClient.js';
import { storageService } from './storageService.js';
import type { GoalPlanningResult } from '../../server/services/agentIntegration/planning/GoalPlanningTypes.js';
import type { PlanExecutionApproval, PlanExecutionSummary } from '../../server/services/agentIntegration/planning/PlanExecutionService.js';

export type WorkspaceStatus = 'CREATING' | 'READY' | 'RUNNING' | 'STOPPED' | 'ERROR';
export type MutationActor = 'USER' | 'AGENT';

export interface FileProvenanceRecord {
  id: string;
  workspaceId: string;
  path: string;
  action: 'create' | 'edit' | 'delete';
  actor: MutationActor;
  taskId?: string;
  executionId?: string;
  timestamp: number;
  previousContent?: string;
  newContent?: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  provider: string;
  status: WorkspaceStatus;
  workingDirectory: string;
  activeExecutionId?: string;
  createdAt: number;
  lastActivityAt: number;
  filesCount: number;
}

export interface WorkspaceDirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: number;
  lastActor?: MutationActor;
}

export interface WorkspaceDirectoryListing {
  path: string;
  total: number;
  entries: WorkspaceDirectoryEntry[];
}

export interface WorkspaceFileMeta {
  path: string;
  name: string;
  content: string;
  size: number;
  language: string;
  modifiedAt: number;
  lastActor: MutationActor;
  lastTaskId?: string;
  lastExecutionId?: string;
  history: FileProvenanceRecord[];
}

export interface PlanExecutionProgressEvent {
  type:
    | 'execution_started'
    | 'task_started'
    | 'tool_started'
    | 'tool_output'
    | 'task_completed'
    | 'task_failed'
    | 'task_blocked'
    | 'execution_completed'
    | 'execution_failed'
    | 'execution_aborted'
    | 'replan_requested';
  executionId: string;
  planId: string;
  taskId?: string;
  stepId?: string;
  toolName?: string;
  status?: string;
  progress?: number;
  totalTasks?: number;
  completedTasks?: number;
  result?: unknown;
  error?: string;
  timestamp: number;
}

export interface CommandExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  error?: string;
  workingDirectory?: string;
}

export const workspaceService = {
  async getActiveWorkspace(workspaceId?: string): Promise<{ workspace: WorkspaceSummary; workspaces: WorkspaceSummary[] }> {
    const url = workspaceId ? `/api/workspace?workspaceId=${encodeURIComponent(workspaceId)}` : '/api/workspace';
    return apiClient.get(url);
  },

  async createOrSelectWorkspace(workspaceId?: string, name?: string): Promise<{ success: boolean; workspace: WorkspaceSummary }> {
    return apiClient.post('/api/workspace', { workspaceId, name });
  },

  async listFiles(workspaceId?: string, dirPath: string = ''): Promise<WorkspaceDirectoryListing> {
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspaceId', workspaceId);
    if (dirPath) params.append('path', dirPath);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/api/workspace/files${query}`);
  },

  async readFile(filePath: string, workspaceId?: string): Promise<WorkspaceFileMeta> {
    const params = new URLSearchParams({ path: filePath });
    if (workspaceId) params.append('workspaceId', workspaceId);
    const res = await apiClient.get<{ file: WorkspaceFileMeta }>(`/api/workspace/file?${params.toString()}`);
    return res.file;
  },

  async writeFile(
    filePath: string,
    content: string,
    workspaceId?: string,
    actor: MutationActor = 'USER'
  ): Promise<WorkspaceFileMeta> {
    const res = await apiClient.put<{ success: boolean; file: WorkspaceFileMeta }>('/api/workspace/file', {
      path: filePath,
      content,
      workspaceId,
      actor
    });
    return res.file;
  },

  async deleteFile(filePath: string, workspaceId?: string): Promise<{ success: boolean; path: string }> {
    const params = new URLSearchParams({ path: filePath });
    if (workspaceId) params.append('workspaceId', workspaceId);
    return apiClient.request<{ success: boolean; path: string }>(`/api/workspace/file?${params.toString()}`, {
      method: 'DELETE'
    });
  },

  async renameFile(
    oldPath: string,
    newPath: string,
    workspaceId?: string
  ): Promise<{ success: boolean; file: WorkspaceFileMeta }> {
    return apiClient.post('/api/workspace/file/rename', {
      oldPath,
      newPath,
      workspaceId
    });
  },

  async createDirectory(
    dirPath: string,
    workspaceId?: string
  ): Promise<{ success: boolean; path: string }> {
    return apiClient.post('/api/workspace/directory', {
      path: dirPath,
      workspaceId
    });
  },

  async deleteDirectory(
    dirPath: string,
    workspaceId?: string
  ): Promise<{ success: boolean; path: string }> {
    const params = new URLSearchParams({ path: dirPath });
    if (workspaceId) params.append('workspaceId', workspaceId);
    return apiClient.request<{ success: boolean; path: string }>(`/api/workspace/directory?${params.toString()}`, {
      method: 'DELETE'
    });
  },

  async runCommand(
    command: string,
    options: { cwd?: string; timeoutMs?: number; workspaceId?: string; input?: string; sessionId?: string; signal?: AbortSignal } = {}
  ): Promise<CommandExecutionResult> {
    return apiClient.post('/api/workspace/command', {
      command,
      cwd: options.cwd,
      timeoutMs: options.timeoutMs,
      workspaceId: options.workspaceId,
      input: options.input,
      sessionId: options.sessionId
    }, { signal: options.signal });
  },

  async runCommandStream(
    command: string,
    options: {
      cwd?: string;
      timeoutMs?: number;
      workspaceId?: string;
      sessionId?: string;
      input?: string;
      signal?: AbortSignal;
      onStdout?: (chunk: string) => void;
      onStderr?: (chunk: string) => void;
    } = {}
  ): Promise<CommandExecutionResult> {
    const response = await apiClient.stream('/api/workspace/command/stream', {
      command,
      cwd: options.cwd,
      timeoutMs: options.timeoutMs,
      workspaceId: options.workspaceId,
      sessionId: options.sessionId,
      input: options.input
    }, { signal: options.signal });

    if (!response.body) {
      throw new Error('Readable stream not supported or empty body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result: CommandExecutionResult = {
      exitCode: 0,
      stdout: '',
      stderr: '',
      durationMs: 0
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        if (!block.trim()) continue;
        let eventType = 'message';
        let dataStr = '';

        const eventLines = block.split('\n');
        for (const line of eventLines) {
          if (line.startsWith('event: ')) {
            eventType = line.substring(7).trim();
          } else if (line.startsWith('data: ')) {
            dataStr = line.substring(6).trim();
          }
        }

        if (!dataStr) continue;

        try {
          const parsed = JSON.parse(dataStr);
          if (eventType === 'stdout') {
            options.onStdout?.(parsed.chunk);
            result.stdout += parsed.chunk;
          } else if (eventType === 'stderr') {
            options.onStderr?.(parsed.chunk);
            result.stderr += parsed.chunk;
          } else if (eventType === 'exit') {
            result = parsed;
          }
        } catch {
          // ignore parse defect
        }
      }
    }

    return result;
  },

  async sendCommandInput(sessionId: string, input: string): Promise<boolean> {
    try {
      const res = await apiClient.post<{ success: boolean }>('/api/workspace/command/input', {
        sessionId,
        input
      });
      return res.success;
    } catch {
      return false;
    }
  },

  async abortCommand(sessionId: string): Promise<boolean> {
    try {
      const res = await apiClient.post<{ success: boolean }>('/api/workspace/command/abort', {
        sessionId
      });
      return res.success;
    } catch {
      return false;
    }
  },

  async executePlan(
    planningResult: GoalPlanningResult,
    approval: PlanExecutionApproval,
    workspaceId?: string,
    apiKey?: string,
    model?: string
  ): Promise<{ success: boolean; summary: PlanExecutionSummary; diagnosis?: unknown }> {
    const activeModel = model || storageService.getItem("devengine_last_model") || undefined;
    return apiClient.post('/api/workspace/execute', {
      planningResult,
      approval,
      workspaceId,
      apiKey,
      model: activeModel
    });
  },

  async stopExecution(executionId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/api/workspace/stop', { executionId });
  },

  async getExecution(executionId: string): Promise<{ executionId: string; summary: unknown; events: PlanExecutionProgressEvent[] }> {
    return apiClient.get(`/api/workspace/execution/${encodeURIComponent(executionId)}`);
  },

  async getAuditLogs(workspaceId?: string, filePath?: string): Promise<FileProvenanceRecord[]> {
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspaceId', workspaceId);
    if (filePath) params.append('path', filePath);
    const res = await apiClient.get<{ logs: FileProvenanceRecord[] }>(`/api/workspace/audit?${params.toString()}`);
    return res.logs;
  },

  subscribeToExecutionEvents(
    executionId: string,
    onEvent: (event: PlanExecutionProgressEvent) => void,
    onError?: (error: Error) => void
  ): () => void {
    const token = storageService.getSessionToken();
    const url = `/api/workspace/events/${encodeURIComponent(executionId)}`;
    
    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as PlanExecutionProgressEvent;
        onEvent(data);
      } catch (err: any) {
        console.error('Failed to parse SSE event', err);
      }
    };

    eventSource.onerror = (e) => {
      console.warn('SSE stream error or closed', e);
      if (onError) {
        onError(new Error('SSE stream disconnected'));
      }
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }
};
