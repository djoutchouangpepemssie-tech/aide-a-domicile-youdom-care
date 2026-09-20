import { describe, expect, it } from "vitest";
import { buildLlmsInput, isConfirmed, renderLlmsTxt, type LlmsInput } from "./llms";

const input: LlmsInput = {
  nom: "Exemple Care",
  signature: "Une signature.",
  descriptionCourte: "Aide à domicile fictive.",
  url: "https://exemple.test",
  zones: ["Paris", "Essonne"],
  telephone: null,
  regle: { titre: "Informer, jamais soigner", texte: "Aucun conseil médical." },
  piliers: [{ titre: "Aidants", chemin: "/aidants/", description: "Du relais." }],
  services: [],
  fonctionnement: [
    { titre: "Comment ça marche", chemin: "/comment-ca-marche", description: "Quatre étapes." },
  ],
};

describe("llms.txt", () => {
  it("rend le format llms.txt : titre, citation, deux lignes de tête, zone, sections non vides", () => {
    expect(renderLlmsTxt(input)).toBe(
      [
        "# Exemple Care",
        "",
        "> Une signature. Aide à domicile fictive.",
        "",
        "Ce fichier résume le site Exemple Care (aide et accompagnement à domicile) et liste ses pages de référence pour les moteurs de réponse.",
        "Règle éditoriale — Informer, jamais soigner : Aucun conseil médical.",
        "",
        "Zone d'intervention : Paris, Essonne.",
        "",
        "## Pour qui ?",
        "",
        "- [Aidants](https://exemple.test/aidants/): Du relais.",
        "",
        "## Fonctionnement",
        "",
        "- [Comment ça marche](https://exemple.test/comment-ca-marche/): Quatre étapes.",
        "",
      ].join("\n"),
    );
  });

  it("n'écrit le téléphone que s'il est présent et confirmé", () => {
    expect(renderLlmsTxt({ ...input, telephone: "01 00 00 00 00" })).toContain(
      "Téléphone : 01 00 00 00 00.",
    );
    expect(isConfirmed(["contact.telephone_principal"], "contact.telephone_principal")).toBe(false);
    expect(isConfirmed(["agences[*].adresse (orthographe)"], "agences[*].adresse")).toBe(false);
    expect(isConfirmed(["contact.email"], "contact.telephone_principal")).toBe(true);
  });

  it("assemble l'entrée depuis content/ sans page noindex ni fait à confirmer", async () => {
    const built = await buildLlmsInput();
    expect(built.nom).toBe("Youdom Care");
    expect(built.zones).toContain("Val-d'Oise");
    expect(built.regle.titre).toBe("Informer, jamais soigner");
    // Le téléphone figure dans a_confirmer : absent tant qu'Arcel ne l'a pas confirmé.
    expect(built.telephone).toBeNull();
    const chemins = [...built.piliers, ...built.services, ...built.fonctionnement].map(
      (p) => p.chemin,
    );
    expect(chemins).toContain("/comment-ca-marche/");
    expect(chemins).toContain("/etre-rappele/");
    expect(chemins.some((c) => c.startsWith("/merci/") || c.startsWith("/styleguide/"))).toBe(
      false,
    );
    // Aucune page `a_relire` : tant qu'aucune page service n'est relue, les sections sont vides.
    const { listMdxFiles, readServiceMeta, SERVICES_DIR } = await import("@/content/service-meta");
    for (const file of await listMdxFiles(SERVICES_DIR)) {
      const { meta } = await readServiceMeta(file);
      expect(chemins.includes(meta.chemin)).toBe(meta.statut === "publie");
    }
  });
});
