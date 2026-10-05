title:: ToolExecutionAdapter
type:: [[type/service]]
layer:: #backend
path:: `src/server/services/agentIntegration/execution/ToolExecutionAdapter.ts`
status:: #active
depends-on:: [[Workspace Terminal]], [[AgentSessionService]]
consumed-by:: [[AgentIntegrationService]], [[PlanExecutionService]]

- # ToolExecutionAdapter
  - **Role**: Concrete tool execution boundary adapting workspace tools and shell processes for agent consumption.
  - **Source Implementation**: `src/server/services/agentIntegration/execution/ToolExecutionAdapter.ts`

- ## Available Tools
  - `run_command`: Spawns a detached bash child process, streams real-time stdout/stderr lines via SSE, and captures `{ exitCode, stdout, stderr, durationMs }`.
  - `view_file` / `read_file`: Reads files safely within workspace root bounds.
  - `create_file`: Creates new files in workspace directory.
  - `edit_file`: Performs unified string replacements within files.
  - `delete_file`: Deletes target files safely.
  - `list_dir`: Lists directory entries with depth and entry types.

- ## Output Contract
  - Output is normalized into clean JSON results or text blocks and fed directly back into model turns as `functionResponse`.
