/*
 * Migration ponctuelle (27/09/2026, demande d'Arcel) : le site ne garde que les agences réellement
 * implantées. Les quatre autres — Saint-Denis, Vitry-sur-Seine, Serris, Versailles — n'ont jamais
 * eu d'adresse de voie renseignée (D-036), et Arcel a demandé que leurs pages, leurs liens et leurs
 * boutons disparaissent du site.
 *
 * Ce que le script fait, et rien d'autre :
 *  1. retire ces agences de `content/site.config.json` et de `data/agences.geo.json` ;
 *  2. recalcule, pour chaque page locale déjà construite, l'agence la plus proche parmi celles qui
 *     restent (distance orthodromique entre le centre de la commune et l'agence, comme le
 *     pipeline), sans rien télécharger.
 *
 * Il est idempotent : relancé, il ne trouve plus rien à changer. Le pipeline complet
 * (`pnpm data:local`) recalculera de lui-même les mêmes valeurs à sa prochaine exécution.
 */

import { readFile, writeFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import path from "node:path";

const GARDEES = new Set(["paris-12", "puteaux"]);
const RACINE = process.cwd();

interface Point {
  lat: number;
  lng: number;
}

/** Distance orthodromique en kilomètres (même formule que le pipeline). */
function distanceKm(a: Point, b: Point): number {
  const R = 6371;
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function lireJson<T>(chemin: string): Promise<T> {
  return JSON.parse(await readFile(chemin, "utf8")) as T;
}

async function ecrireJson(chemin: string, valeur: unknown): Promise<void> {
  await writeFile(chemin, `${JSON.stringify(valeur, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  const cheminConfig = path.join(RACINE, "content", "site.config.json");
  const config = await lireJson<{ agences: { id: string }[] }>(cheminConfig);
  const avant = config.agences.length;
  config.agences = config.agences.filter((a) => GARDEES.has(a.id));
  await ecrireJson(cheminConfig, config);
  console.log(`site.config.json : ${avant} → ${config.agences.length} agences`);

  const cheminGeo = path.join(RACINE, "data", "agences.geo.json");
  const geo = await lireJson<{ agences: { id: string; coordonnees: Point }[] }>(cheminGeo);
  geo.agences = geo.agences.filter((a) => GARDEES.has(a.id));
  await ecrireJson(cheminGeo, geo);
  const points = new Map(geo.agences.map((a) => [a.id, a.coordonnees]));
  console.log(`agences.geo.json : ${[...points.keys()].join(", ")}`);

  const dossier = path.join(RACINE, "data", "local");
  const fichiers = (await readdir(dossier)).filter((f) => f.endsWith(".json"));
  let rattachees = 0;
  for (const fichier of fichiers) {
    const chemin = path.join(dossier, fichier);
    const page = await lireJson<{
      centre?: Point;
      agence_proche?: { id: string; distance_km: number };
    }>(chemin);
    const { centre, agence_proche: proche } = page;
    if (!centre || !proche || GARDEES.has(proche.id)) continue;
    let meilleure: { id: string; distance_km: number } | null = null;
    for (const [id, point] of points) {
      const km = Math.round(distanceKm(centre, point) * 10) / 10;
      if (!meilleure || km < meilleure.distance_km) meilleure = { id, distance_km: km };
    }
    if (!meilleure) continue;
    page.agence_proche = meilleure;
    await ecrireJson(chemin, page);
    rattachees += 1;
  }
  console.log(`pages locales rattachées à une agence restante : ${rattachees}`);
}

await main();
