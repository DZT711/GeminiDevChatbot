export class ProviderError extends Error {
  constructor(message: string, public readonly providerId: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ProviderInitializationError extends ProviderError {
  constructor(message: string, providerId: string) {
    super(message, providerId);
    this.name = 'ProviderInitializationError';
  }
}

export class ProviderDiscoveryError extends ProviderError {
  constructor(message: string, providerId: string) {
    super(message, providerId);
    this.name = 'ProviderDiscoveryError';
  }
}

export class ProviderAuthenticationError extends ProviderError {
  constructor(message: string, providerId: string) {
    super(message, providerId);
    this.name = 'ProviderAuthenticationError';
  }
}
