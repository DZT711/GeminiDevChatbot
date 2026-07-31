import { systemLogEmitter, logHistory } from '../logInterceptor.js';
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

router.get('/admin/logs', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.query.token as string;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    
    let tokenStr = authHeader;
    if (authHeader.startsWith('Bearer ')) {
      tokenStr = authHeader.split(' ')[1];
    }
    
    const { payload } = await jose.jwtVerify(tokenStr, JWT_SECRET);
    if (!payload || !payload.id) return res.status(401).json({ error: 'Invalid token' });
    
    // Check if user is admin
    const { users } = await import('../db/schema.js');
    const [userRecord] = await db.select().from(users).where(eq(users.id, payload.id as string));
    if (!userRecord || userRecord.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden. Admin only.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write(`data: ${JSON.stringify({ type: 'history', logs: logHistory })}\n\n`);

    const logListener = (logMsg: string) => {
      res.write(`data: ${JSON.stringify({ type: 'log', log: logMsg })}\n\n`);
    };

    systemLogEmitter.on('log', logListener);

    req.on('close', () => {
      systemLogEmitter.off('log', logListener);
    });
  } catch (err) {
    console.error('SSE /admin/logs init error', err);
    if (!res.headersSent) res.status(500).end();
  }
});







router.get('/health', (req, res) => {
  res.json({ status: 'ok', using: 'supabase-postgres' });
});


router.post('/proxy', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    
    // Quick verification
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET).catch(() => ({ payload: null }));
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { url, method = 'GET', headers = {}, body, stream } = req.body;
    if (!url) {
       return res.status(400).json({ error: 'Proxy URL is required' });
    }

    const fetchHeaders: any = { ...headers, 'ngrok-skip-browser-warning': 'true' };
    console.log(`[PROXY REQUEST] ${method} ${url}`, { hasBody: !!body, stream });
    const response = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: body ? JSON.stringify(body) : undefined
    });

    if (stream && response.ok) {
       res.status(response.status);
       res.setHeader('Content-Type', 'text/event-stream');
       res.setHeader('Cache-Control', 'no-cache');
       res.setHeader('Connection', 'keep-alive');
       if (response.body) {
         try {
           const reader = response.body.getReader();
           while (true) {
             const { done, value } = await reader.read();
             if (done) break;
             res.write(value);
           }
         } catch(e) {
           console.error("Proxy streaming error:", e);
         }
       }
       return res.end();
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      data = text;
    }

    if (!response.ok) {
      console.error(`[PROXY ERROR] ${method} ${url} returned ${response.status}`, data);
      return res.status(response.status).json({ error: `Proxy returned ${response.status}`, data });
    }
    console.log(`[PROXY SUCCESS] ${method} ${url} -> ${response.status}`);
    return res.json(data);
  } catch (e: any) {
    console.error(`[PROXY CATCH ERROR]`, e);
    res.status(500).json({ error: e.message });
  }
});

