import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { addMonths, listArticleMetas } from "../../src/content/article-meta";
import { aidPageSchema } from "../../src/content/schemas";
import { result, type Check, type CheckContext, type CheckResult } from "./types";

/*
 * docs/07 §7 et docs/06 §4 : avertissement, jamais d'erreur, quand un contenu a dépassé sa date
 * de révision.
 * - Articles du Fil (content/magazine/*.mdx, hors brouillons) : `revision_le`, ou `maj_le` plus
 *   douze mois (six pour « Droits et aides »), est passée.
 * - Pages détaillées des aides (content/aides/{id}.json) : `maj` date de plus de six mois, le
 *   délai des aides financières ; les montants et les sources sont à revérifier.
 * Un fichier invalide n'est pas signalé ici : c'est le rôle de check-content.
 */

export const AID_REVISION_MONTHS = 6;

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Vrai si la date ISO `due` est strictement avant `today`. */
export function isOverdue(due: string, today: string): boolean {
  return due < today;
}

async function listJson(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir))
      .filter((name) => name.endsWith(".json"))
      .map((name) => path.join(dir, name))
      .sort();
  } catch {
    return [];
  }
}

export async function collectFreshnessWarnings(
  rootDir: string,
  today = todayIso(),
): Promise<string[]> {
  const warnings: string[] = [];
  const relative = (file: string) => path.relative(rootDir, file).split(path.sep).join("/");

  const articles = await listArticleMetas({
    dir: path.join(rootDir, "content", "magazine"),
    warn: () => {},
  });
  for (const article of articles) {
    if (isOverdue(article.revision, today)) {
      warnings.push(
        `${article.file} : révision prévue le ${article.revision} dépassée (rubrique ${article.meta.rubrique}, mise à jour du ${article.meta.maj_le}) — à relire et à redater.`,
      );
    }
  }

  for (const file of await listJson(path.join(rootDir, "content", "aides"))) {
    let data: unknown;
    try {
      data = JSON.parse(await readFile(file, "utf8")) as unknown;
    } catch {
      continue;
    }
    const parsed = aidPageSchema.safeParse(data);
    if (!parsed.success) continue;
    const due = addMonths(parsed.data.maj, AID_REVISION_MONTHS);
    if (isOverdue(due, today)) {
      warnings.push(
        `${relative(file)} : mise à jour du ${parsed.data.maj}, plus de ${AID_REVISION_MONTHS} mois — montants et sources à revérifier.`,
      );
    }
  }

  return warnings;
}

export async function runFreshnessCheck(ctx: CheckContext): Promise<CheckResult> {
  return result([], await collectFreshnessWarnings(ctx.rootDir));
}

export const checkFreshness: Check = {
  id: "check-freshness",
  description:
    "(avertissement seulement) un article a dépassé sa date de révision prévue ou une page d'aide n'a pas été mise à jour depuis six mois",
  run: runFreshnessCheck,
};
