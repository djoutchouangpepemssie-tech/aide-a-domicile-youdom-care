/*
 * Calcul de contraste WCAG 2.x (luminance relative sRGB) et lecture des jetons de couleur
 * de src/styles/tokens.css. Aucune dépendance : le contrôle doit rester vérifiable à la main.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  const clean = hex.trim().replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) {
    throw new Error(`Couleur hexadécimale invalide : « ${hex} »`);
  }
  const value = Number.parseInt(full, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Rapport de contraste WCAG entre deux couleurs, de 1 à 21. */
export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(hexToRgb(foreground));
  const l2 = relativeLuminance(hexToRgb(background));
  const [light, dark] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Compose une couleur opaque sur une autre (alpha de 0 à 1), comme le navigateur peint une surface
 * translucide : interpolation linéaire des canaux sRGB encodés, exactement ce que fait
 * `color-mix(in srgb, <couleur> <alpha>, transparent)` posé sur un fond.
 */
export function composite(layer: string, backdrop: string, alpha: number): string {
  if (alpha < 0 || alpha > 1) throw new Error(`Alpha hors bornes : ${alpha}`);
  const top = hexToRgb(layer);
  const bottom = hexToRgb(backdrop);
  const mix = (a: number, b: number) => Math.round(a * alpha + b * (1 - alpha));
  const channels = [mix(top.r, bottom.r), mix(top.g, bottom.g), mix(top.b, bottom.b)];
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export interface ColorTokens {
  /** Jetons `--color-*` du bloc `:root` (valeurs hexadécimales seulement). */
  base: Map<string, string>;
  /** Jetons redéfinis dans `:root[data-comfort="on"]`. */
  comfort: Map<string, string>;
}

const declaration = /--color-([a-z0-9-]+)\s*:\s*(#[0-9a-f]{3,6})\s*;/gi;
const glassAlpha = /--glass-alpha-([a-z0-9-]+)\s*:\s*([\d.]+)%\s*;/gi;

function collect(css: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const match of css.matchAll(declaration)) {
    const [, name, hex] = match;
    if (name && hex && !map.has(name)) map.set(name, hex.toLowerCase());
  }
  return map;
}

/**
 * Lit les opacités du verre de src/styles/glass.css (`--glass-alpha-base: 72%` → `base` → 0,72).
 * Le contrôle recompose les surfaces de verre à partir de ces valeurs : la feuille reste la seule
 * source, aucune opacité n'est recopiée dans le contrôle.
 */
export function parseGlassAlphas(css: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const match of css.matchAll(glassAlpha)) {
    const [, name, value] = match;
    if (name && value && !map.has(name)) map.set(name, Number(value) / 100);
  }
  return map;
}

/** Lit les jetons de couleur d'une feuille tokens.css (bloc de base et bloc confort). */
export function parseColorTokens(css: string): ColorTokens {
  const comfortStart = css.indexOf('[data-comfort="on"]');
  if (comfortStart === -1) {
    return { base: collect(css), comfort: new Map() };
  }
  const comfortEnd = css.indexOf("}", comfortStart);
  return {
    base: collect(css.slice(0, comfortStart)),
    comfort: collect(css.slice(comfortStart, comfortEnd)),
  };
}
