"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "@/components/ui/Callout/Callout";
import { Card } from "@/components/ui/Card/Card";
import { Heading } from "@/components/ui/Heading/Heading";
import { TextField } from "@/components/ui/TextField/TextField";
import { ApiError, api, jeton } from "@/lib/bureau/api";

/*
 * La connexion du bureau : une adresse ou un numéro, puis le secret reçu. Aucun mot de passe —
 * c'est le choix de l'API (`apps/api/src/auth/`), et il tient à une raison simple : un mot de passe
 * partagé dans une équipe de coordination finit écrit sur un papier.
 *
 * Deux détails qui ne sont pas des détails :
 * - la réponse est **la même** que l'adresse soit connue ou non. L'écran ne dit donc jamais
 *   « compte inconnu » : il annonce l'envoi, point. C'est l'API qui en a décidé, et l'écran ne doit
 *   pas défaire cette garantie en déduisant quoi que ce soit ;
 * - l'erreur d'un code refusé est dite **sans compter les essais à l'écran** : la limite est côté
 *   serveur, l'afficher n'aide que celui qui cherche.
 */

type Etape = { nom: "identifiant" } | { nom: "secret"; challengeId: string; voie: "lien" | "code" };

export default function Connexion() {
  const router = useRouter();
  const [etape, setEtape] = useState<Etape>({ nom: "identifiant" });
  const [identifiant, setIdentifiant] = useState("");
  const [secret, setSecret] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const estTelephone = /^[\d\s+.-]{10,}$/.test(identifiant.trim());

  async function demander(evenement: React.FormEvent) {
    evenement.preventDefault();
    setErreur(null);
    setEnCours(true);
    try {
      const valeur = identifiant.trim();
      const corps = estTelephone
        ? { phone: valeur.replace(/[\s.-]/g, "").replace(/^0/, "+33") }
        : { email: valeur };
      const defi = await api.demanderCode(corps);
      setEtape({
        nom: "secret",
        challengeId: defi.challengeId,
        voie: estTelephone ? "code" : "lien",
      });
    } catch (cause) {
      setErreur(
        cause instanceof ApiError
          ? cause.message
          : "La demande n’a pas abouti. Vérifiez votre connexion.",
      );
    } finally {
      setEnCours(false);
    }
  }

  async function ouvrir(evenement: React.FormEvent) {
    evenement.preventDefault();
    if (etape.nom !== "secret") return;
    setErreur(null);
    setEnCours(true);
    try {
      const session = await api.ouvrirSession(etape.challengeId, secret.trim(), appareil());
      jeton.ecrire(session.token);
      router.push("/bureau/semaine/");
    } catch (cause) {
      setErreur(
        cause instanceof ApiError && cause.status === 401
          ? "Ce code ne correspond pas, ou il a expiré. Demandez-en un nouveau."
          : "La connexion n’a pas abouti.",
      );
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Card as="section" padding="lg" className="mx-auto max-w-[36rem] bg-white">
      <Heading level={1} visual={3}>
        Se connecter
      </Heading>

      {erreur ? (
        <Callout variant="attention" title="La connexion n’a pas abouti">
          <p className="m-0">{erreur}</p>
        </Callout>
      ) : null}

      {etape.nom === "identifiant" ? (
        <form onSubmit={demander} className="mt-4 grid gap-4" aria-busy={enCours}>
          <TextField
            label="Votre adresse e-mail ou votre numéro de téléphone"
            hint="Nous envoyons un lien aux adresses, un code à six chiffres aux numéros."
            value={identifiant}
            autoComplete="username"
            onChange={(evenement) => setIdentifiant(evenement.target.value)}
            required
          />
          <Button type="submit" disabled={enCours || identifiant.trim().length < 5}>
            {enCours ? "Envoi en cours…" : "Recevoir mon accès"}
          </Button>
        </form>
      ) : (
        <form onSubmit={ouvrir} className="mt-4 grid gap-4" aria-busy={enCours}>
          <p className="m-0" role="status">
            {etape.voie === "code"
              ? "Si ce numéro est enregistré, un code à six chiffres vient d’être envoyé."
              : "Si cette adresse est enregistrée, un lien vient d’être envoyé. Le lien contient le secret à coller ici."}
          </p>
          <TextField
            label={etape.voie === "code" ? "Le code reçu" : "Le secret du lien"}
            value={secret}
            inputMode={etape.voie === "code" ? "numeric" : "text"}
            autoComplete="one-time-code"
            onChange={(evenement) => setSecret(evenement.target.value)}
            required
          />
          <Button type="submit" disabled={enCours || secret.trim().length < 4}>
            {enCours ? "Vérification…" : "Ouvrir ma session"}
          </Button>
          <Button
            variant="link"
            type="button"
            onClick={() => {
              setEtape({ nom: "identifiant" });
              setSecret("");
            }}
          >
            Recommencer avec une autre adresse
          </Button>
        </form>
      )}
    </Card>
  );
}

/** Un nom d'appareil lisible dans la liste des sessions, sans empreinte ni pistage. */
function appareil(): string {
  const agent = globalThis.navigator?.userAgent ?? "";
  if (/iPhone|iPad/.test(agent)) return "iPhone ou iPad";
  if (/Android/.test(agent)) return "Android";
  if (/Macintosh/.test(agent)) return "Mac";
  if (/Windows/.test(agent)) return "Windows";
  return "Navigateur";
}
