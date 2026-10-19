/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { newId } from "../domaine/ids";
import { emptyRules, type Rule, type RuleKey } from "../domaine/regles";
import { household, membership } from "../test/fixtures";
import { auth, harnais, membre, type Harness } from "../test/harnais";

/*
 * Les routes de planning et de tarifs, de bout en bout.
 *
 * Deux promesses y sont éprouvées plus que le reste, parce que ce sont des décisions d'Arcel :
 * **sans règle saisie, rien ne bloque** — et **aucun tarif n'existe avant que l'agence le crée**.
 */

const json = (token: string) => ({ ...auth(token), "content-type": "application/json" });

type Bureau = {
  h: Harness;
  token: string;
  agencyId: string;
  foyer: ReturnType<typeof household>;
};

async function bureau(): Promise<Bureau> {
  const h = harnais();
  const agencyId = newId();
  const siege = household({ code: "AGENCE-01", agencyId });
  await h.db.repositories.households.insert(siege);
  const responsable = await membre(h, { email: "arcel@exemple.fr", nom: "Arcel" });
  await h.db.repositories.memberships.insert(
    membership({ memberId: responsable, householdId: siege._id, role: "responsable_agence" }),
  );
  const foyer = household({ code: "FOY-0001", agencyId });
  await h.db.repositories.households.insert(foyer);
  return { h, token: await h.connecter(responsable), agencyId, foyer };
}

async function intervenant(b: Bureau, nom: string, phone: string): Promise<string> {
  const id = await membre(b.h, { nom, phone });
  await b.h.db.repositories.workers.insert({
    _id: id,
    agencyId: b.agencyId,
    firstName: nom,
    lastInitial: "B",
    senioritySince: null,
    qualifications: [],
    languages: [],
    photoConsent: false,
    photoId: null,
    createdAt: b.h.now,
  });
  return id;
}

async function poserRegles(b: Bureau, actives: Partial<Record<RuleKey, Partial<Rule>>>) {
  const regles = emptyRules();
  for (const [key, rule] of Object.entries(actives)) {
    regles[key as RuleKey] = {
      active: true,
      severite: rule?.severite ?? "bloquant",
      valeur: rule?.valeur ?? null,
    };
  }
  const reponse = await b.h.app.request(`/admin/v1/rules/${b.agencyId}`, {
    method: "PUT",
    headers: json(b.token),
    body: JSON.stringify({ regles }),
  });
  expect(reponse.status).toBe(200);
}

function creneau(input: { weekday: number; start: string; end: string; workerId?: string | null }) {
  return {
    weekday: input.weekday,
    start: input.start,
    end: input.end,
    overnight: false,
    kind: "jour" as const,
    workerId: input.workerId ?? null,
  };
}

async function creerSerie(
  b: Bureau,
  corps: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const reponse = await b.h.app.request("/admin/v1/series", {
    method: "POST",
    headers: json(b.token),
    body: JSON.stringify({ householdId: b.foyer._id, libelle: "Matins", everyWeeks: 1, ...corps }),
  });
  return { status: reponse.status, body: (await reponse.json()) as Record<string, unknown> };
}

describe("les règles de l'agence", () => {
  it("n'existent pas tant que l'agence ne les a pas saisies", async () => {
    const b = await bureau();
    const reponse = await b.h.app.request(`/admin/v1/rules/${b.agencyId}`, {
      headers: auth(b.token),
    });
    const corps = (await reponse.json()) as {
      aucuneRegleSaisie: boolean;
      version: number;
      catalogue: unknown[];
      regles: Record<string, Rule>;
    };
    expect(corps.aucuneRegleSaisie).toBe(true);
    expect(corps.version).toBe(0);
    // Le catalogue explique les dix règles possibles sans en activer aucune.
    expect(corps.catalogue).toHaveLength(10);
    expect(Object.values(corps.regles).every((rule) => !rule.active)).toBe(true);
  });

  it("se versionnent à chaque enregistrement", async () => {
    const b = await bureau();
    await poserRegles(b, { amplitude_quotidienne: { valeur: 13 } });
    await poserRegles(b, { amplitude_quotidienne: { valeur: 12 } });
    const reponse = await b.h.app.request(`/admin/v1/rules/${b.agencyId}`, {
      headers: auth(b.token),
    });
    const corps = (await reponse.json()) as { version: number; regles: Record<string, Rule> };
    expect(corps.version).toBe(2);
    expect(corps.regles.amplitude_quotidienne).toMatchObject({ active: true, valeur: 12 });
  });

  it("refusent une règle active sans seuil", async () => {
    const b = await bureau();
    const regles = emptyRules();
    regles.amplitude_quotidienne = { active: true, severite: "bloquant", valeur: null };
    const reponse = await b.h.app.request(`/admin/v1/rules/${b.agencyId}`, {
      method: "PUT",
      headers: json(b.token),
      body: JSON.stringify({ regles }),
    });
    expect(reponse.status).toBe(400);
  });
});

describe("créer un planning", () => {
  it("accepte un planning que personne ne voudrait tenir, faute de règle saisie", async () => {
    const b = await bureau();
    const fatima = await intervenant(b, "Fatima", "+33611111111");
    const { status, body } = await creerSerie(b, {
      from: "2026-10-19",
      slots: [1, 2, 3, 4, 5, 6, 7].map((weekday) =>
        creneau({ weekday, start: "06:00", end: "22:00", workerId: fatima }),
      ),
    });
    // Seize heures par jour, sept jours sur sept : aucune règle n'étant saisie, c'est accepté.
    expect(status).toBe(201);
    expect(body.avertissements).toEqual([]);
  });

  it("refuse le même planning dès que l'agence a posé ses règles en bloquant", async () => {
    const b = await bureau();
    const fatima = await intervenant(b, "Fatima", "+33611111111");
    await poserRegles(b, {
      amplitude_quotidienne: { valeur: 13 },
      jours_consecutifs: { valeur: 6 },
    });
    const { status, body } = await creerSerie(b, {
      from: "2026-10-19",
      slots: [1, 2, 3, 4, 5, 6, 7].map((weekday) =>
        creneau({ weekday, start: "06:00", end: "22:00", workerId: fatima }),
      ),
    });
    expect(status).toBe(409);
    const bloquants = body.bloquants as { regle: string }[];
    // Le jugement porte sur quatre semaines : une amplitude par jour, et les jours consécutifs.
    expect([...new Set(bloquants.map((b) => b.regle))].sort()).toEqual([
      "amplitude_quotidienne",
      "jours_consecutifs",
    ]);
    // Rien n'a été écrit.
    expect(b.h.db.tables.series).toHaveLength(0);
  });

  it("laisse passer un avertissement, et le remonte au coordinateur", async () => {
    const b = await bureau();
    const fatima = await intervenant(b, "Fatima", "+33611111111");
    await poserRegles(b, { duree_min_visite: { valeur: 45, severite: "avertissement" } });
    const { status, body } = await creerSerie(b, {
      from: "2026-10-19",
      slots: [creneau({ weekday: 1, start: "09:00", end: "09:30", workerId: fatima })],
    });
    expect(status).toBe(201);
    const avertissements = body.avertissements as { regle: string; severite: string }[];
    // Une par lundi de la fenêtre jugée : la demi-heure revient chaque semaine.
    expect(avertissements.length).toBeGreaterThanOrEqual(4);
    expect(avertissements.every((a) => a.regle === "duree_min_visite")).toBe(true);
    expect(avertissements.every((a) => a.severite === "avertissement")).toBe(true);
    expect(b.h.db.tables.series).toHaveLength(1);
  });

  it("voit le chevauchement entre deux séries différentes du même intervenant", async () => {
    const b = await bureau();
    const fatima = await intervenant(b, "Fatima", "+33611111111");
    const autre = household({ code: "FOY-0002", agencyId: b.agencyId });
    await b.h.db.repositories.households.insert(autre);
    await poserRegles(b, { chevauchement: {} });

    const premiere = await creerSerie(b, {
      from: "2026-10-19",
      slots: [creneau({ weekday: 1, start: "09:00", end: "11:00", workerId: fatima })],
    });
    expect(premiere.status).toBe(201);

    const reponse = await b.h.app.request("/admin/v1/series", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({
        householdId: autre._id,
        libelle: "Chez le voisin",
        from: "2026-10-19",
        everyWeeks: 1,
        slots: [creneau({ weekday: 1, start: "10:00", end: "12:00", workerId: fatima })],
      }),
    });
    expect(reponse.status).toBe(409);
  });

  it("refuse un créneau qui finit avant de commencer, sauf garde de nuit", () =>
    bureau().then(async (b) => {
      const impossible = await creerSerie(b, {
        from: "2026-10-19",
        slots: [creneau({ weekday: 1, start: "21:00", end: "07:00" })],
      });
      expect(impossible.status).toBe(400);

      const nuit = await b.h.app.request("/admin/v1/series", {
        method: "POST",
        headers: json(b.token),
        body: JSON.stringify({
          householdId: b.foyer._id,
          libelle: "Nuits",
          from: "2026-10-19",
          everyWeeks: 1,
          slots: [
            {
              weekday: 1,
              start: "21:00",
              end: "07:00",
              overnight: true,
              kind: "nuit_calme",
              workerId: null,
            },
          ],
        }),
      });
      expect(nuit.status).toBe(201);
    }));

  it("refuse de poser un planning sur un foyer gelé", async () => {
    const b = await bureau();
    const gele = household({ code: "FOY-GEL", agencyId: b.agencyId, status: "gele" });
    await b.h.db.repositories.households.insert(gele);
    const reponse = await b.h.app.request("/admin/v1/series", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({
        householdId: gele._id,
        libelle: "Matins",
        from: "2026-10-19",
        everyWeeks: 1,
        slots: [creneau({ weekday: 1, start: "09:00", end: "11:00" })],
      }),
    });
    expect(reponse.status).toBe(400);
  });
});

describe("modifier un planning", () => {
  async function avecSerie() {
    const b = await bureau();
    const fatima = await intervenant(b, "Fatima", "+33611111111");
    const awa = await intervenant(b, "Awa", "+33622222222");
    const { body } = await creerSerie(b, {
      from: "2026-10-19",
      slots: [
        creneau({ weekday: 1, start: "09:00", end: "11:00", workerId: fatima }),
        creneau({ weekday: 4, start: "14:00", end: "16:00", workerId: fatima }),
      ],
    });
    return { b, serieId: body.id as string, fatima, awa };
  }

  const patch = (b: Bureau, serieId: string, date: string, slot: number, corps: unknown) =>
    b.h.app.request(`/admin/v1/series/${serieId}/occurrences/${date}/${slot}`, {
      method: "PATCH",
      headers: json(b.token),
      body: JSON.stringify(corps),
    });

  it("remplace l'intervenant d'une seule visite", async () => {
    const { b, serieId, awa, fatima } = await avecSerie();
    const reponse = await patch(b, serieId, "2026-10-26", 0, {
      portee: "occurrence",
      change: { workerId: awa, motif: "Fatima en formation" },
    });
    expect(reponse.status).toBe(200);

    const liste = await b.h.app.request(
      `/admin/v1/series/${serieId}/occurrences?from=2026-10-19&to=2026-11-02`,
      { headers: auth(b.token) },
    );
    const corps = (await liste.json()) as {
      occurrences: {
        date: string;
        workerId: string | null;
        origine: string;
        motif: string | null;
      }[];
    };
    const concernee = corps.occurrences.find((o) => o.date === "2026-10-26");
    expect(concernee).toMatchObject({
      workerId: awa,
      origine: "exception",
      motif: "Fatima en formation",
    });
    expect(corps.occurrences.find((o) => o.date === "2026-10-19")?.workerId).toBe(fatima);
  });

  it("« celle-ci et les suivantes » coupe la série et en crée une autre", async () => {
    const { b, serieId } = await avecSerie();
    const reponse = await patch(b, serieId, "2026-11-02", 0, {
      portee: "cette_et_suivantes",
      change: { start: "08:00", end: "10:00" },
    });
    expect(reponse.status).toBe(200);
    const corps = (await reponse.json()) as { nouvelleSerie: string | null };
    expect(corps.nouvelleSerie).toBeTruthy();

    const series = await b.h.app.request(`/admin/v1/households/${b.foyer._id}/series`, {
      headers: auth(b.token),
    });
    const liste = (await series.json()) as {
      series: { id: string; du: string; au: string | null; remplaceePar: string | null }[];
    };
    expect(liste.series).toHaveLength(2);
    const ancienne = liste.series.find((s) => s.id === serieId);
    expect(ancienne).toMatchObject({ au: "2026-11-01", remplaceePar: corps.nouvelleSerie });
  });

  it("« toute la série » change l'horaire partout", async () => {
    const { b, serieId } = await avecSerie();
    const reponse = await patch(b, serieId, "2026-10-19", 0, {
      portee: "serie",
      change: { start: "07:30", end: "09:30" },
    });
    expect(reponse.status).toBe(200);

    const liste = await b.h.app.request(
      `/admin/v1/series/${serieId}/occurrences?from=2026-10-19&to=2026-11-02`,
      { headers: auth(b.token) },
    );
    const corps = (await liste.json()) as { occurrences: { date: string; start: string }[] };
    const lundis = corps.occurrences.filter((o) => o.start === "07:30");
    expect(lundis.map((o) => o.date)).toEqual(["2026-10-19", "2026-10-26", "2026-11-02"]);
  });

  it("annule une occurrence, saute une journée, suspend puis reprend la série", async () => {
    const { b, serieId } = await avecSerie();

    await patch(b, serieId, "2026-10-22", 1, { portee: "occurrence", change: { cancelled: true } });
    await b.h.app.request(`/admin/v1/series/${serieId}/skip`, {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({ date: "2026-10-26", motif: "hospitalisation" }),
    });

    const apres = await b.h.app.request(
      `/admin/v1/series/${serieId}/occurrences?from=2026-10-19&to=2026-10-31`,
      { headers: auth(b.token) },
    );
    const corps = (await apres.json()) as { occurrences: { date: string }[]; visibles: number };
    expect(corps.occurrences.map((o) => o.date)).toEqual(["2026-10-19", "2026-10-29"]);

    const suspendue = await b.h.app.request(`/admin/v1/series/${serieId}/status`, {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({ statut: "suspendue" }),
    });
    expect(suspendue.status).toBe(200);
    const pendant = await b.h.app.request(
      `/admin/v1/series/${serieId}/occurrences?from=2026-10-19&to=2026-10-31`,
      { headers: auth(b.token) },
    );
    // L'agence voit ce qui dort ; `visibles` dit ce que la famille verrait, c'est-à-dire rien.
    expect(((await pendant.json()) as { visibles: number }).visibles).toBe(0);

    await b.h.app.request(`/admin/v1/series/${serieId}/status`, {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({ statut: "active" }),
    });
    const reprise = await b.h.app.request(
      `/admin/v1/series/${serieId}/occurrences?from=2026-10-19&to=2026-10-31`,
      { headers: auth(b.token) },
    );
    expect(((await reprise.json()) as { visibles: number }).visibles).toBe(2);
  });

  it("terminer une série demande sa date de fin", async () => {
    const { b, serieId } = await avecSerie();
    const sansDate = await b.h.app.request(`/admin/v1/series/${serieId}/status`, {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({ statut: "terminee" }),
    });
    expect(sansDate.status).toBe(400);

    const avecDate = await b.h.app.request(`/admin/v1/series/${serieId}/status`, {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({ statut: "terminee", date: "2026-10-25" }),
    });
    expect(avecDate.status).toBe(200);
  });

  it("journalise chaque modification de planning", async () => {
    const { b, serieId } = await avecSerie();
    await patch(b, serieId, "2026-10-26", 0, { portee: "occurrence", change: { cancelled: true } });
    const traces = b.h.db.tables.auditLogs.filter((ligne) => ligne.target?.startsWith("serie:"));
    expect(traces.length).toBeGreaterThanOrEqual(2);
    expect(traces.at(-1)).toMatchObject({
      module: "administration",
      actorRole: "responsable_agence",
    });
  });

  it("une série inconnue est introuvable, et un créneau inexistant aussi", async () => {
    const { b, serieId } = await avecSerie();
    expect((await patch(b, newId(), "2026-10-26", 0, { portee: "serie", change: {} })).status).toBe(
      404,
    );
    expect((await patch(b, serieId, "2026-10-26", 9, { portee: "serie", change: {} })).status).toBe(
      404,
    );
  });
});

describe("le planning d'ensemble", () => {
  it("rassemble les séries, compte les créneaux à pourvoir et signale ce que les règles disent", async () => {
    const b = await bureau();
    const fatima = await intervenant(b, "Fatima", "+33611111111");
    await poserRegles(b, { trajet_entre_visites: { valeur: 30, severite: "avertissement" } });

    const autre = household({ code: "FOY-0003", agencyId: b.agencyId });
    await b.h.db.repositories.households.insert(autre);
    await creerSerie(b, {
      from: "2026-10-19",
      slots: [creneau({ weekday: 1, start: "09:00", end: "10:00", workerId: fatima })],
    });
    await b.h.app.request("/admin/v1/series", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({
        householdId: autre._id,
        libelle: "Voisin",
        from: "2026-10-19",
        everyWeeks: 1,
        slots: [
          creneau({ weekday: 1, start: "10:10", end: "11:00", workerId: fatima }),
          creneau({ weekday: 2, start: "09:00", end: "11:00" }),
        ],
      }),
    });

    const reponse = await b.h.app.request(
      `/admin/v1/planning?agencyId=${b.agencyId}&from=2026-10-19&to=2026-10-25`,
      { headers: auth(b.token) },
    );
    const corps = (await reponse.json()) as {
      occurrences: { date: string; start: string }[];
      aPourvoir: number;
      signalements: { regle: string }[];
      aucuneRegleSaisie: boolean;
    };
    expect(corps.occurrences.map((o) => `${o.date} ${o.start}`)).toEqual([
      "2026-10-19 09:00",
      "2026-10-19 10:10",
      "2026-10-20 09:00",
    ]);
    expect(corps.aPourvoir).toBe(1);
    expect(corps.signalements.some((s) => s.regle === "trajet_entre_visites")).toBe(true);
    expect(corps.aucuneRegleSaisie).toBe(false);
  });

  it("dit franchement qu'aucune règle n'est saisie", async () => {
    const b = await bureau();
    const reponse = await b.h.app.request(
      `/admin/v1/planning?agencyId=${b.agencyId}&from=2026-10-19&to=2026-10-25`,
      { headers: auth(b.token) },
    );
    const corps = (await reponse.json()) as { aucuneRegleSaisie: boolean; signalements: unknown[] };
    expect(corps).toMatchObject({ aucuneRegleSaisie: true, signalements: [] });
  });
});

describe("les absences", () => {
  it("signalent une visite posée pendant un congé, si l'agence l'a demandé", async () => {
    const b = await bureau();
    const fatima = await intervenant(b, "Fatima", "+33611111111");
    await poserRegles(b, { absence_intervenant: {} });

    const absence = await b.h.app.request("/admin/v1/absences", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({
        workerId: fatima,
        kind: "conge",
        from: "2026-10-19T00:00:00Z",
        to: "2026-10-24T00:00:00Z",
        motif: "congés d'automne",
      }),
    });
    expect(absence.status).toBe(201);

    const { status, body } = await creerSerie(b, {
      from: "2026-10-19",
      slots: [creneau({ weekday: 1, start: "09:00", end: "11:00", workerId: fatima })],
    });
    expect(status).toBe(409);
    expect((body.bloquants as { regle: string }[])[0].regle).toBe("absence_intervenant");
  });

  it("refuse une absence sur un intervenant inconnu, et une fin avant le début", async () => {
    const b = await bureau();
    const fatima = await intervenant(b, "Fatima", "+33611111111");
    const inconnu = await b.h.app.request("/admin/v1/absences", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({
        workerId: newId(),
        kind: "conge",
        from: "2026-10-19T00:00:00Z",
        to: "2026-10-20T00:00:00Z",
      }),
    });
    expect(inconnu.status).toBe(404);

    const alEnvers = await b.h.app.request("/admin/v1/absences", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({
        workerId: fatima,
        kind: "conge",
        from: "2026-10-20T00:00:00Z",
        to: "2026-10-19T00:00:00Z",
      }),
    });
    expect(alEnvers.status).toBe(400);
  });
});

describe("les tarifs, créés par l'agence", () => {
  const prestation = (over: Record<string, unknown> = {}) => ({
    code: "aide-autonomie",
    libelle: "Aide à l'autonomie",
    mode: "prestataire",
    unite: "heure",
    prixTtcCentimes: 2800,
    creditImpotEligible: true,
    from: "2026-01-01",
    ...over,
  });

  it("n'en propose aucun au départ", async () => {
    const b = await bureau();
    const reponse = await b.h.app.request(`/admin/v1/prestations/${b.agencyId}`, {
      headers: auth(b.token),
    });
    const corps = (await reponse.json()) as {
      prestations: unknown[];
      creditImpotTaux: number | null;
      aucunTarifSaisi: boolean;
    };
    expect(corps).toMatchObject({ prestations: [], creditImpotTaux: null, aucunTarifSaisi: true });
  });

  it("enregistre une prestation et refuse deux prix applicables le même jour", async () => {
    const b = await bureau();
    const premier = await b.h.app.request("/admin/v1/prestations", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({ agencyId: b.agencyId, ...prestation() }),
    });
    expect(premier.status).toBe(201);

    const chevauche = await b.h.app.request("/admin/v1/prestations", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({ agencyId: b.agencyId, ...prestation({ prixTtcCentimes: 3000 }) }),
    });
    expect(chevauche.status).toBe(400);

    // Une version ouverte couvre l'avenir : pour changer un prix, on la ferme explicitement.
    const sansFermeture = await b.h.app.request("/admin/v1/prestations", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({
        agencyId: b.agencyId,
        ...prestation({ prixTtcCentimes: 3000, from: "2027-01-01" }),
      }),
    });
    expect(sansFermeture.status).toBe(400);

    const suite = await b.h.app.request("/admin/v1/prestations", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({
        agencyId: b.agencyId,
        ...prestation({ prixTtcCentimes: 3000, from: "2027-01-01", remplaceLaPrecedente: true }),
      }),
    });
    expect(suite.status).toBe(201);
    expect(((await suite.json()) as { versionsCloses: string[] }).versionsCloses).toHaveLength(1);

    // L'ancien prix reste applicable à son époque : une facture rééditée le retrouve.
    const liste = await b.h.app.request(`/admin/v1/prestations/${b.agencyId}`, {
      headers: auth(b.token),
    });
    const corps = (await liste.json()) as { prestations: { du: string; au: string | null }[] };
    expect(corps.prestations.map((p) => `${p.du}→${p.au ?? "…"}`).sort()).toEqual([
      "2026-01-01→2026-12-31",
      "2027-01-01→…",
    ]);
  });

  it("calcule un prix, et n'estime le crédit d'impôt qu'une fois le taux saisi", async () => {
    const b = await bureau();
    await b.h.app.request("/admin/v1/prestations", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({
        agencyId: b.agencyId,
        ...prestation({
          majorations: [
            {
              type: "nuit",
              libelle: "Nuit",
              mode: "pourcentage",
              valeur: 25,
              fenetre: { debut: "21:00", fin: "07:00" },
            },
          ],
        }),
      }),
    });

    const visite = {
      startDate: "2026-10-19",
      start: "19:00",
      endDate: "2026-10-19",
      end: "23:00",
    };
    const sansTaux = await b.h.app.request("/admin/v1/price-preview", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({ agencyId: b.agencyId, code: "aide-autonomie", visite }),
    });
    const avant = (await sansTaux.json()) as {
      principal: { totalTtcCentimes: number; lignes: unknown[] };
      secondaire: unknown;
    };
    expect(avant.principal.totalTtcCentimes).toBe(12600);
    expect(avant.principal.lignes).toHaveLength(2);
    expect(avant.secondaire).toBeNull();

    await b.h.app.request(`/admin/v1/tariff-settings/${b.agencyId}`, {
      method: "PUT",
      headers: json(b.token),
      body: JSON.stringify({ creditImpotTaux: 0.5 }),
    });

    const apres = await b.h.app.request("/admin/v1/price-preview", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({ agencyId: b.agencyId, code: "aide-autonomie", visite }),
    });
    const corps = (await apres.json()) as {
      secondaire: { creditImpotCentimes: number; estimation: boolean } | null;
    };
    expect(corps.secondaire).toEqual({
      creditImpotCentimes: 6300,
      apresCreditCentimes: 6300,
      estimation: true,
    });
  });

  it("une prestation inconnue à cette date est introuvable", async () => {
    const b = await bureau();
    await b.h.app.request("/admin/v1/prestations", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({ agencyId: b.agencyId, ...prestation({ from: "2027-01-01" }) }),
    });
    const reponse = await b.h.app.request("/admin/v1/price-preview", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({
        agencyId: b.agencyId,
        code: "aide-autonomie",
        visite: { startDate: "2026-10-19", start: "09:00", endDate: "2026-10-19", end: "11:00" },
      }),
    });
    expect(reponse.status).toBe(404);
  });
});

describe("la surface reste fermée aux familles", () => {
  it("un proche référent n'atteint ni le planning ni les tarifs", async () => {
    const b = await bureau();
    const claire = await membre(b.h, { email: "claire@exemple.fr" });
    await b.h.db.repositories.memberships.insert(
      membership({ memberId: claire, householdId: b.foyer._id, role: "proche_referent" }),
    );
    const token = await b.h.connecter(claire);

    for (const chemin of [
      `/admin/v1/rules/${b.agencyId}`,
      `/admin/v1/planning?agencyId=${b.agencyId}&from=2026-10-19&to=2026-10-25`,
      `/admin/v1/prestations/${b.agencyId}`,
    ]) {
      expect((await b.h.app.request(chemin, { headers: auth(token) })).status).toBe(404);
    }
  });
});
