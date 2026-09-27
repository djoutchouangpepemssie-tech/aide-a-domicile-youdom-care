/*
 * Vérification rapide de toutes les adresses construites : statut HTTP, présence d'un H1,
 * erreur d'hydratation visible dans le HTML. Sert à repérer une page cassée avant une revue
 * de design. Lance le serveur soi-même : `pnpm exec tsx scripts/smoke-pages.mts [port]`.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";

const port = Number(process.argv[2] ?? 3111);
const base = `http://127.0.0.1:${port}`;

async function routesFromBuild(): Promise<string[]> {
  const root = path.join(process.cwd(), ".next", "server", "app");
  const out: string[] = [];
  const walk = async (dir: string, prefix: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith("_") || entry.name === "api") continue;
        await walk(full, `${prefix}${entry.name}/`);
      } else if (entry.name.endsWith(".html")) {
        const name = entry.name.replace(/\.html$/, "");
        out.push(name === "index" ? prefix : `${prefix}${name}/`);
      }
    }
  };
  await walk(root, "/");
  return [...new Set(out)].sort();
}

const routes = await routesFromBuild();
console.log(`${routes.length} adresses à vérifier sur ${base}`);
const problems: string[] = [];
let done = 0;
for (const route of routes) {
  const response = await fetch(`${base}${route}`, { redirect: "manual" });
  const html = response.ok ? await response.text() : "";
  const expected404 = route === "/404/" || route.endsWith("/not-found/");
  if (!response.ok && !expected404) {
    problems.push(`${route} : HTTP ${response.status}`);
  } else if (response.ok) {
    if (!/<h1\b/i.test(html)) problems.push(`${route} : aucun <h1>`);
    if (/Application error|Internal Server Error|NoFallbackError/i.test(html)) {
      problems.push(`${route} : erreur dans le rendu`);
    }
    if (/undefined<|>null<|\[object Object\]|NaN\b/.test(html)) {
      problems.push(`${route} : valeur non résolue dans le rendu`);
    }
  }
  done += 1;
  if (done % 100 === 0) console.log(`  ${done}/${routes.length}…`);
}
console.log(problems.length === 0 ? "Toutes les pages répondent." : problems.join("\n"));
console.log(`${problems.length} problème(s) sur ${routes.length} adresses.`);
process.exit(problems.length === 0 ? 0 : 1);
