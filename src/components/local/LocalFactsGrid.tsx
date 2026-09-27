import { formatFrenchDate, sourceDomain } from "@/components/blocks/SourcesList/SourcesList";
import { Heading, type HeadingLevel } from "@/components/ui/Heading/Heading";
import type { LocalFact, LocalFactType } from "@/content/local-schema";
import { cn } from "@/lib/cn";
import { toTelHref } from "@/lib/phone";
import { displayLabel, fill, type LocalTexts } from "./local-texts";

/*
 * Ressources locales sourcées (docs/02 §7 `LocalFactsGrid`, docs/04 §4 anatomie 4 et 7) :
 * les faits sont regroupés par type, dans l'ordre demandé ; chaque ligne affiche le nom, la
 * valeur, l'adresse, le téléphone, le lien officiel (signalé externe), puis « Source : …,
 * consulté le … » avec le lien vers la source. Aucun fait sans source ne peut arriver ici :
 * le schéma l'impose. Le conteneur porte `data-local-facts="{id}"` et le nombre de faits
 * affichés, pour les contrôles.
 */

export interface LocalFactsGridProps {
  facts: readonly LocalFact[];
  /** Types affichés, dans cet ordre ; les autres faits sont ignorés. */
  types: readonly LocalFactType[];
  texts: LocalTexts["faits"];
  /** Valeur de `data-local-facts` (« ressources », « aides », « reperes »). */
  id: string;
  /** Niveau des titres de groupe (3 sous un H2). */
  headingLevel?: HeadingLevel;
  /** Une seule colonne, lignes serrées (repères de la zone éditoriale). */
  compact?: boolean;
  className?: string;
}

const externalIcon = (
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
    className="shrink-0"
  >
    <path d="M14 4h6v6M20 4l-9 9M18 13v6H5V6h6" />
  </svg>
);

export function groupFacts(
  facts: readonly LocalFact[],
  types: readonly LocalFactType[],
): { type: LocalFactType; facts: LocalFact[] }[] {
  return types
    .map((type) => ({ type, facts: facts.filter((fact) => fact.type === type) }))
    .filter((group) => group.facts.length > 0);
}

function FactRow({ fact, texts }: { fact: LocalFact; texts: LocalTexts["faits"] }) {
  const tel = fact.telephone ? toTelHref(fact.telephone) : null;
  const sourceLabel = fact.source_label ?? sourceDomain(fact.source_url);
  const [before, after] = texts.source
    .split("{source}")
    .map((part) => fill(part, { date: formatFrenchDate(fact.collected_at) }));
  return (
    <li className="max-w-none" data-fact-type={fact.type}>
      <p className="m-0 font-bold text-teal-900">
        {displayLabel(fact.label)}
        {fact.value ? <span className="font-normal text-ink"> : {fact.value}</span> : null}
      </p>
      {fact.address ? (
        <p className="m-0 mt-1">
          <span className="sr-only">{texts.adresse} : </span>
          {fact.address}
        </p>
      ) : null}
      <p className="m-0 mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {fact.telephone ? (
          <span>
            <span className="sr-only">{texts.telephone} : </span>
            {tel ? (
              <a href={tel} className="tabular-figures inline-flex min-h-11 items-center font-bold">
                {fact.telephone}
              </a>
            ) : (
              <span className="tabular-figures">{fact.telephone}</span>
            )}
          </span>
        ) : null}
        {fact.url ? (
          <a
            href={fact.url}
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 font-bold"
          >
            {texts.site_officiel}
            {externalIcon}
            {/* Nom du lieu dans le nom accessible : une page compte jusqu'à treize liens « Site
                officiel », qu'un lecteur d'écran listerait à l'identique (RGAA 6.1, P9.2). */}
            <span className="sr-only">
              {" "}
              : {displayLabel(fact.label)} ({texts.lien_externe})
            </span>
          </a>
        ) : null}
      </p>
      <p className="m-0 mt-1 text-small text-text-soft" data-fact-source>
        {before}
        <a
          href={fact.source_url}
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1"
        >
          {sourceLabel}
          {externalIcon}
          <span className="sr-only"> ({texts.lien_externe})</span>
        </a>
        {after}
      </p>
    </li>
  );
}

export function LocalFactsGrid({
  facts,
  types,
  texts,
  id,
  headingLevel = 3,
  compact = false,
  className,
}: LocalFactsGridProps) {
  const groups = groupFacts(facts, types);
  const count = groups.reduce((sum, group) => sum + group.facts.length, 0);
  if (count === 0) return null;
  return (
    <div
      className={cn(
        "local-facts grid gap-6",
        // Jamais plus de colonnes que de groupes : les pages commune n'en ont que deux, la
        // troisième colonne restait vide sur les 131 pages (27/09/2026).
        !compact && "md:grid-cols-2",
        !compact && groups.length > 2 && "xl:grid-cols-3",
        className,
      )}
      data-local-facts={id}
      data-local-facts-count={count}
    >
      {groups.map((group) => (
        <section
          key={group.type}
          aria-labelledby={`faits-${id}-${group.type}`}
          className={cn(
            "rounded-card border border-line bg-white shadow-1",
            compact ? "p-4" : "p-6",
          )}
          data-fact-group={group.type}
        >
          <Heading level={headingLevel} visual={4} id={`faits-${id}-${group.type}`}>
            {texts.types[group.type]}
          </Heading>
          <ul className={cn("m-0 mt-3 grid list-none p-0", compact ? "gap-3" : "gap-4")}>
            {group.facts.map((fact, index) => (
              <FactRow key={`${fact.label}-${index}`} fact={fact} texts={texts} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
