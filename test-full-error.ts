import dotenv from 'dotenv';
import { db } from './src/db/index.js';
import { knowledgeNodes, knowledgeProposals, users } from './src/db/schema.js';
import { eq, sql } from 'drizzle-orm';
dotenv.config();

async function run() {
  try {
    const userRes = await db.select().from(users).limit(1);
    const testUserId = userRes[0].id;

    console.log('Testing with user ID:', testUserId);

    await db.transaction(async (tx) => {
      // In the API, txWithUser checks:
      await tx.execute(sql`SELECT set_config('app.current_user_id', ${testUserId}, true)`);
      
      const embeddingVector = Array(768).fill(0);
      const [insertedNode] = await tx.insert(knowledgeNodes).values({
        content: 'Robust diagnosis of postgres RLS error.',
        nodeType: 'web_data',
        embedding: embeddingVector,
        metadata: { reason: 'checking exact postgres exception' }
      }).returning();
      
      console.log('Inserted node:', insertedNode.id);
    });
  } catch (e: any) {
    console.error('--- EXCEPTION DETECTED ---');
    console.dir(e, { depth: null });
  }
}

run();
