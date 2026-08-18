import { EmbeddingProvider } from '../../../../agent/retrieval/EmbeddingProvider.js';
import { EmbeddingRequest, EmbeddingResponse, EmbeddingCapability } from '../../../../agent/retrieval/EmbeddingTypes.js';
import { EMBEDDING_MODEL } from '../../../agent/agent.config.js';
import { di } from '../../../di.js';

export class DrizzleEmbeddingProvider implements EmbeddingProvider {
    constructor(
        private apiKey: string,
        private provider: string,
        private customBaseUrl?: string
    ) {}

    getCapabilities(): EmbeddingCapability[] {
        return [];
    }
    async initialize(): Promise<void> {}
    async close(): Promise<void> {}

    async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
        const aiInstance = di.llmService.getClient(this.apiKey, this.customBaseUrl, this.provider);
        const embedResponse = await aiInstance.models.embedContent({
            model: EMBEDDING_MODEL,
            contents: request.input,
            config: { outputDimensionality: 768 }
        });

        const embeddingVector = embedResponse.embeddings?.[0]?.values || [];
        return {
            embeddings: [embeddingVector as number[]],
            model: EMBEDDING_MODEL
        };
    }
}
