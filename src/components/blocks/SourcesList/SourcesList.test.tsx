import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatFrenchDate, SourcesList } from "./SourcesList";

const texts = {
  source_verifiee: "vérifiée le {date}",
  source_consultee: "consultée le {date}",
  lien_externe: "site officiel, lien externe",
};

describe("SourcesList", () => {
  it("formate les dates en français", () => {
    expect(formatFrenchDate("2026-04-15")).toBe("15 avril 2026");
  });

  it("liste les sources avec leurs dates et signale les liens externes", () => {
    render(
      <SourcesList
        texts={texts}
        sources={[
          {
            libelle: "service-public.gouv.fr — APA",
            href: "https://www.service-public.gouv.fr/particuliers/vosdroits/F10009",
            verifie_le: "2026-06-01",
            consulte_le: "2026-09-20",
          },
          { libelle: "urssaf.fr", href: "https://www.urssaf.fr/", consulte_le: "2026-09-20" },
        ]}
      />,
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAccessibleName(/APA.*lien externe/);
    expect(links[0]).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.getByText(/vérifiée le 1 juin 2026 · consultée le 20 septembre 2026/),
    ).toBeInTheDocument();
    expect(screen.getByText(/^consultée le 20 septembre 2026$/)).toBeInTheDocument();
  });
});
