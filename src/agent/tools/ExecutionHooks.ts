import { ExecutionContext } from '../runtime/ExecutionContext';
import { ToolDescriptor } from './ToolDescriptor';
import { ToolResult } from './ToolResult';

export interface ExecutionHooks {
  beforeResolution?: (toolName: string, context: ExecutionContext) => Promise<void>;
  beforeExecution?: (descriptor: ToolDescriptor, input: unknown, context: ExecutionContext) => Promise<void>;
  afterExecution?: (descriptor: ToolDescriptor, result: ToolResult, context: ExecutionContext) => Promise<void>;
  onError?: (toolName: string, error: Error, context: ExecutionContext, descriptor?: ToolDescriptor) => Promise<void>;
}
