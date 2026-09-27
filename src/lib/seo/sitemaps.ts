import { getAidPage, listAidPageIds } from "@/content/aid-pages";
import { listFormDefinitions } from "@/content/form-definitions";
import { getSiteConfig } from "@/content/loader";
import { departementCodeOf, listIndexableLocalPages, type LocalPage } from "@/content/local";
import { listMdxFiles, readServiceMeta, SERVICES_DIR } from "@/content/service-meta";
import { neverIndexedPaths } from "./indexable";

/*
 * Plans de site segmentés (docs/04 §2, P5.3) : un index `/sitemap.xml` (src/app/sitemap.xml/route.ts)
 * liste des segments `/sitemap/{id}.xml` (src/app/sitemap/[segment]/route.ts). Deux Route
 * Handlers statiques plutôt que `generateSitemaps` : Next réserve alors /sitemap.xml sans le servir
 * et refuse tout index manuel à cette adresse (« Conflicting route and metadata »). Chaque segment
 * déclare ici la fonction qui renvoie ses adresses ; un segment vide n'est ni listé dans l'index
 * ni généré. Les segments locaux, magazine, lexique et agences sont prêts et vides tant que leurs
 * contenus n'existent pas (phases 6 à 8) ; les segments locaux et `agences` sont alimentés
 * depuis la phase 6 (pages locales publiées de src/content/local.ts, agences de site.config.json).
 *
 * `lastmod` est toujours une date de contenu, jamais la date du build :
 * - services et pathologies : `maj` de l'en-tête MDX ;
 * - pages détaillées des aides : `maj` de content/aides/{id}.json ;
 * - pages locales : `maj` de content/local/{code}.json (pages `publie` seulement) ;
 * - pages d'agences : date déclarée `agencesLastmod` (contenu de site.config.json et
 *   content/pages/agences.json), à avancer avec le contenu ;
 * - pages dont le JSON n'a pas de champ de date (content/pages, content/formulaires) : date
 *   déclarée dans `declaredLastmod`, à avancer avec le contenu. Le test vérifie que chaque
 *   route statique construite a sa date. La date de modification du fichier n'est pas fiable :
 *   Vercel clone le dépôt à chaque build et toutes les dates de fichiers deviennent celle du build.
 *
 * Tout ce qui est `noindex` reste dehors : chemins de `neverIndexedPaths` (/api/, /merci/,
 * /styleguide/) et pages services `a_relire`, construites en prévisualisation mais en noindex
 * (docs/03 §1). Quand `isIndexable()` est faux, les plans de site sont quand même générés : c'est
 * robots.txt qui ferme le site (src/app/robots.ts).
 */

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Chemin interne indexable : minuscules, tirets, barre finale. */
const INTERNAL_PATH = /^\/(?:[a-z0-9-]+\/)*$/;

export interface SitemapEntry {
  /** Chemin interne, en minuscules avec barre finale. */
  path: string;
  /** Date de dernière modification du contenu, AAAA-MM-JJ. */
  lastmod: string;
}

export const sitemapSegmentIds = [
  "pages",
  "services",
  "local-paris",
  "local-seine-et-marne",
  "local-yvelines",
  "local-essonne",
  "local-hauts-de-seine",
  "local-seine-saint-denis",
  "local-val-de-marne",
  "local-val-d-oise",
  "magazine",
  "lexique",
  "agences",
] as const;
export type SitemapSegmentId = (typeof sitemapSegmentIds)[number];

export interface SitemapSegment {
  id: SitemapSegmentId;
  /** Adresses brutes du segment ; `segmentEntries` les filtre, dédoublonne et trie. */
  entries: () => Promise<SitemapEntry[]>;
}

export interface PopulatedSegment {
  id: SitemapSegmentId;
  entries: SitemapEntry[];
}

/**
 * Dates déclarées des pages sans champ `maj` dans leur contenu. Clé : chemin de la route ;
 * valeur : date de la dernière révision éditoriale du contenu correspondant. Avancer la date
 * quand le JSON change (content/pages/*.json, content/formulaires/*.json, content/tarifs.json).
 */
export const declaredLastmod: Readonly<Record<string, string>> = {
  "/": "2026-09-20",
  "/comment-ca-marche/": "2026-09-20",
  "/comment-ca-marche/prestataire-ou-mandataire/": "2026-09-20",
  "/tarifs-et-aides/": "2026-09-20",
  "/a-propos/": "2026-09-20",
  "/a-propos/nos-engagements/": "2026-09-20",
  "/a-propos/charte-editoriale/": "2026-09-20",
  "/aidants/ou-en-etes-vous/": "2026-09-20",
  "/etre-rappele/": "2026-09-20",
  "/contact/": "2026-09-20",
  "/plan-du-site/": "2026-09-20",
  "/demande/": "2026-09-20",
  "/demande/professionnel/": "2026-09-20",
  "/demande/sortie-d-hospitalisation/": "2026-09-20",
  "/demande/adulte-handicap/": "2026-09-20",
  "/demande/enfant-handicap/": "2026-09-20",
  "/demande/maladie-neurodegenerative/": "2026-09-20",
  "/demande/nuit-et-24h/": "2026-09-20",
  "/demande/personne-agee/": "2026-09-20",
  "/demande/relais-aidant/": "2026-09-20",
  "/aide-a-domicile/": "2026-09-20",
  "/agences/": "2026-09-20",
};

/** Date de la dernière révision des pages d'agences (site.config.json > agences, content/pages/agences.json). */
export const agencesLastmod = "2026-09-20";

/** Segment `pages` : routes statiques (date déclarée) et pages d'aides (`maj` du JSON). */
async function pagesEntries(): Promise<SitemapEntry[]> {
  const declared = Object.entries(declaredLastmod).map(([path, lastmod]) => ({ path, lastmod }));

  // Chaque formulaire détaillé construit doit avoir sa date : sinon le build s'arrête ici.
  for (const definition of listFormDefinitions()) {
    const path = `/demande/${definition.slug}/`;
    if (!(path in declaredLastmod)) {
      throw new Error(`sitemaps : aucune date déclarée pour ${path} (declaredLastmod)`);
    }
  }

  const aids = listAidPageIds().flatMap((id) => {
    const page = getAidPage(id);
    return page ? [{ path: `/tarifs-et-aides/${id}/`, lastmod: page.maj }] : [];
  });

  return [...declared, ...aids];
}

/** Segment `services` : pages relues seulement ; une page `a_relire` est en noindex. */
async function servicesEntries(): Promise<SitemapEntry[]> {
  const files = await listMdxFiles(SERVICES_DIR);
  const entries: SitemapEntry[] = [];
  for (const file of files) {
    const { meta } = await readServiceMeta(file);
    if (meta.statut !== "publie") continue;
    entries.push({ path: meta.chemin, lastmod: meta.maj });
  }
  return entries;
}

/** Segment prêt mais sans contenu pour l'instant. */
const empty = async (): Promise<SitemapEntry[]> => [];

/** Segment `local-{departement}` : pages locales publiées du département, datées par `maj`. */
function localEntries(departement: string): () => Promise<SitemapEntry[]> {
  return async () => {
    const pages = await listIndexableLocalPages();
    return pages
      .filter((page: LocalPage) => departementCodeOf(page) === departement)
      .map((page) => ({ path: page.chemin, lastmod: page.editorial.maj }));
  };
}

/** Segment `agences` : une page par agence réelle de site.config.json. */
async function agencesEntries(): Promise<SitemapEntry[]> {
  return getSiteConfig().agences.map((agency) => ({
    path: `/agences/${agency.id}/`,
    lastmod: agencesLastmod,
  }));
}

export const sitemapSegments: readonly SitemapSegment[] = [
  { id: "pages", entries: pagesEntries },
  { id: "services", entries: servicesEntries },
  // Référencement local (docs/04 §4), phase 6 : /aide-a-domicile/{departement}/… par département.
  { id: "local-paris", entries: localEntries("75") },
  { id: "local-seine-et-marne", entries: localEntries("77") },
  { id: "local-yvelines", entries: localEntries("78") },
  { id: "local-essonne", entries: localEntries("91") },
  { id: "local-hauts-de-seine", entries: localEntries("92") },
  { id: "local-seine-saint-denis", entries: localEntries("93") },
  { id: "local-val-de-marne", entries: localEntries("94") },
  { id: "local-val-d-oise", entries: localEntries("95") },
  // Magazine « Le Fil » et lexique (docs/06), phase 8.
  { id: "magazine", entries: empty },
  { id: "lexique", entries: empty },
  // Pages d'agences (/agences/{id}/), phase 6.
  { id: "agences", entries: agencesEntries },
];

/** Vrai pour un chemin interne bien formé qui n'est pas dans une zone jamais indexée. */
export function isSitemapPath(path: string): boolean {
  return INTERNAL_PATH.test(path) && !neverIndexedPaths.some((prefix) => path.startsWith(prefix));
}

/** Filtre les chemins non indexables, vérifie les dates, dédoublonne et trie par chemin. */
export function normalizeEntries(entries: readonly SitemapEntry[]): SitemapEntry[] {
  const byPath = new Map<string, SitemapEntry>();
  for (const entry of entries) {
    if (!ISO_DATE.test(entry.lastmod)) {
      throw new Error(`sitemaps : lastmod invalide pour ${entry.path} (« ${entry.lastmod} »)`);
    }
    if (!isSitemapPath(entry.path)) continue;
    const known = byPath.get(entry.path);
    if (!known || known.lastmod < entry.lastmod) byPath.set(entry.path, entry);
  }
  return [...byPath.values()].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export function getSitemapSegment(id: string): SitemapSegment | null {
  return sitemapSegments.find((segment) => segment.id === id) ?? null;
}

/** Adresses finales d'un segment ; `null` pour un identifiant inconnu. */
export async function segmentEntries(id: string): Promise<SitemapEntry[] | null> {
  const segment = getSitemapSegment(id);
  if (!segment) return null;
  return normalizeEntries(await segment.entries());
}

/** Segments non vides, dans l'ordre de déclaration. */
export async function listPopulatedSegments(): Promise<PopulatedSegment[]> {
  const populated: PopulatedSegment[] = [];
  for (const segment of sitemapSegments) {
    const entries = normalizeEntries(await segment.entries());
    if (entries.length > 0) populated.push({ id: segment.id, entries });
  }
  return populated;
}

/** Origine publique du site, sans barre finale (content/site.config.json > marque.url). */
export function siteUrl(): string {
  return getSiteConfig().marque.url.replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path}`;
}

export const SITEMAP_INDEX_PATH = "/sitemap.xml";

export function segmentPath(id: string): string {
  return `/sitemap/${id}.xml`;
}

export function sitemapIndexUrl(): string {
  return absoluteUrl(SITEMAP_INDEX_PATH);
}

/** Date la plus récente d'un segment (les dates ISO se comparent comme des chaînes). */
export function latestLastmod(entries: readonly SitemapEntry[]): string | undefined {
  let latest: string | undefined;
  for (const entry of entries) {
    if (latest === undefined || entry.lastmod > latest) latest = entry.lastmod;
  }
  return latest;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export interface SitemapIndexItem {
  loc: string;
  lastmod?: string;
}

/** Index XML (protocole sitemaps.org) ; une entrée par segment non vide. */
export function renderSitemapIndex(items: readonly SitemapIndexItem[]): string {
  const body = items
    .map((item) => {
      const lastmod = item.lastmod ? `<lastmod>${escapeXml(item.lastmod)}</lastmod>` : "";
      return `  <sitemap><loc>${escapeXml(item.loc)}</loc>${lastmod}</sitemap>`;
    })
    .join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    "</sitemapindex>",
    "",
  ].join("\n");
}

/** Plan de site d'un segment (protocole sitemaps.org) : adresses absolues et `lastmod`. */
export function renderUrlset(entries: readonly SitemapEntry[]): string {
  const body = entries
    .map(
      (entry) =>
        `  <url><loc>${escapeXml(absoluteUrl(entry.path))}</loc><lastmod>${escapeXml(entry.lastmod)}</lastmod></url>`,
    )
    .join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    "</urlset>",
    "",
  ].join("\n");
}

export async function buildSitemapIndex(): Promise<string> {
  const segments = await listPopulatedSegments();
  return renderSitemapIndex(
    segments.map(({ id, entries }) => ({
      loc: absoluteUrl(segmentPath(id)),
      lastmod: latestLastmod(entries),
    })),
  );
}
