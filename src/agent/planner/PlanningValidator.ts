import type { Plan } from './Plan.js';
import type { PlanStep } from './PlanStep.js';
import { RiskLevel } from './PlanStep.js';
import type { PlanningContext, PlanningConstraints } from './PlanningTypes.js';
import type { TaskGraph } from './TaskGraphTypes.js';
import {
  ValidationErrorType,
  PlanValidationError,
  PlanValidationResult,
  PlanValidator
} from './PlanValidationTypes.js';

const RISK_LEVEL_ORDER: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

function compareRisk(a?: string, b?: string): number {
  const scoreA = RISK_LEVEL_ORDER[(a || 'LOW').toUpperCase()] || 1;
  const scoreB = RISK_LEVEL_ORDER[(b || 'LOW').toUpperCase()] || 1;
  return scoreA - scoreB;
}

export interface LegacyValidationResult {
  isValid: boolean;
  errors: string[];
}

export class PlanningValidator implements PlanValidator {
  /**
   * Legacy static validation method for TaskGraph
   */
  public static validate(graph: TaskGraph): LegacyValidationResult {
    const errors: string[] = [];

    for (const [stepId, node] of graph.nodes.entries()) {
      for (const dep of node.dependencies) {
        if (!graph.nodes.has(dep)) {
          errors.push(`Step '${stepId}' depends on missing step '${dep}'.`);
        }
      }
    }

    if (!graph.isAcyclic()) {
      errors.push('Circular dependencies detected in the task graph.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 7-Stage Pre-flight Plan Validation
   */
  public async validate(plan: Plan, context?: PlanningContext): Promise<PlanValidationResult> {
    const errors: PlanValidationError[] = [];
    const warnings: string[] = [];

    if (!plan) {
      return {
        isValid: false,
        errors: [{
          code: ValidationErrorType.CONSTRAINT_EXCEEDED,
          message: 'Plan object is undefined or null.',
          repairable: false
        }],
        warnings: []
      };
    }

    const steps = plan.steps || [];
    const stepMap = new Map<string, PlanStep>(steps.map(s => [s.id, s]));
    const executionOrder = plan.executionOrder || (plan.taskGraph?.getTopologicalOrder ? plan.taskGraph.getTopologicalOrder() : []);
    const stepOrderIndex = new Map<string, number>();
    executionOrder.forEach((id, idx) => stepOrderIndex.set(id, idx));

    const constraints: PlanningConstraints = {
      ...(context?.constraints || {}),
      ...(context?.goal?.constraints ? {
        maxSteps: context.goal.constraints.maxSteps,
        maxExecutionTimeMs: context.goal.constraints.maxExecutionTimeMs,
        forbiddenTools: context.goal.constraints.forbiddenTools,
        mandatoryTools: context.goal.constraints.mandatoryTools,
        maxRiskLevel: context.goal.constraints.maxRiskLevel as any
      } : {})
    };

    // ==========================================
    // Stage 1: Graph Acyclicity Check
    // ==========================================
    if (plan.taskGraph && typeof plan.taskGraph.isAcyclic === 'function') {
      if (!plan.taskGraph.isAcyclic()) {
        errors.push({
          code: ValidationErrorType.CYCLE_DETECTED,
          message: 'Cycle detected in Plan task graph.',
          repairable: true,
          suggestedPatch: { action: 'BREAK_CYCLE' }
        });
      }
    } else {
      // Validate step dependency graph acyclicity via DFS
      const visited = new Set<string>();
      const recStack = new Set<string>();

      const checkCycle = (nodeId: string, path: string[]): boolean => {
        visited.add(nodeId);
        recStack.add(nodeId);

        const step = stepMap.get(nodeId);
        if (step && step.dependencies) {
          for (const depId of step.dependencies) {
            if (!visited.has(depId)) {
              if (checkCycle(depId, [...path, depId])) return true;
            } else if (recStack.has(depId)) {
              errors.push({
                code: ValidationErrorType.CYCLE_DETECTED,
                stepId: nodeId,
                message: `Circular dependency detected between '${nodeId}' and '${depId}' (Cycle path: ${[...path, depId].join(' -> ')}).`,
                repairable: true,
                suggestedPatch: { brokenEdge: { from: nodeId, to: depId } }
              });
              return true;
            }
          }
        }

        recStack.delete(nodeId);
        return false;
      };

      for (const step of steps) {
        if (!visited.has(step.id)) {
          checkCycle(step.id, [step.id]);
        }
      }
    }

    // ==========================================
    // Stage 2: Dependency Completeness Check
    // ==========================================
    for (const step of steps) {
      for (const depId of step.dependencies || []) {
        if (!stepMap.has(depId)) {
          errors.push({
            code: ValidationErrorType.MISSING_DEPENDENCY,
            stepId: step.id,
            message: `Step '${step.id}' references missing dependency step '${depId}'.`,
            repairable: true,
            suggestedPatch: {
              missingStepId: depId,
              referencingStepId: step.id,
              action: 'INJECT_MISSING_PREREQUISITE'
            }
          });
        }
      }
    }

    // ==========================================
    // Stage 3: Tool Registration & Availability
    // ==========================================
    const availableToolNames = new Set(
      (context?.availableTools || []).map(t => t.name.toLowerCase())
    );

    if (availableToolNames.size > 0) {
      for (const step of steps) {
        for (const reqTool of step.requiredTools || []) {
          const toolName = typeof reqTool === 'string' ? reqTool : reqTool.name;
          if (toolName && !availableToolNames.has(toolName.toLowerCase())) {
            errors.push({
              code: ValidationErrorType.TOOL_NOT_FOUND,
              stepId: step.id,
              message: `Step '${step.id}' requires unavailable tool '${toolName}'.`,
              repairable: false,
              suggestedPatch: { requestedTool: toolName }
            });
          }
        }
      }
    }

    // ==========================================
    // Stage 4: Permission & Risk Limits Check
    // ==========================================
    const forbiddenTools = new Set((constraints.forbiddenTools || []).map(t => t.toLowerCase()));
    const approvalThreshold = constraints.requireApprovalForRiskAbove || 'HIGH';
    const planApprovalSet = new Set(plan.approvalPoints || []);

    for (const step of steps) {
      // Forbidden tools
      for (const reqTool of step.requiredTools || []) {
        const toolName = typeof reqTool === 'string' ? reqTool : reqTool.name;
        if (toolName && forbiddenTools.has(toolName.toLowerCase())) {
          errors.push({
            code: ValidationErrorType.PERMISSION_VIOLATION,
            stepId: step.id,
            message: `Step '${step.id}' uses forbidden tool '${toolName}'.`,
            repairable: false,
            suggestedPatch: { forbiddenTool: toolName }
          });
        }
      }

      // Risk ceiling
      if (constraints.maxRiskLevel && compareRisk(step.riskLevel, constraints.maxRiskLevel) > 0) {
        errors.push({
          code: ValidationErrorType.PERMISSION_VIOLATION,
          stepId: step.id,
          message: `Step '${step.id}' risk level '${step.riskLevel}' exceeds maximum allowed risk '${constraints.maxRiskLevel}'.`,
          repairable: false,
          suggestedPatch: { stepRisk: step.riskLevel, maxAllowed: constraints.maxRiskLevel }
        });
      }

      // Approval point consistency
      const needsApproval = compareRisk(step.riskLevel, approvalThreshold) >= 0 || Boolean(step.approvalRequired);
      if (needsApproval && !planApprovalSet.has(step.id)) {
        warnings.push(`Step '${step.id}' requires user approval but is not registered in plan.approvalPoints.`);
      }
    }

    // ==========================================
    // Stage 5: Input/Output Binding Soundness
    // ==========================================
    // Map of output key -> step producing it
    const outputProducers = new Map<string, string>();
    for (const step of steps) {
      for (const out of step.expectedOutputs || []) {
        outputProducers.set(out, step.id);
      }
    }

    for (const step of steps) {
      const consumerIdx = stepOrderIndex.get(step.id) ?? -1;
      for (const inputKey of step.expectedInputs || []) {
        if (outputProducers.has(inputKey)) {
          const producerId = outputProducers.get(inputKey)!;
          const producerIdx = stepOrderIndex.get(producerId) ?? -1;
          if (producerIdx !== -1 && consumerIdx !== -1 && producerIdx > consumerIdx) {
            errors.push({
              code: ValidationErrorType.INPUT_BINDING_MISSING,
              stepId: step.id,
              message: `Step '${step.id}' requires input '${inputKey}' before its producer '${producerId}' has executed in execution order.`,
              repairable: true,
              suggestedPatch: { inputKey, producerId, consumerId: step.id, action: 'REORDER_STEPS' }
            });
          }
        }
      }
    }

    // ==========================================
    // Stage 6: Step & Resource Constraints Check
    // ==========================================
    if (constraints.maxSteps !== undefined && steps.length > constraints.maxSteps) {
      errors.push({
        code: ValidationErrorType.CONSTRAINT_EXCEEDED,
        message: `Plan step count (${steps.length}) exceeds maxSteps constraint (${constraints.maxSteps}).`,
        repairable: false,
        suggestedPatch: { stepCount: steps.length, maxSteps: constraints.maxSteps }
      });
    }

    let totalDurationMs = 0;
    for (const step of steps) {
      totalDurationMs += step.estimatedDurationMs || 0;
    }

    if (constraints.maxExecutionTimeMs !== undefined && totalDurationMs > constraints.maxExecutionTimeMs) {
      warnings.push(
        `Total estimated execution time (${totalDurationMs}ms) exceeds constraint (${constraints.maxExecutionTimeMs}ms).`
      );
    }

    // ==========================================
    // Stage 7: Semantic Contradiction Detection
    // ==========================================
    // Detect contradictory operations, e.g. delete resource followed by read/update of same resource without creation
    const deletedTargets = new Set<string>();

    for (const stepId of executionOrder) {
      const step = stepMap.get(stepId);
      if (!step) continue;

      const desc = `${step.title} ${step.description}`.toLowerCase();

      // Check if this step creates/recreates any previously deleted resource
      for (const deleted of Array.from(deletedTargets)) {
        const createPattern = new RegExp(`(?:create|recreate|touch|mkdir|add|initialize|restore)[\\s\\S]*?\\b${deleted}\\b`, 'i');
        if (createPattern.test(desc)) {
          deletedTargets.delete(deleted);
        }
      }

      // Check if this step deletes a file/resource
      const deleteMatch = desc.match(/(?:delete|remove|rm|drop)\s+(?:file|table|resource|directory|dir)?\s*([a-zA-Z0-9_\-./]+)/i);
      if (deleteMatch && deleteMatch[1]) {
        deletedTargets.add(deleteMatch[1].toLowerCase());
      }

      // Check if this step attempts to read/edit a deleted resource without recreating it
      const accessMatch = desc.match(/(?:read|edit|modify|update|import)\s+(?:file|table|resource|directory|dir)?\s*([a-zA-Z0-9_\-./]+)/i);
      if (accessMatch && accessMatch[1]) {
        const accessedTarget = accessMatch[1].toLowerCase();
        if (deletedTargets.has(accessedTarget)) {
          errors.push({
            code: ValidationErrorType.CONTRADICTORY_OPERATIONS,
            stepId: step.id,
            message: `Semantic contradiction: Step '${step.id}' attempts to access '${accessedTarget}' which was previously deleted in this plan without recreation.`,
            repairable: true,
            suggestedPatch: { conflictingTarget: accessedTarget, action: 'INSERT_CREATION_BEFORE_ACCESS' }
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
