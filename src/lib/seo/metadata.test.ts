import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalUrl, isNeverIndexed, normalizePath, pageMetadata } from "./metadata";

const titre = "Garde de nuit à domicile à Paris et en Île-de-France";
const description =
  "Présence de nuit calme ou active, ponctuelle ou régulière, auprès d'une personne âgée, malade ou en situation de handicap. Devis gratuit et détaillé.";

describe("pageMetadata", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalise les chemins et construit une canonique absolue avec barre finale", () => {
    expect(normalizePath("aidants")).toBe("/aidants/");
    expect(normalizePath("/aidants/?commune=75056#form")).toBe("/aidants/");
    expect(normalizePath("/")).toBe("/");
    expect(canonicalUrl("/services/garde-de-nuit")).toBe(
      "https://www.youdom-care.com/services/garde-de-nuit/",
    );
    expect(canonicalUrl("/", "https://exemple.fr")).toBe("https://exemple.fr/");
  });

  it("produit titre, description, canonique, Open Graph et Twitter cohérents", () => {
    vi.stubEnv("SITE_INDEXABLE", "true");
    const metadata = pageMetadata({ titre, description, chemin: "/services/garde-de-nuit/" });
    expect(metadata.title).toBe("Garde de nuit à domicile à Paris et en Île-de-France");
    expect(metadata.description).toBe(description);
    expect(metadata.alternates?.canonical).toBe(
      "https://www.youdom-care.com/services/garde-de-nuit/",
    );
    expect(metadata.openGraph).toEqual({
      type: "website",
      locale: "fr_FR",
      siteName: "Youdom Care",
      url: "https://www.youdom-care.com/services/garde-de-nuit/",
      title: "Garde de nuit à domicile à Paris et en Île-de-France",
      description,
    });
    expect(metadata.twitter).toEqual({
      card: "summary_large_image",
      title: "Garde de nuit à domicile à Paris et en Île-de-France",
      description,
    });
    expect("robots" in metadata).toBe(false);
  });

  it("ajoute la marque quand la place le permet", () => {
    const metadata = pageMetadata({ titre: "Garde de nuit à domicile", description, chemin: "/" });
    expect(metadata.title).toBe("Garde de nuit à domicile | Youdom Care");
    expect(metadata.openGraph?.title).toBe("Garde de nuit à domicile | Youdom Care");
  });

  it("ferme la page tant que le site n'est pas ouvert", () => {
    vi.stubEnv("SITE_INDEXABLE", "false");
    const metadata = pageMetadata({ titre, description, chemin: "/aidants/" });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("respecte noindex et les chemins jamais indexés même site ouvert", () => {
    vi.stubEnv("SITE_INDEXABLE", "true");
    expect(pageMetadata({ titre, description, chemin: "/aidants/", noindex: true }).robots).toEqual(
      { index: false, follow: false },
    );
    expect(pageMetadata({ titre, description, chemin: "/merci/rappel/" }).robots).toEqual({
      index: false,
      follow: false,
    });
    expect(pageMetadata({ titre, description, chemin: "/styleguide/blocs/" }).robots).toEqual({
      index: false,
      follow: false,
    });
    expect(isNeverIndexed("/merci/")).toBe(true);
    expect(isNeverIndexed("/api/lead/")).toBe(true);
    expect(isNeverIndexed("/mercier/")).toBe(false);
  });

  it("relaie une image Open Graph explicite", () => {
    const metadata = pageMetadata({
      titre,
      description,
      chemin: "/aidants/",
      image: "/images/og/aidants.png",
    });
    expect(metadata.openGraph).toMatchObject({
      images: [{ url: "/images/og/aidants.png", width: 1200, height: 630, alt: titre }],
    });
    expect(metadata.twitter).toMatchObject({ images: ["/images/og/aidants.png"] });
  });
});
