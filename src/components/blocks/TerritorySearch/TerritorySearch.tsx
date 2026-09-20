"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { normalizeName, searchCommunes, type CommuneRecord } from "@/lib/geo/geo";

/*
 * Recherche de commune (docs/01 §4 bloc 9, docs/02 §7 TerritorySearch, docs/04 §5) : champ à
 * autocomplétion sur les 1 285 communes et arrondissements d'Île-de-France, au clavier
 * (flèches, Entrée, Échap), résultats et réponse annoncés par aria-live. La liste compacte
 * (data/idf-communes.compact.json) n'est chargée qu'au premier focus.
 * Aucune donnée saisie n'est envoyée : tout se passe dans le navigateur.
 */

export interface TerritorySearchTexts {
  champ: string;
  bouton: string;
  /** Contient {commune} et {agence}. */
  oui: string;
  /** Contient {commune} (agence inconnue). */
  oui_sans_agence: string;
  hors: string;
  aucun_resultat: string;
  /** Contient {n}. */
  suggestions: string;
}

/** [code, nom, codes postaux séparés par des espaces, département, agence] */
export type CompactCommune = [string, string, string, string, string];

export interface TerritorySearchProps {
  texts: TerritorySearchTexts;
  /** Noms des agences par identifiant (site.config.json). */
  agencies: Record<string, string>;
  /** Chargement de la liste ; par défaut, import dynamique du fichier compact. */
  loadCommunes?: () => Promise<CompactCommune[]>;
  className?: string;
}

function inflate(rows: CompactCommune[]): CommuneRecord[] {
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

export function TerritorySearch({
  texts,
  agencies,
  loadCommunes = defaultLoad,
  className,
}: TerritorySearchProps) {
  const id = useId();
  const [communes, setCommunes] = useState<CommuneRecord[] | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState<string | null>(null);
  const loading = useRef(false);
  // La liste se ferme un peu après la perte du focus (pour laisser passer le clic sur une
  // option) ; un retour du focus annule cette fermeture.
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ensureLoaded = () => {
    if (communes !== null || loading.current) return;
    loading.current = true;
    void loadCommunes().then((rows) => setCommunes(inflate(rows)));
  };

  useEffect(() => {
    if (query.length > 0) ensureLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement à la première saisie seulement
  }, [query]);

  const suggestions = communes && query.length > 0 ? searchCommunes(query, communes) : [];
  const listId = `${id}-liste`;
  const optionId = (index: number) => `${id}-option-${index}`;

  const answer = (commune: CommuneRecord | null) => {
    setOpen(false);
    setActive(-1);
    if (!commune) {
      setResult(texts.hors);
      return;
    }
    setQuery(commune.nom);
    const agency = commune.agence ? agencies[commune.agence] : undefined;
    setResult(
      agency
        ? texts.oui.replace("{commune}", commune.nom).replace("{agence}", agency)
        : texts.oui_sans_agence.replace("{commune}", commune.nom),
    );
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (communes === null) {
      ensureLoaded();
      return;
    }
    const exact = suggestions.find((c) => normalizeName(c.nom) === normalizeName(query));
    answer(exact ?? suggestions[active] ?? suggestions[0] ?? null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((value) => (value + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((value) => (value - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    } else if (event.key === "Enter" && open && active >= 0) {
      event.preventDefault();
      answer(suggestions[active] ?? null);
    }
  };

  const expanded = open && suggestions.length > 0;

  return (
    <form
      onSubmit={onSubmit}
      className={cn("territory-search", className)}
      role="search"
      aria-label={texts.champ}
    >
      <label htmlFor={`${id}-champ`} className="block font-bold">
        {texts.champ}
      </label>
      <div className="relative mt-2 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <input
            id={`${id}-champ`}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActive(-1);
              setResult(null);
            }}
            onFocus={() => {
              if (blurTimer.current) clearTimeout(blurTimer.current);
              ensureLoaded();
              setOpen(true);
            }}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setOpen(false), 150);
            }}
            onKeyDown={onKeyDown}
            className="min-h-12 w-full rounded-field border border-field-border bg-white px-4 py-3 text-ink placeholder:text-text-soft"
          />
          <ul
            id={listId}
            role="listbox"
            aria-label={texts.champ}
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
                  answer(commune);
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
        </div>
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center rounded-button bg-secondary px-6 font-bold text-white hover:bg-teal-800"
        >
          {texts.bouton}
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {expanded ? texts.suggestions.replace("{n}", String(suggestions.length)) : ""}
        {!expanded && communes !== null && query.length > 0 && suggestions.length === 0 && !result
          ? texts.aucun_resultat
          : ""}
      </p>
      <p
        aria-live="polite"
        className={cn(
          "m-0 mt-4 min-h-6 font-bold",
          result === texts.hors ? "text-ink" : "text-teal-900",
        )}
        data-result={result ? (result === texts.hors ? "hors" : "oui") : "aucun"}
      >
        {result}
      </p>
    </form>
  );
}
