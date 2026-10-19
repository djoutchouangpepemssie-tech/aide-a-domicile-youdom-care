/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  editOccurrence,
  editSerie,
  endSerie,
  occurrences,
  resumeSerie,
  serieSchema,
  skipDate,
  splitSerie,
  suspendSerie,
  visibleOccurrences,
  weekMatches,
  type Serie,
  type Slot,
} from "./serie";

const FOYER = "a".repeat(24);
const AGENCE = "b".repeat(24);
const FATIMA = "c".repeat(24);
const AWA = "d".repeat(24);
const ARCEL = "e".repeat(24);
const AT = new Date("2026-10-19T10:00:00Z");

function slot(input: Partial<Slot> & { weekday: number }): Slot {
  return {
    start: "09:00",
    end: "11:00",
    overnight: false,
    kind: "jour",
    workerId: FATIMA,
    ...input,
  };
}

function serie(input: Partial<Serie> = {}): Serie {
  return serieSchema.parse({
    _id: "f".repeat(24),
    householdId: FOYER,
    agencyId: AGENCE,
    libelle: "Matins de Monique",
    from: "2026-10-19", // un lundi
    to: null,
    everyWeeks: 1,
    slots: [slot({ weekday: 1 }), slot({ weekday: 4, start: "14:00", end: "16:00" })],
    skips: [],
    overrides: [],
    status: "active",
    replacedBy: null,
    replaces: null,
    version: 1,
    createdBy: ARCEL,
    createdAt: AT,
    updatedAt: AT,
    ...input,
  });
}

describe("le rythme", () => {
  it("produit un créneau par jour de la semaine demandé", () => {
    const liste = occurrences(serie(), "2026-10-19", "2026-11-01");
    expect(liste.map((o) => `${o.date} ${o.start}`)).toEqual([
      "2026-10-19 09:00",
      "2026-10-22 14:00",
      "2026-10-26 09:00",
      "2026-10-29 14:00",
    ]);
  });

  it("respecte une semaine sur deux, comptée depuis le début de la série", () => {
    const quinzaine = serie({ everyWeeks: 2 });
    expect(weekMatches(quinzaine, "2026-10-19")).toBe(true);
    expect(weekMatches(quinzaine, "2026-10-26")).toBe(false);
    expect(weekMatches(quinzaine, "2026-11-02")).toBe(true);
    expect(occurrences(quinzaine, "2026-10-19", "2026-11-08").map((o) => o.date)).toEqual([
      "2026-10-19",
      "2026-10-22",
      "2026-11-02",
      "2026-11-05",
    ]);
  });

  it("ne sort rien avant son début ni après sa fin", () => {
    const bornee = serie({ from: "2026-10-26", to: "2026-11-01" });
    expect(occurrences(bornee, "2026-10-01", "2026-12-01").map((o) => o.date)).toEqual([
      "2026-10-26",
      "2026-10-29",
    ]);
  });

  it("fait traverser minuit à une garde de nuit", () => {
    const nuit = serie({
      slots: [
        slot({ weekday: 1, start: "21:00", end: "07:00", overnight: true, kind: "nuit_calme" }),
      ],
    });
    const [premiere] = occurrences(nuit, "2026-10-19", "2026-10-20");
    expect(premiere).toMatchObject({
      date: "2026-10-19",
      endDate: "2026-10-20",
      kind: "nuit_calme",
    });
  });

  it("refuse une fin avant le début si ce n'est pas une nuit", () => {
    expect(() => serie({ slots: [slot({ weekday: 1, start: "21:00", end: "07:00" })] })).toThrow();
  });

  it("garde les créneaux à pourvoir, sans intervenant", () => {
    const aPourvoir = serie({ slots: [slot({ weekday: 1, workerId: null })] });
    expect(occurrences(aPourvoir, "2026-10-19", "2026-10-19")[0].workerId).toBeNull();
  });
});

describe("les exceptions", () => {
  it("déplace une seule occurrence sans toucher les autres", () => {
    const modifiee = editOccurrence(serie(), {
      date: "2026-10-26",
      slotIndex: 0,
      change: { start: "10:30", end: "12:30", motif: "rendez-vous médical" },
      by: ARCEL,
      at: AT,
    });
    const liste = occurrences(modifiee, "2026-10-19", "2026-11-01");
    expect(liste.map((o) => `${o.date} ${o.start}`)).toEqual([
      "2026-10-19 09:00",
      "2026-10-22 14:00",
      "2026-10-26 10:30",
      "2026-10-29 14:00",
    ]);
    const exception = liste.find((o) => o.date === "2026-10-26");
    expect(exception).toMatchObject({ origine: "exception", motif: "rendez-vous médical" });
  });

  it("remplace l'intervenant d'une seule visite", () => {
    const remplacee = editOccurrence(serie(), {
      date: "2026-10-19",
      slotIndex: 0,
      change: { workerId: AWA, motif: "Fatima en formation" },
      by: ARCEL,
      at: AT,
    });
    const liste = occurrences(remplacee, "2026-10-19", "2026-10-26");
    expect(liste[0]).toMatchObject({ workerId: AWA, motif: "Fatima en formation" });
    expect(liste[2].workerId).toBe(FATIMA);
  });

  it("annule une occurrence, et seulement elle", () => {
    const annulee = editOccurrence(serie(), {
      date: "2026-10-22",
      slotIndex: 1,
      change: { cancelled: true, motif: "hospitalisation" },
      by: ARCEL,
      at: AT,
    });
    expect(occurrences(annulee, "2026-10-19", "2026-11-01").map((o) => o.date)).toEqual([
      "2026-10-19",
      "2026-10-26",
      "2026-10-29",
    ]);
  });

  it("deux décisions successives sur la même occurrence n'en font qu'une", () => {
    const une = editOccurrence(serie(), {
      date: "2026-10-19",
      slotIndex: 0,
      change: { start: "10:00", end: "12:00" },
      by: ARCEL,
      at: AT,
    });
    const deux = editOccurrence(une, {
      date: "2026-10-19",
      slotIndex: 0,
      change: { workerId: AWA },
      by: ARCEL,
      at: AT,
    });
    expect(deux.overrides).toHaveLength(1);
    // La deuxième décision n'efface pas la première : l'horaire tient, l'intervenant change.
    expect(occurrences(deux, "2026-10-19", "2026-10-19")[0]).toMatchObject({
      start: "10:00",
      workerId: AWA,
    });
  });

  it("saute une journée entière", () => {
    const saute = skipDate(serie(), "2026-10-22", AT);
    expect(occurrences(saute, "2026-10-19", "2026-10-26").map((o) => o.date)).toEqual([
      "2026-10-19",
      "2026-10-26",
    ]);
    // Deux fois la même date ne la saute pas deux fois.
    expect(skipDate(saute, "2026-10-22", AT).skips).toEqual(["2026-10-22"]);
  });
});

describe("les trois portées de modification", () => {
  it("« celle-ci et les suivantes » coupe la série en deux, et le passé ne bouge pas", () => {
    const { ancienne, nouvelle } = splitSerie(serie(), {
      date: "2026-11-02",
      slots: [slot({ weekday: 1, start: "08:00", end: "10:00" })],
      by: ARCEL,
      at: AT,
      newId: "9".repeat(24),
    });

    expect(ancienne.to).toBe("2026-11-01");
    expect(ancienne.replacedBy).toBe(nouvelle._id);
    expect(nouvelle.replaces).toBe(ancienne._id);

    // Avant la coupure : l'horaire d'origine, et le jeudi existe toujours.
    expect(
      occurrences(ancienne, "2026-10-19", "2026-11-30").map((o) => `${o.date} ${o.start}`),
    ).toEqual(["2026-10-19 09:00", "2026-10-22 14:00", "2026-10-26 09:00", "2026-10-29 14:00"]);
    // Après : le nouvel horaire, et plus de jeudi.
    expect(
      occurrences(nouvelle, "2026-10-19", "2026-11-30").map((o) => `${o.date} ${o.start}`),
    ).toEqual([
      "2026-11-02 08:00",
      "2026-11-09 08:00",
      "2026-11-16 08:00",
      "2026-11-23 08:00",
      "2026-11-30 08:00",
    ]);
  });

  it("les exceptions suivent la série à laquelle elles appartiennent", () => {
    const avecExceptions = editOccurrence(
      editOccurrence(serie(), {
        date: "2026-10-19",
        slotIndex: 0,
        change: { workerId: AWA },
        by: ARCEL,
        at: AT,
      }),
      { date: "2026-11-09", slotIndex: 0, change: { workerId: AWA }, by: ARCEL, at: AT },
    );
    const { ancienne, nouvelle } = splitSerie(avecExceptions, {
      date: "2026-11-02",
      slots: [slot({ weekday: 1 })],
      by: ARCEL,
      at: AT,
      newId: "9".repeat(24),
    });
    expect(ancienne.overrides.map((o) => o.date)).toEqual(["2026-10-19", "2026-11-09"]);
    expect(nouvelle.overrides.map((o) => o.date)).toEqual(["2026-11-09"]);
  });

  it("« toute la série » change le rythme et l'horaire d'un coup", () => {
    const modifiee = editSerie(serie(), {
      slots: [slot({ weekday: 2, start: "07:30", end: "09:30" })],
      everyWeeks: 2,
      at: AT,
    });
    expect(modifiee.version).toBe(2);
    expect(
      occurrences(modifiee, "2026-10-19", "2026-11-15").map((o) => `${o.date} ${o.start}`),
    ).toEqual(["2026-10-20 07:30", "2026-11-03 07:30"]);
  });
});

describe("suspendre, reprendre, terminer", () => {
  it("une série suspendue ne produit plus rien, et reprend telle quelle", () => {
    const suspendue = suspendSerie(serie(), AT);
    expect(visibleOccurrences(suspendue, "2026-10-19", "2026-11-01")).toEqual([]);
    // Les occurrences existent toujours dans le modèle : rien n'est perdu, seulement masqué.
    expect(occurrences(suspendue, "2026-10-19", "2026-11-01")).toHaveLength(4);
    expect(visibleOccurrences(resumeSerie(suspendue, AT), "2026-10-19", "2026-11-01")).toHaveLength(
      4,
    );
  });

  it("terminer une série garde le passé et coupe l'avenir", () => {
    const terminee = endSerie(serie(), "2026-10-25", AT);
    expect(occurrences(terminee, "2026-10-01", "2026-12-01").map((o) => o.date)).toEqual([
      "2026-10-19",
      "2026-10-22",
    ]);
  });
});
