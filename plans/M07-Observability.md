# Milestone 07

Observability & Analytics

## Goal
Implement deep telemetry, logging, and performance metrics to trace AI decisions and system bottlenecks.

## Estimated complexity
Medium

## Dependencies
Depends On: M01
Unlocks: M08

## Deliverables
- OpenTelemetry integration.
- LLM prompt/response tracing (e.g., Langfuse or custom).
- Error tracking (Sentry).

## Files affected
- `src/utils/logger.ts`
- `src/utils/telemetry.ts`

## Task List

### TASK-014
Title: LLM Tracing
Priority: High
Estimated effort: 2 days
Description: Log exactly what prompts go to the LLM, the exact responses, token usage, and latency.
Acceptance Criteria: Dashboard exists to view every LLM call.
Subtasks:
- [ ] Intercept LLM calls
- [ ] Log payload and tokens
- [ ] Create simple Admin Viewer

### TASK-015
Title: Application Telemetry
Priority: Medium
Estimated effort: 1 day
Description: Setup standard APM for the Express backend and React frontend.
Acceptance Criteria: Metrics for API latency and frontend errors are collected.
Subtasks:
- [ ] Integrate OpenTelemetry
- [ ] Setup Error Tracking

## Definition of Done
Every action in the system is traceable and token usage is fully accounted for.

## Testing Checklist
- [ ] LLM logs appear in DB
- [ ] Errors are caught and logged

## Risk
Logging sensitive API keys or user data. Strict redacting required.

## Future Improvements
Cost-analysis dashboard per user/session.
