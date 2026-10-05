import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { rankLine, reviewHref, timeLeftLabel, type TodayDaily } from "@/lib/daily";
import { ECLAIR_HREF } from "@/lib/eclair";
import { DEFI_CINQ, ECLAIR, joueurs } from "@/lib/voice-z2c";

// Les 5 du jour en carte légère (accueil, S'entraîner), sous les 30 du jour :
// tout dit « vite » — l'éclair, « 2 min » en pastille, une seule ligne,
// une action secondaire. À côté, la grande carte des 30 dit « épreuve ».
// En pied, les séries éclair : des séries de 5 à volonté, tirées pour soi.
// Cachée tant que le défi n'est pas jouable (migration absente, liste vide).
// Sans état.

export function cinqVisible(daily: TodayDaily | null | undefined): daily is TodayDaily {
  return !!daily && (daily.status === "todo" || daily.status === "playing" || daily.status === "done");
}

export function CinqCarte({
  daily,
  nowIso,
  series,
  className = "",
}: {
  daily: TodayDaily;
  nowIso: string;
  /** séries éclair rendues aujourd'hui (null : inconnu, rien d'affiché) */
  series?: number | null;
  className?: string;
}) {
  const T = DEFI_CINQ.tuile;
  let etat: string;
  let ligne: React.ReactNode;
  let cta: string;
  let href = daily.href;

  if (daily.status === "done") {
    const total = daily.total ?? daily.questionCount;
    etat = T.rendue;
    ligne = (
      <>
        <b className="font-mono font-semibold text-white">
          {daily.score}/{total}
        </b>
        {rankLine(daily.rank, daily.players) ? ` · ${rankLine(daily.rank, daily.players)}` : ""}
      </>
    );
    cta = "Revoir";
    href = reviewHref(daily.day, undefined, "cinq");
  } else if (daily.status === "playing") {
    etat = timeLeftLabel(daily.deadline, nowIso) ?? T.etatEnCours;
    ligne = T.repondues(daily.answered, daily.questionCount);
    cta = "Reprendre";
  } else {
    etat = timeLeftLabel(daily.closesAt, nowIso) ?? T.etatAujourdhui;
    ligne = (
      <>
        {T.bientot}
        {daily.players > 0 && <span className="hidden sm:inline"> · {joueurs(daily.players)}</span>}
      </>
    );
    cta = "Jouer";
  }

  // séries éclair ouvertes (table lue) : le pied s'affiche, avec le compte du jour
  const eclair = typeof series === "number";
  const aujourdhui = eclair ? ECLAIR.aujourdhui(series) : null;

  return (
    <section className={"card rl-in min-w-0 overflow-hidden " + className} aria-label={T.titre}>
      <div className="flex min-w-0 items-center gap-4 p-4 sm:p-5">
        <span aria-hidden className="hidden h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-surface-2 min-[420px]:grid">
          <Zap size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="t-micro m-0 flex items-center gap-1.5 truncate font-semibold">
            <Zap size={12} aria-hidden className="shrink-0 min-[420px]:hidden" />
            {T.label} · {etat}
          </p>
          <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[17px] font-bold leading-tight tracking-[-0.01em]">{T.titre}</span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[11.5px] font-semibold">≈ 2 min</span>
          </p>
          <p className="t-micro m-0 mt-1 truncate">{ligne}</p>
        </div>
        <Link href={href} className="btn btn-secondary shrink-0">
          {cta} <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
      {/* à volonté : des séries de 5 tirées pour soi, dans la même liste */}
      {eclair && (
        <Link href={ECLAIR_HREF} className="rl-row group flex items-center gap-2 border-t border-line px-4 py-2.5 sm:px-5">
          <span className="text-[13.5px] font-semibold">{ECLAIR.lien}</span>
          {aujourdhui && <span className="t-micro">· {aujourdhui}</span>}
          <ArrowRight size={14} aria-hidden className="ml-auto shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </section>
  );
}
