"use client";

import { MultiStepForm, type FormStep } from "@/components/forms/MultiStepForm/MultiStepForm";
import { Callout } from "@/components/ui/Callout/Callout";
import { RadioCards } from "@/components/ui/RadioCards/RadioCards";
import { TextField } from "@/components/ui/TextField/TextField";
import type { SpecialForms } from "@/content/schemas";
import { buildLead, currentSourcePage, sendLead } from "@/lib/lead/client";
import type { Urgency } from "@/lib/lead/forms";
import {
  CommuneStepField,
  contactPayload,
  emptyContactValue,
  IdentityFields,
  MessageField,
  missingText,
  PrivacyNote,
  UrgencyField,
  validateCommune,
  validateIdentity,
  type CommonFormTexts,
  type ContactValue,
} from "./shared";

/*
 * Professionnels (docs/05 §5) : structure, fonction, téléphone direct · commune de la personne ·
 * type de besoin · échéance. Aucune donnée nominative de la personne accompagnée : la mention
 * l'indique, et le consentement santé n'est pas demandé (D-021).
 */

export interface ProfessionalValue extends ContactValue {
  structure: string;
  fonction: string;
  typeBesoin: string;
  urgence: Urgency | null;
}

const initialValue: ProfessionalValue = {
  ...emptyContactValue,
  structure: "",
  fonction: "",
  typeBesoin: "",
  urgence: null,
};

export interface ProfessionalFormProps {
  texts: CommonFormTexts;
  page: SpecialForms["professionnel"];
  phone: string | null;
  confidentialiteHref: string;
  initialInsee?: string;
}

export function ProfessionalForm({
  texts,
  page,
  phone,
  confidentialiteHref,
  initialInsee,
}: ProfessionalFormProps) {
  const steps: FormStep<ProfessionalValue>[] = [
    {
      id: "vous",
      title: page.etape_vous,
      validate: (value) => {
        const errors = validateIdentity(value, texts);
        if (!value.structure.trim()) {
          errors["structure"] = missingText(texts, page.structure.toLocaleLowerCase("fr-FR"));
        }
        return errors;
      },
      render: (ctx) => (
        <>
          <TextField
            id={ctx.fieldId("structure")}
            label={page.structure}
            autoComplete="organization"
            value={ctx.value.structure}
            error={ctx.errors["structure"]}
            onChange={(event) => ctx.setValue({ ...ctx.value, structure: event.target.value })}
          />
          <TextField
            id={ctx.fieldId("fonction")}
            label={page.fonction}
            optional
            autoComplete="organization-title"
            value={ctx.value.fonction}
            onChange={(event) => ctx.setValue({ ...ctx.value, fonction: event.target.value })}
          />
          <IdentityFields ctx={ctx} texts={texts} phoneLabel={page.telephone} />
          <PrivacyNote texts={texts} confidentialiteHref={confidentialiteHref} />
        </>
      ),
    },
    {
      id: "situation",
      title: page.etape_situation,
      validate: (value) => {
        const errors = validateCommune(value, texts);
        if (!value.urgence) errors["urgence"] = missingText(texts, texts.champs.debut);
        return errors;
      },
      render: (ctx) => (
        <>
          <Callout variant="attention">{page.anonymat}</Callout>
          <CommuneStepField
            ctx={ctx}
            texts={texts}
            label={page.commune}
            initialInsee={initialInsee}
          />
          <RadioCards
            id={ctx.fieldId("typeBesoin")}
            name="type_besoin"
            legend={page.type_besoin}
            optional
            options={page.types.map((label) => ({ value: label, label }))}
            value={ctx.value.typeBesoin}
            onChange={(typeBesoin) => ctx.setValue({ ...ctx.value, typeBesoin })}
          />
          <UrgencyField ctx={ctx} texts={texts} legend={page.echeance} />
          <MessageField ctx={ctx} label={page.message} hint={page.anonymat} />
        </>
      ),
    },
  ];

  return (
    <MultiStepForm<ProfessionalValue>
      form="professionnel"
      steps={steps}
      initialValue={initialValue}
      texts={texts}
      phone={phone}
      successHref="/merci/professionnel/"
      onSubmit={async (value, meta) => {
        if (!value.commune || !value.urgence) throw new Error("demande incomplète");
        const situation: Record<string, string> = { structure: value.structure.trim() };
        if (value.fonction.trim()) situation["fonction"] = value.fonction.trim();
        if (value.typeBesoin) situation["type_besoin"] = value.typeBesoin;
        const lead = buildLead({
          form: "professionnel",
          commune: value.commune,
          contact: contactPayload(value),
          urgence: value.urgence,
          consentSante: false,
          sourcePage: currentSourcePage(),
          situation,
          message: value.message,
        });
        await sendLead(lead, meta);
      }}
    />
  );
}
