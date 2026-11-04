import type { AnswerStats } from "@/lib/answer-stats";
import { plafonner } from "@/components/accueil/lobby/plafond";
import { constanceVue, extremes, type ConstanceLigne, type ConstanceVue } from "@/components/moi/synthese/constance";
import { EXA } from "@/lib/voice-moi-examen";
import s from "@/components/moi/synthese/Synthese.module.css";
import m from "@/components/moi/synthese/Examen.module.css";

// « Ta constance », dans la carte Ta progression : une phrase qui dit si tes résultats
// deviennent plus constants, puis un tableau qui se lit de gauche à droite (une ligne
// par matière, une colonne par période de 4 semaines, le verdict au bout). Plus la case
// est foncée, plus tes résultats ont varié. Lu après la page (Suspense dans
// app/moi/page.tsx) : la lecture des réponses, longue, ne retarde pas le reste de Moi.
// Composant serveur, sans état.

const FILET_MS = 15000;
/** Le fond d'une case : 1,6 % d'encre par point d'écart, 30 % au plus. */
const fond = (v: number) => `color-mix(in srgb, var(--ink) ${Math.min(30, Math.round(v * 1.6))}%, transparent)`;
const entier = (v: number) => String(Math.round(v));

function Ligne({ l, nom, forte = false }: { l: ConstanceLigne; nom: string; forte?: boolean }) {
  const verdict = l.tendance ? EXA.progression.constanceVerdict[l.tendance] : "";
  return (
    <tr data-forte={forte ? "" : undefined}>
      <th scope="row">{nom}</th>
      {l.periodes.map((v, i) => (
        <td key={i} style={v === null ? undefined : { background: fond(v) }}>
          {v === null ? "–" : entier(v)}
        </td>
      ))}
      <td className={m.constanceVerdict}>{verdict}</td>
    </tr>
  );
}

/** Le tableau, à partir de la vue déjà calculée. */
export function ConstanceTableau({ v }: { v: ConstanceVue }) {
  const e = extremes(v.moyenne.periodes);
  const phrase = !v.lignes.length ? EXA.progression.constanceVide : e && v.moyenne.tendance ? EXA.progression.constancePhrase[v.moyenne.tendance](entier(e.debut), entier(e.fin)) : EXA.progression.constanceAttente;
  return (
    <div className={m.constance}>
      <p className={`${s.eyebrow} ${m.eyebrowPetit}`}>{EXA.progression.constanceTitre}</p>
      <p className={m.constancePhrase}>{phrase}</p>
      {v.lignes.length > 0 && (
        <>
          <div className={m.constanceCadre}>
            <table className={m.constanceTable}>
              <thead>
                <tr>
                  <td />
                  {EXA.progression.constancePeriodes.map((p) => (
                    <th key={p} scope="col">
                      {p}
                    </th>
                  ))}
                  <td />
                </tr>
              </thead>
              <tbody>
                <Ligne l={v.moyenne} nom={EXA.progression.constanceMoyenne} forte />
                {v.lignes.map((l) => (
                  <Ligne key={l.cle} l={l} nom={l.nom} />
                ))}
              </tbody>
            </table>
          </div>
          <p className={m.constanceSous}>{EXA.progression.constanceSous}</p>
        </>
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
  return <ConstanceTableau v={constanceVue(stats.subjects, now)} />;
}
