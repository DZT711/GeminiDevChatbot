import type {
  PlanningContext,
  PlanningResult,
  PlanningStrategy,
  PlanningConstraints,
  PlanningExecutionMetadata
} from './PlanningTypes.js';
import type { Plan } from './Plan.js';
import { PlanStep, RiskLevel } from './PlanStep.js';
import type { TaskGraph } from './TaskGraphTypes.js';
import { TaskGraphBuilder } from './TaskGraphBuilder.js';
import { DefaultGoalDecomposer } from '../decomposition/GoalDecomposer.js';
import { TaskType, TaskSpecification } from '../decomposition/DecompositionTypes.js';
import type { LLMGateway, LLMPlanProposal, LLMPlanningPromptPayload } from './LLMGateway.js';

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

export class LLMPlanningStrategy implements PlanningStrategy {
  public readonly name = 'LLMPlanningStrategy';
  public readonly version = '1.0.0';

  constructor(private readonly gateway: LLMGateway) {}

  public async generatePlan(context: PlanningContext): Promise<PlanningResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate inputs
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
        errors: [`Failed to construct base TaskGraph: ${msg}`],
        strategyUsed: this.name
      };
    }

    // 2. Prepare payload for LLMGateway
    const taskSummaries = Array.from(taskGraph.nodes.values()).map(n => ({
      id: n.id,
      description: n.task.description || n.task.title || '',
      dependencies: n.dependencies,
      riskLevel: n.task.riskLevel,
      requiredTools: 'requiredTools' in n.task && Array.isArray(n.task.requiredTools)
        ? n.task.requiredTools.map(t => typeof t === 'string' ? t : t.name)
        : ('toolHints' in n.task && Array.isArray(n.task.toolHints) ? n.task.toolHints : [])
    }));

    const toolSummaries = (context.availableTools || []).map(t => ({
      name: t.name,
      description: t.description,
      tags: t.tags
    }));

    const constraints: PlanningConstraints = {
      ...(context.constraints || {}),
      ...(context.goal?.constraints ? {
        maxSteps: context.goal.constraints.maxSteps,
        maxExecutionTimeMs: context.goal.constraints.maxExecutionTimeMs,
        forbiddenTools: context.goal.constraints.forbiddenTools,
        mandatoryTools: context.goal.constraints.mandatoryTools
      } : {})
    };

    const payload: LLMPlanningPromptPayload = {
      goalId: context.goal?.id,
      objective: context.goal?.rawPrompt || context.goal?.title || context.userGoal || '',
      tasks: taskSummaries,
      availableTools: toolSummaries,
      constraints: constraints as Record<string, unknown>,
      contextNotes: [
        ...(context.knowledgeContext?.map(k => `Knowledge: ${k.content}`) || []),
        ...(context.experienceContext?.map(e => `Experience: ${e.summary}`) || [])
      ]
    };

    // 3. Query LLMGateway
    let proposal: LLMPlanProposal;
    try {
      const rawResult = await this.gateway.proposePlan(payload);
      if (typeof rawResult === 'string') {
        proposal = JSON.parse(rawResult) as LLMPlanProposal;
      } else {
        proposal = rawResult;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        errors: [`LLM plan proposal query/parsing failed: ${msg}`],
        strategyUsed: this.name
      };
    }

    if (!proposal || !Array.isArray(proposal.steps) || proposal.steps.length === 0) {
      return {
        success: false,
        errors: ['LLM plan proposal returned empty or invalid step structure.'],
        strategyUsed: this.name
      };
    }

    // 4. Validate proposal steps and constraints
    if (constraints.maxSteps !== undefined && proposal.steps.length > constraints.maxSteps) {
      return {
        success: false,
        errors: [`Proposed plan step count (${proposal.steps.length}) exceeds maxSteps (${constraints.maxSteps}).`],
        strategyUsed: this.name
      };
    }

    const forbiddenTools = new Set((constraints.forbiddenTools || []).map((t: string) => t.toLowerCase()));
    const approvalThreshold = constraints.requireApprovalForRiskAbove || 'HIGH';
    const steps: PlanStep[] = [];
    const approvalPoints: string[] = [];
    let totalDurationMs = 0;
    let highestRisk: RiskLevel = RiskLevel.LOW;

    const stepIdSet = new Set<string>();

    for (const rawStep of proposal.steps) {
      const stepId = rawStep.taskId || rawStep.title;
      if (!stepId) {
        return {
          success: false,
          errors: ['Plan step missing valid taskId or title.'],
          strategyUsed: this.name
        };
      }

      stepIdSet.add(stepId);
      const stepRisk = normalizeRiskLevel(rawStep.riskLevel);
      const duration = rawStep.estimatedDurationMs || 500;
      totalDurationMs += duration;

      if (compareRisk(stepRisk, highestRisk) > 0) {
        highestRisk = stepRisk;
      }

      // Check forbidden tools
      const reqTools = rawStep.requiredTools || [];
      for (const t of reqTools) {
        if (forbiddenTools.has(t.toLowerCase())) {
          errors.push(`Step '${stepId}' requests forbidden tool '${t}'.`);
        }
      }

      const explicitApproval = Boolean(rawStep.approvalRequired);
      const approvalRequired = explicitApproval || compareRisk(stepRisk, approvalThreshold) >= 0;
      if (approvalRequired) {
        approvalPoints.push(stepId);
      }

      const planStep: PlanStep = {
        id: stepId,
        taskId: rawStep.taskId || stepId,
        title: rawStep.title || stepId,
        description: rawStep.description || '',
        dependencies: rawStep.dependencies || [],
        expectedInputs: rawStep.expectedInputs || [],
        expectedOutputs: rawStep.expectedOutputs || [],
        requiredTools: reqTools,
        estimatedDurationMs: duration,
        riskLevel: stepRisk,
        approvalRequired,
        validationRules: rawStep.validationRules || [],
        metadata: rawStep.metadata
      };

      steps.push(planStep);
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        warnings,
        strategyUsed: this.name
      };
    }

    // Verify step dependencies are self-contained
    for (const step of steps) {
      for (const dep of step.dependencies) {
        if (!stepIdSet.has(dep)) {
          return {
            success: false,
            errors: [`Step '${step.id}' references unknown dependency '${dep}'.`],
            strategyUsed: this.name
          };
        }
      }
    }

    // Build custom TaskGraph from proposed steps to verify acyclicity and extract topo order
    const customGraph = TaskGraphBuilder.build(steps, {
      goalId: context.goal?.id || 'goal-llm',
      explicitDependencies: Object.fromEntries(steps.map(s => [s.id, s.dependencies]))
    });

    if (!customGraph.isAcyclic()) {
      return {
        success: false,
        errors: ['LLM plan proposal contains circular dependencies.'],
        strategyUsed: this.name
      };
    }

    const executionOrder = proposal.executionOrder && proposal.executionOrder.length === steps.length
      ? proposal.executionOrder
      : customGraph.getTopologicalOrder();

    if (constraints.maxRiskLevel && compareRisk(highestRisk, constraints.maxRiskLevel) > 0) {
      return {
        success: false,
        errors: [`Proposed plan overall risk (${highestRisk}) exceeds maxRiskLevel (${constraints.maxRiskLevel}).`],
        strategyUsed: this.name
      };
    }

    const goalId = context.goal?.id || 'goal-llm';
    const goalTitle = context.goal?.rawPrompt || context.goal?.title || context.userGoal || 'LLM Goal';

    const metadata: PlanningExecutionMetadata = {
      estimatedTotalDurationMs: totalDurationMs,
      overallRiskLevel: highestRisk,
      strategyUsed: this.name,
      strategyVersion: this.version,
      generationTimeMs: Date.now() - startTime,
      assumptions: proposal.assumptions || []
    };

    const plan: Plan = {
      id: `plan-llm-${goalId}-${Date.now()}`,
      goalId,
      goal: goalTitle,
      taskGraph: customGraph,
      steps,
      executionOrder,
      approvalPoints: proposal.approvalPoints && proposal.approvalPoints.length > 0
        ? proposal.approvalPoints
        : approvalPoints,
      estimatedComplexity: proposal.estimatedComplexity || (steps.length > 5 ? 'HIGH' : 'MEDIUM'),
      estimatedRisk: highestRisk,
      rollbackHints: proposal.rollbackHints || ['Perform git stash or file checkpoint before applying changes.'],
      validationRequirements: proposal.validationRequirements || ['Verify step outputs match criteria.'],
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
        executionOrder
      }
    };
  }

  public async createPlan(context: PlanningContext): Promise<PlanningResult> {
    return this.generatePlan(context);
  }
}
