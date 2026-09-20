import { iconNames, type IconName } from "@/components/ui/Icon/icons";
import type { ServicePage } from "@/content/service-schema";

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
