import Link from "next/link";
import type { ReactNode } from "react";
import { Prose } from "@/components/ui/Prose/Prose";

/*
 * Rendu Markdown minimal et sûr de la zone éditoriale des pages locales (docs/04 §4,
 * anatomie 3). Le texte vient de content/local/{code}.json, écrit à la main : on ne compile
 * rien (pas de MDX, aucune expression), on ne rend que des paragraphes, des titres (le moins
 * profond → h3 sous le H2 « Vivre à domicile à … », le suivant → h4), des listes à puces et numérotées, du gras,
 * de l'italique et des liens. Tout le reste est du texte, échappé par React. Un lien interne
 * passe par `Link`, un lien externe est signalé (`rel`, texte pour le lecteur d'écran).
 */

export interface MarkdownProps {
  source: string;
  /** Niveau du premier titre (`##`) ; 3 sous un H2 de section. */
  headingLevel?: 3 | 4;
  /** Texte annonçant un lien externe (« lien externe »). */
  externalLabel?: string;
  className?: string;
}

type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; depth: 2 | 3; text: string }
  | { kind: "list"; ordered: boolean; items: string[] };

export function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" ").trim() });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ kind: "list", ordered: list.ordered, items: list.items });
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim().length === 0) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading?.[1] && heading[2]) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "heading", depth: heading[1].length as 2 | 3, text: heading[2].trim() });
      continue;
    }
    const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    const item = bullet?.[1] ?? numbered?.[1];
    if (item !== undefined) {
      flushParagraph();
      const ordered = numbered !== null && bullet === null;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(item.trim());
      continue;
    }
    if (list) {
      // Ligne de continuation d'un élément de liste.
      const last = list.items.length - 1;
      list.items[last] = `${list.items[last] ?? ""} ${line.trim()}`.trim();
      continue;
    }
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return blocks;
}

const inlinePattern = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_|\[[^\]]+\]\([^)\s]+\))/g;

function isSafeHref(href: string): boolean {
  return href.startsWith("/") || href.startsWith("#") || /^https?:\/\//i.test(href);
}

export function renderInline(
  text: string,
  externalLabel: string | undefined,
  key = "i",
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(inlinePattern)) {
    const start = match.index;
    const token = match[0];
    if (start > last) nodes.push(text.slice(last, start));
    const id = `${key}-${index}`;
    index += 1;
    if (token.startsWith("**")) {
      nodes.push(<strong key={id}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*") || token.startsWith("_")) {
      nodes.push(<em key={id}>{token.slice(1, -1)}</em>);
    } else {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      const label = link?.[1] ?? token;
      const href = link?.[2] ?? "";
      if (!isSafeHref(href)) {
        nodes.push(label);
      } else if (href.startsWith("/") || href.startsWith("#")) {
        nodes.push(
          <Link key={id} href={href} prefetch={false}>
            {label}
          </Link>,
        );
      } else {
        nodes.push(
          <a key={id} href={href} rel="noopener noreferrer">
            {label}
            {externalLabel ? <span className="sr-only"> ({externalLabel})</span> : null}
          </a>,
        );
      }
    }
    last = start + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source, headingLevel = 3, externalLabel, className }: MarkdownProps) {
  const blocks = parseBlocks(source);
  // Le titre le moins profond du texte devient `headingLevel` (h3 sous le H2 de la section),
  // qu'il soit écrit `##` ou `###` : aucun saut de hiérarchie (docs/07, check-seo).
  const minDepth = Math.min(
    ...blocks.flatMap((block) => (block.kind === "heading" ? [block.depth] : [])),
  );
  return (
    <Prose className={className} data-markdown="">
      {blocks.map((block, index) => {
        const key = `b-${index}`;
        if (block.kind === "heading") {
          const level = Math.min(6, headingLevel + block.depth - minDepth);
          const Tag = `h${level}` as "h3" | "h4" | "h5";
          return <Tag key={key}>{renderInline(block.text, externalLabel, key)}</Tag>;
        }
        if (block.kind === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag key={key}>
              {block.items.map((item, i) => (
                <li key={`${key}-${i}`}>{renderInline(item, externalLabel, `${key}-${i}`)}</li>
              ))}
            </Tag>
          );
        }
        return <p key={key}>{renderInline(block.text, externalLabel, key)}</p>;
      })}
    </Prose>
  );
}
