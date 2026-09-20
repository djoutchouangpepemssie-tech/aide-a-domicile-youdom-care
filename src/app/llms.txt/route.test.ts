import { describe, expect, it } from "vitest";
import { GET, dynamic } from "./route";

describe("GET /llms.txt", () => {
  it("répond en texte brut UTF-8, statique, avec le résumé du site", async () => {
    expect(dynamic).toBe("force-static");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    const body = await response.text();
    expect(body.startsWith("# Youdom Care\n\n> Vous, chez vous. Nous, à vos côtés. ")).toBe(true);
    expect(body).toContain("Règle éditoriale — Informer, jamais soigner :");
    expect(body).toContain("Zone d'intervention : Paris, ");
    expect(body).toContain("(https://www.youdom-care.com/comment-ca-marche/)");
    expect(body).toContain("(https://www.youdom-care.com/tarifs-et-aides/)");
    expect(body).toContain("(https://www.youdom-care.com/a-propos/)");
    expect(body).toContain("(https://www.youdom-care.com/etre-rappele/)");
    expect(body).not.toContain("/merci/");
    expect(body).not.toContain("/styleguide/");
    // Téléphone listé dans a_confirmer : jamais écrit tant qu'il n'est pas confirmé.
    expect(body).not.toMatch(/Téléphone/);
    expect(body.endsWith("\n")).toBe(true);
  });
});
