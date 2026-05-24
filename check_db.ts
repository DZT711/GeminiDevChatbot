import { db } from "./src/db/index.ts";
import { modelInformation } from "./src/db/schema.ts";

async function run() {
  const models = await db.select().from(modelInformation);
  const duplicates = models.filter((v,i,a) => a.findIndex(t => t.id === v.id) !== i).map(v => v.id);
  console.log("Total:", models.length);
  console.log("Duplicates:", duplicates);
  process.exit(0);
}
run();
