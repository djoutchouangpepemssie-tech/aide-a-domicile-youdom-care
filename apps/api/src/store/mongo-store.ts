import type { Db } from "mongodb";
import type {
  AccessGrant,
  Household,
  LegalProtection,
  Membership,
  Visit,
} from "../domaine/schemas";
import type { AuthorizationStore, ContextQuery, LoadedContext } from "./authorization-store";

/*
 * La lecture du contexte d'autorisation sur MongoDB. Quatre requêtes au plus, toutes servies par
 * les index de `db/collections.ts` — dont `droit_effectif` sur `(memberId, householdId, module)`,
 * qui est le chemin critique : il est lu à chaque appel de l'API.
 *
 * Les visites ne sont chargées que pour `acces_logement` : un digicode est la seule donnée dont la
 * lecture dépend de l'heure (règle R4).
 */
export class MongoAuthorizationStore implements AuthorizationStore {
  constructor(private readonly db: Db) {}

  async loadContext(query: ContextQuery): Promise<LoadedContext> {
    const households = this.db.collection<Household>("households");
    const memberships = this.db.collection<Membership>("memberships");
    const grants = this.db.collection<AccessGrant>("access_grants");
    const protections = this.db.collection<LegalProtection>("legal_protections");

    const [household, membership, grantList, protectionList] = await Promise.all([
      households.findOne({ _id: query.householdId }, { projection: { _id: 1, status: 1 } }),
      memberships.findOne({ memberId: query.memberId, householdId: query.householdId }),
      grants
        .find({ memberId: query.memberId, householdId: query.householdId, revokedAt: null })
        .toArray(),
      protections.find({ householdId: query.householdId }).toArray(),
    ]);

    const assignedVisits = query.withAssignedVisits
      ? await this.db
          .collection<Visit>("visits")
          .find({
            householdId: query.householdId,
            workerId: query.memberId,
            // Une plage large d'un jour suffit : la règle R4 compare ensuite à la minute.
            plannedStart: { $lte: new Date(query.now.getTime() + 24 * 60 * 60 * 1000) },
            plannedEnd: { $gte: new Date(query.now.getTime() - 24 * 60 * 60 * 1000) },
          })
          .toArray()
      : undefined;

    return {
      household: household ? { _id: household._id, status: household.status } : null,
      membership,
      grants: grantList,
      protections: protectionList,
      assignedVisits,
    };
  }
}
