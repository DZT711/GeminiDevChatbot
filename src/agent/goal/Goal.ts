import {
  Goal,
  GoalConstraints,
  GoalIntent,
  GoalPriority,
  GoalProvenance,
  GoalStatus,
  GoalUpdate,
  SuccessCriterion
} from './GoalTypes.js';
import { assertValidGoal } from './GoalValidation.js';

export interface CreateGoalParams {
  id?: string;
  rawPrompt: string;
  intent: GoalIntent;
  title?: string;
  description?: string;
  desiredOutcome?: string;
  successCriteria?: SuccessCriterion[];
  constraints?: Partial<GoalConstraints>;
  priority?: GoalPriority | number;
  status?: GoalStatus;
  provenance?: GoalProvenance;
  metadata?: Record<string, unknown>;
  createdAt?: number;
}

export function createDefaultGoalConstraints(
  overrides: Partial<GoalConstraints> = {}
): GoalConstraints {
  return {
    maxSteps: overrides.maxSteps ?? 10,
    maxExecutionTimeMs: overrides.maxExecutionTimeMs ?? 120000,
    forbiddenTools: overrides.forbiddenTools ? [...overrides.forbiddenTools] : [],
    mandatoryTools: overrides.mandatoryTools ? [...overrides.mandatoryTools] : [],
    maxRiskLevel: overrides.maxRiskLevel ?? 'MEDIUM',
    ...(overrides.requireApprovalAboveRisk
      ? { requireApprovalAboveRisk: overrides.requireApprovalAboveRisk }
      : {}),
    ...(overrides.customConstraints ? { customConstraints: { ...overrides.customConstraints } } : {})
  };
}

function generateGoalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `goal_${crypto.randomUUID()}`;
  }
  return `goal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function createGoal(params: CreateGoalParams): Goal {
  const now = params.createdAt ?? Date.now();
  const description = params.description ?? params.rawPrompt;
  const desiredOutcome = params.desiredOutcome ?? description;

  const goal: Goal = {
    id: params.id ?? generateGoalId(),
    rawPrompt: params.rawPrompt,
    intent: params.intent,
    ...(params.title ? { title: params.title } : {}),
    description,
    desiredOutcome,
    successCriteria: params.successCriteria ? [...params.successCriteria] : [],
    constraints: createDefaultGoalConstraints(params.constraints),
    priority: params.priority ?? GoalPriority.MEDIUM,
    status: params.status ?? GoalStatus.CREATED,
    ...(params.provenance ? { provenance: { ...params.provenance } } : {}),
    ...(params.metadata ? { metadata: { ...params.metadata } } : {}),
    createdAt: now,
    updatedAt: now
  };

  assertValidGoal(goal);
  return goal;
}

export function updateGoal(goal: Goal, update: GoalUpdate): Goal {
  const updatedConstraints = update.constraints
    ? {
        ...goal.constraints,
        ...update.constraints,
        forbiddenTools: update.constraints.forbiddenTools
          ? [...update.constraints.forbiddenTools]
          : goal.constraints.forbiddenTools,
        mandatoryTools: update.constraints.mandatoryTools
          ? [...update.constraints.mandatoryTools]
          : goal.constraints.mandatoryTools
      }
    : goal.constraints;

  const updated: Goal = {
    ...goal,
    ...(update.title !== undefined ? { title: update.title } : {}),
    ...(update.description !== undefined ? { description: update.description } : {}),
    ...(update.desiredOutcome !== undefined ? { desiredOutcome: update.desiredOutcome } : {}),
    ...(update.successCriteria !== undefined
      ? { successCriteria: [...update.successCriteria] }
      : {}),
    constraints: updatedConstraints,
    ...(update.priority !== undefined ? { priority: update.priority } : {}),
    metadata: {
      ...(goal.metadata || {}),
      ...(update.metadata || {})
    },
    updatedAt: Date.now()
  };

  assertValidGoal(updated);
  return updated;
}
