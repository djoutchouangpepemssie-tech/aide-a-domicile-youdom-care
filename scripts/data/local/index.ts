import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { localThresholds, type TerritoryKind } from "../../../src/content/local-schema";
import { buildTerritories, compareWithSeed, type BuildResult, type Seed, type Zone } from "./build";
import { renderRawReadme, SourceCache } from "./cache";
import { loadGeoData } from "./geo-api";
import { loadInsee } from "./insee";
import { arrondissementPath } from "./slug";
import { loadAnnuaire } from "./sources/annuaire";
import { loadCnsa } from "./sources/cnsa";
import { loadFiness } from "./sources/finess";
import { checkManualSources } from "./sources/manual";
import { loadParis, PARIS_LICENCE } from "./sources/paris";
import { loadUnapei } from "./sources/unapei";
import type { Agency } from "./territoires";

/*
 * Pipeline de données locales (docs/04 §5, P6.1 à P6.3) :
 *   pnpm data:local            télécharge (cache du jour réutilisé) et produit data/local/{code}.json
 *   pnpm data:local --offline  rejoue depuis data/raw/ sans réseau
 *   --date=AAAA-MM-JJ          fixe la date de génération (par défaut : aujourd'hui)
 * Sorties : data/local/{code}.json (vague 1), data/local/_quartiers-paris.json (vague 2, liste
 * seulement), data/raw/README.md (sources, dates, licences, état).
 */

const siteConfigSchema = z.looseObject({
  agences: z.array(
    z.looseObject({
      id: z.string().min(1),
      code_insee: z.string().regex(/^\d{5}$/),
      departement: z.string().regex(/^\d{2}$/),
    }),
  ),
  zones: z.array(z.looseObject({ code: z.string(), nom: z.string(), slug: z.string() })),
});

const geocodedSchema = z.looseObject({
  agences: z.array(
    z.looseObject({
      id: z.string(),
      coordonnees: z.strictObject({ lat: z.number(), lng: z.number() }).nullable(),
    }),
  ),
});

interface Options {
  offline: boolean;
  today: string;
}

function parseArgs(argv: readonly string[]): Options {
  const offline = argv.includes("--offline");
  const dateArg = argv.find((a) => a.startsWith("--date="))?.slice("--date=".length);
  const today = dateArg ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error(`--date invalide : ${today}`);
  return { offline, today };
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

export async function runPipeline(rootDir: string, options: Options): Promise<BuildResult> {
  const rawDir = path.join(rootDir, "data", "raw");
  const outDir = path.join(rootDir, "data", "local");
  const cache = new SourceCache(rawDir, { offline: options.offline, today: options.today });

  const siteConfig = siteConfigSchema.parse(await readJson(path.join(rootDir, "content", "site.config.json")));
  const geocoded = geocodedSchema.parse(await readJson(path.join(rootDir, "data", "agences.geo.json")));
  const agencies: Agency[] = [];
  for (const a of siteConfig.agences) {
    const geo = geocoded.agences.find((g) => g.id === a.id);
    if (!geo?.coordonnees) {
      console.warn(`agence ${a.id} : non géocodée (data/agences.geo.json), ignorée pour les distances`);
      continue;
    }
    agencies.push({ id: a.id, code_insee: a.code_insee, departement: a.departement, coordonnees: geo.coordonnees });
  }
  if (agencies.length === 0) throw new Error("aucune agence géocodée : lancer pnpm data:agences");
  const zones: Zone[] = siteConfig.zones.map((z) => ({ code: z.code, nom: z.nom, slug: z.slug }));

  console.log(`Pipeline local — ${options.offline ? "hors ligne (cache data/raw)" : "en ligne"} — ${options.today}`);
  const geo = await loadGeoData(cache);
  const idfCodes = new Set(geo.communes.map((c) => c.code));
  const insee = await loadInsee(cache, (code) => idfCodes.has(code));
  if (!insee) console.warn("Insee : base communale indisponible, `demographie` restera absent");
  const annuaire = await loadAnnuaire(cache);
  const cnsa = await loadCnsa(cache);
  const finess = await loadFiness(cache);
  const paris = await loadParis(cache);
  const unapei = await loadUnapei(cache);

  const manualFailures = options.offline ? [] : await checkManualSources();
  for (const failure of manualFailures) console.warn(`source manuelle à revérifier : ${failure}`);

  const result = buildTerritories({ geo, agencies, zones, insee, annuaire, cnsa, finess, paris, unapei, today: options.today });

  // Écriture : les fichiers de territoires absents de la vague 1 sont retirés.
  await mkdir(outDir, { recursive: true });
  const produced = new Set(result.files.map((f) => `${f.code}.json`));
  for (const name of await readdir(outDir)) {
    if (/^(\d{2,5}|idf)\.json$/.test(name) && !produced.has(name)) await unlink(path.join(outDir, name));
  }
  for (const file of result.files) {
    await writeFile(path.join(outDir, `${file.code}.json`), `${JSON.stringify(file, null, 2)}\n`);
  }

  const seed = await readJson<Seed>(path.join(rootDir, "data", "territoires.seed.json"));
  const seedQuartierNames = new Map<number, string>();
  for (const a of seed.paris.arrondissements) for (const q of a.quartiers) seedQuartierNames.set(q.numero, q.nom);
  const quartiersSource = paris.sources.find((s) => s.url.includes("quartier_paris"));
  await writeFile(
    path.join(outDir, "_quartiers-paris.json"),
    `${JSON.stringify(
      {
        _lisezmoi:
          "Les 80 quartiers administratifs de Paris (vague 2, docs/04 §4) : liste de référence produite par pnpm data:local, sans page tant que le contenu ne le justifie pas. Les noms d'usage (synonymes) restent à établir avec une source par correspondance.",
        _source: quartiersSource
          ? { ...quartiersSource, licence: PARIS_LICENCE }
          : { label: "opendata.paris.fr — quartier_paris (indisponible lors de cette exécution)", url: "https://opendata.paris.fr/explore/dataset/quartier_paris/", collected_at: options.today, licence: PARIS_LICENCE },
        quartiers: paris.quartiers.map((q) => ({
          numero: q.numero,
          nom: q.nom,
          // Graphie du seed quand elle diffère (accents absents dans opendata.paris.fr) : à trancher à la rédaction.
          nom_seed: seedQuartierNames.get(q.numero) !== q.nom ? seedQuartierNames.get(q.numero) : undefined,
          slug: q.slug,
          arrondissement: q.arrondissement,
          code_insee_arrondissement: q.code_insee_arrondissement,
          code_quartier_insee: q.code_quartier_insee,
          chemin_prevu: `${arrondissementPath(q.code_insee_arrondissement)}${q.slug}/`,
          surface_m2: q.surface_m2,
          centre: q.centre,
        })),
      },
      null,
      2,
    )}\n`,
  );

  await writeFile(path.join(rawDir, "README.md"), renderRawReadme(cache.records, options.today));

  // Contrôle croisé avec le seed.
  const seedDiffs = compareWithSeed(seed, geo, zones, agencies, paris.quartiers);

  printReport(result, seedDiffs, cache, manualFailures);
  return result;
}

function printReport(result: BuildResult, seedDiffs: string[], cache: SourceCache, manualFailures: string[]) {
  const byKind: Partial<Record<TerritoryKind, number>> = {};
  for (const r of result.reports) byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
  console.log("");
  console.log("Territoires produits :");
  for (const [kind, n] of Object.entries(byKind)) console.log(`  ${kind} : ${n}`);
  console.log("");
  console.log("Faits par territoire :");
  for (const r of result.reports) {
    const seuil = r.required === null ? "" : ` (seuil ${r.required})`;
    const flag = r.required !== null && r.facts < r.required ? "  ← sous le seuil" : "";
    const local = r.kind === "commune" || r.kind === "arrondissement" ? `, ${r.in_territory} situés dans le territoire` : "";
    console.log(`  ${r.code.padEnd(5)} ${r.kind.padEnd(14)} ${String(r.facts).padStart(3)} faits${seuil}${local}${flag} — ${r.nom}`);
  }
  const fewLocal = result.reports.filter((r) => (r.kind === "commune" || r.kind === "arrondissement") && r.required !== null && r.in_territory < r.required);
  if (fewLocal.length > 0) {
    console.log("");
    console.log(`Territoires dont les faits situés sur place (in_territory) sont sous le seuil, le reste venant du département (${fewLocal.length}) :`);
    for (const r of fewLocal) console.log(`  ${r.code} ${r.nom} : ${r.in_territory} sur place / ${r.facts} au total (seuil ${r.required})`);
  }
  const under = result.reports.filter((r) => r.required !== null && r.facts < r.required);
  console.log("");
  if (under.length === 0) {
    console.log("Seuils docs/04 §4 : tous les territoires atteignent le nombre de faits requis.");
  } else {
    console.log(`Territoires sous les seuils (${under.length}) — la page ne sera pas créée tant que les faits manquent :`);
    for (const r of under) {
      const kind = r.kind as Exclude<TerritoryKind, "region">;
      console.log(`  ${r.code} ${r.nom} (${r.kind}) : ${r.facts}/${localThresholds[kind].faits} — types absents : ${r.missingTypes.join(", ") || "aucun"}`);
    }
  }
  console.log("");
  const unreachable = cache.records.filter((r) => r.status === "injoignable" || r.error);
  if (unreachable.length === 0) console.log("Sources : toutes disponibles.");
  else {
    console.log("Sources injoignables ou dégradées :");
    for (const r of unreachable) console.log(`  ${r.id} : ${r.status}${r.error ? ` — ${r.error}` : ""}`);
  }
  if (manualFailures.length > 0) {
    console.log("Pages consultées à la main ne répondant plus (faits à revérifier) :");
    for (const f of manualFailures) console.log(`  ${f}`);
  }
  console.log("");
  if (seedDiffs.length === 0) console.log("Seed (data/territoires.seed.json) : aucun écart avec les sources officielles.");
  else {
    console.log(`Écarts avec data/territoires.seed.json (${seedDiffs.length}) — la source officielle gagne :`);
    for (const d of seedDiffs) console.log(`  ${d}`);
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/data/local/index.ts")) {
  runPipeline(process.cwd(), parseArgs(process.argv.slice(2))).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
