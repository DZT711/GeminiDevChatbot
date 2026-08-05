import { MemoryProvider } from './MemoryProvider';
import { MemoryRecord, MemoryQuery, MemoryCapability, MemoryTransaction } from './MemoryTypes';
import { MemoryNotFoundError, MemoryUnsupportedCapabilityError } from './MemoryErrors';

export class InMemoryMemoryProvider implements MemoryProvider {
  private records: Map<string, MemoryRecord> = new Map();

  getCapabilities(): MemoryCapability[] {
    return [
      MemoryCapability.FILTER_BY_METADATA,
      MemoryCapability.SORTING,
      MemoryCapability.PAGINATION
    ];
  }

  async initialize(): Promise<void> {}

  async close(): Promise<void> {
    this.records.clear();
  }

  async create(recordData: Omit<MemoryRecord, 'createdAt' | 'updatedAt'>): Promise<MemoryRecord> {
    const now = Date.now();
    const record: MemoryRecord = {
      ...recordData,
      createdAt: now,
      updatedAt: now
    };
    this.records.set(record.id, record);
    return structuredClone(record);
  }

  async read(id: string, namespace?: string): Promise<MemoryRecord | null> {
    const record = this.records.get(id);
    if (!record) return null;
    if (namespace && record.namespace !== namespace) return null;
    return structuredClone(record);
  }

  async update(id: string, updates: Partial<Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<MemoryRecord> {
    const record = this.records.get(id);
    if (!record) {
      throw new MemoryNotFoundError(id);
    }
    const updatedRecord: MemoryRecord = {
      ...record,
      ...updates,
      metadata: updates.metadata ? { ...record.metadata, ...updates.metadata } : record.metadata,
      updatedAt: Date.now()
    };
    this.records.set(id, updatedRecord);
    return structuredClone(updatedRecord);
  }

  async delete(id: string, namespace?: string): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      if (namespace && record.namespace !== namespace) {
        return;
      }
      this.records.delete(id);
    }
  }

  async query(query: MemoryQuery): Promise<MemoryRecord[]> {
    let results = Array.from(this.records.values());

    if (query.namespace) {
      results = results.filter(r => r.namespace === query.namespace);
    }

    if (query.filters && query.filters.length > 0) {
      for (const filter of query.filters) {
        results = results.filter(r => {
          let value: any = r;
          const parts = filter.field.split('.');
          for (const part of parts) {
            if (value === undefined || value === null) break;
            value = value[part];
          }

          switch (filter.operator) {
            case 'eq': return value === filter.value;
            case 'neq': return value !== filter.value;
            case 'gt': return value > filter.value;
            case 'gte': return value >= filter.value;
            case 'lt': return value < filter.value;
            case 'lte': return value <= filter.value;
            case 'in': return Array.isArray(filter.value) && filter.value.includes(value);
            case 'contains': return Array.isArray(value) && value.includes(filter.value);
            default: return true;
          }
        });
      }
    }

    if (query.sortBy) {
      const field = query.sortBy;
      const dir = query.sortDirection === 'desc' ? -1 : 1;
      results.sort((a, b) => {
        const valA = (a as any)[field] as number;
        const valB = (b as any)[field] as number;
        return (valA - valB) * dir;
      });
    }

    if (query.offset) {
      results = results.slice(query.offset);
    }
    
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results.map(r => structuredClone(r));
  }

  async beginTransaction(): Promise<MemoryTransaction> {
    throw new MemoryUnsupportedCapabilityError(MemoryCapability.TRANSACTIONS);
  }
}
