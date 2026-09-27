import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatFrenchDate, sourceDomain, SourcesList } from "./SourcesList";

const texts = {
  source_verifiee: "vérifiée le {date}",
  source_consultee: "consultée le {date}",
  lien_externe: "site officiel, lien externe",
};

const sources = [
  {
    libelle: "service-public.gouv.fr — APA",
    href: "https://www.service-public.gouv.fr/particuliers/vosdroits/F10009",
    verifie_le: "2026-06-01",
    consulte_le: "2026-09-20",
  },
  { libelle: "urssaf.fr", href: "https://www.urssaf.fr/", consulte_le: "2026-09-20" },
];

describe("SourcesList", () => {
  it("formate les dates en français et lit le domaine d'une source", () => {
    expect(formatFrenchDate("2026-04-15")).toBe("15 avril 2026");
    expect(sourceDomain("https://www.service-public.gouv.fr/particuliers/x")).toBe(
      "service-public.gouv.fr",
    );
    expect(sourceDomain("pas une adresse")).toBe("pas une adresse");
  });

  it("liste les sources avec leur libellé, leur domaine en pastille et leurs dates, sans lien", () => {
    const { container } = render(<SourcesList texts={texts} sources={sources} />);
    expect(container.firstElementChild).toHaveClass("sources-list");
    expect(container.querySelector("ul")).toHaveClass("md:grid-cols-2");
    // 27/09/2026, demande d'Arcel : plus aucun lien sortant. Le libellé reste, en texte.
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(container.querySelector('a[href^="http"]')).toBeNull();
    expect(container).toHaveTextContent("APA");
    const pills = Array.from(container.querySelectorAll(".bg-teal-50"));
    expect(pills.map((pill) => pill.textContent)).toEqual(["service-public.gouv.fr", "urssaf.fr"]);
    expect(pills[0]).toHaveClass("text-teal-800");
    const dates = screen.getByText(/vérifiée le 1 juin 2026 · consultée le 20 septembre 2026/);
    expect(dates).toHaveClass("tabular-figures");
    expect(screen.getByText(/^consultée le 20 septembre 2026$/)).toBeInTheDocument();
    expect(container.querySelector(".sources-review")).toBeNull();
  });

  it("ajoute une carte de relecture : écrit par, relu par ou en attente, mise à jour", () => {
    const { rerender } = render(
      <SourcesList
        texts={texts}
        sources={sources}
        review={{
          author: "Écrit par la loop, rédaction",
          reviewer: "Relu par A. B., infirmière, le 1 juin 2026",
          updated: "Mise à jour le 20 septembre 2026",
        }}
      />,
    );
    const card = document.querySelector(".sources-review") as HTMLElement;
    expect(within(card).getByText("Écrit par la loop, rédaction")).toBeInTheDocument();
    expect(within(card).getByText(/Relu par A\. B\./)).toBeInTheDocument();
    expect(within(card).getByText(/Mise à jour le 20 septembre 2026/)).toHaveClass(
      "tabular-figures",
    );
    expect(card.querySelector("svg")).toHaveAttribute("aria-hidden", "true");

    rerender(
      <SourcesList
        texts={texts}
        sources={sources}
        review={{
          author: "Écrit par la loop, rédaction",
          reviewer: null,
          pending: "En attente de relecture par un professionnel.",
        }}
      />,
    );
    expect(screen.getByText("En attente de relecture par un professionnel.")).toHaveClass(
      "text-warning",
    );
    expect(screen.queryByText(/Relu par/)).toBeNull();
  });
});
