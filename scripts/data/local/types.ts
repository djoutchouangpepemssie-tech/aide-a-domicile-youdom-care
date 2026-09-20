import type { TerritoryKind } from "../../../src/content/local-schema";
import type { LatLng } from "../../../src/lib/geo/geo";
import type { DepartementCode } from "./geo-api";

/** Ce qu'une source de faits doit savoir d'un territoire pour le renseigner. */
export interface TerritoryContext {
  code: string;
  kind: TerritoryKind;
  nom: string;
  departement?: DepartementCode;
  codes_postaux: string[];
  /** Numéro d'arrondissement de Paris (1 à 20) pour `kind: "arrondissement"`. */
  arrondissement?: number;
  centre: LatLng | null;
}

export interface SourceRef {
  label: string;
  url: string;
  collected_at: string;
}
