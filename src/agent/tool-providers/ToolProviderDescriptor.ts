import { ToolProviderMetadata } from './ToolProviderMetadata';
import { ToolProviderCapability } from './ToolProviderCapabilities';

export interface ToolProviderDescriptor {
  metadata: ToolProviderMetadata;
  capabilities: ToolProviderCapability[];
  requiredPermissions: string[];
}
