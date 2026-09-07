import { db } from '../db/index.js';
import { apiKeys } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { decryptKey } from '../lib/encryption.js';
import { Type } from '@google/genai';
import { di } from '../di.js';
import { CLASSIFICATION_MODEL, DEFAULT_CHAT_MODEL } from '../agent/agent.config.js';

export async function txWithUser<T>(userId: string, callback: (tx: any) => Promise<T>): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
    return await callback(tx);
  });
}

export async function resolveGoogleApiKey(userId: string, customKey?: string, provider?: string): Promise<string | undefined> {
  if (customKey) return customKey;

  // Query database first for configured user-specific keys
  try {
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
  } catch {
    // If user tx failed or RLS blocked, continue to system key resolution
  }

  // Query database for any active/admin configured key (fallback for guest/default users)
  try {
    const { apiKeys: apiKeysTable, users: usersTable, userPreferences: prefsTable } = await import('../db/schema.js');
    // First try ADMIN users' active keys
    const adminUsers = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, 'ADMIN'));
    for (const admin of adminUsers) {
      const [adminPref] = await db.select().from(prefsTable).where(eq(prefsTable.userId, admin.id));
      if (adminPref?.activeKeyId) {
        const [k] = await db.select().from(apiKeysTable).where(eq(apiKeysTable.id, adminPref.activeKeyId));
        if (k?.key && (!provider || k.provider === provider || k.provider?.toLowerCase() === provider?.toLowerCase())) {
          const dec = decryptKey(k.key);
          if (dec && dec.trim() !== '') return dec;
        }
      }
      const adminKeys = await db.select().from(apiKeysTable).where(eq(apiKeysTable.userId, admin.id));
      const match = adminKeys.find(k => !provider || k.provider === provider || k.provider?.toLowerCase() === provider?.toLowerCase());
      if (match?.key) {
        const dec = decryptKey(match.key);
        if (dec && dec.trim() !== '') return dec;
      }
    }

    // Next try any key in apiKeys matching the provider
    const allKeys = await db.select().from(apiKeysTable);
    const candidate = allKeys.find(k => !provider || k.provider === provider || k.provider?.toLowerCase() === provider?.toLowerCase());
    if (candidate?.key) {
      const dec = decryptKey(candidate.key);
      if (dec && dec.trim() !== '') return dec;
    }
  } catch {
    // Continue to env fallback
  }

  // Fallback to process.env if no DB credentials exist
  return process.env.GEMINI_API_KEY;
}

export async function resolveFallbackGoogleApiKey(failedKey?: string): Promise<string | undefined> {
  try {
    const { apiKeys: apiKeysTable } = await import('../db/schema.js');
    const allKeys = await db.select().from(apiKeysTable);
    for (const k of allKeys) {
      if ((!k.provider || k.provider === 'google' || k.provider?.toLowerCase() === 'google') && k.key) {
        const dec = decryptKey(k.key);
        if (dec && dec !== failedKey && dec.length > 10 && !dec.startsWith('dummy') && !dec.startsWith('your_')) {
          return dec;
        }
      }
    }
  } catch {
    // Ignore
  }
  return undefined;
}

export async function determineRoutingStrategy(userQuery: string, apiKey: string, provider?: string, customBaseUrl?: string, userId?: string): Promise<'USE_RAG' | 'DIRECT_CHAT'> {
  try {
    let routeApiKey = apiKey;
    let routeProvider = provider;
    let routeBaseUrl = customBaseUrl;
    
    if (provider && provider !== 'google') {
       const googleKey = userId ? await resolveGoogleApiKey(userId, undefined, 'google') : undefined;
       if (googleKey) {
          routeApiKey = googleKey;
          routeProvider = 'google';
          routeBaseUrl = undefined;
       } else {
          return 'DIRECT_CHAT';
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
    let responseText: string | undefined;
    const modelsToTry: string[] = Array.from(new Set([CLASSIFICATION_MODEL, DEFAULT_CHAT_MODEL]));
    for (let i = 0; i < modelsToTry.length; i++) {
      const modelCandidate = modelsToTry[i];
      try {
        const response = await aiInstance.models.generateContent({
          model: modelCandidate,
          contents: userQuery,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.0,
          }
        });
        if (response?.text) {
          responseText = response.text;
          break;
        }
      } catch (classifyErr: unknown) {
        if (i < modelsToTry.length - 1) {
          console.warn(`[AI Query Router] Classifier model '${modelCandidate}' hit limits, trying fallback '${modelsToTry[i + 1]}'`);
          continue;
        }
        throw classifyErr;
      }
    }

    const result = responseText?.trim() || 'DIRECT_CHAT';
    console.log(`[AI Query Router] Query classified as: "${result}" for query: "${userQuery}"`);
    if (result.includes('USE_RAG')) {
      return 'USE_RAG';
    }
    return 'DIRECT_CHAT';
  } catch (e: unknown) {
    const errorMsg = (e as Error)?.message || String(e);
    const isRateLimitOrQuota = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.toLowerCase().includes('quota');
    const is503 = errorMsg.includes('503') || errorMsg.includes('UNAVAILABLE');
    if (is503 || isRateLimitOrQuota) {
      console.info(`[AI Query Router] Classifier temporarily rate-limited or congested, clean fallback to DIRECT_CHAT`);
    } else {
      console.warn('[AI Query Router] Classifier fallback to DIRECT_CHAT:', errorMsg.slice(0, 120));
    }
    return 'DIRECT_CHAT';
  }
}

import express from 'express';
export const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-dev-123456');

export const getBaseUrl = (req: express.Request): string => {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = typeof forwardedProto === 'string'
    ? forwardedProto.split(',')[0].trim()
    : (req.secure ? 'https' : req.protocol);
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
};
