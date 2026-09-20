"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { RadioCards } from "@/components/ui/RadioCards/RadioCards";
import { TextField } from "@/components/ui/TextField/TextField";
import { cn } from "@/lib/cn";
import {
  durations,
  nightKinds,
  rhythms,
  urgencies,
  type Duration,
  type NightKind,
  type Rhythm,
  type Urgency,
} from "@/lib/lead/forms";
import {
  chooseEveryDay,
  continuousGrid,
  emptyPlanning,
  needsNightQuestion,
  planningEstimate,
  syncRanges,
  type PlanningValue,
} from "@/lib/lead/planning";
import { formatEuro, monthlyBudget, type BudgetBasis } from "@/lib/pricing/pricing";
import {
  activeDays,
  applyShortcut,
  countSlots,
  gridShortcuts,
  hasSlot,
  toggleSlot,
  type GridShortcut,
  type WeekGrid,
  type WeekRanges,
} from "@/lib/week/grid";
import { slotHours, weekDays, weekSlots, type WeekDay, type WeekSlot } from "@/lib/week/week";
import { DatesInput, type DatesInputTexts } from "./DatesInput";
import { PreciseHours, type PreciseHoursTexts } from "./PreciseHours";

/*
 * Étape planning d'un formulaire (docs/05 §4) : question du rythme puis :
 * - régulier : sept jours × six créneaux (tableau au clavier sur ordinateur, accordéon par jour
 *   sur mobile, raccourcis), horaires précis facultatifs (plages de 30 min, copie de jour) ;
 * - ponctuel : dates (une à une ou par période) et créneaux communs à ces dates ;
 * - 24h/24 : « Tous les jours ? », grille remplie d'office et modifiable, date de début, durée ;
 * - je ne sais pas encore : seulement la date de début souhaitée.
 * Question sur la nuit dès qu'une nuit est demandée ; estimation en direct (heures, nuits,
 * budget mensuel si content/tarifs.json est rempli) annoncée par aria-live ; date de début
 * souhaitée (l'urgence de la demande). L'état n'est jamais porté par la couleur seule.
 */

export interface PlanningTexts extends Omit<PreciseHoursTexts, "jours">, DatesInputTexts {
  rythme_question: string;
  rythmes: Record<Rhythm, string>;
  grille_legende: string;
  raccourcis_legende: string;
  raccourci_matins: string;
  tout_effacer: string;
  /** Contient {jour}, {creneau}, {debut}, {fin}. */
  cellule: string;
  creneaux_jour_zero: string;
  creneaux_jour_singulier: string;
  /** Contient {n}. */
  creneaux_jour_pluriel: string;
  resume_vide: string;
  estimation_suite: string;
  horaires_precis: string;
  nuit_question: string;
  nuits: Record<NightKind, string>;
  debut_question: string;
  debuts: Record<Urgency, string>;
  /** Contient {avant} et {apres}. */
  budget: string;
  budget_mention: string;
  creneaux_dates: string;
  /** Contient {h} et {n}. */
  resume_dates: string;
  tous_les_jours_question: string;
  tous_les_jours: string;
  jours_choisis: string;
  jours_legende: string;
  grille_24h: string;
  debut_date: string;
  duree_question: string;
  durees: Record<Duration, string>;
}

export interface WeekPlannerInputTexts {
  semaine_type: {
    /** Contient {h}. */
    resume: string;
    nuit_singulier: string;
    /** Contient {n}. */
    nuits_pluriel: string;
    jours: Record<WeekDay, string>;
    creneaux: Record<WeekSlot, string>;
  };
  formulaires: {
    etape_planning: string;
    /** Les cinq raccourcis de docs/01 §7, dans cet ordre : tous les jours, lundi-vendredi, week-end, nuits, 24h/24. */
    raccourcis: readonly string[];
  };
  planning: PlanningTexts;
}

export type WeekPlannerValue = PlanningValue;

export interface WeekPlannerInputProps {
  id?: string;
  value?: WeekPlannerValue;
  defaultValue?: WeekPlannerValue;
  onChange?: (value: WeekPlannerValue) => void;
  texts: WeekPlannerInputTexts;
  /** Base tarifaire pour l'estimation de budget ; null tant que les tarifs sont inconnus. */
  budget?: BudgetBasis | null;
  /** Identifiants DOM des deux questions obligatoires, pour le résumé d'erreurs du formulaire. */
  ids?: { rythme?: string; urgence?: string };
  errors?: { rythme?: string; urgence?: string };
  className?: string;
}

function lowerFirst(label: string): string {
  return label.charAt(0).toLocaleLowerCase("fr-FR") + label.slice(1);
}

export function cellName(day: WeekDay, slot: WeekSlot, texts: WeekPlannerInputTexts): string {
  return texts.planning.cellule
    .replace("{jour}", texts.semaine_type.jours[day])
    .replace("{creneau}", lowerFirst(texts.semaine_type.creneaux[slot]))
    .replace("{debut}", slotHours[slot].from)
    .replace("{fin}", slotHours[slot].to);
}

const hoursFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

function nightsSuffix(nights: number, texts: WeekPlannerInputTexts): string {
  if (nights === 0) return "";
  if (nights === 1) return `, ${texts.semaine_type.nuit_singulier}`;
  return `, ${texts.semaine_type.nuits_pluriel.replace("{n}", String(nights))}`;
}

export function summaryText(value: WeekPlannerValue, texts: WeekPlannerInputTexts): string {
  const { hours, nights } = planningEstimate(value);
  if (hours === 0) return texts.planning.resume_vide;
  const base =
    value.rythme === "ponctuel"
      ? texts.planning.resume_dates
          .replace("{h}", hoursFormat.format(hours))
          .replace("{n}", String(value.dates.length))
      : texts.semaine_type.resume.replace("{h}", hoursFormat.format(hours));
  return `${base}${nightsSuffix(nights, texts)}. ${texts.planning.estimation_suite}`;
}

export function budgetText(
  value: WeekPlannerValue,
  basis: BudgetBasis | null | undefined,
  texts: WeekPlannerInputTexts,
): string | null {
  if (!basis || value.rythme === "ponctuel") return null;
  const { hours } = planningEstimate(value);
  if (hours === 0) return null;
  const { before, after } = monthlyBudget(basis, hours);
  return texts.planning.budget
    .replace("{avant}", formatEuro(before))
    .replace("{apres}", formatEuro(after));
}

function shortcutLabels(texts: WeekPlannerInputTexts): Record<GridShortcut, string> {
  const [tous, semaine, weekend, nuits, continu] = texts.formulaires.raccourcis;
  return {
    tous: tous ?? "",
    semaine: semaine ?? "",
    weekend: weekend ?? "",
    matins: texts.planning.raccourci_matins,
    nuits: nuits ?? "",
    continu: continu ?? "",
    effacer: texts.planning.tout_effacer,
  };
}

const cellClass = cn(
  "flex min-h-12 cursor-pointer items-center gap-2 rounded-field border border-field-border bg-white px-3 py-2",
  "has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50",
  "has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
);
const checkboxClass = "size-6 shrink-0 accent-teal-700 focus-visible:outline-none";

export function WeekPlannerInput({
  id: givenId,
  value,
  defaultValue,
  onChange,
  texts,
  budget = null,
  ids,
  errors,
  className,
}: WeekPlannerInputProps) {
  const generated = useId();
  const id = givenId ?? generated;
  const [internal, setInternal] = useState<WeekPlannerValue>(defaultValue ?? emptyPlanning);
  const current = value ?? internal;

  const update = (next: WeekPlannerValue) => {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };
  const setGrid = (grille: WeekGrid) =>
    update({
      ...current,
      grille,
      plages: current.precis ? syncRanges(grille, current.plages) : current.plages,
    });
  const setRanges = (plages: WeekRanges) => update({ ...current, plages });
  const setPrecise = (precis: boolean) =>
    update({
      ...current,
      precis,
      plages: precis ? syncRanges(current.grille, current.plages) : {},
    });

  const labels = shortcutLabels(texts);
  const summary = summaryText(current, texts);
  const budgetLine = budgetText(current, budget, texts);
  const askNight = needsNightQuestion(current);
  const preciseId = `${id}-precis`;
  const showGrid =
    current.rythme === "regulier" || (current.rythme === "24h" && current.tousLesJours !== null);

  const moveFocus = (event: KeyboardEvent<HTMLTableElement>) => {
    const target = event.target as HTMLElement;
    const day = target.dataset["day"] as WeekDay | undefined;
    const slot = target.dataset["slot"] as WeekSlot | undefined;
    if (!day || !slot) return;
    const dayIndex = weekDays.indexOf(day);
    const slotIndex = weekSlots.indexOf(slot);
    const moves: Record<string, [number, number]> = {
      ArrowRight: [1, 0],
      ArrowLeft: [-1, 0],
      ArrowDown: [0, 1],
      ArrowUp: [0, -1],
    };
    const move = moves[event.key];
    if (!move) return;
    const nextDay = weekDays[dayIndex + move[0]];
    const nextSlot = weekSlots[slotIndex + move[1]];
    if (!nextDay || !nextSlot) return;
    event.preventDefault();
    event.currentTarget
      .querySelector<HTMLInputElement>(`input[data-day="${nextDay}"][data-slot="${nextSlot}"]`)
      ?.focus();
  };

  const daySummary = (day: WeekDay) => {
    const n = current.grille[day]?.length ?? 0;
    if (n === 0) return texts.planning.creneaux_jour_zero;
    if (n === 1) return texts.planning.creneaux_jour_singulier;
    return texts.planning.creneaux_jour_pluriel.replace("{n}", String(n));
  };

  const estimate = (
    <div className="mt-6" aria-live="polite" aria-atomic="true">
      <p className="m-0 font-bold">{summary}</p>
      {budgetLine ? (
        <p className="m-0 mt-1">
          <span className="block">{budgetLine}</span>
          <span className="block text-small text-text-soft">{texts.planning.budget_mention}</span>
        </p>
      ) : null}
    </div>
  );

  return (
    <div className={cn("grid gap-8", className)} data-component="week-planner-input">
      <RadioCards
        id={ids?.rythme}
        error={errors?.rythme}
        name={`${id}-rythme`}
        legend={texts.planning.rythme_question}
        options={rhythms.map((rythme) => ({
          value: rythme,
          label: texts.planning.rythmes[rythme],
        }))}
        value={current.rythme ?? ""}
        onChange={(rythme) => update({ ...current, rythme: rythme as Rhythm })}
      />

      {current.rythme === "24h" ? (
        <RadioCards
          name={`${id}-tous-les-jours`}
          legend={texts.planning.tous_les_jours_question}
          options={[
            { value: "oui", label: texts.planning.tous_les_jours },
            { value: "non", label: texts.planning.jours_choisis },
          ]}
          value={current.tousLesJours === null ? "" : current.tousLesJours ? "oui" : "non"}
          onChange={(answer) => update(chooseEveryDay(current, answer === "oui"))}
        />
      ) : null}

      {current.rythme === "24h" && current.tousLesJours === false ? (
        <div role="group" aria-label={texts.planning.jours_legende}>
          <p className="m-0 font-bold">{texts.planning.jours_legende}</p>
          <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
            {weekDays.map((day) => {
              const active = activeDays(current.grille);
              return (
                <li key={day} className="max-w-none">
                  <label className={cellClass}>
                    <input
                      type="checkbox"
                      checked={active.includes(day)}
                      onChange={(event) =>
                        setGrid(
                          continuousGrid(
                            weekDays.filter((d) =>
                              d === day ? event.target.checked : active.includes(d),
                            ),
                          ),
                        )
                      }
                      className={checkboxClass}
                    />
                    <span>{texts.semaine_type.jours[day]}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {showGrid ? (
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="m-0 mb-4 p-0 font-bold">
            {current.rythme === "24h"
              ? texts.planning.grille_24h
              : texts.formulaires.etape_planning}
          </legend>

          <div role="group" aria-label={texts.planning.raccourcis_legende}>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {gridShortcuts.map((shortcut) => (
                <li key={shortcut} className="max-w-none">
                  <button
                    type="button"
                    onClick={() => setGrid(applyShortcut(current.grille, shortcut))}
                    className={cn(
                      "min-h-12 rounded-full border-2 px-4 font-bold",
                      shortcut === "effacer"
                        ? "border-line bg-white text-ink"
                        : "border-teal-700 bg-white text-teal-900 hover:bg-teal-50",
                    )}
                  >
                    {labels[shortcut]}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <table className="mt-6 hidden w-full border-collapse md:table" onKeyDown={moveFocus}>
            <caption className="sr-only">{texts.planning.grille_legende}</caption>
            <thead>
              <tr>
                <td className="p-1" />
                {weekDays.map((day) => (
                  <th key={day} scope="col" className="p-1 text-left align-bottom">
                    {texts.semaine_type.jours[day]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekSlots.map((slot) => (
                <tr key={slot} className="border-t border-line">
                  <th scope="row" className="p-1 pr-3 text-left align-middle">
                    <span className="block">{texts.semaine_type.creneaux[slot]}</span>
                    <span className="tabular-figures block text-small font-normal text-text-soft">
                      {slotHours[slot].from}–{slotHours[slot].to}
                    </span>
                  </th>
                  {weekDays.map((day) => (
                    <td key={day} className="p-1 align-middle">
                      <label className={cn(cellClass, "justify-center")}>
                        <input
                          type="checkbox"
                          data-day={day}
                          data-slot={slot}
                          aria-label={cellName(day, slot, texts)}
                          checked={hasSlot(current.grille, day, slot)}
                          onChange={() => setGrid(toggleSlot(current.grille, day, slot))}
                          className={checkboxClass}
                        />
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 grid gap-3 md:hidden">
            {weekDays.map((day) => (
              <details key={day} className="rounded-card border border-line bg-white">
                <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 py-2 font-bold">
                  <span>{texts.semaine_type.jours[day]}</span>
                  <span className="text-small font-normal text-text-soft">{daySummary(day)}</span>
                </summary>
                <ul className="m-0 grid list-none gap-2 p-3 pt-0">
                  {weekSlots.map((slot) => (
                    <li key={slot} className="max-w-none">
                      <label className={cellClass}>
                        <input
                          type="checkbox"
                          aria-label={cellName(day, slot, texts)}
                          checked={hasSlot(current.grille, day, slot)}
                          onChange={() => setGrid(toggleSlot(current.grille, day, slot))}
                          className={checkboxClass}
                        />
                        <span className="grow">{texts.semaine_type.creneaux[slot]}</span>
                        <span className="tabular-figures text-small text-text-soft">
                          {slotHours[slot].from}–{slotHours[slot].to}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>

          {countSlots(current.grille) > 0 ? (
            <div className="mt-6">
              <label htmlFor={preciseId} className={cn(cellClass, "inline-flex")}>
                <input
                  id={preciseId}
                  type="checkbox"
                  checked={current.precis}
                  onChange={(event) => setPrecise(event.target.checked)}
                  className={checkboxClass}
                />
                <span>{texts.planning.horaires_precis}</span>
              </label>
              {current.precis ? (
                <div className="mt-4">
                  <PreciseHours
                    days={activeDays(current.grille)}
                    ranges={current.plages}
                    onChange={setRanges}
                    texts={{ ...texts.planning, jours: texts.semaine_type.jours }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {estimate}
        </fieldset>
      ) : null}

      {current.rythme === "ponctuel" ? (
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="sr-only">{texts.formulaires.etape_planning}</legend>
          <DatesInput
            dates={current.dates}
            onChange={(dates) => update({ ...current, dates })}
            texts={texts.planning}
          />
          <div className="mt-6" role="group" aria-label={texts.planning.creneaux_dates}>
            <p className="m-0 font-bold">{texts.planning.creneaux_dates}</p>
            <ul className="m-0 mt-3 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {weekSlots.map((slot) => (
                <li key={slot} className="max-w-none">
                  <label className={cellClass}>
                    <input
                      type="checkbox"
                      checked={current.creneaux.includes(slot)}
                      onChange={(event) =>
                        update({
                          ...current,
                          creneaux: weekSlots.filter((s) =>
                            s === slot ? event.target.checked : current.creneaux.includes(s),
                          ),
                        })
                      }
                      className={checkboxClass}
                    />
                    <span className="grow">{texts.semaine_type.creneaux[slot]}</span>
                    <span className="tabular-figures text-small text-text-soft">
                      {slotHours[slot].from}–{slotHours[slot].to}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
          {estimate}
        </fieldset>
      ) : null}

      {askNight ? (
        <RadioCards
          name={`${id}-nuit`}
          legend={texts.planning.nuit_question}
          columns={1}
          options={nightKinds.map((kind) => ({ value: kind, label: texts.planning.nuits[kind] }))}
          value={current.nuit ?? ""}
          onChange={(nuit) => update({ ...current, nuit: nuit as NightKind })}
        />
      ) : null}

      {current.rythme === "24h" ? (
        <div className="grid gap-8">
          <TextField
            id={`${id}-debut`}
            type="date"
            label={texts.planning.debut_date}
            value={current.debut ?? ""}
            onChange={(event) => update({ ...current, debut: event.target.value || null })}
            className="max-w-xs"
          />
          <RadioCards
            name={`${id}-duree`}
            legend={texts.planning.duree_question}
            columns={3}
            options={durations.map((duration) => ({
              value: duration,
              label: texts.planning.durees[duration],
            }))}
            value={current.duree ?? ""}
            onChange={(duree) => update({ ...current, duree: duree as Duration })}
          />
        </div>
      ) : null}

      {current.rythme !== null ? (
        <RadioCards
          id={ids?.urgence}
          error={errors?.urgence}
          name={`${id}-debut-souhaite`}
          legend={texts.planning.debut_question}
          options={urgencies.map((urgency) => ({
            value: urgency,
            label: texts.planning.debuts[urgency],
          }))}
          value={current.urgence ?? ""}
          onChange={(urgence) => update({ ...current, urgence: urgence as Urgency })}
        />
      ) : null}
    </div>
  );
}
