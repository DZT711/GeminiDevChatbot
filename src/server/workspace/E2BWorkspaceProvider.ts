/**
 * Purpose: Production WorkspaceProvider implementing E2B Sandbox management.
 * STRICT ARCHITECTURAL RULE: Located outside Agent Core (src/agent/).
 */
import {
  Workspace,
  WorkspaceProvider,
  WorkspaceCreateRequest
} from '../../agent/workspace/index.js';
import { E2BWorkspace } from './E2BWorkspace.js';

export class E2BWorkspaceProvider implements WorkspaceProvider {
  private workspaces: Map<string, E2BWorkspace> = new Map();
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.E2B_API_KEY;
  }

  public async createWorkspace(request?: WorkspaceCreateRequest): Promise<Workspace> {
    const id = request?.id || `e2b_ws_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const workspace = new E2BWorkspace(id, {
      apiKey: this.apiKey,
      workingDirectory: request?.workingDirectory || '/home/user',
      timeoutMs: request?.timeoutMs || 120000,
      initialFiles: request?.initialFiles || []
    });

    this.workspaces.set(id, workspace);
    return workspace;
  }

  public async getWorkspace(id: string): Promise<Workspace | null> {
    return this.workspaces.get(id) || null;
  }

  public async getOrCreateWorkspace(id: string, request?: WorkspaceCreateRequest): Promise<Workspace> {
    const existing = this.workspaces.get(id);
    if (existing) {
      return existing;
    }
    return this.createWorkspace({ ...request, id });
  }

  public async destroyWorkspace(id: string): Promise<void> {
    const ws = this.workspaces.get(id);
    if (ws) {
      await ws.cleanup();
      this.workspaces.delete(id);
    }
  }

  public clear(): void {
    this.workspaces.clear();
  }
}
