import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { FAQ } from "@/components/blocks/FAQ/FAQ";
import { FollowUpTimeline } from "@/components/blocks/FollowUpTimeline/FollowUpTimeline";
import { StepsTimeline } from "@/components/blocks/StepsTimeline/StepsTimeline";
import { Section } from "@/components/layout/Section/Section";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { Thread } from "@/components/ui/Thread/Thread";
import {
  getCommitments,
  getHomePage,
  getHowItWorksPage,
  getInterfaceTexts,
  getNavigation,
  getSiteConfig,
} from "@/content/loader";
import { isProduction } from "@/lib/env";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import { pageTitle } from "@/lib/seo/title";

/*
 * « Comment ça marche » (docs/03 §9) : les quatre étapes de docs/01 (source : accueil.json),
 * le suivi détaillé, « et si ça ne va pas ? », questions fréquentes. Les phrases reliées à un
 * engagement non validé sont masquées en production ; la FAQ sur la disponibilité ne s'affiche
 * que si site.config.json l'affirme.
 */

export function generateMetadata(): Metadata {
  const { seo } = getHowItWorksPage();
  const { marque } = getSiteConfig();
  return {
    title: pageTitle(seo.titre, marque.nom),
    description: seo.description,
    alternates: { canonical: "/comment-ca-marche/" },
  };
}

export default function HowItWorksPage() {
  const page = getHowItWorksPage();
  const home = getHomePage();
  const { contact, disponibilite } = getSiteConfig();
  const navigation = getNavigation();
  const { boutons, fil_ariane } = getInterfaceTexts();
  const { engagements, suivi } = getCommitments();
  const crumbLabel =
    navigation.principale.find((item) => item.id === "comment-ca-marche")?.libelle ??
    page.etapes_h2;

  const validated = new Set(engagements.filter((e) => e.valide).map((e) => e.code));
  const gated = (item: { texte: string; texte_engagement?: string; engagement?: string }) =>
    item.texte_engagement !== undefined &&
    (!isProduction() || (item.engagement !== undefined && validated.has(item.engagement)))
      ? `${item.texte} ${item.texte_engagement}`
      : item.texte;

  const phone = contact.telephone_principal ? formatFrenchPhone(contact.telephone_principal) : null;
  const telHref = contact.telephone_principal ? toTelHref(contact.telephone_principal) : null;

  const steps = home.etapes.items.map((step) => ({ title: step.titre, text: gated(step) }));

  const troubleItems = page.si_ca_ne_va_pas.items
    .map((item) => ({ ...item, texte: gated(item) }))
    .filter((item) => !item.texte.includes("{téléphone}") || phone !== null)
    .map((item) => ({
      ...item,
      texte: phone ? item.texte.replace("{téléphone}", phone) : item.texte,
    }));

  const conditions: Record<"disponibilite_24_7", boolean> = {
    disponibilite_24_7:
      disponibilite.sept_jours_sur_sept === true && disponibilite.vingt_quatre_heures === true,
  };
  const faqItems = page.faq.items
    .filter((item) => item.condition === undefined || conditions[item.condition])
    .map((item) => ({
      id: `faq-${item.id}`,
      question: item.question,
      answer: (
        <>
          <p>{item.reponse}</p>
          {item.lien ? (
            <p>
              <Link href={item.lien.href}>{item.lien.libelle}</Link>
            </p>
          ) : null}
        </>
      ),
    }));

  return (
    <main id="contenu">
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb texts={fil_ariane} items={[{ label: crumbLabel }]} className="mb-6" />
        <div className="grid items-center gap-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <Heading level={1} id="titre">
              {page.h1}
            </Heading>
            <Lead className="mt-5">{page.chapo}</Lead>
          </div>
          <Thread illustration="carnet" className="mx-auto w-full max-w-xs lg:max-w-none" />
        </div>
      </Section>

      <Section tone="white" aria-labelledby="etapes">
        <Heading level={2} id="etapes">
          {page.etapes_h2}
        </Heading>
        <StepsTimeline aria-labelledby="etapes" className="mt-8 max-w-2xl" steps={steps} />
      </Section>

      <Section tone="teal" aria-labelledby="suivi">
        <Heading level={2} id="suivi">
          {page.suivi.h2}
        </Heading>
        <Lead className="mt-3">{page.suivi.texte}</Lead>
        <FollowUpTimeline aria-labelledby="suivi" className="mt-8" milestones={suivi.jalons} />
      </Section>

      <Section tone="paper" aria-labelledby="si-ca-ne-va-pas">
        <Heading level={2} id="si-ca-ne-va-pas">
          {page.si_ca_ne_va_pas.h2}
        </Heading>
        <ul className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-3">
          {troubleItems.map((item) => (
            <Card as="li" key={item.titre} className="max-w-none">
              <Heading level={3} visual={4}>
                {item.titre}
              </Heading>
              <p className="m-0 mt-3">
                {telHref && phone && item.texte.includes(phone) ? (
                  <>
                    {item.texte.split(phone)[0]}
                    <Link href={telHref} className="tabular-figures font-bold">
                      {phone}
                    </Link>
                    {item.texte.split(phone)[1]}
                  </>
                ) : (
                  item.texte
                )}
              </p>
            </Card>
          ))}
        </ul>
      </Section>

      <Section tone="sand" aria-labelledby="faq">
        <Heading level={2} id="faq">
          {page.faq.h2}
        </Heading>
        <FAQ className="mt-8 max-w-3xl" items={faqItems} />
      </Section>

      <Section tone="white" aria-labelledby="appel">
        <Heading level={2} id="appel">
          {page.appel.h2}
        </Heading>
        <Lead className="mt-3">{page.appel.texte}</Lead>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href={navigation.rappel_href}>{boutons.rappel}</Button>
          <Button href={navigation.demande_href} variant="outline">
            {boutons.demande_detaillee}
          </Button>
        </div>
      </Section>
    </main>
  );
}
