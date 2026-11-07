import { ActivitesListe } from "@/components/moi/ActivitesListe";
import { FilMoi } from "@/components/moi/Briques";
import { jourDe, type Activite } from "@/lib/activites";
import { SOURCE_LABELS } from "@/lib/answer-stats";
import { ACTIVITES } from "@/lib/voice-moi";

// Moi › Activités (?onglet=activites) : tes séances, de la plus récente à la plus
// ancienne, avec leur score et le lien vers ta copie quand elle se relit. Le tri par
// jour et par type, la copie des ratures et le retest vivent dans ActivitesListe.
// « Aujourd'hui » et « hier » se calculent ici, côté serveur (aucun écart d'hydratation).

export function ActivitesView({ activites, now }: { activites: Activite[]; now: number }) {
  return (
    <div className="rl-wide rl-page flex flex-col gap-5">
      <FilMoi />
      <div className="grid gap-1">
        <h1 className="t-h1 m-0">{ACTIVITES.titre}</h1>
        <p className="t-small m-0">{ACTIVITES.sous}</p>
      </div>
      {activites.length === 0 ? (
        <p className="card-quiet m-0 p-6 text-[14px]">{ACTIVITES.vide}</p>
      ) : (
        <ActivitesListe activites={activites} aujourdhui={jourDe(now)} hier={jourDe(now - 86_400_000)} libelles={SOURCE_LABELS} />
      )}
    </div>
  );
}
