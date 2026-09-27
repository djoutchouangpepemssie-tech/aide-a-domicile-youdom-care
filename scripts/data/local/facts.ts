import { z } from "zod";
import { localFactSchema, type LocalFact, type LocalFactType } from "../../../src/content/local-schema";
import { normalizeName } from "../../../src/lib/geo/geo";

/*
 * Outils communs aux sources de faits : construction, nettoyage des adresses et des liens,
 * dédoublonnage, ordre de présentation.
 */

const httpUrl = z.string().url().startsWith("http");

/*
 * Liens officiels des sources. Les annuaires (CNSA, DILA, Ville de Paris) contiennent des liens
 * abîmés : barre oblique perdue après le domaine (« www.puteaux.frvie-sociale/ccas »), adresse
 * électronique saisie à la place d'un site (« www.logementseniors@paris.fr »), hôte sans domaine
 * de premier niveau. `analyzeUrl` répare ce qui peut l'être et écarte le reste ; `cleanUrl` n'en
 * garde que le résultat.
 */

/** Domaines de premier niveau pouvant être suivis d'un chemin collé (« frvie-sociale »). */
const GLUED_TLDS = ["paris", "info", "com", "org", "net", "fr", "eu"] as const;

/** Domaines de premier niveau admis pour un lien officiel (français, européens, génériques). */
const PLAUSIBLE_TLDS: ReadonlySet<string> = new Set([
  ...GLUED_TLDS,
  "gouv",
  "io",
  "co",
  "be",
  "ch",
  "lu",
  "de",
  "es",
  "it",
  "pt",
  "nl",
  "uk",
  "ie",
  "us",
  "ca",
  "re",
  "nc",
  "pf",
  "yt",
  "gp",
  "mq",
  "gf",
  "pm",
  "wf",
  "tf",
  "bzh",
  "alsace",
  "corsica",
  "eus",
  "edu",
  "int",
  "biz",
  "mobi",
  "pro",
  "app",
  "dev",
  "site",
  "online",
  "health",
  "care",
  "team",
  "link",
  "tv",
  "me",
  "xyz",
  "coop",
  "eco",
  "ngo",
  "ong",
  "asso",
  "cat",
  "company",
  "community",
  "network",
  "organic",
]);

export type UrlAction = "absent" | "conservee" | "reparee" | "supprimee";

export interface UrlAnalysis {
  /** Lien conservé ou réparé ; absent si la valeur est vide ou irrécupérable. */
  url?: string;
  action: UrlAction;
  original: string;
}

/**
 * Analyse pure d'un lien venu d'une source :
 * - vide → `absent` ;
 * - contient « @ », sans schéma http(s), illisible par `new URL()`, hôte sans domaine de premier
 *   niveau plausible → `supprimee` ;
 * - dernier segment de l'hôte formé d'un domaine connu suivi d'autres caractères
 *   (« www.puteaux.frvie-sociale ») → `reparee`, la barre oblique manquante est rétablie
 *   (« www.puteaux.fr/vie-sociale ») ;
 * - sinon → `conservee`, telle quelle.
 */
export function analyzeUrl(value: string | null | undefined): UrlAnalysis {
  const original = value?.trim() ?? "";
  if (original.length === 0) return { action: "absent", original };
  const removed: UrlAnalysis = { action: "supprimee", original };
  if (original.includes("@") || !/^https?:\/\//i.test(original)) return removed;
  let parsed: URL;
  try {
    parsed = new URL(original);
  } catch {
    return removed;
  }
  const labels = parsed.hostname.split(".");
  const last = labels.at(-1) ?? "";
  if (labels.length < 2 || labels.some((l) => l.length === 0)) return removed;
  if (PLAUSIBLE_TLDS.has(last)) {
    return httpUrl.safeParse(original).success ? { url: original, action: "conservee", original } : removed;
  }
  const tld = GLUED_TLDS.find((t) => last.startsWith(t) && last.length > t.length);
  if (!tld) return removed;
  const glued = last.slice(tld.length);
  if (!/^[a-z0-9][a-z0-9._~-]*$/i.test(glued)) return removed;
  const host = [...labels.slice(0, -1), tld].join(".");
  const port = parsed.port ? `:${parsed.port}` : "";
  const path = parsed.pathname === "/" && !original.endsWith("/") ? "" : parsed.pathname;
  const repaired = `${parsed.protocol}//${host}${port}/${glued}${path}${parsed.search}${parsed.hash}`;
  return httpUrl.safeParse(repaired).success ? { url: repaired, action: "reparee", original } : removed;
}

type UrlObserver = (analysis: UrlAnalysis) => void;
let urlObserver: UrlObserver | null = null;

/** Journal des liens réparés et supprimés (pipeline) : `null` retire l'observateur. */
export function observeUrlCleaning(observer: UrlObserver | null): void {
  urlObserver = observer;
}

/** Adresse http valide (réparée si besoin) ou undefined ; voir `analyzeUrl`. */
export function cleanUrl(value: string | null | undefined): string | undefined {
  const analysis = analyzeUrl(value);
  if (urlObserver && analysis.action !== "absent") urlObserver(analysis);
  return analysis.url;
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
