import { EmbeddingRequest, EmbeddingResponse, EmbeddingCapability } from './EmbeddingTypes';

export interface EmbeddingProvider {
  /**
   * Returns a list of capabilities supported by this provider.
   */
  getCapabilities(): EmbeddingCapability[];

  /**
   * Initializes the embedding provider.
   */
  initialize(): Promise<void>;

  /**
   * Closes the embedding provider.
   */
  close(): Promise<void>;

  /**
   * Generates embeddings for the given input.
   */
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}
