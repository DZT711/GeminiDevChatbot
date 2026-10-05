title:: ADR/002-Shared-Canonical-AgentSession
type:: [[type/adr]]
status:: [[accepted]]
importance:: #critical
module:: `src/agent/session/`, `src/server/services/session/`
date:: [[2026-09-28]]

- # ADR 002: Shared Canonical AgentSession Across Surfaces

- ## Decision
  - Enforce a single canonical `AgentSession` model across all user surfaces (Normal Chat, Workspace IDE, and Terminal). No surface may instantiate an independent session or decoupled conversation state.

- ## Reason
  - Maintaining separate session states across Chat and Workspace caused context drift, duplicate agent execution authorities, and lost conversational state during view transitions.

- ## Evidence
  - Verified by `docs/m06-02-architecture.md` and test suite `tests/m06-02/M06-02.test.ts` (6/6 tests passing). Both [[Agent Panel]] and [[Chat]] connect to the same session via `AgentSessionService` and [[SurfaceContextBridge]].
