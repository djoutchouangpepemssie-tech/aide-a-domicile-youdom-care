import { RelatedLinks } from "@/components/blocks/RelatedLinks/RelatedLinks";
import { Section, type SectionTone } from "@/components/layout/Section/Section";
import { findSiteMapGroup, flattenSiteMap, type SiteMapGroup } from "@/app/plan-du-site/site-map";
import { getInterfaceTexts } from "@/content/loader";
import { siblingLinks, type RelatedCard } from "@/lib/seo/related";

/*
 * « À lire aussi » des pages sans famille de services (docs/04 §2 « Maillage », P9.4) : les
 * autres pages du groupe du plan du site auquel la page courante appartient (entreprise, légal,
 * outils…), dans l'ordre du plan, six au plus, jamais la page elle-même. Le plan ne liste que
 * des pages construites (src/app/plan-du-site/site-map.ts et son test) : aucun lien mort. Les
 * libellés sont ceux du plan (fil d'Ariane des pages). Sans page sœur, rien n'est rendu.
 */

export const GROUP_HEADING_ID = "a-lire-aussi";

export interface GroupLinksProps {
  /** Chemin de la page courante (barre finale). */
  chemin: string;
  section?: SectionTone;
  className?: string;
  /** Faux sur un document à imprimer : le bloc porte `data-print="hide"`. */
  printable?: boolean;
}

/** Groupe du plan qui contient la page, avec ses entrées à plat. */
export function groupOf(
  groups: readonly SiteMapGroup[],
  chemin: string,
): { id: SiteMapGroup["id"]; entries: { href: string; label: string }[] } | null {
  for (const group of groups) {
    const entries = flattenEntries(group);
    if (entries.some((entry) => entry.href === chemin)) return { id: group.id, entries };
  }
  return null;
}

function flattenEntries(group: SiteMapGroup): { href: string; label: string }[] {
  const hrefs = flattenSiteMap([group]);
  const labels = new Map<string, string>();
  const walk = (entries: SiteMapGroup["entries"]) => {
    for (const entry of entries) {
      if (!labels.has(entry.href)) labels.set(entry.href, entry.label);
      if (entry.children) walk(entry.children);
    }
  };
  walk(group.entries);
  return hrefs.map((href) => ({ href, label: labels.get(href) ?? href }));
}

/** Cartes des pages sœurs ; seul le groupe de la page est construit (`findSiteMapGroup`, groupes légers d'abord). */
export async function groupCards(chemin: string): Promise<RelatedCard[]> {
  const group = await findSiteMapGroup(chemin);
  const found = group ? groupOf([group], chemin) : null;
  return found ? siblingLinks(chemin, found.entries) : [];
}

export interface GroupLinksBlockProps extends Omit<GroupLinksProps, "chemin"> {
  links: readonly RelatedCard[];
}

/** Rendu synchrone du bloc, à partir des cartes déjà calculées (`groupCards`) : c'est ce que les pages rendent. */
export function GroupLinksBlock({
  links,
  section = "paper",
  className,
  printable = true,
}: GroupLinksBlockProps) {
  if (links.length === 0) return null;
  const texts = getInterfaceTexts().maillage;
  return (
    <Section
      tone={section}
      aria-labelledby={GROUP_HEADING_ID}
      className={className}
      data-section="a-lire-aussi"
      {...(printable ? {} : { "data-print": "hide" })}
    >
      <RelatedLinks id={GROUP_HEADING_ID} title={texts.a_lire_aussi_h2} links={links} />
    </Section>
  );
}

/** Composant serveur asynchrone : calcule puis rend le bloc. Les pages testées en jsdom préfèrent `groupCards` + `GroupLinksBlock`. */
export async function GroupLinks({ chemin, ...rest }: GroupLinksProps) {
  return <GroupLinksBlock links={await groupCards(chemin)} {...rest} />;
}
