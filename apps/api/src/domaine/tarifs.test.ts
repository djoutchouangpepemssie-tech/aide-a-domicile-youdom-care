/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  euros,
  prestationAt,
  prestationSchema,
  priceVisit,
  segmentsOf,
  tariffSettingsSchema,
  type Prestation,
} from "./tarifs";

const AGENCE = "a".repeat(24);
const ARCEL = "b".repeat(24);

function prestation(input: Partial<Prestation> = {}): Prestation {
  return prestationSchema.parse({
    _id: "c".repeat(24),
    agencyId: AGENCE,
    code: "aide-autonomie",
    libelle: "Aide à l'autonomie",
    mode: "prestataire",
    unite: "heure",
    prixTtcCentimes: 2800, // 28,00 € l'heure — saisi par l'agence, pas par moi
    prixHtCentimes: null,
    tvaTaux: null,
    creditImpotEligible: true,
    majorations: [],
    from: "2026-01-01",
    to: null,
    createdBy: ARCEL,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...input,
  });
}

const reglages = tariffSettingsSchema.parse({
  _id: "d".repeat(24),
  agencyId: AGENCE,
  creditImpotTaux: 0.5,
  plafondAnnuelCentimes: null,
  updatedBy: ARCEL,
  updatedAt: new Date("2026-10-19T10:00:00Z"),
});

describe("le prix d'une visite", () => {
  it("se calcule à la minute, en centimes entiers", () => {
    const prix = priceVisit(prestation(), {
      startDate: "2026-10-19",
      start: "09:00",
      endDate: "2026-10-19",
      end: "10:30",
    });
    expect(prix.principal.minutes).toBe(90);
    expect(prix.principal.totalTtcCentimes).toBe(4200); // 1,5 × 28,00 €
    expect(euros(prix.principal.totalTtcCentimes)).toBe("42,00 €");
  });

  it("n'estime le crédit d'impôt que si l'agence a saisi son taux", () => {
    const visite = { startDate: "2026-10-19", start: "09:00", endDate: "2026-10-19", end: "11:00" };
    expect(priceVisit(prestation(), visite).secondaire).toBeNull();

    const avecTaux = priceVisit(prestation(), visite, reglages);
    expect(avecTaux.principal.totalTtcCentimes).toBe(5600);
    expect(avecTaux.secondaire).toEqual({
      creditImpotCentimes: 2800,
      apresCreditCentimes: 2800,
      estimation: true,
    });
  });

  it("n'estime rien sur une prestation que l'agence déclare non éligible", () => {
    const prix = priceVisit(
      prestation({ creditImpotEligible: false }),
      {
        startDate: "2026-10-19",
        start: "09:00",
        endDate: "2026-10-19",
        end: "11:00",
      },
      reglages,
    );
    expect(prix.secondaire).toBeNull();
  });

  it("applique un forfait tel quel, quelle que soit la durée", () => {
    const forfait = prestation({ unite: "forfait", prixTtcCentimes: 9000 });
    for (const end of ["10:00", "12:00"]) {
      const prix = priceVisit(forfait, {
        startDate: "2026-10-19",
        start: "09:00",
        endDate: "2026-10-19",
        end,
      });
      expect(prix.principal.totalTtcCentimes).toBe(9000);
    }
  });
});

describe("les majorations, sur la part de temps concernée", () => {
  const avecNuit = prestation({
    majorations: [
      {
        type: "nuit",
        libelle: "Majoration de nuit",
        mode: "pourcentage",
        valeur: 25,
        fenetre: { debut: "21:00", fin: "07:00" },
      },
    ],
  });

  it("ne majore que les minutes de nuit, pas la visite entière", () => {
    // 19 h → 23 h : deux heures de jour, deux heures de nuit.
    const prix = priceVisit(avecNuit, {
      startDate: "2026-10-19",
      start: "19:00",
      endDate: "2026-10-19",
      end: "23:00",
    });
    expect(prix.principal.lignes).toHaveLength(2);
    expect(prix.principal.lignes[1]).toMatchObject({ libelle: "Majoration de nuit", minutes: 120 });
    // 4 h × 28 € = 112 €, plus 25 % sur deux heures = 14 €.
    expect(prix.principal.totalTtcCentimes).toBe(11200 + 1400);
  });

  it("ne majore rien quand la visite ne touche pas la nuit", () => {
    const prix = priceVisit(avecNuit, {
      startDate: "2026-10-19",
      start: "09:00",
      endDate: "2026-10-19",
      end: "11:00",
    });
    expect(prix.principal.lignes).toHaveLength(1);
  });

  it("sépare la nuit et le dimanche sur une garde du samedi soir", () => {
    const avecDimanche = prestation({
      majorations: [
        {
          type: "nuit",
          libelle: "Nuit",
          mode: "pourcentage",
          valeur: 25,
          fenetre: { debut: "21:00", fin: "07:00" },
        },
        { type: "dimanche", libelle: "Dimanche", mode: "pourcentage", valeur: 50, fenetre: null },
      ],
    });
    // Samedi 21 h → dimanche 7 h : dix heures, toutes de nuit, dont sept le dimanche.
    const prix = priceVisit(avecDimanche, {
      startDate: "2026-10-17",
      start: "21:00",
      endDate: "2026-10-18",
      end: "07:00",
    });
    const nuit = prix.principal.lignes.find((ligne) => ligne.libelle === "Nuit");
    const dimanche = prix.principal.lignes.find((ligne) => ligne.libelle === "Dimanche");
    expect(nuit?.minutes).toBe(600);
    expect(dimanche?.minutes).toBe(420);
  });

  it("majore un jour férié calculé, pas une date recopiée", () => {
    const avecFerie = prestation({
      majorations: [
        { type: "ferie", libelle: "Jour férié", mode: "pourcentage", valeur: 100, fenetre: null },
      ],
    });
    // 14 mai 2026 : Ascension.
    const ferie = priceVisit(avecFerie, {
      startDate: "2026-05-14",
      start: "09:00",
      endDate: "2026-05-14",
      end: "11:00",
    });
    expect(ferie.principal.totalTtcCentimes).toBe(5600 + 5600);

    const ordinaire = priceVisit(avecFerie, {
      startDate: "2026-05-15",
      start: "09:00",
      endDate: "2026-05-15",
      end: "11:00",
    });
    expect(ordinaire.principal.lignes).toHaveLength(1);
  });

  it("compte une heure de moins la nuit du passage à l'heure d'été", () => {
    const nuit = {
      startDate: "2026-03-28",
      start: "21:00",
      endDate: "2026-03-29",
      end: "07:00",
    };
    const prix = priceVisit(avecNuit, nuit);
    // Neuf heures réelles, et non dix : c'est ce qui est payé.
    expect(prix.principal.minutes).toBe(540);
    expect(prix.principal.lignes[0].montantCentimes).toBe(Math.round((2800 * 540) / 60));
  });

  it("applique un montant horaire et un forfait de majoration", () => {
    const mixte = prestation({
      majorations: [
        {
          type: "nuit",
          libelle: "Nuit au tarif horaire",
          mode: "montant_horaire",
          valeur: 500,
          fenetre: { debut: "21:00", fin: "07:00" },
        },
        {
          type: "dimanche",
          libelle: "Forfait dimanche",
          mode: "forfait",
          valeur: 1500,
          fenetre: null,
        },
      ],
    });
    const prix = priceVisit(mixte, {
      startDate: "2026-10-18", // un dimanche
      start: "22:00",
      endDate: "2026-10-19",
      end: "02:00",
    });
    const horaire = prix.principal.lignes.find((l) => l.libelle === "Nuit au tarif horaire");
    const forfait = prix.principal.lignes.find((l) => l.libelle === "Forfait dimanche");
    expect(horaire).toMatchObject({ minutes: 240, montantCentimes: 2000 });
    expect(forfait).toMatchObject({ montantCentimes: 1500 });
  });
});

describe("les versions d'une prestation", () => {
  it("retrouve le prix du jour de la visite, pas celui d'aujourd'hui", () => {
    const anciennes = [
      prestation({
        _id: "1".repeat(24),
        prixTtcCentimes: 2600,
        from: "2026-01-01",
        to: "2026-06-30",
      }),
      prestation({ _id: "2".repeat(24), prixTtcCentimes: 2800, from: "2026-07-01", to: null }),
    ];
    expect(prestationAt(anciennes, "aide-autonomie", "2026-03-15")?.prixTtcCentimes).toBe(2600);
    expect(prestationAt(anciennes, "aide-autonomie", "2026-10-19")?.prixTtcCentimes).toBe(2800);
    expect(prestationAt(anciennes, "inconnue", "2026-10-19")).toBeNull();
  });

  it("refuse une majoration de nuit sans fenêtre horaire", () => {
    expect(() =>
      prestation({
        majorations: [
          { type: "nuit", libelle: "Nuit", mode: "pourcentage", valeur: 25, fenetre: null },
        ],
      }),
    ).toThrow();
  });
});

describe("le découpage du temps", () => {
  it("ne perd ni ne double aucune minute", () => {
    const segments = segmentsOf(
      { startDate: "2026-10-17", start: "21:00", endDate: "2026-10-18", end: "07:00" },
      { debut: "21:00", fin: "07:00" },
    );
    expect(segments.reduce((somme, s) => somme + s.minutes, 0)).toBe(600);
    for (let i = 0; i + 1 < segments.length; i += 1) {
      expect(segments[i].to.getTime()).toBe(segments[i + 1].from.getTime());
    }
  });
});
