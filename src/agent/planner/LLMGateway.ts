import type { RiskLevel } from './PlanStep.js';

export interface LLMPlanStepProposal {
  taskId: string;
  title: string;
  description: string;
  dependencies: string[];
  expectedInputs?: string[];
  expectedOutputs?: string[];
  requiredTools?: string[];
  estimatedDurationMs?: number;
  riskLevel?: RiskLevel | string;
  approvalRequired?: boolean;
  validationRules?: string[];
  metadata?: Record<string, unknown>;
}

export interface LLMPlanProposal {
  steps: LLMPlanStepProposal[];
  executionOrder?: string[];
  approvalPoints?: string[];
  estimatedComplexity?: string;
  estimatedRisk?: string;
  rollbackHints?: string[];
  validationRequirements?: string[];
  assumptions?: string[];
}

export interface LLMPlanningPromptPayload {
  goalId?: string;
  objective: string;
  tasks: Array<{
    id: string;
    description: string;
    dependencies: string[];
    riskLevel?: string;
    requiredTools?: string[];
  }>;
  availableTools?: Array<{
    name: string;
    description: string;
    riskLevel?: string;
  }>;
  constraints?: Record<string, unknown>;
  contextNotes?: string[];
}

export interface LLMGateway {
  proposePlan(
    payload: LLMPlanningPromptPayload | string,
    schema?: Record<string, unknown>
  ): Promise<LLMPlanProposal | string>;
}
