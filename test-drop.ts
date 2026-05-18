import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Dropping messages and sessions tables...');
  await db.execute(sql`DROP TABLE IF EXISTS "messages" CASCADE;`);
  await db.execute(sql`DROP TABLE IF EXISTS "sessions" CASCADE;`);
  console.log('Done');
  process.exit(0);
}

main().catch(console.error);
