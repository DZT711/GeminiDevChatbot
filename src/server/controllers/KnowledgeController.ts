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

router.post('/knowledge/proposals', async (req, res) => {
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
    const { knowledgeProposals, knowledgeNodes } = await import('../db/schema.js');

    if (actionType === 'INSERT') {
      const content = proposedContent;
      if (!content) {
        return res.status(400).json({ error: 'Proposal missing content to encode' });
      }

      const apiKey = await resolveGoogleApiKey(payload.id as string);
      if (!apiKey) {
        return res.status(400).json({ error: 'Google Gemini API key not configured. Cannot process vector embeddings for automatic insertion.' });
      }

      
      const ai = di.llmService.getClient(apiKey);
      
      const embedResponse = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: content,
        config: {
          outputDimensionality: 768
        }
      });
      
      const embeddingVector = embedResponse.embeddings?.[0]?.values;
      if (!embeddingVector) {
        throw new Error('Failed to generate embedding');
      }

      // Create both the knowledge node and the approved proposal record under the user transaction context
      const proposal = await txWithUser(payload.id as string, async (tx) => {
        const [insertedNode] = await tx.insert(knowledgeNodes).values({
          content: content,
          nodeType: 'web_data', // fallback default
          embedding: embeddingVector,
          metadata: { reason: reason || 'Automatically embedded' }
        }).returning();

        const [createdProposal] = await tx.insert(knowledgeProposals).values({
          userId: payload.id as string,
          actionType: 'INSERT',
          targetNodeId: insertedNode.id,
          proposedContent: content,
          reason,
          status: 'APPROVED'
        }).returning();

        return createdProposal;
      });

      return res.json(proposal);
    }

    // For UPDATE or DELETE, they need administrator approval, so we log as PENDING
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
    console.error('ERROR in /api/knowledge/proposals:', e);
    console.error('ERROR details:', {
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




router.post('/knowledge/search', async (req, res) => {
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

    
    const ai = di.llmService.getClient(apiKey);
    
    // Generate embedding for the query using the updated gemini-embedding-2-preview model
    const embedResponse = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: query,
      config: {
        outputDimensionality: 768
      }
    });
    
    const embeddingVector = embedResponse.embeddings?.[0]?.values;
    if (!embeddingVector) {
      throw new Error('Failed to generate embeddings for query');
    }

    const { knowledgeNodes } = await import('../db/schema.js');
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


router.get('/knowledge', async (req, res) => {
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
    const { knowledgeNodes } = await import('../db/schema.js');
    
    const nodes = await txWithUser(userId, async (tx) => {
      return await tx.select().from(knowledgeNodes);
    });
    
    res.json(nodes);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /knowledge/:id - Update directly a knowledge node (generates new embeddings)

router.put('/knowledge/:id', async (req, res) => {
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
    const { users, knowledgeNodes } = await import('../db/schema.js');
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

    const [existingNode] = await txWithUser(payload.id as string, async (tx) => {
      return await tx.select().from(knowledgeNodes).where(eq(knowledgeNodes.id, req.params.id));
    });
    if (!existingNode) {
      return res.status(404).json({ error: 'Knowledge node not found' });
    }

    const apiKey = await resolveGoogleApiKey(payload.id as string);
    if (!apiKey) {
      return res.status(400).json({ error: 'API key not configured. Cannot update vector embeddings.' });
    }

    
    const ai = di.llmService.getClient(apiKey);
    
    const embedResponse = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: content,
      config: {
        outputDimensionality: 768
      }
    });
    
    const embeddingVector = embedResponse.embeddings?.[0]?.values;
    if (!embeddingVector) {
      throw new Error('Failed to generate embedding');
    }

    const [updatedNode] = await txWithUser(payload.id as string, async (tx) => {
      return await tx.update(knowledgeNodes).set({
        content,
        nodeType: nodeType || existingNode.nodeType,
        metadata: metadata || existingNode.metadata,
        embedding: embeddingVector
      }).where(eq(knowledgeNodes.id, req.params.id)).returning();
    });

    res.json(updatedNode);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /knowledge/:id - Directly delete a knowledge node

router.delete('/knowledge/:id', async (req, res) => {
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
    const { users, knowledgeNodes } = await import('../db/schema.js');
    const userObj = await db.query.users.findFirst({
      where: eq(users.id, payload.id as string)
    });
    if (!userObj || userObj.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only administrators can delete knowledge nodes directly.' });
    }

    const [existingNode] = await txWithUser(payload.id as string, async (tx) => {
      return await tx.select().from(knowledgeNodes).where(eq(knowledgeNodes.id, req.params.id));
    });
    if (!existingNode) {
      return res.status(404).json({ error: 'Knowledge node not found' });
    }

    await txWithUser(payload.id as string, async (tx) => {
      await tx.delete(knowledgeNodes).where(eq(knowledgeNodes.id, req.params.id));
    });

    res.json({ message: 'Knowledge node deleted successfully' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /knowledge/proposals - Retrieve list of proposals

router.get('/knowledge/proposals', async (req, res) => {
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

    const { knowledgeProposals } = await import('../db/schema.js');
    const proposals = await txWithUser(payload.id as string, async (tx) => {
      return await tx.select().from(knowledgeProposals);
    });
    
    res.json(proposals);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /knowledge/proposals/:id - Update content of a proposal

router.put('/knowledge/proposals/:id', async (req, res) => {
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
    const { users, knowledgeProposals } = await import('../db/schema.js');

    const [proposal] = await txWithUser(payload.id as string, async (tx) => {
      return await tx.select().from(knowledgeProposals).where(eq(knowledgeProposals.id, req.params.id));
    });
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const userObj = await db.query.users.findFirst({
      where: eq(users.id, payload.id as string)
    });

    if (proposal.userId !== (payload.id as string) && (!userObj || userObj.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Unauthorized to modify this proposal' });
    }

    const [updated] = await txWithUser(payload.id as string, async (tx) => {
      return await tx.update(knowledgeProposals).set({
        proposedContent: proposedContent !== undefined ? proposedContent : proposal.proposedContent,
        reason: reason !== undefined ? reason : proposal.reason,
        status: status !== undefined ? status : proposal.status
      }).where(eq(knowledgeProposals.id, req.params.id)).returning();
    });

    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /knowledge/proposals/:id/approve - Approve and apply a proposal

router.post('/knowledge/proposals/:id/approve', async (req, res) => {
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
    const { users, knowledgeProposals, knowledgeNodes } = await import('../db/schema.js');
    const userObj = await db.query.users.findFirst({
      where: eq(users.id, payload.id as string)
    });
    if (!userObj || userObj.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only administrators can approve proposals.' });
    }

    const [proposal] = await txWithUser(payload.id as string, async (tx) => {
      return await tx.select().from(knowledgeProposals).where(eq(knowledgeProposals.id, req.params.id));
    });
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

      
      const ai = di.llmService.getClient(apiKey);
      
      const embedResponse = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: content,
        config: {
          outputDimensionality: 768
        }
      });
      
      const embeddingVector = embedResponse.embeddings?.[0]?.values;
      if (!embeddingVector) {
        throw new Error('Failed to generate embedding');
      }

      const updatedProposal = await txWithUser(payload.id as string, async (tx) => {
        if (proposal.actionType === 'INSERT') {
          const [insertedNode] = await tx.insert(knowledgeNodes).values({
            content: content,
            nodeType: 'web_data', // fallback default
            embedding: embeddingVector,
            metadata: { reason: proposal.reason }
          }).returning();

          await tx.update(knowledgeProposals).set({
            status: 'APPROVED',
            targetNodeId: insertedNode.id
          }).where(eq(knowledgeProposals.id, req.params.id));

        } else if (proposal.actionType === 'UPDATE') {
          if (!proposal.targetNodeId) {
            throw new Error('Update proposal is missing targetNodeId');
          }

          await tx.update(knowledgeNodes).set({
            content: content,
            embedding: embeddingVector
          }).where(eq(knowledgeNodes.id, proposal.targetNodeId));

          await tx.update(knowledgeProposals).set({
            status: 'APPROVED'
          }).where(eq(knowledgeProposals.id, req.params.id));
        }

        const [finalProposal] = await tx.select().from(knowledgeProposals).where(eq(knowledgeProposals.id, req.params.id));
        return finalProposal;
      });

      res.json(updatedProposal);

    } else if (proposal.actionType === 'DELETE') {
      if (!proposal.targetNodeId) {
        return res.status(400).json({ error: 'Delete proposal is missing targetNodeId' });
      }

      const updatedProposal = await txWithUser(payload.id as string, async (tx) => {
        await tx.delete(knowledgeNodes).where(eq(knowledgeNodes.id, proposal.targetNodeId));

        await tx.update(knowledgeProposals).set({
          status: 'APPROVED'
        }).where(eq(knowledgeProposals.id, req.params.id));

        const [finalProposal] = await tx.select().from(knowledgeProposals).where(eq(knowledgeProposals.id, req.params.id));
        return finalProposal;
      });

      res.json(updatedProposal);
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /knowledge/proposals/:id/reject - Reject a proposal

router.post('/knowledge/proposals/:id/reject', async (req, res) => {
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
    const { users, knowledgeProposals } = await import('../db/schema.js');
    const userObj = await db.query.users.findFirst({
      where: eq(users.id, payload.id as string)
    });
    if (!userObj || userObj.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only administrators can reject proposals.' });
    }

    const [proposal] = await txWithUser(payload.id as string, async (tx) => {
      return await tx.select().from(knowledgeProposals).where(eq(knowledgeProposals.id, req.params.id));
    });
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const [updatedProposal] = await txWithUser(payload.id as string, async (tx) => {
      return await tx.update(knowledgeProposals).set({
        status: 'REJECTED'
      }).where(eq(knowledgeProposals.id, req.params.id)).returning();
    });

    res.json(updatedProposal);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

