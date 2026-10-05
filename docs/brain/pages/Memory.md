title:: Memory
type:: [[type/memory]]

- # Durable Project Memory: DevGenie

- ## Core Architectural Axioms
  - **Identity**: Project is named `DevGenie`; Brain is named `DevGenie Brain`.
  - **Truth Hierarchy**: Source code is implementation truth; tests are behavioral evidence; `docs/brain/` is durable project memory.
  - **Vendor Isolation**: `src/agent/` must remain 100% provider-agnostic. No vendor SDK imports permitted in core.
  - **Single Execution Authority**: Exactly one canonical `AgentSession` and one `AgentRuntime` per execution thread.

- ## Non-Negotiable Boundaries
  - `Planner` NEVER executes tools; it produces task graphs.
  - `Runtime` is the SOLE execution orchestrator.
  - `Tool Registry` NEVER executes tools; it stores definitions.
  - `ExecutionPipeline` is the STRICT tool execution boundary.
  - `Retriever` does not generate embeddings; it delegates to external providers.
  - `Memory` does not perform vector retrieval.
  - `ContextBuilder` does not invoke LLMs directly.
  - `Reflection` is a passive telemetry observer.
  - `Learning` never directly mutates durable storage without review.
  - `MCP` serves strictly as a `ToolProvider` implementation.

- ## Critical Failure-Avoidance Rules
  - **React 19 Pure State Updaters**: Never trigger cross-component state updates (e.g. `ChatProvider.setState`) inside another component's render phase or `setState` callback. Schedule asynchronously via `setTimeout(..., 0)`.
  - **Unified Plugin Typing**: Type plugin arrays passed to `ReactMarkdown` with `PluggableList` from `unified`.
  - **Server-Side API Proxying**: Never call LLM APIs directly from client code. Use `/api/chat`.
  - **Always Stream**: Use `generateContentStream` for conversational generation; log `usageMetadata` on responses.
  - **Atomic File Changes**: All edits in agent mode must generate reviewable `ChangeSet` diffs before committing to disk.
  - **No Secrets in Brain**: Never store API keys, passwords, bearer tokens, raw terminal dumps, or chain-of-thought in `docs/brain/`.
