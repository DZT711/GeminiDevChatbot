import { Goal, GoalRiskLevel } from '../goal/GoalTypes.js';
import { DecompositionResult, TaskSpecification, TaskType } from './DecompositionTypes.js';
import { InvalidGoalDecompositionError } from './DecompositionErrors.js';

export interface DecompositionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_TASK_TYPES = new Set<string>(Object.values(TaskType));
const VALID_RISK_LEVELS = new Set<GoalRiskLevel>(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

const RISK_LEVEL_WEIGHTS: Record<GoalRiskLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

export function validateTaskSpecification(
  task: unknown,
  parentGoal: Goal,
  index: number
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!task || typeof task !== 'object') {
    errors.push(`tasks[${index}] must be a non-null object.`);
    return { errors, warnings };
  }

  const t = task as Partial<TaskSpecification>;

  // ID validation
  if (!t.id || typeof t.id !== 'string' || t.id.trim() === '') {
    errors.push(`tasks[${index}].id must be a non-empty string.`);
  }

  // parentGoalId validation
  if (t.parentGoalId !== parentGoal.id) {
    errors.push(
      `tasks[${index}].parentGoalId ('${t.parentGoalId}') does not match Goal ID ('${parentGoal.id}').`
    );
  }

  // Title validation
  if (!t.title || typeof t.title !== 'string' || t.title.trim() === '') {
    errors.push(`tasks[${index}].title must be a non-empty string.`);
  }

  // Description validation
  if (!t.description || typeof t.description !== 'string' || t.description.trim() === '') {
    errors.push(`tasks[${index}].description must be a non-empty string.`);
  }

  // TaskType validation
  if (!t.taskType || !VALID_TASK_TYPES.has(t.taskType)) {
    errors.push(`tasks[${index}].taskType must be a valid TaskType. Received: '${String(t.taskType)}'.`);
  }

  // ExpectedOutcome validation
  if (!t.expectedOutcome || typeof t.expectedOutcome !== 'string' || t.expectedOutcome.trim() === '') {
    errors.push(`tasks[${index}].expectedOutcome must be a non-empty string.`);
  }

  // ExpectedInputs & Outputs validation
  if (!Array.isArray(t.expectedInputs)) {
    errors.push(`tasks[${index}].expectedInputs must be an array of strings.`);
  }
  if (!Array.isArray(t.expectedOutputs)) {
    errors.push(`tasks[${index}].expectedOutputs must be an array of strings.`);
  }

  // Risk level validation
  if (!t.riskLevel || !VALID_RISK_LEVELS.has(t.riskLevel)) {
    errors.push(`tasks[${index}].riskLevel must be one of: ${Array.from(VALID_RISK_LEVELS).join(', ')}.`);
  } else {
    // Check against goal's maxRiskLevel
    const goalMaxWeight = RISK_LEVEL_WEIGHTS[parentGoal.constraints.maxRiskLevel];
    const taskRiskWeight = RISK_LEVEL_WEIGHTS[t.riskLevel];
    if (taskRiskWeight > goalMaxWeight) {
      errors.push(
        `tasks[${index}] risk level '${t.riskLevel}' exceeds Goal maxRiskLevel '${parentGoal.constraints.maxRiskLevel}'.`
      );
    }
  }

  // Check approvalRequired alignment if requireApprovalAboveRisk is set
  if (
    parentGoal.constraints.requireApprovalAboveRisk &&
    t.riskLevel &&
    VALID_RISK_LEVELS.has(t.riskLevel)
  ) {
    const thresholdWeight = RISK_LEVEL_WEIGHTS[parentGoal.constraints.requireApprovalAboveRisk];
    const taskRiskWeight = RISK_LEVEL_WEIGHTS[t.riskLevel];
    if (taskRiskWeight >= thresholdWeight && !t.approvalRequired) {
      warnings.push(
        `tasks[${index}] has riskLevel '${t.riskLevel}' matching or exceeding approval threshold '${parentGoal.constraints.requireApprovalAboveRisk}', but approvalRequired is false.`
      );
    }
  }

  // ToolHints validation: ensure no forbidden tools are recommended
  if (t.toolHints && Array.isArray(t.toolHints)) {
    const forbiddenSet = new Set(parentGoal.constraints.forbiddenTools.map(f => f.trim()));
    for (const hint of t.toolHints) {
      if (forbiddenSet.has(hint.trim())) {
        errors.push(
          `tasks[${index}] recommends tool hint '${hint}' which is in Goal forbiddenTools constraint.`
        );
      }
    }
  }

  // Strict check: No executable functions or callbacks embedded in task
  for (const [key, val] of Object.entries(t)) {
    if (typeof val === 'function') {
      errors.push(`tasks[${index}] contains illegal executable function property '${key}'.`);
    }
  }

  return { errors, warnings };
}

export function validateDecomposition(
  tasks: unknown[],
  parentGoal: Goal
): DecompositionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(tasks)) {
    return {
      isValid: false,
      errors: ['Decomposition output must be an array of TaskSpecifications.'],
      warnings: []
    };
  }

  if (tasks.length === 0) {
    errors.push('Decomposition produced zero tasks for the given Goal.');
  }

  // maxSteps constraint check
  if (tasks.length > parentGoal.constraints.maxSteps) {
    errors.push(
      `Decomposition produced ${tasks.length} tasks, which exceeds Goal maxSteps limit (${parentGoal.constraints.maxSteps}).`
    );
  }

  const taskIds = new Set<string>();
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const { errors: taskErrors, warnings: taskWarnings } = validateTaskSpecification(task, parentGoal, i);
    errors.push(...taskErrors);
    warnings.push(...taskWarnings);

    if (task && typeof task === 'object' && 'id' in task) {
      const taskId = String((task as { id: unknown }).id);
      if (taskId) {
        if (taskIds.has(taskId)) {
          errors.push(`Duplicate task ID detected in decomposition: '${taskId}'.`);
        } else {
          taskIds.add(taskId);
        }
      }
    }
  }

  // Check mandatory tools coverage across all generated tasks
  if (parentGoal.constraints.mandatoryTools && parentGoal.constraints.mandatoryTools.length > 0) {
    const allHints = new Set<string>();
    for (const task of tasks) {
      if (task && typeof task === 'object' && 'toolHints' in task && Array.isArray((task as any).toolHints)) {
        for (const hint of (task as any).toolHints) {
          allHints.add(String(hint).trim());
        }
      }
    }

    for (const mandatory of parentGoal.constraints.mandatoryTools) {
      if (!allHints.has(mandatory.trim())) {
        warnings.push(
          `Mandatory tool '${mandatory}' is not suggested in any task toolHints in this decomposition.`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function assertValidDecomposition(tasks: unknown[], parentGoal: Goal): asserts tasks is TaskSpecification[] {
  const result = validateDecomposition(tasks, parentGoal);
  if (!result.isValid) {
    throw new InvalidGoalDecompositionError(
      `Decomposition validation failed with ${result.errors.length} error(s):\n- ${result.errors.join('\n- ')}`,
      { errors: result.errors, warnings: result.warnings }
    );
  }
}
