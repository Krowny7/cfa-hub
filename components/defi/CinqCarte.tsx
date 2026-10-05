import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { rankLine, reviewHref, timeLeftLabel, type TodayDaily } from "@/lib/daily";
import { DEFI_CINQ, joueurs } from "@/lib/voice-z2c";

// Les 5 du jour en carte légère (accueil, S'entraîner), sous les 30 du jour :
// tout dit « vite » — l'éclair, « 2 min » en pastille, une seule ligne,
// une action secondaire. À côté, la grande carte des 30 dit « épreuve ».
// Cachée tant que le défi n'est pas jouable (migration absente, liste vide).
// Sans état.

export function cinqVisible(daily: TodayDaily | null | undefined): daily is TodayDaily {
  return !!daily && (daily.status === "todo" || daily.status === "playing" || daily.status === "done");
}

export function CinqCarte({ daily, nowIso, className = "" }: { daily: TodayDaily; nowIso: string; className?: string }) {
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

  return (
    <section className={"card rl-in flex min-w-0 items-center gap-4 p-4 sm:p-5 " + className} aria-label={T.titre}>
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
    </section>
  );
}
