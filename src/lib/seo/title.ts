/*
 * Balises titre (docs/01 §8) : 50 à 60 caractères, le nom de marque ajouté par le gabarit
 * (« | Youdom Care ») quand la longueur totale le permet. Contrôlé par check-seo (P5.1).
 */

export const TITLE_MAX = 60;

export function pageTitle(title: string, brand: string): string {
  const withBrand = `${title} | ${brand}`;
  return withBrand.length <= TITLE_MAX ? withBrand : title;
}
