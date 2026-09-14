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
import { resolveModelReleaseNoticeUrl } from '../lib/modelReleaseNotices.js';
import { completeTruncatedDescription } from '../lib/modelDescriptions.js';

export const router = express.Router();

let isSyncingModels = false;
let hasBackfilledReleaseNotices = false;
let hasBackfilledDescriptions = false;

async function backfillModelDescriptions(): Promise<void> {
  if (hasBackfilledDescriptions) return;
  hasBackfilledDescriptions = true;
  try {
    const models = await db.select({
      id: modelInformation.id,
      name: modelInformation.name,
      provider: modelInformation.provider,
      description: modelInformation.description,
      contextLength: modelInformation.contextLength,
    }).from(modelInformation);

    for (const m of models) {
      const currentDesc = m.description || '';
      if (!currentDesc || currentDesc.trim().endsWith('...') || currentDesc.trim().endsWith('…')) {
        const fullDesc = completeTruncatedDescription(currentDesc, {
          id: m.id,
          name: m.name,
          provider: m.provider,
          contextLength: m.contextLength,
        });

        if (fullDesc && fullDesc !== currentDesc) {
          await db.update(modelInformation)
            .set({ description: fullDesc, updatedAt: new Date() })
            .where(eq(modelInformation.id, m.id));
        }
      }
    }
  } catch (err) {
    console.warn('[ModelController] Backfill descriptions warning:', (err as Error).message);
  }
}

async function backfillReleaseNotices(): Promise<void> {
  if (hasBackfilledReleaseNotices) return;
  hasBackfilledReleaseNotices = true;
  try {
    const models = await db.select({
      id: modelInformation.id,
      provider: modelInformation.provider,
      releaseNoticeUrl: modelInformation.releaseNoticeUrl,
    }).from(modelInformation);

    for (const m of models) {
      if (!m.releaseNoticeUrl) {
        const url = resolveModelReleaseNoticeUrl(m.id, m.provider);
        if (url) {
          await db.update(modelInformation)
            .set({ releaseNoticeUrl: url })
            .where(eq(modelInformation.id, m.id));
        }
      }
    }
  } catch (err) {
    console.warn('[ModelController] Backfill release notices warning:', (err as Error).message);
  }
}

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
      supported_parameters?: string[];
    }) => {
      const provider = m.id.split('/')[0] || 'unknown';
      const supportedParams = Array.isArray(m.supported_parameters) ? m.supported_parameters : [];
      const hasTools = Boolean(
        supportedParams.includes('tools') ||
        supportedParams.includes('function_call') ||
        m.description?.toLowerCase().includes('tool call') ||
        m.description?.toLowerCase().includes('function call')
      );
      const releaseNotice = resolveModelReleaseNoticeUrl(m.id, provider);
      const fullDescription = completeTruncatedDescription(m.description || '', {
        id: m.id,
        name: m.name,
        provider,
        contextLength: m.context_length?.toString(),
      });
      return {
        id: m.id,
        provider,
        name: m.name || m.id,
        contextLength: m.context_length?.toString() || '8192',
        description: fullDescription,
        pricing: m.pricing,
        architecture: m.architecture?.modality || m.architecture?.instruct_type || '',
        canUseTool: hasTools,
        releaseNoticeUrl: releaseNotice,
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
          canUseTool: sql`excluded.can_use_tool`,
          releaseNoticeUrl: sql`COALESCE(model_information.release_notice_url, excluded.release_notice_url)`,
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
    backfillReleaseNotices().catch(() => {});
    backfillModelDescriptions().catch(() => {});
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
    const { id, name, provider, contextLength, canUseTool, releaseNoticeUrl } = req.body;
    if (!id || !provider) return res.status(400).json({ error: 'Missing id or provider' });
    
    await db.insert(modelInformation).values({
      id,
      provider,
      name: name || id,
      contextLength: contextLength || "8192",
      description: "Custom model",
      canUseTool: !!canUseTool,
      releaseNoticeUrl: releaseNoticeUrl || resolveModelReleaseNoticeUrl(id, provider),
      updatedAt: new Date()
    }).onConflictDoUpdate({
      target: modelInformation.id,
      set: {
        name: name || id,
        contextLength: contextLength || "8192",
        canUseTool: !!canUseTool,
        releaseNoticeUrl: releaseNoticeUrl || resolveModelReleaseNoticeUrl(id, provider),
        updatedAt: new Date()
      }
    });
    
    res.json({ status: 'ok' });
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/models/release-notice', async (req, res) => {
  try {
    const { modelId, releaseNoticeUrl } = req.body;
    if (!modelId) return res.status(400).json({ error: 'Missing modelId' });

    await db.update(modelInformation).set({
      releaseNoticeUrl: releaseNoticeUrl ? releaseNoticeUrl.trim() : null,
      updatedAt: new Date(),
    }).where(eq(modelInformation.id, modelId));

    res.json({ success: true, modelId, releaseNoticeUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to update release notice';
    res.status(500).json({ error: message });
  }
});

router.post('/models/description', async (req, res) => {
  try {
    const { modelId, description } = req.body;
    if (!modelId) return res.status(400).json({ error: 'Missing modelId' });

    const finalDescription = typeof description === 'string' ? description.trim() : '';

    await db.update(modelInformation).set({
      description: finalDescription,
      updatedAt: new Date(),
    }).where(eq(modelInformation.id, modelId));

    res.json({ success: true, modelId, description: finalDescription });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to update description';
    res.status(500).json({ error: message });
  }
});

