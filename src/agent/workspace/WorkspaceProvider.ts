/**
 * Purpose: Provider-agnostic workspace factory and lifecycle manager interface.
 * STRICT ARCHITECTURAL RULE: No third-party sandbox SDK imports or vendor types allowed here.
 */
import { Workspace } from './Workspace';
import { WorkspaceCreateRequest } from './WorkspaceTypes';

export interface WorkspaceProvider {
  /**
   * Creates a new isolated workspace session.
   */
  createWorkspace(request?: WorkspaceCreateRequest): Promise<Workspace>;

  /**
   * Retrieves an existing workspace by its identifier.
   */
  getWorkspace(id: string): Promise<Workspace | null>;

  /**
   * Retrieves an existing workspace or creates one if it doesn't already exist.
   */
  getOrCreateWorkspace(id: string, request?: WorkspaceCreateRequest): Promise<Workspace>;

  /**
   * Destroys and cleans up resources for a workspace session.
   */
  destroyWorkspace(id: string): Promise<void>;
}
