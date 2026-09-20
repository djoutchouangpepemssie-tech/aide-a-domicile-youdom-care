import type { LocalData, LocalFactType, TerritoryKind } from "@/content/local-schema";
import type { InterfaceTexts } from "@/content/schemas";

/*
 * Textes calculés des pages locales (docs/04 §4, anatomie 1 et 2) : le complément de lieu
 * (« à Puteaux », « dans les Hauts-de-Seine », « à Paris 15e »), le H1, le numéro
 * d'arrondissement, la distance arrondie. Les gabarits viennent de content/interface.json
 * (`local.*`) ; rien n'est rédigé ici.
 */

export type LocalTexts = InterfaceTexts["local"];

export function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, value),
    template,
  );
}

/** « 75115 » → « 15e », « 75101 » → « 1er » ; null si le code n'est pas un arrondissement de Paris. */
export function arrondissementNumber(code: string): string | null {
  const match = /^751(\d{2})$/.exec(code);
  if (!match?.[1]) return null;
  const n = Number(match[1]);
  if (n < 1 || n > 20) return null;
  return n === 1 ? "1er" : `${n}e`;
}

function isDepartementCode(
  code: string,
  departements: LocalTexts["lieu"]["departements"],
): code is keyof LocalTexts["lieu"]["departements"] {
  return Object.hasOwn(departements, code);
}

export interface LocalPlaceInput {
  kind: TerritoryKind;
  nom: string;
  code: string;
  departement?: string | undefined;
}

/** Complément de lieu prêt à insérer : « à Puteaux », « dans les Hauts-de-Seine », « à Paris 15e ». */
export function localPlace(data: LocalPlaceInput, texts: LocalTexts): string {
  switch (data.kind) {
    case "departement": {
      const code = data.departement ?? data.code;
      return isDepartementCode(code, texts.lieu.departements)
        ? texts.lieu.departements[code]
        : fill(texts.lieu.commune, { nom: data.nom });
    }
    case "arrondissement": {
      const numero = arrondissementNumber(data.code);
      return numero
        ? fill(texts.lieu.arrondissement, { numero })
        : fill(texts.lieu.commune, { nom: data.nom });
    }
    case "quartier":
      return fill(texts.lieu.quartier, { nom: data.nom });
    default:
      return fill(texts.lieu.commune, { nom: data.nom });
  }
}

/** H1 de la page locale : avec le code postal pour une commune, un arrondissement ou un quartier. */
export function localTitle(
  data: LocalPlaceInput & Pick<LocalData, "codes_postaux">,
  texts: LocalTexts,
): string {
  const lieu = localPlace(data, texts);
  const cp = data.codes_postaux?.[0];
  if (data.kind !== "departement" && data.kind !== "region" && cp) {
    return fill(texts.h1_code_postal, { lieu, cp });
  }
  return fill(texts.h1, { lieu });
}

/** Distance arrondie au kilomètre (« 2 »), ou null sous un kilomètre. */
export function roundedDistance(km: number): string | null {
  const rounded = Math.round(km);
  return rounded >= 1 ? String(rounded) : null;
}

const decimal = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const integer = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Distance avec une décimale : « 2,4 ». */
export function formatDistance(km: number): string {
  return decimal.format(km);
}

export function formatInteger(value: number): string {
  return integer.format(value);
}

/** « 8,4 % » (espace insécable avant le signe). */
export function formatPercent(value: number): string {
  return `${percent.format(value)} %`;
}

/** Faits « vie locale » lus par la zone éditoriale (anatomie 3) : affichés en repères sourcés. */
export const lifeFactTypes: readonly LocalFactType[] = [
  "demographie",
  "habitat",
  "relief-deplacements",
  "marche",
  "espace-vert",
];

/** Faits « aides du département » (anatomie 7). */
export const aidFactTypes: readonly LocalFactType[] = [
  "aide-departementale",
  "service-apa",
  "mdph",
];

/** Faits « ressources près de chez vous » (anatomie 4) : le reste. */
export const resourceFactTypes: readonly LocalFactType[] = [
  "point-information",
  "ccas",
  "accueil-jour",
  "residence-autonomie",
  "ehpad",
  "hopital",
  "consultation-memoire",
  "plateforme-repit",
  "transport-adapte",
  "association",
  "equipement-seniors",
  "autre",
];

/** Code INSEE à préremplir dans le formulaire : la commune ou l'arrondissement, son parent pour un quartier. */
export function formInsee(data: Pick<LocalData, "kind" | "code" | "parent">): string | undefined {
  if (data.kind === "commune" || data.kind === "arrondissement") return data.code;
  if (data.kind === "quartier" && data.parent && /^\d{5}$/.test(data.parent)) return data.parent;
  return undefined;
}
