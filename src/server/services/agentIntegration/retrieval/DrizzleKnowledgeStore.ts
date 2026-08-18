import { KnowledgeStore } from '../../../../agent/knowledge/KnowledgeStore.js';
import { KnowledgeRecord, KnowledgeQuery, KnowledgeCapability, KnowledgeTransaction, KnowledgeCollection } from '../../../../agent/knowledge/KnowledgeTypes.js';
import { txWithUser } from '../../../controllers/utils.js';
import { knowledgeNodes } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export class DrizzleKnowledgeStore implements KnowledgeStore {
    constructor(private userId: string) {}

    getCapabilities(): KnowledgeCapability[] { return []; }
    async initialize(): Promise<void> {}
    async close(): Promise<void> {}

    async createRecord(record: any): Promise<KnowledgeRecord> { throw new Error('Not implemented'); }
    
    async readRecord(id: string, namespace?: string): Promise<KnowledgeRecord | null> {
        return await txWithUser(this.userId, async (tx: any) => {
            const results = await tx.select().from(knowledgeNodes).where(eq(knowledgeNodes.id, id)).limit(1);
            if (results.length === 0) return null;
            const res = results[0];
            return {
                id: res.id,
                content: res.content,
                metadata: {
                    ...(res.metadata as Record<string, unknown>),
                    nodeType: res.nodeType
                },
                tags: [],
                relationships: [],
                createdAt: res.createdAt,
                updatedAt: res.createdAt,
                version: 1
            } as KnowledgeRecord;
        });
    }

    async updateRecord(id: string, updates: any, namespace?: string): Promise<KnowledgeRecord> { throw new Error('Not implemented'); }
    async deleteRecord(id: string, namespace?: string): Promise<void> { throw new Error('Not implemented'); }
    async queryRecords(query: KnowledgeQuery): Promise<KnowledgeRecord[]> { throw new Error('Not implemented'); }
    async createCollection(collection: any): Promise<KnowledgeCollection> { throw new Error('Not implemented'); }
    async getCollection(id: string, namespace?: string): Promise<KnowledgeCollection | null> { throw new Error('Not implemented'); }
    async updateCollection(id: string, updates: any, namespace?: string): Promise<KnowledgeCollection> { throw new Error('Not implemented'); }
    async deleteCollection(id: string, namespace?: string): Promise<void> { throw new Error('Not implemented'); }
    async beginTransaction(): Promise<KnowledgeTransaction> { throw new Error('Not implemented'); }
}
