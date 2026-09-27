import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { SourcesList, formatFrenchDate } from "@/components/blocks/SourcesList/SourcesList";
import { StepsTimeline } from "@/components/blocks/StepsTimeline/StepsTimeline";
import { Section } from "@/components/layout/Section/Section";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "@/components/ui/Callout/Callout";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { Prose } from "@/components/ui/Prose/Prose";
import { themeBlocks, ThemeLinksBlock } from "@/components/blocks/RelatedLinks/ThemeLinks";
import { getAidPage, listAidPageIds } from "@/content/aid-pages";
import { getInterfaceTexts, getNavigation, getPricingPage } from "@/content/loader";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * Page détaillée d'une aide (docs/03 §9) : montants et conditions repris des sources officielles,
 * avec la date « vérifié le » de la source et la date de consultation ; avertissement d'évolution ;
 * démarche pas à pas ; sources listées. Statique : une page par fichier content/aides/{id}.json.
 */

type AidPageProps = { params: Promise<{ aide: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return listAidPageIds().map((aide) => ({ aide }));
}

export async function generateMetadata({ params }: AidPageProps): Promise<Metadata> {
  const { aide } = await params;
  const page = getAidPage(aide);
  if (!page) return {};
  return pageMetadata({
    titre: page.seo.titre,
    description: page.seo.description,
    chemin: `/tarifs-et-aides/${aide}/`,
  });
}

export default async function AidDetailPage({ params }: AidPageProps) {
  const { aide } = await params;
  const page = getAidPage(aide);
  if (!page) notFound();

  const pricingPage = getPricingPage();
  const navigation = getNavigation();
  const { boutons, fil_ariane, page_aide, aides: aidTexts } = getInterfaceTexts();

  const themes = await themeBlocks(`/tarifs-et-aides/${aide}/`);
  return (
    <main id="contenu">
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb
          texts={fil_ariane}
          items={[{ label: pricingPage.ariane, href: "/tarifs-et-aides/" }, { label: page.ariane }]}
          className="mb-6"
        />
        <Heading level={1} id="titre">
          {page.h1}
        </Heading>
        <Lead className="mt-5">{page.chapo}</Lead>
        <p className="m-0 mt-4 text-small text-text-soft">
          {page_aide.mis_a_jour.replace("{date}", formatFrenchDate(page.maj))}
        </p>
      </Section>

      <Section tone="white" aria-label={page.ariane}>
        <Callout variant="attention" className="max-w-3xl">
          <p>{page_aide.avertissement}</p>
        </Callout>
        <div className="mt-10 grid gap-12 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-10">
            {page.sections.map((section) => (
              <section key={section.h2} aria-labelledby={`s-${slugify(section.h2)}`}>
                <Heading level={2} id={`s-${slugify(section.h2)}`}>
                  {section.h2}
                </Heading>
                <Prose className="mt-4">
                  {section.paragraphes?.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  {section.montants ? (
                    <dl className="grid gap-3">
                      {section.montants.map((m) => (
                        <div
                          key={m.libelle}
                          className="rounded-card border border-line bg-white p-4 shadow-1"
                        >
                          <dt className="text-small font-bold text-teal-900">{m.libelle}</dt>
                          <dd className="m-0 mt-1">
                            <span className="figure tabular-figures text-h4">{m.valeur}</span>
                            {m.precision ? (
                              <span className="block text-small text-text-soft">{m.precision}</span>
                            ) : null}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {section.liste ? (
                    <ul>
                      {section.liste.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </Prose>
              </section>
            ))}
          </div>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Callout variant="retenir" title={page_aide.a_retenir}>
              <ul className="m-0 list-disc pl-5">
                {page.a_retenir.map((item) => (
                  <li key={item} className="max-w-none">
                    {item}
                  </li>
                ))}
              </ul>
            </Callout>
          </aside>
        </div>
      </Section>

      <Section tone="teal" aria-labelledby="demarche">
        <Heading level={2} id="demarche">
          {page.demarche.h2}
        </Heading>
        <StepsTimeline
          aria-labelledby="demarche"
          className="mt-8 max-w-2xl"
          steps={page.demarche.etapes.map((e) => ({ title: e.titre, text: e.texte }))}
        />
      </Section>

      <Section tone="paper" aria-labelledby="sources">
        <Heading level={2} id="sources">
          {page_aide.sources_h2}
        </Heading>
        <SourcesList
          className="mt-6"
          sources={page.sources}
          texts={{ ...page_aide, lien_externe: aidTexts.lien_externe }}
        />
        <p className="m-0 mt-8">
          <Link href="/tarifs-et-aides/" className="inline-flex min-h-11 items-center font-bold">
            {page_aide.retour}
          </Link>
        </p>
      </Section>

      <Section tone="white" aria-labelledby="appel">
        <Heading level={2} id="appel">
          {page.appel.h2}
        </Heading>
        <Lead className="mt-3">{page.appel.texte}</Lead>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href={navigation.rappel_href}>{boutons.rappel}</Button>
          <Button href={navigation.demande_href} variant="outline">
            {boutons.budget}
          </Button>
        </div>
      </Section>

      <ThemeLinksBlock blocks={themes} section="paper" />
    </main>
  );
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
