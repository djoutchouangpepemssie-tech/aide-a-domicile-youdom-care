import type { Context } from "hono";
import type * as z from "zod";
import { fail } from "./errors";

/*
 * Lecture et validation du corps d'une requête. Le détail de l'erreur est renvoyé — mais
 * seulement le **chemin** du champ fautif, jamais la valeur reçue : un corps de requête peut
 * contenir une donnée de santé, et une réponse d'erreur se retrouve dans les journaux.
 */
export async function parseBody<T>(
  context: Context,
  schema: z.ZodType<T>,
): Promise<{ ok: true; value: T } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await context.req.json();
  } catch {
    return { ok: false, response: fail(context, "requete_invalide", "corps JSON illisible") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const champs = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean)
      .join(", ");
    return { ok: false, response: fail(context, "requete_invalide", champs || "corps invalide") };
  }
  return { ok: true, value: parsed.data };
}
