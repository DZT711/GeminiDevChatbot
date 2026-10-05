title:: ChangeSet
type:: [[type/component]]
layer:: #core
path:: `src/agent/changes/ChangeSetTypes.ts`
status:: #active
depends-on:: [[Workspace]]
consumed-by:: [[Agent Panel]], [[Workspace]]

- # ChangeSet
  - **Role**: Structured model for proposed file modifications ensuring atomic review and safe disk writes.
  - **Source Implementation**: `src/agent/changes/ChangeSetTypes.ts` and `src/client/components/workspace/ChangeSetReview.tsx`

- ## ChangeSet Lifecycle (`ChangeSetStatus`)
  - `PROPOSED` — Model proposes a change (add, update, delete) with unified diff chunks.
  - `APPLIED` — User or agent accepts and commits the change to disk.
  - `REJECTED` — User explicitly declines the change; workspace disk is not altered.
  - `CONFLICT` — Concurrent file edits detected requiring user arbitration.

- ## Key Operations
  - **Apply**: Writes new file contents or patches existing file.
  - **Undo**: Restores prior file state snapshot cleanly.
  - **Diff Rendering**: Unified side-by-side or inline syntax-highlighted diff display.
