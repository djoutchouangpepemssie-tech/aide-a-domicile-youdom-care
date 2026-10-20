"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/*
 * L'habillage public — en-tête, pied de page, barre d'action mobile — **n'a rien à faire dans le
 * back-office**. Un coordinateur qui pose un planning n'a pas besoin qu'on lui propose nos
 * services, ni d'un bouton d'appel en bas de l'écran.
 *
 * Pourquoi ce composant plutôt qu'un second `layout` racine : séparer proprement les deux
 * habillages demanderait de déplacer les cent pages du site dans un groupe de routes. Ce choix
 * viendra quand le back-office partira sur son propre sous-domaine (MY-15) ; d'ici là, dix lignes
 * suffisent, et `usePathname` répond déjà au premier rendu, côté serveur — donc aucun clignotement.
 */

/** Préfixes où l'habillage public est retiré : le back-office, et l'application de terrain. */
export const SANS_HABILLAGE = ["/bureau", "/terrain"] as const;

export function estSansHabillage(chemin: string | null): boolean {
  if (!chemin) return false;
  return SANS_HABILLAGE.some((prefixe) => chemin === prefixe || chemin.startsWith(`${prefixe}/`));
}

export function ChromePublic({ children }: { children: ReactNode }) {
  return estSansHabillage(usePathname()) ? null : children;
}
