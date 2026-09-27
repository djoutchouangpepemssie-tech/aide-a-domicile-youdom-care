export interface CheckContext {
  /** Racine du dépôt. */
  rootDir: string;
  /** Mode production (`--prod` ou `VERCEL_ENV=production`) : règles supplémentaires de docs/07 §7. */
  prod: boolean;
  /**
   * Seuil de mots d'une zone éditoriale locale, par type de territoire, quand il doit différer de
   * `localThresholds` (1000 depuis D-043). Réservé aux tests des contrôles : leurs gabarits font
   * quelques centaines de mots, et c'est le **comportement** du contrôle qu'ils vérifient, pas la
   * valeur du seuil de production.
   */
  motsMin?: Partial<Record<string, number>>;
}

export interface CheckResult {
  errors: string[];
  warnings: string[];
}

export interface Check {
  /** Identifiant court, identique au nom du fichier sans extension. */
  id: string;
  /** Une phrase : « échoue si… ». */
  description: string;
  run(ctx: CheckContext): Promise<CheckResult>;
}

export function result(errors: string[] = [], warnings: string[] = []): CheckResult {
  return { errors, warnings };
}
