import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Icone, type IconeNom } from "@/components/adn/icons";
import { InkBarCoches } from "@/components/adn/InkBarCoches";
import { DAILY_HREF, rankLine, reviewHref, timeLeftLabel, type TodayDaily } from "@/lib/daily";
import { DEFI, joueurs } from "@/lib/voice-z2c";

// Tuile « Défi du jour » prête à poser (accueil, S'entraîner), sur la même
// grille que les tuiles de l'accueil (components/accueil/Tile) : étiquette
// avec l'icône maison, un seul élément fort, une ligne, puis l'action.
// Données : getTodayDaily(supabase, userId) de lib/daily.ts, un seul appel.
//   <DefiTile daily={await getTodayDaily(supabase, user.id)} nowIso={new Date().toISOString()} actionEnBas />
// Toute la tuile mène au défi (ou à la revue une fois la copie rendue).
//
// Props
//   daily, nowIso     la donnée du jour et l'heure (comptes à rebours)
//   actionEnBas       la tuile prend toute la hauteur de sa cellule et
//                     l'action se pose en bas (rangée de tuiles de hauteurs
//                     inégales : les actions s'alignent)
//   icone             icône maison de l'étiquette (défaut « examen » : le
//                     sablier de l'épreuve chronométrée)
//   className
// Sans état : utilisable côté serveur comme côté client.
export function DefiTile({
  daily,
  nowIso,
  actionEnBas = false,
  icone = "examen",
  className = "",
}: {
  daily: TodayDaily;
  nowIso: string;
  actionEnBas?: boolean;
  icone?: IconeNom;
  className?: string;
}) {
  const T = DEFI.tuile;
  const players = joueurs(daily.players);
  let status: string;
  let main: React.ReactNode;
  let sub: string | null;
  let cta: string | null;
  let href = DAILY_HREF;

  switch (daily.status) {
    case "done": {
      const total = daily.total ?? daily.questionCount;
      status = T.rendue;
      main = (
        <span className="flex items-baseline gap-1" aria-label={`${daily.score} sur ${total}`}>
          <span className="t-num text-[30px] leading-none">{daily.score}</span>
          <span className="font-mono text-[14px] text-muted">/{total}</span>
        </span>
      );
      sub = [rankLine(daily.rank, daily.players), timeLeftLabel(daily.closesAt, nowIso) ? T.seFige : null].filter(Boolean).join(" · ");
      cta = DEFI.revoir;
      href = reviewHref(daily.day);
      break;
    }
    case "playing":
      status = timeLeftLabel(daily.deadline, nowIso) ?? T.etatEnCours;
      main = (
        <>
          <span className="t-h3 block">{T.enCours}</span>
          {/* la copie en coches : à l'encre ce qui est répondu, au crayon ce qui reste */}
          <span className="mt-2.5 flex min-w-0 items-center gap-2.5">
            <InkBarCoches
              items={Array.from({ length: daily.questionCount }, (_, i) => (i < daily.answered ? true : null))}
              height={16}
              label={T.repondues(daily.answered, daily.questionCount)}
            />
            <span aria-hidden className="shrink-0 font-mono text-[12px] tabular-nums text-muted">
              {daily.answered}/{daily.questionCount}
            </span>
          </span>
        </>
      );
      sub = null;
      cta = T.reprendre;
      break;
    case "todo":
      status = timeLeftLabel(daily.closesAt, nowIso) ?? T.etatAujourdhui;
      main = <span className="t-h3">{T.titre}</span>;
      sub = daily.players > 0 ? `${players}${daily.topScore !== null ? ` · ${DEFI.meilleur(daily.topScore, daily.questionCount)}` : ""}` : T.personne;
      cta = DEFI.start.replace(/[.]$/, "");
      break;
    case "soon":
      status = T.etatBientot;
      main = <span className="t-h3 text-muted">{T.titre}</span>;
      sub = T.bientot;
      cta = null;
      break;
    default:
      status = T.etatIndispo;
      main = <span className="t-h3 text-muted">{T.titre}</span>;
      sub = T.indispo;
      cta = null;
  }

  const body = (
    <>
      <span className="flex items-center gap-2 text-[12.5px] font-semibold text-muted">
        <Icone nom={icone} size={15} />
        <span className="truncate">{T.label}</span>
        <span className="ml-auto shrink-0 font-medium">{status}</span>
      </span>
      <span className="mt-3 block min-w-0">{main}</span>
      {sub && <span className="t-micro mt-1 block truncate">{sub}</span>}
      {cta && (
        <span className={"inline-flex items-center gap-1.5 text-[13.5px] font-semibold " + (actionEnBas ? "mt-auto pt-3" : "mt-3")}>
          {cta} <ArrowRight size={14} aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      )}
    </>
  );

  const shape = actionEnBas ? " flex h-full flex-col" : " block";
  if (daily.status === "soon" || daily.status === "unavailable") {
    return <div className={"card-quiet min-w-0 p-5" + shape + " " + className}>{body}</div>;
  }
  return (
    <Link href={href} className={"card-quiet rl-lift group min-w-0 p-5" + shape + " " + className}>
      {body}
    </Link>
  );
}
