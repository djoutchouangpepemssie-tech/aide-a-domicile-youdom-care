import { fingerprint, randomCode, randomToken, sameFingerprint } from "./secrets";

/*
 * Un défi d'authentification : un lien magique envoyé par e-mail, ou un code à six chiffres envoyé
 * par SMS. Le cycle de vie est volontairement pauvre — créer, vérifier une fois, oublier.
 *
 * Ce qui rend un code à six chiffres acceptable n'est pas sa longueur, c'est tout le reste : une
 * durée courte, un usage unique, un nombre d'essais borné, et une empreinte poivrée en base. Sans
 * ces quatre points, six chiffres se devinent.
 */

export const CHALLENGE_KINDS = ["lien_magique", "code_sms"] as const;
export type ChallengeKind = (typeof CHALLENGE_KINDS)[number];

export const CHALLENGE_TTL_MS: Record<ChallengeKind, number> = {
  // Un lien reste dans une boîte aux lettres : il expire vite.
  lien_magique: 15 * 60 * 1000,
  // Un SMS peut arriver avec du retard sur un réseau chargé.
  code_sms: 10 * 60 * 1000,
};

export const MAX_ATTEMPTS = 5;

export type Challenge = {
  _id: string;
  memberId: string;
  kind: ChallengeKind;
  /** Empreinte poivrée du secret. Le secret lui-même n'est jamais stocké. */
  secretFingerprint: string;
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
  /** D'où venait la demande : utile au journal, jamais à l'autorisation. */
  requestedFrom: string | null;
};

export type ChallengeCreation = { challenge: Challenge; secret: string };

export function createChallenge(input: {
  id: string;
  memberId: string;
  kind: ChallengeKind;
  now: Date;
  pepper: string;
  requestedFrom?: string | null;
}): ChallengeCreation {
  const secret = input.kind === "code_sms" ? randomCode(6) : randomToken(32);
  return {
    secret,
    challenge: {
      _id: input.id,
      memberId: input.memberId,
      kind: input.kind,
      secretFingerprint: fingerprint(secret, input.pepper),
      attempts: 0,
      createdAt: input.now,
      expiresAt: new Date(input.now.getTime() + CHALLENGE_TTL_MS[input.kind]),
      consumedAt: null,
      requestedFrom: input.requestedFrom ?? null,
    },
  };
}

export type ChallengeFailure = "expire" | "deja_utilise" | "trop_d_essais" | "invalide";

export type ChallengeVerdict =
  | { ok: true; challenge: Challenge }
  | { ok: false; failure: ChallengeFailure; challenge: Challenge };

/**
 * Vérifie un secret présenté. Renvoie toujours la version à écrire du défi : un essai raté se
 * compte, sinon la limite ne veut rien dire.
 */
export function verifyChallenge(
  challenge: Challenge,
  presented: string,
  now: Date,
  pepper: string,
): ChallengeVerdict {
  if (challenge.consumedAt) return { ok: false, failure: "deja_utilise", challenge };
  if (challenge.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, failure: "expire", challenge };
  }
  if (challenge.attempts >= MAX_ATTEMPTS) {
    return { ok: false, failure: "trop_d_essais", challenge };
  }

  const matches = sameFingerprint(challenge.secretFingerprint, fingerprint(presented, pepper));
  if (!matches) {
    return {
      ok: false,
      failure: "invalide",
      challenge: { ...challenge, attempts: challenge.attempts + 1 },
    };
  }
  return {
    ok: true,
    challenge: { ...challenge, consumedAt: now, attempts: challenge.attempts + 1 },
  };
}
