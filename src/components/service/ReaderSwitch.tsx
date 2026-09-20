"use client";

import { useId } from "react";
import { useReader } from "./ReaderContext";

/*
 * docs/03 §4 : sur le pilier « Personnes âgées », le lecteur est l'enfant adulte (70 %) ou la
 * personne elle-même (30 %). Un sélecteur en haut de page affiche la version « Pour vous-même »
 * du chapô. Deux boutons à bascule (aria-pressed), clavier natif, aucune donnée conservée.
 * Le chapô « pour un proche » est rendu côté serveur : sans JavaScript, la page reste lisible.
 * Sous un `ReaderProvider`, l'état est partagé avec la photo du hero (`ReaderPhoto`), qui
 * bascule en même temps que le chapô (docs/design/CONCEPT.md §4).
 */

export interface ReaderSwitchProps {
  proche: string;
  soi: string;
  texts: { legende: string; proche: string; soi: string };
}

const pill =
  "inline-flex min-h-10 items-center rounded-full border-2 border-teal-700 bg-transparent px-4 " +
  "text-small font-bold text-teal-700 transition-colors [transition-duration:var(--duration-base)] " +
  "motion-reduce:transition-none hover:bg-teal-50 aria-pressed:border-teal-800 aria-pressed:bg-teal-800 " +
  "aria-pressed:text-white aria-pressed:hover:bg-teal-800";

export function ReaderSwitch({ proche, soi, texts }: ReaderSwitchProps) {
  const { reader, setReader } = useReader();
  const legendId = useId();

  return (
    <>
      <span
        role="group"
        aria-labelledby={legendId}
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        <span id={legendId} className="text-small text-text-soft">
          {texts.legende}
        </span>
        <button
          type="button"
          className={pill}
          aria-pressed={reader === "proche"}
          onClick={() => setReader("proche")}
        >
          {texts.proche}
        </button>
        <button
          type="button"
          className={pill}
          aria-pressed={reader === "soi"}
          onClick={() => setReader("soi")}
        >
          {texts.soi}
        </button>
      </span>
      <span data-reader={reader}>{reader === "proche" ? proche : soi}</span>
    </>
  );
}
