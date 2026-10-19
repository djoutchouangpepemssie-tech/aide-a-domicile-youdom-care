import Link from "next/link";
import { Card } from "@/components/ui/Card/Card";
import { Heading } from "@/components/ui/Heading/Heading";

export default function BureauAccueil() {
  return (
    <>
      <Heading level={1} visual={2}>
        Bureau
      </Heading>
      <p className="max-w-[60ch]">
        L’espace de travail des équipes : les plannings, les foyers, les intervenants. Les données
        ne passent jamais par ce site — elles sont lues directement, depuis votre navigateur, sur le
        serveur qui les héberge.
      </p>
      <ul className="m-0 mt-6 grid list-none gap-4 p-0 md:grid-cols-2">
        <li>
          <Card as="article" padding="md">
            <Heading level={2} visual={4} className="m-0">
              <Link href="/bureau/semaine/">La semaine</Link>
            </Heading>
            <p className="m-0 mt-2">
              Le planning de l’agence, les créneaux à pourvoir et ce que vos règles signalent.
            </p>
          </Card>
        </li>
        <li>
          <Card as="article" padding="md">
            <Heading level={2} visual={4} className="m-0">
              <Link href="/bureau/connexion/">Se connecter</Link>
            </Heading>
            <p className="m-0 mt-2">
              Par lien envoyé à votre adresse, ou par code reçu par SMS. Aucun mot de passe.
            </p>
          </Card>
        </li>
      </ul>
    </>
  );
}
