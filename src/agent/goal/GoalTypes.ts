export enum GoalIntent {
  CODE_MODIFICATION = 'CODE_MODIFICATION',
  INVESTIGATION = 'INVESTIGATION',
  TESTING_AND_VERIFICATION = 'TESTING_AND_VERIFICATION',
  INFRASTRUCTURE_OPS = 'INFRASTRUCTURE_OPS',
  INFORMATION_RETRIEVAL = 'INFORMATION_RETRIEVAL',
  GENERAL_CHAT = 'GENERAL_CHAT'
}

export enum GoalStatus {
  CREATED = 'CREATED',
  READY = 'READY',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  ABANDONED = 'ABANDONED'
}

export type SuccessCriterionAssertionType =
  | 'FILE_EXISTS'
  | 'LINT_PASSES'
  | 'BUILD_SUCCEEDS'
  | 'TEST_PASSES'
  | 'OUTPUT_CONTAINS'
  | 'CUSTOM';

export interface SuccessCriterion {
  id: string;
  description: string;
  assertionType: SuccessCriterionAssertionType;
  target?: string;
  expectedValue?: string;
  required?: boolean;
  metadata?: Record<string, unknown>;
}

export type GoalRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface GoalConstraints {
  maxSteps: number;
  maxExecutionTimeMs: number;
  forbiddenTools: string[];
  mandatoryTools: string[];
  maxRiskLevel: GoalRiskLevel;
  requireApprovalAboveRisk?: GoalRiskLevel;
  customConstraints?: Record<string, unknown>;
}

export interface GoalProvenance {
  sessionId?: string;
  userId?: string;
  requestId?: string;
  sourceMessageId?: string;
  parentGoalId?: string;
  rootGoalId?: string;
  workspaceId?: string;
  [key: string]: unknown;
}

export enum GoalPriority {
  VERY_LOW = 1,
  LOW = 2,
  MEDIUM = 3,
  HIGH = 4,
  CRITICAL = 5
}

export interface Goal {
  id: string;
  rawPrompt: string;
  intent: GoalIntent;
  title?: string;
  description: string;
  desiredOutcome: string;
  successCriteria: SuccessCriterion[];
  constraints: GoalConstraints;
  priority: number; // 1 to 5
  status: GoalStatus;
  provenance?: GoalProvenance;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface GoalUpdate {
  title?: string;
  description?: string;
  desiredOutcome?: string;
  successCriteria?: SuccessCriterion[];
  constraints?: Partial<GoalConstraints>;
  priority?: number;
  metadata?: Record<string, unknown>;
}
