import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { result, type Check, type CheckContext, type CheckResult } from "./types";

/*
 * Point de validation 4 (docs/PLAN.md) : aucun lien interne cassé dans `content/`. Le contrôle
 * relève tous les chemins internes (« /… / ») des JSON (toute valeur de chaîne, `href`,
 * `chemin`, `pilier`, `soeurs`…) et des MDX (en-tête et liens Markdown du corps), puis vérifie
 * que chaque page existe dans le rendu produit par `next build` (.next/server/app/**\/*.html),
 * ce qui couvre les routes statiques, les routes dynamiques prérendues et les pages MDX.
 *
 * Les pages prévues par le plan mais pas encore livrées (navigation, pied de page) sont
 * listées ci-dessous avec leur phase : elles produisent un avertissement, pas une erreur, et
 * chaque entrée est retirée quand la page est construite. Toute autre cible absente est une
 * erreur. Les liens externes cités comme sources (`sources[].href`, docs/07 §7) sont ouverts
 * une fois chacun (GET, 10 s, redirections suivies) : une réponse 4xx/5xx est une erreur ; une
 * connexion refusée ou un délai dépassé (site qui bloque les robots, réseau) est un
 * avertissement à vérifier à la main. `YC_LINKS_OFFLINE=1` saute cette partie.
 */

/** Pages annoncées par docs/PLAN.md et pas encore construites (phase entre parenthèses). */
export const plannedRoutes: Readonly<Record<string, string>> = {
  "/magazine/": "phase 7 (Le Fil)",
  "/lexique/": "phase 7 (Le Fil)",
  "/professionnels/": "phase 8 (fonctionnement et entreprise)",
  "/recrutement/": "phase 8 (fonctionnement et entreprise)",
  "/recrutement/postuler/": "phase 8 (fonctionnement et entreprise)",
  "/mentions-legales/": "phase 8 (pages légales)",
  "/politique-de-confidentialite/": "phase 8 (pages légales)",
  "/cookies/": "phase 8 (pages légales)",
  "/conditions-generales/": "phase 8 (pages légales)",
  "/accessibilite/": "phase 8 (pages légales)",
};

const internalHref = /^\/(?:[a-z0-9-]+\/)*(?:[a-z0-9-]+\/?)?(?:[?#].*)?$/;

export interface LinkRef {
  file: string;
  pointer: string;
  href: string;
}

/** Normalise un chemin interne : sans requête ni fragment, avec barre finale. */
export function normalizeInternal(href: string): string {
  const bare = href.split(/[?#]/)[0] ?? "";
  if (bare === "" || bare === "/") return "/";
  return bare.endsWith("/") ? bare : `${bare}/`;
}

export function isInternalHref(value: string): boolean {
  return internalHref.test(value) && !value.startsWith("//");
}

function walkJson(
  value: unknown,
  pointer: string,
  onString: (text: string, pointer: string) => void,
) {
  if (typeof value === "string") {
    onString(value, pointer);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => walkJson(item, `${pointer}[${index}]`, onString));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key.startsWith("_")) continue;
      walkJson(item, pointer ? `${pointer}.${key}` : key, onString);
    }
  }
}

const markdownLink = /\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

/** Adresses externes citées comme sources (`sources[].href`) d'un JSON ou d'un MDX. */
export function extractSourceUrls(raw: string, isJson: boolean): string[] {
  const data: unknown = isJson ? JSON.parse(raw) : matter(raw).data;
  const urls: string[] = [];
  const walk = (value: unknown, underSources: boolean) => {
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, underSources));
    } else if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) {
        if (key.startsWith("_")) continue;
        if (
          underSources &&
          key === "href" &&
          typeof item === "string" &&
          /^https?:\/\//.test(item)
        ) {
          urls.push(item);
        } else {
          walk(item, underSources || key === "sources");
        }
      }
    }
  };
  walk(data, false);
  return urls;
}

export interface ExternalReport {
  /** Réponses 4xx/5xx : la source n'existe plus à cette adresse. */
  errors: string[];
  /** Connexion refusée ou délai dépassé : injoignable depuis ce poste, à vérifier à la main. */
  warnings: string[];
}

/** Ouvre chaque adresse une fois (GET, 10 s, redirections suivies). */
export async function checkExternal(
  urls: readonly string[],
  fetchImpl: typeof fetch = fetch,
  concurrency = 6,
): Promise<ExternalReport> {
  const unique = [...new Set(urls)];
  const failures: string[] = [];
  const unreachable: string[] = [];
  let index = 0;
  const worker = async () => {
    while (index < unique.length) {
      const url = unique[index];
      index += 1;
      if (!url) continue;
      try {
        const response = await fetchImpl(url, {
          method: "GET",
          redirect: "follow",
          headers: { "user-agent": "Mozilla/5.0 (compatible; YoudomCare-check-links/1.0)" },
          signal: AbortSignal.timeout(10_000),
        });
        if (response.status >= 400) failures.push(`${url} → HTTP ${response.status}`);
      } catch (error) {
        const cause = error instanceof Error && error.cause instanceof Error ? error.cause : null;
        const reason = cause?.message ?? (error instanceof Error ? error.name : "erreur");
        unreachable.push(`${url} → injoignable depuis ce poste (${reason}), à vérifier à la main`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, worker));
  return { errors: failures.sort(), warnings: unreachable.sort() };
}

/** Liens internes d'un fichier JSON ou MDX de `content/`. */
export function extractLinks(file: string, raw: string): LinkRef[] {
  const refs: LinkRef[] = [];
  const push = (href: string, pointer: string) => {
    if (isInternalHref(href)) refs.push({ file, pointer, href });
  };
  if (file.endsWith(".json")) {
    walkJson(JSON.parse(raw), "", push);
    return refs;
  }
  const { data, content } = matter(raw);
  walkJson(data, "", push);
  for (const match of content.matchAll(markdownLink)) {
    push(match[1] ?? "", "corps");
  }
  return refs;
}

async function listContentFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listContentFiles(full)));
    else if (/\.(json|mdx)$/.test(entry.name)) out.push(full);
  }
  return out.sort();
}

/** Chemins des pages construites, d'après les fichiers HTML de `.next/server/app`. */
export async function builtRoutes(outputDir: string): Promise<Set<string>> {
  const routes = new Set<string>();
  const walk = async (dir: string) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith(".html") && !entry.name.startsWith("_")) {
        const rel = path
          .relative(outputDir, full)
          .replace(/\\/g, "/")
          .replace(/\.html$/, "");
        routes.add(rel === "index" ? "/" : `/${rel}/`);
      }
    }
  };
  await walk(outputDir);
  return routes;
}

export interface LinksReport {
  errors: string[];
  warnings: string[];
}

export function checkRefs(refs: LinkRef[], routes: Set<string>, rootDir: string): LinksReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const ref of refs) {
    const target = normalizeInternal(ref.href);
    if (routes.has(target)) continue;
    const key = `${ref.file}|${ref.pointer}|${target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const where = `${path.relative(rootDir, ref.file).replace(/\\/g, "/")} › ${ref.pointer}`;
    const planned = plannedRoutes[target];
    if (planned) warnings.push(`${where} : ${target} prévu en ${planned}, pas encore construit`);
    else errors.push(`${where} : lien interne cassé → ${target}`);
  }
  return { errors, warnings };
}

export async function runLinksCheck(ctx: CheckContext): Promise<CheckResult> {
  const outputDir = path.join(ctx.rootDir, ".next", "server", "app");
  try {
    await stat(outputDir);
  } catch {
    return result([
      "aucun rendu à contrôler : lancez `pnpm build` avant `pnpm validate` (.next/server/app absent).",
    ]);
  }
  const routes = await builtRoutes(outputDir);
  const refs: LinkRef[] = [];
  const sourceUrls: string[] = [];
  for (const file of await listContentFiles(path.join(ctx.rootDir, "content"))) {
    const raw = await readFile(file, "utf8");
    refs.push(...extractLinks(file, raw));
    sourceUrls.push(...extractSourceUrls(raw, file.endsWith(".json")));
  }
  const report = checkRefs(refs, routes, ctx.rootDir);
  if (process.env.YC_LINKS_OFFLINE) {
    report.warnings.push(
      `${new Set(sourceUrls).size} source(s) externe(s) non ouvertes (YC_LINKS_OFFLINE)`,
    );
  } else {
    const external = await checkExternal(sourceUrls);
    for (const failure of external.errors) report.errors.push(`source externe : ${failure}`);
    for (const warning of external.warnings) report.warnings.push(`source externe : ${warning}`);
  }
  for (const route of Object.keys(plannedRoutes)) {
    if (routes.has(route)) {
      report.errors.push(
        `${route} est construit : retirer l'entrée de plannedRoutes (check-links)`,
      );
    }
  }
  return result(report.errors, report.warnings);
}

export const checkLinks: Check = {
  id: "check-links",
  description:
    "un lien interne de content/ vise une page absente du rendu (hors pages prévues par le plan, signalées) ; une source externe ne répond pas",
  run: runLinksCheck,
};
