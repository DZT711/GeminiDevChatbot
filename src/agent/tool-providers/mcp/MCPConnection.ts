import { MCPServerDescriptor } from './MCPServerDescriptor';
import { MCPHealth } from './MCPHealth';
import { MCPCapabilities } from './MCPCapabilities';

export interface MCPConnection {
  getDescriptor(): MCPServerDescriptor;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  executeTool(toolName: string, args: unknown): Promise<unknown>;
  listTools(): Promise<unknown[]>;
  getHealth(): Promise<MCPHealth>;
  getCapabilities(): MCPCapabilities;
}
