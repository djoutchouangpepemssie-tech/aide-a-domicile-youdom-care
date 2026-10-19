import type { Context } from "hono";
import { authorizeAndLog } from "../audit/journal";
import type { Action, ModuleKey } from "../domaine/modules";
import { isOutsideOpeningHours } from "../services/opening-hours";
import { notFound } from "./errors";
import type { ApiDeps, AppEnv } from "./types";

/*
 * Le passage obligé de toute route qui touche un foyer : charger le contexte, autoriser,
 * journaliser. Les routes n'appellent jamais `authorize` directement — un appel direct laisse un
 * trou dans le journal, et un trou dans le journal est une promesse rompue envers le bénéficiaire.
 */

export type GuardResult = { ok: true } | { ok: false; response: Response };

export async function guard(
  deps: ApiDeps,
  context: Context<AppEnv>,
  input: { householdId: string; module: ModuleKey; action: Action; target?: string },
): Promise<GuardResult> {
  const member = context.get("member");
  const now = deps.now();
  const loaded = await deps.authorization.loadContext({
    memberId: member._id,
    householdId: input.householdId,
    now,
    withAssignedVisits: input.module === "acces_logement",
  });

  const decision = await authorizeAndLog(
    {
      memberId: member._id,
      householdId: input.householdId,
      module: input.module,
      action: input.action,
      target: input.target,
    },
    {
      now,
      ...loaded,
      secondFactorPresented: context.get("secondFactorPresented"),
      onCall: {
        outsideOpeningHours: isOutsideOpeningHours(now),
        // Le motif d'astreinte est saisi dans l'interface et voyage dans l'en-tête : il est
        // journalisé, et son absence hors heures ouvrées fait échouer la demande (règle R7).
        reason: context.req.header("x-motif-astreinte") ?? null,
      },
    },
    deps.journal,
    { requestId: context.get("requestId"), target: input.target },
  );

  return decision.allowed ? { ok: true } : { ok: false, response: notFound(context) };
}
