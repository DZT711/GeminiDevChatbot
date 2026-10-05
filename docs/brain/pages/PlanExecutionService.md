title:: PlanExecutionService
type:: [[type/service]]
layer:: #backend
path:: `src/server/services/agentIntegration/planning/PlanExecutionService.ts`
status:: #active
depends-on:: [[Planning]], [[ToolExecutionAdapter]], [[Agent Runtime]]
consumed-by:: [[AgentIntegrationService]], [[Agent Panel]]

- # PlanExecutionService
  - **Role**: Coordinates the sequential and dependency-ordered execution of Directed Task Graphs.
  - **Source Implementation**: `src/server/services/agentIntegration/planning/PlanExecutionService.ts`

- ## Responsibilities
  - Validates plan topological order before beginning execution.
  - Dispatches step tasks to [[ToolExecutionAdapter]] or runtime workers.
  - Broadcasts plan milestone events (`APPROVED`, `EXECUTED`, `COMPLETED`, `REJECTED`) to UI surfaces.
  - Triggers autonomous plan repair when individual steps fail, preserving completed predecessor outputs.
