import * as z from "zod";

/*
 * La configuration de l'API, validée au démarrage. Un service qui démarre avec une variable
 * manquante est un service qui tombera plus tard, au pire moment.
 *
 * Aucune valeur par défaut n'est fournie pour un secret : un poivre par défaut, c'est pas de
 * poivre du tout.
 */

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Chaîne de connexion MongoDB. En production : une base dans le périmètre certifié HDS. */
  MONGODB_URI: z.string().startsWith("mongodb"),
  MONGODB_DB: z.string().min(1).default("youdom"),
  /** Poivre des empreintes d'authentification. Hors base, jamais dans le dépôt. */
  AUTH_PEPPER: z.string().min(32),
  /** Origines autorisées à appeler l'API (l'interface sur Vercel, et elle seule). */
  ALLOWED_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  /** Atteste que la base est bien chez un hébergeur certifié : refus de démarrer sinon. */
  HDS_HOSTING_CONFIRMED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type Env = z.infer<typeof envSchema>;

/** La source est un dictionnaire : `process.env` en service, un objet littéral dans les tests. */
export function readEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const champs = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`configuration incomplète : ${champs}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === "production" && !env.HDS_HOSTING_CONFIRMED) {
    // Garde-fou volontairement brutal : la fiche de vie et les comptes rendus sont des données de
    // santé, et les héberger pour le compte d'un tiers impose un hébergeur certifié HDS.
    throw new Error(
      "démarrage refusé : HDS_HOSTING_CONFIRMED n'est pas vrai. Voir docs/portal/ARCHITECTURE.md §4.",
    );
  }
  return env;
}
