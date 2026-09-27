import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/layout/Section/Section";
import { FactList } from "@/components/legal/FactList";
import { LegalHeader } from "@/components/legal/LegalHeader";
import { Callout } from "@/components/ui/Callout/Callout";
import { Heading } from "@/components/ui/Heading/Heading";
import { Prose } from "@/components/ui/Prose/Prose";
import { groupCards, GroupLinksBlock } from "@/components/blocks/RelatedLinks/GroupLinks";
import { getPolitiqueConfidentialite, POLITIQUE_CONFIDENTIALITE_PATH } from "@/content/legal";
import { getSiteConfig } from "@/content/loader";
import type { LegalEntry } from "@/lib/legal/mentions";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * /politique-de-confidentialite/ (docs/07 §2, docs/05 §8, P8.3). Responsable = l'éditeur tel
 * que renseigné dans site.config.json (champs null masqués) ; finalités par formulaire, bases
 * légales dont le consentement explicite pour les données de santé, destinataires, durées
 * proposées présentées comme telles, droits, contact `contact.email`, réclamation CNIL,
 * mesure d'audience d'après src/lib/mesure/README.md. Textes : content/legal/politique-de-confidentialite.json.
 */

export function generateMetadata(): Metadata {
  const { seo } = getPolitiqueConfidentialite();
  return pageMetadata({
    titre: seo.titre,
    description: seo.description,
    chemin: POLITIQUE_CONFIDENTIALITE_PATH,
  });
}

function Paragraphs({ items }: { items: readonly string[] }) {
  return (
    <Prose className="mt-4">
      {items.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </Prose>
  );
}

export default async function PolitiqueConfidentialitePage() {
  const page = getPolitiqueConfidentialite();
  const { marque, contact, legal } = getSiteConfig();
  const labels = page.responsable.libelles;

  const responsable: LegalEntry[] = [
    { id: "nom_commercial", label: labels.nom_commercial, value: marque.nom },
  ];
  if (legal.raison_sociale !== null) {
    responsable.push({
      id: "raison_sociale",
      label: labels.raison_sociale,
      value: legal.raison_sociale,
    });
  }
  if (legal.forme_juridique !== null) {
    responsable.push({
      id: "forme_juridique",
      label: labels.forme_juridique,
      value: legal.forme_juridique,
    });
  }
  if (legal.siege_social !== null) {
    responsable.push({ id: "siege_social", label: labels.siege_social, value: legal.siege_social });
  }
  if (legal.siret !== null) {
    responsable.push({ id: "siret", label: labels.siret, value: legal.siret });
  }
  if (contact.email !== null) {
    responsable.push({
      id: "email",
      label: labels.email,
      value: contact.email,
      href: `mailto:${contact.email}`,
    });
  }
  if (contact.telephone_principal !== null) {
    const href = toTelHref(contact.telephone_principal);
    responsable.push({
      id: "telephone",
      label: labels.telephone,
      value: formatFrenchPhone(contact.telephone_principal),
      ...(href ? { href } : {}),
    });
  }

  const [exerciceBefore, exerciceAfter] = page.droits.exercice.split("{email}");

  const groupLinks = await groupCards("/politique-de-confidentialite/");
  return (
    <main id="contenu">
      <LegalHeader
        ariane={page.ariane}
        h1={page.h1}
        chapo={page.chapo}
        maj={page.maj}
        majLibelle={page.maj_libelle}
      />

      <Section tone="white" aria-labelledby="responsable">
        <Heading level={2} id="responsable">
          {page.responsable.h2}
        </Heading>
        <p className="mt-3">{page.responsable.intro}</p>
        <FactList entries={responsable} />
      </Section>

      <Section tone="teal" aria-labelledby="principes">
        <Heading level={2} id="principes">
          {page.principes.h2}
        </Heading>
        <Paragraphs items={page.principes.paragraphes} />
      </Section>

      <Section tone="paper" aria-labelledby="finalites">
        <Heading level={2} id="finalites">
          {page.finalites.h2}
        </Heading>
        <p className="mt-3">{page.finalites.intro}</p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left text-small" data-finalites>
            <thead>
              <tr className="border-b-2 border-teal-700 align-bottom">
                <th scope="col" className="p-3">
                  {page.finalites.colonnes.formulaire}
                </th>
                <th scope="col" className="p-3">
                  {page.finalites.colonnes.donnees}
                </th>
                <th scope="col" className="p-3">
                  {page.finalites.colonnes.finalite}
                </th>
                <th scope="col" className="p-3">
                  {page.finalites.colonnes.base}
                </th>
              </tr>
            </thead>
            <tbody>
              {page.finalites.formulaires.map((f) => (
                <tr key={f.href} className="border-b border-line align-top">
                  <th scope="row" className="p-3 font-bold">
                    <Link href={f.href} className="inline-flex min-h-11 items-center">
                      {f.libelle}
                    </Link>
                  </th>
                  <td className="p-3">{f.donnees}</td>
                  <td className="p-3">{f.finalite}</td>
                  <td className="p-3">{f.base_legale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section tone="sand" aria-labelledby="sante">
        <Heading level={2} id="sante">
          {page.sante.h2}
        </Heading>
        <Paragraphs items={page.sante.paragraphes} />
      </Section>

      <Section tone="white" aria-labelledby="destinataires">
        <Heading level={2} id="destinataires">
          {page.destinataires.h2}
        </Heading>
        <p className="mt-3">{page.destinataires.intro}</p>
        <ul className="mt-3">
          {page.destinataires.liste.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-3">{page.destinataires.fin}</p>
      </Section>

      <Section tone="paper" aria-labelledby="durees">
        <Heading level={2} id="durees">
          {page.durees.h2}
        </Heading>
        <Paragraphs items={page.durees.paragraphes} />
        <Callout
          variant="bon-a-savoir"
          title={page.durees.propositions_libelle}
          className="mt-6"
          data-durees
        >
          <ul className="m-0 mt-2 pl-5">
            {page.durees.propositions.map((item) => (
              <li key={item} className="max-w-none">
                {item}
              </li>
            ))}
          </ul>
        </Callout>
      </Section>

      <Section tone="teal" aria-labelledby="droits">
        <Heading level={2} id="droits">
          {page.droits.h2}
        </Heading>
        <p className="mt-3">{page.droits.intro}</p>
        <ul className="mt-3">
          {page.droits.liste.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {contact.email !== null ? (
          <p className="mt-4" data-exercice>
            {exerciceBefore}
            <a href={`mailto:${contact.email}`} className="font-bold">
              {contact.email}
            </a>
            {exerciceAfter}
          </p>
        ) : null}
        <p className="mt-3">{page.droits.delai}</p>
      </Section>

      <Section tone="white" aria-labelledby="reclamation">
        <Heading level={2} id="reclamation">
          {page.reclamation.h2}
        </Heading>
        <p className="mt-3">{page.reclamation.texte}</p>
        <p className="mt-3">
          <a
            href={page.reclamation.cnil.href}
            rel="noopener"
            className="inline-flex min-h-11 items-center font-bold"
          >
            {page.reclamation.cnil.libelle}
          </a>
        </p>
        <p className="mt-3 text-small text-text-soft">{page.reclamation.adresse_postale}</p>
      </Section>

      <Section tone="paper" aria-labelledby="mesure">
        <Heading level={2} id="mesure">
          {page.mesure_audience.h2}
        </Heading>
        <Paragraphs items={page.mesure_audience.paragraphes} />
        <p className="mt-4">
          <Link
            href={page.mesure_audience.lien.href}
            className="inline-flex min-h-11 items-center font-bold"
          >
            {page.mesure_audience.lien.libelle}
          </Link>
        </p>
      </Section>

      <Section tone="sand" aria-labelledby="securite">
        <Heading level={2} id="securite">
          {page.securite.h2}
        </Heading>
        <Paragraphs items={page.securite.paragraphes} />
      </Section>

      <Section tone="white" aria-labelledby="mineurs">
        <Heading level={2} id="mineurs">
          {page.mineurs.h2}
        </Heading>
        <Paragraphs items={page.mineurs.paragraphes} />
      </Section>

      <Section tone="paper" aria-labelledby="evolution">
        <Heading level={2} id="evolution">
          {page.evolution.h2}
        </Heading>
        <Paragraphs items={page.evolution.paragraphes} />
      </Section>

      <GroupLinksBlock links={groupLinks} />
    </main>
  );
}
