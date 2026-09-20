import { existsSync } from "node:fs";
import path from "node:path";

/*
 * Logo de l'organisation : émis seulement si un fichier existe dans public/images/marque/
 * (Q-CONTENU-6, fichiers du logo attendus). Tant qu'il manque, `Organization.logo` est omis.
 * L'accès disque est exclu de l'analyse de Turbopack (turbopackIgnore) : il n'a lieu qu'au
 * build, sur des pages statiques.
 */

export const LOGO_DIR = "/images/marque/";
export const logoCandidates = ["logo.svg", "logo.png"] as const;

/** Chemin web du premier logo trouvé (« /images/marque/logo.svg »), ou null. */
export function findLogo(dir: string = path.join(process.cwd(), "public", "images", "marque")) {
  for (const candidate of logoCandidates) {
    if (existsSync(path.join(/* turbopackIgnore: true */ dir, candidate))) {
      return `${LOGO_DIR}${candidate}`;
    }
  }
  return null;
}
