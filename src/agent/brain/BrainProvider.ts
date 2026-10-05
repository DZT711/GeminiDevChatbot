export interface BrainQueryOptions {
  pageSize?: number;
  filter?: Record<string, unknown>;
  sorts?: unknown[];
}

export interface BrainProvider {
  search(query: string, filter?: Record<string, unknown>): Promise<unknown>;
  fetchRecord(id: string, recordType?: 'page' | 'database'): Promise<unknown>;
  queryDatabase(databaseId: string, options?: BrainQueryOptions): Promise<unknown>;
  createRecord(databaseId: string, properties: Record<string, unknown>, children?: unknown[]): Promise<unknown>;
  updateRecord(recordId: string, properties?: Record<string, unknown>, archived?: boolean): Promise<unknown>;
  appendContent(recordId: string, children: unknown[]): Promise<unknown>;
  isAvailable(): boolean;
}
