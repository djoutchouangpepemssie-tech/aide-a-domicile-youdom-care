import type { SiteConfig } from "@/content/schemas";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";

/*
 * Mentions légales générées depuis la configuration (docs/07 §2, P8.3). Ces fonctions pures
 * transforment `site.config.json` (legal, contact, marque) en listes « libellé / valeur » :
 * un champ `null` n'apparaît pas, jamais de « à compléter ». check-legal réutilise
 * `missingLegalFields` pour signaler, en production, les champs obligatoires absents.
 */

export interface LegalEntry {
  /** Clé du champ dans site.config.json (identifiant stable pour les tests et le rendu). */
  id: string;
  label: string;
  value: string;
  /** Adresse `mailto:` ou `tel:` quand la valeur est un moyen de contact. */
  href?: string;
}

export interface EditorLabels {
  nom_commercial: string;
  raison_sociale: string;
  forme_juridique: string;
  capital: string;
  siege_social: string;
  rcs: string;
  siret: string;
  code_ape: string;
  tva_intracommunautaire: string;
  telephone: string;
  email: string;
  directeur_publication: string;
}

type LegalField = keyof Omit<SiteConfig["legal"], "autorisations" | "hebergeur">;

const editorFields: readonly Exclude<LegalField, "numero_sap" | "mediateur_consommation">[] = [
  "raison_sociale",
  "forme_juridique",
  "capital",
  "siege_social",
  "rcs",
  "siret",
  "code_ape",
  "tva_intracommunautaire",
];

/** Bloc « Éditeur » : nom commercial, champs renseignés de `legal`, téléphone, e-mail, directeur. */
export function editorEntries(
  config: Pick<SiteConfig, "marque" | "contact" | "legal">,
  labels: EditorLabels,
): LegalEntry[] {
  const entries: LegalEntry[] = [
    { id: "nom_commercial", label: labels.nom_commercial, value: config.marque.nom },
  ];
  for (const field of editorFields) {
    const value = config.legal[field];
    if (value !== null) entries.push({ id: field, label: labels[field], value });
  }
  if (config.contact.telephone_principal !== null) {
    const href = toTelHref(config.contact.telephone_principal);
    entries.push({
      id: "telephone",
      label: labels.telephone,
      value: formatFrenchPhone(config.contact.telephone_principal),
      ...(href ? { href } : {}),
    });
  }
  if (config.contact.email !== null) {
    entries.push({
      id: "email",
      label: labels.email,
      value: config.contact.email,
      href: `mailto:${config.contact.email}`,
    });
  }
  if (config.legal.directeur_publication !== null) {
    entries.push({
      id: "directeur_publication",
      label: labels.directeur_publication,
      value: config.legal.directeur_publication,
    });
  }
  return entries;
}

export interface HostLabels {
  nom: string;
  adresse: string;
  contact: string;
}

/** Bloc « Hébergement » : nom toujours présent, adresse et contact s'ils sont renseignés. */
export function hostEntries(legal: SiteConfig["legal"], labels: HostLabels): LegalEntry[] {
  const { hebergeur } = legal;
  const entries: LegalEntry[] = [{ id: "hebergeur_nom", label: labels.nom, value: hebergeur.nom }];
  if (hebergeur.adresse !== null) {
    entries.push({ id: "hebergeur_adresse", label: labels.adresse, value: hebergeur.adresse });
  }
  if (hebergeur.contact !== null) {
    entries.push({ id: "hebergeur_contact", label: labels.contact, value: hebergeur.contact });
  }
  return entries;
}

/**
 * Champs de `legal` exigés avant la mise en ligne (docs/07 §2, P8.3) : raison sociale, forme,
 * siège, immatriculation (RCS ou RNE), directeur de la publication, médiateur, adresse et
 * contact de l'hébergeur, et au moins une autorisation quand le mode mandataire est proposé.
 * Renvoie les chemins manquants (« legal.rcs », « legal.hebergeur.adresse »…).
 */
export function missingLegalFields(
  config: Pick<SiteConfig, "legal" | "modes_intervention">,
): string[] {
  const { legal } = config;
  const missing: string[] = [];
  const required: readonly LegalField[] = [
    "raison_sociale",
    "forme_juridique",
    "siege_social",
    "rcs",
    "directeur_publication",
    "mediateur_consommation",
  ];
  for (const field of required) {
    if (legal[field] === null) missing.push(`legal.${field}`);
  }
  if (legal.hebergeur.adresse === null) missing.push("legal.hebergeur.adresse");
  if (legal.hebergeur.contact === null) missing.push("legal.hebergeur.contact");
  if (config.modes_intervention.includes("mandataire") && legal.autorisations.length === 0) {
    missing.push("legal.autorisations (mode mandataire proposé)");
  }
  return missing;
}
