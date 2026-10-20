import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * L'application de l'intervenante — « le terrain ».
 *
 * Elle se tient d'une main, sur un téléphone, souvent dehors et parfois sans réseau. D'où quatre
 * partis pris qui la distinguent du bureau :
 *
 * - **une colonne, de grandes cibles** : pas de tableau, pas de menu, un geste par écran ;
 * - **aucune donnée de santé**, aucune information sur la personne accompagnée au-delà de ce qu'il
 *   faut pour arriver et pointer : le code du foyer, l'adresse, l'horaire, la nature de la visite ;
 * - **les pointages survivent au manque de réseau** (`src/lib/terrain/pointages.ts`) ;
 * - **hors des moteurs de recherche**, comme le bureau (`neverIndexedPaths`).
 */

export const metadata = pageMetadata({
  titre: "Ma tournée",
  description: "Application des intervenants Youdom Care.",
  chemin: "/terrain/",
});

export default function TerrainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="sur-sable min-h-screen bg-sand">
      <main id="contenu" className="mx-auto w-full max-w-[40rem] px-4 py-6">
        {children}
      </main>
    </div>
  );
}
