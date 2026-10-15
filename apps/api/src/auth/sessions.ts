import { fingerprint, randomToken, sameFingerprint } from "./secrets";

/*
 * Les sessions, et la décision qui tient la promesse « le retrait d'un droit est immédiat »
 * (`PERMISSIONS.md` §6) : **le jeton ne contient aucun droit**. Il dit qui est connecté, rien de
 * plus. Les droits sont relus à chaque requête (`droits/authorize.ts`).
 *
 * C'est moins astucieux qu'un jeton signé portant ses autorisations, et c'est volontaire : un
 * jeton qui porte ses droits reste valide après le retrait, et il n'existe aucune façon honnête de
 * dire à une famille « votre retrait prendra effet à la prochaine connexion de la personne ».
 *
 * Chaque appareil connecté est un document : la liste est affichable, et la déconnexion à distance
 * est une écriture, pas une incantation.
 */

/** Durée de vie absolue d'une session. Au-delà, on se reconnecte, même actif. */
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Durée d'inactivité tolérée. */
export const SESSION_IDLE_MS = 12 * 60 * 60 * 1000;

/** Le second facteur se redemande après ce délai pour la santé, l'argent et l'accès au logement. */
export const SECOND_FACTOR_MAX_AGE_MS = 60 * 60 * 1000;

export type Session = {
  _id: string;
  memberId: string;
  tokenFingerprint: string;
  device: { label: string; userAgent: string | null; lastIp: string | null };
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedBy: string | null;
  secondFactorAt: Date | null;
};

export type SessionCreation = { session: Session; token: string };

export function createSession(input: {
  id: string;
  memberId: string;
  now: Date;
  pepper: string;
  device: { label: string; userAgent?: string | null; lastIp?: string | null };
  secondFactorAt?: Date | null;
}): SessionCreation {
  const token = randomToken(32);
  return {
    token,
    session: {
      _id: input.id,
      memberId: input.memberId,
      tokenFingerprint: fingerprint(token, input.pepper),
      device: {
        label: input.device.label,
        userAgent: input.device.userAgent ?? null,
        lastIp: input.device.lastIp ?? null,
      },
      createdAt: input.now,
      lastSeenAt: input.now,
      expiresAt: new Date(input.now.getTime() + SESSION_MAX_AGE_MS),
      revokedAt: null,
      revokedBy: null,
      secondFactorAt: input.secondFactorAt ?? null,
    },
  };
}

export type SessionFailure = "revoquee" | "expiree" | "inactive" | "invalide";

export type SessionVerdict =
  | { ok: true; session: Session; secondFactorPresented: boolean }
  | { ok: false; failure: SessionFailure };

export function verifySession(
  session: Session,
  presentedToken: string,
  now: Date,
  pepper: string,
): SessionVerdict {
  if (!sameFingerprint(session.tokenFingerprint, fingerprint(presentedToken, pepper))) {
    return { ok: false, failure: "invalide" };
  }
  if (session.revokedAt) return { ok: false, failure: "revoquee" };
  if (session.expiresAt.getTime() <= now.getTime()) return { ok: false, failure: "expiree" };
  if (now.getTime() - session.lastSeenAt.getTime() > SESSION_IDLE_MS) {
    return { ok: false, failure: "inactive" };
  }
  const secondFactorPresented = Boolean(
    session.secondFactorAt &&
    now.getTime() - session.secondFactorAt.getTime() <= SECOND_FACTOR_MAX_AGE_MS,
  );
  return {
    ok: true,
    session: { ...session, lastSeenAt: now },
    secondFactorPresented,
  };
}

/** Déconnexion : d'un appareil, par son propriétaire ou par l'agence. */
export function revokeSession(session: Session, now: Date, by: string | null): Session {
  return session.revokedAt ? session : { ...session, revokedAt: now, revokedBy: by };
}
