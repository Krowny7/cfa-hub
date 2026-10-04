import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/classement/Avatar";
import { fmtAgo, fmtShortDate, signed } from "@/components/classement/format";
import { ReviewDuelRow } from "@/components/duel/parts";
import { DUEL_QUESTIONS, DUEL_REVIEW_DAYS, reviewLeftLabel } from "@/lib/duels";
import type { DuelSummary } from "@/lib/rating";
import { DUEL } from "@/lib/voice";
import { CLASSEMENT, motIssue, teDefie } from "@/lib/voice-z2a";

function nameOf(d: DuelSummary) {
  return d.opponentName?.trim() || (d.opponentId ? "Un joueur" : "Adversaire à trouver");
}

function OpenRow({ d }: { d: DuelSummary }) {
  const name = nameOf(d);
  const [text, action, strong]: [string, string, boolean] =
    d.status === "active"
      ? [`Contre ${name}`, "Reprendre", true]
      : d.incoming
        ? [teDefie(name), "Relever", true]
        : d.opponentId
          ? [`En attente de ${name}`, "Voir", false]
          : [DUEL.trouver, "Voir", false];
  return (
    <li className="rl-row flex items-center gap-3 rounded-[12px] px-2 py-2.5">
      <Avatar src={d.opponentAvatar} name={name} size={32} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-semibold">{text}</span>
        <span className="t-micro block">{fmtAgo(d.createdAt)}</span>
      </span>
      <Link href={`/duel/${d.id}`} className={"btn btn-sm " + (strong ? "btn-primary" : "btn-secondary")}>
        {action}
      </Link>
    </li>
  );
}

function RecentRow({ d }: { d: DuelSummary }) {
  const name = nameOf(d);
  const res = d.won === true ? "V" : d.won === false ? "D" : "=";
  const label = motIssue(d.won);
  return (
    <li>
      <Link href={`/duel/${d.id}`} className="rl-row grid grid-cols-[26px_minmax(0,1fr)_auto_44px] items-center gap-3 rounded-[12px] px-2 py-2.5">
        <span
          aria-label={label}
          className={"grid h-[26px] w-[26px] place-items-center rounded-[8px] text-[12px] font-extrabold " + (d.won === true ? "bg-white text-black" : "border border-line-2 text-muted")}
        >
          {res}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[14.5px] font-semibold">{name}</span>
          {d.finishedAt && <span className="t-micro block">{fmtShortDate(d.finishedAt)}</span>}
        </span>
        <span className="font-mono text-[13px] tabular-nums text-muted">{d.myScore !== null && d.theirScore !== null ? `${d.myScore} – ${d.theirScore}` : ""}</span>
        <span className={"text-right font-mono text-[13px] font-semibold tabular-nums " + (d.myDelta !== null && d.myDelta < 0 ? "text-muted" : "")}>
          {d.myDelta !== null ? signed(d.myDelta) : "—"}
        </span>
      </Link>
    </li>
  );
}

// Onglet « Duels » du classement : les défis en cours à gauche ; à droite,
// les duels des 14 derniers jours « À revoir » (revue + « Copier pour l'IA »,
// avec le temps restant), puis les plus anciens. Le lancement d'un duel est
// dans le héros (et le lobby). `nowIso` : pour l'aperçu (sinon l'heure du
// rendu serveur).
export function DuelsPanel({ open, recent, nowIso }: { open: DuelSummary[]; recent: DuelSummary[]; nowIso?: string }) {
  if (open.length === 0 && recent.length === 0) {
    return (
      <div className="max-w-[560px]">
        <p className="t-h3">{CLASSEMENT.duelsVide}</p>
        <p className="t-small mt-1">{CLASSEMENT.duelsVideTexte}</p>
        <Link href="/duel" className="ink-link mt-4 inline-block">
          {CLASSEMENT.duelsLancer}
        </Link>
      </div>
    );
  }

  const now = nowIso ?? new Date().toISOString();
  const toReview = recent.filter((d) => d.status === "finished" && d.finishedAt && reviewLeftLabel(d.finishedAt, now) !== null);
  const older = recent.filter((d) => !toReview.includes(d));

  return (
    <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
      <section className="flex min-w-0 flex-col gap-2 lg:col-span-5" aria-label="Duels en cours">
        <p className="t-eyebrow px-2">
          En cours{open.length > 0 && <span className="font-mono font-normal"> · {open.length}</span>}
        </p>
        {open.length ? (
          <ul className="flex flex-col gap-0.5">
            {open.slice(0, 5).map((d) => (
              <OpenRow key={d.id} d={d} />
            ))}
          </ul>
        ) : (
          <p className="t-small px-2">{CLASSEMENT.enCoursVide}</p>
        )}
      </section>

      <section className="flex min-w-0 flex-col gap-2 lg:col-span-7" aria-label="Duels à revoir">
        <p className="t-eyebrow flex items-baseline justify-between gap-3 px-2">
          <span>
            À revoir{toReview.length > 0 && <span className="font-mono font-normal"> · {toReview.length}</span>}
          </span>
          <span className="font-normal normal-case tracking-normal">{CLASSEMENT.aRevoirSous(DUEL_REVIEW_DAYS)}</span>
        </p>
        {toReview.length ? (
          <ul className="flex flex-col gap-0.5">
            {toReview.slice(0, 5).map((d) => (
              <ReviewDuelRow
                key={d.id}
                id={d.id}
                name={nameOf(d)}
                won={d.won}
                myScore={d.myScore}
                theirScore={d.theirScore}
                errors={d.myScore !== null ? Math.max(0, DUEL_QUESTIONS - d.myScore) : null}
                left={reviewLeftLabel(d.finishedAt as string, now)}
              />
            ))}
          </ul>
        ) : (
          <p className="t-small px-2">{CLASSEMENT.aRevoirVide(DUEL_REVIEW_DAYS)}</p>
        )}
        {older.length > 0 && (
          <>
            <p className="t-eyebrow mt-5 px-2">Plus anciens</p>
            <ul className="flex flex-col gap-0.5">
              {older.slice(0, 5).map((d) => (
                <RecentRow key={d.id} d={d} />
              ))}
            </ul>
          </>
        )}
        <Link href="/duel" className="mt-2 inline-flex w-fit items-center gap-1.5 px-2 text-[13px] font-semibold text-muted hover:text-white">
          {CLASSEMENT.tousDuels} <ArrowRight size={14} aria-hidden />
        </Link>
      </section>
    </div>
  );
}
