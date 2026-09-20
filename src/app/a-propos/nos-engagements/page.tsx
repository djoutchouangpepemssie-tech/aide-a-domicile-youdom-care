import type { Metadata } from "next";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { FollowUpTimeline } from "@/components/blocks/FollowUpTimeline/FollowUpTimeline";
import { Section } from "@/components/layout/Section/Section";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import {
  getAbout,
  getCommitments,
  getInterfaceTexts,
  getNavigation,
  getSiteConfig,
} from "@/content/loader";
import { isProduction } from "@/lib/env";
import { pageTitle } from "@/lib/seo/title";

/*
 * « Nos engagements » : chaque engagement de content/engagements.json avec sa preuve quand
 * Arcel l'a renseignée ; un engagement sans texte est masqué, un engagement non validé l'est
 * en production (docs/07 §7). Suivi : jalons du même fichier.
 */

export function generateMetadata(): Metadata {
  const { engagements_page } = getAbout();
  const { marque } = getSiteConfig();
  return {
    title: pageTitle(engagements_page.seo.titre, marque.nom),
    description: engagements_page.seo.description,
    alternates: { canonical: "/a-propos/nos-engagements/" },
  };
}

export default function CommitmentsPage() {
  const { a_propos, engagements_page: page } = getAbout();
  const { engagements, suivi } = getCommitments();
  const navigation = getNavigation();
  const { boutons, fil_ariane } = getInterfaceTexts();

  const shown = engagements.filter(
    (e): e is typeof e & { texte: string } => e.texte !== null && (!isProduction() || e.valide),
  );

  return (
    <main id="contenu">
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb
          texts={fil_ariane}
          items={[{ label: a_propos.ariane, href: "/a-propos/" }, { label: page.ariane }]}
          className="mb-6"
        />
        <Heading level={1} id="titre">
          {page.h1}
        </Heading>
        <Lead className="mt-5">{page.chapo}</Lead>
      </Section>

      <Section tone="white" aria-label={page.h1}>
        <ol className="m-0 grid list-none gap-6 p-0 md:grid-cols-2">
          {shown.map((e, index) => (
            <Card as="li" key={e.code} className="max-w-none" data-engagement={e.code}>
              <p className="m-0 flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="figure flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-teal-700 bg-white text-teal-900"
                >
                  {index + 1}
                </span>
                <span className="heading-4 pt-1.5">{e.titre}</span>
              </p>
              <p className="m-0 mt-3">{e.texte}</p>
              {e.preuve ? (
                <p className="m-0 mt-3 text-small">
                  <span className="font-bold text-teal-900">{page.preuve_libelle} : </span>
                  {e.preuve}
                </p>
              ) : null}
            </Card>
          ))}
        </ol>
      </Section>

      <Section tone="teal" aria-labelledby="suivi">
        <Heading level={2} id="suivi">
          {page.suivi_h2}
        </Heading>
        <FollowUpTimeline aria-labelledby="suivi" className="mt-8" milestones={suivi.jalons} />
      </Section>

      <Section tone="paper" aria-label={boutons.rappel}>
        <div className="flex flex-wrap items-center gap-4">
          <Button href={navigation.rappel_href}>{boutons.rappel}</Button>
          <Button href={navigation.demande_href} variant="outline">
            {boutons.demande_detaillee}
          </Button>
        </div>
      </Section>
    </main>
  );
}
