import { VectorStore } from './VectorStore';
import { VectorRecord, VectorQuery, VectorQueryResult, VectorCapability } from './VectorTypes';

export class InMemoryVectorStore implements VectorStore {
  private records: Map<string, VectorRecord> = new Map();

  getCapabilities(): VectorCapability[] {
    return [
      VectorCapability.NAMESPACES,
      VectorCapability.METADATA_FILTERING,
      VectorCapability.COSINE_SIMILARITY
    ];
  }

  async initialize(): Promise<void> {}

  async close(): Promise<void> {
    this.records.clear();
  }

  async upsert(records: VectorRecord[]): Promise<void> {
    for (const record of records) {
      this.records.set(record.id, record);
    }
  }

  async query(query: VectorQuery): Promise<VectorQueryResult[]> {
    let filteredRecords = Array.from(this.records.values());

    if (query.namespace) {
      filteredRecords = filteredRecords.filter(r => r.namespace === query.namespace);
    }

    if (query.filters && query.filters.length > 0) {
      for (const filter of query.filters) {
        filteredRecords = filteredRecords.filter(r => {
          if (!r.metadata) return false;
          let value: any = r.metadata;
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
            default: return true;
          }
        });
      }
    }

    const results: VectorQueryResult[] = filteredRecords.map(record => ({
      record,
      score: this.cosineSimilarity(query.vector, record.vector)
    }));

    if (query.minScore !== undefined) {
      const minScore = query.minScore;
      return results
        .filter(r => r.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, query.topK);
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, query.topK);
  }

  async delete(ids: string[], namespace?: string): Promise<void> {
    for (const id of ids) {
      const record = this.records.get(id);
      if (record) {
        if (namespace && record.namespace !== namespace) {
          continue;
        }
        this.records.delete(id);
      }
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
