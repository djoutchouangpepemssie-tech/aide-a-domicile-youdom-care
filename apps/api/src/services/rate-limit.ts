/*
 * Une limite de débit par clé, en mémoire.
 *
 * **Ce qu'elle protège** : la demande de lien magique et la vérification d'un code à six chiffres.
 * Sans elle, un code à six chiffres se casse par force brute malgré la limite d'essais par défi —
 * il suffirait d'en demander mille.
 *
 * **Sa limite, écrite ici pour qu'elle ne surprenne personne** : elle compte dans le processus. Le
 * jour où l'API tourne sur deux instances, chacune aura son compteur, et la limite réelle sera
 * doublée. À ce moment-là, le compteur passe dans la base (ou devant, chez l'hébergeur). C'est
 * acceptable aujourd'hui, et ce ne le sera plus alors.
 */

export type RateLimitVerdict = { allowed: boolean; retryAfterSeconds: number };

export interface RateLimiter {
  take(key: string, now: Date): RateLimitVerdict;
}

export type RateLimitOptions = { max: number; windowMs: number };

export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly options: RateLimitOptions = { max: 5, windowMs: 15 * 60 * 1000 }) {}

  take(key: string, now: Date): RateLimitVerdict {
    const instant = now.getTime();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= instant) {
      this.buckets.set(key, { count: 1, resetAt: instant + this.options.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (bucket.count >= this.options.max) {
      return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - instant) / 1000) };
    }
    bucket.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/** Limiteur ouvert : pour les tests qui ne portent pas sur la limite elle-même. */
export const openRateLimiter: RateLimiter = {
  take: () => ({ allowed: true, retryAfterSeconds: 0 }),
};
