import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  composite,
  contrastRatio,
  parseColorTokens,
  parseGlassAlphas,
  type ColorTokens,
} from "./contrast";
import { result, type Check, type CheckContext, type CheckResult } from "./types";

/*
 * docs/02 §2 : table des couples de couleurs autorisés, avec le rapport annoncé par le cahier.
 * Le contrôle recalcule chaque rapport depuis src/styles/tokens.css : il échoue si une valeur
 * s'écarte du cahier de plus de 0,05, ou si un couple passe sous son seuil d'usage.
 * Un jeton « comfort:x » désigne la valeur redéfinie en mode confort de lecture.
 *
 * Verre liquide (D-032) : une couleur peut aussi s'écrire
 *   - « #rrggbb » : valeur littérale (le noir sert de pire cas d'une photo sombre) ;
 *   - « mix:<couche>@<alpha>/<fond> » : la couche posée sur le fond, comme le navigateur peint une
 *     surface translucide. `<alpha>` est un pourcentage (« 10 ») ou le nom d'une opacité de
 *     src/styles/glass.css (« glass-base », « glass-quiet », « glass-strong », « glass-dark »,
 *     « glass-fallback »). `<fond>` peut lui-même être un « mix: » (reflet posé sur du verre).
 * Les fonds de scène (src/styles/scenes.css) n'ont pas besoin de cette mécanique : toutes leurs
 * couches sont des mélanges vers `--scene-deep` et `--scene-accent`, donc mesurer le texte sur ces
 * deux jetons borne toute la surface.
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

  /* ---- Heros soutenus (2026-09-27, D-036) : `scene-soutenu` pousse `--scene-deep` et
     `--scene-accent` d'un cran, vers les niveaux 200. Ce sont les points les plus soutenus du
     site : mesurer le texte dessus couvre toute la surface d'un hero. ---- */
  { fg: "ink", bg: "teal-200", expected: 10.15, min: 7, usage: "hero canard et aurore, texte" },
  {
    fg: "ink-soft",
    bg: "teal-200",
    expected: 4.67,
    min: 4.5,
    usage: "hero canard et aurore, texte secondaire",
  },
  {
    fg: "teal-800",
    bg: "teal-200",
    expected: 5.19,
    min: 4.5,
    usage: "liens sur un hero canard et aurore",
  },
  { fg: "ink", bg: "azure-200", expected: 10.19, min: 7, usage: "hero azur, texte" },
  {
    fg: "ink-soft",
    bg: "azure-200",
    expected: 4.69,
    min: 4.5,
    usage: "hero azur, texte secondaire",
  },
  { fg: "teal-800", bg: "azure-200", expected: 5.21, min: 4.5, usage: "liens sur un hero azur" },
  { fg: "ink", bg: "green-200", expected: 10.58, min: 7, usage: "hero vert, texte" },
  {
    fg: "ink-soft",
    bg: "green-200",
    expected: 4.86,
    min: 4.5,
    usage: "hero vert, texte secondaire",
  },
  { fg: "teal-800", bg: "green-200", expected: 5.41, min: 4.5, usage: "liens sur un hero vert" },
  { fg: "ink", bg: "raspberry-200", expected: 9.91, min: 7, usage: "hero framboise, texte" },
  {
    fg: "ink-soft",
    bg: "raspberry-200",
    expected: 4.55,
    min: 4.5,
    usage: "hero framboise, texte secondaire",
  },
  {
    fg: "teal-800",
    bg: "raspberry-200",
    expected: 5.06,
    min: 4.5,
    usage: "liens sur un hero framboise",
  },
  { fg: "ink", bg: "sand-deeper", expected: 9.94, min: 7, usage: "hero sable, texte" },
  {
    fg: "ink-soft",
    bg: "sand-deeper",
    expected: 4.57,
    min: 4.5,
    usage: "hero sable, texte secondaire",
  },
  { fg: "teal-800", bg: "sand-deeper", expected: 5.08, min: 4.5, usage: "liens sur un hero sable" },

  /* ---- D-032 : fonds de scène (src/styles/scenes.css) ---- */
  /* Le point le plus soutenu de chaque scène (`--scene-deep`) borne toute la surface : aucune
     couche ne peut être plus sombre. Le texte courant y reste AAA, le texte secondaire AA, les
     liens passent en teal-800 (teal-700 n'y suffit pas). */
  { fg: "ink", bg: "teal-100", expected: 10.79, min: 7, usage: "scène canard et aurore, texte" },
  {
    fg: "ink-soft",
    bg: "teal-100",
    expected: 4.96,
    min: 4.5,
    usage: "scène canard, texte secondaire",
  },
  { fg: "teal-800", bg: "teal-100", expected: 5.52, min: 4.5, usage: "liens sur une scène canard" },
  {
    fg: "teal-700",
    bg: "teal-100",
    expected: 3.93,
    min: null,
    usage: "interdit : sur une scène, les liens sont en teal-800",
  },
  { fg: "ink", bg: "azure-100", expected: 10.6, min: 7, usage: "scène azur, texte" },
  {
    fg: "ink-soft",
    bg: "azure-100",
    expected: 4.88,
    min: 4.5,
    usage: "scène azur, texte secondaire",
  },
  { fg: "teal-800", bg: "azure-100", expected: 5.42, min: 4.5, usage: "liens sur une scène azur" },
  { fg: "ink", bg: "green-100", expected: 11.35, min: 7, usage: "scène verte, texte" },
  {
    fg: "ink-soft",
    bg: "green-100",
    expected: 5.22,
    min: 4.5,
    usage: "scène verte, texte secondaire",
  },
  { fg: "teal-800", bg: "green-100", expected: 5.8, min: 4.5, usage: "liens sur une scène verte" },
  { fg: "ink", bg: "raspberry-100", expected: 10.77, min: 7, usage: "scène framboise, texte" },
  {
    fg: "ink-soft",
    bg: "raspberry-100",
    expected: 4.95,
    min: 4.5,
    usage: "scène framboise, texte secondaire",
  },
  {
    fg: "teal-800",
    bg: "raspberry-100",
    expected: 5.5,
    min: 4.5,
    usage: "liens sur une scène framboise",
  },
  { fg: "ink", bg: "sand-deep", expected: 10.72, min: 7, usage: "scène sable, texte" },
  {
    fg: "ink-soft",
    bg: "sand-deep",
    expected: 4.93,
    min: 4.5,
    usage: "scène sable, texte secondaire",
  },
  { fg: "teal-800", bg: "sand-deep", expected: 5.48, min: 4.5, usage: "liens sur une scène sable" },
  { fg: "white", bg: "ink", expected: 14.15, min: 7, usage: "scène de nuit, point le plus sombre" },
  /* Scène neutre et halos clairs : sable et teal-50 servent aussi de point soutenu ou d'accent. */
  {
    fg: "ink-soft",
    bg: "sand",
    expected: 5.64,
    min: 4.5,
    usage: "scène neutre, texte secondaire",
  },
  { fg: "teal-800", bg: "sand", expected: 6.27, min: 4.5, usage: "liens sur une scène neutre" },
  {
    fg: "ink-soft",
    bg: "teal-50",
    expected: 5.82,
    min: 4.5,
    usage: "halo clair, texte secondaire",
  },
  { fg: "teal-800", bg: "teal-50", expected: 6.47, min: 4.5, usage: "liens sur un halo clair" },
  { fg: "white", bg: "teal-800", expected: 7.23, min: 4.5, usage: "halo de la scène de nuit" },

  /* ---- D-032 : verre liquide (src/styles/glass.css) ---- */
  /* Le fond effectif est la teinte du verre composée sur la couleur de page. Deux bornes par
     surface : la page la plus claire (blanc) et la plus sombre où la surface est autorisée. */
  {
    fg: "ink",
    bg: "mix:white@glass-base/white",
    expected: 14.15,
    min: 7,
    usage: "verre sur blanc",
  },
  {
    fg: "ink",
    bg: "mix:white@glass-base/sand",
    expected: 13.46,
    min: 7,
    usage: "verre sur la section teintée la plus sombre",
  },
  {
    fg: "ink",
    bg: "mix:white@glass-base/teal-100",
    expected: 12.79,
    min: 7,
    usage: "verre sur le point le plus soutenu d'une scène",
  },
  {
    fg: "ink-soft",
    bg: "mix:white@glass-base/teal-100",
    expected: 5.88,
    min: 4.5,
    usage: "texte secondaire sur verre posé sur une scène",
  },
  {
    fg: "teal-800",
    bg: "mix:white@glass-base/teal-100",
    expected: 6.54,
    min: 4.5,
    usage: "liens et anneau de focus sur verre",
  },
  {
    fg: "ink",
    bg: "mix:white@glass-base/#000000",
    expected: 5.28,
    min: 4.5,
    usage: "verre clair sur une photo noire (pire cas)",
  },
  {
    fg: "ink-soft",
    bg: "mix:white@glass-base/#000000",
    expected: 2.43,
    min: null,
    usage: "interdit : pas de texte secondaire sur du verre clair posé sur une photo",
  },
  {
    fg: "ink",
    bg: "mix:white@glass-quiet/sand",
    expected: 13.67,
    min: 7,
    usage: "verre discret (champs, grandes surfaces de texte)",
  },
  {
    fg: "ink",
    bg: "mix:white@glass-strong/sand",
    expected: 13.8,
    min: 7,
    usage: "verre dense (en-tête, barre d'action)",
  },
  {
    fg: "ink",
    bg: "mix:white@glass-fallback/sand",
    expected: 14.02,
    min: 7,
    usage: "repli sans backdrop-filter",
  },
  {
    fg: "ink",
    bg: "mix:white@glass-fallback/#000000",
    expected: 12.42,
    min: 7,
    usage: "repli sans backdrop-filter sur une photo noire",
  },
  {
    fg: "ink",
    bg: "mix:teal-50@glass-base/sand",
    expected: 12.46,
    min: 7,
    usage: "glass-tint-teal",
  },
  {
    fg: "ink",
    bg: "mix:raspberry-50@glass-base/paper",
    expected: 12.79,
    min: 7,
    usage: "glass-tint-framboise",
  },
  {
    fg: "ink",
    bg: "mix:sand@glass-base/paper",
    expected: 12.7,
    min: 7,
    usage: "glass-tint-sable",
  },
  {
    fg: "ink",
    bg: "mix:green-50@glass-base/paper",
    expected: 12.96,
    min: 7,
    usage: "glass-tint-green",
  },
  {
    fg: "ink",
    bg: "mix:azure-50@glass-base/paper",
    expected: 12.73,
    min: 7,
    usage: "glass-tint-azure",
  },
  {
    fg: "warning",
    bg: "mix:warning-bg@glass-base/paper",
    expected: 6.56,
    min: 4.5,
    usage: "glass-tint-warning, encart « Attention »",
  },
  {
    fg: "teal-700",
    bg: "mix:white@glass-quiet/paper",
    expected: 5.11,
    min: 4.5,
    usage: "libellé du bouton fantôme sur verre discret",
  },
  {
    fg: "teal-700",
    bg: "mix:white@glass-quiet/sand",
    expected: 5.03,
    min: 4.5,
    usage: "bouton fantôme sur section sable",
  },
  {
    fg: "field-border",
    bg: "mix:white@glass-quiet/paper",
    expected: 3.63,
    min: 3,
    usage: "bordure d'un champ en verre discret",
  },
  {
    fg: "white",
    bg: "mix:teal-900@glass-dark/white",
    expected: 7.35,
    min: 4.5,
    usage: "verre sombre sur fond blanc (pire cas)",
  },
  {
    fg: "white",
    bg: "mix:teal-900@glass-dark/#000000",
    expected: 11.68,
    min: 4.5,
    usage: "verre sombre sur une photo noire",
  },
  {
    fg: "white",
    bg: "mix:teal-900@glass-dark/teal-100",
    expected: 7.72,
    min: 4.5,
    usage: "verre sombre sur une scène claire",
  },
  {
    fg: "white",
    bg: "mix:white@10/mix:teal-900@glass-dark/white",
    expected: 5.74,
    min: 4.5,
    usage: "reflet de 10 % sur du verre sombre (pire cas)",
  },
  {
    fg: "mix:white@10/ink",
    bg: "mix:white@10/mix:white@glass-base/sand",
    expected: 9.97,
    min: 7,
    usage: "reflet de 10 % sur du verre clair (texte et fond éclaircis)",
  },
  {
    fg: "white",
    bg: "mix:white@10/raspberry-600",
    expected: 4.34,
    min: null,
    usage: "interdit : pas de reflet blanc sur le bouton principal (4,34 au lieu de 4,90)",
  },
];

export const tolerance = 0.05;

function resolveAlpha(alphas: Map<string, number>, reference: string): number | undefined {
  const named = alphas.get(reference);
  if (named !== undefined) return named;
  if (/^[\d.]+$/.test(reference)) return Number(reference) / 100;
  return undefined;
}

function resolve(
  tokens: ColorTokens,
  name: string,
  alphas: Map<string, number> = new Map(),
): string | undefined {
  if (name.startsWith("#")) return name.toLowerCase();
  if (name.startsWith("comfort:")) return tokens.comfort.get(name.slice("comfort:".length));
  if (name.startsWith("mix:")) {
    const rest = name.slice("mix:".length);
    const at = rest.indexOf("@");
    const slash = rest.indexOf("/", at);
    if (at === -1 || slash === -1) return undefined;
    const layer = resolve(tokens, rest.slice(0, at), alphas);
    const alpha = resolveAlpha(alphas, rest.slice(at + 1, slash));
    const backdrop = resolve(tokens, rest.slice(slash + 1), alphas);
    if (!layer || !backdrop || alpha === undefined) return undefined;
    return composite(layer, backdrop, alpha);
  }
  return tokens.base.get(name);
}

/** Opacités du verre nommées « glass-<niveau> » pour la syntaxe « mix: ». */
function glassAlphaMap(css: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const [name, value] of parseGlassAlphas(css)) map.set(`glass-${name}`, value);
  return map;
}

/** Vérifie la table des couples contre les jetons ; renvoie les erreurs (vide si tout est bon). */
export function checkContrastPairs(
  tokens: ColorTokens,
  pairs: readonly ContrastPair[] = contrastPairs,
  alphas: Map<string, number> = new Map(),
): string[] {
  const errors: string[] = [];
  for (const pair of pairs) {
    const fg = resolve(tokens, pair.fg, alphas);
    const bg = resolve(tokens, pair.bg, alphas);
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
  const styles = path.join(ctx.rootDir, "src", "styles");
  const tokens = parseColorTokens(await readFile(path.join(styles, "tokens.css"), "utf8"));
  const alphas = glassAlphaMap(await readFile(path.join(styles, "glass.css"), "utf8"));
  return result(checkContrastPairs(tokens, contrastPairs, alphas));
}

export const checkContrast: Check = {
  id: "check-contrast",
  description:
    "un couple de jetons de docs/02 §2 s'écarte du rapport annoncé (± 0,05) ou passe sous son seuil d'usage",
  run: runContrastCheck,
};
