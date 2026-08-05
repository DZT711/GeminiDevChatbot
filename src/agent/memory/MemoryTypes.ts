export interface MemoryRecord<T = unknown> {
  id: string;
  namespace?: string;
  content: T;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export type MemoryFilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';

export interface MemoryFilter {
  field: string;
  operator: MemoryFilterOperator;
  value: any;
}

export interface MemoryQuery {
  namespace?: string;
  filters?: MemoryFilter[];
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
}

export enum MemoryCapability {
  TRANSACTIONS = 'TRANSACTIONS',
  FILTER_BY_METADATA = 'FILTER_BY_METADATA',
  SORTING = 'SORTING',
  PAGINATION = 'PAGINATION'
}

export interface MemoryTransaction {
  id: string;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
