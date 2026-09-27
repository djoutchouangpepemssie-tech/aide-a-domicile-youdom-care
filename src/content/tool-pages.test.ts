import { describe, expect, it } from "vitest";
import { checkDocument } from "../../scripts/validate/check-copy";
import { getAidPage } from "./aid-pages";
import { getAids } from "./loader";
import {
  getToolPage,
  getToolsPage,
  latestToolUpdate,
  listToolIds,
  listToolPages,
  toolPath,
  toolPdfPath,
} from "./tool-pages";
import { toolPageSchema } from "./tools-schema";
import { pageTitle } from "@/lib/seo/title";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("Outils à imprimer (content/outils)", () => {
  it("enregistre les cinq outils de docs/06 §7, dans l'ordre de l'index", () => {
    expect(listToolIds()).toEqual([
      "sortie-d-hospitalisation-48-heures",
      "fiche-de-vie-enfant",
      "fiche-de-vie-personne-agee",
      "tour-du-logement-anti-chutes",
      "aides-en-un-coup-d-oeil",
    ]);
    expect(listToolPages()).toHaveLength(5);
    expect(getToolPage("inconnu")).toBeNull();
    expect(toolPath("fiche-de-vie-enfant")).toBe("/outils/fiche-de-vie-enfant/");
    expect(toolPdfPath("fiche-de-vie-enfant")).toBe("/outils/fiche-de-vie-enfant.pdf");
    expect(latestToolUpdate()).toMatch(ISO_DATE);
  });

  it("chaque outil : id conforme, balises SEO aux bonnes longueurs, deux phrases de mode d'emploi, date", () => {
    for (const page of listToolPages()) {
      expect(page.id).toBe(listToolIds()[listToolPages().indexOf(page)]);
      const title = pageTitle(page.seo.titre, "Youdom Care");
      expect(title.length, `${page.id} : titre « ${title} »`).toBeGreaterThanOrEqual(50);
      expect(title.length, `${page.id} : titre « ${title} »`).toBeLessThanOrEqual(60);
      expect(page.seo.description.length, page.id).toBeGreaterThanOrEqual(140);
      expect(page.seo.description.length, page.id).toBeLessThanOrEqual(155);
      expect(page.mode_emploi).toHaveLength(2);
      expect(page.maj).toMatch(ISO_DATE);
      expect(page.sections.length).toBeGreaterThanOrEqual(3);
    }
    const index = getToolsPage();
    const indexTitle = pageTitle(index.seo.titre, "Youdom Care");
    expect(indexTitle.length).toBeGreaterThanOrEqual(50);
    expect(indexTitle.length).toBeLessThanOrEqual(60);
    expect(index.seo.description.length).toBeGreaterThanOrEqual(140);
    expect(index.seo.description.length).toBeLessThanOrEqual(155);
  });

  it("respecte la voix de docs/01 : aucun mot interdit, aucun libellé banni", () => {
    for (const page of [...listToolPages(), getToolsPage()]) {
      const hits = checkDocument("outil", page).map((h) => `${h.pointer} : ${h.message}`);
      expect(hits, JSON.stringify(hits, null, 1)).toEqual([]);
    }
  });

  it("chaque case a un texte court et chaque champ au plus six lignes", () => {
    for (const page of listToolPages()) {
      for (const section of page.sections) {
        for (const item of section.items) {
          if (item.type === "case") expect(item.texte.split(/\s+/).length).toBeLessThanOrEqual(24);
          if (item.type === "champ") expect(item.lignes ?? 1).toBeLessThanOrEqual(6);
        }
      }
    }
  });

  it("cite des sources datées du jour de lecture dès qu'un fait est affirmé (chutes, sortie, aides)", () => {
    for (const id of [
      "sortie-d-hospitalisation-48-heures",
      "tour-du-logement-anti-chutes",
      "aides-en-un-coup-d-oeil",
    ]) {
      const page = getToolPage(id);
      expect(page?.sources?.length ?? 0, id).toBeGreaterThan(0);
      for (const source of page?.sources ?? []) {
        expect(source.consulte_le).toBe("2026-09-27");
        expect(source.href).toMatch(
          /^https:\/\/www\.(has-sante\.fr|pour-les-personnes-agees\.gouv\.fr|ameli\.fr|santepubliquefrance\.fr|service-public\.gouv\.fr)\//,
        );
      }
    }
    // Les modèles de fiche de vie n'affirment aucun fait : pas de source, mais une note de prudence.
    for (const id of ["fiche-de-vie-enfant", "fiche-de-vie-personne-agee"]) {
      const page = getToolPage(id);
      expect(page?.sources).toBeUndefined();
      expect(page?.prudence?.length ?? 0).toBeGreaterThan(0);
      expect(page?.sections.flatMap((s) => s.items).every((i) => i.type !== "case")).toBe(true);
    }
  });

  it("le mémo des aides ne porte aucun chiffre absent de content/aides/{id}.json, et couvre chaque aide", () => {
    const memo = getToolPage("aides-en-un-coup-d-oeil");
    const aidIds = getAids().aides.map((a) => a.id);
    const sectionsWithAid = memo?.sections.filter((s) => s.aide !== undefined) ?? [];
    expect(sectionsWithAid.map((s) => s.aide).sort()).toEqual([...aidIds].sort());
    for (const section of sectionsWithAid) {
      const aid = getAidPage(section.aide ?? "");
      expect(aid, section.aide).not.toBeNull();
      const known = JSON.stringify(aid);
      const combien = section.items.find((i) => i.type === "info" && i.libelle === "Combien");
      expect(combien, section.h2).toBeDefined();
      const text = combien?.type === "info" ? combien.texte : "";
      for (const amount of text.match(/\d[\d   ]*(?:,\d+)?\s?(?:€|%)/g) ?? []) {
        const normalized = amount.replace(/\s?(€|%)$/, "").trim();
        expect(known, `${section.h2} : « ${amount} » introuvable dans content/aides`).toContain(
          normalized,
        );
      }
      // La date de vérification citée dans l'intro est celle d'une source de la page d'aide.
      expect(section.intro).toMatch(/vérifié(?:e)?s? le \d/);
    }
  });

  it("refuse un outil sans mode d'emploi en deux phrases ou avec une clé inconnue", () => {
    const page = getToolPage("fiche-de-vie-enfant");
    expect(toolPageSchema.safeParse({ ...page, mode_emploi: ["Une seule phrase."] }).success).toBe(
      false,
    );
    expect(toolPageSchema.safeParse({ ...page, inconnu: true }).success).toBe(false);
    expect(
      toolPageSchema.safeParse({
        ...page,
        sections: [{ h2: "X", items: [{ type: "champ", libelle: "Y", lignes: 9 }] }],
      }).success,
    ).toBe(false);
  });
});
