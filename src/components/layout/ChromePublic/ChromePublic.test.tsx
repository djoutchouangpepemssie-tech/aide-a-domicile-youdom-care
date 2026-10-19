import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChromePublic, estSansHabillage } from "./ChromePublic";

const pathname = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

describe("l'habillage public", () => {
  it("reste sur le site", () => {
    for (const chemin of ["/", "/personnes-agees/", "/demande/personne-agee/", "/bureauxyz"]) {
      expect(estSansHabillage(chemin)).toBe(false);
    }
  });

  it("se retire dans le back-office", () => {
    for (const chemin of ["/bureau", "/bureau/", "/bureau/semaine/", "/bureau/connexion/"]) {
      expect(estSansHabillage(chemin)).toBe(true);
    }
  });

  it("ne rend rien sous /bureau/ et rend ses enfants ailleurs", () => {
    pathname.value = "/bureau/semaine/";
    const { unmount } = render(
      <ChromePublic>
        <p>en-tête du site</p>
      </ChromePublic>,
    );
    expect(screen.queryByText("en-tête du site")).toBeNull();
    unmount();

    pathname.value = "/personnes-agees/";
    render(
      <ChromePublic>
        <p>en-tête du site</p>
      </ChromePublic>,
    );
    expect(screen.getByText("en-tête du site")).toBeVisible();
  });
});
