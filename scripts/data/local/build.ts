import {
  localDataSchema,
  localThresholds,
  type LocalData,
  type LocalFact,
  type TerritoryKind,
} from "../../../src/content/local-schema";
import type { LatLng } from "../../../src/lib/geo/geo";
import { isStreetAddress, normalizeAddress, type BanLookup } from "./ban";
import { countByType, dedupeFacts, fact, sortFacts } from "./facts";
import { type DepartementCode, type GeoData, IDF_DEPARTEMENTS, PARIS_COMMUNE } from "./geo-api";
import { computeShares, sumCounts, type AgeCounts, type InseeData } from "./insee";
import {
  arrondissementName,
  arrondissementNumber,
  arrondissementPath,
  arrondissementSlug,
  communePath,
  departementPath,
  regionPath,
  slugify,
} from "./slug";
import { annuaireFacts, type AnnuaireData } from "./sources/annuaire";
import { cnsaFacts, type CnsaData } from "./sources/cnsa";
import { finessFacts, type FinessData } from "./sources/finess";
import { manualFacts, MANUAL_SOURCES } from "./sources/manual";
import { parisFacts, type ParisData, type ParisQuartier } from "./sources/paris";
import { unapeiFacts, type UnapeiData } from "./sources/unapei";
import {
  departementAgency,
  nearestAgency,
  nearestNeighbours,
  selectWave1,
  type Agency,
  type TerritoryCommune,
  type WaveMotif,
} from "./territoires";
import type { SourceRef, TerritoryContext } from "./types";

/*
 * Assemblage des fichiers data/local/{code}.json (docs/04 §4 et §5) à partir des sources
 * chargées, puis contrôle croisé avec data/territoires.seed.json.
 */

export interface Zone {
  code: string;
  nom: string;
  slug: string;
}

export interface BuildInputs {
  geo: GeoData;
  agencies: Agency[];
  zones: Zone[];
  insee: InseeData | null;
  annuaire: AnnuaireData;
  cnsa: CnsaData;
  finess: FinessData;
  paris: ParisData;
  unapei: UnapeiData;
  /** Décisions de la Base Adresse Nationale par adresse normalisée (ban.ts) ; absent : pas de géocodage. */
  ban?: BanLookup;
  today: string;
}

export interface TerritoryReport {
  code: string;
  nom: string;
  kind: TerritoryKind;
  chemin: string;
  motif?: string;
  facts: number;
  /** Faits situés dans le territoire même (`in_territory`), hors faits départementaux ou régionaux. */
  in_territory: number;
  required: number | null;
  byType: Record<string, number>;
  missingTypes: string[];
}

/** Fait parisien déplacé d'un arrondissement à un autre sur décision de la BAN. */
export interface Relocation {
  label: string;
  type: LocalFact["type"];
  address: string;
  from: string;
  to: string;
  /** Faux si l'arrondissement d'arrivée n'a pas de page de vague 1 (le fait est seulement retiré). */
  added: boolean;
}

/** Fait parisien avec adresse de voie pour lequel la BAN n'a pas tranché. */
export interface UndecidedFact {
  label: string;
  type: LocalFact["type"];
  address: string;
  code: string;
  in_territory: boolean;
}

export interface BuildResult {
  files: LocalData[];
  reports: TerritoryReport[];
  relocations: Relocation[];
  undecided: UndecidedFact[];
}

type Draft = Omit<LocalData, "facts" | "sources"> & { facts: LocalFact[]; sources: SourceRef[] };

/** Commune ou arrondissement assemblé mais pas encore validé : les faits parisiens peuvent encore bouger. */
export interface PendingTerritory {
  ctx: TerritoryContext;
  motif: WaveMotif;
  draft: Omit<Draft, "sources">;
  baseSources: SourceRef[];
}

const LISEZMOI =
  "Fichier produit par `pnpm data:local` (scripts/data/local) à partir des sources ouvertes listées dans `sources` : ne pas modifier à la main (docs/04 §5). Chaque fait porte sa source et sa date de collecte.";

const EXPECTED_TYPES: Record<Exclude<TerritoryKind, "region" | "quartier">, readonly LocalFact["type"][]> = {
  commune: ["demographie", "point-information", "ccas", "mdph", "aide-departementale", "accueil-jour", "hopital", "transport-adapte", "association"],
  arrondissement: ["demographie", "point-information", "ccas", "mdph", "accueil-jour", "hopital", "transport-adapte", "association", "marche", "espace-vert", "equipement-seniors"],
  departement: ["demographie", "point-information", "plateforme-repit", "mdph", "aide-departementale", "ehpad", "hopital", "transport-adapte", "association"],
};

function toTerritoryCommune(c: GeoData["communes"][number]): TerritoryCommune {
  return { code: c.code, nom: c.nom, departement: c.departement, type: c.type, population: c.population, centre: c.centre };
}

function demographyFacts(counts: AgeCounts | null, insee: InseeData | null, nom: string): {
  demographie: LocalData["demographie"];
  facts: LocalFact[];
} {
  if (!counts || !insee) return { demographie: undefined, facts: [] };
  const shares = computeShares(counts);
  const common = {
    source_url: insee.source_url,
    source_label: `Insee, recensement de la population ${insee.millesime} (base « Évolution et structure de la population »)`,
    collected_at: insee.collected_at,
  };
  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const facts = [
    fact({ type: "demographie", label: `Population (${insee.millesime})`, value: `${fmt(shares.population)} habitants (${nom})`, ...common }),
    fact({ type: "demographie", label: "Part des 60-74 ans", value: `${fmt(shares.part_60_74)} % de la population`, ...common }),
    fact({
      type: "demographie",
      label: "Part des 75 ans et plus",
      value: `${fmt(shares.part_75_plus)} % de la population (75-89 ans : ${fmt(shares.part_75_89)} % ; 90 ans ou plus : ${fmt(shares.part_90_plus)} %)`,
      ...common,
    }),
  ];
  return {
    demographie: {
      millesime: insee.millesime,
      population: shares.population,
      part_60_74: shares.part_60_74,
      part_75_89: shares.part_75_89,
      part_90_plus: shares.part_90_plus,
      part_75_plus: shares.part_75_plus,
      source_url: insee.source_url,
      collected_at: insee.collected_at,
    },
    facts,
  };
}

export function buildTerritories(inputs: BuildInputs): BuildResult {
  const { geo, agencies, zones, insee, today } = inputs;
  const communes = geo.communes.map(toTerritoryCommune);
  const wave = selectWave1(communes, agencies);
  const zoneByCode = new Map(zones.map((z) => [z.code, z]));
  const centres = new Map(geo.communes.map((c) => [c.code, { nom: c.nom, centre: c.centre }]));
  const geoSource = (dep: DepartementCode, kind: TerritoryKind): SourceRef => ({
    label: "API Découpage administratif (geo.api.gouv.fr)",
    url: kind === "arrondissement" ? geo.urls.arrondissements : geo.urls.communes[dep] ?? geo.urls.departements,
    collected_at: geo.collected_at,
  });
  const files: LocalData[] = [];
  const reports: TerritoryReport[] = [];

  const finish = (draft: Draft, motif?: WaveMotif) => {
    const facts = sortFacts(dedupeFacts(draft.facts));
    const sources = dedupeSources(draft.sources);
    const data = localDataSchema.parse({ ...draft, facts, sources });
    files.push(data);
    const required = data.kind === "region" || data.kind === "quartier" ? null : localThresholds[data.kind].faits;
    const byType = countByType(facts);
    const expected = data.kind === "region" || data.kind === "quartier" ? [] : EXPECTED_TYPES[data.kind];
    reports.push({
      code: data.code,
      nom: data.nom,
      kind: data.kind,
      chemin: data.chemin,
      motif,
      facts: facts.length,
      in_territory: facts.filter((f) => f.in_territory === true).length,
      required,
      byType,
      missingTypes: expected.filter((t) => !byType[t]),
    });
  };

  const sourcesFor = (facts: LocalFact[], base: SourceRef[], departement?: DepartementCode): SourceRef[] => {
    const used = new Set(facts.map((f) => f.source_url));
    const refs = [...base];
    const add = (ref: SourceRef | null | undefined, when: boolean) => {
      if (ref && when) refs.push(ref);
    };
    add(insee ? { label: "Insee — recensement de la population (base communale)", url: insee.source_url, collected_at: insee.collected_at } : null, used.has(insee?.source_url ?? ""));
    const annuaireUsed = facts.some((f) => f.source_url.startsWith("https://lannuaire.service-public.gouv.fr/"));
    add(departement ? inputs.annuaire.sourceByDepartement[departement] : null, annuaireUsed);
    for (const s of inputs.cnsa.sources) add(s, used.has(s.url));
    add(inputs.finess.source, used.has(inputs.finess.source?.url ?? ""));
    for (const s of inputs.paris.sources) add(s, used.has(s.url));
    add(inputs.unapei.source, used.has(inputs.unapei.source?.url ?? ""));
    for (const s of MANUAL_SOURCES) add(s, facts.some((f) => f.source_label?.startsWith(s.label.split(" — ")[0] ?? "") && f.collected_at === s.collected_at && (f.source_url === s.url || f.source_url.startsWith(new URL(s.url).origin))));
    return refs;
  };

  // Communes et arrondissements de la vague 1 : assemblés puis, pour Paris, corrigés par la BAN
  // (relocateParisFacts) avant validation.
  const pending: PendingTerritory[] = [];
  for (const c of geo.communes) {
    const motif = wave.get(c.code);
    if (!motif || c.code === PARIS_COMMUNE) continue;
    const zone = zoneByCode.get(c.departement);
    if (!zone) throw new Error(`département ${c.departement} absent de site.config.json > zones`);
    const isArr = c.type === "arrondissement";
    const ctx: TerritoryContext = {
      code: c.code,
      kind: isArr ? "arrondissement" : "commune",
      nom: isArr ? arrondissementName(c.code) : c.nom,
      departement: c.departement,
      codes_postaux: c.codes_postaux,
      arrondissement: isArr ? arrondissementNumber(c.code) : undefined,
      centre: c.centre,
    };
    const demo = demographyFacts(insee?.counts.get(c.code) ?? null, insee, ctx.nom);
    const facts: LocalFact[] = [...demo.facts];
    facts.push(...annuaireFacts(inputs.annuaire, ctx));
    facts.push(...cnsaFacts(inputs.cnsa, ctx, isArr ? { ehpad: 6, residence: 6, accueil: 6, points: 4 } : { ehpad: 5, residence: 5, accueil: 5, points: 4 }));
    facts.push(...finessFacts(inputs.finess, ctx, centres));
    facts.push(...parisFacts(inputs.paris, ctx));
    facts.push(...manualFacts(ctx));
    facts.push(...unapeiFacts(inputs.unapei, ctx));
    const epciNom = c.epci ? geo.epcis.get(c.epci) : undefined;
    if (c.epci && epciNom) {
      facts.push(
        fact({
          type: "autre",
          label: "Intercommunalité",
          value: epciNom,
          source_url: geo.urls.communes[c.departement] ?? geo.urls.departements,
          source_label: "API Découpage administratif (geo.api.gouv.fr)",
          collected_at: geo.collected_at,
        }),
      );
    }
    const neighbours = nearestNeighbours(toTerritoryCommune(c), communes).map((n) => ({
      code: n.code,
      nom: n.code.startsWith("751") ? arrondissementName(n.code) : n.nom,
      slug: n.code.startsWith("751") ? arrondissementSlug(n.code) : slugify(n.nom),
      distance_km: n.distance_km,
      page: wave.has(n.code),
    }));
    pending.push({
      ctx,
      motif,
      baseSources: [geoSource(c.departement, ctx.kind)],
      draft: {
        _lisezmoi: LISEZMOI,
        code: c.code,
        kind: ctx.kind,
        nom: ctx.nom,
        chemin: isArr ? arrondissementPath(c.code) : communePath(zone.slug, slugify(c.nom)),
        slug: isArr ? arrondissementSlug(c.code) : slugify(c.nom),
        departement: c.departement,
        departement_nom: zone.nom,
        codes_postaux: c.codes_postaux,
        parent: c.departement,
        epci: c.epci && epciNom ? { code: c.epci, nom: epciNom } : undefined,
        centre: c.centre ?? undefined,
        superficie_ha: c.superficie_ha ?? undefined,
        population: c.population ?? undefined,
        demographie: demo.demographie,
        agence_proche: c.centre ? (nearestAgency(c.centre, agencies) ?? undefined) : undefined,
        communes_voisines: neighbours,
        vague: 1,
        motif_vague: motif,
        facts: locateFacts(facts, ctx),
        generated_at: today,
      },
    });
  }
  const { relocations, undecided } = relocateParisFacts(pending, inputs.ban);
  for (const p of pending) {
    finish({ ...p.draft, sources: sourcesFor(p.draft.facts, p.baseSources, p.ctx.departement) }, p.motif);
  }

  // Départements.
  const departementCounts = new Map<DepartementCode, AgeCounts | null>();
  for (const dep of IDF_DEPARTEMENTS) {
    const geoDep = geo.departements.find((d) => d.code === dep);
    const zone = zoneByCode.get(dep);
    if (!geoDep || !zone) throw new Error(`département ${dep} introuvable`);
    const communeCodes = geo.communes.filter((c) => c.departement === dep && c.type === "commune").map((c) => c.code);
    const counts = insee ? communeCounts(insee, communeCodes) : null;
    departementCounts.set(dep, counts);
    const chefLieu = centres.get(geoDep.chefLieu)?.centre ?? centroid(geo.communes.filter((c) => c.departement === dep));
    const agence = departementAgency(dep, chefLieu, agencies);
    if (!agence) throw new Error(`département ${dep} : aucun centre connu pour déterminer l'agence la plus proche`);
    const ctx: TerritoryContext = { code: dep, kind: "departement", nom: zone.nom, departement: dep, codes_postaux: [], centre: chefLieu };
    const demo = demographyFacts(counts, insee, zone.nom);
    const facts: LocalFact[] = [...demo.facts];
    facts.push(...annuaireFacts(inputs.annuaire, ctx));
    facts.push(...cnsaFacts(inputs.cnsa, ctx, { ehpad: 0, residence: 0, accueil: 0, points: 0 }));
    facts.push(...finessFacts(inputs.finess, ctx, centres));
    facts.push(...manualFacts(ctx));
    facts.push(...unapeiFacts(inputs.unapei, ctx));
    const population = geo.communes.filter((c) => c.departement === dep && c.type === "commune").reduce((sum, c) => sum + (c.population ?? 0), 0);
    finish({
      _lisezmoi: LISEZMOI,
      code: dep,
      kind: "departement",
      nom: zone.nom,
      chemin: departementPath(zone.slug),
      slug: zone.slug,
      departement: dep,
      departement_nom: zone.nom,
      parent: "idf",
      centre: chefLieu ?? undefined,
      population,
      demographie: demo.demographie,
      agence_proche: agence,
      vague: 1,
      motif_vague: "departement",
      facts,
      sources: sourcesFor(facts, [{ label: "API Découpage administratif (geo.api.gouv.fr)", url: geo.urls.departements, collected_at: geo.collected_at }], dep),
      generated_at: today,
    });
  }

  // Région.
  const regionCounts = insee ? sumCounts([...departementCounts.values()].filter((c): c is AgeCounts => c !== null)) : null;
  const regionCtx: TerritoryContext = { code: "idf", kind: "region", nom: geo.region.nom, codes_postaux: [], centre: null };
  const regionDemo = demographyFacts(regionCounts && regionCounts.population > 0 ? regionCounts : null, insee, geo.region.nom);
  const regionFacts: LocalFact[] = [...regionDemo.facts, ...manualFacts(regionCtx), ...unapeiFacts(inputs.unapei, regionCtx)];
  finish({
    _lisezmoi: LISEZMOI,
    code: "idf",
    kind: "region",
    nom: geo.region.nom,
    chemin: regionPath(),
    slug: slugify(geo.region.nom),
    population: geo.communes.filter((c) => c.type === "commune").reduce((sum, c) => sum + (c.population ?? 0), 0),
    demographie: regionDemo.demographie,
    vague: 1,
    motif_vague: "region",
    facts: regionFacts,
    sources: sourcesFor(regionFacts, [{ label: "API Découpage administratif (geo.api.gouv.fr)", url: geo.urls.departements, collected_at: geo.collected_at }]),
    generated_at: today,
  });

  files.sort((a, b) => a.code.localeCompare(b.code));
  reports.sort((a, b) => a.code.localeCompare(b.code));
  return { files, reports, relocations, undecided };
}

/**
 * Types jamais soumis à la BAN : lieux étendus (parcs, marchés) dont l'adresse publiée est une
 * entrée ou un tronçon, souvent en limite d'arrondissement (le jardin d'Éole, 18e, a son entrée
 * rue du Département côté 19e) ; l'arrondissement donné par la Ville de Paris fait foi.
 */
const BAN_EXCLUDED_TYPES: ReadonlySet<LocalFact["type"]> = new Set(["espace-vert", "marche"]);

/** Fait d'arrondissement dont l'adresse de voie est soumise à la BAN (ban.ts). */
function banCandidate(f: LocalFact): f is LocalFact & { address: string } {
  return f.address !== undefined && !BAN_EXCLUDED_TYPES.has(f.type) && isStreetAddress(f.address);
}

/** Adresses de voie des faits des arrondissements de Paris (une par adresse normalisée), à géocoder. */
export function parisStreetAddresses(files: readonly LocalData[]): string[] {
  const seen = new Map<string, string>();
  for (const file of files) {
    if (file.kind !== "arrondissement") continue;
    for (const f of file.facts) {
      if (!banCandidate(f)) continue;
      const key = normalizeAddress(f.address);
      if (!seen.has(key)) seen.set(key, f.address);
    }
  }
  return [...seen.values()];
}

/**
 * Applique aux arrondissements de Paris les décisions de la Base Adresse Nationale (règle et
 * motif dans ban.ts). Pour chaque fait à adresse de voie tranché par la BAN :
 * - situé dans l'arrondissement du fichier : `commune_insee` prend ce code, `in_territory` vrai ;
 * - situé ailleurs alors que le fichier le présentait comme sur place (`in_territory` vrai, c'est
 *   le cas des résidences autonomie CNSA au mauvais code postal) : retiré, et ajouté à
 *   l'arrondissement d'arrivée s'il a une page de vague 1 ;
 * - situé ailleurs et déjà présenté comme extérieur (MDPH, associations départementales…) :
 *   conservé, `commune_insee` corrigé.
 * Les faits non tranchés restent où ils sont. Les communes hors Paris ne sont pas touchées.
 */
export function relocateParisFacts(
  pending: PendingTerritory[],
  ban: BanLookup | undefined,
): { relocations: Relocation[]; undecided: UndecidedFact[] } {
  const relocations: Relocation[] = [];
  const undecided: UndecidedFact[] = [];
  if (!ban) return { relocations, undecided };
  const arrondissements = pending.filter((p) => p.ctx.kind === "arrondissement" && p.ctx.departement === "75");
  const byCode = new Map(arrondissements.map((p) => [p.ctx.code, p]));
  const incoming = new Map<string, LocalFact[]>();
  for (const p of arrondissements) {
    const kept: LocalFact[] = [];
    for (const f of p.draft.facts) {
      if (!banCandidate(f)) {
        kept.push(f);
        continue;
      }
      const target = ban.get(normalizeAddress(f.address));
      if (target === undefined || target === null) {
        undecided.push({ label: f.label, type: f.type, address: f.address, code: p.ctx.code, in_territory: f.in_territory === true });
        kept.push(f);
        continue;
      }
      if (target === p.ctx.code) {
        kept.push({ ...f, commune_insee: target, in_territory: true });
        continue;
      }
      if (f.in_territory !== true) {
        kept.push({ ...f, commune_insee: target });
        continue;
      }
      const list = incoming.get(target) ?? [];
      list.push({ ...f, commune_insee: target, in_territory: true });
      incoming.set(target, list);
      relocations.push({ label: f.label, type: f.type, address: f.address, from: p.ctx.code, to: target, added: byCode.has(target) });
    }
    p.draft.facts = kept;
  }
  for (const [code, facts] of incoming) {
    const dest = byCode.get(code);
    if (dest) dest.draft.facts.push(...facts);
  }
  return { relocations, undecided };
}

const TERRITORY_BOUND_TYPES: ReadonlySet<LocalFact["type"]> = new Set(["demographie", "marche", "espace-vert", "equipement-seniors"]);

/** Minuscules, sans accents ni ponctuation, espaces réduits : « L'Haÿ-les-Roses » → « l hay les roses ». */
export function normalizePlaceName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bcedex\b.*$/, "")
    .replace(/\bste\b/g, "sainte")
    .replace(/\bst\b/g, "saint")
    .trim();
}

/** Code postal et ville d'une adresse publiée (« 133 rue X, 92800 PUTEAUX ») ; null sans code postal. */
export function addressPlace(address: string): { postcode: string; city: string } | null {
  const match = /(^|\D)(\d{5})(?!\d)\s*([^,;\d]*)$/.exec(address.trim());
  if (!match?.[2]) return null;
  return { postcode: match[2], city: normalizePlaceName(match[3] ?? "") };
}

function sameCommune(city: string, nom: string): boolean {
  if (!city) return true;
  const target = normalizePlaceName(nom);
  const short = Math.min(city.length, target.length);
  if (short < 4) return city === target;
  return city.startsWith(target) || target.startsWith(city);
}

/**
 * Marque `in_territory` pour une commune ou un arrondissement : vrai si le fait est situé dans le
 * territoire, faux pour les faits du département ou de la région (MDPH, conseil départemental, PAM,
 * associations…). Quand l'adresse publiée porte un code postal, c'est elle qui décide : le code
 * postal doit être l'un de ceux du territoire (pour un arrondissement, 750XX ou 751XX) et, si la
 * ville est écrite, elle doit correspondre au nom du territoire (plusieurs communes partagent un
 * code postal : 77700 pour Serris, Chessy, Magny-le-Hongre…). Sans code postal dans l'adresse, le
 * code INSEE fourni par la source fait foi ; les sources CNSA le donnent parfois faux (résidences
 * autonomie parisiennes rattachées au mauvais arrondissement), d'où la priorité à l'adresse.
 */
export function locateFacts(facts: readonly LocalFact[], ctx: TerritoryContext): LocalFact[] {
  const postcodes = new Set(ctx.codes_postaux.filter((cp) => /^\d{5}$/.test(cp)));
  if (ctx.kind === "arrondissement" && ctx.arrondissement !== undefined) {
    const nn = String(ctx.arrondissement).padStart(2, "0");
    postcodes.add(`750${nn}`);
    postcodes.add(`751${nn}`);
  }
  return facts.map((f) => {
    if (TERRITORY_BOUND_TYPES.has(f.type)) return { ...f, in_territory: true };
    const place = f.address ? addressPlace(f.address) : null;
    let located: boolean;
    if (place) {
      // Un code postal du territoire (ou, pour une commune, un code « cedex » du même
      // département accompagné du nom exact de la commune) ; la ville écrite doit correspondre.
      const knownPostcode = postcodes.has(place.postcode);
      const cedexSameCommune =
        ctx.kind !== "arrondissement" &&
        place.city.length > 0 &&
        ctx.departement !== undefined &&
        place.postcode.startsWith(ctx.departement) &&
        sameCommune(place.city, ctx.nom);
      located =
        ctx.kind === "arrondissement"
          ? knownPostcode
          : (knownPostcode && sameCommune(place.city, ctx.nom)) || cedexSameCommune;
    } else {
      located = f.commune_insee === ctx.code;
    }
    return { ...f, in_territory: located };
  });
}

function communeCounts(insee: InseeData, codes: readonly string[]): AgeCounts | null {
  const list = codes.map((code) => insee.counts.get(code)).filter((c): c is AgeCounts => c !== undefined);
  return list.length > 0 ? sumCounts(list) : null;
}

function dedupeSources(sources: readonly SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  const result: SourceRef[] = [];
  for (const s of sources) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    result.push(s);
  }
  return result;
}

/* ---------- Contrôle croisé avec data/territoires.seed.json ---------- */

export interface Seed {
  departements: { code: string; nom: string; slug: string; agences: string[] }[];
  regle_vague_1: { communes_des_agences: string[] };
  paris: {
    code_insee_commune: string;
    arrondissements: {
      numero: number;
      nom: string;
      slug: string;
      code_insee: string;
      codes_postaux: string[];
      quartiers: { numero: number; nom: string; slug: string }[];
    }[];
  };
}

/** Écarts entre le seed et les sources officielles (la source officielle gagne). */
export function compareWithSeed(seed: Seed, geo: GeoData, zones: Zone[], agencies: Agency[], quartiers: ParisQuartier[]): string[] {
  const diffs: string[] = [];
  for (const d of seed.departements) {
    const official = geo.departements.find((g) => g.code === d.code);
    if (!official) diffs.push(`département ${d.code} du seed absent de l'API`);
    else if (official.nom !== d.nom) diffs.push(`département ${d.code} : seed « ${d.nom} », API « ${official.nom} »`);
    const zone = zones.find((z) => z.code === d.code);
    if (zone && zone.slug !== d.slug) diffs.push(`département ${d.code} : slug seed « ${d.slug} », site.config « ${zone.slug} »`);
    const agencyIds = agencies.filter((a) => a.departement === d.code).map((a) => a.id).sort();
    if (agencyIds.join(",") !== [...d.agences].sort().join(",")) {
      diffs.push(`département ${d.code} : agences seed [${d.agences.join(", ")}], site.config [${agencyIds.join(", ")}]`);
    }
  }
  const hostCodes = agencies.filter((a) => !a.code_insee.startsWith("751")).map((a) => a.code_insee).sort();
  const seedHosts = [...seed.regle_vague_1.communes_des_agences].sort();
  if (hostCodes.join(",") !== seedHosts.join(",")) {
    diffs.push(`communes des agences : seed [${seedHosts.join(", ")}], site.config [${hostCodes.join(", ")}]`);
  }
  if (seed.paris.code_insee_commune !== PARIS_COMMUNE) diffs.push(`code de Paris : seed ${seed.paris.code_insee_commune}, attendu ${PARIS_COMMUNE}`);
  for (const a of seed.paris.arrondissements) {
    const official = geo.communes.find((c) => c.code === a.code_insee);
    if (!official) {
      diffs.push(`arrondissement ${a.code_insee} du seed absent de l'API`);
      continue;
    }
    if (arrondissementNumber(a.code_insee) !== a.numero) diffs.push(`arrondissement ${a.code_insee} : numéro seed ${a.numero}`);
    if (arrondissementSlug(a.code_insee) !== a.slug) diffs.push(`arrondissement ${a.code_insee} : slug seed « ${a.slug} », calculé « ${arrondissementSlug(a.code_insee)} »`);
    const cps = [...official.codes_postaux].sort().join(",");
    if (cps !== [...a.codes_postaux].sort().join(",")) diffs.push(`arrondissement ${a.code_insee} : codes postaux seed [${a.codes_postaux.join(", ")}], API [${official.codes_postaux.join(", ")}]`);
    for (const q of a.quartiers) {
      const official = quartiers.find((x) => x.numero === q.numero);
      if (!official) {
        if (quartiers.length > 0) diffs.push(`quartier ${q.numero} (${q.nom}) du seed absent d'opendata.paris.fr`);
        continue;
      }
      if (official.arrondissement !== a.numero) diffs.push(`quartier ${q.numero} (${q.nom}) : arrondissement seed ${a.numero}, opendata ${official.arrondissement}`);
      if (official.nom !== q.nom) diffs.push(`quartier ${q.numero} : seed « ${q.nom} », opendata « ${official.nom} »`);
      if (official.slug !== q.slug) diffs.push(`quartier ${q.numero} : slug seed « ${q.slug} », calculé « ${official.slug} »`);
    }
  }
  if (quartiers.length > 0 && quartiers.length !== 80) diffs.push(`opendata.paris.fr : ${quartiers.length} quartiers au lieu de 80`);
  return diffs;
}

/** Centre moyen des communes connues (secours quand le chef-lieu n'a pas de centre). */
export function centroid(communes: readonly { centre: LatLng | null }[]): LatLng | null {
  const points = communes.map((c) => c.centre).filter((p): p is LatLng => p !== null);
  if (points.length === 0) return null;
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}
