import { expect, type Page } from "@playwright/test";

/*
 * Indexation pendant les parcours (D-035).
 *
 * Par défaut le site est indexable ; `SITE_INDEXABLE="false"` referme tout et chaque page reçoit
 * alors `robots: noindex, nofollow` plus l'en-tête `X-Robots-Tag`. La CI construit justement avec
 * `SITE_INDEXABLE: "false"` (.github/workflows/ci.yml).
 *
 * Un parcours qui vérifie « cette page est indexable » en exigeant l'absence de balise `robots`
 * ne peut donc pas passer sous la CI, tandis que `config.spec.ts`, qui exige le `noindex` global,
 * ne peut pas passer sans le réglage : les deux s'excluaient mutuellement et la suite était rouge
 * dans les deux configurations (docs/AUDIT_GLOBAL.md §9). Les parcours passent désormais par
 * `expectIndexable`, qui vérifie l'intention — « rien ne ferme cette page en propre » — dans les
 * deux cas.
 */

/** Vrai si le build servi aux parcours ouvre l'indexation. */
export const siteIndexable = process.env.SITE_INDEXABLE !== "false";

/**
 * Vérifie qu'une page n'est pas fermée pour elle-même : aucune balise `robots` quand le site est
 * ouvert, et le `noindex` global — pas un `noindex` propre à la page — quand il est fermé.
 */
export async function expectIndexable(page: Page): Promise<void> {
  const robots = page.locator('meta[name="robots"]');
  if (siteIndexable) {
    await expect(robots).toHaveCount(0);
    return;
  }
  await expect(robots).toHaveAttribute("content", /noindex/);
}
