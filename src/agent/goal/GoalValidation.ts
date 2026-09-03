import {
  Goal,
  GoalConstraints,
  GoalIntent,
  GoalRiskLevel,
  GoalStatus,
  SuccessCriterion,
  SuccessCriterionAssertionType
} from './GoalTypes.js';
import { GoalValidationError } from './GoalErrors.js';

export interface GoalValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_INTENTS = new Set<string>(Object.values(GoalIntent));
const VALID_STATUSES = new Set<string>(Object.values(GoalStatus));
const VALID_ASSERTION_TYPES = new Set<SuccessCriterionAssertionType>([
  'FILE_EXISTS',
  'LINT_PASSES',
  'BUILD_SUCCEEDS',
  'TEST_PASSES',
  'OUTPUT_CONTAINS',
  'CUSTOM'
]);
const VALID_RISK_LEVELS = new Set<GoalRiskLevel>(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export function validateSuccessCriterion(
  criterion: unknown,
  index: number
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!criterion || typeof criterion !== 'object') {
    errors.push(`successCriteria[${index}] must be a non-null object.`);
    return { errors, warnings };
  }

  const c = criterion as Partial<SuccessCriterion>;

  if (!c.id || typeof c.id !== 'string' || c.id.trim() === '') {
    errors.push(`successCriteria[${index}].id must be a non-empty string.`);
  }

  if (!c.description || typeof c.description !== 'string' || c.description.trim() === '') {
    errors.push(`successCriteria[${index}].description must be a non-empty string.`);
  }

  if (!c.assertionType || !VALID_ASSERTION_TYPES.has(c.assertionType)) {
    errors.push(
      `successCriteria[${index}].assertionType must be one of: ${Array.from(VALID_ASSERTION_TYPES).join(', ')}.`
    );
  }

  if (c.assertionType === 'FILE_EXISTS' && (!c.target || typeof c.target !== 'string')) {
    warnings.push(`successCriteria[${index}] with assertionType 'FILE_EXISTS' is missing a 'target' path.`);
  }

  return { errors, warnings };
}

export function validateGoalConstraints(constraints: unknown): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!constraints || typeof constraints !== 'object') {
    errors.push('constraints must be a non-null object.');
    return { errors, warnings };
  }

  const c = constraints as Partial<GoalConstraints>;

  if (typeof c.maxSteps !== 'number' || c.maxSteps <= 0 || !Number.isInteger(c.maxSteps)) {
    errors.push('constraints.maxSteps must be a positive integer.');
  }

  if (typeof c.maxExecutionTimeMs !== 'number' || c.maxExecutionTimeMs <= 0) {
    errors.push('constraints.maxExecutionTimeMs must be a positive number.');
  }

  if (!Array.isArray(c.forbiddenTools)) {
    errors.push('constraints.forbiddenTools must be an array of tool names.');
  }

  if (!Array.isArray(c.mandatoryTools)) {
    errors.push('constraints.mandatoryTools must be an array of tool names.');
  }

  if (Array.isArray(c.forbiddenTools) && Array.isArray(c.mandatoryTools)) {
    const forbiddenSet = new Set(c.forbiddenTools.map(t => String(t).trim()));
    const conflicting = c.mandatoryTools.filter(t => forbiddenSet.has(String(t).trim()));
    if (conflicting.length > 0) {
      errors.push(
        `Conflicting tool constraints: [${conflicting.join(', ')}] cannot be both mandatory and forbidden.`
      );
    }
  }

  if (!c.maxRiskLevel || !VALID_RISK_LEVELS.has(c.maxRiskLevel)) {
    errors.push(`constraints.maxRiskLevel must be one of: ${Array.from(VALID_RISK_LEVELS).join(', ')}.`);
  }

  if (c.requireApprovalAboveRisk && !VALID_RISK_LEVELS.has(c.requireApprovalAboveRisk)) {
    errors.push(
      `constraints.requireApprovalAboveRisk must be one of: ${Array.from(VALID_RISK_LEVELS).join(', ')}.`
    );
  }

  return { errors, warnings };
}

export function validateGoal(goal: unknown): GoalValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!goal || typeof goal !== 'object') {
    return {
      isValid: false,
      errors: ['Goal must be a non-null object.'],
      warnings: []
    };
  }

  const g = goal as Partial<Goal>;

  // ID validation
  if (!g.id || typeof g.id !== 'string' || g.id.trim() === '') {
    errors.push('id must be a non-empty string.');
  }

  // rawPrompt validation
  if (!g.rawPrompt || typeof g.rawPrompt !== 'string' || g.rawPrompt.trim() === '') {
    errors.push('rawPrompt must be a non-empty string.');
  }

  // intent validation
  if (!g.intent || !VALID_INTENTS.has(g.intent)) {
    errors.push(`intent must be a valid GoalIntent. Received: '${String(g.intent)}'.`);
  }

  // description validation
  if (!g.description || typeof g.description !== 'string' || g.description.trim() === '') {
    errors.push('description must be a non-empty string.');
  }

  // desiredOutcome validation
  if (!g.desiredOutcome || typeof g.desiredOutcome !== 'string' || g.desiredOutcome.trim() === '') {
    errors.push('desiredOutcome must be a non-empty string.');
  }

  // status validation
  if (!g.status || !VALID_STATUSES.has(g.status)) {
    errors.push(`status must be a valid GoalStatus. Received: '${String(g.status)}'.`);
  }

  // priority validation (integer 1..5)
  if (
    typeof g.priority !== 'number' ||
    !Number.isInteger(g.priority) ||
    g.priority < 1 ||
    g.priority > 5
  ) {
    errors.push(`priority must be an integer between 1 and 5. Received: ${String(g.priority)}.`);
  }

  // successCriteria validation
  if (!Array.isArray(g.successCriteria)) {
    errors.push('successCriteria must be an array.');
  } else {
    const criterionIds = new Set<string>();
    for (let i = 0; i < g.successCriteria.length; i++) {
      const criterion = g.successCriteria[i];
      const { errors: critErrors, warnings: critWarnings } = validateSuccessCriterion(criterion, i);
      errors.push(...critErrors);
      warnings.push(...critWarnings);

      if (criterion && typeof criterion === 'object' && 'id' in criterion) {
        const critId = String(criterion.id);
        if (critId) {
          if (criterionIds.has(critId)) {
            errors.push(`Duplicate successCriterion id detected: '${critId}'.`);
          } else {
            criterionIds.add(critId);
          }
        }
      }
    }
  }

  // constraints validation
  const { errors: constraintErrors, warnings: constraintWarnings } = validateGoalConstraints(g.constraints);
  errors.push(...constraintErrors);
  warnings.push(...constraintWarnings);

  // timestamps validation
  if (typeof g.createdAt !== 'number' || g.createdAt <= 0) {
    errors.push('createdAt must be a valid positive timestamp.');
  }

  if (typeof g.updatedAt !== 'number' || g.updatedAt <= 0) {
    errors.push('updatedAt must be a valid positive timestamp.');
  }

  if (typeof g.createdAt === 'number' && typeof g.updatedAt === 'number' && g.updatedAt < g.createdAt) {
    errors.push(`updatedAt (${g.updatedAt}) cannot be before createdAt (${g.createdAt}).`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function assertValidGoal(goal: unknown): asserts goal is Goal {
  const result = validateGoal(goal);
  if (!result.isValid) {
    throw new GoalValidationError(result.errors, result.warnings);
  }
}
