import { run } from "./indexnow/submit";

/*
 * `pnpm indexnow [--dry-run]` : soumet à IndexNow les adresses des plans de site (docs/04 §2).
 * `pnpm indexnow --write-key` : écrit public/<clé>.txt avant le build (script `prebuild`).
 * La clé vient de INDEXNOW_KEY (Vercel, jamais dans le dépôt) ; sans clé, simulation seulement.
 * Détail et tests : scripts/indexnow/submit.ts.
 */

run({ argv: process.argv.slice(2), env: process.env }).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
