import * as z from "zod";
import { idSchema } from "./schemas";

/*
 * Les préférences d'un foyer sur les intervenants : un souhait, ou un refus.
 *
 * Deux règles de `docs/portal/PERMISSIONS.md` sont tenues ici :
 *
 * 1. **le motif d'un refus ne sort jamais du foyer et de l'agence.** Il n'est pas renvoyé aux
 *    autres membres, et il n'apparaît pas dans une suggestion d'affectation — seule l'exclusion
 *    apparaît, sans sa raison ;
 * 2. un refus n'est pas un jugement : il peut tenir à un prénom, à une langue, à une histoire.
 *    Le logiciel l'applique sans le discuter et sans le diffuser.
 */

export const preferenceKinds = ["souhait", "refus"] as const;

export const workerPreferenceSchema = z.strictObject({
  _id: idSchema,
  householdId: idSchema,
  workerId: idSchema,
  kind: z.enum(preferenceKinds),
  /** Visible de l'agence seule. Jamais renvoyé par une route de suggestion. */
  motif: z.string().max(200).nullish(),
  createdBy: idSchema,
  createdAt: z.coerce.date(),
});

export type WorkerPreference = z.infer<typeof workerPreferenceSchema>;
