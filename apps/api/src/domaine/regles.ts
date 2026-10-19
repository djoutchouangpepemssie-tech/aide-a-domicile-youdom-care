import * as z from "zod";
import { isoWeekday, parisParts, parisToInstant } from "../temps/paris";
import { idSchema } from "./schemas";

/*
 * Les règles de planification — **celles de Youdom Care, pas les miennes.**
 *
 * Décision d'Arcel du 19/10 : « la planification n'a pas de règle, il faut l'implémenter de façon
 * correcte, puissante et profonde ». J'en tire la conséquence qui me paraît la seule honnête : le
 * moteur n'impose **rien**. Aucune valeur par défaut, aucune règle active d'office. Une règle
 * n'existe que si l'agence l'a saisie, avec sa valeur et sa sévérité.
 *
 * Pourquoi c'est mieux qu'un moteur qui « connaîtrait » le droit du travail : un logiciel qui
 * impose des seuils que personne n'a validés est faux deux fois — faux parce qu'il invente, et
 * faux parce qu'on le contourne. Ici, l'agence décide, le logiciel applique, et le journal garde
 * la trace de ce qui a été forcé.
 *
 * Ce que le moteur apporte quand même, et c'est là qu'est la profondeur :
 * - dix contrôles **écrits et testés**, prêts à être activés d'un geste ;
 * - deux sévérités : **bloquant** (l'écriture est refusée) ou **avertissement** (le coordinateur
 *   voit, décide, et son passage en force est journalisé avec son motif) ;
 * - un catalogue de **suggestions** avec l'unité et ce que chaque règle vérifie, pour que
 *   l'écran de réglage explique au lieu de demander un nombre dans le vide.
 */

export const RULE_KEYS = [
  "chevauchement",
  "duree_min_visite",
  "duree_max_visite",
  "trajet_entre_visites",
  "amplitude_quotidienne",
  "repos_quotidien",
  "repos_hebdomadaire",
  "heures_hebdomadaires",
  "jours_consecutifs",
  "absence_intervenant",
] as const;

export type RuleKey = (typeof RULE_KEYS)[number];

export const severities = ["bloquant", "avertissement"] as const;
export type Severity = (typeof severities)[number];

/** Une règle telle que l'agence la saisit. Inactive tant qu'elle ne l'a pas activée. */
export const ruleSchema = z.strictObject({
  active: z.boolean(),
  severite: z.enum(severities),
  /** Le seuil, dans l'unité de la règle (minutes, heures, jours). Absent pour les règles binaires. */
  valeur: z.number().int().positive().nullish(),
});

export type Rule = z.infer<typeof ruleSchema>;

/** Règles binaires : elles n'ont pas de seuil, elles sont vraies ou fausses. */
export const BINARY_RULES: readonly RuleKey[] = ["chevauchement", "absence_intervenant"];

/*
 * Les **poids d'optimisation**. Ce ne sont pas des règles : ils n'autorisent ni n'interdisent
 * rien, ils ordonnent des suggestions. Les contraintes, elles, viennent uniquement des règles
 * ci-dessus — celles que l'agence a saisies.
 *
 * Ils ont des valeurs par défaut, et c'est cohérent avec MY-10 : une valeur par défaut qui change
 * l'ordre d'une liste de propositions n'engage personne ; une valeur par défaut qui refuse un
 * planning, si.
 */
export const optimisationWeightsSchema = z.strictObject({
  /** Intervenant déjà venu dans ce foyer : « les mêmes visages » est une valeur de métier. */
  continuite: z.number().int().min(0).max(100),
  /** Souhait exprimé par le foyer. */
  souhait: z.number().int().min(0).max(100),
  /** Équilibre de charge entre intervenants sur la semaine. */
  equilibre: z.number().int().min(0).max(100),
  /** Enchaînement géographique : une visite adjacente, peu de trajet. */
  trajet: z.number().int().min(0).max(100),
  /** Retrait par avertissement de règle introduit par l'affectation. */
  penaliteAvertissement: z.number().int().min(0).max(100),
});

export type OptimisationWeights = z.infer<typeof optimisationWeightsSchema>;

export const DEFAULT_WEIGHTS: OptimisationWeights = {
  continuite: 40,
  souhait: 30,
  equilibre: 20,
  trajet: 20,
  penaliteAvertissement: 25,
};

export const agencyRulesSchema = z
  .strictObject({
    _id: idSchema,
    agencyId: idSchema,
    /** Les réglages sont **versionnés** : un planning posé hier a été jugé par les règles d'hier. */
    version: z.number().int().positive(),
    rules: z.record(z.enum(RULE_KEYS), ruleSchema),
    /** Poids d'optimisation. Absents = ceux par défaut, qui n'interdisent rien. */
    optimisation: optimisationWeightsSchema.nullish(),
    updatedBy: idSchema,
    updatedAt: z.coerce.date(),
  })
  .refine(
    (config) =>
      Object.entries(config.rules).every(([key, rule]) => {
        if (!rule.active) return true;
        const binaire = BINARY_RULES.includes(key as RuleKey);
        return binaire ? rule.valeur == null : typeof rule.valeur === "number";
      }),
    { error: "une règle active a besoin de son seuil, et une règle binaire n'en prend pas" },
  );

export type AgencyRules = z.infer<typeof agencyRulesSchema>;

export type RuleCatalogEntry = {
  key: RuleKey;
  libelle: string;
  /** Ce que la règle vérifie, en une phrase, pour l'écran de réglage. */
  verifie: string;
  unite: "minutes" | "heures" | "jours" | null;
  /** Suggestion **affichée**, jamais appliquée : c'est l'agence qui tranche. */
  suggestion: number | null;
};

export const RULE_CATALOG: readonly RuleCatalogEntry[] = [
  {
    key: "chevauchement",
    libelle: "Deux visites en même temps",
    verifie: "un intervenant ne peut pas être à deux endroits à la fois",
    unite: null,
    suggestion: null,
  },
  {
    key: "duree_min_visite",
    libelle: "Durée minimale d'une visite",
    verifie: "une visite plus courte que ce seuil est signalée",
    unite: "minutes",
    suggestion: 30,
  },
  {
    key: "duree_max_visite",
    libelle: "Durée maximale d'une visite",
    verifie: "une visite plus longue que ce seuil est signalée (hors garde de nuit et 24 h/24)",
    unite: "minutes",
    suggestion: 720,
  },
  {
    key: "trajet_entre_visites",
    libelle: "Temps de trajet entre deux visites",
    verifie:
      "l'écart entre la fin d'une visite et le début de la suivante, dans deux foyers différents",
    unite: "minutes",
    suggestion: 30,
  },
  {
    key: "amplitude_quotidienne",
    libelle: "Amplitude d'une journée",
    verifie: "de la première minute travaillée à la dernière, pauses comprises",
    unite: "heures",
    suggestion: 13,
  },
  {
    key: "repos_quotidien",
    libelle: "Repos entre deux journées",
    verifie: "l'écart entre la dernière visite d'un jour et la première du lendemain",
    unite: "heures",
    suggestion: 11,
  },
  {
    key: "repos_hebdomadaire",
    libelle: "Repos hebdomadaire",
    verifie: "un intervalle libre d'au moins ce nombre d'heures dans la semaine",
    unite: "heures",
    suggestion: 35,
  },
  {
    key: "heures_hebdomadaires",
    libelle: "Heures travaillées dans la semaine",
    verifie: "la somme des visites de la semaine (lundi au dimanche)",
    unite: "heures",
    suggestion: 48,
  },
  {
    key: "jours_consecutifs",
    libelle: "Jours travaillés d'affilée",
    verifie: "le nombre de jours consécutifs avec au moins une visite",
    unite: "jours",
    suggestion: 6,
  },
  {
    key: "absence_intervenant",
    libelle: "Visite pendant une absence",
    verifie: "congé, maladie, formation ou indisponibilité déclarée",
    unite: null,
    suggestion: null,
  },
];

/** Un planning vide de règles : le point de départ de toute agence. */
export function emptyRules(): Record<RuleKey, Rule> {
  return Object.fromEntries(
    RULE_KEYS.map((key) => [
      key,
      { active: false, severite: "avertissement" as Severity, valeur: null },
    ]),
  ) as Record<RuleKey, Rule>;
}

/** Une affectation à juger : des heures **parisiennes**, pas des instants. */
export type Assignment = {
  visitId: string;
  householdId: string;
  workerId: string;
  startDate: string;
  start: string;
  endDate: string;
  end: string;
  /** Les gardes de nuit et le 24 h/24 échappent à la durée maximale : c'est leur nature. */
  kind?: "jour" | "nuit_calme" | "nuit_active" | "continu";
};

export type AbsenceWindow = { from: Date; to: Date; motif: string };

export type Finding = {
  regle: RuleKey;
  severite: Severity;
  message: string;
  visites: string[];
};

type Span = Assignment & { debut: Date; fin: Date; minutes: number };

function toSpan(assignment: Assignment): Span {
  const debut = parisToInstant(assignment.startDate, assignment.start);
  const fin = parisToInstant(assignment.endDate, assignment.end);
  return {
    ...assignment,
    debut,
    fin,
    minutes: Math.round((fin.getTime() - debut.getTime()) / 60_000),
  };
}

const heures = (minutes: number) => Math.round((minutes / 60) * 10) / 10;

/**
 * Juge l'ensemble des affectations **d'un intervenant** à l'aune des règles de son agence.
 *
 * On juge un ensemble, pas une visite : le repos, l'amplitude et les heures hebdomadaires n'ont
 * aucun sens visite par visite. L'appelant passe donc la semaine (ou plus) autour du changement.
 */
export function evaluateRules(
  assignments: readonly Assignment[],
  rules: Record<RuleKey, Rule>,
  context: { absences?: readonly AbsenceWindow[] } = {},
): Finding[] {
  const findings: Finding[] = [];
  const spans = assignments.map(toSpan).sort((a, b) => a.debut.getTime() - b.debut.getTime());
  const actif = (key: RuleKey) => (rules[key]?.active ? rules[key] : null);
  const signale = (key: RuleKey, message: string, visites: string[]) => {
    const rule = rules[key];
    if (!rule) return;
    findings.push({ regle: key, severite: rule.severite, message, visites });
  };

  // Deux visites en même temps.
  if (actif("chevauchement")) {
    for (let i = 0; i + 1 < spans.length; i += 1) {
      const a = spans[i];
      const b = spans[i + 1];
      if (b.debut.getTime() < a.fin.getTime()) {
        signale(
          "chevauchement",
          `deux visites se chevauchent : ${a.startDate} ${a.start}–${a.end} et ${b.startDate} ${b.start}–${b.end}`,
          [a.visitId, b.visitId],
        );
      }
    }
  }

  // Durées.
  const min = actif("duree_min_visite");
  const max = actif("duree_max_visite");
  for (const span of spans) {
    if (min?.valeur && span.minutes < min.valeur) {
      signale("duree_min_visite", `visite de ${span.minutes} min, minimum ${min.valeur} min`, [
        span.visitId,
      ]);
    }
    const horsLimite =
      span.kind === "nuit_calme" || span.kind === "nuit_active" || span.kind === "continu";
    if (max?.valeur && !horsLimite && span.minutes > max.valeur) {
      signale(
        "duree_max_visite",
        `visite de ${heures(span.minutes)} h, maximum ${heures(max.valeur)} h`,
        [span.visitId],
      );
    }
  }

  // Trajet entre deux foyers.
  const trajet = actif("trajet_entre_visites");
  if (trajet?.valeur) {
    for (let i = 0; i + 1 < spans.length; i += 1) {
      const a = spans[i];
      const b = spans[i + 1];
      if (a.householdId === b.householdId) continue;
      const ecart = Math.round((b.debut.getTime() - a.fin.getTime()) / 60_000);
      if (ecart >= 0 && ecart < trajet.valeur) {
        signale(
          "trajet_entre_visites",
          `${ecart} min entre deux foyers, minimum ${trajet.valeur} min`,
          [a.visitId, b.visitId],
        );
      }
    }
  }

  // Par jour parisien : amplitude.
  const amplitude = actif("amplitude_quotidienne");
  const parJour = new Map<string, Span[]>();
  for (const span of spans) {
    const jour = parisParts(span.debut).date;
    parJour.set(jour, [...(parJour.get(jour) ?? []), span]);
  }
  if (amplitude?.valeur) {
    for (const [jour, duJour] of parJour) {
      const debut = Math.min(...duJour.map((span) => span.debut.getTime()));
      const fin = Math.max(...duJour.map((span) => span.fin.getTime()));
      const minutes = Math.round((fin - debut) / 60_000);
      if (minutes > amplitude.valeur * 60) {
        signale(
          "amplitude_quotidienne",
          `amplitude de ${heures(minutes)} h le ${jour}, maximum ${amplitude.valeur} h`,
          duJour.map((span) => span.visitId),
        );
      }
    }
  }

  // Repos entre deux journées.
  const repos = actif("repos_quotidien");
  if (repos?.valeur) {
    for (let i = 0; i + 1 < spans.length; i += 1) {
      const a = spans[i];
      const b = spans[i + 1];
      if (parisParts(a.debut).date === parisParts(b.debut).date) continue;
      const ecart = Math.round((b.debut.getTime() - a.fin.getTime()) / 60_000);
      if (ecart >= 0 && ecart < repos.valeur * 60) {
        signale(
          "repos_quotidien",
          `${heures(ecart)} h de repos entre deux journées, minimum ${repos.valeur} h`,
          [a.visitId, b.visitId],
        );
      }
    }
  }

  // Heures de la semaine (lundi au dimanche), par semaine ISO.
  const hebdo = actif("heures_hebdomadaires");
  const parSemaine = new Map<string, Span[]>();
  for (const span of spans) {
    const jour = parisParts(span.debut).date;
    const lundi = mondayOf(jour);
    parSemaine.set(lundi, [...(parSemaine.get(lundi) ?? []), span]);
  }
  if (hebdo?.valeur) {
    for (const [lundi, semaine] of parSemaine) {
      const minutes = semaine.reduce((somme, span) => somme + span.minutes, 0);
      if (minutes > hebdo.valeur * 60) {
        signale(
          "heures_hebdomadaires",
          `${heures(minutes)} h travaillées dans la semaine du ${lundi}, maximum ${hebdo.valeur} h`,
          semaine.map((span) => span.visitId),
        );
      }
    }
  }

  // Repos hebdomadaire : un intervalle libre assez long dans chaque semaine complète fournie.
  const reposHebdo = actif("repos_hebdomadaire");
  if (reposHebdo?.valeur) {
    for (const [lundi, semaine] of parSemaine) {
      const tries = [...semaine].sort((a, b) => a.debut.getTime() - b.debut.getTime());
      const debutSemaine = parisToInstant(lundi, "00:00").getTime();
      const finSemaine = parisToInstant(addDays(lundi, 7), "00:00").getTime();
      let libre = 0;
      let curseur = debutSemaine;
      for (const span of tries) {
        libre = Math.max(libre, span.debut.getTime() - curseur);
        curseur = Math.max(curseur, span.fin.getTime());
      }
      libre = Math.max(libre, finSemaine - curseur);
      const minutes = Math.round(libre / 60_000);
      if (minutes < reposHebdo.valeur * 60) {
        signale(
          "repos_hebdomadaire",
          `plus long repos de la semaine du ${lundi} : ${heures(minutes)} h, minimum ${reposHebdo.valeur} h`,
          tries.map((span) => span.visitId),
        );
      }
    }
  }

  // Jours travaillés d'affilée.
  const consecutifs = actif("jours_consecutifs");
  if (consecutifs?.valeur) {
    const jours = [...parJour.keys()].sort();
    let serie: string[] = [];
    const clore = () => {
      if (serie.length > (consecutifs.valeur ?? 0)) {
        signale(
          "jours_consecutifs",
          `${serie.length} jours travaillés d'affilée (du ${serie[0]} au ${serie[serie.length - 1]}), maximum ${consecutifs.valeur}`,
          serie.flatMap((jour) => (parJour.get(jour) ?? []).map((span) => span.visitId)),
        );
      }
      serie = [];
    };
    for (const jour of jours) {
      if (serie.length === 0 || addDays(serie[serie.length - 1], 1) === jour) serie.push(jour);
      else {
        clore();
        serie = [jour];
      }
    }
    clore();
  }

  // Visite pendant une absence déclarée.
  if (actif("absence_intervenant")) {
    for (const span of spans) {
      for (const absence of context.absences ?? []) {
        if (
          span.debut.getTime() < absence.to.getTime() &&
          span.fin.getTime() > absence.from.getTime()
        ) {
          signale(
            "absence_intervenant",
            `visite du ${span.startDate} pendant une absence déclarée (${absence.motif})`,
            [span.visitId],
          );
        }
      }
    }
  }

  return findings;
}

export function blocking(findings: readonly Finding[]): Finding[] {
  return findings.filter((finding) => finding.severite === "bloquant");
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Le lundi de la semaine ISO d'une date. */
export function mondayOf(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}
