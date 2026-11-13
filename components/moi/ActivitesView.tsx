import { ActivitesListe } from "@/components/moi/ActivitesListe";
import { Dossier, Filet } from "@/components/moi/Dossier";
import { EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { jourDe, type Activite } from "@/lib/activites";
import { SOURCE_LABELS } from "@/lib/answer-stats";
import { ACTIVITES, DOSSIER, SOUS_MOI } from "@/lib/voice-moi";
import { nombre } from "@/lib/voice";

// Moi › Activités (?onglet=activites), gabarit « Dossier » (direction du 2026-11-13) : la porte porte
// le nombre de séances relevées (les 200 plus récentes au plus : « 200+ » au-delà) ; dessous, un seul
// filet, « L'historique » : le choix du jour et du type, la sélection avec « Copier les ratures » et
// « Me retester » (l'action à l'encre), puis les séances à plat entre des filets, chacune avec son
// score et le lien vers sa copie. « Aujourd'hui » et « hier » se calculent ici, côté serveur (aucun
// écart d'hydratation).

const MAX = 200;

export function ActivitesView({ activites, now }: { activites: Activite[]; now: number }) {
  const n = activites.length;
  // la ligne d'état : la dernière séance (aujourd'hui, hier, ou le jour) et la précision sur 7 jours
  const derniere = activites.reduce<Activite | null>((m, a) => (m === null || a.at > m.at ? a : m), null);
  const auj = jourDe(now);
  const hier = jourDe(now - 86_400_000);
  const quand = derniere ? (derniere.jour === auj ? ACTIVITES.aujourdhui.toLowerCase() : derniere.jour === hier ? ACTIVITES.hier.toLowerCase() : `le ${derniere.date}`) : "";
  const semaine = activites.filter((a) => now - Date.parse(a.at) < 7 * 86_400_000);
  const nSemaine = semaine.reduce((x, a) => x + a.n, 0);
  const pct = nSemaine > 0 ? Math.round((100 * semaine.reduce((x, a) => x + a.ok, 0)) / nSemaine) : null;
  const ligne = derniere ? DOSSIER.activites.ligne(quand, pct) : undefined;
  return (
    <SousPage
      entete={
        <EnTeteSousPage
          retour={SOUS_MOI.retour}
          titre={ACTIVITES.titre}
          ligne={ligne}
          illustration={{ nom: "moi-cabinet", porte: "60% 82%" }}
          heros={n > 0 ? { valeur: nombre(n) + (n >= MAX ? "+" : ""), legende: DOSSIER.activites.heros(n) } : null}
        />
      }
    >
      <Dossier plat>
        <Filet etiquette={DOSSIER.activites.historique}>
          {n === 0 ? (
            <p className="t-small m-0">{ACTIVITES.vide}</p>
          ) : (
            <div className="flex min-w-0 flex-col gap-5">
              <ActivitesListe activites={activites} aujourdhui={jourDe(now)} hier={jourDe(now - 86_400_000)} libelles={SOURCE_LABELS} />
            </div>
          )}
        </Filet>
      </Dossier>
    </SousPage>
  );
}
