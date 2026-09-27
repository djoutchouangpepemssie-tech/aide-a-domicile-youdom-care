"use client";

import { Button, type ButtonVariant } from "@/components/ui/Button/Button";

/*
 * Bouton « J'imprime cet outil » (docs/06 §7) : la seule île client des pages d'outils. Il
 * ouvre la boîte d'impression du navigateur ; la feuille d'impression (src/styles/print.css)
 * fait le reste. Sans JavaScript, le lien « Je télécharge le PDF » voisin reste disponible.
 */
export function PrintButton({
  children,
  variant = "primary",
  className,
}: {
  children: string;
  variant?: ButtonVariant;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={() => {
        window.print();
      }}
    >
      {children}
    </Button>
  );
}
