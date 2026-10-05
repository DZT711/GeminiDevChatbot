title:: Architecture
type:: [[type/knowledge]]

- # DevGenie Architecture Overview

- ## Architectural Topology
  - **Client Surface**:
    - [[Chat]]: Standard conversational interface and session switcher (`src/client/components/ChatWindow.tsx`).
    - [[Workspace]]: Project workspace view, code editor, and file explorer (`src/client/components/WorkspaceTab.tsx`).
    - [[Agent Panel]]: Dedicated right-side workspace agent chat & execution viewer (`src/client/components/workspace/AgentPanel.tsx`).
    - [[Workspace Terminal]]: Interactive terminal with stdout/stderr execution monitoring (`src/client/components/workspace/WorkspaceTerminal.tsx`).
  - **Context & Session Layer**:
    - [[Agent Session]]: Canonical thread state coordinating status, metadata, and handoffs (`src/agent/session/AgentSession.ts`).
    - [[SurfaceContextBridge]]: Bridges context between Chat and Workspace surfaces (`src/agent/session/SurfaceContextBridge.ts`).
    - [[AgentSessionService]]: Server service dispatching SSE events (`src/server/services/session/AgentSessionService.ts`).
  - **Orchestration & Execution**:
    - [[Agent Runtime]]: Single authoritative execution orchestrator (`src/agent/runtime/AgentRuntime.ts`).
    - [[AgentIntegrationService]]: Server orchestrator running multi-turn LLM loops (`src/server/services/agentIntegration/AgentIntegrationService.ts`).
    - [[ToolExecutionAdapter]]: Adapts workspace tools for runtime execution (`src/server/services/agentIntegration/execution/ToolExecutionAdapter.ts`).
    - [[PlanExecutionService]]: Executes validated Directed Task Graphs (`src/server/services/agentIntegration/planning/PlanExecutionService.ts`).
  - **Planning & Cognitive Layer**:
    - [[Planning]]: Directed Task Graph decomposition, validation, and repair (`src/agent/planner/`).
    - [[Memory]]: Contextual memory management (`src/agent/memory/`).
    - [[RAG]]: Semantic vector retrieval and knowledge nodes (`src/agent/retrieval/`, `src/server/controllers/KnowledgeController.ts`).

- ## Non-Negotiable Architecture Invariants
  - 1. **`src/agent/` must remain vendor/provider agnostic**: Zero direct imports of `@google/genai`, `openai`, or any vendor SDK in core.
  - 2. **Planner never executes tools**: Planner only constructs, validates, and repairs task graphs.
  - 3. **Runtime is the execution orchestrator**: All task executions are governed exclusively through `AgentRuntime`.
  - 4. **Tool Registry never executes tools**: Registry only stores descriptors, permissions, and metadata.
  - 5. **ExecutionPipeline is the tool execution boundary**: All invocations must pass through input validation, permissions, hooks, and normalization.
  - 6. **Retriever does not generate embeddings**: Embedding generation is delegated to external providers.
  - 7. **Memory does not perform vector retrieval**: Working memory is segregated from semantic vector indexing.
  - 8. **ContextBuilder does not call the LLM directly**: Context builder constructs structured prompts; model invocation is done externally.
  - 9. **Reflection is a passive observer only**: It inspects telemetry and execution records without mutating active state.
  - 10. **Learning does not directly mutate durable Knowledge or Memory**: Generates proposed candidates requiring review or validation.
  - 11. **Tool Discovery never executes tools**: Discovery identifies available schemas; execution stays in the pipeline.
  - 12. **Execution never performs discovery**: Execution receives concrete tool descriptors.
  - 13. **MCP is only a ToolProvider implementation**: Model Context Protocol serves strictly as a tool adapter.
  - 14. **Checkpoints must be safe before mutation**: State must be captured before destructive operations.
  - 15. **Preserve feature flags and rollback mechanisms**: Legacy execution branches remain accessible for safety.
  - 16. **No second execution authority**: One canonical `AgentSession` and `AgentRuntime` per interaction thread.
