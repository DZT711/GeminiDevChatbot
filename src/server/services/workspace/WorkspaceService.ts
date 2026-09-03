import { EventEmitter } from 'events';
import {
  Workspace,
  WorkspaceProvider,
  WorkspaceFile,
  WorkspaceDirectoryListing,
  WorkspaceRef,
  CommandResult,
  WorkspacePathError
} from '../../../agent/workspace/index.js';
import { E2BWorkspaceProvider } from '../../workspace/E2BWorkspaceProvider.js';
import {
  PlanExecutionService,
  PlanExecutionOptions,
  PlanExecutionSummary,
  PlanExecutionProgressEvent
} from '../agentIntegration/planning/PlanExecutionService.js';

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

export interface FileWithMeta {
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

export class WorkspaceService {
  private workspaceProvider: WorkspaceProvider;
  private planExecutionService: PlanExecutionService;
  private userActiveWorkspaces: Map<string, string> = new Map(); // userId -> workspaceId
  private workspaceStatuses: Map<string, WorkspaceStatus> = new Map(); // workspaceId -> status
  private workspaceActiveExecution: Map<string, string> = new Map(); // workspaceId -> executionId
  private provenanceLogs: Map<string, FileProvenanceRecord[]> = new Map(); // workspaceId -> records
  private executionSummaries: Map<string, PlanExecutionSummary> = new Map(); // executionId -> summary
  private executionEvents: Map<string, PlanExecutionProgressEvent[]> = new Map(); // executionId -> events
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor(workspaceProvider?: WorkspaceProvider) {
    this.workspaceProvider = workspaceProvider || new E2BWorkspaceProvider();
    this.planExecutionService = new PlanExecutionService(this.workspaceProvider);
  }

  public getWorkspaceProvider(): WorkspaceProvider {
    return this.workspaceProvider;
  }

  public getPlanExecutionService(): PlanExecutionService {
    return this.planExecutionService;
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
      case 'mjs':
      case 'cjs':
        return 'javascript';
      case 'json':
        return 'json';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'py':
        return 'python';
      case 'sh':
      case 'bash':
        return 'bash';
      case 'sql':
        return 'sql';
      case 'yml':
      case 'yaml':
        return 'yaml';
      case 'svg':
        return 'svg';
      case 'xml':
        return 'xml';
      default:
        return 'plaintext';
    }
  }

  /**
   * Resolves or initializes default workspace for user
   */
  public async resolveUserWorkspace(userId: string, workspaceId?: string): Promise<Workspace> {
    const targetId = workspaceId || this.userActiveWorkspaces.get(userId) || `ws_user_${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    
    if (!this.workspaceStatuses.has(targetId)) {
      this.workspaceStatuses.set(targetId, 'READY');
    }

    const workspace = await this.workspaceProvider.getOrCreateWorkspace(targetId, {
      id: targetId,
      name: `Workspace ${targetId}`,
      workingDirectory: '/workspace'
    });

    this.userActiveWorkspaces.set(userId, targetId);
    return workspace;
  }

  public async getActiveWorkspaceSummary(userId: string, requestedId?: string): Promise<WorkspaceSummary> {
    const workspace = await this.resolveUserWorkspace(userId, requestedId);
    const ref = workspace.getRef();
    const status = this.workspaceStatuses.get(workspace.getId()) || 'READY';
    const activeExecutionId = this.workspaceActiveExecution.get(workspace.getId());

    let filesCount = 0;
    try {
      const listing = await workspace.listDir('');
      filesCount = listing.total || listing.entries.length;
    } catch {
      filesCount = 0;
    }

    return {
      id: ref.id,
      name: ref.name || `Workspace-${ref.id}`,
      provider: (ref.metadata?.provider as string) || 'sandbox',
      status,
      workingDirectory: workspace.getWorkingDirectory(),
      activeExecutionId,
      createdAt: ref.createdAt || Date.now(),
      lastActivityAt: Date.now(),
      filesCount
    };
  }

  public async listUserWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
    const activeWs = await this.getActiveWorkspaceSummary(userId);
    return [activeWs];
  }

  public async listFiles(userId: string, workspaceId?: string, dirPath?: string): Promise<WorkspaceDirectoryListing> {
    const workspace = await this.resolveUserWorkspace(userId, workspaceId);
    return workspace.listDir(dirPath);
  }

  public async readFile(userId: string, workspaceId?: string, filePath?: string): Promise<FileWithMeta> {
    if (!filePath) {
      throw new WorkspacePathError('File path is required to read file', '');
    }
    const workspace = await this.resolveUserWorkspace(userId, workspaceId);
    const file = await workspace.readFile(filePath);
    const wsId = workspace.getId();
    
    const logs = this.provenanceLogs.get(wsId) || [];
    const fileLogs = logs.filter(l => l.path === file.path || l.path.endsWith(file.path) || file.path.endsWith(l.path));
    const lastRecord = fileLogs[fileLogs.length - 1];

    const fileName = file.path.split('/').pop() || file.path;

    return {
      path: file.path,
      name: fileName,
      content: file.content,
      size: file.size || file.content.length,
      language: this.detectLanguage(file.path),
      modifiedAt: file.modifiedAt || Date.now(),
      lastActor: lastRecord ? lastRecord.actor : 'USER',
      lastTaskId: lastRecord?.taskId,
      lastExecutionId: lastRecord?.executionId,
      history: fileLogs
    };
  }

  public async writeFile(
    userId: string,
    workspaceId: string | undefined,
    filePath: string,
    content: string,
    actor: MutationActor = 'USER',
    meta: { taskId?: string; executionId?: string } = {}
  ): Promise<FileWithMeta> {
    if (!filePath || filePath.trim() === '') {
      throw new WorkspacePathError('File path cannot be empty', '');
    }
    const workspace = await this.resolveUserWorkspace(userId, workspaceId);
    const wsId = workspace.getId();

    let previousContent = '';
    let isCreate = true;
    try {
      const existing = await workspace.readFile(filePath);
      previousContent = existing.content;
      isCreate = false;
    } catch {
      isCreate = true;
    }

    await workspace.writeFile(filePath, content);
    const savedFile = await workspace.readFile(filePath);

    // Record Provenance
    const record: FileProvenanceRecord = {
      id: `prov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId: wsId,
      path: savedFile.path,
      action: isCreate ? 'create' : 'edit',
      actor,
      taskId: meta.taskId,
      executionId: meta.executionId,
      timestamp: Date.now(),
      previousContent,
      newContent: content
    };

    if (!this.provenanceLogs.has(wsId)) {
      this.provenanceLogs.set(wsId, []);
    }
    this.provenanceLogs.get(wsId)!.push(record);

    const fileName = savedFile.path.split('/').pop() || savedFile.path;

    return {
      path: savedFile.path,
      name: fileName,
      content: savedFile.content,
      size: savedFile.size || savedFile.content.length,
      language: this.detectLanguage(savedFile.path),
      modifiedAt: savedFile.modifiedAt || Date.now(),
      lastActor: actor,
      lastTaskId: meta.taskId,
      lastExecutionId: meta.executionId,
      history: (this.provenanceLogs.get(wsId) || []).filter(l => l.path === savedFile.path)
    };
  }

  public async deleteFile(
    userId: string,
    workspaceId: string | undefined,
    filePath: string,
    actor: MutationActor = 'USER'
  ): Promise<{ success: boolean; path: string }> {
    if (!filePath || filePath === '/' || filePath === '.') {
      throw new WorkspacePathError('Cannot delete workspace root directory', filePath);
    }
    const workspace = await this.resolveUserWorkspace(userId, workspaceId);
    const wsId = workspace.getId();

    let previousContent = '';
    try {
      const existing = await workspace.readFile(filePath);
      previousContent = existing.content;
    } catch {
      // ignore
    }

    await workspace.deleteFile(filePath);

    const record: FileProvenanceRecord = {
      id: `prov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId: wsId,
      path: filePath,
      action: 'delete',
      actor,
      timestamp: Date.now(),
      previousContent
    };

    if (!this.provenanceLogs.has(wsId)) {
      this.provenanceLogs.set(wsId, []);
    }
    this.provenanceLogs.get(wsId)!.push(record);

    return { success: true, path: filePath };
  }

  public async renameFile(
    userId: string,
    workspaceId: string | undefined,
    oldPath: string,
    newPath: string,
    actor: MutationActor = 'USER'
  ): Promise<FileWithMeta> {
    if (!oldPath || !newPath) {
      throw new WorkspacePathError('Both old and new paths are required for renaming', '');
    }
    const workspace = await this.resolveUserWorkspace(userId, workspaceId);
    const wsId = workspace.getId();

    const existing = await workspace.readFile(oldPath);
    const content = existing.content;

    // Write new file
    await workspace.writeFile(newPath, content);
    // Delete old file
    await workspace.deleteFile(oldPath);

    const savedFile = await workspace.readFile(newPath);

    const record: FileProvenanceRecord = {
      id: `prov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId: wsId,
      path: newPath,
      action: 'edit',
      actor,
      timestamp: Date.now(),
      previousContent: `[Renamed from ${oldPath}]`,
      newContent: content
    };

    if (!this.provenanceLogs.has(wsId)) {
      this.provenanceLogs.set(wsId, []);
    }
    this.provenanceLogs.get(wsId)!.push(record);

    const fileName = savedFile.path.split('/').pop() || savedFile.path;

    return {
      path: savedFile.path,
      name: fileName,
      content: savedFile.content,
      size: savedFile.size || savedFile.content.length,
      language: this.detectLanguage(savedFile.path),
      modifiedAt: savedFile.modifiedAt || Date.now(),
      lastActor: actor,
      history: (this.provenanceLogs.get(wsId) || []).filter((l) => l.path === savedFile.path)
    };
  }

  public async createDirectory(
    userId: string,
    workspaceId: string | undefined,
    dirPath: string,
    actor: MutationActor = 'USER'
  ): Promise<{ success: boolean; path: string }> {
    if (!dirPath || dirPath === '/' || dirPath === '.') {
      throw new WorkspacePathError('Valid directory path is required', dirPath);
    }
    const workspace = await this.resolveUserWorkspace(userId, workspaceId);
    const wsId = workspace.getId();

    if (workspace.makeDir) {
      await workspace.makeDir(dirPath);
    }

    const record: FileProvenanceRecord = {
      id: `prov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId: wsId,
      path: dirPath,
      action: 'create',
      actor,
      timestamp: Date.now(),
      newContent: '[Directory Created]'
    };

    if (!this.provenanceLogs.has(wsId)) {
      this.provenanceLogs.set(wsId, []);
    }
    this.provenanceLogs.get(wsId)!.push(record);

    return { success: true, path: dirPath };
  }

  public async deleteDirectory(
    userId: string,
    workspaceId: string | undefined,
    dirPath: string,
    actor: MutationActor = 'USER'
  ): Promise<{ success: boolean; path: string }> {
    if (!dirPath || dirPath === '/' || dirPath === '.') {
      throw new WorkspacePathError('Cannot delete root directory', dirPath);
    }
    const workspace = await this.resolveUserWorkspace(userId, workspaceId);
    const wsId = workspace.getId();

    if (workspace.deleteDir) {
      await workspace.deleteDir(dirPath, true);
    }

    const record: FileProvenanceRecord = {
      id: `prov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workspaceId: wsId,
      path: dirPath,
      action: 'delete',
      actor,
      timestamp: Date.now(),
      previousContent: '[Directory Deleted]'
    };

    if (!this.provenanceLogs.has(wsId)) {
      this.provenanceLogs.set(wsId, []);
    }
    this.provenanceLogs.get(wsId)!.push(record);

    return { success: true, path: dirPath };
  }

  public async runCommand(
    userId: string,
    workspaceId: string | undefined,
    command: string,
    options: { cwd?: string; timeoutMs?: number } = {}
  ): Promise<CommandResult> {
    if (!command || command.trim() === '') {
      throw new Error('Command cannot be empty');
    }
    const workspace = await this.resolveUserWorkspace(userId, workspaceId);
    return workspace.runCommand(command, options);
  }

  public async executePlan(
    userId: string,
    options: PlanExecutionOptions
  ): Promise<PlanExecutionSummary> {
    const workspace = await this.resolveUserWorkspace(userId, options.workspaceId);
    const wsId = workspace.getId();

    this.workspaceStatuses.set(wsId, 'RUNNING');

    const handleProgress = (event: PlanExecutionProgressEvent) => {
      this.workspaceActiveExecution.set(wsId, event.executionId);
      
      if (!this.executionEvents.has(event.executionId)) {
        this.executionEvents.set(event.executionId, []);
      }
      this.executionEvents.get(event.executionId)!.push(event);
      this.eventEmitter.emit(`exec_event:${event.executionId}`, event);
      this.eventEmitter.emit(`ws_event:${wsId}`, event);

      if (options.onProgress) {
        options.onProgress(event);
      }
    };

    const handleFileChanged = (change: {
      path: string;
      action: 'create' | 'edit' | 'delete';
      actor: 'AGENT';
      taskId?: string;
      executionId?: string;
      timestamp: number;
    }) => {
      const record: FileProvenanceRecord = {
        id: `prov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        workspaceId: wsId,
        path: change.path,
        action: change.action,
        actor: 'AGENT',
        taskId: change.taskId,
        executionId: change.executionId,
        timestamp: change.timestamp
      };

      if (!this.provenanceLogs.has(wsId)) {
        this.provenanceLogs.set(wsId, []);
      }
      this.provenanceLogs.get(wsId)!.push(record);
      this.eventEmitter.emit(`file_changed:${wsId}`, record);

      if (options.onFileChanged) {
        options.onFileChanged(change);
      }
    };

    try {
      const summary = await this.planExecutionService.executePlan({
        ...options,
        userId,
        workspaceId: wsId,
        workspaceProvider: this.workspaceProvider,
        onProgress: handleProgress,
        onFileChanged: handleFileChanged
      });

      this.executionSummaries.set(summary.executionId, summary);
      this.workspaceStatuses.set(wsId, summary.success ? 'READY' : 'STOPPED');
      this.workspaceActiveExecution.delete(wsId);

      return summary;
    } catch (err: unknown) {
      this.workspaceStatuses.set(wsId, 'ERROR');
      this.workspaceActiveExecution.delete(wsId);
      throw err;
    }
  }

  public stopExecution(userId: string, executionId: string): boolean {
    const stopped = this.planExecutionService.stopExecution(executionId);
    if (stopped) {
      for (const [wsId, activeExecId] of this.workspaceActiveExecution.entries()) {
        if (activeExecId === executionId) {
          this.workspaceStatuses.set(wsId, 'STOPPED');
          this.workspaceActiveExecution.delete(wsId);
        }
      }
    }
    return stopped;
  }

  public getExecutionSummary(executionId: string): PlanExecutionSummary | undefined {
    return this.executionSummaries.get(executionId);
  }

  public getExecutionEvents(executionId: string): PlanExecutionProgressEvent[] {
    return this.executionEvents.get(executionId) || [];
  }

  public subscribeExecutionEvents(
    executionId: string,
    handler: (event: PlanExecutionProgressEvent) => void
  ): () => void {
    const eventName = `exec_event:${executionId}`;
    this.eventEmitter.on(eventName, handler);
    return () => {
      this.eventEmitter.off(eventName, handler);
    };
  }

  public getFileAuditLog(workspaceId: string, filePath?: string): FileProvenanceRecord[] {
    const logs = this.provenanceLogs.get(workspaceId) || [];
    if (!filePath) {
      return logs;
    }
    return logs.filter(l => l.path === filePath || l.path.endsWith(filePath) || filePath.endsWith(l.path));
  }
}

// Global Singleton Instance
export const globalWorkspaceService = new WorkspaceService();
