import type { LegalEntry } from "@/lib/legal/mentions";

/*
 * Liste de faits « libellé / valeur » des pages légales (P8.3) : une définition par champ
 * renseigné de site.config.json. Chaque terme porte `data-fait` (clé du champ) pour les tests
 * et check-legal ; un champ null n'est simplement pas dans la liste.
 */

export function FactList({ entries, className }: { entries: LegalEntry[]; className?: string }) {
  if (entries.length === 0) return null;
  return (
    <dl className={className ?? "m-0 mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-[max-content_1fr]"}>
      {entries.map((entry) => (
        <div key={entry.id} className="contents" data-fait={entry.id}>
          <dt className="m-0 font-bold">{entry.label}</dt>
          <dd className="m-0">
            {entry.href ? (
              <a
                href={entry.href}
                className={entry.href.startsWith("tel:") ? "tabular-figures" : undefined}
              >
                {entry.value}
              </a>
            ) : (
              entry.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
