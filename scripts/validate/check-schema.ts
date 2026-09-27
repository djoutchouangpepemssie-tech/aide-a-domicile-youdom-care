import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { siteConfigSchema } from "../../src/content/schemas";
import { extractVisibleText } from "./check-placeholders";
import { result, type Check, type CheckContext, type CheckResult } from "./types";

/*
 * docs/07 §7 et docs/04 §2 : chaque JSON-LD rendu (.next/server/app/**\/*.html) doit être un
 * JSON valide au contexte schema.org, avec un `@type`, sans type interdit (`Review`,
 * `AggregateRating`, toute `PostalAddress` qui n'est pas une agence de site.config.json), sans
 * valeur vide à quelque profondeur (`null`, `""`, `[]`, `{}`). Par page : un seul
 * `Organization` ; `MedicalWebPage` seulement si la carte de relecture affiche le relecteur
 * nommé ; `BreadcrumbList` d'au moins deux éléments positionnés, aux adresses absolues.
 */

export interface AgencyAddress {
  /** `null` quand l'adresse de voie n'est pas publiée (D-036) : seule la commune est admise. */
  adresse: string | null;
  code_postal: string;
  commune: string;
}

export interface SchemaCheckOptions {
  /** Points d'accueil réels : seules adresses postales admises. */
  agencies: readonly AgencyAddress[];
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

const forbiddenTypes = new Set(["Review", "AggregateRating"]);

const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const jsonLdType = /\btype=["']application\/ld\+json["']/i;

/**
 * Contenu brut de chaque bloc `application/ld+json` du document. Les scripts sont lus dans
 * l'ordre, sans chevauchement : un faux `<script type="application/ld+json">` cité dans un
 * autre script (charge utile RSC) est avalé avec celui-ci et n'est pas retenu.
 */
export function extractJsonLd(html: string): string[] {
  const blocks: string[] = [];
  for (const match of html.matchAll(scriptPattern)) {
    const [, attributes = "", content = ""] = match;
    if (jsonLdType.test(attributes)) blocks.push(content);
  }
  return blocks;
}

function isObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function typesOf(node: JsonObject): string[] {
  const type = node["@type"];
  if (typeof type === "string") return [type];
  if (Array.isArray(type)) return type.filter((t): t is string => typeof t === "string");
  return [];
}

/** Parcourt tous les objets d'un arbre JSON, avec leur chemin lisible. */
function walkObjects(value: JsonValue, visit: (node: JsonObject, at: string) => void, at = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkObjects(item, visit, `${at}[${index}]`));
  } else if (isObject(value)) {
    visit(value, at);
    for (const [key, child] of Object.entries(value)) walkObjects(child, visit, `${at}.${key}`);
  }
}

/** Valeurs vides à quelque profondeur : chemins fautifs. */
export function findEmptyValues(value: JsonValue, at = "$"): string[] {
  const hits: string[] = [];
  if (value === null) hits.push(`${at} = null`);
  else if (typeof value === "string") {
    if (value.trim().length === 0) hits.push(`${at} = ""`);
  } else if (Array.isArray(value)) {
    if (value.length === 0) hits.push(`${at} = []`);
    value.forEach((item, index) => hits.push(...findEmptyValues(item, `${at}[${index}]`)));
  } else if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) hits.push(`${at} = {}`);
    for (const [key, child] of entries) hits.push(...findEmptyValues(child, `${at}.${key}`));
  }
  return hits;
}

function isAbsoluteUrl(value: JsonValue | undefined): boolean {
  return typeof value === "string" && /^https?:\/\/[^\s/]+\/?/i.test(value);
}

function matchesAgency(node: JsonObject, agencies: readonly AgencyAddress[]): boolean {
  return agencies.some(
    (agency) =>
      node.streetAddress === agency.adresse &&
      node.postalCode === agency.code_postal &&
      node.addressLocality === agency.commune,
  );
}

function checkBreadcrumb(node: JsonObject, at: string): string[] {
  const errors: string[] = [];
  const list = node.itemListElement;
  if (!Array.isArray(list) || list.length < 2) {
    return [`${at} : BreadcrumbList avec moins de deux éléments`];
  }
  list.forEach((item, index) => {
    const where = `${at}.itemListElement[${index}]`;
    if (!isObject(item)) {
      errors.push(`${where} : élément qui n'est pas un ListItem`);
      return;
    }
    if (!typesOf(item).includes("ListItem")) errors.push(`${where} : @type ListItem attendu`);
    if (item.position !== index + 1) errors.push(`${where} : position ${index + 1} attendue`);
    if (typeof item.name !== "string" || item.name.trim().length === 0) {
      errors.push(`${where} : nom manquant`);
    }
    const url = isObject(item.item) ? item.item["@id"] : item.item;
    if (url === undefined) {
      if (index < list.length - 1) errors.push(`${where} : adresse manquante`);
    } else if (!isAbsoluteUrl(url)) {
      errors.push(`${where} : adresse absolue attendue (${String(url)})`);
    }
  });
  return errors;
}

/** Erreurs d'une page rendue : ses blocs JSON-LD, lus ensemble. */
export function checkPageJsonLd(
  html: string,
  options: SchemaCheckOptions,
  label = "page",
): string[] {
  const errors: string[] = [];
  const blocks = extractJsonLd(html);
  let organizations = 0;
  const reviewers: string[] = [];
  let medical = false;

  blocks.forEach((block, index) => {
    const at = `${label} #${index + 1}`;
    let parsed: JsonValue;
    try {
      parsed = JSON.parse(block) as JsonValue;
    } catch (error) {
      errors.push(`${at} : JSON invalide (${(error as Error).message})`);
      return;
    }
    if (!isObject(parsed)) {
      errors.push(`${at} : un objet JSON-LD est attendu`);
      return;
    }
    const context = parsed["@context"];
    if (typeof context !== "string" || !/^https?:\/\/schema\.org\/?$/i.test(context)) {
      errors.push(`${at} : @context schema.org attendu`);
    }
    const rootTypes = typesOf(parsed);
    if (rootTypes.length === 0) errors.push(`${at} : @type manquant`);
    for (const hit of findEmptyValues(parsed)) errors.push(`${at} : valeur vide ${hit}`);

    walkObjects(parsed, (node, where) => {
      const types = typesOf(node);
      for (const type of types) {
        if (forbiddenTypes.has(type)) errors.push(`${at} : type interdit ${type} (${where})`);
      }
      if (types.includes("PostalAddress") && !matchesAgency(node, options.agencies)) {
        errors.push(
          `${at} : PostalAddress qui n'est pas une agence de site.config.json (${where})`,
        );
      }
      if (types.includes("Organization")) organizations += 1;
      if (types.includes("BreadcrumbList")) errors.push(...checkBreadcrumb(node, `${at} ${where}`));
      if (types.includes("MedicalWebPage")) {
        medical = true;
        const reviewer = node.reviewedBy;
        const name = isObject(reviewer) ? reviewer.name : undefined;
        if (typeof name === "string" && name.trim().length > 0) reviewers.push(name);
        else errors.push(`${at} : MedicalWebPage sans reviewedBy nommé (${where})`);
      }
    });
  });

  if (organizations > 1) errors.push(`${label} : ${organizations} Organization, un seul attendu`);
  if (medical) {
    const visible = extractVisibleText(html);
    const card = /class="[^"]*\bsources-review\b/.test(html);
    if (!card) errors.push(`${label} : MedicalWebPage sans carte de relecture affichée`);
    for (const name of reviewers) {
      if (!visible.includes(name)) {
        errors.push(`${label} : MedicalWebPage dont le relecteur « ${name} » n'est pas affiché`);
      }
    }
  }
  return errors;
}

async function listHtmlFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listHtmlFiles(full)));
    else if (entry.name.endsWith(".html") && entry.name !== "_global-error.html") out.push(full);
  }
  return out.sort();
}

export async function scanHtmlDir(dir: string, options: SchemaCheckOptions): Promise<string[]> {
  const errors: string[] = [];
  for (const file of await listHtmlFiles(dir)) {
    const html = await readFile(file, "utf8");
    errors.push(...checkPageJsonLd(html, options, path.relative(dir, file)));
  }
  return errors;
}

async function loadAgencies(rootDir: string): Promise<AgencyAddress[]> {
  const raw = await readFile(path.join(rootDir, "content", "site.config.json"), "utf8");
  const config = siteConfigSchema.parse(JSON.parse(raw));
  return config.agences.map(({ adresse, code_postal, commune }) => ({
    adresse,
    code_postal,
    commune,
  }));
}

export async function runSchemaCheck(ctx: CheckContext): Promise<CheckResult> {
  const outputDir = path.join(ctx.rootDir, ".next", "server", "app");
  try {
    await stat(outputDir);
  } catch {
    return result([
      "aucun rendu à contrôler : lancez `pnpm build` avant `pnpm validate` (.next/server/app absent).",
    ]);
  }
  const agencies = await loadAgencies(ctx.rootDir);
  return result(await scanHtmlDir(outputDir, { agencies }));
}

export const checkSchema: Check = {
  id: "check-schema",
  description: "un JSON-LD est invalide, contient un type interdit ou une valeur vide",
  run: runSchemaCheck,
};
