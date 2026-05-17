import 'dotenv/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './src/db/index.js';
import path from 'path';

async function run() {
  try {
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
    console.log('Migration successful');
  } catch (err: any) {
    console.error('Migration failed:', err.message, err.cause);
  }
}
run();
