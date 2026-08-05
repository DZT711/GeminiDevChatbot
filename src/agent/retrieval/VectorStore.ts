import { VectorRecord, VectorQuery, VectorQueryResult, VectorCapability } from './VectorTypes';

export interface VectorStore {
  /**
   * Returns a list of capabilities supported by this store.
   */
  getCapabilities(): VectorCapability[];

  /**
   * Initializes the vector store connection.
   */
  initialize(): Promise<void>;

  /**
   * Closes the vector store connection.
   */
  close(): Promise<void>;
  
  /**
   * Upserts (inserts or updates) a batch of vector records.
   */
  upsert(records: VectorRecord[]): Promise<void>;

  /**
   * Queries the vector store for similar vectors.
   */
  query(query: VectorQuery): Promise<VectorQueryResult[]>;

  /**
   * Deletes a batch of vector records by ID.
   */
  delete(ids: string[], namespace?: string): Promise<void>;
}
