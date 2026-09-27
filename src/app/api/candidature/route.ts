import { NextResponse } from "next/server";
import { getEmailTexts, getInterfaceTexts, getSiteConfig } from "@/content/loader";
import { listLiveOffers } from "@/content/offres";
import { CANDIDATURE_MAX_BODY_BYTES, CV_MAX_BYTES } from "@/lib/candidature/schema";
import {
  handleCandidature,
  type CandidatureFile,
  type CandidatureServerEnv,
} from "@/lib/candidature/server";
import { clientIp, originAllowed } from "@/lib/http/request";
import { createRateLimiter } from "@/lib/lead/server";
import { mailerFromEnv } from "@/lib/mail/transport";
import { formatFrenchPhone } from "@/lib/phone";

/*
 * POST /api/candidature (docs/05 §2 et §6 à §8, docs/07 §6) : méthode POST seulement (les autres
 * reçoivent 405 de Next), contrôle d'origine, corps `multipart/form-data` de 6 Mo au plus (le CV
 * de 5 Mo et les champs), puis traitement par src/lib/candidature/server.ts : validation Zod,
 * contrôle du CV (taille, type MIME, extension, signature), anti-robots, e-mail à l'équipe avec
 * le CV joint, accusé de réception. Rien n'est stocké, rien du contenu n'est journalisé ; sans
 * messagerie configurée, 503.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// LEAD_RATE_LIMIT : envois par adresse et par dix minutes (5 par défaut ; élevé pour les tests).
const limiter = createRateLimiter(Number(process.env.LEAD_RATE_LIMIT ?? "") || 5);

const tooLarge = () =>
  NextResponse.json({ ok: false, erreur: "candidature trop volumineuse" }, { status: 413 });
const invalid = () =>
  NextResponse.json({ ok: false, erreur: "candidature invalide" }, { status: 400 });

function parseJson(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || value.length > 16 * 1024) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

async function readFile(value: FormDataEntryValue | null): Promise<CandidatureFile | null> {
  if (!(value instanceof File)) return null;
  // Un fichier trop lourd n'est pas lu en mémoire : la taille annoncée suffit à le refuser.
  if (value.size > CV_MAX_BYTES) {
    return { name: value.name, type: value.type, size: value.size, bytes: Buffer.alloc(0) };
  }
  const bytes = Buffer.from(await value.arrayBuffer());
  return { name: value.name, type: value.type, size: bytes.length, bytes };
}

export async function POST(request: Request) {
  if (!originAllowed(request)) {
    return NextResponse.json({ ok: false, erreur: "origine refusée" }, { status: 403 });
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > CANDIDATURE_MAX_BODY_BYTES) return tooLarge();
  if (!(request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    return invalid();
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return invalid();
  }
  const fields = parseJson(form.get("candidature"));
  const meta = parseJson(form.get("meta"));
  if (fields === undefined || meta === undefined) return invalid();
  const file = await readFile(form.get("cv"));

  const { contact, zones } = getSiteConfig();
  const texts = getInterfaceTexts();
  const offers = await listLiveOffers();
  const result = await handleCandidature(
    { fields, meta, file },
    {
      mailer: mailerFromEnv(),
      render: {
        emails: getEmailTexts(),
        interfaceTexts: texts,
        phone: contact.telephone_principal ? formatFrenchPhone(contact.telephone_principal) : null,
        departements: Object.fromEntries(zones.map((zone) => [zone.code, zone.nom])),
        offres: Object.fromEntries(offers.map((o) => [o.offer.slug, o.offer.titre])),
      },
      env: process.env as CandidatureServerEnv,
      limiter,
      ip: clientIp(request),
    },
  );
  return NextResponse.json(result.body, { status: result.status });
}
