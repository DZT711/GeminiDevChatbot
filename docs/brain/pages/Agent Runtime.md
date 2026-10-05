title:: Agent Runtime
type:: [[type/service]]
layer:: #core
path:: `src/agent/runtime/AgentRuntime.ts`
status:: #active
depends-on:: [[ExecutionPipeline]], [[ExecutionContext]]
consumed-by:: [[AgentIntegrationService]], [[PlanExecutionService]]

- # Agent Runtime
  - **Role**: The single authoritative execution engine for agent task execution cycles.
  - **Source Implementation**: `src/agent/runtime/AgentRuntime.ts`

- ## Responsibilities
  - Maintains `ExecutionState` (`INITIALIZING`, `RUNNING`, `PAUSED`, `COMPLETED`, `FAILED`, `ABORTED`).
  - Manages scoped `ExecutionContext` variables, artifacts, and execution snapshots.
  - Emits runtime lifecycle events (`RuntimeEvents.ts`) for real-time monitoring.
  - Dispatches tool calls exclusively through the [[ExecutionPipeline]].

- ## Architectural Invariants
  - **Sole Authority**: Runtime is the only component authorized to transition execution states.
  - **Provider Agnostic**: Contains zero vendor SDK dependencies.
  - **Execution vs Discovery**: Runtime executes concrete tools; it never performs tool discovery.
