"use client";

import { ConnexionForm } from "@/components/acces/ConnexionForm/ConnexionForm";

/*
 * La connexion de l'intervenante. Même formulaire que le bureau : un numéro de téléphone, un code
 * à six chiffres. Pas de mot de passe à retenir sur le terrain, et aucune session qui traîne —
 * le jeton vit dans l'onglet.
 */

export default function ConnexionTerrain() {
  return <ConnexionForm apres="/terrain/" titre="Se connecter" />;
}
