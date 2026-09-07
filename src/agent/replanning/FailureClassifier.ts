import type { PlanStep } from '../planner/PlanStep.js';
import {
  FailureCategory,
  FailureClassification,
  FailureSeverity,
  ReplanningAction
} from './ReplanningTypes.js';

export interface ClassificationInput {
  error: Error | string;
  step?: PlanStep;
  planId?: string;
  metadata?: Record<string, unknown>;
}

export class FailureClassifier {
  /**
   * Deterministically classifies runtime or tool errors into domain failure categories.
   */
  public static classify(input: ClassificationInput): FailureClassification {
    const rawError = typeof input.error === 'string' ? input.error : (input.error?.message || String(input.error));
    const lower = rawError.toLowerCase();
    const stepId = input.step?.id || input.step?.taskId;
    const evidence: string[] = [];

    let category: FailureCategory = FailureCategory.UNKNOWN;
    let severity: FailureSeverity = 'MEDIUM';
    let retryable = false;
    let repairable = false;
    let replannable = true;
    let recommendedAction: ReplanningAction = 'REPLAN';

    // 1. Quota Exceeded (hard quota limit on account/key)
    if (
      lower.includes('quota exceeded') ||
      lower.includes('insufficient_quota') ||
      lower.includes('exceeded your current quota') ||
      lower.includes('quota')
    ) {
      category = FailureCategory.CONSTRAINT_VIOLATION;
      severity = 'HIGH';
      retryable = false;
      repairable = false;
      replannable = false;
      recommendedAction = 'ABORT';
      evidence.push('Matched account or project quota exhaustion');
    }
    // 2. Permission Denied / Authorization / Invalid API Key
    else if (
      lower.includes('permission denied') ||
      lower.includes('eacces') ||
      lower.includes('unauthorized') ||
      lower.includes('forbidden') ||
      lower.includes('401') ||
      lower.includes('403') ||
      lower.includes('forbidden tool') ||
      lower.includes('api key') ||
      lower.includes('api_key') ||
      lower.includes('unauthenticated') ||
      (lower.includes('risk level') && lower.includes('exceeds'))
    ) {
      category = FailureCategory.PERMISSION_DENIED;
      severity = 'HIGH';
      retryable = false;
      repairable = false;
      replannable = false;
      recommendedAction = 'ABORT';
      evidence.push('Matched access control / invalid API key / authentication violation');
    }
    // 3. Transient / Rate Limit / Timeout / Network
    else if (
      lower.includes('rate limit') ||
      lower.includes('rate_limit') ||
      lower.includes('429') ||
      lower.includes('503') ||
      lower.includes('504') ||
      lower.includes('econnreset') ||
      lower.includes('etimedout') ||
      lower.includes('timeout') ||
      lower.includes('network disconnect') ||
      lower.includes('temporarily unavailable')
    ) {
      category = FailureCategory.TRANSIENT;
      severity = 'LOW';
      retryable = true;
      repairable = false;
      replannable = false;
      recommendedAction = 'RETRY';
      evidence.push('Matched transient network or rate-limit indicator');
    }
    // 3. Input / Argument / Syntax / Parameter Errors
    else if (
      lower.includes('missing required argument') ||
      lower.includes('invalid argument') ||
      lower.includes('bad parameter') ||
      lower.includes('invalid path') ||
      lower.includes('enoent') ||
      lower.includes('file not found') ||
      lower.includes('missing input') ||
      lower.includes('schema validation failed')
    ) {
      category = FailureCategory.INPUT_ERROR;
      severity = 'MEDIUM';
      retryable = false;
      repairable = true;
      replannable = true;
      recommendedAction = 'REPAIR';
      evidence.push('Matched localized input error or missing path/parameter');
    }
    // 4. Dependency Failure / Missing prerequisite
    else if (
      lower.includes('missing dependency') ||
      lower.includes('dependency failed') ||
      lower.includes('prerequisite not met') ||
      lower.includes('unresolved reference')
    ) {
      category = FailureCategory.DEPENDENCY_FAILURE;
      severity = 'MEDIUM';
      retryable = false;
      repairable = true;
      replannable = true;
      recommendedAction = 'REPAIR';
      evidence.push('Matched missing dependency or prerequisite');
    }
    // 5. Resource Conflict / Locking / Concurrency
    else if (
      lower.includes('conflict') ||
      lower.includes('lock held') ||
      lower.includes('resource busy') ||
      lower.includes('eexist') ||
      lower.includes('already exists')
    ) {
      category = FailureCategory.RESOURCE_CONFLICT;
      severity = 'MEDIUM';
      retryable = true;
      repairable = true;
      replannable = true;
      recommendedAction = 'RETRY';
      evidence.push('Matched resource conflict / locking state');
    }
    // 6. Constraint Violation
    else if (
      lower.includes('maxsteps') ||
      lower.includes('budget exceeded') ||
      lower.includes('timeout exceeded') ||
      lower.includes('constraint exceeded')
    ) {
      category = FailureCategory.CONSTRAINT_VIOLATION;
      severity = 'HIGH';
      retryable = false;
      repairable = false;
      replannable = false;
      recommendedAction = 'ABORT';
      evidence.push('Matched hard constraint violation');
    }
    // 7. Environment Change / Broken workspace assumptions
    else if (
      lower.includes('environment changed') ||
      lower.includes('workspace reset') ||
      lower.includes('container terminated') ||
      lower.includes('runtime mismatch')
    ) {
      category = FailureCategory.ENVIRONMENT_CHANGE;
      severity = 'HIGH';
      retryable = false;
      repairable = false;
      replannable = true;
      recommendedAction = 'REPLAN';
      evidence.push('Matched environment modification');
    }
    // 8. Logical Failure / Test Failure / Assertion Error
    else if (
      lower.includes('test failed') ||
      lower.includes('assertion error') ||
      lower.includes('assertion failed') ||
      lower.includes('unexpected output') ||
      lower.includes('compilation error') ||
      lower.includes('syntax error') ||
      lower.includes('build failed')
    ) {
      category = FailureCategory.LOGICAL_FAILURE;
      severity = 'MEDIUM';
      retryable = false;
      repairable = false;
      replannable = true;
      recommendedAction = 'REPLAN';
      evidence.push('Matched deterministic logical / build / test failure');
    }
    // 9. Fatal / System crash
    else if (
      lower.includes('fatal') ||
      lower.includes('out of memory') ||
      lower.includes('sigkill') ||
      lower.includes('panic')
    ) {
      category = FailureCategory.FATAL;
      severity = 'CRITICAL';
      retryable = false;
      repairable = false;
      replannable = false;
      recommendedAction = 'ABORT';
      evidence.push('Matched fatal unrecoverable system failure');
    } else {
      category = FailureCategory.UNKNOWN;
      severity = 'MEDIUM';
      retryable = false;
      repairable = false;
      replannable = true;
      recommendedAction = 'REPLAN';
      evidence.push('No specific keyword matched, default to general Replan');
    }

    return {
      category,
      severity,
      stepId,
      planId: input.planId,
      originalError: rawError,
      retryable,
      repairable,
      replannable,
      recommendedAction,
      evidence,
      metadata: input.metadata,
      timestamp: Date.now()
    };
  }
}
