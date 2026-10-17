"use client";

import { Fragment, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { codexVerdict } from "@/lib/codex/actions";
import type { Bande, StatutVerdict } from "@/lib/codex/plan";
import type { VueVerdict } from "@/lib/codex/rythme";
import type { VueCodex } from "@/lib/codex/vue";
import k from "./Calendrier.module.css";
import r from "./Rythme.module.css";

// Le verdict (V3 §10.5), sur /codex après l'examen : « Quand tu auras tes
// résultats », trois réponses. Admis : le programme est mené, la suite est
// proposée. Pas cette fois : des bandes facultatives par matière recalent le
// carnet sur les plus basses pendant deux mois, puis une nouvelle date.
// Reporté : une nouvelle date. Rien n'est public, rien n'est repris.
// `demo` : aperçus (rien n'est gardé).

type Props = { verdict: VueVerdict; demo?: boolean; onVue?: (v: VueCodex) => void };

const LIBELLES_BANDE: Record<Bande, string> = { basse: "sous 50 %", moyenne: "de 50 à 70 %", haute: "plus de 70 %" };
const DATE = "/moi?onglet=reglages#date";

export function Verdict({ verdict, demo = false, onVue }: Props) {
  const [bandesOuvertes, setBandesOuvertes] = useState(false);
  const [bandes, setBandes] = useState<Record<string, Bande>>({});
  const [saisi, setSaisi] = useState<StatutVerdict | null>(verdict.saisi?.statut ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, demarrer] = useTransition();

  const poser = (statut: StatutVerdict) =>
    demarrer(async () => {
      setMessage(null);
      if (demo) return setSaisi(statut);
      const res = await codexVerdict(statut, statut === "pas_cette_fois" ? bandes : {}).catch(() => null);
      if (!res?.ok) return setMessage("Ton verdict n'a pas pu être gardé pour l'instant. Réessaie dans un instant.");
      setSaisi(statut);
      onVue?.(res.vue);
    });

  if (saisi === "admis")
    return (
      <section className={`card-quiet ${k.carte}`} aria-label="Le verdict">
        <h2 className={`font-brand ${k.titre}`}>Admis.</h2>
        <p className="t-small m-0">Bravo. Le carnet garde tout ce que tu as gagné, et ton fil rouge continue.</p>
      </section>
    );
  if (saisi)
    return (
      <section className={`card-quiet ${k.carte}`} aria-label="Le verdict">
        <p className="t-small m-0">
          {saisi === "pas_cette_fois"
            ? "C'est noté. Le carnet repart de tes bandes les plus basses, et tout ce que tu as gagné reste à toi."
            : "C'est noté. Dès que tu connais ta nouvelle date, le plan se recale dessus."}
        </p>
        <div className={k.actions}>
          <Link href={DATE} className="btn btn-primary rl-press">
            Choisir ma nouvelle date <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>
    );

  return (
    <section className={`card-quiet ${k.carte}`} aria-labelledby="verdict-titre">
      <p className={`t-micro ${k.sur}`}>Session {verdict.session.slice(5, 7)}/{verdict.session.slice(0, 4)}</p>
      <h2 id="verdict-titre" className={`font-brand ${k.titre}`}>
        Quand tu auras tes résultats
      </h2>
      <p className="t-small m-0">Dis-les au carnet : il s&apos;adapte. Rien n&apos;est public.</p>
      {bandesOuvertes ? (
        <>
          <p className="t-small m-0">Si tu les as, tes bandes par matière (facultatif) :</p>
          <div className={r.bandes}>
            {verdict.matieres.map((m) => (
              <Fragment key={m.cle}>
                <label htmlFor={`bande-${m.cle}`}>{m.nom}</label>
                <select id={`bande-${m.cle}`} value={bandes[m.cle] ?? ""} onChange={(ev) => setBandes((b) => ({ ...b, [m.cle]: ev.target.value as Bande }))}>
                  <option value="">—</option>
                  {(Object.keys(LIBELLES_BANDE) as Bande[]).map((b) => (
                    <option key={b} value={b}>
                      {LIBELLES_BANDE[b]}
                    </option>
                  ))}
                </select>
              </Fragment>
            ))}
          </div>
          <div className={k.actions}>
            <button type="button" className="btn btn-primary rl-press" onClick={() => poser("pas_cette_fois")} disabled={occupe}>
              Enregistrer
            </button>
            <button type="button" className="btn rl-press" onClick={() => setBandesOuvertes(false)} disabled={occupe}>
              Retour
            </button>
          </div>
        </>
      ) : (
        <div className={k.actions}>
          <button type="button" className="btn btn-primary rl-press" onClick={() => poser("admis")} disabled={occupe}>
            Admis
          </button>
          <button type="button" className="btn rl-press" onClick={() => setBandesOuvertes(true)} disabled={occupe}>
            Pas cette fois
          </button>
          <button type="button" className="btn rl-press" onClick={() => poser("reporte")} disabled={occupe}>
            Reporté
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="t-small m-0">
          {message}
        </p>
      )}
    </section>
  );
}
