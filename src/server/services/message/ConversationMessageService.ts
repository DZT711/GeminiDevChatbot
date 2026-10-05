import { eq, and, sql, asc, inArray } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { messages, sessions } from '../../db/schema.js';

export type InteractionType = 'CHAT' | 'AGENT' | 'UNKNOWN';
export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL' | 'UNKNOWN';
export type MessageKind =
  | 'USER_INPUT'
  | 'CHAT_RESPONSE'
  | 'AGENT_RESPONSE'
  | 'TOOL_CALL'
  | 'TOOL_RESULT'
  | 'PLAN_UPDATE'
  | 'EXECUTION_UPDATE'
  | 'ERROR'
  | 'UNKNOWN';

export type ResponseCode =
  | 'USER_INPUT'
  | 'CHAT_FINAL'
  | 'AGENT_FINAL'
  | 'AGENT_TOOL_RESULT'
  | 'AGENT_PLAN_UPDATE'
  | 'AGENT_ERROR'
  | 'CHAT_ERROR'
  | 'UNKNOWN';

export type Surface = 'CHAT' | 'AGENT' | 'TERMINAL' | 'PLANNING' | 'UNKNOWN';

export interface CanonicalMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'model' | 'system' | 'tool';
  content: string;
  modelUsed?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  attachments?: unknown;
  rating?: number | null;
  interactionType: InteractionType;
  messageRole: MessageRole;
  messageKind: MessageKind;
  responseCode: ResponseCode;
  surface: Surface;
  executionId?: string | null;
  planId?: string | null;
  toolCallId?: string | null;
  parentMessageId?: string | null;
  createdAt: Date;
}

export interface CanonicalMessageEnvelope {
  messageId: string;
  sessionId: string;
  interactionType: InteractionType;
  role: MessageRole;
  kind: MessageKind;
  responseCode: ResponseCode;
  surface: Surface;
  content: string;
  modelUsed?: string | null;
  executionId?: string | null;
  planId?: string | null;
  toolCallId?: string | null;
  parentMessageId?: string | null;
  createdAt: string;
}

export function toCanonicalEnvelope(msg: CanonicalMessage): CanonicalMessageEnvelope {
  return {
    messageId: msg.id,
    sessionId: msg.sessionId,
    interactionType: msg.interactionType,
    role: msg.messageRole,
    kind: msg.messageKind,
    responseCode: msg.responseCode,
    surface: msg.surface,
    content: msg.content,
    modelUsed: msg.modelUsed,
    executionId: msg.executionId,
    planId: msg.planId,
    toolCallId: msg.toolCallId,
    parentMessageId: msg.parentMessageId,
    createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : new Date(msg.createdAt).toISOString()
  };
}

export interface CanonicalMessageInput {
  id?: string;
  sessionId: string;
  userId?: string;
  role?: 'user' | 'model' | 'system' | 'tool';
  content: string;
  modelUsed?: string;
  imageUrl?: string;
  videoUrl?: string;
  attachments?: unknown;
  rating?: number;
  interactionType: InteractionType;
  messageRole: MessageRole;
  messageKind: MessageKind;
  responseCode?: ResponseCode;
  surface?: Surface;
  executionId?: string;
  planId?: string;
  toolCallId?: string;
  parentMessageId?: string;
  createdAt?: Date;
}

export interface GetSessionMessagesOptions {
  interactionType?: InteractionType;
  surface?: Surface;
  limit?: number;
}

/**
 * Canonical Conversation Message Service
 * Single authoritative persistence and retrieval service for all conversational
 * interactions across both normal Chat and Workspace Agent representations.
 */
export class ConversationMessageService {
  /**
   * Persists a canonical message to the database idempotently.
   */
  public async saveMessage(input: CanonicalMessageInput): Promise<CanonicalMessage> {
    if (!input.sessionId) {
      throw new Error('sessionId is required to persist a conversation message');
    }

    const messageId = input.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const role: 'user' | 'model' | 'system' | 'tool' = input.role || (input.messageRole === 'ASSISTANT' ? 'model' : input.messageRole === 'USER' ? 'user' : 'user');
    const interactionType: InteractionType = input.interactionType || 'UNKNOWN';
    const messageRole: MessageRole = input.messageRole || (role === 'model' ? 'ASSISTANT' : 'USER');
    const messageKind: MessageKind = input.messageKind || (messageRole === 'USER' ? 'USER_INPUT' : interactionType === 'AGENT' ? 'AGENT_RESPONSE' : 'CHAT_RESPONSE');
    let responseCode: ResponseCode = input.responseCode || (messageRole === 'USER' ? 'USER_INPUT' : interactionType === 'AGENT' ? 'AGENT_FINAL' : 'CHAT_FINAL');

    // Enforce compatibility with DB check constraint chk_interaction_response_compatibility
    if (interactionType === 'CHAT' && (responseCode === 'AGENT_FINAL' || responseCode === 'AGENT_TOOL_RESULT' || responseCode === 'AGENT_PLAN_UPDATE' || responseCode === 'AGENT_ERROR')) {
      responseCode = responseCode === 'AGENT_ERROR' ? 'CHAT_ERROR' : 'CHAT_FINAL';
    } else if (interactionType === 'AGENT' && (responseCode === 'CHAT_FINAL' || responseCode === 'CHAT_ERROR')) {
      responseCode = responseCode === 'CHAT_ERROR' ? 'AGENT_ERROR' : 'AGENT_FINAL';
    }

    const surface: Surface = input.surface || (interactionType === 'AGENT' ? 'AGENT' : 'CHAT');
    const createdAt = input.createdAt || new Date();

    // Ensure session exists in the database
    if (input.userId) {
      try {
        const existingSession = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.id, input.sessionId)).limit(1);
        if (existingSession.length === 0) {
          const safeUserId = (typeof input.userId === 'string' && input.userId.length === 36) ? input.userId : '00000000-0000-0000-0000-000000000000';
          await db.insert(sessions).values({
            id: input.sessionId,
            userId: safeUserId as any,
            title: 'Agent Session',
            status: 'IDLE',
            createdAt: new Date(),
            updatedAt: new Date()
          }).onConflictDoNothing();
        }
      } catch (sessionCheckErr) {
        console.warn(`[ConversationMessageService] Session check notice for ${input.sessionId}:`, sessionCheckErr);
      }
    }

    const rowValues = {
      id: messageId,
      sessionId: input.sessionId,
      role,
      content: input.content || '',
      modelUsed: input.modelUsed || null,
      imageUrl: input.imageUrl || null,
      videoUrl: input.videoUrl || null,
      attachments: input.attachments || [],
      rating: typeof input.rating === 'number' ? input.rating : null,
      interactionType,
      messageRole,
      messageKind,
      responseCode,
      surface,
      executionId: input.executionId || null,
      planId: input.planId || null,
      toolCallId: input.toolCallId || null,
      parentMessageId: input.parentMessageId || null,
      createdAt
    };

    // Idempotent upsert by message ID
    await db.insert(messages).values(rowValues).onConflictDoUpdate({
      target: messages.id,
      set: {
        content: sql`excluded.content`,
        modelUsed: sql`COALESCE(excluded.model_used, messages.model_used)`,
        imageUrl: sql`COALESCE(excluded.image_url, messages.image_url)`,
        videoUrl: sql`COALESCE(excluded.video_url, messages.video_url)`,
        attachments: sql`COALESCE(excluded.attachments, messages.attachments)`,
        rating: sql`COALESCE(excluded.rating, messages.rating)`,
        interactionType: sql`COALESCE(excluded.interaction_type, messages.interaction_type)`,
        messageRole: sql`COALESCE(excluded.message_role, messages.message_role)`,
        messageKind: sql`COALESCE(excluded.message_kind, messages.message_kind)`,
        responseCode: sql`COALESCE(excluded.response_code, messages.response_code)`,
        surface: sql`COALESCE(excluded.surface, messages.surface)`,
        executionId: sql`COALESCE(excluded.execution_id, messages.execution_id)`,
        planId: sql`COALESCE(excluded.plan_id, messages.plan_id)`,
        toolCallId: sql`COALESCE(excluded.tool_call_id, messages.tool_call_id)`,
        parentMessageId: sql`COALESCE(excluded.parent_message_id, messages.parent_message_id)`
      }
    });

    return {
      id: messageId,
      sessionId: input.sessionId,
      role,
      content: input.content || '',
      modelUsed: input.modelUsed || null,
      imageUrl: input.imageUrl || null,
      videoUrl: input.videoUrl || null,
      attachments: input.attachments || [],
      rating: input.rating || null,
      interactionType,
      messageRole,
      messageKind,
      responseCode,
      surface,
      executionId: input.executionId || null,
      planId: input.planId || null,
      toolCallId: input.toolCallId || null,
      parentMessageId: input.parentMessageId || null,
      createdAt
    };
  }

  /**
   * Retrieves messages for a session in chronological order, with optional user scoping.
   */
  public async getSessionMessages(
    sessionId: string,
    userId?: string,
    options?: GetSessionMessagesOptions
  ): Promise<CanonicalMessage[]> {
    if (!sessionId) return [];

    // Optional user isolation check
    if (userId && userId !== 'default_user') {
      const sessionRow = await db.select({ userId: sessions.userId }).from(sessions).where(eq(sessions.id, sessionId)).limit(1);
      if (sessionRow.length > 0 && sessionRow[0].userId !== userId && sessionRow[0].userId !== '00000000-0000-0000-0000-000000000000') {
        console.warn(`[ConversationMessageService] Unauthorized session access attempt for ${sessionId} by user ${userId}`);
        return [];
      }
    }

    const conditions = [eq(messages.sessionId, sessionId)];
    if (options?.interactionType) {
      conditions.push(eq(messages.interactionType, options.interactionType));
    }
    if (options?.surface) {
      conditions.push(eq(messages.surface, options.surface));
    }

    let query = db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(asc(messages.createdAt));

    if (options?.limit && options.limit > 0) {
      query = query.limit(options.limit) as any;
    }

    const rows = await query;

    return rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      role: r.role,
      content: r.content,
      modelUsed: r.modelUsed,
      imageUrl: r.imageUrl,
      videoUrl: r.videoUrl,
      attachments: r.attachments,
      rating: r.rating,
      interactionType: (r.interactionType || 'UNKNOWN') as InteractionType,
      messageRole: (r.messageRole || (r.role === 'model' ? 'ASSISTANT' : 'USER')) as MessageRole,
      messageKind: (r.messageKind || 'UNKNOWN') as MessageKind,
      responseCode: (r.responseCode || 'UNKNOWN') as ResponseCode,
      surface: (r.surface || 'UNKNOWN') as Surface,
      executionId: r.executionId,
      planId: r.planId,
      toolCallId: r.toolCallId,
      parentMessageId: r.parentMessageId,
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date()
    }));
  }

  /**
   * Deletes all messages belonging to a session.
   */
  public async deleteSessionMessages(sessionId: string, userId?: string): Promise<void> {
    if (!sessionId) return;
    if (userId && userId !== 'default_user') {
      const sessionRow = await db.select({ userId: sessions.userId }).from(sessions).where(eq(sessions.id, sessionId)).limit(1);
      if (sessionRow.length > 0 && sessionRow[0].userId !== userId) {
        return;
      }
    }
    await db.delete(messages).where(eq(messages.sessionId, sessionId));
  }
}

export const globalConversationMessageService = new ConversationMessageService();
