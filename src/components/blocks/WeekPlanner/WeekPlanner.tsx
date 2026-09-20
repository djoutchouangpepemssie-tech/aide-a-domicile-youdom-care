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

/*
 * Semaine type, variante lecture (docs/05 §4, docs/02 §7). Composant serveur, sans JavaScript :
 * un tableau réel (en-têtes de colonne = jours, de ligne = créneaux) à partir de 48 rem, une
 * liste par jour en dessous ; légende par activité ; l'état n'est jamais porté par la couleur
 * seule (texte dans chaque case). Mention « Exemple illustratif » toujours visible.
 * La variante saisie (cases à cocher) arrive en P3.2 sur le même modèle.
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

/* Couples de couleurs de docs/02 §2 seulement : encre sur fonds teintés, blanc sur teal-900. */
const activityStyles: Record<WeekActivity, string> = {
  gestes: "bg-teal-50 text-ink",
  repas: "bg-green-50 text-ink",
  sorties: "bg-azure-50 text-ink",
  presence: "bg-sand text-ink",
  nuit: "bg-teal-900 text-white",
};

function summaryText(entries: readonly WeekEntry[], texts: WeekPlannerTexts): string {
  const { hours, nights } = summarizeWeek(entries);
  const base = texts.resume.replace("{h}", String(hours));
  if (nights === 0) return `${base}.`;
  const suffix =
    nights === 1 ? texts.nuit_singulier : texts.nuits_pluriel.replace("{n}", String(nights));
  return `${base}, ${suffix}.`;
}

function EntryChip({ entry, texts }: { entry: WeekEntry; texts: WeekPlannerTexts }) {
  const hours = entry.heures ?? `${slotHours[entry.creneau].from}–${slotHours[entry.creneau].to}`;
  return (
    <span
      className={cn(
        "block rounded-field px-2 py-1.5 text-small leading-small",
        activityStyles[entry.activite],
      )}
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
  const summary = summaryText(entries, texts);

  return (
    <div className={cn("week-planner", className)} data-variant="display">
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
                      <EntryChip entry={entry} texts={texts} />
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
                        <EntryChip entry={entry} texts={texts} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-4 font-bold">{summary}</p>

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
    </div>
  );
}
