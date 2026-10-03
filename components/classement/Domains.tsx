import { BarChart3, Globe2, Landmark, Lock, ScrollText } from "lucide-react";
import { RankBadge } from "@/components/ui/RankBadge";
import { DOMAINS } from "@/lib/domains";
import { PLACEMENT_GAMES, TIERS, rankFor } from "@/lib/ranks";
import type { MyRank } from "@/components/classement/types";

const ICONS = { BarChart3, ScrollText, Globe2, Landmark } as const;

function Icon({ name }: { name: keyof typeof ICONS }) {
  const C = ICONS[name];
  return <C size={14} className="shrink-0" aria-hidden />;
}

/**
 * Rangs par domaine, en pastilles discrètes sous le titre : le domaine ouvert
 * porte son rang, les autres sont « bientôt » (un rang par domaine) ; sur
 * téléphone, ceux-ci n'affichent que leur icône.
 */
export function DomainPills({ me }: { me: MyRank }) {
  const rank = rankFor(me.elo, me.mastery, me.leaderboardRank);
  const placement = me.gamesPlayed < PLACEMENT_GAMES;
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Tes rangs par domaine">
      {DOMAINS.map((d) =>
        d.ready ? (
          <li key={d.key} className="chip chip-sm pl-1.5">
            <RankBadge tier={rank.tierIndex} size={20} glow={false} gray={placement} />
            {d.name}
            <span className="font-medium text-muted">
              · {placement ? `placement ${me.gamesPlayed}/${PLACEMENT_GAMES}` : `${rank.tier.name}${rank.division ? " " + rank.division : ""}`}
            </span>
          </li>
        ) : (
          <li key={d.key} className="chip chip-sm chip-quiet" aria-disabled title={`${d.name} : bientôt`}>
            <Icon name={d.icon} />
            <span className="sr-only sm:not-sr-only">{d.name}</span>
            <Lock size={11} className="hidden shrink-0 sm:block" aria-hidden />
            <span className="sr-only"> : bientôt</span>
          </li>
        ),
      )}
    </ul>
  );
}

/** Rappel des règles : ELO, maîtrise, placement (contenu d'un volet replié). */
export function HowItWorks() {
  const locks = TIERS.filter((t) => t.lock !== null);
  return (
    <div className="grid gap-5 text-[14px] leading-[1.55] text-muted sm:grid-cols-3">
      <p>
        <b className="text-white">L&apos;ELO fixe ton palier.</b> Il bouge à chaque duel et examen blanc classé, selon ton résultat et l&apos;écart de niveau.
      </p>
      <p>
        <b className="text-white">La maîtrise ouvre le haut.</b> Ta précision moyenne sur les 10 matières dessine le halo du badge et verrouille{" "}
        {locks.map((t, i) => (
          <span key={t.key}>
            {t.name} ({t.lock} %){i < locks.length - 2 ? ", " : i === locks.length - 2 ? " et " : "."}
          </span>
        ))}
      </p>
      <p>
        <b className="text-white">{PLACEMENT_GAMES} parties de placement.</b> Ton ELO y bouge plus vite ; ton rang s&apos;affiche ensuite.
      </p>
    </div>
  );
}
