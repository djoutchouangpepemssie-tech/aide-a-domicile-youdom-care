import type { Metadata } from "next";
import Link from "next/link";
import { SiteConversionRail } from "@/components/blocks/ConversionRail/SiteConversionRail";
import { Callout } from "@/components/ui/Callout/Callout";
import { Card } from "@/components/ui/Card/Card";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { TextField } from "@/components/ui/TextField/TextField";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  titre: "Guide de styles — Rail de conversion",
  description: "Page de travail : le rail de conversion et ses variantes selon la page.",
  chemin: "/styleguide/rail/",
  noindex: true,
});

/*
 * Page de travail (noindex, exclue du plan de site comme /styleguide/) : le rail de conversion
 * en situation, dans la grille à deux colonnes prévue pour le gabarit service. Les sections
 * ci-dessous ne portent aucun fait Youdom Care : elles donnent de la hauteur pour faire défiler.
 */

const sections = [
  { id: "situations", label: "Vous vous reconnaissez ?" },
  { id: "actions", label: "Ce que nous faisons, concrètement" },
  { id: "stades", label: "Un accompagnement qui évolue" },
  { id: "semaine", label: "Exemple de semaine" },
  { id: "suivi", label: "Le suivi" },
  { id: "proches", label: "Et pour vous, les proches" },
  { id: "intervenants", label: "Qui intervient ?" },
  { id: "frontiere", label: "Ce que nous ne faisons pas" },
  { id: "cout", label: "Combien ça coûte, quelles aides ?" },
  { id: "faq", label: "Questions fréquentes" },
] as const;

const filler = [
  "Section de démonstration. Le texte n'a pas d'autre rôle que de donner de la hauteur à la page pour observer le rail au défilement.",
  "Sur ordinateur, à partir de 64 rem, le rail reste collé sous l'en-tête pendant toute la lecture. Sur mobile, il n'existe pas : la barre basse porte les mêmes actions.",
  "Quand la section du formulaire entre dans l'écran, le rail s'efface : le formulaire porte ses propres boutons.",
] as const;

export default function RailPage() {
  return (
    <main id="contenu" className="container-site py-12">
      <p className="text-small text-text-soft">
        Page de travail, non indexée. <Link href="/styleguide/">Retour au guide de styles</Link>
      </p>
      <Heading level={1}>Rail de conversion</Heading>
      <Lead className="mt-4">
        Une carte de contact discrète, collante, qui s’efface devant le formulaire.
      </Lead>

      <Callout variant="retenir" title="Ce que montre cette page" className="mt-8">
        <ul>
          <li>Téléphone cliquable, bouton contour « Être rappelé(e) », lien vers le formulaire.</li>
          <li>
            Une ligne de réassurance reprise du contenu du site ; ni délai, ni compteur, ni avis.
          </li>
          <li>
            Masqué sous 64 rem, masqué quand la section « Décrire votre situation » est visible.
          </li>
          <li>Sans JavaScript, le rail reste visible ; en mode confort, le fondu est coupé.</li>
        </ul>
      </Callout>

      <div className="mt-12 lg:grid lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start lg:gap-12">
        <div>
          {sections.map((section, index) => (
            <section
              key={section.id}
              aria-labelledby={section.id}
              className={index === 0 ? undefined : "mt-16"}
            >
              <Heading level={2} id={section.id}>
                {section.label}
              </Heading>
              {filler.map((text) => (
                <p key={text} className="mt-4">
                  {text}
                </p>
              ))}
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Card>
                  <Heading level={3} visual={4}>
                    Carte de démonstration
                  </Heading>
                  <p className="mt-2 text-small">Le rail ne se superpose jamais au contenu.</p>
                </Card>
                <Card>
                  <Heading level={3} visual={4}>
                    Seconde carte
                  </Heading>
                  <p className="mt-2 text-small">La colonne de droite lui est réservée.</p>
                </Card>
              </div>
            </section>
          ))}

          <section id="formulaire" aria-labelledby="formulaire-titre" className="mt-16">
            <Heading level={2} id="formulaire-titre">
              Décrire votre situation
            </Heading>
            <p className="mt-3">
              Ici, le formulaire du cas. Dès que cette section entre dans l’écran, le rail se retire
              : ses boutons feraient doublon.
            </p>
            <Card className="mt-6">
              <form action="#formulaire" method="get" className="flex flex-col gap-4">
                <TextField label="Votre prénom" name="prenom" autoComplete="given-name" />
                <TextField label="Votre téléphone" name="telephone" type="tel" autoComplete="tel" />
                <p className="m-0 text-small text-text-soft">
                  Démonstration : ce formulaire n’envoie rien.
                </p>
              </form>
            </Card>
          </section>
        </div>

        <SiteConversionRail formHref="#formulaire" formId="formulaire" />
      </div>
    </main>
  );
}
