/*
 * Ce que l'écran laisse voir : deux outils partagés par toutes les révélations.
 *
 * 1. `observeOnce` : une seule fabrique d'`IntersectionObserver`, un observateur par seuil et non
 *    un par élément. Dix blocs qui attendent le même seuil partagent le même observateur ; chaque
 *    élément est retiré dès sa première entrée dans l'écran (la révélation ne joue qu'une fois), et
 *    l'observateur est détruit quand il n'a plus rien à surveiller. Rien ne reste actif hors écran.
 *
 * 2. `isOnScreen` : la mesure du pli, groupée. Chaque île doit savoir, avant de cacher quoi que ce
 *    soit, si son élément est déjà visible (sinon il clignoterait). Mesurer élément par élément
 *    entre deux écritures d'attribut forcerait autant de recalculs de mise en page : la première
 *    question mesure donc, en une seule passe, tous les éléments du même groupe (un sélecteur), et
 *    les suivantes lisent le cache. Le cache est oublié à la fin de la tâche en cours.
 */

type Enter = () => void;

interface Registry {
  observer: IntersectionObserver;
  targets: Map<Element, Enter>;
}

const registries = new Map<number, Registry>();

function release(threshold: number, element: Element): void {
  const registry = registries.get(threshold);
  if (!registry) return;
  registry.targets.delete(element);
  registry.observer.unobserve(element);
  if (registry.targets.size === 0) {
    registry.observer.disconnect();
    registries.delete(threshold);
  }
}

function registryFor(threshold: number): Registry | null {
  if (typeof IntersectionObserver === "undefined") return null;
  const known = registries.get(threshold);
  if (known) return known;
  const targets = new Map<Element, Enter>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const enter = targets.get(entry.target);
        if (!enter) continue;
        release(threshold, entry.target);
        enter();
      }
    },
    { threshold },
  );
  const created: Registry = { observer, targets };
  registries.set(threshold, created);
  return created;
}

/**
 * Prévient une seule fois, à la première entrée dans l'écran, puis se désabonne tout seul.
 * Retourne la fonction de désabonnement (démontage avant l'entrée). Sans `IntersectionObserver`,
 * ne fait rien : l'appelant laisse alors son contenu visible.
 */
export function observeOnce(element: Element, threshold: number, onEnter: Enter): () => void {
  const registry = registryFor(threshold);
  if (!registry) return () => {};
  registry.targets.set(element, onEnter);
  registry.observer.observe(element);
  return () => release(threshold, element);
}

/** Nombre d'observateurs partagés vivants. Réservé aux tests. */
export function sharedObserverCount(): number {
  return registries.size;
}

/** Détruit les observateurs partagés. Réservé aux tests. */
export function resetSharedObservers(): void {
  for (const registry of registries.values()) registry.observer.disconnect();
  registries.clear();
  folds.clear();
}

const folds = new Map<string, WeakMap<Element, boolean>>();
let queued = false;

function overlapsViewport(element: Element, height: number): boolean {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < height;
}

/**
 * Vrai si l'élément est déjà (au moins en partie) dans l'écran : l'île ne le cache pas.
 * `group` est le sélecteur de sa famille (`.m-reveal`, `.thread`…) : tous ses membres présents
 * dans le document sont mesurés en une seule passe, sans écriture entre deux lectures.
 */
export function isOnScreen(element: Element, group?: string): boolean {
  const height = window.innerHeight;
  if (!group) return overlapsViewport(element, height);
  const known = folds.get(group);
  if (known) return known.get(element) ?? overlapsViewport(element, height);
  const cache = new WeakMap<Element, boolean>();
  folds.set(group, cache);
  for (const node of document.querySelectorAll(group)) {
    cache.set(node, overlapsViewport(node, height));
  }
  if (!queued) {
    queued = true;
    queueMicrotask(() => {
      queued = false;
      folds.clear();
    });
  }
  return cache.get(element) ?? overlapsViewport(element, height);
}
