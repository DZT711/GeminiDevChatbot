import type { ExecutionContext, ExecutionEnvironment } from '../runtime/ExecutionContext';
import type { ToolMetadata } from '../tools/ToolMetadata';
import type { Plan } from './Plan';

export interface PlanningConstraints {
  maxSteps?: number;
  maxParallelism?: number;
  forbiddenTools?: string[];
  mandatoryTools?: string[];
  requireApprovalForRiskAbove?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface PlanningContext {
  userGoal: string;
  executionContext: ExecutionContext;
  environment: ExecutionEnvironment;
  availableTools: ToolMetadata[];
  configuration: Record<string, unknown>;
  featureFlags: Record<string, boolean>;
  constraints: PlanningConstraints;
}

export interface PlanningExecutionMetadata {
  estimatedTotalDurationMs?: number;
  overallRiskLevel?: string;
  [key: string]: unknown;
}

export interface PlanningResult {
  success: boolean;
  plan?: Plan;
  errors?: string[];
  warnings?: string[];
}

export interface PlanningStrategy {
  generatePlan(context: PlanningContext): Promise<PlanningResult>;
}
