"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button/Button";

/*
 * Île client du gabarit d'article (docs/06 §3, point 10) : copie du lien de la page dans le
 * presse-papiers et « Version imprimable » (window.print, feuille d'impression du site). Aucun
 * script tiers, aucun réseau social. Le résultat de la copie est annoncé dans une zone `status`.
 * Le lien mailto voisin est rendu par le serveur (ArticleTemplate).
 */

export interface ShareActionsTexts {
  copier_lien: string;
  lien_copie: string;
  lien_non_copie: string;
  imprimer: string;
}

export function ShareActions({ url, texts }: { url: string; texts: ShareActionsTexts }) {
  const [status, setStatus] = useState<string>("");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus(texts.lien_copie);
    } catch {
      setStatus(texts.lien_non_copie);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3" data-share-actions>
      <Button variant="outline" onClick={copy}>
        {texts.copier_lien}
      </Button>
      <Button variant="outline" onClick={() => window.print()} data-print-button>
        {texts.imprimer}
      </Button>
      <p role="status" className="m-0 basis-full text-small text-text-soft">
        {status}
      </p>
    </div>
  );
}
