import { ToolDescriptor } from './ToolDescriptor';
import { ExecutionContext } from '../runtime/ExecutionContext';
import { PermissionError } from './ExecutionError';

export class PermissionValidator {
  public validate(descriptor: ToolDescriptor, context: ExecutionContext): void {
    const requiredPermissions = descriptor.permissions || [];
    
    // Check if the context scope allows this tool
    if (context.scope.allowedTools && context.scope.allowedTools.length > 0) {
        if (!context.scope.allowedTools.includes(descriptor.metadata.name) && 
            !context.scope.allowedTools.includes('*')) {
            throw new PermissionError(`Tool ${descriptor.metadata.name} is not in the allowed list for this context.`);
        }
    }

    // Additional checks based on ToolPermission constraints
    for (const perm of requiredPermissions) {
        if (perm.requiresUserApproval) {
            // Check if context has marked this as approved
            if (!context.customTags.includes(`APPROVED:${descriptor.metadata.name}`)) {
                throw new PermissionError(`Tool ${descriptor.metadata.name} requires user approval for capability ${perm.capability}.`);
            }
        }
    }
  }
}
