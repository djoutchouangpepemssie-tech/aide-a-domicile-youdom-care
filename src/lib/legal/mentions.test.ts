import { describe, expect, it } from "vitest";
import { getMentionsLegales } from "@/content/legal";
import { getSiteConfig } from "@/content/loader";
import { formatFrenchPhone } from "@/lib/phone";
import { editorEntries, hostEntries, missingLegalFields } from "./mentions";

describe("mentions légales générées depuis site.config.json", () => {
  const config = getSiteConfig();
  const labels = getMentionsLegales().editeur.libelles;

  it("n'affiche que les champs renseignés : nom commercial, SIRET, APE, téléphone, e-mail", () => {
    const ids = editorEntries(config, labels).map((e) => e.id);
    expect(ids).toEqual(["nom_commercial", "siret", "code_ape", "telephone", "email"]);
    for (const id of [
      "raison_sociale",
      "forme_juridique",
      "capital",
      "siege_social",
      "rcs",
      "tva_intracommunautaire",
      "directeur_publication",
    ]) {
      expect(ids).not.toContain(id);
    }
    const values = editorEntries(config, labels).map((e) => e.value);
    expect(values).toContain("918 366 600 00016");
    expect(values.join(" ")).not.toMatch(/à compl[ée]ter|null/);
  });

  it("affiche un champ dès qu'il est renseigné, avec son libellé et un lien pour le contact", () => {
    const filled = structuredClone(config);
    filled.legal.raison_sociale = "Youdom Care SAS";
    filled.legal.rcs = "RCS Paris 918 366 600";
    filled.legal.directeur_publication = "Arcel Doe";
    const entries = editorEntries(filled, labels);
    expect(entries.find((e) => e.id === "raison_sociale")).toEqual({
      id: "raison_sociale",
      label: labels.raison_sociale,
      value: "Youdom Care SAS",
    });
    expect(entries.map((e) => e.id)).toEqual([
      "nom_commercial",
      "raison_sociale",
      "rcs",
      "siret",
      "code_ape",
      "telephone",
      "email",
      "directeur_publication",
    ]);
    expect(entries.find((e) => e.id === "telephone")).toMatchObject({
      value: formatFrenchPhone("01 84 80 17 03"),
      href: "tel:+33184801703",
    });
    expect(entries.find((e) => e.id === "email")?.href).toBe("mailto:contact@youdom-care.com");
  });

  it("hébergeur : le nom seul tant que l'adresse et le contact sont null", () => {
    const labelsHost = getMentionsLegales().hebergeur.libelles;
    expect(hostEntries(config.legal, labelsHost).map((e) => e.value)).toEqual(["Vercel Inc."]);
    const filled = structuredClone(config.legal);
    filled.hebergeur.adresse = "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis";
    filled.hebergeur.contact = "privacy@vercel.com";
    expect(hostEntries(filled, labelsHost).map((e) => e.id)).toEqual([
      "hebergeur_nom",
      "hebergeur_adresse",
      "hebergeur_contact",
    ]);
  });

  it("liste les champs obligatoires manquants avant la mise en ligne, autorisations comprises", () => {
    expect(missingLegalFields(config)).toEqual([
      "legal.raison_sociale",
      "legal.forme_juridique",
      "legal.siege_social",
      "legal.rcs",
      "legal.directeur_publication",
      "legal.mediateur_consommation",
      "legal.hebergeur.adresse",
      "legal.hebergeur.contact",
      "legal.autorisations (mode mandataire proposé)",
    ]);
    const filled = structuredClone(config);
    filled.legal.raison_sociale = "Youdom Care SAS";
    filled.legal.forme_juridique = "SAS";
    filled.legal.siege_social = "61 rue de Lyon, 75012 Paris";
    filled.legal.rcs = "RCS Paris 918 366 600";
    filled.legal.directeur_publication = "Arcel Doe";
    filled.legal.mediateur_consommation = "Médiateur X, 1 rue Y, 75000 Paris";
    filled.legal.hebergeur.adresse = "Covina, CA, États-Unis";
    filled.legal.hebergeur.contact = "privacy@vercel.com";
    filled.modes_intervention = ["prestataire"];
    expect(missingLegalFields(filled)).toEqual([]);
    filled.modes_intervention = ["prestataire", "mandataire"];
    expect(missingLegalFields(filled)).toEqual(["legal.autorisations (mode mandataire proposé)"]);
  });
});
