import path from "node:path";
import { checks } from "./config";
import type { CheckContext } from "./types";

/*
 * `pnpm validate [--prod]` : exécute tous les contrôles de config.ts, affiche un bilan et sort
 * en code 1 dès qu'un contrôle a une erreur. Les avertissements ne bloquent pas.
 */

async function main() {
  const prod = process.argv.includes("--prod") || process.env.VERCEL_ENV === "production";
  const ctx: CheckContext = { rootDir: path.resolve(process.cwd()), prod };

  console.log(`pnpm validate — mode ${prod ? "production" : "prévisualisation"}\n`);

  let failed = 0;
  for (const check of checks) {
    const started = Date.now();
    const { errors, warnings } = await check.run(ctx);
    const ms = Date.now() - started;
    const mark = errors.length === 0 ? "✔" : "✖";
    console.log(`${mark} ${check.id} (${ms} ms)`);
    for (const w of warnings) console.log(`  ⚠ ${w}`);
    for (const e of errors) console.log(`  ✖ ${e}`);
    if (errors.length > 0) failed += 1;
  }

  console.log(
    `\n${checks.length - failed}/${checks.length} contrôle(s) vert(s)${failed > 0 ? ` — ${failed} en échec` : ""}`,
  );
  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
