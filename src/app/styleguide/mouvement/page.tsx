import type { Metadata } from "next";
import Link from "next/link";
import { CountUp } from "@/components/motion/CountUp/CountUp";
import { HeroScene } from "@/components/motion/HeroScene/HeroScene";
import { Parallax } from "@/components/motion/Parallax/Parallax";
import { Reveal } from "@/components/motion/Reveal/Reveal";
import { Tilt } from "@/components/motion/Tilt/Tilt";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "@/components/ui/Callout/Callout";
import { Card } from "@/components/ui/Card/Card";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { MotionSimulator } from "./MotionSimulator";

export const metadata: Metadata = {
  title: "Guide de styles — Mouvement — Youdom Care",
  robots: { index: false, follow: false },
};

/*
 * Page de travail (noindex, exclue du plan de site comme /styleguide/) : chaque composant de
 * mouvement, un bouton pour simuler le mouvement réduit, le rappel du budget (D-019).
 * Les chiffres ci-dessous sont des valeurs d'exemple, sans rapport avec Youdom Care.
 */

const sections = [
  { id: "reglages", label: "Réglages et budget" },
  { id: "reveal", label: "Reveal : révélation au défilement" },
  { id: "countup", label: "CountUp : chiffre qui se compte" },
  { id: "tilt", label: "Tilt : carte inclinable" },
  { id: "parallax", label: "Parallax : couches de profondeur" },
  { id: "scene", label: "HeroScene : objet 3D en CSS" },
] as const;

// Poids mesurés après `pnpm build` (voir docs/design/MOUVEMENT.md pour la méthode).
const weights = [
  { name: "Reveal (île, lib comprise)", size: "0,8 Ko gzip" },
  { name: "CountUp (île, lib comprise)", size: "0,8 Ko gzip" },
  { name: "Tilt (île, lib comprise)", size: "0,8 Ko gzip" },
  { name: "Les trois îles ensemble", size: "1,7 Ko gzip" },
  { name: "Parallax, HeroScene", size: "0 Ko (composants serveur, CSS seul)" },
  { name: "Chunk propre à cette page (îles + simulateur)", size: "2,3 Ko gzip" },
] as const;

const steps = [
  "Un premier appel pour comprendre la situation.",
  "Une visite à domicile, avec la personne et ses proches.",
  "Un devis détaillé, gratuit, sans engagement.",
  "Une équipe présentée avant de commencer.",
] as const;

export default function MouvementPage() {
  return (
    <main id="contenu" className="container-site py-12">
      <p className="text-small text-text-soft">
        Page de travail, non indexée. <Link href="/styleguide/">Retour au guide de styles</Link>
      </p>
      <Heading level={1}>Mouvement et profondeur</Heading>
      <Lead className="mt-4">
        Doux, utile, rare. CSS d’abord, JavaScript minimal, tout s’éteint en mouvement réduit.
      </Lead>

      <nav aria-labelledby="sommaire" className="mt-8 rounded-card border border-line bg-white p-5">
        <Heading level={2} id="sommaire" visual={4}>
          Sommaire
        </Heading>
        <ol className="m-0 mt-3 grid list-none gap-x-6 gap-y-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <li key={section.id} className="max-w-none">
              <a href={`#${section.id}`} className="inline-flex min-h-12 items-center">
                {section.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <section aria-labelledby="reglages" className="mt-12">
        <Heading level={2} id="reglages">
          Réglages et budget
        </Heading>
        <div className="mt-4">
          <MotionSimulator />
        </div>
        <Callout variant="retenir" title="Budget (D-019)" className="mt-6">
          <p>
            JavaScript initial ≤ 160 Ko compressés sur une page de contenu, ≤ 220 Ko sur une page de
            formulaire ; LCP &lt; 2,5 s ; CLS 0. Les îles ci-dessous pèsent, compressées :
          </p>
          <ul>
            {weights.map((weight) => (
              <li key={weight.name}>
                {weight.name} : {weight.size}
              </li>
            ))}
          </ul>
          <p>
            Durées de 150 à 300 ms, courbe <code>cubic-bezier(.2,.7,.2,1)</code> ; le fil se trace
            en 600 à 900 ms ; les objets 3D tournent en 8 à 12 s.
          </p>
        </Callout>
      </section>

      <section aria-labelledby="reveal" className="mt-16">
        <Heading level={2} id="reveal">
          Reveal : révélation au défilement
        </Heading>
        <p className="mt-3">
          Fondu et montée de 12 px en 300 ms, une seule fois. Sans JavaScript, au-dessus du pli ou
          en mouvement réduit, le contenu est visible d’emblée : rien n’est jamais caché.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Reveal variant="rise">
            <Card>
              <Heading level={3} visual={4}>
                Variante <code>rise</code>
              </Heading>
              <p className="mt-2">Fondu et montée de 12 px : la variante par défaut.</p>
            </Card>
          </Reveal>
          <Reveal variant="fade" delay={120}>
            <Card>
              <Heading level={3} visual={4}>
                Variante <code>fade</code>, délai 120 ms
              </Heading>
              <p className="mt-2">Fondu seul, pour un bloc qui suit un autre.</p>
            </Card>
          </Reveal>
        </div>

        <Heading level={3} className="mt-10">
          Variante <code>stagger</code> : une liste, 60 ms entre chaque enfant
        </Heading>
        <Reveal
          as="ol"
          variant="stagger"
          className="m-0 mt-4 grid list-none gap-4 p-0 md:grid-cols-4"
        >
          {steps.map((step, index) => (
            <li key={step} className="max-w-none">
              <Card className="h-full">
                <span aria-hidden="true" className="figure text-teal-900">
                  {index + 1}
                </span>
                <p className="mt-2">{step}</p>
              </Card>
            </li>
          ))}
        </Reveal>

        <Heading level={3} className="mt-10">
          Variante <code>draw</code> : un SVG au fil qui se trace
        </Heading>
        <Reveal as="figure" variant="draw" className="m-0 mt-4">
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 320 80"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="block w-full max-w-md text-teal-700"
          >
            <path d="M8 60 C 60 60, 70 20, 120 20 S 180 60, 230 60 S 290 30, 312 24" />
            <path d="M226 62 c 8 -10, 16 -6, 12 4" className="text-raspberry-500" />
          </svg>
          <figcaption className="text-small text-text-soft">
            Un tracé décoratif, jamais fermé, avec son nœud framboise.
          </figcaption>
        </Reveal>
      </section>

      <section aria-labelledby="countup" className="mt-16">
        <Heading level={2} id="countup">
          CountUp : chiffre qui se compte
        </Heading>
        <p className="mt-3">
          900 ms, sortie en cube, chiffres tabulaires, largeur réservée. Le texte lu par un lecteur
          d’écran est la valeur finale dès le rendu serveur. Valeurs d’exemple ci-dessous, sans
          rapport avec Youdom Care.
        </p>
        <dl className="mt-8 grid gap-6 sm:grid-cols-3">
          <Card as="div">
            <dt className="text-small text-text-soft">Exemple : communes</dt>
            <dd className="m-0 mt-1 heading-2">
              <CountUp value={1268} />
            </dd>
          </Card>
          <Card as="div">
            <dt className="text-small text-text-soft">Exemple : taux</dt>
            <dd className="m-0 mt-1 heading-2">
              <CountUp value={50} suffix=" %" />
            </dd>
          </Card>
          <Card as="div">
            <dt className="text-small text-text-soft">Exemple : montant</dt>
            <dd className="m-0 mt-1 heading-2">
              <CountUp value={12.5} decimals={1} suffix=" €" />
            </dd>
          </Card>
        </dl>
      </section>

      <section aria-labelledby="tilt" className="mt-16">
        <Heading level={2} id="tilt">
          Tilt : carte inclinable
        </Heading>
        <p className="mt-3">
          6° au maximum vers le pointeur, retour en 200 ms. Souris seulement : rien au toucher, au
          clavier ni en mouvement réduit. Les liens et boutons restent cliquables.
        </p>
        <ul className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-2">
          <Tilt as="li" className="max-w-none">
            <Card interactive className="h-full">
              <Heading level={3} visual={4}>
                Une carte qui répond au pointeur
              </Heading>
              <p className="mt-2">Le texte reste net, la lecture n’est pas gênée.</p>
              <Button variant="outline" href="/styleguide/" className="mt-4">
                Un lien à l’intérieur
              </Button>
            </Card>
          </Tilt>
          <Tilt as="li" max={3} className="max-w-none">
            <Card interactive className="h-full">
              <Heading level={3} visual={4}>
                Inclinaison limitée à 3°
              </Heading>
              <p className="mt-2">Pour une carte plus large, une inclinaison plus discrète.</p>
              <Button variant="outline" type="button" className="mt-4">
                Un bouton à l’intérieur
              </Button>
            </Card>
          </Tilt>
        </ul>
      </section>

      <section aria-labelledby="parallax" className="mt-16">
        <Heading level={2} id="parallax">
          Parallax : couches de profondeur
        </Heading>
        <p className="mt-3">
          Translation verticale liée au défilement, 24 px au plus, en CSS seul (
          <code>animation-timeline: view()</code>) : jouée sur le compositeur, sans écouteur de
          défilement. Les navigateurs qui ne la connaissent pas affichent la couche immobile.
        </p>
        <div className="relative mt-8 overflow-hidden rounded-block bg-tint-teal p-8 md:p-12">
          <Parallax amount={24} className="absolute top-4 right-8" aria-hidden="true">
            <span className="block size-24 rounded-full bg-teal-500/30" />
          </Parallax>
          <Parallax amount={-16} className="absolute bottom-6 left-10" aria-hidden="true">
            <span className="block size-16 rounded-full bg-raspberry-500/25" />
          </Parallax>
          <Parallax amount={8} className="relative max-w-prose">
            <Heading level={3}>Trois couches, trois vitesses</Heading>
            <p className="mt-2">
              Les formes derrière avancent ou retardent de quelques pixels pendant que ce texte
              défile presque normalement. La profondeur reste discrète : jamais au détriment de la
              lecture.
            </p>
          </Parallax>
        </div>
      </section>

      <section aria-labelledby="scene" className="mt-16">
        <Heading level={2} id="scene">
          HeroScene : objet 3D en CSS
        </Heading>
        <p className="mt-3">
          Aucune bibliothèque, aucun JavaScript : des faces en CSS 3D, une rotation de 12 s ou une
          respiration de 8 s. Immobile en mouvement réduit. Décoratif (<code>aria-hidden</code>).
        </p>
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <figure className="m-0 flex flex-col items-center rounded-card border border-line bg-white p-8">
            <HeroScene variant="maison" size={220} />
            <figcaption className="mt-4 text-small text-text-soft">
              <code>maison</code> : murs, toit teal, porte framboise (le nœud).
            </figcaption>
          </figure>
          <figure className="m-0 flex flex-col items-center rounded-card border border-line bg-white p-8">
            <HeroScene variant="fil" size={220} />
            <figcaption className="mt-4 text-small text-text-soft">
              <code>fil</code> : trois arcs ouverts, jamais fermés, un nœud.
            </figcaption>
          </figure>
        </div>
      </section>
    </main>
  );
}
