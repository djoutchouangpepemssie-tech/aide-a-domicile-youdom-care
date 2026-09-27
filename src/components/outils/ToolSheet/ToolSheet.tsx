import { formatFrenchDate, SourcesList } from "@/components/blocks/SourcesList/SourcesList";
import { Callout } from "@/components/ui/Callout/Callout";
import { Heading } from "@/components/ui/Heading/Heading";
import { Icon } from "@/components/ui/Icon/Icon";
import type { InterfaceTexts } from "@/content/schemas";
import type { ToolItem, ToolPage, ToolSection } from "@/content/tools-schema";
import { cn } from "@/lib/cn";

/*
 * Le document imprimable (docs/06 §7, P7.7) : en-tête aux couleurs du site, mode d'emploi en
 * deux phrases, sections de cases à cocher, de champs à remplir à la main ou d'informations,
 * note de prudence, sources datées, pied de page (nom du site, adresse, « Document gratuit,
 * sans contrepartie »). À l'écran : une feuille blanche posée sur la page ; à l'impression et
 * dans le PDF : A4, deux colonnes, cases en vrai carré, lignes à remplir (src/styles/print.css).
 * Les cases et les lignes sont décoratives (`aria-hidden`) : le texte porte tout le sens, et
 * chaque liste annonce sa nature pour le lecteur d'écran. Rien n'est saisi ni collecté.
 */

export interface ToolSheetTexts {
  outils: InterfaceTexts["outils"];
  sources: { source_verifiee: string; source_consultee: string; lien_externe: string };
}

export interface ToolSheetProps {
  tool: ToolPage;
  brand: { nom: string; url: string };
  texts: ToolSheetTexts;
  className?: string;
}

export function slugifyHeading(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Adresse du site sans protocole ni barre finale, pour le pied de page imprimé. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function Lines({ count }: { count: number }) {
  return (
    <span className="tool-lines" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="tool-line" />
      ))}
    </span>
  );
}

function Item({ item }: { item: ToolItem }) {
  if (item.type === "case") {
    return (
      <li className="tool-item tool-item--case">
        <span className="tool-box" aria-hidden="true" />
        <span className="tool-item__body">
          <span>{item.texte}</span>
          {item.precision ? <span className="tool-item__precision">{item.precision}</span> : null}
        </span>
      </li>
    );
  }
  if (item.type === "champ") {
    const count = item.lignes ?? 1;
    return (
      <li className={cn("tool-item tool-item--champ", count === 1 && "tool-item--champ-inline")}>
        <span className="tool-item__label">{item.libelle}</span>
        <Lines count={count} />
      </li>
    );
  }
  return (
    <li className="tool-item tool-item--info">
      <span className="tool-item__label">{item.libelle}</span>
      <span className="tool-item__body">{item.texte}</span>
    </li>
  );
}

function SectionBlock({ section, texts }: { section: ToolSection; texts: ToolSheetTexts }) {
  const id = `outil-${slugifyHeading(section.h2)}`;
  const kinds = new Set(section.items.map((item) => item.type));
  const note = kinds.has("case")
    ? texts.outils.cases_note
    : kinds.has("champ")
      ? texts.outils.champs_note
      : null;
  return (
    <section className="tool-section" aria-labelledby={id}>
      <Heading level={2} id={id} visual={4} className="tool-section__title">
        {section.h2}
      </Heading>
      {section.intro ? <p className="tool-section__intro">{section.intro}</p> : null}
      {note ? <p className="sr-only">{note}</p> : null}
      <ul
        className={cn("tool-list", kinds.has("case") && !kinds.has("champ") && "tool-list--cases")}
      >
        {section.items.map((item, index) => (
          <Item key={`${item.type}-${index}`} item={item} />
        ))}
      </ul>
    </section>
  );
}

export function ToolSheet({ tool, brand, texts }: ToolSheetProps) {
  const { outils } = texts;
  return (
    <article className="tool-sheet" data-tool-sheet lang="fr">
      <header className="tool-sheet__head">
        <p className="tool-sheet__brand">
          <Icon name={tool.icone} size="md" tone="teal" />
          <span>
            {brand.nom} · {outils.sur_titre}
          </span>
        </p>
        <Heading level={1} visual={2} className="tool-sheet__title">
          {tool.h1}
        </Heading>
        <p className="tool-sheet__subtitle">{tool.sous_titre}</p>
        <section className="tool-sheet__howto" aria-labelledby="outil-mode-emploi">
          <Heading level={2} id="outil-mode-emploi" visual={4} className="tool-sheet__howto-title">
            {outils.mode_emploi_h2}
          </Heading>
          <p className="m-0">{tool.mode_emploi.join(" ")}</p>
        </section>
      </header>

      <div className="tool-sheet__body">
        {tool.sections.map((section) => (
          <SectionBlock key={section.h2} section={section} texts={texts} />
        ))}
      </div>

      {tool.prudence && tool.prudence.length > 0 ? (
        <Callout variant="attention" title={outils.prudence_h2} className="tool-sheet__prudence">
          {tool.prudence.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </Callout>
      ) : null}

      {tool.sources && tool.sources.length > 0 ? (
        <section className="tool-sheet__sources" aria-labelledby="outil-sources">
          <Heading level={2} id="outil-sources" visual={4} className="tool-section__title">
            {outils.sources_h2}
          </Heading>
          <SourcesList sources={tool.sources} texts={texts.sources} className="mt-3" />
        </section>
      ) : null}

      <footer className="tool-sheet__foot">
        <span className="font-bold">{brand.nom}</span>
        <span aria-hidden="true"> · </span>
        <span className="tabular-figures">{displayUrl(brand.url)}</span>
        <span aria-hidden="true"> · </span>
        <span>{outils.pied_de_page}</span>
        <span aria-hidden="true"> · </span>
        <span className="tabular-figures">
          {outils.mis_a_jour.replace("{date}", formatFrenchDate(tool.maj))}
        </span>
      </footer>
    </article>
  );
}
