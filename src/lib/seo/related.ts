import type { ServicePage, ServicePublic } from "@/content/service-schema";

/*
 * Bloc « À lire aussi » des pages services (docs/04 §2 « Maillage », P5.5) : trois à six liens
 * contextuels calculés par thème, dans un ordre stable, jamais la page elle-même. Paliers, dans
 * l'ordre de présentation :
 *
 * 1. `famille` : les autres sous-pages du même pilier (ou, pour un pilier, ses sous-pages),
 *    par `ordre` puis par chemin ;
 * 2. `soeurs` : les pages sœurs déclarées dans l'en-tête, dans l'ordre déclaré ; elles sont
 *    toujours retenues (docs/03 §2 : chaque page renvoie vers ses sœurs) ;
 * 3. `public` : les autres pages du même public (pour un service transverse : les autres
 *    services), par `ordre` puis par chemin ;
 * 4. `transverse` : les services transverses conseillés pour ce public (`transverseByPublic`,
 *    docs/03 §8) ; pour un service transverse, à l'inverse, les piliers des publics auxquels il
 *    est conseillé ;
 * 5. `piliers` : les autres piliers, par chemin, pour garantir le minimum.
 *
 * Le pilier de rattachement n'est pas repris : le fil d'Ariane et « Pages proches » y mènent
 * déjà. Seules les pages construites (`known`) sont liées : en production, une page `a_relire`
 * n'existe pas. Au-delà du maximum, les sœurs sont gardées et les autres candidats remplissent
 * les places restantes dans l'ordre des paliers. Libellé : `libelle_court`, sinon pour un pilier
 * le nom du public s'il est fourni, sinon le `h1` ; icône : `icone` de la page.
 */

export const RELATED_MIN = 3;
export const RELATED_MAX = 6;

export type RelatedTier = "famille" | "soeurs" | "public" | "transverse" | "piliers";

/** Ce que le calcul lit d'un en-tête de page service. */
export type RelatedSource = Pick<
  ServicePage,
  "chemin" | "type" | "public" | "pilier" | "soeurs" | "h1" | "libelle_court" | "ordre" | "icone"
>;

export interface RelatedLink {
  href: string;
  label: string;
  /** Nom d'icône du registre `Icon` (non vérifié ici : `toIconName` au rendu). */
  icone?: string;
  public: ServicePublic;
  type: ServicePage["type"];
  /** Palier qui a retenu le lien. */
  tier: RelatedTier;
}

export interface RelatedOptions {
  min?: number;
  max?: number;
  /** Libellés des publics (`interface.service.publics`) : nom des piliers sans `libelle_court`. */
  publics?: Partial<Record<ServicePublic, string>>;
}

/** Services transverses conseillés par public, dans l'ordre d'affichage (docs/03 §8). */
export const transverseByPublic: Readonly<
  Record<Exclude<ServicePublic, "transverse">, readonly string[]>
> = {
  neuro: [
    "/services/garde-de-nuit/",
    "/services/presence-24h-24/",
    "/services/garde-malade/",
    "/services/remplacement-d-auxiliaire-de-vie/",
  ],
  "personne-agee": [
    "/services/garde-de-nuit/",
    "/services/sortie-d-hospitalisation/",
    "/services/presence-24h-24/",
    "/services/remplacement-d-auxiliaire-de-vie/",
    "/services/accompagnement-en-vacances/",
  ],
  "adulte-handicap": [
    "/services/remplacement-d-auxiliaire-de-vie/",
    "/services/accompagnement-en-vacances/",
    "/services/presence-24h-24/",
    "/services/garde-de-nuit/",
  ],
  "enfant-handicap": [
    "/services/accompagnement-en-vacances/",
    "/services/remplacement-d-auxiliaire-de-vie/",
    "/services/garde-de-nuit/",
  ],
  aidant: [
    "/services/accompagnement-en-vacances/",
    "/services/garde-de-nuit/",
    "/services/presence-24h-24/",
    "/services/remplacement-d-auxiliaire-de-vie/",
  ],
};

const publicsOrder: readonly Exclude<ServicePublic, "transverse">[] = [
  "neuro",
  "personne-agee",
  "adulte-handicap",
  "enfant-handicap",
  "aidant",
];

function byOrderThenPath(a: RelatedSource, b: RelatedSource): number {
  return (
    (a.ordre ?? Number.MAX_SAFE_INTEGER) - (b.ordre ?? Number.MAX_SAFE_INTEGER) ||
    a.chemin.localeCompare(b.chemin, "fr")
  );
}

function byPath(a: RelatedSource, b: RelatedSource): number {
  return a.chemin.localeCompare(b.chemin, "fr");
}

function toLink(
  source: RelatedSource,
  tier: RelatedTier,
  publics: RelatedOptions["publics"],
): RelatedLink {
  const label =
    source.libelle_court ??
    (source.type === "pilier" ? publics?.[source.public] : undefined) ??
    source.h1;
  return {
    href: source.chemin,
    label,
    ...(source.icone ? { icone: source.icone } : {}),
    public: source.public,
    type: source.type,
    tier,
  };
}

/** Candidats de chaque palier, dans l'ordre, pour une page et l'univers des pages connues. */
export function relatedCandidates(
  page: RelatedSource,
  all: readonly RelatedSource[],
): Record<RelatedTier, RelatedSource[]> {
  const byChemin = new Map(all.map((p) => [p.chemin, p] as const));
  const others = all.filter((p) => p.chemin !== page.chemin);

  const familyRoot = page.type === "pilier" ? page.chemin : page.pilier;
  const famille = familyRoot
    ? others.filter((p) => p.pilier === familyRoot).sort(byOrderThenPath)
    : [];

  const soeurs = page.soeurs
    .map((chemin) => byChemin.get(chemin))
    .filter((p): p is RelatedSource => p !== undefined && p.chemin !== page.chemin);

  const samePublic = others.filter((p) => p.public === page.public).sort(byOrderThenPath);

  let transverse: RelatedSource[];
  if (page.public === "transverse") {
    transverse = publicsOrder
      .filter((pub) => transverseByPublic[pub].includes(page.chemin))
      .flatMap((pub) => others.filter((p) => p.type === "pilier" && p.public === pub));
  } else {
    transverse = transverseByPublic[page.public]
      .map((chemin) => byChemin.get(chemin))
      .filter((p): p is RelatedSource => p !== undefined && p.chemin !== page.chemin);
  }

  const piliers = others.filter((p) => p.type === "pilier").sort(byPath);

  return { famille, soeurs, public: samePublic, transverse, piliers };
}

export function relatedLinks(
  page: RelatedSource,
  all: readonly RelatedSource[],
  options: RelatedOptions = {},
): RelatedLink[] {
  const min = options.min ?? RELATED_MIN;
  const max = Math.max(options.max ?? RELATED_MAX, min);
  const tiers = relatedCandidates(page, all);
  const excluded = new Set([page.chemin, ...(page.pilier ? [page.pilier] : [])]);

  // Candidats dédoublonnés, dans l'ordre des paliers.
  const ordered: RelatedLink[] = [];
  const seen = new Set<string>();
  for (const tier of ["famille", "soeurs", "public", "transverse", "piliers"] as const) {
    for (const source of tiers[tier]) {
      if (excluded.has(source.chemin) || seen.has(source.chemin)) continue;
      seen.add(source.chemin);
      ordered.push(toLink(source, tier, options.publics));
    }
  }
  if (ordered.length <= max) return ordered;

  // Au-delà du maximum : les sœurs déclarées d'abord, puis les autres dans l'ordre des paliers.
  const sisters = new Set(page.soeurs);
  const kept = new Set(ordered.filter((link) => sisters.has(link.href)).map((link) => link.href));
  for (const link of ordered) {
    if (kept.size >= max) break;
    kept.add(link.href);
  }
  return ordered.filter((link) => kept.has(link.href));
}
