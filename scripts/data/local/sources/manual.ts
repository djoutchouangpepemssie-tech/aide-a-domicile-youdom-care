import type { LocalFact } from "../../../../src/content/local-schema";
import { fact } from "../facts";
import type { SourceRef, TerritoryContext } from "../types";

/*
 * Faits saisis à la main depuis des pages officielles (docs/04 §5 : « saisies à la main avec
 * source ») : transport adapté PAM Île-de-France et associations départementales. Chaque entrée
 * porte l'adresse exacte de la page consultée et la date de consultation. À revérifier à chaque
 * exécution en ligne : `checkManualSources` ouvre chaque page (statut HTTP).
 */

export const MANUAL_COLLECTED_AT = "2026-09-20";

/** PAM Île-de-France : service régional unique depuis 2024 (les PAM départementaux y ont été intégrés). */
export const PAM = {
  label: "PAM Île-de-France — transport à la demande pour personnes à mobilité réduite",
  value:
    "Service régional d'Île-de-France Mobilités couvrant les huit départements. Réservation au 0800 00 18 18 (service et appel gratuits, 7 h à 20 h), inscription en ligne ou par courrier. Ouvert notamment aux titulaires d'une carte mobilité inclusion mention invalidité ou d'une carte d'invalidité (taux ≥ 80 %) et aux personnes âgées classées en GIR 1 à 4.",
  address: "Agence commerciale : 24 allée Vivaldi, 75012 Paris",
  telephone: "0800 00 18 18",
  url: "https://pam.iledefrance-mobilites.fr/",
  source_url: "https://pam.iledefrance-mobilites.fr/inscription/eligibilite",
  source_label: "Île-de-France Mobilités — PAM (pages « éligibilité » et « agences PAM »)",
} as const;

export interface ManualAssociation {
  departement: string;
  label: string;
  value: string;
  address?: string;
  telephone?: string;
  url: string;
  source_url: string;
  source_label: string;
}

const FA = "France Alzheimer — page « Contactez votre association locale » et page départementale";
const FP = "France Parkinson — page « Les comités »";
const APF = "APF France handicap Île-de-France — pages « Présentation du territoire »";

export const ASSOCIATIONS: readonly ManualAssociation[] = [
  // France Alzheimer (https://www.francealzheimer.org/association/qui-sommes-nous/contactez-votre-association-locale/)
  { departement: "75", label: "France Alzheimer Paris", value: "Association départementale France Alzheimer : accueil et écoute des familles", address: "Notre Dame de Bon Secours, 68 rue des Plantes, bâtiment D1, 75014 Paris", telephone: "01 45 40 30 91", url: "https://www.francealzheimer.org/paris/", source_url: "https://www.francealzheimer.org/paris/", source_label: FA },
  { departement: "77", label: "France Alzheimer Seine-et-Marne", value: "Association départementale France Alzheimer : accueil et écoute des familles", address: "15 rue des Prés, 113 bis, 77310 Saint-Fargeau-Ponthierry", telephone: "06 38 45 49 83", url: "https://www.francealzheimer.org/seineetmarne/", source_url: "https://www.francealzheimer.org/seineetmarne/", source_label: FA },
  { departement: "78", label: "France Alzheimer Yvelines", value: "Association départementale France Alzheimer : accueil et écoute des familles", address: "6 place Royale, 78000 Versailles", telephone: "01 39 50 03 86", url: "https://www.francealzheimer.org/yvelines/", source_url: "https://www.francealzheimer.org/yvelines/", source_label: FA },
  { departement: "91", label: "France Alzheimer Essonne", value: "Association départementale France Alzheimer : accueil et écoute des familles", address: "52 rue Louis Robert, 91100 Corbeil-Essonnes", telephone: "01 60 88 20 07", url: "https://www.francealzheimer.org/essonne/", source_url: "https://www.francealzheimer.org/essonne/", source_label: FA },
  { departement: "92", label: "France Alzheimer Hauts-de-Seine", value: "Association départementale France Alzheimer : accueil et écoute des familles", address: "94 avenue Achille Peretti, 92200 Neuilly-sur-Seine", telephone: "01 46 24 68 31", url: "https://www.francealzheimer.org/hautsdeseine/", source_url: "https://www.francealzheimer.org/hautsdeseine/", source_label: FA },
  { departement: "93", label: "France Alzheimer 93 et maladies apparentées", value: "Association départementale France Alzheimer : accueil et écoute des familles", address: "91 avenue de la Résistance, 93340 Le Raincy", telephone: "01 41 53 00 05", url: "https://www.francealzheimer.org/seinesaintdenis/", source_url: "https://www.francealzheimer.org/seinesaintdenis/", source_label: FA },
  { departement: "94", label: "France Alzheimer Val-de-Marne", value: "Association départementale France Alzheimer : accueil et écoute des familles, sur rendez-vous", address: "4 rue du Maréchal Vaillant, 94130 Nogent-sur-Marne", telephone: "01 48 72 87 82", url: "https://www.francealzheimer.org/valdemarne/", source_url: "https://www.francealzheimer.org/valdemarne/", source_label: FA },
  { departement: "95", label: "France Alzheimer Val-d'Oise", value: "Association départementale France Alzheimer : accueil et écoute des familles", address: "16 rue Ampère, bâtiment A, 95000 Pontoise", telephone: "06 70 94 18 84", url: "https://www.francealzheimer.org/valdoise/", source_url: "https://www.francealzheimer.org/valdoise/", source_label: FA },
  // France Parkinson (https://www.franceparkinson.fr/les-comites/) : les comités n'ont pas de locaux ; le 94 n'y figure pas.
  { departement: "75", label: "France Parkinson — Comité de Paris (75)", value: "Comité départemental de bénévoles ; permanence téléphonique les mercredi, jeudi et vendredi de 10 h à 12 h et de 14 h à 16 h", address: "Courrier : 18 rue des Terres au Curé, 75013 Paris", telephone: "01 84 60 69 50", url: "https://www.franceparkinson.fr/comite-75/", source_url: "https://www.franceparkinson.fr/les-comites/", source_label: FP },
  { departement: "77", label: "France Parkinson — Comité de Seine-et-Marne (77)", value: "Comité départemental de bénévoles (Chessy)", telephone: "07 64 76 29 00", url: "https://www.franceparkinson.fr/comite-77/", source_url: "https://www.franceparkinson.fr/les-comites/", source_label: FP },
  { departement: "78", label: "France Parkinson — Comité des Yvelines (78)", value: "Comité départemental de bénévoles (Élancourt)", telephone: "07 64 76 28 56", url: "https://www.franceparkinson.fr/comite-78/", source_url: "https://www.franceparkinson.fr/les-comites/", source_label: FP },
  { departement: "91", label: "France Parkinson — Comité de l'Essonne (91)", value: "Comité départemental de bénévoles (Ris-Orangis)", telephone: "06 82 28 02 90", url: "https://www.franceparkinson.fr/comite-91/", source_url: "https://www.franceparkinson.fr/les-comites/", source_label: FP },
  { departement: "92", label: "France Parkinson — Comité des Hauts-de-Seine (92)", value: "Comité départemental de bénévoles (Saint-Cloud)", telephone: "06 33 46 24 84", url: "https://www.franceparkinson.fr/comite-92/", source_url: "https://www.franceparkinson.fr/les-comites/", source_label: FP },
  { departement: "93", label: "France Parkinson — Comité de Seine-Saint-Denis (93)", value: "Comité départemental de bénévoles (Montreuil)", telephone: "06 68 83 85 11", url: "https://www.franceparkinson.fr/comite-93/", source_url: "https://www.franceparkinson.fr/les-comites/", source_label: FP },
  { departement: "95", label: "France Parkinson — Comité du Val-d'Oise (95)", value: "Comité départemental de bénévoles (Saint-Leu-la-Forêt)", telephone: "07 69 41 99 94", url: "https://www.franceparkinson.fr/comite-95/", source_url: "https://www.franceparkinson.fr/les-comites/", source_label: FP },
  // APF France handicap Île-de-France (les sous-sites départementaux redirigent vers le site régional ; 78, 92 et 95 n'y sont pas publiés).
  { departement: "75", label: "APF France handicap — Délégation de Paris", value: "Permanence le mercredi de 14 h à 16 h et le jeudi de 15 h à 17 h ; dd.75@apf.asso.fr", address: "44 rue des Longues Raies, 75013 Paris", telephone: "01 53 80 92 97", url: "https://iledefrance.apf-francehandicap.org/presentation-territoire-75-93", source_url: "https://iledefrance.apf-francehandicap.org/presentation-territoire-75-93", source_label: APF },
  { departement: "93", label: "APF France handicap — Délégation de Seine-Saint-Denis", value: "Permanence le lundi et le vendredi de 10 h à 12 h ; dd.93@apf.asso.fr", address: "89 rue Benoît Frachon, 93000 Bobigny", telephone: "01 48 10 25 35", url: "https://iledefrance.apf-francehandicap.org/presentation-territoire-75-93", source_url: "https://iledefrance.apf-francehandicap.org/presentation-territoire-75-93", source_label: APF },
  { departement: "91", label: "APF France handicap — Délégation de l'Essonne", value: "Délégation départementale ; dd.91@apf.asso.fr", address: "14 rue Léo Lagrange, 91700 Sainte-Geneviève-des-Bois", telephone: "01 60 15 31 35", url: "https://iledefrance.apf-francehandicap.org/presentation-du-territoire", source_url: "https://iledefrance.apf-francehandicap.org/presentation-du-territoire", source_label: APF },
  { departement: "94", label: "APF France handicap — Délégation du Val-de-Marne", value: "Délégation départementale ; dd.94@apf.asso.fr", address: "34 rue de Brie, 94000 Créteil", telephone: "01 42 07 17 25", url: "https://iledefrance.apf-francehandicap.org/presentation-du-territoire", source_url: "https://iledefrance.apf-francehandicap.org/presentation-du-territoire", source_label: APF },
  { departement: "77", label: "APF France handicap — Délégation de Seine-et-Marne", value: "Délégation départementale ; contact : dd.77@apf.asso.fr", url: "https://iledefrance.apf-francehandicap.org/presentation-du-territoire", source_url: "https://iledefrance.apf-francehandicap.org/presentation-du-territoire", source_label: APF },
];

export const MANUAL_SOURCES: readonly SourceRef[] = [
  { label: "Île-de-France Mobilités — PAM Île-de-France", url: PAM.source_url, collected_at: MANUAL_COLLECTED_AT },
  { label: "France Alzheimer — associations départementales", url: "https://www.francealzheimer.org/association/qui-sommes-nous/contactez-votre-association-locale/", collected_at: MANUAL_COLLECTED_AT },
  { label: "France Parkinson — comités", url: "https://www.franceparkinson.fr/les-comites/", collected_at: MANUAL_COLLECTED_AT },
  { label: "APF France handicap Île-de-France — territoires", url: "https://iledefrance.apf-francehandicap.org/presentation-du-territoire", collected_at: MANUAL_COLLECTED_AT },
];

export function pamFact(): LocalFact {
  return fact({
    type: "transport-adapte",
    label: PAM.label,
    value: PAM.value,
    address: PAM.address,
    telephone: PAM.telephone,
    url: PAM.url,
    source_url: PAM.source_url,
    source_label: PAM.source_label,
    collected_at: MANUAL_COLLECTED_AT,
  });
}

export function manualFacts(ctx: TerritoryContext): LocalFact[] {
  const facts: LocalFact[] = [pamFact()];
  if (!ctx.departement) return facts;
  for (const a of ASSOCIATIONS) {
    if (a.departement !== ctx.departement) continue;
    facts.push(
      fact({
        type: "association",
        label: a.label,
        value: a.value,
        address: a.address,
        telephone: a.telephone,
        url: a.url,
        source_url: a.source_url,
        source_label: a.source_label,
        collected_at: MANUAL_COLLECTED_AT,
      }),
    );
  }
  return facts;
}

/** Pages consultées à la main : chacune est ouverte une fois ; renvoie les adresses qui ne répondent pas 2xx/3xx. */
export async function checkManualSources(fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const urls = new Set<string>([PAM.url, PAM.source_url, ...ASSOCIATIONS.map((a) => a.source_url)]);
  const failures: string[] = [];
  for (const url of urls) {
    try {
      const response = await fetchImpl(url, {
        method: "GET",
        redirect: "follow",
        headers: { "user-agent": "Mozilla/5.0 (compatible; youdom-care-data-local/1.0)" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) failures.push(`${url} → HTTP ${response.status}`);
    } catch (error) {
      failures.push(`${url} → ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return failures;
}
