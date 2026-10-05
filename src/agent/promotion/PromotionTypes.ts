import { LearningDecision } from '../learning/LearningTypes.js';

export type PromotionCategory =
  | 'TOOL_SELECTION'
  | 'PARAMETER_TUNING'
  | 'ERROR_AVOIDANCE'
  | 'FRAMEWORK_SPECIFIC'
  | 'GENERAL_HEURISTIC'
  | 'WORKFLOW_OPTIMIZATION';

export type PromotionStatus =
  | 'PENDING'
  | 'EVALUATING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PROMOTED';

export interface PromotionEvidence {
  sourceTool?: string;
  detectedMistakes?: string[];
  potentialImprovements?: string[];
  overallScore?: number;
  durationMs?: number;
  occurrences?: number;
  [key: string]: unknown;
}

export interface PromotionCandidate {
  id: string;
  sourceExperienceIds: string[];
  sourceReflectionId?: string;
  sourceTaskId?: string;
  sourceLearningDecision: LearningDecision;
  proposedContent: string;
  category: PromotionCategory;
  confidence: number;
  occurrenceCount: number;
  evidence: PromotionEvidence;
  rationale: string;
  tags: string[];
  status: PromotionStatus;
  createdAt: number;
  targetNamespace?: string;
  targetCollection?: string;
  rejectionReason?: string;
  metadata?: Record<string, unknown>;
}

export interface EvaluatedCriteria {
  minConfidencePassed: boolean;
  minScorePassed: boolean;
  minOccurrencesPassed: boolean;
  contentValid: boolean;
  notExplicitlyRejected: boolean;
  [key: string]: boolean;
}

export interface PromotionDecision {
  approved: boolean;
  status: 'APPROVED' | 'REJECTED';
  reason: string;
  evaluatedCriteria: EvaluatedCriteria;
  adjustedConfidence?: number;
}

export interface DurableBrainDestinationResult {
  persisted: boolean;
  destination: string;
  recordId?: string;
  auditLogId?: string;
  error?: string;
}

export interface DurableBrainDestination {
  persistCandidate(
    candidate: PromotionCandidate,
    decision: PromotionDecision
  ): Promise<DurableBrainDestinationResult>;
  recordRejection?(
    candidate: PromotionCandidate,
    decision: PromotionDecision
  ): Promise<void>;
}

export interface PromotionResult {
  candidateId: string;
  status: PromotionStatus;
  decision: PromotionDecision;
  promotedRecordId?: string;
  brainDestinationResult?: DurableBrainDestinationResult;
  error?: string;
}
