# Milestone 08

Performance & Caching

## Goal
Optimize system latency, introduce semantic caching for LLM responses, and implement background job queues.

## Estimated complexity
Medium

## Dependencies
Depends On: M07
Unlocks: None

## Deliverables
- Semantic Cache (Redis + Embeddings).
- Background Task Queue (BullMQ or similar).
- API response caching.

## Files affected
- `src/services/cache.ts`
- `src/workers/*`

## Task List

### TASK-016
Title: Semantic Caching
Priority: Medium
Estimated effort: 2 days
Description: Cache LLM responses for similar queries to save costs and latency.
Acceptance Criteria: Identical or highly similar questions return instantly from cache.
Subtasks:
- [ ] Implement Redis connection
- [ ] Setup Embedding-based cache matching

### TASK-017
Title: Background Job Queue
Priority: High
Estimated effort: 2 days
Description: Move heavy tasks (indexing, summarization) to a robust background queue.
Acceptance Criteria: Heavy tasks do not block the main Express event loop.
Subtasks:
- [ ] Setup Task Queue
- [ ] Move Compaction to Queue
- [ ] Move Indexing to Queue

## Definition of Done
System handles high concurrency without latency spikes on core chat endpoints.

## Testing Checklist
- [ ] Cache hits work and return fast
- [ ] Queue processes jobs asynchronously

## Risk
Cache invalidation strategies can be complex for dynamic context.

## Future Improvements
Edge caching for frontend assets.
