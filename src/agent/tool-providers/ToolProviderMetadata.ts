export interface ToolProviderMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  tags?: string[];
  namespaces?: string[];
  priority?: number;
}
