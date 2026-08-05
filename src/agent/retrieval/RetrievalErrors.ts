export class RetrievalError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: unknown) {
    super(message);
    this.name = 'RetrievalError';
  }
}

export class EmbeddingError extends RetrievalError {
  constructor(message: string, details?: unknown) {
    super(message, 'EMBEDDING_ERROR', details);
    this.name = 'EmbeddingError';
  }
}

export class VectorStoreError extends RetrievalError {
  constructor(message: string, details?: unknown) {
    super(message, 'VECTOR_STORE_ERROR', details);
    this.name = 'VectorStoreError';
  }
}
