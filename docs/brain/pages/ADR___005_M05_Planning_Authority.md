title:: ADR/005-M05-Planning-Authority
type:: [[type/adr]]
status:: [[accepted]]
importance:: #high
module:: `src/agent/planner/`, `src/agent/decomposition/`
date:: [[2026-09-28]]

- # ADR 005: Planning Engine Produces Directed Task Graphs Without Tool Execution

- ## Decision
  - The planning engine (`src/agent/planner/`) is restricted to decomposing goals, building Directed Task Graphs (DAGs), checking topological step constraints, and repairing failed step paths. It must never execute tools directly.

- ## Reason
  - Separation of Concerns: Planning models reasoning and dependency structure; execution requires concrete runtime authority, process isolation, and sandboxing. Blurring them creates untraceable side-effects during planning simulation.

- ## Evidence
  - Verified in `src/agent/planner/Planner.ts` and `src/agent/planner/TaskGraph.ts`. Plan execution is cleanly separated into [[PlanExecutionService]] and [[Agent Runtime]].
