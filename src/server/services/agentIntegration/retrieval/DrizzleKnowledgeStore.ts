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

    async createRecord(record: Omit<KnowledgeRecord, 'createdAt' | 'updatedAt' | 'version'>): Promise<KnowledgeRecord> {
        return await txWithUser(this.userId, async (tx: any) => {
            const [insertedNode] = await tx.insert(knowledgeNodes).values({
                content: typeof record.content === 'string' ? record.content : JSON.stringify(record.content),
                nodeType: 'skill',
                metadata: {
                    ...(record.metadata || {}),
                    namespace: record.namespace,
                    collection: record.collection,
                    tags: record.tags || [],
                    relationships: record.relationships || [],
                    confidence: record.confidence
                }
            }).returning();
            
            const now = insertedNode.createdAt ? new Date(insertedNode.createdAt).getTime() : Date.now();
            return {
                id: insertedNode.id,
                content: insertedNode.content,
                namespace: record.namespace,
                collection: record.collection,
                metadata: (insertedNode.metadata as Record<string, unknown>) || {},
                tags: record.tags || [],
                relationships: record.relationships || [],
                createdAt: now,
                updatedAt: now,
                version: 1,
                confidence: record.confidence
            };
        });
    }
    
    async readRecord(id: string, namespace?: string): Promise<KnowledgeRecord | null> {
        return await txWithUser(this.userId, async (tx: any) => {
            const results = await tx.select().from(knowledgeNodes).where(eq(knowledgeNodes.id, id)).limit(1);
            if (results.length === 0) return null;
            const res = results[0];
            const meta = (res.metadata as Record<string, unknown>) || {};
            const now = res.createdAt ? new Date(res.createdAt).getTime() : Date.now();
            return {
                id: res.id,
                content: res.content,
                namespace: (meta.namespace as string) || namespace || 'default',
                collection: (meta.collection as string) || 'default',
                metadata: {
                    ...meta,
                    nodeType: res.nodeType
                },
                tags: (meta.tags as string[]) || [],
                relationships: (meta.relationships as any[]) || [],
                createdAt: now,
                updatedAt: now,
                version: 1,
                confidence: (meta.confidence as number) || 1.0
            } as KnowledgeRecord;
        });
    }

    async updateRecord(id: string, updates: any, namespace?: string): Promise<KnowledgeRecord> { throw new Error('Not implemented'); }
    async deleteRecord(id: string, namespace?: string): Promise<void> { throw new Error('Not implemented'); }
    async queryRecords(query: KnowledgeQuery): Promise<KnowledgeRecord[]> {
        return await txWithUser(this.userId, async (tx: any) => {
            const results = await tx.select().from(knowledgeNodes).limit(query.limit || 50);
            return results.map((res: any) => {
                const meta = (res.metadata as Record<string, unknown>) || {};
                const now = res.createdAt ? new Date(res.createdAt).getTime() : Date.now();
                return {
                    id: res.id,
                    content: res.content,
                    namespace: (meta.namespace as string) || 'default',
                    collection: (meta.collection as string) || 'default',
                    metadata: meta,
                    tags: (meta.tags as string[]) || [],
                    relationships: (meta.relationships as any[]) || [],
                    createdAt: now,
                    updatedAt: now,
                    version: 1,
                    confidence: (meta.confidence as number) || 1.0
                };
            });
        });
    }
    async createCollection(collection: any): Promise<KnowledgeCollection> { throw new Error('Not implemented'); }
    async getCollection(id: string, namespace?: string): Promise<KnowledgeCollection | null> { throw new Error('Not implemented'); }
    async updateCollection(id: string, updates: any, namespace?: string): Promise<KnowledgeCollection> { throw new Error('Not implemented'); }
    async deleteCollection(id: string, namespace?: string): Promise<void> { throw new Error('Not implemented'); }
    async beginTransaction(): Promise<KnowledgeTransaction> { throw new Error('Not implemented'); }
}
