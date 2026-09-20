import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { neverIndexedPaths } from "../../src/lib/seo/indexable";
import { result, type Check, type CheckContext, type CheckResult } from "./types";

/*
 * docs/07 §7 et docs/04 §2 (P5.1) : le contrôle lit les pages HTML produites par `next build`
 * (.next/server/app/**\/*.html, fichiers `_…` exclus) et échoue si :
 *   - le titre est absent, hors 50–60 caractères ou en double entre deux pages ;
 *   - la description est absente, hors 140–155 caractères ou en double ;
 *   - le H1 est absent ou multiple ; la hiérarchie des titres saute un niveau (h2 → h4) ;
 *   - la canonique est absente ou différente de l'adresse de la page (`marque.url` + chemin) ;
 *   - une image n'a pas d'attribut `alt` (vide autorisé seulement avec `role="presentation"`
 *     ou `aria-hidden="true"`) ;
 *   - une page est orpheline : aucun lien interne `<a href>` entrant depuis une autre page
 *     construite (l'accueil est dispensé).
 *
 * Pages exclues : les chemins de `neverIndexedPaths` (/merci/, /styleguide/…) et, quand le site
 * est ouvert, les pages construites en `noindex` (contenu `a_relire` en prévisualisation).
 * Tant que `SITE_INDEXABLE` n'est pas « true », toutes les pages portent `noindex` : ce
 * `noindex` global n'exclut personne, sans quoi rien ne serait contrôlé avant l'ouverture.
 * Les pages exclues restent des sources de liens, mais n'ont pas besoin de lien entrant.
 * Chaque message donne le chemin de la page, le motif et la valeur en cause.
 */

export const TITLE_MIN = 50;
export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 140;
export const DESCRIPTION_MAX = 155;

/**
 * Pages tolérées le temps d'une phase (chemin avec barre finale → phase et motif) : leurs
 * erreurs deviennent des avertissements. Vide tant que possible ; une entrée dont la page est
 * redevenue conforme est signalée pour être retirée.
 */
export const toleratedPaths: ReadonlyMap<string, string> = new Map<string, string>([]);

export interface ImageFacts {
  src: string;
  /** null : attribut absent. */
  alt: string | null;
  decorative: boolean;
}

export interface PageFacts {
  path: string;
  title: string | null;
  description: string | null;
  canonical: string | null;
  robotsNoindex: boolean;
  h1Count: number;
  /** Niveaux des titres dans l'ordre du document. */
  headings: number[];
  images: ImageFacts[];
  /** Cibles internes normalisées (sans requête ni fragment, barre finale). */
  links: string[];
}

export interface SeoReport {
  errors: string[];
  warnings: string[];
}

const entities: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(?:#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m) => {
    const known = entities[m.toLowerCase()];
    if (known !== undefined) return known;
    if (m.startsWith("&#x")) return String.fromCodePoint(parseInt(m.slice(3, -1), 16));
    if (m.startsWith("&#")) return String.fromCodePoint(parseInt(m.slice(2, -1), 10));
    return m;
  });
}

/** Attributs d'une balise ouvrante (`alt=""`, `alt`, `role="…"`), en minuscules. */
export function tagAttributes(tag: string): Map<string, string> {
  const attrs = new Map<string, string>();
  const inner = tag.replace(/^<[a-z][a-z0-9-]*/i, "").replace(/\/?>$/, "");
  const re = /([^\s=/"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  for (const match of inner.matchAll(re)) {
    const name = match[1]?.toLowerCase();
    if (!name) continue;
    attrs.set(name, decodeEntities(match[2] ?? match[3] ?? match[4] ?? ""));
  }
  return attrs;
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

/** Chemin d'une page d'après son fichier HTML relatif à `.next/server/app`. */
export function routeOf(relativeFile: string): string {
  const rel = relativeFile.replace(/\\/g, "/").replace(/\.html$/, "");
  return rel === "index" ? "/" : `/${rel}/`;
}

export function isNeverIndexed(pathname: string): boolean {
  return neverIndexedPaths.some((prefix) => pathname.startsWith(prefix));
}

export function parsePage(pathname: string, html: string): PageFacts {
  const clean = stripNonContent(html);
  const head = clean.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  const titleRaw = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const title = titleRaw === undefined ? null : decodeEntities(titleRaw).trim();

  let description: string | null = null;
  let robotsNoindex = false;
  for (const match of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = tagAttributes(match[0]);
    const name = attrs.get("name")?.toLowerCase();
    if (name === "description" && description === null) description = attrs.get("content") ?? "";
    if (name === "robots" && /noindex/i.test(attrs.get("content") ?? "")) robotsNoindex = true;
  }

  let canonical: string | null = null;
  for (const match of head.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = tagAttributes(match[0]);
    if (attrs.get("rel")?.toLowerCase() === "canonical") {
      canonical = attrs.get("href") ?? "";
      break;
    }
  }

  const body = clean.replace(/^[\s\S]*?<\/head>/i, "");
  const headings = [...body.matchAll(/<h([1-6])(?=[\s>/])/gi)].map((m) => Number(m[1]));
  const images: ImageFacts[] = [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => {
    const attrs = tagAttributes(m[0]);
    return {
      src: attrs.get("src") ?? "",
      alt: attrs.has("alt") ? (attrs.get("alt") ?? "") : null,
      decorative:
        attrs.get("role")?.toLowerCase() === "presentation" ||
        attrs.get("aria-hidden")?.toLowerCase() === "true",
    };
  });
  const links: string[] = [];
  for (const match of body.matchAll(/<a\b[^>]*>/gi)) {
    const href = tagAttributes(match[0]).get("href") ?? "";
    if (href.startsWith("/") && !href.startsWith("//")) links.push(normalizeInternal(href));
  }

  return {
    path: pathname,
    title,
    description,
    canonical,
    robotsNoindex,
    h1Count: headings.filter((level) => level === 1).length,
    headings,
    images,
    links,
  };
}

const quote = (value: string) => `« ${value} »`;

function duplicates(
  pages: readonly PageFacts[],
  pick: (page: PageFacts) => string | null,
  label: string,
): string[] {
  const groups = new Map<string, string[]>();
  for (const page of pages) {
    const value = pick(page);
    if (!value) continue;
    groups.set(value, [...(groups.get(value) ?? []), page.path]);
  }
  const errors: string[] = [];
  for (const [value, paths] of groups) {
    if (paths.length > 1) errors.push(`${paths.join(", ")} : ${label} en double — ${quote(value)}`);
  }
  return errors;
}

export function auditPages(pages: readonly PageFacts[], siteUrl: string): SeoReport {
  const siteClosed = pages.length > 0 && pages.every((page) => page.robotsNoindex);
  const audited = pages.filter(
    (page) => !isNeverIndexed(page.path) && (siteClosed || !page.robotsNoindex),
  );

  const incoming = new Map<string, Set<string>>();
  for (const page of pages) {
    for (const target of page.links) {
      if (target === page.path) continue;
      incoming.set(target, (incoming.get(target) ?? new Set()).add(page.path));
    }
  }

  const errors: string[] = [];
  for (const page of audited) {
    const { path: p } = page;

    if (page.title === null || page.title === "") errors.push(`${p} : titre absent`);
    else if (page.title.length < TITLE_MIN || page.title.length > TITLE_MAX) {
      errors.push(
        `${p} : titre hors ${TITLE_MIN}–${TITLE_MAX} caractères (${page.title.length}) — ${quote(page.title)}`,
      );
    }

    if (page.description === null || page.description === "")
      errors.push(`${p} : description absente`);
    else if (
      page.description.length < DESCRIPTION_MIN ||
      page.description.length > DESCRIPTION_MAX
    ) {
      errors.push(
        `${p} : description hors ${DESCRIPTION_MIN}–${DESCRIPTION_MAX} caractères (${page.description.length}) — ${quote(page.description)}`,
      );
    }

    if (page.h1Count === 0) errors.push(`${p} : H1 absent`);
    else if (page.h1Count > 1) errors.push(`${p} : H1 multiple — ${page.h1Count} balises h1`);

    let previous = 1;
    for (const level of page.headings) {
      if (level > previous + 1) {
        errors.push(`${p} : saut de hiérarchie des titres — h${previous} → h${level}`);
        break;
      }
      previous = level;
    }

    const expected = new URL(p, siteUrl).href;
    if (page.canonical === null || page.canonical === "") {
      errors.push(`${p} : canonique absente (attendu ${expected})`);
    } else if (page.canonical !== expected) {
      errors.push(`${p} : canonique différente de l'adresse de la page — ${page.canonical}`);
    }

    for (const image of page.images) {
      if (image.alt === null) errors.push(`${p} : image sans alt — ${image.src}`);
      else if (image.alt.trim() === "" && !image.decorative) {
        errors.push(
          `${p} : image avec alt vide sans role="presentation" ni aria-hidden — ${image.src}`,
        );
      }
    }

    if (p !== "/" && (incoming.get(p)?.size ?? 0) === 0) {
      errors.push(`${p} : page orpheline — aucun lien interne entrant depuis une autre page`);
    }
  }

  errors.push(...duplicates(audited, (page) => page.title, "titre"));
  errors.push(...duplicates(audited, (page) => page.description, "description"));

  const kept: string[] = [];
  const warnings: string[] = [];
  const toleratedSeen = new Set<string>();
  for (const error of errors) {
    const tolerated = [...toleratedPaths].find(([p]) => error.startsWith(`${p} :`));
    if (tolerated) {
      toleratedSeen.add(tolerated[0]);
      warnings.push(`${error} (toléré : ${tolerated[1]})`);
    } else {
      kept.push(error);
    }
  }
  for (const [p] of toleratedPaths) {
    if (!toleratedSeen.has(p)) {
      kept.push(`${p} est conforme : retirer l'entrée de toleratedPaths (check-seo)`);
    }
  }
  return { errors: kept.sort(), warnings: warnings.sort() };
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

/** Lit toutes les pages d'un dossier de rendu et les audite. */
export async function scanSeo(outputDir: string, siteUrl: string): Promise<SeoReport> {
  const pages: PageFacts[] = [];
  for (const file of await listHtmlFiles(outputDir)) {
    const html = await readFile(file, "utf8");
    pages.push(parsePage(routeOf(path.relative(outputDir, file)), html));
  }
  return auditPages(pages, siteUrl);
}

export async function runSeoCheck(ctx: CheckContext): Promise<CheckResult> {
  const outputDir = path.join(ctx.rootDir, ".next", "server", "app");
  try {
    await stat(outputDir);
  } catch {
    return result([
      "aucun rendu à contrôler : lancez `pnpm build` avant `pnpm validate` (.next/server/app absent).",
    ]);
  }
  const config = JSON.parse(
    await readFile(path.join(ctx.rootDir, "content", "site.config.json"), "utf8"),
  ) as { marque: { url: string } };
  const report = await scanSeo(outputDir, config.marque.url);
  return result(report.errors, report.warnings);
}

export const checkSeo: Check = {
  id: "check-seo",
  description:
    "titre ou description hors longueur ou en double ; H1 absent ou multiple ; saut de hiérarchie ; canonique manquante ; image sans alt ; page orpheline",
  run: runSeoCheck,
};
