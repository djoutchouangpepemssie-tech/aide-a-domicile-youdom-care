/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { newId } from "../domaine/ids";
import { emptyRules, type Rule, type RuleKey } from "../domaine/regles";
import { household, membership } from "../test/fixtures";
import { auth, harnais, membre, rattacher, type Harness } from "../test/harnais";

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

describe("l'optimisation : elle propose, elle n'impose pas", () => {
  async function avecCreneauxVides() {
    const b = await bureau();
    const fatima = await intervenant(b, "Fatima", "+33611111111");
    const awa = await intervenant(b, "Awa", "+33622222222");
    const { body } = await creerSerie(b, {
      from: "2026-10-19",
      slots: [
        creneau({ weekday: 1, start: "09:00", end: "11:00" }),
        creneau({ weekday: 1, start: "09:00", end: "11:00" }),
      ],
    });
    return { b, serieId: body.id as string, fatima, awa };
  }

  it("propose des candidats pour chaque créneau à pourvoir, avec les raisons", async () => {
    const { b, fatima, awa } = await avecCreneauxVides();
    const reponse = await b.h.app.request(
      `/admin/v1/planning/suggestions?agencyId=${b.agencyId}&from=2026-10-19&to=2026-10-25`,
      { headers: auth(b.token) },
    );
    expect(reponse.status).toBe(200);
    const corps = (await reponse.json()) as {
      total: number;
      creneaux: { suggestions: { workerId: string; raisons: string[] }[]; exclus: unknown[] }[];
    };
    expect(corps.total).toBe(2);
    const premiers = corps.creneaux[0].suggestions.map((s) => s.workerId);
    expect(premiers.sort()).toEqual([awa, fatima].sort());
    expect(corps.creneaux[0].suggestions[0].raisons.length).toBeGreaterThan(0);
  });

  it("respecte un refus du foyer, sans en dire la raison", async () => {
    const { b, awa } = await avecCreneauxVides();
    const enregistre = await b.h.app.request("/admin/v1/worker-preferences", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({
        householdId: b.foyer._id,
        workerId: awa,
        kind: "refus",
        motif: "raison interne au foyer",
      }),
    });
    expect(enregistre.status).toBe(201);

    const reponse = await b.h.app.request(
      `/admin/v1/planning/suggestions?agencyId=${b.agencyId}&from=2026-10-19&to=2026-10-25`,
      { headers: auth(b.token) },
    );
    const texte = await reponse.text();
    expect(texte).not.toContain("raison interne au foyer");
    const corps = JSON.parse(texte) as {
      creneaux: {
        suggestions: { workerId: string }[];
        exclus: { workerId: string; raison: string }[];
      }[];
    };
    expect(corps.creneaux[0].suggestions.map((s) => s.workerId)).not.toContain(awa);
    expect(corps.creneaux[0].exclus).toEqual([
      { workerId: awa, raison: "le foyer ne souhaite pas cet intervenant" },
    ]);
  });

  it("ne modifie rien sans qu'on le demande", async () => {
    const { b, serieId } = await avecCreneauxVides();
    const reponse = await b.h.app.request("/admin/v1/planning/optimisation", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({ agencyId: b.agencyId, from: "2026-10-19", to: "2026-10-25" }),
    });
    const corps = (await reponse.json()) as { appliquees: number; propositions: unknown[] };
    expect(corps.appliquees).toBe(0);
    expect(corps.propositions).toHaveLength(2);

    // Les créneaux sont toujours à pourvoir : rien n'a été écrit.
    const liste = await b.h.app.request(
      `/admin/v1/series/${serieId}/occurrences?from=2026-10-19&to=2026-10-19`,
      { headers: auth(b.token) },
    );
    const occurrences = ((await liste.json()) as { occurrences: { workerId: string | null }[] })
      .occurrences;
    expect(occurrences.every((o) => o.workerId === null)).toBe(true);
  });

  it("applique quand on le demande, journalise, et n'a plus rien à proposer ensuite", async () => {
    const { b, serieId } = await avecCreneauxVides();
    await poserRegles(b, { chevauchement: {} });

    const appliquee = await b.h.app.request("/admin/v1/planning/optimisation", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({
        agencyId: b.agencyId,
        from: "2026-10-19",
        to: "2026-10-25",
        appliquer: true,
      }),
    });
    const corps = (await appliquee.json()) as { appliquees: number; refusees: unknown[] };
    expect(corps.appliquees).toBe(2);
    expect(corps.refusees).toEqual([]);

    const liste = await b.h.app.request(
      `/admin/v1/series/${serieId}/occurrences?from=2026-10-19&to=2026-10-19`,
      { headers: auth(b.token) },
    );
    const occurrences = (
      (await liste.json()) as {
        occurrences: { workerId: string | null; origine: string; motif: string | null }[];
      }
    ).occurrences;
    expect(occurrences.every((o) => o.workerId !== null)).toBe(true);
    // Deux créneaux au même moment : deux intervenants différents, la règle de chevauchement tient.
    expect(new Set(occurrences.map((o) => o.workerId)).size).toBe(2);
    expect(occurrences[0].motif).toContain("optimisation");

    // La trace existe, et l'application est idempotente : plus rien à proposer.
    expect(
      b.h.db.tables.auditLogs.filter((ligne) => ligne.target?.startsWith("optimisation:")),
    ).toHaveLength(2);

    const seconde = await b.h.app.request("/admin/v1/planning/optimisation", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({ agencyId: b.agencyId, from: "2026-10-19", to: "2026-10-25" }),
    });
    expect(((await seconde.json()) as { propositions: unknown[] }).propositions).toEqual([]);
  });

  it("dit quels créneaux n'ont aucune solution", async () => {
    const b = await bureau();
    const fatima = await intervenant(b, "Fatima", "+33611111111");
    await b.h.app.request("/admin/v1/absences", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({
        workerId: fatima,
        kind: "maladie",
        from: "2026-10-19T00:00:00Z",
        to: "2026-10-26T00:00:00Z",
      }),
    });
    await creerSerie(b, {
      from: "2026-10-19",
      slots: [creneau({ weekday: 1, start: "09:00", end: "11:00" })],
    });

    const reponse = await b.h.app.request("/admin/v1/planning/optimisation", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({ agencyId: b.agencyId, from: "2026-10-19", to: "2026-10-25" }),
    });
    const corps = (await reponse.json()) as {
      propositions: unknown[];
      sansSolution: { exclus: { raison: string }[] }[];
    };
    expect(corps.propositions).toEqual([]);
    expect(corps.sansSolution).toHaveLength(1);
    expect(corps.sansSolution[0].exclus[0].raison).toContain("absence déclarée");
  });

  it("reste fermée aux familles", async () => {
    const b = await bureau();
    const claire = await membre(b.h, { email: "claire@exemple.fr" });
    await b.h.db.repositories.memberships.insert(
      membership({ memberId: claire, householdId: b.foyer._id, role: "beneficiaire" }),
    );
    const token = await b.h.connecter(claire);
    const reponse = await b.h.app.request("/admin/v1/planning/optimisation", {
      method: "POST",
      headers: { ...auth(token), "content-type": "application/json" },
      body: JSON.stringify({ agencyId: b.agencyId, from: "2026-10-19", to: "2026-10-25" }),
    });
    expect(reponse.status).toBe(404);
  });
});

describe("la matérialisation : du planning à la visite pointable", () => {
  async function planningPose() {
    const b = await bureau();
    const fatima = await intervenant(b, "Fatima", "+33611111111");
    const { body } = await creerSerie(b, {
      from: "2026-10-19",
      slots: [creneau({ weekday: 1, start: "09:00", end: "11:00", workerId: fatima })],
    });
    return { b, serieId: body.id as string, fatima };
  }

  const materialiser = (b: Bureau, from = "2026-10-19", to = "2026-10-25") =>
    b.h.app.request("/admin/v1/planning/materialisation", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({ agencyId: b.agencyId, from, to }),
    });

  it("crée une visite par occurrence, et ne la recrée jamais", async () => {
    const { b } = await planningPose();
    const premiere = await materialiser(b);
    expect(premiere.status).toBe(200);
    expect((await premiere.json()) as Record<string, unknown>).toMatchObject({
      creees: 1,
      misesAJour: 0,
      annulees: 0,
    });
    expect(b.h.db.tables.visits).toHaveLength(1);

    const seconde = await materialiser(b);
    expect((await seconde.json()) as Record<string, unknown>).toMatchObject({ creees: 0 });
    expect(b.h.db.tables.visits).toHaveLength(1);
  });

  it("ne matérialise pas un créneau sans intervenant : il n'y a personne à pointer", async () => {
    const b = await bureau();
    await creerSerie(b, {
      from: "2026-10-19",
      slots: [creneau({ weekday: 1, start: "09:00", end: "11:00" })],
    });
    const reponse = await materialiser(b);
    expect((await reponse.json()) as Record<string, unknown>).toMatchObject({
      creees: 0,
      creneauxSansIntervenant: 1,
    });
    expect(b.h.db.tables.visits).toEqual([]);
  });

  it("l'intervenant voit la visite et peut la pointer", async () => {
    const { b, fatima } = await planningPose();
    await materialiser(b);
    const token = await b.h.connecter(fatima);

    const tournee = await b.h.app.request("/field/v1/visits/today", { headers: auth(token) });
    const corps = (await tournee.json()) as { visites: { id: string; debut: string }[] };
    expect(corps.visites).toHaveLength(1);

    const pointage = await b.h.app.request(`/field/v1/visits/${corps.visites[0].id}/punch`, {
      method: "POST",
      headers: { ...auth(token), "content-type": "application/json" },
      body: JSON.stringify({ type: "arrivee", source: "nfc" }),
    });
    expect(pointage.status).toBe(201);
    expect(b.h.db.tables.visitEvents).toHaveLength(1);
  });

  it("suit le planning tant que la visite n'a pas commencé", async () => {
    const { b, serieId } = await planningPose();
    await materialiser(b);

    await b.h.app.request(`/admin/v1/series/${serieId}/occurrences/2026-10-19/0`, {
      method: "PATCH",
      headers: json(b.token),
      body: JSON.stringify({ portee: "occurrence", change: { start: "10:00", end: "12:00" } }),
    });
    const reponse = await materialiser(b);
    const corps = (await reponse.json()) as { misesAJour: number; divergences: unknown[] };
    expect(corps).toMatchObject({ misesAJour: 1, divergences: [] });
    expect(b.h.db.tables.visits[0].plannedStart.toISOString()).toBe("2026-10-19T08:00:00.000Z");
  });

  it("ne réécrit pas une visite commencée : il signale la divergence", async () => {
    const { b, serieId, fatima } = await planningPose();
    await materialiser(b);

    // L'intervenante est arrivée : la visite n'est plus une prévision.
    const visite = b.h.db.tables.visits[0];
    await b.h.db.repositories.visits.save({ ...visite, status: "en_cours" });
    expect(fatima).toBe(visite.workerId);

    await b.h.app.request(`/admin/v1/series/${serieId}/occurrences/2026-10-19/0`, {
      method: "PATCH",
      headers: json(b.token),
      body: JSON.stringify({ portee: "occurrence", change: { start: "14:00", end: "16:00" } }),
    });
    const reponse = await materialiser(b);
    const corps = (await reponse.json()) as {
      misesAJour: number;
      divergences: { visitId: string; changements: string[]; statut: string }[];
    };
    expect(corps.misesAJour).toBe(0);
    expect(corps.divergences).toHaveLength(1);
    expect(corps.divergences[0]).toMatchObject({ visitId: visite._id, statut: "en_cours" });
    // Les heures réellement prévues au moment de l'arrivée sont intactes.
    expect(b.h.db.tables.visits[0].plannedStart.toISOString()).toBe("2026-10-19T07:00:00.000Z");
  });

  it("annule la visite quand l'occurrence disparaît, et signale celle qui a déjà eu lieu", async () => {
    const { b, serieId } = await planningPose();
    await materialiser(b);

    await b.h.app.request(`/admin/v1/series/${serieId}/skip`, {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({ date: "2026-10-19", motif: "hospitalisation" }),
    });
    const annulation = await materialiser(b);
    expect((await annulation.json()) as Record<string, unknown>).toMatchObject({ annulees: 1 });
    expect(b.h.db.tables.visits[0].status).toBe("annulee");

    // Une visite déjà faite ne s'annule pas rétroactivement : elle est signalée.
    await b.h.db.repositories.visits.save({ ...b.h.db.tables.visits[0], status: "faite" });
    const apres = await materialiser(b);
    const corps = (await apres.json()) as {
      annulees: number;
      divergences: { changements: string[] }[];
    };
    expect(corps.annulees).toBe(0);
    expect(corps.divergences[0].changements).toEqual(["occurrence supprimée"]);
  });

  it("journalise la matérialisation", async () => {
    const { b } = await planningPose();
    await materialiser(b);
    const trace = b.h.db.tables.auditLogs.find((ligne) =>
      ligne.target?.startsWith("materialisation:"),
    );
    expect(trace?.target).toBe("materialisation:2026-10-19..2026-10-25:+1");
  });
});

describe("affecter ouvre les droits de la mission, et seulement eux", () => {
  it("rattache l'intervenant au foyer et borne ses droits dans le temps", async () => {
    const b = await bureau();
    const fatima = await intervenant(b, "Fatima", "+33611111111");
    await creerSerie(b, {
      from: "2026-10-19",
      slots: [creneau({ weekday: 1, start: "09:00", end: "11:00", workerId: fatima })],
    });

    // Avant matérialisation : aucun rattachement, aucun droit.
    expect(await b.h.db.repositories.memberships.find(fatima, b.foyer._id)).toBeNull();

    await b.h.app.request("/admin/v1/planning/materialisation", {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify({ agencyId: b.agencyId, from: "2026-10-19", to: "2026-10-25" }),
    });

    const rattachement = await b.h.db.repositories.memberships.find(fatima, b.foyer._id);
    expect(rattachement).toMatchObject({ role: "intervenant", status: "actif" });

    const droits = await b.h.db.repositories.grants.listFor(fatima, b.foyer._id);
    const modules = droits.map((droit) => droit.module).sort();
    // Ceux de la colonne « intervenant » de la matrice, pas un de plus.
    expect(modules).toEqual([
      "acces_logement",
      "comptes_rendus",
      "fiche_de_vie",
      "planning",
      "presence",
    ]);
    expect(modules).not.toContain("finances");
    // Bornés : un intervenant qui cesse de venir perd l'accès de lui-même.
    expect(droits.every((droit) => droit.endsAt !== null && droit.endsAt !== undefined)).toBe(true);
  });

  it("repousse les droits à la matérialisation suivante au lieu de les empiler", async () => {
    const b = await bureau();
    const fatima = await intervenant(b, "Fatima", "+33611111111");
    await creerSerie(b, {
      from: "2026-10-19",
      slots: [creneau({ weekday: 1, start: "09:00", end: "11:00", workerId: fatima })],
    });
    const materialiser = (to: string) =>
      b.h.app.request("/admin/v1/planning/materialisation", {
        method: "POST",
        headers: json(b.token),
        body: JSON.stringify({ agencyId: b.agencyId, from: "2026-10-19", to }),
      });

    await materialiser("2026-10-25");
    const premiers = await b.h.db.repositories.grants.listFor(fatima, b.foyer._id);
    const premiereFin = premiers[0].endsAt?.getTime() ?? 0;

    await materialiser("2026-11-15");
    const seconds = await b.h.db.repositories.grants.listFor(fatima, b.foyer._id);
    expect(seconds).toHaveLength(premiers.length);
    expect(seconds[0].endsAt?.getTime() ?? 0).toBeGreaterThan(premiereFin);
  });
});

describe("la portée par agence", () => {
  it("un compte de l'agence A ne touche pas l'agence B, même en la nommant", async () => {
    const a = await bureau();
    const fatima = await intervenant(a, "Fatima", "+33611111111");
    const { body } = await creerSerie(a, {
      from: "2026-10-19",
      slots: [creneau({ weekday: 1, start: "09:00", end: "11:00", workerId: fatima })],
    });
    const serieDeA = body.id as string;

    // Une seconde agence, dans la même base, avec son propre responsable.
    const autreAgence = newId();
    const siegeB = household({ code: "AGENCE-02", agencyId: autreAgence });
    await a.h.db.repositories.households.insert(siegeB);
    const responsableB = await membre(a.h, { email: "b@exemple.fr", nom: "Responsable B" });
    await a.h.db.repositories.memberships.insert(
      membership({ memberId: responsableB, householdId: siegeB._id, role: "responsable_agence" }),
    );
    const tokenB = await a.h.connecter(responsableB);

    // Lectures et réglages de l'agence A : introuvables pour B.
    for (const chemin of [
      `/admin/v1/rules/${a.agencyId}`,
      `/admin/v1/planning?agencyId=${a.agencyId}&from=2026-10-19&to=2026-10-25`,
      `/admin/v1/planning/suggestions?agencyId=${a.agencyId}&from=2026-10-19&to=2026-10-25`,
      `/admin/v1/prestations/${a.agencyId}`,
      `/admin/v1/series/${serieDeA}/occurrences?from=2026-10-19&to=2026-10-25`,
      `/admin/v1/households/${a.foyer._id}/series`,
    ]) {
      expect((await a.h.app.request(chemin, { headers: auth(tokenB) })).status).toBe(404);
    }

    // Écritures : idem, et rien n'est modifié.
    const patch = await a.h.app.request(`/admin/v1/series/${serieDeA}/occurrences/2026-10-19/0`, {
      method: "PATCH",
      headers: json(tokenB),
      body: JSON.stringify({ portee: "occurrence", change: { cancelled: true } }),
    });
    expect(patch.status).toBe(404);

    const serieChezA = await a.h.app.request("/admin/v1/series", {
      method: "POST",
      headers: json(tokenB),
      body: JSON.stringify({
        householdId: a.foyer._id,
        libelle: "Tentative",
        from: "2026-10-19",
        everyWeeks: 1,
        slots: [creneau({ weekday: 2, start: "09:00", end: "11:00" })],
      }),
    });
    expect(serieChezA.status).toBe(404);

    const absenceChezA = await a.h.app.request("/admin/v1/absences", {
      method: "POST",
      headers: json(tokenB),
      body: JSON.stringify({
        workerId: fatima,
        kind: "conge",
        from: "2026-10-19T00:00:00Z",
        to: "2026-10-20T00:00:00Z",
      }),
    });
    expect(absenceChezA.status).toBe(404);

    const materialisation = await a.h.app.request("/admin/v1/planning/materialisation", {
      method: "POST",
      headers: json(tokenB),
      body: JSON.stringify({ agencyId: a.agencyId, from: "2026-10-19", to: "2026-10-25" }),
    });
    expect(materialisation.status).toBe(404);

    expect(a.h.db.tables.series[0].overrides).toEqual([]);
    expect(a.h.db.tables.series).toHaveLength(1);
    expect(a.h.db.tables.absences).toEqual([]);
    expect(a.h.db.tables.visits).toEqual([]);
  });

  it("et il agit normalement sur la sienne", async () => {
    const b = await bureau();
    const reponse = await b.h.app.request(`/admin/v1/rules/${b.agencyId}`, {
      headers: auth(b.token),
    });
    expect(reponse.status).toBe(200);
  });

  it("un responsable de deux agences couvre les deux", async () => {
    const a = await bureau();
    const autreAgence = newId();
    const siegeB = household({ code: "AGENCE-02", agencyId: autreAgence });
    await a.h.db.repositories.households.insert(siegeB);

    // Le même membre, rattaché aux deux sièges.
    const responsable = a.h.db.tables.memberships[0].memberId;
    await a.h.db.repositories.memberships.insert(
      membership({ memberId: responsable, householdId: siegeB._id, role: "responsable_agence" }),
    );

    for (const agence of [a.agencyId, autreAgence]) {
      const reponse = await a.h.app.request(`/admin/v1/rules/${agence}`, {
        headers: auth(a.token),
      });
      expect(reponse.status).toBe(200);
    }
  });
});

describe("ajuster une visite divergente", () => {
  async function divergence() {
    const b = await bureau();
    const fatima = await intervenant(b, "Fatima", "+33611111111");
    const { body } = await creerSerie(b, {
      from: "2026-10-19",
      slots: [creneau({ weekday: 1, start: "09:00", end: "11:00", workerId: fatima })],
    });
    const serieId = body.id as string;
    const materialiser = () =>
      b.h.app.request("/admin/v1/planning/materialisation", {
        method: "POST",
        headers: json(b.token),
        body: JSON.stringify({ agencyId: b.agencyId, from: "2026-10-19", to: "2026-10-25" }),
      });
    await materialiser();

    // L'intervenante est arrivée, puis le planning change : la visite ne le suit plus.
    const visite = b.h.db.tables.visits[0];
    await b.h.db.repositories.visits.save({ ...visite, status: "en_cours" });
    await b.h.app.request(`/admin/v1/series/${serieId}/occurrences/2026-10-19/0`, {
      method: "PATCH",
      headers: json(b.token),
      body: JSON.stringify({ portee: "occurrence", change: { start: "10:00", end: "12:00" } }),
    });
    return { b, serieId, visitId: visite._id, materialiser };
  }

  const ajuster = (b: Bureau, visitId: string, corps: unknown) =>
    b.h.app.request(`/admin/v1/visits/${visitId}/ajustement`, {
      method: "POST",
      headers: json(b.token),
      body: JSON.stringify(corps),
    });

  it("aligne la visite sur le planning, avec motif", async () => {
    const { b, visitId, materialiser } = await divergence();
    const reponse = await ajuster(b, visitId, {
      decision: "aligner",
      motif: "la famille a décalé, la visite a bien eu lieu à 10 h",
    });
    expect(reponse.status).toBe(200);

    const visite = b.h.db.tables.visits[0];
    expect(visite.plannedStart.toISOString()).toBe("2026-10-19T08:00:00.000Z");
    expect(visite.adjustment).toMatchObject({ decision: "aligner" });
    // La divergence ne se repose plus à la matérialisation suivante.
    const apres = await materialiser();
    expect(((await apres.json()) as { divergences: unknown[] }).divergences).toEqual([]);
  });

  it("conserve ce qui a eu lieu, sans toucher aux heures", async () => {
    const { b, visitId, materialiser } = await divergence();
    const avant = b.h.db.tables.visits[0].plannedStart.toISOString();
    const reponse = await ajuster(b, visitId, {
      decision: "conserver",
      motif: "l'intervenante était déjà sur place à 9 h",
    });
    expect(reponse.status).toBe(200);
    expect(b.h.db.tables.visits[0].plannedStart.toISOString()).toBe(avant);
    const apres = await materialiser();
    expect(((await apres.json()) as { divergences: unknown[] }).divergences).toEqual([]);
  });

  it("repose la question si le planning rebouge après la décision", async () => {
    const { b, serieId, visitId, materialiser } = await divergence();
    await ajuster(b, visitId, { decision: "conserver", motif: "décision du coordinateur" });

    await b.h.app.request(`/admin/v1/series/${serieId}/occurrences/2026-10-19/0`, {
      method: "PATCH",
      headers: json(b.token),
      body: JSON.stringify({ portee: "occurrence", change: { start: "14:00", end: "16:00" } }),
    });
    const apres = await materialiser();
    const corps = (await apres.json()) as { divergences: { visitId: string }[] };
    expect(corps.divergences).toHaveLength(1);
    expect(corps.divergences[0].visitId).toBe(visitId);
  });

  it("exige un motif, et refuse une visite hors planning", async () => {
    const { b, visitId } = await divergence();
    expect((await ajuster(b, visitId, { decision: "aligner" })).status).toBe(400);
    expect((await ajuster(b, visitId, { decision: "aligner", motif: "ok" })).status).toBe(400);

    // Une visite ponctuelle ne diverge de rien.
    const ponctuelle = {
      ...b.h.db.tables.visits[0],
      _id: newId(),
      serieId: null,
      occurrenceDate: null,
      slotIndex: null,
      adjustment: null,
    };
    await b.h.db.repositories.visits.insert(ponctuelle);
    expect((await ajuster(b, ponctuelle._id, { decision: "aligner", motif: "essai" })).status).toBe(
      400,
    );
  });

  it("journalise la décision avec son auteur", async () => {
    const { b, visitId } = await divergence();
    await ajuster(b, visitId, { decision: "conserver", motif: "heures réellement faites" });
    const trace = b.h.db.tables.auditLogs.find((ligne) => ligne.target?.startsWith("ajustement:"));
    expect(trace).toMatchObject({ module: "administration", actorRole: "responsable_agence" });
  });

  it("reste fermée à une autre agence", async () => {
    const { b, visitId } = await divergence();
    const autreAgence = newId();
    const siege = household({ code: "AGENCE-09", agencyId: autreAgence });
    await b.h.db.repositories.households.insert(siege);
    const autre = await membre(b.h, { email: "autre@exemple.fr" });
    await b.h.db.repositories.memberships.insert(
      membership({ memberId: autre, householdId: siege._id, role: "responsable_agence" }),
    );
    const token = await b.h.connecter(autre);
    const reponse = await b.h.app.request(`/admin/v1/visits/${visitId}/ajustement`, {
      method: "POST",
      headers: { ...auth(token), "content-type": "application/json" },
      body: JSON.stringify({ decision: "aligner", motif: "tentative" }),
    });
    expect(reponse.status).toBe(404);
  });
});

describe("qui suis-je", () => {
  it("dit le nom, le rôle et les agences couvertes", async () => {
    const b = await bureau();
    const reponse = await b.h.app.request("/admin/v1/me", { headers: auth(b.token) });
    expect(reponse.status).toBe(200);
    const corps = (await reponse.json()) as {
      membre: { nom: string };
      role: string;
      agences: { agencyId: string; foyers: string[] }[];
    };
    expect(corps.membre.nom).toBe("Arcel");
    expect(corps.role).toBe("responsable_agence");
    expect(corps.agences).toEqual([{ agencyId: b.agencyId, foyers: ["AGENCE-01"] }]);
  });

  it("n'est pas atteignable par une famille", async () => {
    const b = await bureau();
    const claire = await membre(b.h, { email: "claire@exemple.fr" });
    await b.h.db.repositories.memberships.insert(
      membership({ memberId: claire, householdId: b.foyer._id, role: "beneficiaire" }),
    );
    const token = await b.h.connecter(claire);
    expect((await b.h.app.request("/admin/v1/me", { headers: auth(token) })).status).toBe(404);
  });
});

describe("la liste des intervenants", () => {
  it("rend prénom et initiale, triés, sans nom complet ni photo sans accord", async () => {
    const b = await bureau();
    await intervenant(b, "Zoé", "+33611111111");
    await intervenant(b, "Awa", "+33622222222");
    const reponse = await b.h.app.request(`/admin/v1/workers?agencyId=${b.agencyId}`, {
      headers: auth(b.token),
    });
    expect(reponse.status).toBe(200);
    const corps = (await reponse.json()) as {
      intervenants: { prenom: string; initiale: string; photo: string | null }[];
    };
    expect(corps.intervenants.map((i) => i.prenom)).toEqual(["Awa", "Zoé"]);
    expect(corps.intervenants.every((i) => i.photo === null)).toBe(true);
    expect(JSON.stringify(corps)).not.toContain("lastName");
  });

  it("ne rend pas les intervenants d'une autre agence", async () => {
    const b = await bureau();
    const reponse = await b.h.app.request(`/admin/v1/workers?agencyId=${newId()}`, {
      headers: auth(b.token),
    });
    expect(reponse.status).toBe(404);
  });
});

describe("l'écran d'un foyer", () => {
  it("liste les foyers de l'agence et distingue le siège d'un foyer accompagné", async () => {
    const b = await bureau();
    const reponse = await b.h.app.request(`/admin/v1/households?agencyId=${b.agencyId}`, {
      headers: auth(b.token),
    });
    expect(reponse.status).toBe(200);
    const corps = (await reponse.json()) as {
      foyers: { code: string; technique: boolean; ville: string; mode: string }[];
    };
    expect(corps.foyers.map((f) => f.code)).toEqual(["AGENCE-01", "FOY-0001"]);
    // Le foyer technique de l'agence n'est pas un foyer accompagné : l'écran doit pouvoir l'écarter.
    expect(corps.foyers.find((f) => f.code === "AGENCE-01")?.technique).toBe(true);
    expect(corps.foyers.find((f) => f.code === "FOY-0001")?.technique).toBe(false);
  });

  it("rend les membres avec leurs droits effectifs, pas leur rôle seul", async () => {
    const b = await bureau();
    const fille = await membre(b.h, { nom: "Nadia", email: "nadia@exemple.fr" });
    await rattacher(b.h, { memberId: fille, householdId: b.foyer._id, role: "proche_referent" });

    const reponse = await b.h.app.request(`/admin/v1/households/${b.foyer._id}`, {
      headers: auth(b.token),
    });
    expect(reponse.status).toBe(200);
    const corps = (await reponse.json()) as {
      foyer: { code: string; mode: string; adresse: { ville: string } };
      membres: { nom: string; role: string; droits: { module: string }[] }[];
    };
    expect(corps.foyer.code).toBe("FOY-0001");
    const nadia = corps.membres.find((m) => m.nom === "Nadia");
    expect(nadia?.role).toBe("proche_referent");
    expect(nadia?.droits.length).toBeGreaterThan(0);
  });

  it("ne montre pas un droit révoqué : c'est le droit qui ouvre, pas le rôle", async () => {
    const b = await bureau();
    const fille = await membre(b.h, { nom: "Nadia", email: "nadia@exemple.fr" });
    await rattacher(b.h, { memberId: fille, householdId: b.foyer._id, role: "proche_referent" });
    const droits = await b.h.db.repositories.grants.listFor(fille, b.foyer._id);
    const retire = droits[0];
    if (!retire) throw new Error("le rôle devrait poser au moins un droit par défaut");
    await b.h.db.repositories.grants.revoke(retire._id, b.h.now);

    const corps = (await (
      await b.h.app.request(`/admin/v1/households/${b.foyer._id}`, { headers: auth(b.token) })
    ).json()) as { membres: { nom: string; droits: { id: string }[] }[] };
    const nadia = corps.membres.find((m) => m.nom === "Nadia");
    expect(nadia?.droits.map((d) => d.id)).not.toContain(retire._id);
    expect(nadia?.droits).toHaveLength(droits.length - 1);
  });

  it("ne rend pas un foyer d'une autre agence", async () => {
    const b = await bureau();
    const ailleurs = household({ code: "AUT-0001", agencyId: newId() });
    await b.h.db.repositories.households.insert(ailleurs);
    const reponse = await b.h.app.request(`/admin/v1/households/${ailleurs._id}`, {
      headers: auth(b.token),
    });
    expect(reponse.status).toBe(404);
  });
});
