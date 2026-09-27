import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { getLexiquePage } from "@/content/loader";
import { LexiqueIndex, matchesQuery, normalizeQuery, type LexiqueIndexGroup } from "./LexiqueIndex";

const groups: LexiqueIndexGroup[] = [
  {
    lettre: "A",
    termes: [
      {
        slug: "apa",
        terme: "APA",
        developpe: "Allocation personnalisée d'autonomie",
        definition: "Une aide du département.",
        variantes: ["allocation personnalisée d'autonomie"],
      },
      {
        slug: "auxiliaire-de-vie",
        terme: "auxiliaire de vie",
        definition: "La personne qui aide.",
      },
    ],
  },
  {
    lettre: "S",
    termes: [
      {
        slug: "sessad",
        terme: "SESSAD",
        developpe: "Service d'éducation spéciale et de soins à domicile",
        definition: "Un service médico-social.",
      },
    ],
  },
];

function renderIndex() {
  const page = getLexiquePage();
  return render(
    <LexiqueIndex groups={groups} texts={page.recherche} lettresNom={page.lettres_nom} />,
  );
}

describe("LexiqueIndex", () => {
  it("rend les lettres ancrées, une section par lettre et un lien par terme", () => {
    renderIndex();
    const letters = screen.getByRole("navigation", { name: "Aller à une lettre" });
    expect(
      within(letters)
        .getAllByRole("link")
        .map((a) => a.getAttribute("href")),
    ).toEqual(["#lettre-a", "#lettre-s"]);
    const a = screen.getByRole("region", { name: "A" });
    expect(a).toHaveAttribute("id", "lettre-a");
    expect(
      within(a)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(["APA", "auxiliaire de vie"]);
    expect(within(a).getByRole("link", { name: "APA" })).toHaveAttribute(
      "href",
      expect.stringContaining("/lexique/apa"),
    );
    expect(a).toHaveTextContent("Allocation personnalisée d'autonomie");
    expect(a).toHaveTextContent("Une aide du département.");
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("filtre la liste sans accents ni casse, annonce le compte et l'absence de résultat", async () => {
    const user = userEvent.setup();
    renderIndex();
    const input = screen.getByRole("searchbox", { name: "Chercher un terme" });
    await user.type(input, "Éducation");
    expect(screen.getByRole("status")).toHaveTextContent("1 terme affiché");
    expect(screen.queryByRole("region", { name: "A" })).toBeNull();
    expect(screen.getByRole("region", { name: "S" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "Aller à une lettre" })).getAllByRole("link"),
    ).toHaveLength(1);

    await user.clear(input);
    await user.type(input, "autonomie");
    expect(screen.getByRole("status")).toHaveTextContent("1 terme affiché");
    expect(screen.getByRole("link", { name: "APA" })).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "zzz");
    expect(screen.getByRole("status")).toHaveTextContent(/Aucun terme ne correspond/);
    expect(screen.queryAllByRole("region")).toHaveLength(0);

    await user.clear(input);
    expect(screen.getAllByRole("region")).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("compare sans accents, casse ni blancs superflus", () => {
    expect(normalizeQuery("  Éducation   Spéciale ")).toBe("education speciale");
    const apa = groups[0]?.termes[0];
    if (!apa) throw new Error("fixture");
    expect(matchesQuery(apa, "personnalisee")).toBe(true);
    expect(matchesQuery(apa, "pch")).toBe(false);
    expect(matchesQuery(apa, "")).toBe(true);
  });
});
