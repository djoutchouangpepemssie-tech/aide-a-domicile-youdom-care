import { MobileActionBar } from "@/components/layout/MobileActionBar/MobileActionBar";
import { getInterfaceTexts, getNavigation, getSiteConfig } from "@/content/loader";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";

/** Barre d'action mobile branchée sur le contenu. */
export function SiteMobileActionBar() {
  const { contact } = getSiteConfig();
  const navigation = getNavigation();
  const { barre_mobile } = getInterfaceTexts();

  const telHref = contact.telephone_principal ? toTelHref(contact.telephone_principal) : null;
  const phone =
    contact.telephone_principal && telHref
      ? { display: formatFrenchPhone(contact.telephone_principal), href: telHref }
      : null;

  return (
    <MobileActionBar
      phone={phone}
      callbackHref={navigation.rappel_href}
      requestHref={navigation.demande_href}
      texts={barre_mobile}
    />
  );
}
