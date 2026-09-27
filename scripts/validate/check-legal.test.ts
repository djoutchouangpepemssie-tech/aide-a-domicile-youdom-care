import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getSiteConfig } from "../../src/content/loader";
import {
  checkLegalRender,
  externalHosts,
  mandataireIssues,
  requiredLegalPages,
  runLegalCheck,
} from "./check-legal";

const rootDir = path.resolve(__dirname, "../..");
const footer = [
  "/mentions-legales/",
  "/politique-de-confidentialite/",
  "/cookies/",
  "/conditions-generales/",
  "/accessibilite/",
  "/plan-du-site/",
];

const shell = (body: string) =>
  `<!DOCTYPE html><html lang="fr"><head><title>t</title></head><body>${body}</body></html>`;
const notice = '<aside role="note" data-notice="mandataire"><p>Attention…</p></aside>';
const policyHtml = shell(
  '<h1>Politique</h1><p>Écrivez-nous à <a href="mailto:contact@youdom-care.com">contact@youdom-care.com</a>.</p><p>Réclamation auprès de la CNIL : <a href="https://www.cnil.fr/fr/plaintes">cnil.fr</a></p>',
);
const cookiesHtml = shell("<h1>Cookies</h1><p>Aucun traceur.</p>");

/** Rendu factice complet : les six pages, liées du pied de page, sans prix mandataire. */
function fullRender(extra: Record<string, string> = {}): Map<string, string> {
  const pages = new Map<string, string>();
  for (const page of requiredLegalPages) pages.set(page, shell(`<h1>${page}</h1>`));
  pages.set("/politique-de-confidentialite/", policyHtml);
  pages.set("/cookies/", cookiesHtml);
  pages.set("/", shell("<h1>Accueil</h1>"));
  for (const [key, value] of Object.entries(extra)) pages.set(key, value);
  return pages;
}

const siteConfig = getSiteConfig();

describe("check-legal", () => {
  it("accepte un rendu complet en prévisualisation, avec les champs null en avertissement", () => {
    const { errors, warnings } = checkLegalRender({
      pages: fullRender(),
      footerLegalHrefs: footer,
      siteConfig,
      prod: false,
    });
    expect(errors).toEqual([]);
    expect(warnings.some((w) => w.includes("legal.raison_sociale"))).toBe(true);
    expect(warnings.some((w) => w.includes("legal.mediateur_consommation"))).toBe(true);
    expect(warnings.some((w) => w.includes("legal.autorisations"))).toBe(true);
  });

  it("en production, chaque champ légal obligatoire null est une erreur", () => {
    const { errors } = checkLegalRender({
      pages: fullRender(),
      footerLegalHrefs: footer,
      siteConfig,
      prod: true,
    });
    const joined = errors.join("\n");
    for (const field of [
      "legal.raison_sociale",
      "legal.forme_juridique",
      "legal.siege_social",
      "legal.rcs",
      "legal.directeur_publication",
      "legal.mediateur_consommation",
      "legal.hebergeur.adresse",
      "legal.hebergeur.contact",
      "legal.autorisations",
    ]) {
      expect(joined).toContain(field);
    }
    expect(errors.filter((e) => !e.startsWith("site.config.json"))).toEqual([]);
  });

  it("signale une page obligatoire absente ou non liée du pied de page, avertissement si prévue", () => {
    const pages = fullRender();
    pages.delete("/conditions-generales/");
    pages.delete("/accessibilite/");
    const { errors, warnings } = checkLegalRender({
      pages,
      footerLegalHrefs: footer.filter((href) => href !== "/cookies/"),
      siteConfig,
      prod: false,
      planned: { "/accessibilite/": "phase 8" },
    });
    expect(errors).toContain("/conditions-generales/ absente du rendu");
    expect(
      errors.some((e) => e.startsWith("/cookies/ n'est pas liée depuis le pied de page")),
    ).toBe(true);
    expect(warnings).toContain("/accessibilite/ absente du rendu (prévue en phase 8)");
  });

  it("exige la mention mandataire près de chaque prix ou offre mandataire", () => {
    const card = (inner: string) =>
      `<article class="price-card" aria-label="Garde de nuit" data-mode="mandataire">${inner}</article>`;
    expect(mandataireIssues("/x/", shell(card("<p>30 €</p>")))).toEqual([
      '/x/ : 1 prix ou offre(s) en mode mandataire sans mention légale (data-notice="mandataire")',
    ]);
    expect(mandataireIssues("/x/", shell(card("<p>30 €</p>") + notice))).toEqual([
      "/x/ : carte de prix « Garde de nuit » en mode mandataire sans mention dans la carte",
    ]);
    expect(mandataireIssues("/x/", shell(card(`<p>30 €</p>${notice}`)))).toEqual([]);
    // Ligne de tableau ou section : la mention sur la page suffit.
    expect(
      mandataireIssues("/y/", shell(`<tr data-mode="mandataire"><td>30 €</td></tr>${notice}`)),
    ).toEqual([]);
    expect(mandataireIssues("/z/", shell('<li data-mode="prestataire">Offre</li>'))).toEqual([]);

    const { errors } = checkLegalRender({
      pages: fullRender({ "/tarifs/": shell(card("<p>30 €</p>")) }),
      footerLegalHrefs: footer,
      siteConfig,
      prod: false,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("/tarifs/");
  });

  it("exige le contact et la CNIL sur la politique de confidentialité", () => {
    const { errors } = checkLegalRender({
      pages: fullRender({
        "/politique-de-confidentialite/": shell("<h1>Politique</h1><p>Rien.</p>"),
      }),
      footerLegalHrefs: footer,
      siteConfig,
      prod: false,
    });
    expect(errors).toEqual([
      "/politique-de-confidentialite/ : l'adresse de contact contact@youdom-care.com n'apparaît pas",
      "/politique-de-confidentialite/ : la réclamation auprès de la CNIL (lien vers cnil.fr) manque",
    ]);
  });

  it("relève les scripts et cadres tiers du rendu et exige qu'ils soient nommés sur /cookies/", () => {
    const html = shell(
      '<script src="/_next/static/a.js"></script><script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script><iframe src="//player.example.org/v"></iframe><script src="https://www.youdom-care.com/x.js"></script>',
    );
    expect(externalHosts(html, siteConfig.marque.url)).toEqual([
      "challenges.cloudflare.com",
      "player.example.org",
    ]);
    const { errors } = checkLegalRender({
      pages: fullRender({ "/demande/": html }),
      footerLegalHrefs: footer,
      siteConfig,
      prod: false,
    });
    expect(errors).toEqual([
      "/cookies/ : le script ou cadre tiers « challenges.cloudflare.com » chargé par le rendu n'y est pas listé",
      "/cookies/ : le script ou cadre tiers « player.example.org » chargé par le rendu n'y est pas listé",
    ]);
    const listed = checkLegalRender({
      pages: fullRender({
        "/demande/": html,
        "/cookies/": shell("<p>challenges.cloudflare.com et player.example.org</p>"),
      }),
      footerLegalHrefs: footer,
      siteConfig,
      prod: false,
    });
    expect(listed.errors).toEqual([]);
  });

  describe("sur un dépôt factice", () => {
    let tmpRoot: string;

    beforeAll(async () => {
      tmpRoot = await mkdtemp(path.join(os.tmpdir(), "yc-check-legal-"));
      const app = path.join(tmpRoot, ".next", "server", "app");
      await mkdir(app, { recursive: true });
      await mkdir(path.join(tmpRoot, "content"), { recursive: true });
      for (const page of requiredLegalPages) {
        await writeFile(path.join(app, `${page.slice(1, -1)}.html`), shell(`<h1>${page}</h1>`));
      }
      await writeFile(path.join(app, "politique-de-confidentialite.html"), policyHtml);
      await writeFile(path.join(app, "index.html"), shell("<h1>Accueil</h1>"));
      await writeFile(path.join(app, "_not-found.html"), shell("<h1>404</h1>"));
      const { readFile } = await import("node:fs/promises");
      for (const file of ["navigation.json", "site.config.json"]) {
        await writeFile(
          path.join(tmpRoot, "content", file),
          await readFile(path.join(rootDir, "content", file), "utf8"),
        );
      }
    });

    afterAll(async () => {
      await rm(tmpRoot, { recursive: true, force: true });
    });

    it("lit le rendu et les contenus du dépôt : vert en prévisualisation, rouge en production", async () => {
      const preview = await runLegalCheck({ rootDir: tmpRoot, prod: false });
      expect(preview.errors).toEqual([]);
      expect(preview.warnings.length).toBeGreaterThan(0);
      const prod = await runLegalCheck({ rootDir: tmpRoot, prod: true });
      expect(prod.errors.some((e) => e.includes("legal.raison_sociale"))).toBe(true);
    });

    it("échoue sans rendu", async () => {
      const empty = await mkdtemp(path.join(os.tmpdir(), "yc-check-legal-empty-"));
      const { errors } = await runLegalCheck({ rootDir: empty, prod: false });
      expect(errors[0]).toContain("pnpm build");
      await rm(empty, { recursive: true, force: true });
    });
  });
});
