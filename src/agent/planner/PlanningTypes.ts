import type { ExecutionContext, ExecutionEnvironment } from '../runtime/ExecutionContext.js';
import type { ToolMetadata } from '../tools/ToolMetadata.js';
import type { Goal } from '../goal/GoalTypes.js';
import type { TaskGraph } from './TaskGraphTypes.js';
import type { Plan } from './Plan.js';

export enum StrategyType {
  RULE_BASED = 'RULE_BASED',
  LLM = 'LLM',
  HYBRID = 'HYBRID',
  CUSTOM = 'CUSTOM'
}

export interface PlanningConstraints {
  maxSteps?: number;
  maxParallelism?: number;
  maxExecutionTimeMs?: number;
  maxRiskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  forbiddenTools?: string[];
  mandatoryTools?: string[];
  requireApprovalForRiskAbove?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface PlanningKnowledgeItem {
  id: string;
  content: string;
  category?: string;
  confidence?: number;
}

export interface PlanningExperienceItem {
  id: string;
  summary: string;
  lessonLearned?: string;
  relevanceScore?: number;
}

export interface PlanningContext {
  goal?: Goal;
  userGoal?: string;
  taskGraph?: TaskGraph;
  executionContext?: ExecutionContext;
  environment?: ExecutionEnvironment;
  availableTools?: ToolMetadata[];
  configuration?: Record<string, unknown>;
  featureFlags?: Record<string, boolean>;
  constraints?: PlanningConstraints;
  knowledgeContext?: PlanningKnowledgeItem[];
  experienceContext?: PlanningExperienceItem[];
  preferredStrategy?: StrategyType | string;
}

export interface PlanningExecutionMetadata {
  estimatedTotalDurationMs?: number;
  overallRiskLevel?: string;
  strategyUsed?: string;
  strategyVersion?: string;
  assumptions?: string[];
  [key: string]: unknown;
}

export interface PlanningResult {
  success: boolean;
  plan?: Plan;
  errors?: string[];
  warnings?: string[];
  strategyUsed?: string;
  metadata?: Record<string, unknown>;
}

export interface PlanningStrategy {
  readonly name: string;
  readonly version?: string;
  generatePlan(context: PlanningContext): Promise<PlanningResult>;
  createPlan?(context: PlanningContext): Promise<PlanningResult>;
}

export interface StrategySelector {
  selectStrategy(context: PlanningContext): PlanningStrategy;
}


