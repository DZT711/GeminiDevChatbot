export class InvalidGoalDecompositionError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(`Goal decomposition error: ${message}`);
    this.name = 'InvalidGoalDecompositionError';
    Object.setPrototypeOf(this, InvalidGoalDecompositionError.prototype);
  }
}

export class DecompositionConstraintViolationError extends Error {
  constructor(
    public readonly constraintName: string,
    public readonly reason: string,
    public readonly details?: unknown
  ) {
    super(`Decomposition violated constraint '${constraintName}': ${reason}`);
    this.name = 'DecompositionConstraintViolationError';
    Object.setPrototypeOf(this, DecompositionConstraintViolationError.prototype);
  }
}

export class UnsupportedGoalIntentError extends Error {
  constructor(public readonly intent: string) {
    super(`Unsupported GoalIntent for decomposition: '${intent}'`);
    this.name = 'UnsupportedGoalIntentError';
    Object.setPrototypeOf(this, UnsupportedGoalIntentError.prototype);
  }
}
