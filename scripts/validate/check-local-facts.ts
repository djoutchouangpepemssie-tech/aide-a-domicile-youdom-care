import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  localDataSchema,
  localEditorialSchema,
  localFactSchema,
  localThresholds,
  type LocalData,
  type LocalEditorial,
  type TerritoryKind,
} from "../../src/content/local-schema";
import { findUnsourcedNumbers, referenceNumbers } from "../../src/lib/local/numbers";
import { countWords, markdownToText } from "../../src/lib/local/text";
import { result, type Check, type CheckContext, type CheckResult } from "./types";

/*
 * docs/04 §4 (seuils bloquants, règle d'or) et docs/07 §7 : une page locale est sous les seuils
 * de faits sourcés. Le contrôle lit les fichiers de données et de contenu, pas le rendu.
 * Un territoire qui a un `data/local/{code}.json` sans `content/local/{code}.json` n'a pas de
 * page : il n'est pas contrôlé. Pour chaque `content/local/{code}.json`, échoue si :
 *   - le fichier n'est pas un JSON valide ou ne respecte pas `LocalEditorial` ; son `code`
 *     diffère du nom du fichier ;
 *   - `data/local/{code}.json` manque, n'est pas un JSON valide ou ne respecte pas `LocalData` ;
 *   - un fait n'a pas de `source_url` (http) ou de `collected_at` (AAAA-MM-JJ) ;
 *   - le nombre de faits sourcés est sous le seuil du type (`localThresholds` : commune 8,
 *     arrondissement 12, quartier 6, département 15) ; pour un quartier, les 6 faits doivent
 *     être `in_territory` ;
 *   - la zone éditoriale (Markdown converti en texte, sans titres ni liens, voir
 *     src/lib/local/text.ts) compte moins de mots que le seuil (350 / 450 / 300 / 600) ;
 *   - `faits_utilises` renvoie à un index absent de `facts[]` (un doublon est un avertissement) ;
 *   - un nombre écrit dans la zone éditoriale ou dans une réponse aux questions locales n'est
 *     couvert par aucune valeur des faits ni de la démographie, à l'arrondi près (règle exacte
 *     et exclusions dans src/lib/local/numbers.ts).
 * Le type `region` (carte régionale) n'a pas de seuil de faits ni de mots dans docs/04 §4 : il
 * n'est soumis qu'à la validité des fichiers, à la traçabilité et au contrôle des nombres.
 * Sans aucune page locale (content/local absent ou vide), le contrôle passe avec un avertissement.
 */

export interface LocalPage {
  code: string;
  /** Chemin relatif du fichier de contenu, pour les messages. */
  file: string;
  editorial: LocalEditorial | null;
  data: LocalData | null;
  /** Faits tels que lus, même quand le schéma échoue (comptage des faits sans source). */
  rawFacts: unknown[];
  /** Erreurs de lecture ou de schéma, déjà préfixées par le fichier. */
  errors: string[];
}

export interface LocalCorpus {
  pages: LocalPage[];
  warnings: string[];
}

function formatIssues(issues: readonly { path: PropertyKey[]; message: string }[]): string[] {
  return issues.map((issue) => {
    const at = issue.path
      .map((key) => (typeof key === "number" ? `[${key}]` : `.${String(key)}`))
      .join("")
      .replace(/^\./, "");
    return `${at || "$"} : ${issue.message}`;
  });
}

function rawFactsOf(value: unknown): unknown[] {
  if (value && typeof value === "object" && "facts" in value) {
    const facts = (value as { facts?: unknown }).facts;
    if (Array.isArray(facts)) return facts;
  }
  return [];
}

function withoutInvalidFacts(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const facts = rawFactsOf(value).filter((fact) => localFactSchema.safeParse(fact).success);
  return { ...value, facts };
}

async function readJson(file: string): Promise<{ value: unknown } | { error: string }> {
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch {
    return { error: "fichier absent" };
  }
  try {
    return { value: JSON.parse(raw) as unknown };
  } catch (error) {
    return { error: `JSON invalide (${error instanceof Error ? error.message : "erreur"})` };
  }
}

/** Lit et valide toutes les paires content/local + data/local d'un dépôt. */
export async function loadLocalPages(rootDir: string): Promise<LocalCorpus> {
  const contentDir = path.join(rootDir, "content", "local");
  let files: string[];
  try {
    files = (await readdir(contentDir)).filter((name) => name.endsWith(".json")).sort();
  } catch {
    files = [];
  }
  if (files.length === 0) {
    return { pages: [], warnings: ["aucune page locale : content/local absent ou vide"] };
  }

  const pages: LocalPage[] = [];
  for (const name of files) {
    const code = name.replace(/\.json$/, "");
    const file = `content/local/${name}`;
    const dataFile = `data/local/${name}`;
    const page: LocalPage = { code, file, editorial: null, data: null, rawFacts: [], errors: [] };

    const editorialRead = await readJson(path.join(contentDir, name));
    if ("error" in editorialRead) {
      page.errors.push(`${file} : ${editorialRead.error}`);
    } else {
      const parsed = localEditorialSchema.safeParse(editorialRead.value);
      if (parsed.success) {
        page.editorial = parsed.data;
        if (parsed.data.code !== code) {
          page.errors.push(`${file} : code « ${parsed.data.code} » différent du nom du fichier`);
        }
      } else {
        for (const issue of formatIssues(parsed.error.issues))
          page.errors.push(`${file} : ${issue}`);
      }
    }

    const dataRead = await readJson(path.join(rootDir, "data", "local", name));
    if ("error" in dataRead) {
      page.errors.push(`${dataFile} : ${dataRead.error} (lancez \`pnpm data:local\`)`);
    } else {
      page.rawFacts = rawFactsOf(dataRead.value);
      const parsed = localDataSchema.safeParse(dataRead.value);
      if (!parsed.success) {
        for (const issue of formatIssues(parsed.error.issues))
          page.errors.push(`${dataFile} : ${issue}`);
      }
      // Quand seuls des faits sont invalides, le reste des données sert quand même aux
      // seuils et au rapport : les faits invalides sont écartés, l'erreur reste.
      const usable = parsed.success
        ? parsed
        : localDataSchema.safeParse(withoutInvalidFacts(dataRead.value));
      if (usable.success) {
        page.data = usable.data;
        if (usable.data.code !== code) {
          page.errors.push(
            `${dataFile} : code « ${usable.data.code} » différent du nom du fichier`,
          );
        }
      }
    }
    pages.push(page);
  }
  return { pages, warnings: [] };
}

const httpUrl = /^https?:\/\//;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

/** Vrai si un fait (même non validé par le schéma) porte une source et une date de collecte. */
export function isSourced(fact: unknown): boolean {
  if (!fact || typeof fact !== "object") return false;
  const { source_url, collected_at } = fact as { source_url?: unknown; collected_at?: unknown };
  return (
    typeof source_url === "string" &&
    httpUrl.test(source_url) &&
    typeof collected_at === "string" &&
    isoDate.test(collected_at)
  );
}

function factLabel(fact: unknown, index: number): string {
  const label =
    fact && typeof fact === "object" && typeof (fact as { label?: unknown }).label === "string"
      ? (fact as { label: string }).label
      : "";
  return label ? `#${index} « ${label} »` : `#${index}`;
}

export interface FactsStats {
  kind: TerritoryKind | null;
  /** Faits avec source et date de collecte. */
  sourced: number;
  /** Faits sourcés situés dans le territoire même (`in_territory`). */
  inTerritory: number;
  /** Seuil de faits du type ; null pour `region` ou données invalides. */
  factsThreshold: number | null;
  words: number;
  wordsThreshold: number | null;
}

export interface FactsAudit {
  errors: string[];
  warnings: string[];
  stats: FactsStats;
}

function thresholdsOf(kind: TerritoryKind) {
  return kind === "region" ? null : localThresholds[kind];
}

const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** Contrôle une page locale déjà lue ; les erreurs de lecture sont reprises telles quelles. */
export function auditFacts(page: LocalPage): FactsAudit {
  const errors = [...page.errors];
  const warnings: string[] = [];
  const stats: FactsStats = {
    kind: page.data?.kind ?? null,
    sourced: page.rawFacts.filter(isSourced).length,
    inTerritory: 0,
    factsThreshold: null,
    words: 0,
    wordsThreshold: null,
  };

  const unsourced = page.rawFacts
    .map((fact, index) => (isSourced(fact) ? null : factLabel(fact, index)))
    .filter((label): label is string => label !== null);
  if (unsourced.length > 0) {
    errors.push(
      `${page.file} : ${unsourced.length} fait(s) sans source_url ou collected_at (règle d'or docs/04 §4) — ${unsourced.join(", ")}`,
    );
  }

  const { data, editorial } = page;
  if (editorial) {
    stats.words = countWords(markdownToText(editorial.zone_editoriale));
  }
  if (!data || !editorial) return { errors, warnings, stats };

  const thresholds = thresholdsOf(data.kind);
  stats.inTerritory = data.facts.filter((fact) => fact.in_territory === true).length;
  if (thresholds) {
    stats.factsThreshold = thresholds.faits;
    stats.wordsThreshold = thresholds.mots;
    if (stats.sourced < thresholds.faits) {
      errors.push(
        `${page.file} : ${stats.sourced} fait(s) sourcé(s), seuil ${thresholds.faits} pour un(e) ${data.kind} (docs/04 §4)`,
      );
    }
    if (data.kind === "quartier" && stats.inTerritory < thresholds.faits) {
      errors.push(
        `${page.file} : ${stats.inTerritory} fait(s) situé(s) dans le quartier (in_territory), seuil ${thresholds.faits} (docs/04 §4)`,
      );
    }
    if (stats.words < thresholds.mots) {
      errors.push(
        `${page.file} : zone éditoriale de ${stats.words} mots, seuil ${thresholds.mots} pour un(e) ${data.kind} (docs/04 §4)`,
      );
    }
  } else {
    warnings.push(`${page.file} : type ${data.kind}, aucun seuil de faits ni de mots (docs/04 §4)`);
  }

  const seen = new Set<number>();
  for (const index of editorial.faits_utilises) {
    if (index >= data.facts.length) {
      errors.push(
        `${page.file} : faits_utilises renvoie à l'index ${index}, facts[] n'en compte que ${data.facts.length}`,
      );
    } else if (seen.has(index)) {
      warnings.push(`${page.file} : faits_utilises cite deux fois l'index ${index}`);
    }
    seen.add(index);
  }

  const references = referenceNumbers(data);
  const fields: { label: string; text: string }[] = [
    { label: "zone_editoriale", text: markdownToText(editorial.zone_editoriale) },
    ...editorial.questions.map((q, i) => ({ label: `questions[${i}].reponse`, text: q.reponse })),
  ];
  for (const field of fields) {
    const missing = findUnsourcedNumbers(field.text, references);
    if (missing.length === 0) continue;
    const list = [...new Set(missing.map((m) => `« ${m.raw} »`))].join(", ");
    errors.push(
      `${page.file} › ${field.label} : nombre(s) absent(s) des faits et de la démographie — ${list} (un fait sourcé par chiffre, src/lib/local/numbers.ts)`,
    );
  }

  return { errors, warnings, stats };
}

/** Ligne de synthèse d'une page, pour le rapport (`--report`). */
export function describeFacts(stats: FactsStats): string {
  const facts =
    stats.factsThreshold === null
      ? `${stats.sourced} fait(s) sourcé(s)`
      : `faits sourcés ${stats.sourced}/${stats.factsThreshold}` +
        (stats.kind === "quartier" ? ` (dans le quartier ${stats.inTerritory})` : "");
  const words =
    stats.wordsThreshold === null
      ? `${fmt.format(stats.words)} mots`
      : `mots ${fmt.format(stats.words)}/${stats.wordsThreshold}`;
  return `${facts} · ${words}`;
}

export async function runLocalFactsCheck(ctx: CheckContext): Promise<CheckResult> {
  const corpus = await loadLocalPages(ctx.rootDir);
  const errors: string[] = [];
  const warnings = [...corpus.warnings];
  for (const page of corpus.pages) {
    const audit = auditFacts(page);
    errors.push(...audit.errors);
    warnings.push(...audit.warnings);
  }
  return result(errors, warnings);
}

export const checkLocalFacts: Check = {
  id: "check-local-facts",
  description:
    "une page locale est sous les seuils de faits sourcés ou de mots ; un fait sans source ; un nombre de la zone éditoriale absent des faits ; faits_utilises hors de facts[]",
  run: runLocalFactsCheck,
};
