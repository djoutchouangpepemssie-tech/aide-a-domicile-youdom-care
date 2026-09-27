import { getLexiqueTerm, listLexiqueTerms } from "@/content/lexique";
import { getLexiquePage, getSiteConfig } from "@/content/loader";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

/* Une image par terme du lexique : le terme et son développé, mêmes paramètres que la page. */

type TermImageProps = { params: Promise<{ slug: string }> };

export const alt = ogAlt(getSiteConfig().marque.signature);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export async function generateStaticParams() {
  const terms = await listLexiqueTerms();
  return terms.map((term) => ({ slug: term.slug }));
}

/** Titre de l'image : « APA — Allocation personnalisée d'autonomie », ou le terme seul. */
export function lexiqueOgTitle(term: { terme: string; developpe?: string }): string {
  return term.developpe ? `${term.terme} — ${term.developpe}` : term.terme;
}

export default async function Image({ params }: TermImageProps) {
  const { slug } = await params;
  const term = await getLexiqueTerm(slug);
  return renderOgImage({
    title: term ? lexiqueOgTitle(term) : getLexiquePage().h1,
    illustration: "mains",
  });
}
