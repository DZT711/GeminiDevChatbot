# Milestone 06

Semantic RAG & Codebase Indexing

## Goal
Index the user's workspace/codebase so the agent can semantically search for relevant context without loading the entire project.

## Estimated complexity
High

## Dependencies
Depends On: M04
Unlocks: None

## Deliverables
- Vector database integration (e.g., pgvector).
- Code chunking strategy (AST-aware).
- Embedding generation pipeline.

## Files affected
- `src/rag/*`
- `src/db/embeddings.ts`

## Task List

### TASK-012
Title: Codebase Indexing Pipeline
Priority: High
Estimated effort: 3 days
Description: Parse the workspace, chunk files intelligently, generate embeddings, and store them.
Acceptance Criteria: Can query the DB for code snippets based on natural language.
Subtasks:
- [ ] AST-aware chunking
- [ ] Generate embeddings via API
- [ ] Store in pgvector

### TASK-013
Title: Context Retrieval Tool
Priority: High
Estimated effort: 2 days
Description: Expose a tool to the agent to search the codebase.
Acceptance Criteria: Agent automatically uses the search tool when asked about unknown files.
Subtasks:
- [ ] Implement Semantic Search Tool
- [ ] Integrate into Agent Prompt

## Definition of Done
Agent can correctly answer questions about a large, unseen codebase by retrieving specific functions.

## Testing Checklist
- [ ] Embeddings generated correctly
- [ ] Search returns highly relevant chunks

## Risk
High token cost for embedding large codebases.

## Future Improvements
GraphRAG for understanding cross-file dependencies.
