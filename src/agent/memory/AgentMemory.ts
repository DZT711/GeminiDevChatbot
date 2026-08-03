/**
 * Purpose: Agent-specific memory store, separate from chat history.
 */
import { MemoryRecord } from './MemoryRecord';

export interface AgentMemory {
  addRecord(record: MemoryRecord): Promise<void>;
  search(query: string): Promise<MemoryRecord[]>;
}
