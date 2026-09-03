/**
 * Purpose: Represents the agent's active operating environment.
 * Provider-agnostic interface for workspace operations in Agent Core.
 */
import { WorkspaceFile } from './WorkspaceFile';
import { WorkspaceState } from './WorkspaceState';
import {
  WorkspaceRef,
  WorkspaceDirectoryListing,
  WorkspaceEdit,
  RunCommandOptions,
  CommandResult
} from './WorkspaceTypes';

export interface Workspace {
  id: string;
  state?: WorkspaceState;
  
  getId(): string;
  getRef(): WorkspaceRef;
  getWorkingDirectory(): string;

  listDir(path?: string): Promise<WorkspaceDirectoryListing>;
  makeDir?(path: string): Promise<void>;
  deleteDir?(path: string, recursive?: boolean): Promise<void>;
  readFile(path: string): Promise<WorkspaceFile>;
  writeFile(path: string, content: string): Promise<void>;
  editFile(path: string, edit: WorkspaceEdit): Promise<void>;
  deleteFile(path: string): Promise<void>;
  runCommand(command: string, options?: RunCommandOptions): Promise<CommandResult>;
  executeCode?(code: string, language: string): Promise<CommandResult>;
  
  listFiles?(): Promise<WorkspaceFile[]>;
  cleanup?(): Promise<void>;
}

