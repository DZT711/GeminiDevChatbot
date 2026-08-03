import { ExecutionState } from './ExecutionState';
import { ExecutionVariable } from './ExecutionVariable';
import { ExecutionArtifact } from './ExecutionArtifact';
import type { ExecutionMetadata, ExecutionEnvironment, ExecutionScope } from './ExecutionContext';

export interface ExecutionSnapshot {
  readonly executionId: string;
  readonly taskId?: string;
  readonly parentTaskId?: string;
  readonly workspaceId?: string;
  
  readonly currentStep?: string;
  readonly currentStateReference: ExecutionState;
  
  readonly temporaryVariables: Record<string, ExecutionVariable>;
  readonly environmentVariables: Record<string, string>;
  
  readonly artifacts: Record<string, ExecutionArtifact>;
  readonly outputs: Record<string, unknown>;
  
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  
  readonly metadata: ExecutionMetadata;
  readonly environment: ExecutionEnvironment;
  readonly scope: ExecutionScope;
  
  readonly checkpointId?: string;
  
  readonly startedTime: number;
  readonly updatedTime: number;
  readonly customTags: readonly string[];
  
  readonly snapshotTimestamp: number;
}
