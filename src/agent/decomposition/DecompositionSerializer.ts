import { Goal } from '../goal/GoalTypes.js';
import { DecompositionResult, TaskSpecification } from './DecompositionTypes.js';
import { validateTaskSpecification, validateDecomposition } from './DecompositionValidation.js';
import { InvalidGoalDecompositionError } from './DecompositionErrors.js';

export function taskToJSON(task: TaskSpecification): Record<string, unknown> {
  return JSON.parse(JSON.stringify(task));
}

export function taskFromJSON(obj: unknown, parentGoal?: Goal): TaskSpecification {
  if (!obj || typeof obj !== 'object') {
    throw new InvalidGoalDecompositionError('Invalid task JSON: expected object');
  }

  const raw = obj as Record<string, unknown>;

  if (parentGoal) {
    const { errors } = validateTaskSpecification(raw, parentGoal, 0);
    if (errors.length > 0) {
      throw new InvalidGoalDecompositionError(
        `Failed to deserialize task: ${errors.join(', ')}`
      );
    }
  }

  return {
    id: String(raw.id || ''),
    parentGoalId: String(raw.parentGoalId || ''),
    title: String(raw.title || ''),
    description: String(raw.description || ''),
    taskType: raw.taskType as any,
    expectedOutcome: String(raw.expectedOutcome || ''),
    expectedInputs: Array.isArray(raw.expectedInputs) ? (raw.expectedInputs as string[]) : [],
    expectedOutputs: Array.isArray(raw.expectedOutputs) ? (raw.expectedOutputs as string[]) : [],
    requiredCapabilities: Array.isArray(raw.requiredCapabilities)
      ? (raw.requiredCapabilities as string[])
      : undefined,
    toolHints: Array.isArray(raw.toolHints) ? (raw.toolHints as string[]) : undefined,
    riskLevel: raw.riskLevel as any,
    approvalRequired: Boolean(raw.approvalRequired),
    constraints: raw.constraints as any,
    provenance: raw.provenance as any,
    metadata: raw.metadata as any,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now()
  };
}

export function serializeTasks(tasks: TaskSpecification[]): string {
  return JSON.stringify(tasks, null, 2);
}

export function deserializeTasks(json: string, parentGoal?: Goal): TaskSpecification[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new InvalidGoalDecompositionError(
      `Failed to parse task JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!Array.isArray(parsed)) {
    throw new InvalidGoalDecompositionError('Invalid tasks JSON: expected array');
  }

  if (parentGoal) {
    const validation = validateDecomposition(parsed, parentGoal);
    if (!validation.isValid) {
      throw new InvalidGoalDecompositionError(
        `Deserialized tasks failed validation: ${validation.errors.join(', ')}`
      );
    }
  }

  return parsed.map((item, idx) => {
    return taskFromJSON(item, parentGoal);
  });
}

export function serializeDecompositionResult(result: DecompositionResult): string {
  return JSON.stringify(result, null, 2);
}

export function deserializeDecompositionResult(
  json: string,
  parentGoal?: Goal
): DecompositionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new InvalidGoalDecompositionError(
      `Failed to parse DecompositionResult JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new InvalidGoalDecompositionError(
      'Invalid DecompositionResult JSON: expected object'
    );
  }

  const raw = parsed as Record<string, unknown>;
  const tasks = deserializeTasks(JSON.stringify(raw.tasks || []), parentGoal);

  return {
    goalId: String(raw.goalId || ''),
    decompositionId: String(raw.decompositionId || ''),
    tasks,
    strategyName: String(raw.strategyName || ''),
    warnings: Array.isArray(raw.warnings) ? (raw.warnings as string[]) : [],
    metadata: raw.metadata as Record<string, unknown> | undefined,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now()
  };
}
