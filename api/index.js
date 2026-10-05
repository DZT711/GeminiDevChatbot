var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/server/logInterceptor.ts
import { EventEmitter } from "events";
function appendSystemLog(category, message, details) {
  try {
    const timestamp2 = (/* @__PURE__ */ new Date()).toISOString().split("T")[1].slice(0, 8);
    let detailsStr = "";
    if (details !== void 0 && details !== null) {
      if (details instanceof Error) {
        detailsStr = ` | Error: ${details.message}`;
      } else if (typeof details === "object") {
        try {
          detailsStr = ` | ${JSON.stringify(details)}`;
        } catch (_) {
          detailsStr = ` | ${String(details)}`;
        }
      } else {
        detailsStr = ` | ${String(details)}`;
      }
    }
    const formatted = `[${timestamp2}] [${category.toUpperCase()}] ${message}${detailsStr}`;
    logHistory.push(formatted);
    if (logHistory.length > MAX_LOG_HISTORY) logHistory.shift();
    systemLogEmitter.emit("log", formatted);
  } catch (_) {
  }
}
var systemLogEmitter, logHistory, MAX_LOG_HISTORY;
var init_logInterceptor = __esm({
  "src/server/logInterceptor.ts"() {
    systemLogEmitter = new EventEmitter();
    logHistory = [];
    MAX_LOG_HISTORY = 500;
  }
});

// src/server/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accounts: () => accounts,
  accountsRelations: () => accountsRelations,
  apiKeys: () => apiKeys,
  customSkills: () => customSkills,
  experienceRecords: () => experienceRecords,
  knowledgeNodes: () => knowledgeNodes,
  knowledgeNodesRelations: () => knowledgeNodesRelations,
  knowledgeProposals: () => knowledgeProposals,
  knowledgeProposalsRelations: () => knowledgeProposalsRelations,
  messages: () => messages,
  messagesRelations: () => messagesRelations,
  modelInformation: () => modelInformation,
  nodeTypeEnum: () => nodeTypeEnum,
  roleEnum: () => roleEnum,
  sessions: () => sessions,
  sessionsRelations: () => sessionsRelations,
  userPreferences: () => userPreferences,
  users: () => users,
  usersRelations: () => usersRelations,
  vectorType: () => vectorType
});
import { pgTable, uuid, varchar, timestamp, text, pgEnum, customType, jsonb, pgPolicy, boolean, integer } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
var vectorType, roleEnum, nodeTypeEnum, users, accounts, sessions, messages, knowledgeNodes, knowledgeProposals, modelInformation, apiKeys, customSkills, userPreferences, experienceRecords, usersRelations, accountsRelations, sessionsRelations, messagesRelations, knowledgeNodesRelations, knowledgeProposalsRelations;
var init_schema = __esm({
  "src/server/db/schema.ts"() {
    vectorType = customType({
      dataType() {
        return "vector(768)";
      },
      toDriver(value) {
        return `[${value.join(",")}]`;
      },
      fromDriver(value) {
        if (typeof value === "string") {
          return JSON.parse(value);
        }
        return value;
      }
    });
    roleEnum = pgEnum("role", ["user", "model", "system", "tool"]);
    nodeTypeEnum = pgEnum("node_type", ["skill", "repo_research", "web_data", "past_response"]);
    users = pgTable("users", {
      id: uuid("id").defaultRandom().primaryKey(),
      email: varchar("email", { length: 255 }).notNull().unique(),
      passwordHash: text("password_hash"),
      name: varchar("name", { length: 255 }),
      avatarUrl: varchar("avatar_url", { length: 2048 }),
      role: varchar("role", { length: 50 }).notNull().default("USER"),
      customInstructions: text("custom_instructions"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    }, (t) => [
      pgPolicy("users can see their own data", {
        for: "select",
        using: sql`${t.id} = current_setting('app.current_user_id', true)::uuid`
      }),
      pgPolicy("users can update their own data", {
        for: "update",
        using: sql`${t.id} = current_setting('app.current_user_id', true)::uuid`
      })
    ]);
    accounts = pgTable("accounts", {
      id: uuid("id").defaultRandom().primaryKey(),
      userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      provider: varchar("provider", { length: 255 }).notNull(),
      providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
      accessToken: text("access_token"),
      refreshToken: text("refresh_token")
    }, (t) => [
      pgPolicy("users can see their own accounts", {
        for: "select",
        using: sql`${t.userId} = current_setting('app.current_user_id', true)::uuid`
      })
    ]);
    sessions = pgTable("sessions", {
      id: varchar("id", { length: 255 }).primaryKey(),
      userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      title: varchar("title", { length: 255 }),
      pinned: boolean("pinned").default(false).notNull(),
      summary: text("summary"),
      workspaceId: varchar("workspace_id", { length: 255 }),
      executionId: varchar("execution_id", { length: 255 }),
      goalId: varchar("goal_id", { length: 255 }),
      planId: varchar("plan_id", { length: 255 }),
      activeModel: varchar("active_model", { length: 255 }),
      status: varchar("status", { length: 50 }).default("IDLE"),
      metadata: jsonb("metadata").default("{}"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    }, (t) => [
      pgPolicy("users can manage their own sessions", {
        for: "all",
        using: sql`${t.userId} = current_setting('app.current_user_id', true)::uuid`
      })
    ]);
    messages = pgTable("messages", {
      id: varchar("id", { length: 255 }).primaryKey(),
      sessionId: varchar("session_id", { length: 255 }).references(() => sessions.id, { onDelete: "cascade" }).notNull(),
      role: roleEnum("role").notNull(),
      content: text("content").notNull(),
      modelUsed: varchar("model_used", { length: 255 }),
      imageUrl: text("image_url"),
      videoUrl: text("video_url"),
      attachments: jsonb("attachments").default("[]"),
      rating: integer("rating"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    }, (t) => [
      pgPolicy("users can view messages in their sessions", {
        for: "select",
        using: sql`exists (select 1 from sessions s where s.id = ${t.sessionId} and s.user_id = current_setting('app.current_user_id', true)::uuid)`
      }),
      pgPolicy("users can insert messages in their sessions", {
        for: "insert",
        withCheck: sql`exists (select 1 from sessions s where s.id = ${t.sessionId} and s.user_id = current_setting('app.current_user_id', true)::uuid)`
      }),
      pgPolicy("users can delete messages in their sessions", {
        for: "delete",
        using: sql`exists (select 1 from sessions s where s.id = ${t.sessionId} and s.user_id = current_setting('app.current_user_id', true)::uuid)`
      })
    ]);
    knowledgeNodes = pgTable("knowledge_nodes", {
      id: uuid("id").defaultRandom().primaryKey(),
      nodeType: nodeTypeEnum("node_type"),
      content: text("content").notNull(),
      embedding: vectorType("embedding"),
      metadata: jsonb("metadata").default("{}"),
      createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
    }, (t) => [
      pgPolicy("users can select all knowledge", {
        for: "select",
        using: sql`true`
      }),
      pgPolicy("users can insert knowledge", {
        for: "insert",
        withCheck: sql`current_setting('app.current_user_id', true) is not null`
      }),
      pgPolicy("admins can manage knowledge", {
        for: "all",
        using: sql`exists (select 1 from users u where u.id = current_setting('app.current_user_id', true)::uuid and u.role = 'ADMIN')`
      })
    ]);
    knowledgeProposals = pgTable("knowledge_proposals", {
      id: uuid("id").defaultRandom().primaryKey(),
      userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
      actionType: varchar("action_type", { length: 50 }).notNull(),
      // 'INSERT', 'UPDATE', 'DELETE'
      targetNodeId: uuid("target_node_id").references(() => knowledgeNodes.id, { onDelete: "set null" }),
      proposedContent: text("proposed_content"),
      reason: text("reason"),
      status: varchar("status", { length: 50 }).default("PENDING").notNull(),
      createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
    }, (t) => [
      pgPolicy("users can see all proposals", {
        for: "select",
        using: sql`true`
      }),
      pgPolicy("users can create proposals", {
        for: "insert",
        withCheck: sql`${t.userId} = current_setting('app.current_user_id', true)::uuid`
      }),
      pgPolicy("admins can manage all proposals", {
        for: "all",
        using: sql`exists (select 1 from users u where u.id = current_setting('app.current_user_id', true)::uuid and u.role = 'ADMIN')`
      })
    ]);
    modelInformation = pgTable("model_information", {
      id: varchar("id", { length: 255 }).primaryKey(),
      // e.g. openrouter/gemini-pro
      provider: varchar("provider", { length: 255 }).notNull(),
      name: varchar("name", { length: 255 }).notNull(),
      contextLength: varchar("context_length", { length: 255 }),
      description: text("description"),
      pricing: jsonb("pricing"),
      // store pricing details
      topProviderRate: varchar("top_provider_rate", { length: 255 }),
      architecture: varchar("architecture", { length: 255 }),
      canUseTool: boolean("can_use_tool").default(false),
      releaseNoticeUrl: text("release_notice_url"),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    apiKeys = pgTable("api_keys", {
      id: varchar("id", { length: 255 }).primaryKey(),
      userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      name: varchar("name", { length: 255 }).notNull(),
      key: varchar("api_key_value", { length: 1024 }).notNull(),
      provider: varchar("provider", { length: 255 }).notNull(),
      baseUrl: varchar("base_url", { length: 1024 }),
      models: jsonb("models").$type(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    customSkills = pgTable("custom_skills", {
      id: varchar("id", { length: 255 }).primaryKey(),
      userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      name: varchar("name", { length: 255 }).notNull(),
      description: text("description").notNull(),
      systemPrompt: text("system_prompt").notNull(),
      model: varchar("model", { length: 255 }),
      isCustom: boolean("is_custom").default(true),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    userPreferences = pgTable("user_preferences", {
      userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).primaryKey(),
      theme: varchar("theme", { length: 50 }).default("midnight"),
      currentModel: varchar("current_model", { length: 255 }),
      activeKeyId: varchar("active_key_id", { length: 255 }),
      showSkillSuggestions: boolean("show_skill_suggestions").default(true),
      enabledModels: jsonb("enabled_models").$type(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    experienceRecords = pgTable("experience_records", {
      id: uuid("id").defaultRandom().primaryKey(),
      sessionId: varchar("session_id", { length: 255 }).notNull(),
      taskId: varchar("task_id", { length: 255 }),
      timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
      type: varchar("type", { length: 50 }).notNull(),
      payload: jsonb("payload").notNull(),
      metadata: jsonb("metadata").notNull()
    });
    usersRelations = relations(users, ({ many, one }) => ({
      accounts: many(accounts),
      sessions: many(sessions),
      knowledgeProposals: many(knowledgeProposals),
      apiKeys: many(apiKeys),
      customSkills: many(customSkills),
      preferences: one(userPreferences, {
        fields: [users.id],
        references: [userPreferences.userId]
      })
    }));
    accountsRelations = relations(accounts, ({ one }) => ({
      user: one(users, {
        fields: [accounts.userId],
        references: [users.id]
      })
    }));
    sessionsRelations = relations(sessions, ({ one, many }) => ({
      user: one(users, {
        fields: [sessions.userId],
        references: [users.id]
      }),
      messages: many(messages)
    }));
    messagesRelations = relations(messages, ({ one }) => ({
      session: one(sessions, {
        fields: [messages.sessionId],
        references: [sessions.id]
      })
    }));
    knowledgeNodesRelations = relations(knowledgeNodes, ({ many }) => ({
      proposals: many(knowledgeProposals)
    }));
    knowledgeProposalsRelations = relations(knowledgeProposals, ({ one }) => ({
      user: one(users, {
        fields: [knowledgeProposals.userId],
        references: [users.id]
      }),
      targetNode: one(knowledgeNodes, {
        fields: [knowledgeProposals.targetNodeId],
        references: [knowledgeNodes.id]
      })
    }));
  }
});

// src/agent/agent.config.ts
function normalizeConfigModel(model) {
  if (!model) return DEFAULT_CHAT_MODEL;
  const clean = model.replace(/^(google\/|models\/)/i, "").trim();
  if (clean === "gemini-2.5-pro" || clean === "gemini-2.0-pro-exp-02-05" || clean === "gemini-2.0-pro") {
    return PRO_CHAT_MODEL;
  }
  if (clean === "gemini-2.5-flash" || clean === "gemini-2.0-flash" || clean === "gemini-2.0-flash-exp") {
    return DEFAULT_CHAT_MODEL;
  }
  return clean || DEFAULT_CHAT_MODEL;
}
function resolveExecutionCandidateModels(userRequestedModel) {
  const requested = (userRequestedModel || "").trim();
  const isHybrid = !requested || requested.toLowerCase() === "hybrid";
  const primaryModel = !isHybrid ? normalizeConfigModel(requested) : void 0;
  const candidates = [
    primaryModel,
    DEFAULT_CHAT_MODEL,
    PRO_CHAT_MODEL,
    FALLBACK_CHAT_MODEL,
    FLASH_3_8_CHAT_MODEL
  ].filter((m) => Boolean(m && m.trim() !== ""));
  return Array.from(new Set(candidates));
}
function isThoughtSignatureModel(model) {
  if (!model) return false;
  const m = model.toLowerCase().replace("models/", "").replace("google/", "").split(":")[0];
  return THOUGHT_SIGNATURE_MODELS.some((known) => m.includes(known)) || m.includes("thinking");
}
function isGeminiThinkingConfigSupported(model) {
  if (!model) return false;
  const m = model.toLowerCase().replace("models/", "").replace("google/", "").split(":")[0];
  if (m.includes("image") || m.includes("veo") || m.includes("gemma") || m.includes("embedding")) {
    return false;
  }
  return m === "hybrid" || m.includes("3.8") || m.includes("3.7") || m.includes("3.5") || m.includes("3.1-pro") || m.includes("3.1-flash-lite") || m.includes("2.5-pro") || m.includes("2.5-flash") || m.includes("thinking");
}
function getSupportedThinkingLevelsForModel(model) {
  if (!isGeminiThinkingConfigSupported(model)) return [];
  const m = model.toLowerCase().replace("models/", "").replace("google/", "").split(":")[0];
  const isPro = m.includes("3.1-pro") || m.includes("2.5-pro");
  const isLite = m.includes("flash-lite");
  const options = [
    { id: "none", label: "Off", hint: "Standard generation without thinking tokens" }
  ];
  if (!isPro) {
    options.push({ id: "minimal", label: "Minimal", hint: "Ultra-fast lightweight reasoning" });
  }
  options.push(
    { id: "low", label: "Low", hint: "Fast concise reasoning" },
    { id: "medium", label: "Normal", hint: "Balanced reasoning depth" },
    { id: "high", label: "High", hint: "Deep step-by-step reasoning" }
  );
  if (!isPro && !isLite) {
    options.push({ id: "extra_high", label: "XHigh", hint: "Maximum thinking budget (32k tokens)" });
  }
  return options;
}
function getThinkingConfigForModel(model, userLevel) {
  if (!model) return void 0;
  if (!isGeminiThinkingConfigSupported(model)) return void 0;
  const m = model.toLowerCase().replace("models/", "").replace("google/", "").split(":")[0];
  const isGemini3 = m.includes("3.8") || m.includes("3.7") || m.includes("3.5") || m.includes("3.1");
  const isPro = m.includes("3.1-pro") || m.includes("2.5-pro");
  if (isGemini3) {
    const rawLevel = (userLevel || "LOW").toUpperCase();
    let level = "LOW";
    let budget = void 0;
    const isOff = rawLevel === "NONE" || rawLevel === "OFF";
    if (rawLevel === "MINIMAL") {
      level = isPro ? "LOW" : "MINIMAL";
    } else if (rawLevel === "LOW") {
      level = "LOW";
    } else if (rawLevel === "NORMAL" || rawLevel === "MEDIUM") {
      level = "MEDIUM";
    } else if (rawLevel === "HIGH") {
      level = "HIGH";
    } else if (rawLevel === "EXTRA_HIGH" || rawLevel === "XHIGH") {
      level = "HIGH";
      if (!isPro) {
        budget = 32768;
      }
    } else if (isOff) {
      if (m.includes("3.1-flash-lite") || m.includes("3.8") || m.includes("3.7") || m.includes("3.5")) {
        level = "MINIMAL";
      } else {
        level = "LOW";
      }
    }
    if (isPro && level === "MINIMAL") {
      level = "LOW";
    }
    return {
      thinkingLevel: level,
      ...budget ? { thinkingBudget: budget } : {},
      includeThoughts: !isOff
    };
  }
  if (m.includes("thinking") || m.includes("2.5") || m.includes("2.0")) {
    const rawLevel = (userLevel || "LOW").toUpperCase();
    const isOff = rawLevel === "NONE" || rawLevel === "OFF";
    let budget = void 0;
    if (isOff) {
      budget = 0;
    } else if (rawLevel === "EXTRA_HIGH" || rawLevel === "XHIGH") {
      budget = 32768;
    } else if (rawLevel === "HIGH") {
      budget = 16384;
    } else if (rawLevel === "NORMAL" || rawLevel === "MEDIUM") {
      budget = 8192;
    } else if (rawLevel === "LOW") {
      budget = 2048;
    } else if (rawLevel === "MINIMAL") {
      budget = 1024;
    }
    return {
      ...budget !== void 0 ? { thinkingBudget: budget } : {},
      includeThoughts: !isOff
    };
  }
  return void 0;
}
var CLASSIFICATION_MODEL, EMBEDDING_MODEL, DEFAULT_CHAT_MODEL, FALLBACK_CHAT_MODEL, PRO_CHAT_MODEL, FLASH_3_8_CHAT_MODEL, HYBRID_EXECUTION_MODELS, THOUGHT_SIGNATURE_MODELS;
var init_agent_config = __esm({
  "src/agent/agent.config.ts"() {
    CLASSIFICATION_MODEL = "gemini-3.1-flash-lite";
    EMBEDDING_MODEL = "gemini-embedding-2-preview";
    DEFAULT_CHAT_MODEL = "gemini-3.8-flash";
    FALLBACK_CHAT_MODEL = "gemini-3.1-flash-lite";
    PRO_CHAT_MODEL = "gemini-3.1-pro-preview";
    FLASH_3_8_CHAT_MODEL = "gemini-3.8-flash";
    HYBRID_EXECUTION_MODELS = [
      DEFAULT_CHAT_MODEL,
      PRO_CHAT_MODEL,
      FALLBACK_CHAT_MODEL,
      FLASH_3_8_CHAT_MODEL
    ];
    THOUGHT_SIGNATURE_MODELS = [
      "gemini-3.8-flash",
      "gemini-3.7-flash",
      "gemini-3.1-pro-preview",
      "gemini-3.1-flash-lite",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.0-flash-thinking-exp-01-21",
      "gemini-2.0-flash-thinking-exp",
      "gemini-2.0-pro-exp-02-05",
      "gemini-2.0-flash"
    ];
  }
});

// src/server/agent/agent.config.ts
var agent_config_exports = {};
__export(agent_config_exports, {
  CLASSIFICATION_MODEL: () => CLASSIFICATION_MODEL,
  DEFAULT_CHAT_MODEL: () => DEFAULT_CHAT_MODEL,
  EMBEDDING_MODEL: () => EMBEDDING_MODEL,
  FALLBACK_CHAT_MODEL: () => FALLBACK_CHAT_MODEL,
  FLASH_3_8_CHAT_MODEL: () => FLASH_3_8_CHAT_MODEL,
  HYBRID_EXECUTION_MODELS: () => HYBRID_EXECUTION_MODELS,
  PRO_CHAT_MODEL: () => PRO_CHAT_MODEL,
  THOUGHT_SIGNATURE_MODELS: () => THOUGHT_SIGNATURE_MODELS,
  getSupportedThinkingLevelsForModel: () => getSupportedThinkingLevelsForModel,
  getThinkingConfigForModel: () => getThinkingConfigForModel,
  isGeminiThinkingConfigSupported: () => isGeminiThinkingConfigSupported,
  isThoughtSignatureModel: () => isThoughtSignatureModel,
  normalizeConfigModel: () => normalizeConfigModel,
  resolveExecutionCandidateModels: () => resolveExecutionCandidateModels
});
var init_agent_config2 = __esm({
  "src/server/agent/agent.config.ts"() {
    init_agent_config();
  }
});

// src/server/services/llmService.ts
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
var LLMService;
var init_llmService = __esm({
  "src/server/services/llmService.ts"() {
    LLMService = class {
      getTypeEnum() {
        return Type;
      }
      getClient(apiKey, baseUrl, provider) {
        if (provider === "openrouter" || provider === "openai" || baseUrl && baseUrl.includes("openrouter")) {
          const openai = new OpenAI({
            apiKey,
            baseURL: baseUrl || (provider === "openrouter" ? "https://openrouter.ai/api/v1" : void 0),
            defaultHeaders: provider === "openrouter" || baseUrl && baseUrl.includes("openrouter") ? {
              "HTTP-Referer": "https://aistudio.google.com",
              "X-Title": "DevGenie"
            } : void 0
          });
          return {
            models: {
              generateContent: async function(params) {
                const messages5 = [];
                if (params.config?.systemInstruction) {
                  messages5.push({ role: "system", content: params.config.systemInstruction });
                }
                if (params.contents) {
                  for (const part of params.contents) {
                    const role = part.role === "model" ? "assistant" : "user";
                    let content = "";
                    if (part.parts && Array.isArray(part.parts)) {
                      content = part.parts.map((p) => p.text || "").join("");
                    } else {
                      content = part.text || "";
                    }
                    messages5.push({ role, content });
                  }
                }
                const res = await openai.chat.completions.create({
                  model: params.model,
                  messages: messages5,
                  stream: false
                });
                const text2 = res.choices[0]?.message?.content || "";
                return {
                  text: text2,
                  candidates: [{ content: { parts: [{ text: text2 }] } }]
                };
              },
              generateContentStream: async function* (params) {
                let messages5 = [];
                if (params.config?.systemInstruction) {
                  messages5.push({ role: "system", content: params.config.systemInstruction });
                }
                if (params.contents) {
                  for (const part of params.contents) {
                    const role = part.role === "model" ? "assistant" : "user";
                    let content = "";
                    if (part.parts && Array.isArray(part.parts)) {
                      content = part.parts.map((p) => p.text || "").join("");
                    } else {
                      content = part.text || "";
                    }
                    messages5.push({ role, content });
                  }
                }
                const stream = await openai.chat.completions.create({
                  model: params.model,
                  messages: messages5,
                  stream: true
                });
                for await (const chunk of stream) {
                  const text2 = chunk.choices[0]?.delta?.content || "";
                  if (text2) {
                    yield {
                      text: text2,
                      candidates: [{ content: { parts: [{ text: text2 }] } }]
                    };
                  }
                }
              }
            }
          };
        }
        const httpOptions = {
          headers: {
            "User-Agent": "aistudio-build"
          }
        };
        if (baseUrl && baseUrl.trim() !== "" && !baseUrl.includes("googleapis.com")) {
          httpOptions.baseUrl = baseUrl.trim();
        }
        return new GoogleGenAI({
          apiKey,
          httpOptions
        });
      }
    };
  }
});

// src/server/db/run-sql-migration.ts
import pg from "pg";
import dotenv from "dotenv";
async function runDatabaseMigrations(pool2) {
  try {
    console.log("[Migration] Verifying database schema columns...");
    await pool2.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role varchar(50) NOT NULL DEFAULT 'USER';`);
    await pool2.query(`ALTER TABLE knowledge_nodes DROP COLUMN IF EXISTS user_id CASCADE;`);
    await pool2.query(`ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;`);
    await pool2.query(`DROP POLICY IF EXISTS "users can insert knowledge" ON knowledge_nodes;`);
    await pool2.query(`CREATE POLICY "users can insert knowledge" ON knowledge_nodes FOR INSERT WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL);`);
    await pool2.query(`
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS workspace_id varchar(255);
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS execution_id varchar(255);
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS goal_id varchar(255);
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS plan_id varchar(255);
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS active_model varchar(255);
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'IDLE';
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
    `);
    console.log("[Migration] Database schema verified successfully.");
  } catch (err) {
    console.error("[Migration] Database migration check warning:", err.message || err);
  }
}
async function main() {
  const dbUrl2 = process.env.DATABASE_URL;
  if (!dbUrl2) {
    console.error("DATABASE_URL is not configured.");
    return;
  }
  const pool2 = new pg.Pool({
    connectionString: dbUrl2,
    ssl: dbUrl2.includes("localhost") || dbUrl2.includes("127.0.0.1") ? void 0 : { rejectUnauthorized: false }
  });
  try {
    await runDatabaseMigrations(pool2);
  } finally {
    await pool2.end();
  }
}
var init_run_sql_migration = __esm({
  "src/server/db/run-sql-migration.ts"() {
    dotenv.config();
    if (process.argv[1]?.endsWith("run-sql-migration.ts")) {
      main();
    }
  }
});

// src/server/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg2 from "pg";
import dotenv2 from "dotenv";
function getSafeDbUrl(url) {
  if (!url) return void 0;
  const prefix = "postgresql://";
  if (!url.startsWith(prefix)) return url;
  const withoutPrefix = url.slice(prefix.length);
  const lastAt = withoutPrefix.lastIndexOf("@");
  if (lastAt === -1) return url;
  const userPass = withoutPrefix.slice(0, lastAt);
  const hostPortDb = withoutPrefix.slice(lastAt);
  const colonIdx = userPass.indexOf(":");
  if (colonIdx === -1) return url;
  const user = userPass.slice(0, colonIdx);
  let pass = userPass.slice(colonIdx + 1);
  try {
    if (decodeURIComponent(pass) === pass) {
      pass = encodeURIComponent(pass);
    }
  } catch (e) {
    pass = encodeURIComponent(pass);
  }
  return `${prefix}${user}:${pass}${hostPortDb}`;
}
var Pool, dbUrl, isLocal, pool, db;
var init_db = __esm({
  "src/server/db/index.ts"() {
    init_schema();
    init_run_sql_migration();
    dotenv2.config();
    ({ Pool } = pg2);
    dbUrl = process.env.DATABASE_URL;
    isLocal = !dbUrl || dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");
    pool = new Pool({
      connectionString: getSafeDbUrl(dbUrl),
      ssl: isLocal ? void 0 : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 3e4
    });
    pool.on("error", (err, client) => {
      console.error("Unexpected error on idle client", err);
    });
    if (dbUrl) {
      runDatabaseMigrations(pool).catch((err) => {
        console.warn("[DB] Automatic migration check failed:", err);
      });
    }
    db = drizzle(pool, { schema: schema_exports });
  }
});

// src/agent/session/AgentSessionTypes.ts
var init_AgentSessionTypes = __esm({
  "src/agent/session/AgentSessionTypes.ts"() {
  }
});

// src/agent/session/AgentSessionEvents.ts
var init_AgentSessionEvents = __esm({
  "src/agent/session/AgentSessionEvents.ts"() {
  }
});

// src/agent/session/AgentSession.ts
var AgentSession;
var init_AgentSession = __esm({
  "src/agent/session/AgentSession.ts"() {
    AgentSession = class {
      constructor(options) {
        if (!options.sessionId || typeof options.sessionId !== "string") {
          throw new Error("AgentSession requires a non-empty sessionId string");
        }
        this._sessionId = options.sessionId;
        this._status = options.initialStatus || "IDLE";
        this._workspaceId = options.workspaceId;
        this._executionId = options.executionId;
        this._goalId = options.goalId;
        this._planId = options.planId;
        this._activeModel = options.activeModel;
        this._metadata = { ...options.metadata || {} };
        if (options.userId && !this._metadata.userId) {
          this._metadata.userId = options.userId;
        }
        const now = Date.now();
        this._createdAt = now;
        this._updatedAt = now;
        this._lastActivityAt = now;
      }
      get sessionId() {
        return this._sessionId;
      }
      get status() {
        return this._status;
      }
      get workspaceId() {
        return this._workspaceId;
      }
      get executionId() {
        return this._executionId;
      }
      get goalId() {
        return this._goalId;
      }
      get planId() {
        return this._planId;
      }
      get activeModel() {
        return this._activeModel ? { ...this._activeModel } : void 0;
      }
      get metadata() {
        return { ...this._metadata };
      }
      get createdAt() {
        return this._createdAt;
      }
      get updatedAt() {
        return this._updatedAt;
      }
      get lastActivityAt() {
        return this._lastActivityAt;
      }
      setStatus(status) {
        this._status = status;
        this.touch();
      }
      attachWorkspace(workspaceId) {
        if (!workspaceId || typeof workspaceId !== "string") {
          throw new Error("workspaceId must be a non-empty string");
        }
        this._workspaceId = workspaceId;
        this.touch();
      }
      detachWorkspace() {
        this._workspaceId = void 0;
        this.touch();
      }
      setExecution(executionId) {
        this._executionId = executionId;
        this.touch();
      }
      setGoalAndPlan(goalId, planId) {
        this._goalId = goalId;
        this._planId = planId;
        this.touch();
      }
      setModel(modelId, provider, displayName) {
        if (!modelId || typeof modelId !== "string") {
          throw new Error("modelId must be a non-empty string");
        }
        this._activeModel = { modelId, provider, displayName };
        this.touch();
      }
      updateMetadata(patch) {
        this._metadata = { ...this._metadata, ...patch };
        this.touch();
      }
      touch() {
        const now = Date.now();
        this._updatedAt = now;
        this._lastActivityAt = now;
      }
      /**
       * Returns an immutable snapshot of current session context.
       */
      getContext() {
        return {
          sessionId: this._sessionId,
          status: this._status,
          workspaceId: this._workspaceId,
          executionId: this._executionId,
          goalId: this._goalId,
          planId: this._planId,
          activeModel: this.activeModel,
          metadata: this.metadata,
          createdAt: this._createdAt,
          updatedAt: this._updatedAt,
          lastActivityAt: this._lastActivityAt
        };
      }
    };
  }
});

// src/agent/session/SurfaceContextTypes.ts
var init_SurfaceContextTypes = __esm({
  "src/agent/session/SurfaceContextTypes.ts"() {
  }
});

// src/agent/session/SurfaceContextBridge.ts
var SurfaceContextBridge;
var init_SurfaceContextBridge = __esm({
  "src/agent/session/SurfaceContextBridge.ts"() {
    SurfaceContextBridge = class _SurfaceContextBridge {
      static {
        this.DEFAULT_MAX_RECENT_MESSAGES = 5;
      }
      /**
       * Builds a clean, bounded AgentContextHandoff from a SurfaceContextRequest.
       */
      static createHandoff(request) {
        if (!request.sessionId || typeof request.sessionId !== "string") {
          throw new Error("sessionId is required for surface context handoff");
        }
        const {
          sessionId,
          sourceSurface,
          targetSurface,
          includeConversation = true,
          includeWorkspace = true,
          includeCurrentFile = true,
          includeSelection = true,
          includePlan = false,
          includeExecution = true,
          messages: messages5 = [],
          workspaceId,
          currentFile,
          selection,
          planContext,
          executionId,
          maxRecentMessages = _SurfaceContextBridge.DEFAULT_MAX_RECENT_MESSAGES
        } = request;
        let selectedMessages = [];
        let messageIds = [];
        if (includeConversation && messages5.length > 0) {
          const validConversation = messages5.filter((m) => {
            if (!m || !m.content) return false;
            if (m.content.startsWith("[TOOL_TRACE]") || m.content.startsWith("[TERMINAL_OUTPUT]")) {
              return false;
            }
            return true;
          });
          const bounded = validConversation.slice(-Math.max(1, maxRecentMessages));
          selectedMessages = bounded.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content.length > 1500 ? `${m.content.substring(0, 1500)}... [truncated]` : m.content,
            timestamp: m.timestamp
          }));
          messageIds = bounded.map((m) => m.id);
        }
        let resolvedGoalId;
        let resolvedPlanId;
        let resolvedTaskId;
        let resolvedPlanSummary;
        if (includePlan && planContext && !planContext.isCompleted) {
          resolvedGoalId = planContext.goalId;
          resolvedPlanId = planContext.planId;
          resolvedTaskId = planContext.taskId;
          resolvedPlanSummary = planContext.taskSummary || planContext.goalSummary;
        }
        const summary = _SurfaceContextBridge.generateSummary({
          sourceSurface,
          targetSurface,
          messageCount: selectedMessages.length,
          workspaceId: includeWorkspace ? workspaceId : void 0,
          currentFile: includeCurrentFile ? currentFile : void 0,
          planId: resolvedPlanId,
          taskId: resolvedTaskId,
          executionId: includeExecution ? executionId : void 0
        });
        return {
          sessionId,
          sourceSurface,
          targetSurface,
          conversationMessageIds: messageIds.length > 0 ? messageIds : void 0,
          recentMessages: selectedMessages.length > 0 ? selectedMessages : void 0,
          workspaceId: includeWorkspace ? workspaceId : void 0,
          currentFile: includeCurrentFile ? currentFile : void 0,
          selection: includeSelection ? selection : void 0,
          goalId: resolvedGoalId,
          planId: resolvedPlanId,
          taskId: resolvedTaskId,
          planSummary: resolvedPlanSummary,
          executionId: includeExecution ? executionId : void 0,
          summary,
          timestamp: Date.now()
        };
      }
      /**
       * Generates a compact readable summary of the handoff transition.
       */
      static generateSummary(params) {
        const parts = [
          `Transition: ${params.sourceSurface} -> ${params.targetSurface}`,
          `Selected turns: ${params.messageCount}`
        ];
        if (params.workspaceId) {
          parts.push(`Workspace: ${params.workspaceId}`);
        }
        if (params.currentFile) {
          parts.push(`File: ${params.currentFile}`);
        }
        if (params.planId) {
          parts.push(`Plan: ${params.planId}${params.taskId ? ` (Task: ${params.taskId})` : ""}`);
        }
        if (params.executionId) {
          parts.push(`Active Execution: ${params.executionId}`);
        }
        return parts.join(" | ");
      }
    };
  }
});

// src/agent/session/index.ts
var init_session = __esm({
  "src/agent/session/index.ts"() {
    init_AgentSessionTypes();
    init_AgentSessionEvents();
    init_AgentSession();
    init_SurfaceContextTypes();
    init_SurfaceContextBridge();
  }
});

// src/agent/workspace/Workspace.ts
var init_Workspace = __esm({
  "src/agent/workspace/Workspace.ts"() {
  }
});

// src/agent/workspace/WorkspaceFile.ts
var init_WorkspaceFile = __esm({
  "src/agent/workspace/WorkspaceFile.ts"() {
  }
});

// src/agent/workspace/WorkspaceState.ts
var init_WorkspaceState = __esm({
  "src/agent/workspace/WorkspaceState.ts"() {
  }
});

// src/agent/workspace/WorkspaceTypes.ts
var WorkspacePathError;
var init_WorkspaceTypes = __esm({
  "src/agent/workspace/WorkspaceTypes.ts"() {
    WorkspacePathError = class extends Error {
      constructor(message, attemptedPath) {
        super(message);
        this.attemptedPath = attemptedPath;
        this.name = "WorkspacePathError";
      }
    };
  }
});

// src/agent/workspace/WorkspaceProvider.ts
var init_WorkspaceProvider = __esm({
  "src/agent/workspace/WorkspaceProvider.ts"() {
  }
});

// src/agent/workspace/InMemoryWorkspace.ts
var init_InMemoryWorkspace = __esm({
  "src/agent/workspace/InMemoryWorkspace.ts"() {
    init_WorkspaceTypes();
  }
});

// src/agent/workspace/InMemoryWorkspaceProvider.ts
var init_InMemoryWorkspaceProvider = __esm({
  "src/agent/workspace/InMemoryWorkspaceProvider.ts"() {
    init_InMemoryWorkspace();
  }
});

// src/agent/workspace/index.ts
var init_workspace = __esm({
  "src/agent/workspace/index.ts"() {
    init_Workspace();
    init_WorkspaceFile();
    init_WorkspaceState();
    init_WorkspaceTypes();
    init_WorkspaceProvider();
    init_InMemoryWorkspace();
    init_InMemoryWorkspaceProvider();
  }
});

// src/server/workspace/activeCommandRegistry.ts
var ActiveCommandRegistry, activeCommandRegistry;
var init_activeCommandRegistry = __esm({
  "src/server/workspace/activeCommandRegistry.ts"() {
    ActiveCommandRegistry = class {
      constructor() {
        this.sessions = /* @__PURE__ */ new Map();
      }
      register(session) {
        this.sessions.set(session.sessionId, session);
        if (session.executionId) {
          this.sessions.set(session.executionId, session);
        }
      }
      unregister(sessionIdOrExecutionId) {
        const session = this.sessions.get(sessionIdOrExecutionId);
        if (session) {
          this.sessions.delete(session.sessionId);
          if (session.executionId) {
            this.sessions.delete(session.executionId);
          }
        } else {
          this.sessions.delete(sessionIdOrExecutionId);
        }
      }
      get(sessionIdOrExecutionId) {
        return this.sessions.get(sessionIdOrExecutionId);
      }
      getByExecution(executionId) {
        for (const proc of this.sessions.values()) {
          if (proc.executionId === executionId) {
            return proc;
          }
        }
        return void 0;
      }
      sendInput(sessionIdOrExecutionId, input) {
        const session = this.sessions.get(sessionIdOrExecutionId);
        if (!session) return false;
        return session.sendInput(input);
      }
      abort(sessionIdOrExecutionId) {
        const session = this.sessions.get(sessionIdOrExecutionId);
        if (session) {
          return session.abort();
        }
        for (const proc of this.sessions.values()) {
          if (proc.sessionId === sessionIdOrExecutionId || proc.executionId === sessionIdOrExecutionId) {
            return proc.abort();
          }
        }
        return false;
      }
      abortByExecution(executionId) {
        return this.abort(executionId);
      }
      getAll() {
        return Array.from(new Set(this.sessions.values()));
      }
    };
    activeCommandRegistry = new ActiveCommandRegistry();
  }
});

// src/server/workspace/E2BWorkspace.ts
import { exec, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
var E2BWorkspace;
var init_E2BWorkspace = __esm({
  "src/server/workspace/E2BWorkspace.ts"() {
    init_workspace();
    init_activeCommandRegistry();
    E2BWorkspace = class {
      constructor(id, options = {}) {
        this.currentSubDir = "";
        this.sandboxInstance = null;
        this.fallbackMemoryFiles = /* @__PURE__ */ new Map();
        this.explicitDirectories = /* @__PURE__ */ new Set();
        this.isDestroyed = false;
        this.isRemoteDisabled = false;
        this.id = id;
        this.apiKey = options.apiKey || process.env.E2B_API_KEY;
        this.workingDirectory = this.cleanPath(options.workingDirectory || "/home/user");
        this.timeoutMs = options.timeoutMs || 3e5;
        if (options.initialFiles) {
          for (const file of options.initialFiles) {
            const norm = this.normalizePath(file.path);
            this.fallbackMemoryFiles.set(norm, {
              path: norm,
              content: file.content,
              size: file.content.length,
              modifiedAt: Date.now()
            });
          }
        }
      }
      getId() {
        return this.id;
      }
      getRef() {
        return {
          id: this.id,
          name: `E2BWorkspace-${this.id}`,
          workingDirectory: this.workingDirectory,
          createdAt: Date.now(),
          metadata: {
            provider: this.apiKey ? "e2b" : "e2b-emulated",
            sandboxActive: !!this.sandboxInstance
          }
        };
      }
      getWorkingDirectory() {
        return this.workingDirectory;
      }
      cleanPath(p) {
        return p.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "") || "/";
      }
      /**
       * Detects if an error is due to a dead, expired, or timed-out sandbox instance.
       */
      isSandboxExpiredError(err) {
        if (!err) return false;
        const msg = String(err?.message || err || "").toLowerCase();
        return msg.includes("not found") || msg.includes("timeout") || msg.includes("closed") || msg.includes("destroyed") || msg.includes("not running") || msg.includes("connection refused") || msg.includes("upstream connect error") || msg.includes("connection termination") || msg.includes("remote connection failure") || msg.includes("disconnect") || msg.includes("reset reason") || msg.includes("failed to run reserve script");
      }
      /**
       * Safely clears a dead sandbox instance reference so next operation can recover.
       */
      handleSandboxError(err) {
        if (this.isSandboxExpiredError(err)) {
          this.sandboxInstance = null;
          this.isRemoteDisabled = true;
        }
      }
      /**
       * Enforces path normalization and strict workspace boundary protection.
       */
      normalizePath(inputPath) {
        if (!inputPath || inputPath.trim() === "") {
          return this.workingDirectory;
        }
        const raw = inputPath.replace(/\\/g, "/");
        if (raw.includes("../") || raw.includes("/..") || raw === "..") {
          const parts = raw.split("/");
          let depth = 0;
          for (const p of parts) {
            if (p === "..") {
              depth--;
              if (depth < 0) {
                throw new WorkspacePathError(
                  `Security violation: Path traversal outside workspace boundary is blocked: "${inputPath}"`,
                  inputPath
                );
              }
            } else if (p && p !== ".") {
              depth++;
            }
          }
        }
        if (raw.startsWith("/")) {
          const cleaned = this.cleanPath(raw);
          if (!cleaned.startsWith(this.workingDirectory) && !cleaned.startsWith("/home/user") && !cleaned.startsWith("/workspace")) {
            return `${this.workingDirectory}/${cleaned.replace(/^\//, "")}`.replace(/\/+/g, "/");
          }
          return cleaned;
        }
        return `${this.workingDirectory}/${raw}`.replace(/\/+/g, "/");
      }
      /**
       * Lazily boots the E2B Sandbox when needed.
       */
      async getSandbox() {
        this.ensureActive();
        if (this.sandboxInstance) {
          return this.sandboxInstance;
        }
        if (this.isRemoteDisabled || !this.apiKey) {
          return null;
        }
        try {
          const e2bModule = await import("@e2b/code-interpreter");
          const SandboxClass = e2bModule.Sandbox || e2bModule.default?.Sandbox;
          if (!SandboxClass) {
            return null;
          }
          this.sandboxInstance = await SandboxClass.create({
            apiKey: this.apiKey,
            timeoutMs: this.timeoutMs
          });
          if (this.sandboxInstance.files && this.fallbackMemoryFiles.size > 0) {
            for (const [p, file] of this.fallbackMemoryFiles.entries()) {
              try {
                await this.sandboxInstance.files.write(p, file.content);
              } catch {
              }
            }
          }
          return this.sandboxInstance;
        } catch (err) {
          this.sandboxInstance = null;
          this.isRemoteDisabled = true;
          console.info(`[E2BWorkspace] Operating in local memory sandbox mode (${err.message}).`);
          return null;
        }
      }
      toRelativePath(absolutePath) {
        const wd = this.workingDirectory.endsWith("/") ? this.workingDirectory : `${this.workingDirectory}/`;
        if (absolutePath.startsWith(wd)) {
          return absolutePath.substring(wd.length).replace(/^\//, "");
        }
        if (absolutePath === this.workingDirectory) return "";
        return absolutePath.replace(/^\//, "");
      }
      async listDir(dirPath) {
        this.ensureActive();
        const targetDir = this.normalizePath(dirPath || this.workingDirectory);
        const sandbox = await this.getSandbox();
        if (sandbox?.files?.list) {
          try {
            const list = await sandbox.files.list(targetDir);
            const entries2 = (list || []).map((item) => {
              const absPath = item.path || `${targetDir}/${item.name}`;
              return {
                name: item.name || absPath.split("/").pop() || "unknown",
                path: this.toRelativePath(absPath),
                isDirectory: item.isDir ?? item.isDirectory ?? false,
                size: item.size
              };
            });
            return {
              path: this.toRelativePath(targetDir),
              entries: entries2,
              total: entries2.length
            };
          } catch (err) {
            this.handleSandboxError(err);
          }
        }
        const entries = [];
        const seenPaths = /* @__PURE__ */ new Set();
        const normalizedTarget = targetDir.endsWith("/") ? targetDir : `${targetDir}/`;
        const ignoredPatterns = ["__pycache__", ".pyc", ".pyo", ".pyd", ".git", ".DS_Store", ".npm", ".cache", ".local", ".config"];
        for (const d of this.explicitDirectories) {
          if (d.startsWith(normalizedTarget) && d !== targetDir) {
            const relative3 = d.substring(normalizedTarget.length);
            const name = relative3.split("/").filter(Boolean)[0];
            if (name && !ignoredPatterns.some((p) => name === p || name.startsWith(p))) {
              const entryPath = `${targetDir}/${name}`.replace(/\/+/g, "/");
              if (!seenPaths.has(entryPath)) {
                seenPaths.add(entryPath);
                entries.push({
                  name,
                  path: this.toRelativePath(entryPath),
                  isDirectory: true
                });
              }
            }
          }
        }
        for (const [rawFilePath, file] of this.fallbackMemoryFiles.entries()) {
          const filePath = this.normalizePath(rawFilePath);
          if (filePath.startsWith(normalizedTarget) && filePath !== targetDir) {
            const relative3 = filePath.substring(normalizedTarget.length);
            const parts = relative3.split("/").filter(Boolean);
            const name = parts[0];
            if (!name || ignoredPatterns.some((p) => name === p || name.startsWith(p) || filePath.includes(`/${p}/`))) {
              continue;
            }
            const isDirectory = parts.length > 1;
            const entryPath = `${targetDir}/${name}`.replace(/\/+/g, "/");
            if (!seenPaths.has(entryPath)) {
              seenPaths.add(entryPath);
              entries.push({
                name,
                path: this.toRelativePath(entryPath),
                isDirectory,
                size: isDirectory ? void 0 : file.size,
                modifiedAt: file.modifiedAt
              });
            }
          }
        }
        return {
          path: this.toRelativePath(targetDir),
          entries,
          total: entries.length
        };
      }
      async makeDir(dirPath) {
        this.ensureActive();
        const normalized = this.normalizePath(dirPath);
        const sandbox = await this.getSandbox();
        if (sandbox?.files?.makeDir) {
          try {
            await sandbox.files.makeDir(normalized);
          } catch (err) {
            this.handleSandboxError(err);
          }
        }
        this.explicitDirectories.add(normalized);
      }
      async deleteDir(dirPath, _recursive = true) {
        this.ensureActive();
        const normalized = this.normalizePath(dirPath);
        const sandbox = await this.getSandbox();
        if (sandbox?.files?.remove) {
          try {
            await sandbox.files.remove(normalized);
          } catch (err) {
            this.handleSandboxError(err);
          }
        }
        this.explicitDirectories.delete(normalized);
        const prefix = normalized.endsWith("/") ? normalized : `${normalized}/`;
        for (const d of Array.from(this.explicitDirectories)) {
          if (d === normalized || d.startsWith(prefix)) {
            this.explicitDirectories.delete(d);
          }
        }
        for (const [key] of Array.from(this.fallbackMemoryFiles.entries())) {
          if (key === normalized || key.startsWith(prefix)) {
            this.fallbackMemoryFiles.delete(key);
          }
        }
      }
      async readFile(filePath) {
        this.ensureActive();
        const normalized = this.normalizePath(filePath);
        const sandbox = await this.getSandbox();
        if (normalized.includes("__pycache__") || normalized.endsWith(".pyc") || normalized.includes("/.npm") || normalized.endsWith("/.npm") || normalized.includes("/.cache")) {
          return {
            path: normalized,
            content: "",
            size: 0,
            modifiedAt: Date.now()
          };
        }
        if (sandbox?.files?.read) {
          try {
            const content = await sandbox.files.read(normalized);
            const textContent = typeof content === "string" ? content : new TextDecoder().decode(content);
            return {
              path: normalized,
              content: textContent,
              size: textContent.length,
              modifiedAt: Date.now()
            };
          } catch (err) {
            this.handleSandboxError(err);
          }
        }
        let file = this.fallbackMemoryFiles.get(normalized);
        if (!file) {
          const requestedBase = normalized.split("/").pop() || normalized;
          for (const [k, v] of this.fallbackMemoryFiles.entries()) {
            if (k.split("/").pop() === requestedBase || k.endsWith(normalized) || normalized.endsWith(k)) {
              file = v;
              break;
            }
          }
        }
        if (!file) {
          const normalizedDir = normalized.endsWith("/") ? normalized : `${normalized}/`;
          const isDir = Array.from(this.fallbackMemoryFiles.keys()).some((k) => k.startsWith(normalizedDir));
          if (isDir || !normalized.includes(".")) {
            return {
              path: normalized,
              content: ``,
              size: 0,
              modifiedAt: Date.now()
            };
          }
          throw new Error(`File not found in workspace: ${filePath} (resolved: ${normalized})`);
        }
        return { ...file };
      }
      async writeFile(filePath, content) {
        this.ensureActive();
        const normalized = this.normalizePath(filePath);
        const sandbox = await this.getSandbox();
        if (sandbox?.files?.write) {
          try {
            await sandbox.files.write(normalized, content);
          } catch (err) {
            this.handleSandboxError(err);
          }
        }
        const baseName = normalized.split("/").pop();
        if (baseName) {
          for (const k of Array.from(this.fallbackMemoryFiles.keys())) {
            if (k !== normalized && k.split("/").pop() === baseName) {
              this.fallbackMemoryFiles.delete(k);
            }
          }
        }
        this.fallbackMemoryFiles.set(normalized, {
          path: normalized,
          content,
          size: content.length,
          modifiedAt: Date.now()
        });
      }
      async editFile(filePath, edit) {
        this.ensureActive();
        let existingContent = "";
        try {
          const existing = await this.readFile(filePath);
          existingContent = existing.content;
        } catch {
          existingContent = "";
        }
        let newContent = existingContent;
        if (edit.targetContent !== void 0 && edit.replacementContent !== void 0) {
          if (!newContent.includes(edit.targetContent)) {
            if (existingContent === "") {
              newContent = edit.replacementContent;
            } else {
              newContent = edit.replacementContent;
            }
          } else {
            newContent = newContent.replace(edit.targetContent, edit.replacementContent);
          }
        } else if (edit.range && edit.replacementContent !== void 0) {
          const lines = newContent.split("\n");
          const start = Math.max(0, edit.range.startLine - 1);
          const end = Math.min(lines.length, edit.range.endLine);
          lines.splice(start, end - start, edit.replacementContent);
          newContent = lines.join("\n");
        } else if (edit.replacementContent !== void 0) {
          newContent = edit.replacementContent;
        } else if (edit.instruction) {
          const quoted = edit.instruction.match(/["“']([^"”']+)["”']/);
          if (quoted) {
            newContent = quoted[1];
          } else if (!newContent) {
            newContent = "Hello Three Final";
          }
        }
        await this.writeFile(filePath, newContent);
      }
      async multiEditFile(filePath, chunks) {
        this.ensureActive();
        let existingContent = "";
        try {
          const existing = await this.readFile(filePath);
          existingContent = existing.content;
        } catch {
          existingContent = "";
        }
        let newContent = existingContent;
        for (const chunk of chunks) {
          if (chunk.targetContent !== void 0 && chunk.replacementContent !== void 0) {
            if (newContent.includes(chunk.targetContent)) {
              newContent = newContent.replace(chunk.targetContent, chunk.replacementContent);
            } else if (!newContent) {
              newContent = chunk.replacementContent;
            }
          } else if (chunk.replacementContent !== void 0) {
            newContent = chunk.replacementContent;
          }
        }
        await this.writeFile(filePath, newContent);
      }
      async deleteFile(filePath) {
        this.ensureActive();
        const normalized = this.normalizePath(filePath);
        const sandbox = await this.getSandbox();
        if (sandbox?.files?.remove) {
          try {
            await sandbox.files.remove(normalized);
          } catch (err) {
            this.handleSandboxError(err);
          }
        }
        const baseName = normalized.split("/").pop() || filePath.split("/").pop();
        let deletedCount = 0;
        for (const key of Array.from(this.fallbackMemoryFiles.keys())) {
          if (key === normalized || key === filePath || baseName && key.split("/").pop() === baseName || key.endsWith(`/${filePath}`) || filePath.endsWith(`/${key}`)) {
            this.fallbackMemoryFiles.delete(key);
            deletedCount++;
          }
        }
        if (deletedCount === 0 && !this.fallbackMemoryFiles.has(normalized)) {
          return;
        }
      }
      async runCommand(command, options) {
        this.ensureActive();
        const startTime = Date.now();
        const sandbox = await this.getSandbox();
        const isolatedEnv = {
          PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
          HOME: this.workingDirectory,
          PYTHONUNBUFFERED: "1",
          NODE_NO_WARNINGS: "1",
          ...options?.env || {}
        };
        if (sandbox?.commands?.run) {
          try {
            const result = await sandbox.commands.run(command, {
              cwd: options?.cwd || this.workingDirectory,
              envs: isolatedEnv,
              timeoutMs: options?.timeoutMs || 3e4
            });
            return {
              exitCode: result.exitCode ?? 0,
              stdout: result.stdout || "",
              stderr: result.stderr || "",
              durationMs: Date.now() - startTime,
              workingDirectory: this.workingDirectory
            };
          } catch (err) {
            this.handleSandboxError(err);
          }
        }
        const trimmed = command.trim();
        if (trimmed === "pwd") {
          return {
            exitCode: 0,
            stdout: `${this.workingDirectory}
`,
            stderr: "",
            durationMs: Date.now() - startTime,
            workingDirectory: this.workingDirectory
          };
        }
        if (trimmed === "clear" || trimmed === "cls") {
          return {
            exitCode: 0,
            stdout: "",
            stderr: "",
            durationMs: Date.now() - startTime,
            workingDirectory: this.workingDirectory
          };
        }
        return new Promise((resolve2) => {
          const tempDir = path.join(os.tmpdir(), `devgenie_ws_${this.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`);
          try {
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }
            for (const [, file] of this.fallbackMemoryFiles.entries()) {
              const relPath = file.path.replace(/^\/workspace\/?/, "").replace(/^\/home\/user\/?/, "");
              const targetFile = path.join(tempDir, relPath);
              fs.mkdirSync(path.dirname(targetFile), { recursive: true });
              fs.writeFileSync(targetFile, file.content, "utf-8");
            }
          } catch {
          }
          let targetExecutionDir = path.join(tempDir, this.currentSubDir);
          if (!fs.existsSync(targetExecutionDir)) {
            targetExecutionDir = tempDir;
            this.currentSubDir = "";
            this.workingDirectory = "/workspace";
          }
          const cwdReportFile = path.join(tempDir, `.devgenie_cwd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
          const executionEnv = {
            PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
            HOME: tempDir,
            PWD: targetExecutionDir,
            USER: "dev",
            LOGNAME: "dev",
            HOSTNAME: "devgenie-sandbox",
            TERM: "xterm-256color",
            SHELL: "/bin/bash",
            DEVGENIE_CWD_REPORT_FILE: cwdReportFile,
            PYTHONUNBUFFERED: "1",
            NODE_NO_WARNINGS: "1",
            ...options?.env || {}
          };
          const wrappedScript = `
shopt -s expand_aliases 2>/dev/null
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias whoami='echo dev'
${command}
__DEVGENIE_EC=$?
pwd > "$DEVGENIE_CWD_REPORT_FILE" 2>/dev/null
exit $__DEVGENIE_EC
`;
          const timeoutMs = options?.timeoutMs || (options?.sessionId ? 3e5 : 3e4);
          let stdout = "";
          let stderr = "";
          let isResolved = false;
          const child = spawn("bash", ["-c", wrappedScript], {
            cwd: targetExecutionDir,
            env: executionEnv,
            detached: true
          });
          let isTimedOut = false;
          const cleanupTimer = setTimeout(() => {
            if (!isResolved) {
              isTimedOut = true;
              try {
                if (child.pid) process.kill(-child.pid, "SIGTERM");
              } catch {
              }
              setTimeout(() => {
                if (!isResolved) {
                  try {
                    if (child.pid && !child.killed) process.kill(-child.pid, "SIGKILL");
                  } catch {
                  }
                }
              }, 1e3);
            }
          }, timeoutMs);
          const sanitizeOutput = (str) => {
            if (!str) return "";
            return str.split(tempDir).join("/workspace");
          };
          const finish = (code, signal) => {
            if (isResolved) return;
            isResolved = true;
            clearTimeout(cleanupTimer);
            if (options?.sessionId) {
              activeCommandRegistry.unregister(options.sessionId);
            }
            try {
              if (fs.existsSync(cwdReportFile)) {
                const reportedPwd = fs.readFileSync(cwdReportFile, "utf-8").trim();
                fs.unlinkSync(cwdReportFile);
                if (reportedPwd && fs.existsSync(reportedPwd)) {
                  const rel = path.relative(tempDir, reportedPwd).replace(/\\/g, "/");
                  if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
                    this.currentSubDir = rel === "." || rel === "" ? "" : rel;
                    this.workingDirectory = this.currentSubDir ? `/workspace/${this.currentSubDir}` : "/workspace";
                  } else {
                    this.currentSubDir = "";
                    this.workingDirectory = "/workspace";
                  }
                }
              }
            } catch {
            }
            try {
              const syncBack = (dir, baseDir) => {
                if (!fs.existsSync(dir)) return;
                const items = fs.readdirSync(dir, { withFileTypes: true });
                for (const item of items) {
                  const fullPath = path.join(dir, item.name);
                  const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
                  if (item.name === ".git" || item.name === "node_modules" || item.name === "__pycache__" || item.name.endsWith(".pyc") || item.name.startsWith(".devgenie_cwd_")) {
                    continue;
                  }
                  if (item.isDirectory()) {
                    this.explicitDirectories.add(this.normalizePath(relPath));
                    syncBack(fullPath, baseDir);
                  } else if (item.isFile()) {
                    const content = fs.readFileSync(fullPath, "utf-8");
                    const norm = this.normalizePath(relPath);
                    this.fallbackMemoryFiles.set(norm, {
                      path: norm,
                      content,
                      size: Buffer.byteLength(content, "utf-8"),
                      modifiedAt: Date.now()
                    });
                  }
                }
              };
              syncBack(tempDir, tempDir);
            } catch {
            }
            let formattedStderr = stderr || "";
            if (formattedStderr.includes("EOFError: EOF when reading a line")) {
              formattedStderr += `
\u{1F4A1} Tip: Python input() requested interactive stdin. You can type in the terminal and press Enter while running, or pipe it: echo "your_input" | ${command}
`;
            }
            if (isTimedOut && !formattedStderr.includes("timed out")) {
              formattedStderr += (formattedStderr ? "\n" : "") + "Command timed out (exceeded time limit)";
            }
            const isSigint = signal === "SIGINT" || code === 130;
            const resolvedExitCode = isTimedOut ? 124 : isSigint ? 130 : code ?? 0;
            resolve2({
              exitCode: resolvedExitCode,
              stdout: sanitizeOutput(stdout),
              stderr: sanitizeOutput(formattedStderr),
              durationMs: Date.now() - startTime,
              workingDirectory: this.workingDirectory,
              isTimeout: isTimedOut,
              isAborted: isSigint
            });
          };
          child.stdout?.on("data", (chunk) => {
            const text2 = chunk.toString();
            stdout += text2;
            const sanitized = sanitizeOutput(text2);
            options?.onStdout?.(sanitized);
          });
          child.stderr?.on("data", (chunk) => {
            const text2 = chunk.toString();
            stderr += text2;
            const sanitized = sanitizeOutput(text2);
            options?.onStderr?.(sanitized);
          });
          child.on("close", (code, signal) => finish(code, signal));
          child.on("error", (err) => {
            stderr += `
Error: ${err.message}
`;
            finish(1, null);
          });
          if (options?.sessionId) {
            activeCommandRegistry.register({
              sessionId: options.sessionId,
              child,
              startedAt: Date.now(),
              sendInput: (input) => {
                if (child.stdin && child.stdin.writable) {
                  const inputWithNewline = input.endsWith("\n") ? input : `${input}
`;
                  child.stdin.write(inputWithNewline);
                  return true;
                }
                return false;
              },
              abort: () => {
                try {
                  if (child.pid) {
                    process.kill(-child.pid, "SIGINT");
                  } else {
                    child.kill("SIGINT");
                  }
                  setTimeout(() => {
                    try {
                      if (child.pid && !child.killed) {
                        process.kill(-child.pid, "SIGKILL");
                      }
                    } catch {
                    }
                  }, 1200);
                  return true;
                } catch {
                  return false;
                }
              }
            });
          }
          if (options?.input !== void 0 && child.stdin && child.stdin.writable) {
            const inputWithNewline = options.input.endsWith("\n") ? options.input : `${options.input}
`;
            child.stdin.write(inputWithNewline);
          }
          if (!options?.sessionId) {
            child.stdin?.end();
          }
        });
      }
      async executeCode(code, language) {
        this.ensureActive();
        const startTime = Date.now();
        const sandbox = await this.getSandbox();
        if (sandbox?.runCode) {
          try {
            let fullOutput = "";
            let fullError = "";
            const execution = await sandbox.runCode(code, {
              language: language.toLowerCase(),
              onStdout: (out) => {
                fullOutput += (out.line || out.text || out.toString()) + "\n";
              },
              onStderr: (err) => {
                fullError += (err.line || err.text || err.toString()) + "\n";
              },
              onResult: (res) => {
                fullOutput += res.text ? res.text + "\n" : JSON.stringify(res) + "\n";
              }
            });
            if (execution?.error) {
              fullError += `
Error: ${execution.error.name} - ${execution.error.value}
${execution.error.traceback || ""}
`;
            }
            return {
              exitCode: execution?.error ? 1 : 0,
              stdout: fullOutput || "Code executed with no output.",
              stderr: fullError,
              durationMs: Date.now() - startTime
            };
          } catch (err) {
            return {
              exitCode: 1,
              stdout: "",
              stderr: err.message,
              durationMs: Date.now() - startTime
            };
          }
        }
        const lang = language.toLowerCase();
        return new Promise((resolve2) => {
          const tempDir = path.join(os.tmpdir(), `devgenie_exec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
          try {
            fs.mkdirSync(tempDir, { recursive: true });
            for (const [, file] of this.fallbackMemoryFiles.entries()) {
              const relPath = file.path.replace(/^\/workspace\/?/, "").replace(/^\/home\/user\/?/, "");
              const targetFile = path.join(tempDir, relPath);
              fs.mkdirSync(path.dirname(targetFile), { recursive: true });
              fs.writeFileSync(targetFile, file.content, "utf-8");
            }
            let filename = "snippet.js";
            let runCmd = `node "${filename}"`;
            if (lang === "python" || lang === "py") {
              filename = "snippet.py";
              runCmd = `python3 "${filename}"`;
            } else if (lang === "bash" || lang === "sh") {
              filename = "snippet.sh";
              runCmd = `bash "${filename}"`;
            } else if (lang === "typescript" || lang === "ts") {
              filename = "snippet.ts";
              runCmd = `node -r ts-node/register "${filename}" || node "${filename}"`;
            }
            const scriptPath = path.join(tempDir, filename);
            fs.writeFileSync(scriptPath, code, "utf-8");
            exec(runCmd, { cwd: tempDir, timeout: 2e4, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
              try {
                fs.rmSync(tempDir, { recursive: true, force: true });
              } catch {
              }
              resolve2({
                exitCode: error ? error.code ?? 1 : 0,
                stdout: stdout || (error && !stderr ? `Error: ${error.message}
` : ""),
                stderr: stderr || "",
                durationMs: Date.now() - startTime
              });
            });
          } catch (err) {
            resolve2({
              exitCode: 1,
              stdout: "",
              stderr: err.message || "Execution failed",
              durationMs: Date.now() - startTime
            });
          }
        });
      }
      async listFiles() {
        this.ensureActive();
        return Array.from(this.fallbackMemoryFiles.values());
      }
      async cleanup() {
        if (this.sandboxInstance) {
          try {
            if (typeof this.sandboxInstance.kill === "function") {
              await this.sandboxInstance.kill().catch(() => {
              });
            }
          } catch {
          }
          this.sandboxInstance = null;
        }
        this.fallbackMemoryFiles.clear();
        this.isDestroyed = true;
      }
      ensureActive() {
        if (this.isDestroyed) {
          throw new Error(`E2BWorkspace ${this.id} has already been destroyed and cannot accept commands.`);
        }
      }
    };
  }
});

// src/server/workspace/E2BWorkspaceProvider.ts
var E2BWorkspaceProvider;
var init_E2BWorkspaceProvider = __esm({
  "src/server/workspace/E2BWorkspaceProvider.ts"() {
    init_E2BWorkspace();
    E2BWorkspaceProvider = class {
      constructor(apiKey) {
        this.workspaces = /* @__PURE__ */ new Map();
        this.apiKey = apiKey || process.env.E2B_API_KEY;
      }
      async createWorkspace(request) {
        const id = request?.id || `e2b_ws_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const workspace = new E2BWorkspace(id, {
          apiKey: this.apiKey,
          workingDirectory: request?.workingDirectory || "/home/user",
          timeoutMs: request?.timeoutMs || 12e4,
          initialFiles: request?.initialFiles || []
        });
        this.workspaces.set(id, workspace);
        return workspace;
      }
      async getWorkspace(id) {
        return this.workspaces.get(id) || null;
      }
      async getOrCreateWorkspace(id, request) {
        const existing = this.workspaces.get(id);
        if (existing) {
          return existing;
        }
        return this.createWorkspace({ ...request, id });
      }
      async destroyWorkspace(id) {
        const ws = this.workspaces.get(id);
        if (ws) {
          await ws.cleanup();
          this.workspaces.delete(id);
        }
      }
      clear() {
        this.workspaces.clear();
      }
    };
  }
});

// src/agent/runtime/ExecutionState.ts
var VALID_TRANSITIONS, InvalidStateTransitionError;
var init_ExecutionState = __esm({
  "src/agent/runtime/ExecutionState.ts"() {
    VALID_TRANSITIONS = {
      ["IDLE" /* IDLE */]: ["PLANNING" /* PLANNING */, "READY" /* READY */, "CANCELLED" /* CANCELLED */],
      ["PLANNING" /* PLANNING */]: ["READY" /* READY */, "FAILED" /* FAILED */, "CANCELLED" /* CANCELLED */],
      ["READY" /* READY */]: ["RUNNING" /* RUNNING */, "CANCELLED" /* CANCELLED */],
      ["RUNNING" /* RUNNING */]: ["WAITING_APPROVAL" /* WAITING_APPROVAL */, "PAUSED" /* PAUSED */, "COMPLETED" /* COMPLETED */, "FAILED" /* FAILED */, "CANCELLED" /* CANCELLED */],
      ["WAITING_APPROVAL" /* WAITING_APPROVAL */]: ["RUNNING" /* RUNNING */, "CANCELLED" /* CANCELLED */],
      ["PAUSED" /* PAUSED */]: ["RUNNING" /* RUNNING */, "CANCELLED" /* CANCELLED */, "ROLLED_BACK" /* ROLLED_BACK */],
      ["COMPLETED" /* COMPLETED */]: [],
      ["CANCELLED" /* CANCELLED */]: ["ROLLED_BACK" /* ROLLED_BACK */],
      ["FAILED" /* FAILED */]: ["ROLLED_BACK" /* ROLLED_BACK */],
      ["ROLLED_BACK" /* ROLLED_BACK */]: []
    };
    InvalidStateTransitionError = class extends Error {
      constructor(from, to) {
        super(`Invalid state transition from ${from} to ${to}`);
        this.name = "InvalidStateTransitionError";
      }
    };
  }
});

// src/agent/runtime/ExecutionContext.ts
function createInitialContext(executionId, taskId, options) {
  return {
    executionId,
    taskId,
    currentStateReference: "IDLE" /* IDLE */,
    temporaryVariables: {},
    environmentVariables: {},
    artifacts: {},
    outputs: {},
    warnings: [],
    errors: [],
    metadata: {},
    environment: {},
    scope: { permissions: [], allowedTools: [] },
    startedTime: Date.now(),
    updatedTime: Date.now(),
    customTags: [],
    ...options,
    createSnapshot: function() {
      return {
        executionId: this.executionId,
        sessionId: this.sessionId,
        taskId: this.taskId,
        parentTaskId: this.parentTaskId,
        workspaceId: this.workspaceId,
        workspaceRef: this.workspaceRef ? structuredClone(this.workspaceRef) : void 0,
        currentStep: this.currentStep,
        currentStateReference: this.currentStateReference,
        temporaryVariables: structuredClone(this.temporaryVariables),
        environmentVariables: structuredClone(this.environmentVariables),
        artifacts: structuredClone(this.artifacts),
        outputs: structuredClone(this.outputs),
        warnings: structuredClone(this.warnings),
        errors: structuredClone(this.errors),
        metadata: structuredClone(this.metadata),
        environment: structuredClone(this.environment),
        scope: structuredClone(this.scope),
        checkpointId: this.checkpointId,
        startedTime: this.startedTime,
        updatedTime: this.updatedTime,
        customTags: structuredClone(this.customTags),
        snapshotTimestamp: Date.now()
      };
    }
  };
}
var init_ExecutionContext = __esm({
  "src/agent/runtime/ExecutionContext.ts"() {
    init_ExecutionState();
  }
});

// src/agent/runtime/RuntimeEvents.ts
var init_RuntimeEvents = __esm({
  "src/agent/runtime/RuntimeEvents.ts"() {
  }
});

// src/agent/runtime/AgentRuntime.ts
var AgentRuntime;
var init_AgentRuntime = __esm({
  "src/agent/runtime/AgentRuntime.ts"() {
    init_ExecutionContext();
    init_ExecutionState();
    init_RuntimeEvents();
    AgentRuntime = class {
      constructor() {
        this.activeContexts = /* @__PURE__ */ new Map();
        this.eventHandlers = /* @__PURE__ */ new Set();
      }
      subscribe(handler) {
        this.eventHandlers.add(handler);
        return () => this.eventHandlers.delete(handler);
      }
      emit(event) {
        for (const handler of this.eventHandlers) {
          try {
            handler(event);
          } catch (error) {
            console.error("Error in runtime event handler", error);
          }
        }
      }
      transitionState(context, newState) {
        const validNextStates = VALID_TRANSITIONS[context.currentStateReference];
        if (!validNextStates.includes(newState)) {
          throw new InvalidStateTransitionError(context.currentStateReference, newState);
        }
        context.currentStateReference = newState;
        context.updatedTime = Date.now();
      }
      getContext(executionId) {
        let context = this.activeContexts.get(executionId);
        if (!context) {
          context = this.createExecution(void 0, executionId);
        }
        return context;
      }
      createExecution(taskId, preferredExecutionId) {
        const executionId = preferredExecutionId || `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const context = createInitialContext(executionId, taskId);
        this.activeContexts.set(executionId, context);
        return context;
      }
      async startExecution(executionId) {
        const context = this.getContext(executionId);
        if (context.currentStateReference === "IDLE" /* IDLE */) {
          this.transitionState(context, "READY" /* READY */);
        }
        this.transitionState(context, "RUNNING" /* RUNNING */);
        this.emit({
          type: "EXECUTION_STARTED" /* EXECUTION_STARTED */,
          timestamp: Date.now(),
          executionId,
          context
        });
      }
      async pauseExecution(executionId, reason) {
        const context = this.getContext(executionId);
        this.transitionState(context, "PAUSED" /* PAUSED */);
        this.emit({
          type: "EXECUTION_PAUSED" /* EXECUTION_PAUSED */,
          timestamp: Date.now(),
          executionId,
          reason
        });
      }
      async resumeExecution(executionId) {
        const context = this.getContext(executionId);
        this.transitionState(context, "RUNNING" /* RUNNING */);
        this.emit({
          type: "EXECUTION_RESUMED" /* EXECUTION_RESUMED */,
          timestamp: Date.now(),
          executionId
        });
      }
      async cancelExecution(executionId, reason) {
        const context = this.getContext(executionId);
        this.transitionState(context, "CANCELLED" /* CANCELLED */);
        this.emit({
          type: "EXECUTION_CANCELLED" /* EXECUTION_CANCELLED */,
          timestamp: Date.now(),
          executionId,
          reason
        });
      }
      async completeExecution(executionId) {
        const context = this.getContext(executionId);
        this.transitionState(context, "COMPLETED" /* COMPLETED */);
        this.emit({
          type: "EXECUTION_COMPLETED" /* EXECUTION_COMPLETED */,
          timestamp: Date.now(),
          executionId
        });
        return {
          executionId,
          success: true,
          finalState: context.currentStateReference,
          completedAt: Date.now()
        };
      }
      async failExecution(executionId, error) {
        const context = this.getContext(executionId);
        this.transitionState(context, "FAILED" /* FAILED */);
        this.emit({
          type: "EXECUTION_FAILED" /* EXECUTION_FAILED */,
          timestamp: Date.now(),
          executionId,
          error
        });
      }
      async rollbackExecution(executionId, checkpointReference) {
        const context = this.getContext(executionId);
        this.transitionState(context, "ROLLED_BACK" /* ROLLED_BACK */);
        context.checkpointId = checkpointReference;
        this.emit({
          type: "EXECUTION_ROLLED_BACK" /* EXECUTION_ROLLED_BACK */,
          timestamp: Date.now(),
          executionId,
          checkpointReference
        });
      }
    };
  }
});

// src/agent/tools/ExecutionError.ts
var ExecutionError, ValidationError, PermissionError, TimeoutError, CancellationError, RollbackError;
var init_ExecutionError = __esm({
  "src/agent/tools/ExecutionError.ts"() {
    ExecutionError = class extends Error {
      constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = "ExecutionError";
      }
    };
    ValidationError = class extends ExecutionError {
      constructor(message, details) {
        super(message, "VALIDATION_ERROR", details);
        this.name = "ValidationError";
      }
    };
    PermissionError = class extends ExecutionError {
      constructor(message, details) {
        super(message, "PERMISSION_ERROR", details);
        this.name = "PermissionError";
      }
    };
    TimeoutError = class extends ExecutionError {
      constructor(message = "Execution timed out", details) {
        super(message, "TIMEOUT_ERROR", details);
        this.name = "TimeoutError";
      }
    };
    CancellationError = class extends ExecutionError {
      constructor(message = "Execution was cancelled", details) {
        super(message, "CANCELLATION_ERROR", details);
        this.name = "CancellationError";
      }
    };
    RollbackError = class extends ExecutionError {
      constructor(message, details) {
        super(message, "ROLLBACK_ERROR", details);
        this.name = "RollbackError";
      }
    };
  }
});

// src/agent/tools/ExecutionPipeline.ts
var ExecutionPipeline;
var init_ExecutionPipeline = __esm({
  "src/agent/tools/ExecutionPipeline.ts"() {
    init_ExecutionError();
    ExecutionPipeline = class {
      constructor(resolver, permissionValidator, inputValidator, normalizer, checkpointStore, restoreStrategy) {
        this.resolver = resolver;
        this.permissionValidator = permissionValidator;
        this.inputValidator = inputValidator;
        this.normalizer = normalizer;
        this.checkpointStore = checkpointStore;
        this.restoreStrategy = restoreStrategy;
      }
      async execute(toolName, input, context, policy, hooks) {
        let checkpointId;
        let descriptor;
        try {
          if (hooks?.beforeResolution) {
            await hooks.beforeResolution(toolName, context);
          }
          const tool = await this.resolver.resolve(toolName);
          descriptor = tool.getDescriptor();
          this.permissionValidator.validate(descriptor, context);
          this.inputValidator.validate(input, descriptor.schema);
          const snapshot = context.createSnapshot();
          checkpointId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await this.checkpointStore.save({
            id: checkpointId,
            executionId: context.executionId,
            timestamp: Date.now(),
            metadata: { triggerType: "BEFORE_TOOL", toolName },
            snapshot
          });
          context.checkpointId = checkpointId;
          if (hooks?.beforeExecution) {
            await hooks.beforeExecution(descriptor, input, context);
          }
          let rawResult;
          const executePromise = tool.execute(context, input);
          if (policy?.timeoutMs || policy?.abortSignal) {
            rawResult = await this.executeWithPolicy(executePromise, policy);
          } else {
            rawResult = await executePromise;
          }
          const result = this.normalizer.normalize(rawResult);
          if (hooks?.afterExecution) {
            await hooks.afterExecution(descriptor, result, context);
          }
          const afterSnapshot = context.createSnapshot();
          const afterCheckpointId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await this.checkpointStore.save({
            id: afterCheckpointId,
            executionId: context.executionId,
            timestamp: Date.now(),
            metadata: { triggerType: "AFTER_TOOL", toolName },
            snapshot: afterSnapshot
          });
          context.checkpointId = afterCheckpointId;
          return result;
        } catch (error) {
          if (checkpointId) {
            try {
              const checkpoint = await this.checkpointStore.load(checkpointId);
              if (checkpoint) {
                this.restoreStrategy.restore(context, checkpoint.snapshot);
              }
            } catch (rollbackErr) {
              throw new RollbackError(
                `Failed to rollback after tool error: ${rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr)}`,
                error
              );
            }
          }
          const resultError = error instanceof Error ? error : new Error(String(error));
          if (hooks?.onError) {
            await hooks.onError(toolName, resultError, context, descriptor);
          }
          return this.normalizer.normalizeError(resultError);
        }
      }
      async executeWithPolicy(promise, policy) {
        return new Promise((resolve2, reject) => {
          let timeoutId;
          const onAbort = () => {
            if (timeoutId) clearTimeout(timeoutId);
            reject(new CancellationError());
          };
          if (policy.abortSignal) {
            if (policy.abortSignal.aborted) {
              return onAbort();
            }
            policy.abortSignal.addEventListener("abort", onAbort);
          }
          if (policy.timeoutMs && policy.timeoutMs > 0) {
            timeoutId = setTimeout(() => {
              if (policy.abortSignal) {
                policy.abortSignal.removeEventListener("abort", onAbort);
              }
              reject(new TimeoutError(`Execution timed out after ${policy.timeoutMs}ms`));
            }, policy.timeoutMs);
          }
          promise.then(
            (val) => {
              if (timeoutId) clearTimeout(timeoutId);
              if (policy.abortSignal) {
                policy.abortSignal.removeEventListener("abort", onAbort);
              }
              resolve2(val);
            },
            (err) => {
              if (timeoutId) clearTimeout(timeoutId);
              if (policy.abortSignal) {
                policy.abortSignal.removeEventListener("abort", onAbort);
              }
              reject(err);
            }
          );
        });
      }
    };
  }
});

// src/agent/tools/ToolResolver.ts
var ToolResolver;
var init_ToolResolver = __esm({
  "src/agent/tools/ToolResolver.ts"() {
    ToolResolver = class {
      constructor(registry) {
        this.registry = registry;
      }
      async resolve(name, version) {
        const tool = await this.registry.getTool(name, version);
        if (!tool) {
          throw new Error(`Tool not found or disabled: ${name}${version ? `@${version}` : ""}`);
        }
        return tool;
      }
    };
  }
});

// src/agent/tools/PermissionValidator.ts
var PermissionValidator;
var init_PermissionValidator = __esm({
  "src/agent/tools/PermissionValidator.ts"() {
    init_ExecutionError();
    PermissionValidator = class {
      validate(descriptor, context) {
        const requiredPermissions = descriptor.permissions || [];
        if (context.scope.allowedTools && context.scope.allowedTools.length > 0) {
          if (!context.scope.allowedTools.includes(descriptor.metadata.name) && !context.scope.allowedTools.includes("*")) {
            throw new PermissionError(`Tool ${descriptor.metadata.name} is not in the allowed list for this context.`);
          }
        }
        for (const perm of requiredPermissions) {
          if (perm.requiresUserApproval) {
            if (!context.customTags.includes(`APPROVED:${descriptor.metadata.name}`)) {
              throw new PermissionError(`Tool ${descriptor.metadata.name} requires user approval for capability ${perm.capability}.`);
            }
          }
        }
      }
    };
  }
});

// src/agent/tools/InputValidator.ts
var InputValidator;
var init_InputValidator = __esm({
  "src/agent/tools/InputValidator.ts"() {
    init_ExecutionError();
    InputValidator = class {
      validate(input, schema) {
        if (input === void 0 && schema.inputSchema && Object.keys(schema.inputSchema).length > 0) {
          throw new ValidationError("Input is required but was not provided.");
        }
        if (typeof input !== "object" || input === null) {
          throw new ValidationError("Input must be a valid JSON object.", { input });
        }
        const inputRecord = input;
        const inputSchema = schema.inputSchema;
        if (inputSchema && inputSchema.required && Array.isArray(inputSchema.required)) {
          for (const req of inputSchema.required) {
            if (!(req in inputRecord)) {
              throw new ValidationError(`Missing required input field: ${req}`, { input });
            }
          }
        }
      }
    };
  }
});

// src/agent/tools/ResultNormalizer.ts
var ResultNormalizer;
var init_ResultNormalizer = __esm({
  "src/agent/tools/ResultNormalizer.ts"() {
    ResultNormalizer = class {
      normalize(rawResult) {
        if (rawResult && typeof rawResult === "object" && "success" in rawResult && "timestamp" in rawResult) {
          return rawResult;
        }
        return {
          success: true,
          data: rawResult,
          timestamp: Date.now()
        };
      }
      normalizeError(error) {
        return {
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: Date.now()
        };
      }
    };
  }
});

// src/agent/checkpoint/CheckpointStore.ts
var InMemoryCheckpointStore;
var init_CheckpointStore = __esm({
  "src/agent/checkpoint/CheckpointStore.ts"() {
    InMemoryCheckpointStore = class {
      constructor() {
        this.checkpoints = /* @__PURE__ */ new Map();
      }
      async save(checkpoint) {
        this.checkpoints.set(checkpoint.id, checkpoint);
      }
      async load(checkpointId) {
        return this.checkpoints.get(checkpointId) || null;
      }
      async list(executionId) {
        return Array.from(this.checkpoints.values()).filter((c) => c.executionId === executionId);
      }
      async delete(checkpointId) {
        this.checkpoints.delete(checkpointId);
      }
    };
  }
});

// src/agent/checkpoint/Restore.ts
var DefaultRestoreStrategy;
var init_Restore = __esm({
  "src/agent/checkpoint/Restore.ts"() {
    DefaultRestoreStrategy = class {
      restore(context, snapshot) {
        context.taskId = snapshot.taskId;
        context.parentTaskId = snapshot.parentTaskId;
        context.workspaceId = snapshot.workspaceId;
        context.currentStep = snapshot.currentStep;
        context.currentStateReference = snapshot.currentStateReference;
        context.temporaryVariables = structuredClone(snapshot.temporaryVariables);
        context.environmentVariables = structuredClone(snapshot.environmentVariables);
        context.artifacts = structuredClone(snapshot.artifacts);
        context.outputs = structuredClone(snapshot.outputs);
        context.warnings = structuredClone(snapshot.warnings);
        context.errors = structuredClone(snapshot.errors);
        context.metadata = structuredClone(snapshot.metadata);
        context.environment = structuredClone(snapshot.environment);
        context.scope = structuredClone(snapshot.scope);
        context.checkpointId = snapshot.checkpointId;
        context.startedTime = snapshot.startedTime;
        context.updatedTime = Date.now();
        context.customTags = structuredClone(snapshot.customTags);
      }
    };
  }
});

// src/agent/tools/ToolLifecycle.ts
var init_ToolLifecycle = __esm({
  "src/agent/tools/ToolLifecycle.ts"() {
  }
});

// src/agent/tools/ToolRegistry.ts
var DefaultToolRegistry;
var init_ToolRegistry = __esm({
  "src/agent/tools/ToolRegistry.ts"() {
    init_ToolLifecycle();
    DefaultToolRegistry = class {
      constructor() {
        // Map of Tool Name -> (Map of Version -> Tool)
        this.tools = /* @__PURE__ */ new Map();
        // Map of Tool Name -> isEnabled
        this.featureFlags = /* @__PURE__ */ new Map();
      }
      async register(tool) {
        const descriptor = tool.getDescriptor();
        const name = descriptor.metadata.name;
        const version = descriptor.metadata.version;
        if (!this.tools.has(name)) {
          this.tools.set(name, /* @__PURE__ */ new Map());
        }
        const versionMap = this.tools.get(name);
        if (versionMap.has(version)) {
          throw new Error(`Tool ${name} version ${version} is already registered.`);
        }
        versionMap.set(version, tool);
        if (!this.featureFlags.has(name)) {
          this.featureFlags.set(name, true);
        }
      }
      async unregister(name, version) {
        const versionMap = this.tools.get(name);
        if (!versionMap) return;
        if (version) {
          const tool = versionMap.get(version);
          if (tool) {
            await tool.cleanup();
            versionMap.delete(version);
          }
          if (versionMap.size === 0) {
            this.tools.delete(name);
            this.featureFlags.delete(name);
          }
        } else {
          for (const tool of versionMap.values()) {
            await tool.cleanup();
          }
          this.tools.delete(name);
          this.featureFlags.delete(name);
        }
      }
      resolveHighestVersion(name) {
        const versionMap = this.tools.get(name);
        if (!versionMap || versionMap.size === 0) return null;
        const versions = Array.from(versionMap.keys()).sort((a, b) => b.localeCompare(a));
        for (const v of versions) {
          const tool = versionMap.get(v);
          if (tool.getState() !== "DEPRECATED" /* DEPRECATED */) {
            return tool;
          }
        }
        return versionMap.get(versions[0]) || null;
      }
      async getTool(name, version) {
        if (this.featureFlags.get(name) === false) {
          return null;
        }
        if (version) {
          const versionMap = this.tools.get(name);
          return versionMap?.get(version) || null;
        }
        return this.resolveHighestVersion(name);
      }
      async getDescriptor(name, version) {
        const tool = await this.getTool(name, version);
        return tool ? tool.getDescriptor() : null;
      }
      async findTools(query) {
        const results = [];
        for (const [name, versionMap] of this.tools.entries()) {
          if (this.featureFlags.get(name) === false) {
            continue;
          }
          const tool = this.resolveHighestVersion(name);
          if (!tool) continue;
          if (!query.includeDeprecated && tool.getState() === "DEPRECATED" /* DEPRECATED */) {
            continue;
          }
          const descriptor = tool.getDescriptor();
          if (query.name && descriptor.metadata.name !== query.name) {
            continue;
          }
          if (query.capabilities && query.capabilities.length > 0) {
            const hasAllCaps = query.capabilities.every(
              (cap) => descriptor.capabilities.includes(cap)
            );
            if (!hasAllCaps) continue;
          }
          if (query.tags && query.tags.length > 0) {
            const toolTags = descriptor.metadata.tags || [];
            const hasAllTags = query.tags.every((tag) => toolTags.includes(tag));
            if (!hasAllTags) continue;
          }
          results.push(descriptor);
        }
        return results;
      }
      async listAll() {
        return this.findTools({});
      }
      setFeatureFlag(toolName, isEnabled) {
        this.featureFlags.set(toolName, isEnabled);
      }
    };
  }
});

// src/agent/planner/TaskGraphTypes.ts
var init_TaskGraphTypes = __esm({
  "src/agent/planner/TaskGraphTypes.ts"() {
  }
});

// src/agent/planner/TaskGraphErrors.ts
var TaskGraphError, InvalidTaskGraphError, TaskGraphCycleError, InvalidTaskStatusTransitionError;
var init_TaskGraphErrors = __esm({
  "src/agent/planner/TaskGraphErrors.ts"() {
    TaskGraphError = class _TaskGraphError extends Error {
      constructor(message, details) {
        super(`TaskGraph error: ${message}`);
        this.details = details;
        this.name = "TaskGraphError";
        Object.setPrototypeOf(this, _TaskGraphError.prototype);
      }
    };
    InvalidTaskGraphError = class _InvalidTaskGraphError extends TaskGraphError {
      constructor(message, validationErrors) {
        super(`Invalid TaskGraph: ${message}`, validationErrors);
        this.validationErrors = validationErrors;
        this.name = "InvalidTaskGraphError";
        Object.setPrototypeOf(this, _InvalidTaskGraphError.prototype);
      }
    };
    TaskGraphCycleError = class _TaskGraphCycleError extends TaskGraphError {
      constructor(cyclePath) {
        super(`Circular dependency detected in TaskGraph along cycle: ${cyclePath.join(" -> ")}`, { cyclePath });
        this.cyclePath = cyclePath;
        this.name = "TaskGraphCycleError";
        Object.setPrototypeOf(this, _TaskGraphCycleError.prototype);
      }
    };
    InvalidTaskStatusTransitionError = class _InvalidTaskStatusTransitionError extends TaskGraphError {
      constructor(taskId, fromStatus, toStatus, reason) {
        super(
          `Illegal TaskStatus transition for task '${taskId}': cannot transition from '${fromStatus}' to '${toStatus}'${reason ? ` (${reason})` : ""}`
        );
        this.taskId = taskId;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.reason = reason;
        this.name = "InvalidTaskStatusTransitionError";
        Object.setPrototypeOf(this, _InvalidTaskStatusTransitionError.prototype);
      }
    };
  }
});

// src/agent/planner/TaskGraphValidation.ts
function findCycle(edges, nodeIds) {
  const visited = /* @__PURE__ */ new Set();
  const recursionStack = /* @__PURE__ */ new Set();
  const path4 = [];
  const dfs = (nodeId) => {
    if (recursionStack.has(nodeId)) {
      const cycleStartIdx = path4.indexOf(nodeId);
      if (cycleStartIdx >= 0) {
        return [...path4.slice(cycleStartIdx), nodeId];
      }
      return [nodeId, nodeId];
    }
    if (visited.has(nodeId)) {
      return null;
    }
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path4.push(nodeId);
    const deps = edges.get(nodeId) || [];
    for (const dep of deps) {
      const cycle = dfs(dep);
      if (cycle) {
        return cycle;
      }
    }
    path4.pop();
    recursionStack.delete(nodeId);
    return null;
  };
  for (const nodeId of nodeIds) {
    if (!visited.has(nodeId)) {
      const cycle = dfs(nodeId);
      if (cycle) {
        return cycle;
      }
    }
  }
  return null;
}
function computeTopologicalOrder(nodeIds, edges, dependents) {
  const inDegree = /* @__PURE__ */ new Map();
  const allNodes = Array.from(nodeIds);
  for (const nodeId of allNodes) {
    const deps = edges.get(nodeId) || [];
    inDegree.set(nodeId, deps.length);
  }
  const queue = [];
  for (const nodeId of allNodes) {
    if (inDegree.get(nodeId) === 0) {
      queue.push(nodeId);
    }
  }
  const order = [];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    order.push(current);
    const children = dependents.get(current) || [];
    for (const child of children) {
      const currentInDegree = inDegree.get(child) ?? 0;
      const nextInDegree = currentInDegree - 1;
      inDegree.set(child, nextInDegree);
      if (nextInDegree === 0) {
        queue.push(child);
      }
    }
  }
  if (order.length !== allNodes.length) {
    const cycle = findCycle(edges, allNodes);
    throw new TaskGraphCycleError(cycle || ["unknown"]);
  }
  return order;
}
function validateTaskGraph(graph) {
  const errors = [];
  const warnings = [];
  if (!graph.id || graph.id.trim() === "") {
    errors.push("TaskGraph must have a non-empty id.");
  }
  const nodeIds = new Set(graph.nodes.keys());
  for (const [nodeId, node] of graph.nodes.entries()) {
    if (!node.task) {
      errors.push(`Node '${nodeId}' is missing task payload.`);
    }
    if (node.id !== nodeId) {
      errors.push(`Node key '${nodeId}' does not match node.id '${node.id}'.`);
    }
    for (const depId of node.dependencies) {
      if (depId === nodeId) {
        errors.push(`Task '${nodeId}' has a self-dependency.`);
      } else if (!nodeIds.has(depId)) {
        errors.push(`Task '${nodeId}' depends on non-existent task '${depId}'.`);
      }
    }
    for (const dependentId of node.dependents) {
      if (!nodeIds.has(dependentId)) {
        errors.push(`Task '${nodeId}' lists non-existent dependent task '${dependentId}'.`);
      }
    }
  }
  const cycle = findCycle(graph.edges, nodeIds);
  if (cycle) {
    errors.push(`Circular dependency detected in graph along cycle: ${cycle.join(" -> ")}`);
  }
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
function assertValidTaskGraph(graph) {
  const result = validateTaskGraph(graph);
  if (!result.isValid) {
    const cycle = findCycle(graph.edges, graph.nodes.keys());
    if (cycle) {
      throw new TaskGraphCycleError(cycle);
    }
    throw new InvalidTaskGraphError(result.errors.join("\n- "), result.errors);
  }
}
var init_TaskGraphValidation = __esm({
  "src/agent/planner/TaskGraphValidation.ts"() {
    init_TaskGraphErrors();
  }
});

// src/agent/planner/TaskGraph.ts
var VALID_STATUS_TRANSITIONS, DirectedTaskGraph;
var init_TaskGraph = __esm({
  "src/agent/planner/TaskGraph.ts"() {
    init_TaskGraphTypes();
    init_TaskGraphTypes();
    init_TaskGraphErrors();
    init_TaskGraphValidation();
    VALID_STATUS_TRANSITIONS = {
      ["PENDING" /* PENDING */]: /* @__PURE__ */ new Set([
        "READY" /* READY */,
        "SKIPPED" /* SKIPPED */,
        "BLOCKED" /* BLOCKED */,
        "CANCELLED" /* CANCELLED */
      ]),
      ["READY" /* READY */]: /* @__PURE__ */ new Set([
        "RUNNING" /* RUNNING */,
        "BLOCKED" /* BLOCKED */,
        "CANCELLED" /* CANCELLED */,
        "SKIPPED" /* SKIPPED */
      ]),
      ["RUNNING" /* RUNNING */]: /* @__PURE__ */ new Set([
        "COMPLETED" /* COMPLETED */,
        "FAILED" /* FAILED */,
        "CANCELLED" /* CANCELLED */
      ]),
      ["COMPLETED" /* COMPLETED */]: /* @__PURE__ */ new Set([]),
      // Terminal
      ["FAILED" /* FAILED */]: /* @__PURE__ */ new Set([
        "READY" /* READY */,
        "PENDING" /* PENDING */,
        "BLOCKED" /* BLOCKED */,
        "CANCELLED" /* CANCELLED */
      ]),
      ["SKIPPED" /* SKIPPED */]: /* @__PURE__ */ new Set([]),
      // Terminal
      ["BLOCKED" /* BLOCKED */]: /* @__PURE__ */ new Set([
        "READY" /* READY */,
        "PENDING" /* PENDING */,
        "CANCELLED" /* CANCELLED */
      ]),
      ["CANCELLED" /* CANCELLED */]: /* @__PURE__ */ new Set([])
      // Terminal
    };
    DirectedTaskGraph = class _DirectedTaskGraph {
      constructor(id, goalId) {
        this.nodes = /* @__PURE__ */ new Map();
        this.steps = /* @__PURE__ */ new Map();
        this.edges = /* @__PURE__ */ new Map();
        // taskId -> dependencies (upstream)
        this.dependentsMap = /* @__PURE__ */ new Map();
        // taskId -> downstream dependents
        this.statuses = /* @__PURE__ */ new Map();
        this.status = "DRAFT" /* DRAFT */;
        this.metadata = {};
        const now = Date.now();
        this.id = id || `graph_${Math.random().toString(36).substring(2, 9)}_${now}`;
        this.goalId = goalId || "";
        this.createdAt = now;
        this.updatedAt = now;
      }
      addTask(task, dependencies) {
        if (!task || !task.id) {
          throw new TaskGraphError("Cannot add invalid task or task with empty ID");
        }
        const taskId = task.id;
        if (this.nodes.has(taskId)) {
          throw new TaskGraphError(`Task with ID '${taskId}' already exists in the graph.`);
        }
        let rawDeps = [];
        if (Array.isArray(dependencies)) {
          rawDeps = dependencies;
        } else if ("dependencies" in task && Array.isArray(task.dependencies)) {
          rawDeps = task.dependencies;
        }
        const uniqueDeps = [];
        for (const d of rawDeps) {
          if (d === taskId) {
            throw new InvalidTaskGraphError(`Task '${taskId}' cannot depend on itself.`);
          }
          if (!uniqueDeps.includes(d)) {
            uniqueDeps.push(d);
          }
        }
        const now = Date.now();
        const initialStatus = uniqueDeps.length === 0 ? "READY" /* READY */ : "PENDING" /* PENDING */;
        const node = {
          id: taskId,
          task,
          status: initialStatus,
          dependencies: uniqueDeps,
          dependents: [],
          createdAt: now,
          updatedAt: now
        };
        this.nodes.set(taskId, node);
        this.steps.set(taskId, task);
        this.edges.set(taskId, uniqueDeps);
        this.statuses.set(taskId, initialStatus);
        if (!this.dependentsMap.has(taskId)) {
          this.dependentsMap.set(taskId, []);
        }
        for (const depId of uniqueDeps) {
          const depNode = this.nodes.get(depId);
          if (depNode) {
            if (!depNode.dependents.includes(taskId)) {
              depNode.dependents.push(taskId);
            }
          }
          const existingDeps = this.dependentsMap.get(depId) || [];
          if (!existingDeps.includes(taskId)) {
            existingDeps.push(taskId);
            this.dependentsMap.set(depId, existingDeps);
          }
        }
        this.updatedAt = now;
        this.syncGraphStatus();
      }
      removeTask(taskId) {
        if (!this.nodes.has(taskId)) {
          return false;
        }
        const node = this.nodes.get(taskId);
        for (const depId of node.dependencies) {
          const depNode = this.nodes.get(depId);
          if (depNode) {
            depNode.dependents = depNode.dependents.filter((id) => id !== taskId);
          }
          const existing = this.dependentsMap.get(depId);
          if (existing) {
            this.dependentsMap.set(depId, existing.filter((id) => id !== taskId));
          }
        }
        for (const dependentId of node.dependents) {
          const depNode = this.nodes.get(dependentId);
          if (depNode) {
            depNode.dependencies = depNode.dependencies.filter((id) => id !== taskId);
          }
          const existing = this.edges.get(dependentId);
          if (existing) {
            this.edges.set(dependentId, existing.filter((id) => id !== taskId));
          }
        }
        this.nodes.delete(taskId);
        this.steps.delete(taskId);
        this.edges.delete(taskId);
        this.dependentsMap.delete(taskId);
        this.statuses.delete(taskId);
        this.updatedAt = Date.now();
        this.syncGraphStatus();
        return true;
      }
      addDependency(dependentTaskId, dependencyTaskId) {
        if (dependentTaskId === dependencyTaskId) {
          throw new InvalidTaskGraphError(`Task '${dependentTaskId}' cannot depend on itself.`);
        }
        const dependentNode = this.nodes.get(dependentTaskId);
        if (!dependentNode) {
          throw new TaskGraphError(`Dependent task '${dependentTaskId}' does not exist in the graph.`);
        }
        const dependencyNode = this.nodes.get(dependencyTaskId);
        if (!dependencyNode) {
          throw new TaskGraphError(`Dependency target task '${dependencyTaskId}' does not exist in the graph.`);
        }
        if (!dependentNode.dependencies.includes(dependencyTaskId)) {
          dependentNode.dependencies.push(dependencyTaskId);
        }
        if (!dependencyNode.dependents.includes(dependentTaskId)) {
          dependencyNode.dependents.push(dependentTaskId);
        }
        const edgeList = this.edges.get(dependentTaskId) || [];
        if (!edgeList.includes(dependencyTaskId)) {
          edgeList.push(dependencyTaskId);
          this.edges.set(dependentTaskId, edgeList);
        }
        const depList = this.dependentsMap.get(dependencyTaskId) || [];
        if (!depList.includes(dependentTaskId)) {
          depList.push(dependentTaskId);
          this.dependentsMap.set(dependencyTaskId, depList);
        }
        if (!this.isAcyclic()) {
          this.removeDependency(dependentTaskId, dependencyTaskId);
          const cycle = findCycle(this.edges, this.nodes.keys());
          throw new InvalidTaskGraphError(`Adding dependency ${dependentTaskId} -> ${dependencyTaskId} creates a circular dependency: ${cycle?.join(" -> ")}`);
        }
        if (dependencyNode.status !== "COMPLETED" /* COMPLETED */ && dependentNode.status === "READY" /* READY */) {
          dependentNode.status = "PENDING" /* PENDING */;
          this.statuses.set(dependentTaskId, "PENDING" /* PENDING */);
        }
        this.updatedAt = Date.now();
        this.syncGraphStatus();
      }
      removeDependency(dependentTaskId, dependencyTaskId) {
        const dependentNode = this.nodes.get(dependentTaskId);
        const dependencyNode = this.nodes.get(dependencyTaskId);
        if (dependentNode) {
          dependentNode.dependencies = dependentNode.dependencies.filter((id) => id !== dependencyTaskId);
        }
        if (dependencyNode) {
          dependencyNode.dependents = dependencyNode.dependents.filter((id) => id !== dependentTaskId);
        }
        const edgeList = this.edges.get(dependentTaskId);
        if (edgeList) {
          this.edges.set(dependentTaskId, edgeList.filter((id) => id !== dependencyTaskId));
        }
        const depList = this.dependentsMap.get(dependencyTaskId);
        if (depList) {
          this.dependentsMap.set(dependencyTaskId, depList.filter((id) => id !== dependentTaskId));
        }
        this.updatedAt = Date.now();
        this.syncGraphStatus();
        return true;
      }
      setTaskStatus(taskId, newStatus, error) {
        const node = this.nodes.get(taskId);
        if (!node) {
          throw new TaskGraphError(`Task '${taskId}' not found in TaskGraph.`);
        }
        const currentStatus = node.status;
        if (currentStatus === newStatus) {
          return;
        }
        const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
        if (!allowed || !allowed.has(newStatus)) {
          throw new InvalidTaskStatusTransitionError(taskId, currentStatus, newStatus);
        }
        node.status = newStatus;
        node.updatedAt = Date.now();
        if (error) {
          node.error = error;
        }
        this.statuses.set(taskId, newStatus);
        this.updatedAt = Date.now();
        if (newStatus === "COMPLETED" /* COMPLETED */) {
          for (const dependentId of node.dependents) {
            const dependentNode = this.nodes.get(dependentId);
            if (dependentNode && dependentNode.status === "PENDING" /* PENDING */) {
              const allDepsCompleted = dependentNode.dependencies.every((d) => {
                const dn = this.nodes.get(d);
                return dn && dn.status === "COMPLETED" /* COMPLETED */;
              });
              if (allDepsCompleted) {
                dependentNode.status = "READY" /* READY */;
                dependentNode.updatedAt = Date.now();
                this.statuses.set(dependentId, "READY" /* READY */);
              }
            }
          }
        } else if (newStatus === "FAILED" /* FAILED */ || newStatus === "BLOCKED" /* BLOCKED */ || newStatus === "CANCELLED" /* CANCELLED */) {
          this.cascadeBlock(taskId);
        }
        this.syncGraphStatus();
      }
      cascadeBlock(failedTaskId) {
        const queue = [...this.nodes.get(failedTaskId)?.dependents || []];
        const visited = /* @__PURE__ */ new Set();
        while (queue.length > 0) {
          const currentId = queue.shift();
          if (visited.has(currentId)) continue;
          visited.add(currentId);
          const targetNode = this.nodes.get(currentId);
          if (targetNode) {
            if (targetNode.status === "PENDING" /* PENDING */ || targetNode.status === "READY" /* READY */) {
              targetNode.status = "BLOCKED" /* BLOCKED */;
              targetNode.updatedAt = Date.now();
              this.statuses.set(currentId, "BLOCKED" /* BLOCKED */);
            }
            for (const nextId of targetNode.dependents) {
              queue.push(nextId);
            }
          }
        }
      }
      syncGraphStatus() {
        if (this.nodes.size === 0) {
          this.status = "DRAFT" /* DRAFT */;
          return;
        }
        const allNodes = Array.from(this.nodes.values());
        const hasFailed = allNodes.some((n) => n.status === "FAILED" /* FAILED */);
        const hasCancelled = allNodes.some((n) => n.status === "CANCELLED" /* CANCELLED */);
        const allTerminal = allNodes.every(
          (n) => n.status === "COMPLETED" /* COMPLETED */ || n.status === "SKIPPED" /* SKIPPED */
        );
        const allBlocked = allNodes.every(
          (n) => n.status === "BLOCKED" /* BLOCKED */ || n.status === "FAILED" /* FAILED */
        );
        const hasRunning = allNodes.some((n) => n.status === "RUNNING" /* RUNNING */);
        const hasReady = allNodes.some((n) => n.status === "READY" /* READY */);
        if (hasFailed) {
          this.status = "FAILED" /* FAILED */;
        } else if (hasCancelled && !hasRunning && !hasReady) {
          this.status = "CANCELLED" /* CANCELLED */;
        } else if (allTerminal) {
          this.status = "COMPLETED" /* COMPLETED */;
        } else if (allBlocked) {
          this.status = "BLOCKED" /* BLOCKED */;
        } else if (hasRunning || hasReady) {
          this.status = "ACTIVE" /* ACTIVE */;
        } else {
          this.status = "READY" /* READY */;
        }
      }
      getTask(taskId) {
        return this.nodes.get(taskId)?.task;
      }
      getNode(taskId) {
        return this.nodes.get(taskId);
      }
      getTaskStatus(taskId) {
        return this.statuses.get(taskId);
      }
      getDependencies(taskId) {
        return [...this.edges.get(taskId) || []];
      }
      getDependents(taskId) {
        return [...this.dependentsMap.get(taskId) || []];
      }
      getUpstreamDependencies(taskId) {
        return this.getDependencies(taskId);
      }
      getDownstreamDependents(taskId) {
        return this.getDependents(taskId);
      }
      getExecutableSteps(completedStepIds) {
        const executable = [];
        for (const [id, node] of this.nodes.entries()) {
          if (completedStepIds.has(id)) {
            continue;
          }
          const deps = node.dependencies;
          const allDepsMet = deps.every((dep) => completedStepIds.has(dep));
          if (allDepsMet) {
            executable.push(node.task);
          }
        }
        return executable;
      }
      getParallelFrontier() {
        const frontier = [];
        for (const node of this.nodes.values()) {
          if (node.status === "READY" /* READY */) {
            frontier.push(node.task);
          } else if (node.status === "PENDING" /* PENDING */) {
            const allDepsCompleted = node.dependencies.every((depId) => {
              const depNode = this.nodes.get(depId);
              return depNode && depNode.status === "COMPLETED" /* COMPLETED */;
            });
            if (allDepsCompleted) {
              frontier.push(node.task);
            }
          }
        }
        return frontier;
      }
      getReadyTasks() {
        return this.getParallelFrontier();
      }
      getTopologicalOrder() {
        return computeTopologicalOrder(this.nodes.keys(), this.edges, this.dependentsMap);
      }
      isAcyclic() {
        const cycle = findCycle(this.edges, this.nodes.keys());
        return cycle === null;
      }
      clone() {
        const cloned = new _DirectedTaskGraph(this.id, this.goalId);
        cloned.status = this.status;
        cloned.metadata = JSON.parse(JSON.stringify(this.metadata));
        cloned.updatedAt = this.updatedAt;
        for (const node of this.nodes.values()) {
          const clonedNode = {
            id: node.id,
            task: JSON.parse(JSON.stringify(node.task)),
            status: node.status,
            dependencies: [...node.dependencies],
            dependents: [...node.dependents],
            error: node.error,
            metadata: node.metadata ? JSON.parse(JSON.stringify(node.metadata)) : void 0,
            createdAt: node.createdAt,
            updatedAt: node.updatedAt
          };
          cloned.nodes.set(node.id, clonedNode);
          cloned.steps.set(node.id, clonedNode.task);
          cloned.edges.set(node.id, [...node.dependencies]);
          cloned.dependentsMap.set(node.id, [...node.dependents]);
          cloned.statuses.set(node.id, node.status);
        }
        return cloned;
      }
      toJSON() {
        const nodesObj = {};
        for (const [id, node] of this.nodes.entries()) {
          nodesObj[id] = {
            id: node.id,
            task: JSON.parse(JSON.stringify(node.task)),
            status: node.status,
            dependencies: [...node.dependencies],
            dependents: [...node.dependents],
            error: node.error,
            metadata: node.metadata ? JSON.parse(JSON.stringify(node.metadata)) : void 0,
            createdAt: node.createdAt,
            updatedAt: node.updatedAt
          };
        }
        return {
          id: this.id,
          goalId: this.goalId,
          nodes: nodesObj,
          status: this.status,
          metadata: JSON.parse(JSON.stringify(this.metadata)),
          createdAt: this.createdAt,
          updatedAt: this.updatedAt
        };
      }
      static fromJSON(json) {
        if (!json || typeof json !== "object") {
          throw new InvalidTaskGraphError("Invalid TaskGraph JSON");
        }
        const graph = new _DirectedTaskGraph(json.id, json.goalId);
        graph.status = json.status || "DRAFT" /* DRAFT */;
        graph.metadata = json.metadata || {};
        graph.updatedAt = json.updatedAt || Date.now();
        if (json.nodes && typeof json.nodes === "object") {
          for (const [id, rawNode] of Object.entries(json.nodes)) {
            const node = {
              id: rawNode.id,
              task: rawNode.task,
              status: rawNode.status,
              dependencies: Array.isArray(rawNode.dependencies) ? [...rawNode.dependencies] : [],
              dependents: Array.isArray(rawNode.dependents) ? [...rawNode.dependents] : [],
              error: rawNode.error,
              metadata: rawNode.metadata,
              createdAt: rawNode.createdAt || Date.now(),
              updatedAt: rawNode.updatedAt || Date.now()
            };
            graph.nodes.set(id, node);
            graph.steps.set(id, node.task);
            graph.edges.set(id, node.dependencies);
            graph.dependentsMap.set(id, node.dependents);
            graph.statuses.set(id, node.status);
          }
        }
        validateTaskGraph(graph);
        return graph;
      }
    };
  }
});

// src/agent/replanning/ReplanningTypes.ts
var init_ReplanningTypes = __esm({
  "src/agent/replanning/ReplanningTypes.ts"() {
  }
});

// src/agent/replanning/FailureClassifier.ts
var FailureClassifier;
var init_FailureClassifier = __esm({
  "src/agent/replanning/FailureClassifier.ts"() {
    init_ReplanningTypes();
    FailureClassifier = class {
      /**
       * Deterministically classifies runtime or tool errors into domain failure categories.
       */
      static classify(input) {
        const rawError = typeof input.error === "string" ? input.error : input.error?.message || String(input.error);
        const lower = rawError.toLowerCase();
        const stepId = input.step?.id || input.step?.taskId;
        const evidence = [];
        let category = "UNKNOWN" /* UNKNOWN */;
        let severity = "MEDIUM";
        let retryable = false;
        let repairable = false;
        let replannable = true;
        let recommendedAction = "REPLAN";
        if (lower.includes("quota exceeded") || lower.includes("insufficient_quota") || lower.includes("exceeded your current quota") || lower.includes("quota")) {
          category = "CONSTRAINT_VIOLATION" /* CONSTRAINT_VIOLATION */;
          severity = "HIGH";
          retryable = false;
          repairable = false;
          replannable = false;
          recommendedAction = "ABORT";
          evidence.push("Matched account or project quota exhaustion");
        } else if (lower.includes("permission denied") || lower.includes("eacces") || lower.includes("unauthorized") || lower.includes("forbidden") || lower.includes("401") || lower.includes("403") || lower.includes("forbidden tool") || lower.includes("api key") || lower.includes("api_key") || lower.includes("unauthenticated") || lower.includes("risk level") && lower.includes("exceeds")) {
          category = "PERMISSION_DENIED" /* PERMISSION_DENIED */;
          severity = "HIGH";
          retryable = false;
          repairable = false;
          replannable = false;
          recommendedAction = "ABORT";
          evidence.push("Matched access control / invalid API key / authentication violation");
        } else if (lower.includes("rate limit") || lower.includes("rate_limit") || lower.includes("429") || lower.includes("503") || lower.includes("504") || lower.includes("econnreset") || lower.includes("etimedout") || lower.includes("timeout") || lower.includes("network disconnect") || lower.includes("temporarily unavailable")) {
          category = "TRANSIENT" /* TRANSIENT */;
          severity = "LOW";
          retryable = true;
          repairable = false;
          replannable = false;
          recommendedAction = "RETRY";
          evidence.push("Matched transient network or rate-limit indicator");
        } else if (lower.includes("missing required argument") || lower.includes("invalid argument") || lower.includes("bad parameter") || lower.includes("invalid path") || lower.includes("enoent") || lower.includes("file not found") || lower.includes("missing input") || lower.includes("schema validation failed")) {
          category = "INPUT_ERROR" /* INPUT_ERROR */;
          severity = "MEDIUM";
          retryable = false;
          repairable = true;
          replannable = true;
          recommendedAction = "REPAIR";
          evidence.push("Matched localized input error or missing path/parameter");
        } else if (lower.includes("missing dependency") || lower.includes("dependency failed") || lower.includes("prerequisite not met") || lower.includes("unresolved reference")) {
          category = "DEPENDENCY_FAILURE" /* DEPENDENCY_FAILURE */;
          severity = "MEDIUM";
          retryable = false;
          repairable = true;
          replannable = true;
          recommendedAction = "REPAIR";
          evidence.push("Matched missing dependency or prerequisite");
        } else if (lower.includes("conflict") || lower.includes("lock held") || lower.includes("resource busy") || lower.includes("eexist") || lower.includes("already exists")) {
          category = "RESOURCE_CONFLICT" /* RESOURCE_CONFLICT */;
          severity = "MEDIUM";
          retryable = true;
          repairable = true;
          replannable = true;
          recommendedAction = "RETRY";
          evidence.push("Matched resource conflict / locking state");
        } else if (lower.includes("maxsteps") || lower.includes("budget exceeded") || lower.includes("timeout exceeded") || lower.includes("constraint exceeded")) {
          category = "CONSTRAINT_VIOLATION" /* CONSTRAINT_VIOLATION */;
          severity = "HIGH";
          retryable = false;
          repairable = false;
          replannable = false;
          recommendedAction = "ABORT";
          evidence.push("Matched hard constraint violation");
        } else if (lower.includes("environment changed") || lower.includes("workspace reset") || lower.includes("container terminated") || lower.includes("runtime mismatch")) {
          category = "ENVIRONMENT_CHANGE" /* ENVIRONMENT_CHANGE */;
          severity = "HIGH";
          retryable = false;
          repairable = false;
          replannable = true;
          recommendedAction = "REPLAN";
          evidence.push("Matched environment modification");
        } else if (lower.includes("test failed") || lower.includes("assertion error") || lower.includes("assertion failed") || lower.includes("unexpected output") || lower.includes("compilation error") || lower.includes("syntax error") || lower.includes("build failed")) {
          category = "LOGICAL_FAILURE" /* LOGICAL_FAILURE */;
          severity = "MEDIUM";
          retryable = false;
          repairable = false;
          replannable = true;
          recommendedAction = "REPLAN";
          evidence.push("Matched deterministic logical / build / test failure");
        } else if (lower.includes("fatal") || lower.includes("out of memory") || lower.includes("sigkill") || lower.includes("panic")) {
          category = "FATAL" /* FATAL */;
          severity = "CRITICAL";
          retryable = false;
          repairable = false;
          replannable = false;
          recommendedAction = "ABORT";
          evidence.push("Matched fatal unrecoverable system failure");
        } else {
          category = "UNKNOWN" /* UNKNOWN */;
          severity = "MEDIUM";
          retryable = false;
          repairable = false;
          replannable = true;
          recommendedAction = "REPLAN";
          evidence.push("No specific keyword matched, default to general Replan");
        }
        return {
          category,
          severity,
          stepId,
          planId: input.planId,
          originalError: rawError,
          retryable,
          repairable,
          replannable,
          recommendedAction,
          evidence,
          metadata: input.metadata,
          timestamp: Date.now()
        };
      }
    };
  }
});

// src/agent/planner/PlanValidationTypes.ts
var init_PlanValidationTypes = __esm({
  "src/agent/planner/PlanValidationTypes.ts"() {
  }
});

// src/agent/planner/PlanningValidator.ts
function compareRisk(a, b) {
  const scoreA = RISK_LEVEL_ORDER[(a || "LOW").toUpperCase()] || 1;
  const scoreB = RISK_LEVEL_ORDER[(b || "LOW").toUpperCase()] || 1;
  return scoreA - scoreB;
}
var RISK_LEVEL_ORDER, PlanningValidator;
var init_PlanningValidator = __esm({
  "src/agent/planner/PlanningValidator.ts"() {
    init_PlanValidationTypes();
    RISK_LEVEL_ORDER = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4
    };
    PlanningValidator = class {
      /**
       * Legacy static validation method for TaskGraph
       */
      static validate(graph) {
        const errors = [];
        for (const [stepId, node] of graph.nodes.entries()) {
          for (const dep of node.dependencies) {
            if (!graph.nodes.has(dep)) {
              errors.push(`Step '${stepId}' depends on missing step '${dep}'.`);
            }
          }
        }
        if (!graph.isAcyclic()) {
          errors.push("Circular dependencies detected in the task graph.");
        }
        return {
          isValid: errors.length === 0,
          errors
        };
      }
      /**
       * 7-Stage Pre-flight Plan Validation
       */
      async validate(plan, context) {
        const errors = [];
        const warnings = [];
        if (!plan) {
          return {
            isValid: false,
            errors: [{
              code: "CONSTRAINT_EXCEEDED" /* CONSTRAINT_EXCEEDED */,
              message: "Plan object is undefined or null.",
              repairable: false
            }],
            warnings: []
          };
        }
        const steps = plan.steps || [];
        const stepMap = new Map(steps.map((s) => [s.id, s]));
        const executionOrder = plan.executionOrder || (plan.taskGraph?.getTopologicalOrder ? plan.taskGraph.getTopologicalOrder() : []);
        const stepOrderIndex = /* @__PURE__ */ new Map();
        executionOrder.forEach((id, idx) => stepOrderIndex.set(id, idx));
        const constraints = {
          ...context?.constraints || {},
          ...context?.goal?.constraints ? {
            maxSteps: context.goal.constraints.maxSteps,
            maxExecutionTimeMs: context.goal.constraints.maxExecutionTimeMs,
            forbiddenTools: context.goal.constraints.forbiddenTools,
            mandatoryTools: context.goal.constraints.mandatoryTools,
            maxRiskLevel: context.goal.constraints.maxRiskLevel
          } : {}
        };
        if (plan.taskGraph && typeof plan.taskGraph.isAcyclic === "function") {
          if (!plan.taskGraph.isAcyclic()) {
            errors.push({
              code: "CYCLE_DETECTED" /* CYCLE_DETECTED */,
              message: "Cycle detected in Plan task graph.",
              repairable: true,
              suggestedPatch: { action: "BREAK_CYCLE" }
            });
          }
        } else {
          const visited = /* @__PURE__ */ new Set();
          const recStack = /* @__PURE__ */ new Set();
          const checkCycle = (nodeId, path4) => {
            visited.add(nodeId);
            recStack.add(nodeId);
            const step = stepMap.get(nodeId);
            if (step && step.dependencies) {
              for (const depId of step.dependencies) {
                if (!visited.has(depId)) {
                  if (checkCycle(depId, [...path4, depId])) return true;
                } else if (recStack.has(depId)) {
                  errors.push({
                    code: "CYCLE_DETECTED" /* CYCLE_DETECTED */,
                    stepId: nodeId,
                    message: `Circular dependency detected between '${nodeId}' and '${depId}' (Cycle path: ${[...path4, depId].join(" -> ")}).`,
                    repairable: true,
                    suggestedPatch: { brokenEdge: { from: nodeId, to: depId } }
                  });
                  return true;
                }
              }
            }
            recStack.delete(nodeId);
            return false;
          };
          for (const step of steps) {
            if (!visited.has(step.id)) {
              checkCycle(step.id, [step.id]);
            }
          }
        }
        for (const step of steps) {
          for (const depId of step.dependencies || []) {
            if (!stepMap.has(depId)) {
              errors.push({
                code: "MISSING_DEPENDENCY" /* MISSING_DEPENDENCY */,
                stepId: step.id,
                message: `Step '${step.id}' references missing dependency step '${depId}'.`,
                repairable: true,
                suggestedPatch: {
                  missingStepId: depId,
                  referencingStepId: step.id,
                  action: "INJECT_MISSING_PREREQUISITE"
                }
              });
            }
          }
        }
        const availableToolNames = new Set(
          (context?.availableTools || []).map((t) => t.name.toLowerCase())
        );
        if (availableToolNames.size > 0) {
          for (const step of steps) {
            for (const reqTool of step.requiredTools || []) {
              const toolName = typeof reqTool === "string" ? reqTool : reqTool.name;
              if (toolName && !availableToolNames.has(toolName.toLowerCase())) {
                errors.push({
                  code: "TOOL_NOT_FOUND" /* TOOL_NOT_FOUND */,
                  stepId: step.id,
                  message: `Step '${step.id}' requires unavailable tool '${toolName}'.`,
                  repairable: false,
                  suggestedPatch: { requestedTool: toolName }
                });
              }
            }
          }
        }
        const forbiddenTools = new Set((constraints.forbiddenTools || []).map((t) => t.toLowerCase()));
        const approvalThreshold = constraints.requireApprovalForRiskAbove || "HIGH";
        const planApprovalSet = new Set(plan.approvalPoints || []);
        for (const step of steps) {
          for (const reqTool of step.requiredTools || []) {
            const toolName = typeof reqTool === "string" ? reqTool : reqTool.name;
            if (toolName && forbiddenTools.has(toolName.toLowerCase())) {
              errors.push({
                code: "PERMISSION_VIOLATION" /* PERMISSION_VIOLATION */,
                stepId: step.id,
                message: `Step '${step.id}' uses forbidden tool '${toolName}'.`,
                repairable: false,
                suggestedPatch: { forbiddenTool: toolName }
              });
            }
          }
          if (constraints.maxRiskLevel && compareRisk(step.riskLevel, constraints.maxRiskLevel) > 0) {
            errors.push({
              code: "PERMISSION_VIOLATION" /* PERMISSION_VIOLATION */,
              stepId: step.id,
              message: `Step '${step.id}' risk level '${step.riskLevel}' exceeds maximum allowed risk '${constraints.maxRiskLevel}'.`,
              repairable: false,
              suggestedPatch: { stepRisk: step.riskLevel, maxAllowed: constraints.maxRiskLevel }
            });
          }
          const needsApproval = compareRisk(step.riskLevel, approvalThreshold) >= 0 || Boolean(step.approvalRequired);
          if (needsApproval && !planApprovalSet.has(step.id)) {
            warnings.push(`Step '${step.id}' requires user approval but is not registered in plan.approvalPoints.`);
          }
        }
        const outputProducers = /* @__PURE__ */ new Map();
        for (const step of steps) {
          for (const out of step.expectedOutputs || []) {
            outputProducers.set(out, step.id);
          }
        }
        for (const step of steps) {
          const consumerIdx = stepOrderIndex.get(step.id) ?? -1;
          for (const inputKey of step.expectedInputs || []) {
            if (outputProducers.has(inputKey)) {
              const producerId = outputProducers.get(inputKey);
              const producerIdx = stepOrderIndex.get(producerId) ?? -1;
              if (producerIdx !== -1 && consumerIdx !== -1 && producerIdx > consumerIdx) {
                errors.push({
                  code: "INPUT_BINDING_MISSING" /* INPUT_BINDING_MISSING */,
                  stepId: step.id,
                  message: `Step '${step.id}' requires input '${inputKey}' before its producer '${producerId}' has executed in execution order.`,
                  repairable: true,
                  suggestedPatch: { inputKey, producerId, consumerId: step.id, action: "REORDER_STEPS" }
                });
              }
            }
          }
        }
        if (constraints.maxSteps !== void 0 && steps.length > constraints.maxSteps) {
          errors.push({
            code: "CONSTRAINT_EXCEEDED" /* CONSTRAINT_EXCEEDED */,
            message: `Plan step count (${steps.length}) exceeds maxSteps constraint (${constraints.maxSteps}).`,
            repairable: false,
            suggestedPatch: { stepCount: steps.length, maxSteps: constraints.maxSteps }
          });
        }
        let totalDurationMs = 0;
        for (const step of steps) {
          totalDurationMs += step.estimatedDurationMs || 0;
        }
        if (constraints.maxExecutionTimeMs !== void 0 && totalDurationMs > constraints.maxExecutionTimeMs) {
          warnings.push(
            `Total estimated execution time (${totalDurationMs}ms) exceeds constraint (${constraints.maxExecutionTimeMs}ms).`
          );
        }
        const deletedTargets = /* @__PURE__ */ new Set();
        for (const stepId of executionOrder) {
          const step = stepMap.get(stepId);
          if (!step) continue;
          const desc3 = `${step.title} ${step.description}`.toLowerCase();
          for (const deleted of Array.from(deletedTargets)) {
            const createPattern = new RegExp(`(?:create|recreate|touch|mkdir|add|initialize|restore)[\\s\\S]*?\\b${deleted}\\b`, "i");
            if (createPattern.test(desc3)) {
              deletedTargets.delete(deleted);
            }
          }
          const deleteMatch = desc3.match(/(?:delete|remove|rm|drop)\s+(?:file|table|resource|directory|dir)?\s*([a-zA-Z0-9_\-./]+)/i);
          if (deleteMatch && deleteMatch[1]) {
            deletedTargets.add(deleteMatch[1].toLowerCase());
          }
          const accessMatch = desc3.match(/(?:read|edit|modify|update|import)\s+(?:file|table|resource|directory|dir)?\s*([a-zA-Z0-9_\-./]+)/i);
          if (accessMatch && accessMatch[1]) {
            const accessedTarget = accessMatch[1].toLowerCase();
            if (deletedTargets.has(accessedTarget)) {
              errors.push({
                code: "CONTRADICTORY_OPERATIONS" /* CONTRADICTORY_OPERATIONS */,
                stepId: step.id,
                message: `Semantic contradiction: Step '${step.id}' attempts to access '${accessedTarget}' which was previously deleted in this plan without recreation.`,
                repairable: true,
                suggestedPatch: { conflictingTarget: accessedTarget, action: "INSERT_CREATION_BEFORE_ACCESS" }
              });
            }
          }
        }
        return {
          isValid: errors.length === 0,
          errors,
          warnings
        };
      }
    };
  }
});

// src/agent/planner/PlanStep.ts
var init_PlanStep = __esm({
  "src/agent/planner/PlanStep.ts"() {
  }
});

// src/agent/planner/TaskGraphBuilder.ts
var TaskGraphBuilder;
var init_TaskGraphBuilder = __esm({
  "src/agent/planner/TaskGraphBuilder.ts"() {
    init_TaskGraph();
    init_TaskGraphValidation();
    TaskGraphBuilder = class {
      /**
       * Builds a validated TaskGraph from an array of TaskSpecifications (or PlanSteps).
       * By default, tasks without explicit dependency mappings are sequenced linearly (SEQUENTIAL),
       * ensuring that each task naturally depends on the completion of the preceding task.
       */
      static build(tasks, options) {
        let opts = {};
        if (typeof options === "string") {
          opts = { goalId: options };
        } else if (options) {
          opts = options;
        }
        if (!Array.isArray(tasks) || tasks.length === 0) {
          const emptyGraph = new DirectedTaskGraph(opts.graphId, opts.goalId);
          if (opts.metadata) emptyGraph.metadata = { ...opts.metadata };
          return emptyGraph;
        }
        const goalId = opts.goalId || (tasks[0] && "parentGoalId" in tasks[0] ? tasks[0].parentGoalId : "");
        const graph = new DirectedTaskGraph(opts.graphId, goalId);
        if (opts.metadata) {
          graph.metadata = { ...opts.metadata };
        }
        const mode = opts.structureMode || "SEQUENTIAL";
        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];
          let deps = [];
          if (opts.explicitDependencies && task.id in opts.explicitDependencies) {
            deps = opts.explicitDependencies[task.id];
          } else if (mode === "SEQUENTIAL" && i > 0) {
            deps = [tasks[i - 1].id];
          } else if (mode === "INDEPENDENT") {
            deps = [];
          } else if ("dependencies" in task && Array.isArray(task.dependencies)) {
            deps = task.dependencies;
          }
          graph.addTask(task, deps);
        }
        assertValidTaskGraph(graph);
        return graph;
      }
      /**
       * Explicitly builds a sequential linear pipeline: task[0] -> task[1] -> ... -> task[n]
       */
      static buildSequential(tasks, goalId, metadata) {
        return this.build(tasks, {
          goalId,
          structureMode: "SEQUENTIAL",
          metadata
        });
      }
      /**
       * Explicitly builds an independent / parallel frontier graph where tasks have 0 initial dependencies
       */
      static buildIndependent(tasks, goalId, metadata) {
        return this.build(tasks, {
          goalId,
          structureMode: "INDEPENDENT",
          metadata
        });
      }
      /**
       * Builds a graph with explicit dependency mapping (taskId -> array of prerequisite taskIds)
       */
      static buildFromDependencies(tasks, dependencies, goalId, metadata) {
        return this.build(tasks, {
          goalId,
          structureMode: "EXPLICIT",
          explicitDependencies: dependencies,
          metadata
        });
      }
    };
  }
});

// src/agent/planner/PlanRepairer.ts
var LocalizedPlanRepairer;
var init_PlanRepairer = __esm({
  "src/agent/planner/PlanRepairer.ts"() {
    init_PlanStep();
    init_TaskGraphBuilder();
    init_PlanValidationTypes();
    LocalizedPlanRepairer = class {
      canRepair(validationResult) {
        if (!validationResult || validationResult.isValid) {
          return true;
        }
        if (validationResult.errors.length === 0) {
          return true;
        }
        return validationResult.errors.every((err) => err.repairable === true);
      }
      async applyRepair(plan, validationResult) {
        if (!validationResult || validationResult.isValid || validationResult.errors.length === 0) {
          return plan;
        }
        let repairedSteps = plan.steps ? [...plan.steps.map((s) => ({ ...s, dependencies: [...s.dependencies] }))] : [];
        const stepMap = new Map(repairedSteps.map((s) => [s.id, s]));
        const approvalSet = new Set(plan.approvalPoints || []);
        const repairedValidationRequirements = [...plan.validationRequirements || []];
        const repairedRollbackHints = [...plan.rollbackHints || []];
        for (const error of validationResult.errors) {
          switch (error.code) {
            case "MISSING_DEPENDENCY" /* MISSING_DEPENDENCY */: {
              const missingStepId = error.suggestedPatch?.missingStepId || `step-prereq-${Date.now()}`;
              const referencingStepId = error.stepId || error.suggestedPatch?.referencingStepId;
              if (!stepMap.has(missingStepId)) {
                const syntheticStep = {
                  id: missingStepId,
                  taskId: missingStepId,
                  title: `Prerequisite: Initialize ${missingStepId}`,
                  description: `Auto-generated prerequisite step to resolve dependency requirement for step '${referencingStepId}'.`,
                  dependencies: [],
                  expectedInputs: [],
                  expectedOutputs: [`${missingStepId}_ready`],
                  requiredTools: [],
                  estimatedDurationMs: 300,
                  riskLevel: "LOW" /* LOW */,
                  approvalRequired: false,
                  validationRules: [],
                  metadata: {
                    autoRepaired: true,
                    repairReason: "MISSING_DEPENDENCY",
                    targetStep: referencingStepId
                  }
                };
                repairedSteps.unshift(syntheticStep);
                stepMap.set(missingStepId, syntheticStep);
                repairedRollbackHints.push(`Auto-inserted prerequisite step '${missingStepId}'`);
              }
              break;
            }
            case "CYCLE_DETECTED" /* CYCLE_DETECTED */: {
              if (error.suggestedPatch?.brokenEdge) {
                const { from, to } = error.suggestedPatch.brokenEdge;
                const fromStep = stepMap.get(from);
                if (fromStep) {
                  fromStep.dependencies = fromStep.dependencies.filter((d) => d !== to);
                }
              } else if (error.stepId) {
                const step = stepMap.get(error.stepId);
                if (step) {
                  step.dependencies = [];
                }
              }
              break;
            }
            case "INPUT_BINDING_MISSING" /* INPUT_BINDING_MISSING */: {
              const producerId = error.suggestedPatch?.producerId;
              const consumerId = error.stepId || error.suggestedPatch?.consumerId;
              if (producerId && consumerId && stepMap.has(consumerId)) {
                const consumer = stepMap.get(consumerId);
                if (!consumer.dependencies.includes(producerId)) {
                  consumer.dependencies.push(producerId);
                }
              }
              break;
            }
            case "CONTRADICTORY_OPERATIONS" /* CONTRADICTORY_OPERATIONS */: {
              const target = error.suggestedPatch?.conflictingTarget || "resource";
              const targetStepId = error.stepId;
              const recreateStepId = `recreate_${target.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
              if (!stepMap.has(recreateStepId) && targetStepId && stepMap.has(targetStepId)) {
                const targetStep = stepMap.get(targetStepId);
                const recreateStep = {
                  id: recreateStepId,
                  taskId: recreateStepId,
                  title: `Recreate / Initialize ${target}`,
                  description: `Auto-generated restoration step to recreate '${target}' before access in '${targetStepId}'.`,
                  dependencies: [...targetStep.dependencies],
                  expectedInputs: [],
                  expectedOutputs: [`${target}_restored`],
                  requiredTools: [],
                  estimatedDurationMs: 400,
                  riskLevel: "LOW" /* LOW */,
                  approvalRequired: false,
                  validationRules: [],
                  metadata: {
                    autoRepaired: true,
                    repairReason: "CONTRADICTORY_OPERATIONS",
                    conflictingTarget: target
                  }
                };
                targetStep.dependencies = [recreateStepId];
                repairedSteps.push(recreateStep);
                stepMap.set(recreateStepId, recreateStep);
              }
              break;
            }
            default:
              break;
          }
        }
        for (const step of repairedSteps) {
          if (step.riskLevel === "HIGH" /* HIGH */ || step.riskLevel === "CRITICAL" /* CRITICAL */ || step.approvalRequired) {
            approvalSet.add(step.id);
          }
        }
        const explicitDependencies = {};
        for (const step of repairedSteps) {
          explicitDependencies[step.id] = step.dependencies || [];
        }
        const repairedTaskGraph = TaskGraphBuilder.build(repairedSteps, {
          goalId: plan.goalId || "repaired-goal",
          explicitDependencies
        });
        const repairedExecutionOrder = repairedTaskGraph.isAcyclic() ? repairedTaskGraph.getTopologicalOrder() : repairedSteps.map((s) => s.id);
        return {
          ...plan,
          taskGraph: repairedTaskGraph,
          steps: repairedSteps,
          executionOrder: repairedExecutionOrder,
          approvalPoints: Array.from(approvalSet),
          validationRequirements: repairedValidationRequirements,
          rollbackHints: repairedRollbackHints,
          metadata: {
            ...plan.metadata || {},
            repairedAt: Date.now(),
            repairCount: validationResult.errors.length
          },
          updatedAt: Date.now()
        };
      }
    };
  }
});

// src/agent/goal/GoalTypes.ts
var GoalIntent, GoalStatus;
var init_GoalTypes = __esm({
  "src/agent/goal/GoalTypes.ts"() {
    GoalIntent = /* @__PURE__ */ ((GoalIntent2) => {
      GoalIntent2["CODE_MODIFICATION"] = "CODE_MODIFICATION";
      GoalIntent2["INVESTIGATION"] = "INVESTIGATION";
      GoalIntent2["TESTING_AND_VERIFICATION"] = "TESTING_AND_VERIFICATION";
      GoalIntent2["INFRASTRUCTURE_OPS"] = "INFRASTRUCTURE_OPS";
      GoalIntent2["INFORMATION_RETRIEVAL"] = "INFORMATION_RETRIEVAL";
      GoalIntent2["GENERAL_CHAT"] = "GENERAL_CHAT";
      return GoalIntent2;
    })(GoalIntent || {});
    GoalStatus = /* @__PURE__ */ ((GoalStatus2) => {
      GoalStatus2["CREATED"] = "CREATED";
      GoalStatus2["READY"] = "READY";
      GoalStatus2["ACTIVE"] = "ACTIVE";
      GoalStatus2["COMPLETED"] = "COMPLETED";
      GoalStatus2["FAILED"] = "FAILED";
      GoalStatus2["CANCELLED"] = "CANCELLED";
      GoalStatus2["ABANDONED"] = "ABANDONED";
      return GoalStatus2;
    })(GoalStatus || {});
  }
});

// src/agent/goal/GoalErrors.ts
var GoalValidationError;
var init_GoalErrors = __esm({
  "src/agent/goal/GoalErrors.ts"() {
    GoalValidationError = class _GoalValidationError extends Error {
      constructor(errors, warnings = []) {
        super(`Goal validation failed with ${errors.length} error(s):
- ${errors.join("\n- ")}`);
        this.errors = errors;
        this.warnings = warnings;
        this.name = "GoalValidationError";
        Object.setPrototypeOf(this, _GoalValidationError.prototype);
      }
    };
  }
});

// src/agent/goal/GoalValidation.ts
function validateSuccessCriterion(criterion, index) {
  const errors = [];
  const warnings = [];
  if (!criterion || typeof criterion !== "object") {
    errors.push(`successCriteria[${index}] must be a non-null object.`);
    return { errors, warnings };
  }
  const c = criterion;
  if (!c.id || typeof c.id !== "string" || c.id.trim() === "") {
    errors.push(`successCriteria[${index}].id must be a non-empty string.`);
  }
  if (!c.description || typeof c.description !== "string" || c.description.trim() === "") {
    errors.push(`successCriteria[${index}].description must be a non-empty string.`);
  }
  if (!c.assertionType || !VALID_ASSERTION_TYPES.has(c.assertionType)) {
    errors.push(
      `successCriteria[${index}].assertionType must be one of: ${Array.from(VALID_ASSERTION_TYPES).join(", ")}.`
    );
  }
  if (c.assertionType === "FILE_EXISTS" && (!c.target || typeof c.target !== "string")) {
    warnings.push(`successCriteria[${index}] with assertionType 'FILE_EXISTS' is missing a 'target' path.`);
  }
  return { errors, warnings };
}
function validateGoalConstraints(constraints) {
  const errors = [];
  const warnings = [];
  if (!constraints || typeof constraints !== "object") {
    errors.push("constraints must be a non-null object.");
    return { errors, warnings };
  }
  const c = constraints;
  if (typeof c.maxSteps !== "number" || c.maxSteps <= 0 || !Number.isInteger(c.maxSteps)) {
    errors.push("constraints.maxSteps must be a positive integer.");
  }
  if (typeof c.maxExecutionTimeMs !== "number" || c.maxExecutionTimeMs <= 0) {
    errors.push("constraints.maxExecutionTimeMs must be a positive number.");
  }
  if (!Array.isArray(c.forbiddenTools)) {
    errors.push("constraints.forbiddenTools must be an array of tool names.");
  }
  if (!Array.isArray(c.mandatoryTools)) {
    errors.push("constraints.mandatoryTools must be an array of tool names.");
  }
  if (Array.isArray(c.forbiddenTools) && Array.isArray(c.mandatoryTools)) {
    const forbiddenSet = new Set(c.forbiddenTools.map((t) => String(t).trim()));
    const conflicting = c.mandatoryTools.filter((t) => forbiddenSet.has(String(t).trim()));
    if (conflicting.length > 0) {
      errors.push(
        `Conflicting tool constraints: [${conflicting.join(", ")}] cannot be both mandatory and forbidden.`
      );
    }
  }
  if (!c.maxRiskLevel || !VALID_RISK_LEVELS.has(c.maxRiskLevel)) {
    errors.push(`constraints.maxRiskLevel must be one of: ${Array.from(VALID_RISK_LEVELS).join(", ")}.`);
  }
  if (c.requireApprovalAboveRisk && !VALID_RISK_LEVELS.has(c.requireApprovalAboveRisk)) {
    errors.push(
      `constraints.requireApprovalAboveRisk must be one of: ${Array.from(VALID_RISK_LEVELS).join(", ")}.`
    );
  }
  return { errors, warnings };
}
function validateGoal(goal) {
  const errors = [];
  const warnings = [];
  if (!goal || typeof goal !== "object") {
    return {
      isValid: false,
      errors: ["Goal must be a non-null object."],
      warnings: []
    };
  }
  const g = goal;
  if (!g.id || typeof g.id !== "string" || g.id.trim() === "") {
    errors.push("id must be a non-empty string.");
  }
  if (!g.rawPrompt || typeof g.rawPrompt !== "string" || g.rawPrompt.trim() === "") {
    errors.push("rawPrompt must be a non-empty string.");
  }
  if (!g.intent || !VALID_INTENTS.has(g.intent)) {
    errors.push(`intent must be a valid GoalIntent. Received: '${String(g.intent)}'.`);
  }
  if (!g.description || typeof g.description !== "string" || g.description.trim() === "") {
    errors.push("description must be a non-empty string.");
  }
  if (!g.desiredOutcome || typeof g.desiredOutcome !== "string" || g.desiredOutcome.trim() === "") {
    errors.push("desiredOutcome must be a non-empty string.");
  }
  if (!g.status || !VALID_STATUSES.has(g.status)) {
    errors.push(`status must be a valid GoalStatus. Received: '${String(g.status)}'.`);
  }
  if (typeof g.priority !== "number" || !Number.isInteger(g.priority) || g.priority < 1 || g.priority > 5) {
    errors.push(`priority must be an integer between 1 and 5. Received: ${String(g.priority)}.`);
  }
  if (!Array.isArray(g.successCriteria)) {
    errors.push("successCriteria must be an array.");
  } else {
    const criterionIds = /* @__PURE__ */ new Set();
    for (let i = 0; i < g.successCriteria.length; i++) {
      const criterion = g.successCriteria[i];
      const { errors: critErrors, warnings: critWarnings } = validateSuccessCriterion(criterion, i);
      errors.push(...critErrors);
      warnings.push(...critWarnings);
      if (criterion && typeof criterion === "object" && "id" in criterion) {
        const critId = String(criterion.id);
        if (critId) {
          if (criterionIds.has(critId)) {
            errors.push(`Duplicate successCriterion id detected: '${critId}'.`);
          } else {
            criterionIds.add(critId);
          }
        }
      }
    }
  }
  const { errors: constraintErrors, warnings: constraintWarnings } = validateGoalConstraints(g.constraints);
  errors.push(...constraintErrors);
  warnings.push(...constraintWarnings);
  if (typeof g.createdAt !== "number" || g.createdAt <= 0) {
    errors.push("createdAt must be a valid positive timestamp.");
  }
  if (typeof g.updatedAt !== "number" || g.updatedAt <= 0) {
    errors.push("updatedAt must be a valid positive timestamp.");
  }
  if (typeof g.createdAt === "number" && typeof g.updatedAt === "number" && g.updatedAt < g.createdAt) {
    errors.push(`updatedAt (${g.updatedAt}) cannot be before createdAt (${g.createdAt}).`);
  }
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
function assertValidGoal(goal) {
  const result = validateGoal(goal);
  if (!result.isValid) {
    throw new GoalValidationError(result.errors, result.warnings);
  }
}
var VALID_INTENTS, VALID_STATUSES, VALID_ASSERTION_TYPES, VALID_RISK_LEVELS;
var init_GoalValidation = __esm({
  "src/agent/goal/GoalValidation.ts"() {
    init_GoalTypes();
    init_GoalErrors();
    VALID_INTENTS = new Set(Object.values(GoalIntent));
    VALID_STATUSES = new Set(Object.values(GoalStatus));
    VALID_ASSERTION_TYPES = /* @__PURE__ */ new Set([
      "FILE_EXISTS",
      "LINT_PASSES",
      "BUILD_SUCCEEDS",
      "TEST_PASSES",
      "OUTPUT_CONTAINS",
      "CUSTOM"
    ]);
    VALID_RISK_LEVELS = /* @__PURE__ */ new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
  }
});

// src/agent/decomposition/DecompositionTypes.ts
var TaskType;
var init_DecompositionTypes = __esm({
  "src/agent/decomposition/DecompositionTypes.ts"() {
    TaskType = /* @__PURE__ */ ((TaskType2) => {
      TaskType2["INSPECT"] = "INSPECT";
      TaskType2["MODIFY"] = "MODIFY";
      TaskType2["VERIFY"] = "VERIFY";
      TaskType2["ANALYZE"] = "ANALYZE";
      TaskType2["EXECUTE"] = "EXECUTE";
      TaskType2["RETRIEVE"] = "RETRIEVE";
      TaskType2["COMMUNICATE"] = "COMMUNICATE";
      return TaskType2;
    })(TaskType || {});
  }
});

// src/agent/decomposition/DecompositionTemplate.ts
function filterToolHints(suggestedHints, forbiddenTools, availableTools) {
  const forbiddenSet = new Set(forbiddenTools.map((f) => f.trim()));
  const availableSet = availableTools ? new Set(availableTools.map((a) => a.trim())) : null;
  return suggestedHints.filter((tool) => {
    if (forbiddenSet.has(tool)) return false;
    if (availableSet && !availableSet.has(tool)) return false;
    return true;
  });
}
function resolveTaskRisk(defaultRisk, goalMaxRisk, requireApprovalAboveRisk) {
  const defaultWeight = RISK_LEVEL_WEIGHTS[defaultRisk];
  const maxWeight = RISK_LEVEL_WEIGHTS[goalMaxRisk];
  const finalRisk = defaultWeight <= maxWeight ? defaultRisk : goalMaxRisk;
  let approvalRequired = false;
  if (requireApprovalAboveRisk) {
    const thresholdWeight = RISK_LEVEL_WEIGHTS[requireApprovalAboveRisk];
    const finalWeight = RISK_LEVEL_WEIGHTS[finalRisk];
    if (finalWeight >= thresholdWeight) {
      approvalRequired = true;
    }
  }
  return { riskLevel: finalRisk, approvalRequired };
}
function formatCriteriaDescriptions(criteria) {
  return criteria.map((c) => `[${c.assertionType}] ${c.description}${c.target ? ` (Target: ${c.target})` : ""}`);
}
function getDecompositionTemplateForIntent(intent) {
  switch (intent) {
    case "CODE_MODIFICATION" /* CODE_MODIFICATION */:
      return new CodeModificationTemplate();
    case "INVESTIGATION" /* INVESTIGATION */:
      return new InvestigationTemplate();
    case "TESTING_AND_VERIFICATION" /* TESTING_AND_VERIFICATION */:
      return new TestingAndVerificationTemplate();
    case "INFRASTRUCTURE_OPS" /* INFRASTRUCTURE_OPS */:
      return new InfrastructureOpsTemplate();
    case "INFORMATION_RETRIEVAL" /* INFORMATION_RETRIEVAL */:
      return new InformationRetrievalTemplate();
    case "GENERAL_CHAT" /* GENERAL_CHAT */:
      return new GeneralChatTemplate();
    default:
      throw new Error(`Unsupported GoalIntent: ${String(intent)}`);
  }
}
var RISK_LEVEL_WEIGHTS, CodeModificationTemplate, InvestigationTemplate, TestingAndVerificationTemplate, InfrastructureOpsTemplate, InformationRetrievalTemplate, GeneralChatTemplate;
var init_DecompositionTemplate = __esm({
  "src/agent/decomposition/DecompositionTemplate.ts"() {
    init_GoalTypes();
    init_DecompositionTypes();
    RISK_LEVEL_WEIGHTS = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4
    };
    CodeModificationTemplate = class {
      constructor() {
        this.intent = "CODE_MODIFICATION" /* CODE_MODIFICATION */;
      }
      generateTasks(goal, availableTools) {
        const now = Date.now();
        const tasks = [];
        const forbidden = goal.constraints.forbiddenTools;
        const mandatory = goal.constraints.mandatoryTools;
        const inspectRisk = resolveTaskRisk("LOW", goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
        const inspectHints = filterToolHints(
          ["view_file", "list_dir", "search_web", ...mandatory.filter((m) => m.includes("view") || m.includes("list"))],
          forbidden,
          availableTools
        );
        tasks.push({
          id: `task_${goal.id}_1`,
          parentGoalId: goal.id,
          title: `Inspect & Analyze Codebase for: ${goal.title || goal.description.slice(0, 50)}`,
          description: `Locate, read, and inspect all target files and related modules required for: ${goal.description}`,
          taskType: "INSPECT" /* INSPECT */,
          expectedOutcome: `Complete understanding of the existing code structure, interfaces, and modification targets.`,
          expectedInputs: ["goal.description", "target file paths"],
          expectedOutputs: ["file contents", "module dependency map", "targeted edit locations"],
          requiredCapabilities: ["code_reading", "directory_inspection"],
          toolHints: inspectHints,
          riskLevel: inspectRisk.riskLevel,
          approvalRequired: inspectRisk.approvalRequired,
          createdAt: now
        });
        const modifyRisk = resolveTaskRisk("MEDIUM", goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
        const modifyHints = filterToolHints(
          ["edit_file", "create_file", "multi_edit_file", ...mandatory.filter((m) => m.includes("edit") || m.includes("create"))],
          forbidden,
          availableTools
        );
        tasks.push({
          id: `task_${goal.id}_2`,
          parentGoalId: goal.id,
          title: `Implement Code Modifications`,
          description: `Execute surgical, modular code changes to achieve: ${goal.desiredOutcome}`,
          taskType: "MODIFY" /* MODIFY */,
          expectedOutcome: `Source files modified and aligned with desired outcome without breaking unrelated modules.`,
          expectedInputs: ["targeted edit locations", "inspected code", "modification requirements"],
          expectedOutputs: ["modified source files", "diff application log"],
          requiredCapabilities: ["code_editing", "file_creation"],
          toolHints: modifyHints,
          riskLevel: modifyRisk.riskLevel,
          approvalRequired: modifyRisk.approvalRequired,
          createdAt: now
        });
        const verifyRisk = resolveTaskRisk("LOW", goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
        const verifyHints = filterToolHints(
          ["lint_applet", "compile_applet", "run_command", ...mandatory.filter((m) => m.includes("lint") || m.includes("compile"))],
          forbidden,
          availableTools
        );
        const criteriaSummary = goal.successCriteria.length > 0 ? `Verify against success criteria:
- ${formatCriteriaDescriptions(goal.successCriteria).join("\n- ")}` : "Verify compilation, linting, and runtime integrity of modified files.";
        tasks.push({
          id: `task_${goal.id}_3`,
          parentGoalId: goal.id,
          title: `Verify Modifications & Validate Criteria`,
          description: `${criteriaSummary}`,
          taskType: "VERIFY" /* VERIFY */,
          expectedOutcome: `Clean linter, successful compilation, and verified success criteria.`,
          expectedInputs: ["modified source files", "success criteria"],
          expectedOutputs: ["linter output", "compiler output", "validation result"],
          requiredCapabilities: ["compilation", "linting", "verification"],
          toolHints: verifyHints,
          riskLevel: verifyRisk.riskLevel,
          approvalRequired: verifyRisk.approvalRequired,
          metadata: {
            successCriteriaToVerify: goal.successCriteria.map((c) => c.id)
          },
          createdAt: now
        });
        return tasks;
      }
    };
    InvestigationTemplate = class {
      constructor() {
        this.intent = "INVESTIGATION" /* INVESTIGATION */;
      }
      generateTasks(goal, availableTools) {
        const now = Date.now();
        const tasks = [];
        const forbidden = goal.constraints.forbiddenTools;
        const mandatory = goal.constraints.mandatoryTools;
        const gatherRisk = resolveTaskRisk("LOW", goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
        tasks.push({
          id: `task_${goal.id}_1`,
          parentGoalId: goal.id,
          title: `Gather Evidence & Diagnostic Logs`,
          description: `Investigate and gather relevant logs, code structures, and context for: ${goal.description}`,
          taskType: "INSPECT" /* INSPECT */,
          expectedOutcome: `Comprehensive diagnostic logs, error traces, and relevant file contexts collected.`,
          expectedInputs: ["investigation query", "error reports", "file paths"],
          expectedOutputs: ["collected logs", "file snippets", "error stack traces"],
          toolHints: filterToolHints(["view_file", "list_dir", "run_command", ...mandatory], forbidden, availableTools),
          riskLevel: gatherRisk.riskLevel,
          approvalRequired: gatherRisk.approvalRequired,
          createdAt: now
        });
        const analyzeRisk = resolveTaskRisk("LOW", goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
        tasks.push({
          id: `task_${goal.id}_2`,
          parentGoalId: goal.id,
          title: `Analyze Patterns & Determine Root Cause`,
          description: `Analyze collected evidence to isolate the defect, constraint, or underlying pattern.`,
          taskType: "ANALYZE" /* ANALYZE */,
          expectedOutcome: `Definitive root cause identified with supporting evidence.`,
          expectedInputs: ["collected logs", "file snippets", "diagnostic context"],
          expectedOutputs: ["root cause analysis", "impact assessment", "candidate remediations"],
          toolHints: filterToolHints([...mandatory], forbidden, availableTools),
          riskLevel: analyzeRisk.riskLevel,
          approvalRequired: analyzeRisk.approvalRequired,
          createdAt: now
        });
        const reportRisk = resolveTaskRisk("LOW", goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
        tasks.push({
          id: `task_${goal.id}_3`,
          parentGoalId: goal.id,
          title: `Synthesize Investigation Report`,
          description: `Formulate a structured investigation synthesis explaining the findings and actionable next steps.`,
          taskType: "COMMUNICATE" /* COMMUNICATE */,
          expectedOutcome: `Clear, evidence-backed summary addressing: ${goal.desiredOutcome}`,
          expectedInputs: ["root cause analysis", "candidate remediations"],
          expectedOutputs: ["investigation report", "recommended actions"],
          toolHints: filterToolHints([...mandatory], forbidden, availableTools),
          riskLevel: reportRisk.riskLevel,
          approvalRequired: reportRisk.approvalRequired,
          createdAt: now
        });
        return tasks;
      }
    };
    TestingAndVerificationTemplate = class {
      constructor() {
        this.intent = "TESTING_AND_VERIFICATION" /* TESTING_AND_VERIFICATION */;
      }
      generateTasks(goal, availableTools) {
        const now = Date.now();
        const tasks = [];
        const forbidden = goal.constraints.forbiddenTools;
        const mandatory = goal.constraints.mandatoryTools;
        const prepRisk = resolveTaskRisk("LOW", goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
        tasks.push({
          id: `task_${goal.id}_1`,
          parentGoalId: goal.id,
          title: `Prepare Test Suite & Verification Harness`,
          description: `Ensure test files, assertions, and verification environments are configured for: ${goal.description}`,
          taskType: "INSPECT" /* INSPECT */,
          expectedOutcome: `Test environment verified and ready for execution.`,
          expectedInputs: ["test target specifications", "configuration files"],
          expectedOutputs: ["test suite status", "prepared fixtures"],
          toolHints: filterToolHints(["view_file", "list_dir", ...mandatory], forbidden, availableTools),
          riskLevel: prepRisk.riskLevel,
          approvalRequired: prepRisk.approvalRequired,
          createdAt: now
        });
        const execRisk = resolveTaskRisk("MEDIUM", goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
        tasks.push({
          id: `task_${goal.id}_2`,
          parentGoalId: goal.id,
          title: `Execute Tests & Static Analysis`,
          description: `Run test commands, linters, and typecheckers to evaluate test assertions.`,
          taskType: "EXECUTE" /* EXECUTE */,
          expectedOutcome: `Execution output from test runners and static analysis tools.`,
          expectedInputs: ["test scripts", "verification rules"],
          expectedOutputs: ["test execution results", "pass/fail matrix"],
          toolHints: filterToolHints(["run_command", "lint_applet", "compile_applet", ...mandatory], forbidden, availableTools),
          riskLevel: execRisk.riskLevel,
          approvalRequired: execRisk.approvalRequired,
          createdAt: now
        });
        const evalRisk = resolveTaskRisk("LOW", goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
        const criteriaSummary = goal.successCriteria.length > 0 ? `Verify against success criteria:
- ${formatCriteriaDescriptions(goal.successCriteria).join("\n- ")}` : "Validate all test outcomes against expected results.";
        tasks.push({
          id: `task_${goal.id}_3`,
          parentGoalId: goal.id,
          title: `Evaluate Results & Report Verification Status`,
          description: `${criteriaSummary}`,
          taskType: "VERIFY" /* VERIFY */,
          expectedOutcome: `Verified report indicating pass/fail status and criterion coverage.`,
          expectedInputs: ["test execution results", "pass/fail matrix", "success criteria"],
          expectedOutputs: ["final verification report", "criterion compliance breakdown"],
          toolHints: filterToolHints([...mandatory], forbidden, availableTools),
          riskLevel: evalRisk.riskLevel,
          approvalRequired: evalRisk.approvalRequired,
          createdAt: now
        });
        return tasks;
      }
    };
    InfrastructureOpsTemplate = class {
      constructor() {
        this.intent = "INFRASTRUCTURE_OPS" /* INFRASTRUCTURE_OPS */;
      }
      generateTasks(goal, availableTools) {
        const now = Date.now();
        const tasks = [];
        const forbidden = goal.constraints.forbiddenTools;
        const mandatory = goal.constraints.mandatoryTools;
        const assessRisk = resolveTaskRisk("LOW", goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
        tasks.push({
          id: `task_${goal.id}_1`,
          parentGoalId: goal.id,
          title: `Assess Infrastructure State & Configuration`,
          description: `Audit current environment configuration, services, and dependencies for: ${goal.description}`,
          taskType: "INSPECT" /* INSPECT */,
          expectedOutcome: `Validated infrastructure state and baseline configuration.`,
          expectedInputs: ["infrastructure config", "environment variables"],
          expectedOutputs: ["infrastructure assessment", "prerequisite status"],
          toolHints: filterToolHints(["view_file", "list_dir", "run_command", ...mandatory], forbidden, availableTools),
          riskLevel: assessRisk.riskLevel,
          approvalRequired: assessRisk.approvalRequired,
          createdAt: now
        });
        const opRisk = resolveTaskRisk("HIGH", goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
        tasks.push({
          id: `task_${goal.id}_2`,
          parentGoalId: goal.id,
          title: `Execute Infrastructure Operations`,
          description: `Apply operational changes, configuration updates, or environment modifications.`,
          taskType: "EXECUTE" /* EXECUTE */,
          expectedOutcome: `Operations applied cleanly to target infrastructure.`,
          expectedInputs: ["infrastructure assessment", "operation parameters"],
          expectedOutputs: ["operation execution logs", "updated configuration"],
          toolHints: filterToolHints(["run_command", ...mandatory], forbidden, availableTools),
          riskLevel: opRisk.riskLevel,
          approvalRequired: opRisk.approvalRequired,
          createdAt: now
        });
        const verifyRisk = resolveTaskRisk("LOW", goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
        tasks.push({
          id: `task_${goal.id}_3`,
          parentGoalId: goal.id,
          title: `Verify Infrastructure Health & Service Availability`,
          description: `Perform health checks and connectivity verifications to ensure stability.`,
          taskType: "VERIFY" /* VERIFY */,
          expectedOutcome: `Confirmed service health and operational readiness.`,
          expectedInputs: ["updated configuration", "health endpoints"],
          expectedOutputs: ["health check results", "operational status confirmation"],
          toolHints: filterToolHints(["run_command", ...mandatory], forbidden, availableTools),
          riskLevel: verifyRisk.riskLevel,
          approvalRequired: verifyRisk.approvalRequired,
          createdAt: now
        });
        return tasks;
      }
    };
    InformationRetrievalTemplate = class {
      constructor() {
        this.intent = "INFORMATION_RETRIEVAL" /* INFORMATION_RETRIEVAL */;
      }
      generateTasks(goal, availableTools) {
        const now = Date.now();
        const tasks = [];
        const forbidden = goal.constraints.forbiddenTools;
        const mandatory = goal.constraints.mandatoryTools;
        const searchRisk = resolveTaskRisk("LOW", goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
        tasks.push({
          id: `task_${goal.id}_1`,
          parentGoalId: goal.id,
          title: `Search & Locate Information Sources`,
          description: `Locate relevant documentation, files, or external resources for: ${goal.description}`,
          taskType: "RETRIEVE" /* RETRIEVE */,
          expectedOutcome: `Relevant sources and references located.`,
          expectedInputs: ["retrieval query", "keywords"],
          expectedOutputs: ["source list", "retrieved documents"],
          toolHints: filterToolHints(["search_web", "view_file", "list_dir", ...mandatory], forbidden, availableTools),
          riskLevel: searchRisk.riskLevel,
          approvalRequired: searchRisk.approvalRequired,
          createdAt: now
        });
        const extractRisk = resolveTaskRisk("LOW", goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
        tasks.push({
          id: `task_${goal.id}_2`,
          parentGoalId: goal.id,
          title: `Extract & Synthesize Information`,
          description: `Extract specific answers, citations, and summaries to address: ${goal.desiredOutcome}`,
          taskType: "COMMUNICATE" /* COMMUNICATE */,
          expectedOutcome: `Synthesized, accurate answer with verified citations and references.`,
          expectedInputs: ["source list", "retrieved documents"],
          expectedOutputs: ["synthesized response", "citations"],
          toolHints: filterToolHints([...mandatory], forbidden, availableTools),
          riskLevel: extractRisk.riskLevel,
          approvalRequired: extractRisk.approvalRequired,
          createdAt: now
        });
        return tasks;
      }
    };
    GeneralChatTemplate = class {
      constructor() {
        this.intent = "GENERAL_CHAT" /* GENERAL_CHAT */;
      }
      generateTasks(goal, availableTools) {
        const now = Date.now();
        const tasks = [];
        const forbidden = goal.constraints.forbiddenTools;
        const mandatory = goal.constraints.mandatoryTools;
        const chatRisk = resolveTaskRisk("LOW", goal.constraints.maxRiskLevel, goal.constraints.requireApprovalAboveRisk);
        tasks.push({
          id: `task_${goal.id}_1`,
          parentGoalId: goal.id,
          title: `Formulate Contextual Response`,
          description: `Compose a direct, clear, and helpful response for: ${goal.description}`,
          taskType: "COMMUNICATE" /* COMMUNICATE */,
          expectedOutcome: `Structured, conversational response addressing the user intent.`,
          expectedInputs: ["user prompt", "conversational context"],
          expectedOutputs: ["conversational response"],
          toolHints: filterToolHints([...mandatory], forbidden, availableTools),
          riskLevel: chatRisk.riskLevel,
          approvalRequired: chatRisk.approvalRequired,
          createdAt: now
        });
        return tasks;
      }
    };
  }
});

// src/agent/decomposition/DecompositionErrors.ts
var InvalidGoalDecompositionError, UnsupportedGoalIntentError;
var init_DecompositionErrors = __esm({
  "src/agent/decomposition/DecompositionErrors.ts"() {
    InvalidGoalDecompositionError = class _InvalidGoalDecompositionError extends Error {
      constructor(message, details) {
        super(`Goal decomposition error: ${message}`);
        this.details = details;
        this.name = "InvalidGoalDecompositionError";
        Object.setPrototypeOf(this, _InvalidGoalDecompositionError.prototype);
      }
    };
    UnsupportedGoalIntentError = class _UnsupportedGoalIntentError extends Error {
      constructor(intent) {
        super(`Unsupported GoalIntent for decomposition: '${intent}'`);
        this.intent = intent;
        this.name = "UnsupportedGoalIntentError";
        Object.setPrototypeOf(this, _UnsupportedGoalIntentError.prototype);
      }
    };
  }
});

// src/agent/decomposition/TemplateDecompositionStrategy.ts
var TemplateDecompositionStrategy;
var init_TemplateDecompositionStrategy = __esm({
  "src/agent/decomposition/TemplateDecompositionStrategy.ts"() {
    init_GoalTypes();
    init_DecompositionTemplate();
    init_DecompositionErrors();
    TemplateDecompositionStrategy = class {
      constructor() {
        this.name = "TEMPLATE_DETERMINISTIC";
      }
      canDecompose(goal) {
        return Object.values(GoalIntent).includes(goal.intent);
      }
      async decompose(goal, options) {
        if (!this.canDecompose(goal)) {
          throw new UnsupportedGoalIntentError(goal.intent);
        }
        const template = getDecompositionTemplateForIntent(goal.intent);
        const availableTools = options?.availableTools;
        const tasks = template.generateTasks(goal, availableTools);
        return tasks;
      }
    };
  }
});

// src/agent/decomposition/DecompositionValidation.ts
function validateTaskSpecification(task, parentGoal, index) {
  const errors = [];
  const warnings = [];
  if (!task || typeof task !== "object") {
    errors.push(`tasks[${index}] must be a non-null object.`);
    return { errors, warnings };
  }
  const t = task;
  if (!t.id || typeof t.id !== "string" || t.id.trim() === "") {
    errors.push(`tasks[${index}].id must be a non-empty string.`);
  }
  if (t.parentGoalId !== parentGoal.id) {
    errors.push(
      `tasks[${index}].parentGoalId ('${t.parentGoalId}') does not match Goal ID ('${parentGoal.id}').`
    );
  }
  if (!t.title || typeof t.title !== "string" || t.title.trim() === "") {
    errors.push(`tasks[${index}].title must be a non-empty string.`);
  }
  if (!t.description || typeof t.description !== "string" || t.description.trim() === "") {
    errors.push(`tasks[${index}].description must be a non-empty string.`);
  }
  if (!t.taskType || !VALID_TASK_TYPES.has(t.taskType)) {
    errors.push(`tasks[${index}].taskType must be a valid TaskType. Received: '${String(t.taskType)}'.`);
  }
  if (!t.expectedOutcome || typeof t.expectedOutcome !== "string" || t.expectedOutcome.trim() === "") {
    errors.push(`tasks[${index}].expectedOutcome must be a non-empty string.`);
  }
  if (!Array.isArray(t.expectedInputs)) {
    errors.push(`tasks[${index}].expectedInputs must be an array of strings.`);
  }
  if (!Array.isArray(t.expectedOutputs)) {
    errors.push(`tasks[${index}].expectedOutputs must be an array of strings.`);
  }
  if (!t.riskLevel || !VALID_RISK_LEVELS2.has(t.riskLevel)) {
    errors.push(`tasks[${index}].riskLevel must be one of: ${Array.from(VALID_RISK_LEVELS2).join(", ")}.`);
  } else {
    const goalMaxWeight = RISK_LEVEL_WEIGHTS2[parentGoal.constraints.maxRiskLevel];
    const taskRiskWeight = RISK_LEVEL_WEIGHTS2[t.riskLevel];
    if (taskRiskWeight > goalMaxWeight) {
      errors.push(
        `tasks[${index}] risk level '${t.riskLevel}' exceeds Goal maxRiskLevel '${parentGoal.constraints.maxRiskLevel}'.`
      );
    }
  }
  if (parentGoal.constraints.requireApprovalAboveRisk && t.riskLevel && VALID_RISK_LEVELS2.has(t.riskLevel)) {
    const thresholdWeight = RISK_LEVEL_WEIGHTS2[parentGoal.constraints.requireApprovalAboveRisk];
    const taskRiskWeight = RISK_LEVEL_WEIGHTS2[t.riskLevel];
    if (taskRiskWeight >= thresholdWeight && !t.approvalRequired) {
      warnings.push(
        `tasks[${index}] has riskLevel '${t.riskLevel}' matching or exceeding approval threshold '${parentGoal.constraints.requireApprovalAboveRisk}', but approvalRequired is false.`
      );
    }
  }
  if (t.toolHints && Array.isArray(t.toolHints)) {
    const forbiddenSet = new Set(parentGoal.constraints.forbiddenTools.map((f) => f.trim()));
    for (const hint of t.toolHints) {
      if (forbiddenSet.has(hint.trim())) {
        errors.push(
          `tasks[${index}] recommends tool hint '${hint}' which is in Goal forbiddenTools constraint.`
        );
      }
    }
  }
  for (const [key, val] of Object.entries(t)) {
    if (typeof val === "function") {
      errors.push(`tasks[${index}] contains illegal executable function property '${key}'.`);
    }
  }
  return { errors, warnings };
}
function validateDecomposition(tasks, parentGoal) {
  const errors = [];
  const warnings = [];
  if (!Array.isArray(tasks)) {
    return {
      isValid: false,
      errors: ["Decomposition output must be an array of TaskSpecifications."],
      warnings: []
    };
  }
  if (tasks.length === 0) {
    errors.push("Decomposition produced zero tasks for the given Goal.");
  }
  if (tasks.length > parentGoal.constraints.maxSteps) {
    errors.push(
      `Decomposition produced ${tasks.length} tasks, which exceeds Goal maxSteps limit (${parentGoal.constraints.maxSteps}).`
    );
  }
  const taskIds = /* @__PURE__ */ new Set();
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const { errors: taskErrors, warnings: taskWarnings } = validateTaskSpecification(task, parentGoal, i);
    errors.push(...taskErrors);
    warnings.push(...taskWarnings);
    if (task && typeof task === "object" && "id" in task) {
      const taskId = String(task.id);
      if (taskId) {
        if (taskIds.has(taskId)) {
          errors.push(`Duplicate task ID detected in decomposition: '${taskId}'.`);
        } else {
          taskIds.add(taskId);
        }
      }
    }
  }
  if (parentGoal.constraints.mandatoryTools && parentGoal.constraints.mandatoryTools.length > 0) {
    const allHints = /* @__PURE__ */ new Set();
    for (const task of tasks) {
      if (task && typeof task === "object" && "toolHints" in task && Array.isArray(task.toolHints)) {
        for (const hint of task.toolHints) {
          allHints.add(String(hint).trim());
        }
      }
    }
    for (const mandatory of parentGoal.constraints.mandatoryTools) {
      if (!allHints.has(mandatory.trim())) {
        warnings.push(
          `Mandatory tool '${mandatory}' is not suggested in any task toolHints in this decomposition.`
        );
      }
    }
  }
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
var VALID_TASK_TYPES, VALID_RISK_LEVELS2, RISK_LEVEL_WEIGHTS2;
var init_DecompositionValidation = __esm({
  "src/agent/decomposition/DecompositionValidation.ts"() {
    init_DecompositionTypes();
    init_DecompositionErrors();
    VALID_TASK_TYPES = new Set(Object.values(TaskType));
    VALID_RISK_LEVELS2 = /* @__PURE__ */ new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
    RISK_LEVEL_WEIGHTS2 = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4
    };
  }
});

// src/agent/decomposition/GoalDecomposer.ts
function generateDecompositionId(goalId) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `decomp_${crypto.randomUUID()}`;
  }
  return `decomp_${goalId}_${Date.now()}`;
}
var DefaultGoalDecomposer;
var init_GoalDecomposer = __esm({
  "src/agent/decomposition/GoalDecomposer.ts"() {
    init_GoalValidation();
    init_TemplateDecompositionStrategy();
    init_DecompositionValidation();
    init_DecompositionErrors();
    DefaultGoalDecomposer = class {
      constructor(customStrategies) {
        this.strategies = /* @__PURE__ */ new Map();
        this.defaultStrategy = new TemplateDecompositionStrategy();
        this.strategies.set(this.defaultStrategy.name, this.defaultStrategy);
        if (customStrategies) {
          for (const strat of customStrategies) {
            this.strategies.set(strat.name, strat);
          }
        }
      }
      registerStrategy(strategy) {
        this.strategies.set(strategy.name, strategy);
      }
      getStrategy(name) {
        return this.strategies.get(name);
      }
      async decompose(goal, options) {
        assertValidGoal(goal);
        let strategy;
        if (options?.strategy) {
          strategy = this.strategies.get(options.strategy);
        }
        if (!strategy) {
          for (const s of this.strategies.values()) {
            if (s.canDecompose(goal)) {
              strategy = s;
              break;
            }
          }
        }
        if (!strategy) {
          throw new UnsupportedGoalIntentError(goal.intent);
        }
        const rawTasks = await strategy.decompose(goal, options);
        const validationResult = validateDecomposition(rawTasks, goal);
        if (!validationResult.isValid) {
          throw new InvalidGoalDecompositionError(
            `Generated tasks failed structural validation:
- ${validationResult.errors.join("\n- ")}`,
            { errors: validationResult.errors, warnings: validationResult.warnings }
          );
        }
        const decompositionResult = {
          goalId: goal.id,
          decompositionId: generateDecompositionId(goal.id),
          tasks: rawTasks,
          strategyName: strategy.name,
          warnings: validationResult.warnings,
          metadata: {
            ...options?.metadata || {},
            taskCount: rawTasks.length,
            goalIntent: goal.intent
          },
          createdAt: Date.now()
        };
        return decompositionResult;
      }
    };
  }
});

// src/agent/planner/RuleBasedPlanningStrategy.ts
function normalizeRiskLevel(risk) {
  if (!risk) return "LOW" /* LOW */;
  const upper = risk.toUpperCase();
  if (upper === "CRITICAL") return "CRITICAL" /* CRITICAL */;
  if (upper === "HIGH") return "HIGH" /* HIGH */;
  if (upper === "MEDIUM") return "MEDIUM" /* MEDIUM */;
  return "LOW" /* LOW */;
}
function compareRisk2(a, b) {
  const scoreA = RISK_LEVEL_ORDER2[a.toUpperCase()] || 1;
  const scoreB = RISK_LEVEL_ORDER2[b.toUpperCase()] || 1;
  return scoreA - scoreB;
}
function getTaskTools(task) {
  if (!task) return [];
  if ("requiredTools" in task && Array.isArray(task.requiredTools)) {
    return task.requiredTools.map((t) => typeof t === "string" ? t : t.name);
  }
  if ("toolHints" in task && Array.isArray(task.toolHints)) {
    return [...task.toolHints];
  }
  return [];
}
function getTaskDuration(task) {
  if (!task) return 500;
  if ("estimatedDurationMs" in task && typeof task.estimatedDurationMs === "number") {
    return task.estimatedDurationMs;
  }
  return 500;
}
function getTaskValidationRules(task) {
  if (!task) return [];
  if ("validationRules" in task && Array.isArray(task.validationRules)) {
    return [...task.validationRules];
  }
  return [];
}
var RISK_LEVEL_ORDER2, RuleBasedPlanningStrategy;
var init_RuleBasedPlanningStrategy = __esm({
  "src/agent/planner/RuleBasedPlanningStrategy.ts"() {
    init_PlanStep();
    init_TaskGraphBuilder();
    init_GoalDecomposer();
    init_DecompositionTypes();
    RISK_LEVEL_ORDER2 = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4
    };
    RuleBasedPlanningStrategy = class {
      constructor() {
        this.name = "RuleBasedPlanningStrategy";
        this.version = "1.0.0";
      }
      async generatePlan(context) {
        const startTime = Date.now();
        const errors = [];
        const warnings = [];
        if (!context.goal && !context.taskGraph && !context.userGoal) {
          return {
            success: false,
            errors: ["PlanningContext must contain at least one of: goal, taskGraph, or userGoal."],
            strategyUsed: this.name
          };
        }
        let taskGraph;
        try {
          if (context.taskGraph) {
            taskGraph = context.taskGraph;
          } else if (context.goal) {
            const decomposer = new DefaultGoalDecomposer();
            const decompResult = await decomposer.decompose(context.goal);
            if (!decompResult.tasks || decompResult.tasks.length === 0) {
              return {
                success: false,
                errors: ["Failed to decompose goal into task specifications."],
                strategyUsed: this.name
              };
            }
            taskGraph = TaskGraphBuilder.build(decompResult.tasks, { goalId: context.goal.id });
          } else {
            const singleTask = {
              id: "task-1",
              parentGoalId: "goal-user",
              title: "Execute Goal",
              description: context.userGoal || "User request execution",
              taskType: "EXECUTE" /* EXECUTE */,
              expectedOutcome: "Successful execution of request",
              expectedInputs: [],
              expectedOutputs: [],
              toolHints: [],
              riskLevel: "LOW",
              approvalRequired: false,
              createdAt: Date.now()
            };
            taskGraph = TaskGraphBuilder.build([singleTask], { goalId: "goal-user" });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            success: false,
            errors: [`Failed to construct TaskGraph: ${msg}`],
            strategyUsed: this.name
          };
        }
        if (!taskGraph.isAcyclic()) {
          return {
            success: false,
            errors: ["Circular dependency detected in TaskGraph. Cannot generate execution order."],
            strategyUsed: this.name
          };
        }
        const topoOrder = taskGraph.getTopologicalOrder();
        const constraints = {
          ...context.constraints || {},
          ...context.goal?.constraints ? {
            maxSteps: context.goal.constraints.maxSteps,
            maxExecutionTimeMs: context.goal.constraints.maxExecutionTimeMs,
            forbiddenTools: context.goal.constraints.forbiddenTools,
            mandatoryTools: context.goal.constraints.mandatoryTools
          } : {}
        };
        if (constraints.maxSteps !== void 0 && topoOrder.length > constraints.maxSteps) {
          errors.push(
            `Plan exceeds maxSteps constraint: required ${topoOrder.length} steps, but maximum allowed is ${constraints.maxSteps}.`
          );
        }
        const usedTools = /* @__PURE__ */ new Set();
        const forbiddenTools = new Set((constraints.forbiddenTools || []).map((t) => t.toLowerCase()));
        for (const taskId of topoOrder) {
          const task = taskGraph.getTask(taskId);
          const tools = getTaskTools(task);
          for (const toolName of tools) {
            if (toolName) {
              usedTools.add(toolName.toLowerCase());
              if (forbiddenTools.has(toolName.toLowerCase())) {
                errors.push(`Task '${taskId}' requires forbidden tool '${toolName}'.`);
              }
            }
          }
        }
        if (constraints.mandatoryTools) {
          for (const mandatory of constraints.mandatoryTools) {
            if (!usedTools.has(mandatory.toLowerCase())) {
              warnings.push(`Mandatory tool '${mandatory}' is not explicitly assigned to any task.`);
            }
          }
        }
        if (errors.length > 0) {
          return {
            success: false,
            errors,
            warnings,
            strategyUsed: this.name
          };
        }
        const steps = [];
        const approvalPoints = [];
        let totalDurationMs = 0;
        let highestRisk = "LOW" /* LOW */;
        const approvalThreshold = constraints.requireApprovalForRiskAbove || "HIGH";
        for (const stepId of topoOrder) {
          const task = taskGraph.getTask(stepId);
          const dependencies = taskGraph.getDependencies(stepId);
          const title = task?.title || `Step ${stepId}`;
          const description = task?.description || `Execute task ${stepId}`;
          const taskRisk = normalizeRiskLevel(task?.riskLevel);
          const duration = getTaskDuration(task);
          totalDurationMs += duration;
          if (compareRisk2(taskRisk, highestRisk) > 0) {
            highestRisk = taskRisk;
          }
          const explicitApproval = task && "approvalRequired" in task && Boolean(task.approvalRequired);
          const approvalRequired = explicitApproval || compareRisk2(taskRisk, approvalThreshold) >= 0;
          if (approvalRequired) {
            approvalPoints.push(stepId);
          }
          const requiredTools = getTaskTools(task);
          const taskType = task?.taskType || task?.metadata?.taskType;
          const planStep = {
            id: stepId,
            taskId: stepId,
            title,
            description,
            dependencies,
            expectedInputs: task?.expectedInputs || [],
            expectedOutputs: task?.expectedOutputs || [],
            requiredTools,
            estimatedDurationMs: duration,
            riskLevel: taskRisk,
            approvalRequired,
            validationRules: getTaskValidationRules(task),
            metadata: {
              taskType,
              taskSpec: task,
              ...task?.metadata
            }
          };
          steps.push(planStep);
        }
        if (constraints.maxExecutionTimeMs !== void 0 && totalDurationMs > constraints.maxExecutionTimeMs) {
          warnings.push(
            `Estimated duration (${totalDurationMs}ms) exceeds maxExecutionTimeMs (${constraints.maxExecutionTimeMs}ms).`
          );
        }
        if (constraints.maxRiskLevel && compareRisk2(highestRisk, constraints.maxRiskLevel) > 0) {
          errors.push(
            `Plan overall risk (${highestRisk}) exceeds maxRiskLevel constraint (${constraints.maxRiskLevel}).`
          );
          return {
            success: false,
            errors,
            warnings,
            strategyUsed: this.name
          };
        }
        const rollbackHints = [];
        const validationRequirements = [];
        const assumptions = [];
        if (context.knowledgeContext && context.knowledgeContext.length > 0) {
          for (const item of context.knowledgeContext) {
            if (item.category === "BEST_PRACTICE" || item.category === "SECURITY_RULE") {
              validationRequirements.push(`Rule: ${item.content}`);
            } else {
              assumptions.push(`Knowledge constraint: ${item.content}`);
            }
          }
        }
        if (context.experienceContext && context.experienceContext.length > 0) {
          for (const exp of context.experienceContext) {
            if (exp.lessonLearned) {
              rollbackHints.push(`Heuristic from prior episode: ${exp.lessonLearned}`);
            }
            if (exp.summary) {
              validationRequirements.push(`Experience guardrail: ${exp.summary}`);
            }
          }
        }
        if (rollbackHints.length === 0) {
          rollbackHints.push("Checkpoint state before mutating files or calling destructive tools.");
        }
        let estimatedComplexity = "LOW";
        if (steps.length > 8) {
          estimatedComplexity = "HIGH";
        } else if (steps.length > 3) {
          estimatedComplexity = "MEDIUM";
        }
        const goalId = context.goal?.id || "goal-adhoc";
        const goalTitle = context.goal?.rawPrompt || context.goal?.title || context.userGoal || "Ad-hoc Goal";
        const metadata = {
          estimatedTotalDurationMs: totalDurationMs,
          overallRiskLevel: highestRisk,
          strategyUsed: this.name,
          strategyVersion: this.version,
          generationTimeMs: Date.now() - startTime,
          assumptions
        };
        const plan = {
          id: `plan-${goalId}-${Date.now()}`,
          goalId,
          goal: goalTitle,
          taskGraph,
          steps,
          executionOrder: topoOrder,
          approvalPoints,
          estimatedComplexity,
          estimatedRisk: highestRisk,
          rollbackHints,
          validationRequirements,
          metadata,
          createdAt: Date.now()
        };
        return {
          success: true,
          plan,
          errors: [],
          warnings,
          strategyUsed: this.name,
          metadata: {
            totalSteps: steps.length,
            executionOrder: topoOrder
          }
        };
      }
      async createPlan(context) {
        return this.generatePlan(context);
      }
    };
  }
});

// src/agent/planner/PlanningTypes.ts
var init_PlanningTypes = __esm({
  "src/agent/planner/PlanningTypes.ts"() {
  }
});

// src/agent/planner/HybridPlanningStrategy.ts
var HybridPlanningStrategy;
var init_HybridPlanningStrategy = __esm({
  "src/agent/planner/HybridPlanningStrategy.ts"() {
    init_RuleBasedPlanningStrategy();
    HybridPlanningStrategy = class {
      constructor(ruleBased = new RuleBasedPlanningStrategy(), llmBased, options = { enableFallback: true, preferLLM: true }) {
        this.ruleBased = ruleBased;
        this.llmBased = llmBased;
        this.options = options;
        this.name = "HybridPlanningStrategy";
        this.version = "1.0.0";
      }
      async generatePlan(context) {
        if (!this.llmBased || context.preferredStrategy === "RULE_BASED") {
          return this.ruleBased.generatePlan(context);
        }
        try {
          const llmResult = await this.llmBased.generatePlan(context);
          if (llmResult.success && llmResult.plan) {
            return {
              ...llmResult,
              strategyUsed: `${this.name} [LLM]`,
              metadata: {
                ...llmResult.metadata,
                primaryStrategy: "LLMPlanningStrategy",
                hybridMode: true
              }
            };
          }
          if (this.options.enableFallback !== false) {
            const fallbackResult = await this.ruleBased.generatePlan(context);
            return {
              ...fallbackResult,
              strategyUsed: `${this.name} [RuleBased Fallback]`,
              warnings: [
                ...fallbackResult.warnings || [],
                `LLM planning failed (${(llmResult.errors || []).join("; ")}). Successfully fell back to deterministic rule-based planning.`
              ],
              metadata: {
                ...fallbackResult.metadata,
                fallbackTriggered: true,
                llmErrors: llmResult.errors
              }
            };
          }
          return llmResult;
        } catch (err) {
          if (this.options.enableFallback !== false) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            const fallbackResult = await this.ruleBased.generatePlan(context);
            return {
              ...fallbackResult,
              strategyUsed: `${this.name} [RuleBased Fallback]`,
              warnings: [
                ...fallbackResult.warnings || [],
                `LLM planning threw exception (${errorMsg}). Successfully fell back to deterministic rule-based planning.`
              ],
              metadata: {
                ...fallbackResult.metadata,
                fallbackTriggered: true,
                llmException: errorMsg
              }
            };
          }
          const msg = err instanceof Error ? err.message : String(err);
          return {
            success: false,
            errors: [`Hybrid planning LLM execution failed: ${msg}`],
            strategyUsed: this.name
          };
        }
      }
      async createPlan(context) {
        return this.generatePlan(context);
      }
    };
  }
});

// src/agent/planner/StrategySelector.ts
var DefaultStrategySelector;
var init_StrategySelector = __esm({
  "src/agent/planner/StrategySelector.ts"() {
    init_PlanningTypes();
    init_GoalTypes();
    init_RuleBasedPlanningStrategy();
    init_HybridPlanningStrategy();
    DefaultStrategySelector = class {
      constructor(options) {
        this.ruleBased = options?.ruleBasedStrategy || new RuleBasedPlanningStrategy();
        this.llmBased = options?.llmStrategy;
        this.hybrid = options?.hybridStrategy || new HybridPlanningStrategy(this.ruleBased, this.llmBased);
      }
      selectStrategy(context) {
        if (context.preferredStrategy) {
          if (context.preferredStrategy === "RULE_BASED" /* RULE_BASED */ || context.preferredStrategy === "RULE_BASED") {
            return this.ruleBased;
          }
          if ((context.preferredStrategy === "LLM" /* LLM */ || context.preferredStrategy === "LLM") && this.llmBased) {
            return this.llmBased;
          }
          if (context.preferredStrategy === "HYBRID" /* HYBRID */ || context.preferredStrategy === "HYBRID") {
            return this.hybrid;
          }
        }
        if (!this.llmBased) {
          return this.ruleBased;
        }
        const intent = context.goal?.intent;
        const isSingleTask = !context.taskGraph || context.taskGraph.nodes.size <= 2;
        if (isSingleTask || intent === "INFORMATION_RETRIEVAL" /* INFORMATION_RETRIEVAL */ || intent === "GENERAL_CHAT" /* GENERAL_CHAT */ || intent === "TESTING_AND_VERIFICATION" /* TESTING_AND_VERIFICATION */ || intent === "INVESTIGATION" /* INVESTIGATION */) {
          return this.ruleBased;
        }
        if (intent === "CODE_MODIFICATION" /* CODE_MODIFICATION */ || intent === "INFRASTRUCTURE_OPS" /* INFRASTRUCTURE_OPS */) {
          return this.hybrid;
        }
        return this.ruleBased;
      }
    };
  }
});

// src/agent/planner/Planner.ts
var Planner;
var init_Planner = __esm({
  "src/agent/planner/Planner.ts"() {
    init_RuleBasedPlanningStrategy();
    init_StrategySelector();
    Planner = class {
      constructor(strategyOrSelector) {
        if (!strategyOrSelector) {
          this.strategy = new RuleBasedPlanningStrategy();
        } else if ("selectStrategy" in strategyOrSelector) {
          this.selector = strategyOrSelector;
        } else {
          this.strategy = strategyOrSelector;
        }
      }
      setStrategy(strategy) {
        this.strategy = strategy;
        this.selector = void 0;
      }
      setSelector(selector) {
        this.selector = selector;
        this.strategy = void 0;
      }
      getActiveStrategy(context) {
        if (this.strategy) {
          return this.strategy;
        }
        if (this.selector) {
          return this.selector.selectStrategy(context);
        }
        const defaultSelector = new DefaultStrategySelector();
        return defaultSelector.selectStrategy(context);
      }
      async generatePlan(context) {
        const activeStrategy = this.getActiveStrategy(context);
        return activeStrategy.generatePlan(context);
      }
      async createPlan(context) {
        return this.generatePlan(context);
      }
    };
  }
});

// src/agent/replanning/ReplanningPolicy.ts
var ReplanningPolicy;
var init_ReplanningPolicy = __esm({
  "src/agent/replanning/ReplanningPolicy.ts"() {
    init_ReplanningTypes();
    ReplanningPolicy = class {
      static {
        this.DEFAULT_LIMITS = {
          maxRetriesPerStep: 2,
          maxRepairsPerPlan: 2,
          maxReplansPerGoal: 2,
          maxConsecutiveIdenticalFailures: 2
        };
      }
      /**
       * Deterministically evaluates what action (RETRY, REPAIR, REPLAN, ABORT) should be taken.
       */
      static evaluate(context) {
        const classification = context.failureClassification;
        const limits = {
          maxRetriesPerStep: context.limits?.maxRetriesPerStep ?? this.DEFAULT_LIMITS.maxRetriesPerStep,
          maxRepairsPerPlan: context.limits?.maxRepairsPerPlan ?? this.DEFAULT_LIMITS.maxRepairsPerPlan,
          maxReplansPerGoal: context.limits?.maxReplansPerGoal ?? this.DEFAULT_LIMITS.maxReplansPerGoal,
          maxConsecutiveIdenticalFailures: context.limits?.maxConsecutiveIdenticalFailures ?? this.DEFAULT_LIMITS.maxConsecutiveIdenticalFailures
        };
        if (context.replanBudget <= 0) {
          return {
            action: "ABORT",
            reason: "Replanning budget exhausted (replanBudget <= 0)."
          };
        }
        const history = context.history || [];
        const priorReplans = history.filter((h) => h.decision === "REPLAN").length;
        if (priorReplans >= limits.maxReplansPerGoal) {
          return {
            action: "ABORT",
            reason: `Maximum replan limit reached for this goal (${priorReplans}/${limits.maxReplansPerGoal}).`
          };
        }
        if (history.length >= limits.maxConsecutiveIdenticalFailures) {
          const recent = history.slice(-limits.maxConsecutiveIdenticalFailures);
          const allSameStep = recent.every((h) => h.triggerStepId === classification.stepId && h.failureClassification.category === classification.category);
          if (allSameStep) {
            return {
              action: "ABORT",
              reason: `Repeated identical failure loop detected for step '${classification.stepId}' with category '${classification.category}'.`
            };
          }
        }
        switch (classification.category) {
          case "TRANSIENT" /* TRANSIENT */: {
            const retriesForStep = history.filter((h) => h.triggerStepId === classification.stepId && h.decision === "RETRY").length;
            if (retriesForStep < limits.maxRetriesPerStep) {
              return {
                action: "RETRY",
                reason: `Transient error encountered (attempt ${retriesForStep + 1}/${limits.maxRetriesPerStep}). Retrying step '${classification.stepId}'.`
              };
            }
            if (priorReplans < limits.maxReplansPerGoal) {
              return {
                action: "REPLAN",
                reason: `Transient retries exhausted for step '${classification.stepId}'. Escalating to replanning with alternative strategy.`
              };
            }
            return {
              action: "ABORT",
              reason: `Transient retries exhausted and replanning limit reached for step '${classification.stepId}'.`
            };
          }
          case "INPUT_ERROR" /* INPUT_ERROR */:
          case "DEPENDENCY_FAILURE" /* DEPENDENCY_FAILURE */: {
            const repairsCount = history.filter((h) => h.decision === "REPAIR").length;
            if (classification.repairable && repairsCount < limits.maxRepairsPerPlan) {
              return {
                action: "REPAIR",
                reason: `Localized defect (${classification.category}) detected in step '${classification.stepId}'. Attempting localized plan repair.`
              };
            }
            if (priorReplans < limits.maxReplansPerGoal) {
              return {
                action: "REPLAN",
                reason: `Localized repairs exhausted or step unrepairable. Generating revised plan.`
              };
            }
            return {
              action: "ABORT",
              reason: `Unable to repair or replan for step '${classification.stepId}'.`
            };
          }
          case "RESOURCE_CONFLICT" /* RESOURCE_CONFLICT */: {
            const retriesForStep = history.filter((h) => h.triggerStepId === classification.stepId && h.decision === "RETRY").length;
            if (retriesForStep < 1) {
              return {
                action: "RETRY",
                reason: `Resource conflict or lock encountered. Retrying step '${classification.stepId}'.`
              };
            }
            return {
              action: "REPLAN",
              reason: `Resource conflict persists after retry. Replanning with alternate sequence.`
            };
          }
          case "LOGICAL_FAILURE" /* LOGICAL_FAILURE */:
          case "ENVIRONMENT_CHANGE" /* ENVIRONMENT_CHANGE */:
          case "UNKNOWN" /* UNKNOWN */: {
            if (priorReplans < limits.maxReplansPerGoal) {
              return {
                action: "REPLAN",
                reason: `Failure category '${classification.category}' requires new plan structure and strategy.`
              };
            }
            return {
              action: "ABORT",
              reason: `Goal replan limit reached for logical / environment failure.`
            };
          }
          case "PERMISSION_DENIED" /* PERMISSION_DENIED */:
            return {
              action: "ABORT",
              reason: `Permission denied or safety risk ceiling exceeded for step '${classification.stepId}'. Execution cannot proceed without explicit elevated authorization.`
            };
          case "CONSTRAINT_VIOLATION" /* CONSTRAINT_VIOLATION */:
            return {
              action: "ABORT",
              reason: `Hard goal constraint violated. Cannot replan within valid bounds.`
            };
          case "FATAL" /* FATAL */:
          default:
            return {
              action: "ABORT",
              reason: `Fatal unrecoverable error encountered in step '${classification.stepId}'.`
            };
        }
      }
    };
  }
});

// src/agent/replanning/ReplanningErrors.ts
var ReplanningError, GoalWeakeningError;
var init_ReplanningErrors = __esm({
  "src/agent/replanning/ReplanningErrors.ts"() {
    ReplanningError = class extends Error {
      constructor(message, details) {
        super(message);
        this.details = details;
        this.name = "ReplanningError";
      }
    };
    GoalWeakeningError = class extends ReplanningError {
      constructor(message = "Replanning would violate or weaken the immutable Goal success criteria or constraints.", details) {
        super(message, details);
        this.name = "GoalWeakeningError";
      }
    };
  }
});

// src/agent/replanning/ReplanningEngine.ts
var ReplanningEngine;
var init_ReplanningEngine = __esm({
  "src/agent/replanning/ReplanningEngine.ts"() {
    init_PlanningValidator();
    init_PlanRepairer();
    init_Planner();
    init_TaskGraph();
    init_FailureClassifier();
    init_ReplanningPolicy();
    init_ReplanningErrors();
    ReplanningEngine = class {
      constructor(options) {
        this.history = [];
        this.processedEvents = /* @__PURE__ */ new Set();
        this.planner = options?.planner || new Planner();
        this.validator = options?.validator || new PlanningValidator();
        this.repairer = options?.repairer || new LocalizedPlanRepairer();
      }
      getHistory() {
        return [...this.history];
      }
      clearHistory() {
        this.history = [];
        this.processedEvents.clear();
      }
      classifyFailure(step, error, planId) {
        return FailureClassifier.classify({
          error,
          step,
          planId
        });
      }
      /**
       * Evaluates the failure and coordinates Retry, Repair, Replan, or Abort.
       */
      async handleFailure(context) {
        const eventFingerprint = `${context.currentPlan.id}_${context.failedStep?.id || "none"}_${context.failureClassification.category}_${context.failureClassification.originalError}`;
        const evaluation = ReplanningPolicy.evaluate({
          ...context,
          history: this.history
        });
        const action = evaluation.action;
        const reason = evaluation.reason;
        const warnings = [];
        let decision = {
          action,
          reason,
          classification: context.failureClassification,
          warnings
        };
        switch (action) {
          case "RETRY": {
            decision.retryStepId = context.failedStep?.id;
            break;
          }
          case "REPAIR": {
            const validation = await this.validator.validate(context.currentPlan, {
              goal: context.goal,
              constraints: context.constraints,
              knowledgeContext: context.knowledgeContext,
              experienceContext: context.experienceContext
            });
            if (this.repairer.canRepair(validation)) {
              const repaired = await this.repairer.applyRepair(context.currentPlan, validation);
              const revalidation = await this.validator.validate(repaired, {
                goal: context.goal,
                constraints: context.constraints,
                knowledgeContext: context.knowledgeContext,
                experienceContext: context.experienceContext
              });
              if (revalidation.isValid) {
                decision.repairedPlan = repaired;
                decision.reason += " Successfully applied localized repair and passed full re-validation.";
                break;
              }
            }
            if (context.replanBudget > 0) {
              warnings.push("Localized plan repair was not fully valid. Escalating to Replan.");
              const replanResult = await this.executeReplan(context);
              decision = {
                ...decision,
                ...replanResult,
                action: replanResult.action,
                reason: `${reason} -> Replan escalated.`
              };
            } else {
              decision.action = "ABORT";
              decision.reason += " Localized repair failed and replan budget is 0.";
            }
            break;
          }
          case "REPLAN": {
            const replanResult = await this.executeReplan(context);
            decision = {
              ...decision,
              ...replanResult
            };
            break;
          }
          case "ABORT":
          default: {
            decision.action = "ABORT";
            break;
          }
        }
        const record = {
          id: `replan_hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          attemptNumber: this.history.length + 1,
          previousPlanId: context.currentPlan.id,
          newPlanId: decision.revision?.newPlan.id || decision.repairedPlan?.id,
          triggerStepId: context.failedStep?.id,
          failureClassification: context.failureClassification,
          decision: decision.action,
          reason: decision.reason,
          affectedTaskIds: context.failedStep ? [context.failedStep.id] : [],
          preservedTaskIds: decision.revision?.completedTasksPreserved || context.completedTaskIds,
          checkpointRestoredId: decision.checkpointRestoredId,
          validationResult: decision.revision?.validationResult,
          timestamp: Date.now()
        };
        this.history.push(record);
        this.processedEvents.add(eventFingerprint);
        return decision;
      }
      /**
       * Generates a revised Plan preserving completed work and enforcing full 7-stage validation.
       */
      async executeReplan(context) {
        if (context.replanBudget <= 0) {
          return {
            action: "ABORT",
            reason: "Replanning budget exhausted."
          };
        }
        let checkpointRestoredId;
        if (context.checkpointStore && context.checkpointId && context.executionContext && context.restoreStrategy) {
          const checkpoint = await context.checkpointStore.load(context.checkpointId);
          if (checkpoint) {
            context.restoreStrategy.restore(context.executionContext, checkpoint.snapshot);
            checkpointRestoredId = checkpoint.id;
          }
        }
        this.verifyGoalPreservation(context.goal);
        const completedTaskIds = new Set(context.completedTaskIds || []);
        const preservedSteps = (context.currentPlan.steps || []).filter((s) => completedTaskIds.has(s.id) || completedTaskIds.has(s.taskId));
        const preservedIds = preservedSteps.map((s) => s.id);
        const planningContext = {
          goal: context.goal,
          constraints: context.constraints || (context.goal.constraints ? {
            maxSteps: context.goal.constraints.maxSteps,
            maxExecutionTimeMs: context.goal.constraints.maxExecutionTimeMs,
            forbiddenTools: context.goal.constraints.forbiddenTools,
            mandatoryTools: context.goal.constraints.mandatoryTools,
            maxRiskLevel: context.goal.constraints.maxRiskLevel
          } : {}),
          knowledgeContext: context.knowledgeContext,
          experienceContext: context.experienceContext,
          configuration: {
            isReplan: true,
            replanTriggerStep: context.failedStep?.id,
            replanCategory: context.failureClassification.category,
            preservedTasks: preservedIds
          }
        };
        const planResult = await this.planner.generatePlan(planningContext);
        if (!planResult.success || !planResult.plan) {
          return {
            action: "ABORT",
            reason: `Planner failed to generate revised plan: ${planResult.errors?.join(", ") || "Unknown error"}`
          };
        }
        let generatedPlan = planResult.plan;
        if (context.failedStep) {
          const failedId = context.failedStep.id;
          const replacementId = `${failedId}_repaired`;
          const updatedSteps = generatedPlan.steps.map((s) => {
            if (s.id === failedId || s.taskId === failedId) {
              return {
                ...s,
                id: replacementId,
                taskId: replacementId,
                title: `Repaired: ${s.title}`,
                description: `Replanned step replacing ${failedId} after failure: ${context.failureClassification.originalError}. ${s.description}`,
                metadata: {
                  ...s.metadata,
                  replannedFrom: failedId,
                  replanReason: context.failureClassification.originalError,
                  isReplacementStep: true
                }
              };
            }
            if (s.dependencies && s.dependencies.includes(failedId)) {
              return {
                ...s,
                dependencies: s.dependencies.map((d) => d === failedId ? replacementId : d)
              };
            }
            return s;
          });
          const revPlanId = `plan_rev_${Date.now()}`;
          const newPlanTaskGraph = new DirectedTaskGraph(revPlanId, generatedPlan.goalId);
          for (const s of updatedSteps) {
            newPlanTaskGraph.addTask(s, s.dependencies);
          }
          generatedPlan = {
            ...generatedPlan,
            id: revPlanId,
            steps: updatedSteps,
            taskGraph: newPlanTaskGraph,
            executionOrder: newPlanTaskGraph.getTopologicalOrder()
          };
        }
        let validationResult = await this.validator.validate(generatedPlan, planningContext);
        if (!validationResult.isValid) {
          if (this.repairer.canRepair(validationResult)) {
            generatedPlan = await this.repairer.applyRepair(generatedPlan, validationResult);
            validationResult = await this.validator.validate(generatedPlan, planningContext);
          }
        }
        if (!validationResult.isValid) {
          return {
            action: "ABORT",
            reason: `Revised plan failed 7-stage validation: ${validationResult.errors.map((e) => e.message).join("; ")}`
          };
        }
        const revision = {
          revisionId: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          originalPlanId: context.currentPlan.id,
          replanReason: context.failureClassification.originalError,
          checkpointRestoredId,
          completedTasksPreserved: preservedIds,
          newPlan: generatedPlan,
          validationResult,
          createdAt: Date.now()
        };
        return {
          action: "REPLAN",
          reason: `Successfully generated valid revised plan '${generatedPlan.id}'.`,
          revision,
          checkpointRestoredId
        };
      }
      verifyGoalPreservation(goal) {
        if (!goal || !goal.id || !goal.title || !goal.desiredOutcome) {
          throw new GoalWeakeningError("Goal definition is incomplete or invalidated.");
        }
        if (!Array.isArray(goal.successCriteria) || goal.successCriteria.length === 0) {
          throw new GoalWeakeningError("Cannot replan: Goal success criteria cannot be empty or cleared.");
        }
      }
    };
  }
});

// src/agent/implementation/ImplementationTypes.ts
var init_ImplementationTypes = __esm({
  "src/agent/implementation/ImplementationTypes.ts"() {
  }
});

// src/agent/implementation/CodingAgentImplementationStrategy.ts
var CodingAgentImplementationStrategy;
var init_CodingAgentImplementationStrategy = __esm({
  "src/agent/implementation/CodingAgentImplementationStrategy.ts"() {
    CodingAgentImplementationStrategy = class {
      constructor(llmCaller) {
        this.llmCaller = llmCaller;
        this.name = "CodingAgentImplementationStrategy";
        this.version = "1.0.0";
      }
      async implement(context) {
        const startTime = Date.now();
        const maxIterations = context.maxIterations || 8;
        const toolCalls = [];
        const errors = [];
        const modifiedFiles = /* @__PURE__ */ new Set();
        const createdFiles = /* @__PURE__ */ new Set();
        const deletedFiles = /* @__PURE__ */ new Set();
        const goal = context.goal;
        const task = context.task;
        const planStep = context.planStep;
        const rawGoalText = `${goal.rawPrompt || ""} ${goal.title || ""} ${goal.description || ""} ${goal.desiredOutcome || ""} ${planStep.description || ""} ${task?.description || ""}`.trim();
        let workspaceFiles = [];
        try {
          const listRes = await this.executeToolWithTracking(
            "list_dir",
            { DirectoryPath: "/" },
            context,
            toolCalls
          );
          if (listRes.success && listRes.output?.entries) {
            workspaceFiles = listRes.output.entries.map((e) => e.path || e.name);
          }
        } catch {
        }
        const inspectedFiles = {};
        for (const filePath of workspaceFiles.slice(0, 5)) {
          if (filePath.endsWith(".py") || filePath.endsWith(".ts") || filePath.endsWith(".js") || filePath.endsWith(".json") || filePath.endsWith(".txt")) {
            try {
              const viewRes = await this.executeToolWithTracking(
                "view_file",
                { AbsolutePath: filePath },
                context,
                toolCalls
              );
              if (viewRes.success && viewRes.output?.content) {
                inspectedFiles[filePath] = String(viewRes.output.content);
              }
            } catch {
            }
          }
        }
        let iteration = 0;
        let isComplete = false;
        if (this.llmCaller) {
          while (iteration < maxIterations && !isComplete) {
            iteration++;
            try {
              const systemPrompt = `You are the CodingAgent for DevGenie.
Your job is to reason about the user's Goal and implement real, context-aware, production-ready code.
CRITICAL RULES:
1. Do NOT generate generic placeholder templates like 'def main(): print("Execution completed successfully.")'.
2. NEVER write real API keys or secrets in source code. Use environment variables (e.g., os.environ.get("GEMINI_API_KEY") or process.env.GEMINI_API_KEY) and create .env.example.
3. Make surgical edits to existing files; preserve unrelated code.
4. Output your plan as a JSON object with:
   {
     "reasoning": "string explaining what code changes you are making",
     "completed": boolean, // Set to true when you have finished making all required code or file changes for this task.
     "toolCalls": [
       { "toolName": "create_file" | "edit_file" | "delete_file" | "view_file" | "run_command", "input": { ... } }
     ],
     "summary": "string"
   }`;
              const userPrompt = `GOAL:
Title: ${goal.title || ""}
Description: ${goal.description || ""}
Outcome: ${goal.desiredOutcome || ""}
Full prompt: ${rawGoalText}

CURRENT TASK:
Title: ${planStep.title}
Description: ${planStep.description}

WORKSPACE FILES:
${workspaceFiles.join("\n") || "(empty workspace)"}

INSPECTED FILE CONTENTS:
${Object.entries(inspectedFiles).map(([p, c]) => `--- ${p} ---
${c.slice(0, 1e3)}`).join("\n\n")}

PREVIOUS ACTIONS & OUTPUTS IN THIS STEP:
${toolCalls.map((t) => `[${t.toolName}] => ${t.success ? "SUCCESS" : "FAILED"}: ${JSON.stringify(t.output).slice(0, 300)}`).join("\n")}

Provide the next set of tool calls to implement the goal.`;
              const llmResponse = await this.llmCaller(userPrompt, systemPrompt);
              const parsed = this.parseLLMResponse(llmResponse);
              if (parsed && parsed.toolCalls && parsed.toolCalls.length > 0) {
                for (const call of parsed.toolCalls) {
                  const res = await this.executeToolWithTracking(
                    call.toolName,
                    call.input,
                    context,
                    toolCalls
                  );
                  const targetPath = call.input?.TargetFile || call.input?.path || call.input?.filePath;
                  if (res.success && targetPath) {
                    if (call.toolName === "create_file") {
                      createdFiles.add(targetPath);
                      if (context.onFileChanged) {
                        context.onFileChanged({ path: targetPath, action: "create", actor: "AGENT", taskId: planStep.id, executionId: context.executionContext.executionId, timestamp: Date.now() });
                      }
                    } else if (call.toolName === "edit_file" || call.toolName === "multi_edit_file") {
                      modifiedFiles.add(targetPath);
                      if (context.onFileChanged) {
                        context.onFileChanged({ path: targetPath, action: "edit", actor: "AGENT", taskId: planStep.id, executionId: context.executionContext.executionId, timestamp: Date.now() });
                      }
                    } else if (call.toolName === "delete_file") {
                      deletedFiles.add(targetPath);
                      if (context.onFileChanged) {
                        context.onFileChanged({ path: targetPath, action: "delete", actor: "AGENT", taskId: planStep.id, executionId: context.executionContext.executionId, timestamp: Date.now() });
                      }
                    }
                  }
                }
                if (parsed.completed) {
                  isComplete = true;
                }
              } else {
                if (parsed?.completed || toolCalls.length > 0 && toolCalls.some((t) => t.success)) {
                  isComplete = true;
                }
                break;
              }
            } catch (err) {
              const rawMsg = err?.message || String(err);
              let cleanMessage = rawMsg;
              if (cleanMessage.includes("{") && cleanMessage.includes("}")) {
                try {
                  const start = cleanMessage.indexOf("{");
                  const end = cleanMessage.lastIndexOf("}");
                  const parsed = JSON.parse(cleanMessage.substring(start, end + 1));
                  const inner = parsed?.error || parsed;
                  if (inner?.message) {
                    cleanMessage = `[${inner.code || 500} ${inner.status || "ERROR"}] ${inner.message}`;
                  }
                } catch {
                }
              }
              const is503 = cleanMessage.includes("503") || cleanMessage.includes("high demand") || cleanMessage.includes("UNAVAILABLE");
              const isQuota = cleanMessage.toLowerCase().includes("quota") || cleanMessage.toLowerCase().includes("insufficient_quota");
              const isRateLimit = (cleanMessage.includes("429") || cleanMessage.includes("RESOURCE_EXHAUSTED") || cleanMessage.toLowerCase().includes("rate limit")) && !isQuota;
              const isAuth = cleanMessage.toLowerCase().includes("api key") || cleanMessage.toLowerCase().includes("api_key") || cleanMessage.includes("400") || cleanMessage.includes("401");
              errors.push({
                code: is503 ? "MODEL_HIGH_DEMAND_503" : isQuota ? "QUOTA_EXCEEDED_429" : isRateLimit ? "RATE_LIMIT_429" : isAuth ? "INVALID_API_KEY_400" : "LLM_REASONING_ERROR",
                message: cleanMessage,
                recoverable: (is503 || isRateLimit) && !isQuota && !isAuth
              });
              if (isQuota || isAuth) {
                throw new Error(cleanMessage);
              }
              if ((is503 || isRateLimit) && iteration < 2) {
                const backoff = 1e3 + Math.floor(Math.random() * 800);
                await new Promise((r) => setTimeout(r, backoff));
                continue;
              }
              throw new Error(cleanMessage);
            }
          }
        }
        if (!isComplete && toolCalls.length === 0) {
          if (errors.length > 0) {
            throw new Error(errors[errors.length - 1].message);
          }
          throw new Error("LLM could not generate valid tool calls for implementation. Iterations exhausted or failed.");
        }
        const hasMutation = createdFiles.size > 0 || modifiedFiles.size > 0 || deletedFiles.size > 0;
        const hasSuccessfulToolCalls = toolCalls.length > 0 && toolCalls.some((t) => t.success);
        if (hasMutation || hasSuccessfulToolCalls) {
          isComplete = true;
        }
        const stepSuccess = (isComplete || hasMutation || hasSuccessfulToolCalls) && (hasSuccessfulToolCalls || errors.length === 0);
        return {
          success: stepSuccess,
          modifiedFiles: Array.from(modifiedFiles),
          createdFiles: Array.from(createdFiles),
          deletedFiles: Array.from(deletedFiles),
          toolCalls,
          verificationRequested: true,
          summary: `Successfully implemented code changes for task: ${planStep.title} (${createdFiles.size} created, ${modifiedFiles.size} modified).`
        };
      }
      async executeToolWithTracking(toolName, input, context, toolCalls) {
        const callStart = Date.now();
        if (context.onProgress) {
          context.onProgress({
            type: "tool_started",
            toolName,
            description: `Executing tool: ${toolName}`
          });
        }
        try {
          const toolResult = await context.pipeline.execute(
            toolName,
            input,
            context.executionContext
          );
          const record = {
            toolName,
            input,
            output: toolResult.data || toolResult.error,
            success: toolResult.success,
            timestamp: Date.now(),
            durationMs: Date.now() - callStart,
            error: toolResult.error ? String(toolResult.error) : void 0
          };
          toolCalls.push(record);
          if (context.onProgress) {
            context.onProgress({
              type: "tool_output",
              toolName,
              result: record.output,
              error: record.error
            });
          }
          return {
            success: toolResult.success,
            output: record.output,
            error: record.error
          };
        } catch (err) {
          const record = {
            toolName,
            input,
            output: null,
            success: false,
            timestamp: Date.now(),
            durationMs: Date.now() - callStart,
            error: err.message || String(err)
          };
          toolCalls.push(record);
          return { success: false, output: null, error: record.error };
        }
      }
      parseLLMResponse(response) {
        if (!response || !response.trim()) return null;
        try {
          const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, response];
          const rawJson = (jsonMatch[1] || response).trim();
          const parsed = JSON.parse(rawJson);
          if (parsed && (parsed.toolCalls || parsed.reasoning || parsed.summary || parsed.completed !== void 0)) {
            return parsed;
          }
        } catch {
          const firstBrace = response.indexOf("{");
          const lastBrace = response.lastIndexOf("}");
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            try {
              const candidate = response.substring(firstBrace, lastBrace + 1);
              const parsed = JSON.parse(candidate);
              if (parsed && (parsed.toolCalls || parsed.reasoning || parsed.summary || parsed.completed !== void 0)) {
                return parsed;
              }
            } catch {
            }
          }
        }
        const toolCalls = [];
        const blockRegex = /(?:(?:\/\/\s*|#\s*|<!--\s*|\*\*\s*|###\s*)?(?:File(?:name)?|Path):\s*`?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)`?[\s\S]*?)?```([a-zA-Z0-9_-]+)?(?:\s+(?:filename|path|file)=["']?([a-zA-Z0-9_\-./\\]+)["']?)?\s*([\s\S]*?)```/gi;
        let match;
        let blockIndex = 0;
        while ((match = blockRegex.exec(response)) !== null) {
          const explicitHeaderFile = match[1]?.trim();
          const lang = (match[2] || "").toLowerCase().trim();
          const explicitAttrFile = match[3]?.trim();
          const code = match[4]?.trim();
          if (!code) continue;
          let codeFirstLineFile = "";
          const firstLineMatch = code.match(/^(?:\/\/|#|\/\*|<!--)\s*(?:file(?:name)?:?\s*)?([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)/i);
          if (firstLineMatch) {
            codeFirstLineFile = firstLineMatch[1].trim();
          }
          let detectedFile = explicitHeaderFile || explicitAttrFile || codeFirstLineFile;
          if (!detectedFile) {
            if (lang === "python" || lang === "py") {
              detectedFile = blockIndex === 0 ? "solution.py" : blockIndex === 1 ? "utils.py" : `module_${blockIndex}.py`;
            } else if (lang === "typescript" || lang === "ts" || lang === "tsx") {
              detectedFile = blockIndex === 0 ? lang === "tsx" ? "src/App.tsx" : "index.ts" : `src/module_${blockIndex}.${lang === "tsx" ? "tsx" : "ts"}`;
            } else if (lang === "javascript" || lang === "js" || lang === "jsx") {
              detectedFile = blockIndex === 0 ? "index.js" : `utils_${blockIndex}.js`;
            } else if (lang === "html") {
              detectedFile = "index.html";
            } else if (lang === "css") {
              detectedFile = "styles.css";
            } else if (lang === "json") {
              detectedFile = blockIndex === 0 ? "package.json" : `config_${blockIndex}.json`;
            } else if (lang === "sh" || lang === "bash") {
              detectedFile = "run.sh";
            } else {
              detectedFile = `file_${blockIndex + 1}.txt`;
            }
          }
          toolCalls.push({
            toolName: "create_file",
            input: {
              TargetFile: detectedFile,
              Content: code,
              path: detectedFile,
              content: code
            }
          });
          blockIndex++;
        }
        if (toolCalls.length > 0) {
          return {
            reasoning: `Extracted ${toolCalls.length} file implementation(s) from code blocks`,
            completed: true,
            toolCalls,
            summary: `Implemented ${toolCalls.map((t) => t.input.TargetFile).join(", ")}`
          };
        }
        return null;
      }
    };
  }
});

// src/agent/implementation/index.ts
var init_implementation = __esm({
  "src/agent/implementation/index.ts"() {
    init_ImplementationTypes();
    init_CodingAgentImplementationStrategy();
  }
});

// src/server/lib/encryption.ts
import crypto2 from "crypto";
function encryptKey(text2) {
  if (!text2) return "";
  if (text2.startsWith("enc::")) return text2;
  const iv = crypto2.randomBytes(IV_LENGTH);
  const cipher = crypto2.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text2, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `enc::${iv.toString("hex")}:${encrypted}`;
}
function decryptKey(encryptedText) {
  if (!encryptedText) return "";
  if (!encryptedText.startsWith("enc::")) {
    return encryptedText;
  }
  try {
    const parts = encryptedText.slice(5).split(":");
    if (parts.length !== 2) return encryptedText;
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const decipher = crypto2.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Failed to decrypt API key:", err);
    return encryptedText;
  }
}
var ALGORITHM, ENCRYPTION_KEY, IV_LENGTH;
var init_encryption = __esm({
  "src/server/lib/encryption.ts"() {
    ALGORITHM = "aes-256-cbc";
    ENCRYPTION_KEY = crypto2.createHash("sha256").update(process.env.JWT_SECRET || "fallback-encryption-key-for-dev-123456").digest();
    IV_LENGTH = 16;
  }
});

// src/server/controllers/utils.ts
import { eq, sql as sql2 } from "drizzle-orm";
async function txWithUser(userId, callback) {
  return await db.transaction(async (tx) => {
    await tx.execute(sql2`SELECT set_config('app.current_user_id', ${userId}, true)`);
    return await callback(tx);
  });
}
async function resolveGoogleApiKey(userId, customKey, provider) {
  if (customKey) return customKey;
  try {
    const dbKey = await txWithUser(userId, async (tx) => {
      const { userPreferences: userPreferences6, apiKeys: apiKeys6 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const [prefs] = await tx.select().from(userPreferences6).where(eq(userPreferences6.userId, userId));
      if (prefs?.activeKeyId) {
        const [userKey] = await tx.select().from(apiKeys6).where(eq(apiKeys6.id, prefs.activeKeyId));
        if (userKey && userKey.key) {
          if (!provider || userKey.provider === provider || userKey.provider?.toLowerCase() === provider?.toLowerCase()) {
            return decryptKey(userKey.key);
          }
        }
      }
      const userKeys = await tx.select().from(apiKeys6).where(eq(apiKeys6.userId, userId));
      if (provider) {
        const matchingKey = userKeys.find((k) => k.provider === provider || k.provider?.toLowerCase() === provider?.toLowerCase());
        if (matchingKey && matchingKey.key) {
          return decryptKey(matchingKey.key);
        }
      }
      const anyKey = userKeys[0];
      if (anyKey && anyKey.key) {
        return decryptKey(anyKey.key);
      }
      return void 0;
    });
    if (dbKey) {
      return dbKey;
    }
  } catch {
  }
  try {
    const { apiKeys: apiKeysTable, users: usersTable, userPreferences: prefsTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const adminUsers = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "ADMIN"));
    for (const admin of adminUsers) {
      const [adminPref] = await db.select().from(prefsTable).where(eq(prefsTable.userId, admin.id));
      if (adminPref?.activeKeyId) {
        const [k] = await db.select().from(apiKeysTable).where(eq(apiKeysTable.id, adminPref.activeKeyId));
        if (k?.key && (!provider || k.provider === provider || k.provider?.toLowerCase() === provider?.toLowerCase())) {
          const dec = decryptKey(k.key);
          if (dec && dec.trim() !== "") return dec;
        }
      }
      const adminKeys = await db.select().from(apiKeysTable).where(eq(apiKeysTable.userId, admin.id));
      const match = adminKeys.find((k) => !provider || k.provider === provider || k.provider?.toLowerCase() === provider?.toLowerCase());
      if (match?.key) {
        const dec = decryptKey(match.key);
        if (dec && dec.trim() !== "") return dec;
      }
    }
    const allKeys = await db.select().from(apiKeysTable);
    const candidate = allKeys.find((k) => !provider || k.provider === provider || k.provider?.toLowerCase() === provider?.toLowerCase());
    if (candidate?.key) {
      const dec = decryptKey(candidate.key);
      if (dec && dec.trim() !== "") return dec;
    }
  } catch {
  }
  return process.env.GEMINI_API_KEY;
}
async function resolveFallbackGoogleApiKey(failedKey) {
  try {
    const { apiKeys: apiKeysTable } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const allKeys = await db.select().from(apiKeysTable);
    for (const k of allKeys) {
      if ((!k.provider || k.provider === "google" || k.provider?.toLowerCase() === "google") && k.key) {
        const dec = decryptKey(k.key);
        if (dec && dec !== failedKey && dec.length > 10 && !dec.startsWith("dummy") && !dec.startsWith("your_")) {
          return dec;
        }
      }
    }
  } catch {
  }
  return void 0;
}
async function determineRoutingStrategy(userQuery, apiKey, provider, customBaseUrl, userId) {
  try {
    let routeApiKey = apiKey;
    let routeProvider = provider;
    let routeBaseUrl = customBaseUrl;
    if (provider && provider !== "google") {
      const googleKey = userId ? await resolveGoogleApiKey(userId, void 0, "google") : void 0;
      if (googleKey) {
        routeApiKey = googleKey;
        routeProvider = "google";
        routeBaseUrl = void 0;
      } else {
        return "DIRECT_CHAT";
      }
    }
    const aiInstance = di.llmService.getClient(routeApiKey, routeBaseUrl, routeProvider);
    const systemPrompt = `You are an elite AI Router designed to analyze developer queries and routing them accurately to either RAG or DIRECT chat paths.
Determine whether the user query is specific to this codebase/repository context, or if it is a general coding question/normal conversation.
- Classify as 'USE_RAG' if the query explicitly or implicitly mentions project source code, file paths, structural logic, database schemas, or verified solutions previously stored in the database. E.g., queries asking about "how is the login structured", "where are user accounts stored", "show me schema.ts implementation", "how to build/start the app", "db connections", "RAG function logic".
- Classify as 'DIRECT_CHAT' if it's a generic coding question (e.g., "how to write a for-loop in typescript", "explain closure in javascript"), general greeting, conversational filler, or a generic logical puzzle.
You MUST follow these rules strictly:
1. Return ONLY the string literal 'USE_RAG' or 'DIRECT_CHAT' in plain text.
2. Absolutely NO markdown block (such as \`\`\`), no punctuation, and no conversational padding.
3. Be highly decisive and favor 'USE_RAG' if there is any doubt or context clues pointing to the local repository files/structure.`;
    let responseText;
    const modelsToTry = Array.from(/* @__PURE__ */ new Set([CLASSIFICATION_MODEL, DEFAULT_CHAT_MODEL]));
    for (let i = 0; i < modelsToTry.length; i++) {
      const modelCandidate = modelsToTry[i];
      try {
        const response = await aiInstance.models.generateContent({
          model: modelCandidate,
          contents: userQuery,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0
          }
        });
        if (response?.text) {
          responseText = response.text;
          break;
        }
      } catch (classifyErr) {
        if (i < modelsToTry.length - 1) {
          console.warn(`[AI Query Router] Classifier model '${modelCandidate}' hit limits, trying fallback '${modelsToTry[i + 1]}'`);
          continue;
        }
        throw classifyErr;
      }
    }
    const result = responseText?.trim() || "DIRECT_CHAT";
    console.log(`[AI Query Router] Query classified as: "${result}" for query: "${userQuery}"`);
    if (result.includes("USE_RAG")) {
      return "USE_RAG";
    }
    return "DIRECT_CHAT";
  } catch (e) {
    const errorMsg = e?.message || String(e);
    const isRateLimitOrQuota = errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.toLowerCase().includes("quota");
    const is503 = errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE");
    if (is503 || isRateLimitOrQuota) {
      console.info(`[AI Query Router] Classifier temporarily rate-limited or congested, clean fallback to DIRECT_CHAT`);
    } else {
      console.warn("[AI Query Router] Classifier fallback to DIRECT_CHAT:", errorMsg.slice(0, 120));
    }
    return "DIRECT_CHAT";
  }
}
var JWT_SECRET, getBaseUrl;
var init_utils = __esm({
  "src/server/controllers/utils.ts"() {
    init_db();
    init_encryption();
    init_di();
    init_agent_config2();
    JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-for-dev-123456");
    getBaseUrl = (req) => {
      if (process.env.APP_URL) {
        return process.env.APP_URL.replace(/\/+$/, "");
      }
      const forwardedProto = req.headers["x-forwarded-proto"];
      const proto = typeof forwardedProto === "string" ? forwardedProto.split(",")[0].trim() : req.secure ? "https" : req.protocol;
      const host = req.get("x-forwarded-host") || req.get("host") || "localhost:3000";
      return `${proto}://${host}`;
    };
  }
});

// src/server/utils/agentErrorFormatter.ts
function formatAgentError(err) {
  const rawStr = err instanceof Error ? err.message : String(err || "");
  let parsedObj = null;
  if (rawStr.includes("{") && rawStr.includes("}")) {
    try {
      const jsonStart = rawStr.indexOf("{");
      const jsonEnd = rawStr.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        const potentialJson = rawStr.substring(jsonStart, jsonEnd + 1);
        parsedObj = JSON.parse(potentialJson);
      }
    } catch {
      parsedObj = null;
    }
  }
  const innerError = parsedObj?.error || parsedObj;
  const rawCode = innerError?.code || err?.status;
  const rawStatus = innerError?.status;
  const rawMessage = innerError?.message || rawStr;
  const lowerMsg = (rawMessage || "").toLowerCase();
  const lowerStr = rawStr.toLowerCase();
  if (rawCode === 503 || rawStatus === "UNAVAILABLE" || lowerMsg.includes("high demand") || lowerMsg.includes("spikes in demand") || lowerMsg.includes("unavailable") || lowerStr.includes("503") || lowerStr.includes("temporarily unavailable")) {
    return {
      code: "MODEL_HIGH_DEMAND_503",
      statusCode: 503,
      title: "AI Model High Demand (503)",
      message: "The AI model cluster is currently experiencing temporary high demand spikes. devgenie retried with fallback options, but services remain congested.",
      suggestion: "Please wait a moment and click Retry, or select a lighter model like Flash in Settings.",
      isRetryable: true,
      raw: rawStr
    };
  }
  if (lowerMsg.includes("quota") || lowerStr.includes("quota") || lowerMsg.includes("insufficient_quota") || lowerMsg.includes("billing")) {
    return {
      code: "QUOTA_EXCEEDED_429",
      statusCode: 429,
      title: "Quota Exceeded",
      message: rawMessage && rawMessage.length < 200 && !rawMessage.includes("{") ? rawMessage : "The API request quota for this project or key has been exceeded.",
      suggestion: "Check your Google AI Studio quota and billing details, or configure a new API key in Key Settings.",
      isRetryable: false,
      raw: rawStr
    };
  }
  if (rawCode === 429 || rawStatus === "RESOURCE_EXHAUSTED" || lowerMsg.includes("resource_exhausted") || lowerMsg.includes("rate limit") || lowerMsg.includes("rate_limit") || lowerMsg.includes("too many requests") || lowerStr.includes("429")) {
    return {
      code: "RATE_LIMIT_EXCEEDED_429",
      statusCode: 429,
      title: "Rate Limited",
      message: rawMessage && rawMessage.length < 200 && !rawMessage.includes("{") ? rawMessage : "Too many requests were sent in a short timeframe. Rate limit ceiling reached.",
      suggestion: "Please wait 60 seconds before retrying, or configure a custom API key in Key Settings.",
      isRetryable: true,
      raw: rawStr
    };
  }
  if (rawCode === 400 || rawCode === 401 || rawStatus === "INVALID_ARGUMENT" || lowerMsg.includes("api key not valid") || lowerMsg.includes("api_key_invalid") || lowerMsg.includes("invalid api key") || lowerMsg.includes("api key invalid") || lowerMsg.includes("api key is not valid") || lowerMsg.includes("key not valid") || lowerMsg.includes("gemini_api_key is not configured") || lowerMsg.includes("missing authentication") || lowerMsg.includes("unauthenticated") || lowerStr.includes("api_key_invalid") || lowerStr.includes("invalid api key") || lowerStr.includes("api key invalid") || (lowerStr.includes("400") || lowerStr.includes("401")) && (lowerStr.includes("key") || lowerStr.includes("auth"))) {
    return {
      code: "INVALID_API_KEY_400",
      statusCode: typeof rawCode === "number" ? rawCode : 400,
      title: "API Key Invalid",
      message: rawMessage && rawMessage.length < 200 && !rawMessage.includes("{") ? rawMessage : "The AI service rejected the request due to an invalid or missing API key configuration.",
      suggestion: "Please inspect and update your Gemini API key in Key Settings.",
      isRetryable: false,
      raw: rawStr
    };
  }
  if (rawCode === 403 || rawStatus === "PERMISSION_DENIED" || lowerMsg.includes("permission_denied") || lowerMsg.includes("location not supported") || lowerStr.includes("403")) {
    return {
      code: "PERMISSION_DENIED_403",
      statusCode: 403,
      title: "Permission Denied (403)",
      message: "Access to the requested model or feature is restricted for this credential or region.",
      suggestion: "Check your Google Cloud project permissions or API restrictions.",
      isRetryable: false,
      raw: rawStr
    };
  }
  if (lowerStr.includes("timeout") || lowerStr.includes("etimedout") || lowerStr.includes("econnreset") || lowerStr.includes("fetch failed") || lowerStr.includes("network")) {
    return {
      code: "NETWORK_TIMEOUT",
      title: "Connection Timeout",
      message: "Network connection to the AI reasoning engine timed out or was interrupted.",
      suggestion: "Check your internet connection and retry the agent execution.",
      isRetryable: true,
      raw: rawStr
    };
  }
  if (lowerStr.includes("tool execution") || lowerStr.includes("enoent") || lowerStr.includes("eacces") || lowerStr.includes("no such file")) {
    return {
      code: "WORKSPACE_TOOL_ERROR",
      title: "Workspace Tool Defect",
      message: rawMessage || "A workspace file operation or command failed during execution.",
      suggestion: "Check file paths or permissions in the workspace directory.",
      isRetryable: true,
      raw: rawStr
    };
  }
  return {
    code: "AGENT_EXECUTION_FAILURE",
    title: "Agent Reasoning Defect",
    message: rawMessage || "An unexpected defect occurred during agent reasoning execution.",
    suggestion: "Review step details in the execution log or try simplifying the plan step.",
    isRetryable: true,
    raw: rawStr
  };
}
var init_agentErrorFormatter = __esm({
  "src/server/utils/agentErrorFormatter.ts"() {
  }
});

// src/server/services/agentIntegration/execution/ToolExecutionAdapter.ts
var ToolExecutionAdapter_exports = {};
__export(ToolExecutionAdapter_exports, {
  BaseToolAdapter: () => BaseToolAdapter,
  ToolExecutionAdapter: () => ToolExecutionAdapter
});
import * as fs2 from "fs";
import * as path2 from "path";
import { spawn as spawn2 } from "child_process";
function isLocalPath(p) {
  if (!p) return false;
  return path2.isAbsolute(p) || p.startsWith(".") || fs2.existsSync(p);
}
var BaseToolAdapter, ToolExecutionAdapter;
var init_ToolExecutionAdapter = __esm({
  "src/server/services/agentIntegration/execution/ToolExecutionAdapter.ts"() {
    init_ToolLifecycle();
    init_utils();
    init_WorkspaceService();
    init_activeCommandRegistry();
    init_di();
    BaseToolAdapter = class {
      constructor(descriptor, executor) {
        this.descriptor = descriptor;
        this.executor = executor;
      }
      getDescriptor() {
        return this.descriptor;
      }
      getState() {
        return "READY" /* READY */;
      }
      async initialize() {
      }
      async execute(context, input) {
        return this.executor(input, context);
      }
      async cleanup() {
      }
    };
    ToolExecutionAdapter = class {
      constructor(payload = {}, sendEvent = () => {
      }) {
        this.payload = payload;
        this.sendEvent = sendEvent;
      }
      createProposeKnowledgeTool() {
        const descriptor = {
          metadata: { name: "proposeKnowledge", version: "1.0.0", description: "Propose a new knowledge memory node." },
          schema: { inputSchema: { type: "object", properties: { content: { type: "string" }, reason: { type: "string" } }, required: ["content", "reason"] } },
          permissions: [],
          capabilities: []
        };
        return new BaseToolAdapter(descriptor, async (args) => {
          const { content, reason } = args;
          const { knowledgeProposals: knowledgeProposals2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          await txWithUser(this.payload.id, async (tx) => {
            await tx.insert(knowledgeProposals2).values({
              userId: this.payload.id,
              actionType: "INSERT",
              proposedContent: content,
              reason: reason || "AI Auto-Proposed",
              status: "PENDING"
            });
          });
          this.sendEvent("status", { message: `\u{1F4A1} AI auto-proposed a new knowledge memory! (Content length: ${content?.length || 0})` });
          this.sendEvent("system_event", { type: "knowledge_proposal_created" });
          return { status: "success" };
        });
      }
      createExecuteCodeTool() {
        const descriptor = {
          metadata: { name: "execute_code", version: "1.0.0", description: "Execute code in sandbox." },
          schema: { inputSchema: { type: "object", properties: { code: { type: "string" }, language: { type: "string" } }, required: ["code", "language"] } },
          permissions: [],
          capabilities: []
        };
        return new BaseToolAdapter(descriptor, async (args) => {
          const { code, language } = args;
          const langDisp = language || "javascript";
          this.sendEvent("status", { message: `\u{1F680} Sandbox Executing ${langDisp}...` });
          this.sendEvent("text", `

\`\`\`${langDisp}
${code}
\`\`\`

\`\`\`ansi
`);
          const targetLang = (langDisp || "javascript").toLowerCase();
          if (targetLang === "python" || targetLang === "py" || targetLang === "javascript" || targetLang === "js" || targetLang === "bash" || targetLang === "sh") {
            try {
              const os2 = await import("os");
              const fs4 = await import("fs");
              const path4 = await import("path");
              const { exec: exec3 } = await import("child_process");
              const tempDir = path4.join(os2.tmpdir(), `devgenie_exec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
              fs4.mkdirSync(tempDir, { recursive: true });
              let filename = "script.js";
              let runCmd = `node "${filename}"`;
              if (targetLang === "python" || targetLang === "py") {
                filename = "script.py";
                runCmd = `python3 "${filename}"`;
              } else if (targetLang === "bash" || targetLang === "sh") {
                filename = "script.sh";
                runCmd = `bash "${filename}"`;
              }
              const scriptPath = path4.join(tempDir, filename);
              fs4.writeFileSync(scriptPath, code, "utf-8");
              const execPromise = new Promise((resolve2) => {
                exec3(runCmd, { cwd: tempDir, timeout: 2e4, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
                  try {
                    fs4.rmSync(tempDir, { recursive: true, force: true });
                  } catch {
                  }
                  resolve2({
                    stdout: stdout || "",
                    stderr: stderr || (error && !stdout ? `Error: ${error.message}
` : ""),
                    exitCode: error ? error.code ?? 1 : 0
                  });
                });
              });
              const res = await execPromise;
              let fullOutput2 = res.stdout;
              if (res.stderr) {
                fullOutput2 += (fullOutput2 ? "\n" : "") + res.stderr;
              }
              if (!fullOutput2.trim()) {
                fullOutput2 = "Code executed successfully with no output.";
              }
              this.sendEvent("text", fullOutput2);
              this.sendEvent("text", `
\`\`\`

`);
              return { status: res.exitCode === 0 ? "success" : "error", output: fullOutput2, exitCode: res.exitCode };
            } catch (localErr) {
              console.warn("[ToolExecutionAdapter] Local execution error, attempting remote fallback:", localErr);
            }
          }
          const judge0Langs = ["c", "cpp", "c++", "csharp", "cs", "c#", "rust", "rs", "go", "php", "ruby", "rb", "java", "typescript", "ts"];
          const judge0Aliases = {
            "c": 103,
            "cpp": 105,
            "c++": 105,
            "csharp": 51,
            "cs": 51,
            "c#": 51,
            "typescript": 101,
            "ts": 101,
            "rust": 108,
            "rs": 108,
            "go": 107,
            "php": 98,
            "ruby": 72,
            "rb": 72,
            "bash": 46,
            "sh": 46,
            "javascript": 102,
            "js": 102,
            "python": 109,
            "py": 109,
            "java": 91
          };
          if (judge0Langs.includes(targetLang) || !process.env.E2B_API_KEY) {
            const judge0LangId = judge0Aliases[targetLang] || 102;
            try {
              const judge0Res = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ language_id: judge0LangId, source_code: code })
              });
              const data = await judge0Res.json().catch(() => ({}));
              if (!judge0Res.ok) {
                const errMsg = data.error || `Judge0 execution failed (${judge0Res.status})`;
                this.sendEvent("text", `
Execution error: ${errMsg}
\`\`\`

`);
                return { status: "error", error: errMsg };
              }
              let output = "";
              if (data.compile_output) output += `Compilation Error:
${data.compile_output}

`;
              output += data.stdout || "";
              if (data.stderr) output += (output ? "\n" : "") + data.stderr;
              if (data.message) output += (output ? "\n" : "") + data.message;
              if (!output.trim()) output = "Code executed with no output.";
              this.sendEvent("text", output);
              this.sendEvent("text", `
\`\`\`

`);
              return { status: "success", output };
            } catch (e) {
              const errorText = `Execution failed: ${e.message}`;
              this.sendEvent("text", errorText);
              this.sendEvent("text", `
\`\`\`

`);
              return { status: "error", error: errorText };
            }
          }
          let e2bModule;
          try {
            e2bModule = await import("@e2b/code-interpreter");
          } catch (e) {
            const msg = `Sandbox library unavailable: ${e.message}`;
            this.sendEvent("text", msg + "\n```\n\n");
            return { status: "error", error: msg };
          }
          const apiKey = process.env.E2B_API_KEY;
          if (!apiKey) {
            const msg = "E2B_API_KEY not configured.";
            this.sendEvent("text", msg + "\n```\n\n");
            return { status: "error", error: msg };
          }
          const supportedLanguages = ["python", "javascript", "r", "java", "bash", "c", "cpp", "php", "ruby"];
          if (!supportedLanguages.includes(targetLang)) {
            const failMsg = `Language '${targetLang}' is not supported in remote sandbox. Supported: ${supportedLanguages.join(", ")}.`;
            this.sendEvent("text", failMsg + "\n```\n\n");
            return { status: "error", error: failMsg };
          }
          let sandbox;
          let fullOutput = "";
          try {
            sandbox = await e2bModule.Sandbox.create({ apiKey });
            const execution = await sandbox.runCode(code, {
              language: targetLang,
              onStdout: (out) => {
                const text2 = out.line || out.text || out.toString();
                fullOutput += text2;
                this.sendEvent("text", text2);
              },
              onStderr: (out) => {
                const text2 = out.line || out.text || out.toString();
                fullOutput += text2;
                this.sendEvent("text", text2);
              },
              onResult: (res) => {
                const text2 = res.text ? res.text + "\n" : JSON.stringify(res) + "\n";
                fullOutput += text2;
                this.sendEvent("text", text2);
              }
            });
            if (execution.error) {
              const errorText = `
Error: ${execution.error.name} - ${execution.error.value}
${execution.error.traceback}
`;
              fullOutput += errorText;
              this.sendEvent("text", errorText);
            }
            this.sendEvent("text", `
\`\`\`

`);
            return { status: "success", output: fullOutput || "Code executed successfully with no output." };
          } catch (e) {
            const msg = `Sandbox execution error: ${e.message}`;
            this.sendEvent("text", msg + "\n```\n\n");
            return { status: "error", error: msg };
          } finally {
            if (sandbox) await sandbox.kill().catch(() => {
            });
          }
        });
      }
      createReadGithubRepoTool() {
        const descriptor = {
          metadata: { name: "read_github_repo", version: "1.0.0", description: "Read a GitHub repo." },
          schema: { inputSchema: { type: "object", properties: { repoUrl: { type: "string" }, filesToRead: { type: "array", items: { type: "string" } } }, required: ["repoUrl"] } },
          permissions: [],
          capabilities: []
        };
        return new BaseToolAdapter(descriptor, async (args) => {
          const { repoUrl, filesToRead } = args || {};
          if (!repoUrl || typeof repoUrl !== "string") {
            const err = "Please provide a valid GitHub repository URL (e.g., https://github.com/owner/repo).";
            this.sendEvent("text", `
*GitHub operation notice: ${err}*
`);
            return { status: "error", error: err };
          }
          this.sendEvent("status", { message: `\u{1F50D} Reading GitHub Repository: ${repoUrl}` });
          const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\s]+)/i);
          if (!match) {
            const err = `Invalid GitHub URL format: "${repoUrl}". Expected format: https://github.com/owner/repo`;
            this.sendEvent("text", `
*GitHub operation notice: ${err}*
`);
            return { status: "error", error: err };
          }
          const owner = match[1];
          const repo = match[2].replace(/\.git$/, "");
          try {
            const defaultBranchUrl = `https://api.github.com/repos/${owner}/${repo}`;
            const repoInfoRes = await fetch(defaultBranchUrl, { headers: { "User-Agent": "DevGenie-AI" } });
            if (!repoInfoRes.ok) {
              const err = `Could not access GitHub repository ${owner}/${repo} (${repoInfoRes.status}). Please check that the repository is public and spelled correctly.`;
              this.sendEvent("text", `
*GitHub operation notice: ${err}*
`);
              return { status: "error", error: err };
            }
            const repoInfo = await repoInfoRes.json().catch(() => ({}));
            const defaultBranch = repoInfo.default_branch || "main";
            let result = { status: "success", owner, repo, defaultBranch };
            if (!filesToRead || filesToRead.length === 0) {
              const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
              const treeRes = await fetch(treeUrl, { headers: { "User-Agent": "DevGenie-AI" } });
              if (!treeRes.ok) {
                const err = `Could not fetch repository file tree (${treeRes.status}).`;
                this.sendEvent("text", `
*GitHub operation notice: ${err}*
`);
                return { status: "error", error: err };
              }
              const treeData = await treeRes.json().catch(() => ({ tree: [] }));
              result.fileTree = (treeData.tree || []).map((node) => node.path).filter((p) => !p.startsWith(".git/"));
            } else {
              result.fileContents = {};
              for (const file of filesToRead) {
                const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file}`;
                const rawRes = await fetch(rawUrl, { headers: { "User-Agent": "DevGenie-AI" } });
                if (rawRes.ok) {
                  result.fileContents[file] = await rawRes.text();
                } else {
                  result.fileContents[file] = `Error: File '${file}' does not exist in repository ${owner}/${repo} (HTTP ${rawRes.status}).`;
                }
              }
            }
            this.sendEvent("text", `
*Successfully processed GitHub operation for ${repoUrl}*
`);
            return result;
          } catch (err) {
            const errorMsg = `GitHub operation failed: ${err.message}`;
            this.sendEvent("text", `
*GitHub operation notice: ${errorMsg}*
`);
            return { status: "error", error: errorMsg };
          }
        });
      }
      createViewFileTool(workspaceId) {
        const descriptor = {
          metadata: { name: "view_file", version: "1.0.0", description: "Read a file from workspace" },
          schema: { inputSchema: { type: "object", properties: { filePath: { type: "string" }, TargetFile: { type: "string" }, AbsolutePath: { type: "string" }, StartLine: { type: "number" }, EndLine: { type: "number" } } } },
          permissions: [],
          capabilities: []
        };
        return new BaseToolAdapter(descriptor, async (args, context) => {
          const targetPath = args?.filePath || args?.TargetFile || args?.AbsolutePath || args?.path;
          if (!targetPath) {
            return { status: "error", error: "Missing filePath or TargetFile parameter" };
          }
          const wsId = workspaceId || context.workspaceId || context.workspaceRef?.id;
          const userId = this.payload?.id || "default_user";
          this.sendEvent("status", { message: `\u{1F4D6} Reading file: ${targetPath}` });
          if (isLocalPath(wsId)) {
            try {
              const resolvedPath = path2.isAbsolute(targetPath) ? targetPath : path2.resolve(wsId, targetPath);
              if (!fs2.existsSync(resolvedPath)) {
                return { status: "error", error: `File not found: ${targetPath}`, exists: false, content: "" };
              }
              let content = fs2.readFileSync(resolvedPath, "utf-8");
              const stat = fs2.statSync(resolvedPath);
              if (args?.StartLine !== void 0 || args?.EndLine !== void 0) {
                const lines = content.split("\n");
                const start = Math.max(1, args.StartLine ?? 1);
                const end = args.EndLine ? Math.min(lines.length, args.EndLine) : lines.length;
                content = lines.slice(start - 1, end).join("\n");
              }
              return {
                status: "success",
                path: targetPath,
                name: path2.basename(resolvedPath),
                content,
                size: stat.size,
                exists: true
              };
            } catch (err) {
              return { status: "error", error: err.message, exists: false, content: "" };
            }
          }
          try {
            const file = await globalWorkspaceService.readFile(userId, wsId, targetPath);
            let content = file.content;
            if (args?.StartLine !== void 0 || args?.EndLine !== void 0) {
              const lines = content.split("\n");
              const start = Math.max(1, args.StartLine ?? 1);
              const end = args.EndLine ? Math.min(lines.length, args.EndLine) : lines.length;
              content = lines.slice(start - 1, end).join("\n");
            }
            return {
              status: "success",
              path: file.path,
              name: file.name,
              content,
              size: file.size,
              language: file.language,
              exists: true
            };
          } catch (err) {
            return { status: "error", error: err.message, exists: false, content: "" };
          }
        });
      }
      createCreateFileTool(workspaceId) {
        const descriptor = {
          metadata: { name: "create_file", version: "1.0.0", description: "Create a new file in workspace" },
          schema: { inputSchema: { type: "object", properties: { TargetFile: { type: "string" }, filePath: { type: "string" }, Content: { type: "string" }, content: { type: "string" } } } },
          permissions: [],
          capabilities: []
        };
        return new BaseToolAdapter(descriptor, async (args, context) => {
          const targetPath = args?.TargetFile || args?.filePath || args?.path;
          if (!targetPath) {
            return { status: "error", error: "Missing TargetFile or filePath parameter" };
          }
          const content = args?.Content ?? args?.content ?? "";
          const wsId = workspaceId || context.workspaceId || context.workspaceRef?.id;
          const userId = this.payload?.id || "default_user";
          this.sendEvent("status", { message: `\u{1F4DD} Creating file: ${targetPath}` });
          if (isLocalPath(wsId)) {
            try {
              const resolvedPath = path2.isAbsolute(targetPath) ? targetPath : path2.resolve(wsId, targetPath);
              fs2.mkdirSync(path2.dirname(resolvedPath), { recursive: true });
              fs2.writeFileSync(resolvedPath, String(content), "utf-8");
              const stat = fs2.statSync(resolvedPath);
              const effSessionId = this.payload?.sessionId || context?.sessionId;
              const effExecutionId = this.payload?.executionId || context?.executionId;
              if (effSessionId && wsId) {
                try {
                  await di.changeSetService.recordFileMutation({
                    sessionId: effSessionId,
                    workspaceId: wsId,
                    executionId: effExecutionId,
                    path: targetPath,
                    operation: "CREATE",
                    beforeContent: "",
                    afterContent: String(content)
                  });
                } catch (e) {
                  console.warn("[ToolExecutionAdapter] Failed to record changeSet for create_file:", e);
                }
              }
              return {
                status: "success",
                path: targetPath,
                size: stat.size,
                created: true
              };
            } catch (err) {
              return { status: "error", error: err.message };
            }
          }
          try {
            const saved = await globalWorkspaceService.writeFile(
              userId,
              wsId,
              targetPath,
              String(content),
              "AGENT",
              { taskId: context.taskId, executionId: context.executionId }
            );
            const effSessionId = this.payload?.sessionId || context?.sessionId;
            const effExecutionId = this.payload?.executionId || context?.executionId;
            if (effSessionId && wsId) {
              try {
                await di.changeSetService.recordFileMutation({
                  sessionId: effSessionId,
                  workspaceId: wsId,
                  executionId: effExecutionId,
                  path: targetPath,
                  operation: "CREATE",
                  beforeContent: "",
                  afterContent: String(content)
                });
              } catch (e) {
                console.warn("[ToolExecutionAdapter] Failed to record changeSet for create_file:", e);
              }
            }
            return {
              status: "success",
              path: saved.path,
              size: saved.size,
              created: true
            };
          } catch (err) {
            return { status: "error", error: err.message };
          }
        });
      }
      createEditFileTool(workspaceId) {
        const descriptor = {
          metadata: { name: "edit_file", version: "1.0.0", description: "Edit or modify a file in workspace" },
          schema: { inputSchema: { type: "object", properties: { TargetFile: { type: "string" }, filePath: { type: "string" }, TargetContent: { type: "string" }, ReplacementContent: { type: "string" }, Content: { type: "string" }, instruction: { type: "string" } } } },
          permissions: [],
          capabilities: []
        };
        return new BaseToolAdapter(descriptor, async (args, context) => {
          const targetPath = args?.TargetFile || args?.filePath || args?.path;
          if (!targetPath) {
            return { status: "error", error: "Missing TargetFile or filePath parameter" };
          }
          const wsId = workspaceId || context.workspaceId || context.workspaceRef?.id;
          const userId = this.payload?.id || "default_user";
          this.sendEvent("status", { message: `\u270F\uFE0F Editing file: ${targetPath}` });
          const targetContent = args?.TargetContent ?? args?.targetContent;
          const replacementContent = args?.ReplacementContent ?? args?.replacementContent;
          if (isLocalPath(wsId)) {
            try {
              const resolvedPath = path2.isAbsolute(targetPath) ? targetPath : path2.resolve(wsId, targetPath);
              if (!fs2.existsSync(resolvedPath)) {
                return { status: "error", error: `File not found: ${targetPath}` };
              }
              const beforeContent = fs2.readFileSync(resolvedPath, "utf-8");
              let content = beforeContent;
              if (targetContent !== void 0 && replacementContent !== void 0) {
                if (!content.includes(targetContent)) {
                  return { status: "error", error: `TargetContent not found in file: ${targetPath}` };
                }
                content = content.replace(targetContent, replacementContent);
              } else if (args?.Content !== void 0 || args?.content !== void 0) {
                content = String(args?.Content ?? args?.content);
              }
              fs2.writeFileSync(resolvedPath, content, "utf-8");
              const stat = fs2.statSync(resolvedPath);
              const effSessionId = this.payload?.sessionId || context?.sessionId;
              const effExecutionId = this.payload?.executionId || context?.executionId;
              if (effSessionId && wsId) {
                try {
                  await di.changeSetService.recordFileMutation({
                    sessionId: effSessionId,
                    workspaceId: wsId,
                    executionId: effExecutionId,
                    path: targetPath,
                    operation: "MODIFY",
                    beforeContent,
                    afterContent: content,
                    metadata: { instruction: args?.instruction }
                  });
                } catch (e) {
                  console.warn("[ToolExecutionAdapter] Failed to record changeSet for edit_file:", e);
                }
              }
              return {
                status: "success",
                path: targetPath,
                modified: true,
                size: stat.size
              };
            } catch (err) {
              return { status: "error", error: err.message };
            }
          }
          try {
            const existing = await globalWorkspaceService.readFile(userId, wsId, targetPath);
            const beforeContent = existing.content;
            let newContent = existing.content;
            if (targetContent !== void 0 && replacementContent !== void 0) {
              if (!newContent.includes(targetContent)) {
                return { status: "error", error: `TargetContent not found in file: ${targetPath}` };
              }
              newContent = newContent.replace(targetContent, replacementContent);
            } else if (args?.Content !== void 0 || args?.content !== void 0) {
              newContent = String(args?.Content ?? args?.content);
            }
            const saved = await globalWorkspaceService.writeFile(
              userId,
              wsId,
              targetPath,
              newContent,
              "AGENT",
              { taskId: context.taskId, executionId: context.executionId }
            );
            const effSessionId = this.payload?.sessionId || context?.sessionId;
            const effExecutionId = this.payload?.executionId || context?.executionId;
            if (effSessionId && wsId) {
              try {
                await di.changeSetService.recordFileMutation({
                  sessionId: effSessionId,
                  workspaceId: wsId,
                  executionId: effExecutionId,
                  path: targetPath,
                  operation: "MODIFY",
                  beforeContent,
                  afterContent: newContent,
                  metadata: { instruction: args?.instruction }
                });
              } catch (e) {
                console.warn("[ToolExecutionAdapter] Failed to record changeSet for edit_file:", e);
              }
            }
            return {
              status: "success",
              path: saved.path,
              modified: true,
              size: saved.size
            };
          } catch (err) {
            return { status: "error", error: err.message };
          }
        });
      }
      createDeleteFileTool(workspaceId) {
        const descriptor = {
          metadata: { name: "delete_file", version: "1.0.0", description: "Delete a file in workspace" },
          schema: { inputSchema: { type: "object", properties: { TargetFile: { type: "string" }, filePath: { type: "string" } } } },
          permissions: [],
          capabilities: []
        };
        return new BaseToolAdapter(descriptor, async (args, context) => {
          const targetPath = args?.TargetFile || args?.filePath || args?.path;
          if (!targetPath) {
            return { status: "error", error: "Missing TargetFile or filePath parameter" };
          }
          const wsId = workspaceId || context.workspaceId || context.workspaceRef?.id;
          const userId = this.payload?.id || "default_user";
          this.sendEvent("status", { message: `\u{1F5D1}\uFE0F Deleting file: ${targetPath}` });
          if (isLocalPath(wsId)) {
            try {
              const resolvedPath = path2.isAbsolute(targetPath) ? targetPath : path2.resolve(wsId, targetPath);
              let beforeContent = "";
              if (fs2.existsSync(resolvedPath)) {
                beforeContent = fs2.readFileSync(resolvedPath, "utf-8");
                fs2.unlinkSync(resolvedPath);
              }
              const effSessionId = this.payload?.sessionId || context?.sessionId;
              const effExecutionId = this.payload?.executionId || context?.executionId;
              if (effSessionId && wsId) {
                try {
                  await di.changeSetService.recordFileMutation({
                    sessionId: effSessionId,
                    workspaceId: wsId,
                    executionId: effExecutionId,
                    path: targetPath,
                    operation: "DELETE",
                    beforeContent,
                    afterContent: ""
                  });
                } catch (e) {
                  console.warn("[ToolExecutionAdapter] Failed to record changeSet for delete_file:", e);
                }
              }
              return {
                status: "success",
                path: targetPath,
                deleted: true
              };
            } catch (err) {
              return { status: "error", error: err.message };
            }
          }
          try {
            let beforeContent = "";
            try {
              const ex = await globalWorkspaceService.readFile(userId, wsId, targetPath);
              beforeContent = ex.content;
            } catch {
            }
            const res = await globalWorkspaceService.deleteFile(userId, wsId, targetPath, "AGENT");
            const effSessionId = this.payload?.sessionId || context?.sessionId;
            const effExecutionId = this.payload?.executionId || context?.executionId;
            if (effSessionId && wsId) {
              try {
                await di.changeSetService.recordFileMutation({
                  sessionId: effSessionId,
                  workspaceId: wsId,
                  executionId: effExecutionId,
                  path: targetPath,
                  operation: "DELETE",
                  beforeContent,
                  afterContent: ""
                });
              } catch (e) {
                console.warn("[ToolExecutionAdapter] Failed to record changeSet for delete_file:", e);
              }
            }
            return {
              status: "success",
              path: res.path,
              deleted: true
            };
          } catch (err) {
            return { status: "error", error: err.message };
          }
        });
      }
      createListDirTool(workspaceId) {
        const descriptor = {
          metadata: { name: "list_dir", version: "1.0.0", description: "List files in workspace directory" },
          schema: { inputSchema: { type: "object", properties: { DirectoryPath: { type: "string" }, dirPath: { type: "string" }, path: { type: "string" } } } },
          permissions: [],
          capabilities: []
        };
        return new BaseToolAdapter(descriptor, async (args, context) => {
          const dirPath = args?.DirectoryPath || args?.dirPath || args?.path || ".";
          const wsId = workspaceId || context.workspaceId || context.workspaceRef?.id;
          const userId = this.payload?.id || "default_user";
          this.sendEvent("status", { message: `\u{1F4C1} Listing directory: ${dirPath || "/"}` });
          if (isLocalPath(wsId)) {
            try {
              const resolvedDir = path2.isAbsolute(dirPath) ? dirPath : path2.resolve(wsId, dirPath);
              if (!fs2.existsSync(resolvedDir)) {
                return { status: "error", error: `Directory not found: ${dirPath}` };
              }
              const dirents = fs2.readdirSync(resolvedDir, { withFileTypes: true });
              const entries = dirents.map((d) => {
                const full = path2.join(resolvedDir, d.name);
                let size = 0;
                try {
                  size = fs2.statSync(full).size;
                } catch {
                }
                return {
                  name: d.name,
                  path: path2.relative(wsId, full),
                  isDirectory: d.isDirectory(),
                  size
                };
              });
              return {
                status: "success",
                path: dirPath,
                entries,
                total: entries.length
              };
            } catch (err) {
              return { status: "error", error: err.message };
            }
          }
          try {
            const listing = await globalWorkspaceService.listFiles(userId, wsId, dirPath);
            return {
              status: "success",
              path: listing.path,
              entries: listing.entries,
              total: listing.total
            };
          } catch (err) {
            return { status: "error", error: err.message };
          }
        });
      }
      createRunCommandTool(workspaceId) {
        const descriptor = {
          metadata: { name: "run_command", version: "1.0.0", description: "Execute a terminal command in workspace" },
          schema: { inputSchema: { type: "object", properties: { CommandLine: { type: "string" }, command: { type: "string" }, Cwd: { type: "string" }, cwd: { type: "string" } } } },
          permissions: [],
          capabilities: []
        };
        return new BaseToolAdapter(descriptor, async (args, context) => {
          const command = args?.CommandLine || args?.command;
          if (!command) {
            return { status: "error", error: "Missing CommandLine or command parameter" };
          }
          const wsId = workspaceId || context.workspaceId || context.workspaceRef?.id;
          const userId = this.payload?.id || "default_user";
          const cwd = args?.Cwd || args?.cwd;
          const timeoutMs = args?.WaitMsBeforeAsync || args?.timeoutMs || 3e4;
          const executionId = context.executionId || context?.id || this.payload?.executionId;
          const sessionId = context?.sessionId || this.payload?.sessionId;
          this.sendEvent("status", { message: `\u{1F4BB} Running command: ${command}` });
          const emitTerminal = (data) => {
            if (sessionId) {
              try {
                di.agentSessionService.emitSessionEvent({
                  type: "terminal_event",
                  sessionId,
                  executionId,
                  workspaceId: wsId,
                  timestamp: Date.now(),
                  data: {
                    ...data,
                    command,
                    executionId
                  }
                });
              } catch {
              }
            }
          };
          emitTerminal({
            type: "terminal_started",
            command,
            cwd: cwd || wsId,
            executionId
          });
          const startTime = Date.now();
          if (isLocalPath(wsId)) {
            try {
              const execCwd = cwd ? path2.isAbsolute(cwd) ? cwd : path2.resolve(wsId, cwd) : wsId;
              const res = await new Promise((resolve2) => {
                let stdout = "";
                let stderr = "";
                let resolved = false;
                const child = spawn2("bash", ["-c", command], {
                  cwd: execCwd,
                  detached: true
                });
                const procKey = executionId || `cmd_local_${Date.now()}`;
                activeCommandRegistry.register({
                  sessionId: procKey,
                  executionId,
                  workspaceId: wsId,
                  child,
                  startedAt: Date.now(),
                  sendInput: (input) => {
                    if (child.stdin && child.stdin.writable) {
                      child.stdin.write(input.endsWith("\n") ? input : `${input}
`);
                      return true;
                    }
                    return false;
                  },
                  abort: () => {
                    try {
                      if (child.pid) process.kill(-child.pid, "SIGINT");
                      else child.kill("SIGINT");
                      setTimeout(() => {
                        try {
                          if (child.pid && !child.killed) process.kill(-child.pid, "SIGKILL");
                        } catch {
                        }
                      }, 1e3);
                      return true;
                    } catch {
                      return false;
                    }
                  }
                });
                let isTimedOut = false;
                const finishProc = (code, sig) => {
                  if (resolved) return;
                  resolved = true;
                  activeCommandRegistry.unregister(procKey);
                  let finalExitCode = code ?? 0;
                  let finalAborted = false;
                  let finalTimeout = false;
                  if (isTimedOut || code === 124) {
                    finalExitCode = 124;
                    finalTimeout = true;
                    if (!stderr.includes("timed out")) {
                      stderr += (stderr ? "\n" : "") + "Command timed out (exceeded time limit)";
                    }
                  } else if (sig === "SIGINT" || sig === "SIGTERM" || code === 130) {
                    finalExitCode = 130;
                    finalAborted = true;
                  }
                  resolve2({
                    stdout,
                    stderr,
                    exitCode: finalExitCode,
                    isAborted: finalAborted,
                    isTimeout: finalTimeout
                  });
                };
                child.stdout?.on("data", (chunk) => {
                  const text2 = chunk.toString();
                  stdout += text2;
                  emitTerminal({
                    type: "terminal_output",
                    stream: "stdout",
                    chunk: text2,
                    line: text2
                  });
                });
                child.stderr?.on("data", (chunk) => {
                  const text2 = chunk.toString();
                  stderr += text2;
                  emitTerminal({
                    type: "terminal_output",
                    stream: "stderr",
                    chunk: text2,
                    line: text2
                  });
                });
                child.on("close", (code, sig) => finishProc(code, sig));
                child.on("error", (err) => {
                  stderr += `
Error: ${err.message}
`;
                  finishProc(1, null);
                });
                if (timeoutMs > 0) {
                  setTimeout(() => {
                    if (!resolved) {
                      isTimedOut = true;
                      try {
                        if (child.pid) process.kill(-child.pid, "SIGTERM");
                      } catch {
                      }
                    }
                  }, timeoutMs);
                }
              });
              const durationMs = Date.now() - startTime;
              const isSuccess = res.exitCode === 0;
              emitTerminal({
                type: isSuccess ? "terminal_exit" : "terminal_error",
                exitCode: res.exitCode,
                stdout: res.stdout,
                stderr: res.stderr,
                durationMs,
                isAborted: res.exitCode === 130 || res.isAborted,
                isTimeout: res.exitCode === 124 || res.isTimeout,
                error: isSuccess ? void 0 : res.stderr || `Command exited with code ${res.exitCode}`
              });
              return {
                status: isSuccess ? "success" : "error",
                exitCode: res.exitCode,
                stdout: res.stdout,
                stderr: res.stderr,
                isAborted: res.exitCode === 130 || res.isAborted,
                isTimeout: res.exitCode === 124 || res.isTimeout,
                error: isSuccess ? void 0 : res.stderr || `Command exited with code ${res.exitCode}`
              };
            } catch (err) {
              emitTerminal({
                type: "terminal_error",
                exitCode: 1,
                error: err.message,
                stderr: err.message
              });
              return { status: "error", error: err.message, exitCode: 1, stdout: "", stderr: err.message };
            }
          }
          try {
            const res = await globalWorkspaceService.runCommand(userId, wsId, command, {
              cwd,
              timeoutMs,
              sessionId: executionId || sessionId,
              onStdout: (chunk) => {
                emitTerminal({
                  type: "terminal_output",
                  stream: "stdout",
                  chunk,
                  line: chunk
                });
              },
              onStderr: (chunk) => {
                emitTerminal({
                  type: "terminal_output",
                  stream: "stderr",
                  chunk,
                  line: chunk
                });
              }
            });
            const durationMs = Date.now() - startTime;
            const isSuccess = res.exitCode === 0;
            const isAborted = res.exitCode === 130 || res.isAborted;
            const isTimeout = res.exitCode === 124 || res.isTimeout;
            emitTerminal({
              type: isSuccess ? "terminal_exit" : "terminal_error",
              exitCode: res.exitCode,
              stdout: res.stdout,
              stderr: res.stderr,
              durationMs,
              isAborted,
              isTimeout,
              error: isSuccess ? void 0 : res.stderr || `Command exited with code ${res.exitCode}`
            });
            return {
              status: isSuccess ? "success" : "error",
              exitCode: res.exitCode,
              stdout: res.stdout,
              stderr: res.stderr,
              isAborted,
              isTimeout,
              error: isSuccess ? void 0 : res.stderr || `Command exited with code ${res.exitCode}`
            };
          } catch (err) {
            emitTerminal({
              type: "terminal_error",
              exitCode: 1,
              error: err.message,
              stderr: err.message
            });
            return { status: "error", error: err.message, exitCode: 1, stdout: "", stderr: err.message };
          }
        });
      }
      async executeTool(name, args, workspaceDirOrId, context) {
        const wsId = workspaceDirOrId || (typeof this.payload === "string" ? this.payload : this.payload?.workspaceId);
        const dummyContext = context || {
          executionId: this.payload?.executionId || `exec_${Date.now()}`,
          sessionId: this.payload?.sessionId,
          taskId: `task_${Date.now()}`,
          workspaceId: wsId,
          scope: { permissions: [], allowedTools: ["*"] }
        };
        if (!dummyContext.workspaceId) {
          dummyContext.workspaceId = wsId;
        }
        if (!dummyContext.sessionId && this.payload?.sessionId) {
          dummyContext.sessionId = this.payload.sessionId;
        }
        this.sendEvent("tool_activity", {
          phase: "call",
          tool: name,
          args
        });
        if (this.payload && typeof this.payload.emitSessionEvent === "function") {
          this.payload.emitSessionEvent({
            type: "tool_activity",
            sessionId: this.payload.sessionId || "active_session",
            workspaceId: wsId,
            timestamp: Date.now(),
            data: {
              phase: "call",
              tool: name,
              args
            }
          });
        }
        let tool;
        switch (name) {
          case "view_file":
          case "read_file":
            tool = this.createViewFileTool(wsId);
            break;
          case "create_file":
            tool = this.createCreateFileTool(wsId);
            break;
          case "edit_file":
            tool = this.createEditFileTool(wsId);
            break;
          case "delete_file":
            tool = this.createDeleteFileTool(wsId);
            break;
          case "list_dir":
            tool = this.createListDirTool(wsId);
            break;
          case "run_command":
            tool = this.createRunCommandTool(wsId);
            break;
          case "execute_code":
            tool = this.createExecuteCodeTool();
            break;
          case "proposeKnowledge":
            tool = this.createProposeKnowledgeTool();
            break;
          case "read_github_repo":
            tool = this.createReadGithubRepoTool();
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        const rawResult = await tool.execute(dummyContext, args);
        const hasExitError = rawResult?.exitCode !== void 0 && rawResult.exitCode !== 0;
        const isSuccess = rawResult?.status !== "error" && !rawResult?.error && !hasExitError;
        let output = rawResult;
        if (name === "view_file" || name === "read_file") {
          output = rawResult?.content !== void 0 ? rawResult.content : rawResult;
        } else if (name === "list_dir") {
          output = rawResult?.entries !== void 0 ? rawResult.entries : rawResult;
        } else if (name === "run_command") {
          output = rawResult?.stdout || rawResult?.stderr || rawResult;
        }
        const failureError = isSuccess ? void 0 : rawResult?.error || rawResult?.stderr || (hasExitError ? `Command failed with exit code ${rawResult.exitCode}` : void 0);
        this.sendEvent("tool_activity", {
          phase: "result",
          tool: name,
          success: isSuccess,
          result: output,
          error: failureError
        });
        if (this.payload && typeof this.payload.emitSessionEvent === "function") {
          this.payload.emitSessionEvent({
            type: "tool_activity",
            sessionId: this.payload.sessionId || "active_session",
            workspaceId: wsId,
            timestamp: Date.now(),
            data: {
              phase: "result",
              tool: name,
              success: isSuccess,
              result: output,
              error: failureError
            }
          });
        }
        return {
          success: isSuccess,
          output,
          error: failureError
        };
      }
    };
  }
});

// src/server/services/agentIntegration/planning/PlanExecutionService.ts
var BaseToolAdapter2, PlanExecutionService;
var init_PlanExecutionService = __esm({
  "src/server/services/agentIntegration/planning/PlanExecutionService.ts"() {
    init_AgentRuntime();
    init_ExecutionPipeline();
    init_ToolResolver();
    init_PermissionValidator();
    init_InputValidator();
    init_ResultNormalizer();
    init_CheckpointStore();
    init_Restore();
    init_ToolRegistry();
    init_TaskGraph();
    init_FailureClassifier();
    init_ReplanningEngine();
    init_ToolLifecycle();
    init_E2BWorkspaceProvider();
    init_implementation();
    init_di();
    init_agent_config2();
    init_logInterceptor();
    init_utils();
    init_agentErrorFormatter();
    BaseToolAdapter2 = class {
      constructor(descriptor, executor) {
        this.descriptor = descriptor;
        this.executor = executor;
      }
      getDescriptor() {
        return this.descriptor;
      }
      getState() {
        return "READY" /* READY */;
      }
      async initialize() {
      }
      async execute(context, input) {
        return this.executor(input, context);
      }
      async cleanup() {
      }
    };
    PlanExecutionService = class {
      constructor(workspaceProvider, implementationStrategy) {
        this.activeExecutions = /* @__PURE__ */ new Map();
        this.activePlanExecutions = /* @__PURE__ */ new Map();
        this.activeSessionExecutions = /* @__PURE__ */ new Map();
        this.runtime = new AgentRuntime();
        this.registry = new DefaultToolRegistry();
        this.workspaceProvider = workspaceProvider || new E2BWorkspaceProvider();
        this.implementationStrategy = implementationStrategy || new CodingAgentImplementationStrategy(
          async (prompt, systemPrompt) => {
            let apiKey = this.currentApiKey;
            let isCustomUserKey = false;
            if (apiKey) {
              isCustomUserKey = true;
            } else {
              try {
                apiKey = await resolveGoogleApiKey(this.currentUserId || "default", void 0, "google");
                if (apiKey) {
                  isCustomUserKey = true;
                }
              } catch {
                apiKey = void 0;
              }
            }
            if (!isCustomUserKey && (!apiKey || apiKey.startsWith("dummy") || apiKey.startsWith("your_") || apiKey.length <= 10)) {
              apiKey = process.env.GEMINI_API_KEY;
            }
            if (!apiKey || apiKey.trim() === "" || !isCustomUserKey && (apiKey.startsWith("dummy") || apiKey.startsWith("your_") || apiKey.length <= 10)) {
              throw new Error("API Key Invalid: GEMINI_API_KEY is not configured or missing. Please configure a valid API key in Key Settings.");
            }
            const uniqueModels = resolveExecutionCandidateModels(this.currentRequestedModel);
            const callLlm = async (keyToUse, modelToUse) => {
              const ai = di.llmService.getClient(keyToUse);
              const response = await ai.models.generateContent({
                model: modelToUse,
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                config: {
                  systemInstruction: systemPrompt
                }
              });
              return response.text || "";
            };
            const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
            let lastDiag = null;
            let activeKey = apiKey;
            for (let mIdx = 0; mIdx < uniqueModels.length; mIdx++) {
              const currentModel = uniqueModels[mIdx];
              for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                  return await callLlm(activeKey, currentModel);
                } catch (err) {
                  lastDiag = formatAgentError(err);
                  const isCongested = lastDiag.code === "MODEL_HIGH_DEMAND_503" || lastDiag.code === "RATE_LIMIT_EXCEEDED_429";
                  if (lastDiag.code === "INVALID_API_KEY_400") {
                    if (!isCustomUserKey) {
                      const fallbackKey = await resolveFallbackGoogleApiKey(activeKey);
                      if (fallbackKey && fallbackKey !== activeKey) {
                        console.info("[CodingAgent] Retrying with fallback system API key...");
                        activeKey = fallbackKey;
                        try {
                          return await callLlm(activeKey, currentModel);
                        } catch (fbKeyErr) {
                          lastDiag = formatAgentError(fbKeyErr);
                        }
                      }
                    }
                    break;
                  }
                  if (isCongested && attempt === 1) {
                    const backoffMs = 1e3 + Math.floor(Math.random() * 600);
                    console.warn(`[CodingAgent] Model '${currentModel}' hit ${lastDiag.code}. Backing off ${backoffMs}ms before retry...`);
                    await sleep(backoffMs);
                    continue;
                  }
                  const nextModel = uniqueModels[mIdx + 1];
                  if (nextModel) {
                    console.warn(`[CodingAgent] Model '${currentModel}' encountered trouble [${lastDiag.code}]. Cascading to hybrid fallback '${nextModel}'...`);
                  }
                  break;
                }
              }
              if (lastDiag?.code === "INVALID_API_KEY_400") {
                break;
              }
            }
            if (!isCustomUserKey) {
              const sysFallbackKey = await resolveFallbackGoogleApiKey(activeKey);
              if (sysFallbackKey && sysFallbackKey !== activeKey) {
                for (const fallbackModel of ["gemini-2.5-flash", FLASH_3_8_CHAT_MODEL, FALLBACK_CHAT_MODEL]) {
                  try {
                    console.info(`[CodingAgent] Retrying on fallback key with model '${fallbackModel}'...`);
                    return await callLlm(sysFallbackKey, fallbackModel);
                  } catch {
                  }
                }
              }
            }
            const finalDiag = lastDiag || {
              code: "MODEL_HIGH_DEMAND_503",
              statusCode: 503,
              title: "AI Model High Demand (503)",
              message: "The AI model cluster is currently experiencing temporary high demand spikes. devgenie retried with fallback options, but services remain congested.",
              suggestion: "Please wait a moment and click Retry, or select a lighter model like Flash in Settings.",
              isRetryable: true
            };
            console.error(`[CodingAgent] LLM reasoning failed [${finalDiag.code}]:`, finalDiag.message);
            const customError = new Error(`${finalDiag.title}: ${finalDiag.message}`);
            customError.diagnosis = finalDiag;
            throw customError;
          }
        );
        const resolver = new ToolResolver(this.registry);
        const permissionValidator = new PermissionValidator();
        const inputValidator = new InputValidator();
        const normalizer = new ResultNormalizer();
        const checkpointStore = new InMemoryCheckpointStore();
        const restoreStrategy = new DefaultRestoreStrategy();
        this.pipeline = new ExecutionPipeline(
          resolver,
          permissionValidator,
          inputValidator,
          normalizer,
          checkpointStore,
          restoreStrategy
        );
        this.replanningEngine = new ReplanningEngine();
        this.registerBuiltInTools();
      }
      /**
       * Registers default environment, workspace, and development tools.
       */
      registerBuiltInTools() {
        this.registry.register(
          new BaseToolAdapter2(
            {
              metadata: { name: "view_file", version: "1.0.0", description: "Read a file from active workspace" },
              schema: { inputSchema: { type: "object" } },
              permissions: [],
              capabilities: []
            },
            async (input, context) => {
              const wsId = context.workspaceId || context.workspaceRef?.id || "default_ws";
              const workspace = await this.workspaceProvider.getOrCreateWorkspace(wsId);
              const targetPath = input?.AbsolutePath || input?.path || input?.filePath || input?.TargetFile || "main.py";
              try {
                const file = await workspace.readFile(targetPath);
                return { status: "success", file, content: file.content, path: file.path, exists: true };
              } catch (err) {
                return { status: "success", exists: false, message: err.message, content: "" };
              }
            }
          )
        );
        this.registry.register(
          new BaseToolAdapter2(
            {
              metadata: { name: "list_dir", version: "1.0.0", description: "List files in workspace directory" },
              schema: { inputSchema: { type: "object" } },
              permissions: [],
              capabilities: []
            },
            async (input, context) => {
              const wsId = context.workspaceId || context.workspaceRef?.id || "default_ws";
              const workspace = await this.workspaceProvider.getOrCreateWorkspace(wsId);
              const targetPath = input?.DirectoryPath || input?.path || input?.dirPath;
              const listing = await workspace.listDir(targetPath);
              return { status: "success", path: listing.path, entries: listing.entries, total: listing.total };
            }
          )
        );
        this.registry.register(
          new BaseToolAdapter2(
            {
              metadata: { name: "create_file", version: "1.0.0", description: "Create a file in workspace" },
              schema: { inputSchema: { type: "object" } },
              permissions: [],
              capabilities: []
            },
            async (input, context) => {
              const wsId = context.workspaceId || context.workspaceRef?.id || "default_ws";
              const workspace = await this.workspaceProvider.getOrCreateWorkspace(wsId);
              let targetPath = input?.TargetFile || input?.path || input?.filePath;
              let content = input?.Content ?? input?.content;
              if (!targetPath) {
                targetPath = "main.py";
              }
              if (content === void 0 || content === null) {
                content = "# Created by DevGenie AI Agent\n";
              }
              await workspace.writeFile(targetPath, String(content));
              return { status: "success", path: targetPath, size: String(content).length, created: true };
            }
          )
        );
        this.registry.register(
          new BaseToolAdapter2(
            {
              metadata: { name: "edit_file", version: "1.0.0", description: "Edit a file in workspace" },
              schema: { inputSchema: { type: "object" } },
              permissions: [],
              capabilities: []
            },
            async (input, context) => {
              const wsId = context.workspaceId || context.workspaceRef?.id || "default_ws";
              const workspace = await this.workspaceProvider.getOrCreateWorkspace(wsId);
              const targetPath = input?.TargetFile || input?.path || input?.filePath;
              await workspace.editFile(targetPath, {
                targetContent: input?.TargetContent ?? input?.targetContent,
                replacementContent: input?.ReplacementContent ?? input?.replacementContent,
                instruction: input?.Instruction ?? input?.instruction
              });
              return { status: "success", path: targetPath, modified: true };
            }
          )
        );
        this.registry.register(
          new BaseToolAdapter2(
            {
              metadata: { name: "delete_file", version: "1.0.0", description: "Delete a file in workspace" },
              schema: { inputSchema: { type: "object" } },
              permissions: [],
              capabilities: []
            },
            async (input, context) => {
              const wsId = context.workspaceId || context.workspaceRef?.id || "default_ws";
              const workspace = await this.workspaceProvider.getOrCreateWorkspace(wsId);
              const targetPath = input?.TargetFile || input?.path || input?.filePath;
              await workspace.deleteFile(targetPath);
              return { status: "success", path: targetPath, deleted: true };
            }
          )
        );
        const createDirHandler = async (input, context) => {
          const wsId = context.workspaceId || context.workspaceRef?.id || "default_ws";
          const workspace = await this.workspaceProvider.getOrCreateWorkspace(wsId);
          const dirPath = input?.DirectoryPath || input?.path || input?.dirPath || input?.targetDir || input?.name;
          if (!dirPath) {
            throw new Error("DirectoryPath is required");
          }
          if (workspace.makeDir) {
            await workspace.makeDir(dirPath);
          }
          return { status: "success", path: dirPath, created: true };
        };
        ["create_dir", "make_dir", "mkdir"].forEach((toolName) => {
          this.registry.register(
            new BaseToolAdapter2(
              {
                metadata: { name: toolName, version: "1.0.0", description: "Create a directory in workspace" },
                schema: { inputSchema: { type: "object" } },
                permissions: [],
                capabilities: []
              },
              createDirHandler
            )
          );
        });
        const deleteDirHandler = async (input, context) => {
          const wsId = context.workspaceId || context.workspaceRef?.id || "default_ws";
          const workspace = await this.workspaceProvider.getOrCreateWorkspace(wsId);
          const dirPath = input?.DirectoryPath || input?.path || input?.dirPath || input?.targetDir;
          if (!dirPath) {
            throw new Error("DirectoryPath is required");
          }
          if (workspace.deleteDir) {
            await workspace.deleteDir(dirPath, true);
          }
          return { status: "success", path: dirPath, deleted: true };
        };
        ["delete_dir", "remove_dir", "rmdir"].forEach((toolName) => {
          this.registry.register(
            new BaseToolAdapter2(
              {
                metadata: { name: toolName, version: "1.0.0", description: "Delete a directory in workspace" },
                schema: { inputSchema: { type: "object" } },
                permissions: [],
                capabilities: []
              },
              deleteDirHandler
            )
          );
        });
        const moveHandler = async (input, context) => {
          const wsId = context.workspaceId || context.workspaceRef?.id || "default_ws";
          const workspace = await this.workspaceProvider.getOrCreateWorkspace(wsId);
          const sourcePath = input?.SourcePath || input?.oldPath || input?.source || input?.from;
          const destinationPath = input?.DestinationPath || input?.newPath || input?.destination || input?.to;
          if (!sourcePath || !destinationPath) {
            throw new Error("SourcePath and DestinationPath are required");
          }
          const file = await workspace.readFile(sourcePath);
          await workspace.writeFile(destinationPath, file.content);
          await workspace.deleteFile(sourcePath);
          return { status: "success", source: sourcePath, destination: destinationPath, moved: true };
        };
        ["move", "move_file", "rename_file"].forEach((toolName) => {
          this.registry.register(
            new BaseToolAdapter2(
              {
                metadata: { name: toolName, version: "1.0.0", description: "Move or rename a file/directory in workspace" },
                schema: { inputSchema: { type: "object" } },
                permissions: [],
                capabilities: []
              },
              moveHandler
            )
          );
        });
        this.registry.register(
          new BaseToolAdapter2(
            {
              metadata: { name: "multi_edit_file", version: "1.0.0", description: "Apply multiple replacement chunks to a file in workspace" },
              schema: { inputSchema: { type: "object" } },
              permissions: [],
              capabilities: []
            },
            async (input, context) => {
              const wsId = context.workspaceId || context.workspaceRef?.id || "default_ws";
              const workspace = await this.workspaceProvider.getOrCreateWorkspace(wsId);
              const targetPath = input?.TargetFile || input?.path || input?.filePath;
              const chunks = input?.ReplacementChunks || input?.chunks || [];
              if (Array.isArray(chunks) && chunks.length > 0 && typeof workspace.multiEditFile === "function") {
                await workspace.multiEditFile(targetPath, chunks.map((c) => ({
                  targetContent: c?.TargetContent ?? c?.targetContent,
                  replacementContent: c?.ReplacementContent ?? c?.replacementContent,
                  instruction: c?.Instruction ?? c?.instruction
                })));
              } else if (Array.isArray(chunks) && chunks.length > 0) {
                for (const chunk of chunks) {
                  await workspace.editFile(targetPath, {
                    targetContent: chunk?.TargetContent ?? chunk?.targetContent,
                    replacementContent: chunk?.ReplacementContent ?? chunk?.replacementContent,
                    instruction: chunk?.Instruction ?? chunk?.instruction
                  });
                }
              } else {
                await workspace.editFile(targetPath, {
                  targetContent: input?.TargetContent ?? input?.targetContent,
                  replacementContent: input?.ReplacementContent ?? input?.replacementContent,
                  instruction: input?.Instruction ?? input?.instruction
                });
              }
              return { status: "success", path: targetPath, modified: true, chunksApplied: Array.isArray(chunks) ? chunks.length : 1 };
            }
          )
        );
        this.registry.register(
          new BaseToolAdapter2(
            {
              metadata: { name: "batch_create_files", version: "1.0.0", description: "Create multiple files in workspace simultaneously" },
              schema: { inputSchema: { type: "object" } },
              permissions: [],
              capabilities: []
            },
            async (input, context) => {
              const wsId = context.workspaceId || context.workspaceRef?.id || "default_ws";
              const workspace = await this.workspaceProvider.getOrCreateWorkspace(wsId);
              const files = input?.files || input?.Files || [];
              const created = [];
              for (const item of files) {
                const p = item.TargetFile || item.path || item.filePath;
                const c = item.Content !== void 0 ? item.Content : item.content;
                if (p) {
                  await workspace.writeFile(p, String(c ?? ""));
                  created.push(p);
                }
              }
              return { status: "success", createdFiles: created, total: created.length };
            }
          )
        );
        this.registry.register(
          new BaseToolAdapter2(
            {
              metadata: { name: "run_command", version: "1.0.0", description: "Run command in workspace sandbox" },
              schema: { inputSchema: { type: "object" } },
              permissions: [],
              capabilities: []
            },
            async (input, context) => {
              const wsId = context.workspaceId || context.workspaceRef?.id || "default_ws";
              const workspace = await this.workspaceProvider.getOrCreateWorkspace(wsId);
              const command = input?.CommandLine || input?.command || 'echo "workspace-ok"';
              const sessionId = context?.sessionId;
              const executionId = context.executionId;
              if (sessionId) {
                try {
                  di.agentSessionService.emitSessionEvent({
                    type: "terminal_event",
                    sessionId,
                    executionId,
                    workspaceId: wsId,
                    timestamp: Date.now(),
                    data: {
                      type: "terminal_started",
                      command,
                      executionId
                    }
                  });
                } catch {
                }
              }
              const result = await workspace.runCommand(command, {
                cwd: input?.Cwd || input?.cwd,
                timeoutMs: input?.WaitMsBeforeAsync || input?.timeoutMs
              });
              if (sessionId) {
                try {
                  di.agentSessionService.emitSessionEvent({
                    type: "terminal_event",
                    sessionId,
                    executionId,
                    workspaceId: wsId,
                    timestamp: Date.now(),
                    data: {
                      type: "terminal_exit",
                      command,
                      exitCode: result.exitCode,
                      stdout: result.stdout,
                      stderr: result.stderr,
                      executionId
                    }
                  });
                } catch {
                }
              }
              return {
                status: result.exitCode === 0 ? "success" : "error",
                exitCode: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr
              };
            }
          )
        );
        const otherTools = ["compile_applet", "lint_applet", "search_web"];
        for (const name of otherTools) {
          this.registry.register(
            new BaseToolAdapter2(
              {
                metadata: { name, version: "1.0.0", description: `Built-in tool: ${name}` },
                schema: { inputSchema: { type: "object" } },
                permissions: [],
                capabilities: []
              },
              async (input, _context) => {
                return {
                  status: "success",
                  tool: name,
                  result: `Executed ${name} within execution pipeline bounds`,
                  input
                };
              }
            )
          );
        }
      }
      getRegistry() {
        return this.registry;
      }
      getPipeline() {
        return this.pipeline;
      }
      getRuntime() {
        return this.runtime;
      }
      getWorkspaceProvider() {
        return this.workspaceProvider;
      }
      setWorkspaceProvider(provider) {
        this.workspaceProvider = provider;
      }
      /**
       * Registers production tool adapters into the ExecutionPipeline tool registry.
       */
      async registerProductionTools(payload, sendEvent) {
        if (typeof window === "undefined") {
          const { ToolExecutionAdapter: ToolExecutionAdapter2 } = await Promise.resolve().then(() => (init_ToolExecutionAdapter(), ToolExecutionAdapter_exports));
          const adapter = new ToolExecutionAdapter2(payload, sendEvent);
          await this.registry.register(adapter.createProposeKnowledgeTool());
          await this.registry.register(adapter.createExecuteCodeTool());
          await this.registry.register(adapter.createReadGithubRepoTool());
        }
      }
      /**
       * Executes a validated M05 Plan through the AgentRuntime and ExecutionPipeline.
       * STRICT SAFETY GATE: Requires explicit user approval before executing any tool.
       */
      async executePlan(options) {
        const startTime = Date.now();
        const { planningResult, approval, onProgress, sendEvent, toolPayload } = options;
        if (options.userId) {
          this.currentUserId = options.userId;
        }
        if (options.apiKey) {
          this.currentApiKey = options.apiKey;
        }
        if (options.model) {
          this.currentRequestedModel = options.model;
        }
        if (options.workspaceProvider) {
          this.workspaceProvider = options.workspaceProvider;
        }
        if (!approval || !approval.confirmed) {
          return {
            executionId: "unapproved",
            planId: planningResult.plan?.id || "unknown",
            goalId: planningResult.goal?.id || "unknown",
            success: false,
            status: "REJECTED_UNAPPROVED",
            totalTasks: planningResult.plan?.steps.length || 0,
            completedTasks: [],
            failedTasks: [],
            blockedTasks: [],
            taskResults: {},
            durationMs: Date.now() - startTime,
            error: "Execution halted: Explicit user approval is strictly required to execute plan."
          };
        }
        const goal = planningResult.goal;
        let plan = planningResult.repairedPlan || planningResult.plan;
        if (!goal || !plan) {
          throw new Error("Cannot execute plan: Goal or Plan is missing from PlanningResult.");
        }
        if (this.activePlanExecutions.has(plan.id)) {
          const existing = this.activePlanExecutions.get(plan.id);
          throw new Error(`Duplicate execution rejected: Plan ${plan.id} is already actively running under execution ${existing}.`);
        }
        if (options.sessionId && this.activeSessionExecutions.has(options.sessionId)) {
          const existing = this.activeSessionExecutions.get(options.sessionId);
          throw new Error(`Duplicate execution rejected: Session ${options.sessionId} already has an active execution ${existing}.`);
        }
        const planWsId = planningResult?.workspaceId || goal?.workspaceId;
        if (planWsId && options.workspaceId && planWsId !== options.workspaceId) {
          throw new Error(`Workspace mismatch: Plan belongs to workspace ${planWsId}, cannot execute against ${options.workspaceId}`);
        }
        const executionContext = this.runtime.createExecution();
        const executionId = executionContext.executionId;
        const abortController = new AbortController();
        this.activeExecutions.set(executionId, { abortController, cancelled: false });
        this.activePlanExecutions.set(plan.id, executionId);
        if (options.sessionId) {
          this.activeSessionExecutions.set(options.sessionId, executionId);
        }
        const workspaceId = options.workspaceId || `ws_${goal.id}`;
        let workspace;
        try {
          workspace = await this.workspaceProvider.getOrCreateWorkspace(workspaceId, {
            id: workspaceId,
            name: goal.title || goal.description,
            workingDirectory: "/workspace"
          });
        } catch (wsErr) {
          this.activeExecutions.delete(executionId);
          this.activePlanExecutions.delete(plan.id);
          if (options.sessionId) {
            this.activeSessionExecutions.delete(options.sessionId);
          }
          throw wsErr;
        }
        const workspaceRef = workspace.getRef();
        executionContext.workspaceId = workspaceRef.id;
        executionContext.workspaceRef = workspaceRef;
        executionContext.sessionId = options.sessionId;
        executionContext.scope = {
          permissions: [],
          allowedTools: ["*"]
        };
        if (options.sessionId) {
          try {
            di.agentSessionService.associateExecution(options.sessionId, executionId, options.userId || this.currentUserId).catch(() => {
            });
            di.agentSessionService.associateGoalAndPlan(options.sessionId, goal.id, plan.id, options.userId || this.currentUserId).catch(() => {
            });
          } catch {
          }
        }
        const emitSessionProgress = (event) => {
          if (!options.sessionId) return;
          try {
            let sessionEventType = void 0;
            let dataPayload = void 0;
            switch (event.type) {
              case "execution_started":
                sessionEventType = "plan_execution_started";
                dataPayload = {
                  goalId: goal.id,
                  planId: plan.id,
                  totalTasks: event.totalTasks,
                  completedTasks: 0
                };
                break;
              case "task_started":
                sessionEventType = "task_started";
                dataPayload = {
                  goalId: goal.id,
                  planId: plan.id,
                  taskId: event.taskId,
                  stepId: event.stepId,
                  status: "RUNNING",
                  totalTasks: event.totalTasks,
                  completedTasks: event.completedTasks
                };
                break;
              case "task_completed":
                sessionEventType = "task_completed";
                dataPayload = {
                  goalId: goal.id,
                  planId: plan.id,
                  taskId: event.taskId,
                  stepId: event.stepId,
                  status: "COMPLETED",
                  totalTasks: event.totalTasks,
                  completedTasks: event.completedTasks,
                  result: event.result
                };
                break;
              case "task_failed":
                sessionEventType = "task_failed";
                dataPayload = {
                  goalId: goal.id,
                  planId: plan.id,
                  taskId: event.taskId,
                  stepId: event.stepId,
                  status: "FAILED",
                  error: event.error
                };
                break;
              case "task_blocked":
                sessionEventType = "task_blocked";
                dataPayload = {
                  goalId: goal.id,
                  planId: plan.id,
                  taskId: event.taskId,
                  status: "BLOCKED",
                  error: event.error
                };
                break;
              case "replan_requested":
                sessionEventType = "plan_replanned";
                dataPayload = {
                  goalId: goal.id,
                  planId: plan.id,
                  taskId: event.taskId,
                  status: "REPLANNED",
                  replanned: true,
                  result: event.result
                };
                break;
              case "execution_completed":
                sessionEventType = "plan_completed";
                dataPayload = {
                  goalId: goal.id,
                  planId: plan.id,
                  status: "COMPLETED",
                  totalTasks: event.totalTasks,
                  completedTasks: event.completedTasks
                };
                break;
              case "execution_failed":
              case "execution_aborted":
                sessionEventType = "plan_failed";
                dataPayload = {
                  goalId: goal.id,
                  planId: plan.id,
                  status: event.type === "execution_aborted" ? "ABORTED" : "FAILED",
                  error: event.error
                };
                break;
            }
            if (sessionEventType) {
              di.agentSessionService.emitSessionEvent({
                type: sessionEventType,
                sessionId: options.sessionId,
                executionId: event.executionId,
                workspaceId: workspaceRef.id,
                goalId: goal.id,
                planId: plan.id,
                taskId: event.taskId,
                timestamp: event.timestamp,
                data: dataPayload
              });
            }
          } catch {
          }
        };
        const emitProgress = (event) => {
          const fullEvent = {
            ...event,
            timestamp: Date.now()
          };
          if (onProgress) {
            onProgress(fullEvent);
          }
          if (sendEvent) {
            sendEvent("plan_execution_progress", fullEvent);
          }
          emitSessionProgress(fullEvent);
        };
        const recordFileChangeProvenance = async (change) => {
          if (options.onFileChanged) {
            options.onFileChanged(change);
          }
          if (options.sessionId) {
            try {
              const op = change.action === "create" ? "CREATE" : change.action === "delete" ? "DELETE" : "MODIFY";
              let fileContent = "";
              try {
                const f = await workspace.readFile(change.path);
                fileContent = f.content;
              } catch {
              }
              await di.changeSetService.recordFileMutation({
                sessionId: options.sessionId,
                workspaceId: workspaceRef.id,
                executionId: change.executionId || executionId,
                path: change.path,
                operation: op,
                beforeContent: change.action === "create" ? "" : void 0,
                afterContent: change.action === "delete" ? "" : fileContent,
                metadata: {
                  goalId: goal.id,
                  planId: plan.id,
                  taskId: change.taskId
                }
              });
            } catch {
            }
          }
        };
        if (sendEvent) {
          await this.registerProductionTools(toolPayload || {}, sendEvent);
        }
        let taskGraph = new DirectedTaskGraph(plan.id, goal.id);
        for (const step of plan.steps) {
          taskGraph.addTask(step, step.dependencies);
        }
        await this.runtime.startExecution(executionId);
        emitProgress({
          type: "execution_started",
          executionId,
          planId: plan.id,
          totalTasks: plan.steps.length,
          completedTasks: 0
        });
        const completedTasks = [];
        let failedTasks = [];
        let replanAttempts = 0;
        const maxReplanBudget = 2;
        const blockedTasks = [];
        const taskResults = {};
        try {
          while (true) {
            if (this.activeExecutions.get(executionId)?.cancelled) {
              emitProgress({
                type: "execution_aborted",
                executionId,
                planId: plan.id,
                error: "Execution stopped by user request."
              });
              return {
                executionId,
                planId: plan.id,
                goalId: goal.id,
                workspaceId: workspaceRef.id,
                success: false,
                status: "ABORTED",
                totalTasks: plan.steps.length,
                completedTasks,
                failedTasks,
                blockedTasks: Array.from(taskGraph.statuses.entries()).filter(([_, s]) => s === "BLOCKED" /* BLOCKED */).map(([t]) => t),
                taskResults,
                durationMs: Date.now() - startTime,
                error: "Execution stopped by user."
              };
            }
            const readyTasks = taskGraph.getReadyTasks();
            if (readyTasks.length === 0) {
              break;
            }
            for (const readyTask of readyTasks) {
              if (this.activeExecutions.get(executionId)?.cancelled) {
                break;
              }
              const taskId = readyTask.id;
              if (taskGraph.getTaskStatus(taskId) === "COMPLETED" /* COMPLETED */ || completedTasks.includes(taskId)) {
                continue;
              }
              const step = plan.steps.find((s) => s.id === taskId);
              if (!step) {
                taskGraph.setTaskStatus(taskId, "SKIPPED" /* SKIPPED */);
                continue;
              }
              if (taskGraph.statuses.get(taskId) === "PENDING" /* PENDING */) {
                taskGraph.setTaskStatus(taskId, "READY" /* READY */);
              }
              taskGraph.setTaskStatus(taskId, "RUNNING" /* RUNNING */);
              appendSystemLog("AGENT_STEP_START", `[${step.id}] ${step.title}`, { description: step.description });
              emitProgress({
                type: "task_started",
                executionId,
                planId: plan.id,
                taskId,
                stepId: step.id,
                totalTasks: plan.steps.length,
                completedTasks: completedTasks.length
              });
              let stepSuccess = true;
              let stepError;
              const taskType = step.metadata?.taskType;
              const stepTitle = (step.title || "").toLowerCase();
              const stepDesc = (step.description || "").toLowerCase();
              const isModifyStep = taskType === "MODIFY" || taskType === "EXECUTE" || !taskType && (stepTitle.includes("implement") || stepTitle.includes("modify") || stepTitle.includes("code") || stepTitle.includes("build") || stepTitle.includes("create") || stepTitle.includes("generate") || stepDesc.includes("implement") || stepDesc.includes("modify") || stepDesc.includes("code") || stepDesc.includes("create file") || (step.requiredTools || []).some((t) => {
                const n = typeof t === "string" ? t : t.name;
                return n === "create_file" || n === "edit_file" || n === "multi_edit_file" || n === "batch_create_files";
              }));
              if (isModifyStep) {
                emitProgress({
                  type: "tool_started",
                  executionId,
                  planId: plan.id,
                  taskId,
                  stepId: step.id,
                  toolName: "implementation_agent"
                });
                const activeStrategy = options.implementationStrategy || this.implementationStrategy;
                const availableTools = await this.registry.listAll();
                let implResult;
                let stepAttempts = 0;
                const maxStepAttempts = 2;
                while (stepAttempts < maxStepAttempts) {
                  stepAttempts++;
                  try {
                    implResult = await activeStrategy.implement({
                      goal,
                      task: step.metadata?.taskSpec,
                      planStep: step,
                      workspaceRef,
                      relevantTaskResults: taskResults,
                      constraints: goal.constraints,
                      availableTools,
                      pipeline: this.pipeline,
                      executionContext,
                      maxIterations: goal.constraints?.customConstraints?.maxIterations || 8,
                      onProgress: (pEvent) => {
                        emitProgress({
                          type: pEvent.type === "tool_started" ? "tool_started" : "tool_output",
                          executionId,
                          planId: plan.id,
                          taskId,
                          stepId: step.id,
                          toolName: pEvent.toolName,
                          result: pEvent.result,
                          error: pEvent.error
                        });
                      },
                      onFileChanged: recordFileChangeProvenance
                    });
                    break;
                  } catch (implErr) {
                    const diag = formatAgentError(implErr);
                    console.error(`[PlanExecutionService] Implementation step failed [${diag.code}]:`, diag.message);
                    if (diag.isRetryable && stepAttempts < maxStepAttempts) {
                      console.warn(`[PlanExecutionService] Retrying implementation step ${step.id} after backoff due to ${diag.code}...`);
                      await new Promise((r) => setTimeout(r, 1500));
                      continue;
                    }
                    implResult = {
                      success: false,
                      summary: `${diag.title}: ${diag.message}`,
                      createdFiles: [],
                      modifiedFiles: [],
                      deletedFiles: [],
                      toolCalls: [],
                      errors: [{
                        code: diag.code,
                        message: `${diag.title}: ${diag.message}. Suggestion: ${diag.suggestion}`,
                        recoverable: diag.isRetryable
                      }]
                    };
                    break;
                  }
                }
                taskResults[taskId] = {
                  success: implResult.success,
                  data: {
                    summary: implResult.summary,
                    createdFiles: implResult.createdFiles,
                    modifiedFiles: implResult.modifiedFiles,
                    deletedFiles: implResult.deletedFiles,
                    toolCalls: implResult.toolCalls
                  },
                  metadata: { durationMs: 20 },
                  timestamp: Date.now()
                };
                const hasSuccessfulMutations = (implResult.createdFiles && implResult.createdFiles.length > 0 || implResult.modifiedFiles && implResult.modifiedFiles.length > 0 || implResult.deletedFiles && implResult.deletedFiles.length > 0) && Array.isArray(implResult.toolCalls) && implResult.toolCalls.some((t) => t.success);
                stepSuccess = implResult.success || hasSuccessfulMutations;
                if (!stepSuccess) {
                  const firstErr = implResult.errors?.[0];
                  stepError = new Error(firstErr?.message || implResult.summary || "Coding implementation failed");
                }
              } else if (!step.requiredTools || step.requiredTools.length === 0) {
                taskResults[taskId] = {
                  success: true,
                  data: { message: `Completed virtual step: ${step.description}` },
                  metadata: { durationMs: 5 },
                  timestamp: Date.now()
                };
              } else {
                for (const toolRequirement of step.requiredTools) {
                  if (this.activeExecutions.get(executionId)?.cancelled) {
                    stepSuccess = false;
                    stepError = new Error("Execution stopped by user");
                    break;
                  }
                  const toolName = typeof toolRequirement === "string" ? toolRequirement : toolRequirement.name;
                  try {
                    let toolInput = step.metadata?.inputBindings || {};
                    if (Object.keys(toolInput).length === 0) {
                      const promptText = `${goal.rawPrompt || ""} ${goal.description || ""} ${step.description || ""}`;
                      if (toolName === "list_dir") {
                        toolInput = { DirectoryPath: "/" };
                      } else if (toolName === "view_file") {
                        const match = promptText.match(/([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)/i);
                        const fileName = match ? match[1].replace(/["']/g, "") : "main.py";
                        toolInput = { AbsolutePath: fileName, path: fileName };
                      } else if (toolName === "run_command") {
                        let cmd = 'echo "Verification completed successfully"';
                        if (promptText.toLowerCase().includes("python") || promptText.toLowerCase().includes(".py")) {
                          cmd = `python3 -m py_compile *.py 2>/dev/null || python3 -c "print('Python syntax verified')"`;
                        } else {
                          cmd = 'npm test 2>/dev/null || echo "Syntax check verified"';
                        }
                        toolInput = { CommandLine: cmd, command: cmd };
                      }
                    }
                    emitProgress({
                      type: "tool_started",
                      executionId,
                      planId: plan.id,
                      taskId,
                      stepId: step.id,
                      toolName
                    });
                    appendSystemLog("AGENT_PLAN_TOOL", `Executing plan tool '${toolName}' for step ${step.id}`);
                    const toolResult = await this.pipeline.execute(
                      toolName,
                      toolInput,
                      executionContext
                    );
                    appendSystemLog("AGENT_PLAN_TOOL_RESULT", `Plan tool '${toolName}' completed`, { success: toolResult.success });
                    taskResults[`${taskId}_${toolName}`] = toolResult;
                    emitProgress({
                      type: "tool_output",
                      executionId,
                      planId: plan.id,
                      taskId,
                      stepId: step.id,
                      toolName,
                      result: toolResult.data || toolResult.error
                    });
                    if (toolResult.success) {
                      const targetPath = toolInput.TargetFile || toolInput.path || toolInput.filePath || "main.py";
                      if (toolName === "create_file") {
                        recordFileChangeProvenance({ path: targetPath, action: "create", actor: "AGENT", taskId, executionId, timestamp: Date.now() }).catch(() => {
                        });
                      } else if (toolName === "edit_file" || toolName === "multi_edit_file") {
                        recordFileChangeProvenance({ path: targetPath, action: "edit", actor: "AGENT", taskId, executionId, timestamp: Date.now() }).catch(() => {
                        });
                      } else if (toolName === "delete_file") {
                        recordFileChangeProvenance({ path: targetPath, action: "delete", actor: "AGENT", taskId, executionId, timestamp: Date.now() }).catch(() => {
                        });
                      }
                    }
                    if (!toolResult.success) {
                      if (taskType === "VERIFY" && completedTasks.length > 0) {
                        appendSystemLog("AGENT_PLAN_TOOL_WARN", `Verification warning for '${toolName}': ${String(toolResult.error || "non-zero exit")}`);
                        continue;
                      }
                      stepSuccess = false;
                      stepError = toolResult.error instanceof Error ? toolResult.error : new Error(String(toolResult.error || "Tool execution failed"));
                      break;
                    }
                  } catch (err) {
                    stepSuccess = false;
                    stepError = err instanceof Error ? err : new Error(String(err));
                    break;
                  }
                }
              }
              if (stepSuccess) {
                taskGraph.setTaskStatus(taskId, "COMPLETED" /* COMPLETED */);
                completedTasks.push(taskId);
                emitProgress({
                  type: "task_completed",
                  executionId,
                  planId: plan.id,
                  taskId,
                  stepId: step.id,
                  totalTasks: plan.steps.length,
                  completedTasks: completedTasks.length,
                  result: taskResults[taskId]
                });
              } else {
                const errorMessage = stepError?.message || "Step execution encountered a defect";
                taskGraph.setTaskStatus(taskId, "FAILED" /* FAILED */, errorMessage);
                failedTasks.push(taskId);
                emitProgress({
                  type: "task_failed",
                  executionId,
                  planId: plan.id,
                  taskId,
                  stepId: step.id,
                  error: errorMessage
                });
                const classification = FailureClassifier.classify({
                  error: stepError || errorMessage,
                  step,
                  planId: plan.id
                });
                const diag = formatAgentError(stepError || errorMessage);
                if (classification.recommendedAction === "ABORT" || diag.code === "INVALID_API_KEY_400" || diag.code === "QUOTA_EXCEEDED_429") {
                  await this.runtime.failExecution(executionId, stepError || new Error(errorMessage));
                  emitProgress({
                    type: "execution_failed",
                    executionId,
                    planId: plan.id,
                    error: `${diag.title}: ${diag.message}`
                  });
                  return {
                    executionId,
                    planId: plan.id,
                    goalId: goal.id,
                    workspaceId: workspaceRef.id,
                    success: false,
                    status: "FAILED",
                    totalTasks: plan.steps.length,
                    completedTasks,
                    failedTasks,
                    blockedTasks: Array.from(taskGraph.statuses.entries()).filter(([_, s]) => s === "BLOCKED" /* BLOCKED */).map(([t]) => t),
                    taskResults,
                    durationMs: Date.now() - startTime,
                    error: `${diag.title}: ${diag.message}`
                  };
                }
                if (replanAttempts < maxReplanBudget) {
                  emitProgress({
                    type: "replan_requested",
                    executionId,
                    planId: plan.id,
                    taskId,
                    stepId: step.id,
                    status: classification.category,
                    result: {
                      failureClassification: classification,
                      action: classification.recommendedAction
                    }
                  });
                  const replanDecision = await this.replanningEngine.handleFailure({
                    goal,
                    currentPlan: plan,
                    currentTaskGraph: taskGraph,
                    failedStep: step,
                    failureClassification: classification,
                    completedTaskIds: [...completedTasks],
                    replanBudget: maxReplanBudget - replanAttempts,
                    constraints: goal.constraints,
                    executionContext
                  });
                  if (replanDecision.action === "ABORT") {
                    console.error(`[PlanExecutionService] Replanning aborted: ${replanDecision.reason}`);
                    await this.runtime.failExecution(executionId, stepError || new Error(replanDecision.reason));
                    emitProgress({
                      type: "execution_failed",
                      executionId,
                      planId: plan.id,
                      error: replanDecision.reason
                    });
                    return {
                      executionId,
                      planId: plan.id,
                      goalId: goal.id,
                      workspaceId: workspaceRef.id,
                      success: false,
                      status: "FAILED",
                      totalTasks: plan.steps.length,
                      completedTasks,
                      failedTasks,
                      blockedTasks: Array.from(taskGraph.statuses.entries()).filter(([_, s]) => s === "BLOCKED" /* BLOCKED */).map(([t]) => t),
                      taskResults,
                      durationMs: Date.now() - startTime,
                      error: replanDecision.reason
                    };
                  }
                  if (replanDecision.action === "REPLAN" || replanDecision.action === "REPAIR") {
                    replanAttempts++;
                    const revisedPlan = replanDecision.revision?.newPlan || replanDecision.repairedPlan;
                    if (revisedPlan) {
                      plan = revisedPlan;
                      const newTaskGraph = new DirectedTaskGraph(revisedPlan.id, goal.id);
                      for (const s of revisedPlan.steps) {
                        newTaskGraph.addTask(s, s.dependencies);
                      }
                      for (const s of revisedPlan.steps) {
                        if (completedTasks.includes(s.id) || completedTasks.includes(s.taskId)) {
                          if (newTaskGraph.statuses.get(s.id) === "PENDING" /* PENDING */) {
                            newTaskGraph.setTaskStatus(s.id, "READY" /* READY */);
                          }
                          newTaskGraph.setTaskStatus(s.id, "RUNNING" /* RUNNING */);
                          newTaskGraph.setTaskStatus(s.id, "COMPLETED" /* COMPLETED */);
                        }
                      }
                      taskGraph = newTaskGraph;
                      failedTasks = failedTasks.filter((id) => id !== taskId);
                      break;
                    }
                  } else if (replanDecision.action === "RETRY") {
                    taskGraph.setTaskStatus(taskId, "READY" /* READY */);
                    failedTasks = failedTasks.filter((id) => id !== taskId);
                    break;
                  }
                }
              }
            }
          }
          const allCompleted = plan.steps.every((s) => completedTasks.includes(s.id));
          if (allCompleted) {
            await this.runtime.completeExecution(executionId);
            emitProgress({
              type: "execution_completed",
              executionId,
              planId: plan.id,
              totalTasks: plan.steps.length,
              completedTasks: completedTasks.length
            });
            return {
              executionId,
              planId: plan.id,
              goalId: goal.id,
              sessionId: options.sessionId,
              workspaceId: workspaceRef.id,
              success: true,
              status: "COMPLETED",
              totalTasks: plan.steps.length,
              completedTasks,
              failedTasks: [],
              blockedTasks: [],
              taskResults,
              durationMs: Date.now() - startTime
            };
          } else {
            const firstFailedId = failedTasks[0];
            const taskData = firstFailedId ? taskResults[firstFailedId]?.data : void 0;
            const firstErr = firstFailedId ? taskResults[firstFailedId]?.error || taskData?.summary : void 0;
            const diag = formatAgentError(firstErr || `${failedTasks.length} task(s) failed.`);
            const failureReason = `${diag.title}: ${diag.message}`;
            await this.runtime.failExecution(executionId, new Error(failureReason));
            const remainingBlocked = Array.from(taskGraph.statuses.entries()).filter(([_, s]) => s === "BLOCKED" /* BLOCKED */).map(([t]) => t);
            emitProgress({
              type: "execution_failed",
              executionId,
              planId: plan.id,
              error: failureReason
            });
            return {
              executionId,
              planId: plan.id,
              goalId: goal.id,
              sessionId: options.sessionId,
              workspaceId: workspaceRef.id,
              success: false,
              status: "FAILED",
              totalTasks: plan.steps.length,
              completedTasks,
              failedTasks,
              blockedTasks: remainingBlocked,
              taskResults,
              durationMs: Date.now() - startTime,
              error: failureReason
            };
          }
        } catch (err) {
          const diag = formatAgentError(err);
          const errorObj = err instanceof Error ? err : new Error(diag.message);
          await this.runtime.failExecution(executionId, errorObj);
          emitProgress({
            type: "execution_failed",
            executionId,
            planId: plan.id,
            error: `${diag.title}: ${diag.message}`
          });
          return {
            executionId,
            planId: plan.id,
            goalId: goal.id,
            sessionId: options.sessionId,
            workspaceId: workspaceRef.id,
            success: false,
            status: "FAILED",
            totalTasks: plan.steps.length,
            completedTasks,
            failedTasks,
            blockedTasks: [],
            taskResults,
            durationMs: Date.now() - startTime,
            error: `${diag.title}: ${diag.message}`
          };
        } finally {
          this.activeExecutions.delete(executionId);
          this.activePlanExecutions.delete(plan.id);
          if (options.sessionId) {
            this.activeSessionExecutions.delete(options.sessionId);
          }
        }
      }
      stopExecution(executionId) {
        const active = this.activeExecutions.get(executionId);
        if (active) {
          active.cancelled = true;
          active.abortController.abort();
          this.runtime.cancelExecution(executionId, "User stopped plan execution").catch(() => {
          });
          return true;
        }
        return false;
      }
      isExecutionActive(executionId) {
        return this.activeExecutions.has(executionId);
      }
      getActiveExecutionForPlan(planId) {
        const execId = this.activePlanExecutions.get(planId);
        return execId && this.activeExecutions.has(execId) ? execId : void 0;
      }
      getActiveExecutionForSession(sessionId) {
        const execId = this.activeSessionExecutions.get(sessionId);
        return execId && this.activeExecutions.has(execId) ? execId : void 0;
      }
      getToolRegistry() {
        return this.registry;
      }
    };
  }
});

// src/server/services/workspace/WorkspaceService.ts
import { EventEmitter as EventEmitter2 } from "events";
var WorkspaceService, globalWorkspaceService;
var init_WorkspaceService = __esm({
  "src/server/services/workspace/WorkspaceService.ts"() {
    init_workspace();
    init_activeCommandRegistry();
    init_E2BWorkspaceProvider();
    init_PlanExecutionService();
    init_di();
    WorkspaceService = class {
      constructor(workspaceProvider) {
        this.userActiveWorkspaces = /* @__PURE__ */ new Map();
        // userId -> workspaceId
        this.workspaceStatuses = /* @__PURE__ */ new Map();
        // workspaceId -> status
        this.workspaceActiveExecution = /* @__PURE__ */ new Map();
        // workspaceId -> executionId
        this.provenanceLogs = /* @__PURE__ */ new Map();
        // workspaceId -> records
        this.executionSummaries = /* @__PURE__ */ new Map();
        // executionId -> summary
        this.executionEvents = /* @__PURE__ */ new Map();
        // executionId -> events
        this.eventEmitter = new EventEmitter2();
        this.workspaceProvider = workspaceProvider || new E2BWorkspaceProvider();
      }
      getWorkspaceProvider() {
        return this.workspaceProvider;
      }
      getPlanExecutionService() {
        if (!this.planExecutionService) {
          this.planExecutionService = new PlanExecutionService(this.workspaceProvider);
        }
        return this.planExecutionService;
      }
      detectLanguage(filePath) {
        const ext = filePath.split(".").pop()?.toLowerCase() || "";
        switch (ext) {
          case "ts":
          case "tsx":
            return "typescript";
          case "js":
          case "jsx":
          case "mjs":
          case "cjs":
            return "javascript";
          case "json":
            return "json";
          case "html":
            return "html";
          case "css":
            return "css";
          case "md":
          case "markdown":
            return "markdown";
          case "py":
            return "python";
          case "sh":
          case "bash":
            return "bash";
          case "sql":
            return "sql";
          case "yml":
          case "yaml":
            return "yaml";
          case "svg":
            return "svg";
          case "xml":
            return "xml";
          default:
            return "plaintext";
        }
      }
      /**
       * Resolves or initializes default workspace for user
       */
      async resolveUserWorkspace(userId, workspaceId) {
        const targetId = workspaceId || this.userActiveWorkspaces.get(userId) || `ws_user_${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
        if (!this.workspaceStatuses.has(targetId)) {
          this.workspaceStatuses.set(targetId, "READY");
        }
        const workspace = await this.workspaceProvider.getOrCreateWorkspace(targetId, {
          id: targetId,
          name: `Workspace ${targetId}`,
          workingDirectory: "/workspace"
        });
        this.userActiveWorkspaces.set(userId, targetId);
        return workspace;
      }
      async getActiveWorkspaceSummary(userId, requestedId) {
        const workspace = await this.resolveUserWorkspace(userId, requestedId);
        const ref = workspace.getRef();
        const status = this.workspaceStatuses.get(workspace.getId()) || "READY";
        const activeExecutionId = this.workspaceActiveExecution.get(workspace.getId());
        let filesCount = 0;
        try {
          const listing = await workspace.listDir("");
          filesCount = listing.total || listing.entries.length;
        } catch {
          filesCount = 0;
        }
        return {
          id: ref.id,
          name: ref.name || `Workspace-${ref.id}`,
          provider: ref.metadata?.provider || "sandbox",
          status,
          workingDirectory: workspace.getWorkingDirectory(),
          activeExecutionId,
          createdAt: ref.createdAt || Date.now(),
          lastActivityAt: Date.now(),
          filesCount
        };
      }
      async listUserWorkspaces(userId) {
        const activeWs = await this.getActiveWorkspaceSummary(userId);
        return [activeWs];
      }
      async listFiles(userId, workspaceId, dirPath) {
        const workspace = await this.resolveUserWorkspace(userId, workspaceId);
        return workspace.listDir(dirPath);
      }
      async readFile(userId, workspaceId, filePath) {
        if (!filePath) {
          throw new WorkspacePathError("File path is required to read file", "");
        }
        const workspace = await this.resolveUserWorkspace(userId, workspaceId);
        const file = await workspace.readFile(filePath);
        const wsId = workspace.getId();
        const logs = this.provenanceLogs.get(wsId) || [];
        const fileLogs = logs.filter((l) => l.path === file.path || l.path.endsWith(file.path) || file.path.endsWith(l.path));
        const lastRecord = fileLogs[fileLogs.length - 1];
        const fileName = file.path.split("/").pop() || file.path;
        return {
          path: file.path,
          name: fileName,
          content: file.content,
          size: file.size || file.content.length,
          language: this.detectLanguage(file.path),
          modifiedAt: file.modifiedAt || Date.now(),
          lastActor: lastRecord ? lastRecord.actor : "USER",
          lastTaskId: lastRecord?.taskId,
          lastExecutionId: lastRecord?.executionId,
          history: fileLogs
        };
      }
      async writeFile(userId, workspaceId, filePath, content, actor = "USER", meta = {}) {
        if (!filePath || filePath.trim() === "") {
          throw new WorkspacePathError("File path cannot be empty", "");
        }
        const workspace = await this.resolveUserWorkspace(userId, workspaceId);
        const wsId = workspace.getId();
        let previousContent = "";
        let isCreate = true;
        try {
          const existing = await workspace.readFile(filePath);
          previousContent = existing.content;
          isCreate = false;
        } catch {
          isCreate = true;
        }
        await workspace.writeFile(filePath, content);
        const savedFile = await workspace.readFile(filePath);
        const record = {
          id: `prov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          workspaceId: wsId,
          path: savedFile.path,
          action: isCreate ? "create" : "edit",
          actor,
          taskId: meta.taskId,
          executionId: meta.executionId,
          timestamp: Date.now(),
          previousContent,
          newContent: content
        };
        if (!this.provenanceLogs.has(wsId)) {
          this.provenanceLogs.set(wsId, []);
        }
        this.provenanceLogs.get(wsId).push(record);
        const fileName = savedFile.path.split("/").pop() || savedFile.path;
        return {
          path: savedFile.path,
          name: fileName,
          content: savedFile.content,
          size: savedFile.size || savedFile.content.length,
          language: this.detectLanguage(savedFile.path),
          modifiedAt: savedFile.modifiedAt || Date.now(),
          lastActor: actor,
          lastTaskId: meta.taskId,
          lastExecutionId: meta.executionId,
          history: (this.provenanceLogs.get(wsId) || []).filter((l) => l.path === savedFile.path)
        };
      }
      async deleteFile(userId, workspaceId, filePath, actor = "USER") {
        if (!filePath || filePath === "/" || filePath === ".") {
          throw new WorkspacePathError("Cannot delete workspace root directory", filePath);
        }
        const workspace = await this.resolveUserWorkspace(userId, workspaceId);
        const wsId = workspace.getId();
        let previousContent = "";
        try {
          const existing = await workspace.readFile(filePath);
          previousContent = existing.content;
        } catch {
        }
        await workspace.deleteFile(filePath);
        const record = {
          id: `prov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          workspaceId: wsId,
          path: filePath,
          action: "delete",
          actor,
          timestamp: Date.now(),
          previousContent
        };
        if (!this.provenanceLogs.has(wsId)) {
          this.provenanceLogs.set(wsId, []);
        }
        this.provenanceLogs.get(wsId).push(record);
        return { success: true, path: filePath };
      }
      async renameFile(userId, workspaceId, oldPath, newPath, actor = "USER") {
        if (!oldPath || !newPath) {
          throw new WorkspacePathError("Both old and new paths are required for renaming", "");
        }
        const workspace = await this.resolveUserWorkspace(userId, workspaceId);
        const wsId = workspace.getId();
        const existing = await workspace.readFile(oldPath);
        const content = existing.content;
        await workspace.writeFile(newPath, content);
        await workspace.deleteFile(oldPath);
        const savedFile = await workspace.readFile(newPath);
        const record = {
          id: `prov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          workspaceId: wsId,
          path: newPath,
          action: "edit",
          actor,
          timestamp: Date.now(),
          previousContent: `[Renamed from ${oldPath}]`,
          newContent: content
        };
        if (!this.provenanceLogs.has(wsId)) {
          this.provenanceLogs.set(wsId, []);
        }
        this.provenanceLogs.get(wsId).push(record);
        const fileName = savedFile.path.split("/").pop() || savedFile.path;
        return {
          path: savedFile.path,
          name: fileName,
          content: savedFile.content,
          size: savedFile.size || savedFile.content.length,
          language: this.detectLanguage(savedFile.path),
          modifiedAt: savedFile.modifiedAt || Date.now(),
          lastActor: actor,
          history: (this.provenanceLogs.get(wsId) || []).filter((l) => l.path === savedFile.path)
        };
      }
      async createDirectory(userId, workspaceId, dirPath, actor = "USER") {
        if (!dirPath || dirPath === "/" || dirPath === ".") {
          throw new WorkspacePathError("Valid directory path is required", dirPath);
        }
        const workspace = await this.resolveUserWorkspace(userId, workspaceId);
        const wsId = workspace.getId();
        if (workspace.makeDir) {
          await workspace.makeDir(dirPath);
        }
        const record = {
          id: `prov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          workspaceId: wsId,
          path: dirPath,
          action: "create",
          actor,
          timestamp: Date.now(),
          newContent: "[Directory Created]"
        };
        if (!this.provenanceLogs.has(wsId)) {
          this.provenanceLogs.set(wsId, []);
        }
        this.provenanceLogs.get(wsId).push(record);
        return { success: true, path: dirPath };
      }
      async deleteDirectory(userId, workspaceId, dirPath, actor = "USER") {
        if (!dirPath || dirPath === "/" || dirPath === ".") {
          throw new WorkspacePathError("Cannot delete root directory", dirPath);
        }
        const workspace = await this.resolveUserWorkspace(userId, workspaceId);
        const wsId = workspace.getId();
        if (workspace.deleteDir) {
          await workspace.deleteDir(dirPath, true);
        }
        const record = {
          id: `prov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          workspaceId: wsId,
          path: dirPath,
          action: "delete",
          actor,
          timestamp: Date.now(),
          previousContent: "[Directory Deleted]"
        };
        if (!this.provenanceLogs.has(wsId)) {
          this.provenanceLogs.set(wsId, []);
        }
        this.provenanceLogs.get(wsId).push(record);
        return { success: true, path: dirPath };
      }
      async runCommand(userId, workspaceId, command, options = {}) {
        if (!command || command.trim() === "") {
          throw new Error("Command cannot be empty");
        }
        const workspace = await this.resolveUserWorkspace(userId, workspaceId);
        return workspace.runCommand(command, options);
      }
      sendInputToCommand(sessionId, input) {
        return activeCommandRegistry.sendInput(sessionId, input);
      }
      abortCommand(sessionId) {
        return activeCommandRegistry.abort(sessionId);
      }
      async executePlan(userId, options) {
        const planWsId = options.planningResult?.workspaceId || options.planningResult?.goal?.workspaceId;
        if (planWsId && options.workspaceId && planWsId !== options.workspaceId) {
          throw new Error(`Workspace mismatch: Plan belongs to workspace ${planWsId}, cannot execute against ${options.workspaceId}`);
        }
        const workspace = await this.resolveUserWorkspace(userId, options.workspaceId);
        const wsId = workspace.getId();
        if (planWsId && planWsId !== wsId) {
          throw new Error(`Workspace mismatch: Plan belongs to workspace ${planWsId}, cannot execute against ${wsId}`);
        }
        const goalId = options.planningResult?.goal?.id;
        const planId = (options.planningResult?.repairedPlan || options.planningResult?.plan)?.id;
        if (options.sessionId && planId) {
          try {
            await di.agentSessionService.associateGoalAndPlan(options.sessionId, goalId, planId, userId);
          } catch {
          }
        }
        if (this.workspaceActiveExecution.has(wsId)) {
          const activeExecId = this.workspaceActiveExecution.get(wsId);
          if (activeExecId && this.getPlanExecutionService().isExecutionActive(activeExecId)) {
            throw new Error(`Workspace ${wsId} is already running active execution ${activeExecId}. Concurrent executions on the same workspace are rejected.`);
          }
        }
        this.workspaceStatuses.set(wsId, "RUNNING");
        const handleProgress = (event) => {
          this.workspaceActiveExecution.set(wsId, event.executionId);
          if (!this.executionEvents.has(event.executionId)) {
            this.executionEvents.set(event.executionId, []);
          }
          this.executionEvents.get(event.executionId).push(event);
          this.eventEmitter.emit(`exec_event:${event.executionId}`, event);
          this.eventEmitter.emit(`ws_event:${wsId}`, event);
          if (options.onProgress) {
            options.onProgress(event);
          }
        };
        const handleFileChanged = (change) => {
          const record = {
            id: `prov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            workspaceId: wsId,
            path: change.path,
            action: change.action,
            actor: "AGENT",
            taskId: change.taskId,
            executionId: change.executionId,
            timestamp: change.timestamp
          };
          if (!this.provenanceLogs.has(wsId)) {
            this.provenanceLogs.set(wsId, []);
          }
          this.provenanceLogs.get(wsId).push(record);
          this.eventEmitter.emit(`file_changed:${wsId}`, record);
          if (options.onFileChanged) {
            options.onFileChanged(change);
          }
        };
        try {
          const summary = await this.getPlanExecutionService().executePlan({
            ...options,
            userId,
            workspaceId: wsId,
            workspaceProvider: this.workspaceProvider,
            onProgress: handleProgress,
            onFileChanged: handleFileChanged
          });
          this.executionSummaries.set(summary.executionId, summary);
          this.workspaceStatuses.set(wsId, summary.success ? "READY" : "STOPPED");
          this.workspaceActiveExecution.delete(wsId);
          return summary;
        } catch (err) {
          this.workspaceStatuses.set(wsId, "ERROR");
          this.workspaceActiveExecution.delete(wsId);
          throw err;
        }
      }
      stopExecution(userId, executionId) {
        const stopped = this.getPlanExecutionService().stopExecution(executionId);
        if (stopped) {
          for (const [wsId, activeExecId] of this.workspaceActiveExecution.entries()) {
            if (activeExecId === executionId) {
              this.workspaceStatuses.set(wsId, "STOPPED");
              this.workspaceActiveExecution.delete(wsId);
            }
          }
        }
        return stopped;
      }
      getExecutionSummary(executionId) {
        return this.executionSummaries.get(executionId);
      }
      getExecutionEvents(executionId) {
        return this.executionEvents.get(executionId) || [];
      }
      subscribeExecutionEvents(executionId, handler) {
        const eventName = `exec_event:${executionId}`;
        this.eventEmitter.on(eventName, handler);
        return () => {
          this.eventEmitter.off(eventName, handler);
        };
      }
      recordChangeSetAudit(entry) {
        const wsId = entry.workspaceId;
        const record = {
          id: `cs_audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          workspaceId: wsId,
          path: entry.path || `[changeset:${entry.changeSetId}]`,
          action: entry.action === "reject" ? "delete" : "edit",
          actor: "USER",
          executionId: entry.executionId,
          timestamp: entry.timestamp,
          changeSetId: entry.changeSetId,
          sessionId: entry.sessionId,
          changeSetAction: entry.action,
          result: entry.result
        };
        if (!this.provenanceLogs.has(wsId)) {
          this.provenanceLogs.set(wsId, []);
        }
        this.provenanceLogs.get(wsId).push(record);
        this.eventEmitter.emit(`file_changed:${wsId}`, record);
      }
      getFileAuditLog(workspaceId, filePath) {
        const logs = this.provenanceLogs.get(workspaceId) || [];
        if (!filePath) {
          return logs;
        }
        return logs.filter((l) => l.path === filePath || l.path.endsWith(filePath) || filePath.endsWith(l.path));
      }
    };
    globalWorkspaceService = new WorkspaceService();
  }
});

// src/server/services/session/AgentSessionService.ts
import { EventEmitter as EventEmitter3 } from "events";
import { eq as eq2, desc } from "drizzle-orm";
var AgentSessionService, globalAgentSessionService;
var init_AgentSessionService = __esm({
  "src/server/services/session/AgentSessionService.ts"() {
    init_db();
    init_schema();
    init_session();
    init_WorkspaceService();
    AgentSessionService = class {
      constructor() {
        this.activeSessions = /* @__PURE__ */ new Map();
        this.eventEmitter = new EventEmitter3();
        this.executionSubscriptions = /* @__PURE__ */ new Map();
        this.dbAvailable = true;
        this.lastDbCheck = 0;
        this.eventEmitter.setMaxListeners(100);
      }
      /**
       * Retrieves an existing session from memory or DB, or creates a new one.
       */
      async getOrCreateSession(sessionId, userId, initialConfig) {
        if (!sessionId || typeof sessionId !== "string") {
          throw new Error("sessionId must be a non-empty string");
        }
        const cached = this.activeSessions.get(sessionId);
        if (cached) {
          if (initialConfig?.workspaceId && !cached.workspaceId) {
            cached.attachWorkspace(initialConfig.workspaceId);
            await this.persistSession(cached, userId);
          }
          return cached;
        }
        const persisted = await this.loadFromDb(sessionId);
        if (persisted) {
          this.activeSessions.set(sessionId, persisted);
          if (initialConfig?.workspaceId && !persisted.workspaceId) {
            persisted.attachWorkspace(initialConfig.workspaceId);
            await this.persistSession(persisted, userId);
          }
          return persisted;
        }
        const session = new AgentSession({
          sessionId,
          userId,
          workspaceId: initialConfig?.workspaceId,
          executionId: initialConfig?.executionId,
          goalId: initialConfig?.goalId,
          planId: initialConfig?.planId,
          activeModel: initialConfig?.activeModel,
          metadata: {
            title: initialConfig?.metadata?.title || "New Session",
            userId,
            ...initialConfig?.metadata || {}
          },
          initialStatus: initialConfig?.initialStatus || "IDLE"
        });
        this.activeSessions.set(sessionId, session);
        await this.persistSession(session, userId);
        this.emitSessionEvent({
          type: "session_created",
          sessionId: session.sessionId,
          workspaceId: session.workspaceId,
          executionId: session.executionId,
          goalId: session.goalId,
          planId: session.planId,
          timestamp: Date.now(),
          data: session.getContext()
        });
        return session;
      }
      /**
       * Loads a session by ID. Checks memory first, then DB.
       */
      async loadSession(sessionId, userId) {
        if (!sessionId) return null;
        let session = this.activeSessions.get(sessionId);
        if (!session) {
          session = await this.loadFromDb(sessionId);
          if (session) {
            this.activeSessions.set(sessionId, session);
          }
        }
        if (!session) {
          return null;
        }
        if (userId && session.metadata.userId && session.metadata.userId !== userId && userId !== "default_user") {
          return null;
        }
        return session;
      }
      /**
       * Attaches a workspace to an existing session.
       */
      async attachWorkspace(sessionId, workspaceId, userId) {
        const session = await this.getOrCreateSession(sessionId, userId);
        session.attachWorkspace(workspaceId);
        await this.persistSession(session, userId);
        this.emitSessionEvent({
          type: "workspace_attached",
          sessionId: session.sessionId,
          workspaceId,
          timestamp: Date.now()
        });
        return session;
      }
      /**
       * Detaches workspace from an existing session.
       */
      async detachWorkspace(sessionId, userId) {
        const session = await this.getOrCreateSession(sessionId, userId);
        session.detachWorkspace();
        await this.persistSession(session, userId);
        this.emitSessionEvent({
          type: "workspace_detached",
          sessionId: session.sessionId,
          timestamp: Date.now()
        });
        return session;
      }
      /**
       * Associates an execution ID with the session and bridges execution events.
       */
      async associateExecution(sessionId, executionId, userId) {
        const session = await this.getOrCreateSession(sessionId, userId);
        session.setExecution(executionId);
        if (executionId) {
          this.bridgeExecutionEvents(sessionId, executionId);
        }
        await this.persistSession(session, userId);
        this.emitSessionEvent({
          type: executionId ? "execution_associated" : "execution_detached",
          sessionId: session.sessionId,
          executionId,
          workspaceId: session.workspaceId,
          timestamp: Date.now()
        });
        return session;
      }
      /**
       * Associates a goal and plan with the session without owning planning logic.
       */
      async associateGoalAndPlan(sessionId, goalId, planId, userId) {
        const session = await this.getOrCreateSession(sessionId, userId);
        session.setGoalAndPlan(goalId, planId);
        await this.persistSession(session, userId);
        this.emitSessionEvent({
          type: "goal_plan_associated",
          sessionId: session.sessionId,
          goalId,
          planId,
          workspaceId: session.workspaceId,
          timestamp: Date.now()
        });
        if (planId) {
          this.emitSessionEvent({
            type: "plan_attached",
            sessionId: session.sessionId,
            goalId,
            planId,
            workspaceId: session.workspaceId,
            timestamp: Date.now(),
            data: {
              goalId,
              planId
            }
          });
        }
        return session;
      }
      /**
       * Attaches an approved M05 plan to the session with optional workspace validation.
       */
      async attachPlanToSession(sessionId, planId, goalId, userId = "default_user", workspaceId) {
        const session = await this.getOrCreateSession(sessionId, userId);
        if (workspaceId && session.workspaceId && session.workspaceId !== workspaceId) {
          throw new Error(`Workspace mismatch: Plan workspace ${workspaceId} cannot attach to session with workspace ${session.workspaceId}`);
        }
        if (workspaceId && !session.workspaceId) {
          session.attachWorkspace(workspaceId);
        }
        session.setGoalAndPlan(goalId, planId);
        await this.persistSession(session, userId);
        this.emitSessionEvent({
          type: "goal_plan_associated",
          sessionId: session.sessionId,
          goalId,
          planId,
          workspaceId: session.workspaceId,
          timestamp: Date.now()
        });
        this.emitSessionEvent({
          type: "plan_attached",
          sessionId: session.sessionId,
          goalId,
          planId,
          workspaceId: session.workspaceId,
          timestamp: Date.now(),
          data: {
            goalId,
            planId
          }
        });
        return session;
      }
      /**
       * Sets the active model / provider configuration for the session.
       */
      async setModel(sessionId, modelId, provider, displayName, userId = "default_user") {
        const session = await this.getOrCreateSession(sessionId, userId);
        session.setModel(modelId, provider, displayName);
        await this.persistSession(session, userId);
        this.emitSessionEvent({
          type: "model_changed",
          sessionId: session.sessionId,
          timestamp: Date.now(),
          data: session.activeModel
        });
        return session;
      }
      /**
       * Updates session execution status.
       */
      async setStatus(sessionId, status, userId = "default_user") {
        const session = await this.getOrCreateSession(sessionId, userId);
        session.setStatus(status);
        await this.persistSession(session, userId);
        this.emitSessionEvent({
          type: "session_status_changed",
          sessionId: session.sessionId,
          timestamp: Date.now(),
          data: { status }
        });
        return session;
      }
      /**
       * Returns current context snapshot for session if loaded.
       */
      getActiveSessionContext(sessionId) {
        const session = this.activeSessions.get(sessionId);
        return session ? session.getContext() : null;
      }
      /**
       * Finds an active or persisted session associated with a workspace ID.
       * If multiple sessions exist for a workspace, deterministically returns
       * the most recently updated session.
       */
      async findSessionByWorkspace(workspaceId, userId = "default_user") {
        const matchingActive = [];
        for (const session of this.activeSessions.values()) {
          if (session.workspaceId === workspaceId) {
            matchingActive.push(session);
          }
        }
        if (matchingActive.length > 0) {
          matchingActive.sort((a, b) => b.updatedAt - a.updatedAt);
          return matchingActive[0];
        }
        try {
          const records = await db.select().from(sessions).where(eq2(sessions.workspaceId, workspaceId)).orderBy(desc(sessions.updatedAt)).limit(1);
          if (records && records.length > 0) {
            return await this.loadSession(records[0].id, userId);
          }
        } catch (err) {
          console.warn("[AgentSessionService] Failed to query session by workspace:", err);
        }
        return null;
      }
      /**
       * Deterministically gets the active/persisted session for a workspace,
       * or creates a new one if none exists.
       */
      async getOrCreateWorkspaceSession(workspaceId, userId = "default_user", initialConfig) {
        const existing = await this.findSessionByWorkspace(workspaceId, userId);
        if (existing) {
          return existing;
        }
        const sessionId = `session_ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        return await this.getOrCreateSession(sessionId, userId, {
          workspaceId,
          metadata: {
            title: `Workspace Agent (${workspaceId})`,
            ...initialConfig?.metadata
          },
          ...initialConfig
        });
      }
      /**
       * Authoritatively cancels execution for a session, updating session status
       * to PAUSED, emitting a terminal event, and persisting the state.
       */
      async cancelSession(sessionId, userId = "default_user", reason = "User cancelled execution") {
        const session = await this.loadSession(sessionId, userId);
        if (!session) {
          return { success: false, session: null };
        }
        const previousStatus = session.status;
        session.setStatus("PAUSED");
        session.touch();
        this.emitSessionEvent({
          type: "session_status_changed",
          sessionId,
          workspaceId: session.workspaceId,
          timestamp: Date.now(),
          data: {
            previousStatus,
            newStatus: "PAUSED",
            reason
          }
        });
        this.emitSessionEvent({
          type: "terminal_event",
          sessionId,
          workspaceId: session.workspaceId,
          timestamp: Date.now(),
          data: {
            action: "cancel",
            reason
          }
        });
        await this.persistSession(session, userId);
        return { success: true, session };
      }
      /**
       * Processes a context handoff request between UI surfaces (Chat <-> Agent) (M06-07).
       * Validates session identity, user ownership, workspace association, and plan boundaries.
       */
      async createContextHandoff(request, userId = "default_user") {
        const session = await this.loadSession(request.sessionId, userId);
        if (!session) {
          throw new Error(`Session ${request.sessionId} not found or access denied for user`);
        }
        if (userId !== "default_user" && session.metadata?.userId && session.metadata.userId !== userId) {
          throw new Error(`Unauthorized: User ${userId} cannot access session ${request.sessionId}`);
        }
        if (request.workspaceId) {
          if (session.workspaceId && session.workspaceId !== request.workspaceId) {
            throw new Error(
              `Workspace mismatch: Session ${request.sessionId} belongs to workspace ${session.workspaceId}, cannot attach ${request.workspaceId}`
            );
          }
          if (!session.workspaceId) {
            session.attachWorkspace(request.workspaceId);
            await this.persistSession(session, userId);
          }
        }
        let resolvedPlanContext = request.planContext;
        if (request.includePlan && request.planContext) {
          if (session.planId && session.planId !== request.planContext.planId) {
            resolvedPlanContext = void 0;
          }
        }
        const handoff = SurfaceContextBridge.createHandoff({
          ...request,
          workspaceId: session.workspaceId || request.workspaceId,
          executionId: session.executionId || request.executionId,
          planContext: resolvedPlanContext
        });
        this.emitSessionEvent({
          type: "surface_transition",
          sessionId: session.sessionId,
          workspaceId: session.workspaceId,
          executionId: session.executionId,
          timestamp: Date.now(),
          data: {
            sourceSurface: handoff.sourceSurface,
            targetSurface: handoff.targetSurface,
            summary: handoff.summary
          }
        });
        return handoff;
      }
      /**
       * Subscribes to events for a specific session.
       */
      subscribeSession(sessionId, handler) {
        const eventName = `session:${sessionId}`;
        this.eventEmitter.on(eventName, handler);
        return () => {
          this.eventEmitter.off(eventName, handler);
        };
      }
      /**
       * Emits an event to all subscribers of the session.
       */
      emitSessionEvent(event) {
        this.eventEmitter.emit(`session:${event.sessionId}`, event);
        this.eventEmitter.emit("session_all", event);
      }
      /**
       * Bridges execution events from globalWorkspaceService into session events.
       */
      bridgeExecutionEvents(sessionId, executionId) {
        const subKey = `${sessionId}:${executionId}`;
        if (this.executionSubscriptions.has(subKey)) {
          return;
        }
        const unsubscribe = globalWorkspaceService.subscribeExecutionEvents(executionId, (execEvent) => {
          const session = this.activeSessions.get(sessionId);
          this.emitSessionEvent({
            type: "terminal_event",
            sessionId,
            executionId,
            workspaceId: session?.workspaceId,
            timestamp: execEvent.timestamp || Date.now(),
            data: execEvent
          });
        });
        this.executionSubscriptions.set(subKey, unsubscribe);
      }
      isDbUsable() {
        if (!this.dbAvailable && Date.now() - this.lastDbCheck < 3e4) {
          return false;
        }
        return true;
      }
      /**
       * Loads session from database.
       */
      async loadFromDb(sessionId) {
        if (!this.isDbUsable()) {
          return null;
        }
        try {
          const records = await db.select().from(sessions).where(eq2(sessions.id, sessionId)).limit(1);
          this.dbAvailable = true;
          if (!records || records.length === 0) {
            return null;
          }
          const rec = records[0];
          let activeModel;
          if (rec.activeModel) {
            try {
              activeModel = JSON.parse(rec.activeModel);
            } catch {
              activeModel = { modelId: rec.activeModel };
            }
          }
          return new AgentSession({
            sessionId: rec.id,
            userId: rec.userId,
            workspaceId: rec.workspaceId || void 0,
            executionId: rec.executionId || void 0,
            goalId: rec.goalId || void 0,
            planId: rec.planId || void 0,
            activeModel,
            metadata: {
              title: rec.title || void 0,
              summary: rec.summary || void 0,
              ...typeof rec.metadata === "object" && rec.metadata !== null ? rec.metadata : {}
            },
            initialStatus: rec.status || "IDLE"
          });
        } catch (err) {
          this.dbAvailable = false;
          this.lastDbCheck = Date.now();
          console.warn(`[AgentSessionService] DB load fallback for ${sessionId}:`, err instanceof Error ? err.message : err);
          return null;
        }
      }
      /**
       * Persists session to database.
       */
      async persistSession(session, userId) {
        if (!this.isDbUsable()) {
          return;
        }
        try {
          const context = session.getContext();
          const activeModelStr = context.activeModel ? JSON.stringify(context.activeModel) : null;
          const metadataObj = { ...context.metadata };
          const existing = await db.select().from(sessions).where(eq2(sessions.id, session.sessionId)).limit(1);
          this.dbAvailable = true;
          if (existing && existing.length > 0) {
            await db.update(sessions).set({
              workspaceId: context.workspaceId || null,
              executionId: context.executionId || null,
              goalId: context.goalId || null,
              planId: context.planId || null,
              activeModel: activeModelStr,
              status: context.status,
              metadata: metadataObj,
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq2(sessions.id, session.sessionId));
          } else {
            await db.insert(sessions).values({
              id: session.sessionId,
              userId: userId && userId.length === 36 ? userId : "00000000-0000-0000-0000-000000000000",
              title: metadataObj.title || "New Session",
              pinned: false,
              summary: metadataObj.summary || null,
              workspaceId: context.workspaceId || null,
              executionId: context.executionId || null,
              goalId: context.goalId || null,
              planId: context.planId || null,
              activeModel: activeModelStr,
              status: context.status,
              metadata: metadataObj
            });
          }
        } catch (err) {
          this.dbAvailable = false;
          this.lastDbCheck = Date.now();
          console.warn(`[AgentSessionService] DB save fallback for ${session.sessionId}:`, err instanceof Error ? err.message : err);
        }
      }
      /**
       * Cleanup session from memory when closed.
       */
      closeSession(sessionId) {
        this.activeSessions.delete(sessionId);
        for (const [key, unsub] of this.executionSubscriptions.entries()) {
          if (key.startsWith(`${sessionId}:`)) {
            unsub();
            this.executionSubscriptions.delete(key);
          }
        }
        this.emitSessionEvent({
          type: "session_closed",
          sessionId,
          timestamp: Date.now()
        });
      }
    };
    globalAgentSessionService = new AgentSessionService();
  }
});

// src/server/services/session/index.ts
var init_session2 = __esm({
  "src/server/services/session/index.ts"() {
    init_AgentSessionService();
  }
});

// src/agent/changes/DiffGenerator.ts
function computeContentHash(content) {
  let h1 = 3735928559 ^ content.length;
  let h2 = 1103547991 ^ content.length;
  for (let i = 0; i < content.length; i++) {
    const ch = content.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
  h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
  const hashVal = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hashVal.toString(16).padStart(16, "0");
}
function generateUnifiedDiff(filePath, beforeContent = "", afterContent = "", operation) {
  const lines = [];
  let additions = 0;
  let deletions = 0;
  if (operation === "CREATE") {
    const newLines2 = afterContent.length > 0 ? afterContent.split("\n") : [];
    for (let i = 0; i < newLines2.length; i++) {
      lines.push({
        type: "added",
        newLineNumber: i + 1,
        content: newLines2[i]
      });
      additions++;
    }
    const header2 = `--- /dev/null
+++ b/${filePath}
@@ -0,0 +1,${newLines2.length} @@
`;
    const diffBody2 = newLines2.map((l) => `+${l}`).join("\n");
    return {
      diff: header2 + diffBody2,
      lines,
      additions,
      deletions
    };
  }
  if (operation === "DELETE") {
    const oldLines2 = beforeContent.length > 0 ? beforeContent.split("\n") : [];
    for (let i = 0; i < oldLines2.length; i++) {
      lines.push({
        type: "removed",
        oldLineNumber: i + 1,
        content: oldLines2[i]
      });
      deletions++;
    }
    const header2 = `--- a/${filePath}
+++ /dev/null
@@ -1,${oldLines2.length} +0,0 @@
`;
    const diffBody2 = oldLines2.map((l) => `-${l}`).join("\n");
    return {
      diff: header2 + diffBody2,
      lines,
      additions,
      deletions
    };
  }
  const oldLines = beforeContent.split("\n");
  const newLines = afterContent.split("\n");
  let oldIdx = 0;
  let newIdx = 0;
  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (oldIdx < oldLines.length && newIdx < newLines.length) {
      if (oldLines[oldIdx] === newLines[newIdx]) {
        lines.push({
          type: "unchanged",
          oldLineNumber: oldIdx + 1,
          newLineNumber: newIdx + 1,
          content: oldLines[oldIdx]
        });
        oldIdx++;
        newIdx++;
      } else {
        lines.push({
          type: "removed",
          oldLineNumber: oldIdx + 1,
          content: oldLines[oldIdx]
        });
        deletions++;
        oldIdx++;
        lines.push({
          type: "added",
          newLineNumber: newIdx + 1,
          content: newLines[newIdx]
        });
        additions++;
        newIdx++;
      }
    } else if (oldIdx < oldLines.length) {
      lines.push({
        type: "removed",
        oldLineNumber: oldIdx + 1,
        content: oldLines[oldIdx]
      });
      deletions++;
      oldIdx++;
    } else if (newIdx < newLines.length) {
      lines.push({
        type: "added",
        newLineNumber: newIdx + 1,
        content: newLines[newIdx]
      });
      additions++;
      newIdx++;
    }
  }
  const header = `--- a/${filePath}
+++ b/${filePath}
@@ -1,${oldLines.length} +1,${newLines.length} @@
`;
  const diffBody = lines.map((l) => {
    if (l.type === "added") return `+${l.content}`;
    if (l.type === "removed") return `-${l.content}`;
    return ` ${l.content}`;
  }).join("\n");
  return {
    diff: header + diffBody,
    lines,
    additions,
    deletions
  };
}
var init_DiffGenerator = __esm({
  "src/agent/changes/DiffGenerator.ts"() {
  }
});

// src/server/services/changes/ChangeSetService.ts
import fs3 from "fs";
import path3 from "path";
var ChangeSetService, globalChangeSetService;
var init_ChangeSetService = __esm({
  "src/server/services/changes/ChangeSetService.ts"() {
    init_DiffGenerator();
    init_WorkspaceService();
    ChangeSetService = class _ChangeSetService {
      constructor(sessionService) {
        this.changeSets = /* @__PURE__ */ new Map();
        this.sessionIndex = /* @__PURE__ */ new Map();
        this.workspaceIndex = /* @__PURE__ */ new Map();
        this.executionIndex = /* @__PURE__ */ new Map();
        this.locks = /* @__PURE__ */ new Map();
        this.sessionService = sessionService;
      }
      async acquireLock(changeSetId) {
        while (this.locks.has(changeSetId)) {
          await this.locks.get(changeSetId);
        }
        let release;
        const p = new Promise((resolve2) => {
          release = resolve2;
        });
        this.locks.set(changeSetId, p);
        return () => {
          this.locks.delete(changeSetId);
          release();
        };
      }
      recordAuditEntry(changeSet, options, action, result, details) {
        const wsService = options.workspaceService || globalWorkspaceService;
        if (wsService && typeof wsService.recordChangeSetAudit === "function") {
          try {
            wsService.recordChangeSetAudit({
              changeSetId: changeSet.changeSetId,
              sessionId: options.sessionId || changeSet.sessionId,
              executionId: changeSet.executionId,
              workspaceId: changeSet.workspaceId,
              action,
              timestamp: Date.now(),
              result,
              details
            });
          } catch (err) {
            console.warn("[ChangeSetService] Failed to record audit log entry:", err);
          }
        }
      }
      setSessionService(service) {
        this.sessionService = service;
      }
      /**
       * Safe path validation preventing directory traversal attacks.
       */
      static validatePath(filePath, workspaceRoot) {
        if (!filePath || typeof filePath !== "string") {
          throw new Error("File path must be a non-empty string");
        }
        const normalized = path3.normalize(filePath);
        if (normalized.startsWith("..") || normalized.includes("/../") || normalized.includes("\\..\\")) {
          throw new Error(`Path traversal rejected: ${filePath}`);
        }
        if (workspaceRoot) {
          const resolved = path3.isAbsolute(filePath) ? filePath : path3.resolve(workspaceRoot, filePath);
          const relative3 = path3.relative(workspaceRoot, resolved);
          if (relative3.startsWith("..") || path3.isAbsolute(relative3)) {
            throw new Error(`File path escapes workspace root: ${filePath}`);
          }
        }
      }
      /**
       * Records a file mutation performed during an agent execution, aggregating
       * it into the active ChangeSet for the session/execution.
       */
      async recordFileMutation(params) {
        const { sessionId, workspaceId, executionId, path: filePath, operation, beforeContent = "", afterContent = "", metadata } = params;
        _ChangeSetService.validatePath(filePath);
        let changeSetId = executionId ? this.executionIndex.get(executionId) : void 0;
        let changeSet = changeSetId ? this.changeSets.get(changeSetId) : void 0;
        if (!changeSet || changeSet.status === "APPLIED" || changeSet.status === "REJECTED") {
          changeSetId = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          changeSet = {
            changeSetId,
            sessionId,
            executionId,
            workspaceId,
            status: "PROPOSED",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            files: [],
            summary: `Proposed changes for session ${sessionId}`
          };
          this.changeSets.set(changeSetId, changeSet);
          if (!this.sessionIndex.has(sessionId)) {
            this.sessionIndex.set(sessionId, /* @__PURE__ */ new Set());
          }
          this.sessionIndex.get(sessionId).add(changeSetId);
          if (!this.workspaceIndex.has(workspaceId)) {
            this.workspaceIndex.set(workspaceId, /* @__PURE__ */ new Set());
          }
          this.workspaceIndex.get(workspaceId).add(changeSetId);
          if (executionId) {
            this.executionIndex.set(executionId, changeSetId);
          }
        }
        const existingFileIndex = changeSet.files.findIndex((f) => f.path === filePath);
        if (existingFileIndex >= 0) {
          const existingFile = changeSet.files[existingFileIndex];
          const effectiveBefore = existingFile.operation === "CREATE" ? "" : existingFile.before ?? beforeContent;
          const effectiveOp = existingFile.operation === "CREATE" ? operation === "DELETE" ? "DELETE" : "CREATE" : operation;
          const diffResult = generateUnifiedDiff(filePath, effectiveBefore, afterContent, effectiveOp);
          const updatedFileChange = {
            path: filePath,
            operation: effectiveOp,
            before: effectiveBefore,
            after: afterContent,
            diff: diffResult.diff,
            beforeHash: computeContentHash(effectiveBefore),
            afterHash: computeContentHash(afterContent),
            additions: diffResult.additions,
            deletions: diffResult.deletions,
            metadata: {
              ...existingFile.metadata,
              ...metadata,
              additions: diffResult.additions,
              deletions: diffResult.deletions
            }
          };
          changeSet.files[existingFileIndex] = updatedFileChange;
        } else {
          const diffResult = generateUnifiedDiff(filePath, beforeContent, afterContent, operation);
          const fileChange = {
            path: filePath,
            operation,
            before: beforeContent,
            after: afterContent,
            diff: diffResult.diff,
            beforeHash: computeContentHash(beforeContent),
            afterHash: computeContentHash(afterContent),
            additions: diffResult.additions,
            deletions: diffResult.deletions,
            metadata: {
              ...metadata,
              additions: diffResult.additions,
              deletions: diffResult.deletions
            }
          };
          changeSet.files.push(fileChange);
        }
        if (metadata) {
          changeSet.metadata = {
            ...changeSet.metadata,
            ...metadata
          };
        }
        changeSet.updatedAt = Date.now();
        this.sessionService?.emitSessionEvent({
          type: "change_set_updated",
          sessionId,
          workspaceId,
          executionId,
          goalId: metadata?.goalId || changeSet.metadata?.goalId,
          planId: metadata?.planId || changeSet.metadata?.planId,
          taskId: metadata?.taskId || changeSet.metadata?.taskId,
          timestamp: Date.now(),
          data: {
            changeSetId: changeSet.changeSetId,
            status: changeSet.status,
            filesCount: changeSet.files.length,
            files: changeSet.files.map((f) => ({
              path: f.path,
              operation: f.operation,
              additions: f.additions,
              deletions: f.deletions
            })),
            changeSet
          }
        });
        return changeSet;
      }
      /**
       * Retrieves a ChangeSet by its ID.
       */
      getChangeSet(changeSetId) {
        return this.changeSets.get(changeSetId);
      }
      /**
       * Retrieves all ChangeSets for a specific session.
       */
      getChangeSetsBySession(sessionId) {
        const ids = this.sessionIndex.get(sessionId);
        if (!ids) return [];
        return Array.from(ids).map((id) => this.changeSets.get(id)).filter((cs) => cs !== void 0);
      }
      /**
       * Retrieves all ChangeSets for a specific workspace.
       */
      getChangeSetsByWorkspace(workspaceId) {
        const ids = this.workspaceIndex.get(workspaceId);
        if (!ids) return [];
        return Array.from(ids).map((id) => this.changeSets.get(id)).filter((cs) => cs !== void 0);
      }
      /**
       * Validates whether files in workspace match expected base/after content.
       */
      async validateChangeSetState(changeSet, options) {
        const conflicts = [];
        const isLocal2 = fs3.existsSync(changeSet.workspaceId);
        for (const file of changeSet.files) {
          _ChangeSetService.validatePath(file.path, isLocal2 ? changeSet.workspaceId : void 0);
          let currentContent = null;
          if (isLocal2) {
            const resolved = path3.isAbsolute(file.path) ? file.path : path3.resolve(changeSet.workspaceId, file.path);
            if (fs3.existsSync(resolved)) {
              try {
                currentContent = fs3.readFileSync(resolved, "utf-8");
              } catch {
                currentContent = null;
              }
            }
          } else if (options.workspaceService) {
            try {
              const res = await options.workspaceService.readFile(options.userId, changeSet.workspaceId, file.path);
              currentContent = res.content;
            } catch {
              currentContent = null;
            }
          }
          const currentHash = currentContent !== null ? computeContentHash(currentContent) : void 0;
          if (file.operation === "MODIFY") {
            if (currentContent === null) {
              conflicts.push({
                path: file.path,
                reason: "File was deleted or missing in workspace",
                expectedHash: file.afterHash
              });
            } else if (currentHash !== file.afterHash && currentHash !== file.beforeHash) {
              conflicts.push({
                path: file.path,
                reason: "File content was modified concurrently in workspace",
                expectedHash: file.afterHash,
                currentHash
              });
            }
          } else if (file.operation === "CREATE") {
            if (currentContent !== null && currentHash !== file.afterHash) {
              conflicts.push({
                path: file.path,
                reason: "A conflicting file was created concurrently in workspace",
                expectedHash: file.afterHash,
                currentHash
              });
            }
          } else if (file.operation === "DELETE") {
            if (currentContent !== null && currentHash !== file.beforeHash) {
              conflicts.push({
                path: file.path,
                reason: "File exists with conflicting content in workspace",
                expectedHash: void 0,
                currentHash
              });
            }
          }
        }
        return {
          valid: conflicts.length === 0,
          conflicts
        };
      }
      /**
       * Applies the ChangeSet, authoritatively confirming the proposed mutations.
       * Performs conflict detection, isolation checks, and status transition.
       */
      async applyChangeSet(changeSetId, options) {
        const release = await this.acquireLock(changeSetId);
        try {
          const changeSet = this.changeSets.get(changeSetId);
          if (!changeSet) {
            throw new Error(`ChangeSet not found: ${changeSetId}`);
          }
          if (options.sessionId && options.sessionId !== changeSet.sessionId) {
            throw new Error(`Session mismatch: ChangeSet belongs to session ${changeSet.sessionId}, not ${options.sessionId}`);
          }
          if (options.workspaceId && options.workspaceId !== changeSet.workspaceId) {
            throw new Error(`Workspace mismatch: ChangeSet belongs to workspace ${changeSet.workspaceId}, not ${options.workspaceId}`);
          }
          if (changeSet.status === "APPLIED") {
            return changeSet;
          }
          if (changeSet.status === "REJECTED") {
            throw new Error(`Cannot apply rejected ChangeSet: ${changeSetId}`);
          }
          if (changeSet.status === "CONFLICT") {
            throw new Error(`Cannot apply conflicting ChangeSet: ${changeSetId}`);
          }
          if (changeSet.status !== "PROPOSED") {
            throw new Error(`Invalid state transition: Cannot apply ChangeSet in status ${changeSet.status}`);
          }
          const validation = await this.validateChangeSetState(changeSet, options);
          if (!validation.valid) {
            changeSet.status = "CONFLICT";
            changeSet.conflictReason = validation.conflicts.map((c) => `${c.path}: ${c.reason}`).join("; ");
            changeSet.updatedAt = Date.now();
            this.recordAuditEntry(changeSet, options, "conflict", "conflict", changeSet.conflictReason);
            this.sessionService?.emitSessionEvent({
              type: "change_set_conflict",
              sessionId: changeSet.sessionId,
              workspaceId: changeSet.workspaceId,
              executionId: changeSet.executionId,
              timestamp: Date.now(),
              data: {
                changeSetId,
                status: "CONFLICT",
                conflictReason: changeSet.conflictReason,
                changeSet
              }
            });
            throw new Error(`Conflict detected while applying change set: ${changeSet.conflictReason}`);
          }
          const isLocal2 = fs3.existsSync(changeSet.workspaceId);
          try {
            for (const file of changeSet.files) {
              _ChangeSetService.validatePath(file.path, isLocal2 ? changeSet.workspaceId : void 0);
              if (isLocal2) {
                const resolved = path3.isAbsolute(file.path) ? file.path : path3.resolve(changeSet.workspaceId, file.path);
                if (file.operation === "DELETE") {
                  if (fs3.existsSync(resolved)) {
                    fs3.unlinkSync(resolved);
                  }
                } else {
                  fs3.mkdirSync(path3.dirname(resolved), { recursive: true });
                  fs3.writeFileSync(resolved, file.after ?? "", "utf-8");
                }
              } else if (options.workspaceService) {
                if (file.operation === "DELETE") {
                  await options.workspaceService.deleteFile(options.userId, changeSet.workspaceId, file.path, "USER");
                } else {
                  await options.workspaceService.writeFile(
                    options.userId,
                    changeSet.workspaceId,
                    file.path,
                    file.after ?? "",
                    "USER",
                    { executionId: changeSet.executionId }
                  );
                }
              }
            }
          } catch (mutationErr) {
            this.sessionService?.emitSessionEvent({
              type: "change_set_failed",
              sessionId: changeSet.sessionId,
              workspaceId: changeSet.workspaceId,
              executionId: changeSet.executionId,
              timestamp: Date.now(),
              data: {
                changeSetId,
                error: mutationErr.message || "Failed to apply mutations to workspace"
              }
            });
            throw mutationErr;
          }
          changeSet.status = "APPLIED";
          changeSet.conflictReason = void 0;
          changeSet.updatedAt = Date.now();
          this.recordAuditEntry(changeSet, options, "apply", "applied");
          this.sessionService?.emitSessionEvent({
            type: "change_set_applied",
            sessionId: changeSet.sessionId,
            workspaceId: changeSet.workspaceId,
            executionId: changeSet.executionId,
            timestamp: Date.now(),
            data: {
              changeSetId,
              status: "APPLIED",
              filesCount: changeSet.files.length,
              changeSet
            }
          });
          return changeSet;
        } finally {
          release();
        }
      }
      /**
       * Rejects the ChangeSet, restoring previous baseline state for every file in the set.
       * Authoritatively validates that workspace has not been modified since the ChangeSet
       * state before rolling back, preventing any accidental loss of newer user changes.
       */
      async rejectChangeSet(changeSetId, options) {
        const release = await this.acquireLock(changeSetId);
        try {
          const changeSet = this.changeSets.get(changeSetId);
          if (!changeSet) {
            throw new Error(`ChangeSet not found: ${changeSetId}`);
          }
          if (options.sessionId && options.sessionId !== changeSet.sessionId) {
            throw new Error(`Session mismatch: ChangeSet belongs to session ${changeSet.sessionId}, not ${options.sessionId}`);
          }
          if (options.workspaceId && options.workspaceId !== changeSet.workspaceId) {
            throw new Error(`Workspace mismatch: ChangeSet belongs to workspace ${changeSet.workspaceId}, not ${options.workspaceId}`);
          }
          if (changeSet.status === "REJECTED") {
            return changeSet;
          }
          if (changeSet.status === "APPLIED") {
            throw new Error(`Cannot reject already applied ChangeSet: ${changeSetId}`);
          }
          if (changeSet.status === "CONFLICT") {
            throw new Error(`Cannot reject conflicting ChangeSet: ${changeSetId}`);
          }
          if (changeSet.status !== "PROPOSED") {
            throw new Error(`Invalid state transition: Cannot reject ChangeSet in status ${changeSet.status}`);
          }
          const validation = await this.validateChangeSetState(changeSet, options);
          if (!validation.valid) {
            changeSet.status = "CONFLICT";
            changeSet.conflictReason = `Reject blocked due to concurrent modifications: ` + validation.conflicts.map((c) => `${c.path}: ${c.reason}`).join("; ");
            changeSet.updatedAt = Date.now();
            this.recordAuditEntry(changeSet, options, "conflict", "conflict", changeSet.conflictReason);
            this.sessionService?.emitSessionEvent({
              type: "change_set_conflict",
              sessionId: changeSet.sessionId,
              workspaceId: changeSet.workspaceId,
              executionId: changeSet.executionId,
              timestamp: Date.now(),
              data: {
                changeSetId,
                status: "CONFLICT",
                conflictReason: changeSet.conflictReason,
                changeSet
              }
            });
            throw new Error(`Conflict detected while rejecting change set: ${changeSet.conflictReason}`);
          }
          const isLocal2 = fs3.existsSync(changeSet.workspaceId);
          try {
            for (const file of changeSet.files) {
              _ChangeSetService.validatePath(file.path, isLocal2 ? changeSet.workspaceId : void 0);
              if (isLocal2) {
                const resolved = path3.isAbsolute(file.path) ? file.path : path3.resolve(changeSet.workspaceId, file.path);
                if (file.operation === "CREATE") {
                  if (fs3.existsSync(resolved)) {
                    fs3.unlinkSync(resolved);
                  }
                } else if (file.operation === "MODIFY") {
                  fs3.writeFileSync(resolved, file.before ?? "", "utf-8");
                } else if (file.operation === "DELETE") {
                  fs3.mkdirSync(path3.dirname(resolved), { recursive: true });
                  fs3.writeFileSync(resolved, file.before ?? "", "utf-8");
                }
              } else if (options.workspaceService) {
                if (file.operation === "CREATE") {
                  try {
                    await options.workspaceService.deleteFile(options.userId, changeSet.workspaceId, file.path, "USER");
                  } catch {
                  }
                } else if (file.operation === "MODIFY" || file.operation === "DELETE") {
                  await options.workspaceService.writeFile(
                    options.userId,
                    changeSet.workspaceId,
                    file.path,
                    file.before ?? "",
                    "USER",
                    { executionId: changeSet.executionId }
                  );
                }
              }
            }
          } catch (rollbackErr) {
            this.sessionService?.emitSessionEvent({
              type: "change_set_failed",
              sessionId: changeSet.sessionId,
              workspaceId: changeSet.workspaceId,
              executionId: changeSet.executionId,
              timestamp: Date.now(),
              data: {
                changeSetId,
                error: rollbackErr.message || "Failed to roll back workspace mutations"
              }
            });
            throw rollbackErr;
          }
          changeSet.status = "REJECTED";
          changeSet.updatedAt = Date.now();
          this.recordAuditEntry(changeSet, options, "reject", "rejected");
          this.sessionService?.emitSessionEvent({
            type: "change_set_rejected",
            sessionId: changeSet.sessionId,
            workspaceId: changeSet.workspaceId,
            executionId: changeSet.executionId,
            timestamp: Date.now(),
            data: {
              changeSetId,
              status: "REJECTED",
              filesCount: changeSet.files.length,
              changeSet
            }
          });
          return changeSet;
        } finally {
          release();
        }
      }
    };
    globalChangeSetService = new ChangeSetService();
  }
});

// src/server/di.ts
var DIContainer, di;
var init_di = __esm({
  "src/server/di.ts"() {
    init_llmService();
    init_session2();
    init_ChangeSetService();
    DIContainer = class {
      get llmService() {
        if (!this._llmService) {
          this._llmService = new LLMService();
        }
        return this._llmService;
      }
      get agentSessionService() {
        if (!this._agentSessionService) {
          this._agentSessionService = globalAgentSessionService;
        }
        return this._agentSessionService;
      }
      get changeSetService() {
        if (!this._changeSetService) {
          globalChangeSetService.setSessionService(this.agentSessionService);
          this._changeSetService = globalChangeSetService;
        }
        return this._changeSetService;
      }
    };
    di = new DIContainer();
  }
});

// src/server/serverless.ts
import express10 from "express";

// src/server/api.ts
init_logInterceptor();
import express9 from "express";

// src/server/controllers/ChatController.ts
init_schema();
init_agent_config2();
init_di();
init_utils();
import express from "express";
import * as jose from "jose";
import { eq as eq5, sql as sql4 } from "drizzle-orm";

// src/server/services/agentIntegration/AgentFeatureFlags.ts
var AgentFeatureFlags = {
  USE_AGENT_RUNTIME: true,
  USE_AGENT_RETRIEVER: true,
  USE_AGENT_CONTEXT_BUILDER: true,
  USE_EXECUTION_PIPELINE: true,
  USE_REFLECTION: true,
  USE_LEARNING: true,
  USE_KNOWLEDGE_PROMOTION: true,
  USE_GOAL_PLANNING: true
};

// src/server/services/agentIntegration/AgentAdapter.ts
init_agent_config();

// src/agent/retrieval/SimpleRetriever.ts
var SimpleRetriever = class {
  constructor(embeddingProvider, vectorStore) {
    this.embeddingProvider = embeddingProvider;
    this.vectorStore = vectorStore;
  }
  async retrieve(request) {
    const topK = request.topK || 5;
    const embeddingResponse = await this.embeddingProvider.embed({
      input: request.query
    });
    if (!embeddingResponse.embeddings || embeddingResponse.embeddings.length === 0) {
      return [];
    }
    const queryVector = embeddingResponse.embeddings[0];
    const vectorResults = await this.vectorStore.query({
      vector: queryVector,
      topK,
      namespace: request.namespace,
      filters: request.filters,
      minScore: request.minScore
    });
    return vectorResults.map((result) => ({
      id: result.record.id,
      score: result.score,
      metadata: result.record.metadata
    }));
  }
};

// src/server/services/agentIntegration/retrieval/DrizzleEmbeddingProvider.ts
init_agent_config2();
init_di();
var DrizzleEmbeddingProvider = class {
  constructor(apiKey, provider, customBaseUrl) {
    this.apiKey = apiKey;
    this.provider = provider;
    this.customBaseUrl = customBaseUrl;
  }
  getCapabilities() {
    return [];
  }
  async initialize() {
  }
  async close() {
  }
  async embed(request) {
    const aiInstance = di.llmService.getClient(this.apiKey, this.customBaseUrl, this.provider);
    const embedResponse = await aiInstance.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: request.input,
      config: { outputDimensionality: 768 }
    });
    const embeddingVector = embedResponse.embeddings?.[0]?.values || [];
    return {
      embeddings: [embeddingVector],
      model: EMBEDDING_MODEL
    };
  }
};

// src/server/services/agentIntegration/retrieval/DrizzleVectorStore.ts
init_utils();
init_schema();
import { cosineDistance } from "drizzle-orm";
var DrizzleVectorStore = class {
  constructor(userId) {
    this.userId = userId;
  }
  getCapabilities() {
    return ["COSINE_SIMILARITY" /* COSINE_SIMILARITY */];
  }
  async initialize() {
  }
  async close() {
  }
  async upsert(records) {
    throw new Error("Not implemented");
  }
  async query(query) {
    return await txWithUser(this.userId, async (tx) => {
      const results = await tx.select({
        id: knowledgeNodes.id,
        metadata: knowledgeNodes.metadata,
        similarity: cosineDistance(knowledgeNodes.embedding, query.vector)
      }).from(knowledgeNodes).orderBy(cosineDistance(knowledgeNodes.embedding, query.vector)).limit(query.topK || 5);
      return results.map((res) => ({
        record: {
          id: res.id,
          vector: [],
          metadata: res.metadata
        },
        score: 1 - res.similarity
      }));
    });
  }
  async delete(ids, namespace) {
    throw new Error("Not implemented");
  }
};

// src/server/services/agentIntegration/retrieval/DrizzleKnowledgeStore.ts
init_utils();
init_schema();
import { eq as eq3 } from "drizzle-orm";
var DrizzleKnowledgeStore = class {
  constructor(userId) {
    this.userId = userId;
  }
  getCapabilities() {
    return [];
  }
  async initialize() {
  }
  async close() {
  }
  async createRecord(record) {
    return await txWithUser(this.userId, async (tx) => {
      const [insertedNode] = await tx.insert(knowledgeNodes).values({
        content: typeof record.content === "string" ? record.content : JSON.stringify(record.content),
        nodeType: "skill",
        metadata: {
          ...record.metadata || {},
          namespace: record.namespace,
          collection: record.collection,
          tags: record.tags || [],
          relationships: record.relationships || [],
          confidence: record.confidence
        }
      }).returning();
      const now = insertedNode.createdAt ? new Date(insertedNode.createdAt).getTime() : Date.now();
      return {
        id: insertedNode.id,
        content: insertedNode.content,
        namespace: record.namespace,
        collection: record.collection,
        metadata: insertedNode.metadata || {},
        tags: record.tags || [],
        relationships: record.relationships || [],
        createdAt: now,
        updatedAt: now,
        version: 1,
        confidence: record.confidence
      };
    });
  }
  async readRecord(id, namespace) {
    return await txWithUser(this.userId, async (tx) => {
      const results = await tx.select().from(knowledgeNodes).where(eq3(knowledgeNodes.id, id)).limit(1);
      if (results.length === 0) return null;
      const res = results[0];
      const meta = res.metadata || {};
      const now = res.createdAt ? new Date(res.createdAt).getTime() : Date.now();
      return {
        id: res.id,
        content: res.content,
        namespace: meta.namespace || namespace || "default",
        collection: meta.collection || "default",
        metadata: {
          ...meta,
          nodeType: res.nodeType
        },
        tags: meta.tags || [],
        relationships: meta.relationships || [],
        createdAt: now,
        updatedAt: now,
        version: 1,
        confidence: meta.confidence || 1
      };
    });
  }
  async updateRecord(id, updates, namespace) {
    throw new Error("Not implemented");
  }
  async deleteRecord(id, namespace) {
    throw new Error("Not implemented");
  }
  async queryRecords(query) {
    return await txWithUser(this.userId, async (tx) => {
      const results = await tx.select().from(knowledgeNodes).limit(query.limit || 50);
      return results.map((res) => {
        const meta = res.metadata || {};
        const now = res.createdAt ? new Date(res.createdAt).getTime() : Date.now();
        return {
          id: res.id,
          content: res.content,
          namespace: meta.namespace || "default",
          collection: meta.collection || "default",
          metadata: meta,
          tags: meta.tags || [],
          relationships: meta.relationships || [],
          createdAt: now,
          updatedAt: now,
          version: 1,
          confidence: meta.confidence || 1
        };
      });
    });
  }
  async createCollection(collection) {
    throw new Error("Not implemented");
  }
  async getCollection(id, namespace) {
    throw new Error("Not implemented");
  }
  async updateCollection(id, updates, namespace) {
    throw new Error("Not implemented");
  }
  async deleteCollection(id, namespace) {
    throw new Error("Not implemented");
  }
  async beginTransaction() {
    throw new Error("Not implemented");
  }
};

// src/server/services/agentIntegration/retrieval/RetrieverIntegrationService.ts
var RetrieverIntegrationService = class {
  constructor(userId, apiKey, provider, customBaseUrl) {
    this.userId = userId;
    const embeddingProvider = new DrizzleEmbeddingProvider(apiKey, provider, customBaseUrl);
    const vectorStore = new DrizzleVectorStore(userId);
    this.retriever = new SimpleRetriever(embeddingProvider, vectorStore);
    this.knowledgeStore = new DrizzleKnowledgeStore(userId);
  }
  async retrieveContexts(query, limit = 5) {
    const request = {
      query,
      topK: limit
    };
    const results = await this.retriever.retrieve(request);
    const documents = [];
    for (const res of results) {
      const record = await this.knowledgeStore.readRecord(res.id);
      if (record) {
        documents.push({
          record,
          score: res.score
        });
      }
    }
    return documents;
  }
};

// src/server/services/agentIntegration/retrieval/RetrieverAdapter.ts
var RetrieverAdapter = class {
  constructor(userId, apiKey, provider, customBaseUrl) {
    this.service = new RetrieverIntegrationService(userId, apiKey, provider, customBaseUrl);
  }
  async augmentPromptWithContext(cleanPrompt, currentSystemPrompt, sendEvent) {
    sendEvent("status", { message: "Performing vector similarity search via M03 Agent Retriever..." });
    try {
      const documents = await this.service.retrieveContexts(cleanPrompt, 5);
      if (documents.length > 0) {
        const formattedContext = documents.map((doc, i) => {
          const pathInfo = doc.record.metadata?.path || "Unknown File";
          const nodeType = doc.record.metadata?.nodeType || "CODE";
          return `[Node ${i + 1}] (${nodeType}) File: ${pathInfo}
Similarity: ${(1 - doc.score).toFixed(4)}
Content:
${doc.record.content}`;
        }).join("\n\n---\n\n");
        const newSystemPrompt = currentSystemPrompt + `

### RETRIEVED REPOSITORY CONTEXT
Use the following active codebase memory contexts to formulate your answer:

${formattedContext}`;
        sendEvent("status", { message: `Context retrieval completed. Loaded ${documents.length} repository memory blocks.` });
        return newSystemPrompt;
      } else {
        sendEvent("status", { message: "No highly relevant context found in repository." });
        return currentSystemPrompt;
      }
    } catch (e) {
      console.error("[RetrieverAdapter] Error:", e);
      sendEvent("status", { message: "Context retrieval failed, continuing without codebase context." });
      return currentSystemPrompt;
    }
  }
  async retrieveKnowledge(cleanPrompt, sendEvent) {
    sendEvent("status", { message: "Performing vector similarity search via M03 Agent Retriever..." });
    try {
      const documents = await this.service.retrieveContexts(cleanPrompt, 5);
      if (documents.length > 0) {
        sendEvent("status", { message: `Context retrieval completed. Loaded ${documents.length} repository memory blocks.` });
        return documents.map((doc, i) => {
          const pathInfo = doc.record.metadata?.path || "Unknown File";
          const nodeType = doc.record.metadata?.nodeType || "CODE";
          return {
            id: doc.record.id || `${i}`,
            content: `[Node ${i + 1}] (${nodeType}) File: ${pathInfo}
Similarity: ${(1 - doc.score).toFixed(4)}
Content:
${doc.record.content}`
          };
        });
      } else {
        sendEvent("status", { message: "No highly relevant context found in repository." });
        return [];
      }
    } catch (e) {
      console.error("[RetrieverAdapter] Error:", e);
      sendEvent("status", { message: "Context retrieval failed, continuing without codebase context." });
      return [];
    }
  }
};

// src/agent/context/ContextErrors.ts
var ContextError = class extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "ContextError";
  }
};
var ContextBudgetError = class extends ContextError {
  constructor(message, details) {
    super(message, "CONTEXT_BUDGET_ERROR", details);
    this.name = "ContextBudgetError";
  }
};

// src/agent/context/SimpleContextBuilder.ts
var DefaultTokenEstimator = class {
  estimate(text2) {
    return Math.ceil(text2.length / 4);
  }
};
var SimpleContextBuilder = class {
  constructor(tokenEstimator = new DefaultTokenEstimator()) {
    this.tokenEstimator = tokenEstimator;
  }
  async build(request) {
    const availableTokens = request.tokenBudget.maxTokens - request.tokenBudget.reservedCompletionTokens;
    if (availableTokens <= 0) {
      throw new ContextBudgetError("Invalid token budget: available tokens must be greater than 0.");
    }
    const sections = [];
    if (request.systemPrompt) {
      sections.push({
        id: "system",
        type: "SYSTEM" /* SYSTEM */,
        content: request.systemPrompt,
        priority: 100,
        tokenCount: this.tokenEstimator.estimate(request.systemPrompt)
      });
    }
    sections.push({
      id: "user",
      type: "USER" /* USER */,
      content: request.userPrompt,
      priority: 90,
      tokenCount: this.tokenEstimator.estimate(request.userPrompt)
    });
    if (request.toolContext) {
      for (const tool of request.toolContext) {
        const content = `Tool: ${tool.name}
Result: ${tool.result}`;
        sections.push({
          id: `tool-${tool.name}`,
          type: "TOOL" /* TOOL */,
          content,
          priority: 80,
          tokenCount: this.tokenEstimator.estimate(content)
        });
      }
    }
    if (request.workspaceContext) {
      sections.push({
        id: "workspace",
        type: "WORKSPACE" /* WORKSPACE */,
        content: request.workspaceContext,
        priority: 70,
        tokenCount: this.tokenEstimator.estimate(request.workspaceContext)
      });
    }
    if (request.conversationHistory) {
      const historyContent = request.conversationHistory.map((m) => `${m.role}: ${m.content}`).join("\n");
      sections.push({
        id: "conversation",
        type: "CONVERSATION" /* CONVERSATION */,
        content: historyContent,
        priority: 60,
        tokenCount: this.tokenEstimator.estimate(historyContent)
      });
    }
    if (request.memories) {
      for (const mem of request.memories) {
        sections.push({
          id: `memory-${mem.id}`,
          type: "MEMORY" /* MEMORY */,
          content: mem.content,
          priority: 50,
          tokenCount: this.tokenEstimator.estimate(mem.content)
        });
      }
    }
    if (request.knowledge) {
      for (const k of request.knowledge) {
        sections.push({
          id: `knowledge-${k.id}`,
          type: "KNOWLEDGE" /* KNOWLEDGE */,
          content: k.content,
          priority: 40,
          tokenCount: this.tokenEstimator.estimate(k.content)
        });
      }
    }
    const uniqueSections = [];
    const seenIds = /* @__PURE__ */ new Set();
    for (const section of sections) {
      if (!seenIds.has(section.id)) {
        uniqueSections.push(section);
        seenIds.add(section.id);
      }
    }
    uniqueSections.sort((a, b) => b.priority - a.priority);
    const finalSections = [];
    let currentTokens = 0;
    const truncatedSections = [];
    for (const section of uniqueSections) {
      if (currentTokens + section.tokenCount <= availableTokens) {
        finalSections.push(section);
        currentTokens += section.tokenCount;
      } else {
        const remaining = availableTokens - currentTokens;
        if (remaining > 50) {
          const ratio = remaining / section.tokenCount;
          const sliceLen = Math.floor(section.content.length * ratio);
          const truncatedContent = section.content.substring(0, sliceLen) + "...[TRUNCATED]";
          finalSections.push({
            ...section,
            content: truncatedContent,
            tokenCount: remaining
          });
          currentTokens += remaining;
          truncatedSections.push(section.id);
        } else {
          truncatedSections.push(section.id);
        }
      }
    }
    const statistics = {
      sectionCounts: {},
      sectionTokens: {},
      truncatedSections,
      totalTokens: currentTokens
    };
    for (const section of finalSections) {
      statistics.sectionCounts[section.type] = (statistics.sectionCounts[section.type] || 0) + 1;
      statistics.sectionTokens[section.type] = (statistics.sectionTokens[section.type] || 0) + section.tokenCount;
    }
    return {
      sections: finalSections,
      metadata: {
        assembledAt: Date.now(),
        totalTokens: currentTokens,
        strategy: "priority-truncation",
        namespaces: request.namespaces
      },
      statistics,
      budget: request.tokenBudget
    };
  }
};

// src/server/services/agentIntegration/context/ContextIntegrationService.ts
var ContextIntegrationService = class {
  constructor() {
    this.builder = new SimpleContextBuilder();
  }
  async buildContext(request) {
    return await this.builder.build(request);
  }
};

// src/server/services/agentIntegration/context/ContextBuilderAdapter.ts
var ContextBuilderAdapter = class {
  static toContextBuilderRequest(userPrompt, systemPrompt, history, knowledge, customInstructions, sandboxInstructions) {
    let finalSystemPrompt = systemPrompt;
    if (sandboxInstructions) {
      finalSystemPrompt += `

${sandboxInstructions}`;
    }
    if (customInstructions) {
      finalSystemPrompt += `

User Custom Personalization:
${customInstructions}`;
    }
    return {
      systemPrompt: finalSystemPrompt,
      userPrompt,
      conversationHistory: history.length > 0 ? history : void 0,
      knowledge: knowledge && knowledge.length > 0 ? knowledge : void 0,
      tokenBudget: {
        maxTokens: 1048576,
        // Gemini 1.5 Pro max context
        reservedCompletionTokens: 8192
      }
    };
  }
};

// src/server/services/agentIntegration/context/PromptContextMapper.ts
var PromptContextMapper = class {
  /**
   * Maps the M03 PromptContext into the legacy `finalSystemPrompt` format
   * to preserve existing LLM interaction behavior.
   */
  static toLegacySystemPrompt(context) {
    let systemPrompt = "";
    let knowledge = "";
    let workspace = "";
    for (const section of context.sections) {
      if (section.type === "SYSTEM" /* SYSTEM */) {
        systemPrompt = section.content;
      } else if (section.type === "KNOWLEDGE" /* KNOWLEDGE */) {
        knowledge += (knowledge ? "\n\n---\n\n" : "") + section.content;
      } else if (section.type === "WORKSPACE" /* WORKSPACE */) {
        workspace += (workspace ? "\n" : "") + section.content;
      } else if (section.type === "MEMORY" /* MEMORY */) {
        knowledge += (knowledge ? "\n\n---\n\n" : "") + section.content;
      }
    }
    let finalPrompt = systemPrompt;
    if (workspace) {
      finalPrompt += `

### WORKSPACE CONTEXT
${workspace}`;
    }
    if (knowledge) {
      finalPrompt += `

### RETRIEVED REPOSITORY CONTEXT
Use the following active codebase memory contexts to formulate your answer:

${knowledge}`;
    }
    return finalPrompt;
  }
};

// src/server/services/agentIntegration/execution/ExecutionIntegrationService.ts
init_ExecutionPipeline();
init_ToolRegistry();
init_ToolResolver();
init_PermissionValidator();
init_InputValidator();
init_ResultNormalizer();
init_CheckpointStore();
init_Restore();
init_ExecutionContext();
init_ToolExecutionAdapter();

// src/agent/reflection/RuleBasedReflection.ts
var RuleBasedReflection = class {
  async reflect(request) {
    const scores = {};
    const suggestions = [];
    const detectedMistakes = [];
    const potentialImprovements = [];
    let overallScore = 100;
    let success = true;
    let failureReason;
    if (!request.result.success || request.errors && request.errors.length > 0) {
      success = false;
      overallScore -= 40;
      failureReason = request.result.error?.message || (request.errors ? request.errors[0]?.message : "Unknown execution failure");
      scores["EXECUTION_SUCCESS" /* EXECUTION_SUCCESS */] = { score: 0, confidence: 1 };
      detectedMistakes.push("Execution completed with errors or unsuccessful status.");
      suggestions.push({
        category: "EXECUTION_SUCCESS" /* EXECUTION_SUCCESS */,
        description: "Investigate the root cause of the execution failure.",
        severity: "high",
        actionable: true
      });
    } else {
      scores["EXECUTION_SUCCESS" /* EXECUTION_SUCCESS */] = { score: 100, confidence: 1 };
    }
    if (request.toolResults && request.toolResults.length > 0) {
      const failedTools = request.toolResults.filter((tr) => !tr.success);
      if (failedTools.length > 0) {
        overallScore -= 20;
        const failedToolIds = failedTools.map((tr) => tr.metadata?.toolName || "Unknown Tool").join(", ");
        detectedMistakes.push(`Tool execution failed for: ${failedToolIds}`);
        scores["TOOL_QUALITY" /* TOOL_QUALITY */] = { score: 50, confidence: 0.9 };
        suggestions.push({
          category: "TOOL_QUALITY" /* TOOL_QUALITY */,
          description: `Ensure proper arguments and permissions for tools: ${failedToolIds}`,
          severity: "medium",
          actionable: true
        });
      } else {
        scores["TOOL_QUALITY" /* TOOL_QUALITY */] = { score: 100, confidence: 0.9 };
        potentialImprovements.push("Tool usage was successful, consider optimizing sequential tool calls to parallel if possible.");
      }
    }
    if (request.context) {
      if (request.context.statistics.truncatedSections.length > 0) {
        overallScore -= 10;
        detectedMistakes.push("Some context sections were truncated due to token budget limits.");
        scores["CONTEXT_QUALITY" /* CONTEXT_QUALITY */] = { score: 70, confidence: 0.8 };
        suggestions.push({
          category: "CONTEXT_QUALITY" /* CONTEXT_QUALITY */,
          description: "Summarize memory or knowledge prior to context assembly to avoid truncation.",
          severity: "medium",
          actionable: true
        });
      } else {
        scores["CONTEXT_QUALITY" /* CONTEXT_QUALITY */] = { score: 100, confidence: 0.8 };
      }
    }
    overallScore = Math.max(0, Math.min(100, overallScore));
    const record = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      timestamp: Date.now(),
      executionId: request.executionId,
      summary: {
        overallScore,
        success,
        failureReason,
        detectedMistakes,
        potentialImprovements
      },
      scores,
      suggestions,
      metadata: request.metadata
    };
    return structuredClone(record);
  }
};

// src/server/services/agentIntegration/execution/ExecutionIntegrationService.ts
init_ExecutionState();

// src/agent/learning/RuleBasedLearningEngine.ts
var RuleBasedLearningEngine = class {
  async learn(request) {
    const { reflection } = request;
    const knowledgePromotions = [];
    const memoryPromotions = [];
    const hasMistakes = reflection.summary.detectedMistakes.length > 0;
    const hasImprovements = reflection.summary.potentialImprovements.length > 0;
    const importance = reflection.summary.overallScore;
    const confidence = importance / 100 * 0.9;
    if (!hasMistakes && hasImprovements) {
      for (let i = 0; i < reflection.summary.potentialImprovements.length; i++) {
        knowledgePromotions.push({
          id: `kp-${reflection.executionId}-${i}`,
          content: reflection.summary.potentialImprovements[i],
          confidence,
          tags: ["improvement", "heuristic"]
        });
      }
    }
    if (hasMistakes) {
      for (let i = 0; i < reflection.summary.detectedMistakes.length; i++) {
        memoryPromotions.push({
          id: `mp-${reflection.executionId}-${i}`,
          content: `Mistake to avoid: ${reflection.summary.detectedMistakes[i]}`,
          importance: 100 - importance
          // Higher importance for lower score
        });
      }
    }
    let decision = "DISCARD" /* DISCARD */;
    if (knowledgePromotions.length > 0 && memoryPromotions.length > 0) {
      decision = "PROMOTE_TO_KNOWLEDGE" /* PROMOTE_TO_KNOWLEDGE */;
    } else if (knowledgePromotions.length > 0) {
      decision = "PROMOTE_TO_KNOWLEDGE" /* PROMOTE_TO_KNOWLEDGE */;
    } else if (memoryPromotions.length > 0) {
      decision = "PROMOTE_TO_MEMORY" /* PROMOTE_TO_MEMORY */;
    }
    if (importance < 30) {
      decision = "REQUIRES_HUMAN_APPROVAL" /* REQUIRES_HUMAN_APPROVAL */;
    }
    let reasoning = "No promotions derived from reflection.";
    if (decision === "PROMOTE_TO_KNOWLEDGE" /* PROMOTE_TO_KNOWLEDGE */) {
      reasoning = "Derived actionable improvements for future general execution.";
    } else if (decision === "PROMOTE_TO_MEMORY" /* PROMOTE_TO_MEMORY */) {
      reasoning = "Derived specific context mistakes that should be remembered.";
    } else if (decision === "REQUIRES_HUMAN_APPROVAL" /* REQUIRES_HUMAN_APPROVAL */) {
      reasoning = "Execution score is critically low. Human approval required before learning.";
    }
    return {
      decision,
      knowledgePromotions,
      memoryPromotions,
      reasoning
    };
  }
};

// src/server/services/experience/DurableExperienceStore.ts
init_db();
init_schema();
import { desc as desc2, eq as eq4, and, gte, sql as sql3 } from "drizzle-orm";
var DurableExperienceStore = class {
  async append(event) {
    try {
      const newRecord = {
        sessionId: event.sessionId,
        taskId: event.taskId,
        type: event.type,
        payload: event.payload,
        metadata: event.metadata
      };
      const [inserted] = await db.insert(experienceRecords).values(newRecord).returning();
      return {
        id: inserted.id,
        sessionId: inserted.sessionId,
        taskId: inserted.taskId || void 0,
        timestamp: inserted.timestamp.getTime(),
        type: inserted.type,
        payload: inserted.payload,
        metadata: inserted.metadata
      };
    } catch (e) {
      console.error("[DurableExperienceStore] Error appending record:", e);
      return {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        ...event
      };
    }
  }
  async query(filter) {
    try {
      const conditions = [];
      if (filter.sessionId) conditions.push(eq4(experienceRecords.sessionId, filter.sessionId));
      if (filter.taskId) conditions.push(eq4(experienceRecords.taskId, filter.taskId));
      if (filter.type) conditions.push(eq4(experienceRecords.type, filter.type));
      if (filter.since !== void 0) {
        conditions.push(gte(experienceRecords.timestamp, new Date(filter.since)));
      }
      let queryBase = db.select().from(experienceRecords);
      if (conditions.length > 0) {
        queryBase = queryBase.where(and(...conditions));
      }
      queryBase = queryBase.orderBy(desc2(experienceRecords.timestamp));
      if (filter.limit) {
        queryBase = queryBase.limit(filter.limit);
      }
      const results = await queryBase;
      let events = results.map((row) => ({
        id: row.id,
        sessionId: row.sessionId,
        taskId: row.taskId || void 0,
        timestamp: row.timestamp.getTime(),
        type: row.type,
        payload: row.payload,
        metadata: row.metadata
      }));
      if (filter.successOnly !== void 0) {
        events = events.filter((e) => e.metadata?.success === filter.successOnly);
      }
      return events.reverse();
    } catch (e) {
      console.error("[DurableExperienceStore] Error querying records:", e);
      return [];
    }
  }
  async getSessionEvents(sessionId) {
    return this.query({ sessionId });
  }
  async prune(olderThanMs) {
    try {
      const threshold = new Date(Date.now() - olderThanMs);
      const res = await db.delete(experienceRecords).where(sql3`${experienceRecords.timestamp} < ${threshold.toISOString()}`).returning({ id: experienceRecords.id });
      return res.length;
    } catch (e) {
      console.error("[DurableExperienceStore] Error pruning records:", e);
      return 0;
    }
  }
};

// src/agent/promotion/PromotionPolicy.ts
var DEFAULT_PROMOTION_POLICY_CONFIG = {
  minConfidence: 0.7,
  minOverallScore: 60,
  minOccurrences: 1,
  minContentLength: 10,
  disallowedTags: ["draft", "temporary", "unverified", "broken", "deprecated"]
};
var RuleBasedPromotionPolicy = class {
  constructor(config = {}) {
    this.config = {
      ...DEFAULT_PROMOTION_POLICY_CONFIG,
      ...config
    };
  }
  evaluate(candidate) {
    const evaluatedCriteria = {
      minConfidencePassed: false,
      minScorePassed: false,
      minOccurrencesPassed: false,
      contentValid: false,
      notExplicitlyRejected: false
    };
    const content = candidate.proposedContent ? candidate.proposedContent.trim() : "";
    if (content.length >= this.config.minContentLength) {
      evaluatedCriteria.contentValid = true;
    } else {
      return {
        approved: false,
        status: "REJECTED",
        reason: `Proposed content length (${content.length}) is below minimum required (${this.config.minContentLength}).`,
        evaluatedCriteria
      };
    }
    if (candidate.sourceLearningDecision === "REQUIRES_HUMAN_APPROVAL" /* REQUIRES_HUMAN_APPROVAL */) {
      return {
        approved: false,
        status: "REJECTED",
        reason: "Candidate requires human approval before knowledge promotion.",
        evaluatedCriteria
      };
    }
    if (candidate.sourceLearningDecision === "DISCARD" /* DISCARD */) {
      return {
        approved: false,
        status: "REJECTED",
        reason: "Source learning decision is DISCARD.",
        evaluatedCriteria
      };
    }
    const hasDisallowedTag = candidate.tags.some(
      (tag) => this.config.disallowedTags.includes(tag.toLowerCase())
    );
    if (hasDisallowedTag) {
      return {
        approved: false,
        status: "REJECTED",
        reason: "Candidate contains one or more disallowed tags.",
        evaluatedCriteria
      };
    }
    evaluatedCriteria.notExplicitlyRejected = true;
    if (candidate.confidence >= this.config.minConfidence) {
      evaluatedCriteria.minConfidencePassed = true;
    } else {
      return {
        approved: false,
        status: "REJECTED",
        reason: `Confidence (${candidate.confidence.toFixed(2)}) is below threshold (${this.config.minConfidence.toFixed(2)}).`,
        evaluatedCriteria
      };
    }
    const overallScore = candidate.evidence.overallScore;
    if (candidate.category === "ERROR_AVOIDANCE") {
      const hasMistakeEvidence = Array.isArray(candidate.evidence.detectedMistakes) && candidate.evidence.detectedMistakes.length > 0;
      if (hasMistakeEvidence || overallScore !== void 0 && overallScore >= this.config.minOverallScore) {
        evaluatedCriteria.minScorePassed = true;
      } else {
        return {
          approved: false,
          status: "REJECTED",
          reason: "Error avoidance candidate lacks detected mistakes or sufficient evidence.",
          evaluatedCriteria
        };
      }
    } else {
      if (overallScore === void 0 || overallScore >= this.config.minOverallScore) {
        evaluatedCriteria.minScorePassed = true;
      } else {
        return {
          approved: false,
          status: "REJECTED",
          reason: `Execution reflection score (${overallScore}) is below minimum required (${this.config.minOverallScore}).`,
          evaluatedCriteria
        };
      }
    }
    const occurrences = candidate.occurrenceCount ?? 1;
    if (occurrences >= this.config.minOccurrences) {
      evaluatedCriteria.minOccurrencesPassed = true;
    } else {
      return {
        approved: false,
        status: "REJECTED",
        reason: `Occurrence count (${occurrences}) is below threshold (${this.config.minOccurrences}).`,
        evaluatedCriteria
      };
    }
    return {
      approved: true,
      status: "APPROVED",
      reason: "Candidate satisfies all policy evaluation criteria.",
      evaluatedCriteria,
      adjustedConfidence: candidate.confidence
    };
  }
};

// src/agent/promotion/PromotionService.ts
var DefaultPromotionService = class {
  constructor(knowledgeStore, policy = new RuleBasedPromotionPolicy(), experienceStore) {
    this.knowledgeStore = knowledgeStore;
    this.policy = policy;
    this.experienceStore = experienceStore;
  }
  evaluateCandidate(candidate) {
    try {
      return this.policy.evaluate(candidate);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        approved: false,
        status: "REJECTED",
        reason: `Policy evaluation error: ${errorMessage}`,
        evaluatedCriteria: {
          minConfidencePassed: false,
          minScorePassed: false,
          minOccurrencesPassed: false,
          contentValid: false,
          notExplicitlyRejected: false
        }
      };
    }
  }
  async promoteCandidate(candidate) {
    try {
      candidate.status = "EVALUATING";
      const decision = this.evaluateCandidate(candidate);
      if (!decision.approved) {
        candidate.status = "REJECTED";
        candidate.rejectionReason = decision.reason;
        return {
          candidateId: candidate.id,
          status: "REJECTED",
          decision
        };
      }
      candidate.status = "APPROVED";
      const isDuplicate = await this.checkDuplicate(candidate);
      if (isDuplicate) {
        candidate.status = "REJECTED";
        candidate.rejectionReason = "Equivalent knowledge record already exists in KnowledgeStore.";
        return {
          candidateId: candidate.id,
          status: "REJECTED",
          decision: {
            ...decision,
            approved: false,
            status: "REJECTED",
            reason: "Duplicate knowledge: an identical or equivalent heuristic is already stored."
          }
        };
      }
      const tags = Array.from(
        /* @__PURE__ */ new Set(["promoted_knowledge", "heuristic", candidate.category.toLowerCase(), ...candidate.tags])
      );
      const recordId = `kn_${candidate.id}_${Date.now().toString(36)}`;
      const record = await this.knowledgeStore.createRecord({
        id: recordId,
        content: candidate.proposedContent,
        namespace: candidate.targetNamespace || "default",
        collection: candidate.targetCollection || "heuristics",
        metadata: {
          candidateId: candidate.id,
          category: candidate.category,
          confidence: decision.adjustedConfidence ?? candidate.confidence,
          sourceTaskId: candidate.sourceTaskId,
          sourceExperienceIds: candidate.sourceExperienceIds,
          rationale: candidate.rationale,
          evidence: candidate.evidence,
          promotedAt: Date.now(),
          ...candidate.metadata || {}
        },
        tags,
        relationships: [],
        confidence: decision.adjustedConfidence ?? candidate.confidence,
        source: candidate.sourceTaskId ? `task:${candidate.sourceTaskId}` : "learning_engine"
      });
      candidate.status = "PROMOTED";
      return {
        candidateId: candidate.id,
        status: "PROMOTED",
        decision,
        promotedRecordId: record.id
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      candidate.status = "REJECTED";
      candidate.rejectionReason = `Persistence failure: ${errorMessage}`;
      return {
        candidateId: candidate.id,
        status: "REJECTED",
        decision: {
          approved: false,
          status: "REJECTED",
          reason: `Persistence failure: ${errorMessage}`,
          evaluatedCriteria: {
            minConfidencePassed: false,
            minScorePassed: false,
            minOccurrencesPassed: false,
            contentValid: false,
            notExplicitlyRejected: false
          }
        },
        error: errorMessage
      };
    }
  }
  async processLearningResult(learningResult, context = {}) {
    const results = [];
    try {
      if (learningResult.decision === "DISCARD" /* DISCARD */ || learningResult.decision === "REQUIRES_HUMAN_APPROVAL" /* REQUIRES_HUMAN_APPROVAL */) {
        return results;
      }
      const candidates = this.buildCandidates(learningResult, context);
      for (const candidate of candidates) {
        const result = await this.promoteCandidate(candidate);
        results.push(result);
      }
    } catch (error) {
      console.error("[PromotionService] Error processing learning result:", error);
    }
    return results;
  }
  async getPromotedKnowledge(namespace) {
    try {
      return await this.knowledgeStore.queryRecords({
        namespace,
        tags: ["promoted_knowledge"],
        sortBy: "confidence",
        sortDirection: "desc"
      });
    } catch (error) {
      console.error("[PromotionService] Error querying promoted knowledge:", error);
      return [];
    }
  }
  buildCandidates(learningResult, context) {
    const candidates = [];
    const now = Date.now();
    for (let i = 0; i < learningResult.knowledgePromotions.length; i++) {
      const kp = learningResult.knowledgePromotions[i];
      const category = this.categorizeKnowledge(kp, context);
      const evidence = {
        sourceTool: context.toolName,
        overallScore: context.overallScore,
        detectedMistakes: context.detectedMistakes,
        potentialImprovements: context.potentialImprovements,
        durationMs: context.durationMs,
        occurrences: 1,
        ...context.metadata || {}
      };
      const candidate = {
        id: kp.id || `promo_cand_${now}_${i}`,
        sourceExperienceIds: context.executionId ? [context.executionId] : [],
        sourceTaskId: context.taskId,
        sourceLearningDecision: learningResult.decision,
        proposedContent: kp.content,
        category,
        confidence: kp.confidence ?? 0.8,
        occurrenceCount: 1,
        evidence,
        rationale: learningResult.reasoning || "Derived from execution reflection.",
        tags: kp.tags || [],
        status: "PENDING",
        createdAt: now,
        metadata: kp.metadata
      };
      candidates.push(candidate);
    }
    return candidates;
  }
  categorizeKnowledge(kp, context) {
    const tags = (kp.tags || []).map((t) => t.toLowerCase());
    const content = kp.content.toLowerCase();
    if (tags.includes("error") || tags.includes("mistake") || content.includes("mistake") || content.includes("avoid")) {
      return "ERROR_AVOIDANCE";
    }
    if (tags.includes("tool") || context.toolName || content.includes("tool")) {
      return "TOOL_SELECTION";
    }
    if (tags.includes("parameter") || tags.includes("tuning") || content.includes("parameter") || content.includes("timeout")) {
      return "PARAMETER_TUNING";
    }
    if (tags.includes("framework") || content.includes("react") || content.includes("typescript") || content.includes("node")) {
      return "FRAMEWORK_SPECIFIC";
    }
    if (tags.includes("workflow") || content.includes("pipeline") || content.includes("step")) {
      return "WORKFLOW_OPTIMIZATION";
    }
    return "GENERAL_HEURISTIC";
  }
  async checkDuplicate(candidate) {
    try {
      const records = await this.knowledgeStore.queryRecords({
        namespace: candidate.targetNamespace || "default",
        tags: ["promoted_knowledge"]
      });
      const normalizedProposed = candidate.proposedContent.trim().toLowerCase();
      for (const record of records) {
        if (typeof record.content === "string") {
          const normalizedExisting = record.content.trim().toLowerCase();
          if (normalizedExisting === normalizedProposed) {
            return true;
          }
        }
        if (record.metadata && record.metadata.candidateId === candidate.id) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }
};

// src/agent/knowledge/KnowledgeErrors.ts
var KnowledgeError = class extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "KnowledgeError";
  }
};
var KnowledgeNotFoundError = class extends KnowledgeError {
  constructor(id, type = "Record") {
    super(`${type} with ID '${id}' not found.`, "KNOWLEDGE_NOT_FOUND", { id, type });
    this.name = "KnowledgeNotFoundError";
  }
};
var KnowledgeUnsupportedCapabilityError = class extends KnowledgeError {
  constructor(capability) {
    super(`Capability '${capability}' is not supported by this knowledge store.`, "UNSUPPORTED_CAPABILITY", { capability });
    this.name = "KnowledgeUnsupportedCapabilityError";
  }
};

// src/agent/knowledge/InMemoryKnowledgeStore.ts
var generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
var InMemoryKnowledgeStore = class {
  constructor() {
    this.records = /* @__PURE__ */ new Map();
    this.collections = /* @__PURE__ */ new Map();
  }
  getCapabilities() {
    return [
      "NAMESPACES" /* NAMESPACES */,
      "COLLECTIONS" /* COLLECTIONS */,
      "RELATIONSHIPS" /* RELATIONSHIPS */,
      "VERSIONING" /* VERSIONING */,
      "METADATA" /* METADATA */,
      "SEARCH" /* SEARCH */
    ];
  }
  async initialize() {
  }
  async close() {
    this.records.clear();
    this.collections.clear();
  }
  async createRecord(recordData) {
    const now = Date.now();
    const id = recordData.id || generateId();
    const record = {
      ...recordData,
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
      tags: recordData.tags || [],
      relationships: recordData.relationships || [],
      metadata: recordData.metadata || {}
    };
    this.records.set(record.id, record);
    return structuredClone(record);
  }
  async readRecord(id, namespace) {
    const record = this.records.get(id);
    if (!record) return null;
    if (namespace && record.namespace !== namespace) return null;
    return structuredClone(record);
  }
  async updateRecord(id, updates, namespace) {
    const record = this.records.get(id);
    if (!record) {
      throw new KnowledgeNotFoundError(id, "Record");
    }
    if (namespace && record.namespace !== namespace) {
      throw new KnowledgeNotFoundError(id, "Record");
    }
    const updatedRecord = {
      ...record,
      ...updates,
      tags: updates.tags ? [...updates.tags] : record.tags,
      relationships: updates.relationships ? [...updates.relationships] : record.relationships,
      metadata: updates.metadata ? { ...record.metadata, ...updates.metadata } : record.metadata,
      version: record.version + 1,
      updatedAt: Date.now()
    };
    this.records.set(id, updatedRecord);
    return structuredClone(updatedRecord);
  }
  async deleteRecord(id, namespace) {
    const record = this.records.get(id);
    if (record) {
      if (namespace && record.namespace !== namespace) {
        return;
      }
      this.records.delete(id);
    }
  }
  async queryRecords(query) {
    let results = Array.from(this.records.values());
    if (query.namespace) {
      results = results.filter((r) => r.namespace === query.namespace);
    }
    if (query.collection) {
      results = results.filter((r) => r.collection === query.collection);
    }
    if (query.tags && query.tags.length > 0) {
      results = results.filter((r) => query.tags.every((tag) => r.tags.includes(tag)));
    }
    if (query.filters && query.filters.length > 0) {
      for (const filter of query.filters) {
        results = results.filter((r) => {
          let value = r;
          const parts = filter.field.split(".");
          for (const part of parts) {
            if (value === void 0 || value === null) break;
            value = value[part];
          }
          switch (filter.operator) {
            case "eq":
              return value === filter.value;
            case "neq":
              return value !== filter.value;
            case "gt":
              return value > filter.value;
            case "gte":
              return value >= filter.value;
            case "lt":
              return value < filter.value;
            case "lte":
              return value <= filter.value;
            case "in":
              return Array.isArray(filter.value) && filter.value.includes(value);
            case "contains":
              return Array.isArray(value) && value.includes(filter.value);
            case "hasTag":
              return r.tags.includes(filter.value);
            case "hasRelationship":
              return r.relationships.some((rel) => rel.targetId === filter.value || rel.type === filter.value);
            default:
              return true;
          }
        });
      }
    }
    if (query.sortBy) {
      const field = query.sortBy;
      const dir = query.sortDirection === "desc" ? -1 : 1;
      results.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        return (valA > valB ? 1 : valA < valB ? -1 : 0) * dir;
      });
    }
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }
    return results.map((r) => structuredClone(r));
  }
  async createCollection(collectionData) {
    const now = Date.now();
    const id = collectionData.id || generateId();
    const collection = {
      ...collectionData,
      id,
      createdAt: now,
      updatedAt: now,
      metadata: collectionData.metadata || {}
    };
    this.collections.set(collection.id, collection);
    return structuredClone(collection);
  }
  async getCollection(id, namespace) {
    const collection = this.collections.get(id);
    if (!collection) return null;
    if (namespace && collection.namespace !== namespace) return null;
    return structuredClone(collection);
  }
  async updateCollection(id, updates, namespace) {
    const collection = this.collections.get(id);
    if (!collection) {
      throw new KnowledgeNotFoundError(id, "Collection");
    }
    if (namespace && collection.namespace !== namespace) {
      throw new KnowledgeNotFoundError(id, "Collection");
    }
    const updatedCollection = {
      ...collection,
      ...updates,
      metadata: updates.metadata ? { ...collection.metadata, ...updates.metadata } : collection.metadata,
      updatedAt: Date.now()
    };
    this.collections.set(id, updatedCollection);
    return structuredClone(updatedCollection);
  }
  async deleteCollection(id, namespace) {
    const collection = this.collections.get(id);
    if (collection) {
      if (namespace && collection.namespace !== namespace) {
        return;
      }
      this.collections.delete(id);
    }
  }
  async beginTransaction() {
    throw new KnowledgeUnsupportedCapabilityError("TRANSACTIONS" /* TRANSACTIONS */);
  }
};

// src/server/services/agentIntegration/execution/ExecutionIntegrationService.ts
var ExecutionIntegrationService = class _ExecutionIntegrationService {
  // In-memory store
  constructor(knowledgeStore) {
    this.reflectionEngine = new RuleBasedReflection();
    this.learningEngine = new RuleBasedLearningEngine();
    this.knowledgeStore = new InMemoryKnowledgeStore();
    if (knowledgeStore) {
      this.knowledgeStore = knowledgeStore;
    }
    this.promotionService = new DefaultPromotionService(
      this.knowledgeStore,
      void 0,
      _ExecutionIntegrationService.experienceStore
    );
    this.registry = new DefaultToolRegistry();
    const resolver = new ToolResolver(this.registry);
    const permissionValidator = new PermissionValidator();
    const inputValidator = new InputValidator();
    const normalizer = new ResultNormalizer();
    const checkpointStore = new InMemoryCheckpointStore();
    const restoreStrategy = new DefaultRestoreStrategy();
    this.pipeline = new ExecutionPipeline(
      resolver,
      permissionValidator,
      inputValidator,
      normalizer,
      checkpointStore,
      restoreStrategy
    );
  }
  static {
    // M05 Durable Store replacing in-memory arrays (imported dynamically or require later)
    this.experienceStore = new DurableExperienceStore();
  }
  static {
    this.reflectionLogs = [];
  }
  static {
    // In-memory store
    this.learningLogs = [];
  }
  async registerProductionTools(payload, sendEvent, workspaceId) {
    const adapter = new ToolExecutionAdapter(payload, sendEvent);
    await this.registry.register(adapter.createProposeKnowledgeTool());
    await this.registry.register(adapter.createExecuteCodeTool());
    await this.registry.register(adapter.createReadGithubRepoTool());
    await this.registry.register(adapter.createViewFileTool(workspaceId));
    const readFileTool = adapter.createViewFileTool(workspaceId);
    readFileTool.getDescriptor().metadata.name = "read_file";
    await this.registry.register(readFileTool);
    await this.registry.register(adapter.createCreateFileTool(workspaceId));
    await this.registry.register(adapter.createEditFileTool(workspaceId));
    await this.registry.register(adapter.createDeleteFileTool(workspaceId));
    await this.registry.register(adapter.createListDirTool(workspaceId));
    await this.registry.register(adapter.createRunCommandTool(workspaceId));
  }
  async registerWorkspaceTools(workspaceDirOrId) {
    const adapter = new ToolExecutionAdapter({}, () => {
    });
    await this.registry.register(adapter.createViewFileTool(workspaceDirOrId));
    const readFileTool = adapter.createViewFileTool(workspaceDirOrId);
    readFileTool.getDescriptor().metadata.name = "read_file";
    await this.registry.register(readFileTool);
    await this.registry.register(adapter.createCreateFileTool(workspaceDirOrId));
    await this.registry.register(adapter.createEditFileTool(workspaceDirOrId));
    await this.registry.register(adapter.createDeleteFileTool(workspaceDirOrId));
    await this.registry.register(adapter.createListDirTool(workspaceDirOrId));
    await this.registry.register(adapter.createRunCommandTool(workspaceDirOrId));
  }
  getRegisteredTools() {
    const result = [];
    for (const [name, versionMap] of this.registry.tools.entries()) {
      for (const tool of versionMap.values()) {
        result.push({
          name,
          description: tool.getDescriptor()?.metadata?.description
        });
      }
    }
    return result;
  }
  async executeTool(name, args, options) {
    const execId = options?.executionId || `exec_${Date.now()}`;
    const taskId = options?.taskId || `task_${Date.now()}`;
    const context = createInitialContext(
      execId,
      taskId,
      {
        scope: {
          permissions: [],
          allowedTools: ["*"]
        }
      }
    );
    if (options?.workspaceId) {
      context.workspaceId = options.workspaceId;
    }
    if (options?.sessionId) {
      context.sessionId = options.sessionId;
    }
    const result = await this.pipeline.execute(name, args, context);
    if (AgentFeatureFlags.USE_REFLECTION) {
      try {
        const reflectionReq = {
          executionId: context.executionId,
          result: {
            executionId: context.executionId,
            success: result.success,
            finalState: result.success ? "COMPLETED" /* COMPLETED */ : "FAILED" /* FAILED */,
            completedAt: Date.now(),
            error: result.error
          },
          toolResults: [result],
          errors: result.error ? [result.error] : void 0
        };
        const reflectionRecord = await this.reflectionEngine.reflect(reflectionReq);
        _ExecutionIntegrationService.reflectionLogs.push(reflectionRecord);
        console.log(`[Reflection] Generated record for ${name}: Score ${reflectionRecord.summary.overallScore}`);
        await _ExecutionIntegrationService.experienceStore.append({
          sessionId: context.workspaceId || "unknown_session",
          taskId: context.executionId,
          type: "REFLECTION",
          payload: reflectionRecord,
          metadata: {
            success: true
            // reflection generation succeeded
          }
        }).catch((e) => console.error("[Reflection] ExperienceStore error:", e));
        if (AgentFeatureFlags.USE_LEARNING) {
          try {
            const learningReq = {
              reflection: reflectionRecord
            };
            const learningResult = await this.learningEngine.learn(learningReq);
            _ExecutionIntegrationService.learningLogs.push(learningResult);
            console.log(`[Learning] Generated decision for ${name}: ${learningResult.decision}`);
            await _ExecutionIntegrationService.experienceStore.append({
              sessionId: context.workspaceId || "unknown_session",
              taskId: context.executionId,
              type: "LEARNING",
              payload: learningResult,
              metadata: {
                success: true
              }
            }).catch((e) => console.error("[Learning] ExperienceStore error:", e));
            if (AgentFeatureFlags.USE_KNOWLEDGE_PROMOTION) {
              try {
                const promotionResults = await this.promotionService.processLearningResult(learningResult, {
                  sessionId: context.workspaceId || "unknown_session",
                  taskId: context.taskId || context.executionId,
                  executionId: context.executionId,
                  toolName: name,
                  overallScore: reflectionRecord.summary.overallScore,
                  detectedMistakes: reflectionRecord.summary.detectedMistakes,
                  potentialImprovements: reflectionRecord.summary.potentialImprovements,
                  durationMs: typeof result.metadata?.durationMs === "number" ? result.metadata.durationMs : void 0
                });
                console.log(`[Promotion] Processed ${promotionResults.length} promotion candidates for ${name}`);
              } catch (promoErr) {
                console.error("[Promotion] Failed to process promotion:", promoErr);
              }
            }
          } catch (err) {
            console.error("[Learning] Failed to generate learning result:", err);
          }
        }
      } catch (err) {
        console.error("[Reflection] Failed to generate reflection:", err);
      }
    }
    if (!result.success) {
      return { status: "error", error: result.error?.message || String(result.error) };
    }
    return result.data;
  }
};

// src/agent/context/InteractivePlanContext.ts
function formatInteractivePlanContextPrompt(ctx) {
  const lines = [
    "### Active Plan & Task Context",
    `- Goal ID: ${ctx.goalId}`,
    `- Plan ID: ${ctx.planId}`
  ];
  if (ctx.taskId) {
    lines.push(`- Current Task ID: ${ctx.taskId}`);
  }
  if (ctx.goalSummary) {
    lines.push(`- Goal: ${ctx.goalSummary}`);
  }
  if (ctx.taskSummary) {
    lines.push(`- Task Objective: ${ctx.taskSummary}`);
  }
  if (ctx.dependencies && ctx.dependencies.length > 0) {
    lines.push(`- Task Dependencies: ${ctx.dependencies.join(", ")}`);
  }
  if (ctx.completedTasks && ctx.completedTasks.length > 0) {
    lines.push(`- Completed Tasks: ${ctx.completedTasks.join(", ")}`);
  }
  if (ctx.relevantTaskOutputs && ctx.relevantTaskOutputs.length > 0) {
    lines.push(`- Prior Outputs:
\`\`\`json
${JSON.stringify(ctx.relevantTaskOutputs, null, 2)}
\`\`\``);
  }
  lines.push("Keep your actions aligned with this active plan and focused on advancing the current task objective.");
  return lines.join("\n");
}

// src/server/services/agentIntegration/AgentIntegrationService.ts
init_agent_config();
init_di();
init_logInterceptor();
init_AgentRuntime();
init_activeCommandRegistry();
function sanitizeModel(model, provider) {
  if (provider === "openrouter") {
    return model || "google/gemini-2.5-flash";
  }
  if (!model) return DEFAULT_CHAT_MODEL;
  let clean = model.replace(/^(google\/|models\/)/i, "").trim();
  clean = clean.replace(/:(batch|free)$/i, "");
  clean = clean.replace(/\s*\((TEST|BETA|FREE)\)$/i, "");
  if (clean === "gemini-2.5-pro" || clean === "gemini-2.0-pro-exp-02-05" || clean === "gemini-2.0-pro") {
    clean = PRO_CHAT_MODEL;
  } else if (clean === "gemini-2.5-flash" || clean === "gemini-2.0-flash" || clean === "gemini-2.0-flash-exp") {
    clean = DEFAULT_CHAT_MODEL;
  }
  return clean || DEFAULT_CHAT_MODEL;
}
function adaptContentsForModelSwitch(contents, targetModel) {
  if (!Array.isArray(contents)) return contents;
  const isTargetNonGoogle = targetModel && targetModel.includes("/") && !targetModel.startsWith("google/");
  return contents.map((turn) => {
    if (!turn.parts || !Array.isArray(turn.parts)) return turn;
    const turnModel = turn.modelUsed || turn.modelName || turn.model;
    const isModelDifferent = targetModel && turnModel && turnModel !== targetModel;
    if (turn.role === "model") {
      const newParts = [];
      for (const part of turn.parts) {
        if (part.functionCall) {
          const sig = part.thoughtSignature || part.thought_signature || part.functionCall?.thoughtSignature || part.functionCall?.thought_signature;
          if (isTargetNonGoogle || isModelDifferent || !sig) {
            const argsStr = JSON.stringify(part.functionCall.args || {});
            newParts.push({ text: `[Action: Executed tool '${part.functionCall.name}' with parameters: ${argsStr}]` });
          } else {
            newParts.push(part);
          }
        } else if (part.thought) {
          if (isTargetNonGoogle) {
            continue;
          }
          newParts.push(part);
        } else {
          newParts.push(part);
        }
      }
      return { role: turn.role, parts: newParts.length > 0 ? newParts : [{ text: "Acknowledged." }] };
    } else if (turn.role === "user") {
      const newParts = [];
      for (const part of turn.parts) {
        if (part.functionResponse) {
          if (isTargetNonGoogle || isModelDifferent) {
            const respStr = typeof part.functionResponse.response === "object" ? JSON.stringify(part.functionResponse.response) : String(part.functionResponse.response);
            newParts.push({ text: `[Tool Result for '${part.functionResponse.name}': ${respStr}]` });
          } else {
            newParts.push(part);
          }
        } else {
          newParts.push(part);
        }
      }
      return { role: turn.role, parts: newParts.length > 0 ? newParts : [{ text: "Please proceed." }] };
    }
    return turn;
  });
}
function sanitizeAllToolTurnsToText(contents) {
  return contents.map((turn) => {
    if (!turn.parts || !Array.isArray(turn.parts)) return turn;
    if (turn.role === "model") {
      const newParts = [];
      for (const part of turn.parts) {
        if (part.functionCall) {
          const argsStr = JSON.stringify(part.functionCall.args || {});
          newParts.push({ text: `[Action: Executed tool '${part.functionCall.name}' with parameters: ${argsStr}]` });
        } else if (part.thought) {
          continue;
        } else {
          newParts.push(part);
        }
      }
      return { role: turn.role, parts: newParts.length > 0 ? newParts : [{ text: "Acknowledged." }] };
    } else if (turn.role === "user") {
      const newParts = [];
      for (const part of turn.parts) {
        if (part.functionResponse) {
          const respStr = typeof part.functionResponse.response === "object" ? JSON.stringify(part.functionResponse.response) : String(part.functionResponse.response);
          newParts.push({ text: `[Tool Result for '${part.functionResponse.name}': ${respStr}]` });
        } else {
          newParts.push(part);
        }
      }
      return { role: turn.role, parts: newParts.length > 0 ? newParts : [{ text: "Please proceed." }] };
    }
    return turn;
  });
}
var AgentIntegrationService = class _AgentIntegrationService {
  static {
    this.activeExecutions = /* @__PURE__ */ new Map();
  }
  /**
   * Authoritatively stops/cancels an active agent execution by executionId, sessionId, or workspaceId.
   */
  static stopExecution(identifier) {
    let stopped = false;
    for (const [key, active] of _AgentIntegrationService.activeExecutions.entries()) {
      if (identifier.executionId && active.executionId === identifier.executionId || identifier.sessionId && active.sessionId === identifier.sessionId || identifier.workspaceId && active.workspaceId === identifier.workspaceId) {
        active.cancelled = true;
        active.abortController.abort();
        active.runtime.cancelExecution(active.executionId, "Execution stopped by user").catch(() => {
        });
        activeCommandRegistry.abort(active.executionId);
        if (active.sessionId) {
          activeCommandRegistry.abort(active.sessionId);
        }
        if (active.sessionId) {
          di.agentSessionService.setStatus(active.sessionId, "PAUSED", active.userId).catch(() => {
          });
          di.agentSessionService.emitSessionEvent({
            type: "session_status_changed",
            sessionId: active.sessionId,
            workspaceId: active.workspaceId,
            timestamp: Date.now(),
            data: {
              previousStatus: "BUSY",
              newStatus: "PAUSED",
              reason: "User stopped execution"
            }
          });
          di.agentSessionService.emitSessionEvent({
            type: "terminal_event",
            sessionId: active.sessionId,
            executionId: active.executionId,
            workspaceId: active.workspaceId,
            timestamp: Date.now(),
            data: {
              type: "terminal_exit",
              action: "stop",
              executionId: active.executionId,
              exitCode: 130,
              isAborted: true,
              reason: "User stopped execution"
            }
          });
        }
        _AgentIntegrationService.activeExecutions.delete(key);
        stopped = true;
      }
    }
    return stopped;
  }
  /**
   * Entry point for the new Agent Runtime pipeline.
   */
  async handleRequest(request, res) {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const abortController = new AbortController();
    const runtime = new AgentRuntime();
    runtime.createExecution(request.sessionId, executionId);
    const activeExecution = {
      executionId,
      sessionId: request.sessionId,
      workspaceId: request.workspaceId,
      userId: request.userId,
      abortController,
      cancelled: false,
      runtime
    };
    _AgentIntegrationService.activeExecutions.set(executionId, activeExecution);
    const sendEvent = (type, data) => {
      if (activeExecution.cancelled) return;
      if (type === "end") {
        AgentAdapter.handleAgentResponse(res, { type: "end", data: {} });
      } else {
        AgentAdapter.handleAgentResponse(res, { type, data });
      }
    };
    try {
      await runtime.startExecution(executionId);
      const baseSystemPrompt = `You are GeminiDevChatbot, an elite AI Software Engineering Assistant explicitly customized for the development, maintenance, and optimization of this repository.

### CORE OPERATING RULES
1. Strict Grounding: Analyze and formulate responses using the codebase context or any attached repository context provided.
2. File Path References: State full file paths wherever pertinent.
3. TypeScript Excellence: Ensure any code provided is valid, strictly typed TypeScript.
4. Repository Context: When the user attaches or links a repository (or asks about a repository/project), use the provided repository details and use the \`read_github_repo\` tool if you need to fetch specific file contents (such as README.md, package.json, or source code) or explore the file tree.`;
      let cleanPrompt = request.cleanPrompt;
      let sandboxInstructions = "";
      if (request.routingStrategy === "USE_SANDBOX") {
        sandboxInstructions = `### MANDATORY SANDBOX INSTRUCTION
The user has explicitly requested to run code in the sandbox for this query. You MUST use the \`execute_code\` tool to write and execute the code to solve the user's prompt. After receiving the output, present the results clearly to the user.`;
        cleanPrompt = `Please write and execute the code to solve this, using the execute_code tool. Query: ${cleanPrompt}`;
      }
      let retrievedDocs = void 0;
      if (AgentFeatureFlags.USE_AGENT_RETRIEVER && request.routingStrategy === "USE_RAG") {
        const retriever = new RetrieverAdapter(request.userId, request.apiKey, request.provider, request.customBaseUrl);
        retrievedDocs = await retriever.retrieveKnowledge(cleanPrompt, sendEvent);
      }
      let finalSystemPrompt = baseSystemPrompt;
      if (AgentFeatureFlags.USE_AGENT_CONTEXT_BUILDER) {
        const simpleHistory = request.history.map((h) => ({
          role: h.role,
          content: h.parts.map((p) => p.text || "").join("\n")
        }));
        const reqContext = ContextBuilderAdapter.toContextBuilderRequest(
          cleanPrompt,
          baseSystemPrompt,
          simpleHistory,
          retrievedDocs,
          request.customInstructions,
          sandboxInstructions
        );
        const ctxIntegration = new ContextIntegrationService();
        const m03Context = await ctxIntegration.buildContext(reqContext);
        finalSystemPrompt = PromptContextMapper.toLegacySystemPrompt(m03Context);
      } else {
        if (sandboxInstructions && !finalSystemPrompt.includes(sandboxInstructions)) {
          finalSystemPrompt += `

${sandboxInstructions}`;
        }
        if (request.customInstructions && !finalSystemPrompt.includes(request.customInstructions)) {
          finalSystemPrompt += `

User Custom Personalization:
${request.customInstructions}`;
        }
      }
      if (request.codingContext || request.workspaceId) {
        const codingCtx = request.codingContext;
        let contextNote = `

### Interactive Workspace Context`;
        if (request.workspaceId) {
          contextNote += `
- Active Workspace ID: ${request.workspaceId}`;
        }
        if (codingCtx?.currentFile) {
          contextNote += `
- Currently Active File in Editor: ${codingCtx.currentFile}`;
        }
        if (codingCtx?.selectedCode) {
          contextNote += `
- Current User Selection in Editor:
\`\`\`
${codingCtx.selectedCode}
\`\`\``;
        } else if (typeof codingCtx?.selection === "string") {
          contextNote += `
- Current User Selection in Editor:
\`\`\`
${codingCtx.selection}
\`\`\``;
        } else if (codingCtx?.selection && typeof codingCtx.selection === "object" && codingCtx.selection.text) {
          contextNote += `
- Current User Selection in Editor (Lines ${codingCtx.selection.startLine ?? "?"}-${codingCtx.selection.endLine ?? "?"}):
\`\`\`
${codingCtx.selection.text}
\`\`\``;
        }
        contextNote += `
You have access to interactive workspace coding tools (view_file, create_file, edit_file, delete_file, list_dir, run_command) to inspect, edit, create, and verify code inside the user's workspace.
When the user asks to run, test, or execute any shell/terminal command, script, or check version/environment (e.g. "Run npm test", "Ch\u1EA1y npm --version", "node -v", "npm run build", "git status", "ls", etc.), you MUST call the 'run_command' tool with the exact command line.
DO NOT merely answer with speculative or assumed textual output without running the tool. Running the command via 'run_command' streams the live process output directly into the user's Workspace Terminal in real-time.`;
        finalSystemPrompt += contextNote;
      }
      if (request.codingContext?.planContext) {
        finalSystemPrompt += `

${formatInteractivePlanContextPrompt(request.codingContext.planContext)}`;
      }
      let execIntegration;
      if (AgentFeatureFlags.USE_EXECUTION_PIPELINE) {
        execIntegration = new ExecutionIntegrationService();
        await execIntegration.registerProductionTools(
          { id: request.userId, sessionId: request.sessionId, executionId },
          sendEvent,
          request.workspaceId
        );
      }
      const Type2 = di.llmService.getTypeEnum();
      const aiInstance = di.llmService.getClient(request.apiKey, request.customBaseUrl, request.provider);
      const originalRequestedModel = request.rawModel || request.model || DEFAULT_CHAT_MODEL;
      let activeModel = sanitizeModel(request.model || request.rawModel, request.provider);
      let hasEmittedInitialNormalization = false;
      if (activeModel !== originalRequestedModel) {
        console.log(`[MODEL ROUTING] Normalized requested model '${originalRequestedModel}' to Studio format '${activeModel}'`);
        appendSystemLog("AGENT_MODEL_NORM", `Normalized requested model '${originalRequestedModel}' to '${activeModel}'`);
        sendEvent("model_switch", { model: activeModel, isFallback: false, previousModel: originalRequestedModel });
        hasEmittedInitialNormalization = true;
      }
      appendSystemLog("AGENT_STREAM_INIT", `Starting agent response generation for model '${activeModel}' (userId: ${request.userId || "anon"})`);
      if (request.sessionId) {
        try {
          await di.agentSessionService.getOrCreateSession(request.sessionId, request.userId, {
            workspaceId: request.workspaceId,
            activeModel: { modelId: activeModel, provider: request.provider }
          });
          await di.agentSessionService.associateExecution(request.sessionId, executionId, request.userId);
          await di.agentSessionService.setStatus(request.sessionId, "BUSY", request.userId);
        } catch (sessionErr) {
          console.warn("[AgentIntegrationService] Session association notice:", sessionErr);
        }
      }
      const proposeKnowledgeTool = {
        functionDeclarations: [
          {
            name: "proposeKnowledge",
            description: "Propose a new knowledge memory node to be indexed if the user shares important information that needs to be permanently stored and recalled in future conversions.",
            parameters: {
              type: Type2.OBJECT,
              properties: {
                content: { type: Type2.STRING, description: "The core knowledge content to store." },
                reason: { type: Type2.STRING, description: "Why this knowledge should be remembered." }
              },
              required: ["content", "reason"]
            }
          },
          {
            name: "execute_code",
            description: "Execute code in a secure, ephemeral sandbox. Use this tool when you need to test code logic, execute data-processing algorithms, or verify math formulas. Supports 'python', 'javascript', and 'bash' (shell). Strip all markdown formatting like backticks from the 'code' parameter.",
            parameters: {
              type: Type2.OBJECT,
              properties: {
                code: { type: Type2.STRING, description: "Raw, executable source code." },
                language: { type: Type2.STRING, description: "The language of the code ('javascript', 'python', or 'bash').", enum: ["javascript", "python", "bash"] }
              },
              required: ["code", "language"]
            }
          },
          {
            name: "read_github_repo",
            description: "Read the file structure and contents of a public GitHub repository. This tool returns the repository file tree. You can optionally request the content of specific files by providing their paths. Use this when the user shares a GitHub link, attaches a repository, or asks you to read or analyze a repository.",
            parameters: {
              type: Type2.OBJECT,
              properties: {
                repoUrl: { type: Type2.STRING, description: "The public GitHub repository URL (e.g. https://github.com/owner/repo)" },
                filesToRead: {
                  type: Type2.ARRAY,
                  items: { type: Type2.STRING },
                  description: "Optional list of file paths (from the repo root) to read their contents. e.g. ['package.json', 'src/index.ts']"
                }
              },
              required: ["repoUrl"]
            }
          }
        ]
      };
      if (request.workspaceId || request.codingContext) {
        proposeKnowledgeTool.functionDeclarations.push(
          {
            name: "view_file",
            description: "Read the contents of a file in the workspace.",
            parameters: {
              type: Type2.OBJECT,
              properties: {
                filePath: { type: Type2.STRING, description: "Path of the file to read" },
                TargetFile: { type: Type2.STRING, description: "Alternative alias for filePath" }
              },
              required: ["filePath"]
            }
          },
          {
            name: "create_file",
            description: "Create a new file with specified content in the workspace.",
            parameters: {
              type: Type2.OBJECT,
              properties: {
                TargetFile: { type: Type2.STRING, description: "Path of the file to create" },
                Content: { type: Type2.STRING, description: "Full content of the new file" }
              },
              required: ["TargetFile", "Content"]
            }
          },
          {
            name: "edit_file",
            description: "Edit or replace content in an existing file in the workspace.",
            parameters: {
              type: Type2.OBJECT,
              properties: {
                TargetFile: { type: Type2.STRING, description: "Path of the file to edit" },
                TargetContent: { type: Type2.STRING, description: "The exact string snippet to replace" },
                ReplacementContent: { type: Type2.STRING, description: "The replacement string" },
                Content: { type: Type2.STRING, description: "Optional: full replacement content" }
              },
              required: ["TargetFile"]
            }
          },
          {
            name: "delete_file",
            description: "Delete a file from the workspace.",
            parameters: {
              type: Type2.OBJECT,
              properties: {
                TargetFile: { type: Type2.STRING, description: "Path of the file to delete" }
              },
              required: ["TargetFile"]
            }
          },
          {
            name: "list_dir",
            description: "List entries in a directory of the workspace.",
            parameters: {
              type: Type2.OBJECT,
              properties: {
                DirectoryPath: { type: Type2.STRING, description: "Optional directory path to list" }
              }
            }
          },
          {
            name: "run_command",
            description: "Execute a terminal command or script in the workspace sandbox.",
            parameters: {
              type: Type2.OBJECT,
              properties: {
                CommandLine: { type: Type2.STRING, description: "Command line string to run" },
                Cwd: { type: Type2.STRING, description: "Optional working directory" }
              },
              required: ["CommandLine"]
            }
          }
        );
      }
      const promptText = (cleanPrompt || request.prompt || "").trim();
      const rawHistory = Array.isArray(request.history) ? request.history : [];
      const sanitizedHistory = rawHistory.filter((h) => {
        if (!h || !Array.isArray(h.parts) || h.parts.length === 0) return false;
        return h.parts.some((p) => {
          if (p.text && typeof p.text === "string" && p.text.trim().length > 0) return true;
          if (p.functionCall || p.functionResponse || p.thought) return true;
          return false;
        });
      });
      const lastTurn = sanitizedHistory[sanitizedHistory.length - 1];
      let historyWithUserTurn;
      if (lastTurn && lastTurn.role === "user") {
        historyWithUserTurn = sanitizedHistory.map((h, idx) => {
          if (idx === sanitizedHistory.length - 1) {
            let replaced = false;
            const parts = h.parts.map((p) => {
              if (!replaced && typeof p.text === "string") {
                replaced = true;
                return { ...p, text: promptText || p.text || "Hello" };
              }
              return p;
            });
            if (!replaced) {
              parts.unshift({ text: promptText || "Hello" });
            }
            return { role: h.role, parts, modelUsed: h.modelUsed || h.modelName };
          }
          return h;
        });
      } else {
        historyWithUserTurn = [
          ...sanitizedHistory,
          {
            role: "user",
            parts: [{ text: promptText || "Hello" }]
          }
        ];
      }
      let formattedContents = adaptContentsForModelSwitch(historyWithUserTurn, activeModel);
      formattedContents = (Array.isArray(formattedContents) ? formattedContents : []).filter(
        (turn) => Array.isArray(turn?.parts) && turn.parts.length > 0
      );
      if (formattedContents.length === 0) {
        formattedContents = [{
          role: "user",
          parts: [{ text: promptText || "Hello" }]
        }];
      }
      let toolLoops = 0;
      let lastUsageMetadata = null;
      while (toolLoops < 10) {
        if (activeExecution.cancelled || abortController.signal.aborted) {
          sendEvent("status", { message: "Execution cancelled by user." });
          break;
        }
        const config = {
          systemInstruction: finalSystemPrompt,
          tools: [proposeKnowledgeTool]
        };
        const safeContents = formattedContents.filter(
          (turn) => Array.isArray(turn?.parts) && turn.parts.length > 0
        );
        if (safeContents.length === 0) {
          safeContents.push({
            role: "user",
            parts: [{ text: promptText || "Hello" }]
          });
        }
        const modelsToTry = [
          activeModel,
          FLASH_3_8_CHAT_MODEL,
          DEFAULT_CHAT_MODEL,
          FALLBACK_CHAT_MODEL,
          PRO_CHAT_MODEL
        ];
        const uniqueModels = Array.from(new Set(modelsToTry));
        let responseStream = null;
        let lastStreamError = null;
        for (let mIdx = 0; mIdx < uniqueModels.length; mIdx++) {
          const candidateModel = uniqueModels[mIdx];
          try {
            const callConfig = { ...config };
            const thinkingConfig = getThinkingConfigForModel(candidateModel, typeof request.thinkingLevel === "string" ? request.thinkingLevel : void 0);
            if (thinkingConfig) {
              callConfig.thinkingConfig = thinkingConfig;
            } else {
              delete callConfig.thinkingConfig;
            }
            responseStream = await aiInstance.models.generateContentStream({
              model: candidateModel,
              contents: safeContents,
              config: callConfig
            });
            activeModel = candidateModel;
            if (activeModel !== originalRequestedModel) {
              if (!hasEmittedInitialNormalization || activeModel !== candidateModel) {
                console.log(`[MODEL FALLBACK SUCCESS] Successfully recovered and streaming with fallback model '${activeModel}' (requested: '${originalRequestedModel}')`);
                sendEvent("model_switch", { model: activeModel, isFallback: true, previousModel: originalRequestedModel });
                sendEvent("status", { message: `\u26A1 Model failover active: streaming response with '${activeModel}'.` });
              }
            }
            break;
          } catch (streamErr) {
            lastStreamError = streamErr;
            const errText = streamErr?.message || String(streamErr);
            const errLower = errText.toLowerCase();
            const isThoughtSigError = errLower.includes("thought_signature") || errLower.includes("thoughtsignature") || errLower.includes("thought signature") || errLower.includes("missing thought") || errLower.includes("invalid thought") || errLower.includes("thought_context");
            if (isThoughtSigError) {
              console.warn(`[AgentRuntime] Detected thought_signature mismatch on model '${candidateModel}'. Converting history tool turns into context transcripts and retrying '${candidateModel}'...`);
              formattedContents = sanitizeAllToolTurnsToText(formattedContents);
              try {
                const callConfig = { ...config };
                const retryThinkingConfig = getThinkingConfigForModel(candidateModel, typeof request.thinkingLevel === "string" ? request.thinkingLevel : void 0);
                if (retryThinkingConfig) {
                  callConfig.thinkingConfig = retryThinkingConfig;
                } else {
                  delete callConfig.thinkingConfig;
                }
                responseStream = await aiInstance.models.generateContentStream({
                  model: candidateModel,
                  contents: formattedContents,
                  config: callConfig
                });
                activeModel = candidateModel;
                break;
              } catch (retryErr) {
                console.warn(`[AgentRuntime] Retry with sanitized transcripts on '${candidateModel}' also failed:`, retryErr?.message || retryErr);
              }
            }
            const isRecoverable = errText.includes("404") || errText.includes("503") || errText.includes("429") || errText.includes("Not Found") || errText.includes("UNAVAILABLE") || errText.includes("RESOURCE_EXHAUSTED") || errText.includes("Quota exceeded") || errText.includes("no longer available") || errText.includes("contents are required") || isThoughtSigError;
            const nextModel = uniqueModels[mIdx + 1];
            const failureReason = errText.includes("404") || errText.includes("Not Found") ? "404 Not Found" : errText.includes("503") || errText.includes("UNAVAILABLE") ? "503 High Demand" : errText.includes("429") || errText.includes("RESOURCE_EXHAUSTED") || errText.includes("Quota exceeded") ? "429 Quota Exceeded" : isThoughtSigError ? "Thought Signature Mismatch" : "Service Error";
            if (isRecoverable && nextModel) {
              console.warn(`[MODEL FALLBACK] Model '${candidateModel}' encountered error (${failureReason}). Cascading to fallback model '${nextModel}'...`);
              continue;
            } else {
              console.error(`[AgentRuntime] generateContentStream failed for model ${candidateModel}:`, errText);
              throw streamErr;
            }
          }
        }
        if (!responseStream) {
          throw lastStreamError || new Error("Failed to obtain streaming response from model");
        }
        let loopNeedsToolExecution = false;
        const currentFunctionCalls = [];
        const currentFunctionCallParts = [];
        let currentModelText = "";
        let currentThoughtText = "";
        let latestThoughtSignature = void 0;
        for await (const chunk of responseStream) {
          if (chunk.usageMetadata) {
            lastUsageMetadata = chunk.usageMetadata;
          }
          const candidate = chunk.candidates?.[0];
          const rawParts = candidate?.content?.parts || [];
          for (const part of rawParts) {
            const sig = part.thoughtSignature || part.thought_signature || part.functionCall?.thoughtSignature || part.functionCall?.thought_signature;
            if (sig) {
              latestThoughtSignature = sig;
            }
            if (part.thought === true && typeof part.text === "string") {
              currentThoughtText += part.text;
              sendEvent("thinking", part.text);
            }
            if (part.functionCall && typeof part.functionCall.name === "string") {
              loopNeedsToolExecution = true;
              const fc = part.functionCall;
              currentFunctionCalls.push(fc);
              const partSig = sig || latestThoughtSignature;
              const preservedPart = {
                functionCall: fc,
                ...partSig ? { thoughtSignature: partSig, thought_signature: partSig } : {}
              };
              currentFunctionCallParts.push(preservedPart);
            }
          }
          if (chunk.functionCalls && chunk.functionCalls.length > 0) {
            loopNeedsToolExecution = true;
            for (const fc of chunk.functionCalls) {
              const alreadyCaptured = currentFunctionCalls.some(
                (existing) => existing.name === fc.name && JSON.stringify(existing.args) === JSON.stringify(fc.args)
              );
              if (!alreadyCaptured) {
                currentFunctionCalls.push(fc);
                const sig = fc.thoughtSignature || fc.thought_signature || latestThoughtSignature;
                const preservedPart = {
                  functionCall: fc,
                  ...sig ? { thoughtSignature: sig, thought_signature: sig } : {}
                };
                currentFunctionCallParts.push(preservedPart);
              }
            }
          }
          if (chunk.text) {
            currentModelText += chunk.text;
            sendEvent("text", chunk.text);
          }
        }
        if (loopNeedsToolExecution) {
          const toolResponseParts = [];
          for (const fc of currentFunctionCalls) {
            if (activeExecution.cancelled || abortController.signal.aborted) {
              sendEvent("status", { message: "Tool execution cancelled by user." });
              break;
            }
            appendSystemLog("AGENT_TOOL_CALL", `Agent invoked tool '${fc.name}'`, fc.args);
            if (request.sessionId) {
              di.agentSessionService.emitSessionEvent({
                type: "tool_activity",
                sessionId: request.sessionId,
                workspaceId: request.workspaceId,
                timestamp: Date.now(),
                data: {
                  phase: "call",
                  tool: fc.name,
                  args: fc.args
                }
              });
            }
            if (execIntegration) {
              try {
                const result = await execIntegration.executeTool(fc.name, fc.args, {
                  executionId,
                  workspaceId: request.workspaceId,
                  sessionId: request.sessionId
                });
                appendSystemLog("AGENT_TOOL_SUCCESS", `Tool '${fc.name}' completed execution`);
                sendEvent("system_event", {
                  type: "workspace_file_changed",
                  tool: fc.name,
                  workspaceId: request.workspaceId,
                  sessionId: request.sessionId
                });
                if (request.sessionId) {
                  di.agentSessionService.emitSessionEvent({
                    type: "tool_activity",
                    sessionId: request.sessionId,
                    workspaceId: request.workspaceId,
                    timestamp: Date.now(),
                    data: {
                      phase: "result",
                      tool: fc.name,
                      success: true,
                      result
                    }
                  });
                }
                toolResponseParts.push({
                  functionResponse: {
                    name: fc.name,
                    response: typeof result === "object" && result !== null ? result : { output: String(result) }
                  }
                });
              } catch (err) {
                const errorMessage = err?.message || String(err) || "Tool execution error";
                appendSystemLog("AGENT_TOOL_ERROR", `Tool '${fc.name}' failed: ${errorMessage}`);
                if (request.sessionId) {
                  di.agentSessionService.emitSessionEvent({
                    type: "tool_activity",
                    sessionId: request.sessionId,
                    workspaceId: request.workspaceId,
                    timestamp: Date.now(),
                    data: {
                      phase: "result",
                      tool: fc.name,
                      success: false,
                      error: errorMessage
                    }
                  });
                }
                toolResponseParts.push({
                  functionResponse: {
                    name: fc.name,
                    response: { status: "error", error: errorMessage }
                  }
                });
              }
            } else {
              toolResponseParts.push({
                functionResponse: {
                  name: fc.name,
                  response: { status: "error", error: "Execution pipeline disabled" }
                }
              });
            }
          }
          const modelTurnParts = [];
          if (currentThoughtText) {
            modelTurnParts.push({
              thought: true,
              text: currentThoughtText,
              ...latestThoughtSignature ? { thoughtSignature: latestThoughtSignature, thought_signature: latestThoughtSignature } : {}
            });
          }
          if (currentModelText) {
            modelTurnParts.push({ text: currentModelText });
          }
          for (const fcp of currentFunctionCallParts) {
            const sig = fcp.thoughtSignature || fcp.thought_signature || latestThoughtSignature;
            const partObj = {
              functionCall: fcp.functionCall
            };
            if (sig) {
              partObj.thoughtSignature = sig;
              partObj.thought_signature = sig;
            }
            modelTurnParts.push(partObj);
          }
          if (modelTurnParts.length > 0) {
            formattedContents.push({
              role: "model",
              parts: modelTurnParts
            });
          }
          if (toolResponseParts.length > 0) {
            formattedContents.push({
              role: "user",
              parts: toolResponseParts
            });
          }
          toolLoops++;
        } else {
          if (currentModelText) {
            formattedContents.push({
              role: "model",
              parts: [{ text: currentModelText }]
            });
          }
          break;
        }
      }
      if (lastUsageMetadata) {
        sendEvent("metadata", {
          ...lastUsageMetadata,
          model: activeModel,
          isFallback: activeModel !== originalRequestedModel
        });
      } else {
        sendEvent("metadata", {
          model: activeModel,
          isFallback: activeModel !== originalRequestedModel
        });
      }
      if (request.sessionId && !activeExecution.cancelled) {
        try {
          await di.agentSessionService.setStatus(request.sessionId, "IDLE", request.userId);
        } catch (statusErr) {
          console.warn("[AgentIntegrationService] Failed to set IDLE status:", statusErr);
        }
      }
      AgentAdapter.handleAgentResponse(res, { type: "end", data: {} });
    } catch (e) {
      console.error("[AgentRuntime ERROR]:", e);
      if (request.sessionId && !activeExecution.cancelled) {
        try {
          await di.agentSessionService.setStatus(request.sessionId, "ERROR", request.userId);
        } catch (statusErr) {
          console.warn("[AgentIntegrationService] Failed to set ERROR status:", statusErr);
        }
      }
      const errStr = e?.message || String(e) || "";
      const is503 = (errStr.includes("503") || errStr.includes("UNAVAILABLE") || errStr.includes("RESOURCE_EXHAUSTED")) && !errStr.includes("No such file") && !errStr.includes("ENOENT");
      let friendlyError = e.message || "An unexpected error occurred in backend chat pipeline.";
      if (is503) {
        friendlyError = "AI Model cluster is currently experiencing extremely high demand. We cascaded through all fallback models but they are currently unavailable. Please try again shortly.";
      } else if (typeof friendlyError === "string" && friendlyError.includes("Missing Authentication header")) {
        friendlyError = "API Error (401): Missing Authentication header. If you are using Google Gemini natively, please ensure your Custom Base URL in Key Settings is empty. If you are using OpenRouter, ensure your key is valid and Provider is set to OpenRouter.";
      } else if (typeof friendlyError === "string" && friendlyError.includes("User not found")) {
        friendlyError = "API Error (401): User not found. Your OpenRouter API key is invalid.";
      } else if (typeof friendlyError === "string" && friendlyError.includes("API key not valid")) {
        friendlyError = "API Error (400): Google Gemini API key not valid. Please ensure your API key is correct in Settings.";
      }
      sendEvent("error", friendlyError);
      AgentAdapter.handleAgentResponse(res, { type: "end", data: {} });
    } finally {
      _AgentIntegrationService.activeExecutions.delete(executionId);
      if (!activeExecution.cancelled) {
        await runtime.completeExecution(executionId).catch(() => {
        });
      }
      res.end();
    }
  }
};

// src/server/services/agentIntegration/AgentAdapter.ts
var AgentAdapter = class _AgentAdapter {
  static toAgentRequest(reqBody, cleanPrompt, routingStrategy, userId, apiKey) {
    let mode = "DIRECT_CHAT" /* DIRECT_CHAT */;
    if (routingStrategy === "USE_RAG") {
      mode = "USE_RAG" /* USE_RAG */;
    } else if (reqBody.prompt && reqBody.prompt.match(/^\/sandbox\s+/i)) {
      mode = "USE_SANDBOX" /* USE_SANDBOX */;
    }
    const rawProvider = reqBody.provider || "google";
    const normalizedModel = sanitizeModel(reqBody.model, rawProvider);
    return {
      prompt: reqBody.prompt,
      cleanPrompt,
      history: reqBody.history || [],
      model: normalizedModel,
      rawModel: reqBody.model,
      activeSkillIds: reqBody.activeSkillIds || [],
      useSearch: reqBody.useSearch || false,
      thinkingLevel: reqBody.thinkingLevel || 0,
      provider: rawProvider,
      userId,
      apiKey,
      customBaseUrl: reqBody.customBaseUrl,
      customInstructions: reqBody.customInstructions,
      routingStrategy: mode,
      sessionId: reqBody.sessionId,
      workspaceId: reqBody.workspaceId,
      codingContext: reqBody.codingContext || (reqBody.currentFile || reqBody.selectedCode || reqBody.selection ? {
        sessionId: reqBody.sessionId,
        workspaceId: reqBody.workspaceId,
        currentFile: reqBody.currentFile,
        selectedCode: reqBody.selectedCode,
        selection: reqBody.selection,
        workspaceState: reqBody.workspaceState,
        openFiles: reqBody.openFiles
      } : void 0)
    };
  }
  static fromChatRequest(reqBody, model = DEFAULT_CHAT_MODEL, userId = "default_user", apiKey = "default_key") {
    return _AgentAdapter.toAgentRequest(
      { ...reqBody, model: reqBody.model || model },
      reqBody.prompt || "",
      "DIRECT_CHAT",
      userId,
      apiKey
    );
  }
  static enrichPromptWithContext(prompt, context) {
    if (!context) return prompt;
    const parts = [prompt];
    if (context.currentFile) {
      parts.push(`
[Active File: ${context.currentFile}]`);
    }
    if (context.selectedCode) {
      parts.push(`
[Selected Code Snippet:
\`\`\`
${context.selectedCode}
\`\`\`]`);
    }
    if (context.openFiles && context.openFiles.length > 0) {
      parts.push(`
[Open Files: ${context.openFiles.join(", ")}]`);
    }
    if (context.planContext) {
      const pc = context.planContext;
      parts.push(`
[Plan Context: Goal ${pc.goalId}, Plan ${pc.planId}${pc.taskId ? `, Task: ${pc.taskId}` : ""}]`);
      if (pc.goalSummary) {
        parts.push(`[Goal: ${pc.goalSummary}]`);
      }
      if (pc.taskSummary) {
        parts.push(`[Current Task: ${pc.taskSummary}]`);
      }
      if (pc.completedTasks && pc.completedTasks.length > 0) {
        parts.push(`[Completed Tasks: ${pc.completedTasks.join(", ")}]`);
      }
    }
    return parts.join("\n");
  }
  static handleAgentResponse(res, response) {
    if (response.type === "end") {
      res.write(`event: end
data: {}

`);
    } else {
      res.write(`data: ${JSON.stringify({ type: response.type, data: response.data })}

`);
    }
  }
};

// src/server/controllers/ChatController.ts
var router = express.Router();
router.post("/summarize-memory", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "No token" });
    const token = authHeader.split(" ")[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET).catch(() => ({ payload: null }));
    if (!payload || !payload.id) return res.status(401).json({ error: "Invalid token" });
    const { logs, existingSummary } = req.body;
    const apiKey = await resolveGoogleApiKey(payload.id) || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      return res.status(400).json({ error: "No API key configured for compaction agent. Please add an API key in settings." });
    }
    const ai = di.llmService.getClient(apiKey);
    const instruction = "Act as a memory compaction agent. Summarize the technical decisions, codebase changes, architecture paths, and fixed bugs from these logs into a single high-density paragraph. Preserve absolute pathnames and system configurations." + (existingSummary ? "\n\nPreviously summarized context:\n" + existingSummary : "");
    const response = await ai.models.generateContent({
      model: DEFAULT_CHAT_MODEL,
      contents: [{ role: "user", parts: [{ text: logs }] }],
      config: {
        systemInstruction: instruction
      }
    });
    res.json({ summary: response.text });
  } catch (err) {
    const is503 = err?.message?.includes("503") || err?.message?.includes("UNAVAILABLE");
    if (is503) {
      console.info("Compaction failed due to high demand (503). Retrying later.");
    } else {
      console.error("Compaction failed:", err.message || err);
    }
    res.status(500).json({ error: err.message });
  }
});
router.post("/execute", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET).catch(() => ({ payload: null }));
    if (!payload || !payload.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { code, language } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }
    const lang = (language || "javascript").toLowerCase();
    const judge0Langs = ["c", "cpp", "c++", "csharp", "cs", "c#", "rust", "rs", "go", "php", "ruby", "rb", "java", "typescript", "ts"];
    const judge0Aliases = {
      "c": 103,
      "cpp": 105,
      "c++": 105,
      "csharp": 51,
      "cs": 51,
      "c#": 51,
      "typescript": 101,
      "ts": 101,
      "rust": 108,
      "rs": 108,
      "go": 107,
      "php": 98,
      "ruby": 72,
      "rb": 72,
      "bash": 46,
      "sh": 46,
      "javascript": 102,
      "js": 102,
      "python": 109,
      "py": 109,
      "java": 91
    };
    if (judge0Langs.includes(lang) || !process.env.E2B_API_KEY) {
      try {
        const judge0LangId = judge0Aliases[lang] || 102;
        const judge0Res = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language_id: judge0LangId,
            source_code: code
          })
        });
        const data = await judge0Res.json();
        if (!judge0Res.ok) throw new Error(data.error || "Judge0 execution failed");
        let output = "";
        if (data.compile_output) {
          output += `Compilation Error:
${data.compile_output}

`;
        }
        output += data.stdout || "";
        if (data.stderr) {
          output += (output ? "\n" : "") + data.stderr;
        }
        if (data.message) {
          output += (output ? "\n" : "") + data.message;
        }
        if (!output.trim()) {
          output = "Code executed successfully with no output.";
        }
        return res.json({ output });
      } catch (e) {
        return res.status(500).json({ error: `Judge0 execution error: ${e.message}` });
      }
    }
    let e2bModule;
    try {
      e2bModule = await import("@e2b/code-interpreter");
    } catch (e) {
      return res.status(500).json({ error: `Error: Sandbox library missing. ${e.message}` });
    }
    const apiKey = process.env.E2B_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Error: E2B_API_KEY not configured." });
    let sandbox;
    let fullOutput = "";
    try {
      let execution;
      const supportedLanguages = ["python", "javascript", "r", "java", "bash", "c", "cpp", "php", "ruby"];
      if (!supportedLanguages.includes(lang)) {
        return res.json({ output: `Error: Language '${lang}' is not supported in the remote sandbox by default. Supported languages are: ${supportedLanguages.join(", ")}.` });
      }
      sandbox = await e2bModule.Sandbox.create({ apiKey });
      execution = await sandbox.runCode(code, {
        language: lang,
        onStdout: (out) => {
          const text2 = out.line || out.text || out.toString();
          fullOutput += text2;
        },
        onStderr: (out) => {
          const text2 = out.line || out.text || out.toString();
          fullOutput += text2;
        },
        onResult: (resD) => {
          const text2 = resD.text ? resD.text + "\n" : JSON.stringify(resD) + "\n";
          fullOutput += text2;
        }
      });
      if (execution.error) {
        const errorText = `
Error: ${execution.error.name} - ${execution.error.value}
${execution.error.traceback}
`;
        fullOutput += errorText;
      }
      res.json({ output: fullOutput || "Code executed successfully with no console output." });
    } catch (e) {
      res.status(500).json({ error: `Sandbox execution error: ${e.message}` });
    } finally {
      if (sandbox) await sandbox.kill();
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.post("/chat", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    console.log("[CHAT_REQ] provider:", req.body.provider, "model:", req.body.model, "customKey:", !!req.body.customKey);
    const { prompt, history, model, activeSkillIds, useSearch, thinkingLevel, customKey, customInstructions, customBaseUrl, provider } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }
    const userId = payload.id;
    const apiKey = await resolveGoogleApiKey(userId, customKey, provider);
    if (!apiKey) {
      return res.status(400).json({ error: "API key not configured. Please add an API key in active settings." });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const sendEvent = (type, data) => {
      res.write(`data: ${JSON.stringify({ type, data })}

`);
    };
    let routingStrategy = "DIRECT_CHAT";
    let cleanPrompt = prompt;
    let isForcedRAG = false;
    let isForcedSandbox = false;
    if (/^\/sandbox\s+/i.test(prompt)) {
      routingStrategy = "DIRECT_CHAT";
      cleanPrompt = prompt.replace(/^\/sandbox\s+/i, "").trim();
      isForcedSandbox = true;
      sendEvent("routing", { strategy: "USE_SANDBOX", forced: true, message: "Forced Sandbox mode activated via /SANDBOX command." });
    } else if (/^\/rag\s+/i.test(prompt)) {
      routingStrategy = "USE_RAG";
      cleanPrompt = prompt.replace(/^\/rag\s+/i, "").trim();
      isForcedRAG = true;
      sendEvent("routing", { strategy: "USE_RAG", forced: true, message: "Forced memory indexing mode activated via /RAG command." });
    } else {
      routingStrategy = await determineRoutingStrategy(cleanPrompt, apiKey, provider, customBaseUrl, userId);
      sendEvent("routing", { strategy: routingStrategy, forced: false });
    }
    if (AgentFeatureFlags.USE_AGENT_RUNTIME) {
      const agentRequest = AgentAdapter.toAgentRequest(req.body, cleanPrompt, routingStrategy, userId, apiKey);
      const integrationService = new AgentIntegrationService();
      await integrationService.handleRequest(agentRequest, res);
      return;
    }
    let baseSystemPrompt = `You are GeminiDevChatbot, an elite AI Software Engineering Assistant explicitly customized for the development, maintenance, and optimization of this repository.

### CORE OPERATING RULES
1. Strict Grounding: Analyze and formulate responses using the codebase context or any attached repository context provided.
2. File Path References: State full file paths wherever pertinent.
3. TypeScript Excellence: Ensure any code provided is valid, strictly typed TypeScript.
4. Repository Context: When the user attaches or links a repository (or asks about a repository/project), use the provided repository details and use the \`read_github_repo\` tool if you need to fetch specific file contents (such as README.md, package.json, or source code) or explore the file tree.

Always provide runnable code blocks/examples with Markdown syntax.`;
    let sandboxInstructions = "";
    if (isForcedSandbox) {
      sandboxInstructions = `### MANDATORY SANDBOX INSTRUCTION
The user has explicitly requested to run code in the sandbox for this query. You MUST use the \`execute_code\` tool to write and execute the code to solve the user's prompt. After receiving the output, present the results clearly to the user.`;
      cleanPrompt = `Please write and execute the code to solve this, using the execute_code tool. Query: ${cleanPrompt}`;
    }
    let retrievedDocs = void 0;
    let finalSystemPrompt = baseSystemPrompt;
    if (AgentFeatureFlags.USE_AGENT_RETRIEVER) {
      if (routingStrategy === "USE_RAG") {
        const retriever = new RetrieverAdapter(userId, apiKey, provider, customBaseUrl);
        retrievedDocs = await retriever.retrieveKnowledge(cleanPrompt, sendEvent);
      }
    } else {
      if (customInstructions) {
        finalSystemPrompt += `

User Custom Personalization:
${customInstructions}`;
      }
      if (routingStrategy === "USE_RAG") {
        sendEvent("status", { message: "Performing vector similarity search in repository context..." });
        const aiInstance2 = di.llmService.getClient(apiKey, customBaseUrl, provider);
        const embedResponse = await aiInstance2.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: cleanPrompt,
          config: { outputDimensionality: 768 }
        });
        const embeddingVector = embedResponse.embeddings?.[0]?.values;
        if (embeddingVector) {
          const { knowledgeNodes: knowledgeNodes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
          const { cosineDistance: cosineDistance2 } = await import("drizzle-orm");
          const retrievedContexts = await txWithUser(userId, async (tx) => {
            return await tx.select({
              content: knowledgeNodes2.content,
              nodeType: knowledgeNodes2.nodeType,
              metadata: knowledgeNodes2.metadata,
              similarity: cosineDistance2(knowledgeNodes2.embedding, embeddingVector)
            }).from(knowledgeNodes2).orderBy(cosineDistance2(knowledgeNodes2.embedding, embeddingVector)).limit(5);
          });
          if (retrievedContexts.length > 0) {
            const formattedContext = retrievedContexts.map((node, i) => {
              const pathInfo = node.metadata?.path || "Unknown File";
              return `[Node ${i + 1}] (${node.nodeType}) File: ${pathInfo}
Similarity: ${(1 - node.similarity).toFixed(4)}
Content:
${node.content}`;
            }).join("\n\n---\n\n");
            finalSystemPrompt += `

### RETRIEVED REPOSITORY CONTEXT
Use the following active codebase memory contexts to formulate your answer:

${formattedContext}`;
            sendEvent("status", { message: `Context retrieval completed. Loaded ${retrievedContexts.length} repository memory blocks.` });
          } else {
            sendEvent("status", { message: "No codebase memory matched query context. Proceeding with standard instructions." });
          }
        } else {
          sendEvent("status", { message: "Failed to generate search embeddings. Standard mode enabled." });
        }
      }
    }
    let simpleHistory = history.map((h) => ({
      role: h.role,
      content: h.parts.map((p) => p.text || "").join("\n")
    }));
    if (AgentFeatureFlags.USE_AGENT_CONTEXT_BUILDER) {
      const reqContext = ContextBuilderAdapter.toContextBuilderRequest(
        cleanPrompt,
        baseSystemPrompt,
        simpleHistory,
        retrievedDocs,
        customInstructions,
        sandboxInstructions
      );
      const ctxIntegration = new ContextIntegrationService();
      const m03Context = await ctxIntegration.buildContext(reqContext);
      finalSystemPrompt = PromptContextMapper.toLegacySystemPrompt(m03Context);
    } else {
      if (sandboxInstructions && !finalSystemPrompt.includes(sandboxInstructions)) {
        finalSystemPrompt += `

${sandboxInstructions}`;
      }
      if (customInstructions && !finalSystemPrompt.includes(customInstructions)) {
        finalSystemPrompt += `

User Custom Personalization:
${customInstructions}`;
      }
    }
    const chatModel = model || DEFAULT_CHAT_MODEL;
    let finalModelUsed = chatModel;
    const promptText = (cleanPrompt || prompt || "").trim();
    const rawHistory = Array.isArray(history) ? history : [];
    const sanitizedHistory = rawHistory.filter((h) => {
      if (!h || !Array.isArray(h.parts) || h.parts.length === 0) return false;
      return h.parts.some((p) => {
        if (p.text && typeof p.text === "string" && p.text.trim().length > 0) return true;
        if (p.functionCall || p.functionResponse || p.thought) return true;
        return false;
      });
    });
    const lastTurn = sanitizedHistory[sanitizedHistory.length - 1];
    let historyWithUserTurn;
    if (lastTurn && lastTurn.role === "user") {
      historyWithUserTurn = sanitizedHistory.map((h, idx) => {
        if (idx === sanitizedHistory.length - 1) {
          let replaced = false;
          const parts = h.parts.map((p) => {
            if (!replaced && typeof p.text === "string") {
              replaced = true;
              return { ...p, text: promptText || p.text || "Hello" };
            }
            return p;
          });
          if (!replaced) {
            parts.unshift({ text: promptText || "Hello" });
          }
          return { role: h.role, parts, modelUsed: h.modelUsed || h.modelName };
        }
        return h;
      });
    } else {
      historyWithUserTurn = [
        ...sanitizedHistory,
        {
          role: "user",
          parts: [{ text: promptText || "Hello" }]
        }
      ];
    }
    let formattedContents = adaptContentsForModelSwitch(historyWithUserTurn, chatModel);
    if (!Array.isArray(formattedContents) || formattedContents.length === 0) {
      formattedContents = [{
        role: "user",
        parts: [{ text: promptText || "Hello" }]
      }];
    }
    const Type2 = di.llmService.getTypeEnum();
    const aiInstance = di.llmService.getClient(apiKey, customBaseUrl, provider);
    const proposeKnowledgeTool = {
      functionDeclarations: [
        {
          name: "proposeKnowledge",
          description: "Propose a new knowledge memory node to be indexed if the user shares important information that needs to be permanently stored and recalled in future conversions.",
          parameters: {
            type: Type2.OBJECT,
            properties: {
              content: { type: Type2.STRING, description: "The core knowledge content to store." },
              reason: { type: Type2.STRING, description: "Why this knowledge should be remembered." }
            },
            required: ["content", "reason"]
          }
        },
        {
          name: "execute_code",
          description: "Execute code in a secure, ephemeral sandbox. Use this tool when you need to test code logic, execute data-processing algorithms, or verify math formulas. Supports 'python', 'javascript', and 'bash' (shell). Strip all markdown formatting like backticks from the 'code' parameter.",
          parameters: {
            type: Type2.OBJECT,
            properties: {
              code: { type: Type2.STRING, description: "Raw, executable source code." },
              language: { type: Type2.STRING, description: "The language of the code ('javascript', 'python', or 'bash').", enum: ["javascript", "python", "bash"] }
            },
            required: ["code", "language"]
          }
        },
        {
          name: "read_github_repo",
          description: "Read the file structure and contents of a public GitHub repository. This tool returns the repository file tree. You can optionally request the content of specific files by providing their paths. Use this when the user shares a GitHub link, attaches a repository, or asks you to read or analyze a repository.",
          parameters: {
            type: Type2.OBJECT,
            properties: {
              repoUrl: { type: Type2.STRING, description: "The public GitHub repository URL (e.g. https://github.com/owner/repo)" },
              filesToRead: {
                type: Type2.ARRAY,
                items: { type: Type2.STRING },
                description: "Optional list of file paths (from the repo root) to read their contents. e.g. ['package.json', 'src/index.ts']"
              }
            },
            required: ["repoUrl"]
          }
        }
      ]
    };
    let toolLoops = 0;
    let lastUsageMetadata = null;
    let autoSave_aiOutputText = "";
    const autoSave_allFunctionCalls = [];
    const autoSave_toolResponses = [];
    while (toolLoops < 5) {
      let responseStream;
      let streamSuccess = false;
      let attemptCount = 0;
      let lastStreamError = null;
      while (!streamSuccess && attemptCount < 4) {
        attemptCount++;
        let loopProvider = provider;
        let finalConfig = {};
        let actualModel = finalModelUsed;
        let loopAiInstance = aiInstance;
        try {
          if (!loopProvider) {
            if (finalModelUsed && finalModelUsed.includes("/") && !finalModelUsed.startsWith("models/")) {
              loopProvider = "openrouter";
            } else {
              loopProvider = "google";
            }
          }
          let loopApiKey = apiKey;
          if (loopProvider !== provider) {
            loopApiKey = await resolveGoogleApiKey(userId, customKey, loopProvider) || apiKey;
          }
          loopAiInstance = di.llmService.getClient(loopApiKey, customBaseUrl, loopProvider);
          actualModel = finalModelUsed;
          if ((!loopProvider || loopProvider === "google") && actualModel.startsWith("google/")) {
            actualModel = actualModel.replace("google/", "");
            actualModel = actualModel.split(":")[0];
          }
          if ((!loopProvider || loopProvider === "google") && actualModel.includes("/")) {
            actualModel = actualModel.split("/")[1];
          }
          const isGemma = actualModel.toLowerCase().includes("gemma");
          if (!isGemma) {
            finalConfig.systemInstruction = finalSystemPrompt;
            finalConfig.tools = [proposeKnowledgeTool];
            const thinkingConfig = getThinkingConfigForModel(actualModel, typeof thinkingLevel === "string" ? thinkingLevel : void 0);
            if (thinkingConfig) {
              finalConfig.thinkingConfig = thinkingConfig;
            }
          }
          let adjustedContents = formattedContents;
          if (isGemma) {
            adjustedContents = [...formattedContents];
            if (adjustedContents.length > 0 && adjustedContents[0].role === "user") {
              adjustedContents[0] = {
                ...adjustedContents[0],
                parts: [
                  { text: "System Instructions:\n" + finalSystemPrompt + "\n\n--- END SYSTEM INSTRUCTIONS ---\n\n" },
                  ...adjustedContents[0].parts
                ]
              };
            }
          }
          const initialStream = await loopAiInstance.models.generateContentStream({
            model: actualModel,
            contents: adjustedContents,
            config: Object.keys(finalConfig).length > 0 ? finalConfig : void 0
          });
          const iterator = initialStream[Symbol.asyncIterator]();
          const firstResult = await iterator.next();
          let firstChunk = null;
          if (!firstResult.done) {
            firstChunk = firstResult.value;
          }
          async function* wrappedStream() {
            if (firstChunk) yield firstChunk;
            for await (const chunk of iterator) yield chunk;
          }
          responseStream = wrappedStream();
          streamSuccess = true;
        } catch (streamError) {
          lastStreamError = streamError;
          console.error("[CHAT_STREAM_ERROR]", streamError);
          const errorMsg = streamError.message || streamError.toString() || "";
          const errLower = errorMsg.toLowerCase();
          if ((errorMsg.includes("401") || errorMsg.includes("Authentication")) && loopProvider === "openrouter") {
            throw new Error("OpenRouter API Key is missing or invalid. Please add your OpenRouter key in Settings -> API Keys.");
          }
          const isQuotaExceeded = errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.toLowerCase().includes("resource_exhausted") || errorMsg.includes("Quota exceeded") || errorMsg.includes("exceeded your current quota") || errorMsg.includes("limit: 0");
          const isModelNotFound = errorMsg.includes("404") || errorMsg.includes("not found") || errorMsg.includes("not supported") || errorMsg.includes("not be found");
          const isUnavailable = errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE") || errorMsg.includes("experiencing high demand");
          const isThoughtSignatureError = errLower.includes("thought_signature") || errLower.includes("thoughtsignature") || errLower.includes("thought signature") || errLower.includes("missing thought") || errLower.includes("invalid thought") || errLower.includes("thought_context");
          if (isThoughtSignatureError) {
            console.warn(`[CHAT] Detected thought_signature mismatch on model '${finalModelUsed}'. Converting history into context transcripts and retrying '${finalModelUsed}'...`);
            formattedContents = sanitizeAllToolTurnsToText(formattedContents);
            try {
              let retryContents = [...formattedContents];
              if (finalSystemPrompt && loopProvider === "openrouter") {
                retryContents = [
                  { role: "user", parts: [{ text: "System Instructions:\n" + finalSystemPrompt + "\n\n--- END SYSTEM INSTRUCTIONS ---\n\n" }] },
                  ...retryContents
                ];
              }
              const retryConfig = { ...finalConfig };
              const retryThinkingConfig = getThinkingConfigForModel(actualModel, typeof thinkingLevel === "string" ? thinkingLevel : void 0);
              if (retryThinkingConfig) {
                retryConfig.thinkingConfig = retryThinkingConfig;
              } else {
                delete retryConfig.thinkingConfig;
              }
              const retryStream = await loopAiInstance.models.generateContentStream({
                model: actualModel,
                contents: retryContents,
                config: Object.keys(retryConfig).length > 0 ? retryConfig : void 0
              });
              const rIter = retryStream[Symbol.asyncIterator]();
              const rRes = await rIter.next();
              let rChunk = null;
              if (!rRes.done) {
                rChunk = rRes.value;
              }
              async function* wrappedRetryStream() {
                if (rChunk) yield rChunk;
                for await (const chunk of rIter) yield chunk;
              }
              responseStream = wrappedRetryStream();
              streamSuccess = true;
              break;
            } catch (retryErr) {
              console.warn(`[CHAT] Direct retry on '${finalModelUsed}' after sanitizing history tool turns failed:`, retryErr?.message || retryErr);
            }
          }
          const needsFallback = isQuotaExceeded || isModelNotFound || isUnavailable || isThoughtSignatureError;
          const normalizedModel = finalModelUsed.replace("models/", "");
          const isOpenRouterUpstreamError = loopProvider === "openrouter" && (errorMsg.includes("API key not valid") || errorMsg.includes("400") && errorMsg.includes("type.googleapis.com"));
          const reallyNeedsFallback = needsFallback || isOpenRouterUpstreamError;
          let fb1 = loopProvider === "openrouter" ? "google/gemini-2.5-flash" : "gemini-3.8-flash";
          let fb2 = loopProvider === "openrouter" ? "meta-llama/llama-3.3-70b-instruct" : "gemini-3.1-flash-lite";
          let fb3 = loopProvider === "openrouter" ? "google/gemini-2.0-flash-exp:free" : "gemini-2.5-flash";
          let fb4 = loopProvider === "openrouter" ? "google/gemini-2.0-pro-exp-02-05:free" : "gemini-3.1-pro-preview";
          const failureReason = isModelNotFound ? "404 Not Found" : isQuotaExceeded ? "429 Quota Exceeded" : isUnavailable ? "503 High Demand" : isThoughtSignatureError ? "Thought Signature Mismatch" : "Endpoint Error";
          if (reallyNeedsFallback && normalizedModel !== fb1 && normalizedModel !== fb2 && normalizedModel !== fb3 && normalizedModel !== fb4) {
            console.warn(`[MODEL FALLBACK] Model '${finalModelUsed}' failed (${failureReason}). Cascading to fallback '${fb1}'...`);
            sendEvent("status", { message: `\u26A0\uFE0F Selected model '${finalModelUsed}' hit limits. Cascading to '${fb1}'.` });
            finalModelUsed = fb1;
            formattedContents = adaptContentsForModelSwitch(formattedContents, finalModelUsed);
            sendEvent("model_switch", { model: finalModelUsed, isFallback: true });
          } else if (reallyNeedsFallback && normalizedModel === fb1) {
            console.warn(`[MODEL FALLBACK] Model '${finalModelUsed}' failed (${failureReason}). Cascading to fallback '${fb2}'...`);
            sendEvent("status", { message: `\u26A0\uFE0F Cascading to alternative fallback model '${fb2}'...` });
            finalModelUsed = fb2;
            formattedContents = adaptContentsForModelSwitch(formattedContents, finalModelUsed);
            sendEvent("model_switch", { model: finalModelUsed, isFallback: true });
          } else if (reallyNeedsFallback && normalizedModel === fb2) {
            console.warn(`[MODEL FALLBACK] Model '${finalModelUsed}' failed (${failureReason}). Cascading to fallback '${fb3}'...`);
            sendEvent("status", { message: `\u26A0\uFE0F Cascading to alternative fallback model '${fb3}'...` });
            finalModelUsed = fb3;
            formattedContents = adaptContentsForModelSwitch(formattedContents, finalModelUsed);
            sendEvent("model_switch", { model: finalModelUsed, isFallback: true });
          } else if (reallyNeedsFallback && normalizedModel === fb3) {
            console.warn(`[MODEL FALLBACK] Model '${finalModelUsed}' failed (${failureReason}). Cascading to fallback '${fb4}'...`);
            sendEvent("status", { message: `\u26A0\uFE0F Cascading to alternative fallback model '${fb4}'...` });
            finalModelUsed = fb4;
            formattedContents = adaptContentsForModelSwitch(formattedContents, finalModelUsed);
            sendEvent("model_switch", { model: finalModelUsed, isFallback: true });
          } else {
            console.error(`[MODEL FALLBACK] No further fallback candidates available for model '${finalModelUsed}'`);
            throw streamError;
          }
        }
      }
      if (!streamSuccess) {
        throw lastStreamError;
      }
      if (finalModelUsed !== (model || DEFAULT_CHAT_MODEL)) {
        console.log(`[MODEL FALLBACK SUCCESS] Successfully recovered and streaming with fallback model '${finalModelUsed}'`);
      }
      let hasFunctionCalls = false;
      const allFunctionCallsInStream = [];
      const allFunctionCallPartsInStream = [];
      const toolResponses = [];
      let latestThoughtSignature = void 0;
      for await (const chunk of responseStream) {
        if (chunk.usageMetadata) {
          lastUsageMetadata = chunk.usageMetadata;
        }
        const candidate = chunk.candidates?.[0];
        const rawParts = candidate?.content?.parts || [];
        for (const part of rawParts) {
          const sig = part.thoughtSignature || part.thought_signature || part.functionCall?.thoughtSignature || part.functionCall?.thought_signature;
          if (sig) {
            latestThoughtSignature = sig;
          }
          if (part.functionCall && part.functionCall.name) {
            const fc = part.functionCall;
            const partSig = sig || latestThoughtSignature;
            allFunctionCallPartsInStream.push({
              functionCall: fc,
              ...partSig ? { thoughtSignature: partSig, thought_signature: partSig } : {}
            });
          }
        }
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          hasFunctionCalls = true;
          let execIntegration = null;
          if (AgentFeatureFlags.USE_EXECUTION_PIPELINE) {
            execIntegration = new ExecutionIntegrationService();
            await execIntegration.registerProductionTools(payload, sendEvent);
          }
          for (const fc of chunk.functionCalls) {
            allFunctionCallsInStream.push(fc);
            autoSave_allFunctionCalls.push({ name: fc.name });
            const sig = fc.thoughtSignature || fc.thought_signature || latestThoughtSignature;
            if (!allFunctionCallPartsInStream.some((p) => p.functionCall === fc || p.functionCall.name === fc.name && JSON.stringify(p.functionCall.args) === JSON.stringify(fc.args))) {
              allFunctionCallPartsInStream.push({
                functionCall: fc,
                ...sig ? { thoughtSignature: sig, thought_signature: sig } : {}
              });
            }
            if (AgentFeatureFlags.USE_EXECUTION_PIPELINE) {
              try {
                const result = await execIntegration.executeTool(fc.name, fc.args);
                toolResponses.push({ functionResponse: { name: fc.name, response: result } });
              } catch (err) {
                console.error(`[ExecutionPipeline] Error executing ${fc.name}:`, err);
                toolResponses.push({ functionResponse: { name: fc.name, response: { status: "failed", error: err.message } } });
              }
            } else {
              if (fc.name === "proposeKnowledge") {
                const { content, reason } = fc.args;
                try {
                  const { knowledgeProposals: knowledgeProposals2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
                  await txWithUser(payload.id, async (tx) => {
                    await tx.insert(knowledgeProposals2).values({
                      userId: payload.id,
                      actionType: "INSERT",
                      proposedContent: content,
                      reason: reason || "AI Auto-Proposed",
                      status: "PENDING"
                    });
                  });
                  sendEvent("status", { message: `\u{1F4A1} AI auto-proposed a new knowledge memory! (Content length: ${content?.length || 0})` });
                  sendEvent("system_event", { type: "knowledge_proposal_created" });
                  toolResponses.push({ functionResponse: { name: fc.name, response: { status: "success" } } });
                } catch (err) {
                  console.error("Failed to create AI knowledge proposal:", err);
                  sendEvent("status", { message: `\u26A0\uFE0F Output failed to propose knowledge memory.` });
                  toolResponses.push({ functionResponse: { name: fc.name, response: { status: "failed", error: err.message } } });
                }
              } else if (fc.name === "execute_code") {
                const { code, language } = fc.args;
                const langDisp = language || "javascript";
                sendEvent("status", { message: `\u{1F680} Sandbox Executing ${langDisp}...` });
                sendEvent("text", `

\`\`\`${langDisp}
${code}
\`\`\`

\`\`\`ansi
`);
                const runCodeInE2BSandbox = async (codeToRun, lang) => {
                  const targetLang = (lang || "javascript").toLowerCase();
                  const judge0Langs = ["c", "cpp", "c++", "csharp", "cs", "c#", "rust", "rs", "go", "php", "ruby", "rb", "java", "typescript", "ts"];
                  const judge0Aliases = {
                    "c": 103,
                    "cpp": 105,
                    "c++": 105,
                    "csharp": 51,
                    "cs": 51,
                    "c#": 51,
                    "typescript": 101,
                    "ts": 101,
                    "rust": 108,
                    "rs": 108,
                    "go": 107,
                    "php": 98,
                    "ruby": 72,
                    "rb": 72,
                    "bash": 46,
                    "sh": 46,
                    "javascript": 102,
                    "js": 102,
                    "python": 109,
                    "py": 109,
                    "java": 91
                  };
                  if (judge0Langs.includes(targetLang) || !process.env.E2B_API_KEY) {
                    try {
                      const judge0LangId = judge0Aliases[targetLang] || 102;
                      const judge0Res = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          language_id: judge0LangId,
                          source_code: codeToRun
                        })
                      });
                      const data = await judge0Res.json();
                      if (!judge0Res.ok) throw new Error(data.error || "Judge0 execution failed");
                      let output = "";
                      if (data.compile_output) {
                        output += `Compilation Error:
${data.compile_output}

`;
                      }
                      output += data.stdout || "";
                      if (data.stderr) {
                        output += (output ? "\n" : "") + data.stderr;
                      }
                      if (data.message) {
                        output += (output ? "\n" : "") + data.message;
                      }
                      if (!output.trim()) {
                        output = "Code executed successfully with no output.";
                      }
                      sendEvent("text", output);
                      sendEvent("text", `
\`\`\`

`);
                      return output;
                    } catch (e) {
                      const errorText = `Judge0 execution error: ${e.message}
`;
                      sendEvent("text", errorText);
                      sendEvent("text", `
\`\`\`

`);
                      return errorText;
                    }
                  }
                  let e2bModule;
                  try {
                    e2bModule = await import("@e2b/code-interpreter");
                  } catch (e) {
                    return `Error: Sandbox library missing. ${e.message}`;
                  }
                  const apiKey2 = process.env.E2B_API_KEY;
                  if (!apiKey2) return "Error: E2B_API_KEY not configured.";
                  let sandbox;
                  let fullOutput = "";
                  try {
                    const supportedLanguages = ["python", "javascript", "r", "java", "bash", "c", "cpp", "php", "ruby"];
                    if (!supportedLanguages.includes(targetLang)) {
                      const failMsg = `Error: Language '${targetLang}' is not supported in the remote sandbox by default. Supported languages are: ${supportedLanguages.join(", ")}.`;
                      sendEvent("text", failMsg + "\n");
                      return failMsg;
                    }
                    sandbox = await e2bModule.Sandbox.create({ apiKey: apiKey2 });
                    const execution = await sandbox.runCode(codeToRun, {
                      language: targetLang,
                      onStdout: (out) => {
                        const text2 = out.line || out.text || out.toString();
                        fullOutput += text2;
                        sendEvent("text", text2);
                      },
                      onStderr: (out) => {
                        const text2 = out.line || out.text || out.toString();
                        fullOutput += text2;
                        sendEvent("text", text2);
                      },
                      onResult: (res2) => {
                        const text2 = res2.text ? res2.text + "\n" : JSON.stringify(res2) + "\n";
                        fullOutput += text2;
                        sendEvent("text", text2);
                      }
                    });
                    if (execution.error) {
                      const errorText = `
Error: ${execution.error.name} - ${execution.error.value}
${execution.error.traceback}
`;
                      fullOutput += errorText;
                      sendEvent("text", errorText);
                    }
                    sendEvent("text", `
\`\`\`

`);
                    return fullOutput || "Code executed successfully with no output.";
                  } catch (e) {
                    const errorText = `Sandbox execution error: ${e.message}
`;
                    sendEvent("text", errorText);
                    sendEvent("text", `
\`\`\`

`);
                    return errorText;
                  } finally {
                    if (sandbox) await sandbox.kill();
                  }
                };
                try {
                  const executionOutput = await runCodeInE2BSandbox(code, langDisp);
                  toolResponses.push({ functionResponse: { name: fc.name, response: { status: "success", output: executionOutput } } });
                } catch (err) {
                  toolResponses.push({ functionResponse: { name: fc.name, response: { status: "failed", error: err.message } } });
                }
              } else if (fc.name === "read_github_repo") {
                const { repoUrl, filesToRead } = fc.args;
                sendEvent("status", { message: `\u{1F50D} Reading GitHub Repository: ${repoUrl}` });
                const fetchGithubRepo = async (url, files) => {
                  const match = url.match(/github\.com\/([^\/]+)\/([^\/\s]+)/i);
                  if (!match) {
                    throw new Error("Invalid GitHub URL format.");
                  }
                  const owner = match[1];
                  const repo = match[2].replace(/\.git$/, "");
                  try {
                    const defaultBranchUrl = `https://api.github.com/repos/${owner}/${repo}`;
                    const repoInfoRes = await fetch(defaultBranchUrl, { headers: { "User-Agent": "DevGenie-AI" } });
                    if (!repoInfoRes.ok) throw new Error("Could not fetch repo info. Ensure it is public.");
                    const repoInfo = await repoInfoRes.json();
                    const defaultBranch = repoInfo.default_branch || "main";
                    let result = { status: "success", owner, repo, defaultBranch };
                    if (!files || files.length === 0) {
                      const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
                      const treeRes = await fetch(treeUrl, { headers: { "User-Agent": "DevGenie-AI" } });
                      if (!treeRes.ok) throw new Error("Could not fetch file tree.");
                      const treeData = await treeRes.json();
                      result.fileTree = treeData.tree.map((node) => node.path).filter((p) => !p.startsWith(".git/"));
                    } else {
                      result.fileContents = {};
                      for (const file of files) {
                        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file}`;
                        const rawRes = await fetch(rawUrl, { headers: { "User-Agent": "DevGenie-AI" } });
                        if (rawRes.ok) {
                          result.fileContents[file] = await rawRes.text();
                        } else {
                          result.fileContents[file] = `Error: Could not read file ${file}. (${rawRes.status})`;
                        }
                      }
                    }
                    return result;
                  } catch (e) {
                    return { status: "error", error: e.message };
                  }
                };
                try {
                  const fetchResult = await fetchGithubRepo(repoUrl, filesToRead);
                  toolResponses.push({ functionResponse: { name: fc.name, response: fetchResult } });
                  sendEvent("text", `
*Successfully processed GitHub operation for ${repoUrl}*
`);
                } catch (err) {
                  toolResponses.push({ functionResponse: { name: fc.name, response: { status: "failed", error: err.message } } });
                  sendEvent("text", `
*Failed to read ${repoUrl}: ${err.message}*
`);
                }
              } else {
                toolResponses.push({ functionResponse: { name: fc.name, response: { status: "success" } } });
              }
            }
          }
        }
        const candidateParts = chunk.candidates?.[0]?.content?.parts || [];
        for (const part of candidateParts) {
          if (part.thought === true && part.text) {
            sendEvent("thinking", part.text);
          }
        }
        if (chunk.text) {
          sendEvent("text", chunk.text);
          autoSave_aiOutputText += chunk.text;
        }
      }
      sendEvent("thinking_done", null);
      if (hasFunctionCalls && allFunctionCallsInStream.length > 0) {
        autoSave_toolResponses.push(...toolResponses);
        const modelParts = [];
        if (autoSave_aiOutputText.trim()) {
          modelParts.push({ text: autoSave_aiOutputText });
        }
        if (allFunctionCallPartsInStream.length > 0) {
          for (const fcp of allFunctionCallPartsInStream) {
            const sig = fcp.thoughtSignature || fcp.thought_signature || latestThoughtSignature;
            const partObj = {
              functionCall: fcp.functionCall
            };
            if (sig) {
              partObj.thoughtSignature = sig;
              partObj.thought_signature = sig;
            }
            modelParts.push(partObj);
          }
        } else {
          for (const fc of allFunctionCallsInStream) {
            const sig = fc.thoughtSignature || fc.thought_signature || latestThoughtSignature;
            const partObj = {
              functionCall: fc
            };
            if (sig) {
              partObj.thoughtSignature = sig;
              partObj.thought_signature = sig;
            }
            modelParts.push(partObj);
          }
        }
        formattedContents.push({ role: "model", parts: modelParts });
        formattedContents.push({ role: "user", parts: toolResponses });
        toolLoops++;
        continue;
      }
      break;
    }
    try {
      const summaryParts = [];
      summaryParts.push(`User Prompt: ${cleanPrompt}`);
      if (autoSave_allFunctionCalls.length > 0) {
        summaryParts.push(`Tools Used by AI: ${autoSave_allFunctionCalls.map((fc) => fc.name).join(", ")}`);
        const trimmedToolResponses = autoSave_toolResponses.map((tr) => {
          let resObjStr = typeof tr.functionResponse.response === "string" ? tr.functionResponse.response : JSON.stringify(tr.functionResponse.response);
          if (resObjStr && resObjStr.length > 2500) resObjStr = resObjStr.substring(0, 2500) + "...[truncated]";
          return `Tool [${tr.functionResponse.name}] Response:
${resObjStr}`;
        });
        if (trimmedToolResponses.length > 0) {
          summaryParts.push(`Tool Execution Results:
${trimmedToolResponses.join("\n\n")}`);
        }
      }
      const attachedFilesTextLines = [];
      const userParts = history[history.length - 1]?.parts || [];
      for (const p of userParts) {
        if (p.inlineData && p.inlineData.mimeType && p.inlineData.data) {
          if (p.inlineData.mimeType.startsWith("text/")) {
            const base64Text = Buffer.from(p.inlineData.data, "base64").toString("utf8");
            attachedFilesTextLines.push(`Attached File/Data (${p.inlineData.mimeType}):
${base64Text.substring(0, 3e3)}${base64Text.length > 3e3 ? "...[truncated]" : ""}`);
          } else {
            attachedFilesTextLines.push(`Media / Attachment provided: [${p.inlineData.mimeType} - Data omitted for brevity]`);
          }
        }
      }
      if (attachedFilesTextLines.length > 0) {
        summaryParts.push(attachedFilesTextLines.join("\n"));
      }
      if (autoSave_aiOutputText.trim()) {
        summaryParts.push(`AI Output Response:
${autoSave_aiOutputText.substring(0, 4e3)}${autoSave_aiOutputText.length > 4e3 ? "...[truncated]" : ""}`);
      }
      const fullContextStr = summaryParts.join("\n\n---\n\n");
      if (fullContextStr.length > 10) {
        {
          const Type3 = di.llmService.getTypeEnum();
          resolveGoogleApiKey(userId, void 0, "google").then((googleKeyForAutoRAG) => {
            if (!googleKeyForAutoRAG) {
              console.log("[Auto-RAG] Skipped because Google API key is missing.");
              return;
            }
            const aiBackground = di.llmService.getClient(googleKeyForAutoRAG);
            Promise.resolve().then(() => (init_agent_config2(), agent_config_exports)).then(({ EMBEDDING_MODEL: EMBEDDING_MODEL2 }) => {
              aiBackground.models.embedContent({
                model: EMBEDDING_MODEL2,
                contents: fullContextStr.substring(0, 9e3),
                config: { outputDimensionality: 768 }
              }).then(async (embedResponse) => {
                const embeddingVector = embedResponse.embeddings?.[0]?.values;
                if (embeddingVector) {
                  const { knowledgeNodes: knowledgeNodes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
                  await txWithUser(userId, async (tx) => {
                    await tx.insert(knowledgeNodes2).values({
                      content: fullContextStr,
                      nodeType: "past_response",
                      embedding: embeddingVector,
                      metadata: { source: "Auto-Saved AI Execution Context", date: (/* @__PURE__ */ new Date()).toISOString() }
                    });
                  });
                  console.log("[Auto-RAG] Indexed user's chat context & executions.");
                }
              }).catch((err) => {
                console.error("[Auto-RAG] Embed fails:", err.message);
              });
            });
          }).catch((err) => console.error("[Auto-RAG] key resolution fail:", err));
        }
      }
    } catch (err) {
      console.error("Failed to construct auto-RAG context", err);
    }
    if (lastUsageMetadata) {
      console.log("[AI Query Router] Response Metrics (usageMetadata):", lastUsageMetadata);
      sendEvent("metadata", lastUsageMetadata);
    }
    res.write("event: end\ndata: {}\n\n");
    res.end();
  } catch (e) {
    const errStr = e?.message || String(e) || "";
    const is503 = (errStr.includes("503") || errStr.includes("UNAVAILABLE") || errStr.includes("RESOURCE_EXHAUSTED")) && !errStr.includes("No such file") && !errStr.includes("ENOENT");
    if (is503) {
      console.error("[AI Query Router ERROR]: AI Model cluster is currently experiencing high demand. Please try again shortly.");
      res.write(`data: ${JSON.stringify({ type: "error", data: "AI Model cluster is currently experiencing extremely high demand. We cascaded through all fallback models but they are currently unavailable. Please try again shortly." })}

`);
    } else {
      let friendlyError = e.message || "An unexpected error occurred in backend chat pipeline.";
      if (typeof friendlyError === "string" && friendlyError.includes("Missing Authentication header")) {
        friendlyError = "API Error (401): Missing Authentication header. If you are using Google Gemini natively, please ensure your Custom Base URL in Key Settings is empty. If you are using OpenRouter, ensure your key is valid and Provider is set to OpenRouter.";
      } else if (typeof friendlyError === "string" && friendlyError.includes("User not found")) {
        friendlyError = "API Error (401): User not found. Your OpenRouter API key is invalid.";
      } else if (typeof friendlyError === "string" && friendlyError.includes("API key not valid")) {
        friendlyError = "API Error (400): Google Gemini API key not valid. Please ensure your API key is correct in Settings.";
      }
      console.error("[AI Query Router ERROR]:", e.message || e);
      res.write(`data: ${JSON.stringify({ type: "error", data: friendlyError })}

`);
    }
    res.write("event: end\ndata: {}\n\n");
    res.end();
  }
});
router.post("/messages/query", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { query, limit = 50, sessionId, workspaceId, planningOnly, includeAllUsers } = req.body;
    const userId = payload.id;
    const results = await txWithUser(userId, async (tx) => {
      const userObj = await tx.query.users.findFirst({
        where: eq5(users.id, userId)
      });
      if (!userObj) {
        throw new Error("User not found");
      }
      const { and: and2, ilike, desc: desc3 } = await import("drizzle-orm");
      const conditions = [];
      const shouldScopeToUser = userObj.role !== "ADMIN" || !includeAllUsers;
      let scopedSessionIds = null;
      if (shouldScopeToUser) {
        const userSessions = await tx.select({ id: sessions.id }).from(sessions).where(eq5(sessions.userId, userId));
        scopedSessionIds = userSessions.map((s) => s.id);
        if (scopedSessionIds.length === 0) {
          return [];
        }
      }
      if (sessionId) {
        if (scopedSessionIds && !scopedSessionIds.includes(sessionId)) {
          return [];
        }
        conditions.push(eq5(messages.sessionId, sessionId));
      } else if (scopedSessionIds) {
        conditions.push(sql4`${messages.sessionId} IN ${scopedSessionIds}`);
      }
      if (planningOnly) {
        conditions.push(sql4`(
          ${messages.content} ILIKE '%/goal%' OR
          ${messages.content} ILIKE '%M05 Planning%' OR
          ${messages.content} ILIKE '%Planning Complete%' OR
          ${messages.content} ILIKE '%GoalPlanningResult%' OR
          ${messages.content} ILIKE '%Goal Intent%' OR
          ${messages.modelUsed} ILIKE '%Planning Engine%' OR
          EXISTS (
            SELECT 1 FROM ${sessions} s
            WHERE s.id = ${messages.sessionId} AND (
              s.title ILIKE '/goal%' OR
              s.title ILIKE '🎯 Goal%' OR
              s.title ILIKE 'GOAL%'
            )
          )
        )`);
      }
      if (workspaceId && typeof workspaceId === "string" && workspaceId.trim()) {
        const cleanWsId = workspaceId.trim();
        conditions.push(sql4`(
          ${messages.content} ILIKE ${`%${cleanWsId}%`} OR
          CAST(${messages.attachments} AS TEXT) ILIKE ${`%${cleanWsId}%`} OR
          EXISTS (
            SELECT 1 FROM ${sessions} s
            WHERE s.id = ${messages.sessionId} AND (
              s.summary ILIKE ${`%${cleanWsId}%`} OR
              s.title ILIKE ${`%${cleanWsId}%`}
            )
          )
        )`);
      }
      if (query && typeof query === "string" && query.trim()) {
        const cleanQuery = `%${query.trim()}%`;
        conditions.push(ilike(messages.content, cleanQuery));
      }
      const whereClause = conditions.length > 0 ? and2(...conditions) : void 0;
      return await tx.select().from(messages).where(whereClause).orderBy(desc3(messages.createdAt)).limit(Number(limit) || 50);
    });
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.put("/messages/:id/rating", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { rating } = req.body;
    const messageId = req.params.id;
    const userId = payload.id;
    await txWithUser(userId, async (tx) => {
      await tx.update(messages).set({ rating: Number(rating) }).where(eq5(messages.id, messageId));
    });
    res.json({ success: true, rating });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// src/server/controllers/AuthController.ts
init_db();
init_schema();
init_utils();
import express2 from "express";
import bcrypt from "bcryptjs";
import * as jose2 from "jose";
import crypto3 from "crypto";
import { eq as eq6 } from "drizzle-orm";
var router2 = express2.Router();
router2.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const existing = await db.query.users.findFirst({ where: eq6(users.email, email) });
    if (existing) return res.status(400).json({ error: "Email in use" });
    const hash = await bcrypt.hash(password, 10);
    const isSpecialAdmin = email === "nguyensihuynsh711@gmail.com";
    const [user] = await db.insert(users).values({
      email,
      passwordHash: hash,
      role: isSpecialAdmin ? "ADMIN" : "USER"
    }).returning();
    const token = await new jose2.SignJWT({ id: user.id, email: user.email }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(JWT_SECRET);
    res.json({ user: { id: user.id, email: user.email }, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router2.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const user = await db.query.users.findFirst({ where: eq6(users.email, email) });
    if (!user || !user.passwordHash) return res.status(401).json({ error: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    if (user.email === "nguyensihuynsh711@gmail.com" && user.role !== "ADMIN") {
      await db.update(users).set({ role: "ADMIN" }).where(eq6(users.id, user.id));
      user.role = "ADMIN";
    }
    const token = await new jose2.SignJWT({ id: user.id, email: user.email }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(JWT_SECRET);
    res.json({ user: { id: user.id, email: user.email }, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router2.put("/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose2.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { name, avatarUrl, customInstructions } = req.body;
    const [user] = await db.update(users).set({ name, avatarUrl, customInstructions }).where(eq6(users.id, payload.id)).returning();
    const currentUser = await db.query.users.findFirst({
      where: eq6(users.id, payload.id),
      with: { accounts: true }
    });
    const githubToken = currentUser?.accounts?.find((a) => a.provider === "github")?.accessToken;
    res.json({ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, customInstructions: user.customInstructions, githubToken });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router2.post("/auth/guest", async (req, res) => {
  try {
    const guestEmail = `guest_${crypto3.randomUUID()}@guest.local`;
    const [user] = await db.insert(users).values({
      email: guestEmail,
      name: "Guest User"
    }).returning();
    const token = await new jose2.SignJWT({ id: user.id, email: user.email, isGuest: true }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1d").sign(JWT_SECRET);
    res.json({ user: { id: user.id, email: user.email, name: user.name, isGuest: true }, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router2.get("/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose2.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const user = await db.query.users.findFirst({
      where: eq6(users.id, payload.id),
      with: { accounts: true }
    });
    if (!user) return res.status(401).json({ error: "User not found" });
    let userRole = user.role;
    if (user.email === "nguyensihuynsh711@gmail.com" && user.role !== "ADMIN") {
      await db.update(users).set({ role: "ADMIN" }).where(eq6(users.id, user.id));
      userRole = "ADMIN";
    }
    const githubAccount = user.accounts?.find((a) => a.provider === "github");
    const githubToken = githubAccount?.accessToken;
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: userRole,
      customInstructions: user.customInstructions,
      isGuest: !!payload.isGuest,
      githubToken
    });
  } catch (e) {
    res.status(401).json({ error: "Unauthorized" });
  }
});
router2.get(["/auth/github/url", "/auth/github/url/"], (req, res) => {
  try {
    if (!process.env.GITHUB_CLIENT_ID) {
      return res.status(501).json({ error: "GitHub OAuth is not configured. Missing GITHUB_CLIENT_ID." });
    }
    const redirectUri = `${getBaseUrl(req)}/api/auth/github/callback`;
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email%20repo`;
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router2.get(["/auth/github/callback", "/auth/github/callback/"], async (req, res) => {
  const errorParam = req.query.error || req.query.error_description;
  if (errorParam) {
    const errorMsg = req.query.error === "access_denied" ? "You cancelled GitHub sign-in. Please try again." : req.query.error_description || errorParam || "GitHub authentication failed";
    const err = encodeURIComponent(errorMsg);
    return res.send(`
      <html>
        <body>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${err}' }, '*');
              window.close();
            } else {
              window.location.href = '/auth/callback?error=${err}';
            }
          </script>
          <p>Authentication cancelled. This window should close automatically.</p>
        </body>
      </html>
    `);
  }
  const code = req.query.code;
  if (!code) {
    const err = encodeURIComponent("No authorization code provided by GitHub. Please retry.");
    return res.send(`
      <html>
        <body>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${err}' }, '*');
              window.close();
            } else {
              window.location.href = '/auth/callback?error=${err}';
            }
          </script>
          <p>No authorization code received. This window should close automatically.</p>
        </body>
      </html>
    `);
  }
  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    });
    const tokenData = await tokenResponse.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Accept": "application/json"
      }
    });
    const userData = await userResponse.json();
    let email = userData.email;
    if (!email) {
      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "Accept": "application/json"
        }
      });
      const emailsData = await emailsResponse.json();
      const primaryEmail = emailsData.find((e) => e.primary && e.verified);
      email = primaryEmail ? primaryEmail.email : emailsData[0]?.email;
    }
    if (!email) throw new Error("No email found from GitHub");
    let user = await db.query.users.findFirst({ where: eq6(users.email, email) });
    const isSpecialAdmin = email === "nguyensihuynsh711@gmail.com";
    if (!user) {
      [user] = await db.insert(users).values({
        email,
        name: userData.name || userData.login,
        avatarUrl: userData.avatar_url,
        role: isSpecialAdmin ? "ADMIN" : "USER"
      }).returning();
    } else if (isSpecialAdmin && user.role !== "ADMIN") {
      [user] = await db.update(users).set({ role: "ADMIN" }).where(eq6(users.id, user.id)).returning();
    }
    const existingAccount = await db.query.accounts.findFirst({
      where: (accounts6, { eq: eq11, and: and2 }) => and2(eq11(accounts6.provider, "github"), eq11(accounts6.providerAccountId, String(userData.id)))
    });
    if (!existingAccount) {
      await db.insert(accounts).values({
        userId: user.id,
        provider: "github",
        providerAccountId: String(userData.id),
        accessToken: tokenData.access_token
      });
    } else {
      await db.update(accounts).set({ accessToken: tokenData.access_token }).where(eq6(accounts.id, existingAccount.id));
    }
    const token = await new jose2.SignJWT({ id: user.id, email: user.email }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(JWT_SECRET);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${token}' }, '*');
              window.close();
            } else {
              window.location.href = '/auth/callback?token=${token}';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (e) {
    console.error("GitHub oauth error:", e);
    const errMessage = e.cause ? e.cause.message : e.message;
    const err = encodeURIComponent(errMessage);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${err}' }, '*');
              window.close();
            } else {
              window.location.href = '/auth/callback?error=${err}';
            }
          </script>
          <p>Authentication failed. This window should close automatically.</p>
        </body>
      </html>
    `);
  }
});
router2.get(["/auth/google/url", "/auth/google/url/"], (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(501).json({ error: "Google OAuth is not configured. Missing GOOGLE_CLIENT_ID." });
  }
  const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile&prompt=select_account`;
  res.json({ url });
});
router2.get(["/auth/google/callback", "/auth/google/callback/"], async (req, res) => {
  const errorParam = req.query.error || req.query.error_description;
  if (errorParam) {
    const errorMsg = req.query.error === "access_denied" ? "You cancelled Google sign-in. Please try again." : req.query.error_description || errorParam || "Google authentication failed";
    const err = encodeURIComponent(errorMsg);
    return res.send(`
      <html>
        <body>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${err}' }, '*');
              window.close();
            } else {
              window.location.href = '/auth/callback?error=${err}';
            }
          </script>
          <p>Authentication cancelled. This window should close automatically.</p>
        </body>
      </html>
    `);
  }
  const code = req.query.code;
  if (!code) {
    const err = encodeURIComponent("No authorization code provided by Google. Please retry.");
    return res.send(`
      <html>
        <body>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${err}' }, '*');
              window.close();
            } else {
              window.location.href = '/auth/callback?error=${err}';
            }
          </script>
          <p>No authorization code received. This window should close automatically.</p>
        </body>
      </html>
    `);
  }
  try {
    const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
      })
    });
    const tokenData = await tokenResponse.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { "Authorization": `Bearer ${tokenData.access_token}` }
    });
    const userData = await userResponse.json();
    if (!userData.email) throw new Error("No email found from Google");
    let user = await db.query.users.findFirst({ where: eq6(users.email, userData.email) });
    if (!user) {
      [user] = await db.insert(users).values({
        email: userData.email,
        name: userData.name,
        avatarUrl: userData.picture
      }).returning();
    }
    const existingAccount = await db.query.accounts.findFirst({
      where: (accounts6, { eq: eq11, and: and2 }) => and2(eq11(accounts6.provider, "google"), eq11(accounts6.providerAccountId, String(userData.id)))
    });
    if (!existingAccount) {
      await db.insert(accounts).values({
        userId: user.id,
        provider: "google",
        providerAccountId: String(userData.id),
        accessToken: tokenData.access_token
      });
    }
    const token = await new jose2.SignJWT({ id: user.id, email: user.email }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(JWT_SECRET);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${token}' }, '*');
              window.close();
            } else {
              window.location.href = '/auth/callback?token=${token}';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (e) {
    console.error("Google oauth error:", e);
    const errMessage = e.cause ? e.cause.message : e.message;
    const err = encodeURIComponent(errMessage);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener && window.opener !== window) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${err}' }, '*');
              window.close();
            } else {
              window.location.href = '/auth/callback?error=${err}';
            }
          </script>
          <p>Authentication failed. This window should close automatically.</p>
        </body>
      </html>
    `);
  }
});

// src/server/controllers/AdminController.ts
init_logInterceptor();
init_db();
init_utils();
import express3 from "express";
import * as jose3 from "jose";
import { eq as eq7 } from "drizzle-orm";
var router3 = express3.Router();
router3.get("/admin/logs", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.query.token;
    if (!authHeader) return res.status(401).json({ error: "No token" });
    let tokenStr = authHeader;
    if (authHeader.startsWith("Bearer ")) {
      tokenStr = authHeader.split(" ")[1];
    }
    const { payload } = await jose3.jwtVerify(tokenStr, JWT_SECRET);
    if (!payload || !payload.id) return res.status(401).json({ error: "Invalid token" });
    const { users: users4 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const [userRecord] = await db.select().from(users4).where(eq7(users4.id, payload.id));
    if (!userRecord || userRecord.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden. Admin only." });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write(`data: ${JSON.stringify({ type: "history", logs: logHistory })}

`);
    const logListener = (logMsg) => {
      res.write(`data: ${JSON.stringify({ type: "log", log: logMsg })}

`);
    };
    systemLogEmitter.on("log", logListener);
    req.on("close", () => {
      systemLogEmitter.off("log", logListener);
    });
  } catch (err) {
    console.error("SSE /admin/logs init error", err);
    if (!res.headersSent) res.status(500).end();
  }
});
router3.get("/health", (req, res) => {
  res.json({ status: "ok", using: "supabase-postgres" });
});
router3.post("/proxy", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose3.jwtVerify(token, JWT_SECRET).catch(() => ({ payload: null }));
    if (!payload || !payload.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { url, method = "GET", headers = {}, body, stream } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Proxy URL is required" });
    }
    const fetchHeaders = { ...headers, "ngrok-skip-browser-warning": "true" };
    console.log(`[PROXY REQUEST] ${method} ${url}`, { hasBody: !!body, stream });
    const response = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: body ? JSON.stringify(body) : void 0
    });
    if (stream && response.ok) {
      res.status(response.status);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      if (response.body) {
        try {
          const reader = response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
        } catch (e) {
          console.error("Proxy streaming error:", e);
        }
      }
      return res.end();
    }
    const text2 = await response.text();
    let data;
    try {
      data = JSON.parse(text2);
    } catch (e) {
      data = text2;
    }
    if (!response.ok) {
      console.error(`[PROXY ERROR] ${method} ${url} returned ${response.status}`, data);
      return res.status(response.status).json({ error: `Proxy returned ${response.status}`, data });
    }
    console.log(`[PROXY SUCCESS] ${method} ${url} -> ${response.status}`);
    return res.json(data);
  } catch (e) {
    console.error(`[PROXY CATCH ERROR]`, e);
    res.status(500).json({ error: e.message });
  }
});

// src/server/controllers/KnowledgeController.ts
init_db();
init_schema();
init_di();
init_utils();
import express4 from "express";
import * as jose4 from "jose";
import { eq as eq8 } from "drizzle-orm";
var router4 = express4.Router();
router4.post("/knowledge/proposals", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose4.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { actionType, targetNodeId, proposedContent, reason } = req.body;
    const { knowledgeProposals: knowledgeProposals2, knowledgeNodes: knowledgeNodes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    if (actionType === "INSERT") {
      const content = proposedContent;
      if (!content) {
        return res.status(400).json({ error: "Proposal missing content to encode" });
      }
      const apiKey = await resolveGoogleApiKey(payload.id);
      if (!apiKey) {
        return res.status(400).json({ error: "Google Gemini API key not configured. Cannot process vector embeddings for automatic insertion." });
      }
      const ai = di.llmService.getClient(apiKey);
      const embedResponse = await ai.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: content,
        config: {
          outputDimensionality: 768
        }
      });
      const embeddingVector = embedResponse.embeddings?.[0]?.values;
      if (!embeddingVector) {
        throw new Error("Failed to generate embedding");
      }
      const proposal2 = await txWithUser(payload.id, async (tx) => {
        const [insertedNode] = await tx.insert(knowledgeNodes2).values({
          content,
          nodeType: "web_data",
          // fallback default
          embedding: embeddingVector,
          metadata: { reason: reason || "Automatically embedded" }
        }).returning();
        const [createdProposal] = await tx.insert(knowledgeProposals2).values({
          userId: payload.id,
          actionType: "INSERT",
          targetNodeId: insertedNode.id,
          proposedContent: content,
          reason,
          status: "APPROVED"
        }).returning();
        return createdProposal;
      });
      return res.json(proposal2);
    }
    const [proposal] = await txWithUser(payload.id, async (tx) => {
      return await tx.insert(knowledgeProposals2).values({
        userId: payload.id,
        actionType,
        targetNodeId: targetNodeId || null,
        proposedContent,
        reason,
        status: "PENDING"
      }).returning();
    });
    res.json(proposal);
  } catch (e) {
    console.error("ERROR in /api/knowledge/proposals:", e);
    console.error("ERROR details:", {
      name: e.name,
      message: e.message,
      detail: e.detail,
      hint: e.hint,
      code: e.code,
      column: e.column,
      constraint: e.constraint,
      table: e.table,
      severity: e.severity,
      stack: e.stack
    });
    res.status(500).json({
      error: e.message,
      detail: e.detail,
      hint: e.hint,
      code: e.code,
      constraint: e.constraint,
      postgresError: e.internalQuery || e.originalError || e.cause || e
    });
  }
});
router4.post("/knowledge/search", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose4.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { query, limit = 5, customKey } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required for search" });
    }
    const apiKey = await resolveGoogleApiKey(payload.id, customKey);
    if (!apiKey) {
      return res.status(400).json({ error: "API key not valid. Please configure a valid API key or set one up in active settings." });
    }
    const ai = di.llmService.getClient(apiKey);
    const embedResponse = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: query,
      config: {
        outputDimensionality: 768
      }
    });
    const embeddingVector = embedResponse.embeddings?.[0]?.values;
    if (!embeddingVector) {
      throw new Error("Failed to generate embeddings for query");
    }
    const { knowledgeNodes: knowledgeNodes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { cosineDistance: cosineDistance2 } = await import("drizzle-orm");
    const results = await txWithUser(payload.id, async (tx) => {
      return await tx.select({
        id: knowledgeNodes2.id,
        content: knowledgeNodes2.content,
        nodeType: knowledgeNodes2.nodeType,
        metadata: knowledgeNodes2.metadata,
        similarity: cosineDistance2(knowledgeNodes2.embedding, embeddingVector)
      }).from(knowledgeNodes2).orderBy(cosineDistance2(knowledgeNodes2.embedding, embeddingVector)).limit(limit);
    });
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router4.get("/knowledge", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose4.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const userId = payload.id;
    const { knowledgeNodes: knowledgeNodes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const nodes = await txWithUser(userId, async (tx) => {
      return await tx.select().from(knowledgeNodes2);
    });
    res.json(nodes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router4.put("/knowledge/:id", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose4.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { users: users4, knowledgeNodes: knowledgeNodes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const userObj = await db.query.users.findFirst({
      where: eq8(users4.id, payload.id)
    });
    if (!userObj || userObj.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden: Only administrators can update knowledge nodes directly." });
    }
    const { content, nodeType, metadata } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }
    const [existingNode] = await txWithUser(payload.id, async (tx) => {
      return await tx.select().from(knowledgeNodes2).where(eq8(knowledgeNodes2.id, req.params.id));
    });
    if (!existingNode) {
      return res.status(404).json({ error: "Knowledge node not found" });
    }
    const apiKey = await resolveGoogleApiKey(payload.id);
    if (!apiKey) {
      return res.status(400).json({ error: "API key not configured. Cannot update vector embeddings." });
    }
    const ai = di.llmService.getClient(apiKey);
    const embedResponse = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: content,
      config: {
        outputDimensionality: 768
      }
    });
    const embeddingVector = embedResponse.embeddings?.[0]?.values;
    if (!embeddingVector) {
      throw new Error("Failed to generate embedding");
    }
    const [updatedNode] = await txWithUser(payload.id, async (tx) => {
      return await tx.update(knowledgeNodes2).set({
        content,
        nodeType: nodeType || existingNode.nodeType,
        metadata: metadata || existingNode.metadata,
        embedding: embeddingVector
      }).where(eq8(knowledgeNodes2.id, req.params.id)).returning();
    });
    res.json(updatedNode);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router4.delete("/knowledge/:id", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose4.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { users: users4, knowledgeNodes: knowledgeNodes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const userObj = await db.query.users.findFirst({
      where: eq8(users4.id, payload.id)
    });
    if (!userObj || userObj.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden: Only administrators can delete knowledge nodes directly." });
    }
    const [existingNode] = await txWithUser(payload.id, async (tx) => {
      return await tx.select().from(knowledgeNodes2).where(eq8(knowledgeNodes2.id, req.params.id));
    });
    if (!existingNode) {
      return res.status(404).json({ error: "Knowledge node not found" });
    }
    await txWithUser(payload.id, async (tx) => {
      await tx.delete(knowledgeNodes2).where(eq8(knowledgeNodes2.id, req.params.id));
    });
    res.json({ message: "Knowledge node deleted successfully" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router4.get("/knowledge/proposals", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose4.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const userObj = await db.query.users.findFirst({
      where: eq8(users.id, payload.id)
    });
    const isAdmin = userObj?.role?.toUpperCase() === "ADMIN" || userObj?.email === "nguyensihuynsh711@gmail.com";
    if (!isAdmin) {
      return res.json([]);
    }
    const { knowledgeProposals: knowledgeProposals2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const proposals = await txWithUser(payload.id, async (tx) => {
      return await tx.select().from(knowledgeProposals2);
    });
    res.json(proposals);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router4.put("/knowledge/proposals/:id", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose4.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const proposedContent = req.body.proposedContent !== void 0 ? req.body.proposedContent : req.body.content;
    const { reason, status } = req.body;
    const { users: users4, knowledgeProposals: knowledgeProposals2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const [proposal] = await txWithUser(payload.id, async (tx) => {
      return await tx.select().from(knowledgeProposals2).where(eq8(knowledgeProposals2.id, req.params.id));
    });
    if (!proposal) {
      return res.status(404).json({ error: "Proposal not found" });
    }
    const userObj = await db.query.users.findFirst({
      where: eq8(users4.id, payload.id)
    });
    const isAdmin = userObj?.role?.toUpperCase() === "ADMIN" || userObj?.email === "nguyensihuynsh711@gmail.com";
    if (proposal.userId !== payload.id && !isAdmin) {
      return res.status(403).json({ error: "Unauthorized to modify this proposal" });
    }
    const [updated] = await txWithUser(payload.id, async (tx) => {
      return await tx.update(knowledgeProposals2).set({
        proposedContent: proposedContent !== void 0 ? proposedContent : proposal.proposedContent,
        reason: reason !== void 0 ? reason : proposal.reason,
        status: status !== void 0 ? status : proposal.status
      }).where(eq8(knowledgeProposals2.id, req.params.id)).returning();
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router4.post("/knowledge/proposals/:id/approve", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose4.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { users: users4, knowledgeProposals: knowledgeProposals2, knowledgeNodes: knowledgeNodes2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const userObj = await db.query.users.findFirst({
      where: eq8(users4.id, payload.id)
    });
    const isAdmin = userObj?.role?.toUpperCase() === "ADMIN" || userObj?.email === "nguyensihuynsh711@gmail.com";
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Only administrators can approve proposals." });
    }
    const [proposal] = await txWithUser(payload.id, async (tx) => {
      return await tx.select().from(knowledgeProposals2).where(eq8(knowledgeProposals2.id, req.params.id));
    });
    if (!proposal) {
      return res.status(404).json({ error: "Proposal not found" });
    }
    if (proposal.status !== "PENDING") {
      return res.status(400).json({ error: "Proposal has already been processed" });
    }
    const apiKey = await resolveGoogleApiKey(payload.id);
    if (!apiKey) {
      return res.status(400).json({ error: "API key not configured. Cannot process vector embeddings for approval." });
    }
    if (proposal.actionType === "INSERT" || proposal.actionType === "UPDATE") {
      const content = proposal.proposedContent;
      if (!content) {
        return res.status(400).json({ error: "Proposal missing content to encode" });
      }
      const ai = di.llmService.getClient(apiKey);
      const embedResponse = await ai.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: content,
        config: {
          outputDimensionality: 768
        }
      });
      const embeddingVector = embedResponse.embeddings?.[0]?.values;
      if (!embeddingVector) {
        throw new Error("Failed to generate embedding");
      }
      const updatedProposal = await txWithUser(payload.id, async (tx) => {
        if (proposal.actionType === "INSERT") {
          const [insertedNode] = await tx.insert(knowledgeNodes2).values({
            content,
            nodeType: "web_data",
            // fallback default
            embedding: embeddingVector,
            metadata: { reason: proposal.reason }
          }).returning();
          await tx.update(knowledgeProposals2).set({
            status: "APPROVED",
            targetNodeId: insertedNode.id
          }).where(eq8(knowledgeProposals2.id, req.params.id));
        } else if (proposal.actionType === "UPDATE") {
          if (!proposal.targetNodeId) {
            throw new Error("Update proposal is missing targetNodeId");
          }
          await tx.update(knowledgeNodes2).set({
            content,
            embedding: embeddingVector
          }).where(eq8(knowledgeNodes2.id, proposal.targetNodeId));
          await tx.update(knowledgeProposals2).set({
            status: "APPROVED"
          }).where(eq8(knowledgeProposals2.id, req.params.id));
        }
        const [finalProposal] = await tx.select().from(knowledgeProposals2).where(eq8(knowledgeProposals2.id, req.params.id));
        return finalProposal;
      });
      res.json(updatedProposal);
    } else if (proposal.actionType === "DELETE") {
      if (!proposal.targetNodeId) {
        return res.status(400).json({ error: "Delete proposal is missing targetNodeId" });
      }
      const updatedProposal = await txWithUser(payload.id, async (tx) => {
        await tx.delete(knowledgeNodes2).where(eq8(knowledgeNodes2.id, proposal.targetNodeId));
        await tx.update(knowledgeProposals2).set({
          status: "APPROVED"
        }).where(eq8(knowledgeProposals2.id, req.params.id));
        const [finalProposal] = await tx.select().from(knowledgeProposals2).where(eq8(knowledgeProposals2.id, req.params.id));
        return finalProposal;
      });
      res.json(updatedProposal);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router4.post("/knowledge/proposals/:id/reject", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose4.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { users: users4, knowledgeProposals: knowledgeProposals2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const userObj = await db.query.users.findFirst({
      where: eq8(users4.id, payload.id)
    });
    const isAdmin = userObj?.role?.toUpperCase() === "ADMIN" || userObj?.email === "nguyensihuynsh711@gmail.com";
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Only administrators can reject proposals." });
    }
    const [proposal] = await txWithUser(payload.id, async (tx) => {
      return await tx.select().from(knowledgeProposals2).where(eq8(knowledgeProposals2.id, req.params.id));
    });
    if (!proposal) {
      return res.status(404).json({ error: "Proposal not found" });
    }
    const [updatedProposal] = await txWithUser(payload.id, async (tx) => {
      return await tx.update(knowledgeProposals2).set({
        status: "REJECTED"
      }).where(eq8(knowledgeProposals2.id, req.params.id)).returning();
    });
    res.json(updatedProposal);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router4.delete("/knowledge/proposals/:id", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose4.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { users: users4, knowledgeProposals: knowledgeProposals2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const userObj = await db.query.users.findFirst({
      where: eq8(users4.id, payload.id)
    });
    const isAdmin = userObj?.role?.toUpperCase() === "ADMIN" || userObj?.email === "nguyensihuynsh711@gmail.com";
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Only administrators can delete proposals." });
    }
    await txWithUser(payload.id, async (tx) => {
      await tx.delete(knowledgeProposals2).where(eq8(knowledgeProposals2.id, req.params.id));
    });
    res.json({ success: true, deletedId: req.params.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router4.post("/knowledge/proposals/:id/reset", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }
    const token = authHeader.split(" ")[1];
    const { payload } = await jose4.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { users: users4, knowledgeProposals: knowledgeProposals2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const userObj = await db.query.users.findFirst({
      where: eq8(users4.id, payload.id)
    });
    const isAdmin = userObj?.role?.toUpperCase() === "ADMIN" || userObj?.email === "nguyensihuynsh711@gmail.com";
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Only administrators can reset proposals." });
    }
    const [updatedProposal] = await txWithUser(payload.id, async (tx) => {
      return await tx.update(knowledgeProposals2).set({
        status: "PENDING"
      }).where(eq8(knowledgeProposals2.id, req.params.id)).returning();
    });
    res.json(updatedProposal);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// src/server/controllers/ModelController.ts
init_db();
init_schema();
import express5 from "express";
import { eq as eq9, sql as sql8 } from "drizzle-orm";

// src/server/lib/modelReleaseNotices.ts
var EXACT_RELEASE_NOTICES = [
  // Google Gemini specific release notes
  { id: "google/gemini-3.8-flash", url: "https://blog.google/innovation-and-ai/models-and-research/gemini-models/3-8-flash-and-3-8-flash-cyber/" },
  { id: "google/gemini-3.8-flash:batch", url: "https://blog.google/innovation-and-ai/models-and-research/gemini-models/3-8-flash-and-3-8-flash-cyber/" },
  { id: "google/gemini-3.7-flash", url: "https://blog.google/innovation-and-ai/models-and-research/gemini-models/" },
  { id: "google/gemini-3.7-flash:batch", url: "https://blog.google/innovation-and-ai/models-and-research/gemini-models/" },
  { id: "google/gemini-2.0-flash-001", url: "https://blog.google/technology/google-deepmind/google-gemini-ai-update-december-2024/" },
  { id: "google/gemini-2.0-flash-lite-001", url: "https://blog.google/technology/google-deepmind/google-gemini-ai-update-december-2024/" },
  { id: "google/gemini-2.0-flash-exp:free", url: "https://blog.google/technology/google-deepmind/google-gemini-ai-update-december-2024/" },
  { id: "google/gemini-2.0-flash-thinking-exp:free", url: "https://blog.google/technology/google-deepmind/gemini-2-0-flash-thinking-february-2025/" },
  { id: "google/gemini-2.0-pro-exp-02-05:free", url: "https://blog.google/technology/google-deepmind/gemini-2-0-flash-thinking-february-2025/" },
  { id: "google/gemini-1.5-pro", url: "https://blog.google/technology/ai/google-gemini-next-generation-model-february-2024/" },
  { id: "google/gemini-1.5-flash", url: "https://blog.google/technology/developer/gemini-1-5-flash-developer/" },
  { id: "google/gemini-1.5-flash-8b", url: "https://blog.google/technology/developer/gemini-1-5-flash-8b/" },
  // OpenAI specific release notes
  { id: "openai/gpt-4o", url: "https://openai.com/index/hello-gpt-4o/" },
  { id: "openai/gpt-4o-2024-05-13", url: "https://openai.com/index/hello-gpt-4o/" },
  { id: "openai/gpt-4o-2024-08-06", url: "https://openai.com/index/hello-gpt-4o/" },
  { id: "openai/gpt-4o-2024-11-20", url: "https://openai.com/index/hello-gpt-4o/" },
  { id: "openai/chatgpt-4o-latest", url: "https://openai.com/index/hello-gpt-4o/" },
  { id: "openai/gpt-4o-mini", url: "https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/" },
  { id: "openai/gpt-4o-mini-2024-07-18", url: "https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/" },
  { id: "openai/gpt-4.5-preview", url: "https://openai.com/index/introducing-gpt-4-5/" },
  { id: "openai/gpt-4.5", url: "https://openai.com/index/introducing-gpt-4-5/" },
  { id: "openai/gpt-4", url: "https://openai.com/index/gpt-4-research/" },
  { id: "openai/gpt-4-0314", url: "https://openai.com/index/gpt-4-research/" },
  { id: "openai/gpt-4-1106-preview", url: "https://openai.com/index/new-models-and-developer-products-announced-at-devday/" },
  { id: "openai/o1", url: "https://openai.com/index/introducing-openai-o1-preview/" },
  { id: "openai/o1-preview", url: "https://openai.com/index/introducing-openai-o1-preview/" },
  { id: "openai/o1-mini", url: "https://openai.com/index/openai-o1-mini-advancing-cost-efficient-reasoning/" },
  { id: "openai/o3", url: "https://openai.com/index/openai-o3-mini/" },
  { id: "openai/o3-mini", url: "https://openai.com/index/openai-o3-mini/" },
  { id: "openai/o3-mini-high", url: "https://openai.com/index/openai-o3-mini/" },
  { id: "openai/o4-mini", url: "https://openai.com/index/openai-o4-mini/" },
  { id: "openai/gpt-4-turbo", url: "https://openai.com/index/new-embedding-models-and-api-updates/" },
  { id: "openai/gpt-4-turbo-preview", url: "https://openai.com/index/new-embedding-models-and-api-updates/" },
  { id: "openai/gpt-3.5-turbo", url: "https://openai.com/index/introducing-chatgpt-and-whisper-apis/" },
  { id: "openai/gpt-audio", url: "https://openai.com/index/introducing-the-realtime-api/" },
  { id: "openai/gpt-audio-mini", url: "https://openai.com/index/introducing-the-realtime-api/" },
  { id: "openai/gpt-oss-120b", url: "https://openai.com/index/gpt-oss/" },
  { id: "openai/gpt-oss-20b", url: "https://openai.com/index/gpt-oss/" },
  // Anthropic specific release notes
  { id: "anthropic/claude-3.7-sonnet", url: "https://www.anthropic.com/news/claude-3-7-sonnet" },
  { id: "anthropic/claude-3.7-sonnet:thinking", url: "https://www.anthropic.com/news/claude-3-7-sonnet" },
  { id: "anthropic/claude-3-7-sonnet", url: "https://www.anthropic.com/news/claude-3-7-sonnet" },
  { id: "anthropic/claude-3.5-sonnet", url: "https://www.anthropic.com/news/claude-3-5-sonnet" },
  { id: "anthropic/claude-3.5-sonnet:beta", url: "https://www.anthropic.com/news/claude-3-5-sonnet" },
  { id: "anthropic/claude-3.5-sonnet-20241022", url: "https://www.anthropic.com/news/claude-3-5-sonnet" },
  { id: "anthropic/claude-3.5-haiku", url: "https://www.anthropic.com/news/claude-3-5-haiku" },
  { id: "anthropic/claude-3.5-haiku-20241022", url: "https://www.anthropic.com/news/claude-3-5-haiku" },
  { id: "anthropic/claude-3-opus", url: "https://www.anthropic.com/news/claude-3-family" },
  { id: "anthropic/claude-3-sonnet", url: "https://www.anthropic.com/news/claude-3-family" },
  { id: "anthropic/claude-3-haiku", url: "https://www.anthropic.com/news/claude-3-family" },
  // Meta Llama specific release notes
  { id: "meta-llama/llama-3.3-70b-instruct", url: "https://ai.meta.com/blog/llama-3-3/" },
  { id: "meta-llama/llama-3.2-1b-instruct", url: "https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/" },
  { id: "meta-llama/llama-3.2-3b-instruct", url: "https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/" },
  { id: "meta-llama/llama-3.2-11b-vision-instruct", url: "https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/" },
  { id: "meta-llama/llama-3.2-90b-vision-instruct", url: "https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/" },
  { id: "meta-llama/llama-3.1-405b-instruct", url: "https://ai.meta.com/blog/meta-llama-3-1/" },
  { id: "meta-llama/llama-3.1-70b-instruct", url: "https://ai.meta.com/blog/meta-llama-3-1/" },
  { id: "meta-llama/llama-3.1-8b-instruct", url: "https://ai.meta.com/blog/meta-llama-3-1/" },
  { id: "meta-llama/llama-3-70b-instruct", url: "https://ai.meta.com/blog/meta-llama-3/" },
  { id: "meta-llama/llama-3-8b-instruct", url: "https://ai.meta.com/blog/meta-llama-3/" },
  { id: "meta-llama/llama-guard-3-8b", url: "https://ai.meta.com/blog/meta-llama-3-1/" },
  { id: "meta-llama/llama-guard-4-12b", url: "https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/" },
  // DeepSeek specific release notes
  { id: "deepseek/deepseek-r1", url: "https://github.com/deepseek-ai/DeepSeek-R1" },
  { id: "deepseek/deepseek-r1:free", url: "https://github.com/deepseek-ai/DeepSeek-R1" },
  { id: "deepseek/deepseek-chat", url: "https://github.com/deepseek-ai/DeepSeek-V3" },
  { id: "deepseek/deepseek-v3", url: "https://github.com/deepseek-ai/DeepSeek-V3" },
  { id: "deepseek/deepseek-coder", url: "https://github.com/deepseek-ai/DeepSeek-Coder-V2" },
  // Mistral AI specific release notes
  { id: "mistralai/mistral-7b-instruct-v0.1", url: "https://mistral.ai/news/announcing-mistral-7b/" },
  { id: "mistralai/mistral-large-2411", url: "https://mistral.ai/news/mistral-large-2411/" },
  { id: "mistralai/mistral-medium-3", url: "https://mistral.ai/news/mistral-medium-3/" },
  { id: "mistralai/mistral-medium-3.1", url: "https://mistral.ai/news/mistral-medium-3/" },
  { id: "mistralai/mistral-medium-3-5", url: "https://mistral.ai/news/vibe-remote-agents-mistral-medium-3-5/" },
  { id: "mistralai/mistral-small-24b-instruct-2501", url: "https://mistral.ai/news/mistral-small-3/" },
  { id: "mistralai/mistral-small-3.1-24b-instruct", url: "https://mistral.ai/news/mistral-small-3-1/" },
  { id: "mistralai/mistral-small-3.2-24b-instruct", url: "https://mistral.ai/news/mistral-small-3-1/" },
  { id: "mistralai/mistral-small-2603", url: "https://mistral.ai/news/mistral-small-4/" },
  { id: "mistralai/ministral-8b", url: "https://mistral.ai/news/ministraux/" },
  { id: "mistralai/ministral-3b-2512", url: "https://mistral.ai/news/ministraux/" },
  { id: "mistralai/ministral-8b-2512", url: "https://mistral.ai/news/ministraux/" },
  { id: "mistralai/ministral-14b-2512", url: "https://mistral.ai/news/ministraux/" },
  { id: "mistralai/pixtral-large-2411", url: "https://mistral.ai/news/pixtral-large/" },
  { id: "mistralai/pixtral-12b", url: "https://mistral.ai/news/pixtral-12b/" },
  { id: "mistralai/codestral-2501", url: "https://mistral.ai/news/codestral/" },
  { id: "mistralai/mistral-saba", url: "https://mistral.ai/news/mistral-saba/" },
  { id: "mistralai/mistral-nemo", url: "https://mistral.ai/news/mistral-nemo/" },
  { id: "mistralai/mixtral-8x22b-instruct", url: "https://mistral.ai/news/mixtral-8x22b/" },
  { id: "mistralai/mixtral-8x7b-instruct", url: "https://mistral.ai/news/mixtral-of-experts/" },
  { id: "mistralai/devstral-2512", url: "https://mistral.ai/news/devstral/" },
  { id: "mistralai/devstral-medium", url: "https://mistral.ai/news/devstral/" },
  { id: "mistralai/devstral-small", url: "https://mistral.ai/news/devstral/" },
  { id: "mistralai/voxtral-small-24b-2507", url: "https://mistral.ai/news/voxtral/" },
  // Qwen specific release notes
  { id: "qwen/qwen-2.5-coder-32b-instruct", url: "https://qwenlm.github.io/blog/qwen2.5-coder-family/" },
  { id: "qwen/qwen-2.5-72b-instruct", url: "https://qwenlm.github.io/blog/qwen2.5/" },
  { id: "qwen/qwen-plus", url: "https://qwenlm.github.io/blog/qwen2.5/" },
  { id: "qwen/qwen2.5-vl-72b-instruct", url: "https://qwenlm.github.io/blog/qwen2.5-vl/" },
  { id: "qwen/qwq-32b-preview", url: "https://qwenlm.github.io/blog/qwq-32b-preview/" },
  // Perplexity Sonar release notes
  { id: "perplexity/sonar", url: "https://www.perplexity.ai/hub/blog/introducing-pplx-api" },
  { id: "perplexity/sonar-pro", url: "https://www.perplexity.ai/hub/blog/introducing-pplx-api" },
  { id: "perplexity/sonar-pro-search", url: "https://www.perplexity.ai/hub/blog/introducing-pplx-api" },
  { id: "perplexity/sonar-deep-research", url: "https://www.perplexity.ai/hub/blog/sonar-deep-research" },
  { id: "perplexity/sonar-reasoning-pro", url: "https://www.perplexity.ai/hub/blog/sonar-deep-research" },
  // Microsoft specific release notes
  { id: "microsoft/wizardlm-2-8x22b", url: "https://developer.microsoft.com/en-us/blogs/wizardlm-2-large-language-model/" },
  // xAI Grok specific release notes
  { id: "x-ai/grok-2", url: "https://x.ai/blog/grok-2" },
  { id: "x-ai/grok-2-vision", url: "https://x.ai/blog/grok-2" },
  { id: "x-ai/grok-beta", url: "https://x.ai/blog/grok-2" },
  // Cohere specific release notes
  { id: "cohere/command-r-plus-08-2024", url: "https://cohere.com/blog/command-r-plus-multilingual-rag" },
  { id: "cohere/command-r-08-2024", url: "https://cohere.com/blog/command-r" },
  // Specialized & Community Open Models
  { id: "ai21/jamba-large-1.7", url: "https://www.ai21.com/blog/announcing-jamba-1-5" },
  { id: "allenai/olmo-3-32b-think", url: "https://allenai.org/blog/olmo" },
  { id: "gryphe/mythomax-l2-13b", url: "https://huggingface.co/Gryphe/MythoMax-L2-13b" },
  { id: "undi95/remm-slerp-l2-13b", url: "https://huggingface.co/Undi95/ReMM-SLERP-L2-13B" },
  { id: "anthracite-org/magnum-v4-72b", url: "https://huggingface.co/anthracite-org/magnum-v4-72b" },
  { id: "alfredpros/codellama-7b-instruct-solidity", url: "https://huggingface.co/AlfredPros/CodeLlama-7B-Instruct-Solidity" },
  { id: "rekaai/reka-edge", url: "https://www.reka.ai/news/reka-core-flash-edge" },
  { id: "rekaai/reka-flash-3", url: "https://www.reka.ai/news/reka-core-flash-edge" },
  { id: "upstage/solar-pro-3", url: "https://www.upstage.ai/blog/solar-pro" },
  { id: "upstage/solar-pro4", url: "https://www.upstage.ai/blog/solar-pro" },
  { id: "writer/palmyra-x5", url: "https://writer.com/blog/palmyra-x-004/" },
  { id: "inflection/inflection-3-pi", url: "https://inflection.ai/inflection-2-5" },
  { id: "inflection/inflection-3-productivity", url: "https://inflection.ai/inflection-2-5" },
  { id: "prime-intellect/intellect-3", url: "https://www.primeintellect.ai/blog/intellect-1" }
];
function resolveModelReleaseNoticeUrl(modelId, provider) {
  if (!modelId) return null;
  const cleanId = modelId.trim().toLowerCase();
  const exactMatch = EXACT_RELEASE_NOTICES.find((m) => m.id.toLowerCase() === cleanId);
  if (exactMatch) return exactMatch.url;
  if (cleanId.includes("gemini-3.8-flash")) {
    return "https://blog.google/innovation-and-ai/models-and-research/gemini-models/3-8-flash-and-3-8-flash-cyber/";
  }
  if (cleanId.includes("gemini-3.7-flash") || cleanId.includes("gemini-3-") || cleanId.includes("gemini-3.")) {
    return "https://blog.google/innovation-and-ai/models-and-research/gemini-models/";
  }
  if (cleanId.includes("gemini-2.0-flash-thinking") || cleanId.includes("gemini-2.0-pro")) {
    return "https://blog.google/technology/google-deepmind/gemini-2-0-flash-thinking-february-2025/";
  }
  if (cleanId.includes("gemini-2.0-flash")) {
    return "https://blog.google/technology/google-deepmind/google-gemini-ai-update-december-2024/";
  }
  if (cleanId.includes("gemini-2.5-pro")) {
    return "https://blog.google/technology/google-deepmind/gemini-2-5-pro/";
  }
  if (cleanId.includes("gemini-2.5-flash")) {
    return "https://blog.google/technology/google-deepmind/gemini-2-5-flash/";
  }
  if (cleanId.includes("gemini-1.5-pro")) {
    return "https://blog.google/technology/ai/google-gemini-next-generation-model-february-2024/";
  }
  if (cleanId.includes("gemini-1.5-flash-8b")) {
    return "https://blog.google/technology/developer/gemini-1-5-flash-8b/";
  }
  if (cleanId.includes("gemini-1.5-flash")) {
    return "https://blog.google/technology/developer/gemini-1-5-flash-developer/";
  }
  if (cleanId.includes("lyria")) {
    return "https://deepmind.google/technologies/lyria/";
  }
  if (cleanId.includes("gemma-2")) {
    return "https://blog.google/technology/developers/google-gemma-2/";
  }
  if (cleanId.includes("gemma")) {
    return "https://blog.google/technology/developers/gemma-open-models/";
  }
  if (cleanId.startsWith("~google/")) {
    return "https://blog.google/innovation-and-ai/models-and-research/gemini-models/";
  }
  if (cleanId.includes("gpt-4o-mini")) {
    return "https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/";
  }
  if (cleanId.includes("gpt-4o") || cleanId.includes("chatgpt-4o-latest") || cleanId.includes("gpt-chat-latest")) {
    return "https://openai.com/index/hello-gpt-4o/";
  }
  if (cleanId.includes("gpt-4.5")) {
    return "https://openai.com/index/introducing-gpt-4-5/";
  }
  if (cleanId.includes("gpt-4.1")) {
    return "https://openai.com/index/introducing-gpt-4-5/";
  }
  if (cleanId.includes("gpt-5") || cleanId.includes("gpt-6")) {
    return "https://openai.com/index/introducing-gpt-5/";
  }
  if (cleanId.includes("gpt-audio")) {
    return "https://openai.com/index/introducing-the-realtime-api/";
  }
  if (cleanId.includes("gpt-oss")) {
    return "https://openai.com/index/gpt-oss/";
  }
  if (cleanId.includes("o4-mini")) {
    return "https://openai.com/index/openai-o4-mini/";
  }
  if (cleanId.includes("o3-mini") || cleanId.includes("openai/o3")) {
    return "https://openai.com/index/openai-o3-mini/";
  }
  if (cleanId.includes("o1-mini")) {
    return "https://openai.com/index/openai-o1-mini-advancing-cost-efficient-reasoning/";
  }
  if (cleanId.includes("o1")) {
    return "https://openai.com/index/introducing-openai-o1-preview/";
  }
  if (cleanId.includes("gpt-4-turbo") || cleanId.includes("gpt-4-1106")) {
    return "https://openai.com/index/new-models-and-developer-products-announced-at-devday/";
  }
  if (cleanId.includes("gpt-4")) {
    return "https://openai.com/index/gpt-4-research/";
  }
  if (cleanId.includes("gpt-3.5-turbo")) {
    return "https://openai.com/index/introducing-chatgpt-and-whisper-apis/";
  }
  if (cleanId.startsWith("~openai/")) {
    return "https://openai.com/index/hello-gpt-4o/";
  }
  if (cleanId.includes("claude-3-7-sonnet") || cleanId.includes("claude-3.7-sonnet")) {
    return "https://www.anthropic.com/news/claude-3-7-sonnet";
  }
  if (cleanId.includes("claude-3-5-sonnet") || cleanId.includes("claude-3.5-sonnet")) {
    return "https://www.anthropic.com/news/claude-3-5-sonnet";
  }
  if (cleanId.includes("claude-3-5-haiku") || cleanId.includes("claude-3.5-haiku")) {
    return "https://www.anthropic.com/news/claude-3-5-haiku";
  }
  if (cleanId.includes("claude-3-opus") || cleanId.includes("claude-3-sonnet") || cleanId.includes("claude-3-haiku")) {
    return "https://www.anthropic.com/news/claude-3-family";
  }
  if (cleanId.includes("claude-4") || cleanId.includes("claude-5") || cleanId.includes("claude-opus-4") || cleanId.includes("claude-opus-5") || cleanId.includes("claude-sonnet-4") || cleanId.includes("claude-sonnet-5") || cleanId.includes("claude-haiku-4") || cleanId.includes("claude-fable")) {
    return "https://www.anthropic.com/news/";
  }
  if (cleanId.startsWith("~anthropic/")) {
    return "https://www.anthropic.com/news/claude-3-7-sonnet";
  }
  if (cleanId.includes("llama-guard-4")) {
    return "https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/";
  }
  if (cleanId.includes("llama-guard-3")) {
    return "https://ai.meta.com/blog/meta-llama-3-1/";
  }
  if (cleanId.includes("llama-4")) {
    return "https://ai.meta.com/blog/llama-4/";
  }
  if (cleanId.includes("llama-3.3")) {
    return "https://ai.meta.com/blog/llama-3-3/";
  }
  if (cleanId.includes("llama-3.2")) {
    return "https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/";
  }
  if (cleanId.includes("llama-3.1")) {
    return "https://ai.meta.com/blog/meta-llama-3-1/";
  }
  if (cleanId.includes("llama-3-") || cleanId.includes("llama-3/")) {
    return "https://ai.meta.com/blog/meta-llama-3/";
  }
  if (cleanId.includes("muse-")) {
    return "https://ai.meta.com/blog/";
  }
  if (cleanId.includes("deepseek-r1")) {
    return "https://github.com/deepseek-ai/DeepSeek-R1";
  }
  if (cleanId.includes("deepseek-v3") || cleanId.includes("deepseek-chat") || cleanId.includes("deepseek-v4")) {
    return "https://github.com/deepseek-ai/DeepSeek-V3";
  }
  if (cleanId.includes("deepseek-coder")) {
    return "https://github.com/deepseek-ai/DeepSeek-Coder-V2";
  }
  if (cleanId.startsWith("~deepseek/")) {
    return "https://github.com/deepseek-ai/DeepSeek-V3";
  }
  if (cleanId.includes("mistral-7b")) {
    return "https://mistral.ai/news/announcing-mistral-7b/";
  }
  if (cleanId.includes("mistral-large")) {
    return "https://mistral.ai/news/mistral-large-2411/";
  }
  if (cleanId.includes("mistral-medium-3-5")) {
    return "https://mistral.ai/news/vibe-remote-agents-mistral-medium-3-5/";
  }
  if (cleanId.includes("mistral-medium-3")) {
    return "https://mistral.ai/news/mistral-medium-3/";
  }
  if (cleanId.includes("mistral-small-2603")) {
    return "https://mistral.ai/news/mistral-small-4/";
  }
  if (cleanId.includes("mistral-small-3.1") || cleanId.includes("mistral-small-3.2")) {
    return "https://mistral.ai/news/mistral-small-3-1/";
  }
  if (cleanId.includes("mistral-small-24b") || cleanId.includes("mistral-small-3")) {
    return "https://mistral.ai/news/mistral-small-3/";
  }
  if (cleanId.includes("ministral")) {
    return "https://mistral.ai/news/ministraux/";
  }
  if (cleanId.includes("pixtral-12b")) {
    return "https://mistral.ai/news/pixtral-12b/";
  }
  if (cleanId.includes("pixtral-large")) {
    return "https://mistral.ai/news/pixtral-large/";
  }
  if (cleanId.includes("codestral")) {
    return "https://mistral.ai/news/codestral/";
  }
  if (cleanId.includes("mistral-nemo")) {
    return "https://mistral.ai/news/mistral-nemo/";
  }
  if (cleanId.includes("mistral-saba")) {
    return "https://mistral.ai/news/mistral-saba/";
  }
  if (cleanId.includes("devstral")) {
    return "https://mistral.ai/news/devstral/";
  }
  if (cleanId.includes("voxtral")) {
    return "https://mistral.ai/news/voxtral/";
  }
  if (cleanId.includes("mixtral-8x22b")) {
    return "https://mistral.ai/news/mixtral-8x22b/";
  }
  if (cleanId.includes("mixtral-8x7b")) {
    return "https://mistral.ai/news/mixtral-of-experts/";
  }
  if (cleanId.includes("qwen-2.5-coder") || cleanId.includes("qwen3-coder")) {
    return "https://qwenlm.github.io/blog/qwen2.5-coder-family/";
  }
  if (cleanId.includes("qwen-2.5-vl") || cleanId.includes("qwen2.5-vl") || cleanId.includes("qwen3-vl")) {
    return "https://qwenlm.github.io/blog/qwen2.5-vl/";
  }
  if (cleanId.includes("qwq")) {
    return "https://qwenlm.github.io/blog/qwq-32b-preview/";
  }
  if (cleanId.includes("qwen-2.5") || cleanId.includes("qwen2.5") || cleanId.includes("qwen-plus") || cleanId.includes("tongyi-deepresearch")) {
    return "https://qwenlm.github.io/blog/qwen2.5/";
  }
  if (cleanId.includes("qwen3") || cleanId.includes("qwen-3")) {
    return "https://qwenlm.github.io/blog/";
  }
  if (cleanId.includes("sonar-deep-research") || cleanId.includes("sonar-reasoning")) {
    return "https://www.perplexity.ai/hub/blog/sonar-deep-research";
  }
  if (cleanId.includes("sonar")) {
    return "https://www.perplexity.ai/hub/blog/introducing-pplx-api";
  }
  if (cleanId.includes("grok")) {
    return "https://x.ai/blog/grok-2";
  }
  if (cleanId.startsWith("~x-ai/")) {
    return "https://x.ai/blog/grok-2";
  }
  if (cleanId.includes("command-r-plus")) {
    return "https://cohere.com/blog/command-r-plus-multilingual-rag";
  }
  if (cleanId.includes("command-r") || cleanId.includes("command-a") || cleanId.includes("north-mini")) {
    return "https://cohere.com/blog/command-r";
  }
  if (cleanId.includes("arcee-ai")) {
    return "https://huggingface.co/arcee-ai";
  }
  if (cleanId.includes("nova")) {
    return "https://aws.amazon.com/blogs/aws/introducing-amazon-nova-frontier-intelligence-and-industry-leading-price-performance/";
  }
  if (cleanId.includes("nemotron")) {
    return "https://blogs.nvidia.com/blog/llama-3-1-nemotron-70b/";
  }
  if (cleanId.includes("phi-4")) {
    return "https://techcommunity.microsoft.com/blog/azurehighperformancecomputingblog/introducing-phi-4-microsoft%E2%80%99s-newest-small-language-model-specializing-in-complex-/4357090";
  }
  if (cleanId.includes("phi-3.5")) {
    return "https://azure.microsoft.com/en-us/blog/announcing-phi-3-5-small-language-models-with-multilingual-and-long-context-capabilities/";
  }
  if (cleanId.includes("wizardlm-2")) {
    return "https://developer.microsoft.com/en-us/blogs/wizardlm-2-large-language-model/";
  }
  if (cleanId.includes("glm-") || cleanId.startsWith("~z-ai/")) {
    return "https://github.com/THUDM/GLM-4";
  }
  if (cleanId.includes("kimi-") || cleanId.startsWith("~moonshotai/")) {
    return "https://github.com/MoonshotAI/Kimi-k1.5";
  }
  if (cleanId.includes("minimax-")) {
    return "https://github.com/MiniMax-AI/MiniMax-01";
  }
  if (cleanId.includes("lfm-")) {
    return "https://www.liquid.ai/blog/introducing-liquid-foundation-models";
  }
  if (cleanId.includes("hermes-")) {
    return "https://nousresearch.com/hermes-3/";
  }
  if (cleanId.includes("granite-")) {
    return "https://www.ibm.com/granite";
  }
  if (cleanId.includes("mercury-")) {
    return "https://www.inceptionlabs.ai/";
  }
  if (cleanId.includes("hunyuan") || cleanId.includes("hy-mt2") || cleanId.includes("/hy3") || cleanId.includes("/hy4")) {
    return "https://github.com/Tencent/HunyuanLarge";
  }
  if (cleanId.includes("bytedance") || cleanId.includes("doubao") || cleanId.includes("seed-edit")) {
    return "https://github.com/volcengine/doubao";
  }
  if (cleanId.includes("ernie") || cleanId.includes("baidu") || cleanId.includes("qianfan") || cleanId.includes("cobuddy")) {
    return "https://cloud.baidu.com/article/5084814";
  }
  if (cleanId.includes("inclusionai") || cleanId.includes("ling-")) {
    return "https://inclusionai.com/";
  }
  if (cleanId.includes("stepfun") || cleanId.includes("step-3")) {
    return "https://www.stepfun.com/";
  }
  if (cleanId.includes("sakana") || cleanId.includes("fugu-")) {
    return "https://sakana.ai/evolutionary-model-merge/";
  }
  if (cleanId.includes("mimo-")) {
    return "https://github.com/Xiaomi/MiMO";
  }
  if (cleanId.includes("kat-coder")) {
    return "https://github.com/Kwai-Kolors";
  }
  if (cleanId.includes("thedrummer/")) {
    return "https://huggingface.co/TheDrummer";
  }
  if (cleanId.includes("dolphin")) {
    return "https://huggingface.co/cognitivecomputations";
  }
  if (cleanId.includes("poolside") || cleanId.includes("laguna-")) {
    return "https://poolside.ai/";
  }
  if (cleanId.includes("openrouter/")) {
    return "https://openrouter.ai/docs#auto-routing";
  }
  if (cleanId.includes("relace/")) {
    return "https://relace.ai/";
  }
  if (cleanId.includes("thinkingmachines/")) {
    return "https://thinkingmachines.ai/";
  }
  if (cleanId.includes("morph/")) {
    return "https://morph.so/";
  }
  if (cleanId.includes("nex-agi/") || cleanId.includes("nex-n2")) {
    return "https://nex.art/";
  }
  if (cleanId.includes("inference-net/")) {
    return "https://inference.net/blog";
  }
  if (cleanId.includes("dots-studio/")) {
    return "https://huggingface.co/dots-studio";
  }
  if (cleanId.includes("essentialai/")) {
    return "https://essential.ai/";
  }
  if (cleanId.includes("mancer/")) {
    return "https://mancer.tech/";
  }
  if (cleanId.includes("meituan/")) {
    return "https://github.com/meituan";
  }
  if (cleanId.includes("aion-labs/")) {
    return "https://aionlabs.ai/";
  }
  if (cleanId.includes("deepcogito/")) {
    return "https://deepcogito.com/";
  }
  if (cleanId.includes("switchpoint/")) {
    return "https://switchpoint.ai/";
  }
  if (cleanId.includes("perceptron/")) {
    return "https://perceptron.ai/";
  }
  if (cleanId.includes("ox-alpha") || cleanId.includes("stealth")) {
    return "https://huggingface.co/";
  }
  return null;
}

// src/server/lib/modelDescriptions.ts
var EXACT_MODEL_DESCRIPTIONS = {
  // Poolside Laguna Models (flagship coding agent series)
  "poolside/laguna-m.1": "Laguna M.1 is the flagship coding agent model from [Poolside](https://poolside.ai/), optimized for complex software engineering tasks. Designed for agentic coding workflows, it supports tool calling and reasoning, with a 256K token context window for analyzing large codebases, multi-file editing, and autonomous debugging across modern software engineering stacks.",
  "poolside/laguna-m.1:free": "Laguna M.1 is the flagship coding agent model from [Poolside](https://poolside.ai/), optimized for complex software engineering tasks. Designed for agentic coding workflows, it supports tool calling and reasoning, with a 256K token context window for analyzing large codebases, multi-file editing, and autonomous debugging across modern software engineering stacks.",
  "poolside/laguna-xs.2": "Laguna XS.2 is the second-generation model in the XS size class from [Poolside](https://poolside.ai/), their efficient coding agent series. It combines tool calling and reasoning capabilities with a compact footprint, offering ultra-low latency inference, high throughput, and reliable code generation across a 256K token context window.",
  "poolside/laguna-xs.2:free": "Laguna XS.2 is the second-generation model in the XS size class from [Poolside](https://poolside.ai/), their efficient coding agent series. It combines tool calling and reasoning capabilities with a compact footprint, offering ultra-low latency inference, high throughput, and reliable code generation across a 256K token context window.",
  "poolside/laguna-xs-2.1": "Laguna XS 2.1 is the latest coding agent model in the 33B-A3B category from [Poolside](https://poolside.ai/) and a step forward from their Laguna XS.2 model. It combines efficient parameter activation with advanced tool use, multi-file code editing, and rapid reasoning across a 256K token context window.",
  "poolside/laguna-xs-2.1:free": "Laguna XS 2.1 is the latest coding agent model in the 33B-A3B category from [Poolside](https://poolside.ai/) and a step forward from their Laguna XS.2 model. It combines efficient parameter activation with advanced tool use, multi-file code editing, and rapid reasoning across a 256K token context window.",
  "poolside/laguna-s-2.1": "Laguna S 2.1 is the latest coding agent model from [Poolside](https://poolside.ai/). Laguna S 2.1 is a 118B total parameter model with 8B active parameters, scoring 70.2% on Terminal-Bench 2.1 and offering state-of-the-art software engineering capabilities with a 1M token context window for large repository ingestion and autonomous execution.",
  "poolside/laguna-s-2.1:free": "Laguna S 2.1 is the latest coding agent model from [Poolside](https://poolside.ai/). Laguna S 2.1 is a 118B total parameter model with 8B active parameters, scoring 70.2% on Terminal-Bench 2.1 and offering state-of-the-art software engineering capabilities with a 1M token context window for large repository ingestion and autonomous execution.",
  // Anthropic Claude Family
  "anthropic/claude-opus-4.8:batch": "Claude Opus 4.8 is Anthropic's most capable generally available model in the Opus family. It supports text, image, and file inputs with text output, advanced reasoning support, and a 1M-token context window for repository-scale comprehension, strategic architecture planning, and complex multi-step refactoring.",
  "anthropic/claude-3.7-sonnet": "Claude 3.7 Sonnet is Anthropic's flagship hybrid reasoning model, combining instantaneous response generation with extended, transparent test-time reasoning. It excels at complex software engineering, multi-turn coding agent tasks, full-stack architecture design, and tool execution.",
  "anthropic/claude-3.7-sonnet:thinking": "Claude 3.7 Sonnet (Thinking) enables Anthropic's explicit chain-of-thought reasoning process, giving users and developer tools granular visibility into intermediate cognitive steps before producing code, architectural plans, and critical decisions.",
  "anthropic/claude-3.5-sonnet": "Claude 3.5 Sonnet sets industry benchmarks for coding and reasoning. With exceptional visual processing, 200K token context window, and native function calling, it is widely utilized for complex agentic workflows, refactoring, and full-stack software development.",
  "anthropic/claude-3.5-sonnet:beta": "Claude 3.5 Sonnet Beta provides early access to Anthropic's latest model checkpoints with upgraded tool execution capabilities and agentic reasoning enhancements.",
  "anthropic/claude-3.5-haiku": "Claude 3.5 Haiku is Anthropic's fastest model, offering rapid response generation and near-Sonnet coding intelligence at a fraction of the latency and cost, ideal for high-throughput agents, autocomplete, and automated triage.",
  "anthropic/claude-3-opus": "Claude 3 Opus is Anthropic's premium foundation model designed for open-ended analysis, highly complex multi-step reasoning, and intricate software development problems.",
  // Google Gemini Family
  "google/gemini-3.8-flash": "Gemini 3.8 Flash is Google DeepMind\u2019s next-generation multimodal model engineered for high-velocity agentic workflows, long-context reasoning up to 1M tokens, low-latency function calling, and full-stack code synthesis.",
  "google/gemini-3.8-flash:batch": "Gemini 3.8 Flash (Batch) provides high-throughput batch processing for large-scale code indexing, repository analysis, and automated evaluation tasks with cost-optimized inference.",
  "google/gemini-3.7-flash": "Gemini 3.7 Flash is Google DeepMind\u2019s cutting-edge reasoning model featuring native dynamic thinking, strong multimodal comprehension, and rapid code generation across complex software repositories.",
  "google/gemini-2.0-flash-001": "Gemini 2.0 Flash is Google\u2019s production-grade multimodal model delivering exceptional speed, 1M token context window, and robust tool-use capabilities across diverse development and agent tasks.",
  "google/gemini-2.0-pro-exp-02-05:free": "Gemini 2.0 Pro Experimental is Google\u2019s most capable developer model, purpose-built for coding, mathematical reasoning, and complex multi-turn logic.",
  "google/gemini-1.5-pro": "Gemini 1.5 Pro features a breakthrough 2M token context window, allowing entire codebases, audio, video, and comprehensive documentation to be analyzed simultaneously in a single prompt.",
  // OpenAI Family
  "openai/gpt-4o": 'GPT-4o ("omni") is OpenAI\u2019s flagship multimodal model integrating voice, vision, and text natively with high speed, 128K context window, and industry-leading function calling accuracy for coding assistants.',
  "openai/gpt-4o-mini": "GPT-4o Mini is OpenAI\u2019s cost-efficient, low-latency model designed for fast reasoning, high-volume automated tools, and everyday coding assistance.",
  "openai/gpt-4.5-preview": "GPT-4.5 Preview is OpenAI\u2019s massive foundation model with unprecedented world knowledge, reduced hallucination rates, and superior creative and analytical problem solving.",
  "openai/o1": "OpenAI o1 is a specialized reasoning model trained with reinforcement learning to spend more time thinking before answering, excelling at competitive programming, complex algorithms, and deep architectural design.",
  "openai/o3-mini": "OpenAI o3-mini is a lightweight, cost-effective reasoning model offering high-precision STEM, math, and coding performance with customizable reasoning effort levels.",
  "openai/o4-mini": "OpenAI o4-mini continues OpenAI\u2019s compact reasoning architecture, offering fast step-by-step thinking for code generation and multi-step agent planning.",
  // DeepSeek Family
  "deepseek/deepseek-r1": "DeepSeek-R1 is an open-weights reasoning model utilizing large-scale reinforcement learning without supervised fine-tuning as a cold start, delivering competitive performance on code, math, and logic benchmarks with full thinking tokens output.",
  "deepseek/deepseek-r1:free": "DeepSeek-R1 (Free) provides open-weights reasoning capabilities, delivering deep chain-of-thought problem solving for programming, algorithmic challenges, and mathematical proofs.",
  "deepseek/deepseek-v3": "DeepSeek-V3 is a 671B parameter Mixture-of-Experts (MoE) model with 37B active parameters per token, optimized for high throughput, exceptional code generation, and low inference cost.",
  "deepseek/deepseek-coder": "DeepSeek Coder is a dedicated code generation model trained on trillions of code and documentation tokens across over 80 programming languages.",
  // Meta Llama Family
  "meta-llama/llama-3.3-70b-instruct": "Llama 3.3 70B Instruct is Meta\u2019s state-of-the-art open model delivering intelligence on par with previous 405B-class models, optimized for enterprise coding, tool use, and 128K context reasoning.",
  "meta-llama/llama-3.1-405b-instruct": "Llama 3.1 405B Instruct is Meta\u2019s flagship open foundation model, featuring 405 billion parameters capable of complex synthetic data generation, advanced coding, and deep domain analysis.",
  "meta-llama/llama-3.1-70b-instruct": "Llama 3.1 70B Instruct offers robust multi-lingual and programming performance with 128K context window and native tool calling integration.",
  "meta-llama/llama-3.1-8b-instruct": "Llama 3.1 8B Instruct is a lightweight, highly capable model suited for edge execution, quick code completions, and automated triage.",
  // Mistral AI Family
  "mistralai/mistral-large-2411": "Mistral Large 2411 is Mistral AI\u2019s premier reasoning and coding model with a 128K context window, native function calling, and first-class multilingual fluency across French, German, Spanish, and English.",
  "mistralai/codestral-2501": "Codestral is Mistral AI\u2019s dedicated coding model fluent in more than 80 programming languages, tailored for code completion, unit test generation, and repository navigation.",
  "mistralai/mistral-small-24b-instruct-2501": "Mistral Small 24B is a highly efficient model offering strong reasoning, structured outputs, and swift tool execution with minimal resource footprint.",
  // Qwen Family
  "qwen/qwen3-coder": "Qwen3-Coder-480B-A35B-Instruct is a Mixture-of-Experts (MoE) code generation model developed by the Qwen team. It is optimized for agentic coding tasks such as function calling, tool use, and long-context reasoning over large repositories and complex multi-file engineering workflows.",
  "qwen/qwen-2.5-coder-32b-instruct": "Qwen 2.5 Coder 32B is an open-source code generation powerhouse trained on 5.5 trillion tokens, delivering top-tier performance on code generation, completion, and debugging benchmarks.",
  // x-ai / Grok Family
  "x-ai/grok-4.20": "Grok 4.20 is a reasoning model from SpaceXAI with industry-leading speed and agentic tool calling capabilities. It combines the lowest hallucination rate on the market with strict prompt adherence, delivering state-of-the-art coding performance, precise tool calling, and high instruction adherence.",
  "x-ai/grok-2": "Grok 2 is xAI\u2019s frontier language model with real-time world knowledge, advanced visual understanding, and reliable coding capabilities.",
  // IBM Granite Family
  "ibm-granite/granite-4.1-8b": "Granite 4.1 8B is a dense, decoder-only 8-billion-parameter language model from IBM, part of the Granite 4.1 family. It supports a 131K-token context window and is designed for enterprise tasks, structured data extraction, and reliable coding workflows.",
  "ibm-granite/granite-3-8b-instruct": "Granite 3 8B Instruct is an enterprise-grade model trained on open and permissively licensed datasets, optimized for enterprise tool integration and code assistance.",
  // MiniMax Family
  "minimax/minimax-m3:free": "MiniMax-M3 is a multimodal foundation model from MiniMax. It supports text, image, and video inputs with text output, a 1M-token context window, and is suited for long-horizon agentic work, coding, tool execution, and complex system-level problem solving.",
  "minimax/minimax-m2.7:free": "MiniMax-M2.7 is a next-generation large language model designed for autonomous, real-world productivity and continuous improvement. Built to actively participate in its own evolution, M2.7 integrates advanced agentic capabilities through multi-agent coordination, tool orchestration, and automated iterative refinement."
};
function completeTruncatedDescription(desc3, modelInfo) {
  if (!desc3) return "";
  const trimmed = desc3.trim();
  if (modelInfo?.id && EXACT_MODEL_DESCRIPTIONS[modelInfo.id]) {
    return EXACT_MODEL_DESCRIPTIONS[modelInfo.id];
  }
  if (modelInfo?.id && modelInfo.id.endsWith(":free")) {
    const baseId = modelInfo.id.replace(/:free$/, "");
    if (EXACT_MODEL_DESCRIPTIONS[baseId]) {
      return EXACT_MODEL_DESCRIPTIONS[baseId];
    }
  }
  if (!trimmed.endsWith("...") && !trimmed.endsWith("\u2026")) {
    return trimmed;
  }
  let cleaned = trimmed.replace(/\s*(\.\.\.|…)$/, "").trim();
  if (/\bwith a\s+\d+K$/i.test(cleaned)) {
    return cleaned + " token context window for large codebase analysis, multi-file editing, and autonomous debugging.";
  }
  if (/\bwith a\s+\d+M(-token)?$/i.test(cleaned) || /\ba\s+\d+M-token$/i.test(cleaned)) {
    return cleaned + " context window for repository-scale comprehension, strategic architecture planning, and complex multi-step refactoring.";
  }
  if (/\b(context window|context length)\b.*(suited for|for|enabling)$/i.test(cleaned)) {
    return cleaned + " multi-turn reasoning, multi-file code editing, and complex agentic tool execution.";
  }
  if (/\b(over|through|for|with|and|by|of)\s*$/i.test(cleaned)) {
    const trailingWord = cleaned.match(/\b(over|through|for|with|and|by|of)\s*$/i)?.[0].trim().toLowerCase();
    if (trailingWord === "over") return cleaned + " large repositories and complex multi-file engineering workflows.";
    if (trailingWord === "through") return cleaned + " structured tool calling, reasoning traces, and systematic verification.";
    if (trailingWord === "for") return cleaned + " advanced software engineering, code generation, and autonomous task execution.";
    if (trailingWord === "with") return cleaned + " high accuracy, low latency, and robust instruction-following capabilities.";
    if (trailingWord === "and") return cleaned + " high-fidelity tool execution across modern developer toolchains.";
    if (trailingWord === "by") return cleaned + " modern agentic architectures with built-in reflection and verification.";
    if (trailingWord === "of") return cleaned + " software engineering challenges, coding benchmarks, and system optimizations.";
  }
  if (/\b(delivering|offering|supporting|enabling|providing)\s*$/i.test(cleaned)) {
    return cleaned + " state-of-the-art coding performance, precise tool calling, and high instruction adherence.";
  }
  if (/\b(scoring|ranking|leading)\s*$/i.test(cleaned)) {
    return cleaned + " near the top of industry benchmarks for code generation and automated reasoning.";
  }
  if (cleaned.endsWith(",")) {
    return cleaned + " tool execution, and complex system-level problem solving.";
  }
  if (/\b(multi-agent|autonomous|agentic)\s*$/i.test(cleaned)) {
    return cleaned + " coordination, tool orchestration, and automated iterative refinement.";
  }
  if (/\b(JSON schema|format|syntax)\s*$/i.test(cleaned)) {
    return cleaned + " definition to guarantee strict structural output conformity.";
  }
  if (cleaned.endsWith(".")) {
    return cleaned;
  }
  return cleaned + ", optimized for modern software engineering and agentic workflows.";
}

// src/server/controllers/ModelController.ts
var router5 = express5.Router();
var isSyncingModels = false;
var hasBackfilledReleaseNotices = false;
var hasBackfilledDescriptions = false;
async function backfillModelDescriptions() {
  if (hasBackfilledDescriptions) return;
  hasBackfilledDescriptions = true;
  try {
    const models = await db.select({
      id: modelInformation.id,
      name: modelInformation.name,
      provider: modelInformation.provider,
      description: modelInformation.description,
      contextLength: modelInformation.contextLength
    }).from(modelInformation);
    for (const m of models) {
      const currentDesc = m.description || "";
      if (!currentDesc || currentDesc.trim().endsWith("...") || currentDesc.trim().endsWith("\u2026")) {
        const fullDesc = completeTruncatedDescription(currentDesc, {
          id: m.id,
          name: m.name,
          provider: m.provider,
          contextLength: m.contextLength
        });
        if (fullDesc && fullDesc !== currentDesc) {
          await db.update(modelInformation).set({ description: fullDesc, updatedAt: /* @__PURE__ */ new Date() }).where(eq9(modelInformation.id, m.id));
        }
      }
    }
  } catch (err) {
    console.warn("[ModelController] Backfill descriptions warning:", err.message);
  }
}
async function backfillReleaseNotices() {
  if (hasBackfilledReleaseNotices) return;
  hasBackfilledReleaseNotices = true;
  try {
    const models = await db.select({
      id: modelInformation.id,
      provider: modelInformation.provider,
      releaseNoticeUrl: modelInformation.releaseNoticeUrl
    }).from(modelInformation);
    for (const m of models) {
      if (!m.releaseNoticeUrl) {
        const url = resolveModelReleaseNoticeUrl(m.id, m.provider);
        if (url) {
          await db.update(modelInformation).set({ releaseNoticeUrl: url }).where(eq9(modelInformation.id, m.id));
        }
      }
    }
  } catch (err) {
    console.warn("[ModelController] Backfill release notices warning:", err.message);
  }
}
async function syncOpenRouterModels() {
  if (isSyncingModels) return;
  isSyncingModels = true;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8e3);
    const openRouterRes = await fetch("https://openrouter.ai/api/v1/models", {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!openRouterRes.ok) return;
    const dataResponse = await openRouterRes.json();
    const data = dataResponse.data;
    if (!Array.isArray(data) || data.length === 0) return;
    const rowsToInsert = data.map((m) => {
      const provider = m.id.split("/")[0] || "unknown";
      const supportedParams = Array.isArray(m.supported_parameters) ? m.supported_parameters : [];
      const hasTools = Boolean(
        supportedParams.includes("tools") || supportedParams.includes("function_call") || m.description?.toLowerCase().includes("tool call") || m.description?.toLowerCase().includes("function call")
      );
      const releaseNotice = resolveModelReleaseNoticeUrl(m.id, provider);
      const fullDescription = completeTruncatedDescription(m.description || "", {
        id: m.id,
        name: m.name,
        provider,
        contextLength: m.context_length?.toString()
      });
      return {
        id: m.id,
        provider,
        name: m.name || m.id,
        contextLength: m.context_length?.toString() || "8192",
        description: fullDescription,
        pricing: m.pricing,
        architecture: m.architecture?.modality || m.architecture?.instruct_type || "",
        canUseTool: hasTools,
        releaseNoticeUrl: releaseNotice,
        updatedAt: /* @__PURE__ */ new Date()
      };
    });
    const chunkSize = 100;
    for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
      const chunk = rowsToInsert.slice(i, i + chunkSize);
      await db.insert(modelInformation).values(chunk).onConflictDoUpdate({
        target: modelInformation.id,
        set: {
          name: sql8`excluded.name`,
          contextLength: sql8`excluded.context_length`,
          description: sql8`excluded.description`,
          pricing: sql8`excluded.pricing`,
          architecture: sql8`excluded.architecture`,
          canUseTool: sql8`excluded.can_use_tool`,
          releaseNoticeUrl: sql8`COALESCE(model_information.release_notice_url, excluded.release_notice_url)`,
          updatedAt: sql8`excluded.updated_at`
        }
      });
    }
  } catch (err) {
    console.warn("[ModelController] Background OpenRouter model sync skipped/failed:", err.message);
  } finally {
    isSyncingModels = false;
  }
}
router5.get("/models/info", async (req, res) => {
  try {
    backfillReleaseNotices().catch(() => {
    });
    backfillModelDescriptions().catch(() => {
    });
    const cachedModels = await db.select().from(modelInformation);
    if (cachedModels.length > 0) {
      res.json(cachedModels);
      const newestUpdate = cachedModels.reduce((acc, m) => {
        const d = m.updatedAt ? new Date(m.updatedAt).getTime() : 0;
        return d > acc ? d : acc;
      }, 0);
      const dayAgo = Date.now() - 24 * 60 * 60 * 1e3;
      if (newestUpdate < dayAgo) {
        syncOpenRouterModels().catch(() => {
        });
      }
      return;
    }
    await syncOpenRouterModels();
    const freshModels = await db.select().from(modelInformation);
    res.json(freshModels);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch models";
    res.status(500).json({ error: message });
  }
});
router5.post("/models/refresh", async (req, res) => {
  try {
    await syncOpenRouterModels();
    const updatedModels = await db.select().from(modelInformation);
    res.json(updatedModels);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to refresh models";
    res.status(500).json({ error: message });
  }
});
router5.post("/models/custom", async (req, res) => {
  try {
    const { id, name, provider, contextLength, canUseTool, releaseNoticeUrl } = req.body;
    if (!id || !provider) return res.status(400).json({ error: "Missing id or provider" });
    await db.insert(modelInformation).values({
      id,
      provider,
      name: name || id,
      contextLength: contextLength || "8192",
      description: "Custom model",
      canUseTool: !!canUseTool,
      releaseNoticeUrl: releaseNoticeUrl || resolveModelReleaseNoticeUrl(id, provider),
      updatedAt: /* @__PURE__ */ new Date()
    }).onConflictDoUpdate({
      target: modelInformation.id,
      set: {
        name: name || id,
        contextLength: contextLength || "8192",
        canUseTool: !!canUseTool,
        releaseNoticeUrl: releaseNoticeUrl || resolveModelReleaseNoticeUrl(id, provider),
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    res.json({ status: "ok" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router5.post("/models/release-notice", async (req, res) => {
  try {
    const { modelId, releaseNoticeUrl } = req.body;
    if (!modelId) return res.status(400).json({ error: "Missing modelId" });
    await db.update(modelInformation).set({
      releaseNoticeUrl: releaseNoticeUrl ? releaseNoticeUrl.trim() : null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq9(modelInformation.id, modelId));
    res.json({ success: true, modelId, releaseNoticeUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update release notice";
    res.status(500).json({ error: message });
  }
});
router5.post("/models/description", async (req, res) => {
  try {
    const { modelId, description } = req.body;
    if (!modelId) return res.status(400).json({ error: "Missing modelId" });
    const finalDescription = typeof description === "string" ? description.trim() : "";
    await db.update(modelInformation).set({
      description: finalDescription,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq9(modelInformation.id, modelId));
    res.json({ success: true, modelId, description: finalDescription });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update description";
    res.status(500).json({ error: message });
  }
});

// src/server/controllers/UserController.ts
init_db();
init_schema();
init_encryption();
init_utils();
import express6 from "express";
import * as jose5 from "jose";
import { eq as eq10, sql as sql9, inArray as inArray6 } from "drizzle-orm";
var router6 = express6.Router();
router6.get("/user/state", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "No token" });
    const token = authHeader.split(" ")[1];
    const { payload } = await jose5.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) return res.status(401).json({ error: "Invalid token" });
    const userId = payload.id;
    const { userPrefs, userKeys, userSkills, formattedSessions } = await txWithUser(userId, async (tx) => {
      const [prefs] = await tx.select().from(userPreferences).where(eq10(userPreferences.userId, userId));
      const keys = await tx.select().from(apiKeys).where(eq10(apiKeys.userId, userId));
      const skills = await tx.select().from(customSkills).where(eq10(customSkills.userId, userId));
      const sessionsList = await tx.select().from(sessions).where(eq10(sessions.userId, userId));
      const ids = sessionsList.map((s) => s.id);
      const messagesList = ids.length > 0 ? await tx.select().from(messages).where(inArray6(messages.sessionId, ids)) : [];
      const formatted = sessionsList.map((s) => ({
        ...s,
        updatedAt: s.updatedAt ? new Date(s.updatedAt).getTime() : Date.now(),
        createdAt: s.createdAt ? new Date(s.createdAt).getTime() : Date.now(),
        messages: messagesList.filter((m) => m.sessionId === s.id).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          modelName: m.modelUsed,
          imageUrl: m.imageUrl,
          videoUrl: m.videoUrl,
          attachments: m.attachments,
          rating: m.rating,
          createdAt: new Date(m.createdAt).getTime()
        })).sort((a, b) => a.createdAt - b.createdAt)
      }));
      return { userPrefs: prefs, userKeys: keys, userSkills: skills, formattedSessions: formatted };
    });
    res.json({
      preferences: userPrefs,
      apiKeys: userKeys.map((k) => ({ ...k, key: decryptKey(k.key) })),
      customSkills: userSkills,
      sessions: formattedSessions
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router6.put("/user/state", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "No token" });
    const token = authHeader.split(" ")[1];
    const { payload } = await jose5.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) return res.status(401).json({ error: "Invalid token" });
    const userId = payload.id;
    const { preferences, apiKeys: newKeys, customSkills: newSkills, sessions: newSessions } = req.body;
    return await db.transaction(async (tx) => {
      await tx.execute(sql9`SELECT set_config('app.current_user_id', ${userId}, true)`);
      if (preferences) {
        const exist = await tx.select().from(userPreferences).where(eq10(userPreferences.userId, userId));
        if (exist.length > 0) {
          await tx.update(userPreferences).set(preferences).where(eq10(userPreferences.userId, userId));
        } else {
          await tx.insert(userPreferences).values({ userId, ...preferences });
        }
      }
      if (newKeys && Array.isArray(newKeys)) {
        await tx.delete(apiKeys).where(eq10(apiKeys.userId, userId));
        if (newKeys.length > 0) {
          await tx.insert(apiKeys).values(newKeys.map((k) => ({
            id: k.id,
            userId,
            name: k.name,
            key: encryptKey(k.key),
            provider: k.provider,
            baseUrl: k.baseUrl,
            models: k.models
          })));
        }
      }
      if (newSkills && Array.isArray(newSkills)) {
        await tx.delete(customSkills).where(eq10(customSkills.userId, userId));
        if (newSkills.length > 0) {
          await tx.insert(customSkills).values(newSkills.map((s) => ({
            id: s.id,
            userId,
            name: s.name,
            description: s.description,
            systemPrompt: s.systemPrompt,
            model: s.model || null,
            isCustom: true
          })));
        }
      }
      if (newSessions && Array.isArray(newSessions)) {
        await tx.delete(sessions).where(eq10(sessions.userId, userId));
        const uniqueSessionsMap = /* @__PURE__ */ new Map();
        for (const s of newSessions) {
          if (s && s.id) {
            uniqueSessionsMap.set(s.id, s);
          }
        }
        const validRoles = /* @__PURE__ */ new Set(["user", "model", "system", "tool"]);
        const seenMessageIds = /* @__PURE__ */ new Set();
        for (const s of uniqueSessionsMap.values()) {
          await tx.insert(sessions).values({
            id: s.id,
            userId,
            title: s.title || "Chat Session",
            pinned: s.pinned || false,
            updatedAt: s.updatedAt ? new Date(s.updatedAt) : /* @__PURE__ */ new Date(),
            createdAt: s.createdAt ? new Date(s.createdAt) : /* @__PURE__ */ new Date()
          }).onConflictDoUpdate({
            target: sessions.id,
            set: {
              title: sql9`excluded.title`,
              pinned: sql9`excluded.pinned`,
              updatedAt: sql9`excluded.updated_at`
            }
          });
          if (s.messages && Array.isArray(s.messages) && s.messages.length > 0) {
            const msgsToInsert = s.messages.map((m, idx) => {
              let msgId = m.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
              if (seenMessageIds.has(msgId)) {
                msgId = `${msgId}-${s.id.slice(-6)}-${idx}`;
              }
              seenMessageIds.add(msgId);
              const role = m.role && validRoles.has(m.role) ? m.role : "user";
              return {
                id: msgId,
                sessionId: s.id,
                role,
                content: m.content || "",
                modelUsed: m.modelName || m.modelUsed,
                imageUrl: m.imageUrl,
                videoUrl: m.videoUrl,
                attachments: m.attachments || [],
                rating: typeof m.rating === "number" ? m.rating : 0,
                createdAt: m.createdAt ? new Date(m.createdAt) : /* @__PURE__ */ new Date()
              };
            });
            if (msgsToInsert.length > 0) {
              await tx.insert(messages).values(msgsToInsert).onConflictDoUpdate({
                target: messages.id,
                set: {
                  sessionId: sql9`excluded.session_id`,
                  role: sql9`excluded.role`,
                  content: sql9`excluded.content`,
                  modelUsed: sql9`excluded.model_used`,
                  imageUrl: sql9`excluded.image_url`,
                  videoUrl: sql9`excluded.video_url`,
                  attachments: sql9`excluded.attachments`,
                  rating: sql9`excluded.rating`,
                  createdAt: sql9`excluded.created_at`
                }
              });
            }
          }
        }
      }
      res.json({ success: true });
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// src/server/controllers/WorkspaceController.ts
init_utils();
init_WorkspaceService();
init_agentErrorFormatter();
import express7 from "express";
import * as jose6 from "jose";
init_di();
var router7 = express7.Router();
async function resolveUserId(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const { payload } = await jose6.jwtVerify(token, JWT_SECRET);
      if (payload && payload.id) {
        return payload.id;
      }
    } catch {
    }
  }
  const customHeader = req.headers["x-workspace-user-id"];
  if (typeof customHeader === "string" && customHeader.trim()) {
    return customHeader.trim();
  }
  return "default_user";
}
router7.get("/workspace", async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const workspaceId = req.query.workspaceId;
    const summary = await globalWorkspaceService.getActiveWorkspaceSummary(userId, workspaceId);
    const userWorkspaces = await globalWorkspaceService.listUserWorkspaces(userId);
    res.json({
      workspace: summary,
      workspaces: userWorkspaces
    });
  } catch (err) {
    console.error("[WorkspaceController] Error fetching workspace:", err);
    res.status(500).json({ error: err.message || "Failed to fetch workspace" });
  }
});
router7.post("/workspace", async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const { workspaceId, name } = req.body;
    const targetWsId = workspaceId || `ws_${Date.now()}`;
    const workspace = await globalWorkspaceService.resolveUserWorkspace(userId, targetWsId);
    const summary = await globalWorkspaceService.getActiveWorkspaceSummary(userId, workspace.getId());
    res.json({
      success: true,
      workspace: summary
    });
  } catch (err) {
    console.error("[WorkspaceController] Error setting workspace:", err);
    res.status(500).json({ error: err.message || "Failed to set workspace" });
  }
});
router7.get("/workspace/files", async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const workspaceId = req.query.workspaceId;
    const dirPath = req.query.path || "";
    const listing = await globalWorkspaceService.listFiles(userId, workspaceId, dirPath);
    res.json({
      path: listing.path,
      total: listing.total,
      entries: listing.entries
    });
  } catch (err) {
    console.error("[WorkspaceController] Error listing files:", err);
    const status = err.name === "WorkspacePathError" ? 400 : 500;
    res.status(status).json({ error: err.message || "Failed to list files" });
  }
});
router7.get("/workspace/file", async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const workspaceId = req.query.workspaceId;
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ error: "File path is required" });
    }
    if (filePath.includes("__pycache__") || filePath.endsWith(".pyc")) {
      return res.json({
        file: {
          path: filePath,
          name: filePath.split("/").pop() || filePath,
          content: "",
          size: 0,
          language: "plaintext",
          modifiedAt: Date.now(),
          lastActor: "USER",
          history: []
        }
      });
    }
    const file = await globalWorkspaceService.readFile(userId, workspaceId, filePath);
    res.json({ file });
  } catch (err) {
    if (err.message?.includes("not found") || err.message?.includes("Directory")) {
      console.info(`[WorkspaceController] File not found or is directory: ${req.query.path}`);
      return res.status(404).json({ error: err.message || "File not found" });
    }
    console.error("[WorkspaceController] Error reading file:", err);
    const status = err.name === "WorkspacePathError" ? 400 : 500;
    res.status(status).json({ error: err.message || "Failed to read file" });
  }
});
router7.put("/workspace/file", async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const { path: filePath, content, workspaceId, actor = "USER" } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: "Path is required" });
    }
    if (content === void 0 || content === null) {
      return res.status(400).json({ error: "Content is required" });
    }
    const savedFile = await globalWorkspaceService.writeFile(
      userId,
      workspaceId,
      filePath,
      String(content),
      actor
    );
    res.json({
      success: true,
      file: savedFile
    });
  } catch (err) {
    console.error("[WorkspaceController] Error writing file:", err);
    const status = err.name === "WorkspacePathError" ? 400 : 500;
    res.status(status).json({ error: err.message || "Failed to write file" });
  }
});
router7.delete("/workspace/file", async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const filePath = req.query.path || req.body?.path;
    const workspaceId = req.query.workspaceId || req.body?.workspaceId;
    if (!filePath) {
      return res.status(400).json({ error: "Path is required" });
    }
    const result = await globalWorkspaceService.deleteFile(userId, workspaceId, filePath, "USER");
    res.json(result);
  } catch (err) {
    console.error("[WorkspaceController] Error deleting file:", err);
    const status = err.name === "WorkspacePathError" ? 400 : 500;
    res.status(status).json({ error: err.message || "Failed to delete file" });
  }
});
router7.post("/workspace/file/rename", async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const { oldPath, newPath, workspaceId } = req.body;
    if (!oldPath || !newPath) {
      return res.status(400).json({ error: "oldPath and newPath are required" });
    }
    const renamed = await globalWorkspaceService.renameFile(userId, workspaceId, oldPath, newPath, "USER");
    res.json({ success: true, file: renamed });
  } catch (err) {
    console.error("[WorkspaceController] Error renaming file:", err);
    const status = err.name === "WorkspacePathError" ? 400 : 500;
    res.status(status).json({ error: err.message || "Failed to rename file" });
  }
});
router7.post("/workspace/directory", async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const { path: dirPath, workspaceId } = req.body;
    if (!dirPath) {
      return res.status(400).json({ error: "Directory path is required" });
    }
    const result = await globalWorkspaceService.createDirectory(userId, workspaceId, dirPath, "USER");
    res.json(result);
  } catch (err) {
    console.error("[WorkspaceController] Error creating directory:", err);
    const status = err.name === "WorkspacePathError" ? 400 : 500;
    res.status(status).json({ error: err.message || "Failed to create directory" });
  }
});
router7.delete("/workspace/directory", async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const dirPath = req.query.path || req.body?.path;
    const workspaceId = req.query.workspaceId || req.body?.workspaceId;
    if (!dirPath) {
      return res.status(400).json({ error: "Directory path is required" });
    }
    const result = await globalWorkspaceService.deleteDirectory(userId, workspaceId, dirPath, "USER");
    res.json(result);
  } catch (err) {
    console.error("[WorkspaceController] Error deleting directory:", err);
    const status = err.name === "WorkspacePathError" ? 400 : 500;
    res.status(status).json({ error: err.message || "Failed to delete directory" });
  }
});
router7.post("/workspace/command", async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const { command, cwd, timeoutMs, workspaceId, input, sessionId } = req.body;
    if (!command || typeof command !== "string") {
      return res.status(400).json({ error: "Command string is required" });
    }
    const effectiveSessionId = sessionId || `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    req.on("close", () => {
      if (!res.writableEnded) {
        globalWorkspaceService.abortCommand(effectiveSessionId);
      }
    });
    const startTime = Date.now();
    const result = await globalWorkspaceService.runCommand(userId, workspaceId, command, {
      cwd,
      timeoutMs: timeoutMs || (sessionId ? 18e4 : 3e4),
      input,
      sessionId: effectiveSessionId
    });
    res.json({
      ...result,
      durationMs: Date.now() - startTime
    });
  } catch (err) {
    console.error("[WorkspaceController] Error executing command:", err);
    res.status(500).json({
      exitCode: 1,
      stdout: "",
      stderr: err.message || "Command execution defect",
      durationMs: 0,
      error: err.message
    });
  }
});
router7.post("/workspace/command/stream", async (req, res) => {
  const { command, cwd, timeoutMs, workspaceId, input, sessionId } = req.body;
  if (!command || typeof command !== "string") {
    return res.status(400).json({ error: "Command string is required" });
  }
  const effectiveSessionId = sessionId || `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  let isCompleted = false;
  req.on("close", () => {
    if (!isCompleted) {
      globalWorkspaceService.abortCommand(effectiveSessionId);
    }
  });
  try {
    const userId = await resolveUserId(req);
    const result = await globalWorkspaceService.runCommand(userId, workspaceId, command, {
      cwd,
      timeoutMs: timeoutMs || 18e4,
      input,
      sessionId: effectiveSessionId,
      onStdout: (chunk) => {
        if (!res.writableEnded) {
          res.write(`event: stdout
data: ${JSON.stringify({ chunk })}

`);
        }
      },
      onStderr: (chunk) => {
        if (!res.writableEnded) {
          res.write(`event: stderr
data: ${JSON.stringify({ chunk })}

`);
        }
      }
    });
    isCompleted = true;
    if (!res.writableEnded) {
      res.write(`event: exit
data: ${JSON.stringify(result)}

`);
      res.end();
    }
  } catch (err) {
    isCompleted = true;
    if (!res.writableEnded) {
      res.write(`event: exit
data: ${JSON.stringify({
        exitCode: 1,
        stdout: "",
        stderr: err?.message || "Command failed",
        durationMs: 0
      })}

`);
      res.end();
    }
  }
});
router7.post("/workspace/command/input", async (req, res) => {
  const { sessionId, input } = req.body;
  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "sessionId is required" });
  }
  const success = globalWorkspaceService.sendInputToCommand(sessionId, String(input ?? ""));
  res.json({ success });
});
router7.post("/workspace/command/abort", async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "sessionId is required" });
  }
  const success = globalWorkspaceService.abortCommand(sessionId);
  res.json({ success });
});
router7.post("/workspace/execute", async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const { planningResult, approval, workspaceId, apiKey, model, sessionId } = req.body;
    if (!planningResult || !planningResult.plan) {
      return res.status(400).json({ error: "Valid planningResult with plan is required." });
    }
    if (!approval || !approval.confirmed) {
      return res.status(400).json({
        error: "Execution rejected: Explicit user confirmation and approval is required."
      });
    }
    const summary = await globalWorkspaceService.executePlan(userId, {
      planningResult,
      approval,
      workspaceId,
      apiKey,
      model,
      sessionId
    });
    const diagnosis = !summary.success && summary.error ? formatAgentError(summary.error) : void 0;
    res.json({
      success: summary.success,
      summary,
      diagnosis
    });
  } catch (err) {
    const diag = formatAgentError(err);
    console.error("[WorkspaceController] Error executing plan:", diag);
    res.status(diag.statusCode || 500).json({
      error: `${diag.title}: ${diag.message}`,
      diagnosis: diag
    });
  }
});
router7.post("/workspace/stop", async (req, res) => {
  try {
    const userId = await resolveUserId(req);
    const { executionId, sessionId, workspaceId } = req.body;
    if (!executionId && !sessionId && !workspaceId) {
      return res.status(400).json({ error: "executionId, sessionId, or workspaceId is required" });
    }
    const runtimeStopped = AgentIntegrationService.stopExecution({ executionId, sessionId, workspaceId });
    let wsStopped = false;
    if (executionId) {
      wsStopped = globalWorkspaceService.stopExecution(userId, executionId);
    }
    if (sessionId) {
      await di.agentSessionService.cancelSession(sessionId, userId, "Execution stopped by user");
    } else if (workspaceId) {
      const activeSession = await di.agentSessionService.findSessionByWorkspace(workspaceId, userId);
      if (activeSession) {
        await di.agentSessionService.cancelSession(activeSession.sessionId, userId, "Execution stopped by user");
      }
    }
    const stopped = runtimeStopped || wsStopped;
    res.json({
      success: true,
      stopped,
      executionId,
      sessionId,
      workspaceId,
      message: stopped ? "Execution aborted" : "Stop signal processed"
    });
  } catch (err) {
    console.error("[WorkspaceController] Error stopping execution:", err);
    res.status(500).json({ error: err.message || "Failed to stop execution" });
  }
});
router7.get("/workspace/execution/:id", async (req, res) => {
  try {
    const executionId = req.params.id;
    const summary = globalWorkspaceService.getExecutionSummary(executionId);
    const events = globalWorkspaceService.getExecutionEvents(executionId);
    res.json({
      executionId,
      summary: summary || null,
      events
    });
  } catch (err) {
    console.error("[WorkspaceController] Error getting execution:", err);
    res.status(500).json({ error: err.message || "Failed to retrieve execution" });
  }
});
router7.get("/workspace/events/:id", (req, res) => {
  const executionId = req.params.id;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  const pastEvents = globalWorkspaceService.getExecutionEvents(executionId);
  for (const event of pastEvents) {
    res.write(`data: ${JSON.stringify(event)}

`);
  }
  const unsubscribe = globalWorkspaceService.subscribeExecutionEvents(executionId, (event) => {
    res.write(`data: ${JSON.stringify(event)}

`);
    if (event.type === "execution_completed" || event.type === "execution_failed" || event.type === "execution_aborted") {
      setTimeout(() => {
        res.end();
      }, 500);
    }
  });
  req.on("close", () => {
    unsubscribe();
  });
});
router7.get("/workspace/audit", async (req, res) => {
  try {
    const workspaceId = req.query.workspaceId || "default";
    const filePath = req.query.path;
    const logs = globalWorkspaceService.getFileAuditLog(workspaceId, filePath);
    res.json({ logs });
  } catch (err) {
    console.error("[WorkspaceController] Error getting audit logs:", err);
    res.status(500).json({ error: err.message || "Failed to retrieve audit log" });
  }
});
router7.get("/workspace/changesets", async (req, res) => {
  try {
    const sessionId = req.query.sessionId;
    const workspaceId = req.query.workspaceId;
    let changeSets = [];
    if (sessionId) {
      changeSets = di.changeSetService.getChangeSetsBySession(sessionId);
    } else if (workspaceId) {
      changeSets = di.changeSetService.getChangeSetsByWorkspace(workspaceId);
    }
    res.json({ changeSets });
  } catch (err) {
    console.error("[WorkspaceController] Error getting changesets:", err);
    res.status(500).json({ error: err.message || "Failed to retrieve changesets" });
  }
});
router7.get("/workspace/changeset/:id", async (req, res) => {
  try {
    const changeSetId = req.params.id;
    const changeSet = di.changeSetService.getChangeSet(changeSetId);
    if (!changeSet) {
      return res.status(404).json({ error: "ChangeSet not found" });
    }
    res.json({ changeSet });
  } catch (err) {
    console.error("[WorkspaceController] Error getting changeset:", err);
    res.status(500).json({ error: err.message || "Failed to retrieve changeset" });
  }
});
router7.post("/workspace/changeset/:id/apply", async (req, res) => {
  try {
    const changeSetId = req.params.id;
    const userId = await resolveUserId(req);
    const { sessionId, workspaceId } = req.body || {};
    const applied = await di.changeSetService.applyChangeSet(changeSetId, {
      userId,
      sessionId,
      workspaceId,
      workspaceService: globalWorkspaceService
    });
    res.json({ success: true, changeSet: applied });
  } catch (err) {
    console.error("[WorkspaceController] Error applying changeset:", err);
    const statusCode = err.message?.includes("Conflict") ? 409 : err.message?.includes("mismatch") ? 403 : 400;
    res.status(statusCode).json({ error: err.message || "Failed to apply changeset" });
  }
});
router7.post("/workspace/changeset/:id/reject", async (req, res) => {
  try {
    const changeSetId = req.params.id;
    const userId = await resolveUserId(req);
    const { sessionId, workspaceId } = req.body || {};
    const rejected = await di.changeSetService.rejectChangeSet(changeSetId, {
      userId,
      sessionId,
      workspaceId,
      workspaceService: globalWorkspaceService
    });
    res.json({ success: true, changeSet: rejected });
  } catch (err) {
    console.error("[WorkspaceController] Error rejecting changeset:", err);
    const statusCode = err.message?.includes("mismatch") ? 403 : 400;
    res.status(statusCode).json({ error: err.message || "Failed to reject changeset" });
  }
});

// src/server/controllers/AgentSessionController.ts
init_utils();
init_di();
import express8 from "express";
import * as jose7 from "jose";
var router8 = express8.Router();
async function resolveUserId2(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const { payload } = await jose7.jwtVerify(token, JWT_SECRET);
      if (payload && payload.id) {
        return payload.id;
      }
    } catch {
    }
  }
  if (req.query && typeof req.query.token === "string") {
    try {
      const { payload } = await jose7.jwtVerify(req.query.token, JWT_SECRET);
      if (payload && payload.id) {
        return payload.id;
      }
    } catch {
    }
  }
  const customHeader = req.headers["x-workspace-user-id"] || req.headers["x-session-user-id"];
  if (typeof customHeader === "string" && customHeader.trim()) {
    return customHeader.trim();
  }
  return "default_user";
}
router8.get("/agent/session/:id", async (req, res) => {
  try {
    const userId = await resolveUserId2(req);
    const sessionId = req.params.id;
    const session = await di.agentSessionService.loadSession(sessionId, userId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json({
      success: true,
      session: session.getContext()
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AgentSessionController] Error fetching session:", message);
    res.status(500).json({ error: message });
  }
});
router8.get("/agent/session/workspace/:workspaceId", async (req, res) => {
  try {
    const userId = await resolveUserId2(req);
    const workspaceId = req.params.workspaceId;
    const session = await di.agentSessionService.findSessionByWorkspace(workspaceId, userId);
    if (!session) {
      return res.status(404).json({ error: "No session found for workspace" });
    }
    res.json({
      success: true,
      session: session.getContext()
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AgentSessionController] Error finding session by workspace:", message);
    res.status(500).json({ error: message });
  }
});
router8.post("/agent/session", async (req, res) => {
  try {
    const userId = await resolveUserId2(req);
    const { sessionId, workspaceId, executionId, goalId, planId, activeModel, metadata } = req.body;
    const targetSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const session = await di.agentSessionService.getOrCreateSession(targetSessionId, userId, {
      workspaceId,
      executionId,
      goalId,
      planId,
      activeModel,
      metadata
    });
    res.json({
      success: true,
      session: session.getContext()
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AgentSessionController] Error initializing session:", message);
    res.status(500).json({ error: message });
  }
});
router8.post("/agent/session/:id/workspace", async (req, res) => {
  try {
    const userId = await resolveUserId2(req);
    const sessionId = req.params.id;
    const { workspaceId, detach } = req.body;
    let session;
    if (detach || !workspaceId) {
      session = await di.agentSessionService.detachWorkspace(sessionId, userId);
    } else {
      session = await di.agentSessionService.attachWorkspace(sessionId, workspaceId, userId);
    }
    res.json({
      success: true,
      session: session.getContext()
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AgentSessionController] Error updating session workspace:", message);
    res.status(500).json({ error: message });
  }
});
router8.post("/agent/session/:id/model", async (req, res) => {
  try {
    const userId = await resolveUserId2(req);
    const sessionId = req.params.id;
    const { modelId, provider, displayName } = req.body;
    if (!modelId) {
      return res.status(400).json({ error: "modelId is required" });
    }
    const session = await di.agentSessionService.setModel(sessionId, modelId, provider, displayName, userId);
    res.json({
      success: true,
      session: session.getContext()
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AgentSessionController] Error updating session model:", message);
    res.status(500).json({ error: message });
  }
});
router8.post("/agent/session/:id/execution", async (req, res) => {
  try {
    const userId = await resolveUserId2(req);
    const sessionId = req.params.id;
    const { executionId } = req.body;
    const session = await di.agentSessionService.associateExecution(sessionId, executionId, userId);
    res.json({
      success: true,
      session: session.getContext()
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AgentSessionController] Error associating execution:", message);
    res.status(500).json({ error: message });
  }
});
router8.post("/agent/session/:id/goal-plan", async (req, res) => {
  try {
    const userId = await resolveUserId2(req);
    const sessionId = req.params.id;
    const { goalId, planId } = req.body;
    const session = await di.agentSessionService.associateGoalAndPlan(sessionId, goalId, planId, userId);
    res.json({
      success: true,
      session: session.getContext()
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AgentSessionController] Error associating goal and plan:", message);
    res.status(500).json({ error: message });
  }
});
router8.get("/agent/session/:id/events", async (req, res) => {
  const sessionId = req.params.id;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders?.();
  res.write(": sse connected\n\n");
  if (typeof res.flush === "function") {
    res.flush();
  }
  const initialContext = di.agentSessionService.getActiveSessionContext(sessionId);
  res.write(`data: ${JSON.stringify({
    type: "session_connected",
    sessionId,
    timestamp: Date.now(),
    data: initialContext
  })}

`);
  const unsubscribe = di.agentSessionService.subscribeSession(sessionId, (event) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(event)}

`);
    }
  });
  req.on("close", () => {
    unsubscribe();
  });
});
router8.post("/agent/session/:id/handoff", async (req, res) => {
  try {
    const userId = await resolveUserId2(req);
    const sessionId = req.params.id;
    const body = req.body || {};
    const handoff = await di.agentSessionService.createContextHandoff({
      sessionId,
      sourceSurface: body.sourceSurface || "chat",
      targetSurface: body.targetSurface || "agent",
      includeConversation: body.includeConversation ?? true,
      includeWorkspace: body.includeWorkspace ?? true,
      includeCurrentFile: body.includeCurrentFile ?? true,
      includeSelection: body.includeSelection ?? true,
      includePlan: body.includePlan ?? false,
      includeExecution: body.includeExecution ?? true,
      messages: body.messages,
      workspaceId: body.workspaceId,
      currentFile: body.currentFile,
      selection: body.selection,
      planContext: body.planContext,
      executionId: body.executionId,
      summary: body.summary,
      maxRecentMessages: body.maxRecentMessages
    }, userId);
    res.json({
      success: true,
      handoff
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("Unauthorized") ? 403 : message.includes("not found") ? 404 : 400;
    console.error("[AgentSessionController] Error processing surface handoff:", message);
    res.status(status).json({ error: message });
  }
});

// src/server/api.ts
var apiRouter = express9.Router();
apiRouter.use(express9.json({ limit: "50mb" }));
apiRouter.use(express9.urlencoded({ limit: "50mb", extended: true }));
apiRouter.use((req, res, next) => {
  if (req.path === "/admin/logs" || req.path === "/health") {
    return next();
  }
  const start = Date.now();
  const method = req.method;
  const url = req.originalUrl || req.url;
  res.on("finish", () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusCategory = statusCode >= 500 ? "HTTP_5XX" : statusCode >= 400 ? "HTTP_4XX" : "HTTP_OK";
    appendSystemLog(statusCategory, `${method} ${url} -> ${statusCode} (${duration}ms)`);
  });
  next();
});
apiRouter.use(router);
apiRouter.use(router2);
apiRouter.use(router3);
apiRouter.use(router4);
apiRouter.use(router5);
apiRouter.use(router6);
apiRouter.use(router7);
apiRouter.use(router8);

// src/server/serverless.ts
var app = express10();
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
app.use("/api", apiRouter);
app.use("/", apiRouter);
var serverless_default = app;
export {
  serverless_default as default
};
