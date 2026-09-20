import Link from "next/link";
import { Button } from "@/components/ui/Button/Button";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { Thread } from "@/components/ui/Thread/Thread";
import type { ThreadIllustrationName } from "@/components/ui/Thread/illustrations";

/*
 * Bannière (docs/02 §7 Hero, docs/01 §4 bloc 1) : sur-titre, H1 (quatre lignes au plus sur
 * mobile), chapô, deux boutons, lien téléphone, ligne de réassurance, illustration au fil.
 * Un seul bouton framboise : le principal.
 */

export interface HeroProps {
  surtitle: string;
  title: string;
  lead: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  /** Lien téléphone ; null si le numéro est inconnu (le lien se masque). */
  phone: { label: string; href: string } | null;
  reassurance: readonly string[];
  footnote?: { text: string; href: string };
  illustration?: ThreadIllustrationName;
}

export function Hero({
  surtitle,
  title,
  lead,
  primary,
  secondary,
  phone,
  reassurance,
  footnote,
  illustration = "maison",
}: HeroProps) {
  return (
    <div className="hero grid items-center gap-10 lg:grid-cols-[3fr_2fr]">
      <div>
        <p className="m-0 text-small font-bold tracking-wide text-teal-800 uppercase">{surtitle}</p>
        <Heading level={1} className="mt-3">
          {title}
        </Heading>
        <Lead className="mt-5">{lead}</Lead>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href={primary.href}>{primary.label}</Button>
          <Button href={secondary.href} variant="outline">
            {secondary.label}
          </Button>
        </div>
        {phone ? (
          <p className="m-0 mt-4">
            <Link
              href={phone.href}
              className="tabular-figures inline-flex min-h-12 items-center font-bold"
            >
              {phone.label}
            </Link>
          </p>
        ) : null}
        <ul className="m-0 mt-6 flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-small text-text-soft">
          {reassurance.map((item) => (
            <li key={item} className="flex max-w-none items-center gap-2">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-green-700"
              >
                <path d="m5 12 5 5 9-10" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
        {footnote ? (
          <p className="m-0 mt-2 text-small text-text-soft">
            <Link href={footnote.href}>{footnote.text}</Link>
          </p>
        ) : null}
      </div>
      <Thread illustration={illustration} className="mx-auto w-full max-w-sm lg:max-w-none" />
    </div>
  );
}
