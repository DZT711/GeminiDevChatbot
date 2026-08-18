import { SimpleRetriever } from '../../../../agent/retrieval/SimpleRetriever.js';
import { RetrieverRequest } from '../../../../agent/retrieval/RetrieverTypes.js';
import { DrizzleEmbeddingProvider } from './DrizzleEmbeddingProvider.js';
import { DrizzleVectorStore } from './DrizzleVectorStore.js';
import { DrizzleKnowledgeStore } from './DrizzleKnowledgeStore.js';
import { KnowledgeRecord } from '../../../../agent/knowledge/KnowledgeTypes.js';

export interface RetrievedDocument {
    record: KnowledgeRecord;
    score: number;
}

export class RetrieverIntegrationService {
    private retriever: SimpleRetriever;
    private knowledgeStore: DrizzleKnowledgeStore;

    constructor(
        private userId: string,
        apiKey: string,
        provider: string,
        customBaseUrl?: string
    ) {
        const embeddingProvider = new DrizzleEmbeddingProvider(apiKey, provider, customBaseUrl);
        const vectorStore = new DrizzleVectorStore(userId);
        this.retriever = new SimpleRetriever(embeddingProvider, vectorStore);
        this.knowledgeStore = new DrizzleKnowledgeStore(userId);
    }

    async retrieveContexts(query: string, limit: number = 5): Promise<RetrievedDocument[]> {
        const request: RetrieverRequest = {
            query,
            topK: limit
        };

        const results = await this.retriever.retrieve(request);
        const documents: RetrievedDocument[] = [];

        for (const res of results) {
            const record = await this.knowledgeStore.readRecord(res.id);
            if (record) {
                documents.push({
                    record,
                    score: res.score
                });
            }
        }

        return documents;
    }
}
