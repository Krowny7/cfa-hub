"use client";

import { useEffect, useState } from "react";
import { Check, Clock, X } from "lucide-react";
import { BoutonEnvoi } from "@/components/classement/Encre";
import { Enonce } from "@/components/salles/Enonce";
import { decimalsOf, formatCalc, parseCalcCandidates, UNIT_FIELD } from "@/lib/calc/engine";
import type { CalcUnit } from "@/lib/calc/types";
import { messageErreurSalle } from "@/lib/salles/api";
import { libelleDelai, libellePoints, type CorrectionVue, type ReponseVue, type Verdict } from "@/lib/salles/partie";
import { TOPIC_LABELS } from "@/lib/practiceTopics";
import type { ReponseResultat, SalleItem } from "@/lib/salles/types";
import { PARTIE } from "@/lib/voice-salles";
import s from "./Salles.module.css";
import p from "./Partie.module.css";

// La carte d'une question : l'énoncé, puis de quoi répondre (4 choix, ou un
// champ numérique pour un calcul), le verdict dès que j'ai répondu (juste /
// faux, les points, le délai) et, le temps écoulé, la correction (la bonne
// réponse, l'explication, le calcul pas à pas).
//
// Règles :
//  - une seule réponse par question, définitive (le serveur la note : la bonne
//    réponse n'est jamais là tant que la question est ouverte) ;
//  - mon verdict apparaît tout de suite, la bonne réponse seulement quand le
//    temps est écoulé (ou si la correction publique est déjà là) ;
//  - un calcul bon mais à la mauvaise échelle (0,085 au lieu de 8,5 %) n'est
//    pas compté : le serveur le dit, je ressaisis.
// Composant de présentation : `repondre` envoie la réponse (le parent la
// range et relit l'état), la carte ne tient que l'envoi en cours et l'erreur.
// Remontée avec key={position} : chaque question repart d'une carte neuve.

const LETTRES = ["A", "B", "C", "D", "E", "F"];

export type Repondre = (rep: { choix: number } | { saisie: string }) => Promise<ReponseResultat>;

export function CarteQuestion({
  item,
  ouverte,
  reponse,
  correction,
  repondre,
  repondus,
}: {
  item: SalleItem | null;
  /** le temps de répondre court */
  ouverte: boolean;
  /** ma réponse (le serveur l'a enregistrée) */
  reponse: ReponseVue | null;
  /** la correction à montrer : fournie seulement une fois le temps écoulé */
  correction: CorrectionVue | null;
  repondre: Repondre;
  /** combien de joueurs ont déjà répondu à la question en cours */
  repondus?: { n: number; total: number };
}) {
  const [envoi, setEnvoi] = useState<{ choix: number | null } | null>(null);
  const [saisie, setSaisie] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const calcul = item?.origine === "calcul";
  const bloque = !ouverte || reponse !== null || envoi !== null;

  async function envoyer(rep: { choix: number } | { saisie: string }) {
    if (bloque) return;
    setErreur(null);
    if ("saisie" in rep && !parseCalcCandidates(rep.saisie).length) {
      setErreur(PARTIE.calculIllisible);
      return;
    }
    setEnvoi({ choix: "choix" in rep ? rep.choix : null });
    try {
      const r = await repondre(rep);
      if (!r.ok) setErreur(r.indice);
    } catch (e) {
      setErreur(messageErreurSalle(e));
    } finally {
      setEnvoi(null);
    }
  }

  // au clavier : A à D (ou 1 à 4) répondent à un QCM, pour ne pas perdre de points à viser la souris
  const nbChoix = item?.choix?.length ?? 0;
  useEffect(() => {
    if (calcul || bloque || nbChoix === 0) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const k = e.key.toLowerCase();
      const lettre = LETTRES.findIndex((l) => l.toLowerCase() === k);
      const chiffre = /^[1-9]$/.test(k) ? Number(k) - 1 : -1;
      const i = lettre >= 0 ? lettre : chiffre;
      if (i >= 0 && i < nbChoix) {
        e.preventDefault();
        void envoyer({ choix: i });
      }
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcul, bloque, nbChoix]);

  if (!item) {
    return (
      <div className={p.corps}>
        <div className={s.attente} role="status">
          <span className={s.barres} aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <p className={s.attenteTitre}>{PARTIE.arrive}</p>
        </div>
      </div>
    );
  }

  const unite = (item.unite ?? "") as CalcUnit;
  const decimales = item.decimales ?? 2;
  const verdict: Verdict | null = reponse ? (reponse.juste ? "juste" : "faux") : ouverte ? null : "sans";

  const etatChoix = (i: number): string => {
    if (!ouverte && correction && correction.bonneIndex !== null) {
      if (i === correction.bonneIndex) return reponse?.choix === i ? "juste" : "bonne";
      return reponse?.choix === i ? "faux" : "estompe";
    }
    if (reponse && reponse.choix === i) return reponse.juste ? "juste" : "faux";
    if (envoi && envoi.choix === i) return "envoi";
    if (reponse || envoi || !ouverte) return "estompe";
    return "libre";
  };

  return (
    <div className={p.corps}>
      <span className={p.leonard} data-leonard-slot="partie" aria-hidden />
      <Enonce texte={item.enonce} className={p.enonce} />

      {calcul && item.donnees && item.donnees.length > 0 && (
        <dl className={p.donnees} aria-label={PARTIE.calculDonnees}>
          {item.donnees.map((d, i) => (
            <div key={i}>
              <dt>{d.label}</dt>
              <dd>{d.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {!calcul && item.choix && (
        <ul className={p.choix} aria-label={PARTIE.choisir}>
          {item.choix.map((texte, i) => {
            const etat = etatChoix(i);
            return (
              <li key={i} style={{ listStyle: "none" }}>
                <button
                  type="button"
                  className={p.choixBtn}
                  data-etat={etat}
                  disabled={bloque}
                  aria-label={PARTIE.choixNom(LETTRES[i] ?? String(i + 1), texte)}
                  aria-pressed={etat === "juste" || etat === "faux" || etat === "envoi"}
                  aria-keyshortcuts={`${LETTRES[i] ?? i + 1} ${i + 1}`}
                  onClick={() => void envoyer({ choix: i })}
                >
                  <span className={p.lettre} aria-hidden>
                    {LETTRES[i] ?? i + 1}
                  </span>
                  <span className={p.choixTexte}>{texte}</span>
                  <span className={p.choixMarque} aria-hidden>
                    {(etat === "juste" || etat === "bonne") && <Check size={22} />}
                    {etat === "faux" && <X size={22} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {!calcul && item.choix && ouverte && !reponse && <p className={s.aide}>{PARTIE.clavier}</p>}

      {calcul && !reponse && ouverte && (
        <form
          className={p.calcul}
          onSubmit={(e) => {
            e.preventDefault();
            void envoyer({ saisie });
          }}
        >
          <label htmlFor="partie-calcul" className={s.libelle}>
            {PARTIE.calculLabel}
          </label>
          <div className={p.calculRangee}>
            <span className={p.calculChamp}>
              <input
                id="partie-calcul"
                className={s.champ}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                autoFocus
                value={saisie}
                placeholder={PARTIE.calculPlaceholder}
                disabled={envoi !== null}
                onChange={(e) => {
                  setSaisie(e.target.value);
                  setErreur(null);
                }}
              />
              {UNIT_FIELD[unite] && (
                <span className={p.unite} aria-hidden>
                  {UNIT_FIELD[unite]}
                </span>
              )}
            </span>
            <BoutonEnvoi surPeinture className={s.pleinMobile} disabled={envoi !== null || !saisie.trim()}>
              {envoi ? PARTIE.calculEnvoi : PARTIE.calculValider}
            </BoutonEnvoi>
          </div>
          <p className={s.aide}>{PARTIE.calculAide}</p>
        </form>
      )}

      {calcul && reponse && (
        <div className={p.correctionLigne}>
          <span className={s.libelle}>{PARTIE.taReponse}</span>
          <span className={p.calculValeur}>{reponse.valeur === null ? "—" : formatCalc(reponse.valeur, unite, decimalsOf(reponse.valeur))}</span>
        </div>
      )}

      {erreur && (
        <p className={[s.erreur, p.erreurLigne].join(" ")} role="alert">
          {erreur}
        </p>
      )}

      {verdict && (
        <div className={p.retour} data-verdict={verdict} role="status">
          <span className={p.verdict} data-verdict={verdict}>
            <span className={p.verdictIcone} aria-hidden>
              {verdict === "juste" ? <Check size={24} strokeWidth={3} /> : verdict === "faux" ? <X size={24} strokeWidth={3} /> : <Clock size={22} strokeWidth={2.5} />}
            </span>
            {verdict === "juste" ? PARTIE.verdictJuste : verdict === "faux" ? PARTIE.verdictFaux : PARTIE.verdictSans}
          </span>
          {reponse ? (
            <span className={p.pointsBloc}>
              {reponse.juste && reponse.points > 0 && (
                <span className={p.pointsVolant} aria-hidden>
                  {libellePoints(reponse.points)}
                </span>
              )}
              <span className={p.pointsGagnes}>{libellePoints(reponse.points)}</span>
              <span className={p.pointsMot}>{PARTIE.points}</span>
            </span>
          ) : (
            <span className={p.delai}>{PARTIE.verdictSansAide}</span>
          )}
          {reponse && <span className={p.delai}>{PARTIE.delai(libelleDelai(reponse.delaiMs))}</span>}
        </div>
      )}

      {ouverte && reponse && (
        <p className={p.attenteAutres}>
          <span className={s.barres} aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span>
            {PARTIE.enAttente}
            {repondus && repondus.total > 1 ? ` ${PARTIE.autresReponses(repondus.n, repondus.total)}.` : ""}
          </span>
        </p>
      )}

      {!ouverte && (
        <div className={p.correction} aria-live="polite">
          <p className={s.libelle}>{PARTIE.correctionTitre}</p>
          {correction ? (
            <>
              {calcul && correction.bonneValeur !== null && (
                <div className={p.correctionLigne}>
                  <span className={s.libelle}>{PARTIE.bonneReponse}</span>
                  <span className={p.correctionValeur}>{formatCalc(correction.bonneValeur, unite, decimales)}</span>
                </div>
              )}
              {!calcul && correction.bonneIndex !== null && item.choix?.[correction.bonneIndex] !== undefined && (
                <div className={p.correctionLigne}>
                  <span className={s.libelle}>{PARTIE.bonneReponse}</span>
                  <span className={p.explication}>
                    <b>{LETTRES[correction.bonneIndex] ?? correction.bonneIndex + 1}.</b> {item.choix[correction.bonneIndex]}
                  </span>
                </div>
              )}
              {correction.explication && <Enonce texte={correction.explication} className={p.explication} />}
              {calcul && correction.etapes.length > 0 && (
                <>
                  <p className={s.libelle}>{PARTIE.etapes}</p>
                  <ol className={p.etapes}>
                    {correction.etapes.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ol>
                </>
              )}
            </>
          ) : (
            <p className={s.sous}>{PARTIE.correctionAttente}</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Les étiquettes d'une question (type, matière, difficulté) pour la tête de la carte. */
export function etiquettesDe(item: SalleItem | null): { texte: string; metal?: boolean }[] {
  if (!item) return [];
  const out: { texte: string; metal?: boolean }[] = [{ texte: item.origine === "calcul" ? PARTIE.typeCalcul : PARTIE.typeQuestion, metal: true }];
  const matiere = item.origine === "calcul" && item.libelle ? item.libelle : item.topic ? (TOPIC_LABELS[item.topic] ?? item.topic) : null;
  if (matiere) out.push({ texte: matiere });
  if (item.difficulte) out.push({ texte: PARTIE.niveau[item.difficulte] });
  return out;
}
