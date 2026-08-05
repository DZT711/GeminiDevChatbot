# M03-02-Report: Knowledge Store

## Architecture
The Knowledge Store introduces a provider-agnostic interface for storing and retrieving structured knowledge (documents, facts). It is strictly separated from vector search, embeddings, and cognitive engines. The design ensures that the knowledge subsystem remains independent of the underlying persistence layer (e.g., SQLite, Redis, Postgres, MongoDB, GraphDB).

### Key Components
- **`KnowledgeStore`**: Core interface for CRUD operations (`createRecord`, `readRecord`, `updateRecord`, `deleteRecord`), collection management (`createCollection`, etc.), and transactions. It also provides capabilities discovery (`getCapabilities`).
- **`KnowledgeRecord` & `KnowledgeDocument`**: A data structure for an individual unit of knowledge. Includes ID, namespace, collection, content (generic or string), tags, metadata, relationships, versioning, and provenance (source, owner, confidence).
- **`KnowledgeCollection`**: Represents a grouping of records.
- **`KnowledgeRelationship`**: A structural pointer linking one record to another (`targetId`, `type`, `metadata`), laying the foundation for future graph-based knowledge traversal without enforcing graph databases at the store level.
- **`KnowledgeQuery` & `KnowledgeFilter`**: Abstractions for querying knowledge based on namespaces, collections, tags, relationships, and metadata.
- **`KnowledgeErrors`**: Standardized errors (`KnowledgeNotFoundError`, `KnowledgeTransactionError`, `KnowledgeUnsupportedCapabilityError`).
- **`KnowledgeEvents`**: Standardized events for reactive systems (`RECORD_CREATED`, `COLLECTION_UPDATED`, etc.).
- **`InMemoryKnowledgeStore`**: A reference implementation providing metadata filtering, sorting, pagination, tags, and relationship filtering in memory.

## Interfaces
The core interface:

```typescript
export interface KnowledgeStore {
  getCapabilities(): KnowledgeCapability[];
  initialize(): Promise<void>;
  close(): Promise<void>;
  
  createRecord(record: Omit<KnowledgeRecord, 'createdAt' | 'updatedAt' | 'version'> & { id?: string }): Promise<KnowledgeRecord>;
  readRecord(id: string, namespace?: string): Promise<KnowledgeRecord | null>;
  updateRecord(id: string, updates: Partial<Omit<KnowledgeRecord, 'id' | 'createdAt' | 'updatedAt' | 'version'>>, namespace?: string): Promise<KnowledgeRecord>;
  deleteRecord(id: string, namespace?: string): Promise<void>;
  queryRecords(query: KnowledgeQuery): Promise<KnowledgeRecord[]>;
  
  createCollection(collection: Omit<KnowledgeCollection, 'createdAt' | 'updatedAt'> & { id?: string }): Promise<KnowledgeCollection>;
  getCollection(id: string, namespace?: string): Promise<KnowledgeCollection | null>;
  updateCollection(id: string, updates: Partial<Omit<KnowledgeCollection, 'id' | 'createdAt' | 'updatedAt'>>, namespace?: string): Promise<KnowledgeCollection>;
  deleteCollection(id: string, namespace?: string): Promise<void>;
  
  beginTransaction(): Promise<KnowledgeTransaction>;
}
```

## Public APIs
- The module exports its interfaces, types, errors, events, and the in-memory provider via `src/agent/knowledge/index.ts`.
- The `src/agent/index.ts` file acts as the primary barrel, exposing the `knowledge` module to the wider application.

## Architecture Gate Answers
**Can this KnowledgeStore later support SQLite, Postgres, Supabase, MongoDB, Redis, Neo4j, JSON, Filesystem without modifying Agent Core?**
**YES**.
*Justification:* The `KnowledgeStore` interface uses generic objects (`KnowledgeRecord`) and abstract query representations (`KnowledgeQuery`). 
- **Relational (SQLite, Postgres, Supabase)**: The adapter can map `tags` to a junction table and `metadata` to a JSONB column.
- **Document (MongoDB)**: Maps directly to BSON documents.
- **Key-Value (Redis)**: Can serialize records to JSON strings and use secondary indexes (RediSearch) for queries.
- **Graph (Neo4j)**: `KnowledgeRelationship` arrays can be seamlessly translated into actual graph edges during insert/update operations.
- **Filesystem/JSON**: Simple serialization of the `KnowledgeRecord` array.
Because no provider-specific query languages (like SQL or Cypher) or types (like `ObjectId`) are exposed in the interface, the core Agent will never need to change when swapping backend databases.

## Extension Points
- **Database Adapters**: Extensible for SQL, NoSQL, and Graph databases.
- **Query Engine**: `KnowledgeQuery` and `KnowledgeFilter` can be extended with more complex boolean logic (AND/OR trees) if required in the future.
- **Events**: Systems can hook into `KnowledgeEvents` for caching, real-time sync, or triggering vector embedding updates (in M03-03).

## Validation
- **Typing & Linting**: `npm run build`, `npx tsc --noEmit`, and `npm run lint` passed successfully.
- **Decoupling**: Validated that `KnowledgeStore` has absolutely zero imports or dependencies on `Runtime`, `Planner`, `Memory`, `Retriever`, or any LLM/Embedding endpoints.

## Remaining Technical Debt
- **Graph Traversal**: The `relationships` array allows simple pointer-based linking, but deep graph traversal queries (e.g., "Find all records up to 3 edges away") are not supported by the current `KnowledgeQuery` abstraction.
- **Batch Operations**: The `KnowledgeStore` interface lacks `batchCreate`, `batchUpdate`, and `batchDelete`, which could cause performance bottlenecks. To be addressed when an actual persistence adapter is implemented.

## Future Adapters
- `PostgresKnowledgeStore` (via Drizzle ORM)
- `SupabaseKnowledgeStore`
- `Neo4jKnowledgeStore`
