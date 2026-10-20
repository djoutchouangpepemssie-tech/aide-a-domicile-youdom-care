"use client";

import { ConnexionForm } from "@/components/acces/ConnexionForm/ConnexionForm";

/*
 * La connexion du bureau. Le formulaire est partagé avec l'application de terrain
 * (`ConnexionForm`) : une seule mise en œuvre de l'authentification côté écran, donc une seule à
 * tenir juste — c'est là qu'une erreur se paie le plus cher.
 */

export default function ConnexionBureau() {
  return <ConnexionForm apres="/bureau/semaine/" />;
}
