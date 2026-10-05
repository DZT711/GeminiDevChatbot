title:: Planning
type:: [[type/service]]
layer:: #core
path:: `src/agent/planner/`
status:: #active
depends-on:: [[Agent Runtime]], [[ExecutionPipeline]]
consumed-by:: [[PlanExecutionService]], [[Agent Panel]]

- # Planning System
  - **Role**: Decomposes complex developer goals into validated Directed Task Graphs (DAGs).
  - **Source Implementation**: `src/agent/planner/` and `src/server/services/agentIntegration/planning/PlanExecutionService.ts`

- ## Core Components
  - **GoalDecomposer**: Breaks high-level prompts into actionable phase steps (`src/agent/decomposition/GoalDecomposer.ts`).
  - **TaskGraph**: DAG representation enforcing explicit predecessor/successor dependency constraints (`TaskGraph.ts`).
  - **PlanRepairer**: Autonomous replanning policy that detects step failures, classifies error types, and generates repaired subgraphs without restarting entire plans (`PlanRepairer.ts`).
  - **Planning Strategies**: Rule-based, LLM-based, and Hybrid planning strategies (`LLMPlanningStrategy.ts`, `RuleBasedPlanningStrategy.ts`).

- ## Non-Negotiable Boundary
  - **Planner never executes tools**: The planning engine only creates, validates, serializes, and repairs plans. Execution is delegated strictly to [[PlanExecutionService]] and [[Agent Runtime]].
