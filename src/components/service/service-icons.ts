import { iconNames, type IconName } from "@/components/ui/Icon/icons";
import type { ServicePage, ServicePublic } from "@/content/service-schema";

/*
 * Icônes du gabarit service (docs/design/ICONES.md §4, docs/design/CONCEPT.md §5) : les quatre
 * rubriques d'action de la section 3, et la conversion d'un nom d'icône venu d'un en-tête MDX
 * (validé par le schéma comme « minuscules et tirets », pas contre le registre) en `IconName`.
 * Un nom inconnu ne casse pas la page : la carte reste sans icône.
 */

export const rubricIcons: Record<ServicePage["actions"][number]["rubrique"], IconName> = {
  gestes: "action-gestes",
  presence: "action-presence",
  lien: "action-lien",
  coordination: "action-coordination",
};

const known = new Set<string>(iconNames);

export function toIconName(value: string | undefined): IconName | undefined {
  return value !== undefined && known.has(value) ? (value as IconName) : undefined;
}

/**
 * Icônes des stades (section 4), par public et dans l'ordre des stades : un début léger, une
 * présence qui s'installe, une présence étendue (`24h`, docs/design/ICONES.md « présence
 * continue »). Au-delà de la liste, le nœud garde son numéro.
 */
export const stageIcons: Record<ServicePublic, readonly IconName[]> = {
  neuro: ["memoire", "compagnie", "24h"],
  "personne-agee": ["lever", "compagnie", "nuit"],
  "adulte-handicap": ["calendrier", "lever", "24h"],
  "enfant-handicap": ["ecole", "jeux", "24h"],
  aidant: ["compagnie", "nuit", "vacances"],
  transverse: ["calendrier", "compagnie", "24h"],
};

/** Icônes des jalons du suivi (section 6), par `moment` de content/engagements.json. */
export const followUpIcons: Readonly<Record<string, IconName>> = {
  "Avant de commencer": "maison",
  "Première semaine": "deux-personnes",
  "Chaque mois": "calendrier",
  "Quand les besoins changent": "cahier-de-liaison",
};
