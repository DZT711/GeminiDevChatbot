export class MemoryError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: unknown) {
    super(message);
    this.name = 'MemoryError';
  }
}

export class MemoryNotFoundError extends MemoryError {
  constructor(id: string) {
    super(`Memory record with ID '${id}' not found.`, 'MEMORY_NOT_FOUND', { id });
    this.name = 'MemoryNotFoundError';
  }
}

export class MemoryTransactionError extends MemoryError {
  constructor(message: string) {
    super(message, 'MEMORY_TRANSACTION_ERROR');
    this.name = 'MemoryTransactionError';
  }
}

export class MemoryUnsupportedCapabilityError extends MemoryError {
  constructor(capability: string) {
    super(`Capability '${capability}' is not supported by this provider.`, 'UNSUPPORTED_CAPABILITY', { capability });
    this.name = 'MemoryUnsupportedCapabilityError';
  }
}
