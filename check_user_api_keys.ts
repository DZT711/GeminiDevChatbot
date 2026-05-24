import { db } from "./src/db/index.js";
import { accounts } from "./src/db/schema.js";

async function run() {
  const allAccounts = await db.select().from(accounts);
  for (const acc of allAccounts) {
    if (acc.apiKeys) {
      console.log('Account ID:', acc.id);
      console.log('API Keys:', JSON.stringify(acc.apiKeys, null, 2));
    }
  }
  process.exit();
}
run();
