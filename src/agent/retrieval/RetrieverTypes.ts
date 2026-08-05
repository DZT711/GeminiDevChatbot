import { VectorFilter } from './VectorTypes';

export interface RetrieverRequest {
  query: string;
  topK?: number;
  namespace?: string;
  filters?: RetrieverFilter[];
  minScore?: number;
}

export type RetrieverFilter = VectorFilter;

export interface RetrieverResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface RetrieverStrategy {
  type: string;
  parameters?: Record<string, unknown>;
}

export interface RetrieverRanking {
  scoreThreshold?: number;
  rerankingModel?: string;
}
