import { db } from "./src/db/index.js";
import { apiKeys } from "./src/db/schema.js";

async function run() {
  const allKeys = await db.select().from(apiKeys);
  console.log(JSON.stringify(allKeys.map(k => ({...k, key: 'XXX'})), null, 2));
  process.exit();
}
run();
