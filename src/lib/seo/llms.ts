import {
  getAbout,
  getCallbackPage,
  getHowItWorksPage,
  getPricingPage,
  getSiteConfig,
} from "@/content/loader";
import { listArticleMetas } from "@/content/article-meta";
import { lexiqueTermPath, listLexiqueTerms } from "@/content/lexique";
import { listMdxFiles, readServiceMeta, SERVICES_DIR } from "@/content/service-meta";
import { canonicalUrl } from "./metadata";

/*
 * /llms.txt (docs/04 §2 « Moteurs de réponse », P5.6) : un résumé du site pour les assistants,
 * au format llms.txt (titre, citation, paragraphes, sections de liens). Tout vient de content/ :
 * marque et zones de site.config.json, règle éditoriale de la charte (pages/a-propos.json),
 * piliers et pages services relues (statut `publie` : les pages `a_relire` sont noindex en
 * prévisualisation et absentes en production), pages de fonctionnement, termes du lexique
 * (docs/06 §6 : la définition en une phrase) et articles du Fil publiés (P9.4 : un article
 * `a_relire` n'y figure jamais). Aucune page noindex, aucun fait listé dans `a_confirmer` (le
 * téléphone n'apparaît qu'une fois confirmé), aucune promesse : les descriptions sont les
 * descriptions moteurs déjà contrôlées.
 */

export interface LlmsPage {
  /** Titre affiché (H1 de la page). */
  titre: string;
  /** Chemin interne, barre finale. */
  chemin: string;
  /** Une ligne de description. */
  description: string;
}

export interface LlmsInput {
  nom: string;
  signature: string;
  descriptionCourte: string;
  url: string;
  zones: string[];
  /** null : inconnu ou pas encore confirmé. */
  telephone: string | null;
  regle: { titre: string; texte: string };
  piliers: LlmsPage[];
  services: LlmsPage[];
  fonctionnement: LlmsPage[];
  /** Termes du lexique : titre = terme, description = définition en une phrase. */
  lexique: LlmsPage[];
  /** Articles du Fil publiés seulement : titre = titre de l'article, description moteur. */
  magazine: LlmsPage[];
}

/** Vrai si le fait (« contact.telephone_principal ») ne figure pas dans `a_confirmer`. */
export function isConfirmed(aConfirmer: readonly string[], fact: string): boolean {
  return !aConfirmer.some((entry) => entry === fact || entry.startsWith(`${fact} `));
}

function section(title: string, pages: readonly LlmsPage[], url: string): string[] {
  if (pages.length === 0) return [];
  return [
    `## ${title}`,
    "",
    ...pages.map(
      (page) => `- [${page.titre}](${canonicalUrl(page.chemin, url)}): ${page.description}`,
    ),
    "",
  ];
}

export function renderLlmsTxt(input: LlmsInput): string {
  const lines = [
    `# ${input.nom}`,
    "",
    `> ${input.signature} ${input.descriptionCourte}`,
    "",
    `Ce fichier résume le site ${input.nom} (aide et accompagnement à domicile) et liste ses pages de référence pour les moteurs de réponse.`,
    `Règle éditoriale — ${input.regle.titre} : ${input.regle.texte}`,
    "",
    `Zone d'intervention : ${input.zones.join(", ")}.`,
    ...(input.telephone ? [`Téléphone : ${input.telephone}.`] : []),
    "",
    ...section("Pour qui ?", input.piliers, input.url),
    ...section("Services et pathologies", input.services, input.url),
    ...section("Fonctionnement", input.fonctionnement, input.url),
    ...section("Lexique", input.lexique, input.url),
    ...section("Le Fil, le magazine", input.magazine, input.url),
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

/** Assemble l'entrée depuis content/ (pages services lues sans compiler leur corps). */
export async function buildLlmsInput(): Promise<LlmsInput> {
  const { marque, contact, zones, a_confirmer } = getSiteConfig();
  const { a_propos, charte_page } = getAbout();
  const howItWorks = getHowItWorksPage();
  const pricing = getPricingPage();
  const callback = getCallbackPage();

  const services: LlmsPage[] = [];
  const piliers: LlmsPage[] = [];
  for (const file of await listMdxFiles(SERVICES_DIR)) {
    const { meta } = await readServiceMeta(file);
    if (meta.statut !== "publie") continue;
    const page = { titre: meta.h1, chemin: meta.chemin, description: meta.description };
    (meta.type === "pilier" ? piliers : services).push(page);
  }
  const byPath = (a: LlmsPage, b: LlmsPage) => a.chemin.localeCompare(b.chemin, "fr");
  piliers.sort(byPath);
  services.sort(byPath);

  // Lexique : chaque terme avec sa définition en une phrase, par ordre alphabétique du terme.
  const collator = new Intl.Collator("fr", { sensitivity: "base" });
  const lexique: LlmsPage[] = (await listLexiqueTerms())
    .map((term) => ({
      titre: term.developpe ? `${term.terme} (${term.developpe})` : term.terme,
      chemin: lexiqueTermPath(term.slug),
      description: term.definition,
    }))
    .sort((a, b) => collator.compare(a.titre, b.titre));

  // Le Fil : articles publiés seulement, du plus récent au plus ancien.
  const magazine: LlmsPage[] = (await listArticleMetas({ warn: () => {} }))
    .filter((article) => article.meta.statut === "publie")
    .sort((a, b) => (a.meta.publie_le < b.meta.publie_le ? 1 : -1))
    .map((article) => ({
      titre: article.meta.titre,
      chemin: article.chemin,
      description: article.meta.seo.description,
    }));

  const regle =
    charte_page.principes.find((p) => /soigner/i.test(p.titre)) ?? charte_page.principes[0];

  return {
    nom: marque.nom,
    signature: marque.signature,
    descriptionCourte: marque.description_courte,
    url: marque.url,
    zones: zones.map((zone) => zone.nom),
    telephone:
      contact.telephone_principal && isConfirmed(a_confirmer, "contact.telephone_principal")
        ? contact.telephone_principal
        : null,
    regle: regle
      ? { titre: regle.titre, texte: regle.texte }
      : { titre: "Informer, jamais soigner", texte: "Aucun conseil médical sur ce site." },
    piliers,
    services,
    fonctionnement: [
      {
        titre: howItWorks.h1,
        chemin: "/comment-ca-marche/",
        description: howItWorks.seo.description,
      },
      { titre: pricing.h1, chemin: "/tarifs-et-aides/", description: pricing.seo.description },
      { titre: a_propos.h1, chemin: "/a-propos/", description: a_propos.seo.description },
      {
        titre: charte_page.h1,
        chemin: "/a-propos/charte-editoriale/",
        description: charte_page.seo.description,
      },
      { titre: callback.h1, chemin: "/etre-rappele/", description: callback.seo.description },
    ],
    lexique,
    magazine,
  };
}
