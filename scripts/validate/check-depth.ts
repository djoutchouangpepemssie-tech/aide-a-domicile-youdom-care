import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { neverIndexedPaths } from "../../src/lib/seo/indexable";
import { decodeEntities, routeOf, tagAttributes } from "./check-seo";
import { result, type Check, type CheckContext, type CheckResult } from "./types";

/*
 * P9.4 (docs/PLAN.md) et docs/04 §2 « Maillage » : le contrôle lit les pages HTML produites par
 * `next build` (.next/server/app/**\/*.html, fichiers `_…` exclus), relève chaque lien interne
 * `<a href>` en notant la zone de la page qui le porte — en-tête (tout ce qui précède `<main>`),
 * pied de page (tout ce qui suit `</main>` : pied, barre d'actions rapides), fil d'Ariane
 * (`<nav aria-label="Fil d'Ariane">`) ou corps (le reste de `<main>`) — puis :
 *
 *   - calcule la profondeur de clic de chaque page depuis l'accueil (parcours en largeur sur
 *     tous les liens, quelle que soit leur zone : un menu se clique aussi) et échoue si une page
 *     indexable est à plus de `MAX_DEPTH` clics (3) ou n'est pas atteignable ;
 *   - compte les liens entrants **contextuels** de chaque page : liens du corps d'une autre page,
 *     hors en-tête, pied de page, fil d'Ariane et hors la page /plan-du-site/ (qui lie tout).
 *     Zéro lien contextuel est une erreur ; moins de `MIN_CONTEXTUAL` (3, docs/04 §2 « chaque
 *     page reçoit au moins 3 liens internes contextuels ») est un avertissement.
 *
 * Pages contrôlées : toutes les pages construites hors `neverIndexedPaths` (/api/, /merci/,
 * /styleguide/) et hors l'accueil pour les liens entrants. Les pages en prévisualisation
 * (`a_relire`, marquées `data-statut="a_relire"` sur `<main>` et, site ouvert, `noindex`) ne
 * produisent que des avertissements : elles n'existent pas en production. Tant que
 * `SITE_INDEXABLE` n'est pas « true », toutes les pages portent `noindex` : ce `noindex` global
 * n'exclut personne (même règle que check-seo).
 *
 * `pnpm exec tsx scripts/validate/check-depth.ts --report` affiche la distribution des
 * profondeurs, les pages les plus profondes et les moins liées.
 */

export const MAX_DEPTH = 3;
export const MIN_CONTEXTUAL = 3;
/** Nombre de lignes des tableaux du rapport. */
const REPORT_ROWS = 15;

export type LinkZone = "en-tete" | "pied-de-page" | "fil-d-ariane" | "corps";

export interface ZonedLink {
  target: string;
  zone: LinkZone;
}

export interface DepthPage {
  path: string;
  /** `noindex` explicite dans le rendu. */
  robotsNoindex: boolean;
  /** Page en prévisualisation (`data-statut="a_relire"` sur `<main>`). */
  review: boolean;
  links: ZonedLink[];
}

export interface DepthReport {
  errors: string[];
  warnings: string[];
  /** Profondeur de clic par page (absente : inatteignable). */
  depths: Map<string, number>;
  /** Nombre de liens entrants contextuels par page contrôlée. */
  contextual: Map<string, number>;
}

/** Retire commentaires, scripts, styles, gabarits et noscript (le flux RSC contient du HTML sérialisé). */
function stripNonContent(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
}

function normalizeInternal(href: string): string {
  const bare = href.split(/[?#]/)[0] ?? "";
  if (bare === "" || bare === "/") return "/";
  return bare.endsWith("/") ? bare : `${bare}/`;
}

export function isNeverIndexed(pathname: string): boolean {
  return neverIndexedPaths.some((prefix) => pathname.startsWith(prefix));
}

interface Range {
  start: number;
  end: number;
}

/** Étendue des fils d'Ariane (`<nav aria-label="Fil d'Ariane">…</nav>`, sans nav imbriquée). */
function breadcrumbRanges(body: string): Range[] {
  const ranges: Range[] = [];
  for (const match of body.matchAll(/<nav\b[^>]*>/gi)) {
    const label = decodeEntities(tagAttributes(match[0]).get("aria-label") ?? "");
    if (!/ariane/i.test(label)) continue;
    const start = match.index;
    const close = body.indexOf("</nav>", start);
    ranges.push({ start, end: close === -1 ? body.length : close });
  }
  return ranges;
}

export function parseDepthPage(pathname: string, html: string): DepthPage {
  const clean = stripNonContent(html);
  const head = clean.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  let robotsNoindex = false;
  for (const match of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = tagAttributes(match[0]);
    if (
      attrs.get("name")?.toLowerCase() === "robots" &&
      /noindex/i.test(attrs.get("content") ?? "")
    ) {
      robotsNoindex = true;
    }
  }

  const body = clean.replace(/^[\s\S]*?<\/head>/i, "");
  const mainOpen = body.match(/<main\b[^>]*>/i);
  const mainStart = mainOpen?.index ?? 0;
  const mainCloseIndex = body.indexOf("</main>", mainStart);
  const mainEnd = mainOpen && mainCloseIndex !== -1 ? mainCloseIndex : body.length;
  const review = mainOpen ? tagAttributes(mainOpen[0]).get("data-statut") === "a_relire" : false;
  const breadcrumbs = breadcrumbRanges(body);

  const links: ZonedLink[] = [];
  for (const match of body.matchAll(/<a\b[^>]*>/gi)) {
    const href = tagAttributes(match[0]).get("href") ?? "";
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const at = match.index;
    let zone: LinkZone = "corps";
    if (mainOpen && at < mainStart) zone = "en-tete";
    else if (mainOpen && at > mainEnd) zone = "pied-de-page";
    else if (breadcrumbs.some((range) => at > range.start && at < range.end)) zone = "fil-d-ariane";
    links.push({ target: normalizeInternal(href), zone });
  }
  return { path: pathname, robotsNoindex, review, links };
}

/** Profondeur de clic depuis l'accueil, tous liens confondus (parcours en largeur). */
export function clickDepths(pages: readonly DepthPage[], root = "/"): Map<string, number> {
  const byPath = new Map(pages.map((page) => [page.path, page] as const));
  const depths = new Map<string, number>();
  if (!byPath.has(root)) return depths;
  depths.set(root, 0);
  const queue = [root];
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    if (current === undefined) break;
    const depth = depths.get(current) ?? 0;
    for (const link of byPath.get(current)?.links ?? []) {
      if (depths.has(link.target) || !byPath.has(link.target)) continue;
      depths.set(link.target, depth + 1);
      queue.push(link.target);
    }
  }
  return depths;
}

/** Liens entrants contextuels (corps d'une autre page, hors plan du site) par page construite. */
export function contextualIncoming(
  pages: readonly DepthPage[],
  siteMapPath = "/plan-du-site/",
): Map<string, number> {
  const counts = new Map<string, number>(pages.map((page) => [page.path, 0]));
  for (const page of pages) {
    if (page.path === siteMapPath) continue;
    const seen = new Set<string>();
    for (const link of page.links) {
      if (link.zone !== "corps" || link.target === page.path || seen.has(link.target)) continue;
      if (!counts.has(link.target)) continue;
      seen.add(link.target);
      counts.set(link.target, (counts.get(link.target) ?? 0) + 1);
    }
  }
  return counts;
}

export function auditDepth(pages: readonly DepthPage[]): DepthReport {
  const siteClosed = pages.length > 0 && pages.every((page) => page.robotsNoindex);
  const depths = clickDepths(pages);
  const contextual = contextualIncoming(pages);
  const errors: string[] = [];
  const warnings: string[] = [];
  const report = (soft: boolean, message: string) => (soft ? warnings : errors).push(message);

  for (const page of pages) {
    if (isNeverIndexed(page.path)) continue;
    const preview = page.review || (!siteClosed && page.robotsNoindex);
    const depth = depths.get(page.path);
    if (depth === undefined) {
      report(preview, `${page.path} : inatteignable depuis l'accueil par les liens du rendu`);
    } else if (depth > MAX_DEPTH) {
      report(preview, `${page.path} : à ${depth} clics de l'accueil (maximum ${MAX_DEPTH})`);
    }
    if (page.path === "/") continue;
    const incoming = contextual.get(page.path) ?? 0;
    if (incoming === 0) {
      report(
        preview,
        `${page.path} : aucun lien entrant contextuel (hors en-tête, pied de page, fil d'Ariane, plan du site)`,
      );
    } else if (incoming < MIN_CONTEXTUAL) {
      warnings.push(
        `${page.path} : ${incoming} lien(s) entrant(s) contextuel(s), minimum conseillé ${MIN_CONTEXTUAL} (docs/04 §2)`,
      );
    }
  }
  const audited = pages.filter((page) => !isNeverIndexed(page.path));
  return {
    errors: errors.sort(),
    warnings: warnings.sort(),
    depths: new Map(
      audited.flatMap((p) => (depths.has(p.path) ? [[p.path, depths.get(p.path) ?? 0]] : [])),
    ),
    contextual: new Map(
      audited.filter((p) => p.path !== "/").map((p) => [p.path, contextual.get(p.path) ?? 0]),
    ),
  };
}

async function listHtmlFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listHtmlFiles(full)));
    else if (entry.name.endsWith(".html") && !entry.name.startsWith("_")) out.push(full);
  }
  return out.sort();
}

/** Lit toutes les pages d'un dossier de rendu. */
export async function readDepthPages(outputDir: string): Promise<DepthPage[]> {
  const pages: DepthPage[] = [];
  for (const file of await listHtmlFiles(outputDir)) {
    const html = await readFile(file, "utf8");
    pages.push(parseDepthPage(routeOf(path.relative(outputDir, file)), html));
  }
  return pages;
}

/** Tableaux du rapport (`--report`) : distribution, pages les plus profondes, les moins liées. */
export function formatReport(report: DepthReport, rows = REPORT_ROWS): string {
  const distribution = new Map<number, number>();
  for (const depth of report.depths.values()) {
    distribution.set(depth, (distribution.get(depth) ?? 0) + 1);
  }
  const lines = ["Profondeur de clic depuis l'accueil (pages hors /api/, /merci/, /styleguide/) :"];
  for (const depth of [...distribution.keys()].sort((a, b) => a - b)) {
    lines.push(`  ${depth} clic(s) : ${distribution.get(depth) ?? 0} page(s)`);
  }
  const unreachable = [...report.contextual.keys()].filter((p) => !report.depths.has(p));
  if (unreachable.length > 0) lines.push(`  inatteignables : ${unreachable.length} page(s)`);

  lines.push("", `Pages les plus profondes (${rows} au plus) :`);
  const deepest = [...report.depths.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, rows);
  for (const [p, depth] of deepest) lines.push(`  ${String(depth).padStart(2)}  ${p}`);

  lines.push("", `Pages les moins liées (liens entrants contextuels, ${rows} au plus) :`);
  const weakest = [...report.contextual.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .slice(0, rows);
  for (const [p, count] of weakest) lines.push(`  ${String(count).padStart(2)}  ${p}`);
  return lines.join("\n");
}

export async function runDepthCheck(ctx: CheckContext): Promise<CheckResult> {
  const outputDir = path.join(ctx.rootDir, ".next", "server", "app");
  try {
    await stat(outputDir);
  } catch {
    return result([
      "aucun rendu à contrôler : lancez `pnpm build` avant `pnpm validate` (.next/server/app absent).",
    ]);
  }
  const report = auditDepth(await readDepthPages(outputDir));
  return result(report.errors, report.warnings);
}

export const checkDepth: Check = {
  id: "check-depth",
  description:
    "une page construite est à plus de 3 clics de l'accueil ou n'a aucun lien entrant contextuel (hors en-tête, pied de page, fil d'Ariane, plan du site) ; moins de 3 liens contextuels est un avertissement",
  run: runDepthCheck,
};

/* Exécution directe : `pnpm exec tsx scripts/validate/check-depth.ts [--report]`. */
const invokedDirectly =
  process.argv[1] !== undefined && /check-depth\.ts$/.test(process.argv[1].replace(/\\/g, "/"));
if (invokedDirectly) {
  const outputDir = path.join(process.cwd(), ".next", "server", "app");
  readDepthPages(outputDir)
    .then((pages) => {
      const report = auditDepth(pages);
      if (process.argv.includes("--report")) {
        process.stdout.write(`${formatReport(report)}\n\n`);
      }
      for (const warning of report.warnings) process.stdout.write(`  ⚠ ${warning}\n`);
      for (const error of report.errors) process.stdout.write(`  ✖ ${error}\n`);
      process.stdout.write(
        `\ncheck-depth : ${report.errors.length} erreur(s), ${report.warnings.length} avertissement(s)\n`,
      );
      process.exitCode = report.errors.length > 0 ? 1 : 0;
    })
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
