title:: Workspace
type:: [[type/component]]
layer:: #frontend
path:: `src/client/components/WorkspaceTab.tsx`
status:: #active
depends-on:: [[Agent Panel]], [[Workspace Terminal]], [[ChangeSet]]
consumed-by:: [[DevGenie]]

- # Workspace
  - **Role**: Primary full-stack developer workspace interface combining file explorer, editor, terminal, and agent assistant.
  - **Source Implementation**: `src/client/components/WorkspaceTab.tsx` and `src/agent/workspace/`

- ## Architecture & Layout
  - **Left / Center Pane**: Directory tree, file tabs, code editor with syntax highlighting, and collapsible [[Workspace Terminal]].
  - **Right Pane**: Collapsible [[Agent Panel]] displaying live agent turns and diffs.
  - **State Synchronization**: Automatically refreshes workspace file states upon terminal process termination or changeset application.
