import { z } from "zod";
import conditionsJson from "../../content/legal/conditions-generales.json";
import cookiesJson from "../../content/legal/cookies.json";
import mentionsJson from "../../content/legal/mentions-legales.json";
import politiqueJson from "../../content/legal/politique-de-confidentialite.json";
import {
  conditionsGeneralesSchema,
  cookiesSchema,
  mentionsLegalesSchema,
  politiqueConfidentialiteSchema,
  type ConditionsGenerales,
  type CookiesPage,
  type MentionsLegales,
  type PolitiqueConfidentialite,
} from "./legal-schema";

/*
 * Chargeur des pages légales (docs/07 §2, P8.3) : content/legal/*.json, validés à la première
 * lecture ; une erreur de schéma interrompt le build. Les chemins des quatre pages sont déclarés
 * ici pour le plan du site, les plans de site XML et check-legal.
 */

export const MENTIONS_LEGALES_PATH = "/mentions-legales/";
export const POLITIQUE_CONFIDENTIALITE_PATH = "/politique-de-confidentialite/";
export const COOKIES_PATH = "/cookies/";
export const CONDITIONS_GENERALES_PATH = "/conditions-generales/";

/** Les quatre pages légales construites par P8.3, dans l'ordre du pied de page. */
export const legalPagePaths = [
  MENTIONS_LEGALES_PATH,
  POLITIQUE_CONFIDENTIALITE_PATH,
  COOKIES_PATH,
  CONDITIONS_GENERALES_PATH,
] as const;

function parseContent<T extends z.ZodType>(schema: T, data: unknown, file: string): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`content/legal/${file} est invalide :\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

let mentions: MentionsLegales | undefined;
let politique: PolitiqueConfidentialite | undefined;
let cookies: CookiesPage | undefined;
let conditions: ConditionsGenerales | undefined;

export function getMentionsLegales(): MentionsLegales {
  mentions ??= parseContent(mentionsLegalesSchema, mentionsJson, "mentions-legales.json");
  return mentions;
}

export function getPolitiqueConfidentialite(): PolitiqueConfidentialite {
  politique ??= parseContent(
    politiqueConfidentialiteSchema,
    politiqueJson,
    "politique-de-confidentialite.json",
  );
  return politique;
}

export function getCookiesPage(): CookiesPage {
  cookies ??= parseContent(cookiesSchema, cookiesJson, "cookies.json");
  return cookies;
}

export function getConditionsGenerales(): ConditionsGenerales {
  conditions ??= parseContent(
    conditionsGeneralesSchema,
    conditionsJson,
    "conditions-generales.json",
  );
  return conditions;
}

/** Chemin, libellé de fil d'Ariane et date de révision des quatre pages, dans l'ordre du pied de page. */
export function listLegalPages(): { chemin: string; ariane: string; maj: string }[] {
  const m = getMentionsLegales();
  const p = getPolitiqueConfidentialite();
  const c = getCookiesPage();
  const g = getConditionsGenerales();
  return [
    { chemin: MENTIONS_LEGALES_PATH, ariane: m.ariane, maj: m.maj },
    { chemin: POLITIQUE_CONFIDENTIALITE_PATH, ariane: p.ariane, maj: p.maj },
    { chemin: COOKIES_PATH, ariane: c.ariane, maj: c.maj },
    { chemin: CONDITIONS_GENERALES_PATH, ariane: g.ariane, maj: g.maj },
  ];
}

/** Date « 27 septembre 2026 » d'une date ISO, pour la ligne « Dernière mise à jour ». */
export function formatLegalDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)));
}
