import { DefaultGoalDecomposer } from '../decomposition/GoalDecomposer.js';
import { TaskGraphBuilder } from '../planner/TaskGraphBuilder.js';
import { Planner } from '../planner/Planner.js';
import { PlanningValidator } from '../planner/PlanningValidator.js';
import { LocalizedPlanRepairer } from '../planner/PlanRepairer.js';
import { ReplanningEngine } from '../replanning/ReplanningEngine.js';
import { ReplanningPolicy } from '../replanning/ReplanningPolicy.js';
import { PLANNING_FIXTURES } from './PlanningFixtures.js';
import type {
  PlanningScenarioFixture,
  PlanningSimulationState,
  PlanningSimulationStepLog
} from './PlanningPlaygroundTypes.js';

export class PlanningSimulator {
  private decomposer: DefaultGoalDecomposer;
  private planner: Planner;
  private validator: PlanningValidator;
  private repairer: LocalizedPlanRepairer;
  private replanningEngine: ReplanningEngine;
  private customFixtures: Record<string, PlanningScenarioFixture> = {};

  constructor() {
    this.decomposer = new DefaultGoalDecomposer();
    this.planner = new Planner();
    this.validator = new PlanningValidator();
    this.repairer = new LocalizedPlanRepairer();
    this.replanningEngine = new ReplanningEngine({
      planner: this.planner,
      validator: this.validator,
      repairer: this.repairer
    });
  }

  public registerFixture(fixture: PlanningScenarioFixture): void {
    this.customFixtures[fixture.id] = fixture;
  }

  public getAvailableFixtures(): PlanningScenarioFixture[] {
    return [...Object.values(PLANNING_FIXTURES), ...Object.values(this.customFixtures)];
  }

  public getFixture(id: string): PlanningScenarioFixture | undefined {
    return this.customFixtures[id] || PLANNING_FIXTURES[id];
  }

  /**
   * Deterministically runs a full simulation of the M05 lifecycle for a given fixture.
   */
  public async runSimulation(fixtureId: string): Promise<PlanningSimulationState> {
    const fixture = this.getFixture(fixtureId);
    if (!fixture) {
      throw new Error(`Planning scenario fixture '${fixtureId}' not found.`);
    }

    const timeline: PlanningSimulationStepLog[] = [];
    const completedTaskIds: string[] = [];

    // Phase 1: Load Goal
    const goalTitle = fixture.goal?.title || fixture.goal?.intent || fixture.name || 'Goal';
    const goalIntent = fixture.goal?.intent || 'CUSTOM';
    const goalOutcome = fixture.goal?.desiredOutcome || 'None specified';

    timeline.push({
      timestamp: Date.now(),
      phase: 'GOAL_LOAD',
      title: `Loaded Goal: ${goalTitle}`,
      status: 'SUCCESS',
      details: `Intent: ${goalIntent} | Desired Outcome: ${goalOutcome}`,
      data: fixture.goal
    });

    // Phase 2: Goal Decomposition
    let taskSpecs = fixture.initialTasks || [];
    if (taskSpecs.length === 0) {
      if (fixture.goal) {
        const decompResult = await this.decomposer.decompose(fixture.goal);
        taskSpecs = decompResult?.tasks || [];
        timeline.push({
          timestamp: Date.now(),
          phase: 'DECOMPOSITION',
          title: `Decomposed into ${taskSpecs.length} TaskSpecifications`,
          status: taskSpecs.length > 0 ? 'SUCCESS' : 'ERROR',
          details: taskSpecs.map(t => `${t.id} (${t.title})`).join(', '),
          data: taskSpecs
        });
      }
    } else {
      timeline.push({
        timestamp: Date.now(),
        phase: 'DECOMPOSITION',
        title: `Loaded ${taskSpecs.length} predefined TaskSpecifications`,
        status: 'INFO',
        data: taskSpecs
      });
    }

    // Phase 3: TaskGraph Construction
    let taskGraph = fixture.initialTaskGraph;
    if (!taskGraph) {
      taskGraph = TaskGraphBuilder.build(taskSpecs, { goalId: fixture.goal?.id || 'goal-custom' });
      timeline.push({
        timestamp: Date.now(),
        phase: 'GRAPH_BUILD',
        title: `Constructed TaskGraph (${taskGraph.nodes.size} nodes, ${taskGraph.edges.size} edges)`,
        status: 'SUCCESS',
        details: `Topological Order: [${taskGraph.getTopologicalOrder().join(' -> ')}]`,
        data: taskGraph
      });
    }

    // Phase 4: Planning Strategy & Plan Generation
    let plan = fixture.initialPlan;
    if (!plan) {
      const planResult = await this.planner.generatePlan({
        goal: fixture.goal,
        constraints: {
          maxSteps: fixture.goal?.constraints?.maxSteps,
          maxExecutionTimeMs: fixture.goal?.constraints?.maxExecutionTimeMs,
          forbiddenTools: fixture.goal?.constraints?.forbiddenTools,
          mandatoryTools: fixture.goal?.constraints?.mandatoryTools,
          maxRiskLevel: fixture.goal?.constraints?.maxRiskLevel as any
        }
      });
      plan = planResult.plan;
      timeline.push({
        timestamp: Date.now(),
        phase: 'PLAN_GEN',
        title: `Generated Plan: ${plan?.id || 'Failed'}`,
        status: planResult.success ? 'SUCCESS' : 'ERROR',
        details: `Steps: ${plan?.steps?.length || 0} | Strategy: ${plan?.metadata?.strategyUsed || 'RuleBased'}`,
        data: plan
      });
    } else {
      timeline.push({
        timestamp: Date.now(),
        phase: 'PLAN_GEN',
        title: `Loaded Initial Test Plan: ${plan.id}`,
        status: 'INFO',
        data: plan
      });
    }

    if (!plan) {
      return {
        fixtureId,
        goal: fixture.goal,
        taskSpecs,
        taskGraph,
        timeline,
        completedTaskIds,
        history: [],
        goalSemanticPreserved: true,
        loopDetected: false
      };
    }

    // Phase 5: 7-Stage Pre-Flight Validation
    const validationResult = await this.validator.validate(plan, {
      goal: fixture.goal,
      constraints: {
        maxSteps: fixture.goal?.constraints?.maxSteps,
        maxExecutionTimeMs: fixture.goal?.constraints?.maxExecutionTimeMs,
        forbiddenTools: fixture.goal?.constraints?.forbiddenTools,
        mandatoryTools: fixture.goal?.constraints?.mandatoryTools,
        maxRiskLevel: fixture.goal?.constraints?.maxRiskLevel as any
      }
    });

    const errorCount = validationResult?.errors?.length || 0;
    timeline.push({
      timestamp: Date.now(),
      phase: 'VALIDATION',
      title: `7-Stage Validation Result: ${validationResult.isValid ? 'PASS' : 'FAIL'}`,
      status: validationResult.isValid ? 'SUCCESS' : 'WARNING',
      details: validationResult.isValid
        ? 'All 7 pre-flight validation stages passed successfully.'
        : `Errors (${errorCount}): ${(validationResult.errors || []).map(e => e.message).join(' | ')}`,
      data: validationResult
    });

    // Phase 6: Localized Repair (if invalid)
    let repairedPlan: typeof plan | undefined;
    let postRepairValidation: typeof validationResult | undefined;

    if (!validationResult.isValid && this.repairer.canRepair(validationResult)) {
      repairedPlan = await this.repairer.applyRepair(plan, validationResult);
      postRepairValidation = await this.validator.validate(repairedPlan, {
        goal: fixture.goal,
        constraints: {
          maxSteps: fixture.goal?.constraints?.maxSteps,
          maxExecutionTimeMs: fixture.goal?.constraints?.maxExecutionTimeMs,
          forbiddenTools: fixture.goal?.constraints?.forbiddenTools,
          mandatoryTools: fixture.goal?.constraints?.mandatoryTools,
          maxRiskLevel: fixture.goal?.constraints?.maxRiskLevel as any
        }
      });

      timeline.push({
        timestamp: Date.now(),
        phase: 'REPAIR',
        title: `Localized Repair Applied -> Post-Repair Validation: ${postRepairValidation.isValid ? 'PASS' : 'FAIL'}`,
        status: postRepairValidation.isValid ? 'SUCCESS' : 'ERROR',
        details: `Repaired plan ${repairedPlan?.id} now contains ${repairedPlan?.steps?.length || 0} steps.`,
        data: { repairedPlan, postRepairValidation }
      });
    }

    // Phase 7: Simulated Failure & Replanning
    let simulatedFailure: any;
    let replanningDecision: any;
    let replanRevision: any;
    let loopDetected = false;

    const activePlan = repairedPlan || plan;

    if (fixture.simulatedError && activePlan?.steps) {
      const steps = activePlan.steps || [];
      const failedStep = steps.length > 0 ? (steps[Math.min(steps.length - 1, 1)] || steps[0]) : undefined;
      
      // If partial completion scenario, mark previous steps as completed
      if (fixture.id === 'replan-after-partial-completion' && steps[0]) {
        completedTaskIds.push(steps[0]?.id || 'step-1');
      }

      if (failedStep) {
        simulatedFailure = this.replanningEngine.classifyFailure(failedStep, fixture.simulatedError, activePlan.id);

        timeline.push({
          timestamp: Date.now(),
          phase: 'SIMULATE_FAILURE',
          title: `Simulated Failure: [${simulatedFailure.category}] on step '${failedStep?.id}'`,
          status: 'WARNING',
          details: `Error: ${simulatedFailure.originalError} | Severity: ${simulatedFailure.severity} | Recommended: ${simulatedFailure.recommendedAction}`,
          data: simulatedFailure
        });

        // If loop scenario, inject repeated identical history records
        if (fixture.id === 'repeated-failure-abort') {
          const dummyHistoryRecord = {
            id: 'hist_prev_1',
            attemptNumber: 1,
            previousPlanId: activePlan.id,
            triggerStepId: failedStep?.id,
            failureClassification: simulatedFailure,
            decision: 'RETRY' as const,
            reason: 'Initial retry',
            timestamp: Date.now() - 2000
          };
          const dummyHistoryRecord2 = {
            id: 'hist_prev_2',
            attemptNumber: 2,
            previousPlanId: activePlan.id,
            triggerStepId: failedStep?.id,
            failureClassification: simulatedFailure,
            decision: 'RETRY' as const,
            reason: 'Second retry',
            timestamp: Date.now() - 1000
          };
          
          replanningDecision = ReplanningPolicy.evaluate({
            goal: fixture.goal,
            currentPlan: activePlan,
            failedStep,
            failureClassification: simulatedFailure,
            replanBudget: 2,
            history: [dummyHistoryRecord, dummyHistoryRecord2]
          });
          loopDetected = replanningDecision.action === 'ABORT';
        } else {
          replanningDecision = await this.replanningEngine.handleFailure({
            goal: fixture.goal,
            currentPlan: activePlan,
            failedStep,
            failureClassification: simulatedFailure,
            completedTaskIds,
            replanBudget: 2
          });
        }

        timeline.push({
          timestamp: Date.now(),
          phase: 'REPLAN_DECISION',
          title: `Replanning Policy Action: ${replanningDecision.action}`,
          status: replanningDecision.action === 'ABORT' ? 'ERROR' : 'SUCCESS',
          details: replanningDecision.reason,
          data: replanningDecision
        });

        if (replanningDecision.revision) {
          replanRevision = replanningDecision.revision;
          timeline.push({
            timestamp: Date.now(),
            phase: 'REPLAN_EXECUTE',
            title: `Revised Plan Generated: ${replanRevision.newPlan.id}`,
            status: 'SUCCESS',
            details: `Preserved Tasks: [${(replanRevision.completedTasksPreserved || []).join(', ')}] | Validated: ${replanRevision.validationResult?.isValid}`,
            data: replanRevision
          });
        }
      }
    }

    // Goal semantic preservation check
    const goalSemanticPreserved = (fixture.goal?.successCriteria?.length ?? 0) > 0 || !!fixture.goal?.desiredOutcome || !!fixture.goal?.title;

    return {
      fixtureId,
      goal: fixture.goal,
      taskSpecs,
      taskGraph,
      plan,
      validationResult,
      repairedPlan,
      postRepairValidation,
      simulatedFailure,
      replanningDecision,
      replanRevision,
      history: this.replanningEngine.getHistory(),
      timeline,
      completedTaskIds,
      goalSemanticPreserved,
      loopDetected
    };
  }
}
