import Link from "next/link";
import {
  Children,
  isValidElement,
  type AnchorHTMLAttributes,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import type { MDXComponents } from "mdx/types";
import { Callout } from "@/components/ui/Callout/Callout";
import { headingText, slugifyHeading, type ArticleHeading } from "@/content/article-meta";

/*
 * Composants du corps MDX d'un article (docs/06 §3, brief de rédaction §1) : les deux encarts
 * autorisés, `<ARetenir>` (Callout « À retenir ») et `<Attention>` (Callout « Attention »), les
 * intertitres `##` et `###` munis de l'ancre du sommaire, et les liens (composant `Link` pour
 * les chemins internes). Tout est rendu côté serveur.
 */

export interface ArticleMdxTexts {
  a_retenir: string;
  attention: string;
}

/** Texte brut des enfants React (chaînes et éléments imbriqués). */
export function textOf(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (isValidElement<{ children?: ReactNode }>(child)) return textOf(child.props.children);
      return "";
    })
    .join("");
}

function isInternal(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

function ArticleLink({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (href !== undefined && isInternal(href)) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  const external = href !== undefined && href.startsWith("http");
  return (
    <a href={href} rel={external ? "noopener noreferrer" : undefined} {...rest}>
      {children}
    </a>
  );
}

/**
 * Composants MDX d'un article. Les ancres des `##` sont celles du sommaire (`headings`, dans
 * l'ordre du corps) ; un intertitre absent du sommaire reçoit l'ancre calculée de son texte.
 */
export function articleMdxComponents(
  texts: ArticleMdxTexts,
  headings: readonly ArticleHeading[] = [],
): MDXComponents {
  const remaining = [...headings];
  const anchorFor = (children: ReactNode): string => {
    const text = headingText(textOf(children));
    const index = remaining.findIndex((heading) => heading.text === text);
    if (index >= 0) {
      const [heading] = remaining.splice(index, 1);
      if (heading) return heading.id;
    }
    return slugifyHeading(text) || "section";
  };
  return {
    h2: ({ children, ...rest }: ComponentPropsWithoutRef<"h2">) => (
      <h2 id={anchorFor(children)} className="heading-2 scroll-mt-24" {...rest}>
        {children}
      </h2>
    ),
    h3: ({ children, ...rest }: ComponentPropsWithoutRef<"h3">) => (
      <h3 className="heading-3 scroll-mt-24" {...rest}>
        {children}
      </h3>
    ),
    a: ArticleLink,
    ARetenir: ({ children }: { children?: ReactNode }) => (
      <Callout variant="retenir" title={texts.a_retenir} className="my-8" data-encart="a-retenir">
        {children}
      </Callout>
    ),
    Attention: ({ children }: { children?: ReactNode }) => (
      <Callout variant="attention" title={texts.attention} className="my-8" data-encart="attention">
        {children}
      </Callout>
    ),
  };
}
