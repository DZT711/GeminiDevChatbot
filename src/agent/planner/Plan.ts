import { TaskGraph } from './TaskGraph';
import type { PlanningExecutionMetadata } from './PlanningTypes';

export interface Plan {
  id: string;
  goal: string;
  taskGraph: TaskGraph;
  executionOrder: string[];
  approvalPoints: string[];
  estimatedComplexity: string;
  estimatedRisk: string;
  rollbackHints: string[];
  validationRequirements: string[];
  metadata: PlanningExecutionMetadata;
  createdAt: number;
}
