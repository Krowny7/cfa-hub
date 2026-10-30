"use client";

import { memo } from "react";
import { Trophy } from "lucide-react";
import { Avatar } from "@/components/classement/Avatar";
import { fmtInt } from "@/components/classement/format";
import { useCompteur } from "@/components/salles/anim";
import { TetePanneau } from "@/components/salles/Stage";
import { lignesDirectes, type MoiPourClassement } from "@/lib/salles/partie";
import type { SalleClassementLigne } from "@/lib/salles/types";
import { PARTIE, SALLES } from "@/lib/voice-salles";
import s from "./Salles.module.css";
import p from "./Partie.module.css";

// Le classement en direct, à côté de la question (sous elle sur téléphone) :
// mes points en grand (ils montent dès que j'ai répondu), puis les huit
// premiers — rang, pseudo, bonnes réponses, points — et ma ligne surlignée,
// posée en dernier si je suis plus bas. Le serveur ne compte que les
// questions closes : le classement bouge à la correction de chaque question.
// Quand l'ordre change, chaque ligne GLISSE vers sa nouvelle place (la
// transition CSS sur son emplacement --e : aucune mesure, les lignes ont une
// hauteur fixe).

const nomDe = (l: { username: string | null }) => l.username?.trim() || "Un joueur";

function ClassementDirectBase({
  classement,
  monClassement,
  moi,
  mesPoints,
  nbFermees,
  nb,
  max = 8,
}: {
  classement: SalleClassementLigne[];
  monClassement: { rang: number; points: number; bonnes: number; repondues: number; tempsMs: number } | null;
  moi: MoiPourClassement;
  /** mon total, tout de suite (somme de mes réponses) */
  mesPoints: number;
  /** questions closes : le classement en tient compte */
  nbFermees: number;
  nb: number;
  max?: number;
}) {
  const { lignes } = lignesDirectes(classement, monClassement, moi, max);
  const total = useCompteur(mesPoints);
  const commence = nbFermees > 0;
  return (
    <section className={s.panneau} aria-labelledby="partie-classement">
      <TetePanneau id="partie-classement" icone={<Trophy size={16} />} droite={<span className={s.compte}>{fmtInt(classement.length || lignes.length)}</span>}>
        {PARTIE.classementTitre}
      </TetePanneau>
      <div className={p.mesPoints}>
        <span className={s.libelle}>{PARTIE.mesPoints}</span>
        <span className={p.mesPointsNombre} aria-label={`${fmtInt(mesPoints)} ${PARTIE.points}`}>
          {fmtInt(total)}
        </span>
      </div>
      <p className={p.classementApres}>{commence ? PARTIE.classementApres(nbFermees, nb) : PARTIE.classementAvant}</p>
      <ol className={p.rangs} style={{ "--n": lignes.length } as React.CSSProperties} aria-label={PARTIE.classementTitre}>
        {lignes.map((l) => {
          return (
            <li key={l.userId} className={p.rang} data-moi={l.moi ? "1" : "0"} data-top={commence && l.rang === 1 ? "1" : "0"} style={{ "--e": l.emplacement } as React.CSSProperties}>
              <span className={p.rangNum}>{commence ? l.rang : "–"}</span>
              <Avatar src={l.avatarUrl} name={nomDe(l)} size={28} />
              <span className={p.rangNom} title={nomDe(l)}>
                {nomDe(l)}
                {l.moi ? ` · ${SALLES.vous}` : ""}
              </span>
              <span className={p.rangBonnes} title={PARTIE.bonnes(l.bonnes)}>
                {l.bonnes}✓
              </span>
              <span className={p.rangPoints}>{fmtInt(l.points)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Mémorisé : le chrono redessine l'écran cinq fois par seconde, pas les avatars. */
export const ClassementDirect = memo(ClassementDirectBase);
