export interface EmbeddingModel {
  id: string;
  dimensions: number;
  maxTokens: number;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
  dimensions?: number;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

export enum EmbeddingCapability {
  BATCH_PROCESSING = 'BATCH_PROCESSING',
  DIMENSIONALITY_REDUCTION = 'DIMENSIONALITY_REDUCTION'
}
