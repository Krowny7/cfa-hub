import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { InkBarCoches } from "@/components/adn/InkBarCoches";
import { DAILY_HREF, rankLine, reviewHref, timeLeftLabel, type TodayDaily } from "@/lib/daily";
import { DEFI, joueurs } from "@/lib/voice-z2c";

// Le défi du jour en carte héros de l'accueil, juste sous le titre (à la
// place de « Ton dernier trait », qui passe en tuile dans « Aujourd'hui ») :
// même facture que la carte de reprise (icône, sur-titre, grand titre, une
// ligne, l'action en encre). À faire, en cours (la copie en coches) ou
// rendue (le score, le rang, la revue). Pour « bientôt » et « indisponible »,
// l'accueil garde la carte de reprise (defiEnTete). Sans état.

/** Le défi prend la carte héros quand il est jouable ou joué aujourd'hui. */
export function defiEnTete(daily: TodayDaily | null | undefined): daily is TodayDaily {
  return !!daily && (daily.status === "todo" || daily.status === "playing" || daily.status === "done");
}

export function DefiHero({ daily, nowIso }: { daily: TodayDaily; nowIso: string }) {
  const T = DEFI.tuile;
  let etat: string;
  let ligne: React.ReactNode;
  let cta: string;
  let href = DAILY_HREF;
  let second: React.ReactNode = null;

  if (daily.status === "done") {
    const total = daily.total ?? daily.questionCount;
    etat = T.rendue;
    ligne = (
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="flex items-baseline gap-1" aria-label={`${daily.score} sur ${total}`}>
          <span className="t-num text-[28px] leading-none">{daily.score}</span>
          <span className="font-mono text-[14px] text-muted">/{total}</span>
        </span>
        <span className="t-micro">{[rankLine(daily.rank, daily.players), timeLeftLabel(daily.closesAt, nowIso) ? T.seFige : null].filter(Boolean).join(" · ")}</span>
      </span>
    );
    cta = DEFI.revoir;
    href = reviewHref(daily.day);
    second = (
      <Link href={DAILY_HREF} className="t-small font-semibold hover:text-white">
        {DEFI.classement} →
      </Link>
    );
  } else if (daily.status === "playing") {
    etat = timeLeftLabel(daily.deadline, nowIso) ?? T.etatEnCours;
    ligne = (
      // la copie en coches : à l'encre ce qui est répondu, au crayon ce qui reste
      <span className="flex min-w-0 max-w-[420px] items-center gap-2.5">
        <InkBarCoches items={Array.from({ length: daily.questionCount }, (_, i) => (i < daily.answered ? true : null))} height={16} label={T.repondues(daily.answered, daily.questionCount)} />
        <span aria-hidden className="shrink-0 font-mono text-[12px] tabular-nums text-muted">
          {daily.answered}/{daily.questionCount}
        </span>
      </span>
    );
    cta = T.reprendre;
  } else {
    etat = timeLeftLabel(daily.closesAt, nowIso) ?? T.etatAujourdhui;
    ligne = (
      <span className="t-micro">
        {daily.players > 0 ? `${joueurs(daily.players)}${daily.topScore !== null ? ` · ${DEFI.meilleur(daily.topScore, daily.questionCount)}` : ""}` : T.personne}
      </span>
    );
    cta = DEFI.start.replace(/[.]$/, "");
    second = <span className="t-small">{T.bientot}</span>;
  }

  return (
    <section className="card-hero rl-in p-6 sm:p-7" style={{ animationDelay: ".08s" }} aria-label={T.label}>
      <div className="flex min-w-0 items-start gap-5">
        <span aria-hidden className="hidden h-[56px] w-[56px] flex-none place-items-center rounded-[16px] bg-surface-2 sm:grid">
          <Icone nom="examen" size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="t-micro font-semibold">
            {T.label} · {etat}
          </p>
          <h2 className="t-h1 mt-1.5">{daily.status === "playing" ? T.enCours : T.titre}</h2>
          <div className="mt-3">{ligne}</div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 sm:pl-[76px]">
        <Link href={href} className="btn btn-primary btn-lg">
          {cta} <ArrowRight size={17} aria-hidden />
        </Link>
        {second}
      </div>
    </section>
  );
}
