import type { Visit } from "../domaine/schemas";
import type { Occurrence } from "./serie";

/*
 * La matérialisation : transformer les occurrences d'un planning en **visites**, c'est-à-dire en
 * faits pointables.
 *
 * Pourquoi ne pas se contenter du planning calculé. Une occurrence est une prévision ; une visite
 * est un fait qui se pointe, se raconte, se facture et se conteste. Elle a besoin de sa propre
 * identité, stable : le pointage NFC de mardi ne peut pas reposer sur un calcul qui changera si le
 * planning est modifié mercredi.
 *
 * La règle qui en découle, et c'est la plus importante de ce fichier :
 *
 *   **une visite qui n'a pas commencé suit son planning ; une visite commencée ne le suit plus.**
 *
 * Tant qu'elle est `prevue`, une modification du planning la met à jour. Dès qu'elle a bougé — en
 * route, en cours, faite, annulée — le planning ne la réécrit plus : la divergence est **signalée**
 * au coordinateur, qui tranche. Réécrire une visite déjà pointée, ce serait réécrire des heures
 * travaillées.
 *
 * La matérialisation est **idempotente** : l'identité d'une visite de planning est le triplet
 * (série, jour de l'occurrence, rang du créneau), unique en base. On peut donc la relancer chaque
 * nuit sans créer un seul doublon.
 */

export type MaterialisationPlan = {
  /** Occurrences qui n'ont pas encore de visite. */
  aCreer: Occurrence[];
  /** Visites encore `prevue` dont l'occurrence a changé : horaire, intervenant ou nature. */
  aMettreAJour: Array<{ visit: Visit; occurrence: Occurrence; changements: string[] }>;
  /** Visites `prevue` dont l'occurrence a disparu (annulée ou saut de série). */
  aAnnuler: Visit[];
  /**
   * Visites déjà commencées que le planning ne réécrit pas. Le coordinateur décide : laisser la
   * visite telle qu'elle a eu lieu, ou créer un ajustement.
   */
  divergences: Array<{ visit: Visit; occurrence: Occurrence | null; changements: string[] }>;
};

const clef = (serieId: string, date: string, slotIndex: number) =>
  `${serieId}#${date}#${slotIndex}`;

/**
 * L'état du planning pour une occurrence, en une chaîne. Sert à retenir **ce que le coordinateur a
 * vu** quand il a tranché une divergence : si le planning rebouge, la question se repose.
 */
export function occurrenceSignature(occurrence: Occurrence): string {
  return [
    occurrence.start,
    occurrence.end,
    occurrence.endDate,
    occurrence.workerId ?? "",
    occurrence.kind,
  ].join("|");
}

function clefDeVisite(visit: Visit): string | null {
  if (!visit.serieId || !visit.occurrenceDate || visit.slotIndex == null) return null;
  return clef(visit.serieId, visit.occurrenceDate, visit.slotIndex);
}

/** Une visite a-t-elle quitté l'état de prévision ? */
export function commencee(visit: Visit): boolean {
  return visit.status !== "prevue";
}

function differences(
  visit: Visit,
  occurrence: Occurrence,
  horaires: { debut: Date; fin: Date },
): string[] {
  const changements: string[] = [];
  if (visit.plannedStart.getTime() !== horaires.debut.getTime()) changements.push("heure de début");
  if (visit.plannedEnd.getTime() !== horaires.fin.getTime()) changements.push("heure de fin");
  if ((visit.workerId || null) !== (occurrence.workerId || null)) changements.push("intervenant");
  if (visit.kind !== occurrence.kind) changements.push("nature");
  return changements;
}

/**
 * Compare les occurrences d'une fenêtre aux visites déjà matérialisées, et dit quoi faire. Aucune
 * écriture ici : la décision est séparée de l'action, pour qu'elle soit testable et relisible.
 */
export function planMaterialisation(
  occurrences: readonly Occurrence[],
  visites: readonly Visit[],
  instants: (occurrence: Occurrence) => { debut: Date; fin: Date },
): MaterialisationPlan {
  const parClef = new Map<string, Occurrence>();
  for (const occurrence of occurrences) {
    parClef.set(clef(occurrence.serieId, occurrence.date, occurrence.slotIndex), occurrence);
  }

  const plan: MaterialisationPlan = { aCreer: [], aMettreAJour: [], aAnnuler: [], divergences: [] };
  const vues = new Set<string>();

  for (const visit of visites) {
    const identite = clefDeVisite(visit);
    if (!identite) continue;
    vues.add(identite);
    const occurrence = parClef.get(identite);

    if (!occurrence) {
      /*
       * L'occurrence a disparu : annulée à l'unité, journée sautée, ou série raccourcie.
       * - visite déjà annulée : les deux côtés disent la même chose, rien à faire ;
       * - visite encore prévue : on l'annule ;
       * - visite commencée ou faite : on ne touche pas à ce qui a eu lieu, on le signale.
       */
      if (visit.status === "annulee") continue;
      if (commencee(visit)) {
        plan.divergences.push({ visit, occurrence: null, changements: ["occurrence supprimée"] });
      } else {
        plan.aAnnuler.push(visit);
      }
      continue;
    }

    const changements = differences(visit, occurrence, instants(occurrence));
    if (changements.length === 0) continue;
    if (commencee(visit)) {
      // Divergence déjà tranchée pour ce même état du planning : on ne la repose pas chaque nuit.
      if (visit.adjustment?.occurrenceSignature === occurrenceSignature(occurrence)) continue;
      plan.divergences.push({ visit, occurrence, changements });
    } else {
      plan.aMettreAJour.push({ visit, occurrence, changements });
    }
  }

  for (const [identite, occurrence] of parClef) {
    if (!vues.has(identite)) plan.aCreer.push(occurrence);
  }

  plan.aCreer.sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  return plan;
}
