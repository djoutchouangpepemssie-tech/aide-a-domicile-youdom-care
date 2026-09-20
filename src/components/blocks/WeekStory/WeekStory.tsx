import { PhotoFigure, photoSizes } from "@/components/ui/PhotoFigure/PhotoFigure";
import { Prose } from "@/components/ui/Prose/Prose";
import type { Photo } from "@/content/schemas";
import { cn } from "@/lib/cn";

/*
 * Récit de la semaine type (docs/03 §2 section 5, docs/design/CONCEPT.md §5) : la photo
 * d'ambiance de l'exemple en 3:2 à côté du récit. La photo évoque un cadre ou un moment,
 * jamais la personne de l'exemple : aucune légende, aucun prénom sous l'image. La mention
 * « Exemple illustratif, prénom fictif » fait partie du récit et reste affichée.
 */

export interface WeekStoryProps {
  story: string;
  photo?: Photo | null;
  className?: string;
}

export function WeekStory({ story, photo, className }: WeekStoryProps) {
  return (
    <div
      className={cn(
        "week-story grid items-center gap-6",
        photo && "md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-10",
        className,
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
      <Prose>
        <p>{story}</p>
      </Prose>
    </div>
  );
}
