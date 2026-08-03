import { ExecutionState } from './ExecutionState';

export interface ExecutionResult {
  executionId: string;
  success: boolean;
  finalState: ExecutionState;
  completedAt: number;
  message?: string;
  error?: Error;
}
