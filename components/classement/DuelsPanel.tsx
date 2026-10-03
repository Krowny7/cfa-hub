import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/classement/Avatar";
import { fmtAgo, fmtShortDate, signed } from "@/components/classement/format";
import type { DuelSummary } from "@/lib/rating";

function nameOf(d: DuelSummary) {
  return d.opponentName?.trim() || (d.opponentId ? "Un joueur" : "Adversaire à trouver");
}

function OpenRow({ d }: { d: DuelSummary }) {
  const name = nameOf(d);
  const [text, action, strong]: [string, string, boolean] =
    d.status === "active"
      ? [`Contre ${name}`, "Reprendre", true]
      : d.incoming
        ? [`${name} te défie`, "Relever", true]
        : d.opponentId
          ? [`En attente de ${name}`, "Voir", false]
          : ["Recherche d'un adversaire", "Voir", false];
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
  const label = d.won === true ? "Victoire" : d.won === false ? "Défaite" : "Égalité";
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

// Onglet « Duels » du classement : les défis en cours à gauche, les derniers
// duels joués à droite. Le lancement d'un duel est dans le héros (et le lobby).
export function DuelsPanel({ open, recent }: { open: DuelSummary[]; recent: DuelSummary[] }) {
  if (open.length === 0 && recent.length === 0) {
    return (
      <div className="max-w-[560px]">
        <p className="t-h3">Pas encore de duel</p>
        <p className="t-small mt-1">30 questions type examen, les mêmes pour les deux. Le meilleur score gagne, puis le plus rapide.</p>
        <Link href="/duel" className="ink-link mt-4 inline-block">
          Lancer le premier
        </Link>
      </div>
    );
  }

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
          <p className="t-small px-2">Aucun duel en cours.</p>
        )}
      </section>

      <section className="flex min-w-0 flex-col gap-2 lg:col-span-7" aria-label="Derniers duels">
        <p className="t-eyebrow px-2">Derniers duels</p>
        {recent.length ? (
          <ul className="flex flex-col gap-0.5">
            {recent.slice(0, 5).map((d) => (
              <RecentRow key={d.id} d={d} />
            ))}
          </ul>
        ) : (
          <p className="t-small px-2">Pas encore de duel terminé.</p>
        )}
        <Link href="/duel" className="mt-2 inline-flex w-fit items-center gap-1.5 px-2 text-[13px] font-semibold text-muted hover:text-white">
          Tous tes duels <ArrowRight size={14} aria-hidden />
        </Link>
      </section>
    </div>
  );
}
