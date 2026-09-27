import { describe, expect, it } from "vitest";
import siteConfig from "../../../content/site.config.json";
import { mesureDepartments, normalizePage } from "./events";
import { mesureBodySchema } from "./schema";

describe("événements de mesure (docs/05 §9, D-029)", () => {
  it("les départements mesurables sont exactement les codes de site.config.zones", () => {
    const codes = siteConfig.zones.map((zone) => zone.code).sort();
    expect([...mesureDepartments].sort()).toEqual(codes);
  });

  it("normalise le chemin de page : sans paramètres, sans ancre, borné", () => {
    expect(normalizePage("/demande/personne-agee/?commune=92062#etape")).toBe(
      "/demande/personne-agee/",
    );
    expect(normalizePage("/Aide-A-Domicile/")).toBe("/aide-a-domicile/");
    expect(normalizePage("javascript:alert(1)")).toBe("/");
    expect(normalizePage("/x".repeat(300))).toHaveLength(200);
  });

  const page = "/demande/personne-agee/";

  it("accepte les quatre événements avec leurs propriétés", () => {
    for (const body of [
      { event: "demande_etape_vue", props: { formulaire: "personne-agee", etape: 3 }, page },
      { event: "demande_envoyee", props: { formulaire: "neuro", departement: "92" }, page },
      { event: "demande_envoyee", props: { formulaire: "contact" }, page: "/contact/" },
      { event: "rappel_envoye", props: {}, page: "/etre-rappele/" },
      { event: "appel_clic", props: { emplacement: "en-tete" }, page: "/" },
    ]) {
      expect(mesureBodySchema.safeParse(body).success, JSON.stringify(body)).toBe(true);
    }
  });

  it("refuse tout ce qui sort des listes fermées", () => {
    for (const body of [
      // événement inconnu
      { event: "page_vue", props: {}, page },
      // propriété interdite
      { event: "rappel_envoye", props: { telephone: "0612345678" }, page },
      { event: "appel_clic", props: { emplacement: "en-tete", nom: "Claire" }, page },
      // commune au lieu du département
      { event: "demande_envoyee", props: { formulaire: "neuro", departement: "92062" }, page },
      { event: "demande_envoyee", props: { formulaire: "neuro", commune: "Puteaux" }, page },
      // texte libre
      { event: "demande_etape_vue", props: { formulaire: "mon formulaire", etape: 1 }, page },
      { event: "appel_clic", props: { emplacement: "Appelez-moi vite" }, page },
      // étape hors bornes ou non entière
      { event: "demande_etape_vue", props: { formulaire: "neuro", etape: 0 }, page },
      { event: "demande_etape_vue", props: { formulaire: "neuro", etape: 7 }, page },
      { event: "demande_etape_vue", props: { formulaire: "neuro", etape: 2.5 }, page },
      // chemin avec paramètres ou hors site
      { event: "appel_clic", props: { emplacement: "rail" }, page: "/?commune=92062" },
      { event: "appel_clic", props: { emplacement: "rail" }, page: "https://autre.example/" },
      // champ en trop à la racine
      { event: "rappel_envoye", props: {}, page, ip: "1.2.3.4" },
    ]) {
      expect(mesureBodySchema.safeParse(body).success, JSON.stringify(body)).toBe(false);
    }
  });
});
