import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StepsTimeline } from "@/components/blocks/StepsTimeline/StepsTimeline";
import { Section } from "@/components/layout/Section/Section";
import { Button } from "@/components/ui/Button/Button";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { Thread } from "@/components/ui/Thread/Thread";
import {
  getCommitments,
  getHomePage,
  getInterfaceTexts,
  getSiteConfig,
  getThanksPage,
} from "@/content/loader";
import { isProduction } from "@/lib/env";
import { leadForms, type LeadForm } from "@/lib/lead/forms";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * Confirmation /merci/{formulaire}/ (docs/05 §3) : noindex, ce qui va se passer, le téléphone,
 * deux lectures utiles. Aucun détail de la demande n'apparaît (docs/05 §8). Le délai de rappel
 * n'est promis que si Arcel l'a renseigné et si l'engagement E5 est validé (docs/07 §7).
 */

type ThanksPageProps = { params: Promise<{ formulaire: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return leadForms.map((formulaire) => ({ formulaire }));
}

function isLeadForm(value: string): value is LeadForm {
  return (leadForms as readonly string[]).includes(value);
}

export async function generateMetadata({ params }: ThanksPageProps): Promise<Metadata> {
  const { formulaire } = await params;
  if (!isLeadForm(formulaire)) return {};
  const page = getThanksPage();
  // /merci/ figure dans neverIndexedPaths : noindex quoi qu'il arrive.
  return pageMetadata({
    titre: page.seo.titre,
    description: page.seo.description,
    chemin: `/merci/${formulaire}/`,
    noindex: true,
  });
}

/** Phrase de succès de docs/01 §7 : avec délai seulement s'il est connu et engagé. */
export function successText(): string {
  const { formulaires } = getInterfaceTexts();
  const { contact } = getSiteConfig();
  const e5 = getCommitments().engagements.find((e) => e.code === "E5");
  const delayAllowed = contact.delai_rappel !== null && (!isProduction() || e5?.valide === true);
  return delayAllowed && contact.delai_rappel
    ? formulaires.succes.replace("{délai}", contact.delai_rappel)
    : formulaires.succes_delai_inconnu;
}

export default async function ThanksPage({ params }: ThanksPageProps) {
  const { formulaire } = await params;
  if (!isLeadForm(formulaire)) notFound();
  const page = getThanksPage();
  const { formulaires } = getInterfaceTexts();
  const { contact } = getSiteConfig();
  const home = getHomePage();
  const variant = page.variantes[formulaire];
  const phone = contact.telephone_principal;
  const telHref = phone ? toTelHref(phone) : null;
  const urgency = formulaires.succes_urgence.split("{téléphone}");
  const steps = home.etapes.items.map((step) => ({ title: step.titre, text: step.texte }));

  return (
    <main id="contenu">
      <Section tone="paper" aria-labelledby="titre">
        <div className="grid items-center gap-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <Heading level={1} id="titre">
              {variant?.h1 ?? page.h1}
            </Heading>
            <Lead className="mt-5">{variant?.texte ?? successText()}</Lead>
            {phone && telHref ? (
              <p className="mt-4">
                {urgency[0]}
                <a href={telHref} className="font-bold">
                  {formatFrenchPhone(phone)}
                </a>
                {urgency[1]}
              </p>
            ) : null}
          </div>
          <Thread illustration="tasse" className="mx-auto w-full max-w-xs lg:max-w-none" />
        </div>
      </Section>

      {variant ? null : (
        <Section tone="white" aria-labelledby="suite">
          <Heading level={2} id="suite">
            {page.suite_h2}
          </Heading>
          <StepsTimeline className="mt-8" steps={steps} />
        </Section>
      )}

      <Section tone={variant ? "white" : "teal"} aria-labelledby="lectures">
        <Heading level={2} id="lectures">
          {page.lectures_h2}
        </Heading>
        <ul className="m-0 mt-6 grid list-none gap-4 p-0 sm:grid-cols-2">
          {page.lectures.map((lecture) => (
            <li key={lecture.href} className="max-w-none">
              <Link
                href={lecture.href}
                className="block rounded-card border border-line bg-white p-5 font-bold no-underline hover:underline"
              >
                {lecture.libelle}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Button href="/" variant="outline">
            {page.retour_accueil}
          </Button>
        </div>
      </Section>
    </main>
  );
}
