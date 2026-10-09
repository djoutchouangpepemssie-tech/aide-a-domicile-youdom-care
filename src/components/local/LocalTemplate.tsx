import Link from "next/link";
import { AidCard } from "@/components/blocks/AidCard/AidCard";
import { Breadcrumb, type BreadcrumbItem } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { SiteConversionRail } from "@/components/blocks/ConversionRail/SiteConversionRail";
import { FAQ } from "@/components/blocks/FAQ/FAQ";
import { Hero } from "@/components/blocks/Hero/Hero";
import { HeroSection } from "@/components/blocks/Hero/HeroSection";
import {
  heroOnlyWide,
  heroPhotoSizes,
  heroWhenRoomy,
  sceneByTerritory,
  sceneTint,
} from "@/components/blocks/Hero/hero-scene";
import { TerritorySearch } from "@/components/blocks/TerritorySearch/TerritorySearch";
import { formatFrenchDate } from "@/components/blocks/SourcesList/SourcesList";
import { WeekPlanner } from "@/components/blocks/WeekPlanner/WeekPlanner";
import { WeekStory } from "@/components/blocks/WeekStory/WeekStory";
import { LazyRappelForm } from "@/components/forms/DeferredForm/LazyRappelForm";
import { Section } from "@/components/layout/Section/Section";
import { Reveal } from "@/components/motion/Reveal/Reveal";
import { Tilt } from "@/components/motion/Tilt/Tilt";
import { toIconName } from "@/components/service/service-icons";
import { Heading } from "@/components/ui/Heading/Heading";
import { Icon } from "@/components/ui/Icon/Icon";
import { Lead } from "@/components/ui/Lead/Lead";
import { PhotoFigure } from "@/components/ui/PhotoFigure/PhotoFigure";
import { fullAddress } from "./AgencyCard";
import type { LocalData, LocalEditorial, LocalFact } from "@/content/local-schema";
import type { Agency, Aid, InterfaceTexts, Navigation, WeekExample } from "@/content/schemas";
import { cn } from "@/lib/cn";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import { LocalFactsGrid } from "./LocalFactsGrid";
import { Markdown } from "./Markdown";
import { localHeroPhoto } from "./local-photos";
import {
  aidFactTypes,
  fill,
  formInsee,
  formatInteger,
  formatPercent,
  lifeFactTypes,
  localPlace,
  localTitle,
  type LocalTexts,
} from "./local-texts";

/*
 * Gabarit des pages locales (docs/04 §4 « Anatomie d'une page locale », docs/02 §8 gabarit 4,
 * P6.5) : les dix blocs, dans l'ordre, depuis un `LocalData` (pipeline) et un `LocalEditorial`
 * (rédaction). Aucun fait n'est rédigé ici : chaque ressource affiche sa source et sa date
 * (`LocalFactsGrid`), l'agence affichée est l'agence réelle la plus proche (site.config.json),
 * la distance est arrondie, le téléphone est le numéro principal.
 *
 * 1. Bannière (H1 « Aide à domicile à {Nom} ({code postal}) », sous-titre rédigé, photo
 *    d'ambiance selon le type de territoire) · 2. Réponse immédiate « Oui, nous intervenons
 *    à … » avec l'agence la plus proche · 3. « Vivre à domicile à … » : zone éditoriale en
 *    Markdown, puis les repères chiffrés qu'elle utilise, avec leurs sources · 4. Ressources
 *    près de chez vous · 5. Accompagnements (liens vers piliers et services, sans paraphrase) ·
 *    6. Exemple local (semaine type, « Exemple illustratif ») · 7. Aides du département ·
 *    8. Communes voisines par distance · 9. Questions locales · 10. Formulaire de rappel avec
 *    la commune préremplie. Fil d'Ariane, rail de conversion (sections 2 à 9), même alternance
 *    de fonds que le gabarit service (jamais deux teintés d'affilée).
 */

export interface AccompagnementLink {
  chemin: string;
  libelle: string;
  icone?: string;
}

export interface LocalTemplateData {
  data: LocalData;
  editorial: LocalEditorial;
  texts: InterfaceTexts;
  navigation: Navigation;
  /** Téléphone principal (site.config.json) ; null si inconnu. */
  phone: string | null;
  /** Agence la plus proche (`data.agence_proche.id` résolu dans site.config.json) ; null si inconnue. */
  agency: Agency | null;
  /**
   * Couverture régionale (`site.config.json` › `couverture.phrase`), confirmée par Arcel le
   * 27/09/2026 : les auxiliaires de vie interviennent dans toute l'Île-de-France. Affichée sous la
   * réponse, à la place de la distance jusqu'à l'agence, qui laissait croire à une limite.
   */
  coverage: string | null;
  weekExample: WeekExample | null;
  /** Aides du département à présenter (APA, PCH), depuis content/aides.json. */
  aids: readonly Aid[];
  /** Piliers puis services construits, dans l'ordre de la navigation. */
  accompagnements: readonly AccompagnementLink[];
  /** Fil d'Ariane avant la page courante (Territoires, département…). */
  crumbs: readonly BreadcrumbItem[];
  /** Chemins des communes voisines qui ont une page construite, par code INSEE. */
  neighbourPaths: Readonly<Record<string, string>>;
  /** Page du département si elle est construite. */
  departementHref: string | null;
  /** Page de département : pages de communes et d'arrondissements construites, par nom. */
  departementPages?: readonly { href: string; label: string }[];
  /**
   * Pages construites les plus proches hors voisines déclarées (`nearbyPages`, P9.4), rendues
   * dans la liste des voisines à leur rang de distance.
   */
  nearbyPages?: readonly { code: string; nom: string; chemin: string; distance_km: number }[];
  confidentialiteHref: string;
  tarifsHref: string;
  reassurance: readonly string[];
}

/**
 * Gabarit de la réponse immédiate (docs/04 §4, anatomie 2) : agence installée dans le territoire,
 * agence du département, ou agence qui coordonne. Aucune distance n'est affichée depuis le
 * 27/09/2026 : Arcel a confirmé que les auxiliaires de vie interviennent dans toute
 * l'Île-de-France, et un kilométrage laisserait croire à une limite.
 */
export function agencyResponse(
  data: Pick<LocalData, "kind" | "code">,
  agency: Pick<Agency, "code_insee" | "departement">,
  t: LocalTexts,
): string {
  if (data.kind === "departement") {
    return agency.departement === data.code
      ? t.reponse.agence_departement
      : t.reponse.agence_hors_departement;
  }
  if (agency.code_insee === data.code) return t.reponse.agence_ici;
  return t.reponse.agence;
}

/** Colonne du rail : 17,5 rem (280 px) + 3 rem d'écart, réservés à droite des sections 2 à 9. */
const withRail = "lg:[&>.container-site]:pr-82";

const linkCard =
  "flex min-h-14 items-center gap-3 rounded-card border border-line bg-white px-4 py-2 font-bold " +
  "no-underline shadow-1 transition-[box-shadow] [transition-duration:var(--duration-base)] " +
  "hover:shadow-2 motion-reduce:transition-none";

/** Lignes démographiques (`data.demographie`) rendues comme des faits sourcés. */
export function demographyFacts(
  demographie: LocalData["demographie"],
  texts: InterfaceTexts["local"]["demographie"],
): LocalFact[] {
  if (!demographie) return [];
  const base = {
    type: "demographie" as const,
    source_url: demographie.source_url,
    source_label: texts.source,
    collected_at: demographie.collected_at,
  };
  const facts: LocalFact[] = [
    {
      ...base,
      label: fill(texts.population, { millesime: demographie.millesime }),
      value: fill(texts.habitants, { n: formatInteger(demographie.population) }),
    },
  ];
  const parts = [
    ["part_75_plus", demographie.part_75_plus],
    ["part_60_74", demographie.part_60_74],
    ["part_75_89", demographie.part_75_89],
    ["part_90_plus", demographie.part_90_plus],
  ] as const;
  for (const [key, value] of parts) {
    if (value !== undefined)
      facts.push({ ...base, label: texts[key], value: formatPercent(value) });
  }
  return facts;
}

export function LocalTemplate({ data: page }: { data: LocalTemplateData }) {
  const {
    data,
    editorial,
    texts,
    navigation,
    phone,
    agency,
    coverage,
    weekExample,
    aids,
    accompagnements,
    crumbs,
    neighbourPaths,
    departementHref,
    confidentialiteHref,
    tarifsHref,
    reassurance,
  } = page;
  const t = texts.local;
  const lieu = localPlace(data, t);
  const h1 = localTitle(data, t);
  const telHref = phone ? toTelHref(phone) : null;
  const photo = localHeroPhoto(data.kind, data.code);
  const surtitle =
    data.kind === "commune" || data.kind === "arrondissement" || data.kind === "quartier"
      ? (data.departement_nom ?? t.sur_titre)
      : t.sur_titre;
  const departementPages: readonly { href: string; label: string }[] = page.departementPages ?? [];
  // Voisines déclarées (lien seulement si leur page est construite), puis les pages proches
  // calculées (`nearbyPages`, toujours construites) à leur rang de distance.
  const declared = data.communes_voisines ?? [];
  const neighbours = [
    ...declared.map((n) => ({
      code: n.code,
      nom: n.nom,
      distance_km: n.distance_km,
      href: neighbourPaths[n.code],
    })),
    ...(page.nearbyPages ?? [])
      .filter((n) => !declared.some((v) => v.code === n.code))
      .map((n) => ({ code: n.code, nom: n.nom, distance_km: n.distance_km, href: n.chemin })),
  ].sort((a, b) => a.distance_km - b.distance_km);
  const insee = formInsee(data);
  /*
   * Scène du territoire (D-032) : la teinte vient du code du département, ou du code de la
   * commune à défaut — deux territoires voisins ne se ressemblent donc pas, et une page garde
   * toujours sa couleur.
   */
  const heroScene = sceneByTerritory(data.departement ?? data.code);
  const searchTexts = { ...texts.recherche_commune, hors: texts.formulaires.hors_idf };
  /*
   * Interaction immédiate du hero (brief docs/design/BRIEF_LIQUID_GLASS.md §4) : la réponse est
   * déjà là — « Oui, nous intervenons à … » et l'agence réelle la plus proche avec sa distance
   * arrondie — et la recherche de commune permet d'en vérifier une autre, au clavier. Aucun fait
   * nouveau : les textes sont ceux de content/interface.json, l'agence celle du pipeline.
   */
  const heroAnswer = (
    <div data-local-reponse-hero="">
      <p className="heading-4 m-0 text-teal-900">{fill(t.reponse.oui, { lieu })}</p>
      {agency ? (
        <p className={cn("m-0 mt-1 text-small", heroWhenRoomy)}>
          {fill(agencyResponse(data, agency, t), {
            agence: agency.nom,
            lieu,
            commune: agency.commune,
          })}
        </p>
      ) : null}
      <TerritorySearch
        className="mt-3"
        texts={searchTexts}
        agencies={agency ? { [agency.id]: agency.nom } : {}}
      />
    </div>
  );
  const rappelTexts = {
    ...texts.formulaires,
    ...texts.formulaires.rappel,
    recherche: texts.recherche_commune,
  };
  // Un lien « Autres pages du territoire » par page réellement construite : jamais de lien mort.
  const otherPages = [
    { href: "/aide-a-domicile/", label: t.territoires },
    ...(departementHref && data.kind !== "departement"
      ? [
          {
            href: departementHref,
            label: fill(t.carte.lien, {
              lieu: localPlace(
                {
                  kind: "departement",
                  nom: data.departement_nom ?? "",
                  code: data.departement ?? data.code,
                  departement: data.departement,
                },
                t,
              ),
            }),
          },
        ]
      : []),
    ...(agency
      ? [
          {
            href: `/agences/${agency.id}/`,
            label: fill(t.reponse.voir_agence, { nom: agency.nom }),
          },
        ]
      : []),
  ];

  return (
    <main
      id="contenu"
      data-local={data.chemin}
      data-local-kind={data.kind}
      data-local-code={data.code}
      data-statut={editorial.statut}
    >
      {/* D-034 : pas de bandeau d'avertissement visible ; la page reste `noindex` (D-033). */}
      {/* 1. Bannière locale : scène du territoire, réponse immédiate et recherche dans le hero. */}
      <HeroSection scene={heroScene} aria-label={surtitle}>
        <Breadcrumb
          texts={texts.fil_ariane}
          items={[...crumbs, { label: data.nom }]}
          className={cn("mb-4", heroOnlyWide)}
        />
        <Hero
          surtitle={surtitle}
          title={h1}
          lead={editorial.sous_titre}
          primary={{ label: texts.boutons.rappel, href: "#formulaire" }}
          secondary={{ label: texts.boutons.demande_detaillee, href: navigation.demande_href }}
          phone={phone && telHref ? { label: formatFrenchPhone(phone), href: telHref } : null}
          reassurance={reassurance}
          tint={sceneTint(heroScene)}
          cue={{ label: fill(t.vivre_h2, { lieu }), href: "#vivre" }}
          gesture={heroAnswer}
          media={
            <PhotoFigure
              src={photo.src}
              alt={photo.alt}
              focal={photo.focal}
              ratio="4:5"
              mobileRatio="16:9"
              radius={28}
              sizes={heroPhotoSizes}
              priority
            />
          }
          thread={{ fil: "generique", knot: photo.focal ?? "50% 50%" }}
        />
      </HeroSection>

      <div className="relative" data-rail-zone>
        {/* 2. Réponse immédiate */}
        <Section
          tone="white"
          aria-labelledby="reponse"
          className={withRail}
          data-local-agence={agency?.id}
        >
          <Heading level={2} id="reponse">
            {fill(t.reponse.oui, { lieu })}
          </Heading>
          {agency ? (
            <div className="mt-6 max-w-2xl rounded-card border border-line bg-white p-6 shadow-1">
              <p className="m-0 text-lead">
                {fill(agencyResponse(data, agency, t), {
                  agence: agency.nom,
                  lieu,
                  commune: agency.commune,
                })}
              </p>
              {coverage ? <p className="m-0 mt-2">{coverage}</p> : null}
              {/* D-036 : rien du tout quand l'agence ne publie pas d'adresse de voie. */}
              {fullAddress(agency) ? <p className="m-0 mt-2">{fullAddress(agency)}</p> : null}
              <ul className="m-0 mt-4 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
                <li className="max-w-none">
                  <Link
                    href={`/agences/${agency.id}/`}
                    prefetch={false}
                    className="inline-flex min-h-12 items-center font-bold"
                  >
                    {fill(t.reponse.voir_agence, { nom: agency.nom })}
                  </Link>
                </li>
                {phone && telHref ? (
                  <li className="max-w-none">
                    <a
                      href={telHref}
                      data-mesure="reponse-locale"
                      className="tabular-figures inline-flex min-h-12 items-center font-bold"
                    >
                      {fill(t.reponse.appeler, { téléphone: formatFrenchPhone(phone) })}
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : phone && telHref ? (
            <p className="mt-6">
              <a
                href={telHref}
                data-mesure="reponse-locale"
                className="tabular-figures inline-flex min-h-12 items-center font-bold"
              >
                {fill(t.reponse.appeler, { téléphone: formatFrenchPhone(phone) })}
              </a>
            </p>
          ) : null}
        </Section>

        {/* 3. Vivre à domicile à … : zone éditoriale unique, puis les repères qu'elle utilise */}
        <Section tone="sand" aria-labelledby="vivre" className={withRail}>
          <Heading level={2} id="vivre">
            {fill(t.vivre_h2, { lieu })}
          </Heading>
          {/*
            La zone éditoriale fait environ 1 300 mots en sept sous-sections : posée à même le fond
            de scène, elle se lisait comme un document brut (relevé par Arcel le 09/10/2026). Elle
            prend la carte blanche déjà utilisée par les autres blocs de la page — même
            `rounded-card`, même liseré, même élévation — pour que le texte long repose sur une
            surface et non sur la couleur de section. La mesure de ligne reste celle de `.prose`.
          */}
          <div
            className="mt-6 max-w-[48rem] rounded-card border border-line bg-white p-6 shadow-1 sm:p-8"
            data-local-editorial
          >
            <Markdown
              source={editorial.zone_editoriale}
              headingLevel={3}
              externalLabel={t.faits.lien_externe}
            />
          </div>
          <Heading level={3} visual={4} className="mt-10">
            {t.reperes_h3}
          </Heading>
          <LocalFactsGrid
            id="reperes"
            className="mt-4 max-w-3xl"
            facts={[
              ...demographyFacts(data.demographie, t.demographie),
              // Les lignes démographiques calculées remplacent les faits `demographie` du pipeline
              // (mêmes valeurs, même source) : pas de doublon dans les repères.
              ...data.facts.filter((fact) => fact.type !== "demographie"),
            ]}
            types={lifeFactTypes}
            texts={t.faits}
            headingLevel={4}
            compact
          />
        </Section>

        {/*
         * 4. « Les ressources près de chez vous » a été retiré le 27/09/2026, à la demande
         * d'Arcel : une page locale ne publie plus l'annuaire des hôpitaux, accueils de jour et
         * guichets de la commune, avec leurs adresses, leurs numéros et leurs liens. Ces lieux
         * peuvent être nommés dans la zone éditoriale, là où ils éclairent une difficulté réelle
         * de la ville, mais sans coordonnées. Les faits restent dans `data/local` : ils nourrissent
         * les repères et les aides, et gardent la traçabilité des sources.
         */}

        {/* 5. Nos accompagnements à … */}
        <Section tone="teal" aria-labelledby="accompagnements" className={withRail}>
          <Heading level={2} id="accompagnements">
            {fill(t.accompagnements_h2, { lieu })}
          </Heading>
          <Lead className="mt-3">{t.accompagnements_texte}</Lead>
          <Reveal
            as="ul"
            variant="stagger"
            className="m-0 mt-8 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3"
            data-local-accompagnements
          >
            {accompagnements.map((item) => {
              const icon = toIconName(item.icone);
              return (
                <li key={item.chemin} className="max-w-none">
                  <Tilt as="article" max={3} className="h-full">
                    <Link href={item.chemin} prefetch={false} className={cn(linkCard, "h-full")}>
                      {icon ? <Icon name={icon} /> : null}
                      <span className="min-w-0 flex-1">{item.libelle}</span>
                    </Link>
                  </Tilt>
                </li>
              );
            })}
          </Reveal>
        </Section>

        {/* 6. Exemple local */}
        {weekExample ? (
          <Section tone="white" aria-labelledby="exemple" className={withRail}>
            <Heading level={2} id="exemple">
              {t.exemple_h2}
            </Heading>
            <Lead className="mt-3">{t.exemple_texte}</Lead>
            <div className="mt-8 rounded-block bg-bg p-4 shadow-1 sm:p-6">
              <WeekPlanner
                title={weekExample.titre}
                context={weekExample.contexte}
                entries={weekExample.entrees}
                texts={texts.semaine_type}
              />
            </div>
            <WeekStory
              className="mt-8"
              story={[weekExample.titre, weekExample.contexte].filter(Boolean).join(". ")}
              photo={weekExample.photo ?? null}
              mention={texts.semaine_type.prenom_fictif}
            />
          </Section>
        ) : null}

        {/* 7. Aides du département */}
        <Section tone="paper" aria-labelledby="aides" className={withRail}>
          <Heading level={2} id="aides">
            {t.aides_h2}
          </Heading>
          <Lead className="mt-3">{t.aides_texte}</Lead>
          <LocalFactsGrid
            id="aides"
            className="mt-8"
            facts={data.facts}
            types={aidFactTypes}
            texts={t.faits}
          />
          {aids.length > 0 ? (
            <Reveal
              as="ul"
              variant="stagger"
              className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-2"
            >
              {aids.map((aid) => (
                <li key={aid.id} className="max-w-none">
                  <AidCard
                    className="h-full"
                    name={aid.nom}
                    forWho={aid.pour_qui}
                    howTo={aid.comment}
                    official={{ label: aid.source.libelle, href: aid.source.href }}
                    detail={{ label: texts.aides.combien, href: aid.page }}
                    headingLevel={3}
                    texts={texts.aides}
                  />
                </li>
              ))}
            </Reveal>
          ) : null}
          <p className="m-0 mt-8">
            <Link href={tarifsHref} className="inline-flex min-h-12 items-center font-bold">
              {t.aides_lien}
            </Link>
          </p>
        </Section>

        {/* 8. Communes voisines (par distance) et autres pages du territoire */}
        {neighbours.length > 0 || otherPages.length > 0 || departementPages.length > 0 ? (
          <Section tone="white" aria-labelledby="voisines" className={withRail}>
            <Heading level={2} id="voisines">
              {data.kind === "departement" ? fill(t.communes_h2, { lieu }) : t.voisines_h2}
            </Heading>
            {departementPages.length > 0 ? (
              <>
                <Lead className="mt-3">{t.communes_texte}</Lead>
                <ul
                  className="m-0 mt-6 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3"
                  data-local-communes
                >
                  {departementPages.map((item) => (
                    <li key={item.href} className="max-w-none">
                      <Link href={item.href} prefetch={false} className={linkCard}>
                        <Icon name="maison" />
                        <span className="min-w-0 flex-1">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {neighbours.length > 0 ? (
              <>
                <Lead className="mt-3">{t.voisines_texte}</Lead>
                <ol
                  className="m-0 mt-6 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3"
                  data-local-voisines
                >
                  {neighbours.map((neighbour) => {
                    const { href } = neighbour;
                    return (
                      /* Une commune sans page ne porte plus la même carte qu'une commune liée
                         (27/09/2026) : quatre-vingt-onze pages mêlaient des cartes identiques
                         dont la moitié n'était pas cliquable. Fond sourd, pas d'ombre, et le
                         nom en texte simple : la différence se voit avant le clic. */
                      <li
                        key={neighbour.code}
                        className={cn(
                          "flex max-w-none items-center justify-between gap-3 rounded-card border border-line px-4 py-2",
                          href ? "bg-white shadow-1" : "bg-sand",
                        )}
                        data-voisine={neighbour.code}
                      >
                        {href ? (
                          <Link
                            href={href}
                            prefetch={false}
                            className="inline-flex min-h-11 items-center font-bold"
                          >
                            {neighbour.nom}
                          </Link>
                        ) : (
                          <span className="inline-flex min-h-11 items-center">{neighbour.nom}</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : null}
            <nav aria-labelledby="autres-pages" className="mt-10">
              <Heading level={3} id="autres-pages" visual={4}>
                {t.autres_pages_h3}
              </Heading>
              <ul className="m-0 mt-4 grid list-none gap-4 p-0 sm:grid-cols-2">
                {otherPages.map((item) => (
                  <li key={item.href} className="max-w-none">
                    <Link href={item.href} prefetch={false} className={linkCard}>
                      <Icon name="maison" />
                      <span className="min-w-0 flex-1">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </Section>
        ) : null}

        {/* 9. Questions locales, puis qui a écrit et quand */}
        <Section tone="sand" aria-labelledby="questions" className={withRail}>
          <Heading level={2} id="questions">
            {t.questions_h2}
          </Heading>
          <FAQ
            className="mt-8"
            items={editorial.questions.map((q) => ({ question: q.question, answer: q.reponse }))}
          />
          <p className="local-review m-0 mt-8 text-small text-text-soft" data-local-review>
            {fill(t.auteur, { nom: editorial.auteur.nom, fonction: editorial.auteur.fonction })}
            {" · "}
            {fill(t.maj, { date: formatFrenchDate(editorial.maj) })}
            {" · "}
            {fill(t.donnees, { date: formatFrenchDate(data.generated_at) })}
          </p>
        </Section>

        {/* Rail de conversion : colonne de droite superposée aux sections 2 à 9. */}
        <div
          className="container-site pointer-events-none absolute inset-0 hidden lg:block"
          data-rail-column
        >
          <div className="pointer-events-auto ml-auto h-full w-70">
            <SiteConversionRail formHref="#formulaire" formId="formulaire" />
          </div>
        </div>
      </div>

      {/* 10. Formulaire avec la commune préremplie : balisage rendu par le serveur, code (et
          liste des communes) chargé à l'approche de la section (DeferredForm, D-030). */}
      <Section
        tone="white"
        id="formulaire"
        aria-labelledby="formulaire-titre"
        className="scroll-mt-20"
        data-local-form-insee={insee}
      >
        <Heading level={2} id="formulaire-titre">
          {t.formulaire_h2}
        </Heading>
        <Lead className="mt-3">{t.formulaire_texte}</Lead>
        <div className="mt-8 max-w-3xl">
          <LazyRappelForm
            texts={rappelTexts}
            phone={phone}
            confidentialiteHref={confidentialiteHref}
            initialInsee={insee}
          />
        </div>
      </Section>
    </main>
  );
}
