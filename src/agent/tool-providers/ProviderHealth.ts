export enum ProviderHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  UNKNOWN = 'UNKNOWN'
}

export interface ProviderHealth {
  status: ProviderHealthStatus;
  lastCheck: number;
  message?: string;
  details?: Record<string, unknown>;
}
