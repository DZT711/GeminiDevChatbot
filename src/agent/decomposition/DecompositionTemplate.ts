import { Goal, GoalIntent, GoalRiskLevel, SuccessCriterion } from '../goal/GoalTypes.js';
import { TaskSpecification, TaskType } from './DecompositionTypes.js';

export interface DecompositionTemplate {
  intent: GoalIntent;
  generateTasks(goal: Goal, availableTools?: string[]): TaskSpecification[];
}

const RISK_LEVEL_WEIGHTS: Record<GoalRiskLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

function filterToolHints(
  suggestedHints: string[],
  forbiddenTools: string[],
  availableTools?: string[]
): string[] {
  const forbiddenSet = new Set(forbiddenTools.map(f => f.trim()));
  const availableSet = availableTools ? new Set(availableTools.map(a => a.trim())) : null;

  return suggestedHints.filter(tool => {
    if (forbiddenSet.has(tool)) return false;
    if (availableSet && !availableSet.has(tool)) return false;
    return true;
  });
}

function resolveTaskRisk(
  defaultRisk: GoalRiskLevel,
  goalMaxRisk: GoalRiskLevel,
  requireApprovalAboveRisk?: GoalRiskLevel
): { riskLevel: GoalRiskLevel; approvalRequired: boolean } {
  // Cap at goal's max risk level
  const defaultWeight = RISK_LEVEL_WEIGHTS[defaultRisk];
  const maxWeight = RISK_LEVEL_WEIGHTS[goalMaxRisk];
  const finalRisk = defaultWeight <= maxWeight ? defaultRisk : goalMaxRisk;

  let approvalRequired = false;
  if (requireApprovalAboveRisk) {
    const thresholdWeight = RISK_LEVEL_WEIGHTS[requireApprovalAboveRisk];
    const finalWeight = RISK_LEVEL_WEIGHTS[finalRisk];
    if (finalWeight >= thresholdWeight) {
      approvalRequired = true;
    }
  }

  return { riskLevel: finalRisk, approvalRequired };
}

function formatCriteriaDescriptions(criteria: SuccessCriterion[]): string[] {
  return criteria.map(c => `[${c.assertionType}] ${c.description}${c.target ? ` (Target: ${c.target})` : ''}`);
}

export class CodeModificationTemplate implements DecompositionTemplate {
  public readonly intent = GoalIntent.CODE_MODIFICATION;

  generateTasks(goal: Goal, availableTools?: string[]): TaskSpecification[] {
    const now = Date.now();
    const tasks: TaskSpecification[] = [];
    const forbidden = goal.constraints.forbiddenTools;
    const mandatory = goal.constraints.mandatoryTools;

    // Step 1: Inspect
    const inspectRisk = resolveTaskRisk('LOW', goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
    const inspectHints = filterToolHints(
      ['view_file', 'list_dir', 'search_web', ...mandatory.filter(m => m.includes('view') || m.includes('list'))],
      forbidden,
      availableTools
    );

    tasks.push({
      id: `task_${goal.id}_1`,
      parentGoalId: goal.id,
      title: `Inspect & Analyze Codebase for: ${goal.title || goal.description.slice(0, 50)}`,
      description: `Locate, read, and inspect all target files and related modules required for: ${goal.description}`,
      taskType: TaskType.INSPECT,
      expectedOutcome: `Complete understanding of the existing code structure, interfaces, and modification targets.`,
      expectedInputs: ['goal.description', 'target file paths'],
      expectedOutputs: ['file contents', 'module dependency map', 'targeted edit locations'],
      requiredCapabilities: ['code_reading', 'directory_inspection'],
      toolHints: inspectHints,
      riskLevel: inspectRisk.riskLevel,
      approvalRequired: inspectRisk.approvalRequired,
      createdAt: now
    });

    // Step 2: Implement modifications
    const modifyRisk = resolveTaskRisk('MEDIUM', goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
    const modifyHints = filterToolHints(
      ['edit_file', 'create_file', 'multi_edit_file', ...mandatory.filter(m => m.includes('edit') || m.includes('create'))],
      forbidden,
      availableTools
    );

    tasks.push({
      id: `task_${goal.id}_2`,
      parentGoalId: goal.id,
      title: `Implement Code Modifications`,
      description: `Execute surgical, modular code changes to achieve: ${goal.desiredOutcome}`,
      taskType: TaskType.MODIFY,
      expectedOutcome: `Source files modified and aligned with desired outcome without breaking unrelated modules.`,
      expectedInputs: ['targeted edit locations', 'inspected code', 'modification requirements'],
      expectedOutputs: ['modified source files', 'diff application log'],
      requiredCapabilities: ['code_editing', 'file_creation'],
      toolHints: modifyHints,
      riskLevel: modifyRisk.riskLevel,
      approvalRequired: modifyRisk.approvalRequired,
      createdAt: now
    });

    // Step 3: Verification (incorporates Success Criteria)
    const verifyRisk = resolveTaskRisk('LOW', goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
    const verifyHints = filterToolHints(
      ['lint_applet', 'compile_applet', 'run_command', ...mandatory.filter(m => m.includes('lint') || m.includes('compile'))],
      forbidden,
      availableTools
    );

    const criteriaSummary = goal.successCriteria.length > 0
      ? `Verify against success criteria:\n- ${formatCriteriaDescriptions(goal.successCriteria).join('\n- ')}`
      : 'Verify compilation, linting, and runtime integrity of modified files.';

    tasks.push({
      id: `task_${goal.id}_3`,
      parentGoalId: goal.id,
      title: `Verify Modifications & Validate Criteria`,
      description: `${criteriaSummary}`,
      taskType: TaskType.VERIFY,
      expectedOutcome: `Clean linter, successful compilation, and verified success criteria.`,
      expectedInputs: ['modified source files', 'success criteria'],
      expectedOutputs: ['linter output', 'compiler output', 'validation result'],
      requiredCapabilities: ['compilation', 'linting', 'verification'],
      toolHints: verifyHints,
      riskLevel: verifyRisk.riskLevel,
      approvalRequired: verifyRisk.approvalRequired,
      metadata: {
        successCriteriaToVerify: goal.successCriteria.map(c => c.id)
      },
      createdAt: now
    });

    return tasks;
  }
}

export class InvestigationTemplate implements DecompositionTemplate {
  public readonly intent = GoalIntent.INVESTIGATION;

  generateTasks(goal: Goal, availableTools?: string[]): TaskSpecification[] {
    const now = Date.now();
    const tasks: TaskSpecification[] = [];
    const forbidden = goal.constraints.forbiddenTools;
    const mandatory = goal.constraints.mandatoryTools;

    // Step 1: Gather Evidence
    const gatherRisk = resolveTaskRisk('LOW', goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
    tasks.push({
      id: `task_${goal.id}_1`,
      parentGoalId: goal.id,
      title: `Gather Evidence & Diagnostic Logs`,
      description: `Investigate and gather relevant logs, code structures, and context for: ${goal.description}`,
      taskType: TaskType.INSPECT,
      expectedOutcome: `Comprehensive diagnostic logs, error traces, and relevant file contexts collected.`,
      expectedInputs: ['investigation query', 'error reports', 'file paths'],
      expectedOutputs: ['collected logs', 'file snippets', 'error stack traces'],
      toolHints: filterToolHints(['view_file', 'list_dir', 'run_command', ...mandatory], forbidden, availableTools),
      riskLevel: gatherRisk.riskLevel,
      approvalRequired: gatherRisk.approvalRequired,
      createdAt: now
    });

    // Step 2: Analyze Root Cause
    const analyzeRisk = resolveTaskRisk('LOW', goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
    tasks.push({
      id: `task_${goal.id}_2`,
      parentGoalId: goal.id,
      title: `Analyze Patterns & Determine Root Cause`,
      description: `Analyze collected evidence to isolate the defect, constraint, or underlying pattern.`,
      taskType: TaskType.ANALYZE,
      expectedOutcome: `Definitive root cause identified with supporting evidence.`,
      expectedInputs: ['collected logs', 'file snippets', 'diagnostic context'],
      expectedOutputs: ['root cause analysis', 'impact assessment', 'candidate remediations'],
      toolHints: filterToolHints([...mandatory], forbidden, availableTools),
      riskLevel: analyzeRisk.riskLevel,
      approvalRequired: analyzeRisk.approvalRequired,
      createdAt: now
    });

    // Step 3: Validate & Synthesize Findings
    const reportRisk = resolveTaskRisk('LOW', goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
    tasks.push({
      id: `task_${goal.id}_3`,
      parentGoalId: goal.id,
      title: `Synthesize Investigation Report`,
      description: `Formulate a structured investigation synthesis explaining the findings and actionable next steps.`,
      taskType: TaskType.COMMUNICATE,
      expectedOutcome: `Clear, evidence-backed summary addressing: ${goal.desiredOutcome}`,
      expectedInputs: ['root cause analysis', 'candidate remediations'],
      expectedOutputs: ['investigation report', 'recommended actions'],
      toolHints: filterToolHints([...mandatory], forbidden, availableTools),
      riskLevel: reportRisk.riskLevel,
      approvalRequired: reportRisk.approvalRequired,
      createdAt: now
    });

    return tasks;
  }
}

export class TestingAndVerificationTemplate implements DecompositionTemplate {
  public readonly intent = GoalIntent.TESTING_AND_VERIFICATION;

  generateTasks(goal: Goal, availableTools?: string[]): TaskSpecification[] {
    const now = Date.now();
    const tasks: TaskSpecification[] = [];
    const forbidden = goal.constraints.forbiddenTools;
    const mandatory = goal.constraints.mandatoryTools;

    // Step 1: Prepare Test Environment
    const prepRisk = resolveTaskRisk('LOW', goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
    tasks.push({
      id: `task_${goal.id}_1`,
      parentGoalId: goal.id,
      title: `Prepare Test Suite & Verification Harness`,
      description: `Ensure test files, assertions, and verification environments are configured for: ${goal.description}`,
      taskType: TaskType.INSPECT,
      expectedOutcome: `Test environment verified and ready for execution.`,
      expectedInputs: ['test target specifications', 'configuration files'],
      expectedOutputs: ['test suite status', 'prepared fixtures'],
      toolHints: filterToolHints(['view_file', 'list_dir', ...mandatory], forbidden, availableTools),
      riskLevel: prepRisk.riskLevel,
      approvalRequired: prepRisk.approvalRequired,
      createdAt: now
    });

    // Step 2: Execute Test Suite
    const execRisk = resolveTaskRisk('MEDIUM', goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
    tasks.push({
      id: `task_${goal.id}_2`,
      parentGoalId: goal.id,
      title: `Execute Tests & Static Analysis`,
      description: `Run test commands, linters, and typecheckers to evaluate test assertions.`,
      taskType: TaskType.EXECUTE,
      expectedOutcome: `Execution output from test runners and static analysis tools.`,
      expectedInputs: ['test scripts', 'verification rules'],
      expectedOutputs: ['test execution results', 'pass/fail matrix'],
      toolHints: filterToolHints(['run_command', 'lint_applet', 'compile_applet', ...mandatory], forbidden, availableTools),
      riskLevel: execRisk.riskLevel,
      approvalRequired: execRisk.approvalRequired,
      createdAt: now
    });

    // Step 3: Evaluate Results & Validate Criteria
    const evalRisk = resolveTaskRisk('LOW', goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
    const criteriaSummary = goal.successCriteria.length > 0
      ? `Verify against success criteria:\n- ${formatCriteriaDescriptions(goal.successCriteria).join('\n- ')}`
      : 'Validate all test outcomes against expected results.';

    tasks.push({
      id: `task_${goal.id}_3`,
      parentGoalId: goal.id,
      title: `Evaluate Results & Report Verification Status`,
      description: `${criteriaSummary}`,
      taskType: TaskType.VERIFY,
      expectedOutcome: `Verified report indicating pass/fail status and criterion coverage.`,
      expectedInputs: ['test execution results', 'pass/fail matrix', 'success criteria'],
      expectedOutputs: ['final verification report', 'criterion compliance breakdown'],
      toolHints: filterToolHints([...mandatory], forbidden, availableTools),
      riskLevel: evalRisk.riskLevel,
      approvalRequired: evalRisk.approvalRequired,
      createdAt: now
    });

    return tasks;
  }
}

export class InfrastructureOpsTemplate implements DecompositionTemplate {
  public readonly intent = GoalIntent.INFRASTRUCTURE_OPS;

  generateTasks(goal: Goal, availableTools?: string[]): TaskSpecification[] {
    const now = Date.now();
    const tasks: TaskSpecification[] = [];
    const forbidden = goal.constraints.forbiddenTools;
    const mandatory = goal.constraints.mandatoryTools;

    // Step 1: Assess Current State
    const assessRisk = resolveTaskRisk('LOW', goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
    tasks.push({
      id: `task_${goal.id}_1`,
      parentGoalId: goal.id,
      title: `Assess Infrastructure State & Configuration`,
      description: `Audit current environment configuration, services, and dependencies for: ${goal.description}`,
      taskType: TaskType.INSPECT,
      expectedOutcome: `Validated infrastructure state and baseline configuration.`,
      expectedInputs: ['infrastructure config', 'environment variables'],
      expectedOutputs: ['infrastructure assessment', 'prerequisite status'],
      toolHints: filterToolHints(['view_file', 'list_dir', 'run_command', ...mandatory], forbidden, availableTools),
      riskLevel: assessRisk.riskLevel,
      approvalRequired: assessRisk.approvalRequired,
      createdAt: now
    });

    // Step 2: Apply Infrastructure Operations
    const opRisk = resolveTaskRisk('HIGH', goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
    tasks.push({
      id: `task_${goal.id}_2`,
      parentGoalId: goal.id,
      title: `Execute Infrastructure Operations`,
      description: `Apply operational changes, configuration updates, or environment modifications.`,
      taskType: TaskType.EXECUTE,
      expectedOutcome: `Operations applied cleanly to target infrastructure.`,
      expectedInputs: ['infrastructure assessment', 'operation parameters'],
      expectedOutputs: ['operation execution logs', 'updated configuration'],
      toolHints: filterToolHints(['run_command', ...mandatory], forbidden, availableTools),
      riskLevel: opRisk.riskLevel,
      approvalRequired: opRisk.approvalRequired,
      createdAt: now
    });

    // Step 3: Verify Infrastructure Health
    const verifyRisk = resolveTaskRisk('LOW', goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
    tasks.push({
      id: `task_${goal.id}_3`,
      parentGoalId: goal.id,
      title: `Verify Infrastructure Health & Service Availability`,
      description: `Perform health checks and connectivity verifications to ensure stability.`,
      taskType: TaskType.VERIFY,
      expectedOutcome: `Confirmed service health and operational readiness.`,
      expectedInputs: ['updated configuration', 'health endpoints'],
      expectedOutputs: ['health check results', 'operational status confirmation'],
      toolHints: filterToolHints(['run_command', ...mandatory], forbidden, availableTools),
      riskLevel: verifyRisk.riskLevel,
      approvalRequired: verifyRisk.approvalRequired,
      createdAt: now
    });

    return tasks;
  }
}

export class InformationRetrievalTemplate implements DecompositionTemplate {
  public readonly intent = GoalIntent.INFORMATION_RETRIEVAL;

  generateTasks(goal: Goal, availableTools?: string[]): TaskSpecification[] {
    const now = Date.now();
    const tasks: TaskSpecification[] = [];
    const forbidden = goal.constraints.forbiddenTools;
    const mandatory = goal.constraints.mandatoryTools;

    // Step 1: Search & Locate Sources
    const searchRisk = resolveTaskRisk('LOW', goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
    tasks.push({
      id: `task_${goal.id}_1`,
      parentGoalId: goal.id,
      title: `Search & Locate Information Sources`,
      description: `Locate relevant documentation, files, or external resources for: ${goal.description}`,
      taskType: TaskType.RETRIEVE,
      expectedOutcome: `Relevant sources and references located.`,
      expectedInputs: ['retrieval query', 'keywords'],
      expectedOutputs: ['source list', 'retrieved documents'],
      toolHints: filterToolHints(['search_web', 'view_file', 'list_dir', ...mandatory], forbidden, availableTools),
      riskLevel: searchRisk.riskLevel,
      approvalRequired: searchRisk.approvalRequired,
      createdAt: now
    });

    // Step 2: Extract & Synthesize
    const extractRisk = resolveTaskRisk('LOW', goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
    tasks.push({
      id: `task_${goal.id}_2`,
      parentGoalId: goal.id,
      title: `Extract & Synthesize Information`,
      description: `Extract specific answers, citations, and summaries to address: ${goal.desiredOutcome}`,
      taskType: TaskType.COMMUNICATE,
      expectedOutcome: `Synthesized, accurate answer with verified citations and references.`,
      expectedInputs: ['source list', 'retrieved documents'],
      expectedOutputs: ['synthesized response', 'citations'],
      toolHints: filterToolHints([...mandatory], forbidden, availableTools),
      riskLevel: extractRisk.riskLevel,
      approvalRequired: extractRisk.approvalRequired,
      createdAt: now
    });

    return tasks;
  }
}

export class GeneralChatTemplate implements DecompositionTemplate {
  public readonly intent = GoalIntent.GENERAL_CHAT;

  generateTasks(goal: Goal, availableTools?: string[]): TaskSpecification[] {
    const now = Date.now();
    const tasks: TaskSpecification[] = [];
    const forbidden = goal.constraints.forbiddenTools;
    const mandatory = goal.constraints.mandatoryTools;

    const chatRisk = resolveTaskRisk('LOW', goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
    tasks.push({
      id: `task_${goal.id}_1`,
      parentGoalId: goal.id,
      title: `Formulate Contextual Response`,
      description: `Compose a direct, clear, and helpful response for: ${goal.description}`,
      taskType: TaskType.COMMUNICATE,
      expectedOutcome: `Structured, conversational response addressing the user intent.`,
      expectedInputs: ['user prompt', 'conversational context'],
      expectedOutputs: ['conversational response'],
      toolHints: filterToolHints([...mandatory], forbidden, availableTools),
      riskLevel: chatRisk.riskLevel,
      approvalRequired: chatRisk.approvalRequired,
      createdAt: now
    });

    return tasks;
  }
}

export function getDecompositionTemplateForIntent(intent: GoalIntent): DecompositionTemplate {
  switch (intent) {
    case GoalIntent.CODE_MODIFICATION:
      return new CodeModificationTemplate();
    case GoalIntent.INVESTIGATION:
      return new InvestigationTemplate();
    case GoalIntent.TESTING_AND_VERIFICATION:
      return new TestingAndVerificationTemplate();
    case GoalIntent.INFRASTRUCTURE_OPS:
      return new InfrastructureOpsTemplate();
    case GoalIntent.INFORMATION_RETRIEVAL:
      return new InformationRetrievalTemplate();
    case GoalIntent.GENERAL_CHAT:
      return new GeneralChatTemplate();
    default:
      throw new Error(`Unsupported GoalIntent: ${String(intent)}`);
  }
}
