import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "@/components/ui/Callout/Callout";
import { Card } from "@/components/ui/Card/Card";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { PhotoFigure, photoSizes } from "@/components/ui/PhotoFigure/PhotoFigure";
import { Select } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { cn } from "@/lib/cn";
import { pageMetadata } from "@/lib/seo/metadata";
import { GlassSimulator } from "./GlassSimulator";

export const metadata: Metadata = pageMetadata({
  titre: "Guide de styles — Verre et scènes",
  description:
    "Page de travail : niveaux de verre, teintes, élévations, états, repli sans backdrop-filter et fonds de scène.",
  chemin: "/styleguide/verre/",
  noindex: true,
});

/*
 * Page de travail (noindex, exclue des plans de site comme le reste de /styleguide/).
 * Elle montre le contrat de D-032 aux trois autres agents de la refonte : les classes exactes, ce
 * qu'elles donnent sur chaque fond, et ce qu'elles deviennent sans `backdrop-filter`, en mode
 * confort et en mouvement réduit. Référence écrite : docs/design/LIQUID_GLASS.md.
 */

const sections = [
  { id: "reglages", label: "Réglages et repli" },
  { id: "niveaux", label: "Trois niveaux de verre" },
  { id: "teintes", label: "Teintes du verre" },
  { id: "elevations", label: "Élévations" },
  { id: "liseres", label: "Liseré et reflet" },
  { id: "etats", label: "États (survol, focus, actif, désactivé)" },
  { id: "photo", label: "Verre au-dessus d’une photo" },
  { id: "scenes", label: "Fonds de scène" },
  { id: "interdits", label: "Ce qu’on ne fait pas" },
] as const;

const levels = [
  {
    className: "glass-quiet",
    title: "glass-quiet",
    body: "Verre à peine perceptible : 82 % d’opacité, flou de 6 px, aucune ombre. Grandes surfaces de texte, champs de formulaire, pastilles.",
  },
  {
    className: "glass",
    title: "glass",
    body: "Surface standard : 72 % d’opacité, flou de 12 px, élévation 1. Cartes, encarts, panneaux.",
  },
  {
    className: "glass-strong",
    title: "glass-strong",
    body: "Verre dense : 88 % d’opacité, flou de 20 px, élévation 2. En-tête collant, barre d’action mobile, panneau au-dessus d’une photo.",
  },
  {
    className: "glass glass-dark",
    title: "glass glass-dark",
    body: "Verre sombre : teal-900 à 88 %, texte blanc à 7,35 au minimum sur n’importe quel fond, photo comprise.",
  },
] as const;

const tints = [
  { className: "glass-tint-teal", label: "glass-tint-teal", usage: "information" },
  { className: "glass-tint-framboise", label: "glass-tint-framboise", usage: "action, chaleur" },
  { className: "glass-tint-sable", label: "glass-tint-sable", usage: "chaleur, frontières" },
  { className: "glass-tint-green", label: "glass-tint-green", usage: "« Bon à savoir »" },
  { className: "glass-tint-azure", label: "glass-tint-azure", usage: "magazine" },
  { className: "glass-tint-warning", label: "glass-tint-warning", usage: "« Attention »" },
] as const;

const depths = [
  { className: "depth-1", label: "depth-1", usage: "carte au repos" },
  { className: "depth-2", label: "depth-2", usage: "survol, en-tête collant" },
  { className: "depth-3", label: "depth-3", usage: "panneau détaché, bouton principal au survol" },
] as const;

const scenes = [
  { className: "scene-aurore", label: "scene-aurore", usage: "accueil", dark: false },
  {
    className: "scene-teal",
    label: "scene-teal",
    usage: "personnes âgées, pages locales",
    dark: false,
  },
  { className: "scene-azure", label: "scene-azure", usage: "neuro, lexique", dark: false },
  { className: "scene-verte", label: "scene-verte", usage: "enfants, outils", dark: false },
  { className: "scene-sable", label: "scene-sable", usage: "adultes, agences", dark: false },
  {
    className: "scene-framboise",
    label: "scene-framboise",
    usage: "aidants, magazine",
    dark: false,
  },
  { className: "scene-nuit", label: "scene-nuit", usage: "nuit, entreprise", dark: true },
  {
    className: "scene-neutre",
    label: "scene-neutre",
    usage: "articles, pages légales",
    dark: false,
  },
] as const;

const demoPhoto = {
  src: "/images/heros/personnes-agees-hero-cuisine.jpg",
  alt: "Un jeune homme prépare des légumes dans une cuisine tandis qu'un homme âgé assis à la table le regarde",
} as const;

export default function StyleguideGlassPage() {
  return (
    <main id="contenu" className="container-site py-12">
      <p className="text-small text-text-soft">Page de travail, non indexée.</p>
      <Heading level={1}>Verre liquide et fonds de scène</Heading>
      <Lead className="mt-4">
        Les classes de la décision D-032, telles que les autres agents doivent les consommer.
      </Lead>
      <p className="mt-4">
        Les jetons vivent dans <code>src/styles/glass.css</code> et{" "}
        <code>src/styles/scenes.css</code>. Aucun composant ne redéfinit un flou, une opacité ou une
        ombre : il pose une classe. Le détail écrit, les contrastes mesurés et les contre-exemples
        sont dans <code>docs/design/LIQUID_GLASS.md</code>.
      </p>

      <nav aria-labelledby="sommaire" className="glass mt-8 rounded-card p-5">
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
        <p className="m-0 mt-4 text-small">
          <Link href="/styleguide/">Retour au guide de styles</Link> ·{" "}
          <Link href="/styleguide/mouvement/">Mouvement</Link>
        </p>
      </nav>

      <section aria-labelledby="reglages" className="mt-12">
        <Heading level={2} id="reglages">
          Réglages et repli
        </Heading>
        <div className="mt-4">
          <GlassSimulator />
        </div>
        <Callout variant="bon-a-savoir" className="mt-6">
          <p>
            Sans <code>backdrop-filter</code>, une surface de verre reste opaque à 94 % : le texte
            garde son contraste (13,58 au lieu de 14,02 sur une section sable). En mode confort et
            en mouvement réduit, les surfaces deviennent totalement opaques, et les scènes se
            réduisent à leur couleur de base.
          </p>
        </Callout>
      </section>

      <section aria-labelledby="niveaux" className="mt-12">
        <Heading level={2} id="niveaux">
          Trois niveaux de verre
        </Heading>
        <p className="mt-4">
          Chaque niveau est posé ici sur une scène colorée, pour que le flou et la translucidité se
          voient. Une seule classe de niveau par élément.
        </p>
        <div className="scene scene-teal scene-soutenu mt-6 rounded-block p-5 sm:p-8">
          <ul className="m-0 grid list-none gap-5 p-0 lg:grid-cols-2">
            {levels.map((level) => (
              <li key={level.title} className="max-w-none">
                <div className={cn(level.className, "h-full rounded-card p-5")}>
                  <p className="m-0 font-bold">
                    <code>{level.title}</code>
                  </p>
                  <p className="m-0 mt-2">{level.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="teintes" className="mt-12">
        <Heading level={2} id="teintes">
          Teintes du verre
        </Heading>
        <p className="mt-4">
          La teinte change la couleur posée sous le verre, pas son opacité. Trois teintes du brief
          (canard, framboise, sable) et trois teintes reprises des composants existants (vert, azur,
          alerte).
        </p>
        <ul className="m-0 mt-6 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {tints.map((tint) => (
            <li key={tint.label} className="max-w-none">
              <div className={cn("glass rounded-card p-5", tint.className)}>
                <p className="m-0 font-bold">
                  <code>{tint.label}</code>
                </p>
                <p className="m-0 mt-1 text-small text-text-soft">{tint.usage}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="elevations" className="mt-12">
        <Heading level={2} id="elevations">
          Élévations
        </Heading>
        <p className="mt-4">
          L’ombre s’élargit et se décale vers le bas ; l’élément ne change jamais de taille.
        </p>
        <ul className="m-0 mt-6 grid list-none gap-6 p-0 sm:grid-cols-3">
          {depths.map((depth) => (
            <li key={depth.label} className="max-w-none">
              <div className={cn("rounded-card bg-white p-5", depth.className)}>
                <p className="m-0 font-bold">
                  <code>{depth.label}</code>
                </p>
                <p className="m-0 mt-1 text-small text-text-soft">{depth.usage}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="liseres" className="mt-12">
        <Heading level={2} id="liseres">
          Liseré et reflet
        </Heading>
        <div className="scene scene-nuit mt-6 rounded-block p-5 sm:p-8">
          <ul className="m-0 grid list-none gap-5 p-0 lg:grid-cols-3">
            <li className="max-w-none">
              <div className="glass glass-edge h-full rounded-card p-5">
                <p className="m-0 font-bold">
                  <code>glass-edge</code>
                </p>
                <p className="m-0 mt-2">Liseré lumineux en haut du panneau.</p>
              </div>
            </li>
            <li className="max-w-none">
              <div className="glass glass-edge h-full rounded-card p-5" data-edge="bottom">
                <p className="m-0 font-bold">
                  <code>glass-edge</code> + <code>data-edge=&quot;bottom&quot;</code>
                </p>
                <p className="m-0 mt-2">Liseré en bas : pour un en-tête collant.</p>
              </div>
            </li>
            <li className="max-w-none">
              <div className="glass glass-sheen h-full rounded-card p-5">
                <p className="m-0 font-bold">
                  <code>glass-sheen</code>
                </p>
                <p className="m-0 mt-2">
                  Reflet au survol à la souris (10 % de blanc au plus). Rien au clavier, rien au
                  toucher, rien en mouvement réduit.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="etats" className="mt-12">
        <Heading level={2} id="etats">
          États : survol, focus, actif, désactivé
        </Heading>
        <p className="mt-4">
          Passez la souris, puis parcourez au clavier : l’anneau de focus de 3 px reste visible sur
          chaque surface (teal-800 sur verre clair, blanc sur verre sombre).
        </p>
        <div className="scene scene-sable mt-6 rounded-block p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <Button>Être rappelé(e)</Button>
            <Button variant="secondary">Je décris ma situation</Button>
            <Button variant="outline">Voir les tarifs</Button>
            <Button variant="link">Le lexique</Button>
            <Button disabled>Indisponible</Button>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <Card interactive>
              <p className="m-0 font-bold">Carte interactive</p>
              <p className="m-0 mt-2">
                Verre standard, reflet au survol, élévation 2 au survol et au focus intérieur.{" "}
                <a href="#etats">Un lien pour tester le focus</a>.
              </p>
            </Card>
            <div className="glass glass-dark glass-edge rounded-card p-6">
              <p className="m-0 font-bold">Panneau de verre sombre</p>
              <p className="m-0 mt-2">
                Texte blanc, <a href="#etats">lien blanc souligné</a>, anneau de focus blanc.
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <TextField label="Votre prénom" />
            <TextField label="Champ désactivé" disabled defaultValue="Indisponible" />
            <Select
              label="Votre situation"
              placeholder="Choisissez…"
              options={[
                { value: "domicile", label: "À domicile" },
                { value: "sortie", label: "Sortie d’hospitalisation" },
              ]}
            />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Badge>neutral</Badge>
            <Badge tone="teal">teal</Badge>
            <Badge tone="green">green</Badge>
            <Badge tone="done">done (aplat plein)</Badge>
            <Badge tone="raspberry">raspberry</Badge>
            <Badge tone="azure">azure</Badge>
          </div>
        </div>
      </section>

      <section aria-labelledby="photo" className="mt-12">
        <Heading level={2} id="photo">
          Verre au-dessus d’une photo
        </Heading>
        <p className="mt-4">
          Au-dessus d’une photo, seul le verre sombre garantit le contraste (7,35 au minimum, quelle
          que soit la photo). Le verre clair n’y porte que du texte encre, jamais de texte
          secondaire.
        </p>
        <div className="relative mt-6 max-w-2xl">
          <PhotoFigure
            src={demoPhoto.src}
            alt={demoPhoto.alt}
            ratio="3:2"
            sizes={photoSizes.half}
          />
          <div className="glass glass-strong glass-dark glass-edge absolute inset-x-4 bottom-4 rounded-card p-4">
            <p className="m-0 font-bold">Un accompagnement à domicile</p>
            <p className="m-0 mt-1">
              <code>glass glass-strong glass-dark glass-edge</code>
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="scenes" className="mt-12">
        <Heading level={2} id="scenes">
          Fonds de scène
        </Heading>
        <p className="mt-4">
          Une scène est un fond composé : couleur de base, dégradé à trois arrêts, deux halos, trame
          au fil, grain à 4 %. Version claire à gauche, version soutenue (<code>scene-soutenu</code>
          ) à droite. Les classes s’appliquent aussi par attribut : <code>data-scene</code>,{" "}
          <code>data-public</code> (public de la page) et <code>data-famille</code> (famille de
          pages).
        </p>
        <ul className="m-0 mt-6 grid list-none gap-6 p-0">
          {scenes.map((scene) => (
            <li key={scene.label} className="max-w-none">
              <div className="grid gap-4 sm:grid-cols-2">
                {[false, true].map((strong) => (
                  <div
                    key={strong ? "soutenu" : "clair"}
                    className={cn(
                      "scene rounded-block p-5",
                      scene.className,
                      strong && "scene-soutenu",
                    )}
                  >
                    <p className="m-0 font-bold">
                      <code>
                        {scene.label}
                        {strong ? " scene-soutenu" : ""}
                      </code>
                    </p>
                    <p className="m-0 mt-1 text-small">{scene.usage}</p>
                    <p className="m-0 mt-3">
                      Texte courant, <a href="#scenes">un lien</a>, et un panneau de verre posé
                      dessus.
                    </p>
                    <div
                      className={cn(
                        "mt-4 rounded-card p-4",
                        scene.dark ? "glass glass-dark" : "glass glass-edge",
                      )}
                    >
                      <p className="m-0 text-small">Panneau de verre sur la scène.</p>
                    </div>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="interdits" className="mt-12">
        <Heading level={2} id="interdits">
          Ce qu’on ne fait pas
        </Heading>
        <Callout variant="ne-faisons-pas" className="mt-6">
          <ul className="mt-2">
            <li>
              Pas de verre sur un texte long : corps d’article, page locale, page légale restent sur
              fond plein (<code>scene-neutre</code> ou rien du tout).
            </li>
            <li>
              Pas de reflet sur le bouton principal : un voile blanc de 10 % ferait tomber le texte
              blanc de 4,90 à 4,34.
            </li>
            <li>
              Pas de texte secondaire (<code>text-text-soft</code>) sur du verre clair posé sur une
              photo : 3,28.
            </li>
            <li>
              Pas de lien <code>teal-700</code> sur une scène : 3,93 sur le point le plus soutenu.
              Les liens d’une scène sont en <code>teal-800</code> (posé par la feuille).
            </li>
            <li>
              Pas deux classes de niveau ni une teinte avec <code>glass-dark</code> sur le même
              élément.
            </li>
          </ul>
        </Callout>
      </section>
    </main>
  );
}
