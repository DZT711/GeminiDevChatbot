import { EmbeddingProvider } from './EmbeddingProvider';
import { EmbeddingRequest, EmbeddingResponse, EmbeddingCapability } from './EmbeddingTypes';

export class DummyEmbeddingProvider implements EmbeddingProvider {
  private readonly defaultDimensions = 1536;

  getCapabilities(): EmbeddingCapability[] {
    return [EmbeddingCapability.BATCH_PROCESSING];
  }

  async initialize(): Promise<void> {}

  async close(): Promise<void> {}

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    const dimensions = request.dimensions || this.defaultDimensions;
    
    const embeddings = inputs.map(() => {
      return Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
    });

    return {
      embeddings,
      model: request.model || 'dummy-embedding-model',
      usage: {
        promptTokens: inputs.reduce((acc, str) => acc + str.length, 0),
        totalTokens: inputs.reduce((acc, str) => acc + str.length, 0)
      }
    };
  }
}
