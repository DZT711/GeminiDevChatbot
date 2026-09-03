/**
 * Purpose: In-memory WorkspaceProvider factory for test environments and Planning Lab isolation.
 * STRICT ARCHITECTURAL RULE: Zero external sandbox dependencies.
 */
import { Workspace } from './Workspace';
import { WorkspaceProvider } from './WorkspaceProvider';
import { WorkspaceCreateRequest } from './WorkspaceTypes';
import { InMemoryWorkspace } from './InMemoryWorkspace';

export class InMemoryWorkspaceProvider implements WorkspaceProvider {
  private workspaces: Map<string, Workspace> = new Map();

  public async createWorkspace(request?: WorkspaceCreateRequest): Promise<Workspace> {
    const id = request?.id || `ws_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const workspace = new InMemoryWorkspace(
      id,
      request?.workingDirectory || '/workspace',
      request?.initialFiles || []
    );
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
      if (ws.cleanup) {
        await ws.cleanup();
      }
      this.workspaces.delete(id);
    }
  }

  public clear(): void {
    this.workspaces.clear();
  }
}
