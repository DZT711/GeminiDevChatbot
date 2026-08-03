/**
 * Purpose: Represents the agent's active operating environment.
 */
import { WorkspaceFile } from './WorkspaceFile';
import { WorkspaceState } from './WorkspaceState';

export interface Workspace {
  id: string;
  state: WorkspaceState;
  listFiles(): Promise<WorkspaceFile[]>;
}
