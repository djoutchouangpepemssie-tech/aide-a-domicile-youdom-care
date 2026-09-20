import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/*
 * Police des images Open Graph (docs/04 §2 : titre en Fraunces). `ImageResponse` (satori) ne lit
 * que TTF, OTF et WOFF : les WOFF2 produits par `next/font` sont inutilisables ici. Recherche :
 * 1. public/fonts/Fraunces*.ttf|otf : fichier auto-hébergé (licence OFL), s'il a été déposé ;
 * 2. l'API CSS de Google Fonts, la source que `next/font/google` interroge déjà au build :
 *    instance statique opsz 144, SOFT 50, graisse 600 (la plus proche du 560 des titres) ;
 * 3. à défaut (hors ligne), la police par défaut de next/og (Geist), avec un avertissement.
 * Les images sont générées au build : aucune requête ne part du navigateur du visiteur.
 */

export const OG_FONT_FAMILY = "Fraunces";
export const OG_FONT_WEIGHT = 600;

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");
const GOOGLE_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@144,560,50&display=swap";

export interface OgFont {
  name: string;
  data: ArrayBuffer;
  weight: 600;
  style: "normal";
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const copy = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(copy).set(buffer);
  return copy;
}

/** Premier fichier Fraunces TTF ou OTF de public/fonts, sinon null. */
export async function readLocalFont(dir: string = FONTS_DIR): Promise<ArrayBuffer | null> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return null;
  }
  const file = names.filter((name) => /^fraunces.*\.(ttf|otf)$/i.test(name)).sort()[0];
  if (!file) return null;
  return toArrayBuffer(await readFile(path.join(dir, file)));
}

/** Adresse du TTF de la graisse demandée dans une feuille de Google Fonts (sinon le premier). */
export function pickTrueTypeUrl(css: string, weight: number = OG_FONT_WEIGHT): string | null {
  const blocks = css.split("@font-face").slice(1);
  const urlOf = (block: string) =>
    /url\((https:[^)]+\.ttf)\)\s*format\(['"]truetype['"]\)/.exec(block)?.[1] ?? null;
  const weightPattern = new RegExp(`font-weight:\\s*${weight}\\b`);
  const preferred = blocks.find((block) => weightPattern.test(block));
  const preferredUrl = preferred ? urlOf(preferred) : null;
  if (preferredUrl) return preferredUrl;
  for (const block of blocks) {
    const url = urlOf(block);
    if (url) return url;
  }
  return null;
}

export async function fetchGoogleFont(
  fetchImpl: typeof fetch = fetch,
): Promise<ArrayBuffer | null> {
  try {
    // Sans agent utilisateur de navigateur, Google Fonts sert du TTF.
    const css = await fetchImpl(GOOGLE_CSS_URL, { headers: { "User-Agent": "youdom-care-og" } });
    if (!css.ok) return null;
    const url = pickTrueTypeUrl(await css.text());
    if (!url) return null;
    const font = await fetchImpl(url);
    if (!font.ok) return null;
    return await font.arrayBuffer();
  } catch {
    return null;
  }
}

async function load(): Promise<OgFont[]> {
  const data = (await readLocalFont()) ?? (await fetchGoogleFont());
  if (!data) {
    console.warn(
      "opengraph-image : Fraunces introuvable (public/fonts/ ou Google Fonts) ; police par défaut de next/og utilisée",
    );
    return [];
  }
  return [{ name: OG_FONT_FAMILY, data, weight: OG_FONT_WEIGHT, style: "normal" }];
}

let cache: Promise<OgFont[]> | undefined;

/** Polices à passer à `ImageResponse` ; chargées une fois par processus de build. */
export function loadOgFonts(): Promise<OgFont[]> {
  cache ??= load();
  return cache;
}
