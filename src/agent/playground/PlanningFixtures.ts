import { GoalIntent, GoalStatus, type Goal } from '../goal/GoalTypes.js';
import { RiskLevel, type PlanStep } from '../planner/PlanStep.js';
import { TaskGraphBuilder } from '../planner/TaskGraphBuilder.js';
import { DirectedTaskGraph } from '../planner/TaskGraph.js';
import type { Plan } from '../planner/Plan.js';
import type { PlanningScenarioFixture } from './PlanningPlaygroundTypes.js';

function createDummyPlan(id: string, goal: Goal, steps: PlanStep[]): Plan {
  const taskGraph = TaskGraphBuilder.build(steps, { goalId: goal.id });
  return {
    id,
    goalId: goal.id,
    goal: goal.title,
    taskGraph,
    steps,
    executionOrder: steps.map(s => s.id),
    approvalPoints: [],
    estimatedComplexity: 'LOW',
    estimatedRisk: 'LOW',
    rollbackHints: [],
    validationRequirements: [],
    metadata: {
      strategyUsed: 'RULE_BASED'
    },
    createdAt: Date.now()
  };
}

/**
 * Creates a raw plan for defect/repair fixtures without invoking strict task-graph assertions at construction time.
 */
function createDefectivePlan(id: string, goal: Goal, steps: PlanStep[]): Plan {
  const taskGraph = new DirectedTaskGraph(`graph_${id}`, goal.id);
  for (const step of steps) {
    taskGraph.addTask(step, step.dependencies || []);
  }

  return {
    id,
    goalId: goal.id,
    goal: goal.title,
    taskGraph,
    steps,
    executionOrder: steps.map(s => s.id),
    approvalPoints: [],
    estimatedComplexity: 'LOW',
    estimatedRisk: 'LOW',
    rollbackHints: [],
    validationRequirements: [],
    metadata: {
      strategyUsed: 'RULE_BASED'
    },
    createdAt: Date.now()
  };
}

export const PLANNING_FIXTURES: Record<string, PlanningScenarioFixture> = {
  'simple-linear': {
    id: 'simple-linear',
    name: 'Simple Linear Pipeline',
    description: 'A clean 3-step sequential build pipeline that decomposes, graphs, plans, and passes validation with zero defects.',
    goal: {
      id: 'goal-simple-linear',
      rawPrompt: 'Lint, build and bundle the application.',
      intent: GoalIntent.CODE_MODIFICATION,
      title: 'Simple Linear Build',
      description: 'Run code verification, compile the frontend, and bundle the output.',
      desiredOutcome: 'Verified and bundled project build artifacts.',
      successCriteria: [
        { id: 'sc-1', description: 'Linting reports 0 errors', assertionType: 'LINT_PASSES' },
        { id: 'sc-2', description: 'Application compiles successfully', assertionType: 'BUILD_SUCCEEDS' }
      ],
      constraints: {
        maxSteps: 6,
        maxExecutionTimeMs: 30000,
        forbiddenTools: [],
        mandatoryTools: ['read_file'],
        maxRiskLevel: 'LOW'
      },
      priority: 2,
      status: GoalStatus.ACTIVE,
      createdAt: 1700000000000,
      updatedAt: 1700000000000
    }
  },

  'parallel-ready': {
    id: 'parallel-ready',
    name: 'Parallel Task Graph',
    description: 'Demonstrates branch parallelism where unit tests and lint checks run concurrently before a merge step.',
    goal: {
      id: 'goal-parallel-ready',
      rawPrompt: 'Run unit tests and style checks in parallel then produce a status report.',
      intent: GoalIntent.TESTING_AND_VERIFICATION,
      title: 'Parallel Verification DAG',
      description: 'Execute independent checks in parallel then synthesize results.',
      desiredOutcome: 'Parallel verification results aggregated.',
      successCriteria: [
        { id: 'sc-p1', description: 'Tests pass and linter passes', assertionType: 'TEST_PASSES' }
      ],
      constraints: {
        maxSteps: 8,
        maxExecutionTimeMs: 40000,
        forbiddenTools: [],
        mandatoryTools: [],
        maxRiskLevel: 'MEDIUM'
      },
      priority: 3,
      status: GoalStatus.ACTIVE,
      createdAt: 1700000000000,
      updatedAt: 1700000000000
    }
  },

  'missing-dependency': {
    id: 'missing-dependency',
    name: 'Missing Dependency Defect & Repair',
    description: 'Initial plan contains a broken dependency reference. Validated in Stage 2, repaired via auto-synthesizing the missing prerequisite.',
    goal: {
      id: 'goal-missing-dep',
      rawPrompt: 'Execute deployment step referencing missing prerequisite initialization.',
      intent: GoalIntent.INFRASTRUCTURE_OPS,
      title: 'Missing Prerequisite Step',
      description: 'Trigger Stage 2 Dependency validation error and repair.',
      desiredOutcome: 'Repaired dependency chain.',
      successCriteria: [
        { id: 'sc-md1', description: 'Valid dependency chain', assertionType: 'BUILD_SUCCEEDS' }
      ],
      constraints: {
        maxSteps: 6,
        maxExecutionTimeMs: 30000,
        forbiddenTools: [],
        mandatoryTools: [],
        maxRiskLevel: 'HIGH'
      },
      priority: 4,
      status: GoalStatus.ACTIVE,
      createdAt: 1700000000000,
      updatedAt: 1700000000000
    },
    initialPlan: createDefectivePlan('plan-defective-dep', {
      id: 'goal-missing-dep',
      rawPrompt: 'Execute deployment',
      intent: GoalIntent.INFRASTRUCTURE_OPS,
      title: 'Missing Prerequisite Step',
      description: 'Trigger Stage 2 Dependency error',
      desiredOutcome: 'Repaired dependency chain',
      successCriteria: [],
      constraints: { maxSteps: 6, maxExecutionTimeMs: 30000, forbiddenTools: [], mandatoryTools: [], maxRiskLevel: 'HIGH' },
      priority: 4,
      status: GoalStatus.ACTIVE,
      createdAt: 1700000000000,
      updatedAt: 1700000000000
    }, [
      {
        id: 'step-deploy',
        taskId: 'task-deploy',
        title: 'Deploy Service',
        description: 'Deploy to cloud runtime',
        requiredTools: ['read_file'],
        dependencies: ['non_existent_prerequisite_step'],
        expectedInputs: [],
        expectedOutputs: ['deploy_out'],
        riskLevel: RiskLevel.LOW,
        approvalRequired: false,
        validationRules: []
      }
    ])
  },

  'cycle-detected': {
    id: 'cycle-detected',
    name: 'Cycle Detected Defect & Repair',
    description: 'Initial plan has a circular loop: Step A -> Step B -> Step A. Validated in Stage 1 and repaired by breaking feedback edges.',
    goal: {
      id: 'goal-cycle',
      rawPrompt: 'Resolve circular step dependencies.',
      intent: GoalIntent.CODE_MODIFICATION,
      title: 'Circular Plan Defect',
      description: 'Trigger Stage 1 Cycle Detection and repair.',
      desiredOutcome: 'Acyclic plan.',
      successCriteria: [
        { id: 'sc-c1', description: 'Acyclic execution', assertionType: 'BUILD_SUCCEEDS' }
      ],
      constraints: {
        maxSteps: 6,
        maxExecutionTimeMs: 30000,
        forbiddenTools: [],
        mandatoryTools: [],
        maxRiskLevel: 'MEDIUM'
      },
      priority: 3,
      status: GoalStatus.ACTIVE,
      createdAt: 1700000000000,
      updatedAt: 1700000000000
    },
    initialPlan: createDefectivePlan('plan-cycle-defect', {
      id: 'goal-cycle',
      rawPrompt: 'Resolve circular dependencies',
      intent: GoalIntent.CODE_MODIFICATION,
      title: 'Circular Plan Defect',
      description: 'Trigger Stage 1 Cycle Detection',
      desiredOutcome: 'Acyclic plan',
      successCriteria: [],
      constraints: { maxSteps: 6, maxExecutionTimeMs: 30000, forbiddenTools: [], mandatoryTools: [], maxRiskLevel: 'MEDIUM' },
      priority: 3,
      status: GoalStatus.ACTIVE,
      createdAt: 1700000000000,
      updatedAt: 1700000000000
    }, [
      {
        id: 'step-a',
        taskId: 'task-a',
        title: 'Step Alpha',
        description: 'Compile Alpha',
        requiredTools: ['read_file'],
        dependencies: ['step-b'],
        expectedInputs: [],
        expectedOutputs: [],
        riskLevel: RiskLevel.LOW,
        approvalRequired: false,
        validationRules: []
      },
      {
        id: 'step-b',
        taskId: 'task-b',
        title: 'Step Beta',
        description: 'Compile Beta',
        requiredTools: ['read_file'],
        dependencies: ['step-a'],
        expectedInputs: [],
        expectedOutputs: [],
        riskLevel: RiskLevel.LOW,
        approvalRequired: false,
        validationRules: []
      }
    ])
  },

  'tool-missing': {
    id: 'tool-missing',
    name: 'Tool Unavailable Defect',
    description: 'Initial plan references an unregistered tool not present in the workspace registry. Validated in Stage 3.',
    goal: {
      id: 'goal-tool-missing',
      rawPrompt: 'Perform quantum encryption using quantum_keygen tool.',
      intent: GoalIntent.INVESTIGATION,
      title: 'Missing Tool Verification',
      description: 'Trigger Stage 3 Tool Availability check.',
      desiredOutcome: 'Tool error caught.',
      successCriteria: [
        { id: 'sc-tm1', description: 'Verify tools', assertionType: 'BUILD_SUCCEEDS' }
      ],
      constraints: {
        maxSteps: 4,
        maxExecutionTimeMs: 20000,
        forbiddenTools: [],
        mandatoryTools: [],
        maxRiskLevel: 'LOW'
      },
      priority: 2,
      status: GoalStatus.ACTIVE,
      createdAt: 1700000000000,
      updatedAt: 1700000000000
    },
    initialPlan: createDummyPlan('plan-missing-tool', {
      id: 'goal-tool-missing',
      rawPrompt: 'Perform quantum encryption',
      intent: GoalIntent.INVESTIGATION,
      title: 'Missing Tool Verification',
      description: 'Trigger Stage 3 Tool check',
      desiredOutcome: 'Tool error caught',
      successCriteria: [],
      constraints: { maxSteps: 4, maxExecutionTimeMs: 20000, forbiddenTools: [], mandatoryTools: [], maxRiskLevel: 'LOW' },
      priority: 2,
      status: GoalStatus.ACTIVE,
      createdAt: 1700000000000,
      updatedAt: 1700000000000
    }, [
      {
        id: 'step-quantum',
        taskId: 'task-quantum',
        title: 'Quantum Keygen',
        description: 'Generate quantum key',
        requiredTools: ['unregistered_quantum_tool'],
        dependencies: [],
        expectedInputs: [],
        expectedOutputs: [],
        riskLevel: RiskLevel.LOW,
        approvalRequired: false,
        validationRules: []
      }
    ])
  },

  'permission-violation': {
    id: 'permission-violation',
    name: 'Permission & Risk Violation Defect',
    description: 'Initial plan uses a forbidden tool and exceeds maximum risk limits. Validated in Stage 4, leading to immediate ABORT.',
    goal: {
      id: 'goal-perm-violation',
      rawPrompt: 'Delete all database tables using destructive shell command.',
      intent: GoalIntent.INFRASTRUCTURE_OPS,
      title: 'Destructive Permission Test',
      description: 'Trigger Stage 4 Risk/Permission check.',
      desiredOutcome: 'Permission violation prevented.',
      successCriteria: [
        { id: 'sc-pv1', description: 'Safe bounds preserved', assertionType: 'BUILD_SUCCEEDS' }
      ],
      constraints: {
        maxSteps: 5,
        maxExecutionTimeMs: 25000,
        forbiddenTools: ['destructive_shell'],
        mandatoryTools: [],
        maxRiskLevel: 'LOW'
      },
      priority: 5,
      status: GoalStatus.ACTIVE,
      createdAt: 1700000000000,
      updatedAt: 1700000000000
    },
    initialPlan: createDummyPlan('plan-perm-violation', {
      id: 'goal-perm-violation',
      rawPrompt: 'Delete database tables',
      intent: GoalIntent.INFRASTRUCTURE_OPS,
      title: 'Destructive Permission Test',
      description: 'Trigger Stage 4 Risk check',
      desiredOutcome: 'Permission violation prevented',
      successCriteria: [],
      constraints: { maxSteps: 5, maxExecutionTimeMs: 25000, forbiddenTools: ['destructive_shell'], mandatoryTools: [], maxRiskLevel: 'LOW' },
      priority: 5,
      status: GoalStatus.ACTIVE,
      createdAt: 1700000000000,
      updatedAt: 1700000000000
    }, [
      {
        id: 'step-nuke',
        taskId: 'task-nuke',
        title: 'Nuke Database',
        description: 'Wipe all schemas',
        requiredTools: ['destructive_shell'],
        riskLevel: RiskLevel.CRITICAL,
        dependencies: [],
        expectedInputs: [],
        expectedOutputs: [],
        approvalRequired: false,
        validationRules: []
      }
    ])
  },

  'transient-failure': {
    id: 'transient-failure',
    name: 'Transient Failure Simulation (Retry)',
    description: 'Simulates an HTTP 429 / Rate Limit error during execution, triggering a deterministic RETRY policy decision.',
    goal: {
      id: 'goal-transient',
      rawPrompt: 'Fetch remote API data with simulated transient network rate limiting.',
      intent: GoalIntent.INFORMATION_RETRIEVAL,
      title: 'Transient Rate Limit Test',
      description: 'Evaluate FailureClassifier and RETRY policy.',
      desiredOutcome: 'Successful retry on transient blip.',
      successCriteria: [
        { id: 'sc-tf1', description: 'Data retrieved', assertionType: 'OUTPUT_CONTAINS' }
      ],
      constraints: {
        maxSteps: 5,
        maxExecutionTimeMs: 20000,
        forbiddenTools: [],
        mandatoryTools: [],
        maxRiskLevel: 'LOW'
      },
      priority: 2,
      status: GoalStatus.ACTIVE,
      createdAt: 1700000000000,
      updatedAt: 1700000000000
    },
    simulatedError: 'HTTP 429 Too Many Requests: Rate limit exceeded temporarily. Retry after 2s.',
    expectedFailureAction: 'RETRY'
  },

  'logical-failure': {
    id: 'logical-failure',
    name: 'Logical Failure Simulation (Replan)',
    description: 'Simulates a unit test assertion failure during build execution, triggering deterministic REPLAN policy decision.',
    goal: {
      id: 'goal-logical',
      rawPrompt: 'Run unit test suite with simulated logic failure.',
      intent: GoalIntent.CODE_MODIFICATION,
      title: 'Logical Assertion Failure',
      description: 'Evaluate FailureClassifier and REPLAN policy.',
      desiredOutcome: 'Regenerate strategy when assertions fail.',
      successCriteria: [
        { id: 'sc-lf1', description: 'Tests pass', assertionType: 'TEST_PASSES' }
      ],
      constraints: {
        maxSteps: 8,
        maxExecutionTimeMs: 40000,
        forbiddenTools: [],
        mandatoryTools: [],
        maxRiskLevel: 'MEDIUM'
      },
      priority: 3,
      status: GoalStatus.ACTIVE,
      createdAt: 1700000000000,
      updatedAt: 1700000000000
    },
    simulatedError: 'AssertionError: Expected component status to be READY, but received FAILED in auth.spec.ts',
    expectedFailureAction: 'REPLAN'
  },

  'replan-after-partial-completion': {
    id: 'replan-after-partial-completion',
    name: 'Replan with Completed-Task Preservation',
    description: 'Demonstrates work preservation: Steps 1 & 2 succeed, Step 3 fails. Replan preserves Steps 1 & 2 and revises the remainder.',
    goal: {
      id: 'goal-preserve-work',
      rawPrompt: 'Execute multi-step pipeline and preserve completed work upon failure.',
      intent: GoalIntent.CODE_MODIFICATION,
      title: 'Completed Task Preservation',
      description: 'Preserve completed steps A & B when step C fails and replanning occurs.',
      desiredOutcome: 'Goal fulfilled with preserved progress.',
      successCriteria: [
        { id: 'sc-pw1', description: 'Pipeline finished', assertionType: 'BUILD_SUCCEEDS' }
      ],
      constraints: {
        maxSteps: 10,
        maxExecutionTimeMs: 50000,
        forbiddenTools: [],
        mandatoryTools: [],
        maxRiskLevel: 'MEDIUM'
      },
      priority: 3,
      status: GoalStatus.ACTIVE,
      createdAt: 1700000000000,
      updatedAt: 1700000000000
    },
    simulatedError: 'CompilationError: Syntax error encountered in downstream module at step-3.',
    expectedFailureAction: 'REPLAN'
  },

  'repeated-failure-abort': {
    id: 'repeated-failure-abort',
    name: 'Loop Prevention Simulation (Abort)',
    description: 'Simulates repeated consecutive identical failures exceeding policy thresholds, triggering an automatic safety ABORT.',
    goal: {
      id: 'goal-loop-abort',
      rawPrompt: 'Handle persistent failure loop safely.',
      intent: GoalIntent.CODE_MODIFICATION,
      title: 'Loop Prevention Abort',
      description: 'Trigger loop detection policy and abort.',
      desiredOutcome: 'Terminates cleanly without infinite looping.',
      successCriteria: [
        { id: 'sc-lp1', description: 'Safety boundary preserved', assertionType: 'BUILD_SUCCEEDS' }
      ],
      constraints: {
        maxSteps: 6,
        maxExecutionTimeMs: 30000,
        forbiddenTools: [],
        mandatoryTools: [],
        maxRiskLevel: 'HIGH'
      },
      priority: 4,
      status: GoalStatus.ACTIVE,
      createdAt: 1700000000000,
      updatedAt: 1700000000000
    },
    simulatedError: 'Persistent unrecoverable internal database connection reset on step-db.',
    expectedFailureAction: 'ABORT'
  }
};
