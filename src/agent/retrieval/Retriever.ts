import { RetrieverRequest, RetrieverResult } from './RetrieverTypes';

export interface Retriever {
  /**
   * Retrieves relevant results based on the provided request.
   */
  retrieve(request: RetrieverRequest): Promise<RetrieverResult[]>;
}
