import express from 'express';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import crypto from 'crypto';
import { eq, sql } from 'drizzle-orm';
import path from 'path';

import { db } from './db/index.js';
import { users, accounts, userPreferences, apiKeys, customSkills, sessions, messages, modelInformation } from './db/schema.js';
import { encryptKey, decryptKey } from './lib/encryption.js';

export const apiRouter = express.Router();

apiRouter.use(express.json());

apiRouter.get('/models/info', async (req, res) => {
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

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-dev-123456');


apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', using: 'supabase-postgres' });
});

apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) return res.status(400).json({ error: 'Email in use' });

    const hash = await bcrypt.hash(password, 10);
    const isSpecialAdmin = email === 'nguyensihuynsh711@gmail.com';
    const [user] = await db.insert(users).values({
      email,
      passwordHash: hash,
      role: isSpecialAdmin ? 'ADMIN' : 'USER'
    }).returning();

    const token = await new jose.SignJWT({ id: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    res.json({ user: { id: user.id, email: user.email }, token });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.email === 'nguyensihuynsh711@gmail.com' && user.role !== 'ADMIN') {
      await db.update(users).set({ role: 'ADMIN' }).where(eq(users.id, user.id));
      user.role = 'ADMIN';
    }

    const token = await new jose.SignJWT({ id: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    res.json({ user: { id: user.id, email: user.email }, token });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.put('/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { name, avatarUrl, customInstructions } = req.body;
    const [user] = await db.update(users)
      .set({ name, avatarUrl, customInstructions })
      .where(eq(users.id, payload.id as string))
      .returning();

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, payload.id as string),
      with: { accounts: true }
    });
    const githubToken = currentUser?.accounts?.find(a => a.provider === 'github')?.accessToken;

    res.json({ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, customInstructions: user.customInstructions, githubToken });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

async function txWithUser<T>(userId: string, callback: (tx: any) => Promise<T>): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
    return await callback(tx);
  });
}

apiRouter.post('/knowledge/proposals', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { actionType, targetNodeId, proposedContent, reason } = req.body;
    const { knowledgeProposals } = await import('./db/schema.js');

    const [proposal] = await txWithUser(payload.id as string, async (tx) => {
      return await tx.insert(knowledgeProposals).values({
        userId: payload.id as string,
        actionType,
        targetNodeId: targetNodeId || null,
        proposedContent,
        reason,
        status: 'PENDING'
      }).returning();
    });

    res.json(proposal);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

async function resolveGoogleApiKey(userId: string, customKey?: string): Promise<string | undefined> {
  let apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    apiKey = await txWithUser(userId, async (tx) => {
      const [prefs] = await tx.select().from(userPreferences).where(eq(userPreferences.userId, userId));
      if (prefs?.activeKeyId) {
        const [userKey] = await tx.select().from(apiKeys).where(eq(apiKeys.id, prefs.activeKeyId));
        if (userKey && (userKey.provider === 'google' || userKey.provider === 'GOOGLE') && userKey.key) {
          return decryptKey(userKey.key);
        }
      }
      
      const userKeys = await tx.select().from(apiKeys).where(eq(apiKeys.userId, userId));
      const googleKey = userKeys.find(k => k.provider === 'google' || k.provider === 'GOOGLE');
      if (googleKey && googleKey.key) {
        return decryptKey(googleKey.key);
      }
      return undefined;
    });
  }
  return apiKey;
}

apiRouter.post('/knowledge/search', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { query, limit = 5, customKey } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required for search' });
    }

    const apiKey = await resolveGoogleApiKey(payload.id as string, customKey);

    if (!apiKey) {
      return res.status(400).json({ error: 'API key not valid. Please configure a valid API key or set one up in active settings.' });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // Generate embedding for the query using the updated gemini-embedding-2-preview model
    const embedResponse = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: query
    });
    
    const embeddingVector = embedResponse.embeddings?.[0]?.values;
    if (!embeddingVector) {
      throw new Error('Failed to generate embeddings for query');
    }

    const { knowledgeNodes } = await import('./db/schema.js');
    const { cosineDistance } = await import('drizzle-orm');

    // Perform vector search
    const results = await txWithUser(payload.id as string, async (tx) => {
      return await tx.select({
        id: knowledgeNodes.id,
        content: knowledgeNodes.content,
        nodeType: knowledgeNodes.nodeType,
        metadata: knowledgeNodes.metadata,
        similarity: cosineDistance(knowledgeNodes.embedding, embeddingVector)
      })
      .from(knowledgeNodes)
      .orderBy(cosineDistance(knowledgeNodes.embedding, embeddingVector))
      .limit(limit);
    });

    res.json({ results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /messages/query - Query historic messages table for system intelligence
apiRouter.post('/messages/query', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { query, limit = 50, sessionId } = req.body;
    const userId = payload.id as string;

    const results = await txWithUser(userId, async (tx) => {
      // Retrieve user object to inspect role
      const userObj = await tx.query.users.findFirst({
        where: eq(users.id, userId)
      });
      if (!userObj) {
        throw new Error('User not found');
      }

      const { and, ilike, desc } = await import('drizzle-orm');

      const conditions = [];

      // Filter by session if provided
      if (sessionId) {
        conditions.push(eq(messages.sessionId, sessionId));
      }

      // Role filtration: Only Admin can inspect other users' logs.
      // Standard users can only query their own session messages.
      if (userObj.role !== 'ADMIN') {
        const userSessions = await tx.select().from(sessions).where(eq(sessions.userId, userId));
        const userSessionIds = userSessions.map(s => s.id);
        if (userSessionIds.length === 0) {
          return [];
        }
        conditions.push(sql`${messages.sessionId} IN ${userSessionIds}`);
      }

      // Keyword filter on content if provided
      if (query && typeof query === 'string' && query.trim()) {
        const cleanQuery = `%${query.trim()}%`;
        conditions.push(ilike(messages.content, cleanQuery));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return await tx.select()
        .from(messages)
        .where(whereClause)
        .orderBy(desc(messages.createdAt))
        .limit(Number(limit) || 50);
    });

    res.json({ results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /messages/:id/rating - Update user rating for a message
apiRouter.put('/messages/:id/rating', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { rating } = req.body;
    const messageId = req.params.id;
    const userId = payload.id as string;

    await txWithUser(userId, async (tx) => {
      await tx.update(messages)
        .set({ rating: Number(rating) })
        .where(eq(messages.id, messageId));
    });

    res.json({ success: true, rating });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /knowledge - Get all knowledge nodes for the authenticated user
apiRouter.get('/knowledge', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = payload.id as string;
    const { knowledgeNodes } = await import('./db/schema.js');
    
    const nodes = await txWithUser(userId, async (tx) => {
      return await tx.select().from(knowledgeNodes);
    });
    
    res.json(nodes);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /knowledge/:id - Update directly a knowledge node (generates new embeddings)
apiRouter.put('/knowledge/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Role check: Only ADMIN can directly update knowledge nodes
    const { users, knowledgeNodes } = await import('./db/schema.js');
    const userObj = await db.query.users.findFirst({
      where: eq(users.id, payload.id as string)
    });
    if (!userObj || userObj.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only administrators can update knowledge nodes directly.' });
    }

    const { content, nodeType, metadata } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const [existingNode] = await db.select().from(knowledgeNodes).where(eq(knowledgeNodes.id, req.params.id));
    if (!existingNode) {
      return res.status(404).json({ error: 'Knowledge node not found' });
    }

    const apiKey = await resolveGoogleApiKey(payload.id as string);
    if (!apiKey) {
      return res.status(400).json({ error: 'API key not configured. Cannot update vector embeddings.' });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const embedResponse = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: content
    });
    
    const embeddingVector = embedResponse.embeddings?.[0]?.values;
    if (!embeddingVector) {
      throw new Error('Failed to generate embedding');
    }

    const [updatedNode] = await db.update(knowledgeNodes).set({
      content,
      nodeType: nodeType || existingNode.nodeType,
      metadata: metadata || existingNode.metadata,
      embedding: embeddingVector
    }).where(eq(knowledgeNodes.id, req.params.id)).returning();

    res.json(updatedNode);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /knowledge/:id - Directly delete a knowledge node
apiRouter.delete('/knowledge/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Role check: Only ADMIN can directly delete knowledge nodes
    const { users, knowledgeNodes } = await import('./db/schema.js');
    const userObj = await db.query.users.findFirst({
      where: eq(users.id, payload.id as string)
    });
    if (!userObj || userObj.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only administrators can delete knowledge nodes directly.' });
    }

    const [existingNode] = await db.select().from(knowledgeNodes).where(eq(knowledgeNodes.id, req.params.id));
    if (!existingNode) {
      return res.status(404).json({ error: 'Knowledge node not found' });
    }

    await db.delete(knowledgeNodes).where(eq(knowledgeNodes.id, req.params.id));

    res.json({ message: 'Knowledge node deleted successfully' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /knowledge/proposals - Retrieve list of proposals
apiRouter.get('/knowledge/proposals', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { knowledgeProposals } = await import('./db/schema.js');
    const proposals = await db.select().from(knowledgeProposals);
    
    res.json(proposals);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /knowledge/proposals/:id - Update content of a proposal
apiRouter.put('/knowledge/proposals/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

        const { proposedContent, reason, status } = req.body;
    const { users, knowledgeProposals } = await import('./db/schema.js');

    const [proposal] = await db.select().from(knowledgeProposals).where(eq(knowledgeProposals.id, req.params.id));
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const userObj = await db.query.users.findFirst({
      where: eq(users.id, payload.id as string)
    });

    if (proposal.userId !== (payload.id as string) && (!userObj || userObj.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Unauthorized to modify this proposal' });
    }

    const [updated] = await db.update(knowledgeProposals).set({
      proposedContent: proposedContent !== undefined ? proposedContent : proposal.proposedContent,
      reason: reason !== undefined ? reason : proposal.reason,
      status: status !== undefined ? status : proposal.status
    }).where(eq(knowledgeProposals.id, req.params.id)).returning();

    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /knowledge/proposals/:id/approve - Approve and apply a proposal
apiRouter.post('/knowledge/proposals/:id/approve', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Role check: Only ADMIN can approve proposals
    const { users, knowledgeProposals, knowledgeNodes } = await import('./db/schema.js');
    const userObj = await db.query.users.findFirst({
      where: eq(users.id, payload.id as string)
    });
    if (!userObj || userObj.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only administrators can approve proposals.' });
    }

    const [proposal] = await db.select().from(knowledgeProposals).where(eq(knowledgeProposals.id, req.params.id));
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    if (proposal.status !== 'PENDING') {
      return res.status(400).json({ error: 'Proposal has already been processed' });
    }

    const apiKey = await resolveGoogleApiKey(payload.id as string);
    if (!apiKey) {
      return res.status(400).json({ error: 'API key not configured. Cannot process vector embeddings for approval.' });
    }

    if (proposal.actionType === 'INSERT' || proposal.actionType === 'UPDATE') {
      const content = proposal.proposedContent;
      if (!content) {
        return res.status(400).json({ error: 'Proposal missing content to encode' });
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const embedResponse = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: content
      });
      
      const embeddingVector = embedResponse.embeddings?.[0]?.values;
      if (!embeddingVector) {
        throw new Error('Failed to generate embedding');
      }

      if (proposal.actionType === 'INSERT') {
        const [insertedNode] = await db.insert(knowledgeNodes).values({
          content: content,
          nodeType: 'web_data', // fallback default
          embedding: embeddingVector,
          metadata: { reason: proposal.reason }
        }).returning();

        await db.update(knowledgeProposals).set({
          status: 'APPROVED',
          targetNodeId: insertedNode.id
        }).where(eq(knowledgeProposals.id, req.params.id));

      } else if (proposal.actionType === 'UPDATE') {
        if (!proposal.targetNodeId) {
          return res.status(400).json({ error: 'Update proposal is missing targetNodeId' });
        }

        await db.update(knowledgeNodes).set({
          content: content,
          embedding: embeddingVector
        }).where(eq(knowledgeNodes.id, proposal.targetNodeId));

        await db.update(knowledgeProposals).set({
          status: 'APPROVED'
        }).where(eq(knowledgeProposals.id, req.params.id));
      }

    } else if (proposal.actionType === 'DELETE') {
      if (!proposal.targetNodeId) {
        return res.status(400).json({ error: 'Delete proposal is missing targetNodeId' });
      }

      await db.delete(knowledgeNodes).where(eq(knowledgeNodes.id, proposal.targetNodeId));

      await db.update(knowledgeProposals).set({
        status: 'APPROVED'
      }).where(eq(knowledgeProposals.id, req.params.id));
    }

    const [updatedProposal] = await db.select().from(knowledgeProposals).where(eq(knowledgeProposals.id, req.params.id));
    res.json(updatedProposal);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /knowledge/proposals/:id/reject - Reject a proposal
apiRouter.post('/knowledge/proposals/:id/reject', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Role check: Only ADMIN can reject proposals
    const { users, knowledgeProposals } = await import('./db/schema.js');
    const userObj = await db.query.users.findFirst({
      where: eq(users.id, payload.id as string)
    });
    if (!userObj || userObj.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only administrators can reject proposals.' });
    }

    const [proposal] = await db.select().from(knowledgeProposals).where(eq(knowledgeProposals.id, req.params.id));
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const [updatedProposal] = await db.update(knowledgeProposals).set({
      status: 'REJECTED'
    }).where(eq(knowledgeProposals.id, req.params.id)).returning();

    res.json(updatedProposal);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post('/auth/guest', async (req, res) => {
  try {
    const guestEmail = `guest_${crypto.randomUUID()}@guest.local`;
    const [user] = await db.insert(users).values({
      email: guestEmail,
      name: 'Guest User',
    }).returning();

    const token = await new jose.SignJWT({ id: user.id, email: user.email, isGuest: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1d')
      .sign(JWT_SECRET);

    res.json({ user: { id: user.id, email: user.email, name: user.name, isGuest: true }, token });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.get('/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    
    const token = authHeader.split(' ')[1];
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    
    if (!payload || !payload.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.id as string),
      with: { accounts: true }
    });
    if (!user) return res.status(401).json({ error: 'User not found' });
    
    let userRole = user.role;
    if (user.email === 'nguyensihuynsh711@gmail.com' && user.role !== 'ADMIN') {
      await db.update(users).set({ role: 'ADMIN' }).where(eq(users.id, user.id));
      userRole = 'ADMIN';
    }

    const githubAccount = user.accounts?.find(a => a.provider === 'github');
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
  } catch (e: any) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

apiRouter.get('/user/state', async (req, res) => {
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
        ? await tx.select().from(messages).where(sql`${messages.sessionId} IN ${ids}`)
        : [];
      
      const formatted = sessionsList.map(s => ({
        ...s,
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
        }))
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

apiRouter.put('/user/state', async (req, res) => {
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
          });
          if (s.messages && Array.isArray(s.messages) && s.messages.length > 0) {
            const msgsToInsert = s.messages.map((m: any) => ({
              id: m.id || `msg-${Date.now()}-${Math.random()}`,
              sessionId: s.id,
              role: m.role || 'user',
              content: m.content || '',
              modelUsed: m.modelName,
              imageUrl: m.imageUrl,
              videoUrl: m.videoUrl,
              attachments: m.attachments || [],
              rating: typeof m.rating === 'number' ? m.rating : 0,
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

const getBaseUrl = (req: express.Request) => {
  let host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
  let protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  if (String(host).includes('vercel.app')) {
    protocol = 'https';
  }
  return `${protocol}://${host}`;
};

apiRouter.get('/auth/github/url', (req, res) => {
  try {
    if (!process.env.GITHUB_CLIENT_ID) {
      return res.status(501).json({ error: 'GitHub OAuth is not configured. Missing GITHUB_CLIENT_ID.' });
    }
    const redirectUri = `${getBaseUrl(req)}/api/auth/github/callback`;
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email%20repo`;
    res.json({ url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/auth/github/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send('No code provided');

  try {
    // 1. Get access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    // 2. Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });
    const userData = await userResponse.json();

    let email = userData.email;
    // 3. GitHub users might have hidden emails
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
        },
      });
      const emailsData = await emailsResponse.json();
      const primaryEmail = emailsData.find((e: any) => e.primary && e.verified);
      email = primaryEmail ? primaryEmail.email : emailsData[0]?.email;
    }
    
    if (!email) throw new Error('No email found from GitHub');

    // 4. Upsert user entirely using drizzle
    // Check if user exists via email or accounts table
    let user = await db.query.users.findFirst({ where: eq(users.email, email) });
    const isSpecialAdmin = email === 'nguyensihuynsh711@gmail.com';
    if (!user) {
      [user] = await db.insert(users).values({
        email: email,
        name: userData.name || userData.login,
        avatarUrl: userData.avatar_url,
        role: isSpecialAdmin ? 'ADMIN' : 'USER',
      }).returning();
    } else if (isSpecialAdmin && user.role !== 'ADMIN') {
      [user] = await db.update(users).set({ role: 'ADMIN' }).where(eq(users.id, user.id)).returning();
    }

    // Check account mapping
    const existingAccount = await db.query.accounts.findFirst({
      where: (accounts, { eq, and }) =>
        and(eq(accounts.provider, 'github'), eq(accounts.providerAccountId, String(userData.id)))
    });

    if (!existingAccount) {
      await db.insert(accounts).values({
        userId: user.id,
        provider: 'github',
        providerAccountId: String(userData.id),
        accessToken: tokenData.access_token,
      });
    } else {
      await db.update(accounts)
        .set({ accessToken: tokenData.access_token })
        .where(eq(accounts.id, existingAccount.id));
    }

    // Generate JWT
    const token = await new jose.SignJWT({ id: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    // Send success message to parent window and close popup
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
  } catch (e: any) {
    console.error('GitHub oauth error:', e);
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

apiRouter.get('/auth/google/url', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(501).json({ error: 'Google OAuth is not configured. Missing GOOGLE_CLIENT_ID.' });
  }
  const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email profile`;
  res.json({ url });
});

apiRouter.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) return res.status(400).send('No code provided');

  try {
    const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;
    // 1. Get tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

    // 2. Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResponse.json();
    
    if (!userData.email) throw new Error('No email found from Google');

    // 3. Upsert user
    let user = await db.query.users.findFirst({ where: eq(users.email, userData.email) });
    if (!user) {
      [user] = await db.insert(users).values({
        email: userData.email,
        name: userData.name,
        avatarUrl: userData.picture,
      }).returning();
    }

    // Check account mapping
    const existingAccount = await db.query.accounts.findFirst({
      where: (accounts, { eq, and }) =>
        and(eq(accounts.provider, 'google'), eq(accounts.providerAccountId, String(userData.id)))
    });

    if (!existingAccount) {
      await db.insert(accounts).values({
        userId: user.id,
        provider: 'google',
        providerAccountId: String(userData.id),
        accessToken: tokenData.access_token,
      });
    }

    // Generate JWT
    const token = await new jose.SignJWT({ id: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    // Send success message to parent window and close popup
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
  } catch (e: any) {
    console.error('Google oauth error:', e);
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
