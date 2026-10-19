import * as z from "zod";
import { mondayOf } from "../domaine/regles";
import { idSchema, visitKinds } from "../domaine/schemas";
import { datesBetween, isDate, isTime, isoWeekday, minutesOf, nextDay } from "../temps/paris";

/*
 * Le planning récurrent — « créer, modifier et gérer tous les plannings », demandé le 19/10.
 *
 * Le modèle tient en trois objets, et c'est volontairement peu :
 *
 * 1. **la série** : un foyer, une période, un rythme (toutes les semaines, une semaine sur deux…)
 *    et des créneaux (jour de la semaine, heure de début, heure de fin, nature, intervenant) ;
 * 2. **les exceptions** : une occurrence sautée (`skips`), ou modifiée (`overrides` — horaire,
 *    intervenant, nature, annulation, avec motif). Elles ne touchent pas la série ;
 * 3. **les occurrences**, calculées à la demande pour une fenêtre. Rien n'est stocké d'avance :
 *    un planning de deux ans ne pèse donc rien, et changer la série change tout de suite ce que
 *    les familles voient.
 *
 * Les trois portées de modification sont celles que tout le monde attend d'un agenda, parce que
 * l'inverse se paie en ressaisies : **cette occurrence**, **celle-ci et les suivantes**, **toute
 * la série**. La deuxième coupe la série en deux — c'est ce qui permet de garder l'histoire : ce
 * qui a eu lieu avant le changement reste tel qu'il a eu lieu.
 */

const dateSchema = z.string().refine(isDate, { error: "date AAAA-MM-JJ" });
const timeSchema = z.string().refine(isTime, { error: "heure HH:MM" });

export const slotSchema = z
  .strictObject({
    /** Lundi = 1 … dimanche = 7. */
    weekday: z.number().int().min(1).max(7),
    start: timeSchema,
    end: timeSchema,
    /** La visite se termine le lendemain : c'est le cas de toute garde de nuit. */
    overnight: z.boolean(),
    kind: z.enum(visitKinds),
    /** L'intervenant du créneau, ou `null` : un créneau sans intervenant est un créneau à pourvoir. */
    workerId: idSchema.nullish(),
  })
  .refine((slot) => slot.overnight || minutesOf(slot.end) > minutesOf(slot.start), {
    error: "une visite qui finit avant de commencer est une garde de nuit : cochez « overnight »",
    path: ["end"],
  });

export type Slot = z.infer<typeof slotSchema>;

export const overrideSchema = z.strictObject({
  date: dateSchema,
  slotIndex: z.number().int().min(0),
  start: timeSchema.nullish(),
  end: timeSchema.nullish(),
  overnight: z.boolean().nullish(),
  kind: z.enum(visitKinds).nullish(),
  workerId: idSchema.nullish(),
  cancelled: z.boolean().nullish(),
  motif: z.string().max(200).nullish(),
  decidedBy: idSchema,
  decidedAt: z.coerce.date(),
});

export type Override = z.infer<typeof overrideSchema>;

export const serieStatuses = ["active", "suspendue", "terminee"] as const;

export const serieSchema = z
  .strictObject({
    _id: idSchema,
    householdId: idSchema,
    agencyId: idSchema,
    libelle: z.string().min(1).max(80),
    /** Première date possible, et dernière — `null` tant que le contrat court. */
    from: dateSchema,
    to: dateSchema.nullish(),
    /** 1 = toutes les semaines, 2 = une semaine sur deux, et ainsi de suite. */
    everyWeeks: z.number().int().min(1).max(8),
    slots: z.array(slotSchema).min(1).max(40),
    skips: z.array(dateSchema),
    overrides: z.array(overrideSchema),
    status: z.enum(serieStatuses),
    /** Ce qui a remplacé cette série lors d'un « celle-ci et les suivantes ». */
    replacedBy: idSchema.nullish(),
    replaces: idSchema.nullish(),
    version: z.number().int().positive(),
    createdBy: idSchema,
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  })
  .refine((serie) => !serie.to || serie.to >= serie.from, {
    error: "la fin d'une série ne précède pas son début",
    path: ["to"],
  });

export type Serie = z.infer<typeof serieSchema>;

export type Occurrence = {
  serieId: string;
  householdId: string;
  date: string;
  slotIndex: number;
  start: string;
  end: string;
  /** Jour de fin : le lendemain pour une garde de nuit. */
  endDate: string;
  kind: Slot["kind"];
  workerId: string | null;
  /** `serie` si elle sort du rythme, `exception` si une décision l'a modifiée. */
  origine: "serie" | "exception";
  motif: string | null;
};

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Nombre de semaines entières entre deux lundis. */
function weeksBetween(fromMonday: string, toMonday: string): number {
  const a = Date.parse(`${fromMonday}T00:00:00Z`);
  const b = Date.parse(`${toMonday}T00:00:00Z`);
  return Math.round((b - a) / (7 * JOUR_MS));
}

/** La série passe-t-elle cette semaine-là ? (rythme d'une semaine sur `everyWeeks`) */
export function weekMatches(serie: Serie, date: string): boolean {
  const ecart = weeksBetween(mondayOf(serie.from), mondayOf(date));
  return ecart >= 0 && ecart % serie.everyWeeks === 0;
}

/**
 * Les occurrences d'une série dans une fenêtre, dans l'ordre. Rien n'est lu ni écrit : c'est une
 * fonction du modèle, donc testable sans base et affichable sans matérialiser.
 */
export function occurrences(serie: Serie, from: string, to: string): Occurrence[] {
  if (serie.status === "terminee" && serie.to && serie.to < from) return [];
  const debut = from > serie.from ? from : serie.from;
  const fin = serie.to && serie.to < to ? serie.to : to;
  if (debut > fin) return [];

  const sauts = new Set(serie.skips);
  const exceptions = new Map(
    serie.overrides.map((override) => [`${override.date}#${override.slotIndex}`, override]),
  );

  const out: Occurrence[] = [];
  for (const date of datesBetween(debut, fin)) {
    if (sauts.has(date)) continue;
    if (!weekMatches(serie, date)) continue;
    const jour = isoWeekday(date);
    serie.slots.forEach((slot, slotIndex) => {
      if (slot.weekday !== jour) return;
      const exception = exceptions.get(`${date}#${slotIndex}`);
      if (exception?.cancelled) return;
      const start = exception?.start ?? slot.start;
      const end = exception?.end ?? slot.end;
      const overnight = exception?.overnight ?? slot.overnight;
      out.push({
        serieId: serie._id,
        householdId: serie.householdId,
        date,
        slotIndex,
        start,
        end,
        endDate: overnight ? nextDay(date) : date,
        kind: exception?.kind ?? slot.kind,
        workerId: exception?.workerId ?? slot.workerId ?? null,
        origine: exception ? "exception" : "serie",
        motif: exception?.motif ?? null,
      });
    });
  }
  return out.sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
}

/** Les occurrences **suspendues** n'apparaissent pas : une série suspendue ne produit rien. */
export function visibleOccurrences(serie: Serie, from: string, to: string): Occurrence[] {
  return serie.status === "suspendue" ? [] : occurrences(serie, from, to);
}

export type EditScope = "occurrence" | "cette_et_suivantes" | "serie";

export type OccurrenceChange = {
  start?: string;
  end?: string;
  overnight?: boolean;
  kind?: Slot["kind"];
  workerId?: string | null;
  cancelled?: boolean;
  motif?: string;
};

/** Pose ou remplace une exception sur une occurrence. La série, elle, ne bouge pas. */
export function editOccurrence(
  serie: Serie,
  input: { date: string; slotIndex: number; change: OccurrenceChange; by: string; at: Date },
): Serie {
  const autres = serie.overrides.filter(
    (override) => !(override.date === input.date && override.slotIndex === input.slotIndex),
  );
  const existante = serie.overrides.find(
    (override) => override.date === input.date && override.slotIndex === input.slotIndex,
  );
  const override = overrideSchema.parse({
    date: input.date,
    slotIndex: input.slotIndex,
    start: input.change.start ?? existante?.start ?? null,
    end: input.change.end ?? existante?.end ?? null,
    overnight: input.change.overnight ?? existante?.overnight ?? null,
    kind: input.change.kind ?? existante?.kind ?? null,
    workerId: input.change.workerId ?? existante?.workerId ?? null,
    cancelled: input.change.cancelled ?? existante?.cancelled ?? null,
    motif: input.change.motif ?? existante?.motif ?? null,
    decidedBy: input.by,
    decidedAt: input.at,
  });
  return {
    ...serie,
    overrides: [...autres, override].sort((a, b) =>
      `${a.date}#${a.slotIndex}`.localeCompare(`${b.date}#${b.slotIndex}`),
    ),
    updatedAt: input.at,
  };
}

/**
 * « Celle-ci et les suivantes » : la série s'arrête la veille, une nouvelle prend la suite avec
 * les créneaux modifiés.
 *
 * C'est le seul moyen honnête de changer l'avenir sans réécrire le passé : les visites déjà
 * faites restent décrites par la série qui les a produites, y compris dans une facture éditée
 * trois mois plus tard.
 */
export function splitSerie(
  serie: Serie,
  input: { date: string; slots: Slot[]; by: string; at: Date; newId: string; libelle?: string },
): { ancienne: Serie; nouvelle: Serie } {
  const veille = nextDay(input.date, -1);
  const ancienne: Serie = {
    ...serie,
    to: veille,
    status: veille < serie.from ? "terminee" : serie.status,
    replacedBy: input.newId,
    version: serie.version + 1,
    updatedAt: input.at,
  };
  const nouvelle: Serie = serieSchema.parse({
    ...serie,
    _id: input.newId,
    libelle: input.libelle ?? serie.libelle,
    from: input.date,
    to: serie.to ?? null,
    slots: input.slots,
    // Les exceptions passées appartiennent à l'ancienne série ; celles à venir suivent.
    skips: serie.skips.filter((date) => date >= input.date),
    overrides: serie.overrides.filter((override) => override.date >= input.date),
    status: "active",
    replaces: serie._id,
    replacedBy: null,
    version: 1,
    createdBy: input.by,
    createdAt: input.at,
    updatedAt: input.at,
  });
  return { ancienne, nouvelle };
}

/** Modifie la série elle-même : tout son avenir **et** son passé non encore matérialisé. */
export function editSerie(
  serie: Serie,
  input: { slots?: Slot[]; libelle?: string; to?: string | null; everyWeeks?: number; at: Date },
): Serie {
  return serieSchema.parse({
    ...serie,
    libelle: input.libelle ?? serie.libelle,
    slots: input.slots ?? serie.slots,
    to: input.to === undefined ? serie.to : input.to,
    everyWeeks: input.everyWeeks ?? serie.everyWeeks,
    version: serie.version + 1,
    updatedAt: input.at,
  });
}

/** Saute une occurrence entière (tous ses créneaux du jour). */
export function skipDate(serie: Serie, date: string, at: Date): Serie {
  if (serie.skips.includes(date)) return serie;
  return { ...serie, skips: [...serie.skips, date].sort(), updatedAt: at };
}

export function suspendSerie(serie: Serie, at: Date): Serie {
  return { ...serie, status: "suspendue", version: serie.version + 1, updatedAt: at };
}

export function resumeSerie(serie: Serie, at: Date): Serie {
  return { ...serie, status: "active", version: serie.version + 1, updatedAt: at };
}

/** Termine une série à une date : ce qui est passé reste, l'avenir disparaît. */
export function endSerie(serie: Serie, date: string, at: Date): Serie {
  return serieSchema.parse({
    ...serie,
    to: date,
    status: "terminee",
    version: serie.version + 1,
    updatedAt: at,
  });
}
