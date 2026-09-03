export class InvalidGoalError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(`Invalid Goal: ${message}`);
    this.name = 'InvalidGoalError';
    Object.setPrototypeOf(this, InvalidGoalError.prototype);
  }
}

export class InvalidGoalStatusTransitionError extends Error {
  constructor(
    public readonly fromStatus: string,
    public readonly toStatus: string,
    public readonly reason?: string
  ) {
    super(
      `Cannot transition Goal status from '${fromStatus}' to '${toStatus}'${
        reason ? `: ${reason}` : '.'
      }`
    );
    this.name = 'InvalidGoalStatusTransitionError';
    Object.setPrototypeOf(this, InvalidGoalStatusTransitionError.prototype);
  }
}

export class GoalValidationError extends Error {
  constructor(
    public readonly errors: string[],
    public readonly warnings: string[] = []
  ) {
    super(`Goal validation failed with ${errors.length} error(s):\n- ${errors.join('\n- ')}`);
    this.name = 'GoalValidationError';
    Object.setPrototypeOf(this, GoalValidationError.prototype);
  }
}
