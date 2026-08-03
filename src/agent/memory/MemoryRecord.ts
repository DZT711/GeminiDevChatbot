/**
 * Purpose: A single piece of stored memory.
 */
export interface MemoryRecord {
  id: string;
  content: string;
  timestamp: number;
  tags?: string[];
}
