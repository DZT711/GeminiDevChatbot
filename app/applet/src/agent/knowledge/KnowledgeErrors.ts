export class KnowledgeError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: unknown) {
    super(message);
    this.name = 'KnowledgeError';
  }
}

export class KnowledgeNotFoundError extends KnowledgeError {
  constructor(id: string, type: 'Record' | 'Collection' = 'Record') {
    super(`${type} with ID '${id}' not found.`, 'KNOWLEDGE_NOT_FOUND', { id, type });
    this.name = 'KnowledgeNotFoundError';
  }
}

export class KnowledgeTransactionError extends KnowledgeError {
  constructor(message: string) {
    super(message, 'KNOWLEDGE_TRANSACTION_ERROR');
    this.name = 'KnowledgeTransactionError';
  }
}

export class KnowledgeUnsupportedCapabilityError extends KnowledgeError {
  constructor(capability: string) {
    super(`Capability '${capability}' is not supported by this knowledge store.`, 'UNSUPPORTED_CAPABILITY', { capability });
    this.name = 'KnowledgeUnsupportedCapabilityError';
  }
}
