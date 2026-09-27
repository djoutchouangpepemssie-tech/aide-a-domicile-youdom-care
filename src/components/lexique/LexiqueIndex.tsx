"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Heading } from "@/components/ui/Heading/Heading";
import type { LexiquePage } from "@/content/lexique-schema";
import { cn } from "@/lib/cn";

/*
 * Index alphabétique du lexique (docs/06 §6) : une navigation par lettres ancrées, puis une
 * section par lettre avec, pour chaque terme, son nom (lien), son développé et sa définition.
 * Filtrage côté client facultatif et léger : un champ de recherche réduit la liste aux termes
 * dont le nom, le développé ou une variante contient le texte saisi (sans accents ni casse) ;
 * le compte est annoncé (`role="status"`). Tout est rendu côté serveur : sans JavaScript, la
 * liste complète s'affiche et le champ se masque (`noscript`). Les lettres sans résultat
 * disparaissent avec leur ancre.
 */

export interface LexiqueIndexTerm {
  slug: string;
  terme: string;
  developpe?: string;
  definition: string;
  variantes?: readonly string[];
}

export interface LexiqueIndexGroup {
  lettre: string;
  termes: readonly LexiqueIndexTerm[];
}

export interface LexiqueIndexProps {
  groups: readonly LexiqueIndexGroup[];
  texts: LexiquePage["recherche"];
  lettresNom: string;
  className?: string;
}

/** Sans accents, en minuscules, blancs réduits : ce que l'on compare. */
export function normalizeQuery(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function matchesQuery(term: LexiqueIndexTerm, query: string): boolean {
  if (query.length === 0) return true;
  const haystack = normalizeQuery(
    [term.terme, term.developpe ?? "", ...(term.variantes ?? [])].join(" "),
  );
  return haystack.includes(query);
}

export function letterAnchor(lettre: string): string {
  return `lettre-${lettre === "#" ? "autres" : lettre.toLowerCase()}`;
}

export function LexiqueIndex({ groups, texts, lettresNom, className }: LexiqueIndexProps) {
  const [raw, setRaw] = useState("");
  const query = normalizeQuery(raw);
  const inputId = useId();
  const hintId = useId();

  const visible = useMemo(
    () =>
      groups
        .map((group) => ({
          lettre: group.lettre,
          termes: group.termes.filter((term) => matchesQuery(term, query)),
        }))
        .filter((group) => group.termes.length > 0),
    [groups, query],
  );
  const count = visible.reduce((total, group) => total + group.termes.length, 0);
  const status =
    count === 0
      ? texts.aucun
      : count === 1
        ? texts.un_resultat
        : texts.resultats.replace("{n}", String(count));

  return (
    <div className={className} data-lexique-index>
      <noscript>
        <style>{`[data-lexique-search]{display:none}`}</style>
      </noscript>
      <div data-lexique-search className="max-w-md">
        <label htmlFor={inputId} className="block font-bold">
          {texts.label}
        </label>
        <input
          id={inputId}
          type="search"
          autoComplete="off"
          aria-describedby={hintId}
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          className="mt-2 block min-h-12 w-full rounded-button border border-line bg-white px-4 text-ink"
        />
        <p id={hintId} className="m-0 mt-2 text-small text-text-soft">
          {texts.aide}
        </p>
        <p role="status" aria-live="polite" className="m-0 mt-2 text-small font-bold">
          {query.length > 0 ? status : ""}
        </p>
      </div>

      <nav aria-label={lettresNom} className="mt-8">
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {visible.map((group) => (
            <li key={group.lettre} className="max-w-none">
              <a
                href={`#${letterAnchor(group.lettre)}`}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-button border border-line bg-white px-3 font-bold text-teal-900 no-underline hover:border-teal-700"
              >
                {group.lettre}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {count === 0 ? (
        <p className="mt-10 font-bold" data-lexique-empty>
          {texts.aucun}
        </p>
      ) : null}

      {visible.map((group) => {
        const anchor = letterAnchor(group.lettre);
        return (
          <section
            key={group.lettre}
            id={anchor}
            aria-labelledby={`${anchor}-titre`}
            className="mt-10 scroll-mt-24"
            data-lettre={group.lettre}
          >
            <Heading level={2} id={`${anchor}-titre`}>
              {group.lettre}
            </Heading>
            <ul className="m-0 mt-4 grid list-none gap-4 p-0 md:grid-cols-2">
              {group.termes.map((term) => (
                <li
                  key={term.slug}
                  className={cn("max-w-none rounded-card border border-line bg-white p-5 shadow-1")}
                  data-lexique-item={term.slug}
                >
                  <Link
                    href={`/lexique/${term.slug}/`}
                    prefetch={false}
                    className="inline-flex min-h-11 items-center text-h4 font-bold text-teal-900"
                  >
                    {term.terme}
                  </Link>
                  {term.developpe ? (
                    <span className="block text-small text-text-soft">{term.developpe}</span>
                  ) : null}
                  <p className="m-0 mt-2">{term.definition}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
