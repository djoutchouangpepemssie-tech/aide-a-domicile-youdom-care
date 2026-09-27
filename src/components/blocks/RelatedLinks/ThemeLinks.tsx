import { RelatedLinks } from "@/components/blocks/RelatedLinks/RelatedLinks";
import { Section, type SectionTone } from "@/components/layout/Section/Section";
import { MAGAZINE_PATH } from "@/content/article-meta";
import { listBuildableArticles } from "@/content/articles";
import { LEXIQUE_PATH, lexiqueTermPath, listLexiqueTerms } from "@/content/lexique";
import { getInterfaceTexts, getLexiquePage, getMagazinePage } from "@/content/loader";
import { themeLinks, type RelatedCard } from "@/lib/seo/related";

/*
 * Blocs thématiques calculés (docs/04 §2 « Maillage », P9.4), composant serveur asynchrone :
 *
 *  - « Sur Le Fil » : les articles construits dont `piliers_lies` cite la page courante, du plus
 *    récent au plus ancien, puis une carte vers l'index du magazine ;
 *  - « Dans le lexique » : les termes dont `pages_liees` cite la page courante, par ordre
 *    alphabétique, puis une carte vers l'index du lexique.
 *
 * Seules les pages construites sont liées : en production, un article `a_relire` n'existe pas et
 * le bloc disparaît avec lui. Sans lien, rien n'est rendu (ni la section d'enveloppe).
 */

export const FIL_HEADING_ID = "sur-le-fil";
export const LEXIQUE_HEADING_ID = "dans-le-lexique";

export interface ThemeLinksProps {
  /** Chemin de la page courante (barre finale). */
  chemin: string;
  /** Enveloppe les blocs dans une `Section` de ce ton ; sans ton, fragments nus. */
  section?: SectionTone;
  className?: string;
}

export interface ThemeBlocks {
  fil: RelatedCard[];
  lexique: RelatedCard[];
}

/** Cartes des deux blocs pour une page ; les cartes d'index ne s'ajoutent qu'à un bloc non vide. */
export async function themeBlocks(chemin: string): Promise<ThemeBlocks> {
  const articles = await listBuildableArticles();
  const terms = await listLexiqueTerms();
  const fil = themeLinks(
    chemin,
    articles.map((article) => ({
      href: article.chemin,
      label: article.meta.titre,
      pages: article.meta.piliers_lies,
      date: article.meta.publie_le,
    })),
    "fil",
  );
  const lexique = themeLinks(
    chemin,
    terms.map((term) => ({
      href: lexiqueTermPath(term.slug),
      label: term.terme,
      pages: term.pages_liees,
    })),
    "lexique",
  );
  if (fil.length > 0 && chemin !== MAGAZINE_PATH) {
    fil.push({ href: MAGAZINE_PATH, label: getMagazinePage().ariane, tier: "index" });
  }
  if (lexique.length > 0 && chemin !== LEXIQUE_PATH) {
    lexique.push({ href: LEXIQUE_PATH, label: getLexiquePage().ariane, tier: "index" });
  }
  return { fil, lexique };
}

export interface ThemeLinksBlockProps extends Omit<ThemeLinksProps, "chemin"> {
  blocks: ThemeBlocks;
}

/** Composant serveur asynchrone : calcule puis rend les blocs. Les pages testées en jsdom préfèrent `themeBlocks` + `ThemeLinksBlock`. */
export async function ThemeLinks({ chemin, ...rest }: ThemeLinksProps) {
  return <ThemeLinksBlock blocks={await themeBlocks(chemin)} {...rest} />;
}

/** Rendu synchrone des blocs, à partir des cartes déjà calculées. */
export function ThemeLinksBlock({ blocks, section, className }: ThemeLinksBlockProps) {
  const { fil, lexique } = blocks;
  if (fil.length === 0 && lexique.length === 0) return null;
  const texts = getInterfaceTexts().maillage;
  // Sans section d'enveloppe, `className` va au premier bloc ; le second s'espace du premier.
  const firstClass = section ? undefined : className;
  const body = (
    <>
      {fil.length > 0 ? (
        <RelatedLinks
          id={FIL_HEADING_ID}
          title={texts.sur_le_fil_h2}
          links={fil}
          className={firstClass}
        />
      ) : null}
      {lexique.length > 0 ? (
        <RelatedLinks
          id={LEXIQUE_HEADING_ID}
          title={texts.dans_le_lexique_h2}
          links={lexique}
          className={fil.length > 0 ? "mt-12" : firstClass}
        />
      ) : null}
    </>
  );
  if (!section) return body;
  return (
    <Section
      tone={section}
      aria-labelledby={fil.length > 0 ? FIL_HEADING_ID : LEXIQUE_HEADING_ID}
      className={className}
      data-section="themes"
    >
      {body}
    </Section>
  );
}
