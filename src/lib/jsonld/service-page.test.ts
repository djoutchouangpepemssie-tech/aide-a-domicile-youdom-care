import { describe, expect, it } from "vitest";
import { getSiteConfig } from "@/content/loader";
import { serviceExemple } from "../../../tests/fixtures/service-exemple";
import { servicePageJsonLd } from "./service-page";

describe("jsonld/servicePageJsonLd", () => {
  it("émet Service, WebPage et FAQPage pour une page non relue", () => {
    const nodes = servicePageJsonLd(serviceExemple, getSiteConfig(), "Maladies neurodégénératives");
    expect(nodes.map((node) => node["@type"])).toEqual(["Service", "WebPage", "FAQPage"]);
    expect(JSON.stringify(nodes)).not.toMatch(/null|""|\[\]|\{\}/);
  });

  it("remplace WebPage par MedicalWebPage pour une pathologie relue", () => {
    const nodes = servicePageJsonLd(
      {
        ...serviceExemple,
        h1: "Aide à domicile et maladie fictive : rester chez soi",
        relu_par: { nom: "Camille Relecteur", fonction: "neurologue", date: "2026-01-15" },
        statut: "publie",
      },
      getSiteConfig(),
    );
    expect(nodes.map((node) => node["@type"])).toEqual(["Service", "MedicalWebPage", "FAQPage"]);
  });
});
