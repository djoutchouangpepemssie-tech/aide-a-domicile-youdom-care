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

export interface DegressiveTier {
  jusqu_a_heures_par_semaine: number | null;
  prix_ttc: number | null;
}

/**
 * Prix horaire TTC applicable pour un volume hebdomadaire : le premier palier de dégressivité
 * dont le seuil couvre le volume, sinon le prix de base. Les paliers incomplets sont ignorés.
 */
export function hourlyPriceFor(
  basePrice: number,
  hoursPerWeek: number,
  tiers: readonly DegressiveTier[] = [],
): number {
  const usable = tiers
    .filter(
      (tier): tier is { jusqu_a_heures_par_semaine: number; prix_ttc: number } =>
        tier.jusqu_a_heures_par_semaine !== null && tier.prix_ttc !== null,
    )
    .sort((a, b) => a.jusqu_a_heures_par_semaine - b.jusqu_a_heures_par_semaine);
  const tier = usable.find((t) => hoursPerWeek <= t.jusqu_a_heures_par_semaine);
  return tier ? tier.prix_ttc : basePrice;
}

/** Prix majoré (taux entre 0 et 1, par exemple 0,25 pour +25 %), arrondi au centime. */
export function withSurcharge(price: number, rate: number): number {
  return Math.round(price * (1 + rate) * 100) / 100;
}

export interface MonthlyEstimate {
  hoursPerWeek: number;
  hourlyPrice: number;
  before: number;
  after: number;
}

/** Exemples mensuels avant et après crédit d'impôt pour plusieurs volumes hebdomadaires. */
export function monthlyEstimates(
  basePrice: number,
  creditRate: number,
  hoursOptions: readonly number[],
  tiers: readonly DegressiveTier[] = [],
): MonthlyEstimate[] {
  return hoursOptions.map((hoursPerWeek) => {
    const hourlyPrice = hourlyPriceFor(basePrice, hoursPerWeek, tiers);
    const before = monthlyExample(hourlyPrice, hoursPerWeek);
    return {
      hoursPerWeek,
      hourlyPrice,
      before,
      after: Math.round(afterTaxCredit(before, creditRate)),
    };
  });
}
