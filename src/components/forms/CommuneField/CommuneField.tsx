"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { describedBy, FieldShell } from "@/components/ui/FieldShell/FieldShell";
import { cn } from "@/lib/cn";
import { normalizeName, searchCommunes, type CommuneRecord } from "@/lib/geo/geo";

/*
 * Champ « commune ou code postal » des formulaires (docs/05 §3) : combobox WAI-ARIA sur la liste
 * des communes d'Île-de-France (data/idf-communes.compact.json, chargée au premier focus), même
 * motif que TerritorySearch. Le formulaire reçoit la commune choisie (ou null) et la saisie brute,
 * pour distinguer « rien saisi » de « commune hors Île-de-France ». Un code INSEE initial
 * (`?commune=92062`, jamais de donnée de santé dans l'adresse) présélectionne la commune.
 */

export type CompactCommune = [string, string, string, string, string];

export interface CommuneFieldTexts {
  aucun_resultat: string;
  /** Contient {n}. */
  suggestions: string;
}

export interface CommuneFieldProps {
  id?: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  value: CommuneRecord | null;
  onChange: (commune: CommuneRecord | null, query: string) => void;
  initialInsee?: string;
  loadCommunes?: () => Promise<CompactCommune[]>;
  texts: CommuneFieldTexts;
}

export function inflateCommunes(rows: readonly CompactCommune[]): CommuneRecord[] {
  return rows.map(([code, nom, cps, departement, agence]) => ({
    code,
    nom,
    codes_postaux: cps ? cps.split(" ") : [],
    departement,
    type: code.startsWith("751") ? "arrondissement" : "commune",
    population: null,
    centre: null,
    agence: agence || null,
  }));
}

const defaultLoad = async (): Promise<CompactCommune[]> => {
  const data = await import("../../../../data/idf-communes.compact.json");
  return data.default as CompactCommune[];
};

export function CommuneField({
  id: givenId,
  label,
  hint,
  error,
  value,
  onChange,
  initialInsee,
  loadCommunes = defaultLoad,
  texts,
}: CommuneFieldProps) {
  const generated = useId();
  const id = givenId ?? generated;
  const [communes, setCommunes] = useState<CommuneRecord[] | null>(null);
  const [query, setQuery] = useState(value?.nom ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const loading = useRef(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const load = (): Promise<CommuneRecord[]> => {
    if (communes !== null) return Promise.resolve(communes);
    if (!loading.current) loading.current = true;
    return loadCommunes().then((rows) => {
      const list = inflateCommunes(rows);
      setCommunes(list);
      return list;
    });
  };

  useEffect(() => {
    // Présélection : code INSEE reçu en propriété, sinon `?commune=92062` dans l'adresse
    // (lu côté client pour que la page reste statique ; jamais de donnée de santé dans l'URL).
    const fromUrl = new URLSearchParams(window.location.search).get("commune") ?? "";
    const insee = initialInsee ?? (/^\d{5}$/.test(fromUrl) ? fromUrl : undefined);
    if (!insee || value) return;
    void load().then((list) => {
      const found = list.find((c) => c.code === insee);
      if (found) {
        setQuery(found.nom);
        onChangeRef.current(found, found.nom);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- présélection au montage seulement
  }, [initialInsee]);

  const suggestions = communes && query.length > 0 ? searchCommunes(query, communes) : [];
  const listId = `${id}-liste`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const expanded = open && suggestions.length > 0;

  const choose = (commune: CommuneRecord) => {
    setOpen(false);
    setActive(-1);
    setQuery(commune.nom);
    onChange(commune, commune.nom);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((v) => (v + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((v) => (v - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    } else if (event.key === "Enter" && expanded) {
      event.preventDefault();
      const exact = suggestions.find((c) => normalizeName(c.nom) === normalizeName(query));
      const pick = suggestions[active] ?? exact ?? suggestions[0];
      if (pick) choose(pick);
    }
  };

  const status =
    communes && query.length > 0 && !value
      ? suggestions.length === 0
        ? texts.aucun_resultat
        : texts.suggestions.replace("{n}", String(suggestions.length))
      : "";

  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          aria-describedby={describedBy(id, Boolean(hint), Boolean(error))}
          aria-invalid={error ? true : undefined}
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setOpen(true);
            setActive(-1);
            void load();
            onChange(null, next);
          }}
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            void load();
            setOpen(true);
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={onKeyDown}
          className="min-h-12 w-full rounded-field border border-field-border bg-white px-4 py-3 text-ink"
        />
        <ul
          id={listId}
          role="listbox"
          aria-label={typeof label === "string" ? label : undefined}
          hidden={!expanded}
          className="absolute inset-x-0 top-full z-20 m-0 mt-1 max-h-80 list-none overflow-y-auto rounded-card border border-line bg-white p-1 shadow-2"
        >
          {suggestions.map((commune, index) => (
            <li
              key={commune.code}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(commune);
              }}
              className={cn(
                "max-w-none cursor-pointer rounded-field px-3 py-2",
                index === active && "bg-teal-50 text-teal-900",
              )}
            >
              <span className="font-bold">{commune.nom}</span>{" "}
              <span className="tabular-figures text-small text-text-soft">
                {commune.codes_postaux[0]}
              </span>
            </li>
          ))}
        </ul>
        <p className="sr-only" aria-live="polite">
          {status}
        </p>
      </div>
    </FieldShell>
  );
}
