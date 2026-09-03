import type { Goal } from '../goal/GoalTypes.js';
import type { Plan } from '../planner/Plan.js';
import type { PlanStep } from '../planner/PlanStep.js';
import type { PlanningContext, PlanningStrategy } from '../planner/PlanningTypes.js';
import { PlanningValidator } from '../planner/PlanningValidator.js';
import { LocalizedPlanRepairer } from '../planner/PlanRepairer.js';
import { Planner } from '../planner/Planner.js';
import { FailureClassifier } from './FailureClassifier.js';
import { ReplanningPolicy } from './ReplanningPolicy.js';
import {
  ReplanningAction,
  ReplanningContext,
  ReplanningDecision,
  ReplanningHistoryRecord,
  PlanRevision,
  FailureClassification
} from './ReplanningTypes.js';
import {
  ReplanningError,
  ReplanningBudgetExceededError,
  GoalWeakeningError
} from './ReplanningErrors.js';

export interface ReplanningEngineOptions {
  planner?: Planner;
  validator?: PlanningValidator;
  repairer?: LocalizedPlanRepairer;
}

export class ReplanningEngine {
  private planner: Planner;
  private validator: PlanningValidator;
  private repairer: LocalizedPlanRepairer;
  private history: ReplanningHistoryRecord[] = [];
  private processedEvents = new Set<string>();

  constructor(options?: ReplanningEngineOptions) {
    this.planner = options?.planner || new Planner();
    this.validator = options?.validator || new PlanningValidator();
    this.repairer = options?.repairer || new LocalizedPlanRepairer();
  }

  public getHistory(): ReplanningHistoryRecord[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
    this.processedEvents.clear();
  }

  public classifyFailure(step: PlanStep, error: Error | string, planId?: string): FailureClassification {
    return FailureClassifier.classify({
      error,
      step,
      planId
    });
  }

  /**
   * Evaluates the failure and coordinates Retry, Repair, Replan, or Abort.
   */
  public async handleFailure(context: ReplanningContext): Promise<ReplanningDecision> {
    const eventFingerprint = `${context.currentPlan.id}_${context.failedStep?.id || 'none'}_${context.failureClassification.category}_${context.failureClassification.originalError}`;
    
    // 1. Evaluate Decision Policy
    const evaluation = ReplanningPolicy.evaluate({
      ...context,
      history: this.history
    });

    const action: ReplanningAction = evaluation.action;
    const reason: string = evaluation.reason;
    const warnings: string[] = [];

    let decision: ReplanningDecision = {
      action,
      reason,
      classification: context.failureClassification,
      warnings
    };

    // 2. Execute Decision
    switch (action) {
      case 'RETRY': {
        decision.retryStepId = context.failedStep?.id;
        break;
      }

      case 'REPAIR': {
        // Run full M05-07 validation first to identify repairable errors
        const validation = await this.validator.validate(context.currentPlan, {
          goal: context.goal,
          constraints: context.constraints,
          knowledgeContext: context.knowledgeContext,
          experienceContext: context.experienceContext
        });

        if (this.repairer.canRepair(validation)) {
          const repaired = await this.repairer.applyRepair(context.currentPlan, validation);
          // FULL M05-07 validation again after repair
          const revalidation = await this.validator.validate(repaired, {
            goal: context.goal,
            constraints: context.constraints,
            knowledgeContext: context.knowledgeContext,
            experienceContext: context.experienceContext
          });

          if (revalidation.isValid) {
            decision.repairedPlan = repaired;
            decision.reason += ' Successfully applied localized repair and passed full re-validation.';
            break;
          }
        }
        
        // If repair failed or revalidation failed, fall back to Replan if budget allows
        if (context.replanBudget > 0) {
          warnings.push('Localized plan repair was not fully valid. Escalating to Replan.');
          const replanResult = await this.executeReplan(context);
          decision = {
            ...decision,
            ...replanResult,
            action: replanResult.action,
            reason: `${reason} -> Replan escalated.`
          };
        } else {
          decision.action = 'ABORT';
          decision.reason += ' Localized repair failed and replan budget is 0.';
        }
        break;
      }

      case 'REPLAN': {
        const replanResult = await this.executeReplan(context);
        decision = {
          ...decision,
          ...replanResult
        };
        break;
      }

      case 'ABORT':
      default: {
        decision.action = 'ABORT';
        break;
      }
    }

    // 3. Record History Entry
    const record: ReplanningHistoryRecord = {
      id: `replan_hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      attemptNumber: this.history.length + 1,
      previousPlanId: context.currentPlan.id,
      newPlanId: decision.revision?.newPlan.id || decision.repairedPlan?.id,
      triggerStepId: context.failedStep?.id,
      failureClassification: context.failureClassification,
      decision: decision.action,
      reason: decision.reason,
      affectedTaskIds: context.failedStep ? [context.failedStep.id] : [],
      preservedTaskIds: decision.revision?.completedTasksPreserved || context.completedTaskIds,
      checkpointRestoredId: decision.checkpointRestoredId,
      validationResult: decision.revision?.validationResult,
      timestamp: Date.now()
    };
    this.history.push(record);
    this.processedEvents.add(eventFingerprint);

    return decision;
  }

  /**
   * Generates a revised Plan preserving completed work and enforcing full 7-stage validation.
   */
  private async executeReplan(context: ReplanningContext): Promise<Partial<ReplanningDecision>> {
    if (context.replanBudget <= 0) {
      return {
        action: 'ABORT',
        reason: 'Replanning budget exhausted.'
      };
    }

    // 1. Rollback Checkpoint if configured and required
    let checkpointRestoredId: string | undefined;
    if (context.checkpointStore && context.checkpointId && context.executionContext && context.restoreStrategy) {
      const checkpoint = await context.checkpointStore.load(context.checkpointId);
      if (checkpoint) {
        context.restoreStrategy.restore(context.executionContext, checkpoint.snapshot);
        checkpointRestoredId = checkpoint.id;
      }
    }

    // 2. Goal Semantics Verification (Ensure goal is not weakened)
    this.verifyGoalPreservation(context.goal);

    // 3. Identify completed tasks to preserve
    const completedTaskIds = new Set(context.completedTaskIds || []);
    const preservedSteps: PlanStep[] = (context.currentPlan.steps || []).filter(s => completedTaskIds.has(s.id) || completedTaskIds.has(s.taskId));
    const preservedIds = preservedSteps.map(s => s.id);

    // 4. Generate New Plan using Planner
    const planningContext: PlanningContext = {
      goal: context.goal,
      constraints: context.constraints || (context.goal.constraints ? {
        maxSteps: context.goal.constraints.maxSteps,
        maxExecutionTimeMs: context.goal.constraints.maxExecutionTimeMs,
        forbiddenTools: context.goal.constraints.forbiddenTools,
        mandatoryTools: context.goal.constraints.mandatoryTools,
        maxRiskLevel: context.goal.constraints.maxRiskLevel as any
      } : {}),
      knowledgeContext: context.knowledgeContext,
      experienceContext: context.experienceContext,
      configuration: {
        isReplan: true,
        replanTriggerStep: context.failedStep?.id,
        replanCategory: context.failureClassification.category,
        preservedTasks: preservedIds
      }
    };

    const planResult = await this.planner.generatePlan(planningContext);

    if (!planResult.success || !planResult.plan) {
      return {
        action: 'ABORT',
        reason: `Planner failed to generate revised plan: ${planResult.errors?.join(', ') || 'Unknown error'}`
      };
    }

    let generatedPlan = planResult.plan;

    // 5. Stage A: Full M05-07 7-Stage Validation
    let validationResult = await this.validator.validate(generatedPlan, planningContext);

    // 6. Stage B: If invalid, attempt localized repair
    if (!validationResult.isValid) {
      if (this.repairer.canRepair(validationResult)) {
        generatedPlan = await this.repairer.applyRepair(generatedPlan, validationResult);
        // Stage C: FULL 7-Stage Validation AGAIN after repair
        validationResult = await this.validator.validate(generatedPlan, planningContext);
      }
    }

    // 7. Verify final validation passed
    if (!validationResult.isValid) {
      return {
        action: 'ABORT',
        reason: `Revised plan failed 7-stage validation: ${validationResult.errors.map(e => e.message).join('; ')}`
      };
    }

    // 8. Create PlanRevision
    const revision: PlanRevision = {
      revisionId: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      originalPlanId: context.currentPlan.id,
      replanReason: context.failureClassification.originalError,
      checkpointRestoredId,
      completedTasksPreserved: preservedIds,
      newPlan: generatedPlan,
      validationResult,
      createdAt: Date.now()
    };

    return {
      action: 'REPLAN',
      reason: `Successfully generated valid revised plan '${generatedPlan.id}'.`,
      revision,
      checkpointRestoredId
    };
  }

  private verifyGoalPreservation(goal: Goal): void {
    if (!goal || !goal.id || !goal.title || !goal.desiredOutcome) {
      throw new GoalWeakeningError('Goal definition is incomplete or invalidated.');
    }
    if (!Array.isArray(goal.successCriteria) || goal.successCriteria.length === 0) {
      throw new GoalWeakeningError('Cannot replan: Goal success criteria cannot be empty or cleared.');
    }
  }
}

export const ReplanningService = ReplanningEngine;
