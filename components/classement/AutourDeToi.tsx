import Link from "next/link";
import { INK } from "@/components/ui/InkDefs";
import { LienJoueur } from "@/components/profil/CarteJoueur";
import type { BoardRow } from "@/components/classement/types";

/** Mini-jauge au pinceau (le même tracé que les points faibles de S'entraîner). */
export function Jauge({ pct, label, className = "w-12" }: { pct: number; label: string; className?: string }) {
  const p = Math.max(4, Math.min(100, pct));
  return (
    <span role="img" aria-label={label} title={label} className={"relative block h-[8px] shrink-0 text-white " + className}>
      <svg viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden className="absolute inset-0 h-full w-full opacity-25">
        <use href={INK.swash} fill="currentColor" />
      </svg>
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${p}%` }}>
        <svg viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden className="absolute inset-y-0 left-0 h-full max-w-none" style={{ width: `${10000 / p}%` }}>
          <use href={INK.swash} fill="currentColor" />
        </svg>
      </span>
    </span>
  );
}

const LIGNE = "rl-row grid min-h-[44px] w-full grid-cols-[22px_minmax(0,1fr)_auto_40px] items-center gap-x-3 rounded-[12px] px-2 py-2.5 ";

/** Petite liste classée (le joueur devant, toi, celui qui te suit) : place, nom, jauge d'ELO, ELO. */
export function AutourDeToi({ rows, titre, bornes }: { rows: BoardRow[]; titre: string; /** ELO le plus bas et le plus haut du classement, pour les jauges */ bornes: [number, number] }) {
  const [lo, hi] = [bornes[0] - 60, Math.max(bornes[1], bornes[0] + 1)];
  return (
    <div className="flex min-w-0 flex-col gap-1 md:gap-2">
      <p className="t-eyebrow px-2">{titre}</p>
      <ol className="m-0 flex list-none flex-col divide-y divide-line p-0">
        {rows.map((r) => {
          const pct = Math.round(((r.elo - lo) / (hi - lo)) * 100);
          const contenu = (
            <>
              <span className={"font-mono text-[13px] font-semibold tabular-nums " + (r.isMe ? "text-pen" : "")}>{r.rank}</span>
              <span className="min-w-0 truncate text-[14px] font-semibold">{r.isMe ? "Toi" : r.name}</span>
              <Jauge pct={pct} label={`${r.elo} ELO`} className="w-12" />
              <span className="text-right font-mono text-[13px] font-semibold tabular-nums">{r.elo}</span>
            </>
          );
          return (
            <li key={r.userId}>
              {r.isMe ? (
                <Link href="#joueurs" className={LIGNE + "bg-surface-2 text-white"}>
                  {contenu}
                </Link>
              ) : (
                <LienJoueur id={r.userId} nom={r.name} className={LIGNE + "text-muted hover:text-white"}>
                  {contenu}
                </LienJoueur>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
