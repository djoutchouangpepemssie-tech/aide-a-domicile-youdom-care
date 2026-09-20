import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  aboutSchema,
  aidPageSchema,
  aidsSchema,
  commitmentsSchema,
  homePageSchema,
  howItWorksSchema,
  interfaceSchema,
  modesPageSchema,
  navigationSchema,
  pricingPageSchema,
  pricingSchema,
  siteConfigSchema,
  weekExamplesSchema,
  type Commitments,
  type Pricing,
  type SiteConfig,
} from "../../src/content/schemas";
import { result, type Check, type CheckContext, type CheckResult } from "./types";

const files = {
  "site.config.json": siteConfigSchema,
  "tarifs.json": pricingSchema,
  "engagements.json": commitmentsSchema,
  "interface.json": interfaceSchema,
  "navigation.json": navigationSchema,
  "semaines-types.json": weekExamplesSchema,
  "pages/accueil.json": homePageSchema,
  "pages/comment-ca-marche.json": howItWorksSchema,
  "pages/prestataire-ou-mandataire.json": modesPageSchema,
  "pages/tarifs-et-aides.json": pricingPageSchema,
  "pages/a-propos.json": aboutSchema,
  "aides.json": aidsSchema,
  "aides/credit-d-impot-et-avance-immediate.json": aidPageSchema,
  "aides/apa.json": aidPageSchema,
  "aides/pch.json": aidPageSchema,
  "aides/aeeh.json": aidPageSchema,
  "aides/cesu.json": aidPageSchema,
  "aides/aides-apres-hospitalisation.json": aidPageSchema,
} as const;

export interface LoadedContent {
  siteConfig: SiteConfig;
  pricing: Pricing;
  commitments: Commitments;
}

/** Champs de `legal` exigés par docs/07 §2 pour les mentions légales. */
const requiredLegalFields = [
  "raison_sociale",
  "forme_juridique",
  "capital",
  "siege_social",
  "rcs",
  "siret",
  "tva_intracommunautaire",
  "numero_sap",
  "directeur_publication",
  "mediateur_consommation",
] as const;

/** Règles du mode production (docs/07 §7), appliquées à un contenu déjà valide. */
export function collectProdErrors({ siteConfig, pricing, commitments }: LoadedContent): string[] {
  const errors: string[] = [];

  if (pricing.prestations.length === 0) {
    errors.push("tarifs.json : aucune prestation renseignée (Q-TARIFS-1).");
  }
  for (const p of pricing.prestations) {
    if (p.prix_ttc === null || p.prix_ht === null) {
      errors.push(`tarifs.json : prestation « ${p.id} » sans prix TTC et HT.`);
    }
  }
  for (const f of pricing.forfaits) {
    if (f.prix_ttc === null || f.prix_ht === null) {
      errors.push(`tarifs.json : forfait « ${f.id} » sans prix TTC et HT.`);
    }
  }
  if (pricing.date_application === null && pricing.prestations.length > 0) {
    errors.push("tarifs.json : date_application manquante.");
  }

  for (const field of requiredLegalFields) {
    if (siteConfig.legal[field] === null) {
      errors.push(`site.config.json : legal.${field} est null (Q-ID-2).`);
    }
  }
  if (siteConfig.legal.hebergeur.adresse === null || siteConfig.legal.hebergeur.contact === null) {
    errors.push("site.config.json : legal.hebergeur incomplet (adresse, contact).");
  }
  if (siteConfig.contact.telephone_principal === null || siteConfig.contact.email === null) {
    errors.push(
      "site.config.json : contact.telephone_principal et contact.email sont obligatoires.",
    );
  }
  if (siteConfig.a_confirmer.length > 0) {
    errors.push(
      `site.config.json : a_confirmer contient encore ${siteConfig.a_confirmer.length} élément(s) (Q-ID-1).`,
    );
  }

  for (const e of commitments.engagements) {
    if (e.texte !== null && !e.valide) {
      errors.push(`engagements.json : ${e.code} a un texte mais valide vaut false.`);
    }
  }
  for (const j of commitments.suivi.jalons) {
    if (j.texte !== null && !j.valide) {
      errors.push(`engagements.json : jalon « ${j.moment} » a un texte mais valide vaut false.`);
    }
  }

  return errors;
}

async function readJson(rootDir: string, file: string): Promise<unknown> {
  const raw = await readFile(path.join(rootDir, "content", file), "utf8");
  return JSON.parse(raw) as unknown;
}

export async function runContentCheck(ctx: CheckContext): Promise<CheckResult> {
  const errors: string[] = [];
  const parsed: Partial<Record<keyof typeof files, unknown>> = {};

  for (const [file, schema] of Object.entries(files) as [keyof typeof files, z.ZodType][]) {
    let data: unknown;
    try {
      data = await readJson(ctx.rootDir, file);
    } catch (error) {
      errors.push(
        `${file} : illisible (${error instanceof Error ? error.message : String(error)}).`,
      );
      continue;
    }
    const outcome = schema.safeParse(data);
    if (!outcome.success) {
      errors.push(`${file} :\n${z.prettifyError(outcome.error)}`);
      continue;
    }
    parsed[file] = outcome.data;
  }

  if (errors.length > 0 || !ctx.prod) {
    return result(errors);
  }

  return result(
    collectProdErrors({
      siteConfig: parsed["site.config.json"] as SiteConfig,
      pricing: parsed["tarifs.json"] as Pricing,
      commitments: parsed["engagements.json"] as Commitments,
    }),
  );
}

export const checkContent: Check = {
  id: "check-content",
  description:
    "un fichier de content/ ne respecte pas son schéma Zod ; en production : tarifs vides, champ légal null, a_confirmer non vide, engagement affiché non validé",
  run: runContentCheck,
};
