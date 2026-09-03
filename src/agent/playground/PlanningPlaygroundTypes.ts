import type { Goal } from '../goal/GoalTypes.js';
import type { TaskSpecification } from '../decomposition/DecompositionTypes.js';
import type { TaskGraph } from '../planner/TaskGraphTypes.js';
import type { Plan } from '../planner/Plan.js';
import type { PlanValidationResult } from '../planner/PlanValidationTypes.js';
import type {
  FailureClassification,
  ReplanningDecision,
  ReplanningAction,
  ReplanningHistoryRecord,
  PlanRevision
} from '../replanning/ReplanningTypes.js';

export interface PlanningScenarioFixture {
  id: string;
  name: string;
  description: string;
  goal: Goal;
  initialTasks?: TaskSpecification[];
  initialTaskGraph?: TaskGraph;
  initialPlan?: Plan;
  simulatedError?: string;
  expectedFailureAction?: ReplanningAction;
  metadata?: Record<string, unknown>;
}

export interface PlanningSimulationStepLog {
  timestamp: number;
  phase: 'GOAL_LOAD' | 'DECOMPOSITION' | 'GRAPH_BUILD' | 'PLAN_GEN' | 'VALIDATION' | 'REPAIR' | 'SIMULATE_FAILURE' | 'REPLAN_DECISION' | 'REPLAN_EXECUTE';
  title: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
  details?: string;
  data?: unknown;
}

export interface PlanningSimulationState {
  fixtureId: string;
  goal: Goal;
  taskSpecs: TaskSpecification[];
  taskGraph?: TaskGraph;
  plan?: Plan;
  validationResult?: PlanValidationResult;
  repairedPlan?: Plan;
  postRepairValidation?: PlanValidationResult;
  simulatedFailure?: FailureClassification;
  replanningDecision?: ReplanningDecision;
  replanRevision?: PlanRevision;
  history: ReplanningHistoryRecord[];
  timeline: PlanningSimulationStepLog[];
  completedTaskIds: string[];
  goalSemanticPreserved: boolean;
  loopDetected: boolean;
}
