import { describe, expect, it } from "vitest";
import siteConfigJson from "../../../content/site.config.json";
import { siteConfigSchema, type Agency, type JobOffer } from "@/content/schemas";
import { jobPosting } from "./job-posting";
import { staticWebPage } from "./static-web-page";

const config = siteConfigSchema.parse(siteConfigJson);
const agency = config.agences.find((a) => a.id === "puteaux") as Agency;

const offer: JobOffer = {
  slug: "auxiliaire-de-vie-puteaux",
  titre: "Auxiliaire de vie à domicile",
  description: "Accompagner des personnes âgées chez elles, à Puteaux et alentour.",
  contrat: "cdi",
  temps_de_travail: "temps-partiel",
  lieu: "puteaux",
  secteur: "Puteaux, Nanterre, Suresnes",
  publiee_le: "2026-09-01",
  valable_jusqu_au: "2026-12-31",
  missions: ["Aider au lever et à la toilette."],
  profil: ["Expérience auprès de personnes âgées."],
  statut: "publiee",
};

describe("JobPosting (docs/04 §2 : offres réelles seulement)", () => {
  it("émet un nœud complet avec l'adresse de l'agence, sans salaire quand il n'est pas fourni", () => {
    const node = jobPosting(
      {
        offer,
        agency,
        chemin: "/recrutement/offre/auxiliaire-de-vie-puteaux/",
        today: "2026-09-27",
      },
      config,
    );
    expect(node).toMatchObject({
      "@type": "JobPosting",
      title: "Auxiliaire de vie à domicile",
      datePosted: "2026-09-01",
      validThrough: "2026-12-31",
      employmentType: ["FULL_TIME", "PART_TIME"],
      url: "https://www.youdom-care.com/recrutement/offre/auxiliaire-de-vie-puteaux/",
      hiringOrganization: {
        name: "Youdom Care",
        "@id": "https://www.youdom-care.com/#organization",
      },
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          streetAddress: "49-51 quai de Dion-Bouton",
          postalCode: "92800",
          addressLocality: "Puteaux",
          addressCountry: "FR",
        },
        telephone: "+33184801703",
      },
      directApply: true,
    });
    expect(node?.description).toContain("- Aider au lever et à la toilette.");
    expect(node).not.toHaveProperty("baseSalary");
  });

  it("reprend le salaire réel de l'offre et le contrat à durée déterminée", () => {
    const node = jobPosting(
      {
        offer: {
          ...offer,
          contrat: "cdd",
          temps_de_travail: "temps-plein",
          salaire: { min: 12, max: 14, unite: "heure", devise: "EUR" },
        },
        agency,
        chemin: "/recrutement/offre/auxiliaire-de-vie-puteaux/",
        today: "2026-09-27",
      },
      config,
    );
    expect(node?.employmentType).toEqual(["TEMPORARY"]);
    expect(node?.baseSalary).toEqual({
      "@type": "MonetaryAmount",
      currency: "EUR",
      value: { "@type": "QuantitativeValue", minValue: 12, maxValue: 14, unitText: "HOUR" },
    });
  });

  it("n'émet rien pour un brouillon ni pour une offre expirée", () => {
    const input = { offer, agency, chemin: "/recrutement/offre/x/", today: "2026-09-27" };
    expect(jobPosting({ ...input, offer: { ...offer, statut: "brouillon" } }, config)).toBeNull();
    expect(jobPosting({ ...input, today: "2027-01-01" }, config)).toBeNull();
  });
});

describe("WebPage d'une page statique", () => {
  it("date la page par la date déclarée et n'émet rien sans date", () => {
    const input = {
      titre: "Prescripteurs : organiser une aide à domicile avec nous",
      description: "Description.",
      chemin: "/professionnels/",
      h1: "Professionnels",
      maj: "2026-09-27",
    };
    expect(staticWebPage(input, config)).toMatchObject({
      "@type": "WebPage",
      url: "https://www.youdom-care.com/professionnels/",
      headline: "Professionnels",
      dateModified: "2026-09-27",
      publisher: { "@id": "https://www.youdom-care.com/#organization" },
    });
    expect(staticWebPage({ ...input, maj: undefined }, config)).toBeNull();
  });
});
