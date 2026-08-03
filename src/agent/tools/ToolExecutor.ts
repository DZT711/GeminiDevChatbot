import { ExecutionContext } from '../runtime/ExecutionContext';
import { ExecutionHooks } from './ExecutionHooks';
import { ExecutionPolicy } from './ExecutionPolicy';
import { ToolResult } from './ToolResult';

export interface ToolExecutor {
  execute(
    toolName: string, 
    input: unknown, 
    context: ExecutionContext, 
    policy?: ExecutionPolicy, 
    hooks?: ExecutionHooks
  ): Promise<ToolResult>;
}
