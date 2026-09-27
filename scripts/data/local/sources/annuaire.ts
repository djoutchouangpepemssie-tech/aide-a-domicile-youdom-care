import type { LocalFact, LocalFactType } from "../../../../src/content/local-schema";
import type { SourceCache } from "../cache";
import { cleanText, cleanUrl, fact, formatPhone, joinAddress } from "../facts";
import { IDF_DEPARTEMENTS, PARIS_COMMUNE } from "../geo-api";
import type { SourceRef, TerritoryContext } from "../types";

/*
 * Annuaire de l'administration, base de données locales (DILA, docs/04 §5). La base est
 * interrogée par l'API Annuaire (Opendatasoft, même producteur, licence ouverte 2.0) : une
 * exportation JSON par département, filtrée sur `code_insee_commune`. Types retenus :
 * mairie, CCAS/CIAS, point d'information local pour les personnes âgées (`clic`), plateforme
 * d'accompagnement et de répit (`accompagnement_personnes_agees`), MDPH (`maison_handicapees`),
 * conseil départemental (`cg`).
 */

export const ANNUAIRE_API =
  "https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration";
export const ANNUAIRE_LICENCE = "Licence Ouverte / Open Licence 2.0 (DILA)";
export const ANNUAIRE_LABEL = "Annuaire de l'administration (DILA), base de données locales";

const SELECT =
  "nom,pivot,code_insee_commune,adresse,telephone,site_internet,url_service_public,adresse_courriel,date_modification";

export function annuaireExportUrl(departement: string): string {
  const where = encodeURIComponent(`startswith(code_insee_commune,"${departement}")`);
  return `${ANNUAIRE_API}/exports/json?where=${where}&select=${encodeURIComponent(SELECT)}`;
}

interface RawRecord {
  nom: string;
  pivot: string | null;
  code_insee_commune: string | null;
  adresse: string | null;
  telephone: string | null;
  site_internet: string | null;
  url_service_public: string | null;
  adresse_courriel: string | null;
  date_modification: string | null;
}

export type AnnuairePivot =
  | "mairie"
  | "ccas"
  | "cias"
  | "clic"
  | "accompagnement_personnes_agees"
  | "maison_handicapees"
  | "cg";

const PIVOTS: readonly AnnuairePivot[] = [
  "mairie",
  "ccas",
  "cias",
  "clic",
  "accompagnement_personnes_agees",
  "maison_handicapees",
  "cg",
];

export interface AnnuaireRecord {
  nom: string;
  pivot: AnnuairePivot;
  communes: string[];
  departement: string;
  address?: string;
  code_postal?: string;
  telephone?: string;
  url?: string;
  page: string;
}

function safeJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function parseAnnuaireRecords(raw: readonly RawRecord[]): AnnuaireRecord[] {
  const records: AnnuaireRecord[] = [];
  for (const r of raw) {
    const pivots = safeJson<{ type_service_local: string; code_insee_commune: string[] }[]>(r.pivot);
    const pivot = pivots?.find((p) => (PIVOTS as readonly string[]).includes(p.type_service_local));
    const page = cleanUrl(r.url_service_public);
    if (!pivot || !page) continue;
    const communes = Array.isArray(pivot.code_insee_commune) ? pivot.code_insee_commune : [];
    const departement = (r.code_insee_commune ?? communes[0] ?? "").slice(0, 2);
    const adresses = safeJson<
      { numero_voie?: string; complement1?: string; complement2?: string; code_postal?: string; nom_commune?: string }[]
    >(r.adresse);
    const a = adresses?.[0];
    const address = a
      ? joinAddress([
          a.numero_voie,
          a.complement1,
          a.complement2,
          [a.code_postal, a.nom_commune].filter(Boolean).join(" "),
        ])
      : undefined;
    const telephones = safeJson<{ valeur?: string }[]>(r.telephone);
    const sites = safeJson<{ valeur?: string }[]>(r.site_internet);
    const site = sites?.map((s) => cleanUrl(s.valeur)).find((u) => u !== undefined);
    records.push({
      nom: cleanText(r.nom) ?? "Sans nom",
      pivot: pivot.type_service_local as AnnuairePivot,
      communes,
      departement,
      address,
      code_postal: a?.code_postal,
      telephone: formatPhone(telephones?.[0]?.valeur),
      url: site,
      page,
    });
  }
  return records;
}

export interface AnnuaireData {
  records: AnnuaireRecord[];
  sources: SourceRef[];
  /** Exportation utilisée pour chaque département (pour `sources[]` des fichiers produits). */
  sourceByDepartement: Partial<Record<string, SourceRef>>;
  collected_at: string;
}

export async function loadAnnuaire(cache: SourceCache): Promise<AnnuaireData> {
  const records: AnnuaireRecord[] = [];
  const sources: SourceRef[] = [];
  const sourceByDepartement: Partial<Record<string, SourceRef>> = {};
  let collected_at = "";
  for (const dep of IDF_DEPARTEMENTS) {
    const url = annuaireExportUrl(dep);
    const file = await cache.tryFetch({
      id: `annuaire-administration-${dep}`,
      label: `${ANNUAIRE_LABEL} — département ${dep}`,
      url,
      ext: "json",
      licence: ANNUAIRE_LICENCE,
      minBytes: 10_000,
    });
    if (!file) continue;
    collected_at = collected_at || file.collected_at;
    const source: SourceRef = { label: `${ANNUAIRE_LABEL} — département ${dep}`, url, collected_at: file.collected_at };
    sources.push(source);
    sourceByDepartement[dep] = source;
    records.push(...parseAnnuaireRecords(JSON.parse(file.bytes.toString("utf8")) as RawRecord[]));
  }
  return { records, sources, sourceByDepartement, collected_at };
}

const PIVOT_TYPE: Record<AnnuairePivot, LocalFactType> = {
  mairie: "autre",
  ccas: "ccas",
  cias: "ccas",
  clic: "point-information",
  accompagnement_personnes_agees: "plateforme-repit",
  maison_handicapees: "mdph",
  cg: "aide-departementale",
};

/** Numéros d'arrondissement cités dans un libellé parisien (« Paris 9e - 10e - 19e arrondissements »). */
export function arrondissementsInLabel(label: string): Set<number> {
  const found = new Set<number>();
  for (const m of label.matchAll(/(?<![\d])(\d{1,2})\s?(?:er|e|ème)\b/g)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 20) found.add(n);
  }
  return found;
}

function toFact(r: AnnuaireRecord, collected_at: string, extra: { value?: string } = {}): LocalFact {
  return fact({
    type: PIVOT_TYPE[r.pivot],
    label: r.nom,
    value: extra.value,
    address: r.address,
    commune_insee: r.communes.find((c) => /^\d{5}$/.test(c)),
    telephone: r.telephone,
    url: r.url ?? r.page,
    source_url: r.page,
    source_label: ANNUAIRE_LABEL,
    collected_at,
  });
}

function sortByName(list: AnnuaireRecord[]): AnnuaireRecord[] {
  return [...list].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

/** Faits de l'annuaire pour un territoire. */
export function annuaireFacts(data: AnnuaireData, ctx: TerritoryContext, caps = { list: 12 }): LocalFact[] {
  const { records, collected_at } = data;
  const facts: LocalFact[] = [];
  if (ctx.kind === "region") return facts;
  const dep = ctx.departement;
  if (!dep) return facts;
  const inDep = records.filter((r) => r.departement === dep);
  const departmental = inDep.filter((r) => r.pivot === "maison_handicapees" || r.pivot === "cg");

  if (ctx.kind === "departement") {
    for (const r of sortByName(departmental)) facts.push(toFact(r, collected_at));
    for (const r of sortByName(inDep.filter((r) => r.pivot === "clic")).slice(0, caps.list)) {
      facts.push(toFact(r, collected_at));
    }
    for (const r of sortByName(inDep.filter((r) => r.pivot === "accompagnement_personnes_agees")).slice(0, caps.list)) {
      facts.push(toFact(r, collected_at));
    }
    return facts;
  }

  const local = inDep.filter((r) => r.communes.includes(ctx.code) && !departmental.includes(r));
  for (const r of sortByName(local)) facts.push(toFact(r, collected_at));
  if (ctx.kind === "arrondissement" && ctx.arrondissement !== undefined) {
    const numero = ctx.arrondissement;
    // Services de la Ville de Paris (CASVP, points d'information et plateformes couvrant plusieurs arrondissements).
    for (const r of sortByName(inDep)) {
      if (local.includes(r) || departmental.includes(r)) continue;
      const cityWide = r.communes.includes(PARIS_COMMUNE) && r.pivot === "ccas";
      const covers =
        (r.pivot === "clic" || r.pivot === "accompagnement_personnes_agees") &&
        arrondissementsInLabel(r.nom).has(numero);
      if (cityWide || covers) facts.push(toFact(r, collected_at));
    }
  }
  for (const r of sortByName(departmental)) facts.push(toFact(r, collected_at));
  return facts;
}
