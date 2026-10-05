title:: flow/RunCommand
type:: [[type/flow]]
status:: [[verified]]

- # Execution Flow: RunCommand
  - Describes the exact path when a user prompts the agent to run a shell command in the workspace.

- ## Sequence Path
  - **1. User Action**:
    - User types a prompt requesting command execution (e.g. `npm test`, `git status`) in [[Agent Panel]] (`src/client/components/workspace/AgentPanel.tsx`).
  - **2. Session Dispatch**:
    - `AgentPanel.handleSendMessage` attaches active `sessionId`, `workspaceId`, and model config, posting to `/api/chat`.
  - **3. Orchestration Layer**:
    - [[AgentIntegrationService]] (`src/server/services/agentIntegration/AgentIntegrationService.ts`) handles the turn loop. The LLM decides to emit a `functionCall` named `run_command` with `{ CommandLine, Cwd }`.
  - **4. Execution Boundary**:
    - `AgentIntegrationService` delegates the call to [[ToolExecutionAdapter]] (`src/server/services/agentIntegration/execution/ToolExecutionAdapter.ts`).
  - **5. Child Process Spawn & SSE Streaming**:
    - `ToolExecutionAdapter` spawns a detached bash process (`child_process.spawn('bash', ['-c', command])`).
    - Standard output chunks (`child.stdout.on('data')`) emit `terminal_output` SSE events via `di.agentSessionService.emitSessionEvent`.
    - [[Workspace Terminal]] and [[Agent Panel]] receive events in real-time, rendering stdout/stderr lines in the terminal screen.
  - **6. Process Termination & Result Packaging**:
    - Child process exits (`close` event). `ToolExecutionAdapter` emits `terminal_exit` and resolves `{ status: "success" | "error", exitCode, stdout, stderr, durationMs }`.
  - **7. Agent Continuation**:
    - `AgentIntegrationService` wraps the result into a `functionResponse` part:
      ```json
      {
        "role": "user",
        "parts": [{ "functionResponse": { "name": "run_command", "response": { ... } } }]
      }
      ```
    - The model reads the terminal output, inspects exit codes and logs, and autonomously formulates the next turn or code fix.
