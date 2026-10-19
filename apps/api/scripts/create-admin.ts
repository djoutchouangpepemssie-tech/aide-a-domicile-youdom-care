/*
 * Crée le premier compte d'agence. Il n'y a **volontairement pas de route** pour cela : une route
 * capable de fabriquer un administrateur serait une porte ouverte, et la refermer ensuite est le
 * genre de tâche qu'on oublie.
 *
 *   MONGODB_URI=… AUTH_PEPPER=… tsx apps/api/scripts/create-admin.ts \
 *     --email arcel@exemple.fr --nom "Arcel" --role responsable_agence --agence <id|auto>
 *
 * Le compte est rattaché à un foyer technique d'agence : c'est ce rattachement que la surface
 * `/admin/v1` vérifie. La portée par agence arrive avec le module Planning (étape 3).
 */
import { readEnv } from "../src/config/env";
import { createClient } from "../src/db/client";
import { newId } from "../src/domaine/ids";
import { STAFF_ROLES } from "../src/domaine/roles";
import { householdSchema, memberSchema, membershipSchema } from "../src/domaine/schemas";
import { mongoRepositories } from "../src/store/mongo";

function argument(nom: string): string | undefined {
  const index = process.argv.indexOf(`--${nom}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const email = argument("email");
  const nom = argument("nom");
  const role = argument("role") ?? "responsable_agence";
  if (!email || !nom) throw new Error("--email et --nom sont requis");
  if (!(STAFF_ROLES as readonly string[]).includes(role)) {
    throw new Error(`--role doit être l'un de : ${STAFF_ROLES.join(", ")}`);
  }

  const env = readEnv();
  const client = createClient(env);
  try {
    await client.connect();
    const repositories = mongoRepositories(client.db(env.MONGODB_DB));

    const existant = await repositories.members.findByIdentifier({ email });
    const now = new Date();
    const member =
      existant ??
      memberSchema.parse({
        _id: newId(),
        email,
        phone: null,
        displayName: nom,
        prefs: { displayMode: "complet", notifications: ["email"] },
        createdAt: now,
      });
    if (!existant) await repositories.members.insert(member);

    const code = argument("agence") ?? "AGENCE-01";
    const agence =
      (await repositories.households.findByCode(code)) ??
      householdSchema.parse({
        _id: newId(),
        code,
        agencyId: newId(),
        status: "actif",
        mode: "prestataire",
        address: { line1: "Agence", postalCode: "75000", city: "Paris" },
        frozenAt: null,
        createdAt: now,
      });
    if (!(await repositories.households.findByCode(code))) {
      await repositories.households.insert(agence);
    }

    if (!(await repositories.memberships.find(member._id, agence._id))) {
      await repositories.memberships.insert(
        membershipSchema.parse({
          _id: newId(),
          memberId: member._id,
          householdId: agence._id,
          role,
          status: "actif",
          invitedBy: null,
          activatedAt: now,
          revokedAt: null,
          createdAt: now,
        }),
      );
    }

    console.log(`Compte d'agence prêt : ${email} (${role}).`);
    console.log("Connexion : POST /auth/v1/challenges puis POST /auth/v1/sessions.");
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
