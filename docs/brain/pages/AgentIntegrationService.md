title:: AgentIntegrationService
type:: [[type/service]]
layer:: #backend
path:: `src/server/services/agentIntegration/AgentIntegrationService.ts`
status:: #active
depends-on:: [[ToolExecutionAdapter]], [[AgentSessionService]]
consumed-by:: [[ChatController]], [[Agent Panel]]

- # AgentIntegrationService
  - **Role**: Server-side coordinator for multi-turn LLM tool execution loops, tool response packaging, and model fallback management.
  - **Source Implementation**: `src/server/services/agentIntegration/AgentIntegrationService.ts`

- ## Key Operations
  - **Multi-Turn Execution Loop**: Executes model turns up to `maxTurns`, intercepting tool calls (`functionCall`), dispatching them to [[ToolExecutionAdapter]], and feeding back results (`functionResponse`).
  - **Thought Signature Preservation**: Retains model thinking signatures across function calls and turns.
  - **Cascading Model Fallback**: Intercepts upstream 503 (High Demand) errors and transparently falls back to secondary models (`gemini-3.1-flash-lite`) without failing the turn.
  - **Session Event Streaming**: Emits real-time SSE events for tool activity (`call` and `result`) directly to connected frontends.
