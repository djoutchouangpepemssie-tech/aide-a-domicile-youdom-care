import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { Section } from "@/components/layout/Section/Section";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { Prose } from "@/components/ui/Prose/Prose";
import { groupCards, GroupLinksBlock } from "@/components/blocks/RelatedLinks/GroupLinks";
import { getAccessibilityPage, getInterfaceTexts, getSiteConfig } from "@/content/loader";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * Déclaration d'accessibilité /accessibilite/ (docs/07 §2 et §4, P8.4), sur le modèle RGAA 4.1 :
 * éditeur et adresse du site, état de conformité fondé sur l'audit consigné dans
 * docs/AUDIT_ACCESSIBILITE.md, résultats, contenus non accessibles et corrections prévues,
 * technologies et environnement de test, contact, voies de recours (Défenseur des droits).
 * Contenu : content/pages/accessibilite.json ; coordonnées : site.config.json. Le fil d'Ariane
 * émet le JSON-LD `BreadcrumbList`. Page indexable comme les autres pages légales.
 */

export const ACCESSIBILITY_PATH = "/accessibilite/";

export function generateMetadata(): Metadata {
  const { seo } = getAccessibilityPage();
  return pageMetadata({
    titre: seo.titre,
    description: seo.description,
    chemin: ACCESSIBILITY_PATH,
  });
}

/** Remplace chaque jeton `{clé}` par sa valeur. */
function fill(text: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, value),
    text,
  );
}

/** Coupe le texte autour d'un jeton et y insère un nœud (lien). */
function withNode(text: string, token: string, node: ReactNode): ReactNode {
  const [before, after] = text.split(token);
  if (after === undefined) return text;
  return (
    <>
      {before}
      {node}
      {after}
    </>
  );
}

function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

export default async function AccessibilityPage() {
  const page = getAccessibilityPage();
  const { marque, contact } = getSiteConfig();
  const { fil_ariane } = getInterfaceTexts();

  const date = formatLongDate(page.date);
  const tokens = { site: marque.nom, url: marque.url, date };
  const phone = contact.telephone_principal ? formatFrenchPhone(contact.telephone_principal) : null;
  const telHref = contact.telephone_principal ? toTelHref(contact.telephone_principal) : null;
  const { etat } = page;
  const counts = {
    testes: String(etat.criteres_testes),
    conformes: String(etat.criteres_conformes),
    non_conformes: String(etat.criteres_non_conformes),
    non_applicables: String(etat.criteres_non_applicables),
  };

  const groupLinks = await groupCards("/accessibilite/");
  return (
    <main id="contenu">
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb texts={fil_ariane} items={[{ label: page.ariane }]} className="mb-6" />
        <Heading level={1} id="titre">
          {page.h1}
        </Heading>
        <Lead className="mt-5">{fill(page.chapo, tokens)}</Lead>
        <p className="mt-4 text-small text-text-soft">
          {withNode(page.date_libelle, "{date}", <time dateTime={page.date}>{date}</time>)}
        </p>
      </Section>

      <Section tone="white" aria-labelledby="etat">
        <Heading level={2} id="etat">
          {etat.h2}
        </Heading>
        <Prose className="mt-6" data-statut={etat.statut}>
          <p>
            <strong>{fill(etat.texte, tokens)}</strong>
          </p>
          <p>{fill(etat.resultats_libelle, counts)}</p>
        </Prose>
      </Section>

      <Section tone="sand" aria-labelledby="resultats">
        <Heading level={2} id="resultats">
          {page.resultats.h2}
        </Heading>
        <Prose className="mt-6">
          <p>{page.resultats.texte}</p>
          <Heading level={3} visual={4}>
            {page.resultats.conformes_h3}
          </Heading>
          <ul>
            {page.resultats.conformes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Heading level={3} visual={4}>
            {page.resultats.detail_h3}
          </Heading>
          <p>{page.resultats.detail_texte}</p>
        </Prose>
      </Section>

      <Section tone="white" aria-labelledby="non-accessibles">
        <Heading level={2} id="non-accessibles">
          {page.non_accessibles.h2}
        </Heading>
        <Prose className="mt-6">
          <p>{page.non_accessibles.texte}</p>
        </Prose>
        <ul className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-2">
          {page.non_accessibles.items.map((item) => (
            <li
              key={item.titre}
              className="max-w-none rounded-card border border-line bg-white p-6"
              data-etat={item.etat}
            >
              <Heading level={3} visual={4}>
                {item.titre}
              </Heading>
              <p className="m-0 mt-2 text-small font-bold text-teal-900">
                {page.non_accessibles.etats_libelles[item.etat]} · {item.critere}
              </p>
              <p className="m-0 mt-3">{item.texte}</p>
              <p className="m-0 mt-3">{item.correction}</p>
            </li>
          ))}
        </ul>
        <Prose className="mt-8">
          <Heading level={3} visual={4}>
            {page.non_accessibles.derogation_h3}
          </Heading>
          <p>{page.non_accessibles.derogation_texte}</p>
          <Heading level={3} visual={4}>
            {page.non_accessibles.non_soumis_h3}
          </Heading>
          <p>{page.non_accessibles.non_soumis_texte}</p>
        </Prose>
      </Section>

      <Section tone="paper" aria-labelledby="etablissement">
        <Heading level={2} id="etablissement">
          {page.etablissement.h2}
        </Heading>
        <Prose className="mt-6">
          <p>{withNode(page.date_libelle, "{date}", <time dateTime={page.date}>{date}</time>)}</p>
          <Heading level={3} visual={4}>
            {page.etablissement.technologies_h3}
          </Heading>
          <ul>
            {page.etablissement.technologies.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Heading level={3} visual={4}>
            {page.etablissement.environnement_h3}
          </Heading>
          <ul>
            {page.etablissement.environnement.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Heading level={3} visual={4}>
            {page.etablissement.outils_h3}
          </Heading>
          <ul>
            {page.etablissement.outils.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Heading level={3} visual={4}>
            {page.etablissement.pages_h3}
          </Heading>
          <p>{page.etablissement.pages_texte}</p>
          <ul>
            {page.etablissement.pages.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.libelle}</Link>
              </li>
            ))}
          </ul>
        </Prose>
      </Section>

      <Section tone="teal" aria-labelledby="contact">
        <Heading level={2} id="contact">
          {page.contact.h2}
        </Heading>
        <Prose className="mt-6">
          <p>{page.contact.texte}</p>
          <ul>
            {contact.email ? (
              <li>
                {withNode(
                  page.contact.email_libelle,
                  "{email}",
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>,
                )}
              </li>
            ) : null}
            {phone && telHref ? (
              <li>
                {withNode(
                  page.contact.telephone_libelle,
                  "{téléphone}",
                  <a href={telHref} className="tabular-figures">
                    {phone}
                  </a>,
                )}
              </li>
            ) : null}
          </ul>
        </Prose>
      </Section>

      <Section tone="white" aria-labelledby="recours">
        <Heading level={2} id="recours">
          {page.recours.h2}
        </Heading>
        <Prose className="mt-6">
          <p>{page.recours.texte}</p>
          <ul>
            {page.recours.items.map((item) => (
              <li key={item.href}>
                <a href={item.href} rel="noopener">
                  {item.libelle}
                  <span className="sr-only"> ({page.recours.lien_externe})</span>
                </a>
              </li>
            ))}
          </ul>
          <p>{page.recours.courrier_libelle}</p>
          <address className="not-italic">
            {page.recours.courrier.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
          <p>{page.recours.telephone_libelle}</p>
        </Prose>
      </Section>

      <GroupLinksBlock links={groupLinks} />
    </main>
  );
}
