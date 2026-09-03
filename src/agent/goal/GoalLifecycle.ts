import { Goal, GoalStatus } from './GoalTypes.js';
import { InvalidGoalStatusTransitionError } from './GoalErrors.js';

export const ALLOWED_GOAL_STATUS_TRANSITIONS: Record<GoalStatus, GoalStatus[]> = {
  [GoalStatus.CREATED]: [GoalStatus.READY, GoalStatus.CANCELLED, GoalStatus.ABANDONED],
  [GoalStatus.READY]: [GoalStatus.ACTIVE, GoalStatus.CANCELLED, GoalStatus.ABANDONED],
  [GoalStatus.ACTIVE]: [
    GoalStatus.COMPLETED,
    GoalStatus.FAILED,
    GoalStatus.CANCELLED,
    GoalStatus.ABANDONED
  ],
  [GoalStatus.FAILED]: [GoalStatus.READY, GoalStatus.ABANDONED],
  [GoalStatus.COMPLETED]: [],
  [GoalStatus.CANCELLED]: [],
  [GoalStatus.ABANDONED]: []
};

export function isTerminalGoalStatus(status: GoalStatus): boolean {
  return (
    status === GoalStatus.COMPLETED ||
    status === GoalStatus.CANCELLED ||
    status === GoalStatus.ABANDONED
  );
}

export function getAllowedGoalStatusTransitions(status: GoalStatus): GoalStatus[] {
  return ALLOWED_GOAL_STATUS_TRANSITIONS[status] || [];
}

export function validateStatusTransition(from: GoalStatus, to: GoalStatus): boolean {
  if (from === to) {
    return true; // Idempotent transition is allowed
  }
  const allowed = ALLOWED_GOAL_STATUS_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

export function transitionGoalStatus(
  goal: Goal,
  newStatus: GoalStatus,
  reason?: string
): Goal {
  if (goal.status === newStatus) {
    return goal;
  }

  if (!validateStatusTransition(goal.status, newStatus)) {
    throw new InvalidGoalStatusTransitionError(goal.status, newStatus, reason);
  }

  const now = Date.now();
  const transitionLog = {
    from: goal.status,
    to: newStatus,
    timestamp: now,
    reason
  };

  const existingHistory = Array.isArray(goal.metadata?.statusHistory)
    ? (goal.metadata.statusHistory as unknown[])
    : [];

  return {
    ...goal,
    status: newStatus,
    updatedAt: now,
    metadata: {
      ...(goal.metadata || {}),
      statusHistory: [...existingHistory, transitionLog],
      ...(reason ? { lastStatusChangeReason: reason } : {})
    }
  };
}
