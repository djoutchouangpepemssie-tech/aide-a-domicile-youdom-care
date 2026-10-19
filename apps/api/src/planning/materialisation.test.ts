/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import type { Visit } from "../domaine/schemas";
import { parisToInstant } from "../temps/paris";
import { commencee, planMaterialisation } from "./materialisation";
import type { Occurrence } from "./serie";

const SERIE = "a".repeat(24);
const FOYER = "b".repeat(24);
const FATIMA = "c".repeat(24);
const AWA = "d".repeat(24);

const instants = (occurrence: Occurrence) => ({
  debut: parisToInstant(occurrence.date, occurrence.start),
  fin: parisToInstant(occurrence.endDate, occurrence.end),
});

function occurrence(input: Partial<Occurrence> = {}): Occurrence {
  return {
    serieId: SERIE,
    householdId: FOYER,
    date: "2026-10-19",
    slotIndex: 0,
    start: "09:00",
    end: "11:00",
    endDate: "2026-10-19",
    kind: "jour",
    workerId: FATIMA,
    origine: "serie",
    motif: null,
    ...input,
  };
}

function visite(occ: Occurrence, over: Partial<Visit> = {}): Visit {
  return {
    _id: `${occ.date}${occ.slotIndex}`.padEnd(24, "0").slice(0, 24),
    householdId: occ.householdId,
    workerId: occ.workerId ?? FATIMA,
    plannedStart: instants(occ).debut,
    plannedEnd: instants(occ).fin,
    kind: occ.kind,
    status: "prevue",
    replaces: null,
    serieId: occ.serieId,
    occurrenceDate: occ.date,
    slotIndex: occ.slotIndex,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    ...over,
  };
}

describe("matérialiser un planning", () => {
  it("crée ce qui manque, et rien d'autre", () => {
    const occ = [occurrence(), occurrence({ date: "2026-10-26" })];
    const plan = planMaterialisation(occ, [visite(occ[0])], instants);
    expect(plan.aCreer.map((o) => o.date)).toEqual(["2026-10-26"]);
    expect(plan.aMettreAJour).toEqual([]);
    expect(plan.aAnnuler).toEqual([]);
  });

  it("est idempotente : relancée, elle ne propose plus rien", () => {
    const occ = [occurrence()];
    const plan = planMaterialisation(occ, [visite(occ[0])], instants);
    expect(plan).toMatchObject({ aCreer: [], aMettreAJour: [], aAnnuler: [], divergences: [] });
  });

  it("met à jour une visite encore prévue quand le planning change", () => {
    const avant = occurrence();
    const apres = occurrence({ start: "10:00", end: "12:00", workerId: AWA });
    const plan = planMaterialisation([apres], [visite(avant)], instants);
    expect(plan.aMettreAJour).toHaveLength(1);
    expect(plan.aMettreAJour[0].changements.sort()).toEqual([
      "heure de début",
      "heure de fin",
      "intervenant",
    ]);
  });

  it("ne réécrit jamais une visite commencée : elle signale la divergence", () => {
    const avant = occurrence();
    const apres = occurrence({ start: "10:00", end: "12:00" });
    for (const status of ["en_route", "en_cours", "faite"] as const) {
      const plan = planMaterialisation([apres], [visite(avant, { status })], instants);
      expect(plan.aMettreAJour).toEqual([]);
      expect(plan.divergences).toHaveLength(1);
      expect(plan.divergences[0].changements).toContain("heure de début");
    }
  });

  it("annule une visite prévue dont l'occurrence a disparu", () => {
    const occ = occurrence();
    const plan = planMaterialisation([], [visite(occ)], instants);
    expect(plan.aAnnuler).toHaveLength(1);
    expect(plan.divergences).toEqual([]);
  });

  it("signale, sans l'annuler, une visite déjà faite dont l'occurrence a disparu", () => {
    const occ = occurrence();
    const plan = planMaterialisation([], [visite(occ, { status: "faite" })], instants);
    expect(plan.aAnnuler).toEqual([]);
    expect(plan.divergences[0]).toMatchObject({ changements: ["occurrence supprimée"] });
  });

  it("ne réannule pas une visite déjà annulée", () => {
    const occ = occurrence();
    const plan = planMaterialisation([], [visite(occ, { status: "annulee" })], instants);
    expect(plan).toMatchObject({ aAnnuler: [], divergences: [] });
  });

  it("ignore les visites ponctuelles, qui ne viennent d'aucun planning", () => {
    const occ = occurrence();
    const ponctuelle = visite(occ, { serieId: null, occurrenceDate: null, slotIndex: null });
    const plan = planMaterialisation([occ], [ponctuelle], instants);
    // L'occurrence n'a pas de visite : elle est à créer, et la ponctuelle n'est pas touchée.
    expect(plan.aCreer).toHaveLength(1);
    expect(plan.aAnnuler).toEqual([]);
  });

  it("sait reconnaître une visite commencée", () => {
    const occ = occurrence();
    expect(commencee(visite(occ))).toBe(false);
    expect(commencee(visite(occ, { status: "en_cours" }))).toBe(true);
  });
});
