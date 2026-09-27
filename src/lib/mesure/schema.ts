import * as z from "zod/mini";
import {
  callPlacements,
  MAX_PAGE_LENGTH,
  MAX_STEP,
  mesureDepartments,
  mesureForms,
} from "./events";

/*
 * Schéma zod strict d'un événement de mesure (D-029), partagé par la route api/mesure et les
 * tests. Écrit avec zod/mini comme le schéma des demandes (D-022). Tout ce qui n'est pas dans une
 * liste fermée est refusé : nom d'événement inconnu, propriété en trop, commune au lieu du
 * département, texte libre, chemin de page avec paramètres.
 */

const pageSchema = z
  .string()
  .check(z.maxLength(MAX_PAGE_LENGTH), z.regex(/^\/[a-z0-9\-_/.]*$/, "chemin de page normalisé"));

const formSchema = z.enum(mesureForms);

export const mesureBodySchema = z.discriminatedUnion("event", [
  z.strictObject({
    event: z.literal("demande_etape_vue"),
    props: z.strictObject({
      formulaire: formSchema,
      etape: z.int().check(z.minimum(1), z.maximum(MAX_STEP)),
    }),
    page: pageSchema,
  }),
  z.strictObject({
    event: z.literal("demande_envoyee"),
    props: z.strictObject({
      formulaire: formSchema,
      departement: z.optional(z.enum(mesureDepartments)),
    }),
    page: pageSchema,
  }),
  z.strictObject({
    event: z.literal("rappel_envoye"),
    props: z.strictObject({}),
    page: pageSchema,
  }),
  z.strictObject({
    event: z.literal("appel_clic"),
    props: z.strictObject({ emplacement: z.enum(callPlacements) }),
    page: pageSchema,
  }),
]);

export type ValidatedMesureBody = z.infer<typeof mesureBodySchema>;
