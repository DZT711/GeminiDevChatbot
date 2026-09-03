import type { Plan } from './Plan.js';
import type { PlanStep } from './PlanStep.js';
import { RiskLevel } from './PlanStep.js';
import { TaskGraphBuilder } from './TaskGraphBuilder.js';
import {
  ValidationErrorType,
  PlanValidationError,
  PlanValidationResult,
  PlanRepairer as IPlanRepairer
} from './PlanValidationTypes.js';

export class LocalizedPlanRepairer implements IPlanRepairer {
  public canRepair(validationResult: PlanValidationResult): boolean {
    if (!validationResult || validationResult.isValid) {
      return true;
    }

    if (validationResult.errors.length === 0) {
      return true;
    }

    // Every error must be marked as repairable
    return validationResult.errors.every(err => err.repairable === true);
  }

  public async applyRepair(plan: Plan, validationResult: PlanValidationResult): Promise<Plan> {
    if (!validationResult || validationResult.isValid || validationResult.errors.length === 0) {
      return plan;
    }

    let repairedSteps: PlanStep[] = plan.steps ? [...plan.steps.map(s => ({ ...s, dependencies: [...s.dependencies] }))] : [];
    const stepMap = new Map<string, PlanStep>(repairedSteps.map(s => [s.id, s]));
    const approvalSet = new Set<string>(plan.approvalPoints || []);
    const repairedValidationRequirements = [...(plan.validationRequirements || [])];
    const repairedRollbackHints = [...(plan.rollbackHints || [])];

    for (const error of validationResult.errors) {
      switch (error.code) {
        case ValidationErrorType.MISSING_DEPENDENCY: {
          const missingStepId = (error.suggestedPatch?.missingStepId as string) || `step-prereq-${Date.now()}`;
          const referencingStepId = error.stepId || (error.suggestedPatch?.referencingStepId as string);

          if (!stepMap.has(missingStepId)) {
            // Synthesize missing prerequisite step (e.g. directory setup or environment preparation)
            const syntheticStep: PlanStep = {
              id: missingStepId,
              taskId: missingStepId,
              title: `Prerequisite: Initialize ${missingStepId}`,
              description: `Auto-generated prerequisite step to resolve dependency requirement for step '${referencingStepId}'.`,
              dependencies: [],
              expectedInputs: [],
              expectedOutputs: [`${missingStepId}_ready`],
              requiredTools: [],
              estimatedDurationMs: 300,
              riskLevel: RiskLevel.LOW,
              approvalRequired: false,
              validationRules: [],
              metadata: {
                autoRepaired: true,
                repairReason: 'MISSING_DEPENDENCY',
                targetStep: referencingStepId
              }
            };

            repairedSteps.unshift(syntheticStep);
            stepMap.set(missingStepId, syntheticStep);
            repairedRollbackHints.push(`Auto-inserted prerequisite step '${missingStepId}'`);
          }
          break;
        }

        case ValidationErrorType.CYCLE_DETECTED: {
          // If a specific broken edge was flagged, remove the feedback dependency
          if (error.suggestedPatch?.brokenEdge) {
            const { from, to } = error.suggestedPatch.brokenEdge as { from: string; to: string };
            const fromStep = stepMap.get(from);
            if (fromStep) {
              fromStep.dependencies = fromStep.dependencies.filter(d => d !== to);
            }
          } else if (error.stepId) {
            // Remove circular dependency from the flagged step
            const step = stepMap.get(error.stepId);
            if (step) {
              step.dependencies = [];
            }
          }
          break;
        }

        case ValidationErrorType.INPUT_BINDING_MISSING: {
          // Producer must execute before consumer; add explicit dependency
          const producerId = error.suggestedPatch?.producerId as string;
          const consumerId = error.stepId || (error.suggestedPatch?.consumerId as string);
          if (producerId && consumerId && stepMap.has(consumerId)) {
            const consumer = stepMap.get(consumerId)!;
            if (!consumer.dependencies.includes(producerId)) {
              consumer.dependencies.push(producerId);
            }
          }
          break;
        }

        case ValidationErrorType.CONTRADICTORY_OPERATIONS: {
          // Injected recreation before access
          const target = (error.suggestedPatch?.conflictingTarget as string) || 'resource';
          const targetStepId = error.stepId;
          const recreateStepId = `recreate_${target.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;

          if (!stepMap.has(recreateStepId) && targetStepId && stepMap.has(targetStepId)) {
            const targetStep = stepMap.get(targetStepId)!;
            const recreateStep: PlanStep = {
              id: recreateStepId,
              taskId: recreateStepId,
              title: `Recreate / Initialize ${target}`,
              description: `Auto-generated restoration step to recreate '${target}' before access in '${targetStepId}'.`,
              dependencies: [...targetStep.dependencies],
              expectedInputs: [],
              expectedOutputs: [`${target}_restored`],
              requiredTools: [],
              estimatedDurationMs: 400,
              riskLevel: RiskLevel.LOW,
              approvalRequired: false,
              validationRules: [],
              metadata: {
                autoRepaired: true,
                repairReason: 'CONTRADICTORY_OPERATIONS',
                conflictingTarget: target
              }
            };

            targetStep.dependencies = [recreateStepId];
            repairedSteps.push(recreateStep);
            stepMap.set(recreateStepId, recreateStep);
          }
          break;
        }

        default:
          break;
      }
    }

    // Auto-repair missing approval points for high-risk steps
    for (const step of repairedSteps) {
      if (step.riskLevel === RiskLevel.HIGH || step.riskLevel === RiskLevel.CRITICAL || step.approvalRequired) {
        approvalSet.add(step.id);
      }
    }

    // Rebuild TaskGraph with repaired steps and derive correct topological order
    const explicitDependencies: Record<string, string[]> = {};
    for (const step of repairedSteps) {
      explicitDependencies[step.id] = step.dependencies || [];
    }

    const repairedTaskGraph = TaskGraphBuilder.build(repairedSteps, {
      goalId: plan.goalId || 'repaired-goal',
      explicitDependencies
    });

    const repairedExecutionOrder = repairedTaskGraph.isAcyclic()
      ? repairedTaskGraph.getTopologicalOrder()
      : repairedSteps.map(s => s.id);

    return {
      ...plan,
      taskGraph: repairedTaskGraph,
      steps: repairedSteps,
      executionOrder: repairedExecutionOrder,
      approvalPoints: Array.from(approvalSet),
      validationRequirements: repairedValidationRequirements,
      rollbackHints: repairedRollbackHints,
      metadata: {
        ...(plan.metadata || {}),
        repairedAt: Date.now(),
        repairCount: validationResult.errors.length
      },
      updatedAt: Date.now()
    };
  }
}

export const DefaultPlanRepairer = LocalizedPlanRepairer;
