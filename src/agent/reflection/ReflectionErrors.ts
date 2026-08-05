export class ReflectionError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: unknown) {
    super(message);
    this.name = 'ReflectionError';
  }
}

export class ReflectionEvaluationError extends ReflectionError {
  constructor(message: string, details?: unknown) {
    super(message, 'REFLECTION_EVALUATION_ERROR', details);
    this.name = 'ReflectionEvaluationError';
  }
}
