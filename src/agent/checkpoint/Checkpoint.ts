import { ExecutionSnapshot } from '../runtime/ExecutionSnapshot';

export interface CheckpointMetadata {
  description?: string;
  triggerType: 'MANUAL' | 'BEFORE_TOOL' | 'AFTER_TOOL' | 'STEP_COMPLETE' | 'ERROR_RECOVERY';
  [key: string]: unknown;
}

export interface Checkpoint {
  id: string;
  executionId: string;
  timestamp: number;
  metadata: CheckpointMetadata;
  snapshot: ExecutionSnapshot;
}
