import { pgTable, uuid, varchar, timestamp, text, pgEnum, customType, jsonb, pgPolicy, boolean, integer } from 'drizzle-orm/pg-core';
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
  role: varchar('role', { length: 50 }).notNull().default('USER'),
  customInstructions: text('custom_instructions'),
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
  id: varchar('id', { length: 255 }).primaryKey(),
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
  id: varchar('id', { length: 255 }).primaryKey(),
  sessionId: varchar('session_id', { length: 255 }).references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  role: roleEnum('role').notNull(),
  content: text('content').notNull(),
  modelUsed: varchar('model_used', { length: 255 }),
  imageUrl: text('image_url'),
  videoUrl: text('video_url'),
  attachments: jsonb('attachments').default('[]'),
  rating: integer('rating'),
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
  nodeType: nodeTypeEnum('node_type'),
  content: text('content').notNull(),
  embedding: vectorType('embedding'),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  pgPolicy('users can select all knowledge', {
    for: 'select',
    using: sql`true`,
  }),
  pgPolicy('admins can manage knowledge', {
    for: 'all',
    using: sql`exists (select 1 from users u where u.id = current_setting('app.current_user_id', true)::uuid and u.role = 'ADMIN')`,
  })
]);

// Knowledge Proposals Table (Human-in-the-loop updates)
export const knowledgeProposals = pgTable('knowledge_proposals', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  actionType: varchar('action_type', { length: 50 }).notNull(), // 'INSERT', 'UPDATE', 'DELETE'
  targetNodeId: uuid('target_node_id').references(() => knowledgeNodes.id, { onDelete: 'set null' }),
  proposedContent: text('proposed_content'),
  reason: text('reason'),
  status: varchar('status', { length: 50 }).default('PENDING').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  pgPolicy('users can see all proposals', {
    for: 'select',
    using: sql`true`,
  }),
  pgPolicy('users can create proposals', {
    for: 'insert',
    withCheck: sql`${t.userId} = current_setting('app.current_user_id', true)::uuid`,
  }),
  pgPolicy('admins can manage all proposals', {
    for: 'all',
    using: sql`exists (select 1 from users u where u.id = current_setting('app.current_user_id', true)::uuid and u.role = 'ADMIN')`,
  })
]);

// Model Information Table
export const modelInformation = pgTable('model_information', {
  id: varchar('id', { length: 255 }).primaryKey(), // e.g. openrouter/gemini-pro
  provider: varchar('provider', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  contextLength: varchar('context_length', { length: 255 }),
  description: text('description'),
  pricing: jsonb('pricing'), // store pricing details
  topProviderRate: varchar('top_provider_rate', { length: 255 }),
  architecture: varchar('architecture', { length: 255 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// API Keys Table
export const apiKeys = pgTable('api_keys', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  key: varchar('api_key_value', { length: 1024 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  models: jsonb('models').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Custom Skills Table
export const customSkills = pgTable('custom_skills', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  model: varchar('model', { length: 255 }),
  isCustom: boolean('is_custom').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User Preferences Table
export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).primaryKey(),
  theme: varchar('theme', { length: 50 }).default('midnight'),
  currentModel: varchar('current_model', { length: 255 }),
  activeKeyId: varchar('active_key_id', { length: 255 }),
  showSkillSuggestions: boolean('show_skill_suggestions').default(true),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  knowledgeProposals: many(knowledgeProposals),
  apiKeys: many(apiKeys),
  customSkills: many(customSkills),
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  })
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

export const knowledgeNodesRelations = relations(knowledgeNodes, ({ many }) => ({
  proposals: many(knowledgeProposals),
}));

export const knowledgeProposalsRelations = relations(knowledgeProposals, ({ one }) => ({
  user: one(users, {
    fields: [knowledgeProposals.userId],
    references: [users.id],
  }),
  targetNode: one(knowledgeNodes, {
    fields: [knowledgeProposals.targetNodeId],
    references: [knowledgeNodes.id],
  }),
}));
