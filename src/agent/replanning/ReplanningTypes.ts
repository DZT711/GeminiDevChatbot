import type { Goal } from '../goal/GoalTypes.js';
import type { Plan } from '../planner/Plan.js';
import type { PlanStep } from '../planner/PlanStep.js';
import type { TaskGraph } from '../planner/TaskGraphTypes.js';
import type { PlanningConstraints, PlanningExperienceItem, PlanningKnowledgeItem } from '../planner/PlanningTypes.js';
import type { PlanValidationResult } from '../planner/PlanValidationTypes.js';
import type { CheckpointStore } from '../checkpoint/CheckpointStore.js';
import type { RestoreStrategy } from '../checkpoint/Restore.js';
import type { ExecutionContext } from '../runtime/ExecutionContext.js';

export enum FailureCategory {
  TRANSIENT = 'TRANSIENT',
  INPUT_ERROR = 'INPUT_ERROR',
  LOGICAL_FAILURE = 'LOGICAL_FAILURE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DEPENDENCY_FAILURE = 'DEPENDENCY_FAILURE',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  ENVIRONMENT_CHANGE = 'ENVIRONMENT_CHANGE',
  FATAL = 'FATAL',
  UNKNOWN = 'UNKNOWN'
}

export type ReplanningAction = 'RETRY' | 'REPAIR' | 'REPLAN' | 'ABORT';

export type FailureSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FailureClassification {
  category: FailureCategory;
  severity: FailureSeverity;
  stepId?: string;
  planId?: string;
  originalError: string;
  retryable: boolean;
  repairable: boolean;
  replannable: boolean;
  recommendedAction: ReplanningAction;
  evidence?: string[];
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface PlanRevision {
  revisionId: string;
  originalPlanId: string;
  replanReason: string;
  checkpointRestoredId?: string;
  completedTasksPreserved: string[];
  newPlan: Plan;
  validationResult?: PlanValidationResult;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface ReplanningLimits {
  maxRetriesPerStep?: number;
  maxRepairsPerPlan?: number;
  maxReplansPerGoal?: number;
  maxConsecutiveIdenticalFailures?: number;
}

export interface ReplanningContext {
  goal: Goal;
  currentPlan: Plan;
  currentTaskGraph?: TaskGraph;
  failedStep?: PlanStep;
  failureClassification: FailureClassification;
  completedTaskIds?: string[];
  executionObservations?: string[];
  checkpointStore?: CheckpointStore;
  restoreStrategy?: RestoreStrategy;
  checkpointId?: string;
  executionContext?: ExecutionContext;
  knowledgeContext?: PlanningKnowledgeItem[];
  experienceContext?: PlanningExperienceItem[];
  constraints?: PlanningConstraints;
  replanBudget: number;
  limits?: ReplanningLimits;
  history?: ReplanningHistoryRecord[];
  metadata?: Record<string, unknown>;
}

export interface ReplanningDecision {
  action: ReplanningAction;
  reason: string;
  classification: FailureClassification;
  revision?: PlanRevision;
  retryStepId?: string;
  repairedPlan?: Plan;
  checkpointRestoredId?: string;
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

export interface ReplanningHistoryRecord {
  id: string;
  attemptNumber: number;
  previousPlanId: string;
  newPlanId?: string;
  triggerStepId?: string;
  failureClassification: FailureClassification;
  decision: ReplanningAction;
  reason: string;
  affectedTaskIds?: string[];
  preservedTaskIds?: string[];
  checkpointRestoredId?: string;
  validationResult?: PlanValidationResult;
  timestamp: number;
}

export enum ReplanningState {
  IDLE = 'IDLE',
  FAILURE_RECEIVED = 'FAILURE_RECEIVED',
  CLASSIFIED = 'CLASSIFIED',
  DECISION_MADE = 'DECISION_MADE',
  REPLAN_REQUESTED = 'REPLAN_REQUESTED',
  CONTEXT_BUILT = 'CONTEXT_BUILT',
  NEW_PLAN_GENERATED = 'NEW_PLAN_GENERATED',
  VALIDATING = 'VALIDATING',
  REPAIRED = 'REPAIRED',
  VALIDATED = 'VALIDATED',
  READY = 'READY',
  ABORTED = 'ABORTED'
}
