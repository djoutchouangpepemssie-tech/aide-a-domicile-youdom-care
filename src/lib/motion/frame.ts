/*
 * Une seule image pour tout le monde. Les effets qui répondent au pointeur, au défilement ou à
 * une redimension passent par `scheduleFrame` : quel que soit le nombre d'éléments concernés, le
 * navigateur ne reçoit qu'un `requestAnimationFrame` par image, et toutes les écritures se font
 * à la suite, jamais entrelacées avec une lecture de mise en page.
 *
 * Un travail déjà en attente n'est pas dupliqué (ensemble de fonctions) : dix mouvements de souris
 * entre deux images ne produisent qu'une écriture, celle des dernières coordonnées lues.
 */

const jobs = new Set<() => void>();
let frame = 0;

function run(): void {
  frame = 0;
  const pending = Array.from(jobs);
  jobs.clear();
  for (const job of pending) job();
}

/** Programme ce travail pour la prochaine image. Deux appels de suite ne coûtent qu'une image. */
export function scheduleFrame(job: () => void): void {
  jobs.add(job);
  if (frame === 0) frame = requestAnimationFrame(run);
}

/** Retire ce travail de la file ; libère l'image s'il ne reste plus rien (démontage, sortie). */
export function cancelScheduledFrame(job: () => void): void {
  if (!jobs.delete(job)) return;
  if (jobs.size === 0 && frame !== 0) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
}

/** Nombre de travaux en attente. Réservé aux tests. */
export function pendingFrameJobs(): number {
  return jobs.size;
}

/** Oublie la file et l'image en attente. Réservé aux tests. */
export function resetFrames(): void {
  jobs.clear();
  frame = 0;
}
