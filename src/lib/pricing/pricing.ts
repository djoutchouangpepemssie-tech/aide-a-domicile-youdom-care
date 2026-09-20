/*
 * Calculs de prix (docs/07 §1) : le prix TTC avant avantage fiscal est l'information
 * principale ; le montant après crédit d'impôt est secondaire. Étendu en P2.6 (exemples
 * mensuels, majorations, dégressivité).
 */

const wholeEuros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const centEuros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

/** « 30 € » pour un montant rond, « 27,50 € » sinon (espaces insécables du format français). */
export function formatEuro(amount: number): string {
  return Number.isInteger(amount) ? wholeEuros.format(amount) : centEuros.format(amount);
}

/** « 50 % ». */
export function formatRate(rate: number): string {
  return percent.format(rate);
}

/** Reste à charge après crédit d'impôt (taux entre 0 et 1), arrondi au centime. */
export function afterTaxCredit(amount: number, rate: number): number {
  return Math.round(amount * (1 - rate) * 100) / 100;
}

/** Semaines par mois (52 / 12), convention des exemples mensuels. */
export const WEEKS_PER_MONTH = 52 / 12;

/** Coût mensuel indicatif pour un nombre d'heures hebdomadaires, arrondi à l'euro. */
export function monthlyExample(hourlyPrice: number, hoursPerWeek: number): number {
  return Math.round(hourlyPrice * hoursPerWeek * WEEKS_PER_MONTH);
}
