import type { Plan } from './Plan.js';
import type { PlanningContext } from './PlanningTypes.js';

export enum ValidationErrorType {
  CYCLE_DETECTED = 'CYCLE_DETECTED',
  MISSING_DEPENDENCY = 'MISSING_DEPENDENCY',
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  PERMISSION_VIOLATION = 'PERMISSION_VIOLATION',
  INPUT_BINDING_MISSING = 'INPUT_BINDING_MISSING',
  CONSTRAINT_EXCEEDED = 'CONSTRAINT_EXCEEDED',
  CONTRADICTORY_OPERATIONS = 'CONTRADICTORY_OPERATIONS'
}

export interface PlanValidationError {
  code: ValidationErrorType;
  stepId?: string;
  message: string;
  repairable: boolean;
  suggestedPatch?: Record<string, unknown>;
}

export interface PlanValidationResult {
  isValid: boolean;
  errors: PlanValidationError[];
  warnings: string[];
}

export interface PlanValidator {
  validate(plan: Plan, context?: PlanningContext): Promise<PlanValidationResult>;
}

export interface PlanRepairer {
  canRepair(validationResult: PlanValidationResult): boolean;
  applyRepair(plan: Plan, validationResult: PlanValidationResult): Promise<Plan>;
}
