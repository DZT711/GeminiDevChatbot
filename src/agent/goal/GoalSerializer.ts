import { Goal } from './GoalTypes.js';
import { assertValidGoal } from './GoalValidation.js';
import { InvalidGoalError } from './GoalErrors.js';

export function serializeGoal(goal: Goal): string {
  assertValidGoal(goal);
  return JSON.stringify(goal, null, 2);
}

export function deserializeGoal(jsonString: string): Goal {
  if (typeof jsonString !== 'string' || jsonString.trim() === '') {
    throw new InvalidGoalError('Cannot deserialize empty or non-string input.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new InvalidGoalError(`JSON parse error during goal deserialization: ${errorMsg}`);
  }

  assertValidGoal(parsed);
  return parsed;
}

export function goalToJSON(goal: Goal): Record<string, unknown> {
  assertValidGoal(goal);
  return JSON.parse(JSON.stringify(goal)) as Record<string, unknown>;
}

export function goalFromJSON(data: unknown): Goal {
  assertValidGoal(data);
  return data;
}
