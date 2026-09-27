import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { Commitments } from "@/components/blocks/Commitments/Commitments";
import { Section } from "@/components/layout/Section/Section";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { Prose } from "@/components/ui/Prose/Prose";
import { Thread } from "@/components/ui/Thread/Thread";
import { groupCards, GroupLinksBlock } from "@/components/blocks/RelatedLinks/GroupLinks";
import { getAbout, getCommitments, getInterfaceTexts, getSiteConfig } from "@/content/loader";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * « À propos » (docs/03 §9) : manifeste de docs/01 §10, engagements (validés seulement en
 * production), histoire et équipe masquées tant qu'Arcel ne les fournit pas (Q-CONTENU-1),
 * labels réellement détenus, territoire, charte éditoriale.
 */

export function generateMetadata(): Metadata {
  const { a_propos } = getAbout();
  return pageMetadata({
    titre: a_propos.seo.titre,
    description: a_propos.seo.description,
    chemin: "/a-propos/",
  });
}

export default async function AboutPage() {
  const { a_propos: page } = getAbout();
  const { marque, agences, labels } = getSiteConfig();
  const { engagements } = getCommitments();
  const { fil_ariane, pied_de_page } = getInterfaceTexts();
  const heldLabels = labels.filter((label) => label.detenu === true);
  const items = engagements
    .filter((e): e is typeof e & { texte: string } => e.texte !== null)
    .map((e) => ({ engagement: e.code, titre: e.titre, texte: e.texte }));

  const groupLinks = await groupCards("/a-propos/");
  return (
    // D-032 : scène de la famille « entreprise ».
    <main id="contenu" data-famille="entreprise">
      <Section tone="paper" aria-labelledby="titre" className="scene scene-soutenu">
        <Breadcrumb texts={fil_ariane} items={[{ label: page.ariane }]} className="mb-6" />
        <div className="grid items-center gap-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <Heading level={1} id="titre">
              {page.h1}
            </Heading>
            <Lead className="mt-5">{page.chapo}</Lead>
          </div>
          <Thread illustration="mains" className="mx-auto w-full max-w-xs lg:max-w-none" />
        </div>
      </Section>

      <Section tone="white" aria-labelledby="manifeste">
        <Heading level={2} id="manifeste">
          {page.manifeste.h2}
        </Heading>
        <Prose className="mt-6 text-lead">
          {page.manifeste.paragraphes.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <p className="heading-3 text-teal-900">{marque.signature}</p>
        </Prose>
      </Section>

      <Section tone="teal" aria-labelledby="engagements">
        <Heading level={2} id="engagements">
          {page.engagements.h2}
        </Heading>
        <Lead className="mt-3">{page.engagements.texte}</Lead>
        <Commitments
          aria-labelledby="engagements"
          className="mt-8"
          items={items}
          commitments={engagements}
        />
        <p className="m-0 mt-8">
          <Link href="/a-propos/nos-engagements/" className="font-bold">
            {page.engagements.lien}
          </Link>
        </p>
      </Section>

      {page.histoire ? (
        <Section tone="paper" aria-labelledby="histoire">
          <Heading level={2} id="histoire">
            {page.histoire.h2}
          </Heading>
          <Prose className="mt-6">
            {page.histoire.paragraphes.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </Prose>
        </Section>
      ) : null}

      {page.equipe ? (
        <Section tone="white" aria-labelledby="equipe">
          <Heading level={2} id="equipe">
            {page.equipe.h2}
          </Heading>
          <ul className="m-0 mt-8 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {page.equipe.membres.map((membre) => (
              <li
                key={membre.nom}
                className="max-w-none rounded-card border border-line bg-white p-6 shadow-1"
              >
                <p className="m-0 font-bold">{membre.nom}</p>
                <p className="m-0 text-small text-text-soft">{membre.fonction}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section tone={page.histoire || page.equipe ? "sand" : "paper"} aria-labelledby="territoire">
        <Heading level={2} id="territoire">
          {page.territoire.h2}
        </Heading>
        <Lead className="mt-3">
          {page.territoire.texte.replace(
            "{agences}",
            new Intl.NumberFormat("fr-FR").format(agences.length),
          )}
        </Lead>
        <p className="m-0 mt-6">
          <Link href={page.territoire.href} className="font-bold">
            {page.territoire.lien}
          </Link>
        </p>
        {heldLabels.length > 0 ? (
          <div className="mt-8">
            <Heading level={3} visual={4}>
              {pied_de_page.labels}
            </Heading>
            <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
              {heldLabels.map((label) => (
                <li
                  key={label.id}
                  className="max-w-none rounded-full bg-teal-50 px-3 py-1 text-small font-bold"
                >
                  {label.nom}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <Section tone="white" aria-labelledby="charte">
        <Heading level={2} id="charte">
          {page.charte.h2}
        </Heading>
        <Lead className="mt-3">{page.charte.texte}</Lead>
        <p className="m-0 mt-6">
          <Link href="/a-propos/charte-editoriale/" className="font-bold">
            {page.charte.lien}
          </Link>
        </p>
      </Section>

      <GroupLinksBlock links={groupLinks} />
    </main>
  );
}
