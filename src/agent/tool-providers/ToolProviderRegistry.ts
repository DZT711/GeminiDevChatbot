import { ToolProvider } from './ToolProvider';
import { ProviderHealth, ProviderHealthStatus } from './ProviderHealth';
import { ToolProviderLifecycleState } from './ToolProviderLifecycle';

export interface ToolProviderRegistry {
  registerProvider(provider: ToolProvider): Promise<void>;
  unregisterProvider(providerId: string): Promise<void>;
  getProvider(providerId: string): ToolProvider | null;
  listProviders(): ToolProvider[];
  checkHealthAll(): Promise<Record<string, ProviderHealth>>;
}

export class DefaultToolProviderRegistry implements ToolProviderRegistry {
  private providers: Map<string, ToolProvider> = new Map();

  public async registerProvider(provider: ToolProvider): Promise<void> {
    const id = provider.getDescriptor().metadata.id;
    if (this.providers.has(id)) {
      throw new Error(`Provider ${id} is already registered.`);
    }
    await provider.initialize();
    this.providers.set(id, provider);
  }

  public async unregisterProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (provider) {
      await provider.cleanup();
      this.providers.delete(providerId);
    }
  }

  public getProvider(providerId: string): ToolProvider | null {
    return this.providers.get(providerId) || null;
  }

  public listProviders(): ToolProvider[] {
    return Array.from(this.providers.values());
  }

  public async checkHealthAll(): Promise<Record<string, ProviderHealth>> {
    const healthMap: Record<string, ProviderHealth> = {};
    for (const [id, provider] of this.providers.entries()) {
      if (provider.getState() === ToolProviderLifecycleState.ACTIVE) {
        try {
          healthMap[id] = await provider.getHealth();
        } catch (error) {
          healthMap[id] = {
            status: ProviderHealthStatus.UNHEALTHY,
            lastCheck: Date.now(),
            message: (error as Error).message
          };
        }
      }
    }
    return healthMap;
  }
}
