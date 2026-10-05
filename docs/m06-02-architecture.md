# M06-02 Architecture: Right-Side Workspace Agent Panel

## Overview

The Right-Side Workspace Agent Panel (`AgentPanel.tsx`) implements the first dedicated Workspace Agent Chat interface as a direct view/control surface on the shared `AgentSession` foundation created in M06-01.

### Core Architectural Principle

> **"One Agent Session, multiple UI representations."**

The Workspace Agent Panel does **not**:
- Create its own `AgentRuntime`
- Run an independent `CodingAgent` loop
- Maintain its own execution authority or workspace fork
- Spawn a detached conversation model

Instead, the panel connects directly to the shared `AgentSession` via:
1. **Lookup / Attachment**: `GET /api/agent/session/workspace/:workspaceId` or `POST /api/agent/session`
2. **Authoritative Real-Time Events**: SSE stream (`GET /api/agent/session/:sessionId/events`)
3. **Turn Execution**: Unified `/api/chat` pipeline (with `sessionId` and `workspaceId` context parameters)

---

## Component Topology

```text
               +-----------------------------+
               |      Normal Chat View       |
               +--------------+--------------+
                              |
+--------------------------+  |  +--------------------------------+
|  Workspace Terminal View |  |  |  Right-side Agent Panel View  |
+------------+-------------+  |  +---------------+----------------+
             |                |                  |
             +----------------+------------------+
                              |
                    [Shared AgentSession]
                              |
                    [AgentSessionService]
                              |
                    [SSE Event Bus & API]
                              |
                     [AgentRuntime (1)]
                              |
                    [Execution Pipeline]
```

---

## Key Features & UI Contracts

1. **Header & Context Status**:
   - Session title and truncated Session ID
   - Status badge (`IDLE`, `BUSY`, `PAUSED`, `ERROR`, `TERMINATED`)
   - SSE connection state indicator (`connected`, `connecting`, `disconnected`)
   - Workspace identifier tag
   - Active model badge (e.g., `gemini-2.5-pro`)
   - Collapsible panel toggle (docking smoothly into a 40px compact strip)

2. **Activity Stream**:
   - Live collapsible tool activity drawer
   - Tracks tool invocations (`phase: 'call'`) and results (`phase: 'result'`)
   - Tracks terminal execution events

3. **Transcript & Streaming**:
   - High-contrast, clean message cards (user & assistant)
   - Real-time streaming rendering with animated cursor
   - Markdown formatting with `react-markdown` and `remark-gfm`
   - Explicit, user-visible error cards without silent failures or fabricated successes

4. **Input & In-flight Control**:
   - Enter to submit, Shift+Enter for newline
   - Reactive "Stop" button during active generation/tool execution using `AbortController`
   - Session status reset to `IDLE` upon cancellation

---

## Verification & Test Results

- All 6 tests in `tests/m06-02/M06-02.test.ts` passed:
  1. Workspace session lookup & association
  2. Tool activity events on shared session
  3. Session status lifecycle for Agent Panel (`IDLE` -> `BUSY` -> `IDLE`)
  4. Model configuration updates in session
  5. Single `AgentRuntime` architecture enforcement
  6. Strict legacy code isolation (`app/applet/` boundary check)
- Full compatibility with M06-01 test suite (10/10 tests passing).
