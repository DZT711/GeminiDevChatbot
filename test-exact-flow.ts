import dotenv from 'dotenv';
import { db } from './src/db/index.js';
import { knowledgeNodes, knowledgeProposals, users } from './src/db/schema.js';
import { eq, sql } from 'drizzle-orm';
dotenv.config();

// Recreate txWithUser
async function txWithUser<T>(userId: string, callback: (tx: any) => Promise<T>): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
    return await callback(tx);
  });
}

async function run() {
  try {
    const userRes = await db.select().from(users).limit(1);
    if (userRes.length === 0) {
      throw new Error('No users found');
    }
    const testUserId = userRes[0].id;
    console.log('Testing exact flow with user ID:', testUserId);

    // 1. Resolve key (mimics resolveGoogleApiKey)
    await txWithUser(testUserId, async (tx) => {
      return { ok: true };
    });

    // 2. Perform insert transaction (mimics `/knowledge/proposals` INSERT block)
    const embeddingVector = Array(768).fill(0);
    const result = await txWithUser(testUserId, async (tx) => {
      const [insertedNode] = await tx.insert(knowledgeNodes).values({
        content: 'Testing exact dual transaction flow.',
        nodeType: 'web_data',
        embedding: embeddingVector,
        metadata: { reason: 'robust flow testing' }
      }).returning();

      const [createdProposal] = await tx.insert(knowledgeProposals).values({
        userId: testUserId,
        actionType: 'INSERT',
        targetNodeId: insertedNode.id,
        proposedContent: 'Testing exact dual transaction flow.',
        reason: 'robust flow testing',
        status: 'APPROVED'
      }).returning();

      return createdProposal;
    });

    console.log('--- SUCCESSFUL INSERTION ---', result.id);
  } catch (e: any) {
    console.error('--- EXCEPTION DETECTED ---');
    console.dir(e, { depth: null });
  }
}

run();
