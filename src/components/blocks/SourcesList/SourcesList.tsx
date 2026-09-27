import { Icon } from "@/components/ui/Icon/Icon";
import type { Source } from "@/content/schemas";
import { cn } from "@/lib/cn";

/*
 * Liste des sources (docs/02 §7, docs/03 §1, docs/design/CONCEPT.md §5 « Rendre les sources
 * élégantes ») : chaque fait chiffré ou médical cite sa source officielle, avec la date
 * « vérifié le » publiée par la source et la date de consultation. Le libellé est un lien
 * souligné, le domaine en pastille teal-50, les dates en chiffres tabulaires ; le lien externe
 * est signalé pour le lecteur d'écran (texte) et à l'œil (flèche). Deux colonnes à partir de
 * 48 rem. La carte de relecture (`review`, facultative) dit qui a écrit, qui a relu (ou que la
 * page attend sa relecture) et la date de mise à jour.
 */

export interface SourcesListTexts {
  /** Contient {date}. */
  source_verifiee: string;
  /** Contient {date}. */
  source_consultee: string;
  lien_externe: string;
}

export interface SourcesReview {
  /** « Écrit par … », déjà rempli. */
  author: string;
  /** « Relu par …, le … », déjà rempli ; absent tant que la page n'est pas relue. */
  reviewer?: string | null;
  /** Texte affiché à la place du relecteur tant qu'il manque (« attend sa relecture… »). */
  pending?: string;
  /** « Mise à jour le … », déjà rempli. */
  updated?: string;
}

const frenchDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export function formatFrenchDate(iso: string): string {
  return frenchDate.format(new Date(`${iso}T12:00:00`));
}

/** Domaine lisible d'une source : « service-public.gouv.fr » (sans « www. »). */
export function sourceDomain(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

export function SourcesList({
  sources,
  texts,
  review,
  ordered = false,
  className,
}: {
  sources: readonly Source[];
  texts: SourcesListTexts;
  review?: SourcesReview;
  /** Liste numérotée (sources d’un article, docs/06 §3) plutôt qu’une liste sans puces. */
  ordered?: boolean;
  className?: string;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <div className={cn("sources-list", className)}>
      <List
        className={cn(
          "m-0 grid gap-4 md:grid-cols-2 md:gap-x-8",
          ordered ? "list-decimal pl-6 marker:font-bold marker:text-teal-800" : "list-none p-0",
        )}
      >
        {sources.map((source) => (
          <li key={source.href} className="max-w-none">
            {/* Cible de 44 px de haut (WCAG 2.5.8, P9.6) : le libellé mesurait 22 px. */}
            <a
              href={source.href}
              rel="noopener noreferrer"
              className="inline-flex min-h-11 flex-wrap items-center font-bold"
            >
              {source.libelle}
              <span aria-hidden="true"> ↗</span>
              <span className="sr-only"> ({texts.lien_externe})</span>
            </a>
            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-text-soft">
              <span className="rounded-full bg-teal-50 px-2.5 py-0.5 font-bold text-teal-800">
                {sourceDomain(source.href)}
              </span>
              <span className="tabular-figures">
                {source.verifie_le
                  ? `${texts.source_verifiee.replace("{date}", formatFrenchDate(source.verifie_le))} · `
                  : ""}
                {texts.source_consultee.replace("{date}", formatFrenchDate(source.consulte_le))}
              </span>
            </span>
          </li>
        ))}
      </List>
      {review ? (
        <div className="sources-review mt-8 flex max-w-2xl items-start gap-4 rounded-card border border-line bg-white p-5 shadow-1">
          <Icon name="mains" size="lg" className="mt-0.5" />
          <div className="text-small">
            <p className="m-0 font-bold">{review.author}</p>
            {review.reviewer ? (
              <p className="m-0 mt-1">{review.reviewer}</p>
            ) : review.pending ? (
              <p className="m-0 mt-1 font-bold text-warning">{review.pending}</p>
            ) : null}
            {review.updated ? (
              <p className="tabular-figures m-0 mt-1 text-text-soft">{review.updated}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
