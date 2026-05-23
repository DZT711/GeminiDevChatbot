import dotenv from 'dotenv';
import { db } from './src/db/index.js';
import { knowledgeNodes, knowledgeProposals, users } from './src/db/schema.js';
import { eq, sql } from 'drizzle-orm';
dotenv.config();

async function run() {
  try {
    // Find a non-admin user
    const userRes = await db.select().from(users).limit(1);
    if (userRes.length === 0) {
      throw new Error('No user found');
    }
    const testUserId = userRes[0].id;
    console.log(`Setting session to user ID: ${testUserId}`);

    // Recreate the transaction exactly
    const result = await db.transaction(async (tx) => {
      // Set config
      await tx.execute(sql`SELECT set_config('app.current_user_id', ${testUserId}, true)`);

      const [insertedNode] = await tx.insert(knowledgeNodes).values({
        content: 'Testing Drizzle transaction insert vector node.',
        nodeType: 'web_data',
        embedding: Array(768).fill(0),
        metadata: { reason: 'drizzle diagnostic RLS' }
      }).returning();
      console.log('Inserted node via Drizzle transaction!');

      const [createdProposal] = await tx.insert(knowledgeProposals).values({
        userId: testUserId,
        actionType: 'INSERT',
        targetNodeId: insertedNode.id,
        proposedContent: 'Testing Drizzle transaction insert vector node.',
        reason: 'drizzle diagnostic RLS',
        status: 'APPROVED'
      }).returning();
      console.log('Inserted proposal via Drizzle transaction!');

      return createdProposal;
    });

    console.log('--- DRIZZLE TRANSACTION SUCCESSFULLY COMMITTED ---', result.id);
  } catch (e: any) {
    console.error('--- DRIZZLE TRANSACTION FAILED ---');
    console.error(e);
  }
}

run();
