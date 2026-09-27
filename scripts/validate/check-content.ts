import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  listArticleFiles,
  listAuthorFiles,
  readArticleMeta,
  readAuthor,
} from "../../src/content/article-meta";
import { findSharedSpellings, listLexiqueFiles, readLexiqueTerm } from "../../src/content/lexique";
import { lexiquePageSchema, type LexiqueTerm } from "../../src/content/lexique-schema";
import { editorialCharterSchema, magazinePageSchema } from "../../src/content/magazine-schema";
import { isOfferLive, listOfferFiles, offerSeo, readOffer } from "../../src/content/offres";
import { readServiceMeta } from "../../src/content/service-meta";
import {
  conditionsGeneralesSchema,
  cookiesSchema,
  mentionsLegalesSchema,
  politiqueConfidentialiteSchema,
} from "../../src/content/legal-schema";
import { toolPageSchema, toolsPageSchema } from "../../src/content/tools-schema";
import {
  aboutSchema,
  agenciesPageSchema,
  regionPageSchema,
  thanksSchema,
  callbackPageSchema,
  requestIndexSchema,
  specialFormsSchema,
  emailsSchema,
  formDefinitionSchema,
  aidPageSchema,
  aidsSchema,
  commitmentsSchema,
  jobOfferSchema,
  professionalsPageSchema,
  recruitmentPageSchema,
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
  type InterfaceTexts,
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
  "pages/merci.json": thanksSchema,
  "pages/etre-rappele.json": callbackPageSchema,
  "pages/demande.json": requestIndexSchema,
  "pages/formulaires-speciaux.json": specialFormsSchema,
  "pages/aide-a-domicile.json": regionPageSchema,
  "pages/agences.json": agenciesPageSchema,
  "pages/magazine.json": magazinePageSchema,
  "pages/charte-editoriale.json": editorialCharterSchema,
  "pages/lexique.json": lexiquePageSchema,
  // Professionnels et recrutement (docs/03 §9, P8.1 et P8.2).
  "pages/professionnels.json": professionalsPageSchema,
  "pages/recrutement.json": recruitmentPageSchema,
  "emails.json": emailsSchema,
  "formulaires/neuro.json": formDefinitionSchema,
  "formulaires/personne-agee.json": formDefinitionSchema,
  "formulaires/adulte-handicap.json": formDefinitionSchema,
  "formulaires/enfant-handicap.json": formDefinitionSchema,
  "formulaires/aidant.json": formDefinitionSchema,
  "formulaires/nuit-24h.json": formDefinitionSchema,
  "aides.json": aidsSchema,
  "aides/credit-d-impot-et-avance-immediate.json": aidPageSchema,
  "aides/apa.json": aidPageSchema,
  "aides/pch.json": aidPageSchema,
  "aides/aeeh.json": aidPageSchema,
  "aides/cesu.json": aidPageSchema,
  "aides/aides-apres-hospitalisation.json": aidPageSchema,
  // Outils à imprimer (docs/06 §7, P7.7).
  "pages/outils.json": toolsPageSchema,
  "outils/sortie-d-hospitalisation-48-heures.json": toolPageSchema,
  "outils/fiche-de-vie-enfant.json": toolPageSchema,
  "outils/fiche-de-vie-personne-agee.json": toolPageSchema,
  "outils/tour-du-logement-anti-chutes.json": toolPageSchema,
  "outils/aides-en-un-coup-d-oeil.json": toolPageSchema,
  // Pages légales (docs/07 §2, P8.3).
  "legal/mentions-legales.json": mentionsLegalesSchema,
  "legal/politique-de-confidentialite.json": politiqueConfidentialiteSchema,
  "legal/cookies.json": cookiesSchema,
  "legal/conditions-generales.json": conditionsGeneralesSchema,
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

async function listMdx(dir: string): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listMdx(full)));
    else if (entry.name.endsWith(".mdx")) out.push(full);
  }
  return out.sort();
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

  // Pages services et pathologies (content/services/**/*.mdx) : en-tête validé, page non relue
  // signalée (masquée en production, docs/03 §1).
  const warnings: string[] = [];
  const servicesDir = path.join(ctx.rootDir, "content", "services");
  for (const file of await listMdx(servicesDir)) {
    const relative = path.relative(ctx.rootDir, file).split(path.sep).join("/");
    try {
      const { meta } = await readServiceMeta(file);
      if (meta.statut === "a_relire") {
        warnings.push(`${relative} : statut a_relire, page non construite en production.`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${relative} : ${String(error)}`);
    }
  }

  // Articles du Fil (content/magazine/*.mdx, docs/06) : en-tête validé et corps borné aux
  // composants autorisés ; un article invalide est une erreur ici (le chargeur, lui, l’ignore
  // avec un avertissement pour ne jamais casser le build). Statuts : brouillon jamais construit,
  // a_relire non construit en production ; en production, un sujet de santé publié sans
  // relecteur est refusé par le schéma lui-même.
  for (const file of await listArticleFiles(path.join(ctx.rootDir, "content", "magazine"))) {
    const relative = path.relative(ctx.rootDir, file).split(path.sep).join("/");
    try {
      const article = await readArticleMeta(file);
      if (article.meta.statut === "brouillon") {
        warnings.push(`${relative} : statut brouillon, article jamais construit.`);
      } else if (article.meta.statut === "a_relire") {
        warnings.push(`${relative} : statut a_relire, article non construit en production.`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${relative} : ${String(error)}`);
    }
  }
  // Fiches auteurs (content/auteurs/*.json) : validées quand il en existe.
  for (const file of await listAuthorFiles(path.join(ctx.rootDir, "content", "auteurs"))) {
    const relative = path.relative(ctx.rootDir, file).split(path.sep).join("/");
    try {
      await readAuthor(file);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${relative} : ${String(error)}`);
    }
  }

  // Lexique (content/lexique/*.json, docs/06 §6, P7.2) : chaque terme validé (120 à 250 mots,
  // slug = nom du fichier), aucune graphie partagée par deux termes (lien automatique ambigu).
  const lexiqueTerms: LexiqueTerm[] = [];
  for (const file of await listLexiqueFiles(path.join(ctx.rootDir, "content", "lexique"))) {
    try {
      lexiqueTerms.push(await readLexiqueTerm(file));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  for (const shared of findSharedSpellings(lexiqueTerms)) {
    errors.push(`content/lexique : graphie partagée par deux termes : ${shared}`);
  }

  // Offres d'emploi (content/offres/*.json, docs/03 §9, P8.2) : chaque offre chargeable validée
  // (slug = nom du fichier, agence connue), brouillon ou expirée signalée ; une offre publiée doit
  // avoir des balises titre et description dans les bornes de docs/01 §8 (écrites ou composées).
  // Le modèle `_exemple.json` n'est jamais chargé mais doit rester conforme au schéma.
  const offersDir = path.join(ctx.rootDir, "content", "offres");
  const siteConfig = parsed["site.config.json"] as SiteConfig | undefined;
  const interfaceTexts = parsed["interface.json"] as InterfaceTexts | undefined;
  for (const file of await listOfferFiles(offersDir)) {
    const relative = path.relative(ctx.rootDir, file).split(path.sep).join("/");
    try {
      const offer = await readOffer(file);
      const agency = siteConfig?.agences.find((a) => a.id === offer.lieu);
      if (!agency) {
        errors.push(`${relative} : lieu « ${offer.lieu} » inconnu de site.config.json.`);
      } else if (interfaceTexts && offer.statut === "publiee") {
        const seo = offerSeo(offer, agency, interfaceTexts.recrutement);
        if (seo.titre.length < 50 || seo.titre.length > 60) {
          errors.push(
            `${relative} : balise titre hors 50–60 caractères (${seo.titre.length}) : écrire seo.titre.`,
          );
        }
        if (seo.description.length < 140 || seo.description.length > 155) {
          errors.push(
            `${relative} : description hors 140–155 caractères (${seo.description.length}) : écrire seo.description.`,
          );
        }
      }
      if (offer.statut === "brouillon") {
        warnings.push(`${relative} : statut brouillon, offre jamais construite.`);
      } else if (!isOfferLive(offer)) {
        warnings.push(
          `${relative} : validité dépassée (${offer.valable_jusqu_au}), offre retirée du site.`,
        );
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${relative} : ${String(error)}`);
    }
  }
  try {
    const example = await readFile(path.join(offersDir, "_exemple.json"), "utf8");
    const outcome = jobOfferSchema.safeParse(JSON.parse(example));
    if (!outcome.success) {
      errors.push(`offres/_exemple.json :
${z.prettifyError(outcome.error)}`);
    }
  } catch (error) {
    errors.push(
      `offres/_exemple.json : illisible (${error instanceof Error ? error.message : String(error)}).`,
    );
  }

  if (errors.length > 0 || !ctx.prod) {
    return result(errors, warnings);
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
