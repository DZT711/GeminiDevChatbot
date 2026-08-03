/**
 * Purpose: Storage backend for agent memory.
 */
import { MemoryRecord } from './MemoryRecord';

export interface MemoryStore {
  save(record: MemoryRecord): Promise<void>;
  retrieve(id: string): Promise<MemoryRecord | undefined>;
}
