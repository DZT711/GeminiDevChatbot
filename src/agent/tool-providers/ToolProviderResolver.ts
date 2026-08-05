import { ToolProviderRegistry } from './ToolProviderRegistry';
import { ToolProvider } from './ToolProvider';
import { ToolProviderCapability } from './ToolProviderCapabilities';

export interface ProviderQuery {
  namespace?: string;
  tags?: string[];
  capabilities?: ToolProviderCapability[];
}

export class ToolProviderResolver {
  constructor(private registry: ToolProviderRegistry) {}

  public resolveProviders(query: ProviderQuery): ToolProvider[] {
    const providers = this.registry.listProviders();
    return providers.filter(provider => {
      const desc = provider.getDescriptor();
      
      if (query.namespace && (!desc.metadata.namespaces || !desc.metadata.namespaces.includes(query.namespace))) {
        return false;
      }

      if (query.tags && query.tags.length > 0) {
        if (!desc.metadata.tags) return false;
        const hasAllTags = query.tags.every(tag => desc.metadata.tags!.includes(tag));
        if (!hasAllTags) return false;
      }

      if (query.capabilities && query.capabilities.length > 0) {
        const hasAllCaps = query.capabilities.every(cap => desc.capabilities.includes(cap));
        if (!hasAllCaps) return false;
      }

      return true;
    });
  }
}
