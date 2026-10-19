import * as z from "zod";
import { holidayName, isSunday } from "../temps/jours-feries";
import { isDate, isTime, minutesOf, parisParts, parisToInstant } from "../temps/paris";
import { idSchema, type visitKinds } from "./schemas";

/*
 * Les tarifs — **ceux de Youdom Care, saisis par Youdom Care.** Décision du 19/10 : « pour les
 * grilles tarifaires pas besoin, nous devons créer et mettre nous-même nos tarifs ».
 *
 * Rien n'est donc écrit en dur : ni un prix, ni un taux de majoration, ni même le taux du crédit
 * d'impôt. Ce fichier sait **calculer**, pas combien.
 *
 * Quatre décisions de conception, et chacune évite une erreur qui coûte de l'argent :
 *
 * 1. **Tout en centimes, en nombres entiers.** Un prix en virgule flottante finit par donner
 *    19,999999 € sur une facture. Les arrondis se font une fois, à la fin, à l'euro-centime.
 * 2. **Les prestations sont versionnées par date d'application.** Une facture rééditée six mois
 *    plus tard doit retrouver le prix du jour de la visite, pas celui d'aujourd'hui.
 * 3. **Les majorations se calculent à la minute réelle.** Une garde du samedi 21 h au dimanche
 *    7 h compte des minutes de nuit **et** des minutes de dimanche ; et la nuit du changement
 *    d'heure en compte une de moins. Les frontières sont calculées en instants, pas en heures.
 * 4. **Le prix TTC avant avantage fiscal est l'information principale** (règle permanente du
 *    projet). Le crédit d'impôt est renvoyé à part, comme une estimation, et seulement si
 *    l'agence a saisi son taux. Sans taux saisi : aucune estimation, aucun chiffre inventé.
 */

const dateSchema = z.string().refine(isDate, { error: "date AAAA-MM-JJ" });
const timeSchema = z.string().refine(isTime, { error: "heure HH:MM" });

export const majorationKinds = ["nuit", "dimanche", "ferie", "personnalisee"] as const;
export const majorationModes = ["pourcentage", "montant_horaire", "forfait"] as const;

export const majorationSchema = z
  .strictObject({
    type: z.enum(majorationKinds),
    libelle: z.string().min(1).max(60),
    mode: z.enum(majorationModes),
    /** Pour cent (`pourcentage`) ou centimes (`montant_horaire`, `forfait`). */
    valeur: z.number().int().positive(),
    /** Fenêtre de nuit, **saisie par l'agence** : aucune heure n'est supposée. */
    fenetre: z.strictObject({ debut: timeSchema, fin: timeSchema }).nullish(),
  })
  .refine((majoration) => majoration.type !== "nuit" || Boolean(majoration.fenetre), {
    error: "une majoration de nuit a besoin de sa fenêtre horaire",
    path: ["fenetre"],
  });

export type Majoration = z.infer<typeof majorationSchema>;

export const unites = ["heure", "forfait", "nuit"] as const;
export const interventionModes = ["prestataire", "mandataire"] as const;

export const prestationSchema = z
  .strictObject({
    _id: idSchema,
    agencyId: idSchema,
    code: z.string().regex(/^[a-z0-9-]{2,40}$/),
    libelle: z.string().min(1).max(120),
    /** Prestataire ou mandataire : obligatoire, et affiché pour chaque prestation (docs/07). */
    mode: z.enum(interventionModes),
    unite: z.enum(unites),
    /** Prix TTC, en centimes. C'est l'information principale. */
    prixTtcCentimes: z.number().int().positive(),
    /** Prix HT et TVA, quand l'agence les saisit : obligation d'information du consommateur. */
    prixHtCentimes: z.number().int().positive().nullish(),
    tvaTaux: z.number().min(0).max(1).nullish(),
    /** Éligible au crédit d'impôt — c'est l'agence qui le déclare, prestation par prestation. */
    creditImpotEligible: z.boolean(),
    majorations: z.array(majorationSchema).max(12),
    /** Période d'application. Deux versions d'un même `code` ne se chevauchent jamais. */
    from: dateSchema,
    to: dateSchema.nullish(),
    createdBy: idSchema,
    createdAt: z.coerce.date(),
  })
  .refine((prestation) => !prestation.to || prestation.to >= prestation.from, {
    error: "la fin d'application ne précède pas son début",
    path: ["to"],
  });

export type Prestation = z.infer<typeof prestationSchema>;

/** Réglages de facturation de l'agence. Tout y est optionnel : rien n'est supposé. */
export const tariffSettingsSchema = z.strictObject({
  _id: idSchema,
  agencyId: idSchema,
  /** Taux du crédit d'impôt, saisi par l'agence (0,5 sur le site aujourd'hui). `null` = non saisi. */
  creditImpotTaux: z.number().min(0).max(1).nullish(),
  /** Plafond annuel de dépenses ouvrant droit au crédit, en centimes. `null` = non saisi. */
  plafondAnnuelCentimes: z.number().int().positive().nullish(),
  updatedBy: idSchema,
  updatedAt: z.coerce.date(),
});

export type TariffSettings = z.infer<typeof tariffSettingsSchema>;

/** La prestation applicable à une date, parmi les versions d'un même code. */
export function prestationAt(
  prestations: readonly Prestation[],
  code: string,
  date: string,
): Prestation | null {
  return (
    prestations.find(
      (prestation) =>
        prestation.code === code &&
        prestation.from <= date &&
        (!prestation.to || prestation.to >= date),
    ) ?? null
  );
}

export type PricedVisit = {
  startDate: string;
  start: string;
  endDate: string;
  end: string;
  kind?: (typeof visitKinds)[number];
};

export type PriceLine = {
  libelle: string;
  minutes: number;
  montantCentimes: number;
};

export type Price = {
  /** L'information principale : ce que le foyer paie, avant tout avantage fiscal. */
  principal: {
    totalTtcCentimes: number;
    minutes: number;
    lignes: PriceLine[];
  };
  /**
   * Secondaire, et seulement si l'agence a saisi son taux : l'estimation après crédit d'impôt.
   * `null` veut dire « non calculable », jamais « zéro ».
   */
  secondaire: { creditImpotCentimes: number; apresCreditCentimes: number; estimation: true } | null;
};

type Segment = { from: Date; to: Date; minutes: number; date: string; nuit: boolean };

/** Arrondi au centime, demi vers le haut, sur des entiers. */
function cents(value: number): number {
  return Math.round(value);
}

/**
 * Découpe la visite en segments homogènes : même jour parisien, même position vis-à-vis de la
 * fenêtre de nuit. Les frontières sont des **instants**, donc le changement d'heure est traité
 * sans cas particulier.
 */
export function segmentsOf(
  visit: PricedVisit,
  fenetre?: { debut: string; fin: string } | null,
): Segment[] {
  const debut = parisToInstant(visit.startDate, visit.start);
  const fin = parisToInstant(visit.endDate, visit.end);
  if (fin.getTime() <= debut.getTime()) return [];

  const bornes = new Set<number>([debut.getTime(), fin.getTime()]);
  for (let date = visit.startDate; date <= visit.endDate;) {
    bornes.add(parisToInstant(date, "00:00").getTime());
    if (fenetre) {
      bornes.add(parisToInstant(date, fenetre.debut).getTime());
      bornes.add(parisToInstant(date, fenetre.fin).getTime());
    }
    const [year, month, day] = date.split("-").map(Number);
    date = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  }

  const tries = [...bornes]
    .filter((instant) => instant >= debut.getTime() && instant <= fin.getTime())
    .sort((a, b) => a - b);

  const segments: Segment[] = [];
  for (let i = 0; i + 1 < tries.length; i += 1) {
    const from = new Date(tries[i]);
    const to = new Date(tries[i + 1]);
    if (to.getTime() <= from.getTime()) continue;
    const milieu = new Date((from.getTime() + to.getTime()) / 2);
    const parts = parisParts(milieu);
    segments.push({
      from,
      to,
      minutes: Math.round((to.getTime() - from.getTime()) / 60_000),
      date: parts.date,
      nuit: fenetre ? inWindow(parts.minutesOfDay, fenetre) : false,
    });
  }
  return segments;
}

function inWindow(minutesOfDay: number, fenetre: { debut: string; fin: string }): boolean {
  const debut = minutesOf(fenetre.debut);
  const fin = minutesOf(fenetre.fin);
  // Une fenêtre de nuit traverse minuit : 21 h → 7 h. Les deux sens sont gérés.
  return debut <= fin
    ? minutesOfDay >= debut && minutesOfDay < fin
    : minutesOfDay >= debut || minutesOfDay < fin;
}

/**
 * Le prix d'une visite. Les majorations s'appliquent **sur la part de temps concernée**, jamais
 * sur la visite entière : une visite du dimanche 6 h à 10 h ne majore pas en nuit les heures du
 * matin, et une nuit du samedi au dimanche majore séparément ce qui tombe de chaque côté.
 */
export function priceVisit(
  prestation: Prestation,
  visit: PricedVisit,
  settings?: TariffSettings | null,
): Price {
  const totalMinutes = segmentsOf(visit, null).reduce(
    (somme, segment) => somme + segment.minutes,
    0,
  );
  const lignes: PriceLine[] = [];

  const base =
    prestation.unite === "heure"
      ? cents((prestation.prixTtcCentimes * totalMinutes) / 60)
      : prestation.prixTtcCentimes;
  lignes.push({
    libelle: `${prestation.libelle} (${prestation.unite === "heure" ? `${minutesEnHeures(totalMinutes)} h` : prestation.unite})`,
    minutes: totalMinutes,
    montantCentimes: base,
  });

  const tauxHoraire =
    prestation.unite === "heure"
      ? prestation.prixTtcCentimes
      : cents((base * 60) / Math.max(totalMinutes, 1));

  for (const majoration of prestation.majorations) {
    const segments = segmentsOf(visit, majoration.fenetre ?? null);
    const minutes = segments
      .filter((segment) => concerne(majoration, segment))
      .reduce((somme, segment) => somme + segment.minutes, 0);
    if (minutes === 0) continue;

    const montant =
      majoration.mode === "pourcentage"
        ? cents((tauxHoraire * minutes * majoration.valeur) / 100 / 60)
        : majoration.mode === "montant_horaire"
          ? cents((majoration.valeur * minutes) / 60)
          : majoration.valeur;
    if (montant === 0) continue;
    lignes.push({ libelle: majoration.libelle, minutes, montantCentimes: montant });
  }

  const totalTtcCentimes = lignes.reduce((somme, ligne) => somme + ligne.montantCentimes, 0);

  const taux = settings?.creditImpotTaux;
  const secondaire =
    prestation.creditImpotEligible && typeof taux === "number"
      ? {
          creditImpotCentimes: cents(totalTtcCentimes * taux),
          apresCreditCentimes: totalTtcCentimes - cents(totalTtcCentimes * taux),
          estimation: true as const,
        }
      : null;

  return { principal: { totalTtcCentimes, minutes: totalMinutes, lignes }, secondaire };
}

function concerne(majoration: Majoration, segment: Segment): boolean {
  switch (majoration.type) {
    case "nuit":
      return segment.nuit;
    case "dimanche":
      return isSunday(segment.date);
    case "ferie":
      return holidayName(segment.date) !== null;
    case "personnalisee":
      return true;
  }
}

function minutesEnHeures(minutes: number): string {
  return String(Math.round((minutes / 60) * 100) / 100);
}

export function euros(centimes: number): string {
  return `${(centimes / 100).toFixed(2).replace(".", ",")} €`;
}
