import { Plan, Planner, PlanningContext, PlanningResult, TaskGraph, ExecutionContext, PlanningStrategy } from '../index';
import { ToolExecutor } from '../tools/ToolExecutor';

export class MockPlanningStrategy implements PlanningStrategy {
  async generatePlan(context: PlanningContext): Promise<PlanningResult> {
    const plan: Plan = {
      id: 'mock-plan-1',
      goal: context.userGoal || 'Mock goal',
      taskGraph: {} as TaskGraph,
      executionOrder: ['step-1', 'step-2'],
      approvalPoints: [],
      estimatedComplexity: 'LOW',
      estimatedRisk: 'LOW',
      rollbackHints: [],
      validationRequirements: [],
      metadata: {},
      createdAt: Date.now()
    };
    return { success: true, plan };
  }
}

export class DemoOrchestrator {
  constructor(private pipeline: ToolExecutor) {}

  async executePlan(plan: Plan, context: ExecutionContext): Promise<void> {
    console.log(`[MockPlanner] Executing plan: ${plan.goal}`);
    for (const stepId of plan.executionOrder) {
      console.log(`[MockPlanner] Executing step: ${stepId}`);
      if (stepId === 'step-1') {
        const result = await this.pipeline.execute('echo', { text: 'Ping from step 1' }, context);
        console.log(`[MockPlanner] Step 1 tool result:`, result.data);
      } else if (stepId === 'step-2') {
        const result = await this.pipeline.execute('counter', {}, context);
        console.log(`[MockPlanner] Step 2 tool result:`, result.data);
      }
    }
    console.log(`[MockPlanner] Plan execution complete.`);
  }
}
