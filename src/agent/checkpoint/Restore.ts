import { ExecutionContext } from '../runtime/ExecutionContext';
import { ExecutionSnapshot } from '../runtime/ExecutionSnapshot';

export interface RestoreStrategy {
  restore(context: ExecutionContext, snapshot: ExecutionSnapshot): void;
}

export class DefaultRestoreStrategy implements RestoreStrategy {
  public restore(context: ExecutionContext, snapshot: ExecutionSnapshot): void {
    context.taskId = snapshot.taskId;
    context.parentTaskId = snapshot.parentTaskId;
    context.workspaceId = snapshot.workspaceId;
    context.currentStep = snapshot.currentStep;
    context.currentStateReference = snapshot.currentStateReference;
    
    context.temporaryVariables = structuredClone(snapshot.temporaryVariables);
    context.environmentVariables = structuredClone(snapshot.environmentVariables);
    
    context.artifacts = structuredClone(snapshot.artifacts);
    context.outputs = structuredClone(snapshot.outputs);
    
    context.warnings = structuredClone(snapshot.warnings) as string[];
    context.errors = structuredClone(snapshot.errors) as string[];
    
    context.metadata = structuredClone(snapshot.metadata);
    context.environment = structuredClone(snapshot.environment);
    context.scope = structuredClone(snapshot.scope);
    
    context.checkpointId = snapshot.checkpointId;
    
    context.startedTime = snapshot.startedTime;
    context.updatedTime = Date.now();
    context.customTags = structuredClone(snapshot.customTags) as string[];
  }
}
