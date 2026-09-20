/**
 * Numéro français affiché « 01 84 80 17 03 » → lien `tel:+33184801703`.
 * Renvoie null si le numéro ne ressemble pas à un numéro français à dix chiffres.
 */
export function toTelHref(display: string): string | null {
  const digits = display.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `tel:+33${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("33")) return `tel:+${digits}`;
  return null;
}

/** Normalise l'affichage : dix chiffres regroupés par deux, séparés par des espaces insécables. */
export function formatFrenchPhone(display: string): string {
  const digits = display.replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("33") ? `0${digits.slice(2)}` : digits;
  if (national.length !== 10) return display;
  return national.replace(/(\d{2})(?=\d)/g, "$1 ");
}
