import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';
async function main() {
  await db.execute(sql`ALTER TABLE model_information ADD COLUMN can_use_tool BOOLEAN DEFAULT false;`);
  console.log("Column added");
}
main().catch(console.error).finally(() => process.exit(0));
