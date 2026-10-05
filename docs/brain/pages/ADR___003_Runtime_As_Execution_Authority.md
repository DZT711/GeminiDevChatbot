title:: ADR/003-Runtime-As-Execution-Authority
type:: [[type/adr]]
status:: [[accepted]]
importance:: #critical
module:: `src/agent/runtime/`
date:: [[2026-09-28]]

- # ADR 003: AgentRuntime as Sole Execution Authority

- ## Decision
  - `AgentRuntime` (`src/agent/runtime/AgentRuntime.ts`) is the single authoritative component permitted to orchestrate execution state transitions, manage execution contexts, and advance task execution cycles.

- ## Reason
  - Preventing split-brain execution authorities where controllers, planners, or UI hooks could independently advance or mutate execution states without global lifecycle tracking.

- ## Evidence
  - Verified in `src/agent/runtime/AgentRuntime.ts` and `src/server/services/agentIntegration/planning/PlanExecutionService.ts`. All execution lifecycle events (`RuntimeEvents.ts`) originate exclusively from `AgentRuntime`.
