import { Footer } from "@/components/layout/Footer/Footer";
import { ComfortToggle } from "@/components/ui/ComfortToggle/ComfortToggle";
import { getInterfaceTexts, getNavigation, getSiteConfig } from "@/content/loader";
import { JsonLd } from "@/lib/jsonld/JsonLd";
import { findLogo } from "@/lib/jsonld/logo";
import { organization } from "@/lib/jsonld/organization";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";

/**
 * Pied de page branché sur le contenu : tout vient de site.config.json et navigation.json.
 * Porte aussi le JSON-LD `Organization` (docs/04 §2), une fois par page puisque le pied de
 * page est dans la mise en page racine ; `@id` = `${url}/#organization`.
 */
export function SiteFooter() {
  const siteConfig = getSiteConfig();
  const { marque, contact, agences, zones, labels } = siteConfig;
  const navigation = getNavigation();
  const { pied_de_page, confort } = getInterfaceTexts();
  const organizationNode = organization(siteConfig, { logo: findLogo() });

  const phones = [contact.telephone_principal, contact.telephone_mobile]
    .filter((value): value is string => value !== null)
    .map((value) => ({ display: formatFrenchPhone(value), href: toTelHref(value) }))
    .filter((phone): phone is { display: string; href: string } => phone.href !== null);

  const audiences = navigation.principale.find((item) => item.id === "pour-qui")?.enfants ?? [];
  const services = navigation.principale.find((item) => item.id === "services")?.enfants ?? [];

  return (
    <>
      <JsonLd data={organizationNode} />
      <Footer
        brandName={marque.nom}
        signature={marque.signature}
        phones={phones}
        email={contact.email}
        agencies={agences}
        zones={zones}
        audiences={audiences}
        services={services}
        company={navigation.pied_de_page.entreprise}
        legal={navigation.pied_de_page.legal}
        labels={labels.filter((label) => label.detenu === true)}
        texts={pied_de_page}
        comfortSlot={<ComfortToggle texts={confort} tone="dark" />}
      />
    </>
  );
}
