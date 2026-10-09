/*
 * Audit d'adaptation aux écrans : `pnpm audit:responsive` (serveur sur http://127.0.0.1:3000).
 *
 * Charge un gabarit de chaque famille à neuf largeurs, de 320 px (le plus petit téléphone encore
 * en service) à 1920 px, et relève ce qu'un œil ne voit pas d'un coup :
 *
 * - **débordement horizontal** : `scrollWidth` du document au-delà de la fenêtre. C'est le défaut
 *   le plus visible pour un visiteur — la page se décale et le texte sort de l'écran — et le plus
 *   facile à laisser passer, parce qu'il ne se manifeste qu'à certaines largeurs ;
 * - **l'élément fautif** : le plus à droite qui dépasse, avec sa balise, ses classes et sa
 *   largeur, pour aller droit au CSS en cause plutôt que de chercher à tâtons ;
 * - **l'action principale sous la ligne de flottaison** (dette DP.3) : un visiteur de téléphone
 *   doit voir le titre *et* le bouton sans défiler.
 *
 * Écrit `docs/AUDIT_RESPONSIVE.md`. Sort en code 1 si un débordement est trouvé : c'est un défaut,
 * pas un avertissement.
 */

import { chromium, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";

const BASE = process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:3000";

/** Un gabarit par famille : ce qui casse casse par gabarit, pas par page. */
const PAGES: { label: string; path: string }[] = [
  { label: "Accueil", path: "/" },
  { label: "Service", path: "/services/garde-de-nuit/" },
  { label: "Pathologie", path: "/maladies-neurodegeneratives/alzheimer/" },
  { label: "Locale (département)", path: "/aide-a-domicile/essonne/" },
  { label: "Locale (commune)", path: "/aide-a-domicile/essonne/athis-mons/" },
  { label: "Agence", path: "/agences/puteaux/" },
  { label: "Article", path: "/magazine/alzheimer-trois-temps-de-la-maladie-a-la-maison/" },
  { label: "Magazine", path: "/magazine/" },
  { label: "Tarifs et aides", path: "/tarifs-et-aides/" },
  { label: "Formulaire (rappel)", path: "/etre-rappele/" },
  { label: "Formulaire (détaillé)", path: "/demande/maladie-neurodegenerative/" },
  { label: "Recrutement", path: "/recrutement/" },
  { label: "Contact", path: "/contact/" },
  { label: "Plan du site", path: "/plan-du-site/" },
  { label: "Mentions légales", path: "/mentions-legales/" },
];

/** De l'iPhone SE au grand écran de bureau, en passant par les points de bascule usuels. */
const WIDTHS = [320, 360, 390, 414, 768, 1024, 1280, 1440, 1920] as const;
const HEIGHT_FOR: Record<number, number> = {
  320: 568,
  360: 640,
  390: 844,
  414: 896,
  768: 1024,
  1024: 768,
  1280: 800,
  1440: 900,
  1920: 1080,
};

interface Overflow {
  excess: number;
  tag: string;
  classes: string;
  width: number;
  text: string;
}

interface Result {
  label: string;
  path: string;
  width: number;
  scrollWidth: number;
  overflow: Overflow[];
  ctaBelowFold: number | null;
}

/** Mesure faite dans la page : largeur du document et éléments qui sortent à droite. */
async function measure(
  page: Page,
  width: number,
): Promise<Omit<Result, "label" | "path" | "width">> {
  return page.evaluate(
    ({ w }) => {
      const doc = document.documentElement;
      const scrollWidth = Math.ceil(doc.scrollWidth);
      const overflow: Overflow[] = [];
      if (scrollWidth > w + 1) {
        for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const excess = Math.ceil(r.right - w);
          // On ne retient que ce qui dépasse franchement : 2 px tiennent de l'arrondi.
          if (excess <= 2) continue;
          // Un parent qui déborde parce que son enfant déborde n'apprend rien : on garde les
          // éléments dont aucun descendant ne dépasse autant, c'est-à-dire la cause.
          const culprit = Array.from(el.querySelectorAll<HTMLElement>("*")).some((child) => {
            const cr = child.getBoundingClientRect();
            return cr.width > 0 && Math.ceil(cr.right - w) >= excess;
          });
          if (culprit) continue;
          overflow.push({
            excess,
            tag: el.tagName.toLowerCase(),
            classes: (el.getAttribute("class") ?? "").slice(0, 110),
            width: Math.round(r.width),
            text: (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60),
          });
        }
      }
      overflow.sort((a, b) => b.excess - a.excess);

      /*
       * DP.3 : l'action principale du hero doit tenir dans le premier écran. On reprend exactement
       * les règles de `tests/e2e/hero.spec.ts` plutôt qu'une heuristique : le sélecteur réel
       * (`[data-hero-primary]`), et la hauteur *réellement* disponible, c'est-à-dire la fenêtre
       * moins la barre d'action fixe qui recouvre le bas sur téléphone. Mesurer sans elle donne
       * des chiffres trop optimistes et fait chercher des défauts qui n'existent pas.
       */
      const anchored = Array.from(
        document.querySelectorAll<HTMLElement>("nav, header, div"),
      ).filter((element) => {
        if (getComputedStyle(element).position !== "fixed") return false;
        const box = element.getBoundingClientRect();
        return box.height > 0 && Math.abs(box.bottom - window.innerHeight) < 2;
      });
      const barHeight = Math.max(0, ...anchored.map((e) => e.getBoundingClientRect().height));
      const visible = window.innerHeight - barHeight;

      let ctaBelowFold: number | null = null;
      const cta = document.querySelector<HTMLElement>("[data-hero-primary]");
      if (cta) {
        const bottom = cta.getBoundingClientRect().bottom + window.scrollY;
        if (bottom > visible) ctaBelowFold = Math.round(bottom - visible);
      }
      return { scrollWidth, overflow: overflow.slice(0, 4), ctaBelowFold };
    },
    { w: width },
  );
}

async function main(): Promise<void> {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  });
  const results: Result[] = [];

  for (const { label, path } of PAGES) {
    for (const width of WIDTHS) {
      const page = await browser.newPage({
        viewport: { width, height: HEIGHT_FOR[width] ?? 900 },
        deviceScaleFactor: 1,
      });
      try {
        await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 30_000 });
        // Les révélations au défilement sont déclenchées : sinon on mesure une page à moitié posée.
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(250);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(120);
        results.push({ label, path, width, ...(await measure(page, width)) });
      } catch (error) {
        console.error(`  ✗ ${label} à ${width}px : ${(error as Error).message.split("\n")[0]}`);
      } finally {
        await page.close();
      }
    }
    const bad = results.filter((r) => r.label === label && r.overflow.length > 0);
    console.log(
      bad.length === 0
        ? `✔ ${label}`
        : `✗ ${label} — déborde à ${bad.map((b) => `${b.width}px (+${b.overflow[0]?.excess})`).join(", ")}`,
    );
  }
  await browser.close();

  const overflowing = results.filter((r) => r.overflow.length > 0);
  const belowFold = results.filter((r) => r.ctaBelowFold !== null && r.width <= 414);

  const lines: string[] = [
    "# Audit d'adaptation aux écrans",
    "",
    `Relevé du ${new Date().toISOString().slice(0, 10)} par \`pnpm audit:responsive\`, sur le build`,
    `de production. ${PAGES.length} gabarits × ${WIDTHS.length} largeurs = ${results.length} mesures.`,
    "",
    "## Débordement horizontal",
    "",
  ];

  if (overflowing.length === 0) {
    lines.push(
      "Aucun. À toutes les largeurs mesurées, de 320 à 1920 px, la page tient dans la fenêtre :",
      "aucune barre de défilement horizontale, aucun contenu hors écran.",
      "",
    );
  } else {
    lines.push(
      "| Gabarit | Largeur | Dépassement | Élément en cause |",
      "| --- | --- | --- | --- |",
      ...overflowing.map((r) => {
        const o = r.overflow[0];
        const el = o ? `\`<${o.tag}>\` ${o.classes ? `\`${o.classes}\`` : ""} — « ${o.text} »` : "";
        return `| ${r.label} | ${r.width} px | +${o?.excess ?? 0} px | ${el} |`;
      }),
      "",
    );
  }

  lines.push("## Action principale sous la ligne de flottaison (DP.3)", "");
  if (belowFold.length === 0) {
    lines.push(
      "Aucune : sur tous les gabarits mesurés à 414 px et moins, l'action reste visible.",
      "",
    );
  } else {
    lines.push(
      "| Gabarit | Largeur | Dépasse de |",
      "| --- | --- | --- |",
      ...belowFold.map((r) => `| ${r.label} | ${r.width} px | ${r.ctaBelowFold} px |`),
      "",
    );
  }

  writeFileSync("docs/AUDIT_RESPONSIVE.md", `${lines.join("\n")}\n`, "utf8");
  console.log(
    `\ndocs/AUDIT_RESPONSIVE.md écrit — ${overflowing.length} débordement(s) sur ${results.length} mesures.`,
  );
  if (overflowing.length > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
