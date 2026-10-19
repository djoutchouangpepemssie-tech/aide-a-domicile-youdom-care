"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { api } from "@/lib/bureau/api";
import { cn } from "@/lib/cn";

/*
 * La barre du bureau : le strict nécessaire pour se déplacer et se déconnecter. Pas de menu
 * déroulant, pas d'icône sans texte — un outil qu'on utilise cinquante fois par jour se navigue
 * au clavier, et le lien de la page courante se dit (`aria-current`), il ne se devine pas à la
 * couleur.
 */

const LIENS = [
  { href: "/bureau/semaine/", libelle: "La semaine" },
  { href: "/bureau/", libelle: "Accueil" },
] as const;

export function BureauBarre() {
  const chemin = usePathname();
  const router = useRouter();

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex w-full max-w-[90rem] flex-wrap items-center gap-4 px-4 py-3 lg:px-8">
        <p className="m-0 font-bold">Bureau Youdom Care</p>
        <nav aria-label="Bureau">
          <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
            {LIENS.map((lien) => {
              const courant = chemin === lien.href;
              return (
                <li key={lien.href}>
                  <Link
                    href={lien.href}
                    aria-current={courant ? "page" : undefined}
                    className={cn("underline", courant && "font-bold")}
                  >
                    {lien.libelle}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <button
          type="button"
          className="ml-auto underline"
          onClick={() => {
            api.deconnecter();
            router.push("/bureau/connexion/");
          }}
        >
          Se déconnecter
        </button>
      </div>
    </header>
  );
}
