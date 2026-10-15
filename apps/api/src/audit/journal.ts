import { auditEventSchema, type AuditEvent } from "../domaine/schemas";
import {
  authorize,
  type AuthorizationContext,
  type AuthorizationRequest,
  type Decision,
} from "../droits/authorize";

/*
 * Le journal d'audit. Trois propriétés qui ne se négocient pas :
 *
 * 1. **ajout seul** : l'interface n'expose ni modification ni suppression. Une correction est un
 *    nouvel événement. Côté MongoDB, l'utilisateur applicatif n'a que `insert` et `find` sur la
 *    collection (`db/collections.ts`).
 * 2. **les refus aussi** : une tentative d'accès par lien direct est une information utile au
 *    bénéficiaire (parcours critique n° 4 du cahier). Un journal qui ne garde que les succès ne
 *    sert qu'à se rassurer.
 * 3. **jamais le contenu** : on écrit qui, quand, quoi, et le résultat. Jamais la note de santé
 *    consultée. Le journal lui-même ne doit pas devenir une base de données de santé.
 */

export interface AuditJournal {
  append(event: AuditEvent): Promise<void>;
}

/** Journal en mémoire : pour les tests, et pour le développement local sans base. */
export class MemoryAuditJournal implements AuditJournal {
  private readonly events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<void> {
    // La validation passe par le schéma : un événement mal formé doit échouer à l'écriture,
    // pas être découvert six mois plus tard dans un export.
    this.events.push(auditEventSchema.parse(event));
  }

  /** Lecture réservée aux tests et à l'écran « Qui a consulté mon dossier ? ». */
  all(): readonly AuditEvent[] {
    return [...this.events];
  }
}

export type AuditMeta = { target?: string | null; requestId?: string | null };

/**
 * Autorise **et** journalise. C'est la seule porte que les routes doivent appeler : appeler
 * `authorize` directement laisse un trou dans le journal, et un trou dans le journal est une
 * promesse rompue envers le bénéficiaire.
 */
export async function authorizeAndLog(
  request: AuthorizationRequest,
  context: AuthorizationContext,
  journal: AuditJournal,
  meta: AuditMeta = {},
): Promise<Decision> {
  const decision = authorize(request, context);
  await journal.append(
    auditEventSchema.parse({
      at: context.now,
      actorId: request.memberId,
      actorRole: context.membership?.role ?? null,
      householdId: request.householdId,
      action: request.action,
      module: request.module,
      target: meta.target ?? request.target ?? null,
      outcome: decision.allowed ? "autorise" : "refuse",
      reason: decision.allowed ? null : decision.reason,
      requestId: meta.requestId ?? null,
    }),
  );
  return decision;
}
