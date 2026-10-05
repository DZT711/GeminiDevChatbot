title:: SurfaceContextBridge
type:: [[type/service]]
layer:: #core
path:: `src/agent/session/SurfaceContextBridge.ts`
status:: #active
depends-on:: [[Agent Session]]
consumed-by:: [[Agent Panel]], [[Chat]], [[AgentSessionService]]

- # SurfaceContextBridge
  - **Role**: Mediates seamless state transitions and handoffs between the main Chat interface and the Workspace Agent Panel.
  - **Source Implementation**: `src/agent/session/SurfaceContextBridge.ts`

- ## Key Functions
  - Creates `AgentContextHandoff` payloads containing recent turns, active file paths, and execution status.
  - Preserves conversation continuity when a user clicks "Continue in Chat" from the workspace or opens the workspace from chat.
  - Ensures changes made in one surface are accurately reflected in the shared [[Agent Session]].
