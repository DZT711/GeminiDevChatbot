import type { Plan } from './Plan.js';
import type { PlanStep } from './PlanStep.js';
import type { PlanningExecutionMetadata } from './PlanningTypes.js';
import type { TaskGraphJSON } from './TaskGraphTypes.js';
import { TaskGraphSerializer } from './TaskGraphSerializer.js';
import { PlanSchemaError } from './PlanningErrors.js';

export interface PlanJSON {
  id: string;
  goalId?: string;
  goal: string;
  taskGraph: TaskGraphJSON;
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

export class PlanSerializer {
  public static toJSON(plan: Plan): PlanJSON {
    if (!plan || !plan.id || !plan.taskGraph) {
      throw new PlanSchemaError('Cannot serialize invalid Plan: missing id or taskGraph.');
    }

    return {
      id: plan.id,
      goalId: plan.goalId,
      goal: plan.goal,
      taskGraph: plan.taskGraph.toJSON(),
      steps: Array.isArray(plan.steps) ? [...plan.steps] : [],
      executionOrder: Array.isArray(plan.executionOrder) ? [...plan.executionOrder] : [],
      approvalPoints: Array.isArray(plan.approvalPoints) ? [...plan.approvalPoints] : [],
      estimatedComplexity: plan.estimatedComplexity || 'LOW',
      estimatedRisk: plan.estimatedRisk || 'LOW',
      rollbackHints: Array.isArray(plan.rollbackHints) ? [...plan.rollbackHints] : [],
      validationRequirements: Array.isArray(plan.validationRequirements) ? [...plan.validationRequirements] : [],
      metadata: { ...(plan.metadata || {}) },
      createdAt: plan.createdAt || Date.now(),
      updatedAt: plan.updatedAt
    };
  }

  public static serialize(plan: Plan, pretty = false): string {
    const jsonObj = this.toJSON(plan);
    return pretty ? JSON.stringify(jsonObj, null, 2) : JSON.stringify(jsonObj);
  }

  public static fromJSON(data: PlanJSON): Plan {
    if (!data || typeof data !== 'object' || !data.id || !data.taskGraph) {
      throw new PlanSchemaError('Invalid Plan JSON structure.');
    }

    const taskGraph = TaskGraphSerializer.deserialize(JSON.stringify(data.taskGraph));

    return {
      id: data.id,
      goalId: data.goalId,
      goal: data.goal || 'Unnamed Plan Goal',
      taskGraph,
      steps: Array.isArray(data.steps) ? data.steps : [],
      executionOrder: Array.isArray(data.executionOrder) ? data.executionOrder : taskGraph.getTopologicalOrder(),
      approvalPoints: Array.isArray(data.approvalPoints) ? data.approvalPoints : [],
      estimatedComplexity: data.estimatedComplexity || 'LOW',
      estimatedRisk: data.estimatedRisk || 'LOW',
      rollbackHints: Array.isArray(data.rollbackHints) ? data.rollbackHints : [],
      validationRequirements: Array.isArray(data.validationRequirements) ? data.validationRequirements : [],
      metadata: data.metadata || {},
      createdAt: data.createdAt || Date.now(),
      updatedAt: data.updatedAt
    };
  }

  public static deserialize(serialized: string): Plan {
    if (!serialized || typeof serialized !== 'string' || serialized.trim() === '') {
      throw new PlanSchemaError('Cannot deserialize empty or invalid string to Plan.');
    }

    try {
      const parsed = JSON.parse(serialized) as PlanJSON;
      return this.fromJSON(parsed);
    } catch (err: unknown) {
      if (err instanceof PlanSchemaError) {
        throw err;
      }
      throw new PlanSchemaError(
        `Failed to deserialize Plan JSON: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
