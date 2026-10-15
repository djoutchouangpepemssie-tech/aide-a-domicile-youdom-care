/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { ACTIONS, MODULES } from "./modules";
import {
  CLIENT_ROLES,
  defaultGrants,
  manageRightsStance,
  protocolStance,
  stanceFor,
} from "./roles";

/*
 * La matrice par défaut relue cellule par cellule contre `docs/portal/PERMISSIONS.md` §4. Ces
 * tests ne vérifient pas du code : ils vérifient que le code dit la même chose que le document que
 * le commanditaire a validé. C'est leur seule raison d'être, et elle suffit.
 */

describe("la matrice côté client", () => {
  it("le bénéficiaire est propriétaire de son dossier", () => {
    expect(stanceFor("beneficiaire", "fiche_de_vie", "voir")).toBe("accorde");
    expect(stanceFor("beneficiaire", "acces_logement", "voir")).toBe("accorde");
    expect(stanceFor("beneficiaire", "journal_acces", "voir")).toBe("accorde");
    // Le mode mandataire fait du client l'employeur : ce n'est pas le bénéficiaire.
    expect(stanceFor("beneficiaire", "employeur", "voir")).toBe("jamais");
  });

  it("un proche invité ne voit rien par défaut : on lui ouvre un module à la fois", () => {
    expect(defaultGrants("proche_invite")).toEqual([]);
    expect(stanceFor("proche_invite", "planning", "voir")).toBe("possible");
    expect(stanceFor("proche_invite", "fiche_de_vie", "voir")).toBe("jamais");
    expect(stanceFor("proche_invite", "acces_logement", "voir")).toBe("jamais");
  });

  it("le payeur voit l'argent, pas l'intimité", () => {
    expect(stanceFor("payeur", "finances", "voir")).toBe("accorde");
    expect(stanceFor("payeur", "comptes_rendus", "voir")).toBe("jamais");
    expect(stanceFor("payeur", "fiche_de_vie", "voir")).toBe("jamais");
    expect(stanceFor("payeur", "acces_logement", "voir")).toBe("jamais");
  });

  it("l'accès au logement ne se donne pas par lien de famille", () => {
    expect(stanceFor("proche_referent", "acces_logement", "voir")).toBe("possible");
    expect(stanceFor("proche_invite", "acces_logement", "voir")).toBe("jamais");
    expect(stanceFor("professionnel_invite", "acces_logement", "voir")).toBe("jamais");
  });

  it("le professionnel invité se limite au cahier de liaison", () => {
    expect(stanceFor("professionnel_invite", "comptes_rendus", "voir")).toBe("possible");
    expect(stanceFor("professionnel_invite", "finances", "voir")).toBe("jamais");
    expect(stanceFor("professionnel_invite", "journal_acces", "voir")).toBe("jamais");
  });

  it("gérer les droits des autres reste au bénéficiaire et au représentant", () => {
    expect(manageRightsStance("beneficiaire")).toBe("accorde");
    expect(manageRightsStance("representant_legal")).toBe("accorde");
    expect(manageRightsStance("proche_referent")).toBe("possible");
    expect(manageRightsStance("payeur")).toBe("jamais");
    // L'agence enregistre une décision, elle ne la prend pas.
    expect(manageRightsStance("coordinateur")).toBe("possible");
    expect(manageRightsStance("administrateur")).toBe("jamais");
  });

  it("un protocole se modifie sous validation, ou pas du tout", () => {
    expect(protocolStance("beneficiaire")).toBe("valide_par_agence");
    expect(protocolStance("proche_referent")).toBe("demande_seulement");
    expect(protocolStance("proche_invite")).toBe("jamais");
    expect(protocolStance("intervenant")).toBe("jamais");
  });

  it("aucune case n'est inventée : chaque rôle a une position définie partout", () => {
    for (const role of CLIENT_ROLES) {
      for (const module of MODULES) {
        for (const action of ACTIONS) {
          expect(["accorde", "possible", "jamais"]).toContain(stanceFor(role, module, action));
        }
      }
    }
  });
});

describe("la matrice côté Youdom Care", () => {
  it("l'intervenant ne voit que ce que sa mission demande", () => {
    expect(stanceFor("intervenant", "comptes_rendus", "creer")).toBe("accorde");
    expect(stanceFor("intervenant", "fiche_de_vie", "voir")).toBe("accorde");
    expect(stanceFor("intervenant", "finances", "voir")).toBe("jamais");
    expect(stanceFor("intervenant", "employeur", "voir")).toBe("jamais");
    expect(stanceFor("intervenant", "journal_acces", "voir")).toBe("jamais");
    // Un compte rendu ne s'exporte pas depuis le terrain.
    expect(stanceFor("intervenant", "comptes_rendus", "exporter")).toBe("jamais");
  });

  it("l'administrateur technique n'a aucun accès en clair aux notes de santé", () => {
    expect(stanceFor("administrateur", "comptes_rendus", "voir")).toBe("jamais");
    expect(stanceFor("administrateur", "fiche_de_vie", "voir")).toBe("jamais");
    expect(stanceFor("administrateur", "acces_logement", "voir")).toBe("jamais");
  });

  it("le coordinateur voit ses foyers, l'employeur reste à activer", () => {
    expect(stanceFor("coordinateur", "comptes_rendus", "voir")).toBe("accorde");
    expect(stanceFor("coordinateur", "employeur", "voir")).toBe("possible");
  });
});
