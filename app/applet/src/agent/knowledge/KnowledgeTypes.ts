export enum KnowledgeRelationshipType {
  PARENT = 'PARENT',
  CHILD = 'CHILD',
  REFERENCE = 'REFERENCE',
  DUPLICATE = 'DUPLICATE',
  RELATED = 'RELATED',
  DEPENDENCY = 'DEPENDENCY'
}

export interface KnowledgeRelationship {
  targetId: string;
  type: KnowledgeRelationshipType;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeRecord<T = unknown> {
  id: string;
  namespace?: string;
  collection?: string;
  title?: string;
  content: T;
  summary?: string;
  metadata: Record<string, unknown>;
  tags: string[];
  relationships: KnowledgeRelationship[];
  version: number;
  source?: string;
  owner?: string;
  confidence?: number;
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeDocument extends KnowledgeRecord<string> {}

export interface KnowledgeCollection {
  id: string;
  namespace?: string;
  name: string;
  description?: string;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export type KnowledgeFilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'hasTag' | 'hasRelationship';

export interface KnowledgeFilter {
  field: string;
  operator: KnowledgeFilterOperator;
  value: any;
}

export interface KnowledgeQuery {
  namespace?: string;
  collection?: string;
  filters?: KnowledgeFilter[];
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'version' | 'confidence';
  sortDirection?: 'asc' | 'desc';
}

export enum KnowledgeCapability {
  NAMESPACES = 'NAMESPACES',
  COLLECTIONS = 'COLLECTIONS',
  RELATIONSHIPS = 'RELATIONSHIPS',
  VERSIONING = 'VERSIONING',
  METADATA = 'METADATA',
  BATCH_OPERATIONS = 'BATCH_OPERATIONS',
  TRANSACTIONS = 'TRANSACTIONS',
  SEARCH = 'SEARCH'
}

export interface KnowledgeTransaction {
  id: string;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
