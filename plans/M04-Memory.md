# Milestone 04

Memory & Context Management

## Goal
Implement advanced conversation compression, semantic memory, and dynamic context window management to prevent token limits.

## Estimated complexity
High

## Dependencies
Depends On: M01
Unlocks: M05, M06

## Deliverables
- Knowledge Graph extraction.
- Automatic background conversation compaction.
- Sliding window token counting.

## Files affected
- `src/services/memoryManager.ts`
- `src/db/schema.ts`

## Task List

### TASK-008
Title: Token-Aware Windowing
Priority: High
Estimated effort: 2 days
Description: Accurately count tokens and dynamically size the context window instead of relying on message counts.
Acceptance Criteria: Never exceeds the specific model's context limit.
Subtasks:
- [ ] Integrate exact tokenizer (tiktoken or similar)
- [ ] Implement dynamic sliding window

### TASK-009
Title: Semantic Compaction
Priority: High
Estimated effort: 3 days
Description: Periodically summarize older messages into high-density context blocks.
Acceptance Criteria: Summaries retain technical details, paths, and constraints.
Subtasks:
- [ ] Trigger background summarization worker
- [ ] Store summaries in DB
- [ ] Inject summary into system prompt

## Definition of Done
Can hold a 1000-turn conversation without crashing or forgetting core constraints.

## Testing Checklist
- [ ] Tokenizer accurately predicts usage
- [ ] Summarization accurately captures facts

## Risk
Loss of critical nuanced information during compaction.

## Future Improvements
Entity-based memory graph (Knowledge Graph).
