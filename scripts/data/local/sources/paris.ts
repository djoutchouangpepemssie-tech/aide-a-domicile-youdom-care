import type { LocalFact } from "../../../../src/content/local-schema";
import type { SourceCache } from "../cache";
import { cleanText, cleanUrl, fact, formatPhone, joinAddress } from "../facts";
import { slugify } from "../slug";
import type { SourceRef, TerritoryContext } from "../types";

/*
 * opendata.paris.fr (docs/04 §5), API Explore v2.1, licence ODbL :
 * - quartier_paris : les 80 quartiers administratifs (vague 2, fichier séparé) ;
 * - marches-decouverts : marchés découverts (alimentaires et autres) par arrondissement ;
 * - espaces_verts : parcs, jardins, squares et promenades ouvertes ;
 * - seniors-a-paris-loisirs-et-citoyennete : clubs et structures seniors de la Ville de Paris.
 */

export const PARIS_API = "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets";
export const PARIS_LICENCE = "Open Database License (ODbL) — Ville de Paris";

function datasetPage(id: string): string {
  return `https://opendata.paris.fr/explore/dataset/${id}/`;
}

function exportUrl(id: string, select: string, where?: string): string {
  const params = new URLSearchParams({ select });
  if (where) params.set("where", where);
  return `${PARIS_API}/${id}/exports/json?${params.toString()}`;
}

export interface ParisQuartier {
  numero: number;
  nom: string;
  slug: string;
  arrondissement: number;
  code_insee_arrondissement: string;
  code_quartier_insee: string;
  surface_m2: number | null;
  centre: { lat: number; lng: number } | null;
}

interface RawQuartier {
  c_qu: string;
  l_qu: string;
  c_ar: number;
  c_quinsee: string;
  surface: number | null;
  geom_x_y: { lon: number; lat: number } | null;
}

export function parseQuartiers(raw: readonly RawQuartier[]): ParisQuartier[] {
  return raw
    .map((q) => ({
      numero: Number(q.c_qu),
      nom: q.l_qu,
      slug: slugify(q.l_qu),
      arrondissement: q.c_ar,
      code_insee_arrondissement: `751${String(q.c_ar).padStart(2, "0")}`,
      code_quartier_insee: q.c_quinsee,
      surface_m2: q.surface === null ? null : Math.round(q.surface),
      centre: q.geom_x_y ? { lat: q.geom_x_y.lat, lng: q.geom_x_y.lon } : null,
    }))
    .sort((a, b) => a.numero - b.numero);
}

interface RawMarche {
  nom_long: string;
  produit: string | null;
  ardt: number;
  localisation: string | null;
  jours_tenue: string | null;
  h_deb_sem_1: string | null;
  h_fin_sem_1: string | null;
}

interface RawEspaceVert {
  nom_ev: string;
  categorie: string | null;
  type_ev: string | null;
  adresse_numero: number | null;
  adresse_typevoie: string | null;
  adresse_libellevoie: string | null;
  adresse_codepostal: string | null;
  surface_totale_reelle: number | null;
}

interface RawSenior {
  nom_structure: string;
  adresse: string | null;
  code_postal: string | null;
  telephone: string | null;
  site_internet: string | null;
  type_structure: string | null;
  frequence: string | null;
  cout: string | null;
  formats: string[] | string | null;
}

export interface ParisData {
  quartiers: ParisQuartier[];
  marches: RawMarche[];
  espacesVerts: RawEspaceVert[];
  seniors: RawSenior[];
  sources: SourceRef[];
  collected: Record<string, string>;
}

const PROMENADE_CATEGORIES = new Set(["Parc", "Jardin", "Square", "Promenade", "Bois", "Esplanade", "Mail"]);

export async function loadParis(cache: SourceCache): Promise<ParisData> {
  const data: ParisData = { quartiers: [], marches: [], espacesVerts: [], seniors: [], sources: [], collected: {} };
  const load = async <T>(id: string, label: string, select: string, where?: string, minBytes = 1000) => {
    const url = exportUrl(id, select, where);
    const file = await cache.tryFetch({ id: `paris-${id.replace(/_/g, "-")}`, label, url, ext: "json", licence: PARIS_LICENCE, minBytes });
    if (!file) return [] as T[];
    data.sources.push({ label, url: datasetPage(id), collected_at: file.collected_at });
    data.collected[id] = file.collected_at;
    return JSON.parse(file.bytes.toString("utf8")) as T[];
  };
  data.quartiers = parseQuartiers(
    await load<RawQuartier>("quartier_paris", "Ville de Paris — quartiers administratifs (quartier_paris)", "c_qu,l_qu,c_ar,c_quinsee,surface,geom_x_y"),
  );
  data.marches = await load<RawMarche>(
    "marches-decouverts",
    "Ville de Paris — marchés découverts",
    "nom_long,produit,ardt,localisation,jours_tenue,h_deb_sem_1,h_fin_sem_1",
  );
  data.espacesVerts = await load<RawEspaceVert>(
    "espaces_verts",
    "Ville de Paris — espaces verts (promenades ouvertes)",
    "nom_ev,categorie,type_ev,adresse_numero,adresse_typevoie,adresse_libellevoie,adresse_codepostal,surface_totale_reelle",
    'type_ev="Promenades ouvertes"',
  );
  data.seniors = await load<RawSenior>(
    "seniors-a-paris-loisirs-et-citoyennete",
    "Ville de Paris — Seniors à Paris, activités de loisirs et citoyenneté",
    "nom_structure,adresse,code_postal,telephone,site_internet,type_structure,frequence,cout,formats",
    'type_structure="Structures et activités de la Ville de Paris"',
  );
  return data;
}

function arrondissementOfPostcode(cp: string | null): number | null {
  if (!cp) return null;
  if (cp === "75116") return 16;
  const m = /^750(\d{2})$/.exec(cp);
  return m ? Number(m[1]) : null;
}

/** Nom en capitales de la source (« JARDIN ATLANTIQUE ») → « Jardin Atlantique ». */
export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[\s\-'’(])([a-zà-ÿ])/g, (_m, sep: string, c: string) => `${sep}${c.toUpperCase()}`)
    .replace(/\b(De|Du|Des|La|Le|Les|Et|L'|D')\b/g, (m) => m.toLowerCase());
}

export function parisFacts(
  data: ParisData,
  ctx: TerritoryContext,
  caps = { marches: 6, espaces: 6, seniors: 6 },
): LocalFact[] {
  if (ctx.kind !== "arrondissement" || ctx.arrondissement === undefined) return [];
  const numero = ctx.arrondissement;
  const facts: LocalFact[] = [];

  const marches = data.marches
    .filter((m) => m.ardt === numero)
    .sort((a, b) => a.nom_long.localeCompare(b.nom_long, "fr"));
  for (const m of marches.slice(0, caps.marches)) {
    const horaires = m.h_deb_sem_1 && m.h_fin_sem_1 ? `, ${m.h_deb_sem_1}–${m.h_fin_sem_1} en semaine` : "";
    facts.push(
      fact({
        type: "marche",
        label: titleCase(m.nom_long),
        value: cleanText(`${m.produit ?? "Marché"} — ${m.jours_tenue ?? ""}${horaires}`),
        address: cleanText(m.localisation),
        source_url: datasetPage("marches-decouverts"),
        source_label: "Ville de Paris, opendata.paris.fr — marchés découverts",
        collected_at: data.collected["marches-decouverts"] ?? "",
      }),
    );
  }

  const espaces = data.espacesVerts
    .filter((e) => arrondissementOfPostcode(e.adresse_codepostal) === numero)
    .filter((e) => e.categorie !== null && PROMENADE_CATEGORIES.has(e.categorie))
    .sort((a, b) => (b.surface_totale_reelle ?? 0) - (a.surface_totale_reelle ?? 0) || a.nom_ev.localeCompare(b.nom_ev, "fr"));
  for (const e of espaces.slice(0, caps.espaces)) {
    const voie = [e.adresse_numero, e.adresse_typevoie, e.adresse_libellevoie]
      .filter((p) => p !== null && p !== undefined && p !== "")
      .join(" ");
    facts.push(
      fact({
        type: "espace-vert",
        label: titleCase(e.nom_ev),
        value: e.surface_totale_reelle ? `${e.categorie} — ${e.surface_totale_reelle.toLocaleString("fr-FR")} m²` : (e.categorie ?? undefined),
        address: joinAddress([titleCase(voie), `${e.adresse_codepostal ?? ""} Paris`]),
        source_url: datasetPage("espaces_verts"),
        source_label: "Ville de Paris, opendata.paris.fr — espaces verts",
        collected_at: data.collected.espaces_verts ?? "",
      }),
    );
  }

  const seniors = data.seniors
    .filter((s) => arrondissementOfPostcode(s.code_postal) === numero)
    .sort((a, b) => a.nom_structure.localeCompare(b.nom_structure, "fr"));
  for (const s of seniors.slice(0, caps.seniors)) {
    const formats = Array.isArray(s.formats) ? s.formats.join(", ") : cleanText(s.formats);
    facts.push(
      fact({
        type: "equipement-seniors",
        label: s.nom_structure,
        value: cleanText([formats, s.frequence, s.cout].filter(Boolean).join(" · ")),
        address: cleanText(s.adresse),
        telephone: formatPhone(s.telephone),
        url: cleanUrl(s.site_internet),
        source_url: datasetPage("seniors-a-paris-loisirs-et-citoyennete"),
        source_label: "Ville de Paris, opendata.paris.fr — Seniors à Paris",
        collected_at: data.collected["seniors-a-paris-loisirs-et-citoyennete"] ?? "",
      }),
    );
  }
  return facts;
}
