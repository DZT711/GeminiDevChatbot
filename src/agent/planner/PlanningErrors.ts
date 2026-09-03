export class PlanningError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code = 'PLANNING_ERROR', details?: Record<string, unknown>) {
    super(message);
    this.name = 'PlanningError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidPlanningContextError extends PlanningError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INVALID_PLANNING_CONTEXT', details);
    this.name = 'InvalidPlanningContextError';
  }
}

export class ConstraintViolationPlanningError extends PlanningError {
  public readonly violatedConstraint: string;

  constructor(violatedConstraint: string, message: string, details?: Record<string, unknown>) {
    super(message, 'CONSTRAINT_VIOLATION', { ...details, violatedConstraint });
    this.name = 'ConstraintViolationPlanningError';
    this.violatedConstraint = violatedConstraint;
  }
}

export class StrategyExecutionError extends PlanningError {
  public readonly strategyName: string;

  constructor(strategyName: string, message: string, details?: Record<string, unknown>) {
    super(message, 'STRATEGY_EXECUTION_ERROR', { ...details, strategyName });
    this.name = 'StrategyExecutionError';
    this.strategyName = strategyName;
  }
}

export class PlanSchemaError extends PlanningError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PLAN_SCHEMA_ERROR', details);
    this.name = 'PlanSchemaError';
  }
}
