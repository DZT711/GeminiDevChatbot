import { MCPTransportType } from './MCPTransport';
import { MCPAuthentication } from './MCPAuthentication';

export interface MCPServerDescriptor {
  id: string;
  name: string;
  version: string;
  transportType: MCPTransportType;
  transportConfig: Record<string, unknown>;
  authentication?: MCPAuthentication;
}
