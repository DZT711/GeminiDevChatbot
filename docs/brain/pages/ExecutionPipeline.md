title:: ExecutionPipeline
type:: [[type/service]]
layer:: #core
path:: `src/agent/tools/ExecutionPipeline.ts`
status:: #active
depends-on:: [[ADR/004-ExecutionPipeline-Tool-Boundary]]
consumed-by:: [[Agent Runtime]], [[ToolExecutionAdapter]]

- # ExecutionPipeline
  - **Role**: The strictly enforced boundary through which all tool executions must pass.
  - **Source Implementation**: `src/agent/tools/ExecutionPipeline.ts`

- ## Responsibilities
  - Validates tool input parameters against registered parameter schemas.
  - Enforces permission policies, sandboxing, and execution safety checks before invoking tool handlers.
  - Manages pre-execution and post-execution hooks (e.g., telemetry, timing, safety filtering).
  - Normalizes tool return values and error structures before handing results back to the caller.

- ## Architectural Invariants
  - **Single Execution Boundary**: Neither Planner, Discovery, nor Registry may execute tools directly. All tool calls must pass through `ExecutionPipeline`.
  - **Provider Agnostic**: Operates independently of specific LLM providers.
