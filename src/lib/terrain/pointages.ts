/*
 * La file d'attente des pointages.
 *
 * Dans un immeuble ancien, un sous-sol, une cage d'escalier, il n'y a pas de réseau. Un pointage
 * qui échouerait là serait perdu — et un relevé d'heures troué est un relevé que personne ne peut
 * utiliser pour payer. Alors :
 *
 * 1. **l'heure du geste est l'heure du téléphone** (`at`), jamais l'heure de l'envoi. L'API
 *    l'accepte et la borne (deux minutes d'avance, quarante-huit heures de retard) ;
 * 2. **un envoi qui échoue est mis en attente** dans le stockage local, et retenté à la
 *    reconnexion, au retour sur l'onglet, et à chaque nouveau pointage ;
 * 3. **l'écran dit ce qui n'est pas encore parti.** Un pointage « en attente d'envoi » est un fait
 *    enregistré, pas un fait transmis : le cacher serait mentir à l'intervenante.
 *
 * Ce que cette file ne fait pas, et qu'il faut savoir : **elle n'a pas de service worker**. Si
 * l'onglet est fermé avant la reconnexion, les pointages restent en attente jusqu'à la prochaine
 * ouverture de l'application — ils ne sont pas perdus, mais ils ne partent pas tout seuls. Un
 * envoi en arrière-plan demande un service worker et une décision d'installation (Q-PWA).
 */

export const CLEF_FILE = "youdom.terrain.pointages";

export type PointageType = "en_route" | "arrivee" | "depart";
export type PointageSource = "nfc" | "qr" | "manuel";

export type PointageEnAttente = {
  /** Identifiant local, pour ne pas envoyer deux fois le même geste. */
  id: string;
  visitId: string;
  type: PointageType;
  source: PointageSource;
  /** L'heure du geste, en ISO. */
  at: string;
  motif?: string;
  /** Nombre d'envois tentés — affiché à partir du deuxième, pour ne pas inquiéter sans raison. */
  essais: number;
};

function lireBrut(): PointageEnAttente[] {
  try {
    const brut = globalThis.localStorage?.getItem(CLEF_FILE);
    if (!brut) return [];
    const donnees: unknown = JSON.parse(brut);
    if (!Array.isArray(donnees)) return [];
    /*
     * Un enregistrement illisible est écarté, pas jeté avec les autres : une file corrompue ne
     * doit pas emporter les pointages valides qui l'accompagnent.
     */
    return donnees.filter((entree): entree is PointageEnAttente => {
      if (typeof entree !== "object" || entree === null) return false;
      const candidat = entree as Partial<PointageEnAttente>;
      return (
        typeof candidat.id === "string" &&
        typeof candidat.visitId === "string" &&
        typeof candidat.at === "string" &&
        (candidat.type === "en_route" ||
          candidat.type === "arrivee" ||
          candidat.type === "depart") &&
        (candidat.source === "nfc" || candidat.source === "qr" || candidat.source === "manuel")
      );
    });
  } catch {
    // Stockage refusé (navigation privée, réglage du navigateur) : la file est vide, l'envoi
    // direct fonctionne toujours. On ne bloque pas une tournée pour un stockage.
    return [];
  }
}

function ecrire(file: PointageEnAttente[]): void {
  try {
    globalThis.localStorage?.setItem(CLEF_FILE, JSON.stringify(file));
  } catch {
    /* sans stockage, la file ne survit pas au rechargement : c'est tout ce qu'on peut dire. */
  }
}

export const file = {
  lire: lireBrut,
  ajouter(pointage: Omit<PointageEnAttente, "essais">): PointageEnAttente[] {
    const suivante = [...lireBrut(), { ...pointage, essais: 0 }];
    ecrire(suivante);
    return suivante;
  },
  retirer(id: string): PointageEnAttente[] {
    const suivante = lireBrut().filter((entree) => entree.id !== id);
    ecrire(suivante);
    return suivante;
  },
  marquerEssai(id: string): PointageEnAttente[] {
    const suivante = lireBrut().map((entree) =>
      entree.id === id ? { ...entree, essais: entree.essais + 1 } : entree,
    );
    ecrire(suivante);
    return suivante;
  },
  vider(): void {
    ecrire([]);
  },
};

/** Un identifiant local : l'heure plus un tirage. Il ne quitte jamais le téléphone. */
export function identifiantLocal(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Le prochain geste attendu pour une visite, d'après ce qui est déjà pointé.
 *
 * L'ordre est celui du terrain : en route, arrivée, départ. Une visite dont le départ est pointé
 * n'attend plus rien — et l'écran n'affiche pas un bouton qui ne sert plus.
 */
export function prochainGeste(pointes: readonly { type: string }[]): PointageType | "termine" {
  const types = new Set(pointes.map((pointage) => pointage.type));
  if (types.has("depart")) return "termine";
  if (types.has("arrivee")) return "depart";
  return types.has("en_route") ? "arrivee" : "en_route";
}
