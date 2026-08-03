import { ExecutionContext } from './ExecutionContext';

export enum RuntimeEventType {
  EXECUTION_STARTED = 'EXECUTION_STARTED',
  EXECUTION_PAUSED = 'EXECUTION_PAUSED',
  EXECUTION_RESUMED = 'EXECUTION_RESUMED',
  EXECUTION_COMPLETED = 'EXECUTION_COMPLETED',
  EXECUTION_CANCELLED = 'EXECUTION_CANCELLED',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  EXECUTION_ROLLED_BACK = 'EXECUTION_ROLLED_BACK',
  CHECKPOINT_CREATED = 'CHECKPOINT_CREATED',
  CHECKPOINT_RESTORED = 'CHECKPOINT_RESTORED'
}

export interface BaseRuntimeEvent {
  type: RuntimeEventType;
  timestamp: number;
  executionId: string;
}

export interface ExecutionStartedEvent extends BaseRuntimeEvent {
  type: RuntimeEventType.EXECUTION_STARTED;
  context: ExecutionContext;
}

export interface ExecutionPausedEvent extends BaseRuntimeEvent {
  type: RuntimeEventType.EXECUTION_PAUSED;
  reason?: string;
}

export interface ExecutionResumedEvent extends BaseRuntimeEvent {
  type: RuntimeEventType.EXECUTION_RESUMED;
}

export interface ExecutionCompletedEvent extends BaseRuntimeEvent {
  type: RuntimeEventType.EXECUTION_COMPLETED;
}

export interface ExecutionCancelledEvent extends BaseRuntimeEvent {
  type: RuntimeEventType.EXECUTION_CANCELLED;
  reason?: string;
}

export interface ExecutionFailedEvent extends BaseRuntimeEvent {
  type: RuntimeEventType.EXECUTION_FAILED;
  error: Error;
}

export interface ExecutionRolledBackEvent extends BaseRuntimeEvent {
  type: RuntimeEventType.EXECUTION_ROLLED_BACK;
  checkpointReference: string;
}

export interface CheckpointCreatedEvent extends BaseRuntimeEvent {
  type: RuntimeEventType.CHECKPOINT_CREATED;
  checkpointReference: string;
}

export interface CheckpointRestoredEvent extends BaseRuntimeEvent {
  type: RuntimeEventType.CHECKPOINT_RESTORED;
  checkpointReference: string;
}

export type RuntimeEvent =
  | ExecutionStartedEvent
  | ExecutionPausedEvent
  | ExecutionResumedEvent
  | ExecutionCompletedEvent
  | ExecutionCancelledEvent
  | ExecutionFailedEvent
  | ExecutionRolledBackEvent
  | CheckpointCreatedEvent
  | CheckpointRestoredEvent;
