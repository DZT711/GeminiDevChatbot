import { ToolSchema } from './ToolSchema';
import { ToolMetadata } from './ToolMetadata';
import { ToolPermission } from './ToolPermission';
import { ToolCapability } from './ToolCapability';

export interface ToolDescriptor {
  metadata: ToolMetadata;
  schema: ToolSchema;
  permissions: ToolPermission[];
  capabilities: ToolCapability[];
}
