import { Tool } from '../tools/Tool';

export interface DiscoveryResult {
  sourceId: string;
  tools: Tool[];
  timestamp: number;
}
