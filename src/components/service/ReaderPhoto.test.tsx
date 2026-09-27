import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ReaderProvider } from "./ReaderContext";
import { ReaderPhoto } from "./ReaderPhoto";
import { ReaderSwitch } from "./ReaderSwitch";

/*
 * D-026, D-030 : la photo « pour vous-même » n'entre dans la page qu'à la première bascule ;
 * elle y reste ensuite pour que le fondu croisé fonctionne dans les deux sens.
 */

const proche = { src: "/images/hero/proche.jpg", alt: "Photo pour un proche" };
const soi = { src: "/images/hero/soi.jpg", alt: "Photo pour vous-même" };
const texts = { legende: "Vous lisez", proche: "pour un proche", soi: "pour vous-même" };

function Scene() {
  return (
    <ReaderProvider>
      <ReaderSwitch proche="Texte proche." soi="Texte soi." texts={texts} />
      <ReaderPhoto proche={proche} soi={soi} />
    </ReaderProvider>
  );
}

describe("ReaderPhoto", () => {
  it("ne rend que la photo « pour un proche » tant que le lecteur n'a pas basculé", () => {
    render(<Scene />);
    expect(screen.getByAltText(proche.alt)).toBeInTheDocument();
    expect(screen.queryByAltText(soi.alt)).not.toBeInTheDocument();
    expect(document.querySelector("[data-reader-photo]")).toHaveAttribute(
      "data-reader-photo",
      "proche",
    );
  });

  it("monte la seconde photo à la première bascule et la garde ensuite", async () => {
    const user = userEvent.setup();
    render(<Scene />);
    await user.click(screen.getByRole("button", { name: texts.soi }));
    const second = screen.getByAltText(soi.alt);
    expect(second).toBeInTheDocument();
    expect(document.querySelector("[data-reader-photo]")).toHaveAttribute(
      "data-reader-photo",
      "soi",
    );
    // La première photo est masquée aux technologies d'assistance, la seconde visible.
    expect(screen.getByAltText(proche.alt).closest("[aria-hidden]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(second.closest("[aria-hidden]")).toHaveAttribute("aria-hidden", "false");

    await user.click(screen.getByRole("button", { name: texts.proche }));
    // Retour : les deux photos restent en place pour le fondu croisé.
    expect(screen.getByAltText(soi.alt)).toBeInTheDocument();
    expect(screen.getByAltText(proche.alt)).toBeInTheDocument();
    expect(document.querySelector("[data-reader-photo]")).toHaveAttribute(
      "data-reader-photo",
      "proche",
    );
  });
});
