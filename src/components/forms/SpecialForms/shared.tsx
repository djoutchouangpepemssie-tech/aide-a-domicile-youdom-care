"use client";

import Link from "next/link";
import { CommuneField, type CommuneFieldTexts } from "@/components/forms/CommuneField/CommuneField";
import type {
  MultiStepFormTexts,
  StepContext,
} from "@/components/forms/MultiStepForm/MultiStepForm";
import { RadioCards } from "@/components/ui/RadioCards/RadioCards";
import { Textarea } from "@/components/ui/Textarea/Textarea";
import { TextField } from "@/components/ui/TextField/TextField";
import { cn } from "@/lib/cn";
import type { CommuneRecord } from "@/lib/geo/geo";
import { urgencies, type Urgency } from "@/lib/lead/forms";
import { leadLimits, normalizeFrenchPhone } from "@/lib/lead/schema";

/*
 * Briques partagées par les formulaires hors fabrique (sortie d'hospitalisation, professionnel,
 * contact) : textes communs, coordonnées, commune, message, consentement, échéance.
 */

export interface CommonFormTexts extends MultiStepFormTexts {
  /** Contient {champ}. */
  erreur_champ: string;
  champs: {
    prenom: string;
    nom: string;
    telephone: string;
    commune: string;
    pour_qui: string;
    debut: string;
    consentement: string;
  };
  telephone_invalide: string;
  hors_idf: string;
  email: string;
  email_aide: string;
  message: string;
  message_aide: string;
  consentement: string;
  consentement_requis: string;
  choix_ouvert: string;
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
  planning: { debut_question: string; debuts: Record<Urgency, string> };
}

export interface ContactValue {
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
  commune: CommuneRecord | null;
  communeQuery: string;
  message: string;
  consentement: boolean;
}

export const emptyContactValue: ContactValue = {
  prenom: "",
  nom: "",
  telephone: "",
  email: "",
  commune: null,
  communeQuery: "",
  message: "",
  consentement: false,
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function missingText(texts: CommonFormTexts, champ: string): string {
  return texts.erreur_champ.replace("{champ}", champ);
}

export function validateIdentity(
  value: ContactValue,
  texts: CommonFormTexts,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!value.prenom.trim()) errors["prenom"] = missingText(texts, texts.champs.prenom);
  if (!value.nom.trim()) errors["nom"] = missingText(texts, texts.champs.nom);
  if (!value.telephone.trim()) errors["telephone"] = missingText(texts, texts.champs.telephone);
  else if (normalizeFrenchPhone(value.telephone) === null) {
    errors["telephone"] = texts.telephone_invalide;
  }
  if (value.email.trim() && !emailPattern.test(value.email.trim())) {
    errors["email"] = missingText(texts, texts.email.toLocaleLowerCase("fr-FR"));
  }
  return errors;
}

export function validateCommune(
  value: ContactValue,
  texts: CommonFormTexts,
): Record<string, string> {
  if (value.commune) return {};
  return {
    commune: value.communeQuery.trim() ? texts.hors_idf : missingText(texts, texts.champs.commune),
  };
}

export function contactPayload(value: ContactValue) {
  return {
    prenom: value.prenom.trim(),
    nom: value.nom.trim(),
    telephone: value.telephone.trim(),
    ...(value.email.trim() ? { email: value.email.trim() } : {}),
  };
}

export const checkboxLabel = cn(
  "flex min-h-12 cursor-pointer items-start gap-3 rounded-field border border-field-border bg-white px-4 py-3",
  "has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50",
  "has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
);

interface IdentityProps<T extends ContactValue> {
  ctx: StepContext<T>;
  texts: CommonFormTexts;
  /** Libellé du téléphone (« Votre téléphone direct » pour un professionnel). */
  phoneLabel?: string;
}

export function IdentityFields<T extends ContactValue>({
  ctx,
  texts,
  phoneLabel,
}: IdentityProps<T>) {
  const { value, setValue, errors, fieldId } = ctx;
  return (
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
        label={phoneLabel ?? texts.rappel.telephone}
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
    </>
  );
}

interface CommuneProps<T extends ContactValue> {
  ctx: StepContext<T>;
  texts: CommonFormTexts;
  label?: string;
  initialInsee?: string;
}

export function CommuneStepField<T extends ContactValue>({
  ctx,
  texts,
  label,
  initialInsee,
}: CommuneProps<T>) {
  const { value, setValue, errors, fieldId } = ctx;
  return (
    <CommuneField
      id={fieldId("commune")}
      label={label ?? texts.rappel.commune}
      value={value.commune}
      error={errors["commune"]}
      initialInsee={initialInsee}
      texts={texts.recherche}
      onChange={(commune, query) => setValue({ ...value, commune, communeQuery: query })}
    />
  );
}

interface MessageProps<T extends ContactValue> {
  ctx: StepContext<T>;
  label: string;
  hint: string;
  required?: boolean;
}

export function MessageField<T extends ContactValue>({
  ctx,
  label,
  hint,
  required,
}: MessageProps<T>) {
  const { value, setValue, errors, fieldId } = ctx;
  return (
    <Textarea
      id={fieldId("message")}
      label={label}
      hint={hint}
      optional={!required}
      maxLength={leadLimits.MAX_MESSAGE}
      rows={5}
      value={value.message}
      error={errors["message"]}
      onChange={(event) => setValue({ ...value, message: event.target.value })}
    />
  );
}

interface ConsentProps<T extends ContactValue> {
  ctx: StepContext<T>;
  texts: CommonFormTexts;
  confidentialiteHref: string;
}

export function ConsentField<T extends ContactValue>({
  ctx,
  texts,
  confidentialiteHref,
}: ConsentProps<T>) {
  const { value, setValue, errors, fieldId } = ctx;
  const id = fieldId("consentement");
  return (
    <div>
      <label htmlFor={id} className={checkboxLabel}>
        <input
          id={id}
          type="checkbox"
          checked={value.consentement}
          aria-invalid={errors["consentement"] ? true : undefined}
          aria-describedby={errors["consentement"] ? `${id}-erreur` : undefined}
          onChange={(event) => setValue({ ...value, consentement: event.target.checked })}
          className="mt-0.5 size-6 shrink-0 accent-teal-700 focus-visible:outline-none"
        />
        <span>{texts.consentement}</span>
      </label>
      {errors["consentement"] ? (
        <p id={`${id}-erreur`} className="m-0 mt-2 text-small font-bold text-danger">
          {errors["consentement"]}
        </p>
      ) : null}
      {/* Lien seul dans son paragraphe : cible de 44 px (WCAG 2.5.8, P9.6). */}
      <p className="m-0 mt-3 text-small text-text-soft">
        <Link href={confidentialiteHref} className="inline-flex min-h-11 items-center">
          {texts.rappel.confidentialite}
        </Link>
      </p>
    </div>
  );
}

export function PrivacyNote({
  texts,
  confidentialiteHref,
}: {
  texts: CommonFormTexts;
  confidentialiteHref: string;
}) {
  return (
    <p className="m-0 text-small text-text-soft">
      {texts.rappel.usage_coordonnees}{" "}
      <Link href={confidentialiteHref}>{texts.rappel.confidentialite}</Link>
    </p>
  );
}

interface UrgencyProps<T extends { urgence: Urgency | null }> {
  ctx: StepContext<T>;
  texts: CommonFormTexts;
  legend?: string;
}

export function UrgencyField<T extends { urgence: Urgency | null }>({
  ctx,
  texts,
  legend,
}: UrgencyProps<T>) {
  const { value, setValue, errors, fieldId } = ctx;
  return (
    <RadioCards
      id={fieldId("urgence")}
      name="urgence"
      legend={legend ?? texts.planning.debut_question}
      error={errors["urgence"]}
      options={urgencies.map((urgency) => ({
        value: urgency,
        label: texts.planning.debuts[urgency],
      }))}
      value={value.urgence ?? ""}
      onChange={(urgence) => setValue({ ...value, urgence: urgence as Urgency })}
    />
  );
}
