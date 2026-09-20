/** Assemble des classes en ignorant les valeurs vides ou fausses. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
