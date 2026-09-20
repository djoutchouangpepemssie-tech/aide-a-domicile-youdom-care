import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCaregiverCheckPage, getInterfaceTexts } from "@/content/loader";
import { CaregiverFirstQuestion } from "./CaregiverFirstQuestion";
import { DischargeChooser } from "./DischargeChooser";
import { LifeSheetCard } from "./LifeSheetCard";
import { NightChooser } from "./NightChooser";
import { PlanningShortcuts } from "./PlanningShortcuts";
import { StageChooser, markStage } from "./StageChooser";
import { stageAnchorId, withParam } from "./params";

const t = getInterfaceTexts().service.gestes;

/** `next/link` retire la barre finale hors de Next (trailingSlash) : on compare sans elle. */
function href(element: HTMLElement | null): string {
  return (element?.getAttribute("href") ?? "").replace(/\/(?=\?|$)/, "");
}
const hrefs = (elements: HTMLElement[]) => elements.map(href);
const bare = (value: string) => value.replace(/\/(?=\?|$)/, "");

function installMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

describe("params", () => {
  it("ajoute un paramètre de requête à une adresse interne", () => {
    expect(withParam("/demande/x/", "nuit", "calme")).toBe("/demande/x/?nuit=calme");
    expect(withParam("/demande/x/?a=1", "q1", 2)).toBe("/demande/x/?a=1&q1=2");
    expect(withParam("/p/", "sortie", "a-confirmer")).toBe("/p/?sortie=a-confirmer");
    expect(stageAnchorId(0)).toBe("stade-1");
  });
});

describe("StageChooser (« Où en est la maladie ? »)", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.comfort;
    delete document.documentElement.dataset.motion;
    installMatchMedia(false);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sans JavaScript : trois ancres vers les jalons de la section 4", () => {
    const html = renderToString(<StageChooser texts={t.stades} />);
    expect(html).toContain('href="#stade-1"');
    expect(html).toContain('href="#stade-2"');
    expect(html).toContain('href="#stade-3"');
    expect(html).not.toContain("<button");
    expect(html).not.toContain('aria-pressed="');
  });

  it("avec JavaScript : boutons à bascule, défilement jusqu'à la carte et marque `data-active`", async () => {
    const user = userEvent.setup();
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    document.body.innerHTML =
      '<ol><li id="stade-1"></li><li id="stade-2"></li><li id="stade-3"></li></ol>';
    const host = document.createElement("div");
    document.body.append(host);
    render(<StageChooser texts={t.stades} />, { container: host });

    const group = screen.getByRole("group", { name: t.stades.question });
    const buttons = within(group).getAllByRole("button");
    expect(buttons).toHaveLength(3);
    expect(buttons.map((b) => b.getAttribute("aria-pressed"))).toEqual(["false", "false", "false"]);
    expect(within(group).queryByRole("link")).toBeNull();

    await user.click(buttons[1] as HTMLElement);
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
    expect(document.getElementById("stade-2")).toHaveAttribute("data-active", "true");
    expect(document.getElementById("stade-1")).not.toHaveAttribute("data-active");
    expect(scroll).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });

    // Clavier : Tab jusqu'au troisième choix, Entrée.
    (buttons[2] as HTMLElement).focus();
    await user.keyboard("{Enter}");
    expect(buttons[2]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "false");
    expect(document.getElementById("stade-3")).toHaveAttribute("data-active", "true");
    expect(document.getElementById("stade-2")).not.toHaveAttribute("data-active");

    // Mouvement réduit : défilement immédiat.
    document.documentElement.dataset.comfort = "on";
    await user.click(buttons[0] as HTMLElement);
    expect(scroll).toHaveBeenLastCalledWith({ behavior: "auto", block: "start" });
    document.body.innerHTML = "";
  });

  it("markStage ne marque qu'une carte et tolère une carte absente", () => {
    document.body.innerHTML = '<div id="stade-1" data-active="true"></div><div id="stade-2"></div>';
    expect(markStage(1, 3)?.id).toBe("stade-2");
    expect(document.getElementById("stade-1")).not.toHaveAttribute("data-active");
    expect(document.getElementById("stade-2")).toHaveAttribute("data-active", "true");
    expect(markStage(2, 3)).toBeNull();
    document.body.innerHTML = "";
  });
});

describe("PlanningShortcuts, DischargeChooser, NightChooser, CaregiverFirstQuestion (liens)", () => {
  it("PlanningShortcuts : quatre liens vers le formulaire avec ?planning=", () => {
    render(<PlanningShortcuts texts={t.planning} formHref="/demande/adulte-handicap/" />);
    const group = screen.getByRole("group", { name: t.planning.question });
    const links = within(group).getAllByRole("link");
    expect(hrefs(links)).toEqual([
      "/demande/adulte-handicap?planning=matin-soir",
      "/demande/adulte-handicap?planning=semaine",
      "/demande/adulte-handicap?planning=week-end",
      "/demande/adulte-handicap?planning=24h",
    ]);
    expect(links.map((l) => l.textContent)).toEqual(Object.values(t.planning.choix));
    expect(within(group).queryByRole("button")).toBeNull();
  });

  it("DischargeChooser : trois liens vers le formulaire express avec ?sortie=, sans délai", () => {
    render(<DischargeChooser texts={t.sortie} formHref="/demande/sortie-d-hospitalisation/" />);
    const group = screen.getByRole("group", { name: t.sortie.question });
    expect(href(within(group).getByRole("link", { name: "Date à confirmer" }))).toBe(
      bare("/demande/sortie-d-hospitalisation/?sortie=a-confirmer"),
    );
    expect(within(group).getAllByRole("link")).toHaveLength(3);
    expect(group.textContent).not.toMatch(/48 ?h|heures|délai/i);
  });

  it("NightChooser : deux cartes nuit calme / nuit active, phrases visibles, liens ?nuit=", () => {
    render(<NightChooser texts={t.nuit} formHref="/demande/nuit-et-24h/" tone="sombre" />);
    const group = screen.getByRole("group", { name: t.nuit.question });
    expect(href(within(group).getByRole("link", { name: t.nuit.calme.titre }))).toBe(
      bare("/demande/nuit-et-24h/?nuit=calme"),
    );
    expect(href(within(group).getByRole("link", { name: t.nuit.active.titre }))).toBe(
      bare("/demande/nuit-et-24h/?nuit=active"),
    );
    expect(within(group).getByText(t.nuit.calme.texte)).toBeVisible();
    expect(within(group).getByText(t.nuit.active.texte)).toBeVisible();
  });

  it("NightChooser (24h/24) : « Combien de temps ? » avec ?duree=", () => {
    render(<NightChooser texts={t.nuit} formHref="/demande/nuit-et-24h/" variant="duree" />);
    const group = screen.getByRole("group", { name: t.nuit.duree_question });
    expect(hrefs(within(group).getAllByRole("link"))).toEqual([
      "/demande/nuit-et-24h?duree=jours",
      "/demande/nuit-et-24h?duree=semaines",
      "/demande/nuit-et-24h?duree=durable",
    ]);
  });

  it("CaregiverFirstQuestion : la question 1 et ses réponses, ?q1=, mention visible", () => {
    const page = getCaregiverCheckPage();
    const first = page.questions[0];
    if (!first) throw new Error("questionnaire sans question");
    render(
      <CaregiverFirstQuestion
        question={first.texte}
        reponses={page.reponses}
        href="/aidants/ou-en-etes-vous/"
        mention={t.questionnaire.mention}
      />,
    );
    const group = screen.getByRole("group", { name: first.texte });
    const links = within(group).getAllByRole("link");
    expect(hrefs(links)).toEqual([
      "/aidants/ou-en-etes-vous?q1=0",
      "/aidants/ou-en-etes-vous?q1=1",
      "/aidants/ou-en-etes-vous?q1=2",
    ]);
    expect(links.map((l) => l.textContent)).toEqual(page.reponses.map((r) => r.libelle));
    expect(within(group).getByText(t.questionnaire.mention)).toBeVisible();
    expect(group.querySelector("form, input")).toBeNull();
  });
});

describe("LifeSheetCard (« La fiche de vie de votre enfant »)", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.comfort;
    delete document.documentElement.dataset.motion;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const props = {
    texts: t.fiche_de_vie,
    buttonLabel: "Je décris les besoins de mon enfant",
    formHref: "/demande/enfant-handicap/",
  };

  it("sans JavaScript : les deux faces l'une sous l'autre, rien de caché, lien vers le formulaire", () => {
    const html = renderToString(<LifeSheetCard {...props} />);
    const host = document.createElement("div");
    host.innerHTML = html;
    expect(html).toContain('data-stacked="true"');
    expect(html).not.toContain("inert");
    for (const line of Object.values(t.fiche_de_vie.lignes)) {
      expect(host.textContent).toContain(line);
    }
    expect(href(host.querySelector("a"))).toBe(bare("/demande/enfant-handicap/"));
    expect(html).not.toContain("rotateY");
  });

  it("avec JavaScript : le bouton retourne la carte (aria-pressed), la face cachée est inerte", async () => {
    installMatchMedia(false);
    const user = userEvent.setup();
    render(<LifeSheetCard {...props} />);
    const card = document.querySelector('[data-gesture="fiche-de-vie"]');
    expect(card).not.toHaveAttribute("data-stacked");
    const front = document.querySelector('[data-face="recto"]');
    const back = document.querySelector('[data-face="verso"]');
    expect(back).toHaveAttribute("inert");
    expect(front).not.toHaveAttribute("inert");

    const flip = screen.getByRole("button", { name: t.fiche_de_vie.voir });
    expect(flip).toHaveAttribute("aria-pressed", "false");
    await user.click(flip);
    expect(flip).toHaveAttribute("aria-pressed", "true");
    expect(card).toHaveAttribute("data-flipped", "true");
    expect(front).toHaveAttribute("inert");
    expect(back).not.toHaveAttribute("inert");
    expect(document.activeElement).toBe(back);
    expect(back?.className).toContain("rotateY(180deg)");

    // Retour au recto, au clavier.
    const backButton = screen.getByRole("button", { name: t.fiche_de_vie.recto });
    backButton.focus();
    await user.keyboard("{Enter}");
    expect(card).not.toHaveAttribute("data-flipped");
    expect(document.activeElement).toBe(front);
  });

  it("en mouvement réduit : faces empilées, le bouton fait défiler jusqu'au verso", async () => {
    installMatchMedia(true);
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const user = userEvent.setup();
    render(<LifeSheetCard {...props} />);
    const card = document.querySelector('[data-gesture="fiche-de-vie"]');
    expect(card).toHaveAttribute("data-stacked", "true");
    expect(document.querySelector("[inert]")).toBeNull();
    expect(screen.queryByRole("button", { name: t.fiche_de_vie.recto })).toBeNull();
    await user.click(screen.getByRole("button", { name: t.fiche_de_vie.voir }));
    expect(scroll).toHaveBeenCalled();
    expect(document.activeElement).toBe(document.querySelector('[data-face="verso"]'));
    expect(card).not.toHaveAttribute("data-flipped");
  });

  it("suit le mode confort activé après le rendu", async () => {
    installMatchMedia(false);
    render(<LifeSheetCard {...props} />);
    const card = document.querySelector('[data-gesture="fiche-de-vie"]');
    expect(card).not.toHaveAttribute("data-stacked");
    await act(async () => {
      document.documentElement.dataset.comfort = "on";
      await Promise.resolve();
    });
    expect(card).toHaveAttribute("data-stacked", "true");
  });
});
