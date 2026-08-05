export interface VectorRecord {
  id: string;
  vector: number[];
  namespace?: string;
  metadata?: Record<string, unknown>;
}

export type VectorFilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';

export interface VectorFilter {
  field: string;
  operator: VectorFilterOperator;
  value: any;
}

export interface VectorQuery {
  vector: number[];
  topK: number;
  namespace?: string;
  filters?: VectorFilter[];
  minScore?: number;
}

export interface VectorQueryResult {
  record: VectorRecord;
  score: number;
}

export enum VectorCapability {
  METADATA_FILTERING = 'METADATA_FILTERING',
  NAMESPACES = 'NAMESPACES',
  COSINE_SIMILARITY = 'COSINE_SIMILARITY',
  EUCLIDEAN_DISTANCE = 'EUCLIDEAN_DISTANCE',
  DOT_PRODUCT = 'DOT_PRODUCT'
}
