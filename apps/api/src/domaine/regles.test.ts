/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  BINARY_RULES,
  RULE_CATALOG,
  RULE_KEYS,
  agencyRulesSchema,
  blocking,
  emptyRules,
  evaluateRules,
  mondayOf,
  type Assignment,
  type Rule,
  type RuleKey,
} from "./regles";

/*
 * La promesse la plus importante de ce moteur est une **absence** : sans règle saisie, il ne
 * signale rien. Le premier test la fige. Les suivants éprouvent chaque règle une fois activée.
 */

const FOYER = "a".repeat(24);
const AUTRE_FOYER = "b".repeat(24);
const FATIMA = "c".repeat(24);

function visite(
  input: Partial<Assignment> & { start: string; end: string; startDate: string },
): Assignment {
  return {
    visitId: `${input.startDate}-${input.start}`,
    householdId: FOYER,
    workerId: FATIMA,
    endDate: input.startDate,
    ...input,
  };
}

function regles(actives: Partial<Record<RuleKey, Partial<Rule>>>): Record<RuleKey, Rule> {
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

describe("sans règle saisie, le moteur ne signale rien", () => {
  it("accepte un planning que personne ne voudrait tenir", () => {
    // Quatorze heures d'affilée, deux foyers sans trajet, et un chevauchement : aucune règle
    // n'étant activée, le moteur se taît. C'est la décision d'Arcel, et elle est tenue ici.
    const journee = [
      visite({ startDate: "2026-10-19", start: "06:00", end: "20:00" }),
      visite({ startDate: "2026-10-19", start: "19:30", end: "23:00", householdId: AUTRE_FOYER }),
    ];
    expect(evaluateRules(journee, emptyRules())).toEqual([]);
  });

  it("le catalogue décrit chaque règle sans en activer aucune", () => {
    expect(RULE_CATALOG.map((entry) => entry.key).sort()).toEqual([...RULE_KEYS].sort());
    for (const entry of RULE_CATALOG) {
      const binaire = BINARY_RULES.includes(entry.key);
      expect(entry.unite === null).toBe(binaire);
      expect(entry.suggestion === null).toBe(binaire);
      expect(entry.verifie.length).toBeGreaterThan(10);
    }
    for (const rule of Object.values(emptyRules())) expect(rule.active).toBe(false);
  });
});

describe("chaque règle, une fois activée", () => {
  it("refuse deux visites en même temps", () => {
    const findings = evaluateRules(
      [
        visite({ startDate: "2026-10-19", start: "09:00", end: "11:00" }),
        visite({ startDate: "2026-10-19", start: "10:30", end: "12:00", householdId: AUTRE_FOYER }),
      ],
      regles({ chevauchement: {} }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ regle: "chevauchement", severite: "bloquant" });
    expect(blocking(findings)).toHaveLength(1);
  });

  it("signale une visite trop courte, et une trop longue", () => {
    const findings = evaluateRules(
      [
        visite({ startDate: "2026-10-19", start: "09:00", end: "09:20" }),
        visite({ startDate: "2026-10-20", start: "08:00", end: "21:00" }),
      ],
      regles({ duree_min_visite: { valeur: 30 }, duree_max_visite: { valeur: 720 } }),
    );
    expect(findings.map((f) => f.regle)).toEqual(["duree_min_visite", "duree_max_visite"]);
  });

  it("laisse la garde de nuit dépasser la durée maximale : c'est sa nature", () => {
    const findings = evaluateRules(
      [
        visite({
          startDate: "2026-10-19",
          start: "21:00",
          end: "07:00",
          endDate: "2026-10-20",
          kind: "nuit_calme",
        }),
      ],
      regles({ duree_max_visite: { valeur: 480 } }),
    );
    expect(findings).toEqual([]);
  });

  it("exige un temps de trajet entre deux foyers, mais pas dans le même", () => {
    const sansTrajet = evaluateRules(
      [
        visite({ startDate: "2026-10-19", start: "09:00", end: "10:00" }),
        visite({ startDate: "2026-10-19", start: "10:10", end: "11:00", householdId: AUTRE_FOYER }),
      ],
      regles({ trajet_entre_visites: { valeur: 30, severite: "avertissement" } }),
    );
    expect(sansTrajet).toHaveLength(1);
    expect(sansTrajet[0]).toMatchObject({
      regle: "trajet_entre_visites",
      severite: "avertissement",
    });

    const memeFoyer = evaluateRules(
      [
        visite({ startDate: "2026-10-19", start: "09:00", end: "10:00" }),
        visite({ startDate: "2026-10-19", start: "10:10", end: "11:00" }),
      ],
      regles({ trajet_entre_visites: { valeur: 30 } }),
    );
    expect(memeFoyer).toEqual([]);
  });

  it("mesure l'amplitude d'une journée, pauses comprises", () => {
    const findings = evaluateRules(
      [
        visite({ startDate: "2026-10-19", start: "07:00", end: "09:00" }),
        visite({ startDate: "2026-10-19", start: "18:00", end: "21:00" }),
      ],
      regles({ amplitude_quotidienne: { valeur: 13 } }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("14 h");
  });

  it("vérifie le repos entre deux journées", () => {
    const findings = evaluateRules(
      [
        visite({ startDate: "2026-10-19", start: "14:00", end: "22:00" }),
        visite({ startDate: "2026-10-20", start: "07:00", end: "12:00" }),
      ],
      regles({ repos_quotidien: { valeur: 11 } }),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("9 h de repos");
  });

  it("additionne les heures de la semaine du lundi au dimanche", () => {
    const semaine = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"].map(
      (date) => visite({ startDate: date, start: "08:00", end: "18:00" }),
    );
    const findings = evaluateRules(semaine, regles({ heures_hebdomadaires: { valeur: 48 } }));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("50 h");
  });

  it("cherche un vrai repos hebdomadaire", () => {
    const tousLesJours = [
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ].map((date) => visite({ startDate: date, start: "08:00", end: "20:00" }));
    const findings = evaluateRules(tousLesJours, regles({ repos_hebdomadaire: { valeur: 35 } }));
    expect(findings).toHaveLength(1);
    expect(findings[0].regle).toBe("repos_hebdomadaire");

    // Deux jours libres en fin de semaine : le repos existe, plus rien à signaler.
    const avecWeekEnd = tousLesJours.slice(0, 5);
    expect(evaluateRules(avecWeekEnd, regles({ repos_hebdomadaire: { valeur: 35 } }))).toEqual([]);
  });

  it("compte les jours travaillés d'affilée, et repart à zéro après une coupure", () => {
    const sept = [
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ].map((date) => visite({ startDate: date, start: "09:00", end: "11:00" }));
    const findings = evaluateRules(sept, regles({ jours_consecutifs: { valeur: 6 } }));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("7 jours");

    const avecCoupure = sept.filter((v) => !v.startDate.endsWith("22"));
    expect(evaluateRules(avecCoupure, regles({ jours_consecutifs: { valeur: 6 } }))).toEqual([]);
  });

  it("refuse une visite pendant une absence déclarée", () => {
    const findings = evaluateRules(
      [visite({ startDate: "2026-10-21", start: "09:00", end: "11:00" })],
      regles({ absence_intervenant: {} }),
      {
        absences: [
          {
            from: new Date("2026-10-20T00:00:00Z"),
            to: new Date("2026-10-23T00:00:00Z"),
            motif: "congé",
          },
        ],
      },
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("congé");
  });
});

describe("la configuration elle-même", () => {
  const base = {
    _id: "d".repeat(24),
    agencyId: "e".repeat(24),
    version: 1,
    updatedBy: "f".repeat(24),
    updatedAt: new Date("2026-10-19T10:00:00Z"),
  };

  it("accepte des règles toutes inactives", () => {
    expect(agencyRulesSchema.parse({ ...base, rules: emptyRules() }).version).toBe(1);
  });

  it("refuse une règle active sans seuil", () => {
    const rules = emptyRules();
    rules.amplitude_quotidienne = { active: true, severite: "bloquant", valeur: null };
    expect(() => agencyRulesSchema.parse({ ...base, rules })).toThrow();
  });

  it("refuse un seuil sur une règle binaire", () => {
    const rules = emptyRules();
    rules.chevauchement = { active: true, severite: "bloquant", valeur: 30 };
    expect(() => agencyRulesSchema.parse({ ...base, rules })).toThrow();
  });
});

describe("la semaine", () => {
  it("commence le lundi", () => {
    expect(mondayOf("2026-10-19")).toBe("2026-10-19");
    expect(mondayOf("2026-10-25")).toBe("2026-10-19");
    expect(mondayOf("2026-10-26")).toBe("2026-10-26");
  });
});
