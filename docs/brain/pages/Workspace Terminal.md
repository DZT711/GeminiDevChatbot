title:: Workspace Terminal
type:: [[type/component]]
layer:: #frontend
path:: `src/client/components/workspace/WorkspaceTerminal.tsx`
status:: #active
depends-on:: [[ToolExecutionAdapter]], [[AgentSessionService]]
consumed-by:: [[Workspace]], [[Agent Panel]]

- # Workspace Terminal
  - **Role**: Embedded terminal console for executing shell commands and displaying live streaming output.
  - **Source Implementation**: `src/client/components/workspace/WorkspaceTerminal.tsx`

- ## Key Capabilities
  - **Live Process Streaming**: Renders `stdout` and `stderr` streams sent from the backend process runner via SSE.
  - **Process Lifecycle Tracking**: Displays elapsed duration, exit codes (`0`, `1`, `124` for timeout, `130` for aborted), and completion badges.
  - **Command Registry**: Integrates with backend child processes allowing abort signals (`SIGINT`, `SIGKILL`) or interactive input.
  - **Keyboard Shortcuts**: Supports `Ctrl+L` (clear buffer), `Escape` (clear input), and history cycling (Up/Down arrows).
