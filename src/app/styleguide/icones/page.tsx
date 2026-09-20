import type { Metadata } from "next";
import { Heading } from "@/components/ui/Heading/Heading";
import { Icon, type IconSize, type IconTone } from "@/components/ui/Icon/Icon";
import { iconGroups, iconNames, icons } from "@/components/ui/Icon/icons";
import { Lead } from "@/components/ui/Lead/Lead";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  titre: "Icônes au fil — Guide de styles",
  description: "Page de travail : le jeu d'icônes au fil, par groupe, taille et ton.",
  chemin: "/styleguide/icones/",
  noindex: true,
});

const sizes: { id: IconSize; label: string }[] = [
  { id: "sm", label: "20 px" },
  { id: "md", label: "24 px" },
  { id: "lg", label: "32 px" },
];

const tones: { id: IconTone; label: string; dark: boolean }[] = [
  { id: "teal", label: "teal-700 sur fond clair", dark: false },
  { id: "ink", label: "ink sur fond clair", dark: false },
  { id: "white", label: "white sur fond sombre", dark: true },
];

export default function IconesPage() {
  return (
    <main id="contenu" className="container-site py-12">
      <p className="text-small text-text-soft">Page de travail, non indexée.</p>
      <Heading level={1}>Icônes au fil</Heading>
      <Lead className="mt-4">
        {iconNames.length} icônes dessinées d’un trait continu, ouvert, avec un seul nœud framboise.
        Décoratives : le texte voisin dit toujours ce qu’elles montrent.
      </Lead>
      <p className="mt-4 max-w-prose">
        Grille de 24 px, marge de 2 px, trait de 2 px sur ordinateur et 1,75 px sur mobile
        (l’épaisseur ne change pas avec la taille). Règles complètes dans{" "}
        <code>docs/design/ICONES.md</code>.
      </p>

      <section aria-labelledby="tailles" className="mt-12">
        <Heading level={2} id="tailles">
          Tailles et tons
        </Heading>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {tones.map((tone) => (
            <div
              key={tone.id}
              className={
                tone.dark
                  ? "rounded-card bg-footer-bg p-5 text-footer-text"
                  : "rounded-card border border-line bg-white p-5"
              }
            >
              <p className="text-small font-bold">{tone.label}</p>
              <ul className="m-0 mt-4 flex list-none items-end gap-6 p-0">
                {sizes.map((size) => (
                  <li key={size.id} className="max-w-none text-center">
                    <Icon name="maison" size={size.id} tone={tone.id} />
                    <span className="mt-2 block text-small">{size.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="usage" className="mt-12">
        <Heading level={2} id="usage">
          Dans une phrase
        </Heading>
        <p className="mt-4 flex items-center gap-2">
          <Icon name="telephone" size="sm" tone="ink" />
          <span>
            Une icône <code>sm</code> en ton <code>ink</code> s’aligne sur le texte courant.
          </span>
        </p>
        <p className="mt-2 flex items-center gap-2">
          <Icon name="rappel" size="sm" label="Être rappelé" />
          <span>
            Avec <code>label</code>, elle devient une image nommée (
            <code>role=&quot;img&quot;</code>).
          </span>
        </p>
      </section>

      {iconGroups.map((group) => {
        const names = iconNames.filter((name) => icons[name].groupe === group.id);
        return (
          <section key={group.id} aria-labelledby={`groupe-${group.id}`} className="mt-12">
            <Heading level={2} id={`groupe-${group.id}`}>
              {group.label}
            </Heading>
            <p className="mt-2 text-small text-text-soft">
              {names.length} icônes. Chaque case montre les trois tons : teal et encre sur fond
              clair, blanc sur fond sombre.
            </p>
            <ul className="m-0 mt-6 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-4">
              {names.map((name) => (
                <li
                  key={name}
                  className="max-w-none rounded-card border border-line bg-white p-4 text-center"
                >
                  <div className="flex items-center justify-center gap-3">
                    <Icon name={name} size="lg" />
                    <Icon name={name} size="lg" tone="ink" />
                    <span className="inline-flex rounded-field bg-footer-bg p-1.5">
                      <Icon name={name} size="lg" tone="white" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-3">
                    <Icon name={name} size="sm" />
                    <Icon name={name} size="sm" tone="ink" />
                    <span className="inline-flex rounded-field bg-footer-bg p-1">
                      <Icon name={name} size="sm" tone="white" />
                    </span>
                  </div>
                  <code className="mt-3 block text-small text-text-soft">{name}</code>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
