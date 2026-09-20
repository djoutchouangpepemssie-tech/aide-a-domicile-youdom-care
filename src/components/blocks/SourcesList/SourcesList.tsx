import type { Source } from "@/content/schemas";
import { cn } from "@/lib/cn";

/*
 * Liste des sources (docs/02 §7, docs/03 §1) : chaque fait chiffré ou médical cite sa source
 * officielle, avec la date « vérifié le » publiée par la source et la date de consultation.
 * Liens externes signalés pour le lecteur d'écran.
 */

export interface SourcesListTexts {
  /** Contient {date}. */
  source_verifiee: string;
  /** Contient {date}. */
  source_consultee: string;
  lien_externe: string;
}

const frenchDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export function formatFrenchDate(iso: string): string {
  return frenchDate.format(new Date(`${iso}T12:00:00`));
}

export function SourcesList({
  sources,
  texts,
  className,
}: {
  sources: readonly Source[];
  texts: SourcesListTexts;
  className?: string;
}) {
  return (
    <ul className={cn("sources-list m-0 flex list-none flex-col gap-3 p-0", className)}>
      {sources.map((source) => (
        <li key={source.href} className="max-w-none">
          <a href={source.href} rel="noopener noreferrer" className="font-bold">
            {source.libelle}
            <span className="sr-only"> ({texts.lien_externe})</span>
          </a>
          <span className="block text-small text-text-soft">
            {source.verifie_le
              ? `${texts.source_verifiee.replace("{date}", formatFrenchDate(source.verifie_le))} · `
              : ""}
            {texts.source_consultee.replace("{date}", formatFrenchDate(source.consulte_le))}
          </span>
        </li>
      ))}
    </ul>
  );
}
