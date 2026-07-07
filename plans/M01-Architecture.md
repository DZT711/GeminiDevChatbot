# Milestone 01

Architecture Refactor

## Goal
Break down monolithic files (`DevEngine.tsx`, `api.ts`), establish clean architecture boundaries (Repository/Service/Controller), and implement dependency injection to ensure scalability and testability.

## Estimated complexity
High

## Dependencies
None

## Deliverables
- Extracted hooks and components from `DevEngine.tsx`.
- Refactored `api.ts` into individual route handlers and services.
- Established Dependency Injection container.

## Files affected
- `src/pages/DevEngine.tsx`
- `src/api.ts`
- `src/services/*`
- `src/hooks/*`
- `src/components/*`

## Architecture Diagram
(Monolith) -> (Controller Layer) -> (Service Layer) -> (Repository Layer)

## Task List

### TASK-001
Title: Split DevEngine.tsx
Priority: Critical
Estimated effort: 3 days
Description: Extract UI components, state management hooks, and context providers from `DevEngine.tsx` into modular files.
Acceptance Criteria: `DevEngine.tsx` is under 500 lines. No loss of functionality.
Subtasks:
- [ ] Extract Provider Contexts
- [ ] Extract Chat UI components
- [ ] Extract Settings modals
- [ ] Extract Custom Hooks

### TASK-002
Title: Refactor API Monolith
Priority: Critical
Estimated effort: 2 days
Description: Split `api.ts` into route-specific controllers and domain services.
Acceptance Criteria: `api.ts` only registers routers. Logic is in `/src/server/controllers` and `/src/server/services`.
Subtasks:
- [ ] Create router registry
- [ ] Move auth logic to AuthController
- [ ] Move chat logic to ChatController
- [ ] Move provider logic to ProviderController

### TASK-003
Title: Dependency Injection Setup
Priority: High
Estimated effort: 1 day
Description: Introduce a DI container for backend services to mock dependencies during testing.
Acceptance Criteria: Services are injected, not hardcoded.
Subtasks:
- [ ] Setup DI framework (e.g., TSyringe or manual DI)
- [ ] Bind database and core services

## Definition of Done
- All tests pass.
- No file exceeds 1000 lines.
- Linting and build succeed.

## Testing Checklist
- [ ] E2E Chat flow works
- [ ] Authentication works
- [ ] Provider switching works

## Risk
High risk of merge conflicts and breaking existing state management.

## Future Improvements
Migrate to a stricter DDD (Domain-Driven Design) structure.
