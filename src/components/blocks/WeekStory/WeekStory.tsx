import { Icon } from "@/components/ui/Icon/Icon";
import type { IconName } from "@/components/ui/Icon/icons";
import { PhotoFigure, photoSizes } from "@/components/ui/PhotoFigure/PhotoFigure";
import { Prose } from "@/components/ui/Prose/Prose";
import type { Photo } from "@/content/schemas";
import { cn } from "@/lib/cn";
import { WeekStorySwitcher } from "./WeekStorySwitcher";

/*
 * Récit de la semaine type (docs/03 §2 section 5, docs/design/CONCEPT.md §3 bloc 5 et §5) : la
 * photo d'ambiance de l'exemple en 3:2 à côté du récit. La photo évoque un cadre ou un moment,
 * jamais la personne de l'exemple : aucune légende, aucun prénom sous l'image. La mention
 * « Exemple illustratif, prénom fictif » fait partie du récit et reste affichée ; `mention`
 * l'ajoute en plus, en framboise-700, quand le récit ne la porte pas.
 * Avec plusieurs `examples`, un sélecteur segmenté (île `WeekStorySwitcher`) passe de l'un à
 * l'autre ; le premier est affiché d'emblée, sans JavaScript.
 */

export interface WeekStoryExample {
  id: string;
  /** Libellé du bouton du sélecteur (« Suzanne, 84 ans »). */
  label: string;
  story: string;
  photo?: Photo | null;
  /** Icône au fil (24 px) dans le bouton ; décorative. */
  icone?: IconName;
}

export interface WeekStoryProps {
  story?: string;
  photo?: Photo | null;
  /** Plusieurs exemples : sélecteur segmenté ; `story` et `photo` sont alors ignorés. */
  examples?: readonly WeekStoryExample[];
  /** Nom accessible du sélecteur (« Choisir un exemple »), requis avec `examples`. */
  selectorLabel?: string;
  /** Mention « Exemple illustratif » affichée sous le récit. */
  mention?: string;
  className?: string;
}

function StoryPanel({
  story,
  photo,
  mention,
}: {
  story: string;
  photo?: Photo | null;
  mention?: string;
}) {
  return (
    <div
      className={cn(
        "week-story__panel grid items-center gap-6",
        photo && "md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-10",
      )}
    >
      {photo ? (
        <PhotoFigure
          src={photo.src}
          alt={photo.alt}
          focal={photo.focal}
          ratio="3:2"
          sizes={photoSizes.half}
        />
      ) : null}
      <div>
        <Prose>
          <p>{story}</p>
        </Prose>
        {mention ? (
          <p className="m-0 mt-3 text-small font-bold text-raspberry-700">{mention}</p>
        ) : null}
      </div>
    </div>
  );
}

export function WeekStory({
  story,
  photo,
  examples,
  selectorLabel,
  mention,
  className,
}: WeekStoryProps) {
  if (examples && examples.length > 1) {
    return (
      <div className={cn("week-story", className)} data-examples={examples.length}>
        <WeekStorySwitcher
          label={selectorLabel ?? ""}
          panels={examples.map((example) => ({
            id: example.id,
            label: example.label,
            icon: example.icone ? <Icon name={example.icone} size="md" tone="ink" /> : undefined,
            content: <StoryPanel story={example.story} photo={example.photo} mention={mention} />,
          }))}
        />
      </div>
    );
  }
  const single = examples?.[0];
  const text = single?.story ?? story ?? "";
  return (
    <div className={cn("week-story", className)}>
      <StoryPanel story={text} photo={single ? single.photo : photo} mention={mention} />
    </div>
  );
}
