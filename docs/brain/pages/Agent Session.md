title:: Agent Session
type:: [[type/service]]
layer:: #core
path:: `src/agent/session/AgentSession.ts`
status:: #active
depends-on:: [[SurfaceContextBridge]]
consumed-by:: [[AgentSessionService]], [[Agent Panel]], [[Chat]]

- # Agent Session
  - **Role**: Canonical shared thread context spanning multiple presentation surfaces.
  - **Source Implementation**: `src/agent/session/AgentSession.ts`

- ## Core Principle: "One Agent Session, Multiple Surfaces"
  - The agent session is canonical: Normal Chat, Workspace IDE, and Terminal all view and control the same active session context rather than creating isolated copies.
  - Maintains `AgentSessionStatus` (`IDLE`, `BUSY`, `PAUSED`, `ERROR`, `TERMINATED`).
  - Coordinates active workspace attachments and model configurations.
  - Dispatches event notifications across surfaces via [[SurfaceContextBridge]].

- ## Related Decisions
  - [[ADR/002-Shared-Canonical-AgentSession]]
