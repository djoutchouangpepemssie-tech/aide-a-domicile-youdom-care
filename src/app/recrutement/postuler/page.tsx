import type { Metadata } from "next";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { CandidatureForm } from "@/components/forms/SpecialForms/CandidatureForm";
import { Section } from "@/components/layout/Section/Section";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { groupCards, GroupLinksBlock } from "@/components/blocks/RelatedLinks/GroupLinks";
import {
  getInterfaceTexts,
  getNavigation,
  getRecruitmentPage,
  getSiteConfig,
} from "@/content/loader";
import { APPLY_PATH, listLiveOffers, RECRUITMENT_PATH } from "@/content/offres";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * /recrutement/postuler/ (docs/05 §2 `candidature`, P8.2) : candidature en deux minutes, CV en
 * pièce jointe. Page statique ; l'offre visée arrive par `?offre=slug`, lue côté client. Le lien
 * vers la politique de confidentialité est celui du pied de page (page d'un autre lot).
 */

export function generateMetadata(): Metadata {
  const { postuler } = getRecruitmentPage();
  return pageMetadata({
    titre: postuler.seo.titre,
    description: postuler.seo.description,
    chemin: APPLY_PATH,
  });
}

export default async function ApplyPage() {
  const page = getRecruitmentPage();
  const texts = getInterfaceTexts();
  const { contact, zones } = getSiteConfig();
  const navigation = getNavigation();
  const offers = await listLiveOffers();
  const confidentialite =
    navigation.pied_de_page.legal.find((l) => /confidentialit/i.test(l.libelle))?.href ??
    "/politique-de-confidentialite/";

  const groupLinks = await groupCards(APPLY_PATH);
  return (
    <main id="contenu">
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb
          texts={texts.fil_ariane}
          items={[{ label: page.ariane, href: RECRUITMENT_PATH }, { label: page.postuler.ariane }]}
          className="mb-6"
        />
        <Heading level={1} id="titre">
          {page.postuler.h1}
        </Heading>
        <Lead className="mt-5">{page.postuler.chapo}</Lead>
      </Section>
      <Section tone="white" aria-label={page.postuler.ariane}>
        <div className="max-w-2xl">
          <CandidatureForm
            texts={{
              ...texts.formulaires,
              recherche: texts.recherche_commune,
              planning: texts.planning,
            }}
            recrutement={texts.recrutement}
            page={page.postuler}
            departements={zones.map((zone) => ({ code: zone.code, nom: zone.nom }))}
            offres={Object.fromEntries(offers.map((o) => [o.offer.slug, o.offer.titre]))}
            phone={contact.telephone_principal}
            confidentialiteHref={confidentialite}
          />
        </div>
      </Section>

      <GroupLinksBlock links={groupLinks} />
    </main>
  );
}
