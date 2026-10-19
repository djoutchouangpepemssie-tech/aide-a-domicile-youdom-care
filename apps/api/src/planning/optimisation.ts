import type { WorkerPreference } from "../domaine/preferences";
import {
  DEFAULT_WEIGHTS,
  evaluateRules,
  mondayOf,
  type AbsenceWindow,
  type Assignment,
  type Finding,
  type OptimisationWeights,
  type Rule,
  type RuleKey,
} from "../domaine/regles";
import { parisParts, parisToInstant } from "../temps/paris";
import type { Occurrence } from "./serie";

/*
 * L'optimisation des plannings — **demandée le 19/10**, après que j'aie refusé de la construire
 * sans demande. Elle est donc là, et avec la précaution qui la rend utilisable : elle **propose**,
 * elle n'impose pas. Aucune suggestion n'est appliquée sans que le coordinateur le demande, et
 * chaque application est journalisée.
 *
 * Ce qu'elle sait faire :
 *
 * 1. **pourvoir un créneau vide** : classer les intervenants possibles, avec les raisons en clair ;
 * 2. **réparer un signalement** : proposer une réaffectation qui fait disparaître un avertissement
 *    ou un blocage, en expliquant ce qu'elle gagne.
 *
 * Trois propriétés dont je ne veux pas me passer :
 *
 * - **rien d'opaque.** Chaque proposition porte ses raisons, dans la langue de l'agence. Un
 *   logiciel qui dit « j'ai optimisé » sans dire pourquoi se fait désactiver au bout d'un mois.
 * - **les contraintes viennent de vous.** Un candidat n'est écarté que par une règle que vous avez
 *   marquée bloquante, par un refus du foyer, ou par une absence déclarée. Les poids, eux, ne font
 *   que classer.
 * - **déterministe.** Mêmes données, même ordre : à score égal, c'est l'identifiant qui tranche.
 *   Sans cela, deux coordinateurs voient deux listes différentes et personne ne fait confiance.
 */

export type WorkerFacts = {
  workerId: string;
  /** Ce que l'intervenant a déjà, dans la fenêtre étudiée. */
  assignments: Assignment[];
  absences: AbsenceWindow[];
  /** Nombre de visites déjà effectuées dans ce foyer : la continuité se mérite. */
  visitesDansLeFoyer: number;
};

export type SuggestionContext = {
  rules: Record<RuleKey, Rule>;
  weights?: OptimisationWeights | null;
  preferences: readonly WorkerPreference[];
  workers: readonly WorkerFacts[];
};

export type Suggestion = {
  workerId: string;
  score: number;
  raisons: string[];
  avertissements: Finding[];
};

export type Exclusion = {
  workerId: string;
  /** Jamais le motif d'un refus : il ne sort pas du foyer et de l'agence. */
  raison: string;
};

export type Suggestions = { proposes: Suggestion[]; exclus: Exclusion[] };

const JOUR_MS = 24 * 60 * 60 * 1000;

/*
 * Échelle de l'équilibre de charge : une semaine « pleine » de référence, en minutes.
 *
 * Première version : je normalisais la charge par **la plus forte des candidates**. Un test l'a
 * pris en défaut — une intervenante avec 45 minutes posées passait pour « chargée » face à une
 * collègue à zéro, et ce faux écart effaçait le bonus d'enchaînement, qui vaut bien plus pour une
 * tournée réelle. On compare donc à une échelle fixe : trois quarts d'heure ne pèsent presque
 * rien, trente-cinq heures pèsent tout. Cette constante ne décide de rien d'autre que d'un ordre
 * d'affichage.
 */
const REFERENCE_SEMAINE_MINUTES = 35 * 60;

function toAssignment(occurrence: Occurrence, workerId: string): Assignment {
  return {
    visitId: `${occurrence.serieId}#${occurrence.date}#${occurrence.slotIndex}`,
    householdId: occurrence.householdId,
    workerId,
    startDate: occurrence.date,
    start: occurrence.start,
    endDate: occurrence.endDate,
    end: occurrence.end,
    kind: occurrence.kind,
  };
}

/** Minutes déjà posées dans la semaine de l'occurrence. */
function chargeSemaine(assignments: readonly Assignment[], date: string): number {
  const lundi = mondayOf(date);
  return assignments
    .filter((assignment) => mondayOf(assignment.startDate) === lundi)
    .reduce((somme, assignment) => {
      const debut = parisToInstant(assignment.startDate, assignment.start).getTime();
      const fin = parisToInstant(assignment.endDate, assignment.end).getTime();
      return somme + Math.round((fin - debut) / 60_000);
    }, 0);
}

/** Minutes de trajet vers la visite adjacente la plus proche, le même jour. `null` si aucune. */
function ecartAdjacent(
  assignments: readonly Assignment[],
  occurrence: Occurrence,
): { minutes: number; memeFoyer: boolean } | null {
  const debut = parisToInstant(occurrence.date, occurrence.start).getTime();
  const fin = parisToInstant(occurrence.endDate, occurrence.end).getTime();
  let meilleur: { minutes: number; memeFoyer: boolean } | null = null;
  for (const assignment of assignments) {
    const aDebut = parisToInstant(assignment.startDate, assignment.start).getTime();
    const aFin = parisToInstant(assignment.endDate, assignment.end).getTime();
    if (Math.abs(aDebut - debut) > JOUR_MS) continue;
    const ecart = aDebut >= fin ? aDebut - fin : debut >= aFin ? debut - aFin : 0;
    const minutes = Math.round(ecart / 60_000);
    if (!meilleur || minutes < meilleur.minutes) {
      meilleur = { minutes, memeFoyer: assignment.householdId === occurrence.householdId };
    }
  }
  return meilleur;
}

const heures = (minutes: number) => Math.round((minutes / 60) * 10) / 10;

const signature = (finding: Finding) => `${finding.regle}|${finding.message}`;

/** Les signalements présents dans `apres` et pas dans `avant`, en comptant les doublons. */
function difference(apres: readonly Finding[], avant: readonly Finding[]): Finding[] {
  const restants = new Map<string, number>();
  for (const finding of avant) {
    restants.set(signature(finding), (restants.get(signature(finding)) ?? 0) + 1);
  }
  const out: Finding[] = [];
  for (const finding of apres) {
    const clef = signature(finding);
    const compte = restants.get(clef) ?? 0;
    if (compte > 0) restants.set(clef, compte - 1);
    else out.push(finding);
  }
  return out;
}

/** Classe les intervenants pour un créneau, et dit qui est écarté et pourquoi. */
export function suggestWorkers(occurrence: Occurrence, context: SuggestionContext): Suggestions {
  const poids = context.weights ?? DEFAULT_WEIGHTS;
  const refus = new Set(
    context.preferences
      .filter(
        (preference) =>
          preference.householdId === occurrence.householdId && preference.kind === "refus",
      )
      .map((preference) => preference.workerId),
  );
  const souhaits = new Set(
    context.preferences
      .filter(
        (preference) =>
          preference.householdId === occurrence.householdId && preference.kind === "souhait",
      )
      .map((preference) => preference.workerId),
  );

  const exclus: Exclusion[] = [];
  const retenus: Suggestion[] = [];

  for (const worker of [...context.workers].sort((a, b) => a.workerId.localeCompare(b.workerId))) {
    if (refus.has(worker.workerId)) {
      exclus.push({
        workerId: worker.workerId,
        raison: "le foyer ne souhaite pas cet intervenant",
      });
      continue;
    }

    const debut = parisToInstant(occurrence.date, occurrence.start);
    const fin = parisToInstant(occurrence.endDate, occurrence.end);
    const absent = worker.absences.find(
      (absence) => debut.getTime() < absence.to.getTime() && fin.getTime() > absence.from.getTime(),
    );
    if (absent) {
      // Proposer quelqu'un en congé n'aide personne, même si l'agence n'a pas activé la règle.
      exclus.push({ workerId: worker.workerId, raison: `absence déclarée (${absent.motif})` });
      continue;
    }

    const avec = [...worker.assignments, toAssignment(occurrence, worker.workerId)];
    const findings = evaluateRules(avec, context.rules, { absences: worker.absences });
    const avant = evaluateRules(worker.assignments, context.rules, { absences: worker.absences });
    // Ce que l'affectation **ajoute**, et non ce qui existait déjà : on ne reproche pas à un
    // candidat le planning qu'il avait avant. La comparaison se fait par signature, pas par
    // position : l'ordre des signalements dépend de l'ordre des visites, pas de l'ancienneté.
    const nouveaux = difference(findings, avant);
    const bloquants = nouveaux.filter((finding) => finding.severite === "bloquant");
    if (bloquants.length > 0) {
      exclus.push({
        workerId: worker.workerId,
        raison: `règle bloquante : ${[...new Set(bloquants.map((f) => f.regle))].join(", ")}`,
      });
      continue;
    }
    const avertissements = nouveaux.filter((finding) => finding.severite === "avertissement");

    const raisons: string[] = [];
    let score = 0;

    if (worker.visitesDansLeFoyer > 0) {
      const facteur = Math.min(1, worker.visitesDansLeFoyer / 4);
      score += poids.continuite * facteur;
      raisons.push(
        worker.visitesDansLeFoyer === 1
          ? "déjà venu une fois dans ce foyer"
          : `déjà ${worker.visitesDansLeFoyer} visites dans ce foyer`,
      );
    }

    if (souhaits.has(worker.workerId)) {
      score += poids.souhait;
      raisons.push("souhait du foyer");
    }

    const charge = chargeSemaine(worker.assignments, occurrence.date);
    score += poids.equilibre * (1 - Math.min(1, charge / REFERENCE_SEMAINE_MINUTES));
    raisons.push(`${heures(charge)} h déjà posées cette semaine`);

    const adjacent = ecartAdjacent(worker.assignments, occurrence);
    if (adjacent) {
      if (adjacent.memeFoyer && adjacent.minutes === 0) {
        score += poids.trajet;
        raisons.push("enchaîne dans le même foyer");
      } else if (adjacent.minutes <= 120) {
        score += poids.trajet * (1 - adjacent.minutes / 120) * (adjacent.memeFoyer ? 1 : 0.8);
        raisons.push(`${adjacent.minutes} min d'écart avec une autre visite du jour`);
      }
    }

    if (avertissements.length > 0) {
      score -= poids.penaliteAvertissement * avertissements.length;
      raisons.push(
        `introduit ${avertissements.length} avertissement(s) : ${[
          ...new Set(avertissements.map((f) => f.regle)),
        ].join(", ")}`,
      );
    }

    retenus.push({
      workerId: worker.workerId,
      score: Math.round(score * 10) / 10,
      raisons,
      avertissements,
    });
  }

  retenus.sort(
    (a, b) =>
      b.score - a.score ||
      a.avertissements.length - b.avertissements.length ||
      a.workerId.localeCompare(b.workerId),
  );
  return { proposes: retenus, exclus };
}

export type Proposal = {
  serieId: string;
  householdId: string;
  date: string;
  slotIndex: number;
  heure: string;
  /** `null` quand le créneau était à pourvoir. */
  actuel: string | null;
  propose: string;
  nature: "creneau_a_pourvoir" | "reparation";
  raisons: string[];
  /** Signalements que la proposition fait disparaître. */
  retire: Finding[];
};

export type OptimisationResult = {
  propositions: Proposal[];
  /** Créneaux restés sans candidat possible, avec la raison de chaque exclusion. */
  sansSolution: Array<{ date: string; heure: string; householdId: string; exclus: Exclusion[] }>;
};

/**
 * Parcourt une fenêtre et propose : d'abord pourvoir les créneaux vides, ensuite réparer les
 * signalements existants.
 *
 * Le remplissage est **glouton et séquentiel** : chaque affectation retenue entre dans le contexte
 * de la suivante. Ce n'est pas l'optimum global d'un problème d'ordonnancement, et je le dis plutôt
 * que de le laisser croire — mais c'est reproductible, explicable, et ça tient compte des règles de
 * l'agence à chaque pas. Un optimum que personne ne peut relire ne se déploie pas dans un service
 * d'aide à domicile.
 */
export function optimise(
  occurrences: readonly Occurrence[],
  context: SuggestionContext,
  options: { maxPropositions?: number } = {},
): OptimisationResult {
  const limite = options.maxPropositions ?? 50;
  const facts = new Map(
    context.workers.map((worker) => [
      worker.workerId,
      { ...worker, assignments: [...worker.assignments] },
    ]),
  );
  const propositions: Proposal[] = [];
  const sansSolution: OptimisationResult["sansSolution"] = [];

  const tries = [...occurrences].sort((a, b) =>
    `${a.date}${a.start}${a.serieId}${a.slotIndex}`.localeCompare(
      `${b.date}${b.start}${b.serieId}${b.slotIndex}`,
    ),
  );

  // 1. Les créneaux à pourvoir.
  for (const occurrence of tries) {
    if (occurrence.workerId) continue;
    if (propositions.length >= limite) break;
    const { proposes, exclus } = suggestWorkers(occurrence, {
      ...context,
      workers: [...facts.values()],
    });
    const meilleur = proposes[0];
    if (!meilleur) {
      sansSolution.push({
        date: occurrence.date,
        heure: occurrence.start,
        householdId: occurrence.householdId,
        exclus,
      });
      continue;
    }
    propositions.push({
      serieId: occurrence.serieId,
      householdId: occurrence.householdId,
      date: occurrence.date,
      slotIndex: occurrence.slotIndex,
      heure: `${occurrence.start}–${occurrence.end}`,
      actuel: null,
      propose: meilleur.workerId,
      nature: "creneau_a_pourvoir",
      raisons: meilleur.raisons,
      retire: [],
    });
    const fait = facts.get(meilleur.workerId);
    if (fait) fait.assignments.push(toAssignment(occurrence, meilleur.workerId));
  }

  // 2. Les signalements à réparer : une réaffectation qui les fait disparaître.
  for (const occurrence of tries) {
    if (!occurrence.workerId) continue;
    if (propositions.length >= limite) break;
    const titulaire = facts.get(occurrence.workerId);
    if (!titulaire) continue;

    const visitId = `${occurrence.serieId}#${occurrence.date}#${occurrence.slotIndex}`;
    const findings = evaluateRules(titulaire.assignments, context.rules, {
      absences: titulaire.absences,
    }).filter((finding) => finding.visites.includes(visitId));
    if (findings.length === 0) continue;

    const sansElle = titulaire.assignments.filter((assignment) => assignment.visitId !== visitId);
    const candidats = suggestWorkers(occurrence, {
      ...context,
      workers: [...facts.values()]
        .filter((worker) => worker.workerId !== occurrence.workerId)
        .map((worker) => ({ ...worker })),
    });
    const meilleur = candidats.proposes.find(
      (suggestion) => suggestion.avertissements.length === 0,
    );
    if (!meilleur) continue;

    propositions.push({
      serieId: occurrence.serieId,
      householdId: occurrence.householdId,
      date: occurrence.date,
      slotIndex: occurrence.slotIndex,
      heure: `${occurrence.start}–${occurrence.end}`,
      actuel: occurrence.workerId,
      propose: meilleur.workerId,
      nature: "reparation",
      raisons: meilleur.raisons,
      retire: findings,
    });

    titulaire.assignments = sansElle;
    const repreneur = facts.get(meilleur.workerId);
    if (repreneur) repreneur.assignments.push(toAssignment(occurrence, meilleur.workerId));
  }

  return { propositions, sansSolution };
}

/** Le jour parisien d'une occurrence, pour les regroupements d'affichage. */
export function jourDe(occurrence: Occurrence): string {
  return parisParts(parisToInstant(occurrence.date, occurrence.start)).date;
}
