import Link from "next/link";
import { articleRubriques, rubriqueLabels, type ArticleRubrique } from "@/content/article-schema";
import { rubriquePath } from "@/content/article-meta";
import { cn } from "@/lib/cn";

/*
 * Les six rubriques du Fil (docs/06 §2) en liens compacts, dans l'ordre du cahier ; la rubrique
 * courante est marquée `aria-current="page"`. Navigation nommée par `label`.
 */

export function RubriqueNav({
  label,
  current,
  className,
}: {
  label: string;
  current?: ArticleRubrique;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={className} data-rubriques>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {articleRubriques.map((rubrique) => {
          const active = rubrique === current;
          return (
            <li key={rubrique} className="max-w-none">
              <Link
                href={rubriquePath(rubrique)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-12 items-center rounded-button border px-4 font-bold no-underline",
                  active
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-line bg-white text-teal-900 hover:border-teal-700",
                )}
              >
                {rubriqueLabels[rubrique]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
