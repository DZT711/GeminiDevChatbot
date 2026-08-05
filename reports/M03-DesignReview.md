# M03-DesignReview: Cognitive Architecture Abstractions

## Overview
This document evaluates specific architectural abstractions proposed for the M03 Cognitive Layer. Each abstraction is assessed for necessity, balancing long-term extensibility against the risk of over-engineering.

## Evaluation of Abstractions

### 1. `MemoryProvider` (or `MemoryStore`)
- **Status:** **Required**
- **Justification:** The agent must persist state, user preferences, and facts across sessions. Tying this directly to SQLite or a specific ORM violates the dependency inversion principle. A `MemoryProvider` (or `MemoryStore`) abstraction ensures that the Agent Core can interact with memory without knowing the underlying storage mechanism.

### 2. `EmbeddingProvider`
- **Status:** **Required**
- **Justification:** Generating vector embeddings is highly provider-specific (e.g., OpenAI, Gemini, local models). The agent's retrieval mechanism must be decoupled from these APIs. The `EmbeddingProvider` abstraction is critical to ensure the cognitive layer remains provider-agnostic.

### 3. `VectorStore`
- **Status:** **Required**
- **Justification:** Similar to memory, the choice of vector database (Chroma, Pinecone, pgvector, local in-memory) shouldn't leak into the core agent logic. A `VectorStore` abstraction guarantees that the system can easily migrate between vector databases as the project scales.

### 4. `ExperienceStore`
- **Status:** **Optional (but highly recommended)**
- **Justification:** Initially, "Episodic Memory" was grouped under `MemoryStore`. However, storing execution trajectories, tool results, and reflection critiques represents a distinct domain: "Experience." An `ExperienceStore` specifically tailored to append-only logs of execution histories cleanly separates behavioral history from factual knowledge (Semantic Memory). This significantly improves the maintainability of the `ReflectionEngine` and `LearningEngine`.
- **Action:** Revising the roadmap to distinguish `ExperienceStore` (for trajectories/episodes) from general `MemoryStore` (for state/facts).

### 5. `PromptOptimizer`
- **Status:** **Unnecessary (Subsumed by ContextBuilder)**
- **Justification:** While token optimization and context pruning are vital, creating a top-level `PromptOptimizer` abstraction risks over-engineering at this stage. These responsibilities are best encapsulated as internal strategies within the `ContextBuilder`. The `ContextBuilder` should handle token budgeting and formatting internally without exposing a complex optimizer interface to the broader system.

## Roadmap Revisions
Based on this review, the following updates have been made to the M03 plans:
1. **M03-01-Memory.md**: Refined to focus on factual/semantic memory (`MemoryStore`) and introduced `ExperienceStore` for tracking agent execution episodes.
2. **M03-05-Learning.md**: Updated to pull historical execution data specifically from the `ExperienceStore` for consolidation into semantic knowledge.
3. **M03-06-ContextBuilder.md**: Explicitly updated to state that it encapsulates prompt optimization and token budgeting responsibilities internally.
