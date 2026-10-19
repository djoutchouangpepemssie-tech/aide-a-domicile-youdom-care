import type { ReactNode } from "react";
import { BureauBarre } from "@/components/bureau/BureauBarre/BureauBarre";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * Le back-office — « le bureau ». C'est un outil de travail, pas une page du site : pas de
 * bannière, pas d'argumentaire, pas de bouton d'appel. L'habillage public se retire de lui-même
 * (`ChromePublic`), et `/bureau/` est dans `neverIndexedPaths`, donc hors plans de site, hors
 * robots.txt, et en `noindex`.
 *
 * Toutes les données arrivent **depuis le navigateur**, directement à l'API certifiée HDS
 * (`ARCHITECTURE.md` §4.2) : aucune page de ce dossier ne lit la base côté serveur, et Vercel ne
 * voit donc jamais une donnée de foyer.
 */

export const metadata = pageMetadata({
  titre: "Bureau",
  description: "Espace de travail des équipes Youdom Care.",
  chemin: "/bureau/",
});

export default function BureauLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-sand">
      <BureauBarre />
      <main id="contenu" className="mx-auto w-full max-w-[90rem] px-4 py-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
