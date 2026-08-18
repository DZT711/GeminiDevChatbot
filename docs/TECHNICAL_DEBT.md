# Technical Debt

This document tracks known technical debt and areas for future refactoring or optimization across the system.

## M04 Identified Technical Debt

### In-Memory Reflection Logs
**Description:** `RuleBasedReflection` currently pushes its `ReflectionRecord` objects to an unbounded in-memory array (`ExecutionIntegrationService.reflectionLogs`). This causes a gradual memory leak over the lifespan of the server process.
**Priority:** High
**Recommended Future Milestone:** M05 (ExperienceStore Integration)

### In-Memory Learning Queue
**Description:** The `RuleBasedLearningEngine` produces `LearningDecision` and promotion candidates that are stored in an in-memory array (`ExecutionIntegrationService.learningLogs`). These should be durably persisted for asynchronous processing.
**Priority:** High
**Recommended Future Milestone:** M05 (ExperienceStore Integration & Knowledge Promotion)

### N+1 Hydration in Retriever
**Description:** The current `VectorStore` retrieval implementation might experience N+1 query patterns during context hydration if metadata lookup is not heavily optimized.
**Priority:** Medium
**Recommended Future Milestone:** M06 or later (Performance Optimization)

### Token Estimator Heuristic
**Description:** The `ContextBuilder` relies on a character-count heuristic (e.g., characters / 4) rather than a precise tokenizer (e.g., tiktoken), which can lead to context window mismanagement for dense technical text.
**Priority:** Medium
**Recommended Future Milestone:** Backlog / Tooling Update

### ExecutionIntegrationService Lifecycle Optimization
**Description:** Instantiation and dependency injection for `ExecutionIntegrationService` happen somewhat ad-hoc in the controller layer rather than adhering to a strict singleton or scoped request lifecycle.
**Priority:** Low
**Recommended Future Milestone:** Refactoring phase (Post M05)

### Legacy Branches Retained for Rollback
**Description:** Large segments of legacy monolithic logic are retained behind `AgentFeatureFlags` in `ChatController.ts` for safety. This increases cognitive load and file size.
**Priority:** Medium
**Recommended Future Milestone:** Ongoing / Post-M04 Validation (Cleanup once sufficient confidence is demonstrated)
