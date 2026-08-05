import { ToolProvider, ToolProviderDescriptor, ToolProviderLifecycleState, ProviderHealth, ToolProviderCapability } from '../';
import { ToolRegistry } from '../../tools/ToolRegistry';
import { MCPConnection } from './MCPConnection';
import { MCPDiscoveryAdapter } from './MCPDiscoveryAdapter';
import { Tool } from '../../tools/Tool';

export class MCPToolProvider implements ToolProvider {
  private state: ToolProviderLifecycleState = ToolProviderLifecycleState.STOPPED;
  private registeredTools: Tool[] = [];
  
  constructor(private connection: MCPConnection) {}

  public getDescriptor(): ToolProviderDescriptor {
    return {
      metadata: {
        id: `mcp-provider-${this.connection.getDescriptor().id}`,
        name: `MCP Provider: ${this.connection.getDescriptor().name}`,
        version: '1.0.0',
        description: 'Provides tools from an MCP server.',
        tags: ['mcp', 'remote'],
        namespaces: ['mcp'],
        priority: 50
      },
      capabilities: [
        ToolProviderCapability.HEALTH_CHECK,
        ToolProviderCapability.DYNAMIC_DISCOVERY
      ],
      requiredPermissions: []
    };
  }

  public getState(): ToolProviderLifecycleState {
    return this.state;
  }

  public async getHealth(): Promise<ProviderHealth> {
    const mcpHealth = await this.connection.getHealth();
    return {
      status: mcpHealth.status,
      lastCheck: mcpHealth.lastPing,
      message: `Connection state: ${mcpHealth.connectionState}`,
      details: mcpHealth.details
    };
  }

  public async initialize(): Promise<void> {
    this.state = ToolProviderLifecycleState.INITIALIZING;
    await this.connection.connect();
    this.state = ToolProviderLifecycleState.ACTIVE;
  }

  public async discoverAndRegisterTools(registry: ToolRegistry): Promise<void> {
    if (this.state !== ToolProviderLifecycleState.ACTIVE) {
      throw new Error('Provider must be ACTIVE to register tools.');
    }
    
    const discovery = new MCPDiscoveryAdapter(this.connection);
    const result = await discovery.discover();

    for (const tool of result.tools) {
      await registry.register(tool);
      this.registeredTools.push(tool);
    }
  }

  public async unregisterTools(registry: ToolRegistry): Promise<void> {
    for (const tool of this.registeredTools) {
      const desc = tool.getDescriptor();
      await registry.unregister(desc.metadata.name, desc.metadata.version);
    }
    this.registeredTools = [];
  }

  public async cleanup(): Promise<void> {
    this.state = ToolProviderLifecycleState.SHUTTING_DOWN;
    await this.connection.disconnect();
    this.state = ToolProviderLifecycleState.STOPPED;
  }
}
