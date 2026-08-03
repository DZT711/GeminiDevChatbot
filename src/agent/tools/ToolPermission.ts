import { ToolCapability } from './ToolCapability';

export interface ToolPermission {
  capability: ToolCapability;
  requiresUserApproval: boolean;
  environmentRestrictions?: string[];
}
