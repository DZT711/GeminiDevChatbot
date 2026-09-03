import type { TaskGraph } from './TaskGraphTypes.js';
import type { PlanStep } from './PlanStep.js';
import type { PlanningExecutionMetadata } from './PlanningTypes.js';

export interface Plan {
  id: string;
  goalId?: string;
  goal: string;
  taskGraph: TaskGraph;
  steps: PlanStep[];
  executionOrder: string[];
  approvalPoints: string[];
  estimatedComplexity: string;
  estimatedRisk: string;
  rollbackHints: string[];
  validationRequirements: string[];
  metadata: PlanningExecutionMetadata;
  createdAt: number;
  updatedAt?: number;
}

