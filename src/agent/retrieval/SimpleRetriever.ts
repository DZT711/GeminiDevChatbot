import { Retriever } from './Retriever';
import { RetrieverRequest, RetrieverResult } from './RetrieverTypes';
import { EmbeddingProvider } from './EmbeddingProvider';
import { VectorStore } from './VectorStore';

export class SimpleRetriever implements Retriever {
  constructor(
    private embeddingProvider: EmbeddingProvider,
    private vectorStore: VectorStore
  ) {}

  async retrieve(request: RetrieverRequest): Promise<RetrieverResult[]> {
    const topK = request.topK || 5;

    // 1. Generate Embeddings
    const embeddingResponse = await this.embeddingProvider.embed({
      input: request.query
    });

    if (!embeddingResponse.embeddings || embeddingResponse.embeddings.length === 0) {
      return [];
    }

    const queryVector = embeddingResponse.embeddings[0];

    // 2. Query Vector Store
    const vectorResults = await this.vectorStore.query({
      vector: queryVector,
      topK,
      namespace: request.namespace,
      filters: request.filters,
      minScore: request.minScore
    });

    // 3. Map to RetrieverResult
    return vectorResults.map(result => ({
      id: result.record.id,
      score: result.score,
      metadata: result.record.metadata
    }));
  }
}
