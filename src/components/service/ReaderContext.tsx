"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode } from "react";

/*
 * Lecteur d'une page service (docs/03 §4) : « pour un proche » (par défaut, rendu côté
 * serveur) ou « pour vous-même ». Le sélecteur (`ReaderSwitch`, dans le chapô) et la photo du
 * hero (`ReaderPhoto`) partagent cet état ; le `Hero` lui-même reste un composant serveur,
 * passé en enfant du fournisseur. Sans fournisseur, chaque composant garde son propre état.
 * Aucune donnée n'est conservée.
 */

export type Reader = "proche" | "soi";

interface ReaderState {
  reader: Reader;
  setReader: Dispatch<Reader>;
}

const ReaderContext = createContext<ReaderState | null>(null);

export function ReaderProvider({ children }: { children: ReactNode }) {
  const [reader, setReader] = useState<Reader>("proche");
  return <ReaderContext.Provider value={{ reader, setReader }}>{children}</ReaderContext.Provider>;
}

/** État partagé s'il existe, sinon un état local au composant. */
export function useReader(): ReaderState {
  const shared = useContext(ReaderContext);
  const [reader, setReader] = useState<Reader>("proche");
  return shared ?? { reader, setReader };
}
