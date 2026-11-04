import { initiales } from "@/components/adn/SceauPerso";
import { couleurTrait, fondDe } from "@/lib/arene/perso";
import type { JoueurArene } from "@/lib/arene/donnees";
import { ARENE } from "@/lib/voice-arene";
import s from "./Arene.module.css";

// La bannière d'un joueur, en coup de pinceau : le trait rempli par sa peinture
// (ou de sa couleur, la peinture n'en occupant que le bout), sa photo, son
// pseudo, son rang, son ELO. Toutes ses mesures suivent le conteneur le plus
// proche (cqw) : l'écran VS, la fin de partie et l'aperçu de Personnaliser.
// `droite` : le trait part de la droite ; `t2` : l'autre coup de pinceau.

export function BanniereVs({ j, droite = false, t2 = false, compact = false, className }: { j: JoueurArene; droite?: boolean; t2?: boolean; compact?: boolean; className?: string }) {
  const fond = fondDe(j.arene, j.id);
  return (
    <div
      className={[s.ban, droite ? s.droite : "", t2 ? s.t2 : "", compact ? s.compact : "", className ?? ""].filter(Boolean).join(" ")}
      data-habit={j.arene.trait === "peinture" ? "b" : "a"}
      style={{ "--y": fond.y } as React.CSSProperties}
    >
      <div className={s.banTrait} style={{ background: couleurTrait(j.arene.trait) }}>
        <div className={s.banFond} style={{ backgroundImage: `url("${fond.src}")` }} />
        <div className={s.banVoile} />
      </div>
      <div className={s.banPhoto}>
        <i className={s.bord} />
        <i className={s.img}>
          {j.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={j.photo} alt="" draggable={false} />
          ) : (
            <span className={s.initiales}>{initiales(j.pseudo)}</span>
          )}
        </i>
      </div>
      <div className={s.banTxt}>
        <strong>{j.pseudo}</strong>
        {j.rang && <span>{j.rang}</span>}
        {j.elo !== null && <span>{ARENE.elo(j.elo)}</span>}
      </div>
    </div>
  );
}

/** Le pseudo et le score, sous la vidéo ou la bannière du vainqueur. */
export function LigneVainqueur({ pseudo, score, ligne }: { pseudo: string; score: string; ligne: string | null }) {
  return (
    <div className={s.vainqueur}>
      <strong>{pseudo}</strong>
      <span>
        <b>{score}</b>
        {ligne ? ` · ${ligne}` : ""}
      </span>
    </div>
  );
}
