import { describe, expect, it } from "vitest";
import { getSiteConfig } from "@/content/loader";
import { agencyCoordinates } from "@/content/local";
import type { Agency, SiteConfig } from "@/content/schemas";
import { agencyPath, localBusiness, parseOpeningHours } from "./local-business";

function agency(patch: Partial<Agency> = {}): Agency {
  const base = getSiteConfig().agences.find((a) => a.id === "puteaux");
  if (!base) throw new Error("agence puteaux absente de site.config.json");
  return { ...base, ...patch };
}

function withConfig(patch: (config: SiteConfig) => void): SiteConfig {
  const copy = structuredClone(getSiteConfig());
  patch(copy);
  return copy;
}

describe("jsonld/local-business", () => {
  it("émet une LocalBusiness par agence réelle, avec géo, standard, parent et département", () => {
    const node = localBusiness(agency(), getSiteConfig(), { geo: agencyCoordinates("puteaux") });
    expect(node).toMatchObject({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": "https://www.youdom-care.com/agences/puteaux/#agence",
      name: "Youdom Care Hauts-de-Seine",
      url: "https://www.youdom-care.com/agences/puteaux/",
      address: {
        "@type": "PostalAddress",
        streetAddress: "49-51 quai de Dion-Bouton",
        postalCode: "92800",
        addressLocality: "Puteaux",
        addressCountry: "FR",
      },
      geo: { "@type": "GeoCoordinates", latitude: 48.88366, longitude: 2.248934 },
      telephone: "+33184801703",
      email: "contact@youdom-care.com",
      parentOrganization: { "@id": "https://www.youdom-care.com/#organization" },
      areaServed: { "@type": "AdministrativeArea", name: "Hauts-de-Seine" },
    });
    // Horaires inconnus : aucun openingHoursSpecification, aucune valeur vide.
    expect(node).not.toHaveProperty("openingHoursSpecification");
    expect(JSON.stringify(node)).not.toMatch(/null|""|\[\]|\{\}/);
    expect(agencyPath(agency())).toBe("/agences/puteaux/");
  });

  it("préfère le numéro de l'agence, ajoute les horaires lisibles, omet la géo absente", () => {
    const node = localBusiness(
      agency({ telephone: "01 00 00 00 00", horaires: "Du lundi au vendredi, de 9h à 18h30" }),
      getSiteConfig(),
      { geo: null },
    );
    expect(node?.telephone).toBe("+33100000000");
    expect(node).not.toHaveProperty("geo");
    expect(node?.openingHoursSpecification).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:30",
      },
    ]);
  });

  it("omet le téléphone et l'e-mail inconnus, renvoie null sans adresse", () => {
    const config = withConfig((c) => {
      c.contact.telephone_principal = null;
      c.contact.email = null;
    });
    const node = localBusiness(agency(), config, { geo: null });
    expect(node).not.toHaveProperty("telephone");
    expect(node).not.toHaveProperty("email");
    expect(localBusiness(agency({ adresse: " " }), getSiteConfig())).toBeNull();
  });

  it("lit des horaires en français simple et refuse le reste", () => {
    expect(parseOpeningHours("lundi-vendredi 9h-18h")).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
    ]);
    expect(parseOpeningHours("Du lundi au vendredi de 9h à 18h ; samedi 9h à 12h")).toHaveLength(2);
    expect(parseOpeningHours("samedi 9h à 12h")?.[0]?.dayOfWeek).toEqual(["Saturday"]);
    expect(parseOpeningHours("sur rendez-vous")).toBeNull();
    expect(parseOpeningHours("vendredi au lundi 9h-18h")).toBeNull();
    expect(parseOpeningHours("lundi 25h-26h")).toBeNull();
  });
});
