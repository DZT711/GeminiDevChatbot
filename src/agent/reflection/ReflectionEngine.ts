import { ReflectionRequest, ReflectionRecord } from './ReflectionTypes';

export interface ReflectionEngine {
  /**
   * Evaluates a completed execution and produces a reflection record.
   */
  reflect(request: ReflectionRequest): Promise<ReflectionRecord>;
}
