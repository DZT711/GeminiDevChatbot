export enum MCPAuthType {
  NONE = 'NONE',
  BEARER = 'BEARER',
  CUSTOM = 'CUSTOM'
}

export interface MCPAuthentication {
  type: MCPAuthType;
  credentials?: Record<string, string>;
}
