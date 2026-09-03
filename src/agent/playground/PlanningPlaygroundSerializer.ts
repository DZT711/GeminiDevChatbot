import type { PlanningSimulationState } from './PlanningPlaygroundTypes.js';

export class PlanningPlaygroundSerializer {
  public static exportSimulationJson(state: PlanningSimulationState): string {
    // Sanitized state export without sensitive variables
    const sanitized = {
      exportedAt: Date.now(),
      fixtureId: state.fixtureId,
      goal: state.goal,
      taskSpecs: state.taskSpecs,
      taskGraph: state.taskGraph ? {
        id: state.taskGraph.id,
        nodes: Array.from(state.taskGraph.nodes.entries()),
        edges: Array.from(state.taskGraph.edges.entries()),
        topologicalOrder: state.taskGraph.getTopologicalOrder()
      } : undefined,
      plan: state.plan ? {
        id: state.plan.id,
        goalId: state.plan.goalId,
        steps: state.plan.steps,
        executionOrder: state.plan.executionOrder
      } : undefined,
      validationResult: state.validationResult,
      repairedPlan: state.repairedPlan,
      postRepairValidation: state.postRepairValidation,
      simulatedFailure: state.simulatedFailure,
      replanningDecision: state.replanningDecision,
      replanRevision: state.replanRevision,
      completedTaskIds: state.completedTaskIds,
      goalSemanticPreserved: state.goalSemanticPreserved,
      timeline: state.timeline
    };

    return JSON.stringify(sanitized, null, 2);
  }

  public static importSimulationJson(json: string): Partial<PlanningSimulationState> {
    try {
      const parsed = JSON.parse(json);
      if (!parsed.goal || !parsed.fixtureId) {
        throw new Error('Invalid Planning Simulation JSON: missing goal or fixtureId.');
      }
      return parsed;
    } catch (e: any) {
      throw new Error(`Failed to parse simulation JSON: ${e.message}`);
    }
  }
}
