import { Goal, GoalConstraints, GoalIntent, GoalRiskLevel } from '../goal/GoalTypes.js';

export enum TaskType {
  INSPECT = 'INSPECT',
  MODIFY = 'MODIFY',
  VERIFY = 'VERIFY',
  ANALYZE = 'ANALYZE',
  EXECUTE = 'EXECUTE',
  RETRIEVE = 'RETRIEVE',
  COMMUNICATE = 'COMMUNICATE'
}

export interface TaskSpecification {
  id: string;
  parentGoalId: string;
  title: string;
  description: string;
  taskType: TaskType;
  expectedOutcome: string;
  expectedInputs: string[];
  expectedOutputs: string[];
  requiredCapabilities?: string[];
  toolHints?: string[];
  riskLevel: GoalRiskLevel;
  approvalRequired: boolean;
  constraints?: Partial<GoalConstraints>;
  provenance?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface DecompositionOptions {
  availableTools?: string[];
  maxTasks?: number;
  strategy?: 'DETERMINISTIC' | 'TEMPLATE' | 'MODEL_ASSISTED';
  metadata?: Record<string, unknown>;
}

export interface DecompositionResult {
  goalId: string;
  decompositionId: string;
  tasks: TaskSpecification[];
  strategyName: string;
  warnings: string[];
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface DecompositionStrategy {
  name: string;
  canDecompose(goal: Goal): boolean;
  decompose(goal: Goal, options?: DecompositionOptions): Promise<TaskSpecification[]>;
}

export interface GoalDecomposer {
  decompose(goal: Goal, options?: DecompositionOptions): Promise<DecompositionResult>;
}
