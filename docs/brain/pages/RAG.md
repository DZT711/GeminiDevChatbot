title:: RAG
type:: [[type/service]]
layer:: #core
path:: `src/agent/retrieval/`
status:: #active
depends-on:: [[InMemoryVectorStore]], [[EmbeddingProvider]]
consumed-by:: [[KnowledgeController]], [[AgentIntegrationService]]

- # RAG (Retrieval-Augmented Generation)
  - **Role**: Semantic knowledge retrieval engine and vector storage indexing developer knowledge records.
  - **Source Implementation**: `src/agent/retrieval/` and `src/server/controllers/KnowledgeController.ts`

- ## Core Components
  - **InMemoryVectorStore**: Fast cosine similarity indexing of developer knowledge snippets (`InMemoryVectorStore.ts`).
  - **Retriever**: Queries vector store given precomputed query embeddings (`SimpleRetriever.ts`).
  - **Knowledge Proposal Workflow**: Users can propose new knowledge nodes, which enter a `PENDING` queue and require review before being committed to the search index.

- ## Architectural Invariants
  - **Retriever does not generate embeddings**: Embedding generation is delegated strictly to external provider APIs.
  - **Memory does not perform vector retrieval**: Working memory is decoupled from long-term vector search.
