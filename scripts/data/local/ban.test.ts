import { describe, expect, it } from "vitest";
import { banQuery, decideArrondissement, isStreetAddress, normalizeAddress, type BanResult } from "./ban";

/* Décision BAN : fonction pure, réponses factices, aucun appel réseau. */

function result(overrides: Partial<BanResult> & Pick<BanResult, "score" | "citycode">): BanResult {
  return {
    label: "7B Rue Clauzel 75009 Paris",
    name: "7B Rue Clauzel",
    street: "Rue Clauzel",
    postcode: "75009",
    type: "housenumber",
    city: "Paris",
    ...overrides,
  };
}

describe("géocodage BAN des faits parisiens", () => {
  const clauzel = "7bis rue Clauzel, 75015 PARIS";

  it("rattache à l'arrondissement renvoyé quand le score atteint 0,6 et que la voie concorde", () => {
    expect(decideArrondissement(clauzel, result({ score: 0.6145, citycode: "75109" }))).toBe("75109");
    expect(decideArrondissement(clauzel, result({ score: 0.6, citycode: "75109" }))).toBe("75109");
    expect(decideArrondissement("55 quai de la Seine, 75015 PARIS", result({ score: 0.72, citycode: "75119", street: "Quai de la Seine", name: "55 Quai de la Seine" }))).toBe("75119");
  });

  it("ne tranche pas sous 0,6, sans résultat, hors Paris ou pour Paris entier", () => {
    expect(decideArrondissement(clauzel, result({ score: 0.59, citycode: "75109" }))).toBeNull();
    expect(decideArrondissement(clauzel, null)).toBeNull();
    expect(decideArrondissement(clauzel, undefined)).toBeNull();
    expect(decideArrondissement(clauzel, result({ score: 0.9, citycode: "75056", type: "municipality", street: undefined, name: "Paris" }))).toBeNull();
    expect(decideArrondissement(clauzel, result({ score: 0.9, citycode: "92062" }))).toBeNull();
    expect(decideArrondissement(clauzel, result({ score: 0.9, citycode: "75121" }))).toBeNull();
  });

  it("exige que la BAN ait reconnu le numéro : une voie seule peut border deux arrondissements", () => {
    const faubourg = result({ score: 0.8, citycode: "75111", type: "street", label: "Rue du Faubourg Saint-Antoine 75011 Paris", name: "Rue du Faubourg Saint-Antoine", street: "Rue du Faubourg Saint-Antoine" });
    expect(decideArrondissement("184 rue DU FAUBOURG SAINT ANTOINE, 75571 PARIS CEDEX 12", faubourg)).toBeNull();
    expect(decideArrondissement("184 rue du Faubourg Saint-Antoine Paris", { ...faubourg, type: "housenumber", citycode: "75112" })).toBe("75112");
    // Réponse sans `type` (ancienne forme) : acceptée sur le score et la voie.
    expect(decideArrondissement(clauzel, result({ score: 0.7, citycode: "75109", type: undefined }))).toBe("75109");
  });

  it("interroge la BAN avec le numéro et la voie suivis de Paris, sans code postal ni complément", () => {
    expect(banQuery("7bis rue Clauzel, 75015 PARIS")).toBe("7bis rue Clauzel Paris");
    expect(banQuery("21 passage de ménilmontant, 75011, PARIS")).toBe("21 passage de ménilmontant Paris");
    expect(banQuery("184 rue DU FAUBOURG SAINT ANTOINE, 75571 PARIS CEDEX 12")).toBe("184 rue DU FAUBOURG SAINT ANTOINE Paris");
    expect(banQuery("10 rue de Santerre, Club des aidants Joseph-Weill, 75012 Paris")).toBe("10 rue de Santerre Paris");
    expect(banQuery("14 rue des tourelles 75020 PARIS")).toBe("14 rue des tourelles Paris");
    expect(banQuery("  5 ter   rue Dosne  ")).toBe("5 ter rue Dosne Paris");
  });

  it("refuse une voie sans rapport avec l'adresse demandée malgré un bon score", () => {
    const auber = result({ score: 0.6142, citycode: "75109", label: "5 Rue Auber 75009 Paris", name: "5 Rue Auber", street: "Rue Auber" });
    expect(decideArrondissement("5 rue Beaucour, 75009 PARIS", auber)).toBeNull();
    // Tous les mots significatifs de la voie demandée doivent s'y retrouver : « Tour-des-Dames » (9e) n'est pas « rue des Dames » (17e).
    const dames = result({ score: 0.7323, citycode: "75117", label: "10 Rue des Dames 75017 Paris", name: "10 Rue des Dames", street: "Rue des Dames" });
    expect(decideArrondissement("10 rue Tour-des-Dames Paris", dames)).toBeNull();
    // Mais la BAN peut renvoyer une voie plus complète (« Rue Catherine de la Rochefoucauld ») ; « 25bis » n'est pas un mot de la voie.
    const rochefoucauld = result({ score: 0.6274, citycode: "75109", street: "Rue Catherine de la Rochefoucauld", name: "25B Rue Catherine de la Rochefoucauld" });
    expect(decideArrondissement("25bis rue de la Rochefoucauld Paris", rochefoucauld)).toBe("75109");
    const leclerc = result({ score: 0.8, citycode: "75114", street: "Avenue du Général Leclerc", name: "10 Avenue du Général Leclerc" });
    expect(decideArrondissement("10 av. du Gal Leclerc Paris", leclerc)).toBe("75114");
    // Les mots-outils (rue, de, la, saint…) ne suffisent pas à faire concorder deux voies.
    const saintHonore = result({ score: 0.8, citycode: "75101", street: "Place du Marché Saint-Honoré", name: "32 Place du Marché Saint-Honoré" });
    expect(decideArrondissement("32 place du marché Saint-Honoré, 75014 PARIS", saintHonore)).toBe("75101");
    expect(decideArrondissement("32 rue de la Gare, 75014 PARIS", saintHonore)).toBeNull();
  });

  it("reconnaît une adresse de voie (numéro puis voie) et normalise la clé de cache", () => {
    expect(isStreetAddress("7bis rue Clauzel, 75015 PARIS")).toBe(true);
    expect(isStreetAddress("21 passage de ménilmontant, 75011, PARIS")).toBe(true);
    expect(isStreetAddress("3 avenue Beaucour, 75009 PARIS")).toBe(true);
    expect(isStreetAddress("12 B rue X, 75012 Paris")).toBe(true);
    expect(isStreetAddress("Mairie, 75012 Paris")).toBe(false);
    expect(isStreetAddress("Courrier : 18 rue des Terres au Curé, 75013 Paris")).toBe(false);
    expect(isStreetAddress("Terre-plein du boulevard Richard-Lenoir, entre les rues Amelot et Saint-Sabin")).toBe(false);
    expect(normalizeAddress("  7bis  rue Clauzel,\n75015 PARIS ")).toBe("7bis rue clauzel 75015 paris");
    expect(normalizeAddress("21 passage de Ménilmontant, 75011, PARIS")).toBe("21 passage de menilmontant 75011 paris");
  });
});
