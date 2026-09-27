import type { CommuneRecord } from "@/lib/geo/geo";
import type { IdfDepartment, LeadForm, Urgency } from "./forms";
import { idfDepartments } from "./forms";
import { leadPayloadSchema, type LeadContact, type LeadPayload, type LeadPlanning } from "./schema";
import { track } from "@/lib/mesure/client";
import type { SubmitMeta } from "@/components/forms/MultiStepForm/MultiStepForm";

/*
 * Côté navigateur : construction d'un LeadPayload (docs/05 §7) à partir des réponses d'un
 * formulaire, puis envoi à la route api/lead (P3.9). Le texte de consentement porte une
 * version, enregistrée dans la demande (docs/05 §8).
 */

export const CONSENT_VERSION = "2026-09";

export interface LeadInput {
  form: LeadForm;
  /** Absente seulement pour le formulaire de contact (D-021). */
  commune: CommuneRecord | null;
  contact: LeadContact;
  urgence: Urgency;
  /** true si la personne a coché la case de consentement aux données de santé. */
  consentSante: boolean;
  sourcePage: string;
  pourQui?: string;
  situation?: Record<string, string | string[]>;
  besoins?: string[];
  planning?: LeadPlanning;
  message?: string;
}

/** Chemin de la page d'origine : jamais de paramètres (docs/05 §8). */
export function currentSourcePage(): string {
  if (typeof window === "undefined") return "/";
  try {
    const referrer = document.referrer ? new URL(document.referrer) : null;
    if (referrer && referrer.origin === window.location.origin) return referrer.pathname;
  } catch {
    /* referrer illisible : on retombe sur la page courante */
  }
  return window.location.pathname;
}

function isIdfDepartment(value: string): value is IdfDepartment {
  return (idfDepartments as readonly string[]).includes(value);
}

/** Assemble et valide la demande ; lève une erreur si une règle du schéma n'est pas respectée. */
export function buildLead(input: LeadInput): LeadPayload {
  const { commune } = input;
  if (commune && !isIdfDepartment(commune.departement)) {
    throw new Error(`commune hors Île-de-France : ${commune.code}`);
  }
  const now = new Date().toISOString();
  const place =
    commune && isIdfDepartment(commune.departement)
      ? {
          commune: {
            insee: commune.code,
            nom: commune.nom,
            codePostal: commune.codes_postaux[0] ?? `${commune.departement}000`,
            departement: commune.departement,
          },
          agenceProche: commune.agence ?? "a-determiner",
        }
      : {};
  const lead = {
    id: crypto.randomUUID(),
    createdAt: now,
    form: input.form,
    sourcePage: input.sourcePage,
    ...place,
    urgence: input.urgence,
    ...(input.pourQui !== undefined ? { pourQui: input.pourQui } : {}),
    ...(input.situation !== undefined ? { situation: input.situation } : {}),
    ...(input.besoins !== undefined ? { besoins: input.besoins } : {}),
    ...(input.planning !== undefined ? { planning: input.planning } : {}),
    contact: input.contact,
    ...(input.message !== undefined && input.message.trim() !== ""
      ? { message: input.message }
      : {}),
    consentement: { sante: input.consentSante, date: now, version: CONSENT_VERSION },
  };
  return leadPayloadSchema.parse(lead);
}

export interface SendLeadBody {
  lead: LeadPayload;
  meta: SubmitMeta;
}

/** Envoi à la route api/lead ; lève une erreur si le serveur ne répond pas 2xx. */
export async function sendLead(lead: LeadPayload, meta: SubmitMeta): Promise<void> {
  const body: SendLeadBody = { lead, meta };
  // Barre finale : le site redirige /api/lead vers /api/lead/ (trailingSlash), inutile de la subir.
  const response = await fetch("/api/lead/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`api/lead : ${response.status}`);
  // Mesure (docs/05 §9) : le formulaire et le département, jamais la commune ni la saisie.
  if (lead.form === "rappel") {
    track("rappel_envoye", {});
  } else {
    track("demande_envoyee", {
      formulaire: lead.form,
      ...(lead.commune ? { departement: lead.commune.departement } : {}),
    });
  }
}
