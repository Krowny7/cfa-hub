import { ActivitesListe } from "@/components/moi/ActivitesListe";
import { CadreZones, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { jourDe, type Activite } from "@/lib/activites";
import { SOURCE_LABELS } from "@/lib/answer-stats";
import { ACTIVITES, SOUS_MOI } from "@/lib/voice-moi";

// Moi › Activités (?onglet=activites), sur le modèle des sous-pages validé par Théo
// (2026-11-12) : l'en-tête commun (retour à Moi), puis une seule zone, « Ton historique » :
// tes séances, de la plus récente à la plus ancienne, avec leur score et le lien vers ta
// copie quand elle se relit. Le tri par jour et par type, la copie des ratures et le retest
// vivent dans ActivitesListe. « Aujourd'hui » et « hier » se calculent ici, côté serveur
// (aucun écart d'hydratation).

export function ActivitesView({ activites, now }: { activites: Activite[]; now: number }) {
  return (
    <SousPage entete={<EnTeteSousPage retour={SOUS_MOI.retour} titre={ACTIVITES.titre} illustration={{ nom: "moi-cabinet" }} />}>
      <CadreZones
        gauche={{
          titre: SOUS_MOI.historique,
          contenu:
            activites.length === 0 ? (
              <p className="t-small m-0">{ACTIVITES.vide}</p>
            ) : (
              <div className="flex min-w-0 flex-col gap-5">
                <ActivitesListe activites={activites} aujourdhui={jourDe(now)} hier={jourDe(now - 86_400_000)} libelles={SOURCE_LABELS} />
              </div>
            ),
        }}
      />
    </SousPage>
  );
}
