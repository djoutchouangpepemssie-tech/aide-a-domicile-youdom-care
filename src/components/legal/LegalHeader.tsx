import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { Section } from "@/components/layout/Section/Section";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { formatLegalDate } from "@/content/legal";
import { getInterfaceTexts } from "@/content/loader";

/*
 * En-tête commun des pages légales (P8.3) : fil d'Ariane (avec son JSON-LD BreadcrumbList),
 * H1, chapô et date de dernière révision lisible par une machine (`<time>`).
 */

export interface LegalHeaderProps {
  ariane: string;
  h1: string;
  chapo: string;
  /** Date ISO de la dernière révision du contenu. */
  maj: string;
  /** Libellé contenant {date}. */
  majLibelle: string;
}

export function LegalHeader({ ariane, h1, chapo, maj, majLibelle }: LegalHeaderProps) {
  const { fil_ariane } = getInterfaceTexts();
  const [before, after] = majLibelle.split("{date}");
  return (
    <Section tone="paper" aria-labelledby="titre">
      <Breadcrumb texts={fil_ariane} items={[{ label: ariane }]} className="mb-6" />
      <Heading level={1} id="titre">
        {h1}
      </Heading>
      <Lead className="mt-5">{chapo}</Lead>
      <p className="m-0 mt-4 text-small text-text-soft" data-maj>
        {before}
        <time dateTime={maj}>{formatLegalDate(maj)}</time>
        {after}
      </p>
    </Section>
  );
}
