"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Swords } from "lucide-react";
import { Avatar } from "@/components/classement/Avatar";
import { fmtInt } from "@/components/classement/format";
import { mouvementReduit, useCompteur } from "@/components/salles/anim";
import { TetePanneau } from "@/components/salles/Stage";
import type { SalleSerie, SalleSerieLigne } from "@/lib/salles/types";
import { PARTIE, SALLES } from "@/lib/voice-salles";
import s from "./Salles.module.css";
import p from "./Partie.module.css";

// Le classement général d'une partie en rounds, entre deux rounds et à la fin.
// Il part de l'ordre d'avant le round : les gains s'affichent, les points montent,
// puis les joueurs glissent à leur nouvelle place. Le premier round, sans ordre
// d'avant, fait entrer les lignes du bas vers le haut. En mouvement réduit,
// l'état final s'affiche d'un coup. L'appelant le remonte quand les données arrivent.

/** la hauteur d'une ligne, en px : les lignes se placent à la main pour pouvoir glisser */
const HAUTEUR = 64;
/** le temps de lire l'ordre d'avant */
const AVANT_MS = 800;

const nomDe = (l: { username: string | null }) => l.username?.trim() || "Un joueur";

function Ligne({ ligne, place, apres, maxPoints, premier, moi, derniere, delai, rounds }: { ligne: SalleSerieLigne; place: number; apres: boolean; maxPoints: number; premier: boolean; moi: boolean; derniere: boolean; delai: number; rounds: number }) {
  const depart = premier ? 0 : ligne.pointsAvant;
  const points = useCompteur(apres ? ligne.points : depart, 1100, depart);
  const gagne = premier ? 0 : ligne.rangAvant - ligne.rang;
  const rang = apres || premier ? ligne.rang : ligne.rangAvant;
  const part = maxPoints > 0 ? ((apres ? ligne.points : depart) / maxPoints) * 100 : 0;
  return (
    <li className={p.serieLigne} data-moi={moi ? "1" : undefined} data-entree={premier ? "1" : undefined} style={{ transform: `translateY(${place * HAUTEUR}px)`, "--delai": `${delai}ms` } as React.CSSProperties}>
      <span className={p.serieRang}>{rang}</span>
      <Avatar src={ligne.avatarUrl} name={nomDe(ligne)} size={34} />
      <span className={p.serieCorps}>
        <span className={p.serieNom} title={nomDe(ligne)}>
          {nomDe(ligne)}
          {moi ? ` · ${SALLES.vous}` : ""}
        </span>
        {derniere ? (
          <span className={p.serieRounds}>{Array.from({ length: rounds }, (_, i) => `${PARTIE.roundInitiale(i + 1)} ${fmtInt(ligne.parRound[i + 1] ?? 0)}`).join(" · ")}</span>
        ) : (
          <span className={p.seriePiste} aria-hidden>
            <i style={{ width: `${part}%` }} />
          </span>
        )}
      </span>
      <span className={p.serieDroite}>
        <span className={p.seriePoints}>{fmtInt(points)}</span>
        <span className={p.serieGain} data-on={apres ? "1" : undefined}>
          {gagne !== 0 && (
            <span className={p.serieFleche} data-sens={gagne > 0 ? "monte" : "baisse"} aria-label={gagne > 0 ? PARTIE.monte(gagne) : PARTIE.baisse(-gagne)}>
              {gagne > 0 ? <ChevronUp size={13} aria-hidden /> : <ChevronDown size={13} aria-hidden />}
              {Math.abs(gagne)}
            </span>
          )}
          {ligne.pointsRound > 0 ? `+${fmtInt(ligne.pointsRound)}` : PARTIE.sansPoints}
        </span>
      </span>
    </li>
  );
}

export function ClassementSerie({ serie, moiId }: { serie: SalleSerie; moiId: string }) {
  const lignes = serie.classement;
  const premier = serie.round <= 1;
  const [apres, setApres] = useState(false);
  useEffect(() => {
    if (mouvementReduit()) {
      setApres(true);
      return;
    }
    const t = setTimeout(() => setApres(true), AVANT_MS);
    return () => clearTimeout(t);
  }, []);

  // l'ordre d'avant le round : les égalités gardent l'ordre d'arrivée
  const placeAvant = useMemo(() => {
    const ordre = [...lignes].sort((a, b) => a.rangAvant - b.rangAvant || a.rang - b.rang);
    return new Map(ordre.map((l, i) => [l.userId, i]));
  }, [lignes]);

  if (lignes.length === 0) return null;
  const maxPoints = Math.max(...lignes.map((l) => l.points));
  return (
    <section className={s.panneau} aria-labelledby="serie-classement">
      <TetePanneau id="serie-classement" icone={<Swords size={16} />} droite={<span className={s.compte}>{PARTIE.roundCourt(serie.round, serie.rounds)}</span>}>
        {PARTIE.classementGeneral}
      </TetePanneau>
      <ol className={p.serieListe} style={{ height: lignes.length * HAUTEUR }}>
        {lignes.map((l, i) => (
          <Ligne
            key={l.userId}
            ligne={l}
            place={apres || premier ? i : (placeAvant.get(l.userId) ?? i)}
            apres={apres}
            maxPoints={maxPoints}
            premier={premier}
            moi={l.userId === moiId}
            derniere={serie.finie}
            delai={premier ? (lignes.length - 1 - i) * 110 : i * 40}
            rounds={serie.round}
          />
        ))}
      </ol>
    </section>
  );
}
