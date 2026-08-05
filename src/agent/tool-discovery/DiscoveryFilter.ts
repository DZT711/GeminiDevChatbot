import { ToolCapability } from '../tools/ToolCapability';

export interface DiscoveryFilter {
  tags?: string[];
  capabilities?: ToolCapability[];
  namePattern?: RegExp;
}
