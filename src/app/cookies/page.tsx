import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/layout/Section/Section";
import { LegalHeader } from "@/components/legal/LegalHeader";
import { Callout } from "@/components/ui/Callout/Callout";
import { Heading } from "@/components/ui/Heading/Heading";
import { Prose } from "@/components/ui/Prose/Prose";
import { groupCards, GroupLinksBlock } from "@/components/blocks/RelatedLinks/GroupLinks";
import { COOKIES_PATH, getCookiesPage } from "@/content/legal";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * /cookies/ (docs/07 §2, P8.3) : liste réelle des traceurs d'après src/lib/mesure/README.md.
 * Aucun cookie, aucun script tiers, donc aucun bandeau : la page le dit et décrit les deux
 * réglages qui restent sur l'appareil. Si `traceurs.liste` se remplit un jour, le tableau
 * s'affiche à la place de la phrase « aucun ». check-legal compare les scripts tiers du rendu
 * à cette page. Textes : content/legal/cookies.json.
 */

export function generateMetadata(): Metadata {
  const { seo } = getCookiesPage();
  return pageMetadata({ titre: seo.titre, description: seo.description, chemin: COOKIES_PATH });
}

export default async function CookiesPage() {
  const page = getCookiesPage();

  const groupLinks = await groupCards(COOKIES_PATH);
  return (
    <main id="contenu">
      <LegalHeader
        ariane={page.ariane}
        h1={page.h1}
        chapo={page.chapo}
        maj={page.maj}
        majLibelle={page.maj_libelle}
      />

      <Section tone="white" aria-labelledby="reponse">
        <Heading level={2} id="reponse">
          {page.reponse.h2}
        </Heading>
        <Prose className="mt-4">
          {page.reponse.paragraphes.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </Prose>
      </Section>

      <Section tone="teal" aria-labelledby="traceurs">
        <Heading level={2} id="traceurs">
          {page.traceurs.h2}
        </Heading>
        <p className="mt-3">{page.traceurs.intro}</p>
        {page.traceurs.liste.length === 0 ? (
          <Callout
            variant="bon-a-savoir"
            title={page.traceurs.aucun}
            className="mt-6"
            data-traceurs="0"
          />
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table
              className="w-full border-collapse text-left text-small"
              data-traceurs={page.traceurs.liste.length}
            >
              <thead>
                <tr className="border-b-2 border-teal-700">
                  <th scope="col" className="p-3">
                    {page.traceurs.colonnes.nom}
                  </th>
                  <th scope="col" className="p-3">
                    {page.traceurs.colonnes.emetteur}
                  </th>
                  <th scope="col" className="p-3">
                    {page.traceurs.colonnes.finalite}
                  </th>
                  <th scope="col" className="p-3">
                    {page.traceurs.colonnes.duree}
                  </th>
                </tr>
              </thead>
              <tbody>
                {page.traceurs.liste.map((t) => (
                  <tr key={t.nom} className="border-b border-line align-top">
                    <th scope="row" className="p-3 font-bold">
                      {t.nom}
                    </th>
                    <td className="p-3">{t.emetteur}</td>
                    <td className="p-3">{t.finalite}</td>
                    <td className="p-3">{t.duree}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section tone="paper" aria-labelledby="reglages">
        <Heading level={2} id="reglages">
          {page.reglages_locaux.h2}
        </Heading>
        <p className="mt-3">{page.reglages_locaux.intro}</p>
        <dl className="m-0 mt-6 grid gap-4 md:grid-cols-2" data-reglages-locaux>
          {page.reglages_locaux.liste.map((r) => (
            <div key={r.nom} className="rounded-card border border-line bg-white p-5">
              <dt className="m-0 font-bold">{r.nom}</dt>
              <dd className="m-0 mt-1">{r.texte}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section tone="white" aria-labelledby="mesure">
        <Heading level={2} id="mesure">
          {page.mesure.h2}
        </Heading>
        <Prose className="mt-4">
          {page.mesure.paragraphes.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </Prose>
      </Section>

      <Section tone="paper" aria-labelledby="bandeau">
        <Heading level={2} id="bandeau">
          {page.bandeau.h2}
        </Heading>
        <p className="mt-3">{page.bandeau.texte}</p>
        <ul className="m-0 mt-6 flex list-none flex-wrap gap-x-8 gap-y-2 p-0">
          {page.liens.map((lien) => (
            <li key={lien.href} className="max-w-none">
              <Link href={lien.href} className="inline-flex min-h-12 items-center font-bold">
                {lien.libelle}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <GroupLinksBlock links={groupLinks} />
    </main>
  );
}
