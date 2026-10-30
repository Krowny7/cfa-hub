import { IMAGE_POSE, type Pose } from "@/lib/flashcards/partie";
import { PARTIE_REGLAGES } from "@/lib/voice-partie";
import s from "./Partie.module.css";

// Le panneau de Léonard, le croupier : son portrait dans la pose du moment
// (les quatre poses sont empilées, la bonne fond au premier plan), son nom,
// sa phrase dans une bulle, et dessous ce que l'écran y met (la table en
// perspective et les jetons à gagner sur « Prépare ta partie »).
// Sans état : la pose et la phrase viennent de l'écran (poseLeonard,
// bulleTable, leonardReglages).

const POSES: Pose[] = ["moqueur", "fier", "etonne", "decu"];

/** Le portrait seul (les quatre poses empilées, la bonne visible) : à poser dans n'importe quel cadre positionné. */
export function PortraitLeonard({ pose, className = "" }: { pose: Pose; className?: string }) {
  return (
    <>
      {POSES.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={p} src={IMAGE_POSE[p]} alt="" decoding="async" aria-hidden className={`${s.leo} ${p === pose ? s.leoOn : ""} ${className}`} />
      ))}
    </>
  );
}

export function PanneauCroupier({ pose, bulle, className = "", children }: { pose: Pose; bulle: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`${s.croupier} ${className}`}>
      <div className={s.leoBox}>
        <PortraitLeonard pose={pose} />
        <span className={s.nomLeo}>{PARTIE_REGLAGES.croupier}</span>
      </div>
      <div className={s.bulle} aria-live="polite">
        <p>{bulle}</p>
      </div>
      <div className={s.corps}>{children}</div>
    </div>
  );
}
