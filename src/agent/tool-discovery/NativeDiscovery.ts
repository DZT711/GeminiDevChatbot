import { ToolDiscovery } from './ToolDiscovery';
import { DiscoverySource, DiscoverySourceType } from './DiscoverySource';
import { DiscoveryFilter } from './DiscoveryFilter';
import { DiscoveryResult } from './DiscoveryResult';
import { Tool } from '../tools/Tool';

export class NativeDiscovery implements ToolDiscovery {
  private source: DiscoverySource;

  constructor(private nativeTools: Tool[] = []) {
    this.source = {
      id: 'native-discovery',
      type: DiscoverySourceType.NATIVE,
      metadata: { description: 'Discovers natively bundled tools' }
    };
  }

  public getSource(): DiscoverySource {
    return this.source;
  }

  public async discover(filter?: DiscoveryFilter): Promise<DiscoveryResult> {
    const timestamp = Date.now();
    let discoveredTools = [...this.nativeTools];

    if (filter) {
      discoveredTools = discoveredTools.filter(tool => {
        const desc = tool.getDescriptor();

        if (filter.tags && filter.tags.length > 0) {
          const toolTags = desc.metadata.tags || [];
          const hasAllTags = filter.tags.every(tag => toolTags.includes(tag));
          if (!hasAllTags) return false;
        }

        if (filter.capabilities && filter.capabilities.length > 0) {
          const hasAllCaps = filter.capabilities.every(cap => desc.capabilities.includes(cap));
          if (!hasAllCaps) return false;
        }

        if (filter.namePattern && !filter.namePattern.test(desc.metadata.name)) {
          return false;
        }

        return true;
      });
    }

    return {
      sourceId: this.source.id,
      tools: discoveredTools,
      timestamp
    };
  }
}
