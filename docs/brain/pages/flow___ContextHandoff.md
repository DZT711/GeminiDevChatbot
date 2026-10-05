title:: flow/ContextHandoff
type:: [[type/flow]]
status:: [[verified]]

- # Execution Flow: ContextHandoff
  - Describes the exact state transition when switching interaction between Normal Chat and the Workspace Agent.

- ## Sequence Path
  - **1. Trigger from Workspace Agent Panel**:
    - User clicks the **"Continue in Chat"** button in [[Agent Panel]] (`src/client/components/workspace/AgentPanel.tsx`).
  - **2. Session Synchronization**:
    - `AgentPanel.handleContinueInChat` calls `syncToChatSession(messages, sessionContext.sessionId)` (scheduled asynchronously to protect React 19 pure render cycles).
    - Calls `agentSessionService.createContextHandoff({ sessionId, sourceSurface: 'agent', targetSurface: 'chat' })` (`src/client/services/agentSessionService.ts`).
  - **3. Surface Context Bridge**:
    - Server-side [[SurfaceContextBridge]] (`src/agent/session/SurfaceContextBridge.ts`) constructs an `AgentContextHandoff` payload bundling:
      - `sessionId`: Canonical session ID
      - `recentMessages`: Last N conversation turns with normalized roles (`user` / `model`)
      - `workspaceId`: Attached workspace directory
      - `activeFilePath`: Active file inspected in workspace
      - `status`: Active session status
  - **4. Client View Transition**:
    - `AgentPanel.tsx` invokes `onContinueInChat?.(handoff)`.
    - `DevEngine.tsx.handleContinueInChat` receives the handoff payload:
      - Sets `currentSessionId` to `handoff.sessionId`.
      - Sets global chat messages from `handoff.recentMessages`.
      - Transitions UI view to `"chat"`.
  - **5. Continuation in Chat**:
    - [[Chat]] (`ChatWindow.tsx`) displays the full conversation history. The user continues prompting the model without loss of context.
