import { getAidPage, listAidPageIds } from "@/content/aid-pages";
import { listFormDefinitions } from "@/content/form-definitions";
import {
  getAbout,
  getCallbackPage,
  getCaregiverCheckPage,
  getInterfaceTexts,
  getModesPage,
  getNavigation,
  getPricingPage,
  getRequestIndexPage,
  getSiteMapPage,
  getSpecialForms,
} from "@/content/loader";
import type { SiteMapPage } from "@/content/schemas";
import type { ServicePage } from "@/content/service-schema";
import { listBuildableServicePages } from "@/content/services";

/*
 * Plan du site (docs/04 §2 « Maillage », P5.5) : toutes les pages construites et indexables,
 * par groupe, en listes imbriquées. Les pages services viennent de `listBuildableServicePages`
 * (en production, une page `a_relire` n'y est pas) ; les routes statiques sont déclarées ici,
 * avec le libellé de leur fil d'Ariane ou de la navigation, et le test de la page vérifie
 * qu'elles existent toutes dans `src/app` et qu'aucune page statique indexable n'y manque.
 * Jamais listées : /merci/, /styleguide/, /api/ (`neverIndexedPaths`) et le plan lui-même.
 * Les pages légales (phase 8) s'ajoutent dans `legalRoutes` quand elles existent.
 */

export interface SiteMapEntry {
  href: string;
  label: string;
  children?: SiteMapEntry[];
}

export interface SiteMapGroup {
  id: keyof SiteMapPage["groupes"];
  title: string;
  entries: SiteMapEntry[];
}

/** Pages légales construites (phase 8) : `{ href, label }` à ajouter quand elles existent. */
export const legalRoutes: readonly SiteMapEntry[] = [];

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

export async function buildSiteMap(): Promise<SiteMapGroup[]> {
  const page = getSiteMapPage();
  const navigation = getNavigation();
  const texts = getInterfaceTexts();
  const services = (await listBuildableServicePages()).map((p) => p.meta);
  const menu = (id: string) => navigation.principale.find((item) => item.id === id)?.enfants ?? [];
  const menuLabel = (id: string) =>
    navigation.principale.find((item) => item.id === id)?.libelle ?? "";

  const subPages = (pilier: ServicePage): SiteMapEntry[] =>
    services
      .filter((p) => p.pilier === pilier.chemin)
      .sort(byOrderThenPath)
      .map((p) => ({ href: p.chemin, label: p.libelle_court ?? p.h1 }));
  const pilierEntry = (pilier: ServicePage): SiteMapEntry => {
    const children = subPages(pilier);
    return {
      href: pilier.chemin,
      label: texts.service.publics[pilier.public],
      ...(children.length > 0 ? { children } : {}),
    };
  };

  // Accueil et fonctionnement.
  const pricingPage = getPricingPage();
  const aidEntries = listAidPageIds()
    .map((id) => ({ id, page: getAidPage(id) }))
    .filter(
      (entry): entry is { id: string; page: NonNullable<typeof entry.page> } => entry.page !== null,
    )
    .map(({ id, page: aid }) => ({ href: `/tarifs-et-aides/${id}/`, label: aid.ariane }));
  const fonctionnement: SiteMapEntry[] = [
    { href: "/", label: texts.fil_ariane.accueil },
    {
      href: "/comment-ca-marche/",
      label: menuLabel("comment-ca-marche"),
      children: [
        { href: "/comment-ca-marche/prestataire-ou-mandataire/", label: getModesPage().ariane },
      ],
    },
    {
      href: "/tarifs-et-aides/",
      label: pricingPage.ariane,
      ...(aidEntries.length > 0 ? { children: aidEntries } : {}),
    },
  ];

  // Pour qui : les piliers dans l'ordre du menu, leurs sous-pages en retrait ; l'espace Aidants à part.
  const pourQuiMenu = menu("pour-qui").map((child) => child.href);
  const piliers = orderByMenu(
    services.filter((p) => p.type === "pilier"),
    pourQuiMenu,
  );
  const pourQui = piliers.filter((p) => p.public !== "aidant").map(pilierEntry);

  const caregiverCheck = getCaregiverCheckPage();
  const ouEnEtesVous: SiteMapEntry = {
    href: "/aidants/ou-en-etes-vous/",
    label: caregiverCheck.ariane,
  };
  const aidantsPilier = piliers.find((p) => p.public === "aidant");
  const aidants: SiteMapEntry[] = aidantsPilier
    ? [
        {
          href: aidantsPilier.chemin,
          label: texts.service.publics.aidant,
          children: [...subPages(aidantsPilier), ouEnEtesVous],
        },
      ]
    : [ouEnEtesVous];

  // Nos services : dans l'ordre du menu, avec son libellé.
  const servicesMenu = menu("services");
  const servicesEntries = orderByMenu(
    services.filter((p) => p.type === "service"),
    servicesMenu.map((child) => child.href),
  ).map((p) => ({
    href: p.chemin,
    label:
      servicesMenu.find((child) => child.href === p.chemin)?.libelle ?? p.libelle_court ?? p.h1,
  }));

  // Formulaires : l'aiguillage et ses cas, le rappel, le contact.
  const requestIndex = getRequestIndexPage();
  const specialForms = getSpecialForms();
  const formulaires: SiteMapEntry[] = [
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

  // À propos.
  const about = getAbout();
  const entreprise: SiteMapEntry[] = [
    {
      href: "/a-propos/",
      label: about.a_propos.ariane,
      children: [
        { href: "/a-propos/nos-engagements/", label: about.engagements_page.ariane },
        { href: "/a-propos/charte-editoriale/", label: about.charte_page.ariane },
      ],
    },
  ];

  const groups: SiteMapGroup[] = [
    { id: "fonctionnement", title: page.groupes.fonctionnement, entries: fonctionnement },
    { id: "pour_qui", title: page.groupes.pour_qui, entries: pourQui },
    { id: "services", title: page.groupes.services, entries: servicesEntries },
    { id: "aidants", title: page.groupes.aidants, entries: aidants },
    { id: "formulaires", title: page.groupes.formulaires, entries: formulaires },
    { id: "entreprise", title: page.groupes.entreprise, entries: entreprise },
    { id: "legal", title: page.groupes.legal, entries: [...legalRoutes] },
  ];
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
