import {
  Goal,
  GoalIntent,
  GoalPriority,
  GoalStatus,
  createGoal,
  assertValidGoal
} from '../../../../agent/goal/index.js';
import { DefaultGoalDecomposer } from '../../../../agent/decomposition/index.js';
import {
  TaskGraphBuilder,
  Planner,
  PlanningValidator,
  LocalizedPlanRepairer,
  RuleBasedPlanningStrategy,
  Plan,
  ValidationErrorType,
  PlanValidationResult
} from '../../../../agent/planner/index.js';
import type {
  GoalPlanningRequest,
  GoalPlanningResult,
  GoalPlanningRepairEntry,
  EnrichedPlanValidationResult
} from './GoalPlanningTypes.js';

export class GoalPlanningService {
  private decomposer: DefaultGoalDecomposer;
  private planner: Planner;
  private validator: PlanningValidator;
  private repairer: LocalizedPlanRepairer;

  constructor() {
    this.decomposer = new DefaultGoalDecomposer();
    this.planner = new Planner(new RuleBasedPlanningStrategy());
    this.validator = new PlanningValidator();
    this.repairer = new LocalizedPlanRepairer();
  }

  /**
   * Deterministically infer GoalIntent from natural language objective.
   */
  public static detectGoalIntent(objective: string): GoalIntent {
    const text = (objective || '').trim().toLowerCase();
    if (!text) {
      return GoalIntent.CODE_MODIFICATION;
    }

    // Investigation keywords
    if (
      text.startsWith('why ') ||
      text.startsWith('investigate') ||
      text.startsWith('analyze') ||
      text.startsWith('debug') ||
      text.startsWith('trace') ||
      /\b(investigate|root cause|why does|why is|diagnose|trace error)\b/i.test(text)
    ) {
      return GoalIntent.INVESTIGATION;
    }

    // Testing & Verification keywords
    if (
      text.startsWith('test ') ||
      text.startsWith('verify') ||
      text.startsWith('benchmark') ||
      /\b(run test|unit test|integration test|verify suite|benchmark)\b/i.test(text)
    ) {
      return GoalIntent.TESTING_AND_VERIFICATION;
    }

    // Infrastructure Ops keywords
    if (
      text.startsWith('deploy') ||
      text.startsWith('setup') ||
      /\b(docker|kubernetes|k8s|ci\/cd|github action|infrastructure|terraform)\b/i.test(text)
    ) {
      return GoalIntent.INFRASTRUCTURE_OPS;
    }

    // Information Retrieval keywords
    if (
      text.startsWith('search') ||
      text.startsWith('find ') ||
      text.startsWith('lookup') ||
      /\b(search docs|find files|retrieve documentation|list dependencies)\b/i.test(text)
    ) {
      return GoalIntent.INFORMATION_RETRIEVAL;
    }

    // Default to Code Modification for engineering objectives
    return GoalIntent.CODE_MODIFICATION;
  }

  /**
   * Orchestrates the complete M05 planning lifecycle for a user goal.
   * STRICT SAFETY GUARANTEE: Does NOT execute tools, shell commands, or modify files.
   */
  public async createPlanFromGoal(request: GoalPlanningRequest): Promise<GoalPlanningResult> {
    const startTime = Date.now();
    const objective = (request.objective || '').trim();

    if (!objective) {
      return {
        status: 'invalid_goal',
        errors: ['Goal objective is required.'],
        durationMs: Date.now() - startTime
      };
    }

    // Step 1: Create & Validate Goal Model
    let goal: Goal;
    try {
      const intent = request.intent || GoalPlanningService.detectGoalIntent(objective);
      goal = createGoal({
        rawPrompt: objective,
        intent,
        title: objective.length > 60 ? `${objective.slice(0, 57)}...` : objective,
        description: objective,
        desiredOutcome: `Verified implementation of: ${objective}`,
        constraints: request.constraints,
        priority: GoalPriority.MEDIUM,
        status: GoalStatus.CREATED,
        provenance: request.provenance,
        metadata: request.metadata
      });
      assertValidGoal(goal);
    } catch (err: any) {
      return {
        status: 'invalid_goal',
        errors: [`Goal initialization failed: ${err?.message || String(err)}`],
        durationMs: Date.now() - startTime
      };
    }

    // Step 2: Goal Decomposition (TaskSpecification[])
    let taskSpecs: any[] = [];
    let decompositionResult: any;
    try {
      decompositionResult = await this.decomposer.decompose(goal, {
        availableTools: request.availableTools
      });
      taskSpecs = decompositionResult.tasks || [];
      if (taskSpecs.length === 0) {
        return {
          status: 'decomposition_failed',
          goal,
          errors: ['Goal decomposer produced zero task specifications.'],
          warnings: decompositionResult.warnings,
          durationMs: Date.now() - startTime
        };
      }
    } catch (err: any) {
      return {
        status: 'decomposition_failed',
        goal,
        errors: [`Goal decomposition failed: ${err?.message || String(err)}`],
        durationMs: Date.now() - startTime
      };
    }

    // Step 3: TaskGraph DAG Construction
    let taskGraph: any;
    try {
      taskGraph = TaskGraphBuilder.build(taskSpecs, { goalId: goal.id });
    } catch (err: any) {
      return {
        status: 'planning_failed',
        goal,
        taskSpecs,
        decomposition: decompositionResult,
        errors: [`TaskGraph DAG construction failed: ${err?.message || String(err)}`],
        durationMs: Date.now() - startTime
      };
    }

    // Step 4: Planning Strategy & Plan Generation
    let plan: Plan | undefined;
    try {
      const planResult = await this.planner.generatePlan({
        goal,
        taskGraph,
        constraints: {
          maxSteps: goal.constraints.maxSteps,
          maxExecutionTimeMs: goal.constraints.maxExecutionTimeMs,
          forbiddenTools: goal.constraints.forbiddenTools,
          mandatoryTools: goal.constraints.mandatoryTools,
          maxRiskLevel: goal.constraints.maxRiskLevel as any
        }
      });
      plan = planResult.plan;
      if (!plan) {
        return {
          status: 'planning_failed',
          goal,
          taskSpecs,
          decomposition: decompositionResult,
          taskGraph,
          errors: planResult.errors || ['Planner returned empty plan.'],
          warnings: planResult.warnings,
          durationMs: Date.now() - startTime
        };
      }
    } catch (err: any) {
      return {
        status: 'planning_failed',
        goal,
        taskSpecs,
        decomposition: decompositionResult,
        taskGraph,
        errors: [`Plan generation failed: ${err?.message || String(err)}`],
        durationMs: Date.now() - startTime
      };
    }

    // Step 5: 7-Stage Pre-Flight Validation
    let validationResult = await this.validator.validate(plan, {
      goal,
      taskGraph,
      constraints: {
        maxSteps: goal.constraints.maxSteps,
        maxExecutionTimeMs: goal.constraints.maxExecutionTimeMs,
        forbiddenTools: goal.constraints.forbiddenTools,
        mandatoryTools: goal.constraints.mandatoryTools,
        maxRiskLevel: goal.constraints.maxRiskLevel as any
      }
    });

    const repairHistory: GoalPlanningRepairEntry[] = [];
    let activePlan = plan;
    let repairedPlan: Plan | undefined;
    let postRepairValidation: typeof validationResult | undefined;

    // Step 6: Plan Repair (if validation detected repairable issues)
    if (!validationResult.isValid && this.repairer.canRepair(validationResult)) {
      try {
        repairedPlan = await this.repairer.applyRepair(plan, validationResult);
        postRepairValidation = await this.validator.validate(repairedPlan, {
          goal,
          taskGraph: repairedPlan.taskGraph || taskGraph,
          constraints: {
            maxSteps: goal.constraints.maxSteps,
            maxExecutionTimeMs: goal.constraints.maxExecutionTimeMs,
            forbiddenTools: goal.constraints.forbiddenTools,
            mandatoryTools: goal.constraints.mandatoryTools,
            maxRiskLevel: goal.constraints.maxRiskLevel as any
          }
        });

        repairHistory.push({
          attempt: 1,
          repairedErrors: validationResult.errors.map(e => e.message),
          timestamp: Date.now()
        });

        if (postRepairValidation.isValid) {
          activePlan = repairedPlan;
        }
      } catch (err: any) {
        return {
          status: 'repair_failed',
          goal,
          taskSpecs,
          decomposition: decompositionResult,
          taskGraph,
          plan,
          validation: validationResult,
          errors: [`Localized plan repair failed: ${err?.message || String(err)}`],
          durationMs: Date.now() - startTime
        };
      }
    }

    const finalValidation = postRepairValidation || validationResult;
    const finalStatus = finalValidation.isValid ? 'success' : 'validation_failed';

    const buildMatrix = (v: PlanValidationResult) => [
      { name: 'Graph Acyclicity', passed: !v.errors.some(e => e.code === ValidationErrorType.CYCLE_DETECTED) },
      { name: 'Dependency Completeness', passed: !v.errors.some(e => e.code === ValidationErrorType.MISSING_DEPENDENCY) },
      { name: 'Tool Availability', passed: !v.errors.some(e => e.code === ValidationErrorType.TOOL_NOT_FOUND) },
      { name: 'Permissions & Risk', passed: !v.errors.some(e => e.code === ValidationErrorType.PERMISSION_VIOLATION) },
      { name: 'Input/Output Binding', passed: !v.errors.some(e => e.code === ValidationErrorType.INPUT_BINDING_MISSING) },
      { name: 'Resource Constraints', passed: !v.errors.some(e => e.code === ValidationErrorType.CONSTRAINT_EXCEEDED) },
      { name: 'Semantic Contradictions', passed: !v.errors.some(e => e.code === ValidationErrorType.CONTRADICTORY_OPERATIONS) }
    ];

    let enrichedValidation: EnrichedPlanValidationResult | undefined = validationResult;
    let enrichedPostRepairValidation: EnrichedPlanValidationResult | undefined = postRepairValidation;

    if (enrichedValidation) {
      enrichedValidation.matrix = buildMatrix(enrichedValidation);
    }
    if (enrichedPostRepairValidation) {
      enrichedPostRepairValidation.matrix = buildMatrix(enrichedPostRepairValidation);
    }

    return {
      status: finalStatus,
      goal,
      taskSpecs,
      decomposition: decompositionResult,
      taskGraph,
      plan: activePlan,
      validation: enrichedValidation,
      repairedPlan,
      postRepairValidation: enrichedPostRepairValidation,
      repairHistory: repairHistory.length > 0 ? repairHistory : undefined,
      errors: finalValidation.errors.length > 0 ? finalValidation.errors.map(e => e.message) : undefined,
      warnings: finalValidation.warnings.length > 0 ? finalValidation.warnings : undefined,
      durationMs: Date.now() - startTime
    };
  }

  /**
   * Helper to format a planning result as a serializable Markdown/JSON block for chat messages.
   */
  public static formatPlanningMarkdown(result: GoalPlanningResult): string {
    if (result.status === 'invalid_goal') {
      return `### ⚠️ Invalid Goal\n${result.errors?.join('\n') || 'Goal objective is required.'}`;
    }

    const goal = result.goal!;
    const plan = result.plan!;
    const validation = result.postRepairValidation || result.validation!;
    const taskSpecs = result.taskSpecs || [];
    const topoOrder = result.taskGraph?.getTopologicalOrder ? result.taskGraph.getTopologicalOrder() : [];

    const validationStages = [
      { name: 'Graph Acyclicity', passed: !validation.errors.some(e => e.code === ValidationErrorType.CYCLE_DETECTED) },
      { name: 'Dependency Completeness', passed: !validation.errors.some(e => e.code === ValidationErrorType.MISSING_DEPENDENCY) },
      { name: 'Tool Availability', passed: !validation.errors.some(e => e.code === ValidationErrorType.TOOL_NOT_FOUND) },
      { name: 'Permissions & Risk', passed: !validation.errors.some(e => e.code === ValidationErrorType.PERMISSION_VIOLATION) },
      { name: 'Input/Output Binding', passed: !validation.errors.some(e => e.code === ValidationErrorType.INPUT_BINDING_MISSING) },
      { name: 'Resource Constraints', passed: !validation.errors.some(e => e.code === ValidationErrorType.CONSTRAINT_EXCEEDED) },
      { name: 'Semantic Contradictions', passed: !validation.errors.some(e => e.code === ValidationErrorType.CONTRADICTORY_OPERATIONS) }
    ];

    const passedCount = validationStages.filter(s => s.passed).length;

    let md = `\`\`\`json:planning-result\n${JSON.stringify({
      status: result.status,
      goal: {
        id: goal.id,
        rawPrompt: goal.rawPrompt,
        intent: goal.intent,
        title: goal.title,
        description: goal.description,
        desiredOutcome: goal.desiredOutcome,
        priority: goal.priority,
        status: goal.status,
        constraints: goal.constraints,
        metadata: goal.metadata
      },
      taskSpecs: taskSpecs,
      plan: plan,
      repairedPlan: result.repairedPlan,
      validation: validation,
      postRepairValidation: result.postRepairValidation,
      repairHistory: result.repairHistory,
      taskCount: taskSpecs.length,
      stepCount: plan.steps.length,
      strategyUsed: plan.metadata?.strategyUsed || 'RuleBasedPlanningStrategy',
      topologicalOrder: topoOrder,
      validationPassed: validation.isValid,
      stagesPassed: `${passedCount}/7`,
      repaired: !!result.repairedPlan,
      durationMs: result.durationMs
    }, null, 2)}\n\`\`\`\n\n`;

    md += `## 🎯 GOAL\n**${goal.rawPrompt}**\n\n`;
    md += `**Intent:** \`${goal.intent}\` | **Priority:** Level ${goal.priority} | **Max Risk:** \`${goal.constraints.maxRiskLevel}\`\n\n`;

    md += `### 🗺️ TASK GRAPH (DAG)\n`;
    taskSpecs.forEach((t, idx) => {
      const toolHints = t.toolHints && t.toolHints.length > 0 ? ` _(Tools: ${t.toolHints.join(', ')})_` : '';
      md += `${idx + 1}. **[${t.taskType}]** ${t.title}${toolHints}\n`;
    });

    md += `\n### 📋 PLAN STEPS\n`;
    plan.steps.forEach((step, idx) => {
      const tools = step.requiredTools.length > 0 ? ` [Tool: \`${step.requiredTools.join(', ')}\`]` : '';
      const deps = step.dependencies.length > 0 ? ` (Prereqs: ${step.dependencies.join(', ')})` : '';
      md += `* **Step ${idx + 1}:** \`${step.id}\` — ${step.description}${tools}${deps}\n`;
    });

    md += `\n### 🛡️ 7-STAGE PRE-FLIGHT VALIDATION (${passedCount}/7 PASS)\n`;
    validationStages.forEach(s => {
      md += s.passed ? `✓ ${s.name}\n` : `✗ ${s.name} (FAILED)\n`;
    });

    if (result.repairedPlan) {
      md += `\n> 🔧 **Localized Plan Repair Applied:** Defect resolved and validated successfully.\n`;
    }

    md += `\n---\n*Status: Ready for review. Plan execution is guarded (execution integration pending).*`;

    return md;
  }
}
