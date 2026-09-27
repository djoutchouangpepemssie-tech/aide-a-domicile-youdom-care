import Link from "next/link";
import { cn } from "@/lib/cn";

/*
 * Pagination des listes d'articles (docs/06 §2, 12 articles par page) : navigation nommée,
 * liens « précédente » et « suivante », numéros de page avec la page courante en
 * `aria-current="page"`. Rien n'est rendu quand il n'y a qu'une page.
 */

export interface PaginationTexts {
  nom: string;
  precedente: string;
  suivante: string;
  /** Contient {n}. */
  page: string;
  /** Contient {n}. */
  page_courante: string;
}

export interface PaginationProps {
  current: number;
  total: number;
  hrefFor: (n: number) => string;
  texts: PaginationTexts;
  className?: string;
}

const item =
  "inline-flex min-h-12 min-w-12 items-center justify-center rounded-button border px-3 font-bold no-underline";

export function Pagination({ current, total, hrefFor, texts, className }: PaginationProps) {
  if (total <= 1) return null;
  const pages = Array.from({ length: total }, (_, index) => index + 1);
  return (
    <nav aria-label={texts.nom} className={cn("mt-10", className)} data-pagination>
      <ul className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
        {current > 1 ? (
          <li className="max-w-none">
            <Link
              href={hrefFor(current - 1)}
              className={cn(item, "border-line bg-white text-link")}
            >
              {texts.precedente}
            </Link>
          </li>
        ) : null}
        {pages.map((n) =>
          n === current ? (
            <li key={n} className="max-w-none">
              <span
                aria-current="page"
                aria-label={texts.page_courante.replace("{n}", String(n))}
                className={cn(item, "border-teal-700 bg-teal-700 text-white")}
              >
                {n}
              </span>
            </li>
          ) : (
            <li key={n} className="max-w-none">
              <Link
                href={hrefFor(n)}
                aria-label={texts.page.replace("{n}", String(n))}
                className={cn(item, "border-line bg-white text-link")}
              >
                {n}
              </Link>
            </li>
          ),
        )}
        {current < total ? (
          <li className="max-w-none">
            <Link
              href={hrefFor(current + 1)}
              className={cn(item, "border-line bg-white text-link")}
            >
              {texts.suivante}
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
