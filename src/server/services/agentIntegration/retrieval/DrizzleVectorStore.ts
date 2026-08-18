import { VectorStore } from '../../../../agent/retrieval/VectorStore.js';
import { VectorRecord, VectorQuery, VectorQueryResult, VectorCapability } from '../../../../agent/retrieval/VectorTypes.js';
import { txWithUser } from '../../../controllers/utils.js';
import { knowledgeNodes } from '../../../db/schema.js';
import { cosineDistance } from 'drizzle-orm';

export class DrizzleVectorStore implements VectorStore {
    constructor(private userId: string) {}

    getCapabilities(): VectorCapability[] {
        return [VectorCapability.COSINE_SIMILARITY];
    }
    async initialize(): Promise<void> {}
    async close(): Promise<void> {}

    async upsert(records: VectorRecord[]): Promise<void> {
        throw new Error('Not implemented');
    }

    async query(query: VectorQuery): Promise<VectorQueryResult[]> {
        return await txWithUser(this.userId, async (tx: any) => {
            const results = await tx.select({
                id: knowledgeNodes.id,
                metadata: knowledgeNodes.metadata,
                similarity: cosineDistance(knowledgeNodes.embedding, query.vector)
            })
            .from(knowledgeNodes)
            .orderBy(cosineDistance(knowledgeNodes.embedding, query.vector))
            .limit(query.topK || 5);

            return results.map((res: any) => ({
                record: {
                    id: res.id,
                    vector: [],
                    metadata: res.metadata
                },
                score: 1 - res.similarity
            }));
        });
    }

    async delete(ids: string[], namespace?: string): Promise<void> {
        throw new Error('Not implemented');
    }
}
