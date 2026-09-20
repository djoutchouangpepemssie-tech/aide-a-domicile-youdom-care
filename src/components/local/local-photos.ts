import type { TerritoryKind } from "@/content/local-schema";
import type { Photo } from "@/content/schemas";

/*
 * Photos de bannière des pages locales, réutilisées depuis la photothèque d'ambiance
 * (public/images/ambiance/, docs/design/PHOTOS.md §6) selon le type de territoire : aucun
 * visage, aucun lieu présenté comme celui de la page. Les textes alternatifs sont ceux de la
 * photothèque : descriptifs et neutres, jamais un prénom ni un nom de commune.
 */

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
