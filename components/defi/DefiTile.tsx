import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { DAILY_HREF, rankLine, reviewHref, timeLeftLabel, type TodayDaily } from "@/lib/daily";

// Tuile « Défi du jour » prête à poser (accueil, S'entraîner : phase 2).
// Données : getTodayDaily(supabase, userId) de lib/daily.ts, un seul appel.
//   <DefiTile daily={await getTodayDaily(supabase, user.id)} nowIso={new Date().toISOString()} />
// Toute la tuile mène au défi (ou à la revue une fois la copie rendue).
// Sans état : utilisable côté serveur comme côté client.
export function DefiTile({ daily, nowIso, className = "" }: { daily: TodayDaily; nowIso: string; className?: string }) {
  const players = `${daily.players} joueur${daily.players > 1 ? "s" : ""}`;
  let status: string;
  let main: React.ReactNode;
  let sub: string | null;
  let cta: string | null;
  let href = DAILY_HREF;

  switch (daily.status) {
    case "done": {
      const total = daily.total ?? daily.questionCount;
      status = "copie rendue";
      main = (
        <span className="font-mono text-[22px] font-semibold tabular-nums">
          {daily.score}
          <span className="text-[15px] font-normal text-muted">/{total}</span>
        </span>
      );
      sub = [rankLine(daily.rank, daily.players), timeLeftLabel(daily.closesAt, nowIso) ? "se fige à minuit" : null].filter(Boolean).join(" · ");
      cta = "Revoir ma copie";
      href = reviewHref(daily.day);
      break;
    }
    case "playing":
      status = timeLeftLabel(daily.deadline, nowIso) ?? "en cours";
      main = <span className="t-h3">Copie en cours</span>;
      sub = `${daily.answered}/${daily.questionCount} répondues`;
      cta = "Reprendre";
      break;
    case "todo":
      status = timeLeftLabel(daily.closesAt, nowIso) ?? "aujourd'hui";
      main = <span className="t-h3">Les 30 du jour</span>;
      sub = daily.players > 0 ? `${players}${daily.topScore !== null ? ` · meilleur ${daily.topScore}/${daily.questionCount}` : ""}` : "Personne n'a encore joué";
      cta = "À toi le trait";
      break;
    case "soon":
      status = "bientôt";
      main = <span className="t-h3 text-muted">Les 30 du jour</span>;
      sub = "Mêmes questions pour tous, chaque jour.";
      cta = null;
      break;
    default:
      status = "indisponible";
      main = <span className="t-h3 text-muted">Les 30 du jour</span>;
      sub = "Pas de défi pour l'instant.";
      cta = null;
  }

  const body = (
    <>
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-muted">
        <CalendarDays size={15} aria-hidden className="opacity-80" />
        <span>Défi du jour</span>
        <span className="ml-auto font-medium">{status}</span>
      </div>
      <div className="mt-3 min-w-0">{main}</div>
      {sub && <p className="t-micro m-0 mt-1 truncate">{sub}</p>}
      {cta && (
        <span className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold">
          {cta} <ArrowRight size={14} aria-hidden />
        </span>
      )}
    </>
  );

  if (daily.status === "soon" || daily.status === "unavailable") {
    return <div className={"card-quiet min-w-0 p-5 " + className}>{body}</div>;
  }
  return (
    <Link href={href} className={"card-quiet rl-lift block min-w-0 p-5 " + className}>
      {body}
    </Link>
  );
}
