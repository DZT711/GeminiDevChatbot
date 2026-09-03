import {
  FailureCategory,
  FailureClassification,
  PlanRevision,
  ReplanningHistoryRecord
} from './ReplanningTypes.js';

export interface SerializedFailureClassification {
  category: string;
  severity: string;
  stepId?: string;
  planId?: string;
  originalError: string;
  retryable: boolean;
  repairable: boolean;
  replannable: boolean;
  recommendedAction: string;
  evidence?: string[];
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface SerializedReplanningHistoryRecord {
  id: string;
  attemptNumber: number;
  previousPlanId: string;
  newPlanId?: string;
  triggerStepId?: string;
  failureClassification: SerializedFailureClassification;
  decision: string;
  reason: string;
  affectedTaskIds?: string[];
  preservedTaskIds?: string[];
  checkpointRestoredId?: string;
  timestamp: number;
}

export class ReplanningSerializer {
  public static serializeClassification(classification: FailureClassification): string {
    return JSON.stringify(classification, null, 2);
  }

  public static deserializeClassification(json: string): FailureClassification {
    const parsed = JSON.parse(json) as FailureClassification;
    if (!parsed.category || !parsed.originalError) {
      throw new Error('Invalid serialized FailureClassification: missing category or originalError.');
    }
    return parsed;
  }

  public static serializeHistory(history: ReplanningHistoryRecord[]): string {
    return JSON.stringify(history, null, 2);
  }

  public static deserializeHistory(json: string): ReplanningHistoryRecord[] {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid serialized ReplanningHistory: expected an array.');
    }
    return parsed as ReplanningHistoryRecord[];
  }
}
