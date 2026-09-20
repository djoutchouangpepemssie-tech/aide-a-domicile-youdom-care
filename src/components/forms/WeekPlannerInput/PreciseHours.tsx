"use client";

import { useId, useState } from "react";
import { Select } from "@/components/ui/Select/Select";
import { halfHours, type TimeRange, type WeekRanges } from "@/lib/week/grid";
import type { WeekDay } from "@/lib/week/week";

/*
 * Horaires précis (docs/05 §4) : pour chaque jour coché, une ou plusieurs plages « de … à … »
 * par pas de 30 minutes, y compris des plages qui passent minuit, et « Copier ce jour sur… ».
 * Listes déroulantes natives : le clavier, le lecteur d'écran et le mobile sont pris en charge
 * par le navigateur, sans dépendance.
 */

export interface PreciseHoursTexts {
  horaires_legende: string;
  /** Contient {jour} et {n}. */
  plage_nom: string;
  plage_de: string;
  plage_a: string;
  ajouter_plage: string;
  retirer_plage: string;
  copier_jour: string;
  copier_choisir: string;
  copier_tous: string;
  copier: string;
  jours: Record<WeekDay, string>;
}

export interface PreciseHoursProps {
  days: readonly WeekDay[];
  ranges: WeekRanges;
  onChange: (ranges: WeekRanges) => void;
  texts: PreciseHoursTexts;
}

const hourOptions = halfHours.map((time) => ({ value: time, label: time.replace(":", " h ") }));
const defaultRange: TimeRange = { debut: "09:00", fin: "12:00" };

export function PreciseHours({ days, ranges, onChange, texts }: PreciseHoursProps) {
  const id = useId();
  const [copyTargets, setCopyTargets] = useState<Partial<Record<WeekDay, string>>>({});

  const setDay = (day: WeekDay, list: TimeRange[]) => onChange({ ...ranges, [day]: list });

  const updateRange = (day: WeekDay, index: number, patch: Partial<TimeRange>) => {
    const list = (ranges[day] ?? []).map((range, i) =>
      i === index ? { ...range, ...patch } : range,
    );
    setDay(day, list);
  };

  const copyDay = (day: WeekDay) => {
    const target = copyTargets[day];
    const source = ranges[day] ?? [];
    if (!target || source.length === 0) return;
    const targets = target === "*" ? days.filter((d) => d !== day) : [target as WeekDay];
    const next: WeekRanges = { ...ranges };
    for (const d of targets) next[d] = source.map((range) => ({ ...range }));
    onChange(next);
  };

  return (
    <div className="grid gap-6" data-component="precise-hours">
      <p className="m-0 font-bold">{texts.horaires_legende}</p>
      {days.map((day) => {
        const list = ranges[day] ?? [];
        const others = days.filter((d) => d !== day);
        return (
          <div key={day} className="rounded-card border border-line bg-white p-4">
            <p className="m-0 font-bold">{texts.jours[day]}</p>
            <div className="mt-3 grid gap-3">
              {list.map((range, index) => {
                const name = texts.plage_nom
                  .replace("{jour}", texts.jours[day])
                  .replace("{n}", String(index + 1));
                return (
                  <fieldset
                    key={`${day}-${index}`}
                    className="m-0 flex min-w-0 flex-wrap items-end gap-3 border-0 p-0"
                  >
                    <legend className="sr-only">{name}</legend>
                    <Select
                      className="min-w-28"
                      label={texts.plage_de}
                      options={hourOptions}
                      value={range.debut}
                      onChange={(event) => updateRange(day, index, { debut: event.target.value })}
                    />
                    <Select
                      className="min-w-28"
                      label={texts.plage_a}
                      options={hourOptions}
                      value={range.fin}
                      onChange={(event) => updateRange(day, index, { fin: event.target.value })}
                    />
                    {list.length > 1 ? (
                      <button
                        type="button"
                        className="min-h-12 rounded-full border-2 border-line bg-white px-4 font-bold"
                        onClick={() =>
                          setDay(
                            day,
                            list.filter((_, i) => i !== index),
                          )
                        }
                      >
                        {texts.retirer_plage}
                      </button>
                    ) : null}
                  </fieldset>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <button
                type="button"
                className="min-h-12 rounded-full border-2 border-teal-700 bg-white px-4 font-bold text-teal-900 hover:bg-teal-50"
                onClick={() => setDay(day, [...list, { ...defaultRange }])}
              >
                {texts.ajouter_plage}
              </button>
              {others.length > 0 ? (
                <>
                  <Select
                    id={`${id}-copie-${day}`}
                    className="min-w-56"
                    label={texts.copier_jour}
                    placeholder={texts.copier_choisir}
                    value={copyTargets[day] ?? ""}
                    onChange={(event) =>
                      setCopyTargets({ ...copyTargets, [day]: event.target.value })
                    }
                    options={[
                      ...others.map((d) => ({ value: d, label: texts.jours[d] })),
                      { value: "*", label: texts.copier_tous },
                    ]}
                  />
                  <button
                    type="button"
                    className="min-h-12 rounded-full border-2 border-line bg-white px-4 font-bold"
                    onClick={() => copyDay(day)}
                    aria-describedby={`${id}-copie-${day}`}
                  >
                    {texts.copier}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
