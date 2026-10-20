/*
 * Les montants du bureau. L'API compte en **centimes entiers** (aucun flottant ne touche un prix),
 * l'écran affiche des euros.
 *
 * La règle d'affichage du projet, qui vaut ici comme sur le site : **le prix TTC avant avantage
 * fiscal est l'information principale**, et le montant après crédit d'impôt s'affiche à part, plus
 * petit. Un prix annoncé « après crédit d'impôt » est un prix que la personne ne paiera pas le
 * premier mois, et qu'elle ne paiera jamais si elle n'est pas imposable.
 */

/** 2 450 → « 24,50 € ». Deux décimales toujours : « 24,5 € » n'est pas un prix. */
export function euros(centimes: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centimes / 100);
}

/**
 * Le reste à charge estimé après crédit d'impôt, ou `null` si **aucun taux n'est saisi**.
 *
 * `null` est un résultat, pas un défaut : sans taux saisi par l'agence, le logiciel n'invente pas
 * d'estimation. Arrondi au centime inférieur — annoncer un reste à charge trop bas d'un centime
 * est une promesse de moins tenue.
 */
export function resteACharge(centimes: number, taux: number | null): number | null {
  if (taux === null) return null;
  return Math.ceil(centimes * (1 - taux));
}

/** 0,5 → « 50 % ». Le taux est saisi en pourcentage à l'écran, stocké en fraction. */
export function pourcentage(taux: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(taux * 100)} %`;
}
