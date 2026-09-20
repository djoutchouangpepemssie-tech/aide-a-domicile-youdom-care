import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

/** Chapô : une phrase ou deux sous le titre, jamais plus de 30 mots par phrase (docs/07 §7). */
export function Lead({ className, children, ...rest }: ComponentPropsWithoutRef<"p">) {
  return (
    <p className={cn("lead", className)} {...rest}>
      {children}
    </p>
  );
}
