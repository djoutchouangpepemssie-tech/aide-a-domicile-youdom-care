import { describe, expect, it } from "vitest";
import type { SiteMapGroup } from "@/app/plan-du-site/site-map";
import { groupCards, groupOf } from "./GroupLinks";

const groups: SiteMapGroup[] = [
  {
    id: "entreprise",
    title: "Youdom Care",
    entries: [
      {
        href: "/a-propos/",
        label: "À propos",
        children: [{ href: "/a-propos/nos-engagements/", label: "Nos engagements" }],
      },
      { href: "/professionnels/", label: "Professionnels" },
    ],
  },
  {
    id: "legal",
    title: "Informations légales",
    entries: [
      { href: "/mentions-legales/", label: "Mentions légales" },
      { href: "/cookies/", label: "Cookies" },
    ],
  },
];

describe("GroupLinks", () => {
  it("trouve le groupe du plan qui contient la page, entrées à plat avec leurs libellés", () => {
    expect(groupOf(groups, "/a-propos/nos-engagements/")).toEqual({
      id: "entreprise",
      entries: [
        { href: "/a-propos/", label: "À propos" },
        { href: "/a-propos/nos-engagements/", label: "Nos engagements" },
        { href: "/professionnels/", label: "Professionnels" },
      ],
    });
    expect(groupOf(groups, "/cookies/")?.id).toBe("legal");
    expect(groupOf(groups, "/inconnue/")).toBeNull();
  });

  it("calcule, depuis le plan du site réel, les pages sœurs des groupes entreprise, légal et outils", async () => {
    const about = await groupCards("/a-propos/");
    const hrefs = about.map((card) => card.href);
    expect(hrefs).not.toContain("/a-propos/");
    expect(hrefs).toContain("/a-propos/nos-engagements/");
    expect(hrefs).toContain("/professionnels/");
    expect(hrefs).toContain("/recrutement/");
    expect(about.length).toBeGreaterThanOrEqual(3);
    expect(about.length).toBeLessThanOrEqual(6);
    for (const card of about) {
      expect(card.href).toMatch(/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/);
      expect(card.label.trim().length).toBeGreaterThan(0);
      expect(card.tier).toBe("groupe");
    }
    const legal = (await groupCards("/accessibilite/")).map((card) => card.href);
    expect(legal).toEqual(
      expect.arrayContaining(["/mentions-legales/", "/cookies/", "/conditions-generales/"]),
    );
    expect(legal).not.toContain("/accessibilite/");
    const tools = await groupCards("/outils/");
    expect(tools.length).toBeGreaterThanOrEqual(3);
    for (const card of tools) expect(card.href.startsWith("/outils/")).toBe(true);
    expect(await groupCards("/page-inconnue/")).toEqual([]);
  }, 30_000);
});
