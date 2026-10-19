/*
 * Pose les collections et les index du socle. Idempotent : on peut le relancer à chaque
 * déploiement sans rien casser.
 *
 *   MONGODB_URI=… AUTH_PEPPER=… pnpm portal:migrer
 */
import { readEnv } from "../src/config/env";
import { applyIndexes, createClient } from "../src/db/client";
import { applyValidators } from "../src/db/validators";

async function main(): Promise<void> {
  const env = readEnv();
  const client = createClient(env);
  try {
    await client.connect();
    const db = client.db(env.MONGODB_DB);
    const report = await applyIndexes(db);
    const created = report.filter((line) => line.created);
    console.log(`${report.length} index vérifiés, ${created.length} posés.`);
    for (const line of created) console.log(`  + ${line.collection}.${line.index}`);

    // Les validateurs `$jsonSchema` : la doublure des schémas Zod côté base (`db/validators.ts`).
    // Un échec sur une collection n'arrête pas les autres, et il est dit en clair.
    const validators = await applyValidators(db);
    const poses = validators.filter((line) => line.applied);
    console.log(`${poses.length}/${validators.length} validateurs posés.`);
    for (const line of validators.filter((item) => !item.applied)) {
      console.error(`  ! ${line.collection} : ${line.raison}`);
    }
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
