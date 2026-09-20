import { z } from "zod";
import commitmentsJson from "../../content/engagements.json";
import interfaceJson from "../../content/interface.json";
import siteConfigJson from "../../content/site.config.json";
import pricingJson from "../../content/tarifs.json";
import {
  commitmentsSchema,
  interfaceSchema,
  pricingSchema,
  siteConfigSchema,
  type Commitments,
  type InterfaceTexts,
  type Pricing,
  type SiteConfig,
} from "./schemas";

/*
 * Chargeur typé du contenu. Chaque fichier est validé à la première lecture ; une erreur de
 * schéma lève une exception lisible, ce qui fait échouer le build (les pages sont statiques).
 */

function parseContent<T extends z.ZodType>(schema: T, data: unknown, file: string): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`content/${file} est invalide :\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

let siteConfig: SiteConfig | undefined;
let pricing: Pricing | undefined;
let commitments: Commitments | undefined;
let interfaceTexts: InterfaceTexts | undefined;

export function getSiteConfig(): SiteConfig {
  siteConfig ??= parseContent(siteConfigSchema, siteConfigJson, "site.config.json");
  return siteConfig;
}

export function getPricing(): Pricing {
  pricing ??= parseContent(pricingSchema, pricingJson, "tarifs.json");
  return pricing;
}

export function getCommitments(): Commitments {
  commitments ??= parseContent(commitmentsSchema, commitmentsJson, "engagements.json");
  return commitments;
}

export function getInterfaceTexts(): InterfaceTexts {
  interfaceTexts ??= parseContent(interfaceSchema, interfaceJson, "interface.json");
  return interfaceTexts;
}

/** Valide les quatre fichiers d'un coup (utilisé par les contrôles et les tests). */
export function loadAllContent() {
  return {
    siteConfig: getSiteConfig(),
    pricing: getPricing(),
    commitments: getCommitments(),
    interfaceTexts: getInterfaceTexts(),
  };
}
