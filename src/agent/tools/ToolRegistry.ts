import { Tool } from './Tool';
import { ToolDescriptor } from './ToolDescriptor';
import { ToolCapability } from './ToolCapability';
import { ToolLifecycleState } from './ToolLifecycle';

export interface ToolQuery {
  name?: string;
  capabilities?: ToolCapability[];
  tags?: string[];
  includeDeprecated?: boolean;
}

export interface ToolRegistry {
  register(tool: Tool): Promise<void>;
  unregister(name: string, version?: string): Promise<void>;
  findTools(query: ToolQuery): Promise<ToolDescriptor[]>;
  getTool(name: string, version?: string): Promise<Tool | null>;
  getDescriptor(name: string, version?: string): Promise<ToolDescriptor | null>;
  listAll(): Promise<ToolDescriptor[]>;
  setFeatureFlag(toolName: string, isEnabled: boolean): void;
}

export class DefaultToolRegistry implements ToolRegistry {
  // Map of Tool Name -> (Map of Version -> Tool)
  private tools: Map<string, Map<string, Tool>> = new Map();
  // Map of Tool Name -> isEnabled
  private featureFlags: Map<string, boolean> = new Map();

  public async register(tool: Tool): Promise<void> {
    const descriptor = tool.getDescriptor();
    const name = descriptor.metadata.name;
    const version = descriptor.metadata.version;

    if (!this.tools.has(name)) {
      this.tools.set(name, new Map());
    }

    const versionMap = this.tools.get(name)!;
    if (versionMap.has(version)) {
      throw new Error(`Tool ${name} version ${version} is already registered.`);
    }

    versionMap.set(version, tool);
    
    // Auto-enable by default if not set
    if (!this.featureFlags.has(name)) {
      this.featureFlags.set(name, true);
    }
  }

  public async unregister(name: string, version?: string): Promise<void> {
    const versionMap = this.tools.get(name);
    if (!versionMap) return;

    if (version) {
      const tool = versionMap.get(version);
      if (tool) {
        await tool.cleanup();
        versionMap.delete(version);
      }
      if (versionMap.size === 0) {
        this.tools.delete(name);
        this.featureFlags.delete(name);
      }
    } else {
      // Unregister all versions
      for (const tool of versionMap.values()) {
        await tool.cleanup();
      }
      this.tools.delete(name);
      this.featureFlags.delete(name);
    }
  }

  private resolveHighestVersion(name: string): Tool | null {
    const versionMap = this.tools.get(name);
    if (!versionMap || versionMap.size === 0) return null;

    // A simple lexicographical or semver sort. 
    // For a real implementation, a strict semver library should be used.
    const versions = Array.from(versionMap.keys()).sort((a, b) => b.localeCompare(a));
    
    for (const v of versions) {
      const tool = versionMap.get(v)!;
      if (tool.getState() !== ToolLifecycleState.DEPRECATED) {
        return tool;
      }
    }
    
    // If all are deprecated, return the highest version anyway
    return versionMap.get(versions[0]) || null;
  }

  public async getTool(name: string, version?: string): Promise<Tool | null> {
    if (this.featureFlags.get(name) === false) {
      return null;
    }

    if (version) {
      const versionMap = this.tools.get(name);
      return versionMap?.get(version) || null;
    }
    
    return this.resolveHighestVersion(name);
  }

  public async getDescriptor(name: string, version?: string): Promise<ToolDescriptor | null> {
    const tool = await this.getTool(name, version);
    return tool ? tool.getDescriptor() : null;
  }

  public async findTools(query: ToolQuery): Promise<ToolDescriptor[]> {
    const results: ToolDescriptor[] = [];

    for (const [name, versionMap] of this.tools.entries()) {
      if (this.featureFlags.get(name) === false) {
        continue;
      }

      const tool = this.resolveHighestVersion(name);
      if (!tool) continue;

      if (!query.includeDeprecated && tool.getState() === ToolLifecycleState.DEPRECATED) {
        continue;
      }

      const descriptor = tool.getDescriptor();

      // Name filter
      if (query.name && descriptor.metadata.name !== query.name) {
        continue;
      }

      // Capabilities filter
      if (query.capabilities && query.capabilities.length > 0) {
        const hasAllCaps = query.capabilities.every(cap => 
          descriptor.capabilities.includes(cap)
        );
        if (!hasAllCaps) continue;
      }

      // Tags filter
      if (query.tags && query.tags.length > 0) {
        const toolTags = descriptor.metadata.tags || [];
        const hasAllTags = query.tags.every(tag => toolTags.includes(tag));
        if (!hasAllTags) continue;
      }

      results.push(descriptor);
    }

    return results;
  }

  public async listAll(): Promise<ToolDescriptor[]> {
    return this.findTools({});
  }

  public setFeatureFlag(toolName: string, isEnabled: boolean): void {
    this.featureFlags.set(toolName, isEnabled);
  }
}
