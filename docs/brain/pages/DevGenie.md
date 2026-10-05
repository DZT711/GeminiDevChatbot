title:: DevGenie
alias:: [[DevGenie Brain]], DevGenie Brain
type:: [[type/project]]
status:: #active
source-of-truth:: Source code and tests

- # DevGenie
  - **Identity**: DevGenie is a developer-focused AI platform featuring provider-agnostic agent orchestration, interactive workspace tooling, live terminal execution streams, multi-turn task planning, and verified resilient code modification workflows.
  - **Knowledge Brain**: [[DevGenie Brain]] (`docs/brain/`) serves as durable project knowledge and engineering memory.
  
- ## Core Principles
  - **Single Execution Authority**: One canonical [[Agent Session]] and [[Agent Runtime]] per interaction thread.
  - **Provider-Agnostic Core**: `src/agent/` contains no vendor SDK imports; all LLM calls are orchestrated via external strategies and controllers.
  - **Observable & Reversible**: File system modifications must pass through [[ChangeSet]] review; terminal operations run with live user visibility.
  - **Resilient Multi-Model Routing**: Graceful cascading fallbacks when upstream capacity thresholds are encountered.

- ## Primary Architectural Modules
  - Orchestration & Core: [[Agent Runtime]], [[Agent Session]], [[SurfaceContextBridge]]
  - Execution & Integration: [[AgentIntegrationService]], [[ToolExecutionAdapter]], [[PlanExecutionService]]
  - Frontend Workspace: [[Agent Panel]], [[Workspace]], [[Workspace Terminal]], [[ChangeSet]]
  - Reasoning & Memory: [[Planning]], [[Memory]], [[RAG]], [[Chat]]

- ## Brain Authority & Maintenance Rules
  - 1. **Source code** is the current implementation truth.
  - 2. **Tests** are behavioral evidence.
  - 3. **`docs/brain/`** is durable project knowledge and engineering memory.
  - 4. **ADRs** store important architectural decisions.
  - 5. **Lessons** store reusable engineering lessons.
  - 6. **Journals** store temporary working activity.
  - 7. **Never store** secrets, API keys, passwords, raw terminal logs, full transcripts, or chain-of-thought in Brain.
