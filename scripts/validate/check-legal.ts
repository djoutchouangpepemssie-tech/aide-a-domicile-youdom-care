import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { legalPagePaths } from "../../src/content/legal";
import { navigationSchema, siteConfigSchema, type SiteConfig } from "../../src/content/schemas";
import { missingLegalFields } from "../../src/lib/legal/mentions";
import { plannedRoutes } from "./check-links";
import { extractVisibleText } from "./check-placeholders";
import { result, type Check, type CheckContext, type CheckResult } from "./types";

/*
 * docs/07 §2 et §7 (P8.3) : le contrôle lit les pages HTML produites par `next build`
 * (.next/server/app/**\/*.html) et échoue si :
 *   - une page obligatoire manque au rendu (mentions légales, politique de confidentialité,
 *     cookies, conditions générales, accessibilité, plan du site) ou n'est pas liée depuis le
 *     pied de page (content/navigation.json > pied_de_page.legal) ; une page encore listée dans
 *     `plannedRoutes` (check-links) n'est qu'un avertissement, jusqu'à sa livraison ;
 *   - un prix ou une offre en mode mandataire (élément portant `data-mode="mandataire"` :
 *     PriceCard, ligne du tableau des tarifs, carte de choix, section) n'est pas accompagné de
 *     la mention légale (`data-notice="mandataire"`, composant MandataireNotice) sur la même
 *     page ; pour une carte de prix, la mention doit être dans la carte ;
 *   - la politique de confidentialité ne cite pas l'adresse de contact ou la CNIL ;
 *   - un script ou un cadre tiers est chargé par le rendu sans être nommé sur la page cookies
 *     (aucun n'est attendu : src/lib/mesure/README.md) ;
 *   - en production (`--prod`), un champ légal obligatoire de site.config.json est `null`
 *     (raison sociale, forme, siège, RCS ou RNE, directeur de la publication, médiateur,
 *     adresse et contact de l'hébergeur, autorisations si le mode mandataire est proposé) ;
 *     en prévisualisation, ces manques sont des avertissements.
 */

export const ACCESSIBILITE_PATH = "/accessibilite/";
export const PLAN_DU_SITE_PATH = "/plan-du-site/";
export const COOKIES_PATH = "/cookies/";
export const POLITIQUE_PATH = "/politique-de-confidentialite/";

/** Pages obligatoires de docs/07 §2, dans l'ordre du pied de page. */
export const requiredLegalPages: readonly string[] = [
  ...legalPagePaths,
  ACCESSIBILITE_PATH,
  PLAN_DU_SITE_PATH,
];

export interface LegalRenderInput {
  /** Chemin construit (barre finale) → HTML de la page. */
  pages: ReadonlyMap<string, string>;
  /** Adresses de content/navigation.json > pied_de_page.legal. */
  footerLegalHrefs: readonly string[];
  siteConfig: Pick<SiteConfig, "legal" | "modes_intervention" | "contact" | "marque">;
  prod: boolean;
  /** Pages prévues et pas encore livrées (check-links) : absence tolérée en avertissement. */
  planned?: Readonly<Record<string, string>>;
}

const MANDATAIRE_MARKER = /data-mode="mandataire"/g;
const NOTICE_MARKER = /data-notice="mandataire"/;

/** Prix et offres en mode mandataire sans mention légale, sur une page rendue. */
export function mandataireIssues(pagePath: string, html: string): string[] {
  const issues: string[] = [];
  const markers = [...html.matchAll(MANDATAIRE_MARKER)];
  if (markers.length === 0) return issues;
  if (!NOTICE_MARKER.test(html)) {
    issues.push(
      `${pagePath} : ${markers.length} prix ou offre(s) en mode mandataire sans mention légale (data-notice="mandataire")`,
    );
    return issues;
  }
  // Cartes de prix : la mention doit être dans la carte (PriceCard reçoit `notice`).
  for (const marker of markers) {
    const tagStart = html.lastIndexOf("<", marker.index);
    const tagEnd = html.indexOf(">", marker.index);
    if (tagStart < 0 || tagEnd < 0) continue;
    const openTag = html.slice(tagStart, tagEnd + 1);
    if (!/^<article\b/.test(openTag) || !/price-card/.test(openTag)) continue;
    const close = html.indexOf("</article>", tagEnd);
    const card = html.slice(tagEnd, close < 0 ? undefined : close);
    if (!NOTICE_MARKER.test(card)) {
      const label = /aria-label="([^"]*)"/.exec(openTag)?.[1] ?? "sans libellé";
      issues.push(
        `${pagePath} : carte de prix « ${label} » en mode mandataire sans mention dans la carte`,
      );
    }
  }
  return issues;
}

const SCRIPT_OR_FRAME = /<(script|iframe)\b[^>]*\ssrc=["']([^"']+)["'][^>]*>/gi;

/** Hôtes tiers des scripts et cadres chargés par une page ; l'origine du site est ignorée. */
export function externalHosts(html: string, siteUrl: string): string[] {
  const own = safeHost(siteUrl);
  const hosts = new Set<string>();
  for (const match of html.matchAll(SCRIPT_OR_FRAME)) {
    const src = match[2] ?? "";
    if (!/^(?:https?:)?\/\//.test(src)) continue;
    const host = safeHost(src.startsWith("//") ? `https:${src}` : src);
    if (host && host !== own) hosts.add(host);
  }
  return [...hosts].sort();
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

/** Vérifie un rendu déjà chargé : pages, pied de page, mentions mandataire, politique, cookies, champs. */
export function checkLegalRender(input: LegalRenderInput): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const planned = input.planned ?? {};

  for (const page of requiredLegalPages) {
    const built = input.pages.has(page);
    const linked = input.footerLegalHrefs.some((href) => normalize(href) === page);
    if (!built) {
      const phase = planned[page];
      const message = `${page} absente du rendu`;
      if (phase) warnings.push(`${message} (prévue en ${phase})`);
      else errors.push(message);
    }
    if (!linked) {
      errors.push(
        `${page} n'est pas liée depuis le pied de page (navigation.json > pied_de_page.legal)`,
      );
    }
  }

  for (const [pagePath, html] of [...input.pages.entries()].sort()) {
    errors.push(...mandataireIssues(pagePath, html));
  }

  const policy = input.pages.get(POLITIQUE_PATH);
  if (policy) {
    const text = extractVisibleText(policy);
    const email = input.siteConfig.contact.email;
    if (email === null) {
      errors.push(
        `${POLITIQUE_PATH} : aucune adresse de contact (site.config.json > contact.email)`,
      );
    } else if (!text.includes(email)) {
      errors.push(`${POLITIQUE_PATH} : l'adresse de contact ${email} n'apparaît pas`);
    }
    if (!/cnil\.fr/i.test(policy) || !/CNIL/.test(text)) {
      errors.push(
        `${POLITIQUE_PATH} : la réclamation auprès de la CNIL (lien vers cnil.fr) manque`,
      );
    }
  }

  const cookies = input.pages.get(COOKIES_PATH);
  const detected = new Set<string>();
  for (const html of input.pages.values()) {
    for (const host of externalHosts(html, input.siteConfig.marque.url)) detected.add(host);
  }
  if (cookies) {
    const cookiesText = extractVisibleText(cookies);
    for (const host of [...detected].sort()) {
      if (!cookiesText.includes(host)) {
        errors.push(
          `${COOKIES_PATH} : le script ou cadre tiers « ${host} » chargé par le rendu n'y est pas listé`,
        );
      }
    }
  } else if (detected.size > 0) {
    errors.push(`scripts tiers détectés sans page cookies : ${[...detected].sort().join(", ")}`);
  }

  const missing = missingLegalFields(input.siteConfig);
  for (const field of missing) {
    const state = field.startsWith("legal.autorisations") ? "est vide" : "est null";
    const message = `site.config.json : ${field} ${state} (Q-ID-2, Q-LEGAL-1, Q-LEGAL-5) : bloc masqué sur /mentions-legales/`;
    if (input.prod) errors.push(message);
    else warnings.push(message);
  }

  return result(errors, warnings);
}

function normalize(href: string): string {
  const bare = href.split(/[?#]/)[0] ?? "";
  if (bare === "" || bare === "/") return "/";
  return bare.endsWith("/") ? bare : `${bare}/`;
}

/** Pages HTML construites : chemin (barre finale) → contenu. */
export async function readBuiltPages(outputDir: string): Promise<Map<string, string>> {
  const pages = new Map<string, string>();
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
        pages.set(rel === "index" ? "/" : `/${rel}/`, await readFile(full, "utf8"));
      }
    }
  };
  await walk(outputDir);
  return pages;
}

async function readJson(rootDir: string, file: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(rootDir, "content", file), "utf8")) as unknown;
}

export async function runLegalCheck(ctx: CheckContext): Promise<CheckResult> {
  const outputDir = path.join(ctx.rootDir, ".next", "server", "app");
  try {
    await stat(outputDir);
  } catch {
    return result([
      "aucun rendu à contrôler : lancez `pnpm build` avant `pnpm validate` (.next/server/app absent).",
    ]);
  }
  const navigation = navigationSchema.safeParse(await readJson(ctx.rootDir, "navigation.json"));
  const siteConfig = siteConfigSchema.safeParse(await readJson(ctx.rootDir, "site.config.json"));
  if (!navigation.success || !siteConfig.success) {
    return result(["navigation.json ou site.config.json invalide : voir check-content."]);
  }
  return checkLegalRender({
    pages: await readBuiltPages(outputDir),
    footerLegalHrefs: navigation.data.pied_de_page.legal.map((link) => link.href),
    siteConfig: siteConfig.data,
    prod: ctx.prod,
    planned: plannedRoutes,
  });
}

export const checkLegal: Check = {
  id: "check-legal",
  description:
    "une page légale manque ou n'est pas liée du pied de page ; la mention mandataire manque près d'un prix mandataire ; la politique ne cite pas le contact ou la CNIL ; un script tiers n'est pas listé sur /cookies/ ; en production : un champ légal obligatoire est null",
  run: runLegalCheck,
};
