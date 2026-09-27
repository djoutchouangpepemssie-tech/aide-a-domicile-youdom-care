import { z } from "zod";
import aidesJson from "../../content/outils/aides-en-un-coup-d-oeil.json";
import ficheEnfantJson from "../../content/outils/fiche-de-vie-enfant.json";
import fichePersonneAgeeJson from "../../content/outils/fiche-de-vie-personne-agee.json";
import sortieJson from "../../content/outils/sortie-d-hospitalisation-48-heures.json";
import logementJson from "../../content/outils/tour-du-logement-anti-chutes.json";
import toolsPageJson from "../../content/pages/outils.json";
import { toolPageSchema, toolsPageSchema, type ToolPage, type ToolsPage } from "./tools-schema";

/*
 * Registre des outils à imprimer (docs/06 §7, P7.7) : content/outils/{slug}.json, validés à la
 * première lecture ; une erreur interrompt le build. L'identifiant du fichier doit correspondre
 * au champ `id`. L'ordre ci-dessous est celui de l'index /outils/ et du plan du site.
 */

const files: Record<string, unknown> = {
  "sortie-d-hospitalisation-48-heures": sortieJson,
  "fiche-de-vie-enfant": ficheEnfantJson,
  "fiche-de-vie-personne-agee": fichePersonneAgeeJson,
  "tour-du-logement-anti-chutes": logementJson,
  "aides-en-un-coup-d-oeil": aidesJson,
};

const cache = new Map<string, ToolPage>();

export const TOOLS_PATH = "/outils/";

export function toolPath(id: string): string {
  return `${TOOLS_PATH}${id}/`;
}

/** Chemin public du PDF balisé, généré par `pnpm pdf:outils` (scripts/pdf/outils.ts). */
export function toolPdfPath(id: string): string {
  return `${TOOLS_PATH}${id}.pdf`;
}

export function listToolIds(): string[] {
  return Object.keys(files);
}

export function getToolPage(id: string): ToolPage | null {
  const raw = files[id];
  if (raw === undefined) return null;
  const cached = cache.get(id);
  if (cached) return cached;
  const result = toolPageSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`content/outils/${id}.json est invalide :\n${z.prettifyError(result.error)}`);
  }
  if (result.data.id !== id) {
    throw new Error(`content/outils/${id}.json : le champ id vaut « ${result.data.id} »`);
  }
  cache.set(id, result.data);
  return result.data;
}

/** Les cinq outils, dans l'ordre de l'index. */
export function listToolPages(): ToolPage[] {
  return listToolIds().flatMap((id) => {
    const page = getToolPage(id);
    return page ? [page] : [];
  });
}

/** Date de contenu la plus récente parmi les outils (index /outils/ et plan de site). */
export function latestToolUpdate(): string {
  return listToolPages()
    .map((page) => page.maj)
    .reduce((latest, maj) => (maj > latest ? maj : latest), "0000-00-00");
}

let toolsPage: ToolsPage | undefined;

/** Index /outils/ (content/pages/outils.json). */
export function getToolsPage(): ToolsPage {
  if (!toolsPage) {
    const result = toolsPageSchema.safeParse(toolsPageJson);
    if (!result.success) {
      throw new Error(`content/pages/outils.json est invalide :\n${z.prettifyError(result.error)}`);
    }
    toolsPage = result.data;
  }
  return toolsPage;
}
