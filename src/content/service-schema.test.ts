import { describe, expect, it } from "vitest";
import { serviceExemple } from "../../tests/fixtures/service-exemple";
import { frontiereItems, servicePageSchema, wordCount } from "./service-schema";

function issues(input: unknown): string[] {
  const result = servicePageSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
}

describe("en-tête d'une page service", () => {
  it("accepte l'exemple fictif complet", () => {
    expect(issues(serviceExemple)).toEqual([]);
    expect(wordCount("un deux  trois\nquatre")).toBe(4);
  });

  it("accepte, dans « Ce que nous ne faisons pas », une chaîne ou un item avec relais", () => {
    expect(
      issues({
        ...serviceExemple,
        ne_faisons_pas: [
          "Une chaîne.",
          { texte: "Un item." },
          { texte: "Un autre.", relais: "qui" },
        ],
      }),
    ).toEqual([]);
    expect(
      issues({ ...serviceExemple, ne_faisons_pas: ["Une.", { relais: "sans texte" }] }),
    ).toEqual(["ne_faisons_pas.1"]);
    expect(
      issues({ ...serviceExemple, ne_faisons_pas: ["Une.", { texte: "Deux.", autre: "x" }] }),
    ).toEqual(["ne_faisons_pas.1"]);
    expect(frontiereItems(["Une.", { texte: "Deux.", relais: "qui" }])).toEqual([
      { texte: "Une." },
      { texte: "Deux.", relais: "qui" },
    ]);
  });

  it("accepte une destination interne facultative par situation", () => {
    const [first, ...others] = serviceExemple.situations;
    const withHref = (href: string) => ({
      ...serviceExemple,
      situations: [{ ...first, href }, ...others],
    });
    expect(issues(withHref("/demande/sortie-d-hospitalisation/"))).toEqual([]);
    expect(issues(withHref("/aidants"))).toEqual(["situations.0.href"]);
    expect(issues(withHref("https://exemple.org/"))).toEqual(["situations.0.href"]);
    expect(issues(withHref("/aidants/#situations"))).toEqual(["situations.0.href"]);
  });

  it("impose les 13 sections et les règles de docs/03", () => {
    expect(issues({ ...serviceExemple, ne_faisons_pas: [] })).toEqual(["ne_faisons_pas"]);
    expect(issues({ ...serviceExemple, faq: serviceExemple.faq.slice(0, 5) })).toEqual(["faq"]);
    expect(
      issues({
        ...serviceExemple,
        faq: [{ ...serviceExemple.faq[0], reponse: "Trop court." }, ...serviceExemple.faq.slice(1)],
      }),
    ).toEqual(["faq.0.reponse"]);
    expect(
      issues({ ...serviceExemple, semaine_type: { exemple: "x", recit: "Trop court." } }),
    ).toEqual(["semaine_type.recit"]);
    expect(issues({ ...serviceExemple, sources: [serviceExemple.sources[0]] })).toEqual([
      "sources",
    ]);
    expect(issues({ ...serviceExemple, actions: serviceExemple.actions.slice(0, 3) })).toContain(
      "actions",
    );
  });

  it("valide les photos et les icônes facultatives (docs/design/CONCEPT.md §8)", () => {
    const { icone: _icone, hero: _hero, photos: _photos, ...sansPhotos } = serviceExemple;
    expect(
      issues({
        ...sansPhotos,
        semaine_type: { exemple: "madeleine", recit: serviceExemple.semaine_type.recit },
        situations: serviceExemple.situations.map(({ titre, texte }) => ({ titre, texte })),
        ne_faisons_pas: frontiereItems(serviceExemple.ne_faisons_pas).map((item) => item.texte),
      }),
    ).toEqual([]);
    const photo = serviceExemple.hero?.photo;
    expect(
      issues({
        ...serviceExemple,
        hero: { photo: { ...photo, src: "https://exemple.org/a.jpg" } },
      }),
    ).toEqual(["hero.photo.src"]);
    expect(issues({ ...serviceExemple, hero: { photo: { ...photo, alt: " " } } })).toEqual([
      "hero.photo.alt",
    ]);
    expect(issues({ ...serviceExemple, hero: { photo: { ...photo, focal: "centre" } } })).toEqual([
      "hero.photo.focal",
    ]);
    expect(issues({ ...serviceExemple, hero: { photo, ton: "nuit" } })).toEqual(["hero.ton"]);
    expect(issues({ ...serviceExemple, hero: { photo, geste: "carrousel" } })).toEqual([
      "hero.geste",
    ]);
    expect(issues({ ...serviceExemple, hero: { photo, geste: "fiche-de-vie" } })).toEqual([]);
    expect(issues({ ...serviceExemple, hero: { photo, geste: "duree" } })).toEqual([]);
    expect(issues({ ...serviceExemple, libelle_court: "" })).toEqual(["libelle_court"]);
    expect(issues({ ...serviceExemple, ordre: 0 })).toEqual(["ordre"]);
    expect(issues({ ...serviceExemple, icone: "Maison Bleue" })).toEqual(["icone"]);
    expect(
      issues({ ...serviceExemple, photos: { ...serviceExemple.photos, autre: photo } }),
    ).toEqual(["photos"]);
  });

  it("refuse une page publiée sans relecture et une page rattachée sans pilier", () => {
    expect(issues({ ...serviceExemple, statut: "publie" })).toEqual(["statut"]);
    expect(
      issues({
        ...serviceExemple,
        statut: "publie",
        relu_par: { nom: "Relectrice fictive", fonction: "infirmière", date: "2026-09-20" },
      }),
    ).toEqual([]);
    const { pilier: _pilier, ...sansPilier } = serviceExemple;
    expect(issues(sansPilier)).toEqual(["pilier"]);
    expect(issues({ ...sansPilier, type: "pilier" })).toEqual([]);
  });
});
