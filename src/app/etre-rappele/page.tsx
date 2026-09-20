import type { Metadata } from "next";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { RappelForm } from "@/components/forms/RappelForm/RappelForm";
import { Section } from "@/components/layout/Section/Section";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { getCallbackPage, getInterfaceTexts, getNavigation, getSiteConfig } from "@/content/loader";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import { pageTitle } from "@/lib/seo/title";
import { MotiveNotice } from "./MotiveNotice";

/*
 * /etre-rappele/ (docs/05 §2) : le rappel en trente secondes, ouvert depuis l'en-tête, la barre
 * mobile et la fin de chaque page. Page statique : `?commune=92062` (code INSEE) est lu par le
 * champ commune côté client ; `?motif=inconnu` (choix « Je ne sais pas encore » de l'accueil)
 * affiche le message correspondant au-dessus du formulaire (`MotiveNotice`).
 */

export function generateMetadata(): Metadata {
  const page = getCallbackPage();
  const { marque } = getSiteConfig();
  return {
    title: pageTitle(page.seo.titre, marque.nom),
    description: page.seo.description,
    alternates: { canonical: "/etre-rappele/" },
  };
}

export default function CallbackPage() {
  const page = getCallbackPage();
  const { formulaires, recherche_commune, fil_ariane } = getInterfaceTexts();
  const { contact } = getSiteConfig();
  const navigation = getNavigation();
  const phone = contact.telephone_principal;
  const telHref = phone ? toTelHref(phone) : null;
  const confidentialite =
    navigation.pied_de_page.legal.find((l) => /confidentialit/i.test(l.libelle))?.href ??
    "/politique-de-confidentialite/";
  const appel = page.appel_texte.split("{téléphone}");

  return (
    <main id="contenu">
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb texts={fil_ariane} items={[{ label: page.ariane }]} className="mb-6" />
        <Heading level={1} id="titre">
          {page.h1}
        </Heading>
        <Lead className="mt-5">{page.chapo}</Lead>
      </Section>

      <Section tone="white" aria-label={page.h1}>
        <div className="max-w-2xl">
          <MotiveNotice messages={page.motifs} className="mb-8" />
          <RappelForm
            texts={{ ...formulaires, ...formulaires.rappel, recherche: recherche_commune }}
            phone={phone}
            confidentialiteHref={confidentialite}
          />
        </div>
      </Section>

      {phone && telHref ? (
        <Section tone="teal" aria-labelledby="appel">
          <Heading level={2} id="appel">
            {page.appel_h2}
          </Heading>
          <p className="mt-3">
            {appel[0]}
            <a href={telHref} className="font-bold">
              {formatFrenchPhone(phone)}
            </a>
            {appel[1]}
          </p>
        </Section>
      ) : null}
    </main>
  );
}
