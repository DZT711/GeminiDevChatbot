# Implementation Plan

## Milestone: Address Technical Debt (Refactor God Objects)

### Tasks
1. **Extract Settings State to Context**
   - Move theme, api keys, model states out of `DevEngine.tsx` into a `SettingsProvider`.
2. **Break Down `ChatWindow.tsx`**
   - Extract `MessageList` component.
   - Extract `ChatInputArea` component.
   - Extract `ChatToolbar` component.
3. **Split `useChatSessions.ts`**
   - Create `useChatHistory` for CRUD operations on sessions.
   - Create `useChatStream` for managing the active generation state.

### Dependencies
- React Context API.
- All existing tests and manual test plans must pass.

### Risks
- Prop mapping errors during extraction could break UI elements.
- State desync between extracted hooks (e.g., streaming state vs chat history).

### Estimated Complexity
- High (due to massive file sizes and intricate state dependencies).

### Files Affected
- `src/client/pages/DevEngine.tsx`
- `src/client/components/ChatWindow.tsx`
- `src/client/hooks/useChatSessions.ts`
- New context/hook files to be created.

### Regression Impact
- Chat streaming (High).
- Settings persistence (Medium).
- Layout and styling (Low).

### Rollback Strategy
- Use `git` checkpointing before each major extraction. Revert to the baseline commit if `npm run build` or the manual chat regression tests fail.

### Validation Strategy
- Run `npm run lint` and `npm run build` after each file creation/modification.
- Perform the `MANUAL_TEST_PLAN.md` specifically focusing on sending messages, editing messages, and modifying settings.
