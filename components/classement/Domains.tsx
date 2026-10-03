import { BarChart3, Globe2, Landmark, Lock, ScrollText, Sparkles, Globe } from "lucide-react";
import { RankBadge } from "@/components/ui/RankBadge";
import { CardLabel } from "@/components/ui/Titles";
import { DOMAINS, CURRENT_DOMAIN } from "@/lib/domains";
import { PLACEMENT_GAMES, TIERS, rankFor } from "@/lib/ranks";
import { fmtInt } from "@/components/classement/format";
import type { MyRank } from "@/components/classement/types";

const ICONS = { BarChart3, ScrollText, Globe2, Landmark } as const;

/** Onglets de domaine sous le titre : seul le domaine ouvert est actif. */
export function DomainTabs() {
  return (
    <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
      <div className="inline-flex gap-0.5 rounded-[14px] bg-surface-2 p-1" role="tablist" aria-label="Domaines">
        {DOMAINS.map((d) => {
          const Icon = ICONS[d.icon];
          const on = d.key === CURRENT_DOMAIN.key;
          return (
            <span
              key={d.key}
              role="tab"
              aria-selected={on}
              aria-disabled={!d.ready}
              className={
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3 py-2 text-[14px] sm:px-4 " +
                (on ? "bg-surface font-semibold text-white shadow-[0_1px_2px_rgba(17,17,17,.08),0_4px_12px_-4px_rgba(17,17,17,.14)]" : "font-medium text-muted")
              }
            >
              <Icon size={15} aria-hidden />
              {d.name}
              {!d.ready && <span className="text-[11px]">· bientôt</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** « Mes rangs par domaine » : Finance réel, les autres « bientôt ». */
export function DomainRanks({ me }: { me: MyRank }) {
  const rank = rankFor(me.elo, me.mastery, me.leaderboardRank);
  const placement = me.gamesPlayed < PLACEMENT_GAMES;
  return (
    <section className="card rl-lift flex flex-col gap-2 p-[22px]">
      <CardLabel icon={<Globe size={15} aria-hidden />}>Mes rangs par domaine</CardLabel>
      <ul className="mt-1 flex flex-col gap-1">
        {DOMAINS.map((d) => {
          const Icon = ICONS[d.icon];
          if (d.ready) {
            return (
              <li key={d.key} className="rl-row flex items-center gap-3 rounded-[12px] p-2">
                <span className="grid w-9 place-items-center">
                  <RankBadge tier={rank.tierIndex} size={32} glow={false} gray={placement} />
                </span>
                <span className="flex-1 text-[14px] font-semibold">{d.name}</span>
                <span className="text-right text-[13px] text-muted">
                  {placement ? `en placement ${me.gamesPlayed}/${PLACEMENT_GAMES}` : `${rank.tier.name}${rank.division ? " " + rank.division : ""} · ${fmtInt(me.elo)}`}
                </span>
              </li>
            );
          }
          return (
            <li key={d.key} className="flex items-center gap-3 rounded-[12px] p-2" aria-disabled>
              <span className="grid h-[34px] w-9 place-items-center rounded-[10px] border-[1.5px] border-dashed border-line-2 text-muted">
                <Icon size={15} aria-hidden />
              </span>
              <span className="flex-1 text-[14px] font-semibold">{d.name}</span>
              <span className="inline-flex items-center gap-1 text-[13px] text-muted">
                <Lock size={12} aria-hidden /> bientôt · non classé
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Rappel des règles : ELO, maîtrise, placement. */
export function HowItWorks() {
  const locks = TIERS.filter((t) => t.lock !== null);
  return (
    <section className="card flex flex-col gap-3 p-[22px]">
      <CardLabel icon={<Sparkles size={15} aria-hidden />}>Comment ça marche</CardLabel>
      <p className="text-[14px] leading-relaxed text-body">
        L&apos;<b>ELO</b> bouge à chaque duel et à chaque examen blanc classé, selon ton résultat et l&apos;écart de niveau avec tes adversaires : il fixe ton palier.
      </p>
      <p className="text-[14px] leading-relaxed text-body">
        La <b>maîtrise</b> (ta précision moyenne sur les 10 matières du programme) dessine le halo à l&apos;encre autour de ton badge et ouvre les paliers du haut :{" "}
        {locks.map((t, i) => (
          <span key={t.key}>
            {t.name} {t.lock} %{i < locks.length - 1 ? ", " : "."}
          </span>
        ))}
      </p>
      <p className="text-[14px] leading-relaxed text-body">
        Tes <b>{PLACEMENT_GAMES} premières parties</b> sont des parties de placement : ton ELO y bouge plus vite, et ton rang s&apos;affiche ensuite.
      </p>
    </section>
  );
}
