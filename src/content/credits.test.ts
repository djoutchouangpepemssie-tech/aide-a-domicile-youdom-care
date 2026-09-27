import { describe, expect, it } from "vitest";
import { getPhotoCredits, groupByAuthor, parseCredits } from "./credits";

const sample = `# Crédits

| Fichier | Source | Auteur | Adresse de la page | Licence | Téléchargé le |
| --- | --- | --- | --- | --- | --- |
| heros/a.jpg | Pexels | Kampus Production | https://www.pexels.com/photo/1/ | Licence Pexels | 2026-09-20 |
| heros/b.jpg | Pexels | Kampus Production | https://www.pexels.com/photo/2/ | Licence Pexels | 2026-09-20 |
| ambiance/c.jpg | Unsplash | season youn | https://unsplash.com/photos/x | Licence Unsplash | 2026-09-20 |
| ambiance/d.jpg | Pexels |  | https://www.pexels.com/photo/4/ | Licence Pexels | 2026-09-20 |

Licences : Pexels — https://www.pexels.com/license/ ; Unsplash — https://unsplash.com/license.
`;

describe("crédits photographiques (public/images/CREDITS.md)", () => {
  it("lit le tableau, ignore une ligne sans auteur, et relève les licences", () => {
    const { photos, licences } = parseCredits(sample);
    expect(photos).toHaveLength(3);
    expect(photos[0]).toEqual({
      fichier: "heros/a.jpg",
      source: "Pexels",
      auteur: "Kampus Production",
      href: "https://www.pexels.com/photo/1/",
      licence: "Licence Pexels",
    });
    expect(licences).toEqual([
      { source: "Pexels", href: "https://www.pexels.com/license/" },
      { source: "Unsplash", href: "https://unsplash.com/license" },
    ]);
  });

  it("regroupe par auteur, source et licence, dans l'ordre alphabétique", () => {
    const groups = groupByAuthor(parseCredits(sample).photos);
    expect(groups.map((g) => [g.auteur, g.photos.length])).toEqual([
      ["Kampus Production", 2],
      ["season youn", 1],
    ]);
  });

  it("le fichier du dépôt donne toutes les photos servies, avec auteur, adresse et licence", () => {
    const { photos, licences } = getPhotoCredits();
    expect(photos.length).toBeGreaterThanOrEqual(50);
    for (const photo of photos) {
      expect(photo.auteur).not.toBe("");
      expect(photo.href).toMatch(/^https:\/\/(www\.pexels\.com|unsplash\.com)\//);
      expect(["Licence Pexels", "Licence Unsplash"]).toContain(photo.licence);
    }
    expect(licences.map((l) => l.source)).toEqual(["Pexels", "Unsplash"]);
  });
});
