import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  addressOverlaps,
  addressStartsWith,
  extractPhones,
  extractPostalCities,
  extractStreetAddresses,
  extractTelHrefs,
  findElements,
  findMarkedRegions,
  normalizeAddress,
  normalizePhone,
  removeRegions,
  type HtmlRegion,
} from "../../src/lib/local/nap";
import { loadLocalPages, type LocalPage } from "./check-local-facts";
import { extractVisibleText } from "./check-placeholders";
import { routeOf } from "./check-seo";
import { result, type Check, type CheckContext, type CheckResult } from "./types";

/*
 * docs/04 §4 (« adresse d'agence affichée = agence réelle la plus proche uniquement ») et
 * docs/07 §7 : une adresse ou un téléphone diffère de `site.config.json`. Le contrôle lit le
 * rendu des pages locales et d'agence (.next/server/app/aide-a-domicile/**, agences/**) et les
 * fichiers de données (content/local, data/local). Motifs relevés dans le texte visible et les
 * liens `tel:` : numéros français, adresses de voie (numéro + rue, avenue, boulevard, quai…),
 * code postal + ville (détail dans src/lib/local/nap.ts). Échoue si :
 *   - un téléphone n'est ni `contact.telephone_principal`, ni `contact.telephone_mobile`, ni le
 *     téléphone d'une agence de site.config.json ;
 *   - une adresse de voie ou un couple code postal + ville n'est pas celui d'une agence ; sur une
 *     page locale, le code postal + nom du territoire lui-même est toléré (ce n'est pas une
 *     adresse d'entreprise) ;
 *   - dans le corps (`<main>`) d'une page locale, une adresse d'agence autre que celle de
 *     `agence_proche.id` de son `LocalData` est affichée ; l'absence de l'adresse de l'agence la
 *     plus proche est un avertissement ;
 *   - la page `/agences/{id}/` n'affiche pas l'adresse de son agence dans `<main>` ;
 *   - `agence_proche.id` d'un `LocalData` n'est pas un `id` d'agence de site.config.json.
 *
 * Repère attendu du gabarit (à convenir avec l'agent gabarit) : la grille des ressources
 * (`LocalFactsGrid`, docs/04 §4 anatomie 4) est enveloppée dans un élément portant l'attribut
 * `data-local-facts` (ou la classe `local-facts`). Dans cette région seulement, les adresses et
 * téléphones de `facts[]` du `LocalData` sont tolérés, en plus des agences. Sans ce repère sur
 * une page locale, les adresses et téléphones de `facts[]` sont tolérés sur toute la page et un
 * avertissement le signale. Le pied de page liste toutes les agences : il est hors `<main>`, ses
 * adresses sont celles de site.config.json et ne comptent pas comme « agence affichée ».
 *
 * Sans rendu (.next/server/app absent), seule la cohérence des données est vérifiée et un
 * avertissement « rendu absent » est émis. Sans aucune page locale, le contrôle passe avec un
 * avertissement.
 */

const nullableString = z.string().min(1).nullable();

/** Partie de site.config.json utile au NAP (les autres champs sont ignorés). */
const napConfigSchema = z.object({
  contact: z.object({
    telephone_principal: nullableString,
    telephone_mobile: nullableString.optional(),
  }),
  agences: z.array(
    z.object({
      id: z.string().min(1),
      nom: z.string().min(1),
      adresse: z.string().min(1),
      code_postal: z.string().regex(/^\d{5}$/),
      commune: z.string().min(1),
      telephone: nullableString.optional(),
    }),
  ),
});

export interface AgencyNap {
  id: string;
  nom: string;
  /** « 49-51 quai de Dion-Bouton, 92800 Puteaux » */
  display: string;
  /** Adresse de voie normalisée. */
  street: string;
  /** « 92800 puteaux » normalisé. */
  postalCity: string;
  phone: string | null;
}

export interface NapConfig {
  agencies: AgencyNap[];
  /** Téléphones acceptés partout, normalisés en dix chiffres. */
  phones: Set<string>;
}

export function toNapConfig(raw: unknown): NapConfig {
  const config = napConfigSchema.parse(raw);
  const phones = new Set<string>();
  const addPhone = (value: string | null | undefined) => {
    const normalized = value ? normalizePhone(value) : null;
    if (normalized) phones.add(normalized);
  };
  addPhone(config.contact.telephone_principal);
  addPhone(config.contact.telephone_mobile);
  const agencies = config.agences.map((agency) => {
    addPhone(agency.telephone);
    return {
      id: agency.id,
      nom: agency.nom,
      display: `${agency.adresse}, ${agency.code_postal} ${agency.commune}`,
      street: normalizeAddress(agency.adresse),
      postalCity: normalizeAddress(`${agency.code_postal} ${agency.commune}`),
      phone: agency.telephone ? normalizePhone(agency.telephone) : null,
    };
  });
  return { agencies, phones };
}

export async function loadNapConfig(rootDir: string): Promise<NapConfig> {
  const raw = await readFile(path.join(rootDir, "content", "site.config.json"), "utf8");
  return toNapConfig(JSON.parse(raw));
}

export const FACTS_ATTRIBUTE = "data-local-facts";
export const FACTS_CLASS = "local-facts";

interface Tolerated {
  streets: string[];
  postalCities: string[];
  phones: Set<string>;
}

/**
 * Adresses et téléphones de `facts[]` : l'adresse de voie et le couple code postal + ville sont
 * extraits de `facts[].address` avec les mêmes motifs que le rendu, et l'adresse entière est
 * gardée pour les adresses sans numéro (« Hôtel de ville, place de la Mairie »).
 */
function toleratedFromFacts(page: LocalPage | null): Tolerated {
  const tolerated: Tolerated = { streets: [], postalCities: [], phones: new Set() };
  for (const fact of page?.data?.facts ?? []) {
    if (fact.address) {
      const whole = normalizeAddress(fact.address);
      tolerated.streets.push(
        whole,
        ...extractStreetAddresses(fact.address).map((m) => m.normalized),
      );
      tolerated.postalCities.push(
        whole,
        ...extractPostalCities(fact.address).map((m) => m.normalized),
      );
    }
    const phone = fact.telephone ? normalizePhone(fact.telephone) : null;
    if (phone) tolerated.phones.add(phone);
  }
  return tolerated;
}

function territoryPostalCities(page: LocalPage | null): string[] {
  const data = page?.data;
  if (!data) return [];
  return (data.codes_postaux ?? []).map((code) => normalizeAddress(`${code} ${data.nom}`));
}

interface Scope {
  html: string;
  /** Libellé de la région pour les messages (« corps », « grille des ressources »). */
  label: string;
  tolerated: Tolerated;
}

function auditScope(
  route: string,
  scope: Scope,
  config: NapConfig,
  ownPostalCities: readonly string[],
): string[] {
  const errors: string[] = [];
  const text = extractVisibleText(scope.html);
  const where = scope.label ? `${route} (${scope.label})` : route;

  const tolerates = scope.tolerated.streets.length > 0 || scope.tolerated.postalCities.length > 0;
  const expected = tolerates
    ? "n'est ni une agence de site.config.json ni l'adresse d'un fait de data/local"
    : "n'est celle d'aucune agence de site.config.json";
  const expectedPostal = tolerates
    ? "ne sont ni ceux d'une agence de site.config.json ni ceux d'un fait de data/local"
    : "ne sont ceux d'aucune agence de site.config.json";
  const matchesFact = (mention: string, references: readonly string[]) =>
    references.some((s) => addressStartsWith(mention, s) || addressOverlaps(mention, s));

  const seenPhones = new Set<string>();
  for (const phone of [...extractPhones(text), ...extractTelHrefs(scope.html)]) {
    if (seenPhones.has(phone.normalized)) continue;
    seenPhones.add(phone.normalized);
    if (config.phones.has(phone.normalized) || scope.tolerated.phones.has(phone.normalized))
      continue;
    errors.push(
      `${where} : téléphone « ${phone.raw} » absent de site.config.json (contact, agences)`,
    );
  }

  for (const street of extractStreetAddresses(text)) {
    const isAgency = config.agencies.some((a) => addressStartsWith(street.normalized, a.street));
    if (isAgency || matchesFact(street.normalized, scope.tolerated.streets)) continue;
    errors.push(`${where} : adresse « ${street.raw} » ${expected}`);
  }

  for (const postalCity of extractPostalCities(text)) {
    const isAgency = config.agencies.some((a) =>
      addressStartsWith(postalCity.normalized, a.postalCity),
    );
    const isOwn = ownPostalCities.some((own) => addressStartsWith(postalCity.normalized, own));
    if (isAgency || isOwn || matchesFact(postalCity.normalized, scope.tolerated.postalCities))
      continue;
    errors.push(`${where} : code postal et ville « ${postalCity.raw} » ${expectedPostal}`);
  }
  return errors;
}

export interface PageNapOptions {
  config: NapConfig;
  /** Page locale correspondant à la route (content + data), si elle existe. */
  page?: LocalPage | null;
  /** `id` de l'agence pour une page `/agences/{id}/`. */
  agencyId?: string | null;
}

export interface NapReport {
  errors: string[];
  warnings: string[];
}

function mainRegion(html: string): HtmlRegion | null {
  return findElements(html, (tag) => /^<main\b/i.test(tag))[0] ?? null;
}

/** Contrôle NAP d'une page rendue. */
export function auditPageNap(route: string, html: string, options: PageNapOptions): NapReport {
  const { config } = options;
  const page = options.page ?? null;
  const errors: string[] = [];
  const warnings: string[] = [];
  const none: Tolerated = { streets: [], postalCities: [], phones: new Set() };
  const facts = toleratedFromFacts(page);
  const ownPostalCities = territoryPostalCities(page);

  const factsRegions = findMarkedRegions(html, FACTS_ATTRIBUTE, FACTS_CLASS);
  const hasFactsRegion = factsRegions.length > 0;
  if (page?.data && !hasFactsRegion && facts.streets.length + facts.phones.size > 0) {
    warnings.push(
      `${route} : repère ${FACTS_ATTRIBUTE} absent, adresses et téléphones de facts[] tolérés sur toute la page`,
    );
  }
  const outside = removeRegions(html, factsRegions);
  errors.push(
    ...auditScope(
      route,
      { html: outside, label: "", tolerated: hasFactsRegion ? none : facts },
      config,
      ownPostalCities,
    ),
  );
  for (const region of factsRegions) {
    errors.push(
      ...auditScope(
        route,
        { html: region.inner, label: "grille des ressources", tolerated: facts },
        config,
        ownPostalCities,
      ),
    );
  }

  const main = mainRegion(html);
  const mainHtml = main
    ? removeRegions(main.inner, findMarkedRegions(main.inner, FACTS_ATTRIBUTE, FACTS_CLASS))
    : null;
  if (!main) {
    warnings.push(`${route} : pas d'élément <main>, agence affichée non vérifiable`);
  }
  const mainText = mainHtml === null ? null : extractVisibleText(mainHtml);
  const displayedAgencies = (text: string) => {
    const streets = extractStreetAddresses(text).map((s) => s.normalized);
    return config.agencies.filter((a) => streets.some((s) => addressStartsWith(s, a.street)));
  };

  const nearestId = page?.data?.agence_proche?.id;
  if (nearestId && mainText !== null) {
    const nearest = config.agencies.find((a) => a.id === nearestId);
    // Une agence inconnue est signalée par `auditNapData`, pas ici.
    if (nearest) {
      const displayed = displayedAgencies(mainText);
      for (const agency of displayed) {
        if (agency.id !== nearest.id) {
          errors.push(
            `${route} : affiche l'agence ${agency.id} (${agency.display}), l'agence la plus proche est ${nearest.id} (${nearest.display}) (docs/04 §4)`,
          );
        }
      }
      if (!displayed.some((a) => a.id === nearest.id)) {
        warnings.push(
          `${route} : adresse de l'agence la plus proche (${nearest.id}, ${nearest.display}) absente du corps de la page`,
        );
      }
    }
  }

  if (options.agencyId && mainText !== null) {
    const agency = config.agencies.find((a) => a.id === options.agencyId);
    if (!agency) {
      errors.push(`${route} : aucune agence « ${options.agencyId} » dans site.config.json`);
    } else if (!displayedAgencies(mainText).some((a) => a.id === agency.id)) {
      errors.push(
        `${route} : adresse de l'agence ${agency.id} (${agency.display}) absente du corps de la page`,
      );
    }
  }

  return { errors, warnings };
}

/** Cohérence des données, avec ou sans rendu. */
export function auditNapData(pages: readonly LocalPage[], config: NapConfig): NapReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const page of pages) {
    const data = page.data;
    if (!data) continue;
    const nearestId = data.agence_proche?.id;
    if (nearestId && !config.agencies.some((a) => a.id === nearestId)) {
      errors.push(
        `data/local/${page.code}.json : agence_proche.id « ${nearestId} » n'est pas une agence de site.config.json`,
      );
    }
    data.facts.forEach((fact, index) => {
      if (fact.telephone && !normalizePhone(fact.telephone)) {
        warnings.push(
          `data/local/${page.code}.json : facts[${index}].telephone « ${fact.telephone} » n'est pas un numéro français`,
        );
      }
    });
  }
  return { errors, warnings };
}

async function listHtmlFiles(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listHtmlFiles(full)));
    else if (entry.name.endsWith(".html") && !entry.name.startsWith("_")) out.push(full);
  }
  return out.sort();
}

/** Route d'une page d'agence (`/agences/{id}/`) → id ; null pour l'index et les autres pages. */
export function agencyIdOf(route: string): string | null {
  const match = route.match(/^\/agences\/([a-z0-9-]+)\/$/);
  return match?.[1] ?? null;
}

/** Contrôle NAP de tout le rendu des pages locales et d'agence. */
export async function scanNap(
  outputDir: string,
  pages: readonly LocalPage[],
  config: NapConfig,
): Promise<NapReport> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byRoute = new Map<string, LocalPage>();
  for (const page of pages) if (page.data) byRoute.set(page.data.chemin, page);
  const built = new Set<string>();

  const files = [
    ...(await listHtmlFiles(path.join(outputDir, "aide-a-domicile"))),
    ...(await listHtmlFiles(path.join(outputDir, "agences"))),
  ];
  for (const file of files) {
    const route = routeOf(path.relative(outputDir, file));
    const html = await readFile(file, "utf8");
    built.add(route);
    const report = auditPageNap(route, html, {
      config,
      page: byRoute.get(route) ?? null,
      agencyId: agencyIdOf(route),
    });
    errors.push(...report.errors);
    warnings.push(...report.warnings);
  }
  for (const [route, page] of byRoute) {
    if (!built.has(route))
      warnings.push(`${page.file} : page ${route} absente du rendu, NAP non vérifié`);
  }
  return { errors, warnings };
}

export async function runLocalNapCheck(ctx: CheckContext): Promise<CheckResult> {
  const corpus = await loadLocalPages(ctx.rootDir);
  const config = await loadNapConfig(ctx.rootDir);
  const errors: string[] = [];
  const warnings = [...corpus.warnings];
  const dataReport = auditNapData(corpus.pages, config);
  errors.push(...dataReport.errors);
  warnings.push(...dataReport.warnings);

  const outputDir = path.join(ctx.rootDir, ".next", "server", "app");
  let rendered = false;
  try {
    await stat(outputDir);
    rendered = true;
  } catch {
    warnings.push(
      "rendu absent : NAP vérifié sur les données seulement, lancez `pnpm build` pour contrôler les pages (.next/server/app absent)",
    );
  }
  if (rendered) {
    const report = await scanNap(outputDir, corpus.pages, config);
    errors.push(...report.errors);
    warnings.push(...report.warnings);
  }
  return result(errors, warnings);
}

export const checkLocalNap: Check = {
  id: "check-local-nap",
  description:
    "une adresse ou un téléphone d'une page locale ou d'agence diffère de site.config.json ; une page locale affiche une autre agence que la plus proche",
  run: runLocalNapCheck,
};
