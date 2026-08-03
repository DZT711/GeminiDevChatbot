import { ExecutionState } from './ExecutionState';
import { ExecutionVariable } from './ExecutionVariable';
import { ExecutionArtifact } from './ExecutionArtifact';
import { ExecutionSnapshot } from './ExecutionSnapshot';

export interface ExecutionMetadata {
  [key: string]: unknown;
}

export interface ExecutionEnvironment {
  os?: string;
  runtime?: string;
  version?: string;
  [key: string]: unknown;
}

export interface ExecutionScope {
  permissions: string[];
  allowedTools: string[];
  maxSteps?: number;
  timeoutMs?: number;
}

export interface ExecutionContext {
  executionId: string;
  taskId?: string;
  parentTaskId?: string;
  workspaceId?: string;
  
  currentStep?: string;
  currentStateReference: ExecutionState;
  
  temporaryVariables: Record<string, ExecutionVariable>;
  environmentVariables: Record<string, string>;
  
  artifacts: Record<string, ExecutionArtifact>;
  outputs: Record<string, unknown>;
  
  warnings: string[];
  errors: string[];
  
  metadata: ExecutionMetadata;
  environment: ExecutionEnvironment;
  scope: ExecutionScope;
  
  checkpointId?: string;
  
  startedTime: number;
  updatedTime: number;
  customTags: string[];

  createSnapshot(): ExecutionSnapshot;
}

export function createInitialContext(
  executionId: string, 
  taskId?: string, 
  options?: Partial<ExecutionContext>
): ExecutionContext {
  return {
    executionId,
    taskId,
    currentStateReference: ExecutionState.IDLE,
    
    temporaryVariables: {},
    environmentVariables: {},
    
    artifacts: {},
    outputs: {},
    
    warnings: [],
    errors: [],
    
    metadata: {},
    environment: {},
    scope: { permissions: [], allowedTools: [] },
    
    startedTime: Date.now(),
    updatedTime: Date.now(),
    customTags: [],
    ...options,
    createSnapshot: function(this: ExecutionContext): ExecutionSnapshot {
      return {
        executionId: this.executionId,
        taskId: this.taskId,
        parentTaskId: this.parentTaskId,
        workspaceId: this.workspaceId,
        
        currentStep: this.currentStep,
        currentStateReference: this.currentStateReference,
        
        temporaryVariables: structuredClone(this.temporaryVariables),
        environmentVariables: structuredClone(this.environmentVariables),
        
        artifacts: structuredClone(this.artifacts),
        outputs: structuredClone(this.outputs),
        
        warnings: structuredClone(this.warnings),
        errors: structuredClone(this.errors),
        
        metadata: structuredClone(this.metadata),
        environment: structuredClone(this.environment),
        scope: structuredClone(this.scope),
        
        checkpointId: this.checkpointId,
        
        startedTime: this.startedTime,
        updatedTime: this.updatedTime,
        customTags: structuredClone(this.customTags),
        
        snapshotTimestamp: Date.now()
      };
    }
  };
}
