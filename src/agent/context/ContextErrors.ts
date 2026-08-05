export class ContextError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: unknown) {
    super(message);
    this.name = 'ContextError';
  }
}

export class ContextBudgetError extends ContextError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONTEXT_BUDGET_ERROR', details);
    this.name = 'ContextBudgetError';
  }
}
