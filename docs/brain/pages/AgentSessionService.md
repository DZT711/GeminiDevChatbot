title:: AgentSessionService
type:: [[type/service]]
layer:: #backend
path:: `src/server/services/session/AgentSessionService.ts`
status:: #active
depends-on:: [[Agent Session]]
consumed-by:: [[AgentIntegrationService]], [[ToolExecutionAdapter]], [[Agent Panel]]

- # AgentSessionService
  - **Role**: Server-side registry and real-time SSE event dispatcher for shared canonical agent sessions.
  - **Source Implementation**: `src/server/services/session/AgentSessionService.ts`

- ## Key Endpoints & Capabilities
  - `getOrCreateSession(sessionId, options)`: Returns existing session or initializes a new thread.
  - `findSessionForWorkspace(workspaceId)`: Discovers active session linked to a specific workspace ID.
  - `attachWorkspace(sessionId, workspaceId)`: Associates session context to an interactive workspace directory.
  - `subscribeSessionEvents(sessionId, onEvent)`: Server-Sent Events (SSE) bus streaming tool execution, status changes, and terminal events directly to client UIs.
