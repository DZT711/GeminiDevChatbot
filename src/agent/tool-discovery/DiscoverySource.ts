export enum DiscoverySourceType {
  NATIVE = 'NATIVE',
  FILE_SYSTEM = 'FILE_SYSTEM',
  NETWORK = 'NETWORK',
  PLUGIN = 'PLUGIN',
  MCP = 'MCP'
}

export interface DiscoverySource {
  id: string;
  type: DiscoverySourceType;
  uri?: string;
  metadata?: Record<string, unknown>;
}
