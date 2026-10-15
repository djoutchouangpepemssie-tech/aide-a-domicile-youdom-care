import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/*
 * Les secrets d'authentification : lien magique et code SMS (`ARCHITECTURE.md` §5). Beaucoup de
 * bénéficiaires n'ont pas d'adresse e-mail — le code par SMS n'est pas un repli, c'est un chemin
 * de première classe.
 *
 * Quatre règles tenues ici :
 * 1. le hasard vient de `node:crypto`, jamais de `Math.random` ;
 * 2. la base ne contient **que** l'empreinte du secret. Une copie de la base ne permet pas de se
 *    connecter ;
 * 3. l'empreinte est un HMAC avec un poivre tenu hors base (variable d'environnement) : il faut
 *    les deux pour attaquer un code à six chiffres hors ligne ;
 * 4. la comparaison est à temps constant.
 */

const DIGITS = "0123456789";

/** Jeton de lien magique : 32 octets, URL-sûrs. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Code numérique à usage unique. `randomInt` est uniforme : un tirage modulo 10 sur des octets
 * bruts favoriserait les premiers chiffres, ce qui réduit vraiment l'espace de recherche.
 */
export function randomCode(length = 6): string {
  let code = "";
  for (let index = 0; index < length; index += 1) code += DIGITS[randomInt(DIGITS.length)];
  return code;
}

/** Empreinte stockable d'un secret. Le poivre reste hors de la base. */
export function fingerprint(secret: string, pepper: string): string {
  if (pepper.length < 32) {
    throw new Error("poivre d'authentification trop court : 32 caractères au minimum");
  }
  return createHmac("sha256", pepper).update(secret, "utf8").digest("hex");
}

/** Comparaison à temps constant de deux empreintes. */
export function sameFingerprint(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
