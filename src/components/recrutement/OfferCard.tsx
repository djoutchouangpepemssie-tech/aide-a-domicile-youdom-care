import Link from "next/link";
import { Card } from "@/components/ui/Card/Card";
import { Heading } from "@/components/ui/Heading/Heading";
import type { LoadedOffer } from "@/content/offres";
import type { InterfaceTexts } from "@/content/schemas";

/*
 * Carte d'une offre publiée (docs/03 §9, P8.2) : titre, contrat et temps de travail, agence de
 * rattachement, secteur, date de publication et fin de validité. Tout vient du JSON de l'offre
 * et de site.config.json ; la rémunération n'est affichée que si l'offre l'indique.
 */

export type OfferTexts = InterfaceTexts["recrutement"];

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatOfferDate(iso: string): string {
  return dateFormat.format(new Date(`${iso}T12:00:00Z`));
}

export function formatSalary(
  salaire: NonNullable<LoadedOffer["offer"]["salaire"]>,
  texts: OfferTexts,
) {
  const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
  return texts.salaire_fourchette
    .replace("{min}", number.format(salaire.min))
    .replace("{max}", number.format(salaire.max))
    .replace("{unite}", texts.unites_salaire[salaire.unite]);
}

export function OfferCard({ entry, texts }: { entry: LoadedOffer; texts: OfferTexts }) {
  const { offer, agency, chemin } = entry;
  return (
    <Card as="li" className="max-w-none" interactive>
      <Heading level={3} visual={4}>
        <Link href={chemin} className="no-underline hover:underline">
          {offer.titre}
        </Link>
      </Heading>
      <p className="m-0 mt-3">{offer.description}</p>
      <dl className="m-0 mt-4 grid gap-1 text-small">
        <div className="flex gap-2">
          <dt className="font-bold">{texts.contrat}</dt>
          <dd className="m-0">
            {texts.contrats[offer.contrat]},{" "}
            {texts.temps[offer.temps_de_travail].toLocaleLowerCase("fr-FR")}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-bold">{texts.lieu}</dt>
          <dd className="m-0">
            {agency.nom} · {agency.code_postal} {agency.commune}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-bold">{texts.secteur}</dt>
          <dd className="m-0">{offer.secteur}</dd>
        </div>
        {offer.salaire ? (
          <div className="flex gap-2">
            <dt className="font-bold">{texts.salaire}</dt>
            <dd className="m-0">{formatSalary(offer.salaire, texts)}</dd>
          </div>
        ) : null}
      </dl>
      <p className="m-0 mt-4 text-small text-text-soft">
        {texts.publiee_le.replace("{date}", formatOfferDate(offer.publiee_le))} ·{" "}
        {texts.valable_jusqu_au.replace("{date}", formatOfferDate(offer.valable_jusqu_au))}
      </p>
    </Card>
  );
}
