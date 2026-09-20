import path from "node:path";
import { fileURLToPath } from "node:url";
import { localThresholds, type LocalEditorial } from "../../src/content/local-schema";
import {
  jaccard,
  markdownToText,
  SHINGLE_SIZE,
  uniquenessKey,
  wordShingles,
} from "../../src/lib/local/text";
import { auditFacts, describeFacts, loadLocalPages, type LocalPage } from "./check-local-facts";
import { result, type Check, type CheckContext, type CheckResult } from "./types";

/*
 * docs/04 §4 (seuils bloquants) et docs/07 §7 : deux pages locales dépassent le seuil de
 * similarité. Le contrôle lit les fichiers de contenu, pas le rendu. Pour toute paire de pages
 * locales (content/local/*.json valides), il calcule l'indice de Jaccard sur les séquences de
 * 5 mots (après normalisation : minuscules, sans accents, sans ponctuation ; Markdown converti
 * en texte, voir src/lib/local/text.ts) du texte « zone éditoriale + questions locales
 * (question et réponse) ». Échoue si :
 *   - la similarité atteint le seuil : 0,30, ou 0,25 dès que l'une des deux pages est un
 *     département (`localThresholds`, le plus bas des deux seuils s'applique ; une page
 *     `region` a le seuil 0,30) ;
 *   - un sous-titre, un `seo.titre`, une `seo.description` ou une question (texte de la
 *     question) se retrouve sur deux pages locales, à la casse, aux accents et à la
 *     ponctuation près ; ou deux fois sur la même page.
 * Chaque message nomme les deux pages et la valeur. Sans aucune page locale, le contrôle passe
 * avec un avertissement.
 *
 * Rapport pour les rédacteurs : `pnpm exec tsx scripts/validate/check-local-uniqueness.ts --report`
 * imprime, pour chaque page locale, le type, les faits sourcés / seuil, les mots / seuil, la
 * similarité maximale et la page concernée (`formatLocalReport`).
 */

const DEFAULT_SIMILARITY = 0.3;

/** Texte comparé d'une page : zone éditoriale + questions locales. */
export function comparableText(editorial: LocalEditorial): string {
  const questions = editorial.questions.map((q) => `${q.question} ${q.reponse}`).join("\n");
  return `${markdownToText(editorial.zone_editoriale)}\n${questions}`;
}

function similarityThreshold(page: LocalPage): number {
  const kind = page.data?.kind;
  return kind && kind !== "region" ? localThresholds[kind].similarite : DEFAULT_SIMILARITY;
}

export interface PairSimilarity {
  a: string;
  b: string;
  similarity: number;
  threshold: number;
}

const percent = (value: number) => `${(value * 100).toFixed(1).replace(".", ",")} %`;
const ratio = (value: number) => value.toFixed(2).replace(".", ",");

/** Similarités de toutes les paires de pages dont le contenu est valide, triées décroissantes. */
export function pairSimilarities(pages: readonly LocalPage[]): PairSimilarity[] {
  const shingles = new Map<string, Set<string>>();
  for (const page of pages) {
    if (page.editorial) shingles.set(page.code, wordShingles(comparableText(page.editorial)));
  }
  const pairs: PairSimilarity[] = [];
  const valid = pages.filter((page) => page.editorial);
  for (let i = 0; i < valid.length; i += 1) {
    for (let j = i + 1; j < valid.length; j += 1) {
      const a = valid[i];
      const b = valid[j];
      if (!a || !b) continue;
      const sa = shingles.get(a.code);
      const sb = shingles.get(b.code);
      if (!sa || !sb) continue;
      pairs.push({
        a: a.code,
        b: b.code,
        similarity: jaccard(sa, sb),
        threshold: Math.min(similarityThreshold(a), similarityThreshold(b)),
      });
    }
  }
  return pairs.sort((x, y) => y.similarity - x.similarity || x.a.localeCompare(y.a));
}

interface ShortText {
  page: LocalPage;
  field: string;
  value: string;
}

function shortTexts(page: LocalPage): ShortText[] {
  const { editorial } = page;
  if (!editorial) return [];
  return [
    { page, field: "sous_titre", value: editorial.sous_titre },
    { page, field: "seo.titre", value: editorial.seo.titre },
    { page, field: "seo.description", value: editorial.seo.description },
    ...editorial.questions.map((q, i) => ({
      page,
      field: `questions[${i}].question`,
      value: q.question,
    })),
  ];
}

export interface UniquenessReport {
  errors: string[];
  warnings: string[];
}

export function auditUniqueness(pages: readonly LocalPage[]): UniquenessReport {
  const errors: string[] = [];

  for (const pair of pairSimilarities(pages)) {
    if (pair.similarity >= pair.threshold) {
      errors.push(
        `${pair.a} et ${pair.b} : similarité ${ratio(pair.similarity)} (Jaccard, séquences de ${SHINGLE_SIZE} mots), seuil < ${ratio(pair.threshold)} (docs/04 §4)`,
      );
    }
  }

  const groups = new Map<string, ShortText[]>();
  for (const page of pages) {
    for (const text of shortTexts(page)) {
      const key = `${text.field.replace(/\[\d+\]/, "[]")}|${uniquenessKey(text.value)}`;
      groups.set(key, [...(groups.get(key) ?? []), text]);
    }
  }
  for (const items of groups.values()) {
    if (items.length < 2) continue;
    const first = items[0];
    if (!first) continue;
    const where = items.map((t) => `${t.page.code} › ${t.field}`).join(", ");
    const label = first.field.replace(/\[\d+\]\.question$/, "");
    errors.push(
      `${where} : ${label} en double — « ${first.value} » (docs/04 §4 : écrit pour la page)`,
    );
  }

  return { errors: errors.sort(), warnings: [] };
}

export async function runLocalUniquenessCheck(ctx: CheckContext): Promise<CheckResult> {
  const corpus = await loadLocalPages(ctx.rootDir);
  const report = auditUniqueness(corpus.pages);
  return result(report.errors, [...corpus.warnings, ...report.warnings]);
}

export const checkLocalUniqueness: Check = {
  id: "check-local-uniqueness",
  description:
    "deux pages locales dépassent le seuil de similarité (Jaccard sur séquences de 5 mots) ; un sous-titre, un titre, une description ou une question en double",
  run: runLocalUniquenessCheck,
};

/** Rapport lisible pour les rédacteurs, une ligne par page locale (voir l'en-tête). */
export async function formatLocalReport(rootDir: string): Promise<string> {
  const corpus = await loadLocalPages(rootDir);
  if (corpus.pages.length === 0) return corpus.warnings.join("\n");
  const pairs = pairSimilarities(corpus.pages);
  const lines: string[] = [];
  for (const page of corpus.pages) {
    const audit = auditFacts(page);
    const best = pairs.find((pair) => pair.a === page.code || pair.b === page.code);
    const other = best ? (best.a === page.code ? best.b : best.a) : null;
    const similarity = best
      ? `similarité max ${ratio(best.similarity)} avec ${other} (seuil < ${ratio(best.threshold)}, ${percent(best.similarity)})`
      : "similarité max — (page seule)";
    const kind = page.data?.kind ?? "type inconnu";
    const state = audit.errors.length === 0 ? "ok" : `${audit.errors.length} erreur(s)`;
    lines.push(
      `${page.code} (${kind}) ${page.data?.chemin ?? ""}\n  ${describeFacts(audit.stats)} · ${similarity} · ${state}`,
    );
    for (const error of audit.errors) lines.push(`    ✖ ${error}`);
  }
  const uniqueness = auditUniqueness(corpus.pages);
  for (const error of uniqueness.errors) lines.push(`✖ ${error}`);
  return lines.join("\n");
}

const invokedDirectly =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly && process.argv.includes("--report")) {
  formatLocalReport(process.cwd())
    .then((text) => console.log(text))
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
