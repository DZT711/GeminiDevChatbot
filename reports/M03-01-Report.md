# M03-01-Report: Memory Abstraction

## Architecture
The Memory Abstraction layer introduces a provider-agnostic interface for storing and retrieving facts, state, and user preferences (Semantic Memory). The design ensures that the memory subsystem remains strictly independent of the underlying persistence layer (e.g., SQLite, Redis, Postgres), as well as being fully decoupled from the Runtime, Planner, and Tool Registry.

### Key Components
- **`MemoryProvider`**: The core interface defining standard CRUD operations (`create`, `read`, `update`, `delete`), querying (`query`), and transaction management (`beginTransaction`). It also provides a method to discover supported capabilities (`getCapabilities`).
- **`MemoryRecord`**: A generic data structure representing a unit of memory. It includes fields for ID, namespace (for logical isolation), arbitrary content (`T`), metadata, and timestamps.
- **`MemoryQuery` & `MemoryFilter`**: Abstractions for querying memory records based on namespaces, metadata fields, sorting, and pagination without tying the query syntax to a specific database dialect (like SQL or Mongo).
- **`MemoryErrors`**: Specific error classes (`MemoryNotFoundError`, `MemoryTransactionError`, `MemoryUnsupportedCapabilityError`) to standardize error handling across different memory providers.
- **`MemoryEvents`**: Event types and interfaces for systems that need to react to memory changes (e.g., cache invalidation).
- **`InMemoryMemoryProvider`**: A reference implementation utilizing an in-memory `Map`. It provides full support for metadata filtering, sorting, and pagination, serving as a functional mock for testing and demonstration.

## Interfaces
The core interfaces ensure high cohesion and low coupling:

```typescript
export interface MemoryProvider {
  getCapabilities(): MemoryCapability[];
  initialize(): Promise<void>;
  close(): Promise<void>;
  create(record: Omit<MemoryRecord, 'createdAt' | 'updatedAt'>): Promise<MemoryRecord>;
  read(id: string, namespace?: string): Promise<MemoryRecord | null>;
  update(id: string, updates: Partial<Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<MemoryRecord>;
  delete(id: string, namespace?: string): Promise<void>;
  query(query: MemoryQuery): Promise<MemoryRecord[]>;
  beginTransaction(): Promise<MemoryTransaction>;
}
```

## Extension Points
- **Database Adapters**: The `MemoryProvider` interface is designed to be easily implemented by adapters for databases like SQLite, Postgres, or Redis.
- **Transactions**: While the `InMemoryMemoryProvider` does not support transactions, the `MemoryTransaction` interface and `TRANSACTIONS` capability flag allow future relational database adapters to provide atomicity.
- **Namespacing**: The built-in `namespace` field allows multiple agents or components to share a single provider without colliding.

## Validation
- **Typing & Linting**: `npm run build`, `npx tsc --noEmit`, and `npm run lint` all pass successfully.
- **Decoupling**: The memory module contains zero imports from `src/agent/runtime`, `src/agent/planner`, or `src/agent/tools`. It strictly deals with data storage and retrieval.

## Technical Debt & Future Considerations
- **Query Complexity**: The `MemoryFilter` currently supports basic operators (`eq`, `neq`, `gt`, `contains`, etc.). Complex queries (e.g., nested AND/OR logic) are not yet supported. If future use cases require complex graph or relational queries, the abstraction may need an advanced query builder.
- **ExperienceStore vs MemoryStore**: As planned in the M03 Design Review, this module focuses on generic semantic memory (`MemoryStore`/`MemoryProvider`). A dedicated `ExperienceStore` for append-only episodic traces will be implemented subsequently if required.

## Future Adapters
- `SqliteMemoryProvider`
- `PostgresMemoryProvider`
- `RedisMemoryProvider`
