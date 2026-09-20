import { ConversionRail } from "@/components/blocks/ConversionRail/ConversionRail";
import { getInterfaceTexts, getNavigation, getSiteConfig } from "@/content/loader";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";

export interface SiteConversionRailProps {
  /** Formulaire du cas : ancre de la page (« #formulaire ») ou page dédiée. */
  formHref: string;
  /** `id` de la section du formulaire : le rail se masque quand elle est visible. */
  formId?: string;
  className?: string;
}

/** Rail de conversion branché sur le contenu : téléphone, rappel, libellés et réassurance viennent de content/. */
export function SiteConversionRail({ formHref, formId, className }: SiteConversionRailProps) {
  const { contact } = getSiteConfig();
  const navigation = getNavigation();
  const { boutons, rail_conversion } = getInterfaceTexts();

  const telHref = contact.telephone_principal ? toTelHref(contact.telephone_principal) : null;
  const phone =
    contact.telephone_principal && telHref
      ? { display: formatFrenchPhone(contact.telephone_principal), href: telHref }
      : null;

  return (
    <ConversionRail
      phone={phone}
      callbackHref={navigation.rappel_href}
      formHref={formHref}
      formId={formId}
      texts={{
        nom: rail_conversion.nom,
        appeler: rail_conversion.appeler,
        rappel: boutons.rappel,
        demande: boutons.demande_detaillee,
        reassurance: rail_conversion.reassurance,
      }}
      className={className}
    />
  );
}
