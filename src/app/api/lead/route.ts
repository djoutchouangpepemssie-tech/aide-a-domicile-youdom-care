import { NextResponse } from "next/server";
import { getCommitments, getEmailTexts, getInterfaceTexts, getSiteConfig } from "@/content/loader";
import { isProduction } from "@/lib/env";
import {
  createRateLimiter,
  handleLead,
  MAX_BODY_BYTES,
  type LeadServerEnv,
} from "@/lib/lead/server";
import { mailerFromEnv } from "@/lib/mail/transport";
import { formatFrenchPhone } from "@/lib/phone";

/*
 * POST /api/lead (docs/07 §6) : méthode POST seulement (les autres reçoivent 405 de Next),
 * contrôle d'origine, taille limitée, puis traitement par src/lib/lead/server.ts. Aucune
 * journalisation du contenu.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// LEAD_RATE_LIMIT : envois par adresse et par dix minutes (5 par défaut ; élevé pour les tests).
const limiter = createRateLimiter(Number(process.env.LEAD_RATE_LIMIT ?? "") || 5);

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

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "inconnue";
}

function callbackDelay(): string | null {
  const { contact } = getSiteConfig();
  const e5 = getCommitments().engagements.find((e) => e.code === "E5");
  const allowed = contact.delai_rappel !== null && (!isProduction() || e5?.valide === true);
  return allowed ? contact.delai_rappel : null;
}

export async function POST(request: Request) {
  if (!originAllowed(request)) {
    return NextResponse.json({ ok: false, erreur: "origine refusée" }, { status: 403 });
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, erreur: "demande trop volumineuse" }, { status: 413 });
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, erreur: "demande trop volumineuse" }, { status: 413 });
  }
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, erreur: "demande invalide" }, { status: 400 });
  }

  const { contact, agences } = getSiteConfig();
  const texts = getInterfaceTexts();
  const result = await handleLead(input, {
    mailer: mailerFromEnv(),
    render: {
      emails: getEmailTexts(),
      interfaceTexts: texts,
      phone: contact.telephone_principal ? formatFrenchPhone(contact.telephone_principal) : null,
      callbackDelay: callbackDelay(),
      agencies: Object.fromEntries(agences.map((a) => [a.id, a.nom])),
    },
    env: process.env as LeadServerEnv,
    limiter,
    ip: clientIp(request),
  });
  return NextResponse.json(result.body, { status: result.status });
}
