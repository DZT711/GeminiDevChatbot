/**
 * Represents the distinct states of an agent execution lifecycle.
 */
export enum ExecutionState {
  IDLE = 'IDLE',
  PLANNING = 'PLANNING',
  READY = 'READY',
  RUNNING = 'RUNNING',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK'
}

/**
 * Defines valid state transitions for the robust state machine.
 */
export const VALID_TRANSITIONS: Record<ExecutionState, ExecutionState[]> = {
  [ExecutionState.IDLE]: [ExecutionState.PLANNING, ExecutionState.READY, ExecutionState.CANCELLED],
  [ExecutionState.PLANNING]: [ExecutionState.READY, ExecutionState.FAILED, ExecutionState.CANCELLED],
  [ExecutionState.READY]: [ExecutionState.RUNNING, ExecutionState.CANCELLED],
  [ExecutionState.RUNNING]: [ExecutionState.WAITING_APPROVAL, ExecutionState.PAUSED, ExecutionState.COMPLETED, ExecutionState.FAILED, ExecutionState.CANCELLED],
  [ExecutionState.WAITING_APPROVAL]: [ExecutionState.RUNNING, ExecutionState.CANCELLED],
  [ExecutionState.PAUSED]: [ExecutionState.RUNNING, ExecutionState.CANCELLED, ExecutionState.ROLLED_BACK],
  [ExecutionState.COMPLETED]: [],
  [ExecutionState.CANCELLED]: [ExecutionState.ROLLED_BACK],
  [ExecutionState.FAILED]: [ExecutionState.ROLLED_BACK],
  [ExecutionState.ROLLED_BACK]: []
};

export class InvalidStateTransitionError extends Error {
  constructor(from: ExecutionState, to: ExecutionState) {
    super(`Invalid state transition from ${from} to ${to}`);
    this.name = 'InvalidStateTransitionError';
  }
}
