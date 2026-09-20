"use client";

import Link from "next/link";
import { CommuneField, type CommuneFieldTexts } from "@/components/forms/CommuneField/CommuneField";
import {
  MultiStepForm,
  type FormStep,
  type MultiStepFormTexts,
} from "@/components/forms/MultiStepForm/MultiStepForm";
import {
  WeekPlannerInput,
  type WeekPlannerInputTexts,
} from "@/components/forms/WeekPlannerInput/WeekPlannerInput";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup/CheckboxGroup";
import { RadioCards } from "@/components/ui/RadioCards/RadioCards";
import { Select } from "@/components/ui/Select/Select";
import { Textarea } from "@/components/ui/Textarea/Textarea";
import { TextField } from "@/components/ui/TextField/TextField";
import type { FormDefinition } from "@/content/schemas";
import { cn } from "@/lib/cn";
import type { CommuneRecord } from "@/lib/geo/geo";
import { buildLead, currentSourcePage, sendLead } from "@/lib/lead/client";
import { formPaths } from "@/lib/lead/forms";
import {
  applyShortcut,
  emptyPlanning,
  toLeadPlanning,
  type PlanningValue,
} from "@/lib/lead/planning";
import { leadLimits, normalizeFrenchPhone } from "@/lib/lead/schema";
import type { BudgetBasis } from "@/lib/pricing/pricing";

/*
 * Formulaire détaillé (docs/05 §3 et §5) : cinq étapes — pour qui, la situation (questions du
 * cas, toutes facultatives, chacune avec « Je préfère en parler »), les besoins (« À définir
 * ensemble » toujours proposé), le planning, les coordonnées avec consentement explicite aux
 * données de santé (case non précochée, texte de docs/01, version enregistrée). Les questions
 * et les choix viennent de content/formulaires/{cas}.json.
 */

export interface DetailedFormTexts extends MultiStepFormTexts {
  etape_pour_qui: string;
  etape_situation: string;
  etape_besoins: string;
  etape_planning: string;
  etape_coordonnees: string;
  etape_titres: {
    pour_qui: string;
    situation: string;
    besoins: string;
    planning: string;
    coordonnees: string;
  };
  pour_qui_options: readonly string[];
  choix_parler: string;
  choix_ouvert: string;
  email: string;
  email_aide: string;
  message: string;
  message_aide: string;
  consentement: string;
  consentement_requis: string;
  /** Contient {champ}. */
  erreur_champ: string;
  champs: {
    prenom: string;
    nom: string;
    telephone: string;
    commune: string;
    pour_qui: string;
    rythme: string;
    debut: string;
    consentement: string;
  };
  telephone_invalide: string;
  hors_idf: string;
  rappel: {
    prenom: string;
    nom: string;
    telephone: string;
    commune: string;
    creneau_rappel: string;
    creneau_choisir: string;
    creneaux_rappel: readonly string[];
    usage_coordonnees: string;
    confidentialite: string;
  };
  recherche: CommuneFieldTexts;
  planningTexts: WeekPlannerInputTexts;
}

export interface DetailedFormProps {
  definition: FormDefinition;
  texts: DetailedFormTexts;
  phone: string | null;
  confidentialiteHref: string;
  initialInsee?: string;
  budget?: BudgetBasis | null;
}

export interface DetailedValue {
  pourQui: string;
  situation: Record<string, string | string[]>;
  besoins: string[];
  planning: PlanningValue;
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
  commune: CommuneRecord | null;
  communeQuery: string;
  creneau: string;
  message: string;
  consentement: boolean;
}

export const emptyDetailedValue: DetailedValue = {
  pourQui: "",
  situation: {},
  besoins: [],
  planning: emptyPlanning,
  prenom: "",
  nom: "",
  telephone: "",
  email: "",
  commune: null,
  communeQuery: "",
  creneau: "",
  message: "",
  consentement: false,
};

/** Valeur de départ : grille préremplie sur les nuits quand le cas le prévoit (docs/05 §5). */
export function initialDetailedValue(definition: FormDefinition): DetailedValue {
  if (definition.planning_initial !== "nuits") return emptyDetailedValue;
  return {
    ...emptyDetailedValue,
    planning: { ...emptyPlanning, rythme: "regulier", grille: applyShortcut({}, "nuits") },
  };
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCoordinates(
  value: DetailedValue,
  texts: DetailedFormTexts,
): Record<string, string> {
  const missing = (champ: string) => texts.erreur_champ.replace("{champ}", champ);
  const errors: Record<string, string> = {};
  if (!value.prenom.trim()) errors["prenom"] = missing(texts.champs.prenom);
  if (!value.nom.trim()) errors["nom"] = missing(texts.champs.nom);
  if (!value.telephone.trim()) errors["telephone"] = missing(texts.champs.telephone);
  else if (normalizeFrenchPhone(value.telephone) === null) {
    errors["telephone"] = texts.telephone_invalide;
  }
  if (value.email.trim() && !emailPattern.test(value.email.trim())) {
    errors["email"] = missing(texts.email.toLocaleLowerCase("fr-FR"));
  }
  if (!value.commune) {
    errors["commune"] = value.communeQuery.trim() ? texts.hors_idf : missing(texts.champs.commune);
  }
  if (!value.consentement) errors["consentement"] = texts.consentement_requis;
  return errors;
}

/** Réponses de situation sans les vides ni « Je préfère en parler ». */
export function cleanSituation(
  situation: Record<string, string | string[]>,
  skip: string,
): Record<string, string | string[]> | undefined {
  const out: Record<string, string | string[]> = {};
  for (const [key, answer] of Object.entries(situation)) {
    if (Array.isArray(answer)) {
      if (answer.length > 0) out[key] = answer;
    } else if (answer && answer !== skip) {
      out[key] = answer;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

const checkboxLabel = cn(
  "flex min-h-12 cursor-pointer items-start gap-3 rounded-field border border-field-border bg-white px-4 py-3",
  "has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50",
  "has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
);

export function DetailedForm({
  definition,
  texts,
  phone,
  confidentialiteHref,
  initialInsee,
  budget = null,
}: DetailedFormProps) {
  const missing = (champ: string) => texts.erreur_champ.replace("{champ}", champ);

  const steps: FormStep<DetailedValue>[] = [
    {
      id: "pour-qui",
      title: texts.etape_pour_qui,
      validate: (value): Record<string, string> =>
        value.pourQui ? {} : { pourQui: missing(texts.champs.pour_qui) },
      render: ({ value, setValue, errors, fieldId }) => (
        <RadioCards
          id={fieldId("pourQui")}
          name="pour_qui"
          legend={texts.etape_titres.pour_qui}
          error={errors["pourQui"]}
          options={texts.pour_qui_options.map((label) => ({ value: label, label }))}
          value={value.pourQui}
          onChange={(pourQui) => setValue({ ...value, pourQui })}
        />
      ),
    },
    {
      id: "situation",
      title: texts.etape_situation,
      render: ({ value, setValue, fieldId }) => (
        <>
          {definition.situation.map((question) =>
            question.type === "choix" ? (
              <RadioCards
                key={question.id}
                id={fieldId(question.id)}
                name={question.id}
                legend={question.question}
                optional
                options={[...question.options, texts.choix_parler].map((label) => ({
                  value: label,
                  label,
                }))}
                value={
                  typeof value.situation[question.id] === "string"
                    ? (value.situation[question.id] as string)
                    : ""
                }
                onChange={(answer) =>
                  setValue({ ...value, situation: { ...value.situation, [question.id]: answer } })
                }
              />
            ) : (
              <CheckboxGroup
                key={question.id}
                id={fieldId(question.id)}
                name={question.id}
                legend={question.question}
                optional
                options={question.options.map((label) => ({ value: label, label }))}
                value={
                  Array.isArray(value.situation[question.id])
                    ? (value.situation[question.id] as string[])
                    : []
                }
                onChange={(answers) =>
                  setValue({ ...value, situation: { ...value.situation, [question.id]: answers } })
                }
              />
            ),
          )}
        </>
      ),
    },
    {
      id: "besoins",
      title: texts.etape_besoins,
      render: ({ value, setValue, fieldId }) => (
        <CheckboxGroup
          id={fieldId("besoins")}
          name="besoins"
          legend={texts.etape_titres.besoins}
          optional
          options={[...definition.besoins, texts.choix_ouvert].map((label) => ({
            value: label,
            label,
          }))}
          value={value.besoins}
          onChange={(besoins) => setValue({ ...value, besoins })}
        />
      ),
    },
    {
      id: "planning",
      title: texts.etape_titres.planning,
      hint: texts.etape_planning,
      validate: (value) => {
        const errors: Record<string, string> = {};
        if (!value.planning.rythme) errors["rythme"] = missing(texts.champs.rythme);
        if (!value.planning.urgence) errors["urgence"] = missing(texts.champs.debut);
        return errors;
      },
      render: ({ value, setValue, errors, fieldId }) => (
        <WeekPlannerInput
          texts={texts.planningTexts}
          budget={budget}
          ids={{ rythme: fieldId("rythme"), urgence: fieldId("urgence") }}
          errors={{ rythme: errors["rythme"], urgence: errors["urgence"] }}
          value={value.planning}
          onChange={(planning) => setValue({ ...value, planning })}
        />
      ),
    },
    {
      id: "coordonnees",
      title: texts.etape_coordonnees,
      validate: (value) => validateCoordinates(value, texts),
      render: ({ value, setValue, errors, fieldId }) => (
        <>
          <TextField
            id={fieldId("prenom")}
            label={texts.rappel.prenom}
            autoComplete="given-name"
            value={value.prenom}
            error={errors["prenom"]}
            onChange={(event) => setValue({ ...value, prenom: event.target.value })}
          />
          <TextField
            id={fieldId("nom")}
            label={texts.rappel.nom}
            autoComplete="family-name"
            value={value.nom}
            error={errors["nom"]}
            onChange={(event) => setValue({ ...value, nom: event.target.value })}
          />
          <TextField
            id={fieldId("telephone")}
            type="tel"
            label={texts.rappel.telephone}
            autoComplete="tel"
            inputMode="tel"
            value={value.telephone}
            error={errors["telephone"]}
            onChange={(event) => setValue({ ...value, telephone: event.target.value })}
          />
          <TextField
            id={fieldId("email")}
            type="email"
            label={texts.email}
            hint={texts.email_aide}
            optional
            autoComplete="email"
            inputMode="email"
            value={value.email}
            error={errors["email"]}
            onChange={(event) => setValue({ ...value, email: event.target.value })}
          />
          <CommuneField
            id={fieldId("commune")}
            label={texts.rappel.commune}
            value={value.commune}
            error={errors["commune"]}
            initialInsee={initialInsee}
            texts={texts.recherche}
            onChange={(commune, query) => setValue({ ...value, commune, communeQuery: query })}
          />
          <Select
            id={fieldId("creneau")}
            label={texts.rappel.creneau_rappel}
            optional
            placeholder={texts.rappel.creneau_choisir}
            value={value.creneau}
            onChange={(event) => setValue({ ...value, creneau: event.target.value })}
            options={texts.rappel.creneaux_rappel.map((label) => ({ value: label, label }))}
          />
          <Textarea
            id={fieldId("message")}
            label={texts.message}
            hint={texts.message_aide}
            optional
            maxLength={leadLimits.MAX_MESSAGE}
            rows={4}
            value={value.message}
            onChange={(event) => setValue({ ...value, message: event.target.value })}
          />
          <div>
            <label htmlFor={fieldId("consentement")} className={checkboxLabel}>
              <input
                id={fieldId("consentement")}
                type="checkbox"
                checked={value.consentement}
                aria-invalid={errors["consentement"] ? true : undefined}
                aria-describedby={
                  errors["consentement"] ? `${fieldId("consentement")}-erreur` : undefined
                }
                onChange={(event) => setValue({ ...value, consentement: event.target.checked })}
                className="mt-0.5 size-6 shrink-0 accent-teal-700 focus-visible:outline-none"
              />
              <span>{texts.consentement}</span>
            </label>
            {errors["consentement"] ? (
              <p
                id={`${fieldId("consentement")}-erreur`}
                className="m-0 mt-2 text-small font-bold text-danger"
              >
                {errors["consentement"]}
              </p>
            ) : null}
          </div>
          <p className="m-0 text-small text-text-soft">
            <Link href={confidentialiteHref}>{texts.rappel.confidentialite}</Link>
          </p>
        </>
      ),
    },
  ];

  return (
    <MultiStepForm<DetailedValue>
      form={definition.id}
      steps={steps}
      initialValue={initialDetailedValue(definition)}
      texts={texts}
      phone={phone}
      successHref={`/merci/${definition.id}/`}
      onSubmit={async (value, meta) => {
        if (!value.commune || !value.planning.urgence) throw new Error("demande incomplète");
        const situation = cleanSituation(value.situation, texts.choix_parler);
        const planning = toLeadPlanning(value.planning);
        const lead = buildLead({
          form: definition.id,
          commune: value.commune,
          contact: {
            prenom: value.prenom.trim(),
            nom: value.nom.trim(),
            telephone: value.telephone.trim(),
            ...(value.email.trim() ? { email: value.email.trim() } : {}),
            ...(value.creneau ? { rappel: value.creneau } : {}),
          },
          urgence: value.planning.urgence,
          consentSante: value.consentement,
          sourcePage: currentSourcePage(),
          pourQui: value.pourQui,
          ...(situation ? { situation } : {}),
          ...(value.besoins.length > 0 ? { besoins: value.besoins } : {}),
          ...(planning ? { planning } : {}),
          message: value.message,
        });
        await sendLead(lead, meta);
      }}
    />
  );
}

export const detailedFormPaths = formPaths;
