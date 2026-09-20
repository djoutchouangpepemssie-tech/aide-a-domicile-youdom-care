import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroScene } from "./HeroScene";

describe("HeroScene", () => {
  it("rend une maison décorative en CSS pur, sans script", () => {
    const html = renderToString(<HeroScene />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("m-scene--maison");
    expect(html).toContain("--m-scene-size:200px");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<canvas");
  });

  it("assemble la maison : quatre murs, deux pans, deux pignons, une porte, une ombre", () => {
    const { container } = render(<HeroScene variant="maison" size={160} />);
    expect(container.querySelectorAll(".m-scene__wall")).toHaveLength(4);
    expect(container.querySelectorAll(".m-scene__roof")).toHaveLength(2);
    expect(container.querySelectorAll(".m-scene__gable")).toHaveLength(2);
    expect(container.querySelectorAll(".m-scene__door")).toHaveLength(1);
    expect(container.querySelectorAll(".m-scene__shadow")).toHaveLength(1);
    expect(container.querySelector(".m-scene__stage")).not.toBeNull();
    const scene = container.firstElementChild as HTMLElement;
    expect(scene.style.getPropertyValue("--m-scene-size")).toBe("160px");
  });

  it("assemble le fil en trois arcs ouverts avec un seul nœud", () => {
    const { container } = render(<HeroScene variant="fil" className="extra" />);
    expect(container.firstElementChild).toHaveClass("m-scene", "m-scene--fil", "extra");
    expect(container.querySelectorAll(".m-scene__ring")).toHaveLength(3);
    expect(container.querySelectorAll(".m-scene__knot")).toHaveLength(1);
  });
});
