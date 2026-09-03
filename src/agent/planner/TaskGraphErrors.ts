export class TaskGraphError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(`TaskGraph error: ${message}`);
    this.name = 'TaskGraphError';
    Object.setPrototypeOf(this, TaskGraphError.prototype);
  }
}

export class InvalidTaskGraphError extends TaskGraphError {
  constructor(message: string, public readonly validationErrors?: string[]) {
    super(`Invalid TaskGraph: ${message}`, validationErrors);
    this.name = 'InvalidTaskGraphError';
    Object.setPrototypeOf(this, InvalidTaskGraphError.prototype);
  }
}

export class TaskGraphCycleError extends TaskGraphError {
  constructor(public readonly cyclePath: string[]) {
    super(`Circular dependency detected in TaskGraph along cycle: ${cyclePath.join(' -> ')}`, { cyclePath });
    this.name = 'TaskGraphCycleError';
    Object.setPrototypeOf(this, TaskGraphCycleError.prototype);
  }
}

export class InvalidTaskStatusTransitionError extends TaskGraphError {
  constructor(
    public readonly taskId: string,
    public readonly fromStatus: string,
    public readonly toStatus: string,
    public readonly reason?: string
  ) {
    super(
      `Illegal TaskStatus transition for task '${taskId}': cannot transition from '${fromStatus}' to '${toStatus}'${
        reason ? ` (${reason})` : ''
      }`
    );
    this.name = 'InvalidTaskStatusTransitionError';
    Object.setPrototypeOf(this, InvalidTaskStatusTransitionError.prototype);
  }
}
