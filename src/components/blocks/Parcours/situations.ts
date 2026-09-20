import { listBuildableServicePages } from "@/content/services";
import type { PanelPublic } from "./SituationPanel";

/*
 * Situations du panneau (docs/design/CONCEPT.md §3, bloc 2) : pour chaque choix de la bannière
 * qui désigne un public, les `situations[]` de la page pilier correspondante (content/services,
 * lues côté serveur au build), trois à cinq, chacune reliée à sa destination propre (`href` de
 * l'en-tête : formulaire ou page précise) ou, à défaut, à la section « Vous vous reconnaissez ? »
 * du pilier (ancre `#situations`). Un choix sans page pilier construite (page à relire en
 * production) n'a pas de panneau : il reste un simple lien dans la bannière.
 */

export interface SituationChoice {
  id: string;
  /** Complément du titre du panneau ; absent pour « Je ne sais pas encore ». */
  pour?: string;
}

export const SITUATIONS_ANCHOR = "#situations";

export async function loadPanelPublics(
  choices: readonly SituationChoice[],
): Promise<PanelPublic[]> {
  const pages = await listBuildableServicePages();
  return choices.flatMap((choice) => {
    if (!choice.pour) return [];
    const page = pages.find((p) => p.meta.type === "pilier" && p.meta.public === choice.id);
    if (!page) return [];
    const fallback = `${page.meta.chemin}${SITUATIONS_ANCHOR}`;
    const situations = page.meta.situations
      .slice(0, 5)
      .map((s) => ({ titre: s.titre, texte: s.texte, href: s.href ?? fallback }));
    return [{ id: choice.id, pour: choice.pour, situations }];
  });
}
