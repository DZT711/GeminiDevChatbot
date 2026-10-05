export type BrainTaskProfile =
  | 'ROUTINE_CODING'
  | 'DEBUGGING'
  | 'REFACTORING'
  | 'ARCHITECTURE_CHANGE';

export type BrainLearningType =
  | 'New Knowledge'
  | 'Updated Lesson'
  | 'Added ADR'
  | 'Corrected Knowledge'
  | 'Rejected Proposal'
  | 'Archived Obsolete';

export type BrainAction =
  | 'Created'
  | 'Updated'
  | 'Deprecated'
  | 'Audited';

export type BrainConfidence = 'High' | 'Medium';

export type BrainDatabaseTarget =
  | 'Architecture & Modules'
  | 'Decisions'
  | 'Knowledge & Concepts'
  | 'Lessons & Bug Memory'
  | 'Execution Flows'
  | 'Tasks'
  | 'Experiments';

export interface BrainDecisionDetails {
  decision: string;
  reason: string;
  consequences: string;
  importance?: 'Critical' | 'High' | 'Medium';
}

export interface BrainCandidateLearning {
  id: string;
  title: string;
  learningType: BrainLearningType;
  targetDatabase: BrainDatabaseTarget;
  summary: string;
  evidence: string;
  confidence: BrainConfidence;
  moduleName?: string;
  reusableRule?: string;
  decisionDetails?: BrainDecisionDetails;
  sourceFiles?: string[];
  testEvidence?: string[];
  isDurable: boolean;
  metadata?: Record<string, unknown>;
}

export interface BrainAuditLog {
  name: string;
  date: string;
  task: string;
  learningType: BrainLearningType;
  action: BrainAction;
  targetPage: string;
  summary: string;
  evidence: string;
  confidence: BrainConfidence;
  agentIdentity: 'DevGenie Coding Agent';
}

export interface BrainContextModuleSummary {
  name: string;
  layer: string;
  path: string;
  summary: string;
}

export interface BrainContextLessonSummary {
  title: string;
  rule: string;
  module?: string;
}

export interface BrainContextDecisionSummary {
  title: string;
  status: string;
  summary: string;
}

export interface BrainContextFlowSummary {
  title: string;
  trigger: string;
}

export interface BrainContextSummary {
  taskProfile: BrainTaskProfile;
  relevantModules: BrainContextModuleSummary[];
  relevantLessons: BrainContextLessonSummary[];
  relevantDecisions: BrainContextDecisionSummary[];
  relevantFlows: BrainContextFlowSummary[];
  invariants: string[];
  formattedContext: string;
  tokenEstimate: number;
}

export interface BrainPromotionDecision {
  approved: boolean;
  reason: string;
  learningType: BrainLearningType;
  action: BrainAction;
}

export interface BrainWriteResult {
  success: boolean;
  targetDatabase: BrainDatabaseTarget;
  recordId?: string;
  auditLogId?: string;
  error?: string;
}
