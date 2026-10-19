import * as z from "zod";
import { idSchema } from "./schemas";

/*
 * Les absences d'un intervenant : congé, maladie, formation, indisponibilité déclarée.
 *
 * Elles ne bloquent rien par elles-mêmes — c'est la règle `absence_intervenant`, activée ou non
 * par l'agence, qui décide (`domaine/regles.ts`). Le logiciel ne décrète pas qu'on ne travaille
 * pas pendant un congé : il le signale si l'agence le lui demande.
 */

export const absenceKinds = ["conge", "maladie", "formation", "indisponibilite", "autre"] as const;

export const absenceSchema = z
  .strictObject({
    _id: idSchema,
    workerId: idSchema,
    kind: z.enum(absenceKinds),
    from: z.coerce.date(),
    to: z.coerce.date(),
    motif: z.string().max(200).nullish(),
    declaredBy: idSchema,
    createdAt: z.coerce.date(),
  })
  .refine((absence) => absence.to.getTime() > absence.from.getTime(), {
    error: "une absence qui finit avant de commencer",
    path: ["to"],
  });

export type Absence = z.infer<typeof absenceSchema>;
