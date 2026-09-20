import { describe, expect, it } from "vitest";
import { getSiteConfig } from "@/content/loader";
import type { SiteConfig } from "@/content/schemas";
import { areaServed, internationalPhone, organization } from "./organization";

function withConfig(patch: (config: SiteConfig) => void): SiteConfig {
  const copy = structuredClone(getSiteConfig());
  patch(copy);
  return copy;
}

describe("jsonld/organization", () => {
  it("émet l'organisation depuis site.config.json sans rien inventer", () => {
    const node = organization(getSiteConfig());
    expect(node).not.toBeNull();
    expect(node).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": "https://www.youdom-care.com/#organization",
      name: "Youdom Care",
      url: "https://www.youdom-care.com/",
      telephone: "+33184801703",
      email: "contact@youdom-care.com",
      identifier: { "@type": "PropertyValue", propertyID: "SIRET", value: "91836660000016" },
      contactPoint: { "@type": "ContactPoint", telephone: "+33184801703" },
    });
    expect(node?.areaServed).toHaveLength(8);
    expect(node?.areaServed).toContainEqual({ "@type": "AdministrativeArea", name: "Paris" });
    // Faits inconnus ou fichiers absents : omis, jamais null ni vides.
    expect(node).not.toHaveProperty("legalName");
    expect(node).not.toHaveProperty("logo");
    expect(node).not.toHaveProperty("sameAs");
    expect(node).not.toHaveProperty("address");
    expect(JSON.stringify(node)).not.toMatch(/null|""|\[\]|\{\}/);
  });

  it("ajoute la raison sociale, les réseaux et le logo quand ils existent", () => {
    const config = withConfig((c) => {
      c.legal.raison_sociale = "Youdom Care SAS";
      c.reseaux_sociaux.linkedin = "https://www.linkedin.com/company/exemple";
      c.reseaux_sociaux.facebook = null;
    });
    const node = organization(config, { logo: "/logo.svg" });
    expect(node).toMatchObject({
      legalName: "Youdom Care SAS",
      sameAs: ["https://www.linkedin.com/company/exemple"],
      logo: "https://www.youdom-care.com/logo.svg",
    });
  });

  it("omet SIRET, téléphone, courriel et point de contact quand ils manquent", () => {
    const config = withConfig((c) => {
      c.legal.siret = null;
      c.contact.telephone_principal = null;
      c.contact.email = null;
    });
    const node = organization(config);
    expect(node).not.toBeNull();
    expect(node).not.toHaveProperty("identifier");
    expect(node).not.toHaveProperty("telephone");
    expect(node).not.toHaveProperty("email");
    expect(node).not.toHaveProperty("contactPoint");
  });

  it("renvoie null sans nom ou sans adresse du site", () => {
    expect(organization(withConfig((c) => (c.marque.nom = " ")))).toBeNull();
    expect(organization(withConfig((c) => (c.marque.url = "")))).toBeNull();
  });

  it("normalise le téléphone et les zones", () => {
    expect(internationalPhone("01 84 80 17 03")).toBe("+33184801703");
    expect(internationalPhone("+33 6 67 22 45 07")).toBe("+33667224507");
    expect(internationalPhone("123")).toBeNull();
    expect(internationalPhone(null)).toBeNull();
    expect(areaServed([{ code: "75", nom: "Paris", slug: "paris" }])).toEqual([
      { "@type": "AdministrativeArea", name: "Paris" },
    ]);
  });
});
