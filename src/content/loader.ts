import { z } from "zod";
import commitmentsJson from "../../content/engagements.json";
import interfaceJson from "../../content/interface.json";
import navigationJson from "../../content/navigation.json";
import siteConfigJson from "../../content/site.config.json";
import aboutJson from "../../content/pages/a-propos.json";
import homePageJson from "../../content/pages/accueil.json";
import thanksJson from "../../content/pages/merci.json";
import callbackJson from "../../content/pages/etre-rappele.json";
import requestIndexJson from "../../content/pages/demande.json";
import specialFormsJson from "../../content/pages/formulaires-speciaux.json";
import emailsJson from "../../content/emails.json";
import howItWorksJson from "../../content/pages/comment-ca-marche.json";
import caregiverCheckJson from "../../content/pages/ou-en-etes-vous.json";
import siteMapJson from "../../content/pages/plan-du-site.json";
import notFoundJson from "../../content/pages/404.json";
import modesJson from "../../content/pages/prestataire-ou-mandataire.json";
import pricingPageJson from "../../content/pages/tarifs-et-aides.json";
import aidsJson from "../../content/aides.json";
import weekExamplesJson from "../../content/semaines-types.json";
import pricingJson from "../../content/tarifs.json";
import regionPageJson from "../../content/pages/aide-a-domicile.json";
import agenciesPageJson from "../../content/pages/agences.json";
import lexiquePageJson from "../../content/pages/lexique.json";
import { lexiquePageSchema, type LexiquePage } from "./lexique-schema";
import magazinePageJson from "../../content/pages/magazine.json";
import editorialCharterJson from "../../content/pages/charte-editoriale.json";
import {
  editorialCharterSchema,
  magazinePageSchema,
  type EditorialCharterContent,
  type MagazinePageContent,
} from "./magazine-schema";
import {
  aboutSchema,
  thanksSchema,
  callbackPageSchema,
  requestIndexSchema,
  specialFormsSchema,
  emailsSchema,
  aidsSchema,
  commitmentsSchema,
  homePageSchema,
  howItWorksSchema,
  caregiverCheckSchema,
  type CaregiverCheckPage,
  siteMapPageSchema,
  type SiteMapPage,
  notFoundPageSchema,
  type NotFoundPage,
  interfaceSchema,
  modesPageSchema,
  navigationSchema,
  pricingPageSchema,
  pricingSchema,
  siteConfigSchema,
  weekExamplesSchema,
  type AboutContent,
  type ThanksContent,
  type CallbackPage,
  type RequestIndexPage,
  type SpecialForms,
  type EmailTexts,
  type Aids,
  type Commitments,
  type HomePage,
  type HowItWorksPage,
  type InterfaceTexts,
  type ModesPage,
  type Navigation,
  type Pricing,
  type PricingPage,
  type SiteConfig,
  type WeekExamples,
  regionPageSchema,
  type RegionPage,
  agenciesPageSchema,
  type AgenciesPage,
} from "./schemas";

/*
 * Chargeur typé du contenu. Chaque fichier est validé à la première lecture ; une erreur de
 * schéma lève une exception lisible, ce qui fait échouer le build (les pages sont statiques).
 */

function parseContent<T extends z.ZodType>(schema: T, data: unknown, file: string): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`content/${file} est invalide :\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

let siteConfig: SiteConfig | undefined;
let pricing: Pricing | undefined;
let commitments: Commitments | undefined;
let interfaceTexts: InterfaceTexts | undefined;
let navigation: Navigation | undefined;
let weekExamples: WeekExamples | undefined;

export function getNavigation(): Navigation {
  navigation ??= parseContent(navigationSchema, navigationJson, "navigation.json");
  return navigation;
}

export function getWeekExamples(): WeekExamples {
  weekExamples ??= parseContent(weekExamplesSchema, weekExamplesJson, "semaines-types.json");
  return weekExamples;
}

let homePage: HomePage | undefined;

export function getHomePage(): HomePage {
  homePage ??= parseContent(homePageSchema, homePageJson, "pages/accueil.json");
  return homePage;
}

let howItWorks: HowItWorksPage | undefined;

export function getHowItWorksPage(): HowItWorksPage {
  howItWorks ??= parseContent(howItWorksSchema, howItWorksJson, "pages/comment-ca-marche.json");
  return howItWorks;
}

let caregiverCheck: CaregiverCheckPage | undefined;

export function getCaregiverCheckPage(): CaregiverCheckPage {
  caregiverCheck ??= parseContent(
    caregiverCheckSchema,
    caregiverCheckJson,
    "pages/ou-en-etes-vous.json",
  );
  return caregiverCheck;
}

let siteMapPage: SiteMapPage | undefined;

export function getSiteMapPage(): SiteMapPage {
  siteMapPage ??= parseContent(siteMapPageSchema, siteMapJson, "pages/plan-du-site.json");
  return siteMapPage;
}

let notFoundPage: NotFoundPage | undefined;

export function getNotFoundPage(): NotFoundPage {
  notFoundPage ??= parseContent(notFoundPageSchema, notFoundJson, "pages/404.json");
  return notFoundPage;
}

let modesPage: ModesPage | undefined;

export function getModesPage(): ModesPage {
  modesPage ??= parseContent(modesPageSchema, modesJson, "pages/prestataire-ou-mandataire.json");
  return modesPage;
}

let pricingPage: PricingPage | undefined;
let aids: Aids | undefined;

export function getPricingPage(): PricingPage {
  pricingPage ??= parseContent(pricingPageSchema, pricingPageJson, "pages/tarifs-et-aides.json");
  return pricingPage;
}

export function getAids(): Aids {
  aids ??= parseContent(aidsSchema, aidsJson, "aides.json");
  return aids;
}

let about: AboutContent | undefined;

export function getAbout(): AboutContent {
  about ??= parseContent(aboutSchema, aboutJson, "pages/a-propos.json");
  return about;
}

let callbackPage: CallbackPage | undefined;

export function getCallbackPage(): CallbackPage {
  callbackPage ??= parseContent(callbackPageSchema, callbackJson, "pages/etre-rappele.json");
  return callbackPage;
}

let requestIndex: RequestIndexPage | undefined;

export function getRequestIndexPage(): RequestIndexPage {
  requestIndex ??= parseContent(requestIndexSchema, requestIndexJson, "pages/demande.json");
  return requestIndex;
}

let specialForms: SpecialForms | undefined;

export function getSpecialForms(): SpecialForms {
  specialForms ??= parseContent(
    specialFormsSchema,
    specialFormsJson,
    "pages/formulaires-speciaux.json",
  );
  return specialForms;
}

let emails: EmailTexts | undefined;

export function getEmailTexts(): EmailTexts {
  emails ??= parseContent(emailsSchema, emailsJson, "emails.json");
  return emails;
}

let thanks: ThanksContent | undefined;

export function getThanksPage(): ThanksContent {
  thanks ??= parseContent(thanksSchema, thanksJson, "pages/merci.json");
  return thanks;
}

let regionPage: RegionPage | undefined;

/** Carte régionale /aide-a-domicile/ (docs/04 §4, P6.5). */
export function getRegionPage(): RegionPage {
  regionPage ??= parseContent(regionPageSchema, regionPageJson, "pages/aide-a-domicile.json");
  return regionPage;
}

let agenciesPage: AgenciesPage | undefined;

/**
 * Pages des agences (P6.6). Chaque agence de site.config.json doit avoir ses balises titre et
 * description dans `agences` : une entrée manquante interrompt le build.
 */
export function getAgenciesPage(): AgenciesPage {
  if (!agenciesPage) {
    const parsed = parseContent(agenciesPageSchema, agenciesPageJson, "pages/agences.json");
    const missing = getSiteConfig()
      .agences.map((agency) => agency.id)
      .filter((id) => !(id in parsed.agences));
    if (missing.length > 0) {
      throw new Error(
        `content/pages/agences.json : aucune balise titre pour l'agence ${missing.join(", ")}`,
      );
    }
    agenciesPage = parsed;
  }
  return agenciesPage;
}

let magazinePage: MagazinePageContent | undefined;

/** Index et rubriques du magazine « Le Fil » (docs/06 §2, P7.1). */
export function getMagazinePage(): MagazinePageContent {
  magazinePage ??= parseContent(magazinePageSchema, magazinePageJson, "pages/magazine.json");
  return magazinePage;
}

let editorialCharter: EditorialCharterContent | undefined;

/** Section « Le Fil » de la charte éditoriale (docs/06 §4). */
export function getEditorialCharter(): EditorialCharterContent {
  editorialCharter ??= parseContent(
    editorialCharterSchema,
    editorialCharterJson,
    "pages/charte-editoriale.json",
  );
  return editorialCharter;
}

let lexiquePage: LexiquePage | undefined;

/** Index du lexique /lexique/ (docs/06 §6, P7.2) ; les termes sont dans src/content/lexique.ts. */
export function getLexiquePage(): LexiquePage {
  lexiquePage ??= parseContent(lexiquePageSchema, lexiquePageJson, "pages/lexique.json");
  return lexiquePage;
}

export function getSiteConfig(): SiteConfig {
  siteConfig ??= parseContent(siteConfigSchema, siteConfigJson, "site.config.json");
  return siteConfig;
}

export function getPricing(): Pricing {
  pricing ??= parseContent(pricingSchema, pricingJson, "tarifs.json");
  return pricing;
}

export function getCommitments(): Commitments {
  commitments ??= parseContent(commitmentsSchema, commitmentsJson, "engagements.json");
  return commitments;
}

export function getInterfaceTexts(): InterfaceTexts {
  interfaceTexts ??= parseContent(interfaceSchema, interfaceJson, "interface.json");
  return interfaceTexts;
}

/** Valide les quatre fichiers d'un coup (utilisé par les contrôles et les tests). */
export function loadAllContent() {
  return {
    siteConfig: getSiteConfig(),
    pricing: getPricing(),
    commitments: getCommitments(),
    interfaceTexts: getInterfaceTexts(),
    navigation: getNavigation(),
    weekExamples: getWeekExamples(),
    homePage: getHomePage(),
    howItWorks: getHowItWorksPage(),
    caregiverCheck: getCaregiverCheckPage(),
    siteMapPage: getSiteMapPage(),
    notFoundPage: getNotFoundPage(),
    modesPage: getModesPage(),
    pricingPage: getPricingPage(),
    aids: getAids(),
    about: getAbout(),
    thanks: getThanksPage(),
    callbackPage: getCallbackPage(),
    requestIndex: getRequestIndexPage(),
    specialForms: getSpecialForms(),
    emails: getEmailTexts(),
    regionPage: getRegionPage(),
    agenciesPage: getAgenciesPage(),
    magazinePage: getMagazinePage(),
    editorialCharter: getEditorialCharter(),
    lexiquePage: getLexiquePage(),
  };
}
