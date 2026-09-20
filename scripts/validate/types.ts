export interface CheckContext {
  /** Racine du dépôt. */
  rootDir: string;
  /** Mode production (`--prod` ou `VERCEL_ENV=production`) : règles supplémentaires de docs/07 §7. */
  prod: boolean;
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
