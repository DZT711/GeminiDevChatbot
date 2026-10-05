title:: contents
type:: [[type/project]]

- # 🧭 DevGenie Brain Dashboard
  - Welcome to the durable knowledge graph for [[DevGenie]].

- ## Core Navigation
  - [[DevGenie]] — Project identity, high-level summary, and maintenance rules.
  - [[Project State]] — Milestone progress, major systems, and active technical debt.
  - [[Tech Stack]] — Runtime dependencies, build configuration, and libraries.
  - [[Architecture]] — System topology and non-negotiable architectural invariants.
  - [[Decisions]] — Catalog of Architectural Decision Records (ADRs).
  - [[Knowledge]] — Verified domain knowledge, protocols, and data models.
  - [[Lessons]] — Engineering lessons learned and post-mortems.
  - [[Memory]] — Compact axioms and failure-avoidance rules for coding agents.
  - [[Tasks]] — Implementation roadmap and active work items.
  - [[Experiments]] — Prototypes, benchmarks, and planning playgrounds.

- ## Architecture by Layer

- ### Components
  - [[Agent Panel]] — Right-side workspace agent chat & execution viewer.
  - [[Workspace]] — Split-pane IDE workspace container & file manager.
  - [[Workspace Terminal]] — Interactive terminal with stdout/stderr live buffers.
  - [[ChangeSet]] — Atomic file patch review, diff viewer, and rollback engine.
  - [[Chat]] — Primary conversational interface with model router and history.

- ### Services & Orchestration
  - [[Agent Runtime]] — Authoritative execution engine and lifecycle manager.
  - [[Agent Session]] — Canonical multi-surface session state and event router.
  - [[SurfaceContextBridge]] — Context preservation between Chat and Workspace.
  - [[AgentIntegrationService]] — Server orchestrator for multi-turn LLM loops.
  - [[ToolExecutionAdapter]] — Workspace tool executor and terminal bridge.
  - [[PlanExecutionService]] — Directed Task Graph planning and execution engine.
  - [[AgentSessionService]] — Real-time SSE event bus and session persistence.
  - [[RAG]] — Semantic vector search and in-memory knowledge store.

- ### Execution Flows
  - [[flow/RunCommand]] — Command invocation, terminal streaming, and feedback loop.
  - [[flow/ContextHandoff]] — Seamless session transitions between Chat and Workspace.
  - [[flow/ChangeSetLifecycle]] — Code modification proposal, review, apply, and undo.
  - [[flow/PlanExecution]] — Goal decomposition, step execution, and plan repair.

- ### Architectural Decisions (ADRs)
  - [[ADR/001-Provider-Agnostic-Agent-Core]] — Agent core SDK independence.
  - [[ADR/002-Shared-Canonical-AgentSession]] — Single authoritative session per thread.
  - [[ADR/003-Runtime-As-Execution-Authority]] — Runtime as the sole execution authority.
  - [[ADR/004-ExecutionPipeline-Tool-Boundary]] — Pipeline as strict tool execution boundary.
  - [[ADR/005-M05-Planning-Authority]] — Planner builds task graphs; never executes tools.

- ### Bug Memory & Lessons
  - [[Bug/ChatProvider-Render-Conflict]] — Decoupling cross-component state updates in React 19.
  - [[Bug/Katex-Pluggable-Tuple-Types]] — Tuple typing with `PluggableList` for remark/rehype.
