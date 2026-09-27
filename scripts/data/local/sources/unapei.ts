import type { LocalFact } from "../../../../src/content/local-schema";
import type { SourceCache } from "../cache";
import { cleanText, cleanUrl, fact, formatPhone, joinAddress } from "../facts";
import type { SourceRef, TerritoryContext } from "../types";

/*
 * Unapei, carte « Près de chez vous » (https://carto.unapei.org/, données servies par data.php).
 * Associations affiliées (type ASSOC) ; les établissements (ETAB) ne sont pas repris.
 */

export const UNAPEI = {
  id: "unapei-carto",
  label: "Unapei — carte des associations et établissements (carto.unapei.org)",
  page: "https://carto.unapei.org/",
  url: "https://carto.unapei.org/data.php",
  licence: "Site de l'Unapei, données publiques de la carte (pas de licence explicite)",
  sourceLabel: "Unapei, carte « Près de chez vous » (carto.unapei.org)",
} as const;

interface RawEntry {
  type: string;
  field: string;
  name: string;
  city: string;
  code_postal: string;
  adresse: string;
  tele: string;
  site: string;
}

export interface UnapeiAssociation {
  name: string;
  field: string;
  departement: string;
  address?: string;
  telephone?: string;
  url?: string;
}

export function parseUnapei(raw: readonly RawEntry[]): UnapeiAssociation[] {
  return raw
    .filter((e) => e.type === "ASSOC" && cleanText(e.name))
    .map((e) => {
      const site = cleanText(e.site);
      const url = site ? (cleanUrl(site) ?? (site.startsWith("www.") ? cleanUrl(`https://${site}`) : undefined)) : undefined;
      return {
        name: cleanText(e.name) ?? "",
        field: cleanText(e.field) ?? "",
        departement: (e.code_postal ?? "").slice(0, 2),
        address: joinAddress([e.adresse, `${e.code_postal ?? ""} ${e.city ?? ""}`]),
        telephone: formatPhone(e.tele),
        url,
      };
    });
}

export interface UnapeiData {
  associations: UnapeiAssociation[];
  source: SourceRef | null;
  collected_at: string;
}

export async function loadUnapei(cache: SourceCache): Promise<UnapeiData> {
  const file = await cache.tryFetch({ ...UNAPEI, ext: "json", minBytes: 100_000 });
  if (!file) return { associations: [], source: null, collected_at: "" };
  return {
    associations: parseUnapei(JSON.parse(file.bytes.toString("utf8")) as RawEntry[]),
    source: { label: UNAPEI.label, url: UNAPEI.page, collected_at: file.collected_at },
    collected_at: file.collected_at,
  };
}

export function unapeiFacts(data: UnapeiData, ctx: TerritoryContext, cap = 3): LocalFact[] {
  if (data.associations.length === 0) return [];
  const toFact = (a: UnapeiAssociation) =>
    fact({
      type: "association",
      label: a.name,
      value: a.field ? `Réseau Unapei — ${a.field.toLowerCase()}` : "Réseau Unapei",
      address: a.address,
      telephone: a.telephone,
      url: a.url,
      source_url: UNAPEI.page,
      source_label: UNAPEI.sourceLabel,
      collected_at: data.collected_at,
    });
  if (ctx.kind === "region") {
    return data.associations
      .filter((a) => /unapei\s+ile[- ]de[- ]france/i.test(a.name))
      .map(toFact);
  }
  if (!ctx.departement) return [];
  const dep = ctx.departement;
  return data.associations
    .filter((a) => a.departement === dep && /association de parents/i.test(a.field))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .slice(0, cap)
    .map(toFact);
}
