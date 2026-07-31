import express from 'express';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import crypto from 'crypto';
import { eq, sql, inArray } from 'drizzle-orm';
import path from 'path';
import { db } from '../db/index.js';
import { users, accounts, userPreferences, apiKeys, customSkills, sessions, messages, modelInformation } from '../db/schema.js';
import { encryptKey, decryptKey } from '../lib/encryption.js';
import { CLASSIFICATION_MODEL, EMBEDDING_MODEL } from '../agent/agent.config.js';
import { di } from "../di.js";
import { JWT_SECRET, getBaseUrl, txWithUser, resolveGoogleApiKey, determineRoutingStrategy } from './utils.js';

export const router = express.Router();

router.get('/user/state', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) return res.status(401).json({ error: 'Invalid token' });
    const userId = payload.id as string;

    const { userPrefs, userKeys, userSkills, formattedSessions } = await txWithUser(userId, async (tx) => {
      const [prefs] = await tx.select().from(userPreferences).where(eq(userPreferences.userId, userId));
      const keys = await tx.select().from(apiKeys).where(eq(apiKeys.userId, userId));
      const skills = await tx.select().from(customSkills).where(eq(customSkills.userId, userId));
      
      // Fetch sessions and messages
      const sessionsList = await tx.select().from(sessions).where(eq(sessions.userId, userId));
      const ids = sessionsList.map(s => s.id);
      const messagesList = ids.length > 0 
        ? await tx.select().from(messages).where(inArray(messages.sessionId, ids))
        : [];
      
      const formatted = sessionsList.map(s => ({
        ...s,
        updatedAt: s.updatedAt ? new Date(s.updatedAt).getTime() : Date.now(),
        createdAt: s.createdAt ? new Date(s.createdAt).getTime() : Date.now(),
        messages: messagesList.filter(m => m.sessionId === s.id).map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          modelName: m.modelUsed,
          imageUrl: m.imageUrl,
          videoUrl: m.videoUrl,
          attachments: m.attachments,
          rating: m.rating,
          createdAt: new Date(m.createdAt).getTime(),
        })).sort((a, b) => a.createdAt - b.createdAt)
      }));

      return { userPrefs: prefs, userKeys: keys, userSkills: skills, formattedSessions: formatted };
    });

    res.json({
      preferences: userPrefs,
      apiKeys: userKeys.map(k => ({ ...k, key: decryptKey(k.key) })),
      customSkills: userSkills,
      sessions: formattedSessions,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


router.put('/user/state', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) return res.status(401).json({ error: 'Invalid token' });
    const userId = payload.id as string;

    const { preferences, apiKeys: newKeys, customSkills: newSkills, sessions: newSessions } = req.body;

    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
      // Preferences
      if (preferences) {
        const exist = await tx.select().from(userPreferences).where(eq(userPreferences.userId, userId));
        if (exist.length > 0) {
          await tx.update(userPreferences).set(preferences).where(eq(userPreferences.userId, userId));
        } else {
          await tx.insert(userPreferences).values({ userId, ...preferences });
        }
      }

      // API Keys
      if (newKeys && Array.isArray(newKeys)) {
        await tx.delete(apiKeys).where(eq(apiKeys.userId, userId));
        if (newKeys.length > 0) {
          await tx.insert(apiKeys).values(newKeys.map((k: any) => ({
            id: k.id,
            userId,
            name: k.name,
            key: encryptKey(k.key),
            provider: k.provider,
            baseUrl: k.baseUrl,
            models: k.models,
          })));
        }
      }

      // Custom Skills
      if (newSkills && Array.isArray(newSkills)) {
        await tx.delete(customSkills).where(eq(customSkills.userId, userId));
        if (newSkills.length > 0) {
          await tx.insert(customSkills).values(newSkills.map((s: any) => ({
            id: s.id,
            userId,
            name: s.name,
            description: s.description,
            systemPrompt: s.systemPrompt,
            model: s.model || null,
            isCustom: true,
          })));
        }
      }

      // Sessions
      if (newSessions && Array.isArray(newSessions)) {
        // Simple strategy: delete all sessions for user, re-insert
        await tx.delete(sessions).where(eq(sessions.userId, userId));
        for (const s of newSessions) {
          await tx.insert(sessions).values({
            id: s.id,
            userId,
            title: s.title || 'Chat Session',
            pinned: s.pinned || false,
            updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
            createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
          });
          if (s.messages && Array.isArray(s.messages) && s.messages.length > 0) {
            const msgsToInsert = s.messages.map((m: any) => ({
              id: m.id || `msg-${Date.now()}-${Math.random()}`,
              sessionId: s.id,
              role: m.role || 'user',
              content: m.content || '',
              modelUsed: m.modelName || m.modelUsed,
              imageUrl: m.imageUrl,
              videoUrl: m.videoUrl,
              attachments: m.attachments || [],
              rating: typeof m.rating === 'number' ? m.rating : 0,
              createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
            }));
            await tx.insert(messages).values(msgsToInsert);
          }
        }
      }

      res.json({ success: true });
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


