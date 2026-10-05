import { clientIp, originAllowed, readTextLimited } from "@/lib/http/request";
import {
  createForgetfulRateLimiter,
  handleMesure,
  MAX_MESURE_BODY_BYTES,
  type MesureServerEnv,
} from "@/lib/mesure/server";

/*
 * POST /api/mesure (D-029, docs/07 §6) : méthode POST seulement (les autres reçoivent 405 de Next),
 * contrôle d'origine, corps de 2 Ko au plus, puis traitement par src/lib/mesure/server.ts. La
 * route ne stocke rien, ne journalise rien et ne répond jamais avec un corps.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createForgetfulRateLimiter(
  Number(process.env.MESURE_RATE_LIMIT ?? "") || undefined,
);

export async function POST(request: Request) {
  if (!originAllowed(request)) return new Response(null, { status: 403 });
  // Lecture bornée : le corps n'entre en mémoire que jusqu'au plafond, même sans content-length.
  const raw = await readTextLimited(request, MAX_MESURE_BODY_BYTES);
  if (raw === null) return new Response(null, { status: 413 });

  const status = await handleMesure(raw, {
    env: process.env as MesureServerEnv,
    limiter,
    ip: clientIp(request),
  });
  return new Response(null, { status });
}
