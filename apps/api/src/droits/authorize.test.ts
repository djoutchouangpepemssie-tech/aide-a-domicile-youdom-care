/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { ACTIONS, MODULES } from "../domaine/modules";
import { defaultGrants, stanceFor } from "../domaine/roles";
import { grant, household, membership, protection, visit, NOW } from "../test/fixtures";
import { authorize, httpStatusFor, type AuthorizationContext } from "./authorize";

/*
 * Les tests du moteur d'autorisation. `PERMISSIONS.md` §7 exige nommément que, pour chaque module,
 * un test prouve qu'un membre sans droit reçoit 404 — pas 403, qui confirmerait l'existence de la
 * ressource. C'est le premier test du fichier, et il parcourt les douze modules.
 */

const foyer = household();
const membre = "a1b2c3d4e5f6a1b2c3d4e5f6";

function contexte(overrides: Partial<AuthorizationContext> = {}): AuthorizationContext {
  return {
    now: NOW,
    household: { _id: foyer._id, status: "actif" },
    membership: membership({ memberId: membre, householdId: foyer._id, role: "beneficiaire" }),
    grants: [],
    ...overrides,
  };
}

describe("un refus ne dit jamais qu'il y avait quelque chose à voir", () => {
  it.each(MODULES)("%s sans droit répond introuvable (404)", (module) => {
    const decision = authorize(
      { memberId: membre, householdId: foyer._id, module, action: "voir" },
      contexte(),
    );
    expect(decision.allowed).toBe(false);
    expect(httpStatusFor(decision)).toBe(404);
  });

  it("un foyer inexistant et un foyer interdit se répondent de la même façon", () => {
    const inconnu = authorize(
      { memberId: membre, householdId: foyer._id, module: "planning", action: "voir" },
      contexte({ household: null }),
    );
    const interdit = authorize(
      { memberId: membre, householdId: foyer._id, module: "planning", action: "voir" },
      contexte({ membership: null }),
    );
    expect(httpStatusFor(inconnu)).toBe(httpStatusFor(interdit));
  });

  it("aucune décision ne mène à 403", () => {
    const refus = authorize(
      { memberId: membre, householdId: foyer._id, module: "fiche_de_vie", action: "modifier" },
      contexte(),
    );
    expect([200, 404]).toContain(httpStatusFor(refus));
  });
});

describe("R1 — le rattachement", () => {
  it("accepte un bénéficiaire rattaché et muni du droit", () => {
    const decision = authorize(
      { memberId: membre, householdId: foyer._id, module: "planning", action: "voir" },
      contexte({
        grants: [
          grant({
            memberId: membre,
            householdId: foyer._id,
            module: "planning",
            actions: ["voir"],
          }),
        ],
      }),
    );
    expect(decision).toMatchObject({ allowed: true });
  });

  it("refuse un rattachement suspendu, même avec le droit", () => {
    const decision = authorize(
      { memberId: membre, householdId: foyer._id, module: "planning", action: "voir" },
      contexte({
        membership: membership({
          memberId: membre,
          householdId: foyer._id,
          role: "beneficiaire",
          status: "suspendu",
        }),
        grants: [
          grant({
            memberId: membre,
            householdId: foyer._id,
            module: "planning",
            actions: ["voir"],
          }),
        ],
      }),
    );
    expect(decision).toEqual({ allowed: false, reason: "rattachement_inactif" });
  });
});

describe("R2 et R3 — le droit, et sa fenêtre", () => {
  const demande = {
    memberId: membre,
    householdId: foyer._id,
    module: "planning",
    action: "voir",
  } as const;

  it("un droit sur un autre module n'ouvre rien", () => {
    const decision = authorize(
      demande,
      contexte({
        grants: [
          grant({
            memberId: membre,
            householdId: foyer._id,
            module: "documents",
            actions: ["voir"],
          }),
        ],
      }),
    );
    expect(decision).toEqual({ allowed: false, reason: "aucun_droit" });
  });

  it("un droit « voir » n'autorise pas « créer »", () => {
    const decision = authorize(
      { ...demande, action: "creer" },
      contexte({
        grants: [
          grant({
            memberId: membre,
            householdId: foyer._id,
            module: "planning",
            actions: ["voir"],
          }),
        ],
      }),
    );
    expect(decision.allowed).toBe(false);
  });

  it("un droit expiré se distingue d'un droit absent dans le journal, pas dans la réponse", () => {
    const decision = authorize(
      demande,
      contexte({
        grants: [
          grant({
            memberId: membre,
            householdId: foyer._id,
            module: "planning",
            actions: ["voir"],
            endsAt: new Date(NOW.getTime() - 1000),
          }),
        ],
      }),
    );
    expect(decision).toEqual({ allowed: false, reason: "droit_expire" });
    expect(httpStatusFor(decision)).toBe(404);
  });

  it("un droit révoqué cesse immédiatement, sans attendre une reconnexion", () => {
    const decision = authorize(
      demande,
      contexte({
        grants: [
          grant({
            memberId: membre,
            householdId: foyer._id,
            module: "planning",
            actions: ["voir"],
            revokedAt: new Date(NOW.getTime() - 60_000),
          }),
        ],
      }),
    );
    expect(decision).toEqual({ allowed: false, reason: "droit_revoque" });
  });

  it("un droit qui commence demain ne vaut pas aujourd'hui", () => {
    const decision = authorize(
      demande,
      contexte({
        grants: [
          grant({
            memberId: membre,
            householdId: foyer._id,
            module: "planning",
            actions: ["voir"],
            startsAt: new Date(NOW.getTime() + 86_400_000),
          }),
        ],
      }),
    );
    expect(decision.allowed).toBe(false);
  });
});

describe("R4 — l'accès au logement d'un intervenant est borné à sa visite", () => {
  const intervenant = "b1b2c3d4e5f6a1b2c3d4e5f6";
  const demande = {
    memberId: intervenant,
    householdId: foyer._id,
    module: "acces_logement",
    action: "voir",
  } as const;

  function contexteIntervenant(visits: ReturnType<typeof visit>[]): AuthorizationContext {
    return contexte({
      membership: membership({
        memberId: intervenant,
        householdId: foyer._id,
        role: "intervenant",
      }),
      grants: [
        grant({
          memberId: intervenant,
          householdId: foyer._id,
          module: "acces_logement",
          actions: ["voir"],
        }),
      ],
      assignedVisits: visits,
    });
  }

  it("autorise pendant la visite affectée", () => {
    const decision = authorize(
      demande,
      contexteIntervenant([visit({ householdId: foyer._id, workerId: intervenant })]),
    );
    expect(decision).toMatchObject({ allowed: true });
  });

  it("refuse en dehors de la plage, droit en poche", () => {
    const decision = authorize(
      demande,
      contexteIntervenant([
        visit({
          householdId: foyer._id,
          workerId: intervenant,
          plannedStart: new Date(NOW.getTime() + 3 * 3_600_000),
          plannedEnd: new Date(NOW.getTime() + 4 * 3_600_000),
          status: "prevue",
        }),
      ]),
    );
    expect(decision).toEqual({ allowed: false, reason: "hors_plage_de_visite" });
  });

  it("refuse si la visite a été annulée", () => {
    const decision = authorize(
      demande,
      contexteIntervenant([
        visit({ householdId: foyer._id, workerId: intervenant, status: "annulee" }),
      ]),
    );
    expect(decision).toEqual({ allowed: false, reason: "hors_plage_de_visite" });
  });

  it("ne borne pas le bénéficiaire, qui est chez lui", () => {
    const decision = authorize(
      { memberId: membre, householdId: foyer._id, module: "acces_logement", action: "voir" },
      contexte({
        grants: [
          grant({
            memberId: membre,
            householdId: foyer._id,
            module: "acces_logement",
            actions: ["voir"],
          }),
        ],
      }),
    );
    expect(decision).toMatchObject({ allowed: true });
  });
});

describe("R5 — le gel du foyer", () => {
  it("laisse lire les factures et les documents", () => {
    for (const module of ["finances", "documents"] as const) {
      const decision = authorize(
        { memberId: membre, householdId: foyer._id, module, action: "voir" },
        contexte({
          household: { _id: foyer._id, status: "gele" },
          grants: [grant({ memberId: membre, householdId: foyer._id, module, actions: ["voir"] })],
        }),
      );
      expect(decision).toMatchObject({ allowed: true });
    }
  });

  it("retire les notes de santé dès le gel", () => {
    const decision = authorize(
      { memberId: membre, householdId: foyer._id, module: "comptes_rendus", action: "voir" },
      contexte({
        household: { _id: foyer._id, status: "gele" },
        grants: [
          grant({
            memberId: membre,
            householdId: foyer._id,
            module: "comptes_rendus",
            actions: ["voir"],
          }),
        ],
      }),
    );
    expect(decision).toEqual({ allowed: false, reason: "foyer_gele" });
  });

  it("interdit toute écriture sur un foyer gelé", () => {
    const decision = authorize(
      { memberId: membre, householdId: foyer._id, module: "finances", action: "creer" },
      contexte({
        household: { _id: foyer._id, status: "gele" },
        grants: [
          grant({
            memberId: membre,
            householdId: foyer._id,
            module: "finances",
            actions: ["creer"],
          }),
        ],
      }),
    );
    expect(decision).toEqual({ allowed: false, reason: "foyer_gele" });
  });

  it("ferme un foyer archivé, lecture comprise", () => {
    const decision = authorize(
      { memberId: membre, householdId: foyer._id, module: "documents", action: "voir" },
      contexte({
        household: { _id: foyer._id, status: "archive" },
        grants: [
          grant({
            memberId: membre,
            householdId: foyer._id,
            module: "documents",
            actions: ["voir"],
          }),
        ],
      }),
    );
    expect(decision).toEqual({ allowed: false, reason: "foyer_archive" });
  });
});

describe("R6 — la matrice du rôle prime sur la base", () => {
  it("un droit qui accorde une case « — » ne vaut rien", () => {
    // Le payeur voit l'argent, pas la santé (`PERMISSIONS.md` §4). Même muni d'un droit sur la
    // fiche de vie — écrit par erreur, importé, ou forgé — il ne la voit pas.
    expect(stanceFor("payeur", "fiche_de_vie", "voir")).toBe("jamais");
    const decision = authorize(
      { memberId: membre, householdId: foyer._id, module: "fiche_de_vie", action: "voir" },
      contexte({
        membership: membership({ memberId: membre, householdId: foyer._id, role: "payeur" }),
        grants: [
          grant({
            memberId: membre,
            householdId: foyer._id,
            module: "fiche_de_vie",
            actions: ["voir"],
          }),
        ],
      }),
    );
    expect(decision).toEqual({ allowed: false, reason: "role_interdit" });
  });

  it("l'administrateur technique n'ouvre aucune note de santé", () => {
    for (const module of ["comptes_rendus", "fiche_de_vie", "acces_logement"] as const) {
      const decision = authorize(
        { memberId: membre, householdId: foyer._id, module, action: "voir" },
        contexte({
          membership: membership({
            memberId: membre,
            householdId: foyer._id,
            role: "administrateur",
          }),
          grants: [grant({ memberId: membre, householdId: foyer._id, module, actions: ["voir"] })],
        }),
      );
      expect(decision).toEqual({ allowed: false, reason: "role_interdit" });
    }
  });

  it("un proche invité n'a aucun droit posé d'office", () => {
    expect(defaultGrants("proche_invite")).toEqual([]);
  });
});

describe("la mesure de protection", () => {
  const tuteur = "c1b2c3d4e5f6a1b2c3d4e5f6";
  const demande = {
    memberId: tuteur,
    householdId: foyer._id,
    module: "finances",
    action: "voir",
  } as const;

  function contexteTuteur(protections: ReturnType<typeof protection>[]): AuthorizationContext {
    return contexte({
      membership: membership({
        memberId: tuteur,
        householdId: foyer._id,
        role: "representant_legal",
      }),
      grants: [
        grant({ memberId: tuteur, householdId: foyer._id, module: "finances", actions: ["voir"] }),
      ],
      protections,
    });
  }

  it("exige une mesure vérifiée par un humain", () => {
    const decision = authorize(
      demande,
      contexteTuteur([
        protection({
          householdId: foyer._id,
          memberId: tuteur,
          verifiedAt: null,
          verifiedBy: null,
        }),
      ]),
    );
    expect(decision).toEqual({ allowed: false, reason: "mesure_non_verifiee" });
  });

  it("autorise une fois la mesure vérifiée", () => {
    const decision = authorize(
      demande,
      contexteTuteur([protection({ householdId: foyer._id, memberId: tuteur })]),
    );
    expect(decision).toMatchObject({ allowed: true });
  });

  it("refuse une mesure arrivée à son terme", () => {
    const decision = authorize(
      demande,
      contexteTuteur([
        protection({
          householdId: foyer._id,
          memberId: tuteur,
          endsAt: new Date(NOW.getTime() - 86_400_000),
        }),
      ]),
    );
    expect(decision).toEqual({ allowed: false, reason: "mesure_non_verifiee" });
  });
});

describe("R7 — l'astreinte", () => {
  const astreinte = "d1b2c3d4e5f6a1b2c3d4e5f6";
  const demande = {
    memberId: astreinte,
    householdId: foyer._id,
    module: "comptes_rendus",
    action: "voir",
  } as const;

  function contexteAstreinte(onCall: AuthorizationContext["onCall"]): AuthorizationContext {
    return contexte({
      membership: membership({ memberId: astreinte, householdId: foyer._id, role: "astreinte" }),
      grants: [
        grant({
          memberId: astreinte,
          householdId: foyer._id,
          module: "comptes_rendus",
          actions: ["voir"],
        }),
      ],
      onCall,
    });
  }

  it("refuse un accès de nuit sans motif saisi", () => {
    const decision = authorize(
      demande,
      contexteAstreinte({ outsideOpeningHours: true, reason: "  " }),
    );
    expect(decision).toEqual({ allowed: false, reason: "motif_astreinte_absent" });
  });

  it("autorise avec un motif", () => {
    const decision = authorize(
      demande,
      contexteAstreinte({ outsideOpeningHours: true, reason: "appel de la fille, chute signalée" }),
    );
    expect(decision).toMatchObject({ allowed: true });
  });
});

describe("le second facteur", () => {
  it("est exigé pour la santé, l'argent et l'accès au logement", () => {
    for (const module of ["comptes_rendus", "finances", "acces_logement"] as const) {
      const decision = authorize(
        { memberId: membre, householdId: foyer._id, module, action: "voir" },
        contexte({
          grants: [grant({ memberId: membre, householdId: foyer._id, module, actions: ["voir"] })],
          secondFactorPresented: false,
        }),
      );
      expect(decision).toEqual({ allowed: false, reason: "second_facteur_absent" });
    }
  });

  it("n'est pas exigé pour le planning", () => {
    const decision = authorize(
      { memberId: membre, householdId: foyer._id, module: "planning", action: "voir" },
      contexte({
        grants: [
          grant({
            memberId: membre,
            householdId: foyer._id,
            module: "planning",
            actions: ["voir"],
          }),
        ],
        secondFactorPresented: false,
      }),
    );
    expect(decision).toMatchObject({ allowed: true });
  });
});

describe("R8 — un protocole ne change pas sans relecture", () => {
  const demande = {
    memberId: membre,
    householdId: foyer._id,
    module: "fiche_de_vie",
    action: "modifier",
    target: "protocole",
  } as const;

  it("le bénéficiaire modifie, l'agence valide", () => {
    const decision = authorize(
      demande,
      contexte({
        grants: [
          grant({
            memberId: membre,
            householdId: foyer._id,
            module: "fiche_de_vie",
            actions: ["modifier"],
          }),
        ],
      }),
    );
    expect(decision).toMatchObject({ allowed: true, requiresAgencyValidation: true });
  });

  it("le proche référent ne peut que demander", () => {
    const decision = authorize(
      demande,
      contexte({
        membership: membership({
          memberId: membre,
          householdId: foyer._id,
          role: "proche_referent",
        }),
        grants: [
          grant({
            memberId: membre,
            householdId: foyer._id,
            module: "fiche_de_vie",
            actions: ["modifier"],
          }),
        ],
      }),
    );
    expect(decision).toEqual({ allowed: false, reason: "protocole_sans_validation" });
  });

  it("une modification ordinaire de la fiche de vie ne demande pas de validation", () => {
    const decision = authorize(
      { ...demande, target: "routines" },
      contexte({
        grants: [
          grant({
            memberId: membre,
            householdId: foyer._id,
            module: "fiche_de_vie",
            actions: ["modifier"],
          }),
        ],
      }),
    );
    expect(decision).toMatchObject({ allowed: true });
    expect(decision).not.toHaveProperty("requiresAgencyValidation");
  });
});

describe("couverture : aucune action n'est oubliée", () => {
  it("chaque action du domaine est refusée par défaut sans droit", () => {
    for (const module of MODULES) {
      for (const action of ACTIONS) {
        const decision = authorize(
          { memberId: membre, householdId: foyer._id, module, action },
          contexte(),
        );
        expect(decision.allowed).toBe(false);
      }
    }
  });
});
