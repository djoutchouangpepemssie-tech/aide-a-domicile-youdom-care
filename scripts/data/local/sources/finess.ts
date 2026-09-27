import type { LocalFact } from "../../../../src/content/local-schema";
import { distanceKm, type LatLng } from "../../../../src/lib/geo/geo";
import type { SourceCache } from "../cache";
import { cleanText, fact, formatPhone, joinAddress } from "../facts";
import { IDF_DEPARTEMENTS } from "../geo-api";
import { round1 } from "../territoires";
import type { SourceRef, TerritoryContext } from "../types";

/*
 * FINESS, extraction du fichier des établissements (data.gouv.fr, docs/04 §5) : établissements
 * sanitaires d'Île-de-France. Catégories retenues comme « hôpitaux » : CHR/CHU (101), centres
 * hospitaliers (355), ex-hôpitaux locaux (106), établissements de soins pluridisciplinaires,
 * médicaux ou chirurgicaux (365, 129, 128), centres de lutte contre le cancer (131).
 * Le fichier est sans en-tête ; la structure est documentée dans etalab_cs1100507.pdf.
 */

export const FINESS = {
  id: "finess-etablissements",
  label: "FINESS — extraction du fichier des établissements (data.gouv.fr)",
  page: "https://www.data.gouv.fr/fr/datasets/finess-extraction-du-fichier-des-etablissements/",
  url: "https://static.data.gouv.fr/resources/finess-extraction-du-fichier-des-etablissements/20260512-091152/etalab-cs1100507-stock-20260512-0339.csv",
  licence: "Licence Ouverte / Open Licence (Etalab)",
  sourceLabel: "FINESS, data.gouv.fr (extraction du 12/05/2026)",
} as const;

export const HOSPITAL_CATEGORIES = new Set(["101", "355", "106", "365", "129", "128", "131"]);
const MAJOR_CATEGORIES = new Set(["101", "355", "106"]);
const NOT_A_HOSPITAL =
  /\b(AGENCE|SSIAD|SOINS INFIRMIERS|POST ?CURE|ECOLE|INSTITUT DE FORMATION|BLANCHISSERIE|PHARMACIE|SIEGE|DIRECTION GENERALE|HOPITAL DE NUIT)\b/i;

const VOIE: Record<string, string> = {
  R: "rue",
  AV: "avenue",
  BD: "boulevard",
  PL: "place",
  CHE: "chemin",
  RTE: "route",
  ALL: "allée",
  IMP: "impasse",
  QU: "quai",
  QUA: "quai",
  SQ: "square",
  CRS: "cours",
  PROM: "promenade",
  SEN: "sentier",
  CHS: "chaussée",
  ESP: "esplanade",
  PAS: "passage",
  VLA: "villa",
  CITE: "cité",
  RPT: "rond-point",
  MAIL: "mail",
  PARV: "parvis",
  DOM: "domaine",
  HAM: "hameau",
  LOT: "lotissement",
  RES: "résidence",
  ZAC: "ZAC",
  ZI: "zone industrielle",
  GR: "grande rue",
};

export interface FinessEtablissement {
  finess: string;
  nom: string;
  categorie: string;
  categorie_libelle: string;
  departement: string;
  commune: string;
  address?: string;
  telephone?: string;
}

export function parseFiness(csv: string): FinessEtablissement[] {
  const result: FinessEtablissement[] = [];
  for (const line of csv.split("\n")) {
    if (!line.startsWith("structureet;")) continue;
    const f = line.replace(/\r$/, "").split(";");
    const departement = f[13] ?? "";
    const categorie = f[18] ?? "";
    if (!(IDF_DEPARTEMENTS as readonly string[]).includes(departement)) continue;
    if (!HOSPITAL_CATEGORIES.has(categorie)) continue;
    const nom = cleanText(f[4]) ?? cleanText(f[3]) ?? "Sans nom";
    // Entités rattachées à un hôpital mais qui n'accueillent pas de patients (agence, SSIAD, école…).
    if (NOT_A_HOSPITAL.test(nom)) continue;
    const typvoie = f[8] ?? "";
    const voie = [f[7], VOIE[typvoie] ?? typvoie.toLowerCase(), f[9]].filter(Boolean).join(" ");
    result.push({
      finess: f[1] ?? "",
      nom,
      categorie,
      categorie_libelle: cleanText(f[19]) ?? "",
      departement,
      commune: `${departement}${f[12] ?? ""}`,
      address: joinAddress([voie, f[11], f[15]]),
      telephone: formatPhone(f[16]),
    });
  }
  return result;
}

export interface FinessData {
  etablissements: FinessEtablissement[];
  source: SourceRef | null;
  collected_at: string;
}

export async function loadFiness(cache: SourceCache): Promise<FinessData> {
  const file = await cache.tryFetch({ ...FINESS, ext: "csv", minBytes: 10_000_000 });
  if (!file) return { etablissements: [], source: null, collected_at: "" };
  return {
    etablissements: parseFiness(file.bytes.toString("utf8")),
    source: { label: FINESS.label, url: FINESS.page, collected_at: file.collected_at },
    collected_at: file.collected_at,
  };
}

function toFact(e: FinessEtablissement, collected_at: string, value?: string): LocalFact {
  return fact({
    type: "hopital",
    label: e.nom,
    value: value ?? e.categorie_libelle,
    address: e.address,
    commune_insee: /^\d{5}$/.test(e.commune) ? e.commune : undefined,
    telephone: e.telephone,
    source_url: FINESS.page,
    source_label: FINESS.sourceLabel,
    collected_at,
  });
}

const byName = (a: FinessEtablissement, b: FinessEtablissement) => a.nom.localeCompare(b.nom, "fr");

/**
 * Hôpitaux du territoire ; à défaut, les deux plus proches (distance entre centres de communes,
 * `centres` : code INSEE → centre).
 */
export function finessFacts(
  data: FinessData,
  ctx: TerritoryContext,
  centres: ReadonlyMap<string, { nom: string; centre: LatLng | null }>,
  caps = { local: 6, departement: 12, nearest: 2 },
): LocalFact[] {
  if (ctx.kind === "region" || !ctx.departement || data.etablissements.length === 0) return [];
  const { collected_at } = data;
  if (ctx.kind === "departement") {
    const dep = ctx.departement;
    const major = data.etablissements.filter((e) => e.departement === dep && MAJOR_CATEGORIES.has(e.categorie));
    return major.sort(byName).slice(0, caps.departement).map((e) => toFact(e, collected_at));
  }
  const local = data.etablissements.filter((e) => e.commune === ctx.code).sort(byName);
  if (local.length > 0) return local.slice(0, caps.local).map((e) => toFact(e, collected_at));
  if (!ctx.centre) return [];
  const origin = ctx.centre;
  const candidates = data.etablissements
    .filter((e) => MAJOR_CATEGORIES.has(e.categorie))
    .map((e) => {
      const target = centres.get(e.commune);
      return target?.centre ? { e, nom: target.nom, d: distanceKm(origin, target.centre) } : null;
    })
    .filter((c): c is { e: FinessEtablissement; nom: string; d: number } => c !== null)
    .sort((a, b) => a.d - b.d || a.e.nom.localeCompare(b.e.nom, "fr"));
  return candidates
    .slice(0, caps.nearest)
    .map(({ e, nom, d }) =>
      toFact(e, collected_at, `${e.categorie_libelle} — à ${round1(d).toLocaleString("fr-FR")} km à vol d'oiseau (${nom})`),
    );
}
