"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/*
 * Parcours « Pour qui cherchez-vous de l'aide ? » (docs/design/CONCEPT.md §3) : le public choisi
 * dans la bannière (`HeroPicker`) est lu par le bloc 2 (`SituationPanel`). L'état vit en mémoire
 * le temps de la page : rien n'est écrit dans le stockage du navigateur, rien n'est envoyé.
 * Côté serveur et sans JavaScript, aucun public n'est choisi : tout est rendu visible.
 */

export interface ParcoursState {
  /** Identifiant du choix (`banniere.parcours.choix[].id`), null tant que rien n'est choisi. */
  selected: string | null;
  select: (id: string | null) => void;
}

const ParcoursContext = createContext<ParcoursState>({ selected: null, select: () => {} });

export function ParcoursProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <ParcoursContext.Provider value={{ selected, select: setSelected }}>
      {children}
    </ParcoursContext.Provider>
  );
}

export function useParcours(): ParcoursState {
  return useContext(ParcoursContext);
}
