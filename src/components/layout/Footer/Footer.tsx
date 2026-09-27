import Link from "next/link";
import type { ReactNode } from "react";
import type { Agency, NavigationChild } from "@/content/schemas";

/*
 * Pied de page (docs/00 §5, docs/02 §7) : fond teal-900, texte blanc (10,29). Coordonnées et
 * agences depuis site.config.json, quatre colonnes de liens (pour qui, services, territoires,
 * entreprise), labels seulement s'ils sont réellement détenus, mentions légales, signature.
 * L'emplacement du mode confort de lecture est réservé (`comfortSlot`, P1.7).
 */

export interface FooterTexts {
  nous_joindre: string;
  nos_agences: string;
  pour_qui: string;
  nos_services: string;
  territoires: string;
  entreprise: string;
  labels: string;
  navigation_pied: string;
  toutes_les_agences: string;
  /** Contient {territoire}. */
  aide_a_domicile_en: string;
  /** Contient {nom}. */
  voir_agence: string;
}

export interface FooterProps {
  brandName: string;
  signature: string;
  phones: { display: string; href: string }[];
  email: string | null;
  agencies: Agency[];
  zones: { nom: string; slug: string }[];
  audiences: NavigationChild[];
  services: NavigationChild[];
  company: NavigationChild[];
  legal: NavigationChild[];
  /** Labels réellement détenus (detenu === true). */
  labels: { id: string; nom: string }[];
  texts: FooterTexts;
  comfortSlot?: ReactNode;
}

/*
 * Chaque lien du pied de page est une cible de 44 px de haut (WCAG 2.5.8, audit P9.6 : les liens
 * des colonnes mesuraient 22 px). La hauteur remplace l'écart vertical de la liste (`gap`), le
 * dessin ne change donc presque pas.
 */
const linkClass = "inline-flex min-h-11 items-center text-white no-underline hover:underline";

function LinkColumn({
  title,
  links,
  id,
}: {
  title: string;
  links: { libelle: string; href: string }[];
  id: string;
}) {
  return (
    <nav aria-labelledby={id}>
      <h2 id={id} className="heading-4 text-white">
        {title}
      </h2>
      <ul className="m-0 mt-2 flex list-none flex-col p-0">
        {links.map((link) => (
          <li key={link.href} className="max-w-none">
            <Link href={link.href} className={linkClass}>
              {link.libelle}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer({
  brandName,
  signature,
  phones,
  email,
  agencies,
  zones,
  audiences,
  services,
  company,
  legal,
  labels,
  texts,
  comfortSlot,
}: FooterProps) {
  const year = new Date().getFullYear();
  const territories = [
    ...zones.map((zone) => ({
      libelle: texts.aide_a_domicile_en.replace("{territoire}", zone.nom),
      href: `/aide-a-domicile/${zone.slug}/`,
    })),
    { libelle: texts.toutes_les_agences, href: "/agences/" },
  ];

  return (
    // La barre d'action mobile recouvre 4 rem en bas de l'écran jusqu'à 64 rem : le pied réserve
    // la place, sinon sa dernière ligne (mentions légales) reste inatteignable (D-032 §6).
    <footer className="mt-16 bg-footer-bg text-footer-text" data-print="hide">
      <div className="container-site pt-12 pb-[calc(3rem+4rem+env(safe-area-inset-bottom))] lg:pb-12">
        <div className="flex flex-col gap-4 border-b border-white/20 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="heading-3 text-white">{brandName}</p>
            <p className="lead mt-1 text-white">{signature}</p>
          </div>
          {comfortSlot}
        </div>

        <div className="mt-10 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <section aria-labelledby="pied-joindre">
            <h2 id="pied-joindre" className="heading-4 text-white">
              {texts.nous_joindre}
            </h2>
            <ul className="m-0 mt-2 flex list-none flex-col p-0">
              {phones.map((phone) => (
                <li key={phone.href} className="max-w-none">
                  <a
                    href={phone.href}
                    data-mesure="pied-de-page"
                    className={`tabular-figures ${linkClass}`}
                  >
                    {phone.display}
                  </a>
                </li>
              ))}
              {email ? (
                <li className="max-w-none">
                  <a href={`mailto:${email}`} className={linkClass}>
                    {email}
                  </a>
                </li>
              ) : null}
            </ul>
          </section>

          <LinkColumn id="pied-pour-qui" title={texts.pour_qui} links={audiences} />
          <LinkColumn id="pied-services" title={texts.nos_services} links={services} />
          <LinkColumn id="pied-territoires" title={texts.territoires} links={territories} />
        </div>

        {/* `nav`, comme les autres colonnes de liens : une région « Nos agences » ferait doublon avec
            celle de la carte régionale (axe landmark-unique, RGAA 12.6). */}
        {agencies.length > 0 ? (
          <nav aria-labelledby="pied-agences" className="mt-10 border-t border-white/20 pt-8">
            <h2 id="pied-agences" className="heading-4 text-white">
              {texts.nos_agences}
            </h2>
            <ul className="m-0 mt-3 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {agencies.map((agency) => (
                <li key={agency.id} className="max-w-none">
                  <Link
                    href={`/agences/${agency.id}/`}
                    className="block text-white no-underline hover:underline"
                    aria-label={`${texts.voir_agence.replace("{nom}", agency.nom)}, ${agency.adresse}, ${agency.code_postal} ${agency.commune}`}
                  >
                    <span className="block font-bold">{agency.nom}</span>
                    <span className="block text-small text-white/85">
                      {agency.adresse}, {agency.code_postal} {agency.commune}
                    </span>
                  </Link>
                  {agency.telephone ? (
                    <a
                      href={`tel:${agency.telephone.replace(/\s/g, "")}`}
                      data-mesure="pied-de-page"
                      className={`tabular-figures mt-1 text-small ${linkClass}`}
                    >
                      {agency.telephone}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <div className="mt-10 grid gap-10 border-t border-white/20 pt-8 lg:grid-cols-[1fr_auto]">
          <LinkColumn id="pied-entreprise" title={texts.entreprise} links={company} />
          {labels.length > 0 ? (
            <section aria-labelledby="pied-labels">
              <h2 id="pied-labels" className="heading-4 text-white">
                {texts.labels}
              </h2>
              <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
                {labels.map((label) => (
                  <li
                    key={label.id}
                    className="max-w-none rounded-full border border-white/40 px-3 py-1 text-small"
                  >
                    {label.nom}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {/* Liens légaux : cible de 44 px de haut (WCAG 2.5.8, audit P8.4 R-3) ; le retrait du
            padding compense la hauteur ajoutée, la ligne garde sa place dans le dessin. */}
        <nav
          aria-label={texts.navigation_pied}
          className="mt-10 flex flex-col gap-3 border-t border-white/20 pt-3 text-small sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
        >
          <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-0 p-0">
            {legal.map((link) => (
              <li key={link.href} className="max-w-none">
                <Link href={link.href} className={`inline-flex min-h-11 items-center ${linkClass}`}>
                  {link.libelle}
                </Link>
              </li>
            ))}
          </ul>
          <p className="m-0 text-white/85">
            © {year} {brandName}
          </p>
        </nav>
      </div>
    </footer>
  );
}
