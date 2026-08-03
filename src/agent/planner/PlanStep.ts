import { ToolMetadata } from '../tools/ToolMetadata';

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  dependencies: string[];
  expectedInputs: string[];
  expectedOutputs: string[];
  requiredTools: ToolMetadata[];
  estimatedDurationMs?: number;
  riskLevel: RiskLevel;
  approvalRequired: boolean;
  validationRules: string[];
}
