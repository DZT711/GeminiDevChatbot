import { MemoryRecord, MemoryQuery, MemoryCapability, MemoryTransaction } from './MemoryTypes';

export interface MemoryProvider {
  /**
   * Returns a list of capabilities supported by this provider.
   */
  getCapabilities(): MemoryCapability[];

  /**
   * Initializes the memory provider (e.g., establishing DB connections).
   */
  initialize(): Promise<void>;

  /**
   * Closes the memory provider and cleans up resources.
   */
  close(): Promise<void>;

  /**
   * Creates a new memory record.
   */
  create(record: Omit<MemoryRecord, 'createdAt' | 'updatedAt'>): Promise<MemoryRecord>;

  /**
   * Retrieves a memory record by ID.
   */
  read(id: string, namespace?: string): Promise<MemoryRecord | null>;

  /**
   * Updates an existing memory record.
   */
  update(id: string, updates: Partial<Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<MemoryRecord>;

  /**
   * Deletes a memory record.
   */
  delete(id: string, namespace?: string): Promise<void>;

  /**
   * Queries for memory records matching the given criteria.
   */
  query(query: MemoryQuery): Promise<MemoryRecord[]>;

  /**
   * Begins a new transaction, if supported.
   * Throws an error if transactions are not supported.
   */
  beginTransaction(): Promise<MemoryTransaction>;
}
