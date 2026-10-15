/*
 * Pose les collections et les index du socle. Idempotent : on peut le relancer à chaque
 * déploiement sans rien casser.
 *
 *   MONGODB_URI=… AUTH_PEPPER=… pnpm portal:migrer
 */
import { readEnv } from "../src/config/env";
import { applyIndexes, createClient } from "../src/db/client";

async function main(): Promise<void> {
  const env = readEnv();
  const client = createClient(env);
  try {
    await client.connect();
    const report = await applyIndexes(client.db(env.MONGODB_DB));
    const created = report.filter((line) => line.created);
    console.log(`${report.length} index vérifiés, ${created.length} posés.`);
    for (const line of created) console.log(`  + ${line.collection}.${line.index}`);
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
