import { describe, expect, it } from "vitest";
import { pageTitle } from "./title";

describe("pageTitle", () => {
  it("ajoute la marque quand le titre reste sous 60 caractères", () => {
    expect(pageTitle("Garde de nuit à domicile à Paris", "Youdom Care")).toBe(
      "Garde de nuit à domicile à Paris | Youdom Care",
    );
  });

  it("garde le titre seul quand la marque le ferait dépasser", () => {
    const long = "Comment ça marche : l'aide à domicile en quatre étapes";
    expect(pageTitle(long, "Youdom Care")).toBe(long);
  });
});
