import { ReflectionRecord } from '../reflection/ReflectionTypes';

export enum LearningDecision {
  PROMOTE_TO_KNOWLEDGE = 'PROMOTE_TO_KNOWLEDGE',
  PROMOTE_TO_MEMORY = 'PROMOTE_TO_MEMORY',
  DISCARD = 'DISCARD',
  REQUIRES_HUMAN_APPROVAL = 'REQUIRES_HUMAN_APPROVAL'
}

export interface KnowledgePromotion {
  id: string;
  content: string;
  confidence: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface MemoryPromotion {
  id: string;
  content: string;
  importance: number;
  metadata?: Record<string, unknown>;
}

export interface LearningResult {
  decision: LearningDecision;
  knowledgePromotions: KnowledgePromotion[];
  memoryPromotions: MemoryPromotion[];
  reasoning: string;
}

export interface LearningRequest {
  reflection: ReflectionRecord;
  experienceContext?: string;
  metadata?: Record<string, unknown>;
}

export interface PlanReplanningEventRecord {
  stepId: string;
  failureCategory: string;
  action: 'RETRY' | 'REPAIR' | 'REPLAN' | 'ABORT' | string;
  reason?: string;
  recommendedAction?: string;
}

export interface PlanLifecycleObservation {
  planId: string;
  goalId: string;
  goalDescription?: string;
  executionId: string;
  sessionId?: string;
  workspaceId?: string;
  finalOutcome: 'COMPLETED' | 'FAILED' | 'ABORTED';
  completedStepIds: string[];
  failedStepIds: string[];
  repairedStepIds: string[];
  replanningEvents: PlanReplanningEventRecord[];
  modifiedFiles: string[];
  testOrVerificationSummary?: string;
  durationMs: number;
  error?: string;
}
