import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { CaregiverCheck } from "@/components/blocks/CaregiverCheck/CaregiverCheck";
import { Section } from "@/components/layout/Section/Section";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { getCaregiverCheckPage, getInterfaceTexts } from "@/content/loader";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * « Où en êtes-vous ? » (docs/03 §7) : huit questions originales, trois niveaux de conseils,
 * mention « ce n'est pas un test médical » en tête, aucune donnée conservée ni transmise.
 * Se termine par « J'ai besoin de relais ». Contenu : content/pages/ou-en-etes-vous.json.
 */

export function generateMetadata(): Metadata {
  const { seo } = getCaregiverCheckPage();
  return pageMetadata({
    titre: seo.titre,
    description: seo.description,
    chemin: "/aidants/ou-en-etes-vous/",
  });
}

export default function CaregiverCheckPage() {
  const page = getCaregiverCheckPage();
  const texts = getInterfaceTexts();
  const crumbs = [
    { label: texts.service.publics.aidant, href: "/aidants/" },
    { label: page.ariane, href: "/aidants/ou-en-etes-vous/" },
  ];

  return (
    <main id="contenu" data-famille="outils">
      <div className="container-site pt-6">
        <Breadcrumb texts={texts.fil_ariane} items={crumbs} />
      </div>
      <Section tone="white" aria-labelledby="ou-en-etes-vous">
        <div className="max-w-prose">
          <p className="m-0 text-small font-bold tracking-wide text-teal-800 uppercase">
            {texts.service.publics.aidant}
          </p>
          <Heading level={1} id="ou-en-etes-vous" className="mt-3">
            {page.h1}
          </Heading>
          <Lead className="mt-5">{page.chapo}</Lead>
        </div>
        <div className="mt-8 max-w-prose">
          <CaregiverCheck page={page} />
        </div>
        <p className="m-0 mt-10">
          <Link href={page.retour.href} prefetch={false} className="font-bold">
            {page.retour.libelle}
          </Link>
        </p>
      </Section>
    </main>
  );
}
