import { ExecutionContext, createInitialContext } from './ExecutionContext';
import { ExecutionState, VALID_TRANSITIONS, InvalidStateTransitionError } from './ExecutionState';
import { ExecutionResult } from './ExecutionResult';
import { RuntimeEvent, RuntimeEventType } from './RuntimeEvents';
import { ExecutionLifecycle } from './ExecutionLifecycle';

export type EventHandler = (event: RuntimeEvent) => void;

export class AgentRuntime implements ExecutionLifecycle {
  private activeContexts: Map<string, ExecutionContext> = new Map();
  private eventHandlers: Set<EventHandler> = new Set();

  public subscribe(handler: EventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emit(event: RuntimeEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in runtime event handler', error);
      }
    }
  }

  private transitionState(context: ExecutionContext, newState: ExecutionState): void {
    const validNextStates = VALID_TRANSITIONS[context.currentStateReference];
    if (!validNextStates.includes(newState)) {
      throw new InvalidStateTransitionError(context.currentStateReference, newState);
    }
    context.currentStateReference = newState;
    context.updatedTime = Date.now();
  }

  public getContext(executionId: string): ExecutionContext {
    const context = this.activeContexts.get(executionId);
    if (!context) {
      throw new Error(`Execution context not found for ID: ${executionId}`);
    }
    return context;
  }

  public createExecution(taskId?: string): ExecutionContext {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const context = createInitialContext(executionId, taskId);
    this.activeContexts.set(executionId, context);
    return context;
  }

  public async startExecution(executionId: string): Promise<void> {
    const context = this.getContext(executionId);
    
    if (context.currentStateReference === ExecutionState.IDLE) {
       this.transitionState(context, ExecutionState.READY);
    }
    this.transitionState(context, ExecutionState.RUNNING);

    this.emit({
      type: RuntimeEventType.EXECUTION_STARTED,
      timestamp: Date.now(),
      executionId,
      context
    });
  }

  public async pauseExecution(executionId: string, reason?: string): Promise<void> {
    const context = this.getContext(executionId);
    this.transitionState(context, ExecutionState.PAUSED);

    this.emit({
      type: RuntimeEventType.EXECUTION_PAUSED,
      timestamp: Date.now(),
      executionId,
      reason
    });
  }

  public async resumeExecution(executionId: string): Promise<void> {
    const context = this.getContext(executionId);
    this.transitionState(context, ExecutionState.RUNNING);

    this.emit({
      type: RuntimeEventType.EXECUTION_RESUMED,
      timestamp: Date.now(),
      executionId
    });
  }

  public async cancelExecution(executionId: string, reason?: string): Promise<void> {
    const context = this.getContext(executionId);
    this.transitionState(context, ExecutionState.CANCELLED);

    this.emit({
      type: RuntimeEventType.EXECUTION_CANCELLED,
      timestamp: Date.now(),
      executionId,
      reason
    });
  }

  public async completeExecution(executionId: string): Promise<ExecutionResult> {
    const context = this.getContext(executionId);
    this.transitionState(context, ExecutionState.COMPLETED);

    this.emit({
      type: RuntimeEventType.EXECUTION_COMPLETED,
      timestamp: Date.now(),
      executionId
    });

    return {
      executionId,
      success: true,
      finalState: context.currentStateReference,
      completedAt: Date.now()
    };
  }
  
  public async failExecution(executionId: string, error: Error): Promise<void> {
    const context = this.getContext(executionId);
    this.transitionState(context, ExecutionState.FAILED);

    this.emit({
      type: RuntimeEventType.EXECUTION_FAILED,
      timestamp: Date.now(),
      executionId,
      error
    });
  }

  public async rollbackExecution(executionId: string, checkpointReference: string): Promise<void> {
    const context = this.getContext(executionId);
    this.transitionState(context, ExecutionState.ROLLED_BACK);
    context.checkpointId = checkpointReference;

    this.emit({
      type: RuntimeEventType.EXECUTION_ROLLED_BACK,
      timestamp: Date.now(),
      executionId,
      checkpointReference
    });
  }
}
