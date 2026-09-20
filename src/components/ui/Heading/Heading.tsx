import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export type HeadingLevel = 1 | 2 | 3 | 4;

export interface HeadingProps extends ComponentPropsWithoutRef<"h1"> {
  /** Niveau sémantique : un seul H1 par page, sans saut de niveau. */
  level: HeadingLevel;
  /** Niveau visuel de docs/02 §3, par défaut identique au niveau sémantique. */
  visual?: HeadingLevel;
}

const tags = { 1: "h1", 2: "h2", 3: "h3", 4: "h4" } as const;

export function Heading({ level, visual = level, className, children, ...rest }: HeadingProps) {
  const Tag = tags[level];
  return (
    <Tag className={cn(`heading-${visual}`, className)} {...rest}>
      {children}
    </Tag>
  );
}
