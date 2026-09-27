import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import siteConfigJson from "../../content/site.config.json";
import interfaceJson from "../../content/interface.json";
import { siteConfigSchema, type Agency } from "./schemas";
import {
  isOfferLive,
  listLiveOffers,
  listOfferFiles,
  offerPath,
  offerSeo,
  OFFERS_DIR,
  readOffer,
} from "./offres";

/* Offres d'emploi (docs/03 §9, P8.2) : aucune offre inventée, le modèle n'est jamais chargé. */

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "yc-offres-"));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("dossier content/offres", () => {
  it("ne charge pas le modèle _exemple.json : aucune offre publiée aujourd'hui", async () => {
    const files = await listOfferFiles(OFFERS_DIR);
    expect(files.some((f) => path.basename(f).startsWith("_"))).toBe(false);
    expect(await listLiveOffers()).toEqual([]);
  });

  it("le modèle respecte le schéma d'une offre et reste un brouillon", async () => {
    const raw = JSON.parse(await readFile(path.join(OFFERS_DIR, "_exemple.json"), "utf8")) as {
      statut: string;
    };
    expect(raw.statut).toBe("brouillon");
    // Écrit sous un nom sans « _ » pour passer par readOffer (slug = nom du fichier).
    const file = path.join(dir, "exemple-auxiliaire-de-vie-puteaux.json");
    await writeFile(file, JSON.stringify(raw));
    const offer = await readOffer(file);
    expect(offer.lieu).toBe("puteaux");
    expect(isOfferLive(offer, "2026-09-27")).toBe(false);
    expect(isOfferLive({ ...offer, statut: "publiee" }, "2026-02-01")).toBe(true);
    expect(isOfferLive({ ...offer, statut: "publiee" }, "2026-04-01")).toBe(false);
  });

  it("refuse un slug différent du nom du fichier et une offre hors schéma", async () => {
    const raw = JSON.parse(
      await readFile(path.join(OFFERS_DIR, "_exemple.json"), "utf8"),
    ) as Record<string, unknown>;
    const wrongName = path.join(dir, "autre-nom.json");
    await writeFile(wrongName, JSON.stringify(raw));
    await expect(readOffer(wrongName)).rejects.toThrow(/slug/);
    const invalid = path.join(dir, "exemple-auxiliaire-de-vie-puteaux.json");
    await writeFile(
      invalid,
      JSON.stringify({ ...raw, salaire: { min: 14, max: 12, unite: "heure", devise: "EUR" } }),
    );
    await expect(readOffer(invalid)).rejects.toThrow(/offre invalide/);
  });

  it("compose des balises moteur depuis l'offre, ou reprend celles écrites par Arcel", () => {
    const config = siteConfigSchema.parse(siteConfigJson);
    const agency = config.agences.find((a) => a.id === "puteaux") as Agency;
    const labels = interfaceJson.recrutement;
    const base = {
      slug: "auxiliaire-de-vie-puteaux",
      titre: "Auxiliaire de vie à domicile",
      description:
        "Accompagner des personnes âgées chez elles, à Puteaux et dans les communes voisines, en équipe.",
      contrat: "cdi" as const,
      temps_de_travail: "temps-partiel" as const,
      lieu: "puteaux",
      secteur: "Puteaux, Nanterre, Suresnes",
      publiee_le: "2026-09-01",
      valable_jusqu_au: "2026-12-31",
      missions: ["Aider au lever."],
      profil: ["Expérience."],
      statut: "publiee" as const,
    };
    const composed = offerSeo(base, agency, labels);
    expect(composed.titre).toBe("Auxiliaire de vie à domicile (CDI) : offre à Puteaux");
    expect(composed.description).toContain(
      "CDI, temps partiel, secteur Puteaux, Nanterre, Suresnes.",
    );
    const written = { titre: "T".repeat(55), description: "D".repeat(150) };
    expect(offerSeo({ ...base, seo: written }, agency, labels)).toEqual(written);
    expect(offerPath("auxiliaire-de-vie-puteaux")).toBe(
      "/recrutement/offre/auxiliaire-de-vie-puteaux/",
    );
  });
});
