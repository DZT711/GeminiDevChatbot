import type {
  PlanningContext,
  PlanningResult,
  PlanningStrategy,
  PlanningConstraints,
  PlanningExecutionMetadata
} from './PlanningTypes.js';
import type { Plan } from './Plan.js';
import { PlanStep, RiskLevel } from './PlanStep.js';
import type { TaskGraph, TaskEntity } from './TaskGraphTypes.js';
import type { TaskSpecification } from '../decomposition/DecompositionTypes.js';
import { TaskGraphBuilder } from './TaskGraphBuilder.js';
import { DefaultGoalDecomposer } from '../decomposition/GoalDecomposer.js';
import { TaskType } from '../decomposition/DecompositionTypes.js';

const RISK_LEVEL_ORDER: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

function normalizeRiskLevel(risk?: string): RiskLevel {
  if (!risk) return RiskLevel.LOW;
  const upper = risk.toUpperCase();
  if (upper === 'CRITICAL') return RiskLevel.CRITICAL;
  if (upper === 'HIGH') return RiskLevel.HIGH;
  if (upper === 'MEDIUM') return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}

function compareRisk(a: string, b: string): number {
  const scoreA = RISK_LEVEL_ORDER[a.toUpperCase()] || 1;
  const scoreB = RISK_LEVEL_ORDER[b.toUpperCase()] || 1;
  return scoreA - scoreB;
}

function getTaskTools(task?: TaskEntity): string[] {
  if (!task) return [];
  if ('requiredTools' in task && Array.isArray(task.requiredTools)) {
    return task.requiredTools.map(t => typeof t === 'string' ? t : t.name);
  }
  if ('toolHints' in task && Array.isArray(task.toolHints)) {
    return [...task.toolHints];
  }
  return [];
}

function getTaskDuration(task?: TaskEntity): number {
  if (!task) return 500;
  if ('estimatedDurationMs' in task && typeof task.estimatedDurationMs === 'number') {
    return task.estimatedDurationMs;
  }
  return 500;
}

function getTaskValidationRules(task?: TaskEntity): string[] {
  if (!task) return [];
  if ('validationRules' in task && Array.isArray(task.validationRules)) {
    return [...task.validationRules];
  }
  return [];
}

export class RuleBasedPlanningStrategy implements PlanningStrategy {
  public readonly name = 'RuleBasedPlanningStrategy';
  public readonly version = '1.0.0';

  public async generatePlan(context: PlanningContext): Promise<PlanningResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validation of inputs
    if (!context.goal && !context.taskGraph && !context.userGoal) {
      return {
        success: false,
        errors: ['PlanningContext must contain at least one of: goal, taskGraph, or userGoal.'],
        strategyUsed: this.name
      };
    }

    let taskGraph: TaskGraph;

    try {
      if (context.taskGraph) {
        taskGraph = context.taskGraph;
      } else if (context.goal) {
        const decomposer = new DefaultGoalDecomposer();
        const decompResult = await decomposer.decompose(context.goal);
        if (!decompResult.tasks || decompResult.tasks.length === 0) {
          return {
            success: false,
            errors: ['Failed to decompose goal into task specifications.'],
            strategyUsed: this.name
          };
        }
        taskGraph = TaskGraphBuilder.build(decompResult.tasks, { goalId: context.goal.id });
      } else {
        // Fallback for userGoal string
        const singleTask: TaskSpecification = {
          id: 'task-1',
          parentGoalId: 'goal-user',
          title: 'Execute Goal',
          description: context.userGoal || 'User request execution',
          taskType: TaskType.EXECUTE,
          expectedOutcome: 'Successful execution of request',
          expectedInputs: [],
          expectedOutputs: [],
          toolHints: [],
          riskLevel: 'LOW',
          approvalRequired: false,
          createdAt: Date.now()
        };
        taskGraph = TaskGraphBuilder.build([singleTask], { goalId: 'goal-user' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        errors: [`Failed to construct TaskGraph: ${msg}`],
        strategyUsed: this.name
      };
    }

    // 2. Cycle & Graph Sanity Check
    if (!taskGraph.isAcyclic()) {
      return {
        success: false,
        errors: ['Circular dependency detected in TaskGraph. Cannot generate execution order.'],
        strategyUsed: this.name
      };
    }

    const topoOrder = taskGraph.getTopologicalOrder();
    const constraints: PlanningConstraints = {
      ...(context.constraints || {}),
      ...(context.goal?.constraints ? {
        maxSteps: context.goal.constraints.maxSteps,
        maxExecutionTimeMs: context.goal.constraints.maxExecutionTimeMs,
        forbiddenTools: context.goal.constraints.forbiddenTools,
        mandatoryTools: context.goal.constraints.mandatoryTools
      } : {})
    };

    // 3. Constraint checking: maxSteps
    if (constraints.maxSteps !== undefined && topoOrder.length > constraints.maxSteps) {
      errors.push(
        `Plan exceeds maxSteps constraint: required ${topoOrder.length} steps, but maximum allowed is ${constraints.maxSteps}.`
      );
    }

    // 4. Constraint checking: forbiddenTools & mandatoryTools
    const usedTools = new Set<string>();
    const forbiddenTools = new Set((constraints.forbiddenTools || []).map((t: string) => t.toLowerCase()));

    for (const taskId of topoOrder) {
      const task = taskGraph.getTask(taskId);
      const tools = getTaskTools(task);
      for (const toolName of tools) {
        if (toolName) {
          usedTools.add(toolName.toLowerCase());
          if (forbiddenTools.has(toolName.toLowerCase())) {
            errors.push(`Task '${taskId}' requires forbidden tool '${toolName}'.`);
          }
        }
      }
    }

    if (constraints.mandatoryTools) {
      for (const mandatory of constraints.mandatoryTools) {
        if (!usedTools.has(mandatory.toLowerCase())) {
          warnings.push(`Mandatory tool '${mandatory}' is not explicitly assigned to any task.`);
        }
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        warnings,
        strategyUsed: this.name
      };
    }

    // 5. Build declarative PlanSteps and compute risk / approvals
    const steps: PlanStep[] = [];
    const approvalPoints: string[] = [];
    let totalDurationMs = 0;
    let highestRisk: RiskLevel = RiskLevel.LOW;

    const approvalThreshold = constraints.requireApprovalForRiskAbove || 'HIGH';

    for (const stepId of topoOrder) {
      const task = taskGraph.getTask(stepId);
      const dependencies = taskGraph.getDependencies(stepId);

      const title = task?.title || `Step ${stepId}`;
      const description = task?.description || `Execute task ${stepId}`;
      const taskRisk = normalizeRiskLevel(task?.riskLevel);
      const duration = getTaskDuration(task);
      totalDurationMs += duration;

      if (compareRisk(taskRisk, highestRisk) > 0) {
        highestRisk = taskRisk;
      }

      const explicitApproval = task && 'approvalRequired' in task && Boolean(task.approvalRequired);
      const approvalRequired = explicitApproval || compareRisk(taskRisk, approvalThreshold) >= 0;
      if (approvalRequired) {
        approvalPoints.push(stepId);
      }

      const requiredTools = getTaskTools(task);
      const taskType = (task as any)?.taskType || ((task as any)?.metadata?.taskType);

      const planStep: PlanStep = {
        id: stepId,
        taskId: stepId,
        title,
        description,
        dependencies,
        expectedInputs: task?.expectedInputs || [],
        expectedOutputs: task?.expectedOutputs || [],
        requiredTools,
        estimatedDurationMs: duration,
        riskLevel: taskRisk,
        approvalRequired,
        validationRules: getTaskValidationRules(task),
        metadata: {
          taskType,
          taskSpec: task,
          ...(task as any)?.metadata
        }
      };

      steps.push(planStep);
    }

    // 6. Check maxExecutionTimeMs
    if (constraints.maxExecutionTimeMs !== undefined && totalDurationMs > constraints.maxExecutionTimeMs) {
      warnings.push(
        `Estimated duration (${totalDurationMs}ms) exceeds maxExecutionTimeMs (${constraints.maxExecutionTimeMs}ms).`
      );
    }

    // 7. Check maxRiskLevel
    if (constraints.maxRiskLevel && compareRisk(highestRisk, constraints.maxRiskLevel) > 0) {
      errors.push(
        `Plan overall risk (${highestRisk}) exceeds maxRiskLevel constraint (${constraints.maxRiskLevel}).`
      );
      return {
        success: false,
        errors,
        warnings,
        strategyUsed: this.name
      };
    }

    // 8. Ingest Knowledge & Experience (Read-Only)
    const rollbackHints: string[] = [];
    const validationRequirements: string[] = [];
    const assumptions: string[] = [];

    if (context.knowledgeContext && context.knowledgeContext.length > 0) {
      for (const item of context.knowledgeContext) {
        if (item.category === 'BEST_PRACTICE' || item.category === 'SECURITY_RULE') {
          validationRequirements.push(`Rule: ${item.content}`);
        } else {
          assumptions.push(`Knowledge constraint: ${item.content}`);
        }
      }
    }

    if (context.experienceContext && context.experienceContext.length > 0) {
      for (const exp of context.experienceContext) {
        if (exp.lessonLearned) {
          rollbackHints.push(`Heuristic from prior episode: ${exp.lessonLearned}`);
        }
        if (exp.summary) {
          validationRequirements.push(`Experience guardrail: ${exp.summary}`);
        }
      }
    }

    // Default safety rollback hints if none derived
    if (rollbackHints.length === 0) {
      rollbackHints.push('Checkpoint state before mutating files or calling destructive tools.');
    }

    // 9. Compute complexity
    let estimatedComplexity = 'LOW';
    if (steps.length > 8) {
      estimatedComplexity = 'HIGH';
    } else if (steps.length > 3) {
      estimatedComplexity = 'MEDIUM';
    }

    const goalId = context.goal?.id || 'goal-adhoc';
    const goalTitle = context.goal?.rawPrompt || context.goal?.title || context.userGoal || 'Ad-hoc Goal';

    const metadata: PlanningExecutionMetadata = {
      estimatedTotalDurationMs: totalDurationMs,
      overallRiskLevel: highestRisk,
      strategyUsed: this.name,
      strategyVersion: this.version,
      generationTimeMs: Date.now() - startTime,
      assumptions
    };

    const plan: Plan = {
      id: `plan-${goalId}-${Date.now()}`,
      goalId,
      goal: goalTitle,
      taskGraph,
      steps,
      executionOrder: topoOrder,
      approvalPoints,
      estimatedComplexity,
      estimatedRisk: highestRisk,
      rollbackHints,
      validationRequirements,
      metadata,
      createdAt: Date.now()
    };

    return {
      success: true,
      plan,
      errors: [],
      warnings,
      strategyUsed: this.name,
      metadata: {
        totalSteps: steps.length,
        executionOrder: topoOrder
      }
    };
  }

  public async createPlan(context: PlanningContext): Promise<PlanningResult> {
    return this.generatePlan(context);
  }
}

// Alias for semantic clarity
export const DeterministicPlanningStrategy = RuleBasedPlanningStrategy;
