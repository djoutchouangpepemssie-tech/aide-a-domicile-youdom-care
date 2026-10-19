import { Badge } from "@/components/ui/Badge/Badge";
import { cn } from "@/lib/cn";
import type { MembreDuFoyer, Protection } from "@/lib/bureau/api";

/*
 * Qui fait partie d'un foyer, et **ce que chacun peut réellement voir**.
 *
 * Le rôle ne décide de rien dans ce modèle : c'est le droit effectif qui ouvre
 * (`docs/portal/PERMISSIONS.md` §7). Un écran qui afficherait « représentant légal » sans dire ce
 * que cette personne voit laisserait croire à un pouvoir qu'elle n'a peut-être pas — et
 * inversement. Les deux sont donc côte à côte, et un membre sans aucun droit le dit en mots.
 *
 * Les mesures de protection juridique sont affichées parce que la coordination doit savoir qui
 * peut consentir et signer. Une mesure non vérifiée est marquée comme telle : tant qu'un humain
 * n'a pas vu le jugement, elle n'ouvre rien (`PERMISSIONS.md` §6).
 */

const MODULES: Record<string, string> = {
  planning: "planning",
  intervenants: "intervenants",
  presence: "présence",
  comptes_rendus: "comptes rendus",
  fiche_de_vie: "fiche de vie",
  acces_logement: "accès au logement",
  finances: "finances",
  employeur: "employeur",
  documents: "documents",
  messagerie: "messagerie",
  qualite: "qualité",
  journal_acces: "journal des accès",
};

const ROLES: Record<string, string> = {
  beneficiaire: "personne accompagnée",
  representant_legal: "représentant légal",
  proche_referent: "proche référent",
  proche_invite: "proche invité",
  payeur: "payeur",
  particulier_employeur: "particulier employeur",
  professionnel_invite: "professionnel invité",
  coordinateur: "coordinateur",
  responsable_agence: "responsable d’agence",
  administrateur: "administrateur",
  intervenant: "intervenant",
};

const PROTECTIONS: Record<string, string> = {
  tutelle: "tutelle",
  curatelle: "curatelle",
  habilitation: "habilitation familiale",
  autorite_parentale: "autorité parentale",
};

/** Libellé lisible, ou la clé telle quelle : inventer un libellé serait pire que la montrer. */
const libelle = (table: Record<string, string>, clef: string) => table[clef] ?? clef;

export function FoyerMembres({
  membres,
  protections,
  className,
}: {
  membres: MembreDuFoyer[];
  protections: Protection[];
  className?: string;
}) {
  if (membres.length === 0) {
    return (
      <p className={cn("text-text-soft", className)}>
        Personne n’est encore rattaché à ce foyer. Un rattachement se crée depuis l’API, et la
        personne reçoit une invitation.
      </p>
    );
  }

  return (
    <ul className={cn("m-0 grid list-none gap-4 p-0", className)}>
      {membres.map((membre) => {
        const mesures = protections.filter((protection) => protection.memberId === membre.id);
        return (
          <li key={membre.id} className="rounded-card border border-line p-4">
            <p className="m-0 flex flex-wrap items-center gap-2">
              <span className="font-bold">{membre.nom ?? "Nom non renseigné"}</span>
              <Badge tone="teal">{libelle(ROLES, membre.role)}</Badge>
              {membre.statut === "invite" ? (
                <Badge tone="raspberry">invitation en cours</Badge>
              ) : null}
              {membre.statut === "suspendu" ? <Badge tone="raspberry">accès suspendu</Badge> : null}
              {membre.statut === "revoque" ? <Badge tone="raspberry">accès retiré</Badge> : null}
            </p>

            {mesures.map((mesure) => (
              <p key={`${mesure.type}-${mesure.representation}`} className="m-0 mt-2 text-small">
                {libelle(PROTECTIONS, mesure.type)} ({mesure.portee.join(" et ")},{" "}
                {mesure.representation === "representation" ? "représentation" : "assistance"})
                {mesure.verifiee ? null : (
                  <>
                    {" "}
                    <Badge tone="raspberry">non vérifiée</Badge>
                  </>
                )}
              </p>
            ))}

            {membre.droits.length === 0 ? (
              <p className="m-0 mt-2 text-small text-text-soft">
                Aucun droit effectif : cette personne ne voit rien de ce foyer.
              </p>
            ) : (
              <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-small">
                {membre.droits.map((droit) => (
                  <li key={droit.id}>
                    {libelle(MODULES, droit.module)}{" "}
                    <span className="text-text-soft">({droit.actions.join(", ")})</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
