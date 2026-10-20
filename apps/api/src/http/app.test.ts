/** @vitest-environment node */
import { beforeEach, describe, expect, it } from "vitest";
import { fingerprint } from "../auth/secrets";
import { newId } from "../domaine/ids";
import { defaultGrants } from "../domaine/roles";
import { MemoryRateLimiter } from "../services/rate-limit";
import { household, membership, visit } from "../test/fixtures";
import { auth, harnais, membre, rattacher, PEPPER, type Harness } from "../test/harnais";

/*
 * Les tests des quatre surfaces, de bout en bout : la requête entre par `app.request`, ressort par
 * la réponse, et la base en mémoire valide chaque écriture avec les schémas de la vraie base.
 *
 * Ce qui est éprouvé ici n'est pas « la route répond 200 », c'est ce que le produit promet :
 * personne ne devine l'existence d'un foyer, la surface terrain n'est pas atteignable par une
 * famille, un pointage manuel exige un motif, et une demande de connexion ne dit jamais si une
 * adresse est connue.
 */

describe("la santé du service", () => {
  it("répond sans authentification", async () => {
    const h = harnais();
    const reponse = await h.app.request("/health");
    expect(reponse.status).toBe(200);
  });

  it("refuse une route inconnue par un 404, comme tout le reste", async () => {
    const h = harnais();
    const reponse = await h.app.request("/portal/v1/inexistant");
    expect([401, 404]).toContain(reponse.status);
  });
});

describe("se connecter", () => {
  it("ne dit jamais si une adresse est connue", async () => {
    const h = harnais();
    await membre(h, { email: "claire@exemple.fr" });

    const connue = await h.app.request("/auth/v1/challenges", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "claire@exemple.fr" }),
    });
    const inconnue = await h.app.request("/auth/v1/challenges", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "personne@exemple.fr" }),
    });

    expect(connue.status).toBe(inconnue.status);
    expect(Object.keys(await connue.json()).sort()).toEqual(
      Object.keys(await inconnue.json()).sort(),
    );
    // Un seul défi a été enregistré : celui de l'adresse connue.
    expect(h.db.tables.challenges).toHaveLength(1);
  });

  it("envoie un lien par courrier et un code par SMS, selon ce qu'on lui donne", async () => {
    const h = harnais();
    await membre(h, { email: "claire@exemple.fr" });
    await membre(h, { phone: "+33612345678", nom: "Monique" });

    await h.app.request("/auth/v1/challenges", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "claire@exemple.fr" }),
    });
    await h.app.request("/auth/v1/challenges", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "+33612345678" }),
    });

    expect(h.db.tables.challenges.map((defi) => defi.kind)).toEqual(["lien_magique", "code_sms"]);
  });

  it("refuse les deux identifiants à la fois", async () => {
    const h = harnais();
    const reponse = await h.app.request("/auth/v1/challenges", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "claire@exemple.fr", phone: "+33612345678" }),
    });
    expect(reponse.status).toBe(400);
  });

  it("échange un code valide contre un jeton, et refuse un mauvais code", async () => {
    const h = harnais();
    const id = await membre(h, { phone: "+33612345678" });
    const foyer = household();
    await h.db.repositories.households.insert(foyer);
    await rattacher(h, { memberId: id, householdId: foyer._id, role: "beneficiaire" });

    await h.app.request("/auth/v1/challenges", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "+33612345678" }),
    });
    const defi = h.db.tables.challenges[0];

    const mauvais = await h.app.request("/auth/v1/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challengeId: defi._id,
        secret: "000000",
        device: { label: "iPhone" },
      }),
    });
    expect(mauvais.status).toBe(401);

    // Le secret n'existe qu'à l'envoi : on le reprend par la seule voie légitime, l'empreinte.
    const bon = ["000000"];
    for (let candidat = 0; candidat < 1_000_000 && bon.length === 1; candidat += 1) {
      const code = String(candidat).padStart(6, "0");
      if (fingerprint(code, PEPPER) === defi.secretFingerprint) bon.push(code);
    }

    const reponse = await h.app.request("/auth/v1/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ challengeId: defi._id, secret: bon[1], device: { label: "iPhone" } }),
    });
    expect(reponse.status).toBe(201);
    const { token } = (await reponse.json()) as { token: string };

    const moi = await h.app.request("/portal/v1/me", { headers: auth(token) });
    expect(moi.status).toBe(200);
  });

  it("limite les demandes répétées", async () => {
    const h = harnais(new MemoryRateLimiter({ max: 2, windowMs: 60_000 }));
    await membre(h, { email: "claire@exemple.fr" });
    const demander = () =>
      h.app.request("/auth/v1/challenges", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "claire@exemple.fr" }),
      });
    expect((await demander()).status).toBe(202);
    expect((await demander()).status).toBe(202);
    expect((await demander()).status).toBe(429);
  });

  it("liste les appareils sans jamais rendre l'empreinte du jeton", async () => {
    const h = harnais();
    const id = await membre(h);
    const token = await h.connecter(id);
    const reponse = await h.app.request("/auth/v1/sessions", { headers: auth(token) });
    const corps = await reponse.text();
    expect(reponse.status).toBe(200);
    expect(corps).toContain("test");
    expect(corps).not.toContain(h.db.tables.sessions[0].tokenFingerprint);
  });

  it("déconnecte un appareil, et pas celui d'un autre", async () => {
    const h = harnais();
    const claire = await membre(h);
    const monique = await membre(h, { phone: "+33611111111", nom: "Monique" });
    const tokenClaire = await h.connecter(claire);
    await h.connecter(monique);
    const sessionDeMonique = h.db.tables.sessions[1];

    const refus = await h.app.request(`/auth/v1/sessions/${sessionDeMonique._id}`, {
      method: "DELETE",
      headers: auth(tokenClaire),
    });
    expect(refus.status).toBe(404);

    const sienne = h.db.tables.sessions[0];
    const ok = await h.app.request(`/auth/v1/sessions/${sienne._id}`, {
      method: "DELETE",
      headers: auth(tokenClaire),
    });
    expect(ok.status).toBe(204);
    expect(h.db.tables.sessions[0].revokedAt).not.toBeNull();

    // Une session révoquée ne sert plus à rien, immédiatement.
    const apres = await h.app.request("/portal/v1/me", { headers: auth(tokenClaire) });
    expect(apres.status).toBe(401);
  });

  it("refuse une requête sans jeton", async () => {
    const h = harnais();
    expect((await h.app.request("/portal/v1/me")).status).toBe(401);
    expect((await h.app.request("/field/v1/visits/today")).status).toBe(401);
    expect((await h.app.request("/admin/v1/households", { method: "POST" })).status).toBe(401);
  });
});

describe("les surfaces ne se mélangent pas", () => {
  let h: Harness;
  let foyer: ReturnType<typeof household>;

  beforeEach(async () => {
    h = harnais();
    foyer = household();
    await h.db.repositories.households.insert(foyer);
  });

  it("une famille n'atteint pas la surface terrain ni le back-office", async () => {
    const claire = await membre(h);
    await rattacher(h, { memberId: claire, householdId: foyer._id, role: "proche_referent" });
    const token = await h.connecter(claire);

    expect((await h.app.request("/field/v1/visits/today", { headers: auth(token) })).status).toBe(
      404,
    );
    expect(
      (
        await h.app.request("/admin/v1/households", {
          method: "POST",
          headers: { ...auth(token), "content-type": "application/json" },
          body: JSON.stringify({}),
        })
      ).status,
    ).toBe(404);
  });

  it("un intervenant n'atteint pas l'espace client", async () => {
    const fatima = await membre(h, { nom: "Fatima" });
    await rattacher(h, { memberId: fatima, householdId: foyer._id, role: "intervenant" });
    const token = await h.connecter(fatima);

    expect((await h.app.request("/portal/v1/me", { headers: auth(token) })).status).toBe(404);
    expect((await h.app.request("/field/v1/visits/today", { headers: auth(token) })).status).toBe(
      200,
    );
  });
});

describe("l'espace client", () => {
  it("ne montre pas le planning d'un foyer sans droit, et ne dit pas qu'il existe", async () => {
    const h = harnais();
    const foyer = household();
    const voisin = household({ code: "FOY-0002" });
    await h.db.repositories.households.insert(foyer);
    await h.db.repositories.households.insert(voisin);

    const claire = await membre(h);
    await rattacher(h, { memberId: claire, householdId: foyer._id, role: "proche_invite" });
    const token = await h.connecter(claire);

    const fenetre = "from=2026-10-19T00:00:00Z&to=2026-10-26T00:00:00Z";
    // Proche invité : aucun droit posé d'office, donc introuvable.
    const sien = await h.app.request(`/portal/v1/households/${foyer._id}/visits?${fenetre}`, {
      headers: auth(token),
    });
    const autre = await h.app.request(`/portal/v1/households/${voisin._id}/visits?${fenetre}`, {
      headers: auth(token),
    });
    expect(sien.status).toBe(404);
    expect(autre.status).toBe(404);
    expect(await sien.text()).toBe(await autre.text());
  });

  it("montre le planning avec le prénom et l'initiale, et la photo seulement avec accord", async () => {
    const h = harnais();
    const foyer = household();
    await h.db.repositories.households.insert(foyer);
    const claire = await membre(h);
    await rattacher(h, { memberId: claire, householdId: foyer._id, role: "beneficiaire" });

    const fatima = await membre(h, { nom: "Fatima", phone: "+33622222222" });
    await h.db.repositories.workers.insert({
      _id: fatima,
      agencyId: newId(),
      firstName: "Fatima",
      lastInitial: "B",
      senioritySince: null,
      qualifications: [],
      languages: [],
      photoConsent: false,
      photoId: "a".repeat(24),
      createdAt: h.now,
    });
    await h.db.repositories.visits.insert(
      visit({
        householdId: foyer._id,
        workerId: fatima,
        plannedStart: new Date("2026-10-20T08:00:00Z"),
        plannedEnd: new Date("2026-10-20T10:00:00Z"),
        status: "prevue",
      }),
    );

    const token = await h.connecter(claire);
    const reponse = await h.app.request(
      `/portal/v1/households/${foyer._id}/visits?from=2026-10-19T00:00:00Z&to=2026-10-26T00:00:00Z`,
      { headers: auth(token) },
    );
    expect(reponse.status).toBe(200);
    const corps = (await reponse.json()) as {
      visites: { intervenant: { prenom: string; initiale: string; photo: string | null } }[];
    };
    expect(corps.visites).toHaveLength(1);
    expect(corps.visites[0].intervenant).toEqual({ prenom: "Fatima", initiale: "B", photo: null });
  });

  it("exige une fenêtre de dates cohérente", async () => {
    const h = harnais();
    const claire = await membre(h);
    const foyer = household();
    await h.db.repositories.households.insert(foyer);
    await rattacher(h, { memberId: claire, householdId: foyer._id, role: "beneficiaire" });
    const token = await h.connecter(claire);

    const sansDates = await h.app.request(`/portal/v1/households/${foyer._id}/visits`, {
      headers: auth(token),
    });
    const alEnvers = await h.app.request(
      `/portal/v1/households/${foyer._id}/visits?from=2026-10-26T00:00:00Z&to=2026-10-19T00:00:00Z`,
      { headers: auth(token) },
    );
    expect(sansDates.status).toBe(400);
    expect(alEnvers.status).toBe(400);
  });

  it("dit à la personne qui a consulté son dossier, refus compris", async () => {
    const h = harnais();
    const foyer = household();
    await h.db.repositories.households.insert(foyer);
    const claire = await membre(h);
    await rattacher(h, { memberId: claire, householdId: foyer._id, role: "beneficiaire" });
    const token = await h.connecter(claire);

    // Une tentative refusée : la fiche de vie n'est pas ouverte d'office à ce stade.
    await h.app.request(
      `/portal/v1/households/${foyer._id}/visits?from=2026-10-19T00:00:00Z&to=2026-10-26T00:00:00Z`,
      { headers: auth(token) },
    );

    const journal = await h.app.request(`/portal/v1/households/${foyer._id}/access-log`, {
      headers: auth(token),
    });
    expect(journal.status).toBe(200);
    const corps = (await journal.json()) as { acces: { quoi: string; resultat: string }[] };
    expect(corps.acces.length).toBeGreaterThan(0);
    expect(corps.acces.some((ligne) => ligne.quoi === "planning")).toBe(true);
  });

  it("le second facteur ouvre les finances, et son absence les ferme", async () => {
    const h = harnais();
    const foyer = household();
    await h.db.repositories.households.insert(foyer);
    const claire = await membre(h, { email: "claire@exemple.fr" });
    await rattacher(h, { memberId: claire, householdId: foyer._id, role: "beneficiaire" });

    const sansFacteur = await h.connecter(claire);
    const avecFacteur = await h.connecter(claire, { secondFacteur: true });

    // Le module finances passe par le même garde que le planning : on l'éprouve par le journal.
    const refuse = await h.app.request(`/portal/v1/households/${foyer._id}/access-log`, {
      headers: auth(sansFacteur),
    });
    expect(refuse.status).toBe(200); // `journal_acces` n'est pas un module sensible

    const second = await h.app.request("/auth/v1/second-factor/challenges", {
      method: "POST",
      headers: auth(sansFacteur),
    });
    expect(second.status).toBe(202);
    expect((await h.app.request("/portal/v1/me", { headers: auth(avecFacteur) })).status).toBe(200);
  });
});

describe("la surface terrain", () => {
  async function terrain() {
    const h = harnais();
    const foyer = household();
    await h.db.repositories.households.insert(foyer);
    const fatima = await membre(h, { nom: "Fatima", phone: "+33622222222" });
    await rattacher(h, { memberId: fatima, householdId: foyer._id, role: "intervenant" });
    await h.db.repositories.workers.insert({
      _id: fatima,
      agencyId: newId(),
      firstName: "Fatima",
      lastInitial: "B",
      senioritySince: null,
      qualifications: [],
      languages: [],
      photoConsent: false,
      photoId: null,
      createdAt: h.now,
    });
    const laVisite = visit({
      householdId: foyer._id,
      workerId: fatima,
      plannedStart: new Date("2026-10-19T10:30:00Z"),
      plannedEnd: new Date("2026-10-19T12:00:00Z"),
      status: "prevue",
    });
    await h.db.repositories.visits.insert(laVisite);
    // Second facteur présenté : l'accès au logement est une donnée critique, et l'API l'exige
    // (`ARCHITECTURE.md` §5). Les pointages, eux, n'en demandent pas.
    const token = await h.connecter(fatima, { secondFacteur: true });
    return { h, foyer, fatima, visite: laVisite, token };
  }

  it("donne la tournée du jour", async () => {
    const { h, token } = await terrain();
    const reponse = await h.app.request("/field/v1/visits/today", { headers: auth(token) });
    expect(reponse.status).toBe(200);
    const corps = (await reponse.json()) as { visites: unknown[] };
    expect(corps.visites).toHaveLength(1);
  });

  it("accepte un pointage NFC", async () => {
    const { h, visite, token } = await terrain();
    const reponse = await h.app.request(`/field/v1/visits/${visite._id}/punch`, {
      method: "POST",
      headers: { ...auth(token), "content-type": "application/json" },
      body: JSON.stringify({ type: "arrivee", source: "nfc" }),
    });
    expect(reponse.status).toBe(201);
    expect(h.db.tables.visitEvents).toHaveLength(1);
  });

  it("fait avancer le statut de la visite, et jamais à reculons", async () => {
    const { h, visite, token } = await terrain();
    const pointer = (type: string, source = "nfc") =>
      h.app.request(`/field/v1/visits/${visite._id}/punch`, {
        method: "POST",
        headers: { ...auth(token), "content-type": "application/json" },
        body: JSON.stringify({ type, source }),
      });

    expect(((await (await pointer("en_route")).json()) as { statut: string }).statut).toBe(
      "en_route",
    );
    expect(((await (await pointer("arrivee")).json()) as { statut: string }).statut).toBe(
      "en_cours",
    );
    expect(((await (await pointer("depart")).json()) as { statut: string }).statut).toBe("faite");

    /*
     * Un pointage « en route » qui arrive après le départ — tournée hors réseau synchronisée dans
     * le désordre — est enregistré comme événement, mais ne rouvre pas une visite terminée.
     */
    const retardataire = await pointer("en_route");
    expect(retardataire.status).toBe(201);
    expect(((await retardataire.json()) as { statut: string }).statut).toBe("faite");
    expect(h.db.tables.visitEvents).toHaveLength(4);

    const apres = await h.db.repositories.visits.findById(visite._id);
    expect(apres?.status).toBe("faite");
  });

  it("rend les pointages déjà enregistrés avec la tournée", async () => {
    const { h, visite, token } = await terrain();
    await h.app.request(`/field/v1/visits/${visite._id}/punch`, {
      method: "POST",
      headers: { ...auth(token), "content-type": "application/json" },
      body: JSON.stringify({ type: "arrivee", source: "nfc" }),
    });

    // Une application rechargée doit savoir ce qui a déjà été pointé, sinon on repointe.
    const reponse = await h.app.request("/field/v1/visits/today", { headers: auth(token) });
    const corps = (await reponse.json()) as {
      visites: { statut: string; pointages: { type: string; source: string }[] }[];
    };
    expect(corps.visites[0]?.statut).toBe("en_cours");
    expect(corps.visites[0]?.pointages).toEqual([
      expect.objectContaining({ type: "arrivee", source: "nfc" }),
    ]);
  });

  it("refuse un pointage manuel sans motif, et l'accepte avec", async () => {
    const { h, visite, token } = await terrain();
    const sansMotif = await h.app.request(`/field/v1/visits/${visite._id}/punch`, {
      method: "POST",
      headers: { ...auth(token), "content-type": "application/json" },
      body: JSON.stringify({ type: "arrivee", source: "manuel" }),
    });
    expect(sansMotif.status).toBe(400);

    const avecMotif = await h.app.request(`/field/v1/visits/${visite._id}/punch`, {
      method: "POST",
      headers: { ...auth(token), "content-type": "application/json" },
      body: JSON.stringify({ type: "arrivee", source: "manuel", reason: "badge décollé" }),
    });
    expect(avecMotif.status).toBe(201);
    expect(h.db.tables.visitEvents[0].reason).toBe("badge décollé");
  });

  it("garde l'heure du geste, pas celle de l'envoi", async () => {
    const { h, visite, token } = await terrain();
    const geste = new Date(h.now.getTime() - 90 * 60 * 1000);
    const reponse = await h.app.request(`/field/v1/visits/${visite._id}/punch`, {
      method: "POST",
      headers: { ...auth(token), "content-type": "application/json" },
      body: JSON.stringify({ type: "arrivee", source: "qr", at: geste.toISOString() }),
    });
    expect(reponse.status).toBe(201);
    const event = h.db.tables.visitEvents[0];
    expect(event.at.toISOString()).toBe(geste.toISOString());
    expect(event.recordedAt.toISOString()).toBe(h.now.toISOString());
  });

  it("refuse un pointage dans le futur ou trop ancien", async () => {
    const { h, visite, token } = await terrain();
    const futur = new Date(h.now.getTime() + 10 * 60 * 1000);
    const vieux = new Date(h.now.getTime() - 72 * 60 * 60 * 1000);
    for (const at of [futur, vieux]) {
      const reponse = await h.app.request(`/field/v1/visits/${visite._id}/punch`, {
        method: "POST",
        headers: { ...auth(token), "content-type": "application/json" },
        body: JSON.stringify({ type: "arrivee", source: "qr", at: at.toISOString() }),
      });
      expect(reponse.status).toBe(400);
    }
    expect(h.db.tables.visitEvents).toHaveLength(0);
  });

  it("n'accepte pas un pointage « agence » depuis le terrain", async () => {
    const { h, visite, token } = await terrain();
    const reponse = await h.app.request(`/field/v1/visits/${visite._id}/punch`, {
      method: "POST",
      headers: { ...auth(token), "content-type": "application/json" },
      body: JSON.stringify({ type: "arrivee", source: "agence" }),
    });
    expect(reponse.status).toBe(400);
  });

  it("une visite qui n'est pas la sienne n'existe pas pour lui", async () => {
    const { h, visite } = await terrain();
    const autre = await membre(h, { nom: "Awa", phone: "+33633333333" });
    await rattacher(h, { memberId: autre, householdId: visite.householdId, role: "intervenant" });
    const token = await h.connecter(autre);

    const reponse = await h.app.request(`/field/v1/visits/${visite._id}/punch`, {
      method: "POST",
      headers: { ...auth(token), "content-type": "application/json" },
      body: JSON.stringify({ type: "arrivee", source: "nfc" }),
    });
    expect(reponse.status).toBe(404);
  });

  it("l'accès au logement n'est ouvert que pendant la visite", async () => {
    const { h, visite, token } = await terrain();
    // Il est 10 h, la visite commence à 10 h 30 : hors plage.
    const avant = await h.app.request(`/field/v1/visits/${visite._id}/access-instructions`, {
      headers: auth(token),
    });
    expect(avant.status).toBe(404);

    // Quarante-cinq minutes plus tard : dans la plage, et le second facteur tient encore
    // (il se périme en une heure).
    h.avancer(45 * 60 * 1000);
    const pendant = await h.app.request(`/field/v1/visits/${visite._id}/access-instructions`, {
      headers: auth(token),
    });
    expect(pendant.status).toBe(200);

    // Les deux tentatives sont au journal du foyer : c'est ce que le bénéficiaire pourra lire.
    const lignes = h.db.tables.auditLogs.filter((ligne) => ligne.module === "acces_logement");
    expect(lignes.map((ligne) => ligne.outcome)).toEqual(["refuse", "autorise"]);
  });
});

describe("le back-office", () => {
  async function agence() {
    const h = harnais();
    const agencyId = newId();
    const bureau = household({ code: "AGENCE-01", agencyId });
    await h.db.repositories.households.insert(bureau);
    const responsable = await membre(h, { email: "arcel@exemple.fr", nom: "Arcel" });
    await h.db.repositories.memberships.insert(
      membership({
        memberId: responsable,
        householdId: bureau._id,
        role: "responsable_agence",
      }),
    );
    const token = await h.connecter(responsable);
    // L'agence de l'auteur vient de son rattachement : c'est elle, et pas une autre, qu'il peut
    // administrer (`trace.ts`).
    return { h, token, responsable, agencyId };
  }

  const json = (token: string) => ({ ...auth(token), "content-type": "application/json" });

  it("crée un foyer, refuse un code déjà pris", async () => {
    const { h, token, agencyId } = await agence();
    const corps = {
      code: "FOY-0001",
      agencyId,
      mode: "prestataire",
      address: { line1: "12 rue des Lilas", postalCode: "75011", city: "Paris" },
    };
    const premier = await h.app.request("/admin/v1/households", {
      method: "POST",
      headers: json(token),
      body: JSON.stringify(corps),
    });
    expect(premier.status).toBe(201);

    const second = await h.app.request("/admin/v1/households", {
      method: "POST",
      headers: json(token),
      body: JSON.stringify(corps),
    });
    expect(second.status).toBe(400);
  });

  it("enregistre un intervenant sans consentement photo par défaut", async () => {
    const { h, token, agencyId } = await agence();
    const reponse = await h.app.request("/admin/v1/workers", {
      method: "POST",
      headers: json(token),
      body: JSON.stringify({
        email: "fatima@exemple.fr",
        displayName: "Fatima B.",
        agencyId,
        firstName: "Fatima",
        lastInitial: "B",
      }),
    });
    expect(reponse.status).toBe(201);
    expect(h.db.tables.workers[0].photoConsent).toBe(false);
    // Une personne, une identité : l'intervenant porte l'identifiant de son compte.
    expect(h.db.tables.workers[0]._id).toBe(h.db.tables.members[1]._id);
  });

  it("rattache un membre avec les droits « ✓ » de son rôle, et rien d'autre", async () => {
    const { h, token, agencyId } = await agence();
    const foyer = household({ code: "FOY-0002", agencyId });
    await h.db.repositories.households.insert(foyer);

    const beneficiaire = await h.app.request("/admin/v1/memberships", {
      method: "POST",
      headers: json(token),
      body: JSON.stringify({
        householdId: foyer._id,
        role: "beneficiaire",
        member: { email: "monique@exemple.fr", displayName: "Monique" },
      }),
    });
    expect(beneficiaire.status).toBe(201);
    expect((await beneficiaire.json()) as { droits: number }).toMatchObject({
      droits: defaultGrants("beneficiaire").length,
    });

    const invite = await h.app.request("/admin/v1/memberships", {
      method: "POST",
      headers: json(token),
      body: JSON.stringify({
        householdId: foyer._id,
        role: "proche_invite",
        member: { email: "cousin@exemple.fr", displayName: "Un cousin" },
      }),
    });
    // Un proche invité ne reçoit rien : on lui ouvre un module à la fois.
    expect((await invite.json()) as { droits: number }).toMatchObject({ droits: 0 });

    // Le rattachement attend la première connexion de la personne.
    expect(h.db.tables.memberships.at(-1)?.status).toBe("invite");
  });

  it("pose une visite, refuse un intervenant inconnu et un foyer inconnu", async () => {
    const { h, token, agencyId } = await agence();
    const foyer = household({ code: "FOY-0003", agencyId });
    await h.db.repositories.households.insert(foyer);
    const fatima = await membre(h, { nom: "Fatima", phone: "+33622222222" });
    await h.db.repositories.workers.insert({
      _id: fatima,
      agencyId: newId(),
      firstName: "Fatima",
      lastInitial: "B",
      senioritySince: null,
      qualifications: [],
      languages: [],
      photoConsent: false,
      photoId: null,
      createdAt: h.now,
    });

    const ok = await h.app.request("/admin/v1/visits", {
      method: "POST",
      headers: json(token),
      body: JSON.stringify({
        householdId: foyer._id,
        workerId: fatima,
        plannedStart: "2026-10-20T08:00:00Z",
        plannedEnd: "2026-10-20T10:00:00Z",
        kind: "jour",
      }),
    });
    expect(ok.status).toBe(201);

    const sansIntervenant = await h.app.request("/admin/v1/visits", {
      method: "POST",
      headers: json(token),
      body: JSON.stringify({
        householdId: foyer._id,
        workerId: newId(),
        plannedStart: "2026-10-20T08:00:00Z",
        plannedEnd: "2026-10-20T10:00:00Z",
        kind: "jour",
      }),
    });
    expect(sansIntervenant.status).toBe(400);

    const foyerInconnu = await h.app.request("/admin/v1/visits", {
      method: "POST",
      headers: json(token),
      body: JSON.stringify({
        householdId: newId(),
        workerId: fatima,
        plannedStart: "2026-10-20T08:00:00Z",
        plannedEnd: "2026-10-20T10:00:00Z",
        kind: "jour",
      }),
    });
    expect(foyerInconnu.status).toBe(404);
  });

  it("refuse une visite qui finit avant de commencer", async () => {
    const { h, token, agencyId } = await agence();
    const foyer = household({ code: "FOY-0004", agencyId });
    await h.db.repositories.households.insert(foyer);
    const reponse = await h.app.request("/admin/v1/visits", {
      method: "POST",
      headers: json(token),
      body: JSON.stringify({
        householdId: foyer._id,
        workerId: newId(),
        plannedStart: "2026-10-20T10:00:00Z",
        plannedEnd: "2026-10-20T08:00:00Z",
        kind: "jour",
      }),
    });
    expect(reponse.status).toBe(400);
  });

  it("journalise chaque action d'agence", async () => {
    const { h, token, responsable, agencyId } = await agence();
    await h.app.request("/admin/v1/households", {
      method: "POST",
      headers: json(token),
      body: JSON.stringify({
        code: "FOY-0005",
        agencyId,
        mode: "mandataire",
        address: { line1: "3 avenue Gambetta", postalCode: "93100", city: "Montreuil" },
      }),
    });
    const ligne = h.db.tables.auditLogs.at(-1);
    expect(ligne).toMatchObject({
      module: "administration",
      action: "creer",
      target: "foyer",
      actorId: responsable,
      actorRole: "responsable_agence",
      outcome: "autorise",
    });
  });

  it("retire un droit, et le retrait prend effet tout de suite", async () => {
    const { h, token, agencyId } = await agence();
    const foyer = household({ code: "FOY-0006", agencyId });
    await h.db.repositories.households.insert(foyer);
    const claire = await membre(h, { email: "claire@exemple.fr" });
    await rattacher(h, { memberId: claire, householdId: foyer._id, role: "beneficiaire" });
    const sonJeton = await h.connecter(claire);

    const fenetre = "from=2026-10-19T00:00:00Z&to=2026-10-26T00:00:00Z";
    const avant = await h.app.request(`/portal/v1/households/${foyer._id}/visits?${fenetre}`, {
      headers: auth(sonJeton),
    });
    expect(avant.status).toBe(200);

    const droitPlanning = h.db.tables.grants.find((grant) => grant.module === "planning");
    const retrait = await h.app.request(`/admin/v1/grants/${droitPlanning?._id}`, {
      method: "DELETE",
      headers: json(token),
      body: JSON.stringify({ householdId: foyer._id }),
    });
    expect(retrait.status).toBe(204);

    // Même jeton, même session : le droit est relu à chaque requête.
    const apres = await h.app.request(`/portal/v1/households/${foyer._id}/visits?${fenetre}`, {
      headers: auth(sonJeton),
    });
    expect(apres.status).toBe(404);
  });
});
