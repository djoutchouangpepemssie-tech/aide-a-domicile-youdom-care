"use client";

import { MultiStepForm, type FormStep } from "@/components/forms/MultiStepForm/MultiStepForm";
import { Select } from "@/components/ui/Select/Select";
import type { SpecialForms } from "@/content/schemas";
import { buildLead, currentSourcePage, sendLead } from "@/lib/lead/client";
import {
  contactPayload,
  emptyContactValue,
  IdentityFields,
  MessageField,
  missingText,
  PrivacyNote,
  validateIdentity,
  type CommonFormTexts,
  type ContactValue,
} from "./shared";

/*
 * Contact (docs/05 §2, « autres demandes ») : un écran — sujet, coordonnées, message. Pas de
 * commune (D-021), pas de donnée de santé attendue : le message le rappelle.
 */

export interface ContactFormValue extends ContactValue {
  sujet: string;
}

const initialValue: ContactFormValue = { ...emptyContactValue, sujet: "" };

export interface ContactFormProps {
  texts: CommonFormTexts;
  page: SpecialForms["contact"];
  phone: string | null;
  confidentialiteHref: string;
}

export function ContactForm({ texts, page, phone, confidentialiteHref }: ContactFormProps) {
  const step: FormStep<ContactFormValue> = {
    id: "message",
    title: page.h1,
    validate: (value) => {
      const errors = validateIdentity(value, texts);
      if (!value.message.trim()) {
        errors["message"] = missingText(texts, page.message.toLocaleLowerCase("fr-FR"));
      }
      return errors;
    },
    render: (ctx) => (
      <>
        <Select
          id={ctx.fieldId("sujet")}
          label={page.sujet}
          optional
          placeholder={texts.rappel.creneau_choisir}
          value={ctx.value.sujet}
          onChange={(event) => ctx.setValue({ ...ctx.value, sujet: event.target.value })}
          options={page.sujets.map((label) => ({ value: label, label }))}
        />
        <IdentityFields ctx={ctx} texts={texts} />
        <MessageField ctx={ctx} label={page.message} hint={page.message_aide} required />
        <PrivacyNote texts={texts} confidentialiteHref={confidentialiteHref} />
      </>
    ),
  };

  return (
    <MultiStepForm<ContactFormValue>
      form="contact"
      steps={[step]}
      initialValue={initialValue}
      texts={texts}
      phone={phone}
      successHref="/merci/contact/"
      onSubmit={async (value, meta) => {
        const lead = buildLead({
          form: "contact",
          commune: null,
          contact: contactPayload(value),
          urgence: "information",
          consentSante: false,
          sourcePage: currentSourcePage(),
          ...(value.sujet ? { pourQui: value.sujet } : {}),
          message: value.message,
        });
        await sendLead(lead, meta);
      }}
    />
  );
}
