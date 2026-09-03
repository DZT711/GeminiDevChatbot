import type { ToolMetadata } from '../tools/ToolMetadata.js';

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface PlanStep {
  id: string;
  taskId?: string;
  title: string;
  description: string;
  dependencies: string[];
  expectedInputs: string[];
  expectedOutputs: string[];
  requiredTools: (ToolMetadata | string)[];
  estimatedDurationMs?: number;
  riskLevel: RiskLevel;
  approvalRequired: boolean;
  validationRules: string[];
  metadata?: Record<string, unknown>;
}

