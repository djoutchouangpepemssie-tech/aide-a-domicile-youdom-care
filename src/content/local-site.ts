import type { AccompagnementLink } from "@/components/local/LocalTemplate";
import type { BreadcrumbItem } from "@/components/blocks/Breadcrumb/Breadcrumb";
import type { MapDepartment } from "@/components/local/IdfMap";
import { fill, localPlace } from "@/components/local/local-texts";
import { distanceKm } from "@/lib/geo/geo";
import { departementCodeOf, listBuildableLocalPages, type LocalPage } from "./local";
import { getInterfaceTexts, getNavigation, getSiteConfig } from "./loader";
import type { Agency, SiteConfig } from "./schemas";
import { listMdxFiles, readServiceMeta, SERVICES_DIR } from "./service-meta";
import type { ServicePage } from "./service-schema";

/*
 * Ce que les pages locales et les pages d'agences partagent, calculé à partir des pages
 * réellement construites : jamais un lien vers une page qui n'existe pas (docs/04 §2, aucune
 * page orpheline, aucun lien mort). Les routes (src/app/aide-a-domicile, src/app/agences) et
 * les plans de site s'appuient dessus. Les en-têtes des services sont lus sans compiler leur
 * corps MDX (service-meta), pour rester utilisables par les scripts CommonJS (`pnpm validate`,
 * `prebuild`).
 */

export function zoneOf(code: string | undefined): SiteConfig["zones"][number] | null {
  if (!code) return null;
  return getSiteConfig().zones.find((zone) => zone.code === code) ?? null;
}

export { departementCodeOf };

/** Page du département `code` si elle est construite, sinon null. */
export async function departementHref(code: string | undefined): Promise<string | null> {
  if (!code) return null;
  const pages = await listBuildableLocalPages();
  return (
    pages.find((page) => page.data.kind === "departement" && departementCodeOf(page) === code)
      ?.chemin ?? null
  );
}

/** « dans les Hauts-de-Seine » pour un code de département. */
export function departementPlace(code: string | undefined): string {
  const zone = zoneOf(code);
  const texts = getInterfaceTexts().local;
  return localPlace(
    { kind: "departement", nom: zone?.nom ?? "", code: code ?? "", departement: code },
    texts,
  );
}

/** Fil d'Ariane avant la page courante : Territoires, puis le département, puis l'arrondissement. */
export async function localCrumbs(page: LocalPage): Promise<BreadcrumbItem[]> {
  const texts = getInterfaceTexts();
  const pages = await listBuildableLocalPages();
  const byCode = new Map(pages.map((p) => [p.data.code, p]));
  const crumbs: BreadcrumbItem[] = [{ label: texts.local.territoires, href: "/aide-a-domicile/" }];
  if (page.data.kind === "departement") return crumbs;
  const departement = departementCodeOf(page);
  const zone = zoneOf(departement);
  if (zone) {
    const target = departement ? byCode.get(departement) : undefined;
    crumbs.push(
      target && target.data.kind === "departement"
        ? { label: zone.nom, href: target.chemin }
        : { label: zone.nom },
    );
  }
  if (page.data.kind === "quartier" && page.data.parent) {
    const parent = byCode.get(page.data.parent);
    if (parent && parent.data.kind !== "departement") {
      crumbs.push({ label: parent.data.nom, href: parent.chemin });
    }
  }
  return crumbs;
}

/** Piliers puis services construits, dans l'ordre de la navigation principale. */
export async function accompagnementLinks(): Promise<AccompagnementLink[]> {
  const navigation = getNavigation();
  const order = new Map<string, number>();
  for (const id of ["pour-qui", "services"]) {
    const children = navigation.principale.find((item) => item.id === id)?.enfants ?? [];
    children.forEach((child) => order.set(child.href, order.size));
  }
  const pages: ServicePage[] = [];
  for (const file of await listMdxFiles(SERVICES_DIR)) {
    const { meta } = await readServiceMeta(file);
    // D-033 : les pages `a_relire` sont construites en production, elles peuvent donc être liées.
    if (meta.type === "pilier" || meta.type === "service") pages.push(meta);
  }
  pages.sort(
    (a, b) =>
      (order.get(a.chemin) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.chemin) ?? Number.MAX_SAFE_INTEGER) || a.chemin.localeCompare(b.chemin, "fr"),
  );
  return pages.map((meta) => ({
    chemin: meta.chemin,
    libelle: meta.libelle_court ?? meta.h1,
    ...(meta.icone ? { icone: meta.icone } : {}),
  }));
}

/**
 * Page de département : pages de communes et d'arrondissements construites, par nom.
 *
 * Le tri est **numérique** (`numeric: true`), et ce n'est pas un détail de confort : les vingt
 * arrondissements de Paris s'appellent « Paris 1er Arrondissement », « Paris 10e Arrondissement »,
 * et une comparaison alphabétique ordinaire les range 10e, 11e … 19e, **1er**, 20e, 2e, 3e … Le
 * 1er arrivait en onzième position et le 2e en treizième : un visiteur qui parcourt la liste croit
 * qu'il en manque (relevé par Arcel le 09/10/2026). La collation numérique compare les suites de
 * chiffres comme des nombres et rétablit 1er, 2e, 3e … 20e.
 */
export async function departementPages(
  page: LocalPage,
): Promise<{ href: string; label: string }[]> {
  if (page.data.kind !== "departement") return [];
  const pages = await listBuildableLocalPages();
  return pages
    .filter((p) => p.data.kind !== "departement" && p.data.departement === page.data.code)
    .map((p) => ({ href: p.chemin, label: p.data.nom }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr", { numeric: true }));
}

/** Chemins des communes voisines qui ont une page construite, par code INSEE. */
export async function neighbourPaths(page: LocalPage): Promise<Record<string, string>> {
  const pages = await listBuildableLocalPages();
  const byCode = new Map(pages.map((p) => [p.data.code, p.chemin]));
  const out: Record<string, string> = {};
  for (const neighbour of page.data.communes_voisines ?? []) {
    const chemin = byCode.get(neighbour.code);
    if (chemin) out[neighbour.code] = chemin;
  }
  return out;
}

export interface AgencyCoverage {
  code: string;
  nom: string;
  chemin: string;
  distance_km: number;
}

/** Pages locales construites dont l'agence est la plus proche, par distance. */
export async function agencyCommunes(agency: Pick<Agency, "id">): Promise<AgencyCoverage[]> {
  const pages = await listBuildableLocalPages();
  return pages
    .filter((page) => page.data.kind !== "departement" && page.data.agence_proche?.id === agency.id)
    .map((page) => ({
      code: page.data.code,
      nom: page.data.nom,
      chemin: page.chemin,
      distance_km: page.data.agence_proche?.distance_km ?? 0,
    }))
    .sort((a, b) => a.distance_km - b.distance_km || a.nom.localeCompare(b.nom, "fr"));
}

/** Les huit départements pour la carte régionale, avec leur page quand elle est construite. */
export async function mapDepartments(): Promise<MapDepartment[]> {
  const texts = getInterfaceTexts().local;
  const out: MapDepartment[] = [];
  for (const zone of getSiteConfig().zones) {
    const href = await departementHref(zone.code);
    out.push({
      code: zone.code,
      nom: zone.nom,
      href,
      label: fill(texts.carte.lien, { lieu: departementPlace(zone.code) }),
    });
  }
  return out;
}

/** Lien « Politique de confidentialité » du pied de page, avec un repli. */
export function confidentialiteHref(): string {
  return (
    getNavigation().pied_de_page.legal.find((l) => /confidentialit/i.test(l.libelle))?.href ??
    "/politique-de-confidentialite/"
  );
}

export interface NearbyPage {
  code: string;
  nom: string;
  chemin: string;
  distance_km: number;
}

/** Pages liées par proximité que chaque commune ou arrondissement doit au moins compter. */
export const NEARBY_PAGES = 3;

/**
 * Pages construites les plus proches d'une commune ou d'un arrondissement, hors ses voisines
 * déclarées (P9.4, docs/04 §2 « au moins trois liens contextuels ») : quand moins de
 * `NEARBY_PAGES` voisines de `communes_voisines` ont une page, les pages du même département
 * les plus proches par la distance entre centres complètent la liste ; le lien est rendu
 * réciproque (si A cite B, B cite A), ce qui garantit à chaque page au moins ce nombre de liens
 * entrants depuis son voisinage. Les distances viennent des centres des territoires (haversine),
 * à une décimale comme les voisines déclarées. Une page de département ou sans centre : rien.
 */
export async function nearbyPages(page: LocalPage): Promise<NearbyPage[]> {
  if (page.data.kind === "departement") return [];
  const pages = (await listBuildableLocalPages()).filter(
    (p) => p.data.kind !== "departement" && departementCodeOf(p) === departementCodeOf(page),
  );
  const byCode = new Map(pages.map((p) => [p.data.code, p] as const));
  const linked = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    linked.set(a, (linked.get(a) ?? new Set()).add(b));
    linked.set(b, (linked.get(b) ?? new Set()).add(a));
  };
  for (const current of pages) {
    if (!current.data.centre) continue;
    const declared = new Set((current.data.communes_voisines ?? []).map((n) => n.code));
    const alreadyLinked = [...declared].filter((code) => byCode.has(code)).length;
    const needed = NEARBY_PAGES - alreadyLinked;
    if (needed <= 0) continue;
    const centre = current.data.centre;
    pages
      .filter(
        (p) => p.data.code !== current.data.code && !declared.has(p.data.code) && p.data.centre,
      )
      .map((p) => ({
        code: p.data.code,
        km: p.data.centre ? distanceKm(centre, p.data.centre) : 0,
      }))
      .sort((a, b) => a.km - b.km || a.code.localeCompare(b.code))
      .slice(0, needed)
      .forEach((near) => link(current.data.code, near.code));
  }
  const centre = page.data.centre;
  if (!centre) return [];
  const declared = new Set((page.data.communes_voisines ?? []).map((n) => n.code));
  return [...(linked.get(page.data.code) ?? [])]
    .filter((code) => !declared.has(code))
    .flatMap((code) => {
      const target = byCode.get(code);
      if (!target?.data.centre) return [];
      return [
        {
          code,
          nom: target.data.nom,
          chemin: target.chemin,
          distance_km: Math.round(distanceKm(centre, target.data.centre) * 10) / 10,
        },
      ];
    })
    .sort((a, b) => a.distance_km - b.distance_km || a.nom.localeCompare(b.nom, "fr"));
}
