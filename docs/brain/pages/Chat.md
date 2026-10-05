title:: Chat
type:: [[type/component]]
layer:: #frontend
path:: `src/client/components/ChatWindow.tsx`
status:: #active
depends-on:: [[Agent Session]], [[ChatController]], [[SurfaceContextBridge]]
consumed-by:: [[DevGenie]]

- # Chat System
  - **Role**: Primary conversational surface supporting streaming text, markdown formatting, attachment previews, and slash commands.
  - **Source Implementation**: `src/client/components/ChatWindow.tsx` and `src/server/controllers/ChatController.ts`

- ## Features
  - **Streaming Token Delivery**: Real-time server-sent event (SSE) streaming via `/api/chat`.
  - **Slash Commands**: Quick triggers (`/plan`, `/goal`, `/rag`, `/math`, `/image`, `/video`, `/clear`, `/skills`).
  - **Model Selection**: Multi-model switching with thinking level configuration.
  - **Session Management**: Session pinning, renaming, searching, and exporting.
  - **Handoff to Workspace**: Launches or resumes active workspaces seamlessly via [[SurfaceContextBridge]].
