title:: Bug/ChatProvider-Render-Conflict
type:: [[type/bugfix]]
status:: [[resolved]]
date:: [[2026-09-29]]

- # Bug Post-Mortem: Cross-Component State Update During Render

- ## Problem
  - React runtime error thrown during workspace interaction:
    `Cannot update a component ('ChatProvider') while rendering a different component ('AgentPanel')`.

- ## Root Cause
  - In `src/client/components/workspace/AgentPanel.tsx`, the `syncToChatSession` function was being called directly inside a `setMessages((prev) => { ... syncToChatSession(updated); return updated; })` state updater callback.
  - In React 19, state updater callbacks execute during component reconciliation. Invoking an external provider's `setState` (`setGlobalChatMessages`, `setCurrentSessionId`, `setSessions`) during reconciliation violates React's pure render contract.
  - In addition, synchronous session resolution callbacks triggered on mount could collide with layout rendering.

- ## Fix
  - 1. Extracted `syncToChatSession` calls outside of `setMessages` callbacks so updater functions remain strictly pure.
  - 2. Wrapped `syncToChatSession` state dispatches and `onSessionResolved` / `setCurrentSessionId` calls in `setTimeout(..., 0)` to defer context updates until after the active render cycle finishes.

- ## Reusable Rule
  - **Never invoke external component setters inside `setState` callbacks or render bodies.** Always keep state updater functions pure and schedule cross-component context synchronization asynchronously.

- ## Evidence
  - Code changes in `src/client/components/workspace/AgentPanel.tsx` lines 260-310 and 1335-1385. Verified with `tsc --noEmit` passing with 0 errors and application compiling cleanly.
