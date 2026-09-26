import type { AccompagnementLink } from "@/components/local/LocalTemplate";
import type { BreadcrumbItem } from "@/components/blocks/Breadcrumb/Breadcrumb";
import type { MapDepartment } from "@/components/local/IdfMap";
import { fill, localPlace } from "@/components/local/local-texts";
import { isProduction } from "@/lib/env";
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
    if (isProduction() && meta.statut !== "publie") continue;
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

/** Page de département : pages de communes et d'arrondissements construites, par nom. */
export async function departementPages(
  page: LocalPage,
): Promise<{ href: string; label: string }[]> {
  if (page.data.kind !== "departement") return [];
  const pages = await listBuildableLocalPages();
  return pages
    .filter((p) => p.data.kind !== "departement" && p.data.departement === page.data.code)
    .map((p) => ({ href: p.chemin, label: p.data.nom }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
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
