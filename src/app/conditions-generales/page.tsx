import type { Metadata } from "next";
import Link from "next/link";
import { MandataireNotice } from "@/components/blocks/MandataireNotice/MandataireNotice";
import { Section } from "@/components/layout/Section/Section";
import { LegalHeader } from "@/components/legal/LegalHeader";
import { Heading } from "@/components/ui/Heading/Heading";
import { Prose } from "@/components/ui/Prose/Prose";
import { groupCards, GroupLinksBlock } from "@/components/blocks/RelatedLinks/GroupLinks";
import {
  CONDITIONS_GENERALES_PATH,
  formatLegalDate,
  getConditionsGenerales,
} from "@/content/legal";
import { getInterfaceTexts, getSiteConfig } from "@/content/loader";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * /conditions-generales/ (docs/07 §2, P8.3) : documents PDF fournis par Arcel (Q-LEGAL-3),
 * listés depuis content/legal/conditions-generales.json > documents. Liste vide aujourd'hui :
 * la page explique que les conditions prestataire et mandataire sont remises avec chaque devis
 * et seront publiées ici. La mention légale du mode mandataire (MandataireNotice, texte de
 * content/interface.json) n'apparaît que si ce mode est proposé (site.config.modes_intervention).
 */

export function generateMetadata(): Metadata {
  const { seo } = getConditionsGenerales();
  return pageMetadata({
    titre: seo.titre,
    description: seo.description,
    chemin: CONDITIONS_GENERALES_PATH,
  });
}

export default async function ConditionsGeneralesPage() {
  const page = getConditionsGenerales();
  const { modes_intervention } = getSiteConfig();
  const { mandataire_notice } = getInterfaceTexts();
  const hasMandataire = modes_intervention.includes("mandataire");

  const groupLinks = await groupCards("/conditions-generales/");
  return (
    <main id="contenu">
      <LegalHeader
        ariane={page.ariane}
        h1={page.h1}
        chapo={page.chapo}
        maj={page.maj}
        majLibelle={page.maj_libelle}
      />

      <Section tone="white" aria-labelledby="documents">
        <Heading level={2} id="documents">
          {page.documents_h2}
        </Heading>
        {page.documents.length > 0 ? (
          <ul className="m-0 mt-6 grid list-none gap-3 p-0" data-documents={page.documents.length}>
            {page.documents.map((doc) => (
              <li key={doc.fichier} className="max-w-none">
                <a
                  href={doc.fichier}
                  className="inline-flex min-h-12 items-center font-bold"
                  type="application/pdf"
                >
                  {page.document_libelle
                    .replace("{libelle}", doc.libelle)
                    .replace("{mode}", page.modes[doc.mode])
                    .replace("{date}", formatLegalDate(doc.maj))}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <Prose className="mt-4" data-documents="0">
            {page.attente.paragraphes.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </Prose>
        )}
      </Section>

      {hasMandataire ? (
        <Section tone="teal" aria-labelledby="mandataire" data-mode="mandataire">
          <Heading level={2} id="mandataire">
            {page.mandataire.h2}
          </Heading>
          <Prose className="mt-4">
            {page.mandataire.paragraphes.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </Prose>
          <MandataireNotice texts={mandataire_notice} className="mt-6 max-w-3xl" />
        </Section>
      ) : null}

      <Section tone="paper" aria-labelledby="devis">
        <Heading level={2} id="devis">
          {page.devis.h2}
        </Heading>
        <Prose className="mt-4">
          {page.devis.paragraphes.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </Prose>
        <ul className="m-0 mt-8 flex list-none flex-wrap gap-x-8 gap-y-2 p-0">
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
