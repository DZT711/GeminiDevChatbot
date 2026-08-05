import { ToolDiscovery, DiscoverySource, DiscoverySourceType, DiscoveryFilter, DiscoveryResult } from '../../tool-discovery';
import { MCPConnection } from './MCPConnection';
import { Tool } from '../../tools/Tool';
import { MCPTool } from './MCPTool';

export class MCPDiscoveryAdapter implements ToolDiscovery {
  private source: DiscoverySource;

  constructor(private connection: MCPConnection) {
    this.source = {
      id: `mcp-${connection.getDescriptor().id}`,
      type: DiscoverySourceType.MCP,
      metadata: { serverName: connection.getDescriptor().name }
    };
  }

  public getSource(): DiscoverySource {
    return this.source;
  }

  public async discover(filter?: DiscoveryFilter): Promise<DiscoveryResult> {
    const mcpTools = await this.connection.listTools();
    
    // Map MCP tools to native Tool format
    const tools: Tool[] = mcpTools.map((mcpTool: any) => {
      return new MCPTool(this.connection, {
        metadata: {
          name: mcpTool.name,
          version: mcpTool.version || '1.0.0',
          description: mcpTool.description || '',
          tags: ['mcp', mcpTool.name]
        },
        schema: {
          inputSchema: mcpTool.inputSchema || {},
          outputSchema: {}
        },
        capabilities: [],
        permissions: []
      });
    });

    let discoveredTools = tools;
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
      timestamp: Date.now()
    };
  }
}
