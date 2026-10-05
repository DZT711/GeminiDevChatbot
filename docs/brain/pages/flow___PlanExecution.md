title:: flow/PlanExecution
type:: [[type/flow]]
status:: [[verified]]

- # Execution Flow: PlanExecution
  - Describes the exact path from complex objective prompt to validated Directed Task Graph execution and autonomous plan repair.

- ## Sequence Path
  - **1. Objective Decomposition**:
    - User submits an engineering task in [[Chat]] or [[Agent Panel]] (e.g., `/plan Implement JWT auth with refresh tokens`).
    - The planning engine decomposes the objective into sub-goals and dependencies via `GoalDecomposer.ts` and `LLMPlanningStrategy.ts` (`src/agent/planner/`).
  - **2. Task Graph Construction & Validation**:
    - [[Planning]] constructs a `TaskGraph` (`src/agent/planner/TaskGraph.ts`) with topological step ordering and explicit validation rules.
    - Verified plan is emitted to the UI as a `GoalPlanningResult`.
  - **3. User Approval**:
    - [[Agent Panel]] displays a plan execution card (`SimplifiedPlanRecord` or `PlanningResultCard`).
    - User clicks **"Approve & Execute"** (`handleApproveAndExecutePlan`).
  - **4. Stepped Execution**:
    - [[PlanExecutionService]] (`src/server/services/agentIntegration/planning/PlanExecutionService.ts`) iterates through steps in topological sequence.
    - Steps dispatch tool calls through [[ToolExecutionAdapter]] (e.g., `create_file`, `run_command`).
    - Real-time step progress (`APPROVED` -> `EXECUTED` -> `COMPLETED`) is broadcast to [[Agent Panel]].
  - **5. Failure & Replanning Branch**:
    - If a step fails, `PlanExecutionService` invokes `PlanRepairer.ts` (`src/agent/planner/PlanRepairer.ts`).
    - `PlanRepairer` inspects error output, preserves successful predecessor artifacts, and generates an in-flight repaired subgraph.
    - Execution resumes on the repaired path without losing earlier progress.
  - **6. Completion**:
    - All graph sinks succeed; plan status transitions to `COMPLETED`; workspace refreshes and reports summary.
