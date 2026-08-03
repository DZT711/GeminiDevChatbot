import { ToolDescriptor } from './ToolDescriptor';
import { ToolLifecycleState } from './ToolLifecycle';
import { ExecutionContext } from '../runtime/ExecutionContext';

export interface Tool {
  getDescriptor(): ToolDescriptor;
  getState(): ToolLifecycleState;
  
  initialize(): Promise<void>;
  execute(context: ExecutionContext, input: unknown): Promise<unknown>;
  cleanup(): Promise<void>;
}
