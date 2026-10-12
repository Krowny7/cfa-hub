import { SERIE } from "@/lib/voice-serie";
import type { AccueilData } from "@/components/accueil/types";

// La série d'encre sur l'Accueil, à côté des traits du jour : « ×2 · 9 jours
// d'affilée », le joker restant de la semaine, et le soir (après 18 h, heure de
// Paris) « Plus que 5 h pour garder ta série » tant que le jour n'est pas
// assuré. Rien sans la migration (d.serieEncre absent) ni au retour d'une
// absence (comme les bâtons). Sans état. Les règles : lib/serie-encre.ts.

const HEURE_RAPPEL = 18;

export function SerieEncreLigne({ d }: { d: AccueilData }) {
  const s = d.serieEncre;
  if (!s || d.returning) return null;
  const palier = s.mult > 1;
  // jour pas encore assuré, une série à garder, le soir
  const rappel = d.hour >= HEURE_RAPPEL && !s.fait && s.serie > 0;
  return (
    <div className="flex min-w-0 flex-col gap-1" data-serie-encre>
      <p className="t-micro m-0 min-w-0" title={SERIE.regle(s.seuil)}>
        <span className="sr-only">{SERIE.nom} : </span>
        {palier ? (
          <>
            <span className="t-num text-[15px] font-bold leading-none text-white">{s.mult === 2 ? "×2" : "×1,5"}</span>
            <span className="font-semibold text-white">{" · "}{SERIE.jours(s.serieAffichee)}</span>
          </>
        ) : (
          <span className={s.serieAffichee > 0 ? "font-semibold text-white" : ""}>{SERIE.ligne(s)}</span>
        )}
      </p>
      {s.serieAffichee > 0 && (
        <p className="t-micro m-0" title={SERIE.jokerAide}>
          {SERIE.joker(s.joker)}
        </p>
      )}
      {rappel && (
        <p className="t-micro m-0 font-semibold text-pen" role="status">
          {SERIE.tempsRestant(new Date(d.nowIso))}
        </p>
      )}
    </div>
  );
}
