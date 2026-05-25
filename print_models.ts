import { db } from './src/db/index.js';
import { modelInformation } from './src/db/schema.js';
async function run() {
  const models = await db.select().from(modelInformation);
  console.log(models.filter(m => m.id.includes('gemini')));
  process.exit(0);
}
run();
