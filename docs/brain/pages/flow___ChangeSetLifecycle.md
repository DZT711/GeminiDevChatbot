title:: flow/ChangeSetLifecycle
type:: [[type/flow]]
status:: [[verified]]

- # Execution Flow: ChangeSetLifecycle
  - Describes the exact path from model file modification proposal through user review to disk commit or rollback.

- ## Sequence Path
  - **1. Proposal Generation**:
    - During an agent turn, the model determines code changes are necessary.
    - `AgentIntegrationService` generates a [[ChangeSet]] record (`src/agent/changes/ChangeSetTypes.ts`) containing:
      - `changeSetId`: Unique identifier
      - `status`: `PROPOSED`
      - `changes`: Array of file entries (`path`, `type: 'create' | 'update' | 'delete'`, `diffHunks`)
  - **2. Broadcast to UI**:
    - Backend emits `change_set_created` SSE event via [[AgentSessionService]].
    - [[Agent Panel]] receives the event, adds the change set to local state, and renders a `SimplifiedChangeRecord` or `ChangeSetReview` card.
  - **3. User Review**:
    - User inspects the unified diff in the workspace interface.
    - Options:
      - **Apply**: User clicks "Apply Changes".
      - **Reject**: User clicks "Reject Changes".
  - **4. Execution & Disk Mutation**:
    - On Apply: `workspaceService.applyChangeSet(changeSetId, sessionId, workspaceId)` is called (`src/client/services/workspaceService.ts`).
    - Backend applies atomic file writes, updates status to `APPLIED`, and dispatches `workspace:refresh` custom event.
    - [[Workspace]] explorer updates file trees and reloads modified editor buffers.
  - **5. Rollback (Undo)**:
    - If user later clicks "Undo": `handleUndoChangeSet` triggers `workspaceService.rejectChangeSet`, restoring previous file contents from the stored pre-mutation checkpoint.
