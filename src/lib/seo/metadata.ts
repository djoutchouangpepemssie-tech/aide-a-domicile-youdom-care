import type { Metadata } from "next";
import { getSiteConfig } from "@/content/loader";
import { isIndexable, neverIndexedPaths } from "./indexable";
import { pageTitle } from "./title";

/*
 * Métadonnées d'une page (docs/04 §2, P5.1) : titre par `pageTitle` (marque en fin si la place
 * le permet), description, canonique absolue auto-référente avec barre finale, robots selon
 * l'ouverture du site (`SITE_INDEXABLE`) et le statut de la page, Open Graph et Twitter.
 * Toutes les pages passent par ici ; les cas particuliers se réduisent à `noindex` (pages
 * `a_relire` en prévisualisation) et aux chemins de `neverIndexedPaths` (/merci/, /styleguide/),
 * jamais indexés quoi qu'il arrive. Aucun `hreflang` : site français uniquement.
 */

export interface PageMetadataInput {
  /** Titre moteur sans la marque (50 à 60 caractères, docs/01 §8). */
  titre: string;
  /** Description moteur (140 à 155 caractères). */
  description: string;
  /** Chemin interne de la page, barre finale facultative (« /aidants/ »). */
  chemin: string;
  /** Page construite mais non indexée (contenu `a_relire` en prévisualisation). */
  noindex?: boolean;
  /** Image Open Graph (1200 × 630), chemin local ou adresse absolue. Sans valeur, l'image de la route (`opengraph-image.tsx`) s'applique. */
  image?: string;
}

/** Chemin interne normalisé : sans requête ni fragment, barre initiale et finale. */
export function normalizePath(chemin: string): string {
  const bare = chemin.split(/[?#]/)[0] ?? "";
  const withLeading = bare.startsWith("/") ? bare : `/${bare}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

/** Adresse canonique absolue d'un chemin, sur l'origine de `marque.url`. */
export function canonicalUrl(chemin: string, siteUrl = getSiteConfig().marque.url): string {
  return new URL(normalizePath(chemin), siteUrl).href;
}

/** Vrai pour les chemins de `neverIndexedPaths` et leurs sous-pages. */
export function isNeverIndexed(chemin: string): boolean {
  const normalized = normalizePath(chemin);
  return neverIndexedPaths.some((prefix) => normalized.startsWith(prefix));
}

export function pageMetadata(input: PageMetadataInput): Metadata {
  const { marque } = getSiteConfig();
  const title = pageTitle(input.titre, marque.nom);
  const canonical = canonicalUrl(input.chemin, marque.url);
  const noindex = input.noindex === true || isNeverIndexed(input.chemin);
  const images = input.image
    ? [{ url: input.image, width: 1200, height: 630, alt: input.titre }]
    : undefined;

  return {
    title,
    description: input.description,
    alternates: { canonical },
    // Fermé tant que le site n'est pas ouvert ; la clé est omise sinon pour hériter du layout.
    ...(noindex || !isIndexable() ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: "website",
      locale: "fr_FR",
      siteName: marque.nom,
      url: canonical,
      title,
      description: input.description,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: input.description,
      ...(input.image ? { images: [input.image] } : {}),
    },
  };
}
