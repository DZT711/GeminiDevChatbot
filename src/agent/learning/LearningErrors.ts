export class LearningError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: unknown) {
    super(message);
    this.name = 'LearningError';
  }
}

export class PromotionError extends LearningError {
  constructor(message: string, details?: unknown) {
    super(message, 'PROMOTION_ERROR', details);
    this.name = 'PromotionError';
  }
}
