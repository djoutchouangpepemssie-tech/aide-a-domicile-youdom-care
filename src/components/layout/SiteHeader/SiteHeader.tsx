import { Header } from "@/components/layout/Header/Header";
import { ComfortToggle } from "@/components/ui/ComfortToggle/ComfortToggle";
import { getInterfaceTexts, getNavigation, getSiteConfig } from "@/content/loader";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";

/** En-tête branché sur le contenu : marque, téléphone et navigation viennent de content/. */
export function SiteHeader() {
  const { marque, contact } = getSiteConfig();
  const navigation = getNavigation();
  const { en_tete, boutons, confort } = getInterfaceTexts();

  const telHref = contact.telephone_principal ? toTelHref(contact.telephone_principal) : null;
  const phone =
    contact.telephone_principal && telHref
      ? { display: formatFrenchPhone(contact.telephone_principal), href: telHref }
      : null;

  return (
    <Header
      brandName={marque.nom}
      phone={phone}
      navigation={navigation.principale}
      callbackHref={navigation.rappel_href}
      callbackLabel={boutons.rappel}
      texts={en_tete}
      comfortSlot={<ComfortToggle texts={confort} />}
      comfortSlotCompact={<ComfortToggle texts={confort} compact />}
    />
  );
}
