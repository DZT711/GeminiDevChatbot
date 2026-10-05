title:: Decisions
type:: [[type/adr]]

- # Architectural Decision Records (ADRs)

- ## Catalog of Verified Decisions
  - [[ADR/001-Provider-Agnostic-Agent-Core]] — Core agent directory `src/agent/` contains no vendor SDK dependencies.
  - [[ADR/002-Shared-Canonical-AgentSession]] — Single authoritative `AgentSession` across Normal Chat, Workspace, and Terminal.
  - [[ADR/003-Runtime-As-Execution-Authority]] — `AgentRuntime` is the exclusive orchestrator of execution state cycles.
  - [[ADR/004-ExecutionPipeline-Tool-Boundary]] — All tool executions must be routed through `ExecutionPipeline` checks and hooks.
  - [[ADR/005-M05-Planning-Authority]] — Planner strictly produces validated Directed Task Graphs; it never executes tools directly.

- ## Decision Criteria
  - Architectural decisions require:
    - Clear problem statement and context.
    - Verified code and behavioral test evidence.
    - Explicit module boundary definitions.
    - Conformance to non-negotiable architecture invariants.
