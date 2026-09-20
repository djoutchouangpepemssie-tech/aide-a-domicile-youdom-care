import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

/*
 * `pnpm lhci` : ouvre le Chromium de Playwright (déjà installé pour les tests e2e) avec un
 * port de débogage, puis lance `lhci autorun` qui s'y connecte (`settings.port` de
 * lighthouserc.cjs). Lighthouse ne lance donc pas son propre Chrome : sous Windows,
 * chrome-launcher échoue (EPERM) en supprimant son profil temporaire avant que Chrome ne le
 * libère, et le poste n'a pas besoin de Google Chrome.
 *
 * Les pages sont prérendues au build : le site doit être construit indexable, sinon l'audit
 * SEO « is-crawlable » échoue alors que la prévisualisation est volontairement en noindex
 * (src/lib/seo/indexable.ts). Le script reconstruit donc d'abord avec SITE_INDEXABLE=true ;
 * `pnpm test:e2e` reconstruit ensuite en noindex.
 */

export const DEBUGGING_PORT = 9222;

const env = { ...process.env, SITE_INDEXABLE: process.env.SITE_INDEXABLE ?? "true" };

function run(args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn("pnpm", args, { stdio: "inherit", shell: true, env });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main() {
  const built = await run(["build"]);
  if (built !== 0) {
    process.exitCode = built;
    return;
  }
  const browser = await chromium.launch({
    channel: "chromium",
    args: [`--remote-debugging-port=${DEBUGGING_PORT}`],
  });
  try {
    process.exitCode = await run(["exec", "lhci", "autorun", ...process.argv.slice(2)]);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
