import Link from "next/link";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { SourcesList, formatFrenchDate } from "@/components/blocks/SourcesList/SourcesList";
import { Section } from "@/components/layout/Section/Section";
import { Reveal } from "@/components/motion/Reveal/Reveal";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "@/components/ui/Callout/Callout";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { PhotoFigure, photoSizes } from "@/components/ui/PhotoFigure/PhotoFigure";
import { Prose } from "@/components/ui/Prose/Prose";
import { authorPath, MAGAZINE_PATH, rubriquePath, type ArticleMeta } from "@/content/article-meta";
import { rubriqueLabels, type Author } from "@/content/article-schema";
import type { LoadedArticle } from "@/content/articles";
import type { InterfaceTexts } from "@/content/schemas";
import { ArticleGrid } from "./ArticleCard";
import { articleMdxComponents } from "./ArticleMdx";
import { ShareActions } from "./ShareActions";

/*
 * Gabarit d'article du Fil : les dix points de docs/06 §3, dans l'ordre.
 *  1. fil d'Ariane (Accueil › Le Fil › rubrique › article) et rubrique, puis le titre (H1) ;
 *  2. chapô (`Lead`) ;
 *  3. ligne de confiance : auteur (lien vers sa fiche si elle existe), relecteur ou « Relecture
 *     professionnelle à venir » pour un sujet de santé non relu, publication, mise à jour, temps
 *     de lecture ;
 *  4. « L'essentiel » ;
 *  5. sommaire ancré construit depuis les `##` du corps, collant sur ordinateur (`position:
 *     sticky`, sans JavaScript), `nav` nommé ;
 *  6. corps MDX avec les composants `ARetenir` et `Attention` (ArticleMdx.tsx) ;
 *  7. « Et concrètement, demain ? » : trois actions ;
 *  8. l'unique encart d'appel de l'en-tête (un seul bouton, libellé de docs/01 §6) ;
 *  9. sources numérotées (`SourcesList` ordonnée) ;
 * 10. « À lire ensuite » (cartes), partage (mailto et copie du lien) et « Version imprimable ».
 * Statut `a_relire` : bandeau d'attente en tête (la page est en noindex, voir la route). À
 * l'impression (variantes `print:`), le fil d'Ariane, le sommaire, l'encart d'appel, les cartes
 * et le partage disparaissent ; le corps et les sources s'impriment pleine largeur.
 */

export interface ArticleTemplateData {
  article: LoadedArticle;
  texts: InterfaceTexts;
  /** Libellé du magazine dans le fil d'Ariane (content/pages/magazine.json › ariane). */
  magazineLabel: string;
  /** Articles « À lire ensuite », trois au plus, déjà calculés. */
  related: readonly ArticleMeta[];
  /** Fiche de l'auteur réel, s'il en a une. */
  author: Author | null;
  /** Adresse canonique absolue de l'article (partage). */
  url: string;
}

function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, value),
    template,
  );
}

export function ArticleTemplate({ data }: { data: ArticleTemplateData }) {
  const { article, texts, magazineLabel, related, author, url } = data;
  const { meta } = article;
  const t = texts.magazine;
  const rubrique = rubriqueLabels[meta.rubrique];
  const pendingReview = meta.sante && !meta.relu_par;
  const components = articleMdxComponents(
    { a_retenir: t.a_retenir, attention: t.attention },
    article.headings,
  );
  const mailto = `mailto:?subject=${encodeURIComponent(fill(t.partager_email_objet, { titre: meta.titre }))}&body=${encodeURIComponent(url)}`;
  const authorLabel = fill(t.auteur, { nom: meta.auteur.nom, fonction: meta.auteur.fonction });
  const cardTexts = { temps_lecture: t.temps_lecture, maj_le: t.maj_le };

  return (
    <main
      id="contenu"
      data-article={article.slug}
      data-rubrique={meta.rubrique}
      data-statut={meta.statut}
    >
      {meta.statut === "a_relire" ? (
        <div className="container-site pt-6 print:hidden">
          <Callout variant="attention">{t.non_relu}</Callout>
        </div>
      ) : null}

      {/* 1. Fil d'Ariane, rubrique, titre — 2. chapô — 3. ligne de confiance */}
      <Section tone="paper" aria-labelledby="titre" className="pt-8!">
        <Breadcrumb
          texts={texts.fil_ariane}
          items={[
            { label: magazineLabel, href: MAGAZINE_PATH },
            { label: rubrique, href: rubriquePath(meta.rubrique) },
            { label: meta.titre },
          ]}
          className="mb-6"
        />
        <p className="m-0 text-small font-bold text-teal-800">
          <span className="sr-only">{t.rubrique} : </span>
          <Link href={rubriquePath(meta.rubrique)} className="no-underline hover:underline">
            {rubrique}
          </Link>
        </p>
        <Heading level={1} id="titre" className="mt-2">
          {meta.titre}
        </Heading>
        <Lead className="mt-5">{meta.chapo}</Lead>
        <ul
          className="tabular-figures m-0 mt-6 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-small text-text-soft"
          data-confiance
        >
          <li className="max-w-none font-bold text-ink">
            {author ? (
              <Link href={authorPath(author.slug)} className="text-ink">
                {authorLabel}
              </Link>
            ) : (
              authorLabel
            )}
          </li>
          {meta.relu_par ? (
            <li className="max-w-none">
              {fill(t.relu_par, {
                nom: meta.relu_par.nom,
                fonction: meta.relu_par.fonction,
                date: formatFrenchDate(meta.relu_par.date),
              })}
            </li>
          ) : pendingReview ? (
            <li className="max-w-none font-bold text-warning" data-relecture="a-venir">
              {t.relecture_a_venir}
            </li>
          ) : null}
          <li className="max-w-none">
            <time dateTime={meta.publie_le}>
              {fill(t.publie_le, { date: formatFrenchDate(meta.publie_le) })}
            </time>
          </li>
          {meta.maj_le !== meta.publie_le ? (
            <li className="max-w-none">
              <time dateTime={meta.maj_le}>
                {fill(t.maj_le, { date: formatFrenchDate(meta.maj_le) })}
              </time>
            </li>
          ) : null}
          <li className="max-w-none" data-temps-lecture>
            {fill(t.temps_lecture, { n: String(article.readingMinutes) })}
          </li>
        </ul>
        <PhotoFigure
          src={meta.image.src}
          alt={meta.image.alt}
          focal={meta.image.focal}
          ratio="3:2"
          mobileRatio="16:9"
          radius={28}
          sizes={photoSizes.full}
          priority
          className="mt-8 print:hidden"
        />
      </Section>

      {/* 4. L'essentiel */}
      <Section tone="white" aria-labelledby="essentiel" className="py-10!" data-section="essentiel">
        <div className="rounded-block border-l-[3px] border-teal-700 bg-tint-teal px-6 py-6 sm:px-8">
          <Heading level={2} id="essentiel" visual={3} className="text-teal-900">
            {t.essentiel_h2}
          </Heading>
          <ul className="m-0 mt-4 grid gap-2 pl-5">
            {meta.essentiel.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      </Section>

      {/* 5. Sommaire — 6. corps — 7. demain — 8. encart d'appel — 9. sources */}
      <Section tone="paper" aria-label={meta.titre} data-section="corps">
        <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16 print:block">
          {article.headings.length > 0 ? (
            <nav
              aria-label={t.sommaire}
              className="self-start rounded-card border border-line bg-white p-5 shadow-1 lg:sticky lg:top-24 print:hidden"
              data-sommaire
            >
              <p className="m-0 font-bold text-teal-900">{t.sommaire}</p>
              <ol className="m-0 mt-3 grid list-decimal gap-2 pl-5 text-small marker:text-teal-700">
                {article.headings.map((heading) => (
                  <li key={heading.id}>
                    <a href={`#${heading.id}`}>{heading.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          <div className="min-w-0">
            <Prose as="div" className="max-w-none" data-article-body>
              <article.Body components={components} />
            </Prose>

            <section aria-labelledby="demain" className="mt-12" data-section="demain">
              <Heading level={2} id="demain">
                {t.demain_h2}
              </Heading>
              <ol className="m-0 mt-5 grid gap-4 pl-0" data-demain>
                {meta.demain.map((action, index) => (
                  <li key={action} className="flex max-w-none items-start gap-4">
                    <span
                      aria-hidden="true"
                      className="figure flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-teal-700 bg-white text-teal-900"
                    >
                      {index + 1}
                    </span>
                    <span className="pt-1.5">{action}</span>
                  </li>
                ))}
              </ol>
            </section>

            <aside
              aria-labelledby="encart"
              className="mt-12 rounded-block bg-tint-sand px-6 py-6 sm:px-8 sm:py-8 print:hidden"
              data-encart="appel"
            >
              <Heading level={2} id="encart" visual={3}>
                {meta.encart.titre}
              </Heading>
              <p className="m-0 mt-3">{meta.encart.texte}</p>
              <p className="m-0 mt-6">
                <Button href={meta.encart.href}>{meta.encart.libelle}</Button>
              </p>
            </aside>

            <section aria-labelledby="sources" className="mt-12" data-section="sources">
              <Heading level={2} id="sources">
                {t.sources_h2}
              </Heading>
              <SourcesList
                ordered
                className="mt-6"
                sources={meta.sources}
                texts={{ ...texts.page_aide, lien_externe: texts.aides.lien_externe }}
              />
            </section>
          </div>
        </div>
      </Section>

      {/* 10. À lire ensuite, partage, version imprimable */}
      {related.length > 0 ? (
        <Section
          tone="sand"
          aria-labelledby="a-lire-ensuite"
          className="print:hidden"
          data-section="a-lire-ensuite"
        >
          <Heading level={2} id="a-lire-ensuite">
            {t.a_lire_ensuite_h2}
          </Heading>
          <Reveal className="mt-8">
            <ArticleGrid articles={related} texts={cardTexts} withRubriqueLinks />
          </Reveal>
        </Section>
      ) : null}

      <Section
        tone="white"
        aria-labelledby="partager"
        className="print:hidden"
        data-section="partager"
      >
        <Heading level={2} id="partager" visual={3}>
          {t.partager_h2}
        </Heading>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button variant="outline" href={mailto}>
            {t.partager_email}
          </Button>
          <ShareActions
            url={url}
            texts={{
              copier_lien: t.copier_lien,
              lien_copie: t.lien_copie,
              lien_non_copie: t.lien_non_copie,
              imprimer: t.imprimer,
            }}
          />
        </div>
      </Section>
    </main>
  );
}
