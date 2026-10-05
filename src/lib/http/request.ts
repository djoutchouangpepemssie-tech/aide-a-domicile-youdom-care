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

/**
 * Lit le corps d'une requête en bornant la mémoire : la lecture s'arrête dès que `maxBytes` est
 * dépassé et renvoie `null`, le flux restant est annulé. Un en-tête `content-length` qui annonce
 * déjà trop gros évite même d'ouvrir le flux ; son absence (requête découpée en morceaux) ne
 * contourne plus le plafond, contrairement à un contrôle fondé sur le seul en-tête.
 */
export async function readBodyLimited(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) return null;

  const body = request.body;
  if (!body) {
    const bytes = new Uint8Array(await request.arrayBuffer());
    return bytes.byteLength > maxBytes ? null : bytes;
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* flux déjà annulé : rien à relâcher */
    }
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/** Corps borné décodé en texte ; `null` si le plafond est dépassé. */
export async function readTextLimited(request: Request, maxBytes: number): Promise<string | null> {
  const bytes = await readBodyLimited(request, maxBytes);
  return bytes === null ? null : new TextDecoder().decode(bytes);
}
