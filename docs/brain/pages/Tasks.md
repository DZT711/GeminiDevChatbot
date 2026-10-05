title:: Tasks
type:: [[type/task]]

- # Engineering Tasks & Roadmap

- ## Milestone Tasks
  - [x] **M01**: Core chat, streaming markdown, and session persistence.
  - [x] **M02**: Architectural separation into provider-agnostic core (`src/agent/`).
  - [x] **M03**: Context building, RAG, and knowledge proposal workflow.
  - [x] **M04**: Tool registry, input validator, and unified `ExecutionPipeline`.
  - [x] **M05**: Directed Task Graph planning engine and replanning heuristics.
  - [x] **M06-01**: Shared canonical `AgentSession` foundation with SSE events.
  - [x] **M06-02**: Right-side Workspace Agent Panel (`AgentPanel.tsx`) connected to shared session.
  - [x] **M06-03**: React 19 cross-component state update decoupling & KaTeX default rendering.
  - [ ] **M07**: Durable database persistence for ExperienceStore & production scale hardening.

- ## Active Work Items
  - [x] Set up [[DevGenie Brain]] as practical, Git-versioned Logseq second brain.
  - [ ] Add batched metadata hydration in vector retriever to eliminate N+1 overhead (`docs/TECHNICAL_DEBT.md`).
  - [ ] Bound in-memory reflection logs and learning queues behind size limits.
  - [ ] Replace character-count token estimation heuristic with lightweight tokenizer.
