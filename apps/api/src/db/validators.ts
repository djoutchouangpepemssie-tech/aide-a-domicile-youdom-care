import type { Db } from "mongodb";
import * as z from "zod";
import { absenceSchema } from "../domaine/absences";
import { workerPreferenceSchema } from "../domaine/preferences";
import { agencyRulesSchema } from "../domaine/regles";
import {
  accessGrantSchema,
  auditEventSchema,
  householdSchema,
  memberSchema,
  membershipSchema,
  visitEventSchema,
  visitSchema,
  workerSchema,
} from "../domaine/schemas";
import { prestationSchema, tariffSettingsSchema } from "../domaine/tarifs";
import { serieSchema } from "../planning/serie";

/*
 * Les validateurs `$jsonSchema` de MongoDB : **la doublure des schémas Zod**, côté base.
 *
 * Pourquoi les deux. Zod protège ce qui passe par ce code — c'est-à-dire tout, aujourd'hui.
 * Demain, une reprise de données, un script d'import ou une console ouverte écriront directement
 * dans la base, et ce jour-là le schéma applicatif ne protégera rien. La ceinture **et** les
 * bretelles, donc.
 *
 * Et pourquoi des validateurs **volontairement pauvres** : les champs obligatoires et leur type
 * BSON, rien de plus. Un validateur qui reproduit tout le schéma Zod devient un second schéma à
 * tenir à jour, et le premier qui dérive est celui qu'on oublie. Celui-ci est **dérivé** du schéma
 * Zod, et un test échoue dès qu'un champ obligatoire apparaît d'un côté sans l'autre.
 *
 * `additionalProperties` reste permissif : une base qui refuse un champ nouveau transforme chaque
 * évolution en migration. C'est Zod, en entrée, qui refuse l'inattendu (`strictObject`).
 */

export type MongoProperty = {
  bsonType?: string | string[];
  enum?: unknown[];
  pattern?: string;
};

export type MongoJsonSchema = {
  bsonType: "object";
  required: string[];
  properties: Record<string, MongoProperty>;
};

type JsonSchemaObject = {
  required?: string[];
  properties?: Record<string, { type?: string; enum?: unknown[]; pattern?: string }>;
};

/** Du type JSON Schema au `bsonType` de MongoDB. `null` = on ne se prononce pas. */
function bsonTypeOf(type: string | undefined): string | null {
  switch (type) {
    case "string":
      return "string";
    case "number":
    case "integer":
      // `number` couvre int, long, double et decimal : la base ne doit pas trancher pour nous.
      return "number";
    case "boolean":
      return "bool";
    case "array":
      return "array";
    case "object":
      return "object";
    default:
      return null;
  }
}

/**
 * Dérive un validateur MongoDB d'un schéma Zod.
 *
 * `dates` nomme les champs que Zod décrit comme des dates : JSON Schema ne sait pas les exprimer
 * (ils ressortent vides), alors que MongoDB, lui, a un vrai type `date`. C'est le seul endroit où
 * il faut nommer les champs à la main — et un test vérifie que chacun existe bien dans le schéma.
 */
export function mongoValidator(schema: z.ZodType, dates: readonly string[] = []): MongoJsonSchema {
  const json = z.toJSONSchema(schema, {
    io: "input",
    unrepresentable: "any",
  }) as JsonSchemaObject;

  const required = [...(json.required ?? [])].sort();
  const properties: Record<string, MongoProperty> = {};

  for (const champ of required) {
    if (dates.includes(champ)) {
      properties[champ] = { bsonType: "date" };
      continue;
    }
    const brut = json.properties?.[champ];
    const bsonType = bsonTypeOf(brut?.type);
    if (!bsonType) continue;
    const propriete: MongoProperty = { bsonType };
    if (brut?.enum) propriete.enum = brut.enum;
    // `pattern` est compris par MongoDB ; `format`, non — il n'est donc jamais recopié.
    if (brut?.pattern) propriete.pattern = brut.pattern;
    properties[champ] = propriete;
  }

  return { bsonType: "object", required, properties };
}

export type ValidatorSpec = {
  collection: string;
  schema: z.ZodType;
  /** Champs que Zod traite en dates : MongoDB les typera `date`. */
  dates: readonly string[];
};

export const VALIDATED: readonly ValidatorSpec[] = [
  { collection: "households", schema: householdSchema, dates: ["createdAt"] },
  { collection: "members", schema: memberSchema, dates: ["createdAt"] },
  { collection: "memberships", schema: membershipSchema, dates: ["createdAt"] },
  { collection: "access_grants", schema: accessGrantSchema, dates: ["startsAt", "createdAt"] },
  { collection: "workers", schema: workerSchema, dates: ["createdAt"] },
  { collection: "visits", schema: visitSchema, dates: ["plannedStart", "plannedEnd", "createdAt"] },
  { collection: "visit_events", schema: visitEventSchema, dates: ["at", "recordedAt"] },
  { collection: "audit_logs", schema: auditEventSchema, dates: ["at"] },
  { collection: "series", schema: serieSchema, dates: ["createdAt", "updatedAt"] },
  { collection: "agency_rules", schema: agencyRulesSchema, dates: ["updatedAt"] },
  { collection: "prestations", schema: prestationSchema, dates: ["createdAt"] },
  { collection: "tariff_settings", schema: tariffSettingsSchema, dates: ["updatedAt"] },
  { collection: "absences", schema: absenceSchema, dates: ["from", "to", "createdAt"] },
  { collection: "worker_preferences", schema: workerPreferenceSchema, dates: ["createdAt"] },
];

export type ValidatorReport = Array<{ collection: string; applied: boolean; raison?: string }>;

/**
 * Pose les validateurs sur une base existante. **Niveau `moderate` et action `warn`** : on refuse
 * les écritures invalides sur les documents déjà conformes, mais on ne bloque pas une base qui
 * contiendrait de l'ancien. Durcir se fait ensuite, après une passe de vérification — pas le jour
 * de la mise en service.
 *
 * Un échec sur une collection n'arrête pas les autres : le rapport dit ce que MongoDB a répondu.
 */
export async function applyValidators(db: Db): Promise<ValidatorReport> {
  const report: ValidatorReport = [];
  for (const spec of VALIDATED) {
    try {
      await db.command({
        collMod: spec.collection,
        validator: { $jsonSchema: mongoValidator(spec.schema, spec.dates) },
        validationLevel: "moderate",
        validationAction: "warn",
      });
      report.push({ collection: spec.collection, applied: true });
    } catch (error) {
      report.push({
        collection: spec.collection,
        applied: false,
        raison: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return report;
}
