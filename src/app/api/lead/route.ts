import { NextResponse } from "next/server";
import { situationQuestionLabels } from "@/content/form-definitions";
import { getCommitments, getEmailTexts, getInterfaceTexts, getSiteConfig } from "@/content/loader";
import { isProduction } from "@/lib/env";
import { clientIp, originAllowed, readTextLimited } from "@/lib/http/request";
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

// Contrôle d'origine et adresse du client : partagés avec api/mesure (src/lib/http/request.ts).
export { originAllowed };

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
  // Lecture bornée : le corps n'entre en mémoire que jusqu'au plafond, même sans content-length.
  const raw = await readTextLimited(request, MAX_BODY_BYTES);
  if (raw === null) {
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
      // Intitulés réels des questions, pour que l'e-mail n'affiche aucune clé technique.
      questionLabels: situationQuestionLabels,
    },
    env: process.env as LeadServerEnv,
    limiter,
    ip: clientIp(request),
  });
  return NextResponse.json(result.body, { status: result.status });
}
