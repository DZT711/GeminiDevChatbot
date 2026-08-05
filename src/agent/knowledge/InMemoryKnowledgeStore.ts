import { KnowledgeStore } from './KnowledgeStore';
import { KnowledgeRecord, KnowledgeQuery, KnowledgeCapability, KnowledgeTransaction, KnowledgeCollection } from './KnowledgeTypes';
import { KnowledgeNotFoundError, KnowledgeUnsupportedCapabilityError } from './KnowledgeErrors';
const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

export class InMemoryKnowledgeStore implements KnowledgeStore {
  private records: Map<string, KnowledgeRecord> = new Map();
  private collections: Map<string, KnowledgeCollection> = new Map();

  getCapabilities(): KnowledgeCapability[] {
    return [
      KnowledgeCapability.NAMESPACES,
      KnowledgeCapability.COLLECTIONS,
      KnowledgeCapability.RELATIONSHIPS,
      KnowledgeCapability.VERSIONING,
      KnowledgeCapability.METADATA,
      KnowledgeCapability.SEARCH
    ];
  }

  async initialize(): Promise<void> {}

  async close(): Promise<void> {
    this.records.clear();
    this.collections.clear();
  }

  async createRecord(recordData: Omit<KnowledgeRecord, 'createdAt' | 'updatedAt' | 'version'> & { id?: string }): Promise<KnowledgeRecord> {
    const now = Date.now();
    const id = recordData.id || generateId();
    const record: KnowledgeRecord = {
      ...recordData,
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      tags: recordData.tags || [],
      relationships: recordData.relationships || [],
      metadata: recordData.metadata || {}
    };
    this.records.set(record.id, record);
    return structuredClone(record);
  }

  async readRecord(id: string, namespace?: string): Promise<KnowledgeRecord | null> {
    const record = this.records.get(id);
    if (!record) return null;
    if (namespace && record.namespace !== namespace) return null;
    return structuredClone(record);
  }

  async updateRecord(id: string, updates: Partial<Omit<KnowledgeRecord, 'id' | 'createdAt' | 'updatedAt' | 'version'>>, namespace?: string): Promise<KnowledgeRecord> {
    const record = this.records.get(id);
    if (!record) {
      throw new KnowledgeNotFoundError(id, 'Record');
    }
    if (namespace && record.namespace !== namespace) {
      throw new KnowledgeNotFoundError(id, 'Record');
    }
    const updatedRecord: KnowledgeRecord = {
      ...record,
      ...updates,
      tags: updates.tags ? [...updates.tags] : record.tags,
      relationships: updates.relationships ? [...updates.relationships] : record.relationships,
      metadata: updates.metadata ? { ...record.metadata, ...updates.metadata } : record.metadata,
      version: record.version + 1,
      updatedAt: Date.now()
    };
    this.records.set(id, updatedRecord);
    return structuredClone(updatedRecord);
  }

  async deleteRecord(id: string, namespace?: string): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      if (namespace && record.namespace !== namespace) {
        return;
      }
      this.records.delete(id);
    }
  }

  async queryRecords(query: KnowledgeQuery): Promise<KnowledgeRecord[]> {
    let results = Array.from(this.records.values());

    if (query.namespace) {
      results = results.filter(r => r.namespace === query.namespace);
    }

    if (query.collection) {
      results = results.filter(r => r.collection === query.collection);
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(r => query.tags!.every(tag => r.tags.includes(tag)));
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
            case 'hasTag': return r.tags.includes(filter.value);
            case 'hasRelationship': return r.relationships.some(rel => rel.targetId === filter.value || rel.type === filter.value);
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
        return ((valA > valB ? 1 : (valA < valB ? -1 : 0))) * dir;
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

  async createCollection(collectionData: Omit<KnowledgeCollection, 'createdAt' | 'updatedAt'> & { id?: string }): Promise<KnowledgeCollection> {
    const now = Date.now();
    const id = collectionData.id || generateId();
    const collection: KnowledgeCollection = {
      ...collectionData,
      id,
      createdAt: now,
      updatedAt: now,
      metadata: collectionData.metadata || {}
    };
    this.collections.set(collection.id, collection);
    return structuredClone(collection);
  }

  async getCollection(id: string, namespace?: string): Promise<KnowledgeCollection | null> {
    const collection = this.collections.get(id);
    if (!collection) return null;
    if (namespace && collection.namespace !== namespace) return null;
    return structuredClone(collection);
  }

  async updateCollection(id: string, updates: Partial<Omit<KnowledgeCollection, 'id' | 'createdAt' | 'updatedAt'>>, namespace?: string): Promise<KnowledgeCollection> {
    const collection = this.collections.get(id);
    if (!collection) {
      throw new KnowledgeNotFoundError(id, 'Collection');
    }
    if (namespace && collection.namespace !== namespace) {
      throw new KnowledgeNotFoundError(id, 'Collection');
    }
    const updatedCollection: KnowledgeCollection = {
      ...collection,
      ...updates,
      metadata: updates.metadata ? { ...collection.metadata, ...updates.metadata } : collection.metadata,
      updatedAt: Date.now()
    };
    this.collections.set(id, updatedCollection);
    return structuredClone(updatedCollection);
  }

  async deleteCollection(id: string, namespace?: string): Promise<void> {
    const collection = this.collections.get(id);
    if (collection) {
      if (namespace && collection.namespace !== namespace) {
        return;
      }
      this.collections.delete(id);
    }
  }

  async beginTransaction(): Promise<KnowledgeTransaction> {
    throw new KnowledgeUnsupportedCapabilityError(KnowledgeCapability.TRANSACTIONS);
  }
}
