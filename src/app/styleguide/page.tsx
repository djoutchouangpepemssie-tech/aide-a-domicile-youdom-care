import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "@/components/ui/Callout/Callout";
import { Card } from "@/components/ui/Card/Card";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup/CheckboxGroup";
import { RadioCards } from "@/components/ui/RadioCards/RadioCards";
import { Select } from "@/components/ui/Select/Select";
import { Textarea } from "@/components/ui/Textarea/Textarea";
import { TextField } from "@/components/ui/TextField/TextField";
import { threadIllustrationNames } from "@/components/ui/Thread/illustrations";
import { Thread } from "@/components/ui/Thread/Thread";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { Prose } from "@/components/ui/Prose/Prose";
import { AidCard } from "@/components/blocks/AidCard/AidCard";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { FAQ } from "@/components/blocks/FAQ/FAQ";
import { FollowUpTimeline } from "@/components/blocks/FollowUpTimeline/FollowUpTimeline";
import { PriceCard } from "@/components/blocks/PriceCard/PriceCard";
import { SituationCard } from "@/components/blocks/SituationCard/SituationCard";
import { StageCards } from "@/components/blocks/StageCards/StageCards";
import { StepsTimeline } from "@/components/blocks/StepsTimeline/StepsTimeline";
import { WeekPlanner } from "@/components/blocks/WeekPlanner/WeekPlanner";
import { WeekPlannerInput } from "@/components/forms/WeekPlannerInput/WeekPlannerInput";
import { getCommitments, getInterfaceTexts, getPricing, getWeekExamples } from "@/content/loader";
import { budgetBasis } from "@/lib/pricing/pricing";

export const metadata: Metadata = {
  title: "Guide de styles — Youdom Care",
  robots: { index: false, follow: false },
};

// Les valeurs viennent de src/styles/tokens.css : ici on ne liste que les noms de jetons.
const swatches = [
  { group: "Encre", tokens: ["ink", "ink-soft"] },
  {
    group: "Bleu canard",
    tokens: ["teal-50", "teal-500", "teal-600", "teal-700", "teal-800", "teal-900"],
  },
  { group: "Vert", tokens: ["green-50", "green-500", "green-700"] },
  {
    group: "Framboise",
    tokens: ["raspberry-50", "raspberry-500", "raspberry-600", "raspberry-700"],
  },
  { group: "Azur", tokens: ["azure-50", "azure-600", "azure-700"] },
  { group: "Fonds et filets", tokens: ["paper", "sand", "white", "line", "field-border"] },
  { group: "États", tokens: ["danger", "danger-bg", "warning", "warning-bg"] },
] as const;

const sections = [
  { id: "texte", label: "Texte courant" },
  { id: "typo", label: "Typographie" },
  { id: "couleurs", label: "Couleurs" },
  { id: "formes", label: "Formes et profondeur" },
  { id: "boutons", label: "Boutons" },
  { id: "cartes", label: "Cartes et pastilles" },
  { id: "encarts", label: "Encarts" },
  { id: "parcours", label: "Parcours et navigation" },
  { id: "prix-aides", label: "Prix, aides et situations" },
  { id: "semaine", label: "Semaine type" },
  { id: "planning", label: "Grille de planning (saisie)" },
  { id: "fil", label: "Le fil" },
  { id: "champs", label: "Champs de formulaire" },
] as const;

export default function StyleguidePage() {
  const interfaceTexts = getInterfaceTexts();
  const { suivi } = getCommitments();
  const pricing = getPricing();
  const madeleine = getWeekExamples().exemples.find((example) => example.id === "madeleine");
  if (!madeleine) throw new Error("semaines-types.json : exemple « madeleine » introuvable");
  return (
    <main id="contenu" className="container-site py-12">
      <p className="text-small text-text-soft">Page de travail, non indexée.</p>
      <Heading level={1}>Guide de styles « Le Fil »</Heading>
      <Lead className="mt-4">Vous, chez vous. Nous, à vos côtés.</Lead>

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

      <section aria-labelledby="texte" className="mt-12">
        <Heading level={2} id="texte">
          Texte courant
        </Heading>
        <Prose className="mt-4">
          <p>
            Un paragraphe de texte courant, sur une mesure de 60 à 72 caractères. Les phrases sont
            courtes. Les mots sont concrets. La personne vient avant la maladie.
          </p>
          <Heading level={3}>Ce que vous pouvez attendre</Heading>
          <ul>
            <li>Une évaluation à domicile, avec la personne et ses proches.</li>
            <li>Un devis détaillé, gratuit, sans engagement.</li>
            <li>Une équipe présentée avant de commencer.</li>
          </ul>
          <Heading level={4} visual={4}>
            Bon à savoir
          </Heading>
          <p>
            Les <abbr title="Services à la personne">SAP</abbr> ouvrent droit à un crédit d’impôt.
            Le prix TTC reste toujours l’information principale.
          </p>
          <blockquote>
            <p>
              Exemple illustratif : « Le matin, quelqu’un vient. Le reste de la journée, je respire.
              »
            </p>
            <cite>Prénom fictif, aidante</cite>
          </blockquote>
          <table>
            <caption className="text-small text-text-soft">
              Exemple illustratif de tableau réel
            </caption>
            <thead>
              <tr>
                <th scope="col">Moment</th>
                <th scope="col">Durée</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Matin</td>
                <td>1 h 30</td>
              </tr>
              <tr>
                <td>Soir</td>
                <td>1 h</td>
              </tr>
            </tbody>
          </table>
        </Prose>
      </section>

      <section aria-labelledby="typo" className="mt-12">
        <h2 id="typo">Typographie</h2>
        <p className="mt-4">
          Titres en Fraunces, texte et interface en Atkinson Hyperlegible Next. Le texte courant
          fait 17 px sur mobile et 18 px sur ordinateur, avec un interligne de 1,65.
        </p>
        <h3 className="mt-6">Un titre de niveau trois, en Fraunces 600</h3>
        <h4 className="mt-4">Un titre de niveau quatre, en Atkinson 700</h4>
        <p className="mt-4">
          Lettres différenciées : Il1 O0 rn m — la police a été dessinée pour la basse vision.
        </p>
        <p className="mt-4">
          <span className="figure text-h2">1 234,56 €</span>{" "}
          <span className="text-small text-text-soft">chiffre important en Fraunces 560</span>
        </p>
        <p className="tabular-figures mt-2">Chiffres tabulaires : 11 111 · 22 222 · 33 333</p>
        <p className="mt-4">
          <a href="#typo">Un lien en teal-700</a>
        </p>
      </section>

      <section aria-labelledby="couleurs" className="mt-12">
        <h2 id="couleurs">Couleurs</h2>
        {swatches.map((group) => (
          <div key={group.group} className="mt-6">
            <h3 className="text-h4">{group.group}</h3>
            <ul className="mt-3 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-6">
              {group.tokens.map((token) => (
                <li key={token} className="rounded-card border border-line bg-white p-2 shadow-1">
                  <div
                    aria-hidden="true"
                    className="h-12 rounded-field border border-line"
                    style={{ backgroundColor: `var(--color-${token})` }}
                  />
                  <code className="text-small mt-2 block">{token}</code>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="formes" className="mt-12">
        <h2 id="formes">Formes et profondeur</h2>
        <div className="mt-6 flex flex-wrap gap-6">
          <div className="rounded-field border border-field-border bg-white px-4 py-3">
            Champ, 10 px
          </div>
          <div className="rounded-button bg-action px-6 py-4 font-bold text-white">
            Bouton, 14 px
          </div>
          <div className="rounded-card border border-line bg-white p-6 shadow-1">
            Carte, 20 px, ombre 1
          </div>
          <div className="rounded-block bg-tint-teal p-8 shadow-2">Grand bloc, 28 px, ombre 2</div>
        </div>
      </section>

      <section aria-labelledby="boutons" className="mt-12">
        <Heading level={2} id="boutons">
          Boutons
        </Heading>
        <p className="mt-2 text-small text-text-soft">
          Une seule couleur d’action : un seul bouton framboise par écran visible. Libellés de la
          bibliothèque de docs/01 §6.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button>{interfaceTexts.boutons.rappel}</Button>
          <Button variant="secondary">{interfaceTexts.boutons.appel}</Button>
          <Button variant="outline" href="#boutons">
            {interfaceTexts.boutons.demande_detaillee}
          </Button>
          <Button variant="link" href="#boutons">
            {interfaceTexts.boutons.lecture_aides}
          </Button>
          <Button variant="secondary" disabled>
            Désactivé
          </Button>
        </div>
      </section>

      <section aria-labelledby="cartes" className="mt-12">
        <Heading level={2} id="cartes">
          Cartes et pastilles
        </Heading>
        <ul className="mt-6 grid list-none gap-6 p-0 sm:grid-cols-2">
          <Card as="li">
            <Badge tone="teal">Exemple illustratif</Badge>
            <Heading level={3} visual={4} className="mt-3">
              Carte simple
            </Heading>
            <p className="mt-2">Fond blanc, bordure fine, rayon 20 px, ombre 1.</p>
          </Card>
          <Card as="li" interactive>
            <Badge tone="done">Fait</Badge>
            <Heading level={3} visual={4} className="mt-3">
              Carte interactive
            </Heading>
            <p className="mt-2">Au survol : ombre 2 et translation de −2 px en 200 ms.</p>
          </Card>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Badge>Neutre</Badge>
          <Badge tone="teal">Bleu canard</Badge>
          <Badge tone="green">Vert doux</Badge>
          <Badge tone="done">Fait</Badge>
          <Badge tone="raspberry">Framboise</Badge>
          <Badge tone="azure">Azur</Badge>
        </div>
      </section>

      <section aria-labelledby="encarts" className="mt-12">
        <Heading level={2} id="encarts">
          Encarts
        </Heading>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <Callout>
            <p>Le prix TTC avant avantage fiscal est toujours l’information principale.</p>
          </Callout>
          <Callout variant="bon-a-savoir">
            <p>Une évaluation à domicile est proposée avant tout devis.</p>
          </Callout>
          <Callout variant="attention">
            <p>Le site informe, il ne soigne pas : parlez-en à votre médecin.</p>
          </Callout>
          <Callout variant="ne-faisons-pas">
            <p>Aucun geste médical : ils relèvent des professionnels de santé.</p>
          </Callout>
        </div>
      </section>

      <section aria-labelledby="parcours" className="mt-12">
        <Heading level={2} id="parcours">
          Parcours et navigation
        </Heading>
        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <div>
            <Heading level={3} id="etapes" className="text-h4">
              Étapes (StepsTimeline)
            </Heading>
            <StepsTimeline
              aria-labelledby="etapes"
              className="mt-4"
              steps={[
                {
                  title: "Nous vous écoutons.",
                  text: "Un appel d’un quart d’heure pour comprendre la situation. Sans jargon, sans engagement.",
                },
                {
                  title: "Nous venons vous voir.",
                  text: "Une évaluation gratuite à domicile, avec la personne et ses proches. Vous recevez un devis détaillé et gratuit.",
                },
                {
                  title: "Nous ajustons, ensemble.",
                  text: "À tout moment, vous pouvez modifier ou arrêter l’accompagnement, dans le respect de la réglementation applicable.",
                },
              ]}
            />
          </div>
          <div>
            <Heading level={3} id="faq" className="text-h4">
              Questions fréquentes (FAQ)
            </Heading>
            <FAQ
              className="mt-4"
              items={[
                {
                  id: "faq-evaluation",
                  question: "Comment se passe la première rencontre ?",
                  answer: (
                    <p>
                      Une évaluation gratuite à domicile, avec la personne et ses proches, puis un
                      devis détaillé et gratuit.
                    </p>
                  ),
                },
                {
                  id: "faq-arret",
                  question: "Peut-on modifier ou arrêter l’accompagnement ?",
                  answer: <p>À tout moment, dans le respect de la réglementation applicable.</p>,
                },
              ]}
            />
          </div>
        </div>
        <div className="mt-10">
          <Heading level={3} id="suivi" className="text-h4">
            Le suivi (FollowUpTimeline)
          </Heading>
          <FollowUpTimeline aria-labelledby="suivi" className="mt-4" milestones={suivi.jalons} />
        </div>
        <div className="mt-10">
          <Heading level={3} id="ariane" className="text-h4">
            Fil d’Ariane (Breadcrumb)
          </Heading>
          <Breadcrumb
            className="mt-4"
            texts={interfaceTexts.fil_ariane}
            items={[
              { label: "Personnes âgées", href: "/personnes-agees/" },
              { label: "Aide à l’autonomie" },
            ]}
          />
        </div>
      </section>

      <section aria-labelledby="prix-aides" className="mt-12">
        <Heading level={2} id="prix-aides">
          Prix, aides et situations
        </Heading>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <Heading level={3} id="prix" className="text-h4">
              Carte de prix (PriceCard)
            </Heading>
            <p className="mt-2 text-small text-text-soft">
              Masquée tant que <code>content/tarifs.json</code> ne contient aucun prix (Q-TARIFS-1)
              : aucun chiffre n’est inventé.
            </p>
            <div className="mt-4" data-testid="price-card-slot">
              {pricing.prestations.map((service) => (
                <PriceCard
                  key={service.id}
                  service={service}
                  creditImpotTaux={pricing.credit_impot_taux}
                  exampleHoursPerWeek={10}
                  texts={interfaceTexts.tarifs}
                />
              ))}
            </div>
          </div>
          <div>
            <Heading level={3} id="aide" className="text-h4">
              Carte d’aide (AidCard)
            </Heading>
            <p className="mt-2 text-small text-text-soft">
              Contenu de démonstration ; montants et conditions viendront des sources officielles
              (P2.7).
            </p>
            <AidCard
              className="mt-4"
              name="Crédit d’impôt"
              forWho="Les particuliers qui paient des services à la personne à domicile."
              howMuch="Une part des sommes versées, dans la limite des plafonds en vigueur."
              howTo="Lors de la déclaration de revenus, ou par l’avance immédiate."
              official={{ label: "impots.gouv.fr", href: "https://www.impots.gouv.fr/" }}
              headingLevel={4}
              texts={interfaceTexts.aides}
            />
          </div>
        </div>
        <div className="mt-10">
          <Heading level={3} id="situations" className="text-h4">
            Cartes de situation (SituationCard)
          </Heading>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <SituationCard
              quote="Un diagnostic vient de tomber"
              text="Alzheimer, Parkinson, sclérose en plaques… Vous cherchez comment organiser la suite."
              href="/maladies-neurodegeneratives/"
              linkLabel="Voir l’accompagnement par maladie"
              illustration="carnet"
            />
            <SituationCard
              quote="Mon parent ne peut plus rester seul"
              text="Chutes, oublis, repas sautés : il est temps d’une présence régulière."
              href="/personnes-agees/"
              linkLabel="Voir l’aide aux personnes âgées"
              illustration="maison"
            />
          </div>
        </div>
        <div className="mt-10">
          <Heading level={3} id="stades" className="text-h4">
            Stades (StageCards)
          </Heading>
          <StageCards
            aria-labelledby="stades"
            className="mt-4"
            stages={[
              {
                title: "Début",
                text: <p>Faire avec, pas à la place : rappels, rendez-vous, relais du conjoint.</p>,
              },
              {
                title: "Stade modéré",
                text: <p>Présence quotidienne, aide aux gestes, sécurité, stimulation.</p>,
              },
              {
                title: "Stade avancé",
                text: (
                  <p>
                    Présence étendue ou continue, confort, coordination étroite avec les soignants.
                  </p>
                ),
              },
            ]}
          />
        </div>
      </section>

      <section aria-labelledby="semaine" className="mt-12">
        <Heading level={2} id="semaine">
          Semaine type (lecture)
        </Heading>
        <p className="mt-2 text-small text-text-soft">
          Tableau réel à partir de 48 rem, liste par jour en dessous, légende par activité.
        </p>
        <div className="mt-6 rounded-block bg-white p-4 shadow-1 sm:p-6">
          <WeekPlanner
            title={madeleine.titre}
            context={madeleine.contexte}
            entries={madeleine.entrees}
            texts={interfaceTexts.semaine_type}
          />
        </div>
      </section>

      <section aria-labelledby="planning" className="mt-12">
        <Heading level={2} id="planning">
          Grille de planning (saisie)
        </Heading>
        <p className="mt-2 text-small text-text-soft">
          Rythme, puis sept jours × six créneaux : tableau au clavier à partir de 48 rem, accordéon
          par jour en dessous, raccourcis, résumé annoncé.
        </p>
        <div className="mt-6 rounded-block bg-white p-4 shadow-1 sm:p-6">
          <WeekPlannerInput
            texts={{
              semaine_type: interfaceTexts.semaine_type,
              formulaires: interfaceTexts.formulaires,
              planning: interfaceTexts.planning,
            }}
            budget={budgetBasis(pricing.prestations, pricing.credit_impot_taux)}
          />
        </div>
      </section>

      <section aria-labelledby="fil" className="mt-12">
        <Heading level={2} id="fil">
          Le fil
        </Heading>
        <p className="mt-2 text-small text-text-soft">
          Une ligne continue, jamais fermée, un seul nœud framboise. Décorative : elle ne porte
          aucune information absente du texte.
        </p>
        <ul className="mt-6 grid list-none grid-cols-3 gap-6 p-0 sm:grid-cols-6">
          {threadIllustrationNames.map((name) => (
            <li key={name} className="max-w-none text-center">
              <Thread illustration={name} className="mx-auto w-full max-w-28" />
              <span className="mt-2 block text-small text-text-soft">{name}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-center gap-6 rounded-block bg-footer-bg p-8 text-footer-text">
          <Thread illustration="mains" tone="dark" className="w-24 shrink-0" />
          <p className="max-w-none">Sur fond sombre, le fil est blanc.</p>
        </div>
      </section>

      <section aria-labelledby="champs" className="mt-12">
        <Heading level={2} id="champs">
          Champs de formulaire
        </Heading>
        <p className="mt-2 text-small text-text-soft">{interfaceTexts.formulaires.accroche}</p>
        <form noValidate className="mt-6 grid max-w-2xl gap-6" aria-label="Exemple de formulaire">
          <TextField label="Votre prénom" name="prenom" autoComplete="given-name" />
          <TextField
            type="tel"
            label="Votre téléphone"
            name="telephone"
            autoComplete="tel"
            hint="Nous vous rappelons à ce numéro."
            error={interfaceTexts.formulaires.telephone_invalide}
            defaultValue="06 12"
          />
          <Select
            label="APA ou PCH"
            name="aide"
            placeholder="Choisissez…"
            options={[
              { value: "obtenue", label: "Obtenue" },
              { value: "en-cours", label: "En cours" },
              { value: "pas-encore", label: "Pas encore" },
              { value: "ne-sais-pas", label: "Je ne sais pas" },
            ]}
          />
          <Textarea
            label="Ce que vous souhaitez nous dire"
            name="message"
            optional
            hint="Inutile de détailler l’état de santé : nous en parlerons de vive voix."
          />
          <RadioCards
            name="pour_qui"
            legend={interfaceTexts.formulaires.etape_pour_qui}
            options={[
              { value: "parent", label: "Un parent âgé", description: "Père, mère, grand-parent." },
              { value: "enfant", label: "Mon enfant" },
              { value: "moi", label: "Moi-même" },
              { value: "proche", label: "Un proche en situation de handicap" },
            ]}
          />
          <CheckboxGroup
            name="besoins"
            legend={interfaceTexts.formulaires.etape_besoins}
            options={[
              { value: "lever", label: "Aide au lever et au coucher" },
              { value: "repas", label: "Repas" },
              { value: "nuits", label: "Nuits", description: "Présence de nuit, calme ou active." },
              { value: "a-definir", label: interfaceTexts.formulaires.choix_ouvert },
            ]}
          />
          <TextField label="Commune" name="commune" disabled defaultValue="Champ désactivé" />
        </form>
      </section>
    </main>
  );
}
