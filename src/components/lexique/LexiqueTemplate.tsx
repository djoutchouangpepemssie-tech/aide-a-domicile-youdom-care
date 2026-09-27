import type { MDXContent } from "mdx/types";
import Link from "next/link";
import { Breadcrumb, type BreadcrumbTexts } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { SiteConversionRail } from "@/components/blocks/ConversionRail/SiteConversionRail";
import {
  SourcesList,
  formatFrenchDate,
  type SourcesListTexts,
} from "@/components/blocks/SourcesList/SourcesList";
import { Section } from "@/components/layout/Section/Section";
import { Button } from "@/components/ui/Button/Button";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { Prose } from "@/components/ui/Prose/Prose";
import type { LexiqueTerm } from "@/content/lexique-schema";
import type { InterfaceTexts } from "@/content/schemas";

/*
 * Gabarit d'une page de terme du lexique (docs/06 §6, P7.2). Dans l'ordre : fil d'Ariane
 * (Accueil › Lexique › terme), sur-titre « Lexique », H1 = terme et son développé, définition
 * en une phrase (Lead), date de mise à jour ; puis l'explication (Markdown compilé, les autres
 * termes liés à leur première occurrence), « Pour qui ? », le texte officiel (lien externe
 * signalé, dates « vérifiée le » et « consultée le » par SourcesList), les pages du site liées
 * (seulement celles qui sont construites), les termes voisins, le retour à l'index ; à droite,
 * à partir de 64 rem, le rail de conversion ; en bas, l'appel. Pas de formulaire : le lexique
 * définit, il ne recueille rien. Tout le texte vient de content/ (terme, interface.json ›
 * lexique, pages/lexique.json › appel).
 */

export interface LexiqueLinkedPage {
  href: string;
  label: string;
}

export interface LexiqueNeighbour {
  slug: string;
  terme: string;
  developpe?: string;
  definition: string;
}

export interface LexiqueTemplateData {
  term: LexiqueTerm;
  /** Explication compilée (src/lib/mdx/compile-lexique.ts). */
  Body: MDXContent;
  texts: InterfaceTexts["lexique"];
  breadcrumb: BreadcrumbTexts;
  /** Libellé de l'index dans le fil d'Ariane (« Lexique »). */
  lexiqueAriane: string;
  sources: SourcesListTexts;
  linked: readonly LexiqueLinkedPage[];
  neighbours: readonly LexiqueNeighbour[];
  appel: { h2: string; texte: string };
  buttons: { rappel: string; demande: string };
  navigation: { rappel_href: string; demande_href: string };
}

export const LEXIQUE_INDEX_HREF = "/lexique/";

const linkCard =
  "flex min-h-14 items-center justify-between gap-3 rounded-card border border-line bg-white px-4 py-3 " +
  "font-bold text-teal-900 no-underline shadow-1 transition-[border-color,box-shadow] " +
  "[transition-duration:var(--duration-base)] hover:border-teal-700 hover:shadow-2 motion-reduce:transition-none";

function Chevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-teal-700"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function LexiqueTemplate({ data }: { data: LexiqueTemplateData }) {
  const { term, Body, texts, breadcrumb, lexiqueAriane, sources, linked, neighbours } = data;
  return (
    <main id="contenu" data-lexique-page={term.slug}>
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb
          texts={breadcrumb}
          items={[{ label: lexiqueAriane, href: LEXIQUE_INDEX_HREF }, { label: term.terme }]}
          className="mb-6"
        />
        <p className="m-0 text-small font-bold text-teal-700">{texts.sur_titre}</p>
        <Heading level={1} id="titre" className="mt-2">
          {term.terme}
          {term.developpe ? (
            <span className="mt-3 block text-h3 font-normal text-text-soft">{term.developpe}</span>
          ) : null}
        </Heading>
        <Lead className="mt-5 max-w-3xl" data-definition>
          {term.definition}
        </Lead>
        <p className="tabular-figures m-0 mt-4 text-small text-text-soft">
          {texts.mis_a_jour.replace("{date}", formatFrenchDate(term.maj))}
        </p>
      </Section>

      <Section tone="white">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start lg:gap-12">
          <div className="max-w-3xl">
            <Prose data-explication>
              <Body />
            </Prose>

            <section aria-labelledby="pour-qui" className="mt-10">
              <Heading level={2} id="pour-qui">
                {texts.pour_qui_h2}
              </Heading>
              <Prose className="mt-4">
                <p>{term.pour_qui}</p>
              </Prose>
            </section>

            <section aria-labelledby="officiel" className="mt-10">
              <Heading level={2} id="officiel">
                {texts.lien_officiel_h2}
              </Heading>
              <p className="mt-4">{texts.lien_officiel_texte}</p>
              <SourcesList className="mt-4" sources={[term.lien_officiel]} texts={sources} />
            </section>

            {linked.length > 0 ? (
              <nav aria-labelledby="pages-liees" className="mt-10" data-pages-liees>
                <Heading level={2} id="pages-liees">
                  {texts.pages_liees_h2}
                </Heading>
                <ul className="m-0 mt-4 grid list-none gap-3 p-0 sm:grid-cols-2">
                  {linked.map((page) => (
                    <li key={page.href} className="max-w-none">
                      <Link href={page.href} prefetch={false} className={linkCard}>
                        <span>{page.label}</span>
                        <Chevron />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}

            {neighbours.length > 0 ? (
              <nav aria-labelledby="voisins" className="mt-10" data-voisins>
                <Heading level={2} id="voisins">
                  {texts.voisins_h2}
                </Heading>
                <ul className="m-0 mt-4 grid list-none gap-4 p-0 sm:grid-cols-2">
                  {neighbours.map((neighbour) => (
                    <li
                      key={neighbour.slug}
                      className="max-w-none rounded-card border border-line bg-white p-4 shadow-1"
                    >
                      <Link
                        href={`${LEXIQUE_INDEX_HREF}${neighbour.slug}/`}
                        prefetch={false}
                        className="font-bold text-teal-900"
                      >
                        {neighbour.terme}
                      </Link>
                      {neighbour.developpe ? (
                        <span className="block text-small text-text-soft">
                          {neighbour.developpe}
                        </span>
                      ) : null}
                      <p className="m-0 mt-2 text-small">{neighbour.definition}</p>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}

            <p className="m-0 mt-10">
              <Link
                href={LEXIQUE_INDEX_HREF}
                className="inline-flex min-h-11 items-center font-bold"
              >
                {texts.retour}
              </Link>
            </p>
          </div>
          <SiteConversionRail formHref={data.navigation.demande_href} />
        </div>
      </Section>

      <Section tone="teal" aria-labelledby="appel">
        <Heading level={2} id="appel">
          {data.appel.h2}
        </Heading>
        <Lead className="mt-3 max-w-3xl">{data.appel.texte}</Lead>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href={data.navigation.rappel_href}>{data.buttons.rappel}</Button>
          <Button href={data.navigation.demande_href} variant="outline">
            {data.buttons.demande}
          </Button>
        </div>
      </Section>
    </main>
  );
}
