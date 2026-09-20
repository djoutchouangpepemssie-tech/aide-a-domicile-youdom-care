import { describe, expect, it } from "vitest";
import { getSiteConfig } from "@/content/loader";
import { serviceExemple } from "../../../tests/fixtures/service-exemple";
import { service } from "./service";

describe("jsonld/service", () => {
  it("décrit le service avec le fournisseur par référence, les zones et le public", () => {
    const node = service(serviceExemple, getSiteConfig(), "Maladies neurodégénératives");
    expect(node).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": "https://www.youdom-care.com/exemple/page-test/#service",
      name: serviceExemple.titre,
      serviceType: "Exemple de page service",
      description: serviceExemple.description,
      url: "https://www.youdom-care.com/exemple/page-test/",
      provider: { "@id": "https://www.youdom-care.com/#organization" },
      audience: { "@type": "PeopleAudience", audienceType: "Maladies neurodégénératives" },
    });
    expect(node?.areaServed).toHaveLength(8);
    expect(JSON.stringify(node)).not.toMatch(/null|""|\[\]|\{\}/);
  });

  it("omet le public quand il est transverse ou absent", () => {
    expect(
      service({ ...serviceExemple, public: "transverse" }, getSiteConfig(), "Nos services"),
    ).not.toHaveProperty("audience");
    expect(service(serviceExemple, getSiteConfig())).not.toHaveProperty("audience");
  });

  it("renvoie null sans H1, sans description ou sans chemin", () => {
    expect(service({ ...serviceExemple, h1: "" }, getSiteConfig())).toBeNull();
    expect(service({ ...serviceExemple, description: " " }, getSiteConfig())).toBeNull();
    expect(service({ ...serviceExemple, chemin: "" }, getSiteConfig())).toBeNull();
  });
});
