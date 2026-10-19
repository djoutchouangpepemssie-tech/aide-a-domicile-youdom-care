/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import * as z from "zod";
import { COLLECTIONS } from "./collections";
import { VALIDATED, mongoValidator } from "./validators";

/*
 * Ces tests ne parlent pas à MongoDB — il n'y en a pas dans l'environnement de construction. Ils
 * éprouvent ce qui peut l'être sans base, et c'est l'essentiel : que le validateur **dérive** du
 * schéma Zod et ne puisse pas en diverger en silence.
 */

describe("les validateurs dérivent des schémas", () => {
  it("exigent exactement les champs obligatoires du schéma Zod", () => {
    for (const spec of VALIDATED) {
      const attendus = (
        z.toJSONSchema(spec.schema, { io: "input", unrepresentable: "any" }) as {
          required?: string[];
        }
      ).required;
      expect(mongoValidator(spec.schema, spec.dates).required, spec.collection).toEqual(
        [...(attendus ?? [])].sort(),
      );
    }
  });

  it("nomment des champs de date qui existent vraiment", () => {
    for (const spec of VALIDATED) {
      const validateur = mongoValidator(spec.schema, spec.dates);
      for (const champ of spec.dates) {
        // Un nom de champ mal recopié ne doit pas passer inaperçu : il serait typé nulle part.
        expect(validateur.required, `${spec.collection}.${champ}`).toContain(champ);
        expect(validateur.properties[champ]).toEqual({ bsonType: "date" });
      }
    }
  });

  it("n'emploient que des mots que MongoDB comprend", () => {
    const autorises = new Set(["bsonType", "enum", "pattern"]);
    for (const spec of VALIDATED) {
      const validateur = mongoValidator(spec.schema, spec.dates);
      expect(Object.keys(validateur).sort()).toEqual(["bsonType", "properties", "required"]);
      const texte = JSON.stringify(validateur);
      // `$schema` et `format` font échouer un `collMod` : ils ne doivent jamais arriver jusque-là.
      expect(texte).not.toContain("$schema");
      expect(texte).not.toContain('"format"');
      for (const propriete of Object.values(validateur.properties)) {
        for (const clef of Object.keys(propriete)) expect(autorises.has(clef)).toBe(true);
      }
    }
  });

  it("ne portent que sur des collections déclarées", () => {
    const connues = new Set(COLLECTIONS.map((collection) => collection.name));
    for (const spec of VALIDATED) expect(connues.has(spec.collection), spec.collection).toBe(true);
  });

  it("couvrent les collections qui portent la donnée du métier", () => {
    const couvertes = new Set(VALIDATED.map((spec) => spec.collection));
    for (const essentielle of [
      "households",
      "members",
      "memberships",
      "access_grants",
      "visits",
      "visit_events",
      "audit_logs",
      "series",
    ]) {
      expect(couvertes.has(essentielle), essentielle).toBe(true);
    }
  });
});

describe("le validateur du foyer, en détail", () => {
  const foyer = VALIDATED.find((spec) => spec.collection === "households");

  it("type les champs, garde les énumérations et les motifs", () => {
    const validateur = mongoValidator(foyer?.schema as z.ZodType, foyer?.dates ?? []);
    expect(validateur.properties._id).toEqual({
      bsonType: "string",
      pattern: "^[0-9a-f]{24}$",
    });
    expect(validateur.properties.status).toEqual({
      bsonType: "string",
      enum: ["actif", "gele", "archive"],
    });
    expect(validateur.properties.address).toEqual({ bsonType: "object" });
    expect(validateur.properties.createdAt).toEqual({ bsonType: "date" });
  });

  it("laisse passer les champs nouveaux : une base n'est pas un mur", () => {
    const validateur = mongoValidator(foyer?.schema as z.ZodType, foyer?.dates ?? []);
    // Aucun `additionalProperties: false` : c'est Zod, en entrée, qui refuse l'inattendu.
    expect(JSON.stringify(validateur)).not.toContain("additionalProperties");
  });
});
