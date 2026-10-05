title:: Project State
type:: [[type/project]]
last-updated:: 2026-09-29

- # Project State: DevGenie

- ## Milestone Trajectory
  - **Completed Milestones**:
    - **M01**: Core Chat Infrastructure, multi-provider model selection, and token streaming.
    - **M02**: Architectural separation into provider-agnostic core (`src/agent/`) and provider layer.
    - **M03**: Semantic context retrieval, RAG, and knowledge proposal workflow.
    - **M04**: Tool registry, input/permission validators, and unified `ExecutionPipeline`.
    - **M05**: Directed task graph planning, goal decomposition, and replanning heuristics.
    - **M06-01**: Shared canonical `AgentSession` with SSE event streaming.
    - **M06-02**: Right-Side Workspace Agent Panel (`AgentPanel.tsx`) connected to shared session.
  - **Current Milestone**:
    - **M06**: Workspace Integration & Multi-Surface Session Synchronization.
  - **Next Milestone**:
    - **M07**: Durable database persistence for ExperienceStore and production load hardening.

- ## Major Implemented Systems
  - **Orchestration**: Single authoritative [[Agent Runtime]] running isolated task cycles.
  - **Session Management**: Shared canonical [[Agent Session]] with real-time SSE stream dispatch.
  - **Interactive Workspace**: Split-pane IDE workspace (`WorkspaceTab`) with file explorer, editor, and [[Agent Panel]].
  - **Terminal Bridge**: Interactive command execution via [[Workspace Terminal]] streaming stdout/stderr in real-time.
  - **Diff Review Engine**: Atomic patch review via [[ChangeSet]] with Undo/Apply/Reject capabilities.
  - **Model Resilience**: Seamless fallback cascading from primary to backup models during upstream overload.
  - **KaTeX Typesetting**: Universal LaTeX mathematical notation rendering across chat and workspace views.

- ## Active Technical Debt (Documented in `docs/TECHNICAL_DEBT.md`)
  - **In-Memory Reflection Logs**: `RuleBasedReflection` stores logs in an unbounded in-memory array.
  - **In-Memory Learning Queue**: Candidate learning promotions need asynchronous durable persistence.
  - **N+1 Retrieval Hydration**: Metadata lookups during vector store retrieval require query batching.
  - **Character Heuristic Token Estimation**: `ContextBuilder` estimates tokens via char length rather than tokenizer.

- ## Verification Status
  - **TypeScript Compiler (`tsc --noEmit`)**: Clean (0 errors).
  - **Production Build (`vite build && esbuild`)**: Passing cleanly.
  - **Build Tooling**: Node.js, Express, Vite 6, Tailwind CSS v4, ESBuild.
