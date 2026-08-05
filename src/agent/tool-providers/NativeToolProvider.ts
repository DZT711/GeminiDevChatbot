import { ToolProvider } from './ToolProvider';
import { ToolProviderDescriptor } from './ToolProviderDescriptor';
import { ToolProviderLifecycleState } from './ToolProviderLifecycle';
import { ProviderHealth, ProviderHealthStatus } from './ProviderHealth';
import { ToolRegistry } from '../tools/ToolRegistry';
import { ToolProviderCapability } from './ToolProviderCapabilities';
import { Tool } from '../tools/Tool';
import { NativeDiscovery } from '../tool-discovery/NativeDiscovery';

export class NativeToolProvider implements ToolProvider {
  private state: ToolProviderLifecycleState = ToolProviderLifecycleState.STOPPED;
  
  constructor(private nativeTools: Tool[] = []) {}

  public getDescriptor(): ToolProviderDescriptor {
    return {
      metadata: {
        id: 'native-provider',
        name: 'Native Tool Provider',
        version: '1.0.0',
        description: 'Exposes natively implemented tools.',
        tags: ['native', 'local'],
        namespaces: ['native'],
        priority: 100
      },
      capabilities: [
        ToolProviderCapability.HEALTH_CHECK,
        ToolProviderCapability.STREAMING_SUPPORT,
        ToolProviderCapability.CANCELLATION_SUPPORT,
        ToolProviderCapability.DYNAMIC_DISCOVERY
      ],
      requiredPermissions: []
    };
  }

  public getState(): ToolProviderLifecycleState {
    return this.state;
  }

  public async getHealth(): Promise<ProviderHealth> {
    return {
      status: ProviderHealthStatus.HEALTHY,
      lastCheck: Date.now(),
      message: 'Native provider is operating normally.'
    };
  }

  public async initialize(): Promise<void> {
    this.state = ToolProviderLifecycleState.INITIALIZING;
    // Native tools don't require external connections
    this.state = ToolProviderLifecycleState.ACTIVE;
  }

  public async discoverAndRegisterTools(registry: ToolRegistry): Promise<void> {
    if (this.state !== ToolProviderLifecycleState.ACTIVE) {
      throw new Error('Provider must be ACTIVE to register tools.');
    }
    
    const discovery = new NativeDiscovery(this.nativeTools);
    const result = await discovery.discover();

    for (const tool of result.tools) {
      await registry.register(tool);
    }
  }

  public async unregisterTools(registry: ToolRegistry): Promise<void> {
    for (const tool of this.nativeTools) {
      const desc = tool.getDescriptor();
      await registry.unregister(desc.metadata.name, desc.metadata.version);
    }
  }

  public async cleanup(): Promise<void> {
    this.state = ToolProviderLifecycleState.SHUTTING_DOWN;
    this.state = ToolProviderLifecycleState.STOPPED;
  }
}
