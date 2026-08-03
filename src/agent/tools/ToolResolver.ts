import { ToolRegistry } from './ToolRegistry';
import { Tool } from './Tool';

export class ToolResolver {
  constructor(private registry: ToolRegistry) {}

  public async resolve(name: string, version?: string): Promise<Tool> {
    const tool = await this.registry.getTool(name, version);
    if (!tool) {
      throw new Error(`Tool not found or disabled: ${name}${version ? `@${version}` : ''}`);
    }
    return tool;
  }
}
