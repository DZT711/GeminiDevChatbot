title:: ADR/001-Provider-Agnostic-Agent-Core
type:: [[type/adr]]
status:: [[accepted]]
importance:: #critical
module:: `src/agent/`
date:: [[2026-09-28]]

- # ADR 001: Provider-Agnostic Agent Core

- ## Decision
  - The core agent architecture in `src/agent/` must remain completely free of vendor-specific SDK imports (e.g. `@google/genai`, `openai`, `anthropic`, `langchain`).

- ## Reason
  - Decoupling core orchestration, state machines, context abstractions, and planning graphs from specific LLM providers ensures multi-model portability, testability without external API mocks, and clean architectural boundaries.

- ## Evidence
  - Verified by `Agent_Core_Provider_Check.md`: 0 vendor imports across `src/agent/runtime`, `src/agent/planner`, `src/agent/tools`, `src/agent/memory`, `src/agent/checkpoint`, and `src/agent/session`. All LLM calls occur in external strategies and server controllers.
