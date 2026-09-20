import Link from "next/link";
import { cn } from "@/lib/cn";

/*
 * Fil d'Ariane (docs/00 §5 : sur toutes les pages sauf l'accueil). `nav` nommé, liste ordonnée,
 * page courante en `aria-current="page"`, séparateurs décoratifs. Le balisage BreadcrumbList
 * (JSON-LD) est ajouté en P5.2 à partir des mêmes éléments.
 */

export interface BreadcrumbItem {
  label: string;
  /** Absent pour la page courante. */
  href?: string;
}

export interface BreadcrumbTexts {
  nom: string;
  accueil: string;
}

export interface BreadcrumbProps {
  /** Éléments après l'accueil ; le dernier est la page courante. */
  items: readonly BreadcrumbItem[];
  texts: BreadcrumbTexts;
  className?: string;
}

export function Breadcrumb({ items, texts, className }: BreadcrumbProps) {
  const all: BreadcrumbItem[] = [{ label: texts.accueil, href: "/" }, ...items];
  return (
    <nav aria-label={texts.nom} className={cn("breadcrumb text-small", className)}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0">
        {all.map((item, index) => {
          const current = index === all.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex max-w-none items-center gap-x-2">
              {index > 0 ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 text-text-soft"
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
              ) : null}
              {current || !item.href ? (
                <span aria-current="page" className="font-bold text-ink">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="text-link">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
