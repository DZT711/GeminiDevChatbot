import { 
  KnowledgeRecord, 
  KnowledgeQuery, 
  KnowledgeCapability, 
  KnowledgeTransaction, 
  KnowledgeCollection 
} from './KnowledgeTypes';

export interface KnowledgeStore {
  /**
   * Returns a list of capabilities supported by this provider.
   */
  getCapabilities(): KnowledgeCapability[];

  /**
   * Initializes the knowledge store (e.g., establishing DB connections).
   */
  initialize(): Promise<void>;

  /**
   * Closes the knowledge store and cleans up resources.
   */
  close(): Promise<void>;

  /**
   * Creates a new knowledge record.
   */
  createRecord(record: Omit<KnowledgeRecord, 'createdAt' | 'updatedAt' | 'version'>): Promise<KnowledgeRecord>;

  /**
   * Retrieves a knowledge record by ID.
   */
  readRecord(id: string, namespace?: string): Promise<KnowledgeRecord | null>;

  /**
   * Updates an existing knowledge record.
   * Note: Implementations should automatically increment the 'version' field.
   */
  updateRecord(id: string, updates: Partial<Omit<KnowledgeRecord, 'id' | 'createdAt' | 'updatedAt' | 'version'>>, namespace?: string): Promise<KnowledgeRecord>;

  /**
   * Deletes a knowledge record.
   */
  deleteRecord(id: string, namespace?: string): Promise<void>;

  /**
   * Queries for knowledge records matching the given criteria.
   */
  queryRecords(query: KnowledgeQuery): Promise<KnowledgeRecord[]>;

  /**
   * Creates a new knowledge collection.
   */
  createCollection(collection: Omit<KnowledgeCollection, 'createdAt' | 'updatedAt'>): Promise<KnowledgeCollection>;

  /**
   * Retrieves a knowledge collection by ID.
   */
  getCollection(id: string, namespace?: string): Promise<KnowledgeCollection | null>;

  /**
   * Updates an existing knowledge collection.
   */
  updateCollection(id: string, updates: Partial<Omit<KnowledgeCollection, 'id' | 'createdAt' | 'updatedAt'>>, namespace?: string): Promise<KnowledgeCollection>;

  /**
   * Deletes a knowledge collection.
   */
  deleteCollection(id: string, namespace?: string): Promise<void>;

  /**
   * Begins a new transaction, if supported.
   * Throws an error if transactions are not supported.
   */
  beginTransaction(): Promise<KnowledgeTransaction>;
}
