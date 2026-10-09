import { formatFrenchDate, sourceDomain } from "@/components/blocks/SourcesList/SourcesList";
import { Heading, type HeadingLevel } from "@/components/ui/Heading/Heading";
import type { LocalFact, LocalFactType } from "@/content/local-schema";
import { cn } from "@/lib/cn";
import { displayLabel, fill, type LocalTexts } from "./local-texts";

/*
 * Repères locaux sourcés (docs/02 §7 `LocalFactsGrid`, docs/04 §4 anatomie 4 et 7) : les faits
 * sont regroupés par type, dans l'ordre demandé ; chaque ligne affiche le nom, la valeur quand
 * elle éclaire, puis « Source : …, consulté le … ». Depuis le 27/09/2026, à la demande d'Arcel,
 * une page locale ne publie plus d'annuaire : ni adresse, ni téléphone d'un tiers, ni lien
 * sortant, ni lien vers la source. Le nom de la source et sa date restent affichés, la
 * traçabilité est donc conservée. Aucun fait sans source ne peut arriver ici : le schéma
 * l'impose. Le conteneur porte `data-local-facts="{id}"` et le nombre de faits affichés, pour
 * les contrôles.
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
  /**
   * Lignes serrées et marge intérieure réduite (repères de la zone éditoriale). Une seule
   * colonne, **sauf** pour le groupe démographique : voir la grille de chiffres plus bas.
   */
  compact?: boolean;
  className?: string;
}

export function groupFacts(
  facts: readonly LocalFact[],
  types: readonly LocalFactType[],
): { type: LocalFactType; facts: LocalFact[] }[] {
  return types
    .map((type) => ({ type, facts: facts.filter((fact) => fact.type === type) }))
    .filter((group) => group.facts.length > 0);
}

function FactRow({ fact, texts }: { fact: LocalFact; texts: LocalTexts["faits"] }) {
  /*
   * 27/09/2026, demande d'Arcel : une page locale ne publie plus d'annuaire. Ni adresse, ni
   * numéro de téléphone d'un tiers, ni lien sortant vers un hôpital, une mairie ou un service
   * public. Les organismes sont cités par leur nom, avec leur valeur quand elle éclaire (un
   * nombre de places, une part de population), et rien de plus. La source reste nommée et datée,
   * sans lien : la traçabilité ne disparaît pas, elle cesse seulement d'envoyer ailleurs.
   */
  const sourceLabel = fact.source_label ?? sourceDomain(fact.source_url);
  const [before, after] = texts.source
    .split("{source}")
    .map((part) => fill(part, { date: formatFrenchDate(fact.collected_at) }));
  /*
   * Hiérarchie inversée pour les seuls repères démographiques (D-062). Partout ailleurs
   * l'information est le **nom** — un EHPAD, un CCAS, une association — et l'étiquette porte donc
   * l'emphase. Pour la démographie, l'information est le **nombre** : « 44 198 habitants »,
   * « 12,7 % de la population ». L'étiquette en gras coloré et la valeur en texte ordinaire
   * mettaient l'accent à l'envers, et une page de chiffres se lisait comme une liste d'intitulés.
   *
   * Les chiffres gardent les formes proportionnelles de la police (pas de `tabular-nums`) :
   * l'alignement tabulaire n'a de sens qu'en colonne de nombres, et il fait paraître lâche un
   * nombre isolé en grand corps.
   *
   * Aucune extraction de nombre n'est tentée : `value` est du texte libre et peut contenir une
   * phrase entière. On change l'emphase, jamais le contenu.
   */
  const isFigure = fact.type === "demographie" && Boolean(fact.value);
  if (isFigure) {
    return (
      <li className="max-w-none" data-fact-type={fact.type} data-fact-figure="">
        <p className="m-0 text-h4 leading-tight font-semibold text-teal-900">{fact.value}</p>
        <p className="m-0 mt-1 font-medium text-ink">{displayLabel(fact.label)}</p>
        <p className="m-0 mt-1 text-small text-text-soft" data-fact-source>
          {before}
          {sourceLabel}
          {after}
        </p>
      </li>
    );
  }
  return (
    <li className="max-w-none" data-fact-type={fact.type}>
      <p className="m-0 font-bold text-teal-900">
        {displayLabel(fact.label)}
        {fact.value ? <span className="font-normal text-ink"> : {fact.value}</span> : null}
      </p>
      <p className="m-0 mt-1 text-small text-text-soft" data-fact-source>
        {before}
        {sourceLabel}
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
          {/*
            Les repères démographiques se posent en grille de chiffres : empilés sur une colonne,
            cinq nombres se lisent comme une liste d'intitulés, pas comme un tableau de bord
            (D-062). Les autres groupes gardent une colonne — leurs entrées sont des noms
            d'établissements, parfois longs, qui ne se comparent pas d'un coup d'œil.
          */}
          <ul
            className={cn(
              "m-0 mt-3 grid list-none p-0",
              compact ? "gap-3" : "gap-4",
              // La grille de chiffres vaut aussi en mode serré : c'est précisément là que vivent
              // les repères démographiques de la page. Le mode serré garde ses lignes rapprochées
              // et sa marge intérieure réduite, il ne force plus une colonne unique pour eux.
              group.type === "demographie" &&
                group.facts.length > 2 &&
                cn("sm:grid-cols-2 sm:gap-x-8", !compact && "xl:grid-cols-3"),
            )}
          >
            {group.facts.map((fact, index) => (
              <FactRow key={`${fact.label}-${index}`} fact={fact} texts={texts} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
