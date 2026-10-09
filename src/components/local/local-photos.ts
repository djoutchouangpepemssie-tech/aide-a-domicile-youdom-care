import type { TerritoryKind } from "@/content/local-schema";
import type { Photo } from "@/content/schemas";

/*
 * Photos de bannière des pages locales et des pages d'agence.
 *
 * **Ce qui a changé le 09/10/2026 (D-059), et pourquoi.** Ces bannières puisaient dans la
 * photothèque d'ambiance (`public/images/ambiance/`, docs/design/PHOTOS.md §6), c'est-à-dire des
 * intérieurs et des extérieurs « sans personne ou presque » : un balcon avec une chaise, une table
 * de cuisine avec du pain, un fauteuil près d'une fenêtre, un banc dans une allée. Relevé par
 * Arcel : rien n'y évoque l'aide à domicile. Le constat est juste — c'étaient des images
 * d'illustration, pas des images de métier.
 *
 * Les bannières montrent désormais des **scènes d'accompagnement** tirées de
 * `public/images/heros/fonds/` : un repas servi, une visite, une aide au lever, un ménage.
 *
 * **Les deux garde-fous tiennent toujours**, et ce sont eux qui bornent ce choix :
 *  - *aucun lieu n'est présenté comme celui de la page.* Le texte alternatif décrit la scène, et
 *    ne nomme jamais la commune : une photo prise ailleurs ne doit pas laisser croire qu'elle
 *    montre le territoire du visiteur ;
 *  - *aucune personne n'est présentée comme une salariée ou une cliente.* `public/images/CREDITS.md`
 *    l'écrit : ces photos sont des illustrations libres de droit, « aucune de ces personnes n'est
 *    cliente, salariée ni proche d'un client » et aucune légende ne doit les nommer ni les
 *    présenter comme telles (brief D-024 §2). Les textes alternatifs ci-dessous restent donc
 *    purement descriptifs — « deux femmes assises », jamais « notre auxiliaire de vie ».
 *
 * La règle « aucun visage » qui valait jusqu'ici pour les seules pages locales était plus stricte
 * que nécessaire : les pages services et les piliers montrent des visages depuis l'origine, sous
 * la même licence et la même réserve.
 *
 * `fond-mains-accompagnement.jpg` n'est pas utilisé ici : c'est un bandeau de 1400 × 450, trop
 * écrasé pour une bannière de page locale.
 */

/**
 * Photos de bannière alternatives pour les communes, choisies selon le code INSEE : deux communes
 * voisines ne partagent pas la même image.
 */
const communePhotos: readonly Photo[] = [
  {
    src: "/images/heros/fonds/fond-auxiliaire-de-vie.jpg",
    alt: "Deux femmes assises côte à côte dans un salon lumineux, penchées sur un document",
    focal: "50% 45%",
  },
  {
    src: "/images/heros/fonds/fond-premiere-visite.jpg",
    alt: "Une femme âgée appuyée sur une canne, une main posée sur son épaule",
    focal: "50% 40%",
  },
  {
    src: "/images/heros/fonds/fond-personne-agee-accompagnee.jpg",
    alt: "Une femme âgée écrit sur un carnet pendant qu'une autre sert le thé",
    focal: "50% 40%",
  },
  {
    src: "/images/heros/fonds/fond-aide-a-domicile.jpg",
    alt: "Une femme âgée assise près d'une fenêtre pendant qu'une autre passe l'aspirateur",
    focal: "50% 45%",
  },
  {
    src: "/images/heros/fonds/fond-autonomie.jpg",
    alt: "Une femme agenouillée aide une personne assise au bord de son lit à enfiler ses chaussons",
    focal: "50% 55%",
  },
];

/**
 * Photo de bannière d'un territoire : par type, et pour une commune l'une des cinq photos
 * d'accompagnement selon son code INSEE, pour que deux communes voisines ne partagent pas la même.
 */
export function localHeroPhoto(kind: TerritoryKind, code: string): Photo {
  if (kind !== "commune") return localHeroPhotos[kind];
  const index = Number.parseInt(code, 10);
  const photo = communePhotos[Number.isFinite(index) ? index % communePhotos.length : 0];
  return photo ?? localHeroPhotos.commune;
}

export const localHeroPhotos: Record<TerritoryKind, Photo> = {
  region: {
    src: "/images/heros/fonds/fond-aide-a-domicile.jpg",
    alt: "Une femme âgée assise près d'une fenêtre pendant qu'une autre passe l'aspirateur",
    focal: "50% 45%",
  },
  departement: {
    src: "/images/heros/fonds/fond-personne-agee-accompagnee.jpg",
    alt: "Une femme âgée écrit sur un carnet pendant qu'une autre sert le thé",
    focal: "50% 40%",
  },
  commune: {
    src: "/images/heros/fonds/fond-auxiliaire-de-vie.jpg",
    alt: "Deux femmes assises côte à côte dans un salon lumineux, penchées sur un document",
    focal: "50% 45%",
  },
  arrondissement: {
    src: "/images/heros/fonds/fond-premiere-visite.jpg",
    alt: "Une femme âgée appuyée sur une canne, une main posée sur son épaule",
    focal: "50% 40%",
  },
  quartier: {
    src: "/images/heros/fonds/fond-autonomie.jpg",
    alt: "Une femme agenouillée aide une personne assise au bord de son lit à enfiler ses chaussons",
    focal: "50% 55%",
  },
};

/**
 * Photo d'une page d'agence : l'entrée d'un immeuble, **jamais l'agence elle-même**, et jamais une
 * équipe — une photo de personnes sur cette page se lirait comme « voici vos intervenants à
 * Puteaux », ce qu'aucune illustration libre de droit ne peut dire. Elle reste donc d'ambiance.
 */
export const agencyPhoto: Photo = {
  src: "/images/ambiance/entree-portes-carrelage.jpg",
  alt: "Une entrée d'immeuble avec un sol carrelé et une porte en bois vitrée",
  focal: "50% 60%",
};
