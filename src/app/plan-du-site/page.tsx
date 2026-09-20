import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { Section } from "@/components/layout/Section/Section";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { getInterfaceTexts, getSiteMapPage } from "@/content/loader";
import { pageMetadata } from "@/lib/seo/metadata";
import { buildSiteMap, type SiteMapEntry } from "./site-map";

/*
 * /plan-du-site/ (docs/04 §2 « Maillage », P5.5) : toutes les pages construites et indexables,
 * par groupe, en listes imbriquées (page principale, puis ses pages détaillées en retrait).
 * Contenu : content/pages/plan-du-site.json ; liste : site-map.ts.
 */

export const SITE_MAP_PATH = "/plan-du-site/";

export function generateMetadata(): Metadata {
  const { seo } = getSiteMapPage();
  return pageMetadata({ titre: seo.titre, description: seo.description, chemin: SITE_MAP_PATH });
}

function EntryList({ entries, nested = false }: { entries: SiteMapEntry[]; nested?: boolean }) {
  return (
    <ul
      className={nested ? "m-0 mt-2 list-disc pl-6" : "m-0 mt-4 flex list-none flex-col gap-3 p-0"}
    >
      {entries.map((entry) => (
        <li key={entry.href} className={nested ? "max-w-none" : "max-w-none"}>
          <Link
            href={entry.href}
            prefetch={false}
            className={
              nested
                ? "inline-flex min-h-12 items-center"
                : "inline-flex min-h-12 items-center font-bold"
            }
          >
            {entry.label}
          </Link>
          {entry.children && entry.children.length > 0 ? (
            <EntryList entries={entry.children} nested />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default async function SiteMapRoute() {
  const page = getSiteMapPage();
  const { fil_ariane } = getInterfaceTexts();
  const groups = await buildSiteMap();

  return (
    <main id="contenu">
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb texts={fil_ariane} items={[{ label: page.ariane }]} className="mb-6" />
        <Heading level={1} id="titre">
          {page.h1}
        </Heading>
        <Lead className="mt-5">{page.chapo}</Lead>
      </Section>

      <Section tone="white" aria-label={page.ariane}>
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3" data-plan-du-site>
          {groups.map((group) => (
            <nav key={group.id} aria-labelledby={`groupe-${group.id}`} data-groupe={group.id}>
              <Heading level={2} id={`groupe-${group.id}`} visual={3}>
                {group.title}
              </Heading>
              <EntryList entries={group.entries} />
            </nav>
          ))}
        </div>
      </Section>
    </main>
  );
}
