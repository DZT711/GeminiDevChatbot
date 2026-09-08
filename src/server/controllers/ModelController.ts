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

let isSyncingModels = false;

async function syncOpenRouterModels(): Promise<void> {
  if (isSyncingModels) return;
  isSyncingModels = true;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const openRouterRes = await fetch('https://openrouter.ai/api/v1/models', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!openRouterRes.ok) return;

    const dataResponse = await openRouterRes.json();
    const data = dataResponse.data;
    if (!Array.isArray(data) || data.length === 0) return;

    const rowsToInsert = data.map((m: {
      id: string;
      name?: string;
      context_length?: number;
      description?: string;
      pricing?: unknown;
      architecture?: { modality?: string; instruct_type?: string };
    }) => {
      const provider = m.id.split('/')[0] || 'unknown';
      return {
        id: m.id,
        provider,
        name: m.name || m.id,
        contextLength: m.context_length?.toString() || '8192',
        description: m.description || '',
        pricing: m.pricing,
        architecture: m.architecture?.modality || m.architecture?.instruct_type || '',
        updatedAt: new Date(),
      };
    });

    const chunkSize = 100;
    for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
      const chunk = rowsToInsert.slice(i, i + chunkSize);
      await db.insert(modelInformation).values(chunk).onConflictDoUpdate({
        target: modelInformation.id,
        set: {
          name: sql`excluded.name`,
          contextLength: sql`excluded.context_length`,
          description: sql`excluded.description`,
          pricing: sql`excluded.pricing`,
          architecture: sql`excluded.architecture`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
    }
  } catch (err) {
    console.warn('[ModelController] Background OpenRouter model sync skipped/failed:', (err as Error).message);
  } finally {
    isSyncingModels = false;
  }
}

router.get('/models/info', async (req, res) => {
  try {
    const cachedModels = await db.select().from(modelInformation);

    if (cachedModels.length > 0) {
      // Immediately return cached models to avoid blocking UI rendering
      res.json(cachedModels);

      // Check if outdated (> 24h) and trigger non-blocking background refresh
      const newestUpdate = cachedModels.reduce((acc, m) => {
        const d = m.updatedAt ? new Date(m.updatedAt).getTime() : 0;
        return d > acc ? d : acc;
      }, 0);
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (newestUpdate < dayAgo) {
        syncOpenRouterModels().catch(() => {});
      }
      return;
    }

    // If cache is completely empty, sync models and then return
    await syncOpenRouterModels();
    const freshModels = await db.select().from(modelInformation);
    res.json(freshModels);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to fetch models';
    res.status(500).json({ error: message });
  }
});

router.post('/models/refresh', async (req, res) => {
  try {
    await syncOpenRouterModels();
    const updatedModels = await db.select().from(modelInformation);
    res.json(updatedModels);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to refresh models';
    res.status(500).json({ error: message });
  }
});


router.post('/models/custom', async (req, res) => {
  try {
    const { id, name, provider, contextLength, canUseTool } = req.body;
    if (!id || !provider) return res.status(400).json({ error: 'Missing id or provider' });
    
    await db.insert(modelInformation).values({
      id,
      provider,
      name: name || id,
      contextLength: contextLength || "8192",
      description: "Custom model",
      canUseTool: !!canUseTool,
      updatedAt: new Date()
    }).onConflictDoUpdate({
      target: modelInformation.id,
      set: {
        name: name || id,
        contextLength: contextLength || "8192",
        canUseTool: !!canUseTool,
        updatedAt: new Date()
      }
    });
    
    res.json({ status: 'ok' });
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

