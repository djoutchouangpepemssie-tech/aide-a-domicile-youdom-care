import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/layout/Section/Section";
import { FactList } from "@/components/legal/FactList";
import { LegalHeader } from "@/components/legal/LegalHeader";
import { Heading } from "@/components/ui/Heading/Heading";
import { Prose } from "@/components/ui/Prose/Prose";
import { getPhotoCredits, groupByAuthor } from "@/content/credits";
import { getMentionsLegales, MENTIONS_LEGALES_PATH } from "@/content/legal";
import { getSiteConfig } from "@/content/loader";
import { editorEntries, hostEntries } from "@/lib/legal/mentions";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * /mentions-legales/ (docs/07 §2, P8.3) : générée depuis content/site.config.json. Chaque champ
 * de `legal` n'est affiché que s'il est renseigné ; directeur de la publication et médiateur
 * n'apparaissent que renseignés ; les autorisations seulement s'il en existe. Crédits
 * photographiques lus dans public/images/CREDITS.md ; licences des données ouvertes des pages
 * locales (D-027). Textes : content/legal/mentions-legales.json.
 */

export function generateMetadata(): Metadata {
  const { seo } = getMentionsLegales();
  return pageMetadata({
    titre: seo.titre,
    description: seo.description,
    chemin: MENTIONS_LEGALES_PATH,
  });
}

export default function MentionsLegalesPage() {
  const page = getMentionsLegales();
  const config = getSiteConfig();
  const { legal } = config;
  const editor = editorEntries(config, page.editeur.libelles);
  const host = hostEntries(legal, page.hebergeur.libelles);
  const credits = groupByAuthor(getPhotoCredits().photos);
  const licences = getPhotoCredits().licences;
  const sap = page.services_a_la_personne;

  return (
    <main id="contenu">
      <LegalHeader
        ariane={page.ariane}
        h1={page.h1}
        chapo={page.chapo}
        maj={page.maj}
        majLibelle={page.maj_libelle}
      />

      <Section tone="white" aria-labelledby="editeur">
        <Heading level={2} id="editeur">
          {page.editeur.h2}
        </Heading>
        <p className="mt-3">{page.editeur.intro}</p>
        <FactList entries={editor} />
      </Section>

      {legal.numero_sap !== null || legal.autorisations.length > 0 ? (
        <Section tone="teal" aria-labelledby="sap">
          <Heading level={2} id="sap">
            {sap.h2}
          </Heading>
          {legal.numero_sap !== null ? (
            <p className="mt-3" data-fait="numero_sap">
              {sap.texte_numero.replace("{numero}", legal.numero_sap)}
            </p>
          ) : null}
          {legal.autorisations.length > 0 ? (
            <div className="mt-6" data-fait="autorisations">
              <Heading level={3} visual={4}>
                {sap.autorisations_h3}
              </Heading>
              <p className="mt-2">{sap.autorisations_intro}</p>
              <ul className="mt-3">
                {legal.autorisations.map((a) => {
                  const details = [
                    a.departement !== null ? `${sap.libelles.departement} ${a.departement}` : null,
                    a.publics.length > 0
                      ? `${sap.libelles.publics} : ${a.publics.join(", ")}`
                      : null,
                    a.mode !== null ? `${sap.libelles.mode} : ${sap.libelles.modes[a.mode]}` : null,
                    a.reference !== null ? `${sap.libelles.reference} ${a.reference}` : null,
                    a.date !== null ? `${sap.libelles.date} ${a.date}` : null,
                  ].filter((part): part is string => part !== null);
                  return (
                    <li key={`${a.libelle}-${a.departement ?? ""}-${a.mode ?? ""}`}>
                      <span className="font-bold">{a.libelle}</span>
                      {details.length > 0 ? ` — ${details.join(" · ")}` : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </Section>
      ) : null}

      <Section tone="paper" aria-labelledby="hebergement">
        <Heading level={2} id="hebergement">
          {page.hebergeur.h2}
        </Heading>
        <FactList entries={host} />
      </Section>

      {legal.mediateur_consommation !== null ? (
        <Section tone="white" aria-labelledby="mediation">
          <Heading level={2} id="mediation">
            {page.mediation.h2}
          </Heading>
          <p className="mt-3">{page.mediation.texte}</p>
          <p className="mt-3 font-bold" data-fait="mediateur_consommation">
            {legal.mediateur_consommation}
          </p>
        </Section>
      ) : null}

      <Section
        tone={legal.mediateur_consommation !== null ? "sand" : "white"}
        aria-labelledby="propriete"
      >
        <Heading level={2} id="propriete">
          {page.propriete_intellectuelle.h2}
        </Heading>
        <Prose className="mt-4">
          {page.propriete_intellectuelle.paragraphes.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </Prose>
      </Section>

      <Section tone="paper" aria-labelledby="credits">
        <Heading level={2} id="credits">
          {page.credits.h2}
        </Heading>
        <Prose className="mt-4">
          <p>{page.credits.intro}</p>
        </Prose>
        {licences.length > 0 ? (
          <p className="mt-4">
            <span className="font-bold">{page.credits.licences_libelle} : </span>
            {licences.map((licence, index) => (
              <span key={licence.href}>
                {index > 0 ? " · " : null}
                <a href={licence.href} rel="noopener">
                  {licence.source}
                </a>
              </span>
            ))}
          </p>
        ) : null}
        <ul className="m-0 mt-6 grid list-none gap-3 p-0 md:grid-cols-2" data-credits>
          {credits.map((group) => (
            <li
              key={`${group.auteur}-${group.source}`}
              className="max-w-none rounded-card border border-line bg-white p-4 text-small"
            >
              <span className="block font-bold">{group.auteur}</span>
              <span className="block text-text-soft">
                {group.source} · {group.licence} ·{" "}
                {group.photos.length === 1
                  ? page.credits.photo_une
                  : page.credits.photos_n.replace("{n}", String(group.photos.length))}
              </span>
              <span className="mt-1 block">
                {group.photos.map((photo, index) => (
                  <span key={photo.href}>
                    {index > 0 ? ", " : null}
                    <a
                      href={photo.href}
                      rel="noopener"
                      aria-label={`${group.auteur}, ${photo.fichier}`}
                    >
                      {page.credits.lien_photo.replace("{n}", String(index + 1))}
                    </a>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="white" aria-labelledby="donnees-ouvertes">
        <Heading level={2} id="donnees-ouvertes">
          {page.donnees_ouvertes.h2}
        </Heading>
        <Prose className="mt-4">
          <p>{page.donnees_ouvertes.intro}</p>
        </Prose>
        <ul className="m-0 mt-6 grid list-none gap-3 p-0" data-donnees-ouvertes>
          {page.donnees_ouvertes.jeux.map((jeu) => {
            const licence = page.donnees_ouvertes.licences[jeu.licence];
            return (
              <li
                key={jeu.href + jeu.jeu}
                className="max-w-none rounded-card border border-line bg-bg p-4"
              >
                <span className="block font-bold">{jeu.producteur}</span>
                <span className="block">
                  <a href={jeu.href} rel="noopener">
                    {jeu.jeu}
                  </a>
                </span>
                {licence ? (
                  <span className="block text-small text-text-soft">
                    <a href={licence.href} rel="noopener">
                      {licence.libelle}
                    </a>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section tone="teal" aria-labelledby="donnees-personnelles">
        <Heading level={2} id="donnees-personnelles">
          {page.donnees_personnelles.h2}
        </Heading>
        <p className="mt-3">{page.donnees_personnelles.texte}</p>
        <ul className="m-0 mt-4 flex list-none flex-wrap gap-x-8 gap-y-2 p-0">
          {page.donnees_personnelles.liens.map((lien) => (
            <li key={lien.href} className="max-w-none">
              <Link href={lien.href} className="inline-flex min-h-12 items-center font-bold">
                {lien.libelle}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
