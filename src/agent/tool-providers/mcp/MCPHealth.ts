import { ProviderHealthStatus } from '../ProviderHealth';

export interface MCPHealth {
  status: ProviderHealthStatus;
  latencyMs?: number;
  lastPing: number;
  connectionState: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  details?: Record<string, unknown>;
}
