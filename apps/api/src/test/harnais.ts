import { createSession } from "../auth/sessions";
import { newId } from "../domaine/ids";
import { defaultGrants } from "../domaine/roles";
import { accessGrantSchema } from "../domaine/schemas";
import { RecordingNotifier } from "../services/notifier";
import { openRateLimiter, type RateLimiter } from "../services/rate-limit";
import { MemoryDatabase } from "../store/memory";
import { RepositoryAuthorizationStore } from "../store/repositories";
import { membership } from "./fixtures";
import { createApp } from "../http/app";
import type { ApiDeps } from "../http/types";

/*
 * Le banc d'essai des surfaces HTTP : une base en mémoire qui valide chaque écriture avec les
 * schémas de la vraie base, une horloge qu'on avance à la main, et de quoi connecter un membre.
 * Partagé par les tests des quatre surfaces — un seul endroit à corriger quand les dépendances
 * changent.
 */

export const PEPPER = "un-poivre-de-tests-suffisamment-long-0123456789";
export const ORIGINE = "https://mon.youdom-care.fr";

export type Harness = {
  app: ReturnType<typeof createApp>;
  db: MemoryDatabase;
  now: Date;
  avancer: (ms: number) => void;
  connecter: (memberId: string, options?: { secondFacteur?: boolean }) => Promise<string>;
};

export function harnais(rateLimiter: RateLimiter = openRateLimiter): Harness {
  const db = new MemoryDatabase();
  const repositories = db.repositories;
  let maintenant = new Date("2026-10-19T10:00:00.000Z"); // un lundi, heures ouvrées
  const deps: ApiDeps = {
    repositories,
    authorization: new RepositoryAuthorizationStore(repositories),
    journal: db.journal,
    auditReader: db.auditReader,
    notifier: new RecordingNotifier(),
    rateLimiter,
    now: () => maintenant,
    newId,
    pepper: PEPPER,
    allowedOrigins: [ORIGINE],
  };

  return {
    app: createApp(deps),
    db,
    get now() {
      return maintenant;
    },
    avancer: (ms) => {
      maintenant = new Date(maintenant.getTime() + ms);
    },
    connecter: async (memberId, options) => {
      const { session, token } = createSession({
        id: newId(),
        memberId,
        now: maintenant,
        pepper: PEPPER,
        device: { label: "test" },
        secondFactorAt: options?.secondFacteur ? maintenant : null,
      });
      await repositories.sessions.insert(session);
      return token;
    },
  };
}

export async function membre(
  h: Harness,
  input: { email?: string; phone?: string; nom?: string } = {},
): Promise<string> {
  const id = newId();
  await h.db.repositories.members.insert({
    _id: id,
    // Un membre a besoin d'une adresse ou d'un numéro : le schéma l'exige, et les tests aussi.
    email: input.email ?? (input.phone ? null : `membre-${id}@exemple.fr`),
    phone: input.phone ?? null,
    displayName: input.nom ?? "Claire",
    prefs: { displayMode: "complet", notifications: ["email"] },
    createdAt: h.now,
  });
  return id;
}

export async function rattacher(
  h: Harness,
  input: { memberId: string; householdId: string; role: Parameters<typeof defaultGrants>[0] },
): Promise<void> {
  await h.db.repositories.memberships.insert(
    membership({ memberId: input.memberId, householdId: input.householdId, role: input.role }),
  );
  await h.db.repositories.grants.insertMany(
    defaultGrants(input.role).map((entry) =>
      accessGrantSchema.parse({
        _id: newId(),
        memberId: input.memberId,
        householdId: input.householdId,
        module: entry.module,
        actions: entry.actions,
        grantedBy: newId(),
        reason: null,
        startsAt: new Date(h.now.getTime() - 1000),
        endsAt: null,
        revokedAt: null,
        createdAt: h.now,
      }),
    ),
  );
}

export const auth = (token: string) => ({ authorization: `Bearer ${token}` });
