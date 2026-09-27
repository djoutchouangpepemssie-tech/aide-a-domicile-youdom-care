import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal/Reveal";
import { Tilt } from "@/components/motion/Tilt/Tilt";
import { toIconName } from "@/components/service/service-icons";
import { Heading } from "@/components/ui/Heading/Heading";
import { Icon } from "@/components/ui/Icon/Icon";
import type { ServicePublic } from "@/content/service-schema";
import { cn } from "@/lib/cn";
import type { RelatedCard } from "@/lib/seo/related";

/*
 * Bloc « À lire aussi » (docs/04 §2 « Maillage », docs/design/CONCEPT.md §5 « cartes
 * compactes ») : une navigation nommée par son titre, une grille de cartes compactes (56 px de
 * haut au moins, icône 24 px de la page cible, titre, chevron), inclinées de 3° au plus vers la
 * souris (`Tilt`) et révélées l'une après l'autre au défilement (`Reveal`, rien de caché sans
 * JavaScript). Sous le titre d'une carte, le nom du public quand il diffère de celui de la page
 * courante (« Nos services », « Aidants »), pour situer le lien. Sans lien, rien n'est rendu.
 * Les cartes sont des `RelatedCard` : celles des pages services (`RelatedLink`) portent un
 * public et un type ; celles des blocs thématiques (articles, lexique, groupe du plan) non.
 */

export const RELATED_LINKS_TILT = 3;

export interface RelatedLinksProps {
  /** Identifiant du titre : cible de `aria-labelledby` de la section qui l'entoure. */
  id: string;
  title: string;
  links: readonly RelatedCard[];
  /** Libellés des publics (`interface.service.publics`). */
  publics?: Partial<Record<ServicePublic, string>>;
  /** Public de la page courante : son nom n'est pas répété sous les cartes. */
  current?: ServicePublic;
  className?: string;
}

const card =
  "flex h-full min-h-14 items-center gap-3 rounded-card border border-line bg-white px-4 py-3 " +
  "no-underline shadow-1 transition-[box-shadow,border-color] [transition-duration:var(--duration-base)] " +
  "hover:border-teal-700 hover:shadow-2 motion-reduce:transition-none";

export function RelatedLinks({ id, title, links, publics, current, className }: RelatedLinksProps) {
  if (links.length === 0) return null;
  return (
    <nav aria-labelledby={id} className={className} data-related-links>
      <Heading level={2} id={id}>
        {title}
      </Heading>
      <Reveal
        as="ul"
        variant="stagger"
        /* Le nombre de colonnes suit le nombre de cartes : à trois colonnes pour deux cartes, le
           bloc laissait un trou d'une colonne sur dix-huit pages (27/09/2026). */
        className={cn(
          "m-0 mt-8 grid list-none gap-4 p-0 sm:grid-cols-2",
          links.length > 2 && "lg:grid-cols-3",
        )}
      >
        {links.map((link) => {
          const icon = toIconName(link.icone);
          const group =
            link.public !== undefined && link.public !== current && link.type !== "pilier"
              ? publics?.[link.public]
              : undefined;
          // min-w-0 : la colonne ne s'élargit pas sur un mot long sous espacement du texte forcé (RGAA 10.12).
          return (
            <li key={link.href} className="min-w-0 max-w-none">
              <Tilt as="article" max={RELATED_LINKS_TILT} className="h-full">
                <Link href={link.href} prefetch={false} className={card} data-tier={link.tier}>
                  {icon ? <Icon name={icon} /> : null}
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-teal-900">{link.label}</span>
                    {group ? (
                      <span className="mt-0.5 block text-small text-text-soft">{group}</span>
                    ) : null}
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn("shrink-0 text-teal-700")}
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </Link>
              </Tilt>
            </li>
          );
        })}
      </Reveal>
    </nav>
  );
}
