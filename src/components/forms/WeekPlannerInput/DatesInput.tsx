"use client";

import { useId, useState } from "react";
import { TextField } from "@/components/ui/TextField/TextField";
import { expandPeriod, MAX_DATES, normalizeDates } from "@/lib/lead/planning";

/*
 * Dates ponctuelles (docs/05 §4) : une date à la fois, ou une période « du … au … » développée
 * en dates ; la liste reste modifiable date par date. Champs de date natifs, 60 dates au plus.
 */

export interface DatesInputTexts {
  dates_legende: string;
  date_unique: string;
  ajouter_date: string;
  periode_du: string;
  periode_au: string;
  ajouter_periode: string;
  retirer_date: string;
  /** Contient {n}. */
  dates_choisies: string;
  aucune_date: string;
  /** Contient {max}. */
  dates_maximum: string;
}

export interface DatesInputProps {
  dates: readonly string[];
  onChange: (dates: string[]) => void;
  texts: DatesInputTexts;
}

const longDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatLongDate(iso: string): string {
  return longDate.format(new Date(`${iso}T12:00:00Z`));
}

const buttonClass =
  "min-h-12 rounded-full border-2 border-teal-700 bg-white px-4 font-bold text-teal-900 hover:bg-teal-50";

export function DatesInput({ dates, onChange, texts }: DatesInputProps) {
  const id = useId();
  const [single, setSingle] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const full = dates.length >= MAX_DATES;

  const add = (added: readonly string[]) => onChange(normalizeDates([...dates, ...added]));

  return (
    <div className="grid gap-6" data-component="dates-input">
      <p className="m-0 font-bold">{texts.dates_legende}</p>
      <div className="flex flex-wrap items-end gap-3">
        <TextField
          id={`${id}-date`}
          type="date"
          label={texts.date_unique}
          value={single}
          onChange={(event) => setSingle(event.target.value)}
          className="min-w-44"
        />
        <button
          type="button"
          className={buttonClass}
          disabled={single === "" || full}
          onClick={() => {
            add([single]);
            setSingle("");
          }}
        >
          {texts.ajouter_date}
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <TextField
          id={`${id}-du`}
          type="date"
          label={texts.periode_du}
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className="min-w-44"
        />
        <TextField
          id={`${id}-au`}
          type="date"
          label={texts.periode_au}
          value={to}
          min={from || undefined}
          onChange={(event) => setTo(event.target.value)}
          className="min-w-44"
        />
        <button
          type="button"
          className={buttonClass}
          disabled={expandPeriod(from, to).length === 0 || full}
          onClick={() => {
            add(expandPeriod(from, to));
            setFrom("");
            setTo("");
          }}
        >
          {texts.ajouter_periode}
        </button>
      </div>
      <div aria-live="polite">
        <p className="m-0 font-bold">
          {dates.length === 0
            ? texts.aucune_date
            : texts.dates_choisies.replace("{n}", String(dates.length))}
        </p>
        {full ? (
          <p className="m-0 text-small text-text-soft">
            {texts.dates_maximum.replace("{max}", String(MAX_DATES))}
          </p>
        ) : null}
        {dates.length > 0 ? (
          <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
            {dates.map((date) => (
              <li
                key={date}
                className="flex max-w-none items-center gap-2 rounded-full border border-line bg-white py-1 pr-1 pl-3"
              >
                <time dateTime={date}>{formatLongDate(date)}</time>
                <button
                  type="button"
                  className="flex size-11 items-center justify-center rounded-full font-bold hover:bg-sand"
                  aria-label={`${texts.retirer_date} ${formatLongDate(date)}`}
                  onClick={() => onChange(dates.filter((d) => d !== date))}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
