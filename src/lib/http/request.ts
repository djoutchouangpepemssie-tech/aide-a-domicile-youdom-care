/*
 * Contrôles communs aux routes de première partie (api/lead, api/mesure ; docs/07 §6) : origine
 * de la requête et adresse du client pour la limitation de débit.
 */

/** Origine acceptée : celle de la requête elle-même (même hôte) ou l'adresse publique du site. */
export function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const own = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (own && host === own) return true;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try {
      if (new URL(site).host === host) return true;
    } catch {
      /* adresse publique mal formée : on ignore */
    }
  }
  return false;
}

/** Adresse du client telle que transmise par l'hébergeur ; « inconnue » sinon. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "inconnue";
}
