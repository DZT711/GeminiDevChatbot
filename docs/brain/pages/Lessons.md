title:: Lessons
type:: [[type/lesson]]

- # Engineering Lessons Learned

- ## Resolved Defect Post-Mortems & Rules
  - [[Bug/ChatProvider-Render-Conflict]]
    - **Lesson**: React 19 state updaters must be strictly pure functions. Never invoke external context setters or cross-component mutations inside `setState((prev) => ...)`.
  - [[Bug/Katex-Pluggable-Tuple-Types]]
    - **Lesson**: Unified plugin lists (`rehypePlugins`, `remarkPlugins`) passed as variables require explicit tuple typing via `PluggableList` from `unified` to avoid TypeScript widening array elements into union types.

- ## General Operational Rules
  - 1. **Check Build After Any Edit**: Always verify `npm run lint` (`tsc --noEmit`) and `npm run build` pass before completing a task.
  - 2. **Never Call Gemini API on Client**: Proxy all LLM calls through `/api/chat` or dedicated server endpoints.
  - 3. **Keep Model Configuration Centralized**: Model definitions live in `src/agent/agent.config.ts`.
  - 4. **Observable Errors**: Provide clear, user-visible error feedback rather than silent fallbacks or deceptive success indicators.
