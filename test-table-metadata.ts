import dotenv from 'dotenv';
import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';
dotenv.config();

async function run() {
  try {
    const colRes = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'knowledge_nodes';
    `);
    console.log('Columns:');
    console.dir(colRes.rows, { depth: null });

    const conRes = await db.execute(sql`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'knowledge_nodes'::regclass;
    `);
    console.log('Constraints:');
    console.dir(conRes.rows, { depth: null });

  } catch (err: any) {
    console.error('Error:', err);
  }
}

run();
