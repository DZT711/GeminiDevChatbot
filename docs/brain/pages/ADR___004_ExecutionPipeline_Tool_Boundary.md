title:: ADR/004-ExecutionPipeline-Tool-Boundary
type:: [[type/adr]]
status:: [[accepted]]
importance:: #high
module:: `src/agent/tools/`
date:: [[2026-09-28]]

- # ADR 004: ExecutionPipeline as Strict Tool Execution Boundary

- ## Decision
  - All agent tool invocations must pass through `ExecutionPipeline` (`src/agent/tools/ExecutionPipeline.ts`). Tool Registries, Planners, and Tool Discovery components are strictly forbidden from executing tools directly.

- ## Reason
  - Direct tool execution by registries or planners bypasses input schema validation, security permissions, telemetry hooks, and result normalization, risking uncontrolled file and system mutations.

- ## Evidence
  - Verified in `src/agent/tools/ExecutionPipeline.ts` and `src/server/services/agentIntegration/execution/ToolExecutionAdapter.ts`. Tools must pass `InputValidator`, `PermissionValidator`, and `ExecutionHooks` before reaching `ToolExecutor`.
