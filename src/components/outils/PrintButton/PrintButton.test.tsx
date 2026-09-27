import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PrintButton } from "./PrintButton";

describe("PrintButton", () => {
  it("est un vrai bouton qui ouvre la boîte d'impression", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<PrintButton>J&apos;imprime cet outil</PrintButton>);
    const button = screen.getByRole("button", { name: "J'imprime cet outil" });
    expect(button).toHaveAttribute("type", "button");
    await userEvent.click(button);
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });
});
