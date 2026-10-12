import { SERIE } from "@/lib/voice-serie";
import { libelleMult, type SerieEncre } from "@/lib/serie-encre";
import type { AccueilData } from "@/components/accueil/types";

// La série d'encre sur l'Accueil. C'est la seule série du site : ses jours sont
// les « jours d'encre » de la ligne de contexte (« J-35 · 9 jours d'encre · ×2 »,
// voir PalierSerie) et des bâtons. Ici ne reste que ce que cette ligne ne dit
// pas : le joker de la semaine et, le soir (après 18 h, heure de Paris), « Plus
// que 5 h pour garder ta série » tant que le jour n'est pas assuré. Rien sans la
// migration (d.serieEncre absent) ni au retour d'une absence (comme les bâtons).
// Sans état. Les règles : lib/serie-encre.ts.

const HEURE_RAPPEL = 18;

/** « · ×2 » à la suite des jours d'encre, quand la série a un palier d'XP ; rien avant 3 jours ni sans la migration. */
export function PalierSerie({ s }: { s?: SerieEncre | null }) {
  if (!s || s.mult <= 1) return null;
  return (
    <>
      {" · "}
      <span className="t-num font-bold text-white" title={SERIE.regle(s.seuil)}>
        {libelleMult(s.mult)}
      </span>
    </>
  );
}

export function SerieEncreLigne({ d }: { d: AccueilData }) {
  const s = d.serieEncre;
  if (!s || d.returning) return null;
  // jour pas encore assuré, une série à garder, le soir
  const rappel = d.hour >= HEURE_RAPPEL && !s.fait && s.serie > 0;
  if (s.serieAffichee <= 0 && !rappel) return null;
  return (
    <div className="flex min-w-0 flex-col gap-1" data-serie-encre>
      {s.serieAffichee > 0 && (
        <p className="t-micro m-0" title={SERIE.jokerAide}>
          <span className="sr-only">{SERIE.nom} : </span>
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
