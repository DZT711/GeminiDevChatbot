import { Tool } from '../../tools/Tool';
import { ToolDescriptor } from '../../tools/ToolDescriptor';
import { ToolLifecycleState } from '../../tools/ToolLifecycle';
import { ExecutionContext } from '../../runtime/ExecutionContext';
import { MCPConnection } from './MCPConnection';

export class MCPTool implements Tool {
  private state: ToolLifecycleState = ToolLifecycleState.REGISTERED;

  constructor(
    private connection: MCPConnection,
    private descriptor: ToolDescriptor
  ) {}

  public getDescriptor(): ToolDescriptor {
    return this.descriptor;
  }

  public getState(): ToolLifecycleState {
    return this.state;
  }

  public async initialize(): Promise<void> {
    this.state = ToolLifecycleState.INITIALIZED;
    // verify connection if needed
    this.state = ToolLifecycleState.READY;
  }

  public async execute(context: ExecutionContext, input: unknown): Promise<unknown> {
    try {
      const result = await this.connection.executeTool(this.descriptor.metadata.name, input);
      return result;
    } catch (error) {
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    this.state = ToolLifecycleState.UNREGISTERED;
  }
}
