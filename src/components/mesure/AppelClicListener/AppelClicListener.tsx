"use client";

import { useEffect } from "react";
import { track } from "@/lib/mesure/client";
import { callPlacements, type CallPlacement } from "@/lib/mesure/events";

/*
 * Île de mesure des appels (D-029, docs/05 §9) : un seul écouteur délégué sur le document, pour
 * que les liens `tel:` des composants serveur (en-tête, pied de page, rail, pages locales…)
 * restent des liens ordinaires. Le lien, ou l'un de ses ancêtres, porte `data-mesure` avec un
 * emplacement de la liste fermée ; sans attribut connu, rien n'est envoyé. Aucun rendu.
 */

export function placementOf(target: EventTarget | null): CallPlacement | null {
  if (!(target instanceof Element)) return null;
  const link = target.closest("a[href^='tel:']");
  if (!link) return null;
  const value = link.closest("[data-mesure]")?.getAttribute("data-mesure") ?? "";
  return (callPlacements as readonly string[]).includes(value) ? (value as CallPlacement) : null;
}

export function AppelClicListener() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const emplacement = placementOf(event.target);
      if (emplacement) track("appel_clic", { emplacement });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
