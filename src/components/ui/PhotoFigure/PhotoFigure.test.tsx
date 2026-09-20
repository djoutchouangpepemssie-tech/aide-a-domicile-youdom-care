import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PhotoFigure, photoSizes } from "./PhotoFigure";

describe("PhotoFigure", () => {
  it("rend l'image dans un conteneur au ratio fixe, avec alt, focal et rayon 20 px", () => {
    const { container } = render(
      <PhotoFigure
        src="/images/exemples/exemple-semaine.jpg"
        alt="Une table de cuisine avec deux tasses"
        ratio="3:2"
        focal="40% 55%"
      />,
    );
    const figure = container.firstElementChild;
    expect(figure).toHaveClass("aspect-[3/2]", "rounded-card", "relative", "overflow-hidden");
    expect(figure).toHaveAttribute("data-ratio", "3:2");
    const img = screen.getByRole("img", { name: "Une table de cuisine avec deux tasses" });
    expect(img).toHaveStyle({ objectFit: "cover", objectPosition: "40% 55%" });
    expect(img).toHaveAttribute("sizes", photoSizes.full);
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("hero : 16:9 sur mobile, 4:5 sur ordinateur, rayon 28 px, chargement prioritaire", () => {
    const { container } = render(
      <PhotoFigure
        src="/images/exemples/exemple-hero.jpg"
        alt="Une pièce claire avec une table et deux chaises"
        ratio="4:5"
        mobileRatio="16:9"
        radius={28}
        sizes={photoSizes.hero}
        priority
      />,
    );
    const figure = container.firstElementChild;
    expect(figure).toHaveClass("aspect-video", "lg:aspect-[4/5]", "rounded-block");
    expect(figure).not.toHaveClass("aspect-[4/5]");
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("sizes", photoSizes.hero);
    expect(img).not.toHaveAttribute("loading", "lazy");
    expect(img).toHaveStyle({ objectPosition: "50% 50%" });
  });
});
