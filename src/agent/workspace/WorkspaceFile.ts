/**
 * Purpose: Represents a file within the workspace.
 */
export interface WorkspaceFile {
  path: string;
  content: string; // Or a stream/buffer representation
}
