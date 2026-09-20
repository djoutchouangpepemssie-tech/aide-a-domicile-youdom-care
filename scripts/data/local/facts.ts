import { z } from "zod";
import { localFactSchema, type LocalFact, type LocalFactType } from "../../../src/content/local-schema";
import { normalizeName } from "../../../src/lib/geo/geo";

/*
 * Outils communs aux sources de faits : construction, nettoyage des adresses et des liens,
 * dédoublonnage, ordre de présentation.
 */

const httpUrl = z.string().url().startsWith("http");

/** Adresse http valide ou undefined (les annuaires contiennent des liens mal formés). */
export function cleanUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return httpUrl.safeParse(trimmed).success ? trimmed : undefined;
}

export function cleanText(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function joinAddress(parts: readonly (string | null | undefined)[]): string | undefined {
  const cleaned = parts.map(cleanText).filter((p): p is string => p !== undefined);
  return cleaned.length > 0 ? cleaned.join(", ") : undefined;
}

export interface FactInput {
  type: LocalFactType;
  label: string;
  value?: string;
  address?: string;
  commune_insee?: string;
  telephone?: string;
  url?: string;
  source_url: string;
  source_label?: string;
  collected_at: string;
  in_territory?: boolean;
}

/** Construit un fait valide ou lève (les faits invalides ne doivent jamais être écrits). */
export function fact(input: FactInput): LocalFact {
  const candidate: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) candidate[key] = value;
  }
  return localFactSchema.parse(candidate);
}

/** Clé de dédoublonnage : adresse normalisée (numéro, voie, code postal) ou libellé. */
export function factKey(f: LocalFact): string {
  const base = f.address ? f.address : f.label;
  return `${f.type}|${normalizeName(base).replace(/[^a-z0-9]/g, "")}`;
}

export function dedupeFacts(facts: readonly LocalFact[]): LocalFact[] {
  const seen = new Set<string>();
  const result: LocalFact[] = [];
  for (const f of facts) {
    const key = factKey(f);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(f);
  }
  return result;
}

const TYPE_ORDER: readonly LocalFactType[] = [
  "demographie",
  "point-information",
  "ccas",
  "plateforme-repit",
  "mdph",
  "service-apa",
  "aide-departementale",
  "accueil-jour",
  "residence-autonomie",
  "ehpad",
  "hopital",
  "consultation-memoire",
  "transport-adapte",
  "association",
  "marche",
  "espace-vert",
  "equipement-seniors",
  "habitat",
  "relief-deplacements",
  "autre",
];

/** Ordre stable : type (ordre de la page locale) puis libellé. */
export function sortFacts(facts: readonly LocalFact[]): LocalFact[] {
  return [...facts].sort((a, b) => {
    const ta = TYPE_ORDER.indexOf(a.type);
    const tb = TYPE_ORDER.indexOf(b.type);
    if (ta !== tb) return ta - tb;
    return a.label.localeCompare(b.label, "fr");
  });
}

export function countByType(facts: readonly LocalFact[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of facts) counts[f.type] = (counts[f.type] ?? 0) + 1;
  return counts;
}

/** « 01 46 92 92 92 » ou « +33146929595 » → format lisible ; conserve la source si inconnu. */
export function formatPhone(value: string | null | undefined): string | undefined {
  const raw = cleanText(value);
  if (!raw) return undefined;
  const digits = raw.replace(/[^\d+]/g, "");
  const national = digits.startsWith("+33") ? `0${digits.slice(3)}` : digits;
  // Numéros géographiques et mobiles (01 à 07, 09) : paires ; numéros spéciaux (08) : forme de la source.
  if (/^0[1-79]\d{8}$/.test(national)) {
    return national.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }
  return raw;
}
