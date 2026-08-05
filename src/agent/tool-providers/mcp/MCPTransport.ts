export enum MCPTransportType {
  STDIO = 'STDIO',
  SSE = 'SSE',
  WEBSOCKET = 'WEBSOCKET'
}

export interface MCPTransport {
  type: MCPTransportType;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: unknown): Promise<void>;
  onMessage(handler: (message: unknown) => void): void;
  onError(handler: (error: Error) => void): void;
}
