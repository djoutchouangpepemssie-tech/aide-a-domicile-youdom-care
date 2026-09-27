import { getAidPage, listAidPageIds } from "@/content/aid-pages";
import { MAGAZINE_PATH, rubriquePath } from "@/content/article-meta";
import { articleRubriques, rubriqueLabels } from "@/content/article-schema";
import { articlesOfRubrique, listBuildableArticles } from "@/content/articles";
import { listFormDefinitions } from "@/content/form-definitions";
import { listLegalPages } from "@/content/legal";
import { APPLY_PATH, listLiveOffers, RECRUITMENT_PATH } from "@/content/offres";
import {
  getAbout,
  getAccessibilityPage,
  getAgenciesPage,
  getCallbackPage,
  getCaregiverCheckPage,
  getInterfaceTexts,
  getLexiquePage,
  getMagazinePage,
  getModesPage,
  getNavigation,
  getPricingPage,
  getProfessionalsPage,
  getRecruitmentPage,
  getRegionPage,
  getRequestIndexPage,
  getSiteConfig,
  getSiteMapPage,
  getSpecialForms,
} from "@/content/loader";
import { departementCodeOf, listBuildableLocalPages } from "@/content/local";
import type { SiteMapPage } from "@/content/schemas";
import type { ServicePage } from "@/content/service-schema";
import { listBuildableServicePages } from "@/content/services";
import { getToolsPage, listToolPages, TOOLS_PATH, toolPath } from "@/content/tool-pages";

/*
 * Plan du site (docs/04 §2 « Maillage », P5.5) : toutes les pages construites et indexables,
 * par groupe, en listes imbriquées. Les pages services viennent de `listBuildableServicePages`
 * (en production, une page `a_relire` n'y est pas) ; les routes statiques sont déclarées ici,
 * avec le libellé de leur fil d'Ariane ou de la navigation, et le test de la page vérifie
 * qu'elles existent toutes dans `src/app` et qu'aucune page statique indexable n'y manque.
 * Jamais listées : /merci/, /styleguide/, /api/ (`neverIndexedPaths`) et le plan lui-même.
 * Les pages légales (phase 8) s'ajoutent dans `legalRoutes` quand elles existent. Territoires
 * (phase 6) : la carte régionale, les pages de département construites avec leurs communes et
 * arrondissements en retrait, l'index des agences et chaque agence réelle.
 *
 * Chaque groupe a son constructeur (P9.4) : `buildSiteMap` les assemble tous dans l'ordre de
 * la page ; `findSiteMapGroup` ne construit que ce qu'il faut pour trouver le groupe d'une
 * page, les groupes légers d'abord (JSON) et les lourds ensuite (services, articles, pages
 * locales), pour le bloc « À lire aussi » des pages d'un même groupe (GroupLinks).
 */

export interface SiteMapEntry {
  href: string;
  label: string;
  children?: SiteMapEntry[];
}

export type SiteMapGroupId = keyof SiteMapPage["groupes"];

export interface SiteMapGroup {
  id: SiteMapGroupId;
  title: string;
  entries: SiteMapEntry[];
}

/** Ordre d'affichage des groupes sur la page. */
export const siteMapGroupOrder: readonly SiteMapGroupId[] = [
  "fonctionnement",
  "pour_qui",
  "services",
  "aidants",
  "formulaires",
  "territoires",
  "entreprise",
  "magazine",
  "outils",
  "legal",
];

/** Ordre de recherche d'une page : les groupes qui ne lisent que du JSON d'abord. */
const lookupOrder: readonly SiteMapGroupId[] = [
  "fonctionnement",
  "entreprise",
  "legal",
  "outils",
  "formulaires",
  "pour_qui",
  "services",
  "aidants",
  "magazine",
  "territoires",
];

/**
 * Pages légales construites (phase 8) : les quatre pages de P8.3 (content/legal/*.json, dans
 * l'ordre du pied de page), puis la déclaration d'accessibilité /accessibilite/ (P8.4).
 */
export function legalRoutes(): SiteMapEntry[] {
  return [
    ...listLegalPages().map((page) => ({ href: page.chemin, label: page.ariane })),
    { href: "/accessibilite/", label: getAccessibilityPage().ariane },
  ];
}

function byOrderThenPath(a: ServicePage, b: ServicePage): number {
  return (
    (a.ordre ?? Number.MAX_SAFE_INTEGER) - (b.ordre ?? Number.MAX_SAFE_INTEGER) ||
    a.chemin.localeCompare(b.chemin, "fr")
  );
}

/** Ordre d'une liste de pages selon les adresses d'un menu ; les autres suivent, par chemin. */
function orderByMenu(pages: ServicePage[], menuHrefs: readonly string[]): ServicePage[] {
  const rank = new Map(menuHrefs.map((href, index) => [href, index] as const));
  return [...pages].sort(
    (a, b) =>
      (rank.get(a.chemin) ?? Number.MAX_SAFE_INTEGER) -
        (rank.get(b.chemin) ?? Number.MAX_SAFE_INTEGER) || a.chemin.localeCompare(b.chemin, "fr"),
  );
}

/** Constructeurs des groupes, avec les lectures partagées (services) faites une fois. */
function groupBuilders(): Record<SiteMapGroupId, () => Promise<SiteMapEntry[]>> {
  const navigation = getNavigation();
  const texts = getInterfaceTexts();
  const menu = (id: string) => navigation.principale.find((item) => item.id === id)?.enfants ?? [];
  const menuLabel = (id: string) =>
    navigation.principale.find((item) => item.id === id)?.libelle ?? "";

  let servicesCache: Promise<ServicePage[]> | undefined;
  const services = () => {
    servicesCache ??= listBuildableServicePages().then((pages) => pages.map((p) => p.meta));
    return servicesCache;
  };
  const subPages = (all: ServicePage[], pilier: ServicePage): SiteMapEntry[] =>
    all
      .filter((p) => p.pilier === pilier.chemin)
      .sort(byOrderThenPath)
      .map((p) => ({ href: p.chemin, label: p.libelle_court ?? p.h1 }));
  const pilierEntry = (all: ServicePage[], pilier: ServicePage): SiteMapEntry => {
    const children = subPages(all, pilier);
    return {
      href: pilier.chemin,
      label: texts.service.publics[pilier.public],
      ...(children.length > 0 ? { children } : {}),
    };
  };
  const piliers = async () =>
    orderByMenu(
      (await services()).filter((p) => p.type === "pilier"),
      menu("pour-qui").map((child) => child.href),
    );

  return {
    // Accueil et fonctionnement.
    fonctionnement: async () => {
      const pricingPage = getPricingPage();
      const aidEntries = listAidPageIds()
        .map((id) => ({ id, page: getAidPage(id) }))
        .filter(
          (entry): entry is { id: string; page: NonNullable<typeof entry.page> } =>
            entry.page !== null,
        )
        .map(({ id, page: aid }) => ({ href: `/tarifs-et-aides/${id}/`, label: aid.ariane }));
      return [
        { href: "/", label: texts.fil_ariane.accueil },
        {
          href: "/comment-ca-marche/",
          label: menuLabel("comment-ca-marche"),
          children: [
            {
              href: "/comment-ca-marche/prestataire-ou-mandataire/",
              label: getModesPage().ariane,
            },
          ],
        },
        {
          href: "/tarifs-et-aides/",
          label: pricingPage.ariane,
          ...(aidEntries.length > 0 ? { children: aidEntries } : {}),
        },
      ];
    },

    // Pour qui : les piliers dans l'ordre du menu, leurs sous-pages en retrait ; l'espace Aidants à part.
    pour_qui: async () => {
      const all = await services();
      return (await piliers())
        .filter((p) => p.public !== "aidant")
        .map((pilier) => pilierEntry(all, pilier));
    },

    // Nos services : dans l'ordre du menu, avec son libellé.
    services: async () => {
      const servicesMenu = menu("services");
      return orderByMenu(
        (await services()).filter((p) => p.type === "service"),
        servicesMenu.map((child) => child.href),
      ).map((p) => ({
        href: p.chemin,
        label:
          servicesMenu.find((child) => child.href === p.chemin)?.libelle ?? p.libelle_court ?? p.h1,
      }));
    },

    aidants: async () => {
      const caregiverCheck = getCaregiverCheckPage();
      const ouEnEtesVous: SiteMapEntry = {
        href: "/aidants/ou-en-etes-vous/",
        label: caregiverCheck.ariane,
      };
      const all = await services();
      const aidantsPilier = (await piliers()).find((p) => p.public === "aidant");
      return aidantsPilier
        ? [
            {
              href: aidantsPilier.chemin,
              label: texts.service.publics.aidant,
              children: [...subPages(all, aidantsPilier), ouEnEtesVous],
            },
          ]
        : [ouEnEtesVous];
    },

    // Formulaires : l'aiguillage et ses cas, le rappel, le contact.
    formulaires: async () => {
      const requestIndex = getRequestIndexPage();
      const specialForms = getSpecialForms();
      return [
        {
          href: navigation.demande_href,
          label: requestIndex.ariane,
          children: [
            ...listFormDefinitions().map((definition) => ({
              href: `/demande/${definition.slug}/`,
              label: definition.ariane,
            })),
            {
              href: "/demande/sortie-d-hospitalisation/",
              label: specialForms.sortie_hospitalisation.ariane,
            },
            { href: "/demande/professionnel/", label: specialForms.professionnel.ariane },
          ],
        },
        { href: navigation.rappel_href, label: getCallbackPage().ariane },
        { href: navigation.contact_href, label: specialForms.contact.ariane },
      ];
    },

    // Territoires et agences : seulement les pages locales construites, par département.
    territoires: async () => {
      const localPages = await listBuildableLocalPages();
      const zones = getSiteConfig().zones;
      const departementEntries: SiteMapEntry[] = [];
      for (const zone of zones) {
        const departement = localPages.find(
          (p) => p.data.kind === "departement" && departementCodeOf(p) === zone.code,
        );
        const communes = localPages
          .filter((p) => p.data.kind !== "departement" && departementCodeOf(p) === zone.code)
          .sort((a, b) => a.chemin.localeCompare(b.chemin, "fr"))
          .map((p) => ({ href: p.chemin, label: p.data.nom }));
        if (departement) {
          departementEntries.push({
            href: departement.chemin,
            label: zone.nom,
            ...(communes.length > 0 ? { children: communes } : {}),
          });
        } else {
          departementEntries.push(...communes);
        }
      }
      const agenciesPage = getAgenciesPage();
      return [
        {
          href: "/aide-a-domicile/",
          label: getRegionPage().ariane,
          ...(departementEntries.length > 0 ? { children: departementEntries } : {}),
        },
        {
          href: "/agences/",
          label: agenciesPage.index.ariane,
          children: getSiteConfig().agences.map((agency) => ({
            href: `/agences/${agency.id}/`,
            label: agency.nom,
          })),
        },
      ];
    },

    // À propos, professionnels, recrutement (docs/03 §9, P8.1 et P8.2) : la candidature et les
    // offres publiées (aucune aujourd'hui) en retrait du recrutement.
    entreprise: async () => {
      const about = getAbout();
      const recruitment = getRecruitmentPage();
      const liveOffers = await listLiveOffers();
      return [
        {
          href: "/a-propos/",
          label: about.a_propos.ariane,
          children: [
            { href: "/a-propos/nos-engagements/", label: about.engagements_page.ariane },
            { href: "/a-propos/charte-editoriale/", label: about.charte_page.ariane },
          ],
        },
        { href: "/professionnels/", label: getProfessionalsPage().ariane },
        {
          href: RECRUITMENT_PATH,
          label: recruitment.ariane,
          children: [
            { href: APPLY_PATH, label: recruitment.postuler.ariane },
            ...liveOffers.map((entry) => ({ href: entry.chemin, label: entry.offer.titre })),
          ],
        },
      ];
    },

    // Magazine « Le Fil » (docs/06 §2, P7.1) : l'index, les six rubriques et leurs articles construits.
    magazine: async () => {
      const magazinePage = getMagazinePage();
      const articles = await listBuildableArticles();
      return [
        {
          href: MAGAZINE_PATH,
          label: magazinePage.ariane,
          children: articleRubriques.map((rubrique) => {
            const children = articlesOfRubrique(articles, rubrique).map((article) => ({
              href: article.chemin,
              label: article.meta.titre,
            }));
            return {
              href: rubriquePath(rubrique),
              label: rubriqueLabels[rubrique],
              ...(children.length > 0 ? { children } : {}),
            };
          }),
        },
        // Lexique du Fil (docs/06 §6, P7.2) : l'index seulement, les termes sont sur la page même.
        { href: "/lexique/", label: getLexiquePage().ariane },
      ];
    },

    // Outils à imprimer (docs/06 §7, P7.7) : l'index et les cinq documents en retrait.
    outils: async () => {
      const toolsPage = getToolsPage();
      return [
        {
          href: TOOLS_PATH,
          label: toolsPage.ariane,
          children: listToolPages().map((tool) => ({
            href: toolPath(tool.id),
            label: tool.ariane,
          })),
        },
      ];
    },

    legal: async () => legalRoutes(),
  };
}

export async function buildSiteMap(): Promise<SiteMapGroup[]> {
  const page = getSiteMapPage();
  const builders = groupBuilders();
  const groups: SiteMapGroup[] = [];
  for (const id of siteMapGroupOrder) {
    groups.push({ id, title: page.groupes[id], entries: await builders[id]() });
  }
  return groups.filter((group) => group.entries.length > 0);
}

/** Toutes les adresses du plan, à plat (tests, contrôles). */
export function flattenSiteMap(groups: readonly SiteMapGroup[]): string[] {
  const out: string[] = [];
  const walk = (entries: readonly SiteMapEntry[]) => {
    for (const entry of entries) {
      out.push(entry.href);
      if (entry.children) walk(entry.children);
    }
  };
  for (const group of groups) walk(group.entries);
  return out;
}

/**
 * Groupe du plan qui contient la page, construit à la demande, les groupes légers d'abord ;
 * null si aucun groupe ne la liste (page hors plan : /merci/, /plan-du-site/, pagination…).
 */
export async function findSiteMapGroup(chemin: string): Promise<SiteMapGroup | null> {
  const page = getSiteMapPage();
  const builders = groupBuilders();
  for (const id of lookupOrder) {
    const entries = await builders[id]();
    if (flattenSiteMap([{ id, title: page.groupes[id], entries }]).includes(chemin)) {
      return { id, title: page.groupes[id], entries };
    }
  }
  return null;
}
