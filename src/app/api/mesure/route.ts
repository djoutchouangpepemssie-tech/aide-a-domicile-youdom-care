import { clientIp, originAllowed } from "@/lib/http/request";
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
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_MESURE_BODY_BYTES) return new Response(null, { status: 413 });
  const raw = await request.text();
  if (raw.length > MAX_MESURE_BODY_BYTES) return new Response(null, { status: 413 });

  const status = await handleMesure(raw, {
    env: process.env as MesureServerEnv,
    limiter,
    ip: clientIp(request),
  });
  return new Response(null, { status });
}
