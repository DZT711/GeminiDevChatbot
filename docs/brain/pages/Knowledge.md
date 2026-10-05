title:: Knowledge
type:: [[type/knowledge]]

- # DevGenie Knowledge Vault

- ## Verified Domain Knowledge
  - **Tool Protocol**: Tools declare a `ToolDescriptor` with input schemas, permissions, and lifecycle hooks (`src/agent/tools/`).
  - **ChangeSet Protocol**: All file creation, deletion, or edits in agent mode are captured as atomic `ChangeSet` records before disk mutation (`src/agent/changes/ChangeSetTypes.ts`).
  - **Terminal Bridge**: Interactive commands stream line-by-line chunks through server events and finalize with exit code, duration, and error diagnostics (`src/server/services/agentIntegration/execution/ToolExecutionAdapter.ts`).
  - **Math Formatting**: LaTeX mathematical notation is preprocessed by `mathUtils.ts` and typeset via KaTeX (`remark-math` and `rehype-katex`), enabled by default across all views.
  - **Planning Graph**: Complex tasks decompose into Directed Task Graphs with explicit dependencies, verification steps, and replanning heuristics (`src/agent/planner/`).
