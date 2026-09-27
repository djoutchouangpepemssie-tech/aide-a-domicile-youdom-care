import type { TerritoryKind } from "@/content/local-schema";
import type { Photo } from "@/content/schemas";

/*
 * Photos de bannière des pages locales, réutilisées depuis la photothèque d'ambiance
 * (public/images/ambiance/, docs/design/PHOTOS.md §6) selon le type de territoire : aucun
 * visage, aucun lieu présenté comme celui de la page. Les textes alternatifs sont ceux de la
 * photothèque : descriptifs et neutres, jamais un prénom ni un nom de commune.
 */

/** Photos de bannière alternatives pour les communes, choisies selon le code INSEE. */
const communePhotos: readonly Photo[] = [
  {
    src: "/images/ambiance/promenade-allee-banc.jpg",
    alt: "Une allée bordée d'arbres avec un banc, sous une lumière tamisée par les feuilles",
    focal: "50% 55%",
  },
  {
    src: "/images/ambiance/balcon-chaise-soleil.jpg",
    alt: "Un balcon ensoleillé avec une petite table, une chaise et une plante verte",
    focal: "50% 50%",
  },
  {
    src: "/images/ambiance/cuisine-fenetre-soleil.jpg",
    alt: "Le soleil entre par la fenêtre en bois d'une cuisine et éclaire le plan de travail",
    focal: "50% 40%",
  },
  {
    src: "/images/ambiance/salon-fauteuil-fenetre.jpg",
    alt: "Un fauteuil beige près d'une fenêtre, entouré de plantes vertes",
    focal: "50% 60%",
  },
  {
    src: "/images/ambiance/cuisine-table-pain.jpg",
    alt: "Une table de cuisine avec du pain, une cafetière italienne et des coings, sous une lumière douce",
    focal: "50% 55%",
  },
];

/**
 * Photo de bannière d'un territoire : par type, et pour une commune l'une des cinq photos
 * d'ambiance selon son code INSEE, pour que deux communes voisines ne partagent pas la même.
 */
export function localHeroPhoto(kind: TerritoryKind, code: string): Photo {
  if (kind !== "commune") return localHeroPhotos[kind];
  const index = Number.parseInt(code, 10);
  const photo = communePhotos[Number.isFinite(index) ? index % communePhotos.length : 0];
  return photo ?? localHeroPhotos.commune;
}

export const localHeroPhotos: Record<TerritoryKind, Photo> = {
  region: {
    src: "/images/ambiance/jardin-luxembourg-chaises.jpg",
    alt: "Des chaises vertes sur une allée de gravier, à l'ombre des arbres d'un jardin public",
    focal: "50% 60%",
  },
  departement: {
    src: "/images/ambiance/promenade-allee-parc.jpg",
    alt: "Une allée de parc bordée d'arbres, quelques promeneurs au loin",
    focal: "50% 55%",
  },
  commune: {
    src: "/images/ambiance/promenade-allee-banc.jpg",
    alt: "Une allée bordée d'arbres avec un banc, sous une lumière tamisée par les feuilles",
    focal: "50% 55%",
  },
  arrondissement: {
    src: "/images/ambiance/facade-immeuble-paris.jpg",
    alt: "Une façade d'immeuble haussmannien avec ses balcons en fer forgé",
    focal: "50% 55%",
  },
  quartier: {
    src: "/images/ambiance/escalier-immeuble.jpg",
    alt: "Un escalier d'immeuble avec une rampe en bois, éclairé par le soleil",
    focal: "50% 50%",
  },
};

/** Photo d'une page d'agence : l'entrée d'un immeuble, jamais l'agence elle-même. */
export const agencyPhoto: Photo = {
  src: "/images/ambiance/entree-portes-carrelage.jpg",
  alt: "Une entrée d'immeuble avec un sol carrelé et une porte en bois vitrée",
  focal: "50% 60%",
};
