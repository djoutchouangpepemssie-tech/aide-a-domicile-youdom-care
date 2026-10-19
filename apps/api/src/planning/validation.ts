import { evaluateRules, type Assignment, type Finding } from "../domaine/regles";
import type { Repositories } from "../store/repositories";
import { nextDay } from "../temps/paris";
import { visibleOccurrences, type Serie } from "./serie";

/*
 * Juger un planning, c'est juger **l'ensemble** du temps de travail d'un intervenant, pas la
 * visite qu'on vient d'écrire : le repos, l'amplitude et les heures de la semaine ne se mesurent
 * qu'ainsi. On rassemble donc toutes les séries actives de l'agence sur une fenêtre, on regroupe
 * par intervenant, et on applique les règles de l'agence.
 *
 * La fenêtre est bornée à quatre semaines à partir de la date du changement. C'est un choix
 * assumé : juger deux ans de planning à chaque écriture coûterait des secondes pour ne rien
 * apprendre de plus — les règles portent sur la journée, la semaine, et les jours consécutifs.
 */

export const FENETRE_JOURS = 28;

export type PlanningJudgement = {
  findings: Finding[];
  bloquants: Finding[];
  /** Intervenants effectivement jugés : utile à l'écran, et honnête sur ce qui a été vérifié. */
  intervenants: string[];
  fenetre: { from: string; to: string };
};

export async function judgePlanning(
  repositories: Repositories,
  input: {
    agencyId: string;
    from: string;
    /** Séries à prendre en compte en plus (celle qu'on est en train d'écrire, pas encore en base). */
    extra?: readonly Serie[];
    /** Ne juger que ces intervenants ; sinon, tous ceux qui apparaissent. */
    workerIds?: readonly string[];
    days?: number;
  },
): Promise<PlanningJudgement> {
  const rules = await repositories.rules.current(input.agencyId);
  const to = nextDay(input.from, (input.days ?? FENETRE_JOURS) - 1);
  const fenetre = { from: input.from, to };

  // Sans règles saisies, il n'y a rien à juger : on le dit, au lieu de prétendre avoir vérifié.
  if (!rules) return { findings: [], bloquants: [], intervenants: [], fenetre };

  const enBase = await repositories.series.listByAgency(input.agencyId, "active");
  const remplacees = new Set((input.extra ?? []).map((serie) => serie._id));
  const series = [...enBase.filter((serie) => !remplacees.has(serie._id)), ...(input.extra ?? [])];

  const parIntervenant = new Map<string, Assignment[]>();
  for (const serie of series) {
    for (const occurrence of visibleOccurrences(serie, fenetre.from, fenetre.to)) {
      if (!occurrence.workerId) continue;
      if (input.workerIds && !input.workerIds.includes(occurrence.workerId)) continue;
      const assignment: Assignment = {
        visitId: `${occurrence.serieId}#${occurrence.date}#${occurrence.slotIndex}`,
        householdId: occurrence.householdId,
        workerId: occurrence.workerId,
        startDate: occurrence.date,
        start: occurrence.start,
        endDate: occurrence.endDate,
        end: occurrence.end,
        kind: occurrence.kind,
      };
      parIntervenant.set(occurrence.workerId, [
        ...(parIntervenant.get(occurrence.workerId) ?? []),
        assignment,
      ]);
    }
  }

  const findings: Finding[] = [];
  for (const [workerId, assignments] of parIntervenant) {
    const absences = await repositories.absences.listByWorker(
      workerId,
      new Date(`${fenetre.from}T00:00:00Z`),
      new Date(`${nextDay(fenetre.to)}T00:00:00Z`),
    );
    findings.push(
      ...evaluateRules(assignments, rules.rules, {
        absences: absences.map((absence) => ({
          from: absence.from,
          to: absence.to,
          motif: absence.motif ?? absence.kind,
        })),
      }),
    );
  }

  return {
    findings,
    bloquants: findings.filter((finding) => finding.severite === "bloquant"),
    intervenants: [...parIntervenant.keys()],
    fenetre,
  };
}
