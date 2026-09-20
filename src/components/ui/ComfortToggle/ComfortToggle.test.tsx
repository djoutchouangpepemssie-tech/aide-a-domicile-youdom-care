import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { COMFORT_STORAGE_KEY } from "@/lib/comfort";
import { ComfortToggle } from "./ComfortToggle";

const texts = { libelle: "Confort de lecture", description: "Texte plus grand." };

describe("ComfortToggle", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.comfort;
    localStorage.clear();
  });

  it("active le mode, le mémorise et annonce son état", async () => {
    render(<ComfortToggle texts={texts} />);
    const button = screen.getByRole("button", { name: "Confort de lecture" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.dataset.comfort).toBe("on");
    expect(localStorage.getItem(COMFORT_STORAGE_KEY)).toBe("on");

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement.dataset.comfort).toBeUndefined();
    expect(localStorage.getItem(COMFORT_STORAGE_KEY)).toBe("off");
  });

  it("reflète un mode déjà restauré et synchronise ses instances", async () => {
    document.documentElement.dataset.comfort = "on";
    render(
      <>
        <ComfortToggle texts={texts} />
        <ComfortToggle texts={texts} tone="dark" />
      </>,
    );
    const [first, second] = screen.getAllByRole("button", { name: "Confort de lecture" });
    expect(first).toHaveAttribute("aria-pressed", "true");
    expect(second).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(second as HTMLElement);
    expect(first).toHaveAttribute("aria-pressed", "false");
    expect(second).toHaveAttribute("aria-pressed", "false");
  });
});
