import type { SubmitMeta } from "@/components/forms/MultiStepForm/MultiStepForm";
import type { CommuneRecord } from "@/lib/geo/geo";
import type { IdfDepartment } from "@/lib/lead/forms";
import { idfDepartments } from "@/lib/lead/forms";
import { track } from "@/lib/mesure/client";
import {
  CANDIDATURE_CONSENT_VERSION,
  candidatureSchema,
  checkCvFile,
  type CandidaturePayload,
  type CvCheck,
} from "./schema";

/*
 * Côté navigateur (docs/05 §2, P8.2) : construction d'une candidature validée par le schéma
 * partagé, contrôle du CV avant envoi (taille, extension, type, quatre premiers octets), puis
 * envoi en `multipart/form-data` à la route api/candidature : les champs en JSON, la méta
 * anti-robots, le fichier tel quel. Le texte de consentement porte une version, enregistrée
 * dans la candidature (docs/05 §8). Rien n'est conservé sur l'appareil après l'envoi.
 */

export const CANDIDATURE_ENDPOINT = "/api/candidature/";

export interface CandidatureInput {
  sourcePage: string;
  offre?: string | undefined;
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
  departement: string;
  commune: CommuneRecord | null;
  disponibilite: string;
  message: string;
}

function isIdfDepartment(value: string): value is IdfDepartment {
  return (idfDepartments as readonly string[]).includes(value);
}

/** Assemble et valide la candidature ; lève une erreur si une règle du schéma n'est pas respectée. */
export function buildCandidature(input: CandidatureInput): CandidaturePayload {
  if (!isIdfDepartment(input.departement)) {
    throw new Error(`département hors Île-de-France : ${input.departement}`);
  }
  const now = new Date().toISOString();
  const commune =
    input.commune && isIdfDepartment(input.commune.departement)
      ? {
          insee: input.commune.code,
          nom: input.commune.nom,
          codePostal: input.commune.codes_postaux[0] ?? `${input.commune.departement}000`,
          departement: input.commune.departement,
        }
      : undefined;
  const message = input.message.trim();
  const candidature = {
    id: crypto.randomUUID(),
    createdAt: now,
    sourcePage: input.sourcePage,
    ...(input.offre ? { offre: input.offre } : {}),
    contact: {
      prenom: input.prenom.trim(),
      nom: input.nom.trim(),
      telephone: input.telephone.trim(),
      email: input.email.trim(),
    },
    departement: input.departement,
    ...(commune ? { commune } : {}),
    disponibilite: input.disponibilite,
    ...(message ? { message } : {}),
    consentement: { accepte: true as const, date: now, version: CANDIDATURE_CONSENT_VERSION },
  };
  return candidatureSchema.parse(candidature);
}

/** Lit les quatre premiers octets et applique les règles du schéma au fichier choisi. */
export async function checkCvInBrowser(file: File | null): Promise<CvCheck> {
  if (!file) return checkCvFile(null);
  let head = new Uint8Array(0);
  try {
    head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  } catch {
    /* fichier illisible : la signature vide est refusée par checkCvFile */
  }
  return checkCvFile({ name: file.name, type: file.type, size: file.size, head });
}

/** Envoi à la route api/candidature ; lève une erreur si le serveur ne répond pas 2xx. */
export async function sendCandidature(
  candidature: CandidaturePayload,
  meta: SubmitMeta,
  cv: File,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const body = new FormData();
  body.set("candidature", JSON.stringify(candidature));
  body.set("meta", JSON.stringify(meta));
  body.set("cv", cv, cv.name);
  const response = await fetchImpl(CANDIDATURE_ENDPOINT, { method: "POST", body });
  if (!response.ok) throw new Error(`api/candidature : ${response.status}`);
  // Mesure (docs/05 §9) : le formulaire et le département souhaité, rien de la saisie.
  track("demande_envoyee", { formulaire: "candidature", departement: candidature.departement });
}
