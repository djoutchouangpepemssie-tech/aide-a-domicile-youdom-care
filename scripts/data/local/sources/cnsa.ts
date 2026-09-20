import type { LocalFact } from "../../../../src/content/local-schema";
import type { SourceCache } from "../cache";
import { parseCsvRecords } from "../csv";
import { cleanText, cleanUrl, fact, formatPhone, joinAddress } from "../facts";
import { IDF_DEPARTEMENTS } from "../geo-api";
import type { SourceRef, TerritoryContext } from "../types";

/*
 * CNSA sur data.gouv.fr (docs/04 §5) :
 * - « Points d'informations locaux pour les personnes âgées » (CLIC, plateformes de répit) ;
 * - « Etablissements EHPAD, ESLD, résidences autonomie, accueils de jour ».
 * Les deux jeux datent du 11 novembre 2020 (dernière publication au 2026-09-20) : la date figure
 * dans `source_label`. Les points d'information plus récents viennent de l'annuaire (DILA).
 */

export const CNSA_POINTS_INFO = {
  id: "cnsa-points-info",
  label: "CNSA — Points d'informations locaux pour les personnes âgées (data.gouv.fr)",
  page: "https://www.data.gouv.fr/fr/datasets/points-dinformations-locaux-pour-les-personnes-agees/",
  url: "https://static.data.gouv.fr/resources/points-dinformations-locaux-pour-les-personnes-agees/20201111-100441/base-points-info.csv",
  licence: "Licence Ouverte / Open Licence (Etalab)",
  sourceLabel: "CNSA, data.gouv.fr — points d'information locaux (publication du 11/11/2020)",
} as const;

export const CNSA_ETABLISSEMENTS = {
  id: "cnsa-etablissements",
  label: "CNSA — Etablissements EHPAD, ESLD, résidences autonomie, accueils de jour (data.gouv.fr)",
  page: "https://www.data.gouv.fr/fr/datasets/etablissements-ehpad-esld-residences-autonomie-accueils-de-jour/",
  url: "https://static.data.gouv.fr/resources/etablissements-ehpad-esld-residences-autonomie-accueils-de-jour/20201111-100438/base-etablissements.csv",
  licence: "Licence Ouverte / Open Licence 2.0 (Etalab)",
  sourceLabel: "CNSA, data.gouv.fr — établissements pour personnes âgées (publication du 11/11/2020)",
} as const;

export interface CnsaPlace {
  title: string;
  deptcode: string;
  postcode: string;
  city: string;
  address?: string;
  telephone?: string;
  url?: string;
}

export interface CnsaPointInfo extends CnsaPlace {
  clic: boolean;
  pfr: boolean;
}

export interface CnsaEtablissement extends CnsaPlace {
  ehpad: boolean;
  ra: boolean;
  esld: boolean;
  accueil_jour: boolean;
  hebergement_temporaire: boolean;
  alzheimer: boolean;
  capacity: number | null;
}

function isTrue(value: string | undefined): boolean {
  return value === "TRUE";
}

function place(r: Record<string, string>): CnsaPlace {
  const postcode = cleanText(r["coordinates.postcode"]) ?? "";
  const city = cleanText(r["coordinates.city"]) ?? "";
  return {
    title: cleanText(r.title) ?? "Sans nom",
    deptcode: cleanText(r["coordinates.deptcode"]) ?? "",
    postcode,
    city,
    address: joinAddress([r["coordinates.street"], `${postcode} ${city}`]),
    telephone: formatPhone(r["coordinates.phone"]),
    url: cleanUrl(r["coordinates.website"]),
  };
}

function inIdf(r: Record<string, string>): boolean {
  return (IDF_DEPARTEMENTS as readonly string[]).includes(r["coordinates.deptcode"] ?? "");
}

export function parsePointsInfo(csv: string): CnsaPointInfo[] {
  return parseCsvRecords(csv)
    .filter(inIdf)
    .map((r) => ({ ...place(r), clic: isTrue(r.IsCLIC), pfr: isTrue(r.IsPFR) }));
}

export function parseEtablissements(csv: string): CnsaEtablissement[] {
  return parseCsvRecords(csv)
    .filter(inIdf)
    .map((r) => {
      const capacity = Number.parseInt(r.capacity ?? "", 10);
      return {
        ...place(r),
        ehpad: isTrue(r.IsEHPAD),
        ra: isTrue(r.IsRA),
        esld: isTrue(r.IsESLD),
        accueil_jour: isTrue(r.IsACC_JOUR) || isTrue(r.IsAJA),
        hebergement_temporaire: isTrue(r.IsHTEMPO),
        alzheimer: isTrue(r.IsALZH),
        capacity: Number.isFinite(capacity) ? capacity : null,
      };
    });
}

export interface CnsaData {
  points: CnsaPointInfo[];
  etablissements: CnsaEtablissement[];
  sources: SourceRef[];
  pointsCollectedAt: string;
  etabCollectedAt: string;
}

export async function loadCnsa(cache: SourceCache): Promise<CnsaData> {
  const data: CnsaData = { points: [], etablissements: [], sources: [], pointsCollectedAt: "", etabCollectedAt: "" };
  const points = await cache.tryFetch({ ...CNSA_POINTS_INFO, ext: "csv", minBytes: 100_000 });
  if (points) {
    data.points = parsePointsInfo(points.bytes.toString("utf8"));
    data.pointsCollectedAt = points.collected_at;
    data.sources.push({ label: CNSA_POINTS_INFO.label, url: CNSA_POINTS_INFO.page, collected_at: points.collected_at });
  }
  const etab = await cache.tryFetch({ ...CNSA_ETABLISSEMENTS, ext: "csv", minBytes: 1_000_000 });
  if (etab) {
    data.etablissements = parseEtablissements(etab.bytes.toString("utf8"));
    data.etabCollectedAt = etab.collected_at;
    data.sources.push({ label: CNSA_ETABLISSEMENTS.label, url: CNSA_ETABLISSEMENTS.page, collected_at: etab.collected_at });
  }
  return data;
}

function matchesTerritory(p: CnsaPlace, ctx: TerritoryContext): boolean {
  if (ctx.kind === "departement") return p.deptcode === ctx.departement;
  return p.deptcode === ctx.departement && ctx.codes_postaux.includes(p.postcode);
}

export function etablissementValue(e: CnsaEtablissement): string {
  const kinds: string[] = [];
  if (e.ehpad) kinds.push("EHPAD");
  if (e.ra) kinds.push("Résidence autonomie");
  if (e.esld) kinds.push("Unité de soins de longue durée");
  if (e.accueil_jour) kinds.push("Accueil de jour");
  if (e.hebergement_temporaire) kinds.push("Hébergement temporaire");
  if (e.alzheimer) kinds.push("Unité Alzheimer");
  const base = kinds.length > 0 ? kinds.join(" · ") : "Établissement pour personnes âgées";
  return e.capacity ? `${base} — ${e.capacity} places` : base;
}

export interface CnsaCaps {
  ehpad: number;
  residence: number;
  accueil: number;
  points: number;
}

/** Faits CNSA pour un territoire ; `existingKeys` : adresses déjà couvertes par l'annuaire. */
export function cnsaFacts(data: CnsaData, ctx: TerritoryContext, caps: CnsaCaps): LocalFact[] {
  const facts: LocalFact[] = [];
  if (ctx.kind === "region") return facts;
  const byName = <T extends CnsaPlace>(list: T[]) => [...list].sort((a, b) => a.title.localeCompare(b.title, "fr"));

  const points = byName(data.points.filter((p) => matchesTerritory(p, ctx)));
  for (const p of points.slice(0, caps.points)) {
    facts.push(
      fact({
        type: p.pfr && !p.clic ? "plateforme-repit" : "point-information",
        label: p.title,
        value: p.pfr && p.clic ? "Point d'information et plateforme d'accompagnement et de répit" : undefined,
        address: p.address,
        telephone: p.telephone,
        url: p.url,
        source_url: CNSA_POINTS_INFO.page,
        source_label: CNSA_POINTS_INFO.sourceLabel,
        collected_at: data.pointsCollectedAt,
      }),
    );
  }

  const etabs = byName(data.etablissements.filter((e) => matchesTerritory(e, ctx)));
  const push = (list: CnsaEtablissement[], type: LocalFact["type"], cap: number) => {
    for (const e of list.slice(0, cap)) {
      facts.push(
        fact({
          type,
          label: e.title,
          value: etablissementValue(e),
          address: e.address,
          telephone: e.telephone,
          url: e.url,
          source_url: CNSA_ETABLISSEMENTS.page,
          source_label: CNSA_ETABLISSEMENTS.sourceLabel,
          collected_at: data.etabCollectedAt,
        }),
      );
    }
  };
  if (ctx.kind === "departement") {
    const count = (label: string, n: number, type: LocalFact["type"]) =>
      facts.push(
        fact({
          type,
          label,
          value: `${n} dans le département (${ctx.nom})`,
          source_url: CNSA_ETABLISSEMENTS.page,
          source_label: CNSA_ETABLISSEMENTS.sourceLabel,
          collected_at: data.etabCollectedAt,
        }),
      );
    if (etabs.length > 0) {
      count("EHPAD recensés", etabs.filter((e) => e.ehpad).length, "ehpad");
      count("Résidences autonomie recensées", etabs.filter((e) => e.ra).length, "residence-autonomie");
      count("Accueils de jour recensés", etabs.filter((e) => e.accueil_jour).length, "accueil-jour");
    }
    return facts;
  }
  const accueil = etabs.filter((e) => e.accueil_jour);
  const residences = etabs.filter((e) => e.ra && !e.accueil_jour);
  const ehpad = etabs.filter((e) => e.ehpad && !e.accueil_jour && !e.ra);
  push(accueil, "accueil-jour", caps.accueil);
  push(residences, "residence-autonomie", caps.residence);
  push(ehpad, "ehpad", caps.ehpad);
  return facts;
}
