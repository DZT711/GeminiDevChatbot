import { ExecutionContext } from './ExecutionContext';
import { ExecutionResult } from './ExecutionResult';

/**
 * Represents the execution lifecycle management operations.
 */
export interface ExecutionLifecycle {
  createExecution(taskId?: string): ExecutionContext;
  startExecution(executionId: string): Promise<void>;
  pauseExecution(executionId: string, reason?: string): Promise<void>;
  resumeExecution(executionId: string): Promise<void>;
  cancelExecution(executionId: string, reason?: string): Promise<void>;
  completeExecution(executionId: string): Promise<ExecutionResult>;
  rollbackExecution(executionId: string, checkpointReference: string): Promise<void>;
}
