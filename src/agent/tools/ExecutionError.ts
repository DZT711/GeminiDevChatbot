export class ExecutionError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: unknown) {
    super(message);
    this.name = 'ExecutionError';
  }
}

export class ValidationError extends ExecutionError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class PermissionError extends ExecutionError {
  constructor(message: string, details?: unknown) {
    super(message, 'PERMISSION_ERROR', details);
    this.name = 'PermissionError';
  }
}

export class TimeoutError extends ExecutionError {
  constructor(message: string = 'Execution timed out', details?: unknown) {
    super(message, 'TIMEOUT_ERROR', details);
    this.name = 'TimeoutError';
  }
}

export class CancellationError extends ExecutionError {
  constructor(message: string = 'Execution was cancelled', details?: unknown) {
    super(message, 'CANCELLATION_ERROR', details);
    this.name = 'CancellationError';
  }
}

export class RollbackError extends ExecutionError {
  constructor(message: string, details?: unknown) {
    super(message, 'ROLLBACK_ERROR', details);
    this.name = 'RollbackError';
  }
}
