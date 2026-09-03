import {
  FailureCategory,
  FailureClassification,
  ReplanningAction,
  ReplanningContext,
  ReplanningLimits
} from './ReplanningTypes.js';

export class ReplanningPolicy {
  public static readonly DEFAULT_LIMITS: Required<ReplanningLimits> = {
    maxRetriesPerStep: 2,
    maxRepairsPerPlan: 2,
    maxReplansPerGoal: 2,
    maxConsecutiveIdenticalFailures: 2
  };

  /**
   * Deterministically evaluates what action (RETRY, REPAIR, REPLAN, ABORT) should be taken.
   */
  public static evaluate(context: ReplanningContext): { action: ReplanningAction; reason: string } {
    const classification = context.failureClassification;
    const limits: Required<ReplanningLimits> = {
      maxRetriesPerStep: context.limits?.maxRetriesPerStep ?? this.DEFAULT_LIMITS.maxRetriesPerStep,
      maxRepairsPerPlan: context.limits?.maxRepairsPerPlan ?? this.DEFAULT_LIMITS.maxRepairsPerPlan,
      maxReplansPerGoal: context.limits?.maxReplansPerGoal ?? this.DEFAULT_LIMITS.maxReplansPerGoal,
      maxConsecutiveIdenticalFailures: context.limits?.maxConsecutiveIdenticalFailures ?? this.DEFAULT_LIMITS.maxConsecutiveIdenticalFailures
    };

    // 1. Check budget exhaustion
    if (context.replanBudget <= 0) {
      return {
        action: 'ABORT',
        reason: 'Replanning budget exhausted (replanBudget <= 0).'
      };
    }

    const history = context.history || [];

    // 2. Count total replans already executed for this goal
    const priorReplans = history.filter(h => h.decision === 'REPLAN').length;
    if (priorReplans >= limits.maxReplansPerGoal) {
      return {
        action: 'ABORT',
        reason: `Maximum replan limit reached for this goal (${priorReplans}/${limits.maxReplansPerGoal}).`
      };
    }

    // 3. Count consecutive identical failures to prevent infinite loops
    if (history.length >= limits.maxConsecutiveIdenticalFailures) {
      const recent = history.slice(-limits.maxConsecutiveIdenticalFailures);
      const allSameStep = recent.every(h => h.triggerStepId === classification.stepId && h.failureClassification.category === classification.category);
      if (allSameStep) {
        return {
          action: 'ABORT',
          reason: `Repeated identical failure loop detected for step '${classification.stepId}' with category '${classification.category}'.`
        };
      }
    }

    // 4. Evaluate specific failure category decisions
    switch (classification.category) {
      case FailureCategory.TRANSIENT: {
        const retriesForStep = history.filter(h => h.triggerStepId === classification.stepId && h.decision === 'RETRY').length;
        if (retriesForStep < limits.maxRetriesPerStep) {
          return {
            action: 'RETRY',
            reason: `Transient error encountered (attempt ${retriesForStep + 1}/${limits.maxRetriesPerStep}). Retrying step '${classification.stepId}'.`
          };
        }
        // If retries exhausted for transient error, escalate to Replan if budget allows, else Abort
        if (priorReplans < limits.maxReplansPerGoal) {
          return {
            action: 'REPLAN',
            reason: `Transient retries exhausted for step '${classification.stepId}'. Escalating to replanning with alternative strategy.`
          };
        }
        return {
          action: 'ABORT',
          reason: `Transient retries exhausted and replanning limit reached for step '${classification.stepId}'.`
        };
      }

      case FailureCategory.INPUT_ERROR:
      case FailureCategory.DEPENDENCY_FAILURE: {
        const repairsCount = history.filter(h => h.decision === 'REPAIR').length;
        if (classification.repairable && repairsCount < limits.maxRepairsPerPlan) {
          return {
            action: 'REPAIR',
            reason: `Localized defect (${classification.category}) detected in step '${classification.stepId}'. Attempting localized plan repair.`
          };
        }
        if (priorReplans < limits.maxReplansPerGoal) {
          return {
            action: 'REPLAN',
            reason: `Localized repairs exhausted or step unrepairable. Generating revised plan.`
          };
        }
        return {
          action: 'ABORT',
          reason: `Unable to repair or replan for step '${classification.stepId}'.`
        };
      }

      case FailureCategory.RESOURCE_CONFLICT: {
        const retriesForStep = history.filter(h => h.triggerStepId === classification.stepId && h.decision === 'RETRY').length;
        if (retriesForStep < 1) {
          return {
            action: 'RETRY',
            reason: `Resource conflict or lock encountered. Retrying step '${classification.stepId}'.`
          };
        }
        return {
          action: 'REPLAN',
          reason: `Resource conflict persists after retry. Replanning with alternate sequence.`
        };
      }

      case FailureCategory.LOGICAL_FAILURE:
      case FailureCategory.ENVIRONMENT_CHANGE:
      case FailureCategory.UNKNOWN: {
        if (priorReplans < limits.maxReplansPerGoal) {
          return {
            action: 'REPLAN',
            reason: `Failure category '${classification.category}' requires new plan structure and strategy.`
          };
        }
        return {
          action: 'ABORT',
          reason: `Goal replan limit reached for logical / environment failure.`
        };
      }

      case FailureCategory.PERMISSION_DENIED:
        return {
          action: 'ABORT',
          reason: `Permission denied or safety risk ceiling exceeded for step '${classification.stepId}'. Execution cannot proceed without explicit elevated authorization.`
        };

      case FailureCategory.CONSTRAINT_VIOLATION:
        return {
          action: 'ABORT',
          reason: `Hard goal constraint violated. Cannot replan within valid bounds.`
        };

      case FailureCategory.FATAL:
      default:
        return {
          action: 'ABORT',
          reason: `Fatal unrecoverable error encountered in step '${classification.stepId}'.`
        };
    }
  }
}
