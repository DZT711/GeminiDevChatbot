export class ReplanningError extends Error {
  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = 'ReplanningError';
  }
}

export class ReplanningBudgetExceededError extends ReplanningError {
  constructor(message = 'Replanning budget exceeded. Replan attempts reached the maximum limit.', details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'ReplanningBudgetExceededError';
  }
}

export class InvalidReplanningStateError extends ReplanningError {
  constructor(fromState: string, toState: string, details?: Record<string, unknown>) {
    super(`Invalid Replanning state transition from '${fromState}' to '${toState}'.`, details);
    this.name = 'InvalidReplanningStateError';
  }
}

export class UnrepairablePlanError extends ReplanningError {
  constructor(message = 'Plan cannot be repaired locally.', details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'UnrepairablePlanError';
  }
}

export class GoalWeakeningError extends ReplanningError {
  constructor(message = 'Replanning would violate or weaken the immutable Goal success criteria or constraints.', details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'GoalWeakeningError';
  }
}
