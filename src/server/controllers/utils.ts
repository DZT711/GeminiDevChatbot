import { db } from '../db/index.js';
import { apiKeys } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { decryptKey } from '../lib/encryption.js';
import { Type } from '@google/genai';
import { di } from '../di.js';
import { CLASSIFICATION_MODEL } from '../agent/agent.config.js';

export async function txWithUser<T>(userId: string, callback: (tx: any) => Promise<T>): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
    return await callback(tx);
  });
}

export async function resolveGoogleApiKey(userId: string, customKey?: string, provider?: string): Promise<string | undefined> {
  if (customKey) return customKey;

  // Query database first for configured user-specific keys
  const dbKey = await txWithUser(userId, async (tx) => {
    const { userPreferences, apiKeys } = await import('../db/schema.js');
    const [prefs] = await tx.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    if (prefs?.activeKeyId) {
      const [userKey] = await tx.select().from(apiKeys).where(eq(apiKeys.id, prefs.activeKeyId));
      if (userKey && userKey.key) {
        if (!provider || userKey.provider === provider || userKey.provider?.toLowerCase() === provider?.toLowerCase()) {
           return decryptKey(userKey.key);
        }
      }
    }
    
    const userKeys = await tx.select().from(apiKeys).where(eq(apiKeys.userId, userId));
    if (provider) {
       const matchingKey = userKeys.find(k => k.provider === provider || k.provider?.toLowerCase() === provider?.toLowerCase());
       if (matchingKey && matchingKey.key) {
         return decryptKey(matchingKey.key);
       }
    }
    const anyKey = userKeys[0];
    if (anyKey && anyKey.key) {
      return decryptKey(anyKey.key);
    }
    return undefined;
  });

  if (dbKey) {
    return dbKey;
  }

  // Fallback to process.env if no DB credentials exist
  return process.env.GEMINI_API_KEY;
}

export async function determineRoutingStrategy(userQuery: string, apiKey: string): Promise<'USE_RAG' | 'DIRECT_CHAT'> {
  try {
    const aiInstance = di.llmService.getClient(apiKey);
    const systemPrompt = `You are an elite AI Router designed to analyze developer queries and routing them accurately to either RAG or DIRECT chat paths.
Determine whether the user query is specific to this codebase/repository context, or if it is a general coding question/normal conversation.
- Classify as 'USE_RAG' if the query explicitly or implicitly mentions project source code, file paths, structural logic, database schemas, or verified solutions previously stored in the database. E.g., queries asking about "how is the login structured", "where are user accounts stored", "show me schema.ts implementation", "how to build/start the app", "db connections", "RAG function logic".
- Classify as 'DIRECT_CHAT' if it's a generic coding question (e.g., "how to write a for-loop in typescript", "explain closure in javascript"), general greeting, conversational filler, or a generic logical puzzle.
You MUST follow these rules strictly:
1. Return ONLY the string literal 'USE_RAG' or 'DIRECT_CHAT' in plain text.
2. Absolutely NO markdown block (such as \`\`\`), no punctuation, and no conversational padding.
3. Be highly decisive and favor 'USE_RAG' if there is any doubt or context clues pointing to the local repository files/structure.`;
    const response = await aiInstance.models.generateContent({
      model: CLASSIFICATION_MODEL,
      contents: userQuery,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.0,
      }
    });
    const result = response.text?.trim() || 'DIRECT_CHAT';
    console.log(`[AI Query Router] Query classified as: "${result}" for query: "${userQuery}"`);
    if (result.includes('USE_RAG')) {
      return 'USE_RAG';
    }
    return 'DIRECT_CHAT';
  } catch (e: any) {
    if (e?.message?.includes('503') || e?.message?.includes('UNAVAILABLE')) {
      console.info('[AI Query Router] Classifier hit 503 high demand, silent fallback to DIRECT_CHAT');
    } else {
      console.error('[AI Query Router] Failure executing classifier, fallback to DIRECT_CHAT', e.message || e);
    }
    return 'DIRECT_CHAT';
  }
}

import express from 'express';
export const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-dev-123456');

export const getBaseUrl = (req: express.Request) => {
  const host = req.get('host');
  const protocol = req.protocol;
  return `${protocol}://${host}`;
};
