import { Lock } from "lucide-react";
import { RankBadge } from "@/components/ui/RankBadge";
import { TIERS } from "@/lib/ranks";
import { tierRange } from "@/components/classement/format";

// Piste des 8 paliers : seuils d'ELO, verrous de maîtrise (Diamant et
// au-delà), palier actuel mis en avant (« toi »), paliers à venir grisés.
export function TierTrack({ current, mastery, placement }: { current: number; mastery: number; placement: boolean }) {
  return (
    <section aria-label="Les paliers" className="card rl-rv grid grid-cols-4 gap-x-2 gap-y-6 px-3 py-5 md:grid-cols-8 md:py-6">
      {TIERS.map((t, i) => {
        const here = i === current && !placement;
        const ahead = placement || i > current;
        const locked = t.lock !== null && mastery < t.lock;
        return (
          <div key={t.key} className={"flex flex-col items-center gap-1.5 text-center " + (ahead ? "opacity-60" : "")} aria-current={here ? "true" : undefined}>
            <RankBadge tier={i} size={here ? 52 : 44} glow={false} gray={ahead} />
            <span className={"mt-0.5 text-[12px] leading-tight " + (here ? "font-extrabold" : "font-semibold")}>{t.name}</span>
            {here ? (
              <span className="rounded-[8px] bg-white px-2 py-[2px] text-[11px] font-bold text-black">toi</span>
            ) : (
              <span className="font-mono text-[10.5px] leading-tight text-muted">{tierRange(i)}</span>
            )}
            {t.lock !== null && (
              <span className={"inline-flex items-center gap-1 text-[10.5px] leading-tight " + (locked ? "text-white" : "text-muted")}>
                {locked && <Lock size={10} aria-hidden />}
                maîtrise ≥ {t.lock} %
              </span>
            )}
          </div>
        );
      })}
    </section>
  );
}
