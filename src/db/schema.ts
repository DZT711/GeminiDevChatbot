import { pgTable, uuid, varchar, timestamp, text, pgEnum, customType, jsonb, pgPolicy } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Custom Vector Type
export const vectorType = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(768)';
  },
  toDriver(value: number[]) {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: unknown) {
    if (typeof value === 'string') {
      return JSON.parse(value) as number[];
    }
    return value as number[];
  },
});

// Enums
export const roleEnum = pgEnum('role', ['user', 'model', 'system', 'tool']);
export const nodeTypeEnum = pgEnum('node_type', ['skill', 'repo_research', 'web_data', 'past_response']);

// Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash'),
  name: varchar('name', { length: 255 }),
  avatarUrl: varchar('avatar_url', { length: 2048 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  pgPolicy('users can see their own data', {
    for: 'select',
    using: sql`${t.id} = current_setting('app.current_user_id', true)::uuid`,
  }),
  pgPolicy('users can update their own data', {
    for: 'update',
    using: sql`${t.id} = current_setting('app.current_user_id', true)::uuid`,
  })
]);

// Accounts Table
export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
}, (t) => [
  pgPolicy('users can see their own accounts', {
    for: 'select',
    using: sql`${t.userId} = current_setting('app.current_user_id', true)::uuid`,
  })
]);

// Sessions Table
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  pgPolicy('users can manage their own sessions', {
    for: 'all',
    using: sql`${t.userId} = current_setting('app.current_user_id', true)::uuid`,
  })
]);

// Messages Table
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  role: roleEnum('role').notNull(),
  content: text('content').notNull(),
  modelUsed: varchar('model_used', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  pgPolicy('users can view messages in their sessions', {
    for: 'select',
    using: sql`exists (select 1 from sessions s where s.id = ${t.sessionId} and s.user_id = current_setting('app.current_user_id', true)::uuid)`,
  }),
  pgPolicy('users can insert messages in their sessions', {
    for: 'insert',
    withCheck: sql`exists (select 1 from sessions s where s.id = ${t.sessionId} and s.user_id = current_setting('app.current_user_id', true)::uuid)`,
  }),
  pgPolicy('users can delete messages in their sessions', {
    for: 'delete',
    using: sql`exists (select 1 from sessions s where s.id = ${t.sessionId} and s.user_id = current_setting('app.current_user_id', true)::uuid)`,
  })
]);

// Knowledge Nodes Table (Vector Database)
export const knowledgeNodes = pgTable('knowledge_nodes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  nodeType: nodeTypeEnum('node_type'),
  content: text('content').notNull(),
  embedding: vectorType('embedding'),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  pgPolicy('users can manage their own knowledge', {
    for: 'all',
    using: sql`${t.userId} = current_setting('app.current_user_id', true)::uuid`,
  })
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  knowledgeNodes: many(knowledgeNodes),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(sessions, {
    fields: [messages.sessionId],
    references: [sessions.id],
  }),
}));

export const knowledgeNodesRelations = relations(knowledgeNodes, ({ one }) => ({
  user: one(users, {
    fields: [knowledgeNodes.userId],
    references: [users.id],
  }),
}));
