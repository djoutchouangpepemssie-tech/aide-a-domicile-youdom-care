import type { CSSProperties } from "react";
import { CountUp } from "@/components/motion/CountUp/CountUp";
import { Reveal } from "@/components/motion/Reveal/Reveal";
import { cn } from "@/lib/cn";
import {
  indexWeek,
  slotHours,
  summarizeWeek,
  weekActivities,
  weekDays,
  weekSlots,
  type WeekActivity,
  type WeekDay,
  type WeekEntry,
  type WeekSlot,
} from "@/lib/week/week";
import "./week-planner.css";

/*
 * Semaine type, variante lecture (docs/05 §4, docs/02 §7, docs/design/CONCEPT.md §3 bloc 5).
 * Composant serveur, sans JavaScript propre : un tableau réel (en-têtes de colonne = jours, de
 * ligne = créneaux) à partir de 48 rem, une liste par jour en dessous ; légende par activité ;
 * l'état n'est jamais porté par la couleur seule (texte dans chaque case). Mention « Exemple
 * illustratif » toujours visible.
 * Mouvement : `week-fill` (les cases remplies apparaissent case par case, 20 ms d'écart, une
 * fois, en CSS, déclenché par `Reveal`) et `count-up` sur le nombre d'heures du résumé (la valeur
 * finale est rendue côté serveur ; le nombre vient des entrées, jamais d'ailleurs). En mouvement
 * réduit ou sans JavaScript : grille pleine et résumé définitif d'emblée.
 * La variante saisie (cases à cocher) vit dans WeekPlannerInput sur le même modèle.
 */

export interface WeekPlannerTexts {
  exemple_illustratif: string;
  legende: string;
  libre: string;
  creneau: string;
  /** Contient {h}. */
  resume: string;
  nuit_singulier: string;
  /** Contient {n}. */
  nuits_pluriel: string;
  activites: Record<WeekActivity, string>;
  jours: Record<WeekDay, string>;
  creneaux: Record<WeekSlot, string>;
}

export interface WeekPlannerDisplayProps {
  variant?: "display";
  title: string;
  context?: string;
  entries: readonly WeekEntry[];
  texts: WeekPlannerTexts;
  className?: string;
}

/** Durée du comptage du résumé (CONCEPT §6 : 600 ms). */
export const WEEK_COUNT_DURATION = 600;

/* Couples de couleurs de docs/02 §2 seulement : encre sur fonds teintés, blanc sur teal-900. */
const activityStyles: Record<WeekActivity, string> = {
  gestes: "bg-teal-50 text-ink",
  repas: "bg-green-50 text-ink",
  sorties: "bg-azure-50 text-ink",
  presence: "bg-sand text-ink",
  nuit: "bg-teal-900 text-white",
};

export interface WeekSummaryParts {
  /** Texte avant le nombre d'heures (« Environ »). */
  before: string;
  hours: number;
  /** Texte après le nombre d'heures, nuits et point final compris. */
  after: string;
}

/** Découpe le résumé autour de {h} pour que le nombre puisse se compter. */
export function summaryParts(
  entries: readonly WeekEntry[],
  texts: WeekPlannerTexts,
): WeekSummaryParts {
  const { hours, nights } = summarizeWeek(entries);
  const [before = "", rest = ""] = texts.resume.split("{h}");
  const suffix =
    nights === 0
      ? ""
      : `, ${nights === 1 ? texts.nuit_singulier : texts.nuits_pluriel.replace("{n}", String(nights))}`;
  return { before, hours, after: `${rest}${suffix}.` };
}

export function summaryText(entries: readonly WeekEntry[], texts: WeekPlannerTexts): string {
  const { before, hours, after } = summaryParts(entries, texts);
  return `${before}${hours}${after}`;
}

function EntryChip({
  entry,
  texts,
  order,
}: {
  entry: WeekEntry;
  texts: WeekPlannerTexts;
  /** Rang de la case dans l'ordre de remplissage (`week-fill`). */
  order: number;
}) {
  const hours = entry.heures ?? `${slotHours[entry.creneau].from}–${slotHours[entry.creneau].to}`;
  return (
    <span
      className={cn(
        "week-fill block rounded-field px-2 py-1.5 text-small leading-small",
        activityStyles[entry.activite],
      )}
      style={{ "--m-i": String(order) } as CSSProperties}
    >
      <span className="block font-bold">{texts.activites[entry.activite]}</span>
      <span className="tabular-figures block">{hours}</span>
      {entry.libelle ? <span className="block">{entry.libelle}</span> : null}
    </span>
  );
}

export function WeekPlanner({
  title,
  context,
  entries,
  texts,
  className,
}: WeekPlannerDisplayProps) {
  const index = indexWeek(entries);
  const usedActivities = weekActivities.filter((activity) =>
    entries.some((entry) => entry.activite === activity),
  );
  const summary = summaryParts(entries, texts);
  let tableOrder = 0;
  let listOrder = 0;

  return (
    // `draw` ne cache rien ici (aucun tracé) : Reveal ne sert qu'à poser `data-reveal` pour week-fill.
    <Reveal
      as="div"
      variant="draw"
      className={cn("week-planner", className)}
      data-variant="display"
    >
      <table className="hidden w-full border-collapse md:table">
        <caption className="mb-3 text-left">
          <span className="block font-bold">{title}</span>
          {context ? <span className="block text-small text-text-soft">{context}</span> : null}
          <span className="mt-1 block text-small font-bold text-raspberry-700">
            {texts.exemple_illustratif}
          </span>
        </caption>
        <thead>
          <tr>
            <th scope="col" className="p-2 text-left text-small text-text-soft">
              {texts.creneau}
            </th>
            {weekDays.map((day) => (
              <th key={day} scope="col" className="p-2 text-left align-bottom">
                {texts.jours[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weekSlots.map((slot) => (
            <tr key={slot} className="border-t border-line">
              <th scope="row" className="p-2 text-left align-top">
                <span className="block">{texts.creneaux[slot]}</span>
                <span className="tabular-figures block text-small font-normal text-text-soft">
                  {slotHours[slot].from}–{slotHours[slot].to}
                </span>
              </th>
              {weekDays.map((day) => {
                const entry = index.get(day)?.get(slot);
                return (
                  <td key={day} className="p-1 align-top">
                    {entry ? (
                      <EntryChip entry={entry} texts={texts} order={tableOrder++} />
                    ) : (
                      <span className="sr-only">{texts.libre}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="md:hidden">
        <p className="font-bold">{title}</p>
        {context ? <p className="text-small text-text-soft">{context}</p> : null}
        <p className="mt-1 text-small font-bold text-raspberry-700">{texts.exemple_illustratif}</p>
        <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
          {weekDays.map((day) => {
            const dayEntries = weekSlots
              .map((slot) => index.get(day)?.get(slot))
              .filter((entry): entry is WeekEntry => entry !== undefined);
            return (
              <li key={day} className="max-w-none rounded-card border border-line bg-white p-3">
                <p className="m-0 font-bold">{texts.jours[day]}</p>
                {dayEntries.length === 0 ? (
                  <p className="m-0 text-small text-text-soft">{texts.libre}</p>
                ) : (
                  <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
                    {dayEntries.map((entry) => (
                      <li key={entry.creneau} className="max-w-none">
                        <EntryChip entry={entry} texts={texts} order={listOrder++} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="week-summary mt-4 font-bold">
        {summary.before}
        <CountUp value={summary.hours} duration={WEEK_COUNT_DURATION} />
        {summary.after}
      </p>

      <div className="mt-3">
        <p className="m-0 text-small text-text-soft">{texts.legende}</p>
        <ul className="m-0 mt-1 flex list-none flex-wrap gap-2 p-0">
          {usedActivities.map((activity) => (
            <li
              key={activity}
              className={cn(
                "max-w-none rounded-full px-3 py-1 text-small font-bold",
                activityStyles[activity],
              )}
            >
              {texts.activites[activity]}
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}
