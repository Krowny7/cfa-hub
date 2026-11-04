import type { AnswerStats } from "@/lib/answer-stats";
import { plafonner } from "@/components/accueil/lobby/plafond";
import { constanceMatieres, type ConstanceMatiere } from "@/components/moi/synthese/constance";
import { EXA } from "@/lib/voice-moi-examen";
import s from "@/components/moi/synthese/Synthese.module.css";
import m from "@/components/moi/synthese/Examen.module.css";

// « Ta constance par matière », dans la carte Ta progression : pour chaque matière,
// l'écart type de ta réussite d'une semaine à l'autre, une barre, et son évolution.
// Lu après la page (Suspense dans app/moi/page.tsx) : la lecture des réponses, longue,
// ne retarde pas le reste de Moi. Composant serveur, sans état.

const FILET_MS = 15000;
/** L'écart type qui remplit la barre : au-delà, elle reste pleine. */
const ECART_PLEIN = 25;
/** Sous ce changement, l'évolution ne se dit pas. */
const EVOLUTION_MIN = 0.5;

const virgule = (x: number) => String(x).replace(".", ",");

function Evolution({ v }: { v: number | null }) {
  if (v === null || Math.abs(v) < EVOLUTION_MIN) return <span className={m.constanceEvol} />;
  return (
    <span className={m.constanceEvol} title={v < 0 ? EXA.progression.constancePlus : EXA.progression.constanceMoins}>
      {v < 0 ? "↘" : "↗"} {virgule(Math.abs(v))}
    </span>
  );
}

/** La liste, à partir des lignes déjà calculées. */
export function ConstanceListe({ lignes }: { lignes: ConstanceMatiere[] }) {
  const mesure = lignes.some((l) => l.ecart !== null);
  return (
    <div className={m.constance}>
      <p className={`${s.eyebrow} ${m.eyebrowPetit}`}>{EXA.progression.constanceTitre}</p>
      <p className={m.constanceSous}>{mesure ? EXA.progression.constanceSous : EXA.progression.constanceVide}</p>
      {mesure && (
        <ul className={m.constanceListe}>
          {lignes.map((l) => (
            <li key={l.cle}>
              <span>{l.nom}</span>
              <span className={m.constanceBarre} aria-hidden>
                {l.ecart !== null && <i style={{ width: `${Math.min(100, (100 * l.ecart) / ECART_PLEIN)}%` }} />}
              </span>
              <b>{l.ecart === null ? "–" : `± ${virgule(l.ecart)}`}</b>
              <Evolution v={l.evolution} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** La place gardée pendant la lecture. */
export function ConstanceAttente() {
  return <div className={m.constanceAttente} aria-busy />;
}

export async function ConstanceMatieres({ lire, now }: { lire: () => Promise<AnswerStats>; now: number }) {
  const stats = await plafonner(lire(), FILET_MS);
  if (!stats) return null;
  return <ConstanceListe lignes={constanceMatieres(stats.subjects, now)} />;
}
