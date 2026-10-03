import Link from "next/link";
import { Shuffle, Swords } from "lucide-react";
import { CardLabel } from "@/components/ui/Titles";
import { Avatar } from "@/components/classement/Avatar";
import { fmtAgo, signed } from "@/components/classement/format";
import type { DuelSummary } from "@/lib/rating";

function nameOf(d: DuelSummary) {
  return d.opponentName?.trim() || (d.opponentId ? "Un joueur" : "Adversaire à trouver");
}

function OpenRow({ d }: { d: DuelSummary }) {
  const name = nameOf(d);
  const [text, action, strong]: [string, string, boolean] =
    d.status === "active"
      ? [`Duel en cours · ${name}`, "Reprendre", true]
      : d.incoming
        ? [`${name} te défie`, "Relever", true]
        : d.opponentId
          ? [`En attente de ${name}`, "Voir", false]
          : ["Recherche d'un adversaire…", "Voir", false];
  return (
    <li className="rl-row flex items-center gap-3 rounded-[12px] px-2 py-2">
      <Avatar src={d.opponentAvatar} name={name} size={30} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold">{text}</span>
        <span className="block text-[12px] text-muted">{fmtAgo(d.createdAt)}</span>
      </span>
      <Link href={`/duel/${d.id}`} className={"btn min-h-[34px] px-3 text-[13px] " + (strong ? "btn-primary" : "btn-secondary")}>
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
      <Link href={`/duel/${d.id}`} className="rl-row flex items-center gap-3 rounded-[12px] px-2 py-2">
        <span
          aria-label={label}
          className={"grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[8px] text-[12px] font-extrabold " + (d.won === true ? "bg-white text-black" : "border border-line-2 text-muted")}
        >
          {res}
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{name}</span>
        {d.myScore !== null && d.theirScore !== null && (
          <span className="font-mono text-[13px] tabular-nums text-muted">
            {d.myScore} – {d.theirScore}
          </span>
        )}
        <span className={"w-[42px] text-right font-mono text-[13px] font-semibold tabular-nums " + (d.myDelta !== null && d.myDelta < 0 ? "text-muted" : "")}>
          {d.myDelta !== null ? signed(d.myDelta) : "—"}
        </span>
      </Link>
    </li>
  );
}

// Bloc duels du classement : lancer un duel (au hasard ou contre quelqu'un),
// les défis en cours et les derniers duels joués.
export function DuelsCard({ open, recent }: { open: DuelSummary[]; recent: DuelSummary[] }) {
  const incoming = open.filter((d) => d.incoming && d.status === "pending").length;
  return (
    <section className="card rl-lift flex flex-col gap-4 p-[22px]" aria-label="Duels">
      <CardLabel
        icon={<Swords size={15} aria-hidden />}
        right={
          incoming > 0 ? (
            <span className="rounded-[8px] bg-white px-2 py-[2px] text-[12px] font-semibold text-black">
              {incoming} défi{incoming > 1 ? "s" : ""} reçu{incoming > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="font-mono text-[12px]">30 questions</span>
          )
        }
      >
        Duels
      </CardLabel>
      <div>
        <p className="text-[18px] font-extrabold leading-tight tracking-[-0.02em]">Affronte quelqu&apos;un, comme aux échecs</p>
        <p className="mt-1 text-[13.5px] text-muted">Mêmes questions type examen pour les deux. Le meilleur score gagne, puis le plus rapide.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/duel" className="btn btn-primary rl-press">
          <Shuffle size={16} aria-hidden /> Au hasard
        </Link>
        <Link href="/duel" className="btn btn-secondary rl-press">
          <Swords size={16} aria-hidden /> Défier…
        </Link>
      </div>

      {open.length > 0 && (
        <div>
          <p className="label mb-1">Défis en cours</p>
          <ul className="flex flex-col">
            {open.slice(0, 4).map((d) => (
              <OpenRow key={d.id} d={d} />
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="label mb-1">Derniers duels</p>
        {recent.length ? (
          <ul className="flex flex-col">
            {recent.slice(0, 5).map((d) => (
              <RecentRow key={d.id} d={d} />
            ))}
          </ul>
        ) : (
          <p className="rounded-[12px] border border-dashed border-line-2 px-3 py-3 text-[13.5px] text-muted">Pas encore de duel — lance le premier.</p>
        )}
      </div>
    </section>
  );
}
