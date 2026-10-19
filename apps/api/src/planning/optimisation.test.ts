/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import type { WorkerPreference } from "../domaine/preferences";
import { emptyRules, type Rule, type RuleKey } from "../domaine/regles";
import { optimise, suggestWorkers, type WorkerFacts } from "./optimisation";
import type { Occurrence } from "./serie";

/*
 * L'optimisation est un outil de proposition : ces tests vérifient qu'elle **explique**, qu'elle
 * n'écarte personne sans raison tirée des règles de l'agence, et qu'elle est reproductible.
 */

const FOYER = "a".repeat(24);
const AUTRE_FOYER = "b".repeat(24);
const FATIMA = "11" + "1".repeat(22);
const AWA = "22" + "2".repeat(22);
const NADIA = "33" + "3".repeat(22);
const ARCEL = "e".repeat(24);

function occurrence(input: Partial<Occurrence> = {}): Occurrence {
  return {
    serieId: "f".repeat(24),
    householdId: FOYER,
    date: "2026-10-19",
    slotIndex: 0,
    start: "09:00",
    end: "11:00",
    endDate: "2026-10-19",
    kind: "jour",
    workerId: null,
    origine: "serie",
    motif: null,
    ...input,
  };
}

function worker(workerId: string, over: Partial<WorkerFacts> = {}): WorkerFacts {
  return { workerId, assignments: [], absences: [], visitesDansLeFoyer: 0, ...over };
}

function regles(actives: Partial<Record<RuleKey, Partial<Rule>>> = {}): Record<RuleKey, Rule> {
  const base = emptyRules();
  for (const [key, rule] of Object.entries(actives)) {
    base[key as RuleKey] = {
      active: true,
      severite: rule?.severite ?? "bloquant",
      valeur: rule?.valeur ?? null,
    };
  }
  return base;
}

function preference(
  workerId: string,
  kind: "souhait" | "refus",
  householdId = FOYER,
): WorkerPreference {
  return {
    _id: `${workerId}pref`.slice(0, 24).padEnd(24, "0"),
    householdId,
    workerId,
    kind,
    motif: kind === "refus" ? "raison interne au foyer" : null,
    createdBy: ARCEL,
    createdAt: new Date("2026-10-01T00:00:00Z"),
  };
}

describe("suggérer un intervenant", () => {
  it("classe tout le monde quand rien ne les distingue, et de façon reproductible", () => {
    const resultat = suggestWorkers(occurrence(), {
      rules: regles(),
      preferences: [],
      workers: [worker(NADIA), worker(FATIMA), worker(AWA)],
    });
    expect(resultat.proposes.map((s) => s.workerId)).toEqual([FATIMA, AWA, NADIA]);
    expect(resultat.exclus).toEqual([]);
    // Chaque proposition dit pourquoi elle est là.
    expect(resultat.proposes[0].raisons.length).toBeGreaterThan(0);
  });

  it("préfère celui qui connaît déjà le foyer", () => {
    const resultat = suggestWorkers(occurrence(), {
      rules: regles(),
      preferences: [],
      workers: [worker(FATIMA), worker(AWA, { visitesDansLeFoyer: 6 })],
    });
    expect(resultat.proposes[0].workerId).toBe(AWA);
    expect(resultat.proposes[0].raisons).toContain("déjà 6 visites dans ce foyer");
  });

  it("écarte un intervenant refusé, sans dire pourquoi le foyer l'a refusé", () => {
    const resultat = suggestWorkers(occurrence(), {
      rules: regles(),
      preferences: [preference(AWA, "refus")],
      workers: [worker(FATIMA), worker(AWA, { visitesDansLeFoyer: 10 })],
    });
    expect(resultat.proposes.map((s) => s.workerId)).toEqual([FATIMA]);
    expect(resultat.exclus).toEqual([
      { workerId: AWA, raison: "le foyer ne souhaite pas cet intervenant" },
    ]);
    // Le motif du refus ne sort pas du foyer et de l'agence.
    expect(JSON.stringify(resultat)).not.toContain("raison interne au foyer");
  });

  it("suit un souhait du foyer", () => {
    const resultat = suggestWorkers(occurrence(), {
      rules: regles(),
      preferences: [preference(AWA, "souhait")],
      workers: [worker(FATIMA), worker(AWA)],
    });
    expect(resultat.proposes[0].workerId).toBe(AWA);
    expect(resultat.proposes[0].raisons).toContain("souhait du foyer");
  });

  it("écarte un intervenant en congé, même si la règle n'est pas activée", () => {
    const resultat = suggestWorkers(occurrence(), {
      rules: regles(),
      preferences: [],
      workers: [
        worker(FATIMA, {
          absences: [
            {
              from: new Date("2026-10-18T00:00:00Z"),
              to: new Date("2026-10-21T00:00:00Z"),
              motif: "congé",
            },
          ],
        }),
        worker(AWA),
      ],
    });
    expect(resultat.proposes.map((s) => s.workerId)).toEqual([AWA]);
    expect(resultat.exclus[0]).toMatchObject({
      workerId: FATIMA,
      raison: "absence déclarée (congé)",
    });
  });

  it("écarte un candidat qu'une règle bloquante refuse, et nomme la règle", () => {
    const deja = {
      visitId: "deja",
      householdId: AUTRE_FOYER,
      workerId: FATIMA,
      startDate: "2026-10-19",
      start: "10:00",
      endDate: "2026-10-19",
      end: "12:00",
    };
    const resultat = suggestWorkers(occurrence(), {
      rules: regles({ chevauchement: {} }),
      preferences: [],
      workers: [worker(FATIMA, { assignments: [deja] }), worker(AWA)],
    });
    expect(resultat.proposes.map((s) => s.workerId)).toEqual([AWA]);
    expect(resultat.exclus[0].raison).toContain("chevauchement");
  });

  it("ne reproche pas à un candidat les signalements qu'il avait déjà", () => {
    // Fatima a déjà deux visites trop courtes : ce n'est pas la nouvelle affectation qui les crée.
    const courtes = ["2026-10-20", "2026-10-21"].map((date) => ({
      visitId: date,
      householdId: FOYER,
      workerId: FATIMA,
      startDate: date,
      start: "09:00",
      end: "09:20",
      endDate: date,
    }));
    const resultat = suggestWorkers(occurrence(), {
      rules: regles({ duree_min_visite: { valeur: 30, severite: "avertissement" } }),
      preferences: [],
      workers: [worker(FATIMA, { assignments: courtes })],
    });
    expect(resultat.proposes[0].avertissements).toEqual([]);
  });

  it("pénalise une affectation qui introduit un avertissement, sans l'interdire", () => {
    const resultat = suggestWorkers(occurrence({ start: "09:00", end: "09:20" }), {
      rules: regles({ duree_min_visite: { valeur: 30, severite: "avertissement" } }),
      preferences: [],
      workers: [worker(FATIMA)],
    });
    expect(resultat.proposes).toHaveLength(1);
    expect(resultat.proposes[0].score).toBeLessThan(0);
    expect(resultat.proposes[0].raisons.join(" ")).toContain("avertissement");
  });

  it("préfère l'intervenant le moins chargé de la semaine", () => {
    const charge = ["2026-10-20", "2026-10-21", "2026-10-22"].map((date) => ({
      visitId: date,
      householdId: FOYER,
      workerId: FATIMA,
      startDate: date,
      start: "08:00",
      end: "18:00",
      endDate: date,
    }));
    const resultat = suggestWorkers(occurrence(), {
      rules: regles(),
      preferences: [],
      workers: [worker(FATIMA, { assignments: charge }), worker(AWA)],
    });
    expect(resultat.proposes[0].workerId).toBe(AWA);
    expect(resultat.proposes[1].raisons.join(" ")).toContain("30 h déjà posées");
  });

  it("préfère un enchaînement avec une visite du jour", () => {
    const voisine = {
      visitId: "voisine",
      householdId: AUTRE_FOYER,
      workerId: AWA,
      startDate: "2026-10-19",
      start: "11:15",
      endDate: "2026-10-19",
      end: "12:00",
    };
    const resultat = suggestWorkers(occurrence(), {
      rules: regles(),
      preferences: [],
      workers: [worker(FATIMA), worker(AWA, { assignments: [voisine] })],
    });
    expect(resultat.proposes[0].workerId).toBe(AWA);
    expect(resultat.proposes[0].raisons.join(" ")).toContain("15 min d'écart");
  });
});

describe("optimiser une fenêtre", () => {
  it("pourvoit les créneaux vides en tenant compte de ses propres choix", () => {
    const vides = [
      occurrence({ date: "2026-10-19", start: "09:00", end: "11:00", slotIndex: 0 }),
      occurrence({
        date: "2026-10-19",
        start: "09:00",
        end: "11:00",
        slotIndex: 1,
        householdId: AUTRE_FOYER,
      }),
    ];
    const resultat = optimise(vides, {
      rules: regles({ chevauchement: {} }),
      preferences: [],
      workers: [worker(FATIMA), worker(AWA)],
    });
    expect(resultat.propositions).toHaveLength(2);
    // Deux créneaux au même moment : l'optimiseur ne peut pas proposer deux fois la même personne.
    expect(new Set(resultat.propositions.map((p) => p.propose)).size).toBe(2);
    expect(resultat.propositions.every((p) => p.nature === "creneau_a_pourvoir")).toBe(true);
  });

  it("dit quand un créneau n'a aucune solution, et pourquoi", () => {
    const resultat = optimise([occurrence()], {
      rules: regles(),
      preferences: [preference(FATIMA, "refus")],
      workers: [
        worker(FATIMA),
        worker(AWA, {
          absences: [
            {
              from: new Date("2026-10-19T00:00:00Z"),
              to: new Date("2026-10-20T00:00:00Z"),
              motif: "maladie",
            },
          ],
        }),
      ],
    });
    expect(resultat.propositions).toEqual([]);
    expect(resultat.sansSolution).toHaveLength(1);
    expect(resultat.sansSolution[0].exclus.map((e) => e.raison).sort()).toEqual([
      "absence déclarée (maladie)",
      "le foyer ne souhaite pas cet intervenant",
    ]);
  });

  it("répare un signalement en proposant une réaffectation, et dit ce qu'elle retire", () => {
    // Fatima enchaîne deux foyers sans trajet : la règle est un avertissement, Awa est libre.
    const premiere = occurrence({ start: "09:00", end: "10:00", slotIndex: 0, workerId: FATIMA });
    const seconde = occurrence({
      start: "10:05",
      end: "11:00",
      slotIndex: 1,
      householdId: AUTRE_FOYER,
      workerId: FATIMA,
    });
    const assignments = [premiere, seconde].map((occ) => ({
      visitId: `${occ.serieId}#${occ.date}#${occ.slotIndex}`,
      householdId: occ.householdId,
      workerId: FATIMA,
      startDate: occ.date,
      start: occ.start,
      endDate: occ.endDate,
      end: occ.end,
    }));

    const resultat = optimise([premiere, seconde], {
      rules: regles({ trajet_entre_visites: { valeur: 30, severite: "avertissement" } }),
      preferences: [],
      workers: [worker(FATIMA, { assignments }), worker(AWA)],
    });

    expect(resultat.propositions).toHaveLength(1);
    const proposition = resultat.propositions[0];
    expect(proposition).toMatchObject({ actuel: FATIMA, propose: AWA, nature: "reparation" });
    expect(proposition.retire.map((f) => f.regle)).toEqual(["trajet_entre_visites"]);
  });

  it("ne propose rien quand tout va bien", () => {
    const occupee = occurrence({ workerId: FATIMA });
    const resultat = optimise([occupee], {
      rules: regles({ chevauchement: {} }),
      preferences: [],
      workers: [
        worker(FATIMA, {
          assignments: [
            {
              visitId: `${occupee.serieId}#${occupee.date}#0`,
              householdId: FOYER,
              workerId: FATIMA,
              startDate: "2026-10-19",
              start: "09:00",
              endDate: "2026-10-19",
              end: "11:00",
            },
          ],
        }),
        worker(AWA),
      ],
    });
    expect(resultat).toEqual({ propositions: [], sansSolution: [] });
  });

  it("borne le nombre de propositions", () => {
    const beaucoup = Array.from({ length: 30 }, (_, index) =>
      occurrence({
        date: "2026-11-02",
        start: `0${index % 2 === 0 ? 8 : 9}:00`,
        end: `0${index % 2 === 0 ? 8 : 9}:30`,
        slotIndex: index,
      }),
    );
    const resultat = optimise(
      beaucoup,
      { rules: regles(), preferences: [], workers: [worker(FATIMA), worker(AWA)] },
      { maxPropositions: 5 },
    );
    expect(resultat.propositions).toHaveLength(5);
  });
});
