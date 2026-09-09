import type {
  Goal,
  GoalIntent,
  GoalConstraints,
  GoalProvenance,
  SuccessCriterion
} from '../../../../agent/goal/GoalTypes.js';
import type {
  DecompositionResult,
  TaskSpecification
} from '../../../../agent/decomposition/DecompositionTypes.js';
import type { TaskGraph } from '../../../../agent/planner/TaskGraphTypes.js';
import type { Plan } from '../../../../agent/planner/Plan.js';
import type { PlanValidationResult } from '../../../../agent/planner/PlanValidationTypes.js';

export interface ValidationMatrixStage {
  name: string;
  passed: boolean;
  code?: string;
  detail?: string;
}

export interface EnrichedPlanValidationResult extends PlanValidationResult {
  matrix?: ValidationMatrixStage[];
}

export interface GoalPlanningRequest {
  objective: string;
  intent?: GoalIntent;
  constraints?: Partial<GoalConstraints>;
  successCriteria?: SuccessCriterion[];
  availableTools?: string[];
  metadata?: Record<string, unknown>;
  provenance?: GoalProvenance;
}

export type GoalPlanningStatus =
  | 'success'
  | 'validation_failed'
  | 'decomposition_failed'
  | 'planning_failed'
  | 'repair_failed'
  | 'invalid_goal';

export interface GoalPlanningRepairEntry {
  attempt: number;
  repairedErrors: string[];
  timestamp: number;
}

export interface GoalPlanningResult {
  status: GoalPlanningStatus;
  goal?: Goal;
  taskSpecs?: TaskSpecification[];
  decomposition?: DecompositionResult;
  taskGraph?: TaskGraph;
  plan?: Plan;
  validation?: EnrichedPlanValidationResult;
  repairedPlan?: Plan;
  postRepairValidation?: EnrichedPlanValidationResult;
  repairHistory?: GoalPlanningRepairEntry[];
  errors?: string[];
  warnings?: string[];
  durationMs: number;
  metadata?: Record<string, unknown>;
}
