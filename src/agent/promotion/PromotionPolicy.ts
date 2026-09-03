import { LearningDecision } from '../learning/LearningTypes.js';
import { PromotionCandidate, PromotionDecision, EvaluatedCriteria } from './PromotionTypes.js';

export interface PromotionPolicyConfig {
  minConfidence: number;
  minOverallScore: number;
  minOccurrences: number;
  minContentLength: number;
  disallowedTags: string[];
}

export const DEFAULT_PROMOTION_POLICY_CONFIG: PromotionPolicyConfig = {
  minConfidence: 0.70,
  minOverallScore: 60,
  minOccurrences: 1,
  minContentLength: 10,
  disallowedTags: ['draft', 'temporary', 'unverified', 'broken', 'deprecated']
};

export interface PromotionPolicy {
  evaluate(candidate: PromotionCandidate): PromotionDecision;
}

export class RuleBasedPromotionPolicy implements PromotionPolicy {
  private config: PromotionPolicyConfig;

  constructor(config: Partial<PromotionPolicyConfig> = {}) {
    this.config = {
      ...DEFAULT_PROMOTION_POLICY_CONFIG,
      ...config
    };
  }

  public evaluate(candidate: PromotionCandidate): PromotionDecision {
    const evaluatedCriteria: EvaluatedCriteria = {
      minConfidencePassed: false,
      minScorePassed: false,
      minOccurrencesPassed: false,
      contentValid: false,
      notExplicitlyRejected: false
    };

    // 1. Content validity check
    const content = candidate.proposedContent ? candidate.proposedContent.trim() : '';
    if (content.length >= this.config.minContentLength) {
      evaluatedCriteria.contentValid = true;
    } else {
      return {
        approved: false,
        status: 'REJECTED',
        reason: `Proposed content length (${content.length}) is below minimum required (${this.config.minContentLength}).`,
        evaluatedCriteria
      };
    }

    // 2. Explicit rejection checks
    if (candidate.sourceLearningDecision === LearningDecision.REQUIRES_HUMAN_APPROVAL) {
      return {
        approved: false,
        status: 'REJECTED',
        reason: 'Candidate requires human approval before knowledge promotion.',
        evaluatedCriteria
      };
    }

    if (candidate.sourceLearningDecision === LearningDecision.DISCARD) {
      return {
        approved: false,
        status: 'REJECTED',
        reason: 'Source learning decision is DISCARD.',
        evaluatedCriteria
      };
    }

    const hasDisallowedTag = candidate.tags.some(tag => 
      this.config.disallowedTags.includes(tag.toLowerCase())
    );
    if (hasDisallowedTag) {
      return {
        approved: false,
        status: 'REJECTED',
        reason: 'Candidate contains one or more disallowed tags.',
        evaluatedCriteria
      };
    }

    evaluatedCriteria.notExplicitlyRejected = true;

    // 3. Confidence threshold check
    if (candidate.confidence >= this.config.minConfidence) {
      evaluatedCriteria.minConfidencePassed = true;
    } else {
      return {
        approved: false,
        status: 'REJECTED',
        reason: `Confidence (${candidate.confidence.toFixed(2)}) is below threshold (${this.config.minConfidence.toFixed(2)}).`,
        evaluatedCriteria
      };
    }

    // 4. Execution score / Evidence check
    const overallScore = candidate.evidence.overallScore;
    if (candidate.category === 'ERROR_AVOIDANCE') {
      // For error avoidance heuristics, the source execution might have a low score,
      // but confidence must be solid and detected mistakes must exist.
      const hasMistakeEvidence = Array.isArray(candidate.evidence.detectedMistakes) && candidate.evidence.detectedMistakes.length > 0;
      if (hasMistakeEvidence || (overallScore !== undefined && overallScore >= this.config.minOverallScore)) {
        evaluatedCriteria.minScorePassed = true;
      } else {
        return {
          approved: false,
          status: 'REJECTED',
          reason: 'Error avoidance candidate lacks detected mistakes or sufficient evidence.',
          evaluatedCriteria
        };
      }
    } else {
      if (overallScore === undefined || overallScore >= this.config.minOverallScore) {
        evaluatedCriteria.minScorePassed = true;
      } else {
        return {
          approved: false,
          status: 'REJECTED',
          reason: `Execution reflection score (${overallScore}) is below minimum required (${this.config.minOverallScore}).`,
          evaluatedCriteria
        };
      }
    }

    // 5. Occurrence threshold check
    const occurrences = candidate.occurrenceCount ?? 1;
    if (occurrences >= this.config.minOccurrences) {
      evaluatedCriteria.minOccurrencesPassed = true;
    } else {
      return {
        approved: false,
        status: 'REJECTED',
        reason: `Occurrence count (${occurrences}) is below threshold (${this.config.minOccurrences}).`,
        evaluatedCriteria
      };
    }

    return {
      approved: true,
      status: 'APPROVED',
      reason: 'Candidate satisfies all policy evaluation criteria.',
      evaluatedCriteria,
      adjustedConfidence: candidate.confidence
    };
  }
}
