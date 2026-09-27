import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { getSiteConfig } from "./loader";
import { jobOfferSchema, type Agency, type JobOffer } from "./schemas";

/*
 * Offres d'emploi (docs/03 §9, docs/04 §2 `JobPosting`, P8.2) : un fichier content/offres/{slug}.json
 * par offre réelle, validé par `jobOfferSchema`. Les fichiers dont le nom commence par « _ »
 * (`_exemple.json`) documentent le format et ne sont jamais chargés. Une offre n'est construite
 * que si son statut vaut `publiee` et si sa date de validité n'est pas passée : un `JobPosting`
 * expiré n'a pas sa place sur le site. Le slug doit être le nom du fichier ; le lieu doit être
 * une agence de site.config.json (son adresse est le `jobLocation`). Aucune offre n'est inventée
 * par la loop : ce dossier ne contient que l'exemple tant qu'Arcel n'a rien publié.
 */

export const OFFERS_DIR = path.join(process.cwd(), "content", "offres");
export const RECRUITMENT_PATH = "/recrutement/";
export const APPLY_PATH = "/recrutement/postuler/";

export function offerPath(slug: string): string {
  return `/recrutement/offre/${slug}/`;
}

export interface LoadedOffer {
  offer: JobOffer;
  agency: Agency;
  chemin: string;
  file: string;
}

/** Fichiers d'offres chargeables : `.json` sans préfixe « _ ». */
export async function listOfferFiles(dir = OFFERS_DIR): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter(
      (entry) => entry.isFile() && entry.name.endsWith(".json") && !entry.name.startsWith("_"),
    )
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

/** Lit et valide une offre ; lève une erreur lisible si le fichier ne respecte pas le schéma. */
export async function readOffer(file: string): Promise<JobOffer> {
  const raw = await readFile(file, "utf8");
  const result = jobOfferSchema.safeParse(JSON.parse(raw));
  if (!result.success) {
    throw new Error(
      `${path.relative(process.cwd(), file)} : offre invalide\n${z.prettifyError(result.error)}`,
    );
  }
  const expectedSlug = path.basename(file, ".json");
  if (result.data.slug !== expectedSlug) {
    throw new Error(
      `${path.relative(process.cwd(), file)} : le slug « ${result.data.slug} » doit être le nom du fichier (« ${expectedSlug} »)`,
    );
  }
  return result.data;
}

/** Vrai si l'offre est publiée et encore valable à la date donnée (AAAA-MM-JJ). */
export function isOfferLive(offer: JobOffer, today = todayIso()): boolean {
  return offer.statut === "publiee" && offer.valable_jusqu_au >= today;
}

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

let cache: Promise<LoadedOffer[]> | undefined;

async function loadAll(): Promise<LoadedOffer[]> {
  const { agences } = getSiteConfig();
  const offers: LoadedOffer[] = [];
  for (const file of await listOfferFiles()) {
    const offer = await readOffer(file);
    const agency = agences.find((a) => a.id === offer.lieu);
    if (!agency) {
      throw new Error(
        `${path.relative(process.cwd(), file)} : lieu « ${offer.lieu} » inconnu de site.config.json`,
      );
    }
    offers.push({ offer, agency, chemin: offerPath(offer.slug), file });
  }
  return offers;
}

/** Toutes les offres chargeables, quel que soit leur statut. */
export function listOffers(): Promise<LoadedOffer[]> {
  cache ??= loadAll();
  return cache;
}

/** Offres construites : publiées et non expirées, les plus récentes d'abord. */
export async function listLiveOffers(today = todayIso()): Promise<LoadedOffer[]> {
  const offers = await listOffers();
  return offers
    .filter((o) => isOfferLive(o.offer, today))
    .sort((a, b) => b.offer.publiee_le.localeCompare(a.offer.publiee_le));
}

export async function getLiveOffer(slug: string): Promise<LoadedOffer | null> {
  const offers = await listLiveOffers();
  return offers.find((o) => o.offer.slug === slug) ?? null;
}

/** Vide le cache (tests). */
export function resetOffers() {
  cache = undefined;
}

export interface OfferLabels {
  contrats: Record<JobOffer["contrat"], string>;
  temps: Record<JobOffer["temps_de_travail"], string>;
}

/**
 * Balises titre et description d'une page d'offre (docs/01 §8 : 50 à 60 et 140 à 155 caractères) :
 * celles de l'offre si Arcel les a écrites, sinon composées depuis ses champs. `check-content`
 * refuse une offre publiée dont la composition sort de ces bornes : il faut alors écrire `seo`.
 */
export function offerSeo(
  offer: JobOffer,
  agency: Agency,
  labels: OfferLabels,
): { titre: string; description: string } {
  if (offer.seo) return offer.seo;
  const titre = `${offer.titre} (${labels.contrats[offer.contrat]}) : offre à ${agency.commune}`;
  const description = `${offer.description} ${labels.contrats[offer.contrat]}, ${labels.temps[offer.temps_de_travail].toLocaleLowerCase("fr-FR")}, secteur ${offer.secteur}. Candidature en deux minutes.`;
  return { titre, description };
}
