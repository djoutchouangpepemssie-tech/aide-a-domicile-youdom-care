import { Footer } from "@/components/layout/Footer/Footer";
import { ComfortToggle } from "@/components/ui/ComfortToggle/ComfortToggle";
import { getInterfaceTexts, getNavigation, getSiteConfig } from "@/content/loader";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";

/** Pied de page branché sur le contenu : tout vient de site.config.json et navigation.json. */
export function SiteFooter() {
  const { marque, contact, agences, zones, labels } = getSiteConfig();
  const navigation = getNavigation();
  const { pied_de_page, confort } = getInterfaceTexts();

  const phones = [contact.telephone_principal, contact.telephone_mobile]
    .filter((value): value is string => value !== null)
    .map((value) => ({ display: formatFrenchPhone(value), href: toTelHref(value) }))
    .filter((phone): phone is { display: string; href: string } => phone.href !== null);

  const audiences = navigation.principale.find((item) => item.id === "pour-qui")?.enfants ?? [];
  const services = navigation.principale.find((item) => item.id === "services")?.enfants ?? [];

  return (
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
  );
}
