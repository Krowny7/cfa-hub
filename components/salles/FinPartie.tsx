"use client";

import { memo, useState } from "react";
import { ArrowLeft, ChartNoAxesColumn, Crown, RotateCcw, Trophy } from "lucide-react";
import { Avatar } from "@/components/classement/Avatar";
import { BoutonEnvoi } from "@/components/classement/Encre";
import { fmtInt } from "@/components/classement/format";
import { useCompteur } from "@/components/salles/anim";
import { TetePanneau } from "@/components/salles/Stage";
import { formatCalc } from "@/lib/calc/engine";
import type { CalcUnit } from "@/lib/calc/types";
import { bilanJoueur, libelleDelai, placeOrdinale, podium, type Verdict } from "@/lib/salles/partie";
import { libelleParams } from "@/lib/salles/logique";
import type { SalleClassementLigne, SalleCorrection, SalleItem, SalleMaReponse, SalleSession } from "@/lib/salles/types";
import { PARTIE, SALLES } from "@/lib/voice-salles";
import s from "./Salles.module.css";
import p from "./Partie.module.css";

// La fin d'une partie : le podium des trois premiers (qui se dresse marche
// après marche, le premier en dernier), ton bilan (bonnes réponses, points,
// place, une case par question), de quoi revoir les questions, puis
// « Rejouer » (l'admin relance avec les mêmes réglages) et « Retour au
// salon ». Présentation seule : le parent donne l'état et les deux actions.
// PLACEHOLDER pour plus tard : confettis et fanfare sur le podium, réaction de
// Léonard (voir components/salles/effets.ts).

const nomDe = (l: { username: string | null }) => l.username?.trim() || "Un joueur";
const TAILLE_AVATAR: Record<number, number> = { 1: 60, 2: 48, 3: 44 };
const DELAI_MARCHE: Record<number, string> = { 3: "0.1s", 2: "0.45s", 1: "0.9s" };

function FinPartieBase({
  session,
  items,
  corrections,
  mesReponses,
  classement,
  monClassement,
  moiId,
  estAdmin,
  onRejouer,
  onRetour,
}: {
  session: SalleSession;
  items: SalleItem[];
  corrections: SalleCorrection[];
  mesReponses: SalleMaReponse[];
  classement: SalleClassementLigne[];
  monClassement: { rang: number; points: number; bonnes: number; repondues: number } | null;
  moiId: string;
  estAdmin: boolean;
  /** admin : relance avec les mêmes réglages */
  onRejouer?: () => Promise<{ ok: boolean; erreur?: string }>;
  onRetour?: () => void;
}) {
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const bilan = bilanJoueur({ session, mesReponses, classement, monClassement, moiId });
  const aDesPoints = classement.some((l) => l.points > 0);
  const marches = aDesPoints ? podium(classement.filter((l) => l.points > 0)) : [];
  const gagnant = aDesPoints ? classement[0] : null;
  const points = useCompteur(bilan.points, 1100, 0);

  async function rejouer() {
    if (!onRejouer || occupe) return;
    setOccupe(true);
    setErreur(null);
    try {
      const r = await onRejouer();
      if (!r.ok) setErreur(r.erreur ?? "Le lancement n'a pas abouti. Réessaie dans un instant.");
    } finally {
      setOccupe(false);
    }
  }

  return (
    <div className={p.fin}>
      <section className={s.panneau} aria-labelledby="partie-fin">
        <TetePanneau id="partie-fin" icone={<Trophy size={16} />} droite={<span className={s.compte}>{PARTIE.finKicker}</span>}>
          {PARTIE.finTitre(session.numero)}
        </TetePanneau>
        <p className={s.sous} style={{ padding: "6px 20px 0" }}>
          {libelleParams(session.params)}
        </p>

        <div className={p.podiumCadre} aria-label={PARTIE.podiumTitre}>
          {aDesPoints && marches.length > 0 ? (
            <>
              {gagnant && (
                <p className={s.libelle} style={{ textAlign: "center" }}>
                  {PARTIE.gagnant(nomDe(gagnant))}
                </p>
              )}
              <ol className={p.podium} style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {marches.map(({ ligne, place }) => (
                  <li key={ligne.userId} className={p.marche} data-place={place} style={{ "--delai": DELAI_MARCHE[place] } as React.CSSProperties}>
                    <div className={p.marcheJoueur}>
                      {place === 1 && <Crown size={22} aria-hidden style={{ color: "var(--sl-texte)" }} />}
                      <Avatar src={ligne.avatarUrl} name={nomDe(ligne)} size={TAILLE_AVATAR[place] ?? 44} />
                      <span className={p.marcheNom} title={nomDe(ligne)}>
                        {nomDe(ligne)}
                        {ligne.userId === moiId ? ` · ${SALLES.vous}` : ""}
                      </span>
                      <span className={p.marchePoints}>{fmtInt(ligne.points)}</span>
                    </div>
                    <div className={p.socle} data-place={place} aria-hidden>
                      <span className={p.socleNum}>{place}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className={s.sous} style={{ padding: "6px 4px 20px" }}>
              {PARTIE.podiumVide}
            </p>
          )}
        </div>
      </section>

      <section className={s.panneau} aria-labelledby="partie-bilan">
        <TetePanneau id="partie-bilan" icone={<ChartNoAxesColumn size={16} />}>
          {PARTIE.bilanTitre}
        </TetePanneau>
        <div className={p.bilan}>
          <div className={p.stat}>
            <span className={p.statNombre}>
              {bilan.bonnes}
              <small> / {bilan.nb}</small>
            </span>
            <span className={p.statLibelle}>{PARTIE.bilanBonnes}</span>
          </div>
          <div className={p.stat}>
            <span className={p.statNombre} aria-label={`${fmtInt(bilan.points)} ${PARTIE.points}`}>
              {fmtInt(points)}
            </span>
            <span className={p.statLibelle}>{PARTIE.bilanPoints}</span>
          </div>
          <div className={p.stat} data-vif={bilan.rang === 1 ? "1" : "0"}>
            <span className={p.statNombre}>
              {bilan.rang === null ? "—" : placeOrdinale(bilan.rang)}
              {bilan.rang !== null && <small> {PARTIE.bilanSur(bilan.sur)}</small>}
            </span>
            <span className={p.statLibelle}>{PARTIE.bilanPlace}</span>
          </div>
        </div>
        <div className={p.serie} role="img" aria-label={PARTIE.bilanSerie}>
          {bilan.serie.map((v, i) => (
            <i key={i} data-v={v} title={`${i + 1} · ${v === "juste" ? PARTIE.revueJuste : v === "faux" ? PARTIE.revueFaux : PARTIE.revueSans}`} />
          ))}
        </div>
        {bilan.delaiMoyenMs !== null && <p className={p.bilanNote}>{PARTIE.bilanDelai(libelleDelai(bilan.delaiMoyenMs))}</p>}

        <details className={p.revue}>
          <summary>{PARTIE.revue}</summary>
          <ol className={p.revueListe}>
            {items.map((it) => {
              const rep = mesReponses.find((r) => r.position === it.position);
              const cor = corrections.find((c) => c.position === it.position);
              const v: Verdict = rep ? (rep.juste ? "juste" : "faux") : "sans";
              const unite = (it.unite ?? "") as CalcUnit;
              const bonne =
                cor && it.origine === "question" && cor.bonneIndex !== null
                  ? it.choix?.[cor.bonneIndex]
                  : cor && cor.bonneValeur !== null
                    ? formatCalc(cor.bonneValeur, unite, it.decimales ?? 2)
                    : null;
              return (
                <li key={it.position} className={p.revueLigne} data-v={v}>
                  <span className={p.revueNum}>{it.position + 1}</span>
                  <span className={p.revueEnonce}>
                    {it.enonce.length > 160 ? `${it.enonce.slice(0, 157).trimEnd()}…` : it.enonce}
                    {bonne && (
                      <span className={p.revueBonne}>
                        <br />
                        {PARTIE.bonneReponse} : <b>{bonne}</b> · {v === "juste" ? PARTIE.revueJuste : v === "faux" ? PARTIE.revueFaux : PARTIE.revueSans}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </details>

        <div className={p.finActions}>
          {estAdmin && onRejouer && (
            <BoutonEnvoi type="button" surPeinture disabled={occupe} onClick={() => void rejouer()}>
              <RotateCcw size={17} aria-hidden /> {occupe ? PARTIE.rejouerEnCours : PARTIE.rejouer}
            </BoutonEnvoi>
          )}
          <button type="button" className={s.btn} onClick={onRetour}>
            <ArrowLeft size={16} aria-hidden /> {PARTIE.retourSalon}
          </button>
        </div>
        <p className={[s.aide, p.bilanNote].join(" ")}>{estAdmin ? PARTIE.rejouerAide : PARTIE.rejouerMembre}</p>
        {erreur && (
          <p className={s.erreur} role="alert" style={{ margin: "10px 20px 18px" }}>
            {erreur}
          </p>
        )}
      </section>
    </div>
  );
}

/** Mémorisé : le chrono redessine l'écran cinq fois par seconde, pas le podium. */
export const FinPartie = memo(FinPartieBase);
