import { normalizePage, type MesureBody, type MesureEvent, type MesureProps } from "./events";

/*
 * Client de la mesure d'audience (D-029, docs/05 §9). Volontairement minuscule : il entre dans le
 * JavaScript initial de toutes les pages.
 * - inactif tant que NEXT_PUBLIC_MESURE_ACTIVE (lue au build) ne vaut pas exactement "true" ;
 * - n'envoie rien si le navigateur annonce Do Not Track ou Global Privacy Control ;
 * - file d'attente légère vidée au prochain tour de boucle et au masquage de la page ;
 * - `navigator.sendBeacon` vers la route de première partie /api/mesure/, repli `fetch keepalive` ;
 * - jamais d'adresse avec paramètres (chemin normalisé), jamais de texte saisi : les propriétés
 *   sont typées sur des listes fermées et le serveur les revalide.
 */

export const MESURE_ENDPOINT = "/api/mesure/";

const queue: MesureBody[] = [];
let scheduled = false;
let listening = false;

interface PrivacyNavigator {
  doNotTrack?: string | null;
  globalPrivacyControl?: boolean;
  sendBeacon?: (url: string, data: BodyInit) => boolean;
}

/** Vrai si la mesure est active au build et si le visiteur n'a pas demandé à ne pas être suivi. */
export function mesureEnabled(nav: PrivacyNavigator | undefined = globalThis.navigator): boolean {
  if (process.env.NEXT_PUBLIC_MESURE_ACTIVE !== "true") return false;
  if (!nav) return false;
  if (nav.doNotTrack === "1" || nav.globalPrivacyControl === true) return false;
  return true;
}

function send(body: MesureBody) {
  const json = JSON.stringify(body);
  const nav: PrivacyNavigator = navigator;
  try {
    if (nav.sendBeacon?.(MESURE_ENDPOINT, new Blob([json], { type: "application/json" }))) return;
  } catch {
    /* sendBeacon refusé (taille, politique) : repli ci-dessous */
  }
  void fetch(MESURE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: json,
    keepalive: true,
  }).catch(() => undefined);
}

export function flush() {
  scheduled = false;
  while (queue.length > 0) {
    const body = queue.shift();
    if (body) send(body);
  }
}

function schedule() {
  if (!listening && typeof document !== "undefined") {
    listening = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  }
  if (scheduled) return;
  scheduled = true;
  setTimeout(flush, 0);
}

/** Enregistre un événement ; ne fait rien si la mesure est inactive ou refusée. */
export function track<E extends MesureEvent>(event: E, props: MesureProps[E]) {
  if (typeof window === "undefined" || !mesureEnabled()) return;
  queue.push({ event, props, page: normalizePage(window.location.pathname) });
  schedule();
}
