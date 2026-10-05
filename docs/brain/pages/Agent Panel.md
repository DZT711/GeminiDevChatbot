title:: Agent Panel
type:: [[type/component]]
layer:: #frontend
path:: `src/client/components/workspace/AgentPanel.tsx`
status:: #active
depends-on:: [[Agent Session]], [[AgentSessionService]], [[Workspace Terminal]], [[ChangeSet]]
consumed-by:: [[Workspace]]

- # Agent Panel
  - **Role**: Dedicated workspace agent chat panel embedded in the split-pane IDE interface.
  - **Source Implementation**: `src/client/components/workspace/AgentPanel.tsx`

- ## Features & Capabilities
  - **Real-Time Streaming**: Renders token-by-token model responses with thought-chain drawers.
  - **Live Tool Activities**: Shows active tool execution phases (`call` and `result`) via `AgentActivityCard`.
  - **Terminal Bridge**: Embeds live terminal command output cards (`TerminalCommandRecord`).
  - **Atomic Diff Review**: Directly embeds reviewable change cards via [[ChangeSet]].
  - **Handoff Action**: Allows immediate context transfer to the main chat via "Continue in Chat".
  - **Pure State Updates**: Decoupled from `ChatProvider` reconciliation cycles via asynchronous scheduling (`setTimeout(..., 0)`).

- ## Related Lessons
  - [[Bug/ChatProvider-Render-Conflict]]
  - [[Bug/Katex-Pluggable-Tuple-Types]]
