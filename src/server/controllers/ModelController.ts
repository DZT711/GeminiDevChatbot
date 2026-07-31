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

router.get('/models/info', async (req, res) => {
  try {
    const cachedModels = await db.select().from(modelInformation);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Only fetch if empty or outdated
    if (cachedModels.length === 0 || new Date(cachedModels[0].updatedAt) < dayAgo) {
      const openRouterRes = await fetch('https://openrouter.ai/api/v1/models');
      if (openRouterRes.ok) {
        const { data } = await openRouterRes.json();
        
        // Use a transaction or simply upsert
        for (const m of data) {
          const provider = m.id.split('/')[0] || 'unknown';
          const pricingInfo = m.pricing;
          
          await db.insert(modelInformation).values({
            id: m.id,
            provider: provider,
            name: m.name,
            contextLength: m.context_length?.toString(),
            description: m.description || '',
            pricing: pricingInfo,
            architecture: m.architecture?.modality || m.architecture?.instruct_type || '', // Simple fallback schema
            updatedAt: new Date()
          }).onConflictDoUpdate({
            target: modelInformation.id,
            set: {
              name: m.name,
              contextLength: m.context_length?.toString(),
              description: m.description || '',
              pricing: pricingInfo,
              architecture: m.architecture?.modality || m.architecture?.instruct_type || '',
              updatedAt: new Date()
            }
          });
        }
      }
      
      // refetch after update
      const updatedModels = await db.select().from(modelInformation);
      return res.json(updatedModels);
    }
    
    res.json(cachedModels);
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});


router.post('/models/refresh', async (req, res) => {
  try {
    const openRouterRes = await fetch('https://openrouter.ai/api/v1/models');
    if (openRouterRes.ok) {
      const dataResponse = await openRouterRes.json();
      const data = dataResponse.data;
      if (Array.isArray(data)) {
        for (const m of data) {
          const provider = m.id.split('/')[0] || 'unknown';
          await db.insert(modelInformation).values({
            id: m.id,
            provider: provider,
            name: m.name,
            contextLength: m.context_length?.toString(),
            description: m.description || '',
            pricing: m.pricing,
            architecture: m.architecture?.modality || m.architecture?.instruct_type || '',
            updatedAt: new Date()
          }).onConflictDoUpdate({
            target: modelInformation.id,
            set: {
              name: m.name,
              contextLength: m.context_length?.toString(),
              description: m.description || '',
              pricing: m.pricing,
              architecture: m.architecture?.modality || m.architecture?.instruct_type || '',
              updatedAt: new Date()
            }
          });
        }
      }
    }
    const updatedModels = await db.select().from(modelInformation);
    res.json(updatedModels);
  } catch(e: any) {
    res.status(500).json({ error: e.message });
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

