export class DiscoveryError extends Error {
  constructor(message: string, public readonly sourceId: string) {
    super(message);
    this.name = 'DiscoveryError';
  }
}

export class SourceUnavailableError extends DiscoveryError {
  constructor(message: string, sourceId: string) {
    super(message, sourceId);
    this.name = 'SourceUnavailableError';
  }
}

export class InvalidToolFormatError extends DiscoveryError {
  constructor(message: string, sourceId: string) {
    super(message, sourceId);
    this.name = 'InvalidToolFormatError';
  }
}
