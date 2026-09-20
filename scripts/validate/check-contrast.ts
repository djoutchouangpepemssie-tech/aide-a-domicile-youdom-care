import { readFile } from "node:fs/promises";
import path from "node:path";
import { contrastRatio, parseColorTokens, type ColorTokens } from "./contrast";
import { result, type Check, type CheckContext, type CheckResult } from "./types";

/*
 * docs/02 §2 : table des couples de couleurs autorisés, avec le rapport annoncé par le cahier.
 * Le contrôle recalcule chaque rapport depuis src/styles/tokens.css : il échoue si une valeur
 * s'écarte du cahier de plus de 0,05, ou si un couple passe sous son seuil d'usage.
 * Un jeton « comfort:x » désigne la valeur redéfinie en mode confort de lecture.
 */

export interface ContrastPair {
  /** Jeton de premier plan (texte, trait). */
  fg: string;
  /** Jeton de fond. */
  bg: string;
  /** Rapport annoncé dans docs/02 §2. */
  expected: number;
  /**
   * Seuil bloquant selon l'usage : 7 (AAA, texte courant), 4.5 (AA, texte), 3 (grand texte,
   * composants d'interface, illustrations), null (décoratif ou couple documenté comme interdit).
   */
  min: number | null;
  usage: string;
}

export const contrastPairs: readonly ContrastPair[] = [
  { fg: "ink", bg: "white", expected: 14.15, min: 7, usage: "texte principal sur blanc" },
  { fg: "ink", bg: "paper", expected: 13.36, min: 7, usage: "texte principal sur papier" },
  { fg: "ink-soft", bg: "white", expected: 6.51, min: 4.5, usage: "texte secondaire sur blanc" },
  { fg: "ink-soft", bg: "paper", expected: 6.14, min: 4.5, usage: "texte secondaire sur papier" },
  { fg: "teal-500", bg: "white", expected: 3.39, min: 3, usage: "aplats et titres décoratifs" },
  { fg: "teal-600", bg: "white", expected: 4.07, min: 3, usage: "grands textes de marque" },
  { fg: "teal-700", bg: "white", expected: 5.16, min: 4.5, usage: "liens et boutons secondaires" },
  { fg: "teal-700", bg: "paper", expected: 4.87, min: 4.5, usage: "liens sur papier" },
  {
    fg: "teal-700",
    bg: "sand",
    expected: 4.47,
    min: null,
    usage: "documenté sous 4,5 : liens en teal-800 sur sable",
  },
  { fg: "teal-800", bg: "white", expected: 7.23, min: 4.5, usage: "anneau de focus, liens" },
  { fg: "teal-800", bg: "paper", expected: 6.83, min: 4.5, usage: "liens sur papier" },
  { fg: "teal-900", bg: "white", expected: 10.29, min: 4.5, usage: "titres" },
  { fg: "white", bg: "teal-900", expected: 10.29, min: 4.5, usage: "pied de page" },
  { fg: "ink", bg: "teal-50", expected: 12.66, min: 7, usage: "texte sur fond de section" },
  { fg: "ink", bg: "green-500", expected: 6.13, min: 4.5, usage: "texte encre sur aplat vert" },
  {
    fg: "white",
    bg: "green-500",
    expected: 2.31,
    min: null,
    usage: "interdit : le vert ne porte jamais de texte blanc",
  },
  { fg: "green-700", bg: "white", expected: 4.93, min: 4.5, usage: "texte de succès" },
  { fg: "ink", bg: "green-50", expected: 12.84, min: 7, usage: "encarts « Bon à savoir »" },
  { fg: "raspberry-500", bg: "white", expected: 3.75, min: 3, usage: "accent décoratif, nœud" },
  { fg: "white", bg: "raspberry-600", expected: 4.9, min: 4.5, usage: "bouton principal" },
  { fg: "raspberry-700", bg: "white", expected: 6.29, min: 4.5, usage: "survol, texte d'accent" },
  {
    fg: "raspberry-700",
    bg: "raspberry-50",
    expected: 5.51,
    min: 4.5,
    usage: "accent sur rose pâle",
  },
  { fg: "ink", bg: "raspberry-50", expected: 12.41, min: 7, usage: "encart d'urgence douce" },
  { fg: "azure-600", bg: "white", expected: 4.55, min: 4.5, usage: "liens du magazine" },
  { fg: "azure-700", bg: "white", expected: 5.97, min: 4.5, usage: "variante foncée" },
  { fg: "ink", bg: "azure-50", expected: 12.47, min: 7, usage: "fond azur" },
  { fg: "ink", bg: "sand", expected: 12.26, min: 7, usage: "section alternée" },
  { fg: "line", bg: "white", expected: 1.31, min: null, usage: "filets décoratifs seulement" },
  { fg: "field-border", bg: "white", expected: 3.67, min: 3, usage: "bordure des champs" },
  {
    fg: "field-border",
    bg: "paper",
    expected: 3.46,
    min: 3,
    usage: "bordure des champs sur papier",
  },
  { fg: "danger", bg: "danger-bg", expected: 6.05, min: 4.5, usage: "erreurs" },
  { fg: "warning", bg: "warning-bg", expected: 6.51, min: 4.5, usage: "encarts « Attention »" },
  { fg: "comfort:text", bg: "white", expected: 16.54, min: 7, usage: "texte en mode confort" },
  { fg: "comfort:link", bg: "white", expected: 9.92, min: 7, usage: "liens en mode confort" },
];

export const tolerance = 0.05;

function resolve(tokens: ColorTokens, name: string): string | undefined {
  if (name.startsWith("comfort:")) return tokens.comfort.get(name.slice("comfort:".length));
  return tokens.base.get(name);
}

/** Vérifie la table des couples contre les jetons ; renvoie les erreurs (vide si tout est bon). */
export function checkContrastPairs(
  tokens: ColorTokens,
  pairs: readonly ContrastPair[] = contrastPairs,
): string[] {
  const errors: string[] = [];
  for (const pair of pairs) {
    const fg = resolve(tokens, pair.fg);
    const bg = resolve(tokens, pair.bg);
    if (!fg || !bg) {
      errors.push(`jeton introuvable pour le couple ${pair.fg} / ${pair.bg}`);
      continue;
    }
    const ratio = contrastRatio(fg, bg);
    const rounded = Math.round(ratio * 100) / 100;
    if (Math.abs(rounded - pair.expected) > tolerance) {
      errors.push(
        `${pair.fg} sur ${pair.bg} : calculé ${rounded.toFixed(2)}, cahier ${pair.expected.toFixed(2)} (écart > ${tolerance})`,
      );
    }
    if (pair.min !== null && rounded < pair.min) {
      errors.push(
        `${pair.fg} sur ${pair.bg} : ${rounded.toFixed(2)} sous le seuil ${pair.min} (${pair.usage})`,
      );
    }
  }
  return errors;
}

export async function runContrastCheck(ctx: CheckContext): Promise<CheckResult> {
  const file = path.join(ctx.rootDir, "src", "styles", "tokens.css");
  const tokens = parseColorTokens(await readFile(file, "utf8"));
  return result(checkContrastPairs(tokens));
}

export const checkContrast: Check = {
  id: "check-contrast",
  description:
    "un couple de jetons de docs/02 §2 s'écarte du rapport annoncé (± 0,05) ou passe sous son seuil d'usage",
  run: runContrastCheck,
};
