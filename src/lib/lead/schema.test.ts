import { describe, expect, it } from "vitest";
import { formPaths, healthForms, isHealthForm, leadForms } from "./forms";
import { leadPayloadSchema, normalizeFrenchPhone, type LeadPayload } from "./schema";

const valid: LeadPayload = {
  id: "8f7b1d1e-2c3a-4b5c-9d6e-7f8a9b0c1d2e",
  createdAt: "2026-09-20T10:00:00.000Z",
  form: "personne-agee",
  sourcePage: "/personnes-agees/",
  commune: { insee: "92062", nom: "Puteaux", codePostal: "92800", departement: "92" },
  agenceProche: "puteaux",
  urgence: "semaine",
  pourQui: "Ma mère",
  situation: { autonomie: "aide pour la toilette", inquietudes: ["chutes", "solitude"] },
  besoins: ["Aide à l'autonomie", "Compagnie"],
  planning: {
    rythme: "regulier",
    grille: { lun: ["morning", "night"], mer: ["morning"] },
    nuit: "calme",
    heuresParSemaine: 17,
  },
  contact: {
    prenom: "Claire",
    nom: "Martin",
    telephone: "06 12 34 56 78",
    email: "claire@example.org",
  },
  message: "Elle est chez elle au 3e étage sans ascenseur.",
  consentement: { sante: true, date: "2026-09-20T10:00:00.000Z", version: "2026-09" },
};

function withChanges(changes: Record<string, unknown>): unknown {
  return { ...structuredClone(valid), ...changes };
}

function issues(input: unknown): string[] {
  const result = leadPayloadSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
}

describe("LeadPayload", () => {
  it("accepte une demande complète et n'altère pas les données", () => {
    const result = leadPayloadSchema.parse(valid);
    expect(result).toEqual(valid);
  });

  it("accepte une demande de rappel minimale sans consentement santé", () => {
    const rappel = {
      id: valid.id,
      createdAt: valid.createdAt,
      form: "rappel",
      sourcePage: "/",
      commune: valid.commune,
      agenceProche: "puteaux",
      urgence: "48h",
      contact: { prenom: "Paul", nom: "Durand", telephone: "01 84 80 17 03" },
      consentement: { sante: false, date: valid.createdAt, version: "2026-09" },
    };
    expect(issues(rappel)).toEqual([]);
  });

  it("exige le consentement explicite dès qu'une réponse touche à la santé", () => {
    expect(issues(withChanges({ consentement: { ...valid.consentement, sante: false } }))).toEqual([
      "consentement.sante",
    ]);
    const rappelAvecSituation = withChanges({
      form: "rappel",
      consentement: { ...valid.consentement, sante: false },
    });
    expect(issues(rappelAvecSituation)).toEqual(["consentement.sante"]);
  });

  it("n'exige la commune que hors contact, et le consentement que pour la santé", () => {
    const base = {
      id: valid.id,
      createdAt: valid.createdAt,
      sourcePage: "/",
      urgence: "information",
      contact: { prenom: "Paul", nom: "Durand", telephone: "01 84 80 17 03" },
      consentement: { sante: false, date: valid.createdAt, version: "2026-09" },
    };
    expect(issues({ ...base, form: "contact" })).toEqual([]);
    expect(issues({ ...base, form: "rappel" })).toEqual(["commune"]);
    expect(
      issues({
        ...base,
        form: "professionnel",
        commune: valid.commune,
        agenceProche: "puteaux",
        situation: { structure: "CHU", type_besoin: "Sortie" },
      }),
    ).toEqual([]);
  });

  it("refuse une commune hors Île-de-France ou incohérente", () => {
    expect(
      issues(
        withChanges({
          commune: { insee: "69123", nom: "Lyon", codePostal: "69001", departement: "69" },
        }),
      ),
    ).toContain("commune.departement");
    expect(
      issues(
        withChanges({
          commune: { insee: "69123", nom: "Lyon", codePostal: "69001", departement: "92" },
        }),
      ),
    ).toEqual(["commune"]);
  });

  it("valide le téléphone français et refuse le reste", () => {
    expect(normalizeFrenchPhone("06 12 34 56 78")).toBe("+33612345678");
    expect(normalizeFrenchPhone("+33 1 84 80 17 03")).toBe("+33184801703");
    expect(normalizeFrenchPhone("0184801703")).toBe("+33184801703");
    expect(normalizeFrenchPhone("12345")).toBeNull();
    expect(normalizeFrenchPhone("+1 415 555 2671")).toBeNull();
    expect(issues(withChanges({ contact: { ...valid.contact, telephone: "06 12 34" } }))).toEqual([
      "contact.telephone",
    ]);
  });

  it("interdit les paramètres dans la page d'origine (aucune donnée dans l'URL)", () => {
    expect(issues(withChanges({ sourcePage: "/demande/?pathologie=alzheimer" }))).toEqual([
      "sourcePage",
    ]);
    expect(issues(withChanges({ sourcePage: "https://exemple.fr/" }))).toEqual(["sourcePage"]);
  });

  it("limite le champ libre et les réponses", () => {
    expect(issues(withChanges({ message: "a".repeat(601) }))).toEqual(["message"]);
    expect(issues(withChanges({ situation: { "Clé Invalide": "x" } }))).toEqual([
      "situation.Clé Invalide",
    ]);
    expect(issues(withChanges({ situation: { detail: "b".repeat(501) } }))).toEqual([
      "situation.detail",
    ]);
  });

  it("contrôle le planning : créneaux uniques, plages par pas de 30 minutes passant minuit, dates ponctuelles", () => {
    expect(
      issues(
        withChanges({ planning: { rythme: "regulier", grille: { lun: ["morning", "morning"] } } }),
      ),
    ).toEqual(["planning.grille.lun"]);
    expect(
      issues(
        withChanges({
          planning: { rythme: "regulier", plages: { sam: [{ debut: "21:00", fin: "06:00" }] } },
        }),
      ),
    ).toEqual([]);
    expect(
      issues(
        withChanges({
          planning: { rythme: "regulier", plages: { sam: [{ debut: "21:15", fin: "06:00" }] } },
        }),
      ),
    ).toEqual(["planning.plages.sam.0.debut"]);
    expect(issues(withChanges({ planning: { rythme: "ponctuel" } }))).toEqual(["planning.dates"]);
    expect(
      issues(
        withChanges({ planning: { rythme: "ponctuel", dates: ["2026-10-03", "2026-10-04"] } }),
      ),
    ).toEqual([]);
    expect(issues(withChanges({ planning: { rythme: "inconnu" } }))).toEqual([]);
  });

  it("refuse les champs inconnus et les formulaires inconnus", () => {
    const unknown = leadPayloadSchema.safeParse(withChanges({ diagnostic: "x" }));
    expect(unknown.success).toBe(false);
    expect(unknown.error?.issues[0]).toMatchObject({
      code: "unrecognized_keys",
      keys: ["diagnostic"],
    });
    expect(issues(withChanges({ form: "devis" }))).toEqual(["form"]);
  });
});

describe("formulaires", () => {
  it("connaît les onze formulaires de docs/05 §2 et leur adresse", () => {
    expect(leadForms).toHaveLength(11);
    expect(formPaths.rappel).toBe("/etre-rappele/");
    expect(formPaths.candidature).toBe("/recrutement/postuler/");
    for (const path of Object.values(formPaths)) expect(path).toMatch(/^\/[a-z0-9/-]*\/$/);
  });

  it("distingue les formulaires qui touchent à la santé", () => {
    expect(healthForms).toHaveLength(7);
    expect(isHealthForm("neuro")).toBe(true);
    expect(isHealthForm("rappel")).toBe(false);
    expect(isHealthForm("professionnel")).toBe(false);
  });
});
