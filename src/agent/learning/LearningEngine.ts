import { LearningRequest, LearningResult } from './LearningTypes';

export interface LearningEngine {
  /**
   * Processes an experience/reflection and decides what information should be promoted
   * to long-term memory or permanent knowledge.
   */
  learn(request: LearningRequest): Promise<LearningResult>;
}
