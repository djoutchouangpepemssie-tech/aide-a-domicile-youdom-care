import { describe, expect, it } from "vitest";
import { getSiteConfig } from "@/content/loader";
import type { ServicePage } from "@/content/service-schema";
import { serviceExemple } from "../../../tests/fixtures/service-exemple";
import { conditionNameFromH1, medicalWebPage, webPage } from "./web-page";

const relue: ServicePage = {
  ...serviceExemple,
  h1: "Aide à domicile et maladie fictive : rester chez soi",
  relu_par: { nom: "Camille Relecteur", fonction: "neurologue", date: "2026-01-15" },
  statut: "publie",
};

describe("jsonld/webPage", () => {
  it("décrit la page avec sa date de mise à jour, son auteur et l'éditeur par référence", () => {
    const node = webPage(serviceExemple, getSiteConfig());
    expect(node).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": "https://www.youdom-care.com/exemple/page-test/",
      url: "https://www.youdom-care.com/exemple/page-test/",
      name: serviceExemple.titre,
      headline: "Exemple de page service",
      inLanguage: "fr-FR",
      dateModified: "2026-09-20",
      author: { "@type": "Person", name: "Auteur fictif", jobTitle: "rédaction" },
      publisher: { "@id": "https://www.youdom-care.com/#organization" },
    });
    expect(node).not.toHaveProperty("reviewedBy");
    expect(node).not.toHaveProperty("lastReviewed");
    expect(JSON.stringify(node)).not.toMatch(/null|""|\[\]|\{\}/);
  });

  it("mentionne le relecteur sur une WebPage relue qui n'est pas une pathologie", () => {
    const node = webPage({ ...relue, type: "sous-page" }, getSiteConfig());
    expect(node).toMatchObject({
      "@type": "WebPage",
      reviewedBy: { "@type": "Person", name: "Camille Relecteur", jobTitle: "neurologue" },
      lastReviewed: "2026-01-15",
    });
  });

  it("renvoie null sans titre, sans chemin ou sans date de mise à jour", () => {
    expect(webPage({ ...serviceExemple, titre: "" }, getSiteConfig())).toBeNull();
    expect(webPage({ ...serviceExemple, chemin: "" }, getSiteConfig())).toBeNull();
    expect(webPage({ ...serviceExemple, maj: "" }, getSiteConfig())).toBeNull();
  });
});

describe("jsonld/medicalWebPage", () => {
  it("n'existe que pour une pathologie relue", () => {
    expect(medicalWebPage(serviceExemple, getSiteConfig())).toBeNull();
    expect(medicalWebPage({ ...relue, type: "sous-page" }, getSiteConfig())).toBeNull();
    expect(
      medicalWebPage(
        { ...relue, relu_par: { nom: "", fonction: "x", date: "2026-01-15" } },
        getSiteConfig(),
      ),
    ).toBeNull();
  });

  it("nomme la maladie d'après le H1, le relecteur, la date de relecture et le public aidant", () => {
    const node = medicalWebPage(relue, getSiteConfig());
    expect(node).toMatchObject({
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: relue.titre,
      dateModified: "2026-09-20",
      about: { "@type": "MedicalCondition", name: "maladie fictive" },
      lastReviewed: "2026-01-15",
      reviewedBy: { "@type": "Person", name: "Camille Relecteur", jobTitle: "neurologue" },
      audience: { "@type": "PeopleAudience", audienceType: "Proches aidants" },
      publisher: { "@id": "https://www.youdom-care.com/#organization" },
    });
    expect(JSON.stringify(node)).not.toMatch(/null|""|\[\]|\{\}/);
  });

  it("extrait le nom de la maladie du H1", () => {
    expect(
      conditionNameFromH1("Aide à domicile et maladie d'Alzheimer : rester chez soi, accompagné"),
    ).toBe("maladie d'Alzheimer");
    expect(conditionNameFromH1("Aide à domicile et sclérose en plaques : garder l'énergie")).toBe(
      "sclérose en plaques",
    );
    expect(conditionNameFromH1("Autisme : une aide prévisible")).toBe("Autisme");
    expect(conditionNameFromH1("Sans deux-points", "Libellé")).toBe("Libellé");
    expect(conditionNameFromH1("Sans deux-points")).toBe("Sans deux-points");
    expect(conditionNameFromH1("")).toBeNull();
  });
});
